import { chromium } from "playwright";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const browser = await chromium.launch({ headless: true });

async function skipIntro(page, n = 8) {
  await page.waitForTimeout(800);
  for (let i = 0; i < n; i++) {
    await page.keyboard.press("KeyJ");
    await page.waitForTimeout(100);
  }
}

const host = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const guest = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
for (const p of [host, guest]) {
  p.on("pageerror", (e) => errors.push(String(e)));
}

await host.goto(url, { waitUntil: "networkidle" });
await host.getByRole("button", { name: /chapel of the damned/i }).click();
await host.getByRole("button", { name: /create squad/i }).click();
await host.getByText(/squad lobby/i).waitFor({ timeout: 15000 });
const code = (await host.locator("h2").innerText()).trim();
const hamachi = await host.locator("body").innerText();
const hamachiUrl = (hamachi.match(/http:\/\/25\.\d+\.\d+\.\d+:8080\/\?room=[A-Z0-9]+/) || [])[0] || "";

await guest.goto(`${url}?room=${code}`, { waitUntil: "networkidle" });
await guest.getByRole("button", { name: /join squad/i }).click();
await guest.getByText(/squad lobby/i).waitFor({ timeout: 15000 });

const linked = await host.waitForFunction(
  () => [...document.querySelectorAll("li")].some((el) => /connected/i.test(el.textContent || "")),
  { timeout: 20000 },
).then(() => true).catch(() => false);

await host.getByRole("button", { name: /start mission/i }).click({ timeout: 8000 }).catch(() => {});
await host.waitForTimeout(600);
const hostIntro = await host.getByText(/chapel of the damned|bone orchard/i).count();
const guestIntro = await guest.getByText(/chapel of the damned|bone orchard/i).count();

await skipIntro(host);
await skipIntro(guest);
await host.waitForFunction(() => Boolean(window.__playScene?.player), { timeout: 25000 }).catch(() => {});
await guest.waitForFunction(() => Boolean(window.__playScene?.player), { timeout: 25000 }).catch(() => {});

const play = await Promise.all(
  [host, guest].map((p) =>
    p.evaluate(() => ({
      level: window.__controlsTest?.getLevel?.(),
      missionId: window.__controlsTest?.getMissionId?.(),
      remotes: window.__playScene?.remotes?.size ?? 0,
      isHost: window.__playScene?.options?.net?.isHost ?? null,
    })),
  ),
);

const result = {
  code,
  hamachiUrl,
  linked,
  hostIntro,
  guestIntro,
  host: play[0],
  guest: play[1],
  errors,
};
result.pass = Boolean(
  linked &&
    play[0].missionId === 1 &&
    play[1].missionId === 1 &&
    play[0].isHost === true &&
    play[1].isHost === false &&
    errors.length === 0,
);
console.log(JSON.stringify(result, null, 2));
await browser.close();
process.exit(result.pass ? 0 : 1);
