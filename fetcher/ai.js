/**
 * 金文资讯站 - AI 处理模块（DeepSeek 版）
 * Secret 名称保持 ANTHROPIC_API_KEY，填入 DeepSeek key 即可
 */

import { JINSHU_KEYWORDS } from './sources.js';

function keywordFilter(item) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  return JINSHU_KEYWORDS.some(kw => text.includes(kw));
}

const BATCH_SIZE = 8;

async function processWithAI(items) {
  const prompt = `你是一位专治金文（青铜器铭文）的学术助手，负责为"金文动态"资讯站筛选内容。

本站的定位是：**汇聚最新金文相关学术动态**，核心是青铜器铭文研究。

【收录标准】以下内容标为 relevant=true：
- 金文字形考释、铭文释读、文字学研究
- 有铭青铜器的发现、著录、研究（即使是考古发掘报告，只要涉及铭文铜器即收）
- 西周、商代金文与历史年代研究
- 金文相关的礼制、族氏、称谓研究
- 出土文献中与金文直接相关的内容（如清华简涉及西周史、金文印证）
- 铜器铸造工艺、形制研究（与铭文研究有关联的）

【排除标准】以下内容标为 relevant=false：
- 纯楚简、帛书研究（与金文无交集的）
- 纯甲骨文研究（不涉及金文或商周铜器的）
- 纯考古发掘报告（无铭文铜器出土的）
- 玻璃器、陶器、骨器等非铜器文物研究
- 现代文物保护、科技考古（材料分析等）
- 与金文无关的先秦史、民族史研究

【评分标准】score（1-100）：
- 90+：核心金文研究（铭文考释、金文字形、有铭铜器著录）
- 70-89：重要关联（西周铜器考古、金文印证的历史研究）
- 50-69：周边相关（铜器形制、铸造工艺、无铭器但同坑有铭）
- 50以下且 relevant=false：排除

待处理条目：
${JSON.stringify(items.map(it => ({ id: it._tempId, title: it.title, summary: it.summary?.slice(0, 200) })), null, 2)}

对每条返回：
1. relevant (boolean)
2. score (1-100)
3. summary：不超过80字中文摘要。有原文摘要则压缩改写；仅有标题则推断并注明「（据题推断）」
4. tags：从以下选1-3个：["金文考释", "青铜器", "出土文献", "历史年代", "先秦史", "考古发掘", "器物研究", "学术综述", "新出材料", "铸造工艺"]

请仅返回 JSON 数组，不要有任何其他文字：
[{"id": "...", "relevant": true, "score": 85, "summary": "...", "tags": ["金文考释"]}]`;

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ANTHROPIC_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) throw new Error(`DeepSeek API ${response.status}`);
    const data = await response.json();
    const text = data.choices[0].message.content.trim();
    const jsonStr = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('[AI] 处理失败:', err.message);
    return [];
  }
}

export async function filterAndEnrich(rawItems) {
  console.log(`\n🔍 关键词初筛 ${rawItems.length} 条...`);

  const candidates = rawItems.filter(keywordFilter);
  console.log(`   关键词命中 ${candidates.length} 条，送 AI 精筛`);

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
        source_id: original.sourceId,
        source_name: original.sourceName,
        source_short_name: original.sourceShortName,
        category: original.category,
        title: original.title,
        link: original.link,
        author: original.author,
        published_at: original.publishedAt,
        summary: result.summary,
        score: result.score,
        tags: result.tags,
        fetched_at: new Date().toISOString(),
      });
    }

    if (i + BATCH_SIZE < candidates.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  enriched.sort((a, b) => b.score - a.score);
  console.log(`\n✅ AI 精筛后保留 ${enriched.length} 条相关内容`);
  return enriched;
}
