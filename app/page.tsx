"use client";

import { useMemo, useState } from "react";
import { type DailyMetric } from "./data";
import { contentData } from "./content/content-data";

type RangeKey = "Q2" | "Q3" | "Q4";
type MetricKey = Exclude<keyof DailyMetric, "date">;
type ComparisonMetric = "plays" | "follows" | "recommends" | "likes";

const quarterRanges: Record<RangeKey, { start: string; end: string; period: string }> = {
  Q2: { start: "2026-04-01", end: "2026-06-30", period: "04.01 — 06.30" },
  Q3: { start: "2026-07-01", end: "2026-09-30", period: "07.01 — 09.30" },
  Q4: { start: "2026-10-01", end: "2026-10-26", period: "10.01 — 10.26" },
};

const quarterAdjustments: Record<RangeKey, Partial<Record<MetricKey, number>>> = {
  Q2: {},
  Q3: {},
  Q4: { recommends: 3, likes: 50, follows: 14 },
};

const quarterInsights: Record<RangeKey, Array<[string, string]>> = {
  Q2: [
    ["复盘6月26日的高播放模板", "霸总剧情在Q2获得最高播放，可继续强化冲突开场和角色关系。"],
    ["提升高播放内容的关注转化", "Q2部分高播放内容关注贡献较低，需要补强系列预告和关注理由。"],
    ["保持短剧和知识内容的组合", "剧情内容拉动播放，知识内容承接专业心智，建议保持双线更新。"],
  ],
  Q3: [
    ["复盘7月23日的太子妃首集", "太子妃首集同时带来高播放和高关注，是Q3最值得复用的剧情模板。"],
    ["继续做强系列化内容", "太子妃、背锅侠和霸总内容共同构成Q3增长主线，应保持角色和连载节奏。"],
    ["改善AI财务系列后半程", "9月下旬AI财务单篇播放回落，需要缩短铺垫并前置风险冲突。"],
  ],
  Q4: [
    ["放大10月21日的新剧集模板", "这一天是Q4阶段播放和关注双峰值，建议继续沿用鲜明人设、金额冲突和集数标识。"],
    ["延续档案类剧情", "10月档案主题内容关注转化较好，可继续围绕合同、验收和单据冲突连载。"],
    ["优化AI财务单集结构", "Q4的AI财务内容播放偏低，建议在开场更早呈现问题和解决结果。"],
  ],
};

const metricMeta: Record<
  MetricKey,
  { label: string; short: string; color: string }
> = {
  plays: { label: "播放", short: "播", color: "var(--orange)" },
  recommends: { label: "推荐", short: "荐", color: "var(--purple)" },
  likes: { label: "喜欢", short: "赞", color: "var(--blue)" },
  comments: { label: "评论", short: "评", color: "var(--red)" },
  shares: { label: "分享", short: "享", color: "var(--gold)" },
  follows: { label: "关注", short: "关", color: "var(--green)" },
};

const metricOrder: MetricKey[] = [
  "plays",
  "recommends",
  "likes",
  "comments",
  "shares",
  "follows",
];

const kpiMetricOrder: MetricKey[] = [
  "plays",
  "follows",
  "recommends",
  "likes",
  "comments",
  "shares",
];

const number = new Intl.NumberFormat("zh-CN");

function sum(data: DailyMetric[], key: MetricKey) {
  return data.reduce((total, item) => total + item[key], 0);
}

function compact(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return number.format(Math.round(value));
}

function shortDate(date: string) {
  const [, month, day] = date.split("-");
  return `${month}.${day}`;
}

function monthLabel(month: string) {
  return `${Number(month.slice(5))}月`;
}

function niceMax(value: number) {
  if (value <= 10) return Math.ceil(value / 2) * 2 || 2;
  const power = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / power) * power;
}

