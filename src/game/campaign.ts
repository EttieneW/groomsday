/** Campaign bible, per-player upgrades, and local save. */

export type UpgradeId = "speed" | "dmg" | "hp" | "gunnery";

export type UpgradeStacks = Record<UpgradeId, number>;

export const UPGRADE_CAP = 5;

export const UPGRADES: Record<
  UpgradeId,
  { id: UpgradeId; name: string; blurb: string; per: string }
> = {
  speed: { id: "speed", name: "TAILCOAT", blurb: "Cut down the aisle faster.", per: "+8% move speed" },
  dmg: { id: "dmg", name: "BOUTONNIERE", blurb: "Every shot means it.", per: "+20% damage" },
  hp: { id: "hp", name: "IRON VEST", blurb: "Walk through the pews.", per: "+1 max HP, heal full" },
  gunnery: { id: "gunnery", name: "QUICKHAND", blurb: "Faster trigger, faster lead.", per: "+12% fire rate and shot speed" },
};

export type MissionId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type MissionDef = {
  id: MissionId;
  code: string;
  title: string;
  place: string;
  crawl: string[];
  boss: string;
  lockedFlavor: string;
  playable: boolean;
};

export const MISSIONS: MissionDef[] = [
  {
    id: 1,
    code: "M1",
    title: "Chapel of the Damned",
    place: "The wedding chapel",
    crawl: [
      "On a fateful horror night, Stache stood at the altar and the candles turned black.",
      "Ivory Hale was torn from the aisle by a veiled procession.",
      "The Hollow Groom — Lord Ashcroft Morrow — has claimed her for the Midnight Nuptials.",
      "Groom Force: clear the chapel. Follow the hearse.",
    ],
    boss: "THE LYCHWING",
    lockedFlavor: "The chapel still stands. Ivory does not.",
    playable: true,
  },
  {
    id: 2,
    code: "M2",
    title: "The Bone Orchard",
    place: "Graveyard road",
    crawl: [
      "The hearse is already a smear on the lychgate road.",
      "Ivory's veil snagged on the iron. Morrow's choir is digging.",
      "Cut through the Bone Orchard before the bell rings her name.",
    ],
    boss: "THE BELLWETHER",
    lockedFlavor: "The graves are open. The bell has not rung yet.",
    playable: false,
  },
  {
    id: 3,
    code: "M3",
    title: "Reception in Hell",
    place: "Town hall / reception",
    crawl: [
      "The reception was supposed to be cake and terrible speeches.",
      "The guests are still here. They are not cheering.",
      "Captain Graves holds the hall. The Organum is warming a hymn that kills.",
    ],
    boss: "THE ORGANUM",
    lockedFlavor: "Cake. Chairs. A hymn in the pipes.",
    playable: false,
  },
  {
    id: 4,
    code: "M4",
    title: "The Frozen Banns",
    place: "Snow monastery",
    crawl: [
      "North, the monastery where the banns were posted. The ink froze.",
      "Two coffin-tanks keep the pass.",
      "If they meet in the middle, the mountain comes down.",
    ],
    boss: "SHIV & KARN",
    lockedFlavor: "The pass is white. The tanks are waiting.",
    playable: false,
  },
  {
    id: 5,
    code: "M5",
    title: "City of Veils",
    place: "Ruined city",
    crawl: [
      "Below the mountain, a city that married iron to bone.",
      "The Iron Chapel walks.",
      "Behind it, the Cathedral. Behind that, midnight.",
    ],
    boss: "THE IRON CHAPEL",
    lockedFlavor: "A walking nave on iron treads.",
    playable: false,
  },
  {
    id: 6,
    code: "M6",
    title: "Rings Beneath",
    place: "Flooded crypts",
    crawl: ["The river under the city carries rings and bones."],
    boss: "BONE BARGE",
    lockedFlavor: "???",
    playable: false,
  },
  {
    id: 7,
    code: "M7",
    title: "The Flying Nave",
    place: "Funeral airship",
    crawl: ["Morrow took the sky."],
    boss: "CATHEDRAL BOMBER",
    lockedFlavor: "???",
    playable: false,
  },
  {
    id: 8,
    code: "M8",
    title: "The Processional",
    place: "Fortress approach",
    crawl: ["A mile of iron between you and the altar."],
    boss: "GATE TITAN",
    lockedFlavor: "???",
    playable: false,
  },
  {
    id: 9,
    code: "M9",
    title: "Iron Cathedral",
    place: "Inner sanctum",
    crawl: ["The doors know her name now."],
    boss: "CARDINAL-CONSTRUCT",
    lockedFlavor: "???",
    playable: false,
  },
  {
    id: 10,
    code: "M10",
    title: "Midnight Nuptials",
    place: "Altar of Veils",
    crawl: [
      "Ivory stands at the wrong altar.",
      "Lord Ashcroft Morrow sheds the last of his living skin.",
      "Kill the Veil King. Bring her home.",
    ],
    boss: "THE VEIL KING",
    lockedFlavor: "Midnight.",
    playable: false,
  },
];

export const INTRO_SHOTS = [
  { src: "/game/cinematics/shot-ivory-window.jpg", caption: "Ivory Hale — taken from the aisle." },
  { src: "/game/cinematics/shot-kidnap.jpg", caption: "Lord Ashcroft Morrow, the Hollow Groom." },
  { src: "/game/cinematics/shot-groom-force.jpg", caption: "Groom Force. Suit up." },
] as const;

const SAVE_KEY = "groomforce.campaign.v1";

export type CampaignSave = {
  unlocked: MissionId;
  completed: MissionId[];
  upgrades: UpgradeStacks;
};

export function emptyUpgrades(): UpgradeStacks {
  return { speed: 0, dmg: 0, hp: 0, gunnery: 0 };
}

export function defaultSave(): CampaignSave {
  return { unlocked: 1, completed: [], upgrades: emptyUpgrades() };
}

export function loadCampaign(): CampaignSave {
  if (typeof window === "undefined") return defaultSave();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Partial<CampaignSave>;
    return {
      unlocked: (parsed.unlocked as MissionId) || 1,
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      upgrades: { ...emptyUpgrades(), ...(parsed.upgrades ?? {}) },
    };
  } catch {
    return defaultSave();
  }
}

export function saveCampaign(save: CampaignSave) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

export function applyUpgrade(save: CampaignSave, id: UpgradeId): CampaignSave {
  const next = {
    ...save,
    upgrades: { ...save.upgrades, [id]: Math.min(UPGRADE_CAP, (save.upgrades[id] ?? 0) + 1) },
  };
  saveCampaign(next);
  return next;
}

export function completeMission(save: CampaignSave, id: MissionId): CampaignSave {
  const completed = save.completed.includes(id) ? save.completed : [...save.completed, id];
  const unlocked = Math.max(save.unlocked, Math.min(10, id + 1)) as MissionId;
  const next = { ...save, completed, unlocked };
  saveCampaign(next);
  return next;
}

export function newCampaign(): CampaignSave {
  const next = defaultSave();
  saveCampaign(next);
  return next;
}

export function speedMul(u: UpgradeStacks) {
  return 1 + 0.08 * (u.speed ?? 0);
}
export function dmgMul(u: UpgradeStacks) {
  return 1 + 0.2 * (u.dmg ?? 0);
}
export function extraHp(u: UpgradeStacks) {
  return u.hp ?? 0;
}
export function gunneryMul(u: UpgradeStacks) {
  return 1 + 0.12 * (u.gunnery ?? 0);
}
