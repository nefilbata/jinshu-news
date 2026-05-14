/**
 * 从 Supabase 导出数据为 docs/data.json
 * 供 GitHub Pages 静态前端读取
 * 含标题去重：同一篇文章被多个期刊收录时，保留 score 最高的那条
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * 标题归一化：去除书名号、空格、标点差异，方便比对
 */
function normalizeTitle(title) {
  return (title || '')
    .replace(/[《》【】\[\]「」\s]/g, '')
    .replace(/[——–—]/g, '-')
    .toLowerCase()
    .trim();
}

/**
 * 按标题去重，保留 score 最高的条目
 * 若 score 相同，保留 published_at 更新的
 */
function deduplicateByTitle(articles) {
  const map = new Map();

  for (const a of articles) {
    const key = normalizeTitle(a.title);
    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, a);
    } else {
      const existing = map.get(key);
      const existingScore = existing.score || 0;
      const currentScore = a.score || 0;

      if (
        currentScore > existingScore ||
        (currentScore === existingScore &&
          new Date(a.published_at) > new Date(existing.published_at))
      ) {
        map.set(key, a);
      }
    }
  }

  return Array.from(map.values());
}

async function exportToJSON() {
  console.log('📦 导出数据到 docs/data.json ...');

  // 多取一些以抵消去重损耗
  const { data, error } = await supabase
    .from('jinshu_articles')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(500);

  if (error) throw error;

  const before = data.length;
  const deduped = deduplicateByTitle(data);
  // 去重后重新按 published_at 降序排列，最多保留 300 条
  deduped.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
  const articles = deduped.slice(0, 300);

  console.log(`   原始 ${before} 条 → 去重后 ${deduped.length} 条 → 输出 ${articles.length} 条`);

  // 近7日统计使用 fetched_at（抓取时间），而非 published_at（期刊发表日期）
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const recentCount = articles.filter(a => (a.fetched_at || a.published_at) >= sevenDaysAgo).length;

  const output = {
    updatedAt: new Date().toISOString(),
    total: articles.length,
    recentCount,
    articles,
  };

  const outPath = join(__dirname, '../docs/data.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`✅ 导出完成，共 ${articles.length} 条，近7日新增 ${recentCount} 条`);
}

exportToJSON().catch(err => {
  console.error('导出失败:', err);
  process.exit(1);
});
