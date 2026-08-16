import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

// Checks that every harvested paper's link actually resolves, and reports which
// ones point at a Scholar cluster redirect rather than the publisher.
// Run with: node scripts/verify-scholar-hn.mjs

const ROOT = "scratch/scholar-hn";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const papers = fs.readdirSync(ROOT)
  .filter((entry) => fs.statSync(path.join(ROOT, entry)).isDirectory())
  .map((entry) => JSON.parse(fs.readFileSync(path.join(ROOT, entry, "data.json"), "utf8")))
  .sort((a, b) => a.order - b.order);

const results = [];
for (const paper of papers) {
  let status = "no-link";
  let finalUrl = "";
  if (paper.link) {
    try {
      // Windows' bundled curl.exe does not understand /dev/null, so discard the
      // body into a scratch file instead of a null device.
      const out = execFileSync("curl", [
        "-s", "-o", path.join(ROOT, ".body.tmp"), "-L", "--max-time", "25",
        "-A", UA, "-w", "%{http_code} %{url_effective}", paper.link,
      ], { encoding: "utf8" });
      [status, finalUrl] = [out.split(" ")[0], out.split(" ").slice(1).join(" ")];
    } catch {
      status = "ERR";
    }
  }
  const viaScholar = paper.link.includes("scholar.google.com");
  results.push({ ...paper, status, finalUrl, viaScholar });
  console.log(`${String(paper.order).padStart(2)} ${status} ${viaScholar ? "[scholar-redirect] " : ""}${paper.title.slice(0, 58)}`);
}

fs.writeFileSync(path.join(ROOT, "link-check.json"), JSON.stringify(results, null, 2));

const bad = results.filter((r) => !/^2/.test(r.status));
console.log(`\n${results.length - bad.length}/${results.length} links resolved OK.`);
if (bad.length) {
  console.log("problems:");
  for (const r of bad) console.log(`  ${r.order} [${r.status}] ${r.title.slice(0, 60)}\n     ${r.link}`);
}
const scholarLinks = results.filter((r) => r.viaScholar);
console.log(`\n${scholarLinks.length} link(s) point at a Scholar cluster page rather than the publisher:`);
for (const r of scholarLinks) console.log(`  ${r.order} ${r.title.slice(0, 60)}`);
