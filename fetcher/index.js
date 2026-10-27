import { writeFile } from 'fs/promises';
import { join } from 'path';
import { fetchAll } from './fetch.js';
import { enrichItems } from './ai.js';
import { buildDigest, todayInShanghai } from './digest.js';
import { renderArchiveHtml, renderEmailHtml, renderPlainText } from './render.js';
import { sendMail } from './mailer.js';
import { keepRecent, selectDigestArticles, maySendEmail } from './policy.js';
import {
  DOCS_DIR,
  ensureDirs,
  loadArticles,
  mergeArticles,
  saveArticles,
  saveDigest,
  updateDocsData,
} from './storage.js';

function parseArgs(argv) {
  const args = new Set(argv);
  const limitArg = argv.find((arg) => arg.startsWith('--limit-sources='));
  return {
    dryRun: args.has('--dry-run'),
    noEmail: args.has('--no-email') || args.has('--dry-run'),
    noAI: args.has('--no-ai'),
    limitSources: limitArg ? Number(limitArg.split('=')[1]) : undefined,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await ensureDirs();

  console.log(`金文速递更新开始：${todayInShanghai()}`);
  const { items: fetchedItems, failures, sourceResults } = await fetchAll({ limitSources: options.limitSources });
  console.log(`[main] fetched ${fetchedItems.length} raw items`);

  const enriched = await enrichItems(fetchedItems, { noAI: options.noAI });
  const recentEnriched = enriched.filter(article => keepRecent(article)).map(article => article.publishedAt ? article : {
    ...article, bucket: 'lowConfidence', dateStatus: 'unknown',
    summary: `发布日期待核。${article.summary || ''}`,
  });
  console.log(`[main] kept ${enriched.length} relevant candidates, ${recentEnriched.length} recent candidates`);

  const existing = await loadArticles();
  const { articles, newArticles } = mergeArticles(existing, recentEnriched);
  const savedArticles = options.dryRun ? articles : await saveArticles(articles);
  const digestArticles = selectDigestArticles(newArticles);
  const digest = buildDigest({
    articles: digestArticles,
    actualNewCount: newArticles.length,
    failures,
    fetchedCount: fetchedItems.length,
  });
  digest.sourceResults = sourceResults;
  digest.filterMode = options.noAI || !process.env.AI_API_KEY ? 'rules' : 'ai-assisted';

  const html = renderEmailHtml(digest);
  const text = renderPlainText(digest);

  if (!options.dryRun) {
    await saveDigest(digest);
    await updateDocsData(digest, savedArticles);
    await writeFile(join(DOCS_DIR, 'index.html'), renderArchiveHtml(), 'utf8');
  } else {
    await writeFile(join(DOCS_DIR, 'preview-email.html'), html, 'utf8');
    await writeFile(join(DOCS_DIR, 'preview-email.txt'), text, 'utf8');
    console.log('[main] dry run wrote docs/preview-email.html and docs/preview-email.txt');
  }

  if (maySendEmail(options, digest)) {
    try {
      await sendMail({ subject: digest.title, html, text });
    } catch (error) {
      console.error(`[mail] failed: ${error.message}`);
      process.exitCode = 1;
    }
  } else console.log('[mail] skipped: email disabled or no new articles');

  if (sourceResults.every(source => source.status === 'failed')) process.exitCode = 1;

  console.log(`[main] done. new=${digest.newCount}, stored=${savedArticles.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