function TrendChart({ data, metric }: { data: DailyMetric[]; metric: MetricKey }) {
  const width = 1000;
  const height = 320;
  const left = 62;
  const right = 24;
  const top = 24;
  const bottom = 48;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const maxValue = niceMax(Math.max(...data.map((item) => item[metric]), 1));
  const points = data.map((item, index) => {
    const x = left + (index / Math.max(data.length - 1, 1)) * plotW;
    const y = top + plotH - (item[metric] / maxValue) * plotH;
    return { x, y, item };
  });
  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const area = `${line} L${left + plotW},${top + plotH} L${left},${top + plotH} Z`;
  const peak = points.reduce((best, point) =>
    point.item[metric] > best.item[metric] ? point : best,
  );
  const tickIndexes = Array.from(new Set([0, Math.round((data.length - 1) / 4), Math.round((data.length - 1) / 2), Math.round(((data.length - 1) * 3) / 4), data.length - 1]));

  return (
    <svg
      className="trend-svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${shortDate(data[0].date)}至${shortDate(data.at(-1)!.date)}每日${metricMeta[metric].label}趋势，峰值${number.format(peak.item[metric])}`}
    >
      <defs>
        <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={metricMeta[metric].color} stopOpacity="0.24" />
          <stop offset="100%" stopColor={metricMeta[metric].color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = top + plotH * ratio;
        const value = maxValue * (1 - ratio);
        return (
          <g key={ratio}>
            <line className="grid-line" x1={left} x2={left + plotW} y1={y} y2={y} />
            <text className="axis-label" x={left - 12} y={y + 4} textAnchor="end">
              {compact(value)}
            </text>
          </g>
        );
      })}
      <path d={area} fill="url(#trendArea)" />
      <path d={line} fill="none" stroke={metricMeta[metric].color} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
      {tickIndexes.map((index) => (
        <text key={index} className="axis-label" x={points[index].x} y={height - 14} textAnchor="middle">
          {shortDate(points[index].item.date)}
        </text>
      ))}
      <line className="peak-guide" x1={peak.x} x2={peak.x} y1={peak.y} y2={top + plotH} />
      <circle cx={peak.x} cy={peak.y} r="7" fill={metricMeta[metric].color} stroke="var(--card)" strokeWidth="4" />
      <g transform={`translate(${Math.min(Math.max(peak.x - 68, left), width - 170)},${Math.max(peak.y - 54, 4)})`}>
        <rect className="peak-label-bg" width="136" height="43" rx="10" />
        <text className="peak-label-date" x="12" y="17">{shortDate(peak.item.date)} 峰值</text>
        <text className="peak-label-value" x="12" y="34">{number.format(peak.item[metric])}</text>
      </g>
    </svg>
  );
}

function QuarterComparisonChart({
  data,
  metric,
}: {
  data: Array<{ quarter: RangeKey; period: string; values: Record<MetricKey, number> }>;
  metric: ComparisonMetric;
}) {
  const width = 1000;
  const height = 300;
  const left = 82;
  const right = 82;
  const top = 54;
  const bottom = 58;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const maxValue = niceMax(Math.max(...data.map((item) => item.values[metric]), 1));
  const points = data.map((item, index) => ({
    ...item,
    value: item.values[metric],
    x: left + (index / Math.max(data.length - 1, 1)) * plotW,
    y: top + plotH - (item.values[metric] / maxValue) * plotH,
  }));
  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const area = `${line} L${points.at(-1)!.x},${top + plotH} L${points[0].x},${top + plotH} Z`;

  return (
    <svg className="quarter-compare-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Q2至Q4${metricMeta[metric].label}对比折线图`}>
      <defs>
        <linearGradient id="quarterArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={metricMeta[metric].color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={metricMeta[metric].color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((ratio) => {
        const y = top + plotH * ratio;
        return <line key={ratio} className="grid-line" x1={left} x2={left + plotW} y1={y} y2={y} />;
      })}
      <path d={area} fill="url(#quarterArea)" />
      <path d={line} fill="none" stroke={metricMeta[metric].color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((point, index) => (
        <g key={point.quarter} className="quarter-point">
          <circle cx={point.x} cy={point.y} r="12" fill="white" stroke={metricMeta[metric].color} strokeWidth="6" />
          <text className="quarter-point-value" x={point.x} y={point.y - 25} textAnchor="middle">{number.format(point.value)}</text>
          <text className="quarter-point-label" x={point.x} y={height - 27} textAnchor="middle">{point.quarter}</text>
          <text className="quarter-point-period" x={point.x} y={height - 10} textAnchor="middle">{point.period}{index === 2 ? " · 阶段" : ""}</text>
        </g>
      ))}
    </svg>
  );
}

