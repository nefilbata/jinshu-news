import { access, readFile } from 'fs/promises';
import { join } from 'path';
import { ARTICLES_PATH, DOCS_DATA_PATH, DOCS_DIR } from './storage.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function looksMojibake(value = '') {
  const text = String(value);
  const suspicious = (text.match(/[鈥銆閭閲戞枃]/g) || []).length;
  return suspicious >= 4 && !/[金文青铜器铭文古文字出土文献]/.test(text);
}

async function main() {
  await access(join(DOCS_DIR, 'index.html'));
  await access(DOCS_DATA_PATH);
  await access(ARTICLES_PATH);

  const data = JSON.parse(await readFile(DOCS_DATA_PATH, 'utf8'));
  assert(Array.isArray(data.digests), 'docs/data.json missing digests[]');
  assert(Array.isArray(data.articles), 'docs/data.json missing articles[]');
  if (data.digests.length === 0 && data.articles.length === 0) {
    console.log('[check] ok: bootstrap archive is empty');
    return;
  }

  const sample = data.articles.slice(0, 20).map((item) => `${item.title} ${item.sourceName}`).join('\n');
  assert(!looksMojibake(sample), 'docs/data.json appears to contain mojibake text');

  const html = await readFile(join(DOCS_DIR, 'index.html'), 'utf8');
  assert(html.includes('金文速递'), 'docs/index.html missing app title');
  assert(html.includes("fetch('./data.json')"), 'docs/index.html missing data loader');

  console.log(`[check] ok: ${data.articles.length} articles, ${data.digests.length} digests`);
}

main().catch((error) => {
  console.error(`[check] failed: ${error.message}`);
  process.exit(1);
});
