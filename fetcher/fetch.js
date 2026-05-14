/**
 * 金文资讯站 - 抓取模块
 * 支持 RSS 和网页两种来源
 */

import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import { SOURCES } from './sources.js';

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

// ── RSS 抓取 ─────────────────────────────────────────────────

async function fetchRSS(source) {
  try {
    console.log(`[RSS] 抓取 ${source.name} ...`);
    const feed = await parser.parseURL(source.url);

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
    console.error(`[RSS] 失败 ${source.name}: ${err.message}`);
    return [];
  }
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

    // 找到文章列表元素
    $(sel.list).each((i, el) => {
      const titleEl = $(el).find(sel.title).first();
      const linkEl = $(el).find(sel.link).first();
      const dateEl = $(el).find(sel.date).first();

      const title = titleEl.text().trim();
      const href = linkEl.attr('href') || '';
      const date = dateEl.text().trim();

      if (!title || title.length < 4) return; // 跳过无效行

      // 处理相对URL
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
        summary: '',          // 网页抓取一般没有摘要，后续 AI 来补
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

// 中文日期解析，如「2024-03-15」「2024年3月15日」
function parseChineseDate(str) {
  if (!str) return null;
  // 尝试标准格式
  const cleaned = str.replace(/年/g, '-').replace(/月/g, '-').replace(/日/g, '');
  const d = new Date(cleaned.trim());
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ── 主入口 ───────────────────────────────────────────────────

export async function fetchAll() {
  const results = [];

  for (const source of SOURCES) {
    let items = [];
    if (source.type === 'rss') {
      items = await fetchRSS(source);
    } else if (source.type === 'web') {
      items = await fetchWeb(source);
    }
    results.push(...items);

    // 礼貌性延迟，避免对学术网站造成压力
    await new Promise(r => setTimeout(r, 800));
  }

  console.log(`\n✅ 共抓取 ${results.length} 条原始数据`);
  return results;
}
