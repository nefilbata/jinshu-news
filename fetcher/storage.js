import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = join(__dirname, '..');
export const DATA_DIR = join(ROOT_DIR, 'data');
export const DIGEST_DIR = join(DATA_DIR, 'digests');
export const DOCS_DIR = join(ROOT_DIR, 'docs');
export const ARTICLES_PATH = join(DATA_DIR, 'articles.json');
export const DOCS_DATA_PATH = join(DOCS_DIR, 'data.json');

export async function ensureDirs() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(DIGEST_DIR, { recursive: true });
  await mkdir(DOCS_DIR, { recursive: true });
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function normalizeTitle(title = '') {
  return title
    .toLowerCase()
    .replace(/[《》“”‘’"'`[\]（）()【】〈〉<>]/g, '')
    .replace(/\s+/g, '')
    .replace(/[，。！？；：、,.!?;:]/g, '')
    .trim();
}

function articleKey(article) {
  const titleKey = normalizeTitle(article.title);
  if (titleKey) return `title:${titleKey}`;
  return `link:${article.link}`;
}

export async function loadArticles() {
  const payload = await readJson(ARTICLES_PATH, { updatedAt: null, articles: [] });
  return Array.isArray(payload.articles) ? payload.articles : [];
}

export async function saveArticles(articles) {
  const sorted = articles
    .sort((a, b) => new Date(b.publishedAt || b.fetchedAt) - new Date(a.publishedAt || a.fetchedAt))
    .slice(0, 1200);
  await writeJson(ARTICLES_PATH, {
    updatedAt: new Date().toISOString(),
    total: sorted.length,
    articles: sorted,
  });
  return sorted;
}

export function mergeArticles(existingArticles, incomingArticles) {
  const existingByKey = new Map(existingArticles.map((article) => [articleKey(article), article]));
  const newArticles = [];

  for (const article of incomingArticles) {
    const key = articleKey(article);
    const existing = existingByKey.get(key);
    if (!existing) {
      const stored = { ...article, firstSeenAt: new Date().toISOString(), lastSeenAt: new Date().toISOString() };
      existingByKey.set(key, stored);
      newArticles.push(stored);
      continue;
    }

    const better = Number(article.score || 0) > Number(existing.score || 0);
    const merged = {
      ...existing,
      ...(better ? article : {}),
      sources: Array.from(new Set([...(existing.sources || [existing.sourceShortName || existing.sourceName]), article.sourceShortName || article.sourceName].filter(Boolean))),
      lastSeenAt: new Date().toISOString(),
    };
    existingByKey.set(key, merged);
  }

  return {
    articles: Array.from(existingByKey.values()),
    newArticles,
  };
}

export async function saveDigest(digest) {
  const path = join(DIGEST_DIR, `${digest.date}.json`);
  await writeJson(path, digest);
  return path;
}

export async function loadDigests() {
  const data = await readJson(DOCS_DATA_PATH, { digests: [] });
  return Array.isArray(data.digests) ? data.digests : [];
}

export async function updateDocsData(digest, articles) {
  const previous = await readJson(DOCS_DATA_PATH, { digests: [] });
  const digests = [digest, ...(previous.digests || []).filter((item) => item.date !== digest.date)].slice(0, 120);
  const latestArticles = articles
    .slice()
    .sort((a, b) => new Date(b.publishedAt || b.fetchedAt) - new Date(a.publishedAt || a.fetchedAt))
    .slice(0, 400);

  await writeJson(DOCS_DATA_PATH, {
    updatedAt: new Date().toISOString(),
    articleCount: articles.length,
    digestCount: digests.length,
    digests,
    articles: latestArticles,
  });
}
