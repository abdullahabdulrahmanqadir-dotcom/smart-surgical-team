// Tells Bing (and through it ChatGPT search and Copilot), Yandex, Naver and
// Seznam that pages changed, instead of waiting for them to recrawl.
//
//   node scripts/indexnow.mjs            submit every URL in the live sitemap
//   node scripts/indexnow.mjs <url> ...  submit only these URLs
//
// The key is public by design: the engines confirm it by fetching
// https://ssthyroid.com/<key>.txt, which is served from public/.
// Google does not take part in IndexNow; it reads the sitemap.

const HOST = "ssthyroid.com";
const KEY = "7300d7dc259e6617fc3bca4e0f8d88e4";

async function sitemapUrls() {
  const response = await fetch(`https://${HOST}/sitemap.xml`);
  if (!response.ok) throw new Error(`sitemap: HTTP ${response.status}`);
  const xml = await response.text();
  return [...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim()))];
}

const urls = process.argv.length > 2 ? process.argv.slice(2) : await sitemapUrls();
const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList: urls.slice(0, 10000) }),
});
// 200 and 202 both mean accepted; 202 means the key is still being verified.
console.log(`IndexNow: HTTP ${response.status} for ${Math.min(urls.length, 10000)} URLs`);
if (response.status >= 300) {
  console.log(await response.text());
  process.exitCode = 1;
}
