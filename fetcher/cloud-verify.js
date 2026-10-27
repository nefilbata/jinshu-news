import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fetchAll } from './fetch.js';
import { enrichItems } from './ai.js';
import { keepRecent, selectDigestArticles, maySendEmail } from './policy.js';
import { loadArticles, mergeArticles } from './storage.js';

// Deliberately does not import the mailer or persist the production database.
assert.equal(process.env.EMAIL_ENABLED, 'false');
await mkdir('cloud-results', { recursive: true });
const baseline = await loadArticles();
const rounds = [];
let database = baseline;
for (let round = 1; round <= 2; round++) {
  const fetched = await fetchAll();
  const enriched = await enrichItems(fetched.items, { noAI: true });
  const candidates = enriched.filter(item => keepRecent(item));
  const merged = mergeArticles(database, candidates);
  const replay = mergeArticles(merged.articles, candidates);
  assert.equal(replay.newArticles.length, 0, 'Identical input must have no new articles');
  assert.equal(selectDigestArticles(replay.newArticles).length, 0, 'Empty delta must not reuse old content');
  assert.equal(maySendEmail({ noEmail: true }, { newCount: merged.newArticles.length }), false);
  const result = {
    round, generatedAt: new Date().toISOString(), fetchedCount: fetched.items.length,
    candidateCount: candidates.length, newCount: merged.newArticles.length,
    storedCount: merged.articles.length, replayNewCount: replay.newArticles.length,
    sourceResults: fetched.sourceResults, failures: fetched.failures,
    newArticles: merged.newArticles,
  };
  await writeFile(`cloud-results/round-${round}.json`, JSON.stringify(result, null, 2));
  rounds.push(result);
  database = merged.articles;
  console.log('[cloud-verification] ' + JSON.stringify({round, fetched: result.fetchedCount, candidates: result.candidateCount, newCount: result.newCount, stored: result.storedCount, sourcesOk: result.sourceResults.filter(s => s.status === 'ok').length, failures: result.failures.length, replayNewCount: result.replayNewCount, emailSent: false}));
}
const summary = {
  baselineCount: baseline.length, emailSent: false, filterMode: 'rules',
  rounds: rounds.map(({ newArticles, ...rest }) => rest),
  // Fresh round two may legitimately discover a source that failed in round one.
  secondRoundNewItems: rounds[1].newArticles.map(({ title, link, sourceId, publishedAt }) => ({ title, link, sourceId, publishedAt })),
};
await writeFile('cloud-results/summary.json', JSON.stringify(summary, null, 2));
if (rounds.every(r => r.fetchedCount === 0)) process.exitCode = 1;
