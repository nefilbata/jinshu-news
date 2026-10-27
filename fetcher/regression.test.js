import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDate, parseWeb, fetchAll, describeNetworkError } from './fetch.js';
import { SOURCES } from './sources.js';
import { keepRecent, selectDigestArticles, maySendEmail } from './policy.js';
import { mergeArticles } from './storage.js';
import { ruleFilter } from './ai.js';

test('network failures retain actionable TLS and per-address error codes', () => {
  const tlsError = new Error('fetch failed', {cause: Object.assign(new Error('Hostname/IP does not match certificate'), {code:'ERR_TLS_CERT_ALTNAME_INVALID'})});
  assert.match(describeNetworkError(tlsError), /ERR_TLS_CERT_ALTNAME_INVALID/);
  const aggregate = Object.assign(new AggregateError([Object.assign(new Error('timeout'),{code:'ETIMEDOUT',address:'101.6.15.66'}),Object.assign(new Error('unreachable'),{code:'ENETUNREACH',address:'2402::1'})], ''), {code:'ETIMEDOUT'});
  assert.match(describeNetworkError(new Error('fetch failed',{cause:aggregate})), /ENETUNREACH 2402::1/);
});

test('traditional titles match the same keywords without rewriting source text', () => {
  const base = {sourceName:'研究中心',sourcePriority:'medium',excerpt:''};
  const traditional = ruleFilter([{...base,title:'新見青銅器銘文考釋'}])[0];
  const simplified = ruleFilter([{...base,title:'新见青铜器铭文考释'}])[0];
  assert.equal(traditional.score, simplified.score);
  assert.equal(traditional.title, '新見青銅器銘文考釋');
});

test('RFC dates retain month and day; numeric and split dates are valid', () => {
  assert.equal(parseDate('Thu, 30 Oct 2025 16:00:00 GMT'), '2025-10-30T16:00:00.000Z');
  assert.equal(parseDate('2026年10月26日'), '2026-10-26T00:00:00.000Z');
  assert.equal(parseDate('2026-08 14'), '2026-08-14T00:00:00.000Z');
  assert.equal(parseDate('2026-10-26T16:00:00.000Z'), '2026-10-26T16:00:00.000Z');
  assert.equal(parseDate('2026-02-30'), null);
  assert.equal(parseDate('2026'), null);
  assert.equal(parseDate(''), null);
});

test('Tsinghua current layout and Wuhan title attribute provide dates', () => {
  const tsinghua = parseWeb('<ul class="tz-list"><li><div class="tz-list-date">2026-08<br><span>14</span></div><div class="tz-list-tt"><a href="../info/1011/3521.htm">清华简研究新书</a></div></li></ul>', SOURCES[0]);
  assert.equal(tsinghua[0].publishedAt, '2026-08-14T00:00:00.000Z');
  const wuhan = parseWeb('<li><a href="/?hanjian/">漢簡</a><a href="/?hanjian/10213.html" title="文章標題：漢簡綴合\r發布時間：2026/10/26">姚磊：漢簡綴合研究</a></li>', SOURCES[2]);
  assert.equal(wuhan[0].publishedAt, '2026-10-26T00:00:00.000Z');
  assert.match(wuhan[0].link, /10213\.html$/);
});

test('missing selector is a reported source failure, not a silent empty success', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('<html><h1>changed layout</h1></html>', {headers: {'content-type': 'text/html'}});
  try {
    const result = await fetchAll({sources: [SOURCES[0]]});
    assert.equal(result.failures.length, 1);
    assert.equal(result.sourceResults[0].status, 'failed');
    assert.equal(result.items.length, 0);
  } finally { globalThis.fetch = original; }
});

test('an HTML response from an RSS endpoint is reported as a failure', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('<html><body>login required</body></html>');
  try {
    const result = await fetchAll({sources: [{id:'rss',name:'RSS',type:'rss',url:'https://example.invalid/feed'}]});
    assert.equal(result.failures.length, 1);
  } finally { globalThis.fetch = original; }
});

test('missing dates survive for review; future and stale dates are rejected', () => {
  const now = Date.parse('2026-10-27T12:00:00Z');
  assert.equal(keepRecent({publishedAt: null}, now), true);
  assert.equal(keepRecent({publishedAt: '2025-10-30T16:00:00Z'}, now), true);
  assert.equal(keepRecent({publishedAt: '2025-01-01'}, now), false);
  assert.equal(keepRecent({publishedAt: '2028-01-01'}, now), false);
});

test('second merge has no new articles and never fills digest with old items', () => {
  const item = {title:'金文新释',link:'https://example.invalid/1',score:50,publishedAt:'2025-01-01'};
  const first = mergeArticles([], [item]);
  const second = mergeArticles(first.articles, [{...item, publishedAt:'2025-10-30'}]);
  assert.equal(second.newArticles.length, 0);
  assert.deepEqual(selectDigestArticles(second.newArticles), []);
  assert.equal(second.articles[0].publishedAt, '2025-10-30');
});

test('email defaults off, no-email overrides opt-in, empty digests never send', () => {
  const previous = process.env.EMAIL_ENABLED;
  try {
    delete process.env.EMAIL_ENABLED;
    assert.equal(maySendEmail({}, {newCount: 1}), false);
    process.env.EMAIL_ENABLED = 'true';
    assert.equal(maySendEmail({noEmail: true}, {newCount: 1}), false);
    assert.equal(maySendEmail({dryRun: true}, {newCount: 1}), false);
    assert.equal(maySendEmail({}, {newCount: 0}), false);
    assert.equal(maySendEmail({}, {newCount: 1}), true);
  } finally {
    if (previous === undefined) delete process.env.EMAIL_ENABLED;
    else process.env.EMAIL_ENABLED = previous;
  }
});
