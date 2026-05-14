/**
 * 从 Supabase 导出数据为 web/data.json
 * 供 GitHub Pages 静态前端读取
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

async function exportToJSON() {
  console.log('📦 导出数据到 web/data.json ...');

  const { data, error } = await supabase
    .from('jinshu_articles')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(300);

  if (error) throw error;

  const output = {
    updatedAt: new Date().toISOString(),
    total: data.length,
    articles: data,
  };

  const outPath = join(__dirname, '../web/data.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`✅ 导出完成，共 ${data.length} 条，写入 web/data.json`);
}

exportToJSON().catch(err => {
  console.error('导出失败:', err);
  process.exit(1);
});
