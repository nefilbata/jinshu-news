import { BUCKETS, KEYWORDS } from './sources.js';

const BUCKET_IDS = new Set(BUCKETS.map((bucket) => bucket.id));

function includesAny(text, words) {
  return words.some((word) => text.includes(word.toLowerCase()));
}

function keywordScore(item) {
  const text = `${item.title} ${item.excerpt || ''} ${item.sourceName}`.toLowerCase();
  let score = 0;
  for (const word of KEYWORDS.strong) if (text.includes(word.toLowerCase())) score += 28;
  for (const word of KEYWORDS.medium) if (text.includes(word.toLowerCase())) score += 10;
  for (const word of KEYWORDS.weak) if (text.includes(word.toLowerCase())) score += 4;
  for (const word of KEYWORDS.negative) if (text.includes(word.toLowerCase())) score -= 12;
  if (item.sourcePriority === 'high') score += 8;
  if (item.sourcePriority === 'medium') score += 3;
  return Math.max(0, Math.min(98, score));
}

function classifyBucket(item) {
  const text = `${item.title} ${item.excerpt || ''}`.toLowerCase();
  if (includesAny(text, ['讲座', '会议', '论坛', '研讨会', '通知', '征稿'])) return 'lecture';
  if (includesAny(text, ['新书', '出版', '书讯', '目录', '读书会', '著作'])) return 'book';
  if (includesAny(text, ['论文', '刊', '研究', '考释', '释读', '简报', '报告'])) return 'paper';
  return item.bucketHint || 'news';
}

function tagsFor(item) {
  const text = `${item.title} ${item.excerpt || ''}`;
  const tags = [];
  if (includesAny(text, ['金文', '铭文', '钟鼎文', '彝铭'])) tags.push('金文考释');
  if (includesAny(text, ['青铜器', '铜器', '鼎', '簋', '壶', '爵'])) tags.push('青铜器');
  if (includesAny(text, ['出土文献', '简帛', '甲骨'])) tags.push('出土文献');
  if (includesAny(text, ['西周', '殷商', '商周', '东周', '战国'])) tags.push('历史年代');
  if (includesAny(text, ['考古', '发掘', '墓葬', '遗址'])) tags.push('考古发现');
  if (includesAny(text, ['新书', '出版', '著作'])) tags.push('新书');
  return tags.slice(0, 4);
}

function fallbackSummary(item) {
  const score = keywordScore(item);
  const reason = item.excerpt ? item.excerpt.slice(0, 90) : '据题名判断，可能与金文、青铜器或出土文献研究相关。';
  return {
    ...item,
    relevant: score >= 20,
    score,
    bucket: score < 45 ? 'lowConfidence' : classifyBucket(item),
    summary: reason,
    insight: score >= 70 ? '优先阅读：与金文或有铭青铜器研究的关联较直接。' : '可快速浏览，确认是否有可用材料或书目信息。',
    tags: tagsFor(item),
    ai: false,
  };
}

function safeParseJson(text) {
  const stripped = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const start = stripped.indexOf('[');
  const end = stripped.lastIndexOf(']');
  if (start === -1 || end === -1) return [];
  return JSON.parse(stripped.slice(start, end + 1));
}

async function callAI(items) {
  if (!process.env.AI_API_KEY) return [];

  const endpoint = process.env.AI_API_BASE || 'https://api.deepseek.com/chat/completions';
  const model = process.env.AI_MODEL || 'deepseek-chat';
  const prompt = `你是古文字与金文方向的学术资讯助理。请判断下列条目是否适合收入个人“金文速递”日报，并做简短解读。

收录重点：金文、青铜器铭文、商周有铭铜器、钟鼎文、青铜器著录、金文字形考释、与金文能互证的出土文献、相关讲座会议与新书。
排除重点：与金文/有铭铜器无关的普通考古、纯文物保护材料、纯陶瓷/玻璃/佛教美术等。

分类 bucket 只能取：paper, book, lecture, news, lowConfidence。
返回 JSON 数组，不要附加解释。字段：
id, relevant(boolean), score(0-100), bucket, summary(60字内), insight(40字内), tags(1-4个中文标签)。

条目：
${JSON.stringify(items.map((item) => ({
    id: item.id,
    title: item.title,
    source: item.sourceName,
    excerpt: item.excerpt?.slice(0, 180) || '',
  })), null, 2)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 2600,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(45000),
  });

  if (!response.ok) throw new Error(`AI API HTTP ${response.status}`);
  const data = await response.json();
  return safeParseJson(data.choices?.[0]?.message?.content || '');
}

export function ruleFilter(items) {
  return items
    .map(fallbackSummary)
    .filter((item) => item.relevant || item.score >= 14)
    .sort((a, b) => b.score - a.score);
}

export async function enrichItems(rawItems, { noAI = false } = {}) {
  const candidates = ruleFilter(rawItems);
  if (noAI || !process.env.AI_API_KEY || candidates.length === 0) return candidates;

  const enriched = [];
  const batchSize = 8;

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    try {
      const aiResults = await callAI(batch);
      const aiById = new Map(aiResults.map((result) => [result.id, result]));
      for (const item of batch) {
        const ai = aiById.get(item.id);
        if (!ai) {
          enriched.push(item);
          continue;
        }
        const aiScore = Number(ai.score || item.score);
        const keepByRules = Number(item.score || 0) >= 45 || item.sourcePriority === 'high';
        if (!ai.relevant && aiScore < 35 && !keepByRules) continue;
        const bucket = BUCKET_IDS.has(ai.bucket) ? ai.bucket : item.bucket;
        const finalScore = keepByRules ? Math.max(aiScore, Number(item.score || 0)) : aiScore;
        enriched.push({
          ...item,
          relevant: Boolean(ai.relevant),
          score: finalScore,
          bucket: finalScore < 45 ? 'lowConfidence' : bucket,
          summary: ai.summary || item.summary,
          insight: ai.insight || item.insight,
          tags: Array.isArray(ai.tags) ? ai.tags.slice(0, 4) : item.tags,
          ai: true,
        });
      }
    } catch (error) {
      console.warn(`[ai] batch failed, using rules: ${error.message}`);
      enriched.push(...batch);
    }
  }

  return enriched.sort((a, b) => b.score - a.score);
}
