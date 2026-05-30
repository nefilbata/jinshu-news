import { BUCKETS } from './sources.js';

export function todayInShanghai(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function compactArticle(article) {
  return {
    title: article.title,
    link: article.link,
    sourceName: article.sourceName,
    sourceShortName: article.sourceShortName,
    author: article.author || '',
    publishedAt: article.publishedAt,
    fetchedAt: article.fetchedAt,
    score: article.score,
    bucket: article.bucket,
    summary: article.summary,
    insight: article.insight,
    tags: article.tags || [],
    ai: Boolean(article.ai),
  };
}

function byScoreThenDate(a, b) {
  if (Number(b.score || 0) !== Number(a.score || 0)) return Number(b.score || 0) - Number(a.score || 0);
  return new Date(b.publishedAt || b.fetchedAt) - new Date(a.publishedAt || a.fetchedAt);
}

export function buildDigest({ date = todayInShanghai(), articles, failures = [], fetchedCount = 0 }) {
  const sorted = articles.slice().sort(byScoreThenDate);
  const highlights = sorted.filter((article) => article.bucket !== 'lowConfidence').slice(0, 5).map(compactArticle);
  const sections = {};

  for (const bucket of BUCKETS) sections[bucket.id] = [];

  for (const article of sorted) {
    const target = article.bucket === 'highlight' ? 'news' : article.bucket;
    if (!sections[target]) sections[target] = [];
    sections[target].push(compactArticle(article));
  }

  sections.highlight = highlights;
  sections.lowConfidence = sections.lowConfidence.slice(0, 8);

  return {
    date,
    title: `金文速递 ${date}`,
    generatedAt: new Date().toISOString(),
    fetchedCount,
    newCount: articles.length,
    failures,
    counts: Object.fromEntries(BUCKETS.map((bucket) => [bucket.id, sections[bucket.id]?.length || 0])),
    sections,
  };
}
