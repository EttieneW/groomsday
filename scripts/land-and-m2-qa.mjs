import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const url = process.argv[2] || "http://127.0.0.1:8080/";
mkdirSync("tmp", { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

async function skipIntro(clicks = 8) {
  await page.waitForTimeout(800);
  for (let i = 0; i < clicks; i++) {
    await page.keyboard.press("KeyJ");
    await page.waitForTimeout(120);
  }
}

async function waitPlay() {
  await page.waitForFunction(() => Boolean(window.__playScene?.player), { timeout: 25000 });
  await page.waitForTimeout(400);
}

async function landProbe() {
  await page.evaluate(() => window.__controlsTest?.setKeys?.(["Space"]));
  await page.waitForTimeout(160);
  await page.evaluate(() => window.__controlsTest?.setKeys?.([]));
  await page.waitForTimeout(1100);
  return page.evaluate(() => {
    const s = window.__playScene;
    if (!s?.player) return null;
    const body = s.player.body;
    const gap = s.floorGap(s.solids) ?? s.floorGap(s.oneWays);
    return {
      grounded: s.grounded,
      blockedDown: Boolean(body.blocked.down || body.touching.down),
      vy: body.velocity.y,
      gap,
      y: s.player.y,
      bottom: body.bottom,
      level: window.__controlsTest?.getLevel?.(),
      missionId: window.__controlsTest?.getMissionId?.(),
    };
  });
}

const result = { errors, land: null, m2board: null, afterWin: null };

try {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /chapel of the damned/i }).click();
  await page.getByRole("button", { name: /solo raid/i }).click({ timeout: 15000 });
  await skipIntro();
  await waitPlay();
  result.land = await landProbe();
  await page.screenshot({ path: "tmp/land-m1.png" });

  await page.evaluate(() => window.__playScene?.triggerWin?.());
  await page.getByRole("button", { name: /tailcoat/i }).click({ timeout: 8000 });
  await page.waitForTimeout(500);
  result.afterWin = await page.evaluate(() => document.body.innerText.slice(0, 800));
  await page.screenshot({ path: "tmp/after-m1-win.png" });

  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  p2.on("pageerror", (e) => errors.push(String(e)));
  await p2.addInitScript(() => {
    localStorage.setItem(
      "groomforce.campaign.v1",
      JSON.stringify({
        unlocked: 2,
        completed: [1],
        upgrades: { speed: 0, dmg: 0, hp: 0, gunnery: 0 },
      }),
    );
  });
  await p2.goto(url, { waitUntil: "networkidle" });
  await p2.getByRole("button", { name: /^campaign$/i }).click();
  const m2btn = p2.getByRole("button", { name: /bone orchard/i });
  const m2Enabled = await m2btn.isEnabled();
  await m2btn.click();
  await p2.getByRole("button", { name: /solo raid/i }).click();
  await p2.waitForTimeout(800);
  for (let i = 0; i < 6; i++) {
    await p2.keyboard.press("KeyJ");
    await p2.waitForTimeout(120);
  }
  await p2.waitForFunction(() => Boolean(window.__playScene?.player), { timeout: 25000 });
  result.m2board = await p2.evaluate(() => ({
    enabled: true,
    level: window.__controlsTest?.getLevel?.(),
    missionId: window.__controlsTest?.getMissionId?.(),
  }));
  result.m2board.enabled = m2Enabled;
  await p2.screenshot({ path: "tmp/m2-play.png" });
  await ctx.close();
} catch (e) {
  result.fail = String(e);
  result.body = await page.locator("body").innerText().catch(() => "");
  await page.screenshot({ path: "tmp/qa-fail.png" }).catch(() => {});
}

const landOk = result.land && Math.abs(result.land.gap ?? 99) <= 3 && result.land.grounded;
const winOk = typeof result.afterWin === "string" && /bone orchard/i.test(result.afterWin);
const m2Ok = result.m2board?.missionId === 2 && /bone orchard/i.test(result.m2board?.level ?? "");
result.pass = Boolean(landOk && winOk && m2Ok && errors.length === 0);
console.log(JSON.stringify(result, null, 2));
await browser.close();
process.exit(result.pass ? 0 : 1);
