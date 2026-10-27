import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';
import Parser from 'rss-parser';
import { SOURCES } from './sources.js';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'JinshuNews/2.0 (+https://github.com/nefilbata/jinshu-news)',
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
  },
  customFields: {
    item: [
      ['dc:creator', 'creator'],
      ['dc:date', 'dcDate'],
    ],
  },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sniffCharset(bytes, contentType = '') {
  const headerMatch = contentType.match(/charset=([^;]+)/i);
  if (headerMatch) return headerMatch[1].trim().toLowerCase();

  const ascii = Buffer.from(bytes.slice(0, 1024)).toString('latin1');
  const declared = ascii.match(/encoding=["']([^"']+)["']/i) || ascii.match(/charset=["']?([^"'\s/>]+)/i);
  return declared ? declared[1].trim().toLowerCase() : 'utf-8';
}

function normalizeCharset(charset) {
  if (['gb2312', 'gbk', 'gb18030'].includes(charset)) return 'gb18030';
  if (['utf8', 'utf-8'].includes(charset)) return 'utf-8';
  return charset || 'utf-8';
}

async function responseText(response) {
  const bytes = Buffer.from(await response.arrayBuffer());
  const charset = normalizeCharset(sniffCharset(bytes, response.headers.get('content-type') || ''));
  if (charset !== 'utf-8') return iconv.decode(bytes, charset);
  return bytes.toString('utf8');
}

async function withRetry(label, task, attempts = 2) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      console.warn(`[fetch] ${label} failed (${i + 1}/${attempts}): ${error.message}`);
      if (i + 1 < attempts) await sleep(800 * (i + 1));
    }
  }
  throw lastError;
}

function cleanText(value = '') {
  return value.replace(/\s+/g, ' ').trim();
}

function absolutizeUrl(href, baseUrl) {
  if (!href) return '';
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return href;
  }
}

export function parseDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(String(value))) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const text = cleanText(String(value))
    .replace(/[年月.]/g, '-')
    .replace(/[日号]/g, '')
    .replace(/\//g, '-');
  // Require a complete numeric date. RFC 822 dates must reach Date's parser.
  const match = text.match(/\b((?:20|19)\d{2})-\s*(\d{1,2})-?\s*(\d{1,2})\b/);
  if (match) {
    const [, year, month, day] = match;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (date.getUTCFullYear() === Number(year) && date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day)) return date.toISOString();
    return null;
  }
  if (!/[A-Za-z]/.test(text)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function fetchRSS(source) {
  const urls = [source.url, ...(source.fallbackUrls || [])];
  const errors = [];
  for (const url of urls) {
    try {
      const xml = await withRetry(`${source.id} rss`, async () => {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'JinshuNews/2.0 (+https://github.com/nefilbata/jinshu-news)',
            Accept: 'application/rss+xml, application/xml, text/xml, */*',
          },
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return responseText(response);
      });
      const feed = await parser.parseString(xml);
      return feed.items
        .map((item) => ({
          id: `${source.id}:${item.guid || item.link || item.title}`,
          sourceId: source.id,
          sourceName: source.name,
          sourceShortName: source.shortName,
          sourcePriority: source.priority,
          bucketHint: source.bucket,
          title: cleanText(item.title || ''),
          link: item.link || item.guid || url,
          author: cleanText(item.creator || item.author || ''),
          excerpt: cleanText(item.contentSnippet || item.summary || item.content || ''),
          publishedAt: parseDate(item.isoDate || item.pubDate || item.dcDate) || null,
          fetchedAt: new Date().toISOString(),
        }))
        .filter((item) => item.title && item.link);
    } catch (error) {
      errors.push(`${url}: ${error.message}${error.cause?.message ? ` (${error.cause.message})` : ''}`);
    }
  }
  throw new Error(errors.join('; '));
}

export function parseWeb(html, source) {
  const $ = cheerio.load(html);
  const items = new Map();
  const selector = source.selector;
  if (!$(selector.list).length) throw new Error(`列表选择器无匹配: ${selector.list}`);
  $(selector.list).each((_, element) => {
    const titleNode = $(element).find(selector.title).first();
    const linkNode = $(element).find(selector.link).first();
    const dateNode = $(element).find(selector.date).first();
    const title = cleanText(titleNode.text());
    const href = linkNode.attr('href') || titleNode.attr('href') || '';
    const link = absolutizeUrl(href, source.url);
    if (!title || title.length < 4 || !/^https?:\/\//.test(link) || !href || href.startsWith('#')) return;
    const rawDate = selector.dateAttribute
      ? (linkNode.attr(selector.dateAttribute) || '').match(/(?:發布時間|发布时间)[：:]\s*([^\r\n]+)/)?.[1]
      : dateNode.attr('datetime') || dateNode.text();
    items.set(link, {
      id: `${source.id}:${link}`, sourceId: source.id, sourceName: source.name,
      sourceShortName: source.shortName, sourcePriority: source.priority,
      bucketHint: source.bucket, title, link, author: '', excerpt: '',
      publishedAt: parseDate(rawDate) || null, fetchedAt: new Date().toISOString(),
    });
  });
  if (!items.size) throw new Error('页面可访问，但未解析到有效文章');
  return [...items.values()];
}

async function fetchWeb(source) {
  const html = await withRetry(`${source.id} web`, async () => {
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JinshuNews/2.0)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.6',
      },
      signal: AbortSignal.timeout(16000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return responseText(response);
  });
  return parseWeb(html, source);
}

export async function fetchAll({ limitSources, sources = SOURCES } = {}) {
  const selectedSources = Number.isFinite(limitSources) ? sources.slice(0, limitSources) : sources;
  const allItems = [];
  const failures = [];
  const sourceResults = [];

  for (const source of selectedSources) {
    try {
      console.log(`[fetch] ${source.shortName || source.name}`);
      const items = source.type === 'rss' ? await fetchRSS(source) : await fetchWeb(source);
      allItems.push(...items);
      sourceResults.push({ sourceId: source.id, name: source.name, status: 'ok', count: items.length, undatedCount: items.filter(item => !item.publishedAt).length });
      console.log(`[fetch] ${source.id}: ${items.length} items`);
      await sleep(400);
    } catch (error) {
      const failure = { sourceId: source.id, name: source.name, error: `${error.message}${error.cause?.message ? ` (${error.cause.message})` : ''}` };
      failures.push(failure);
      sourceResults.push({ ...failure, status: 'failed', count: 0 });
      console.warn(`[fetch] ${source.id}: FAILED ${failure.error}`);
    }
  }

  return { items: allItems, failures, sourceResults };
}
