/**
 * 金文资讯站 - 抓取模块
 * 支持类型：rss | web | cnki-search
 *
 * 环境标记（source.env）：
 *   'actions' → 仅 GitHub Actions 运行（境外IP，可访问 Scholar/RSSHub）
 *   'local'   → 仅本地运行（境内IP，可访问 CNKI）
 *   undefined → 两种环境都跑
 *
 * 运行时通过环境变量 RUN_ENV=local|actions 指定当前环境，
 * 不传则两种都跑（兼容旧行为）。
 */

import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import { SOURCES } from './sources.js';

// 当前运行环境：'local' | 'actions' | 'all'
const RUN_ENV = process.env.RUN_ENV || 'all';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; JinshuNews/1.0)',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
  },
  customFields: {
    item: [
      ['dc:creator', 'creator'],
      ['dc:date', 'dcDate'],
    ],
  },
});

// ── 环境过滤 ─────────────────────────────────────────────────

function shouldRun(source) {
  if (RUN_ENV === 'all') return true;
  if (!source.env) return true;
  return source.env === RUN_ENV;
}

// ── RSS 抓取（支持 fallback URL）────────────────────────────

async function fetchRSS(source) {
  const urls = [source.url, ...(source.fallbackUrls || [])];

  for (const url of urls) {
    try {
      console.log(`[RSS] 抓取 ${source.name} ...${url !== source.url ? ' (fallback)' : ''}`);
      const feed = await parser.parseURL(url);

      return feed.items.map(item => ({
        sourceId: source.id,
        sourceName: source.name,
        sourceShortName: source.shortName,
        category: source.category,
        priority: source.priority,
        title: item.title?.trim() || '',
        link: item.link || item.guid || '',
        summary: item.contentSnippet || item.content || item.summary || '',
        author: item.creator || item.author || '',
        publishedAt: item.pubDate || item.isoDate || item.dcDate || new Date().toISOString(),
        raw: item,
      }));
    } catch (err) {
      console.warn(`[RSS] 失败 ${source.name} (${url}): ${err.message}`);
    }
  }

  console.error(`[RSS] 所有URL均失败 ${source.name}`);
  return [];
}

// ── 网页抓取 ─────────────────────────────────────────────────

async function fetchWeb(source) {
  try {
    console.log(`[WEB] 抓取 ${source.name} ...`);
    const res = await fetch(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);
    const items = [];
    const sel = source.selector;

    $(sel.list).each((i, el) => {
      const titleEl = $(el).find(sel.title).first();
      const linkEl  = $(el).find(sel.link).first();
      const dateEl  = $(el).find(sel.date).first();

      const title = titleEl.text().trim();
      const href  = linkEl.attr('href') || '';
      const date  = dateEl.text().trim();

      if (!title || title.length < 4) return;

      let link = href;
      if (href && !href.startsWith('http')) {
        const base = new URL(source.url);
        link = href.startsWith('/')
          ? `${base.origin}${href}`
          : `${base.origin}/${href}`;
      }

      items.push({
        sourceId: source.id,
        sourceName: source.name,
        sourceShortName: source.shortName,
        category: source.category,
        priority: source.priority,
        title,
        link,
        summary: '',
        author: '',
        publishedAt: parseChineseDate(date) || new Date().toISOString(),
        raw: { title, href, date },
      });
    });

    console.log(`[WEB] ${source.name} 获得 ${items.length} 条`);
    return items;
  } catch (err) {
    console.error(`[WEB] 失败 ${source.name}: ${err.message}`);
    return [];
  }
}

// ── C: CNKI 关键词搜索 ────────────────────────────────────────
// 抓取 CNKI 高级检索结果（境内IP，本地跑）
// 反爬较严，加长延迟 + 完整UA

async function fetchCnkiSearch(source) {
  try {
    console.log(`[CNKI-SEARCH] 搜索 "${source.query}" ...`);

    const keywords = encodeURIComponent(source.query);
    const url = `https://kns.cnki.net/kns8s/brief/grid?dbCode=CFLD&kuasuId=CJFD%2CCCJD&kw=${keywords}&korder=dt&pageNum=1&pageSize=20`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': 'https://kns.cnki.net/kns8s/defaultresult/index',
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);
    const items = [];

    $('tr.odd, tr.even').each((i, el) => {
      const titleEl  = $(el).find('td.name a').first();
      const authorEl = $(el).find('td.author').first();
      const sourceEl = $(el).find('td.source a').first();
      const dateEl   = $(el).find('td.date').first();

      const title   = titleEl.text().trim();
      const href    = titleEl.attr('href') || '';
      const author  = authorEl.text().trim().replace(/;$/, '');
      const journal = sourceEl.text().trim();
      const date    = dateEl.text().trim();

      if (!title || title.length < 4) return;

      const link = href.startsWith('http')
        ? href
        : `https://kns.cnki.net${href}`;

      items.push({
        sourceId: source.id,
        sourceName: journal ? `${source.name} · ${journal}` : source.name,
        sourceShortName: source.shortName,
        category: source.category,
        priority: source.priority,
        title,
        link,
        summary: '',
        author,
        publishedAt: parseChineseDate(date) || new Date().toISOString(),
        raw: { title, href, author, journal, date },
      });
    });

    console.log(`[CNKI-SEARCH] "${source.query}" 获得 ${items.length} 条`);
    return items;
  } catch (err) {
    console.error(`[CNKI-SEARCH] 失败 "${source.query}": ${err.message}`);
    return [];
  }
}

// ── 工具函数 ─────────────────────────────────────────────────

function parseChineseDate(str) {
  if (!str) return null;
  const cleaned = str.replace(/年/g, '-').replace(/月/g, '-').replace(/日/g, '').trim();
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ── 主入口 ───────────────────────────────────────────────────

export async function fetchAll() {
  const results = [];
  const skipped = [];

  for (const source of SOURCES) {
    if (!shouldRun(source)) {
      skipped.push(source.name);
      continue;
    }

    let items = [];
    if (source.type === 'rss') {
      items = await fetchRSS(source);
    } else if (source.type === 'web') {
      items = await fetchWeb(source);
    } else if (source.type === 'cnki-search') {
      items = await fetchCnkiSearch(source);
    }

    results.push(...items);
    await new Promise(r => setTimeout(r, 800));
  }

  if (skipped.length) {
    console.log(`\n⏭  跳过（环境不符）: ${skipped.join('、')}`);
  }
  console.log(`\n✅ 共抓取 ${results.length} 条原始数据`);
  return results;
}
