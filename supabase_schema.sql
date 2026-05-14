-- 金文资讯站 - Supabase 数据表
-- 在 Supabase SQL Editor 中执行此文件

-- 主文章表
create table if not exists jinshu_articles (
  id          bigserial primary key,
  source_id   text not null,
  source_name text not null,
  source_short_name text,
  category    text,          -- '考古文物' | '出土文献' | '学术机构'
  title       text not null,
  link        text unique not null,   -- 唯一键，用于去重
  author      text,
  summary     text,          -- AI 生成摘要
  score       int,           -- AI 相关度分数 1-100
  tags        text[],        -- AI 打标签
  published_at timestamptz,
  fetched_at  timestamptz default now()
);

-- 索引（加快前端查询）
create index if not exists idx_jinshu_published  on jinshu_articles(published_at desc);
create index if not exists idx_jinshu_score      on jinshu_articles(score desc);
create index if not exists idx_jinshu_category   on jinshu_articles(category);
create index if not exists idx_jinshu_source     on jinshu_articles(source_id);

-- 开启 Row Level Security（仅允许读，写由 service_role 完成）
alter table jinshu_articles enable row level security;

create policy "Public read" on jinshu_articles
  for select using (true);

-- 让前端可以匿名查询
-- 注意：写入通过 service_role key，不走 RLS
