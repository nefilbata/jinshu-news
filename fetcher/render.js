import { BUCKETS } from './sources.js';

const bucketTitle = new Map(BUCKETS.map((bucket) => [bucket.id, bucket.title]));

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(value) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(value));
  } catch {
    return '';
  }
}

function renderArticle(article) {
  const tags = (article.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
  return `<article class="item">
    <div class="meta">${escapeHtml(article.sourceShortName || article.sourceName || '')} · ${formatDate(article.publishedAt)} · 相关度 ${Math.round(article.score || 0)}</div>
    <h3><a href="${escapeHtml(article.link)}">${escapeHtml(article.title)}</a></h3>
    <p>${escapeHtml(article.summary || '')}</p>
    ${article.insight ? `<p class="insight">${escapeHtml(article.insight)}</p>` : ''}
    ${tags ? `<div class="tags">${tags}</div>` : ''}
  </article>`;
}

export function renderEmailHtml(digest) {
  const sections = BUCKETS
    .filter((bucket) => bucket.id !== 'highlight')
    .map((bucket) => {
      const items = digest.sections[bucket.id] || [];
      if (!items.length) return '';
      return `<section>
        <h2>${escapeHtml(bucket.title)} <span>${items.length}</span></h2>
        ${items.slice(0, bucket.id === 'lowConfidence' ? 6 : 12).map(renderArticle).join('')}
      </section>`;
    })
    .join('');

  const failures = digest.failures?.length
    ? `<p class="failures">部分信源本次未抓取成功：${escapeHtml(digest.failures.map((item) => item.name).join('、'))}</p>`
    : '';
  const sources = digest.sourceStats?.length
    ? `<p class="source-stats">来源分布：${escapeHtml(digest.sourceStats.slice(0, 8).map((item) => `${item.source} ${item.count}`).join(' · '))}</p>`
    : '';
  const lead = digest.mode === 'fallback'
    ? `本次没有全新条目，以下展示 ${digest.contentCount} 条近期高相关候选供复核。抓取 ${digest.fetchedCount} 条。`
    : `新增 ${digest.newCount} 条，展示 ${digest.contentCount} 条。抓取 ${digest.fetchedCount} 条。AI 负责筛选和提要，原文仍以链接为准。`;

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(digest.title)}</title>
<style>
  body { margin: 0; background: #f6f2eb; color: #20160f; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif; line-height: 1.72; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 28px 18px 42px; }
  header { border-bottom: 2px solid #8a4b22; padding-bottom: 18px; margin-bottom: 24px; }
  h1 { margin: 0 0 6px; font-family: Georgia, "Noto Serif SC", serif; font-size: 28px; letter-spacing: 0; }
  .lead { margin: 0; color: #766655; font-size: 14px; }
  h2 { margin: 30px 0 12px; padding-bottom: 8px; border-bottom: 1px solid #d8cab9; font-size: 18px; }
  h2 span { color: #8a4b22; font-size: 13px; }
  .item { background: #fffaf3; border: 1px solid #e2d6c8; border-radius: 8px; padding: 15px 16px; margin: 12px 0; }
  .meta { color: #8b7a68; font-size: 12px; margin-bottom: 4px; }
  h3 { font-size: 16px; margin: 0 0 8px; line-height: 1.45; }
  a { color: #743a18; text-decoration: none; }
  p { margin: 7px 0; }
  .insight { color: #4c3b2d; border-left: 3px solid #c48755; padding-left: 10px; }
  .tag { display: inline-block; margin: 5px 6px 0 0; padding: 1px 7px; border: 1px solid #d7bda5; border-radius: 999px; color: #7a4427; font-size: 12px; }
  .failures { color: #8b5b2f; font-size: 13px; }
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>${escapeHtml(digest.title)}</h1>
      <p class="lead">${escapeHtml(lead)}</p>
    </header>
    ${failures}
    ${sources}
    <section>
      <h2>${escapeHtml(bucketTitle.get('highlight'))} <span>${digest.sections.highlight?.length || 0}</span></h2>
      ${(digest.sections.highlight || []).map(renderArticle).join('') || '<p>今日没有高相关新内容。</p>'}
    </section>
    ${sections}
  </div>
</body>
</html>`;
}

export function renderPlainText(digest) {
  const lead = digest.mode === 'fallback'
    ? `本次没有全新条目，展示 ${digest.contentCount} 条近期高相关候选供复核。抓取 ${digest.fetchedCount} 条。`
    : `新增 ${digest.newCount} 条，展示 ${digest.contentCount} 条。抓取 ${digest.fetchedCount} 条。`;
  const lines = [`${digest.title}`, lead, ''];
  if (digest.sourceStats?.length) {
    lines.push(`来源分布：${digest.sourceStats.slice(0, 8).map((item) => `${item.source} ${item.count}`).join(' · ')}`);
    lines.push('');
  }
  for (const bucket of BUCKETS) {
    const items = digest.sections[bucket.id] || [];
    if (!items.length) continue;
    lines.push(`## ${bucket.title}`);
    for (const item of items.slice(0, bucket.id === 'lowConfidence' ? 6 : 12)) {
      lines.push(`- ${item.title}`);
      lines.push(`  ${item.sourceShortName || item.sourceName || ''} | 相关度 ${Math.round(item.score || 0)} | ${item.link}`);
      if (item.summary) lines.push(`  ${item.summary}`);
      if (item.insight) lines.push(`  解读：${item.insight}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export function renderArchiveHtml() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>金文速递</title>
<style>
  :root { --ink:#20160f; --muted:#766655; --paper:#f7f2ea; --panel:#fffaf3; --line:#e1d4c4; --accent:#8a4b22; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--paper); color:var(--ink); font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif; line-height:1.68; }
  header { position:sticky; top:0; background:rgba(247,242,234,.94); backdrop-filter:blur(12px); border-bottom:1px solid var(--line); z-index:2; }
  .bar { max-width:1120px; margin:auto; padding:14px 20px; display:flex; gap:18px; align-items:center; }
  h1 { font-family:Georgia,"Noto Serif SC",serif; font-size:22px; margin:0; }
  input, select { border:1px solid var(--line); border-radius:8px; background:#fff; padding:9px 11px; min-width:0; }
  input { flex:1; }
  main { max-width:1120px; margin:0 auto; padding:24px 20px 60px; display:grid; grid-template-columns:280px 1fr; gap:24px; }
  .panel { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:16px; }
  .digest { margin-bottom:14px; cursor:pointer; }
  .digest strong { display:block; color:var(--accent); }
  .digest span, .meta { color:var(--muted); font-size:12px; }
  .item { padding:16px 0; border-bottom:1px solid var(--line); }
  .item:last-child { border-bottom:0; }
  h2 { margin:0 0 12px; font-size:18px; }
  h3 { margin:0 0 6px; font-size:17px; line-height:1.45; }
  a { color:var(--accent); text-decoration:none; }
  p { margin:6px 0; }
  .tag { display:inline-block; margin:5px 6px 0 0; padding:1px 7px; border:1px solid #d7bda5; border-radius:999px; color:#7a4427; font-size:12px; }
  @media (max-width:760px){ .bar{flex-wrap:wrap}.bar h1{width:100%} main{display:block}.panel{margin-bottom:16px} }
</style>
</head>
<body>
<header>
  <div class="bar">
    <h1>金文速递</h1>
    <input id="q" placeholder="搜索标题、摘要、标签">
    <select id="bucket">
      <option value="">全部门类</option>
      <option value="paper">论文/期刊</option>
      <option value="book">新书</option>
      <option value="lecture">讲座/会议</option>
      <option value="news">新闻动态</option>
      <option value="lowConfidence">低置信度</option>
    </select>
  </div>
</header>
<main>
  <aside class="panel">
    <h2>日报归档</h2>
    <div id="digests"></div>
  </aside>
  <section class="panel">
    <h2 id="title">最新条目</h2>
    <div id="items"></div>
  </section>
</main>
<script>
const bucketNames = { paper:'论文/期刊', book:'新书', lecture:'讲座/会议', news:'新闻动态', lowConfidence:'低置信度', highlight:'今日重点' };
let state = { data:null, digest:null };
const esc = s => String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const fmt = s => s ? new Intl.DateTimeFormat('zh-CN').format(new Date(s)) : '';
function allDigestItems(digest){
  return Object.entries(digest.sections || {}).flatMap(([bucket, items]) => bucket === 'highlight' ? [] : (items || []).map(item => ({...item, bucket})));
}
function renderDigests(){
  const el = document.querySelector('#digests');
  el.innerHTML = (state.data.digests || []).map((digest, index) => \`<div class="digest" data-i="\${index}"><strong>\${esc(digest.date)}</strong><span>新增 \${digest.newCount} 条</span></div>\`).join('') || '<p>暂无日报。</p>';
  el.querySelectorAll('.digest').forEach(node => node.addEventListener('click', () => {
    state.digest = state.data.digests[Number(node.dataset.i)];
    renderItems();
  }));
}
function renderItems(){
  const q = document.querySelector('#q').value.trim().toLowerCase();
  const bucket = document.querySelector('#bucket').value;
  const source = state.digest ? allDigestItems(state.digest) : (state.data.articles || []);
  const filtered = source.filter(item => {
    const text = [item.title,item.summary,item.insight,(item.tags || []).join(' ')].join(' ').toLowerCase();
    return (!q || text.includes(q)) && (!bucket || item.bucket === bucket);
  });
  document.querySelector('#title').textContent = state.digest ? \`\${state.digest.date} 日报\` : '最新条目';
  document.querySelector('#items').innerHTML = filtered.map(item => \`
    <article class="item">
      <div class="meta">\${esc(item.sourceShortName || item.sourceName)} · \${fmt(item.publishedAt)} · \${bucketNames[item.bucket] || ''} · 相关度 \${Math.round(item.score || 0)}</div>
      <h3><a href="\${esc(item.link)}" target="_blank" rel="noreferrer">\${esc(item.title)}</a></h3>
      <p>\${esc(item.summary || '')}</p>
      \${item.insight ? \`<p>解读：\${esc(item.insight)}</p>\` : ''}
      <div>\${(item.tags || []).map(tag => \`<span class="tag">\${esc(tag)}</span>\`).join('')}</div>
    </article>\`).join('') || '<p>没有匹配条目。</p>';
}
fetch('./data.json').then(r => r.json()).then(data => {
  state.data = data;
  renderDigests();
  renderItems();
});
document.querySelector('#q').addEventListener('input', renderItems);
document.querySelector('#bucket').addEventListener('change', renderItems);
</script>
</body>
</html>`;
}
