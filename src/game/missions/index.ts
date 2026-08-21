import type { MissionId } from "../campaign";
import type { MissionLevel } from "./types";
import { LEVEL as mission01 } from "./mission-01";
import { LEVEL as mission02 } from "./mission-02";

const BY_ID: Partial<Record<MissionId, MissionLevel>> = {
  1: mission01,
  2: mission02,
};

export function getMission(id: MissionId): MissionLevel {
  return BY_ID[id] ?? mission01;
}

export type { MissionLevel } from "./types";
