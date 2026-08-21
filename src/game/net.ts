import type { HeroId } from "./constants";
import type { NetBridge, NetEvent, PlayerSnap, WorldSnap } from "./types";

export function makeLocalNet(hero: HeroId, name: string): NetBridge {
  return {
    isHost: true,
    selfId: "local",
    hero,
    name,
    remotes: new Map(),
    world: null,
    sendState: () => {},
    sendWorld: () => {},
    sendEvent: () => {},
  };
}

export function isNetEvent(v: unknown): v is NetEvent {
  return Boolean(v && typeof v === "object" && "t" in v);
}

export function isPlayerSnap(v: unknown): v is PlayerSnap & { t: "p" } {
  return Boolean(v && typeof v === "object" && (v as { t?: string }).t === "p");
}

export function isWorldMsg(v: unknown): v is { t: "w"; world: WorldSnap } {
  return Boolean(v && typeof v === "object" && (v as { t?: string }).t === "w");
}
