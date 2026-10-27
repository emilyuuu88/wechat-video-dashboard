"use client";

import { useMemo, useState } from "react";
import { contentData, type ContentCategory, type ContentItem } from "./content-data";

type RankMetric = "plays" | "follows" | "recommends" | "shares" | "completion";
type CategoryFilter = "全部内容" | ContentCategory;

const number = new Intl.NumberFormat("zh-CN");
const hitThreshold = 3000;
const categories: CategoryFilter[] = ["全部内容", "职场共鸣/知识", "剧情动画", "背锅侠系列", "太子妃系列", "霸总系列", "AI财务系列"];
const metricMeta: Record<RankMetric, { label: string; unit: string }> = {
  plays: { label: "播放", unit: "" },
  follows: { label: "关注", unit: "" },
  recommends: { label: "推荐", unit: "" },
  shares: { label: "分享", unit: "" },
  completion: { label: "完播率", unit: "%" },
};
const categoryColors: Record<ContentCategory, string> = {
  "职场共鸣/知识": "var(--orange)",
  "剧情动画": "var(--purple)",
  "背锅侠系列": "var(--blue)",
  "太子妃系列": "var(--green)",
  "霸总系列": "#f59e0b",
  "AI财务系列": "#06b6d4",
};

function sum(data: ContentItem[], key: "plays" | "recommends" | "likes" | "comments" | "shares" | "follows") {
  return data.reduce((total, item) => total + item[key], 0);
}

function percent(value: number) {
  return `${value.toFixed(2)}%`;
}

function SeriesCard({
  items,
  className,
  eyebrow,
  title,
}: {
  items: ContentItem[];
  className: string;
  eyebrow: string;
  title: string;
}) {
  const plays = sum(items, "plays");
  const interactions = sum(items, "recommends") + sum(items, "likes") + sum(items, "comments") + sum(items, "shares");
  const follows = sum(items, "follows");
  const hits = items.filter((item) => item.plays >= hitThreshold).length;
  const maxPlays = Math.max(...items.map((item) => item.plays), 1);

  return (
    <article className={`series-card ${className}`}>
      <div className="series-card-head">
        <div><span>{eyebrow}</span><h3>{title}</h3></div>
        <b>爆款 {hits} 条</b>
      </div>
      <div className="series-stats">
        <div><span>内容数</span><strong>{items.length}</strong></div>
        <div><span>累计播放</span><strong>{number.format(plays)}</strong></div>
        <div><span>篇均播放</span><strong>{number.format(Math.round(plays / items.length))}</strong></div>
        <div><span>新增关注</span><strong>+{follows}</strong></div>
      </div>
      <div className="series-card-foot">
        <p>互动率 {(interactions / plays * 100).toFixed(2)}% · 关注转化 {(follows / plays * 100).toFixed(2)}%</p>
        <div className="episode-bars">{items.map((item, index) => <i key={`${item.date}-${item.title}`} style={{ height: `${Math.max(item.plays / maxPlays * 100, 8)}%` }}><span>{index + 1}</span></i>)}</div>
      </div>
    </article>
  );
}

