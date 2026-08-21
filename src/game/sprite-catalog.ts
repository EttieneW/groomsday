import {
  CROUCH_DISPLAY_H,
  CROUCH_FRAMES,
  HERO_DISPLAY_H,
  HERO_DISPLAY_W,
  HERO_FRAME,
  HERO_ORDER,
  HEROES,
  IDLE_FRAMES,
  JUMP_FRAMES,
  RUN_FRAMES,
  type HeroId,
} from "./constants";

export type SheetId = "idle" | "run" | "jump" | "crouch" | "walk" | "shoot";

export type SpriteSheet = {
  id: SheetId;
  file: string;
  url: string;
  frames: number;
  cols: number;
  rows: number;
  cell: number;
  fps: number;
  loop: boolean;
};

export type SpriteActor = {
  id: string;
  name: string;
  group: "hero" | "enemy";
  faceCheck: boolean;
  displayW: number;
  displayH: number;
  sheets: SpriteSheet[];
};

function sheet(
  fileName: string,
  id: SheetId,
  frames: number,
  cols: number,
  rows: number,
  fps: number,
  loop: boolean,
): SpriteSheet {
  return {
    id,
    file: `public/game/sprites/${fileName}`,
    url: `/game/sprites/${fileName}`,
    frames,
    cols,
    rows,
    cell: HERO_FRAME,
    fps,
    loop,
  };
}

function heroActor(id: HeroId): SpriteActor {
  return {
    id,
    name: HEROES[id].name,
    group: "hero",
    faceCheck: true,
    displayW: HERO_DISPLAY_W,
    displayH: HERO_DISPLAY_H,
    sheets: [
      sheet(`${id}-idle.png`, "idle", IDLE_FRAMES, 2, 2, 4, true),
      sheet(`${id}-run.png`, "run", RUN_FRAMES, 3, 2, 10, true),
      sheet(`${id}-jump.png`, "jump", JUMP_FRAMES, 2, 2, 8, false),
      sheet(`${id}-crouch.png`, "crouch", CROUCH_FRAMES, 2, 2, 6, true),
    ],
  };
}

export const SPRITE_ACTORS: SpriteActor[] = [
  ...HERO_ORDER.map(heroActor),
  {
    id: "skeleton",
    name: "SKELETON",
    group: "enemy",
    faceCheck: false,
    displayW: 92,
    displayH: 124,
    sheets: [
      sheet("skeleton.png", "walk", 4, 2, 2, 8, true),
      sheet("skeleton-shoot.png", "shoot", 4, 2, 2, 10, false),
    ],
  },
  {
    id: "ghost",
    name: "GHOST",
    group: "enemy",
    faceCheck: false,
    displayW: 86,
    displayH: 110,
    sheets: [
      sheet("ghost.png", "walk", 4, 2, 2, 6, true),
      sheet("ghost-shoot.png", "shoot", 4, 2, 2, 10, false),
    ],
  },
  {
    id: "bat",
    name: "BAT",
    group: "enemy",
    faceCheck: false,
    displayW: 70,
    displayH: 52,
    sheets: [sheet("bat.png", "walk", 4, 2, 2, 10, true)],
  },
];

export const SPRITE_LAB_MOVES: { id: SheetId; label: string }[] = [
  { id: "idle", label: "Idle" },
  { id: "run", label: "Run" },
  { id: "jump", label: "Jump" },
  { id: "crouch", label: "Crouch" },
  { id: "walk", label: "Walk" },
  { id: "shoot", label: "Shoot" },
];

export function expectedSheetSize(sheet: SpriteSheet) {
  return { w: sheet.cols * sheet.cell, h: sheet.rows * sheet.cell };
}

export function crouchDisplay(actor: SpriteActor) {
  return actor.group === "hero" ? CROUCH_DISPLAY_H : actor.displayH;
}
