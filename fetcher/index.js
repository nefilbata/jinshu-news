import { writeFile } from 'fs/promises';
import { join } from 'path';
import { fetchAll } from './fetch.js';
import { enrichItems } from './ai.js';
import { buildDigest, todayInShanghai } from './digest.js';
import { renderArchiveHtml, renderEmailHtml, renderPlainText } from './render.js';
import { sendMail } from './mailer.js';
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
    includeSeen: args.has('--include-seen'),
  };
}

function ageInDays(article) {
  const date = article.publishedAt ? new Date(article.publishedAt) : null;
  if (!date || Number.isNaN(date.getTime())) return Infinity;
  return (Date.now() - date.getTime()) / 86400000;
}

function keepRecent(article) {
  const maxAgeDays = Number(process.env.MAX_ITEM_AGE_DAYS || 540);
  return ageInDays(article) <= maxAgeDays;
}

function selectDigestArticles(items, maxTotal = 80) {
  return items.slice(0, maxTotal);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  await ensureDirs();

  console.log(`金文速递更新开始：${todayInShanghai()}`);
  const { items: fetchedItems, failures } = await fetchAll({ limitSources: options.limitSources });
  console.log(`[main] fetched ${fetchedItems.length} raw items`);

  const enriched = await enrichItems(fetchedItems, { noAI: options.noAI });
  const recentEnriched = enriched.filter(keepRecent);
  console.log(`[main] kept ${enriched.length} relevant candidates, ${recentEnriched.length} recent candidates`);

  const existing = await loadArticles();
  const { articles, newArticles } = mergeArticles(existing, recentEnriched);
  const savedArticles = options.dryRun ? articles : await saveArticles(articles);
  const digestArticles = options.includeSeen || newArticles.length === 0
    ? selectDigestArticles(recentEnriched)
    : selectDigestArticles(newArticles);
  const digest = buildDigest({
    articles: digestArticles,
    actualNewCount: newArticles.length,
    fallback: newArticles.length === 0 && digestArticles.length > 0,
    failures,
    fetchedCount: fetchedItems.length,
  });

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

  if (!options.noEmail && !options.dryRun) {
    try {
      await sendMail({ subject: digest.title, html, text });
    } catch (error) {
      console.error(`[mail] failed: ${error.message}`);
      process.exitCode = 1;
    }
  }

  console.log(`[main] done. new=${digest.newCount}, stored=${savedArticles.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
