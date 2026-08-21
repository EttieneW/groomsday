import { GROUND, LEVEL_W } from "../constants";
import type { ActorDef, BreakDef, CheckpointDef, CoinDef, HazardDef, MissionLevel, PickupDef, PlatformDef, PowDef } from "./types";

export const LEVEL: MissionLevel = {
  name: "Chapel of the Damned",
  width: LEVEL_W,
  height: 720,
  spawn: { x: 140, y: GROUND - 90 },
  flag: { x: 13680, y: GROUND - 20 },
  platforms: [],
  enemies: [],
  coins: [],
  pickups: [],
  hazards: [],
  checkpoints: [],
  pows: [],
  breaks: [],
  boss: { x: 12480, y: 210, kind: "lychwing", hp: 40, arenaX: 11200 },
};

function solid(x: number, y: number, w: number, h = 48): PlatformDef {
  return { x, y, w, h, kind: "solid", sprite: "platform" };
}
function oneWay(x: number, y: number, w: number): PlatformDef {
  return { x, y, w, h: 28, kind: "oneway", sprite: "platform" };
}
function moving(
  x: number,
  y: number,
  w: number,
  axis: "x" | "y",
  dist: number,
  speed: number,
  sprite: "platform" | "coffin" = "coffin",
): PlatformDef {
  return { x, y, w, h: sprite === "coffin" ? 40 : 32, kind: "moving", axis, dist, speed, sprite };
}

