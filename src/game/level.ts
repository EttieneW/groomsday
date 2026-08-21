import type { EnemyKind, WeaponId } from "./constants";
import { GROUND, LEVEL_W } from "./constants";

export type PlatKind = "solid" | "oneway" | "moving";

export type PlatformDef = {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: PlatKind;
  axis?: "x" | "y";
  dist?: number;
  speed?: number;
  sprite?: "platform" | "coffin";
};

export type ActorDef = { x: number; y: number; kind: EnemyKind; patrol?: number; short?: boolean };
export type PickupDef = { x: number; y: number; weapon: WeaponId };
export type CoinDef = { x: number; y: number };
export type HazardDef = { x: number; y: number; w: number; h: number };
export type CheckpointDef = { x: number; y: number; label: string };

export const LEVEL = {
  name: "Chapel of the Damned",
  width: LEVEL_W,
  height: 720,
  spawn: { x: 140, y: GROUND - 90 },
  flag: { x: 7920, y: GROUND - 20 },
  platforms: [] as PlatformDef[],
  enemies: [] as ActorDef[],
  coins: [] as CoinDef[],
  pickups: [] as PickupDef[],
  hazards: [] as HazardDef[],
  checkpoints: [] as CheckpointDef[],
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
  // Ground with pits
  LEVEL.platforms.push(
    solid(0, G, 2060, 90),
    solid(2280, G, 860, 90),
    solid(3480, G, 1280, 90),
    solid(5020, G, 3180, 90),
  );

  // Courtyard ledges
  LEVEL.platforms.push(oneWay(420, 520, 180), oneWay(720, 430, 160), solid(980, 360, 200, 36));

  // Chapel nave
  LEVEL.platforms.push(
    solid(1400, 500, 220, 36),
    oneWay(1680, 400, 180),
    solid(1960, 330, 160, 36),
    oneWay(2360, 470, 200),
    solid(2580, 360, 180, 36),
  );

  // Graveyard pit + moving coffins
  LEVEL.platforms.push(
    moving(3020, 500, 170, "x", 220, 70),
    moving(3260, 380, 160, "y", 150, 55),
    oneWay(3520, 460, 180),
    solid(3720, 340, 200, 36),
  );

  // Bell tower climb
  LEVEL.platforms.push(
    oneWay(4120, 540, 150),
    oneWay(4320, 450, 150),
    oneWay(4140, 360, 150),
    oneWay(4360, 270, 160),
    solid(4580, 220, 220, 36),
    moving(4860, 340, 160, "x", 180, 80),
  );

  // Crypt
  LEVEL.platforms.push(
    solid(5300, 520, 240, 36),
    oneWay(5600, 430, 180),
    solid(5880, 360, 200, 36),
    moving(6160, 480, 180, "x", 200, 65),
    oneWay(6480, 400, 170),
    solid(6760, 500, 220, 36),
    oneWay(7100, 420, 190),
    solid(7420, 360, 200, 36),
    oneWay(7680, 500, 160),
  );

  LEVEL.hazards.push(
    { x: 2080, y: G + 18, w: 180, h: 40 },
    { x: 3160, y: G + 24, w: 280, h: 40 },
    { x: 4780, y: G + 18, w: 220, h: 40 },
    { x: 2540, y: G - 16, w: 90, h: 28 },
    { x: 3940, y: G - 16, w: 110, h: 28 },
    { x: 5740, y: G - 16, w: 100, h: 28 },
    { x: 7020, y: G - 16, w: 90, h: 28 },
  );

  LEVEL.checkpoints.push(
    { x: 1320, y: G, label: "Nave" },
    { x: 3560, y: G, label: "Lychgate" },
    { x: 5160, y: G, label: "Crypt door" },
  );

  LEVEL.pickups.push(
    { x: 1020, y: 310, weapon: "shotgun" },
    { x: 3760, y: 290, weapon: "heavy" },
    { x: 4620, y: 170, weapon: "rocket" },
    { x: 6820, y: 450, weapon: "shotgun" },
  );

  const coins: CoinDef[] = [];
  const scatter = [
    [240, G - 40],
    [360, G - 40],
    [500, 480],
    [780, 390],
    [1040, 310],
    [1280, G - 40],
    [1480, 450],
    [1720, 360],
    [2000, 290],
    [2180, 200],
    [2400, 430],
    [2620, 320],
    [2800, G - 40],
    [3040, 450],
    [3280, 330],
    [3540, 420],
    [3760, 300],
    [4000, G - 40],
    [4180, 500],
    [4360, 410],
    [4180, 320],
    [4400, 230],
    [4660, 180],
    [4920, 300],
    [5200, G - 40],
    [5380, 470],
    [5640, 390],
    [5920, 320],
    [6200, 430],
    [6520, 360],
    [6800, 450],
    [7120, 380],
    [7460, 310],
    [7720, 460],
    [7880, G - 40],
    [1600, G - 40],
    [1900, G - 40],
    [4480, 180],
    [6000, G - 40],
    [7300, G - 40],
  ];
  for (const [x, y] of scatter) coins.push({ x, y });
  LEVEL.coins = coins;

  LEVEL.enemies.push(
    { x: 620, y: G - 40, kind: "skeleton", patrol: 140 },
    { x: 780, y: G - 18, kind: "skeleton", patrol: 70, short: true },
    { x: 1100, y: G - 40, kind: "skeleton", patrol: 160 },
    { x: 1500, y: 460, kind: "skeleton", patrol: 80 },
    { x: 1880, y: G - 40, kind: "skeleton", patrol: 120 },
    { x: 1740, y: 330, kind: "ghost" },
    { x: 2040, y: G - 18, kind: "skeleton", patrol: 50, short: true },
    { x: 2480, y: 400, kind: "ghost" },
    { x: 2700, y: G - 40, kind: "skeleton", patrol: 100 },
    { x: 3600, y: G - 40, kind: "skeleton", patrol: 160 },
    { x: 3800, y: 280, kind: "ghost" },
    { x: 3920, y: G - 18, kind: "skeleton", patrol: 60, short: true },
    { x: 4240, y: 200, kind: "bat" },
    { x: 4480, y: 140, kind: "bat" },
    { x: 4700, y: 160, kind: "ghost" },
    { x: 5400, y: 470, kind: "skeleton", patrol: 120 },
    { x: 5680, y: 360, kind: "ghost" },
    { x: 5800, y: G - 18, kind: "skeleton", patrol: 80, short: true },
    { x: 6000, y: G - 40, kind: "skeleton", patrol: 180 },
    { x: 6300, y: 400, kind: "bat" },
    { x: 6600, y: 280, kind: "ghost" },
    { x: 6900, y: G - 40, kind: "skeleton", patrol: 140 },
    { x: 7200, y: 340, kind: "bat" },
    { x: 7500, y: 300, kind: "ghost" },
    { x: 7700, y: G - 40, kind: "skeleton", patrol: 80 },
  );
})();
