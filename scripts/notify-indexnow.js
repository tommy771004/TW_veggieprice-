// Pushes the current sitemap's URLs to IndexNow (Bing, Yandex, Seznam, and
// other participating engines) right after MOA data changes and deploys.
// GSC showed 82/83 produce pages stuck as "discovered - currently not
// indexed" because organic recrawl is slow; IndexNow lets us proactively
// announce "this URL changed" instead of waiting for the crawler to notice.
//
// Key file must be served as-is at {SITE_URL}/{INDEXNOW_KEY}.txt — see
// public/b788c3af923840729e54d2cbeefe1dd0.txt.
const INDEXNOW_KEY = 'b788c3af923840729e54d2cbeefe1dd0';
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

function resolveSiteUrl() {
  const raw = process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://tw-veggieprice.vercel.app';
  return raw.replace(/\/+$/, '');
}

async function fetchSitemapUrls(siteUrl) {
  const res = await fetch(`${siteUrl}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap fetch failed: HTTP ${res.status}`);
  const xml = await res.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (urls.length === 0) throw new Error('sitemap contained no <loc> entries');
  return urls;
}

async function submitToIndexNow(siteUrl, urlList) {
  const host = new URL(siteUrl).host;
  const body = {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `${siteUrl}/${INDEXNOW_KEY}.txt`,
    urlList,
  };

  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });

  return { status: res.status, ok: res.ok };
}

async function main() {
  const siteUrl = resolveSiteUrl();
  console.log(`[indexnow] site: ${siteUrl}`);

  const urls = await fetchSitemapUrls(siteUrl);
  console.log(`[indexnow] submitting ${urls.length} urls`);

  const { status, ok } = await submitToIndexNow(siteUrl, urls);
  console.log(`[indexnow] response: HTTP ${status}`);

  if (!ok) {
    console.warn('[indexnow] non-2xx response — search engines were not notified this run, will retry next data update.');
  }
}

main().catch((err) => {
  // Best-effort notification: a failure here must not fail the data pipeline.
  console.warn(`[indexnow] skipped due to error: ${err.message}`);
});