(function build() {
  const G = GROUND;
  LEVEL.platforms.push(
    solid(0, G, 2200, 90),
    solid(2420, G, 1100, 90),
    solid(3720, G, 1680, 90),
    solid(5600, G, 2200, 90),
    solid(8020, G, 1600, 90),
    solid(9860, G, 4140, 90),
  );

  // Courtyard
  LEVEL.platforms.push(oneWay(420, 520, 180), oneWay(720, 430, 160), solid(980, 360, 200, 36));

  // Nave
  LEVEL.platforms.push(
    solid(2480, 500, 220, 36),
    oneWay(2780, 400, 180),
    solid(3060, 330, 160, 36),
    oneWay(3380, 470, 200),
    solid(3600, 360, 180, 36),
    oneWay(3920, 500, 160),
    solid(4180, 420, 200, 36),
  );

  // Choir climb
  LEVEL.platforms.push(
    oneWay(5480, 540, 150),
    oneWay(5720, 450, 150),
    oneWay(5480, 360, 150),
    oneWay(5740, 270, 160),
    solid(5980, 220, 220, 36),
    moving(6280, 340, 160, "x", 180, 80),
    oneWay(6560, 280, 170),
    solid(6840, 200, 200, 36),
  );

  // Graveyard
  LEVEL.platforms.push(
    moving(8180, 500, 170, "x", 220, 70),
    moving(8480, 380, 160, "y", 150, 55),
    oneWay(8760, 460, 180),
    solid(8980, 340, 200, 36),
    oneWay(9260, 260, 160),
    solid(9520, 420, 220, 36),
    oneWay(9840, 340, 180),
  );

  // Approach + arena ledges
  LEVEL.platforms.push(
    oneWay(10480, 520, 180),
    solid(10740, 400, 200, 36),
    oneWay(11080, 500, 160),
    oneWay(11640, 480, 200),
    solid(12080, 360, 240, 36),
    oneWay(12840, 500, 180),
    solid(13220, 400, 220, 36),
  );

  LEVEL.hazards.push(
    { x: 2220, y: G + 18, w: 180, h: 40 },
    { x: 3540, y: G + 18, w: 160, h: 40 },
    { x: 5420, y: G + 18, w: 160, h: 40 },
    { x: 7820, y: G + 18, w: 180, h: 40 },
    { x: 9640, y: G + 18, w: 200, h: 40 },
    { x: 2680, y: G - 16, w: 90, h: 28 },
    { x: 4440, y: G - 16, w: 110, h: 28 },
    { x: 7040, y: G - 16, w: 100, h: 28 },
    { x: 9180, y: G - 16, w: 90, h: 28 },
    { x: 10920, y: G - 16, w: 100, h: 28 },
  );

  LEVEL.checkpoints.push(
    { x: 2360, y: G, label: "Nave" },
    { x: 5360, y: G, label: "Choir" },
    { x: 7980, y: G, label: "Lychgate" },
    { x: 11140, y: G, label: "Arena door" },
  );

  LEVEL.pickups.push(
    { x: 1020, y: 310, weapon: "heavy" },
    { x: 3620, y: 310, weapon: "shotgun" },
    { x: 6020, y: 170, weapon: "heavy" },
    { x: 9020, y: 290, weapon: "rocket" },
    { x: 10780, y: 350, weapon: "laser" },
    { x: 13240, y: 350, weapon: "rocket" },
  );

  LEVEL.pows.push(
    { x: 760, y: 390, drop: "rings" },
    { x: 2840, y: 360, drop: "grenade" },
    { x: 4240, y: 370, drop: "rings" },
    { x: 6900, y: 160, drop: "grenade" },
    { x: 9300, y: 220, drop: "rings" },
    { x: 12140, y: 310, drop: "grenade" },
  );

  LEVEL.breaks.push(
    { x: 380, y: G - 28, kind: "crate", hp: 2, drop: "rings" },
    { x: 1560, y: G - 28, kind: "pew", hp: 2 },
    { x: 1680, y: G - 28, kind: "pew", hp: 2, drop: "grenade" },
    { x: 3100, y: 292, kind: "crate", hp: 2, drop: "rings" },
    { x: 4020, y: G - 28, kind: "barrel", hp: 1, drop: "grenade" },
    { x: 6100, y: 182, kind: "tomb", hp: 3, drop: "rings" },
    { x: 8680, y: 420, kind: "crate", hp: 2, drop: "grenade" },
    { x: 10140, y: G - 28, kind: "barrel", hp: 1, drop: "rings" },
  );

  const coins: CoinDef[] = [];
  const scatter: [number, number][] = [
    [240, G - 40], [360, G - 40], [500, 480], [780, 390], [1040, 310],
    [1280, G - 40], [1600, G - 40], [1900, G - 40], [2520, 450], [2800, 360],
    [3080, 290], [3400, 430], [3620, 320], [3960, 460], [4220, 370],
    [4600, G - 40], [5000, G - 40], [5520, 500], [5740, 410], [5520, 320],
    [5780, 230], [6040, 180], [6340, 300], [6600, 240], [6880, 160],
    [7200, G - 40], [7600, G - 40], [8220, 450], [8500, 330], [8780, 420],
    [9020, 300], [9300, 220], [9560, 380], [9880, 300], [10200, G - 40],
    [10520, 480], [10780, 360], [11120, 460], [11680, 440], [12120, 320],
    [12600, G - 40], [12900, 460], [13280, 360], [13640, G - 40],
    [2100, G - 40], [4800, G - 40], [6400, G - 40], [8800, G - 40], [11800, G - 40],
  ];
  for (const [x, y] of scatter) coins.push({ x, y });
  LEVEL.coins = coins;

  const enemies: ActorDef[] = [
    { x: 520, y: G - 40, kind: "skeleton", patrol: 140 },
    { x: 700, y: G - 18, kind: "skeleton", patrol: 70, short: true },
    { x: 1100, y: G - 40, kind: "skeleton", patrol: 160 },
    { x: 1480, y: G - 40, kind: "skeleton", patrol: 100 },
    { x: 1860, y: G - 40, kind: "skeleton", patrol: 120 },
    { x: 2580, y: 460, kind: "usher", patrol: 90 },
    { x: 2820, y: 360, kind: "ghost" },
    { x: 3100, y: G - 40, kind: "skeleton", patrol: 110 },
    { x: 3340, y: G - 18, kind: "skeleton", patrol: 50, short: true },
    { x: 3640, y: 310, kind: "usher", patrol: 70 },
    { x: 3980, y: 450, kind: "ghost" },
    { x: 4300, y: G - 40, kind: "bomber", patrol: 200 },
    { x: 4680, y: G - 40, kind: "skeleton", patrol: 140 },
    { x: 5100, y: G - 40, kind: "priest" },
    { x: 5560, y: 500, kind: "skeleton", patrol: 80 },
    { x: 5800, y: 200, kind: "gargoyle" },
    { x: 6040, y: 140, kind: "bat" },
    { x: 6320, y: 280, kind: "bat" },
    { x: 6600, y: 220, kind: "gargoyle" },
    { x: 6880, y: 140, kind: "ghost" },
    { x: 7240, y: G - 40, kind: "usher", patrol: 120 },
    { x: 7600, y: G - 40, kind: "bomber", patrol: 180 },
    { x: 8300, y: 450, kind: "skeleton", patrol: 100 },
    { x: 8580, y: 300, kind: "priest" },
    { x: 8820, y: G - 18, kind: "skeleton", patrol: 60, short: true },
    { x: 9100, y: 280, kind: "ghost" },
    { x: 9380, y: 180, kind: "bat" },
    { x: 9580, y: 370, kind: "hearse" },
    { x: 9920, y: 300, kind: "bomber", patrol: 140 },
    { x: 10240, y: G - 40, kind: "usher", patrol: 110 },
    { x: 10540, y: 470, kind: "priest" },
    { x: 10800, y: 320, kind: "gargoyle" },
    { x: 11100, y: 440, kind: "skeleton", patrol: 80 },
    { x: 11720, y: 430, kind: "ghost" },
    { x: 12120, y: 310, kind: "bat" },
    { x: 12920, y: 450, kind: "skeleton", patrol: 90 },
    { x: 13300, y: 350, kind: "priest" },
  ];
  LEVEL.enemies = enemies;
})();
