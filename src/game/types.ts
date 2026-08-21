import type { EnemyKind, HeroId, WeaponId } from "./constants";

export type Actions = {
  moveX: number;
  jumpHeld: boolean;
  jumpPressed: boolean;
  down: boolean;
  shootHeld: boolean;
  shootPressed: boolean;
  pausePressed: boolean;
};

export type PlayerSnap = {
  id: string;
  hero: HeroId;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  anim: string;
  hp: number;
  maxHp: number;
  weapon: WeaponId;
  ammo: number;
  coins: number;
  alive: boolean;
  invuln: number;
};

export type EnemySnap = {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  hp: number;
  alive: boolean;
  anim: string;
  windup: boolean;
};

export type ShotSnap = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
};

export type WorldSnap = {
  t: number;
  enemies: EnemySnap[];
  shots: ShotSnap[];
  coinsTaken: number[];
  pickupsTaken: number[];
  checkpointX: number;
  teamCoins: number;
  won: boolean;
};

export type NetEvent =
  | { t: "hello"; hero: HeroId; name: string }
  | { t: "hit"; id: number; dmg: number }
  | { t: "coin"; id: number }
  | { t: "pickup"; id: number; weapon: WeaponId }
  | { t: "hurt"; id: string; hp: number }
  | { t: "ck"; x: number }
  | { t: "win" }
  | { t: "restart" }
  | { t: "eshot"; id: number; x: number; y: number; vx: number; vy: number };

export type GameHud = {
  hp: number;
  maxHp: number;
  coins: number;
  teamCoins: number;
  weapon: WeaponId;
  ammo: number;
  lives: number;
  banner: string;
};

export type GameCallbacks = {
  onHud: (hud: GameHud) => void;
  onWin: (coins: number) => void;
  onDeath: () => void;
  onCheckpoint: (label: string) => void;
};

export type NetBridge = {
  isHost: boolean;
  selfId: string;
  hero: HeroId;
  name: string;
  remotes: Map<string, PlayerSnap>;
  world: WorldSnap | null;
  sendState: (snap: PlayerSnap) => void;
  sendWorld: (world: WorldSnap) => void;
  sendEvent: (ev: NetEvent) => void;
};

export type CreateGameOptions = {
  hero: HeroId;
  playerName: string;
  net: NetBridge;
  callbacks: GameCallbacks;
};
