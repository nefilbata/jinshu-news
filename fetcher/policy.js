export function keepRecent(article, now = Date.now()) {
  if (!article.publishedAt) return true;
  const date = new Date(article.publishedAt).getTime();
  if (!Number.isFinite(date)) return false;
  const age = (now - date) / 86400000;
  return age >= -1 && age <= Number(process.env.MAX_ITEM_AGE_DAYS || 540);
}

export function selectDigestArticles(newArticles, maxTotal = 80) {
  return newArticles.slice(0, maxTotal);
}

export function maySendEmail(options, digest) {
  return process.env.EMAIL_ENABLED === 'true' && !options.noEmail && !options.dryRun && digest.newCount > 0;
}
