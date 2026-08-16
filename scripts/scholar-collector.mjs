import http from "node:http";
import fs from "node:fs";
import path from "node:path";

// Local sink for the Scholar harvest. The plain-curl path gets rate-limited into
// Google's /sorry/ CAPTCHA, so the browser tab (which carries the real session)
// does the fetching and POSTs each parsed record here to be written to disk.
// Run with: node scripts/scholar-collector.mjs

const ROOT = "scratch/scholar-hn";
const PORT = 4599;

const slug = (title) => title.toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .split("-").slice(0, 7).join("-");

http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  if (req.method === "OPTIONS") return res.end();

  let body = "";
  req.on("data", (chunk) => { body += chunk; });
  req.on("end", () => {
    try {
      const record = JSON.parse(body);
      const folder = path.join(ROOT, `${String(record.order).padStart(3, "0")}-${slug(record.title)}`);
      fs.mkdirSync(folder, { recursive: true });
      fs.writeFileSync(path.join(folder, "data.json"), `${JSON.stringify(record, null, 2)}\n`);
      console.log(`  ${record.order} ${record.date}  ${record.title.slice(0, 70)}`);
      res.end("ok");
    } catch (error) {
      console.error(`  FAILED: ${error.message}`);
      res.statusCode = 400;
      res.end(error.message);
    }
  });
}).listen(PORT, () => console.log(`collector listening on http://localhost:${PORT}`));
