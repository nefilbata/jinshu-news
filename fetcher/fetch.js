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
  const text = cleanText(String(value))
    .replace(/[年月.]/g, '-')
    .replace(/[日号]/g, '')
    .replace(/\//g, '-');
  const match = text.match(/(20\d{2}|19\d{2})[-年.]?(\d{1,2})?[-月.]?(\d{1,2})?/);
  if (match) {
    const [, year, month = '1', day = '1'] = match;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function fetchRSS(source) {
  const urls = [source.url, ...(source.fallbackUrls || [])];
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
          publishedAt: parseDate(item.pubDate || item.isoDate || item.dcDate) || new Date().toISOString(),
          fetchedAt: new Date().toISOString(),
        }))
        .filter((item) => item.title && item.link);
    } catch (error) {
      console.warn(`[fetch] RSS source skipped: ${source.name} (${url}) ${error.message}`);
    }
  }
  return [];
}

async function fetchWeb(source) {
  try {
    const response = await withRetry(`${source.id} web`, () => fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JinshuNews/2.0)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.6',
      },
      signal: AbortSignal.timeout(16000),
    }));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await responseText(response);
    const $ = cheerio.load(html);
    const items = [];
    const selector = source.selector;

    $(selector.list).each((_, element) => {
      const titleNode = $(element).find(selector.title).first();
      const linkNode = $(element).find(selector.link).first();
      const dateNode = $(element).find(selector.date).first();
      const title = cleanText(titleNode.text());
      const href = linkNode.attr('href') || titleNode.attr('href') || '';

      if (!title || title.length < 4 || !href) return;

      items.push({
        id: `${source.id}:${href}`,
        sourceId: source.id,
        sourceName: source.name,
        sourceShortName: source.shortName,
        sourcePriority: source.priority,
        bucketHint: source.bucket,
        title,
        link: absolutizeUrl(href, source.url),
        author: '',
        excerpt: '',
        publishedAt: parseDate(dateNode.text()) || new Date().toISOString(),
        fetchedAt: new Date().toISOString(),
      });
    });

    return items;
  } catch (error) {
    console.warn(`[fetch] Web source skipped: ${source.name} ${error.message}`);
    return [];
  }
}

export async function fetchAll({ limitSources } = {}) {
  const selectedSources = Number.isFinite(limitSources) ? SOURCES.slice(0, limitSources) : SOURCES;
  const allItems = [];
  const failures = [];

  for (const source of selectedSources) {
    try {
      console.log(`[fetch] ${source.shortName || source.name}`);
      const items = source.type === 'rss' ? await fetchRSS(source) : await fetchWeb(source);
      allItems.push(...items);
      await sleep(400);
    } catch (error) {
      failures.push({ sourceId: source.id, name: source.name, error: error.message });
    }
  }

  return { items: allItems, failures };
}
