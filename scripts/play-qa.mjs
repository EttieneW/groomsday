import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto(url, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /enter the chapel/i }).click();
await page.waitForTimeout(300);
await page.getByRole("button", { name: /solo raid/i }).click();
await page.waitForSelector("canvas", { timeout: 8000 });
await page.waitForTimeout(1800);

const canvas = await page.locator("canvas").count();
const blocked = await page.evaluate(() => {
  const s = window.__playScene;
  const b = s?.player?.body;
  if (!b) return null;
  return {
    blocked: { none: b.blocked.none, up: b.blocked.up, down: b.blocked.down, left: b.blocked.left, right: b.blocked.right },
    touching: { none: b.touching.none, down: b.touching.down, left: b.touching.left, right: b.touching.right },
    w: b.width,
    h: b.height,
    x: b.x,
    y: b.y,
    vx: b.velocity.x,
    solids: s.solids?.getLength?.(),
  };
});
console.log("body", JSON.stringify(blocked));
const start = await page.evaluate(() => {
  const t = window.__controlsTest;
  return t ? { x: t.getX(), y: t.getY(), speed: t.getSpeed() } : null;
});

await page.evaluate(() => window.__controlsTest?.setKeys?.(["KeyD"]));
await page.waitForTimeout(900);
const afterD = await page.evaluate(() => {
  const t = window.__controlsTest;
  const s = window.__playScene;
  const b = s?.player?.body;
  return {
    pos: t ? { x: t.getX(), y: t.getY(), speed: t.getSpeed() } : null,
    blockedRight: b?.blocked.right,
    touchingRight: b?.touching.right,
    vx: b?.velocity.x,
    bx: b?.x,
    bw: b?.width,
  };
});

await page.evaluate(() => window.__controlsTest?.setKeys?.(["KeyA"]));
await page.waitForTimeout(900);
const afterA = await page.evaluate(() => {
  const t = window.__controlsTest;
  return t ? { x: t.getX(), y: t.getY(), speed: t.getSpeed() } : null;
});

await page.evaluate(() => window.__controlsTest?.setKeys?.([]));
await page.evaluate(() => window.__controlsTest?.setKeys?.(["Space"]));
await page.waitForTimeout(180);
const midJump = await page.evaluate(() => window.__controlsTest?.getY?.() ?? null);
await page.evaluate(() => window.__controlsTest?.setKeys?.([]));
await page.waitForTimeout(200);
await page.screenshot({ path: "/workspace/screenshots/play-move.png" });

const dxD = (afterD?.pos?.x ?? 0) - (start?.x ?? 0);
const dxA = (afterA?.x ?? 0) - (afterD?.pos?.x ?? 0);
const pass = canvas === 1 && dxD > 20 && dxA < -20 && errors.length === 0;
console.log(JSON.stringify({ pass, canvas, start, afterD, afterA, midJump, dxD, dxA, errors }, null, 2));
await browser.close();
process.exit(pass ? 0 : 1);
