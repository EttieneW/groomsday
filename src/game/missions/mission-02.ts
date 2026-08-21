import { GROUND, LEVEL_W } from "../constants";
import type { ActorDef, CoinDef, MissionLevel, PlatformDef } from "./types";

export const LEVEL: MissionLevel = {
  name: "The Bone Orchard",
  width: LEVEL_W,
  height: 720,
  spawn: { x: 140, y: GROUND - 90 },
  flag: { x: 13640, y: GROUND - 20 },
  platforms: [],
  enemies: [],
  coins: [],
  pickups: [],
  hazards: [],
  checkpoints: [],
  pows: [],
  breaks: [],
  boss: { x: 12340, y: 200, kind: "lychwing", hp: 52, arenaX: 11040, name: "THE BELLWETHER" },
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
    solid(0, G, 1680, 90),
    solid(1920, G, 720, 90),
    solid(2880, G, 1100, 90),
    solid(4240, G, 980, 90),
    solid(5480, G, 1560, 90),
    solid(7320, G, 880, 90),
    solid(8480, G, 1240, 90),
    solid(9960, G, 4040, 90),
  );

  LEVEL.platforms.push(
    oneWay(380, 500, 200),
    solid(640, 410, 180, 36),
    oneWay(980, 500, 160),
    moving(2140, 480, 180, "x", 200, 75),
    oneWay(2480, 390, 170),
    solid(2760, 300, 200, 36),
    moving(3200, 460, 170, "y", 140, 60),
    oneWay(3520, 340, 180),
    solid(3880, 250, 200, 36),
    oneWay(4320, 500, 160),
    oneWay(4580, 400, 160),
    oneWay(4320, 300, 160),
    solid(4780, 220, 220, 36),
    moving(5120, 360, 160, "x", 180, 85),
    oneWay(5680, 500, 180),
    solid(6020, 390, 200, 36),
    oneWay(6360, 280, 170),
    moving(6780, 430, 180, "x", 210, 70),
    oneWay(7580, 500, 180),
    moving(7920, 380, 160, "y", 150, 55),
    oneWay(8280, 280, 180),
    solid(8720, 360, 220, 36),
    oneWay(9080, 250, 160),
    oneWay(9420, 430, 180),
    solid(9780, 320, 200, 36),
    oneWay(10480, 500, 180),
    solid(10820, 390, 200, 36),
    oneWay(11240, 480, 170),
    oneWay(11880, 460, 200),
    solid(12280, 340, 240, 36),
    oneWay(12940, 500, 180),
  );

  LEVEL.hazards.push(
    { x: 1700, y: G + 18, w: 200, h: 40 },
    { x: 2660, y: G + 18, w: 200, h: 40 },
    { x: 4000, y: G + 18, w: 220, h: 40 },
    { x: 5240, y: G + 18, w: 220, h: 40 },
    { x: 7060, y: G + 18, w: 240, h: 40 },
    { x: 8220, y: G + 18, w: 240, h: 40 },
    { x: 9740, y: G + 18, w: 200, h: 40 },
    { x: 1100, y: G - 16, w: 90, h: 28 },
    { x: 3400, y: G - 16, w: 100, h: 28 },
    { x: 5900, y: G - 16, w: 90, h: 28 },
    { x: 7600, y: G - 16, w: 100, h: 28 },
    { x: 9200, y: G - 16, w: 90, h: 28 },
  );

  LEVEL.checkpoints.push(
    { x: 1860, y: G, label: "Lychgate" },
    { x: 5400, y: G, label: "Orchard" },
    { x: 8400, y: G, label: "Bell road" },
    { x: 10980, y: G, label: "Belfry" },
  );

  LEVEL.pickups.push(
    { x: 660, y: 360, weapon: "shotgun" },
    { x: 2780, y: 250, weapon: "heavy" },
    { x: 4820, y: 170, weapon: "laser" },
    { x: 8760, y: 310, weapon: "rocket" },
    { x: 10840, y: 340, weapon: "heavy" },
    { x: 12320, y: 290, weapon: "rocket" },
  );

  LEVEL.pows.push(
    { x: 400, y: 460, drop: "grenade" },
    { x: 2500, y: 350, drop: "rings" },
    { x: 3920, y: 200, drop: "grenade" },
    { x: 6100, y: 340, drop: "rings" },
    { x: 8320, y: 240, drop: "grenade" },
    { x: 11480, y: 430, drop: "rings" },
  );

  LEVEL.breaks.push(
    { x: 280, y: G - 28, kind: "tomb", hp: 3, drop: "rings" },
    { x: 1220, y: G - 28, kind: "crate", hp: 2, drop: "grenade" },
    { x: 3000, y: G - 28, kind: "tomb", hp: 3 },
    { x: 4840, y: 182, kind: "crate", hp: 2, drop: "rings" },
    { x: 6500, y: G - 28, kind: "barrel", hp: 1, drop: "grenade" },
    { x: 8900, y: 320, kind: "tomb", hp: 3, drop: "rings" },
    { x: 10300, y: G - 28, kind: "barrel", hp: 1, drop: "grenade" },
  );

  const coins: CoinDef[] = [];
  const scatter: [number, number][] = [
    [220, G - 40], [400, 460], [680, 370], [1000, 460], [1400, G - 40],
    [2000, G - 40], [2180, 440], [2500, 350], [2780, 260], [3100, G - 40],
    [3240, 420], [3540, 300], [3900, 210], [4400, 460], [4600, 360],
    [4360, 260], [4820, 180], [5160, 320], [5600, G - 40], [5720, 460],
    [6060, 350], [6400, 240], [6820, 390], [7400, G - 40], [7620, 460],
    [7960, 340], [8320, 240], [8760, 320], [9120, 210], [9460, 390],
    [9820, 280], [10200, G - 40], [10520, 460], [10860, 350], [11280, 440],
    [11920, 420], [12320, 300], [13000, 460], [13480, G - 40],
    [1800, G - 40], [4100, G - 40], [7000, G - 40], [9600, G - 40], [12000, G - 40],
  ];
  for (const [x, y] of scatter) coins.push({ x, y });
  LEVEL.coins = coins;

  const enemies: ActorDef[] = [
    { x: 480, y: G - 40, kind: "skeleton", patrol: 120 },
    { x: 720, y: G - 18, kind: "skeleton", patrol: 60, short: true },
    { x: 1080, y: G - 40, kind: "priest" },
    { x: 1500, y: G - 40, kind: "skeleton", patrol: 140 },
    { x: 2180, y: 430, kind: "bomber", patrol: 160 },
    { x: 2520, y: 350, kind: "ghost" },
    { x: 2800, y: 250, kind: "gargoyle" },
    { x: 3100, y: G - 40, kind: "usher", patrol: 110 },
    { x: 3480, y: 300, kind: "bat" },
    { x: 3920, y: 200, kind: "priest" },
    { x: 4480, y: G - 40, kind: "skeleton", patrol: 100 },
    { x: 4480, y: 360, kind: "ghost" },
    { x: 4820, y: 170, kind: "bat" },
    { x: 5200, y: 310, kind: "hearse" },
    { x: 5720, y: G - 40, kind: "bomber", patrol: 180 },
    { x: 6080, y: 340, kind: "usher", patrol: 80 },
    { x: 6400, y: 230, kind: "gargoyle" },
    { x: 6820, y: 380, kind: "priest" },
    { x: 7480, y: G - 40, kind: "skeleton", patrol: 130 },
    { x: 7680, y: G - 18, kind: "skeleton", patrol: 50, short: true },
    { x: 8000, y: 330, kind: "ghost" },
    { x: 8360, y: 230, kind: "bat" },
    { x: 8760, y: 310, kind: "hearse" },
    { x: 9140, y: 200, kind: "gargoyle" },
    { x: 9500, y: 390, kind: "bomber", patrol: 140 },
    { x: 9860, y: 270, kind: "priest" },
    { x: 10340, y: G - 40, kind: "usher", patrol: 120 },
    { x: 10600, y: 450, kind: "skeleton", patrol: 90 },
    { x: 10880, y: 340, kind: "ghost" },
    { x: 11300, y: 430, kind: "bat" },
    { x: 11940, y: 410, kind: "priest" },
    { x: 12880, y: 450, kind: "skeleton", patrol: 80 },
    { x: 13220, y: G - 40, kind: "bomber", patrol: 100 },
  ];
  LEVEL.enemies = enemies;
})();
