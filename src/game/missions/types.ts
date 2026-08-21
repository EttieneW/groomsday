import type { EnemyKind, WeaponId } from "../constants";

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
export type PowDef = { x: number; y: number; drop: "grenade" | "rings" };
export type BreakDef = { x: number; y: number; kind: "crate" | "pew" | "barrel" | "tomb"; hp: number; drop?: "rings" | "grenade" };
export type BossDef = { x: number; y: number; kind: "lychwing"; hp: number; arenaX: number; name?: string };

export type MissionLevel = {
  name: string;
  width: number;
  height: number;
  spawn: { x: number; y: number };
  flag: { x: number; y: number };
  platforms: PlatformDef[];
  enemies: ActorDef[];
  coins: CoinDef[];
  pickups: PickupDef[];
  hazards: HazardDef[];
  checkpoints: CheckpointDef[];
  pows: PowDef[];
  breaks: BreakDef[];
  boss: BossDef | null;
};
