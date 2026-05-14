/**
 * 金文资讯站 - Supabase 上传模块
 * 负责去重、写入、维护数据库
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY   // 用 service_role key，有写权限
);

const TABLE = 'jinshu_articles';

export async function uploadArticles(articles) {
  if (!articles.length) {
    console.log('[DB] 无新内容需要写入');
    return;
  }

  console.log(`\n📤 写入 Supabase，共 ${articles.length} 条...`);

  // upsert：以 link 为唯一键去重（同一篇文章不重复写入）
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(articles, {
      onConflict: 'link',
      ignoreDuplicates: true,
    });

  if (error) {
    console.error('[DB] 写入失败:', error.message);
    throw error;
  }

  console.log(`[DB] 写入成功`);
  return data;
}

// 清理90天前的旧数据（可选，保持数据库轻量）
export async function cleanOldArticles(daysToKeep = 90) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .lt('published_at', cutoff.toISOString());

  if (error) {
    console.error('[DB] 清理失败:', error.message);
  } else {
    console.log(`[DB] 已清理 ${daysToKeep} 天前的数据`);
  }
}

// 获取所有文章（供前端静态生成用）
export async function exportArticles() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('published_at', { ascending: false })
    .limit(500);

  if (error) throw error;
  return data;
}