function EfficiencyScatter({ data }: { data: ContentItem[] }) {
  const width = 760;
  const height = 350;
  const left = 58;
  const right = 24;
  const top = 24;
  const bottom = 48;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const maxPlays = Math.ceil(Math.max(...data.map((item) => item.plays), 1000) / 1000) * 1000;
  const maxCompletion = 70;
  const avgPlays = sum(data, "plays") / data.length;
  const avgCompletion = data.reduce((total, item) => total + item.completion, 0) / data.length;
  const topLabels = new Set([...data].sort((a, b) => b.plays - a.plays).slice(0, 3).map((item) => item.title));
  const x = (value: number) => left + (value / maxCompletion) * plotW;
  const y = (value: number) => top + plotH - (value / maxPlays) * plotH;
  const splitX = x(avgCompletion);
  const splitY = y(avgPlays);

  return (
    <svg className="scatter-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="单篇内容完播率与播放量效率矩阵，气泡大小表示关注量">
      <rect className="matrix-zone traffic" x={left} y={top} width={splitX - left} height={splitY - top} />
      <rect className="matrix-zone hit" x={splitX} y={top} width={left + plotW - splitX} height={splitY - top} />
      <rect className="matrix-zone optimize" x={left} y={splitY} width={splitX - left} height={top + plotH - splitY} />
      <rect className="matrix-zone potential" x={splitX} y={splitY} width={left + plotW - splitX} height={top + plotH - splitY} />
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
        <g key={ratio}>
          <line className="grid-line" x1={left} x2={left + plotW} y1={top + plotH * ratio} y2={top + plotH * ratio} />
          <text className="axis-label" x={left - 10} y={top + plotH * ratio + 4} textAnchor="end">{number.format(Math.round(maxPlays * (1 - ratio)))}</text>
        </g>
      ))}
      {[0, 20, 40, 60].map((tick) => (
        <text className="axis-label" key={tick} x={x(tick)} y={height - 15} textAnchor="middle">{tick}%</text>
      ))}
      <line className="matrix-line" x1={x(avgCompletion)} x2={x(avgCompletion)} y1={top} y2={top + plotH} />
      <line className="matrix-line" x1={left} x2={left + plotW} y1={y(avgPlays)} y2={y(avgPlays)} />
      <text className="matrix-note" x={left + 8} y={top + 15}>流量型 · 高播放低完播</text>
      <text className="matrix-note hit-note" x={left + plotW - 8} y={top + 15} textAnchor="end">爆款区 · 高播放高完播</text>
      <text className="matrix-note" x={left + 8} y={top + plotH - 9}>待优化 · 低播放低完播</text>
      <text className="matrix-note" x={left + plotW - 8} y={top + plotH - 9} textAnchor="end">潜力型 · 低播放高完播</text>
      {data.map((item) => {
        const cx = x(item.completion);
        const cy = y(item.plays);
        const radius = 5 + Math.sqrt(item.follows) * 1.8;
        return (
          <g key={`${item.date}-${item.title}`}>
            <circle cx={cx} cy={cy} r={radius} fill={categoryColors[item.category]} fillOpacity="0.72" stroke="var(--card)" strokeWidth="2" />
            {topLabels.has(item.title) && <text className="scatter-label" x={Math.min(cx + 9, width - 180)} y={Math.max(cy - 10, 14)}>{item.title.slice(0, 16)}</text>}
          </g>
        );
      })}
      <text className="axis-title" x={left + plotW / 2} y={height - 1} textAnchor="middle">完播率</text>
    </svg>
  );
}

