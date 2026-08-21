import type { MissionId } from "./campaign";
import { getMission } from "./missions";
import type { MissionLevel } from "./missions/types";

export let LEVEL: MissionLevel = getMission(1);

export function setActiveMission(id: MissionId) {
  LEVEL = getMission(id);
}

export type {
  ActorDef,
  BreakDef,
  CheckpointDef,
  CoinDef,
  HazardDef,
  MissionLevel,
  PickupDef,
  PlatformDef,
  PlatKind,
  PowDef,
} from "./missions/types";