export default function Home() {
  const [range, setRange] = useState<RangeKey>("Q4");
  const [metric, setMetric] = useState<MetricKey>("plays");
  const [comparisonMetric, setComparisonMetric] = useState<ComparisonMetric>("plays");

  const publishedDailyData = useMemo(() => {
    const grouped = new Map<string, DailyMetric>();
    contentData.forEach((item) => {
      const existing = grouped.get(item.date) ?? {
        date: item.date,
        plays: 0,
        recommends: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        follows: 0,
      };
      metricOrder.forEach((key) => { existing[key] += item[key]; });
      grouped.set(item.date, existing);
    });
    return [...grouped.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, []);
  const activeQuarter = quarterRanges[range];
  const current = useMemo(
    () => publishedDailyData.filter((item) => item.date >= activeQuarter.start && item.date <= activeQuarter.end),
    [activeQuarter, publishedDailyData],
  );
  const currentContent = useMemo(
    () => contentData.filter((item) => item.date >= activeQuarter.start && item.date <= activeQuarter.end),
    [activeQuarter],
  );
  const totals = useMemo(
    () => Object.fromEntries(metricOrder.map((key) => [key, sum(current, key) + (quarterAdjustments[range][key] ?? 0)])) as Record<MetricKey, number>,
    [current, range],
  );
  const engagement = ((totals.recommends + totals.likes + totals.comments + totals.shares) / totals.plays) * 100;
  const followRate = (totals.follows / totals.plays) * 100;
  const topDays = [...current].sort((a, b) => b[metric] - a[metric]).slice(0, 5);
  const peakDay = topDays[0];
  const growthDay = [...current].sort((a, b) => b.follows - a.follows)[0];
  const growthShare = growthDay.follows / Math.max(totals.follows, 1) * 100;

  const months = useMemo(() => {
    const grouped = new Map<string, DailyMetric[]>();
    current.forEach((item) => {
      const month = item.date.slice(0, 7);
      grouped.set(month, [...(grouped.get(month) ?? []), item]);
    });
    return [...grouped.entries()].map(([month, items]) => {
      const plays = sum(items, "plays");
      const interactions = sum(items, "recommends") + sum(items, "likes") + sum(items, "comments") + sum(items, "shares");
      return {
        month,
        days: items.length,
        plays,
        daily: plays / items.length,
        engagement: (interactions / plays) * 100,
        follows: sum(items, "follows"),
      };
    });
  }, [current]);
  const maxDaily = Math.max(...months.map((item) => item.daily));
  const quarterComparison = useMemo(
    () => (["Q2", "Q3", "Q4"] as RangeKey[]).map((quarter) => {
      const quarterRange = quarterRanges[quarter];
      const items = publishedDailyData.filter((item) => item.date >= quarterRange.start && item.date <= quarterRange.end);
      const values = Object.fromEntries(metricOrder.map((key) => [key, sum(items, key) + (quarterAdjustments[quarter][key] ?? 0)])) as Record<MetricKey, number>;
      return { quarter, period: quarterRange.period, values };
    }),
    [publishedDailyData],
  );

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="回到看板顶部">
          <span className="brand-mark">嘴</span>
          <span>
            <strong>嘴里人</strong>
            <small>视频号运营数据中心</small>
          </span>
        </a>
        <nav className="main-nav" aria-label="看板页面">
          <a className="active" href="/">运营总览</a>
          <a href="/content/">单篇内容</a>
        </nav>
        <div className="data-status"><i /> 累计数据截至 2026.10.26</div>
      </header>

      <div className="overview-cluster" id="top">
        <section className="hero">
          <div>
            <p className="eyebrow">CHANNEL PERFORMANCE DASHBOARD</p>
            <h1>视频号数据驾驶舱</h1>
            <p className="hero-copy">用播放、互动与关注转化，识别真正带来账号增长的高价值日期。</p>
          </div>
          <div className="range-switch" aria-label="看板数据范围">
            {(["Q2", "Q3", "Q4"] as RangeKey[]).map((key) => (
              <button
                type="button"
                key={key}
                className={range === key ? "active" : ""}
                aria-pressed={range === key}
                onClick={() => setRange(key)}
              >
                {key}
              </button>
            ))}
          </div>
        </section>

        <section className="period-strip">
          <span>{range === "Q4" ? `${range}·阶段数据` : `${range}·完整季度`}</span>
          <strong>{activeQuarter.period}</strong>
          <em>{currentContent.length}条发布内容 · 指标和图表已同步联动</em>
        </section>
      </div>

      <section className="kpi-grid" aria-label="关键指标">
        {kpiMetricOrder.map((key, index) => {
          return (
            <button
              type="button"
              className={`kpi-card ${index === 0 ? "featured" : ""} ${metric === key ? "selected" : ""}`}
              key={key}
              aria-pressed={metric === key}
              aria-label={`查看${metricMeta[key].label}趋势`}
              onClick={() => setMetric(key)}
            >
              <div className="kpi-title">
                <span>{key === "follows" ? "关注人数" : metricMeta[key].label}</span>
                <i style={{ background: metricMeta[key].color }}>{metricMeta[key].short}</i>
              </div>
              <strong>{number.format(totals[key])}</strong>
              <div className="kpi-foot">
                <span>{currentContent.length}条内容累计</span>
                <b>{range}</b>
              </div>
            </button>
          );
        })}
      </section>

      <section className="panel quarter-compare-panel">
        <div className="panel-head">
          <div>
            <p className="section-kicker">QUARTERLY GROWTH</p>
            <h2>Q2 · Q3 · Q4 核心增长对比</h2>
            <p className="quarter-compare-copy">在同一张图里查看播放与涨粉走势，Q4为截至10月26日的阶段表现。</p>
          </div>
          <div className="metric-switch" aria-label="季度对比指标">
            {(["plays", "follows", "recommends", "likes"] as ComparisonMetric[]).map((key) => (
              <button key={key} type="button" className={comparisonMetric === key ? "active" : ""} aria-pressed={comparisonMetric === key} onClick={() => setComparisonMetric(key)}>
                <i style={{ background: metricMeta[key].color }} />
                {key === "follows" ? "涨粉" : metricMeta[key].label}
              </button>
            ))}
          </div>
        </div>
        <QuarterComparisonChart data={quarterComparison} metric={comparisonMetric} />
        <div className="quarter-compare-summary">
          {quarterComparison.map((item, index) => {
            const previous = quarterComparison[index - 1]?.values[comparisonMetric];
            const change = previous ? ((item.values[comparisonMetric] - previous) / previous) * 100 : null;
            return (
              <button type="button" key={item.quarter} className={range === item.quarter ? "active" : ""} onClick={() => setRange(item.quarter)}>
                <span>{item.quarter}{item.quarter === "Q4" ? " 阶段" : " 完整季度"}</span>
                <strong>{number.format(item.values[comparisonMetric])}</strong>
                <small>{change === null ? "起始基准" : `${change >= 0 ? "+" : ""}${change.toFixed(1)}% 较上季度`}</small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="panel trend-panel">
          <div className="panel-head">
            <div>
              <p className="section-kicker">DAILY TREND</p>
              <h2>内容发布表现趋势</h2>
            </div>
            <div className="metric-switch" aria-label="选择趋势指标">
              {metricOrder.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={metric === key ? "active" : ""}
                  aria-pressed={metric === key}
                  onClick={() => setMetric(key)}
                >
                  <i style={{ background: metricMeta[key].color }} />
                  {metricMeta[key].label}
                </button>
              ))}
            </div>
          </div>
          <TrendChart data={current} metric={metric} />
          <div className="trend-summary">
            <div><span>区间峰值</span><strong>{number.format(peakDay[metric])}</strong><small>{shortDate(peakDay.date)}</small></div>
            <div><span>日均表现</span><strong>{number.format(Math.round(totals[metric] / current.length))}</strong><small>{metricMeta[metric].label} / 天</small></div>
            <div><span>有表现天数</span><strong>{current.filter((item) => item[metric] > 0).length}</strong><small>占区间 {((current.filter((item) => item[metric] > 0).length / current.length) * 100).toFixed(0)}%</small></div>
          </div>
        </article>

        <aside className="panel signal-panel">
          <div className="panel-head">
            <div>
              <p className="section-kicker">GROWTH SIGNAL</p>
              <h2>增长信号</h2>
            </div>
            <span className="hot-badge">{shortDate(growthDay.date)}</span>
          </div>
          <div className="signal-hero">
            <span>单日新增关注</span>
            <strong>+{number.format(growthDay.follows)}</strong>
            <p>占当前范围新增关注的 <b>{growthShare.toFixed(1)}%</b></p>
          </div>
          <div className="signal-metrics">
            <div><span>播放</span><b>{number.format(growthDay.plays)}</b></div>
            <div><span>推荐</span><b>{number.format(growthDay.recommends)}</b></div>
            <div><span>喜欢</span><b>{number.format(growthDay.likes)}</b></div>
            <div><span>分享</span><b>{number.format(growthDay.shares)}</b></div>
          </div>
          <div className="signal-note">
            <span>核心判断</span>
            <p>{shortDate(growthDay.date)}在当前范围内贡献最多关注，可结合播放、推荐和分享表现复盘内容结构。</p>
          </div>
        </aside>
      </section>

      <section className="dashboard-grid lower-grid">
        <article className="panel month-panel">
          <div className="panel-head">
            <div>
              <p className="section-kicker">MONTHLY COMPARISON</p>
              <h2>月度效率对比</h2>
            </div>
            <span className="subtle-note">{range === "Q4" ? "Q4为10月1—26日阶段数据" : `${range}完整季度`}</span>
          </div>
          <div className="month-chart">
            {months.map((item) => (
              <div className="month-column" key={item.month}>
                <div className="month-bar-zone">
                  <span>{number.format(Math.round(item.daily))}</span>
                  <i style={{ height: `${Math.max((item.daily / maxDaily) * 100, 7)}%` }} />
                </div>
                <strong>{monthLabel(item.month)}</strong>
                <small>{item.days}天 · 日均播放</small>
                <div className="month-detail"><span>互动率</span><b>{item.engagement.toFixed(2)}%</b></div>
                <div className="month-detail"><span>关注</span><b>+{item.follows}</b></div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel quality-panel">
          <div className="panel-head">
            <div>
              <p className="section-kicker">QUALITY</p>
              <h2>流量质量</h2>
            </div>
          </div>
          <div className="quality-ring" style={{ "--progress": `${Math.min(engagement * 10, 100)}%` } as React.CSSProperties}>
            <div><strong>{engagement.toFixed(2)}%</strong><span>综合互动率</span></div>
          </div>
          <div className="quality-list">
            <div><span>推荐率</span><b>{((totals.recommends / totals.plays) * 100).toFixed(2)}%</b></div>
            <div><span>喜欢率</span><b>{((totals.likes / totals.plays) * 100).toFixed(2)}%</b></div>
            <div><span>分享率</span><b>{((totals.shares / totals.plays) * 100).toFixed(2)}%</b></div>
            <div><span>关注转化率</span><b>{followRate.toFixed(2)}%</b></div>
          </div>
        </article>
      </section>

      <section className="panel ranking-panel">
        <div className="panel-head">
          <div>
            <p className="section-kicker">TOP DAYS</p>
              <h2>{metricMeta[metric].label}表现最佳发布日期</h2>
          </div>
          <span className="subtle-note">随趋势指标同步切换</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>排名</th><th>日期</th><th>播放</th><th>推荐</th><th>喜欢</th><th>评论</th><th>分享</th><th>关注</th><th>{metricMeta[metric].label}占比</th></tr></thead>
            <tbody>
              {topDays.map((item, index) => (
                <tr key={item.date}>
                  <td><span className={`rank rank-${index + 1}`}>0{index + 1}</span></td>
                  <td><b>{item.date}</b></td>
                  <td>{number.format(item.plays)}</td>
                  <td>{number.format(item.recommends)}</td>
                  <td>{number.format(item.likes)}</td>
                  <td>{number.format(item.comments)}</td>
                  <td>{number.format(item.shares)}</td>
                  <td>+{number.format(item.follows)}</td>
                  <td><div className="share-bar"><i style={{ width: `${(item[metric] / Math.max(peakDay[metric], 1)) * 100}%` }} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="insights">
        <div className="insight-title"><p className="section-kicker">ACTIONABLE INSIGHTS</p><h2>下一步怎么做</h2></div>
        {quarterInsights[range].map(([title, detail], index) => (
          <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{detail}</p></article>
        ))}
      </section>

      <footer>
        <span>统计口径：按视频发布日期归集单篇累计表现 · 数据截至2026.10.26</span>
        <span>数据来源：视频号后台导出 · Q4关注、点赞和推荐采用平台总览校准值</span>
      </footer>
    </main>
  );
}
