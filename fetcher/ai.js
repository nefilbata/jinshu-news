/**
 * 金文资讯站 - AI 处理模块
 * 用 Claude API 做三件事：
 * 1. 判断是否与金文/出土文献相关
 * 2. 生成中文摘要（100字以内）
 * 3. 打相关度分数（1-100）和二级标签
 */

import Anthropic from '@anthropic-ai/sdk';
import { JINSHU_KEYWORDS } from './sources.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// 先用关键词做初步过滤，节省 API 调用
function keywordFilter(item) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  return JINSHU_KEYWORDS.some(kw => text.includes(kw));
}

// 批量处理，每批8条，控制并发和费用
const BATCH_SIZE = 8;

async function processWithAI(items) {
  const prompt = `你是一位专治金文（青铜器铭文）与出土文献的学术助手。
请对以下学术条目逐一处理，返回 JSON 数组。

对每条数据：
1. relevant (boolean)：判断是否与金文、青铜器铭文、出土文献、甲骨文、先秦史相关。
   - 若标题/摘要完全无关（如纯考古发掘技术、现代文物保护材料等），标为 false
   - 有任何关联可能则标为 true，宁可误收不要漏
2. score (1-100)：与金文研究的相关度。纯金文铭文研究=90+；青铜器考古=70-89；先秦史相关=50-69；周边相关=30-49
3. summary (string)：不超过80字的中文摘要。若原文有摘要则压缩改写；若无（仅有标题）则根据标题推断研究方向，注明「（据题推断）」
4. tags (string[])：从以下选1-3个最合适的标签：
   ["金文考释", "青铜器", "出土文献", "历史年代", "先秦史", "甲骨文", "考古发掘", "器物研究", "学术综述", "新出材料"]

待处理条目：
${JSON.stringify(items.map(it => ({ id: it._tempId, title: it.title, summary: it.summary?.slice(0, 200) })), null, 2)}

请仅返回 JSON 数组，格式：
[{"id": "...", "relevant": true, "score": 85, "summary": "...", "tags": ["金文考释"]}]`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].text.trim();
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('[AI] 处理失败:', err.message);
    return [];
  }
}

export async function filterAndEnrich(rawItems) {
  console.log(`\n🔍 关键词初筛 ${rawItems.length} 条...`);

  // 初步关键词过滤
  const candidates = rawItems.filter(keywordFilter);
  console.log(`   关键词命中 ${candidates.length} 条，送 AI 精筛`);

  // 分配临时ID
  candidates.forEach((item, i) => { item._tempId = `item_${i}`; });

  const enriched = [];

  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    console.log(`[AI] 处理批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(candidates.length / BATCH_SIZE)}`);

    const results = await processWithAI(batch);

    for (const result of results) {
      if (!result.relevant) continue;
      const original = batch.find(b => b._tempId === result.id);
      if (!original) continue;

      enriched.push({
        // 原始字段
        source_id: original.sourceId,
        source_name: original.sourceName,
        source_short_name: original.sourceShortName,
        category: original.category,
        title: original.title,
        link: original.link,
        author: original.author,
        published_at: original.publishedAt,
        // AI 增强字段
        summary: result.summary,
        score: result.score,
        tags: result.tags,
        // 元数据
        fetched_at: new Date().toISOString(),
      });
    }

    // 批次间等待，避免速率限制
    if (i + BATCH_SIZE < candidates.length) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  // 按相关度排序
  enriched.sort((a, b) => b.score - a.score);
  console.log(`\n✅ AI 精筛后保留 ${enriched.length} 条相关内容`);
  return enriched;
}
