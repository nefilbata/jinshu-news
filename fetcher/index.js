/**
 * 金文资讯站 - 主程序
 * 运行：node index.js
 */

import { fetchAll } from './fetch.js';
import { filterAndEnrich } from './ai.js';
import { uploadArticles, cleanOldArticles } from './upload.js';

async function main() {
  console.log('═══════════════════════════════════');
  console.log('  金文资讯 - 数据更新');
  console.log(`  ${new Date().toLocaleString('zh-CN')}`);
  console.log('═══════════════════════════════════\n');

  // 1. 抓取所有信源
  const rawItems = await fetchAll();

  if (rawItems.length === 0) {
    console.log('⚠️  未抓取到任何内容，请检查网络或信源配置');
    process.exit(0);
  }

  // 2. AI 过滤+摘要
  const enriched = await filterAndEnrich(rawItems);

  // 3. 写入数据库
  await uploadArticles(enriched);

  // 4. 清理旧数据（可选）
  // await cleanOldArticles(90);

  console.log('\n🎉 更新完成！');
}

main().catch(err => {
  console.error('❌ 运行出错:', err);
  process.exit(1);
});
