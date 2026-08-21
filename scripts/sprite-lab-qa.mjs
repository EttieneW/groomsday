/**
 * Headless pass over /sprites — clicks every actor + move and asserts window.__spriteLab.allOk.
 * Usage: node scripts/sprite-lab-qa.mjs [http://127.0.0.1:8080]
 */
import { chromium } from "playwright";

const origin = process.argv[2] || "http://127.0.0.1:8080";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${origin}/sprites`, { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForFunction(() => window.__spriteLab && Object.keys(window.__spriteLab.reports).length > 0, null, {
  timeout: 20000,
});

const actors = await page.evaluate(() => window.__spriteLab.actors);
for (const id of actors) {
  await page.locator(`[data-actor="${id}"]`).click();
  await page.waitForTimeout(250);
  const moves = await page.locator("[data-move]").all();
  for (const btn of moves) {
    await btn.click();
    await page.waitForTimeout(200);
  }
}

await page.screenshot({ path: "qa-sprite-lab.png" });
const summary = await page.evaluate(() => ({
  allOk: window.__spriteLab.allOk,
  actorId: window.__spriteLab.actorId,
  fail: Object.entries(window.__spriteLab.reports)
    .filter(([, r]) => !r.ok)
    .map(([url, r]) => ({
      url,
      sizeWrong: r.sizeWrong,
      cells: r.cells.filter((c) => c.empty || c.magentaLeak || c.missingFace),
    })),
}));

console.log(JSON.stringify({ origin, actors, errors, summary }, null, 2));
await browser.close();
if (errors.length || !summary.allOk) process.exit(1);
