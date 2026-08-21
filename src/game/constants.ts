export const W = 1280;
export const H = 720;
export const LEVEL_W = 14000;
export const LEVEL_H = 720;
export const GROUND = 640;
export const TILE = 32;

export const STEP = 1 / 60;
export const MAX_DT = 0.1;

export const COYOTE = 0.1;
export const JUMP_BUFFER = 0.12;
export const GRAVITY_UP = 2100;
export const GRAVITY_DOWN = 3800;
export const APEX_GRAVITY = 1400;
export const APEX_WINDOW = 80;
export const JUMP_VEL = -920;
export const DOUBLE_JUMP_VEL = -780;
export const MAX_FALL = 1450;
export const GROUND_ACCEL = 3400;
export const AIR_ACCEL = 1900;
export const FRICTION = 2800;
export const INVULN = 1.15;

export const HERO_FRAME = 256;
export const HERO_DISPLAY_W = 104;
export const HERO_DISPLAY_H = 148;
export const CROUCH_DISPLAY_H = 118;
/** Opaque foot row in the 256 hero frame (idle). Body bottom sits here so landings do not hover. */
export const HERO_FEET = 238;
export const CROUCH_FEET = 244;
export const HERO_BODY_W = 78;
export const HERO_BODY_H = 168;
export const CROUCH_BODY_H = 96;
export const RUN_FRAMES = 6;
export const IDLE_FRAMES = 4;
export const JUMP_FRAMES = 4;
export const CROUCH_FRAMES = 4;

export const ENEMY_SHOT_SPEED = 210;
export const ENEMY_WINDUP = 0.42;
export const ENEMY_RECOVER = 0.28;

export type HeroId = "lens" | "goldie" | "bear" | "stache";
export type WeaponId = "pistol" | "shotgun" | "heavy" | "rocket" | "laser";
export type EnemyKind = "skeleton" | "ghost" | "bat" | "usher" | "bomber" | "gargoyle" | "priest" | "hearse";

export const HEROES: Record<
  HeroId,
  {
    id: HeroId;
    name: string;
    title: string;
    blurb: string;
    hp: number;
    speed: number;
    jump: number;
    fire: number;
  }
> = {
  lens: {
    id: "lens",
    name: "LENS",
    title: "Deadeye",
    blurb: "Slim, sharp, never misses the boutonniere line.",
    hp: 3,
    speed: 340,
    jump: 1.06,
    fire: 1.18,
  },
  goldie: {
    id: "goldie",
    name: "GOLDIE",
    title: "Charmshot",
    blurb: "The smile that reloads itself.",
    hp: 4,
    speed: 305,
    jump: 1.0,
    fire: 1.0,
  },
  bear: {
    id: "bear",
    name: "BEAR",
    title: "The Wall",
    blurb: "Walks through pews. Pew pews walk into him.",
    hp: 6,
    speed: 248,
    jump: 0.92,
    fire: 0.88,
  },
  stache: {
    id: "stache",
    name: "STACHE",
    title: "Raid Lead",
    blurb: "Burgundy vest. Open collar. Open fire.",
    hp: 4,
    speed: 318,
    jump: 1.02,
    fire: 1.22,
  },
};

export const WEAPONS: Record<
  WeaponId,
  {
    id: WeaponId;
    label: string;
    cooldown: number;
    speed: number;
    damage: number;
    spread: number;
    count: number;
    life: number;
    ammo: number;
    explode: number;
  }
> = {
  pistol: {
    id: "pistol",
    label: "SIDEARM",
    cooldown: 0.2,
    speed: 760,
    damage: 1,
    spread: 0.02,
    count: 1,
    life: 0.85,
    ammo: Infinity,
    explode: 0,
  },
  shotgun: {
    id: "shotgun",
    label: "SCATTER",
    cooldown: 0.42,
    speed: 700,
    damage: 1,
    spread: 0.32,
    count: 5,
    life: 0.26,
    ammo: 30,
    explode: 0,
  },
  heavy: {
    id: "heavy",
    label: "HEAVY",
    cooldown: 0.068,
    speed: 900,
    damage: 1,
    spread: 0.05,
    count: 1,
    life: 0.75,
    ammo: 200,
    explode: 0,
  },
  rocket: {
    id: "rocket",
    label: "ROCKET",
    cooldown: 0.62,
    speed: 460,
    damage: 3,
    spread: 0,
    count: 1,
    life: 1.15,
    ammo: 12,
    explode: 96,
  },
  laser: {
    id: "laser",
    label: "LASER",
    cooldown: 0.05,
    speed: 1100,
    damage: 1,
    spread: 0,
    count: 1,
    life: 0.55,
    ammo: 200,
    explode: 0,
  },
};

export const KNIFE = { cooldown: 0.32, range: 78, damage: 2, life: 0.18 };
export const FRAG = { cooldown: 0.55, speed: 420, damage: 3, explode: 88, start: 10, cap: 20, life: 1.6 };

export const HERO_ORDER: HeroId[] = ["lens", "goldie", "bear", "stache"];
