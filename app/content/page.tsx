"use client";

import { useMemo, useState } from "react";
import { contentData, type ContentCategory, type ContentItem } from "./content-data";

type RankMetric = "plays" | "follows" | "recommends" | "shares" | "completion";
type CategoryFilter = "全部内容" | ContentCategory;

const number = new Intl.NumberFormat("zh-CN");
const categories: CategoryFilter[] = ["全部内容", "职场共鸣/知识", "剧情动画", "背锅侠系列", "太子妃系列"];
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
};

function sum(data: ContentItem[], key: "plays" | "recommends" | "likes" | "comments" | "shares" | "follows") {
  return data.reduce((total, item) => total + item[key], 0);
}

function percent(value: number) {
  return `${value.toFixed(2)}%`;
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

  return (
    <svg className="scatter-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="单篇内容完播率与播放量效率矩阵，气泡大小表示关注量">
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
      <text className="matrix-note" x={left + 8} y={top + 15}>高播放 · 低完播</text>
      <text className="matrix-note" x={left + plotW - 8} y={top + 15} textAnchor="end">高播放 · 高完播</text>
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

  const totals = useMemo(() => ({
    plays: sum(filtered, "plays"),
    recommends: sum(filtered, "recommends"),
    likes: sum(filtered, "likes"),
    comments: sum(filtered, "comments"),
    shares: sum(filtered, "shares"),
    follows: sum(filtered, "follows"),
  }), [filtered]);
  const weightedCompletion = filtered.reduce((total, item) => total + item.completion * item.plays, 0) / Math.max(totals.plays, 1);
  const engagement = (totals.recommends + totals.likes + totals.comments + totals.shares) / Math.max(totals.plays, 1) * 100;
  const followRate = totals.follows / Math.max(totals.plays, 1) * 100;
  const ranking = [...filtered].sort((a, b) => b[metric] - a[metric]).slice(0, 10);
  const rankingMax = Math.max(...ranking.map((item) => item[metric]), 1);

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
  const allPlays = sum(contentData, "plays");
  const allFollows = sum(contentData, "follows");
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
        <div className="data-status"><i /> 累计数据更新至 2026.08.27</div>
      </header>

      <section className="content-hero">
        <div>
          <p className="eyebrow">CONTENT PERFORMANCE</p>
          <h1>单篇内容分析</h1>
          <p>拆解 {contentData.length} 条视频的播放效率、完播表现、互动质量与关注转化，找到可复用的内容结构。</p>
        </div>
        <div className="content-hero-stat"><span>累计单篇播放</span><strong>{number.format(allPlays)}</strong><small>2026.04.22 — 08.27</small></div>
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
          <div className="panel-head"><div><p className="section-kicker">EFFICIENCY MATRIX</p><h2>内容效率矩阵</h2></div><span className="subtle-note">气泡越大，关注贡献越高</span></div>
          <EfficiencyScatter data={filtered} />
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

      <section className="series-section">
        <div className="series-heading"><p className="section-kicker">SERIES COMPARISON</p><h2>两条系列内容的增长能力</h2></div>
        <article className="series-card back-series">
          <div><span>职场悬疑连续剧</span><h3>《背锅侠》系列</h3><p>{backSeries.length}集 · 累计播放 {number.format(sum(backSeries, "plays"))} · 关注 +{sum(backSeries, "follows")}</p></div>
          <div className="episode-bars">{backSeries.map((item, index) => <i key={item.date} style={{ height: `${Math.max(item.plays / Math.max(...backSeries.map((x) => x.plays)) * 100, 8)}%` }}><span>{index + 1}</span></i>)}</div>
        </article>
        <article className="series-card palace-series">
          <div><span>古装财务短剧</span><h3>《太子妃》系列</h3><p>{palaceSeries.length}集 · 累计播放 {number.format(sum(palaceSeries, "plays"))} · 关注 +{palaceFollows}</p></div>
          <div className="episode-bars">{palaceSeries.map((item, index) => <i key={item.date} style={{ height: `${Math.max(item.plays / Math.max(...palaceSeries.map((x) => x.plays)) * 100, 8)}%` }}><span>{index + 1}</span></i>)}</div>
        </article>
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
        <article><span>01</span><h3>太子妃系列仍是增长主引擎</h3><p>{palaceSeries.length}集贡献{palaceFollows}个关注，占全部单篇关注的{palaceFollowShare.toFixed(1)}%；新增剧集持续带来关注转化。</p></article>
        <article><span>02</span><h3>高完播并不等于高关注</h3><p>5月13日、6月9日和6月23日完播率均超55%，但关注贡献有限，需要补强系列承诺和关注理由。</p></article>
        <article><span>03</span><h3>背锅侠收官集关注转化回升</h3><p>第9集播放1,187却带来14个关注，低于第6集的播放规模，但悬念揭晓和大结局预告提高了转化效率。</p></article>
      </section>

      <footer><span>单篇累计口径：视频发布后的累计表现，不与首页按日新增口径直接相加</span><span>数据来源：视频号动态数据明细 · {contentData.length}条独立内容</span></footer>
    </main>
  );
}