export default function ContentAnalysis() {
  const [category, setCategory] = useState<CategoryFilter>("全部内容");
  const [metric, setMetric] = useState<RankMetric>("plays");
  const filtered = useMemo(
    () => category === "全部内容" ? contentData : contentData.filter((item) => item.category === category),
    [category],
  );

  const detailTotals = useMemo(() => ({
    plays: sum(filtered, "plays"),
    recommends: sum(filtered, "recommends"),
    likes: sum(filtered, "likes"),
    comments: sum(filtered, "comments"),
    shares: sum(filtered, "shares"),
    follows: sum(filtered, "follows"),
  }), [filtered]);
  const totals = useMemo(() => category === "全部内容" ? {
    ...detailTotals,
    recommends: 3316,
    likes: 2019,
    follows: 443,
  } : detailTotals, [category, detailTotals]);
  const weightedCompletion = filtered.reduce((total, item) => total + item.completion * item.plays, 0) / Math.max(totals.plays, 1);
  const engagement = (totals.recommends + totals.likes + totals.comments + totals.shares) / Math.max(totals.plays, 1) * 100;
  const followRate = totals.follows / Math.max(totals.plays, 1) * 100;
  const ranking = [...filtered].sort((a, b) => b[metric] - a[metric]).slice(0, 10);
  const rankingMax = Math.max(...ranking.map((item) => item[metric]), 1);
  const topContent = [...filtered].sort((a, b) => b.plays - a.plays)[0];
  const matrixAvgPlays = totals.plays / filtered.length;
  const matrixAvgCompletion = filtered.reduce((total, item) => total + item.completion, 0) / filtered.length;
  const matrixQuadrants = [
    { key: "hit", title: "爆款区", rule: "高播放 · 高完播", items: filtered.filter((item) => item.plays >= matrixAvgPlays && item.completion >= matrixAvgCompletion) },
    { key: "traffic", title: "流量型", rule: "高播放 · 低完播", items: filtered.filter((item) => item.plays >= matrixAvgPlays && item.completion < matrixAvgCompletion) },
    { key: "potential", title: "潜力型", rule: "低播放 · 高完播", items: filtered.filter((item) => item.plays < matrixAvgPlays && item.completion >= matrixAvgCompletion) },
    { key: "optimize", title: "待优化", rule: "低播放 · 低完播", items: filtered.filter((item) => item.plays < matrixAvgPlays && item.completion < matrixAvgCompletion) },
  ].map((quadrant) => ({
    ...quadrant,
    representative: [...quadrant.items].sort((a, b) => b.plays - a.plays)[0],
  }));

  const categoryStats = categories.slice(1).map((key) => {
    const items = contentData.filter((item) => item.category === key);
    const plays = sum(items, "plays");
    const interactions = sum(items, "recommends") + sum(items, "likes") + sum(items, "comments") + sum(items, "shares");
    return {
      category: key,
      count: items.length,
      plays,
      avgPlays: plays / items.length,
      completion: items.reduce((total, item) => total + item.completion, 0) / items.length,
      engagement: interactions / plays * 100,
      follows: sum(items, "follows"),
      followRate: sum(items, "follows") / plays * 100,
    };
  });
  const maxAvgPlays = Math.max(...categoryStats.map((item) => item.avgPlays));
  const backSeries = contentData.filter((item) => item.category === "背锅侠系列");
  const palaceSeries = contentData.filter((item) => item.category === "太子妃系列");
  const bossSeries = contentData.filter((item) => item.category === "霸总系列" || item.title.includes("霸总") || item.title.includes("霸道总裁"));
  const aiSeries = contentData.filter((item) => item.category === "AI财务系列" || item.title.includes("AI财务") || item.title.includes("AI入职天庭财务司"));
  const seriesSpotlight = [
    { name: "《背锅侠》系列", items: backSeries, tone: "back" },
    { name: "《太子妃》系列", items: palaceSeries, tone: "palace" },
    { name: "《霸总》系列", items: bossSeries, tone: "boss" },
    { name: "《AI财务》系列", items: aiSeries, tone: "ai" },
  ].map((series) => {
    const plays = sum(series.items, "plays");
    const follows = sum(series.items, "follows");
    const hits = series.items.filter((item) => item.plays >= hitThreshold);
    const topHit = [...series.items].sort((a, b) => b.plays - a.plays)[0];
    return { ...series, plays, follows, hits, topHit };
  }).sort((a, b) => b.hits.length - a.hits.length || b.plays - a.plays);
  const allFollows = 443;
  const palaceFollows = sum(palaceSeries, "follows");
  const palaceFollowShare = palaceFollows / Math.max(allFollows, 1) * 100;

  return (
    <main className="content-page">
      <header className="topbar">
        <a className="brand" href="/" aria-label="返回运营总览">
          <span className="brand-mark">嘴</span>
          <span><strong>嘴里人</strong><small>视频号运营数据中心</small></span>
        </a>
        <nav className="main-nav" aria-label="看板页面">
          <a href="/">运营总览</a>
          <a className="active" href="/content/">单篇内容</a>
        </nav>
        <div className="data-status"><i /> 累计数据更新至 2026.10.26</div>
      </header>

      <section className="content-hero">
        <div>
          <p className="eyebrow">CONTENT PERFORMANCE</p>
          <h1>单篇内容分析</h1>
          <p>拆解 {contentData.length} 条视频的播放效率、完播表现、互动质量与关注转化，找到可复用的内容结构。</p>
        </div>
        <div className="content-hero-stat"><span>当前分类·单篇最高播放</span><strong>{number.format(topContent.plays)}</strong><small>{topContent.date} · {topContent.title}</small></div>
      </section>

      <section className="content-filter" aria-label="内容类型筛选">
        {categories.map((key) => (
          <button type="button" key={key} className={category === key ? "active" : ""} aria-pressed={category === key} onClick={() => setCategory(key)}>{key}</button>
        ))}
      </section>

      <section className="content-kpis">
        <article className="content-kpi featured"><span>内容数量</span><strong>{filtered.length}</strong><small>{category}</small></article>
        <article className="content-kpi"><span>累计播放</span><strong>{number.format(totals.plays)}</strong><small>篇均 {number.format(Math.round(totals.plays / filtered.length))}</small></article>
        <article className="content-kpi"><span>加权完播率</span><strong>{percent(weightedCompletion)}</strong><small>按播放量加权</small></article>
        <article className="content-kpi"><span>综合互动率</span><strong>{percent(engagement)}</strong><small>推荐+喜欢+评论+分享</small></article>
        <article className="content-kpi"><span>新增关注</span><strong>+{number.format(totals.follows)}</strong><small>转化率 {percent(followRate)}</small></article>
      </section>

      <section className="content-grid">
        <article className="panel matrix-panel">
          <div className="panel-head"><div><p className="section-kicker">EFFICIENCY MATRIX</p><h2>内容效率四象限</h2></div><span className="subtle-note">分界线为当前分类平均值 · 气泡越大关注越高</span></div>
          <EfficiencyScatter data={filtered} />
          <div className="matrix-summary">
            {matrixQuadrants.map((quadrant) => (
              <div className={`matrix-summary-item ${quadrant.key}`} key={quadrant.key}>
                <div><span>{quadrant.title}</span><b>{quadrant.items.length}条</b></div>
                <small>{quadrant.rule}</small>
                <p>{quadrant.representative ? `代表：${quadrant.representative.title}` : "当前分类暂无内容"}</p>
              </div>
            ))}
          </div>
          <div className="category-legend">{categoryStats.map((item) => <span key={item.category}><i style={{ background: categoryColors[item.category as ContentCategory] }} />{item.category}</span>)}</div>
        </article>

        <aside className="panel category-panel">
          <div className="panel-head"><div><p className="section-kicker">FORMAT MIX</p><h2>内容类型效率</h2></div></div>
          <div className="category-cards">
            {categoryStats.map((item) => (
              <button type="button" key={item.category} onClick={() => setCategory(item.category as CategoryFilter)} className={category === item.category ? "active" : ""}>
                <div><span>{item.category}</span><b>{item.count}篇</b></div>
                <strong>{number.format(Math.round(item.avgPlays))}</strong><small>篇均播放</small>
                <i><em style={{ width: `${(item.avgPlays / maxAvgPlays) * 100}%`, background: categoryColors[item.category as ContentCategory] }} /></i>
                <p><span>互动 {item.engagement.toFixed(2)}%</span><span>关注 +{item.follows}</span></p>
              </button>
            ))}
          </div>
        </aside>
      </section>

      <section className="series-spotlight">
        <div className="series-heading"><div><p className="section-kicker">SERIES HIT LIST</p><h2>系列爆款榜</h2></div><span>爆款口径：单篇播放 ≥ {number.format(hitThreshold)} · 代表作取系列播放最高单篇</span></div>
        <div className="series-spotlight-grid">
          {seriesSpotlight.map((series, index) => (
            <article className={`series-spotlight-card ${index === 0 ? "leader" : ""}`} key={series.name}>
              <div className="spotlight-rank"><span>0{index + 1}</span><b>{series.hits.length} 条爆款</b></div>
              <h3>{series.name}</h3>
              <div className="spotlight-metrics">
                <div><span>系列播放</span><strong>{number.format(series.plays)}</strong></div>
                <div><span>新增关注</span><strong>+{series.follows}</strong></div>
              </div>
              <div className="spotlight-hit">
                <span>{series.hits.length ? "代表爆款" : "系列最高播放"}</span>
                <p>{series.topHit?.title ?? "暂无内容"}</p>
                <b>{series.topHit ? `${number.format(series.topHit.plays)} 播放` : "—"}</b>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="series-section">
        <div className="series-heading"><div><p className="section-kicker">SERIES COMPARISON</p><h2>系列完整表现</h2></div><span>查看内容数、篇均播放、互动率与关注转化</span></div>
        <SeriesCard items={backSeries} className="back-series" eyebrow="职场悬疑连续剧" title="《背锅侠》系列" />
        <SeriesCard items={palaceSeries} className="palace-series" eyebrow="古装财务短剧" title="《太子妃》系列" />
        <SeriesCard items={bossSeries} className="boss-series" eyebrow="霸总财务剧情" title="《霸总》系列" />
        <SeriesCard items={aiSeries} className="ai-series" eyebrow="AI财务内容" title="《AI财务》系列" />
      </section>

      <section className="panel content-ranking">
        <div className="panel-head">
          <div><p className="section-kicker">CONTENT RANKING</p><h2>单篇表现排行</h2></div>
          <div className="metric-switch" aria-label="排行指标">
            {(Object.keys(metricMeta) as RankMetric[]).map((key) => <button type="button" key={key} className={metric === key ? "active" : ""} aria-pressed={metric === key} onClick={() => setMetric(key)}>{metricMeta[key].label}</button>)}
          </div>
        </div>
        <div className="table-wrap">
          <table><thead><tr><th>排名</th><th>内容</th><th>类型</th><th>发布时间</th><th>播放</th><th>完播率</th><th>推荐</th><th>分享</th><th>关注</th><th>{metricMeta[metric].label}对比</th></tr></thead>
            <tbody>{ranking.map((item, index) => <tr key={`${item.date}-${item.title}`}>
              <td><span className={`rank rank-${index + 1}`}>{String(index + 1).padStart(2, "0")}</span></td>
              <td className="content-title-cell"><b>{item.title}</b></td>
              <td><span className="type-tag" style={{ color: categoryColors[item.category] }}>{item.category}</span></td>
              <td>{item.date}</td><td>{number.format(item.plays)}</td><td>{item.completion.toFixed(2)}%</td><td>{item.recommends}</td><td>{item.shares}</td><td>+{item.follows}</td>
              <td><div className="share-bar"><i style={{ width: `${(item[metric] / rankingMax) * 100}%` }} /></div></td>
            </tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="insights content-insights">
        <div className="insight-title"><p className="section-kicker">CONTENT INSIGHTS</p><h2>内容策略结论</h2></div>
        <article><span>01</span><h3>太子妃系列仍是增长主引擎</h3><p>{palaceSeries.length}集贡献{palaceFollows}个关注，占全部单篇关注的{palaceFollowShare.toFixed(1)}%，系列化剧情仍是最主要的关注来源。</p></article>
        <article><span>02</span><h3>10月21日新剧集表现最好</h3><p>《别惹她！卖鱼的竟是高考状元》首集获得3,853次播放和21个关注，是9月30日以后的最高播放内容。</p></article>
        <article><span>03</span><h3>AI财务系列需优化后半程</h3><p>AI财务系列已形成连续更新，但9月下旬至10月单篇播放偏低，建议强化开场冲突和单集独立看点。</p></article>
      </section>

      <footer><span>单篇累计口径：视频发布后截至2026.10.26的累计表现；“全部内容”的关注、点赞和推荐采用平台总览校准值</span><span>数据来源：视频号动态数据明细 · {contentData.length}条独立内容</span></footer>
    </main>
  );
}
