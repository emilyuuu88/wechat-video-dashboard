"use client";

import { useMemo, useState } from "react";
import { dailyData, type DailyMetric } from "./data";
import { contentData } from "./content/content-data";

type RangeKey = "7" | "30" | "all";
type MetricKey = Exclude<keyof DailyMetric, "date">;

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

export default function Home() {
  const [range, setRange] = useState<RangeKey>("30");
  const [metric, setMetric] = useState<MetricKey>("plays");

  const count = range === "all" ? dailyData.length : Number(range);
  const current = useMemo(() => dailyData.slice(-count), [count]);
  const totals = useMemo(
    () => Object.fromEntries(metricOrder.map((key) => [key, sum(current, key)])) as Record<MetricKey, number>,
    [current],
  );
  const cumulativeTotals = useMemo(
    () => Object.fromEntries(metricOrder.map((key) => [
      key,
      contentData.reduce((total, item) => total + item[key], 0),
    ])) as Record<MetricKey, number>,
    [],
  );
  const engagement = ((totals.recommends + totals.likes + totals.comments + totals.shares) / totals.plays) * 100;
  const followRate = (totals.follows / totals.plays) * 100;
  const topDays = [...current].sort((a, b) => b[metric] - a[metric]).slice(0, 5);
  const peakDay = topDays[0];

  const months = useMemo(() => {
    const grouped = new Map<string, DailyMetric[]>();
    dailyData.forEach((item) => {
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
  }, []);
  const maxDaily = Math.max(...months.map((item) => item.daily));

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
        <div className="data-status"><i /> 累计数据截至 2026.08.27</div>
      </header>

      <div className="overview-cluster" id="top">
        <section className="hero">
          <div>
            <p className="eyebrow">CHANNEL PERFORMANCE DASHBOARD</p>
            <h1>视频号数据驾驶舱</h1>
            <p className="hero-copy">用播放、互动与关注转化，识别真正带来账号增长的高价值日期。</p>
          </div>
          <div className="range-switch" aria-label="每日趋势范围">
            {(["7", "30", "all"] as RangeKey[]).map((key) => (
              <button
                type="button"
                key={key}
                className={range === key ? "active" : ""}
                aria-pressed={range === key}
                onClick={() => setRange(key)}
              >
                {key === "all" ? "全周期" : `近${key}天`}
              </button>
            ))}
          </div>
        </section>

        <section className="period-strip">
          <span>{range === "all" ? "每日趋势·完整周期" : `每日趋势·近${range}天`}</span>
          <strong>{shortDate(current[0].date)} — {shortDate(current.at(-1)!.date)}</strong>
          <em>日趋势明细至 07.26 · 顶部累计指标已更新至 08.27</em>
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
                <span>{key === "follows" ? "粉丝数" : metricMeta[key].label}</span>
                <i style={{ background: metricMeta[key].color }}>{metricMeta[key].short}</i>
              </div>
              <strong>{number.format(cumulativeTotals[key])}</strong>
              <div className="kpi-foot">
                <span>{contentData.length}条内容累计</span>
                <b>截至 08.27</b>
              </div>
            </button>
          );
        })}
      </section>

      <section className="dashboard-grid">
        <article className="panel trend-panel">
          <div className="panel-head">
            <div>
              <p className="section-kicker">DAILY TREND</p>
              <h2>每日数据趋势</h2>
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
            <span className="hot-badge">7月23日</span>
          </div>
          <div className="signal-hero">
            <span>单日新增关注</span>
            <strong>+43</strong>
            <p>占近30天新增关注的 <b>57.3%</b></p>
          </div>
          <div className="signal-metrics">
            <div><span>播放</span><b>5,401</b></div>
            <div><span>推荐</span><b>297</b></div>
            <div><span>喜欢</span><b>145</b></div>
            <div><span>分享</span><b>48</b></div>
          </div>
          <div className="signal-note">
            <span>核心判断</span>
            <p>7月23日不是单纯的播放峰值，而是推荐、互动和关注同步放大的高质量增长节点。</p>
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
            <span className="subtle-note">4月、7月为阶段数据，优先比较日均</span>
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
            <h2>{metricMeta[metric].label}表现最佳日期</h2>
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
        <article><span>01</span><h3>复盘 7月23日的内容模板</h3><p>这一天贡献近30天57.3%的关注，应优先复盘选题、开场、封面、发布时间与转发场景。</p></article>
        <article><span>02</span><h3>把“高播放”升级为“高转化”</h3><p>6月23日和26日播放更高，但关注明显偏低。后续要在内容中增加明确关注理由与系列预告。</p></article>
        <article><span>03</span><h3>延续7月互动效率</h3><p>7月阶段互动率3.50%，显著高于6月0.93%。建议围绕高推荐、高分享内容连续验证。</p></article>
      </section>

      <footer>
        <span>累计指标：截至2026.08.27 · 每日趋势明细：2026.04.22—07.26</span>
        <span>数据来源：视频号后台导出 · 指标可能存在约1%的平台统计误差</span>
      </footer>
    </main>
  );
}
