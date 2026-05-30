import { writeFile } from 'fs/promises';
import { join } from 'path';
import { buildDigest, todayInShanghai } from './digest.js';
import { renderArchiveHtml } from './render.js';
import { DOCS_DIR, ensureDirs, loadArticles, saveDigest, updateDocsData } from './storage.js';

async function main() {
  await ensureDirs();
  const articles = await loadArticles();
  const digest = buildDigest({
    date: todayInShanghai(),
    articles: articles.slice(0, 20),
    fetchedCount: 0,
    failures: [],
  });
  await saveDigest(digest);
  await updateDocsData(digest, articles);
  await writeFile(join(DOCS_DIR, 'index.html'), renderArchiveHtml(), 'utf8');
  console.log(`[export] rebuilt docs archive with ${articles.length} articles`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
