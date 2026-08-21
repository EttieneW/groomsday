import type { Actions } from "./types";

/** Shared with the React touch overlay. Safe to import from the menu. */
export const touchState = {
  left: false,
  right: false,
  jump: false,
  shoot: false,
  knife: false,
  grenade: false,
  down: false,
};

const injected = new Set<string>();

export function injectKeys(codes: string[]) {
  injected.clear();
  for (const c of codes) {
    injected.add(c);
    if (c.startsWith("Key") && c.length === 4) injected.add(c.slice(3));
    if (c === "ArrowLeft") injected.add("LEFT");
    if (c === "ArrowRight") injected.add("RIGHT");
    if (c === "ArrowUp") injected.add("UP");
    if (c === "ArrowDown") injected.add("S");
    if (c === "Space") injected.add("SPACE");
  }
}

type KeyLike = { isDown: boolean };
type SceneKeys = {
  keys: Record<string, KeyLike>;
  cursors: {
    left: KeyLike;
    right: KeyLike;
    up: KeyLike;
    down: KeyLike;
  } | null;
  prevJump: boolean;
  prevShoot: boolean;
  prevKnife: boolean;
  prevGrenade: boolean;
  prevPause: boolean;
};

function held(scene: SceneKeys, code: string): boolean {
  if (injected.has(code)) return true;
  return Boolean(scene.keys[code]?.isDown);
}

function padAxes(): { x: number; jump: boolean; shoot: boolean; knife: boolean; grenade: boolean; down: boolean } {
  if (typeof navigator === "undefined" || !navigator.getGamepads) {
    return { x: 0, jump: false, shoot: false, knife: false, grenade: false, down: false };
  }
  const pads = navigator.getGamepads();
  for (const p of pads) {
    if (!p) continue;
    const lx = p.axes[0] ?? 0;
    const ly = p.axes[1] ?? 0;
    const mag = Math.hypot(lx, ly);
    const dz = 0.18;
    let x = 0;
    if (mag >= dz) x = ((mag - dz) / (1 - dz)) * (lx / mag);
    const left = Boolean(p.buttons[14]?.pressed) || x < -0.25;
    const right = Boolean(p.buttons[15]?.pressed) || x > 0.25;
    return {
      x: left && !right ? -1 : right && !left ? 1 : Math.abs(x) > 0.25 ? Math.sign(x) : 0,
      jump: Boolean(p.buttons[0]?.pressed || p.buttons[12]?.pressed),
      shoot: Boolean(p.buttons[2]?.pressed || p.buttons[7]?.pressed || p.buttons[5]?.pressed),
      knife: Boolean(p.buttons[1]?.pressed),
      grenade: Boolean(p.buttons[3]?.pressed || p.buttons[4]?.pressed),
      down: Boolean(p.buttons[13]?.pressed || ly > 0.55),
    };
  }
  return { x: 0, jump: false, shoot: false, knife: false, grenade: false, down: false };
}

export function sampleActions(scene: SceneKeys): Actions {
  const left = held(scene, "A") || held(scene, "LEFT") || Boolean(scene.cursors?.left.isDown) || touchState.left;
  const right =
    held(scene, "D") || held(scene, "RIGHT") || Boolean(scene.cursors?.right.isDown) || touchState.right;
  const pad = padAxes();
  let moveX = 0;
  if (left) moveX -= 1;
  if (right) moveX += 1;
  if (moveX === 0) moveX = pad.x;

  const jumpHeld =
    held(scene, "W") ||
    held(scene, "SPACE") ||
    held(scene, "UP") ||
    Boolean(scene.cursors?.up.isDown) ||
    touchState.jump ||
    pad.jump;
  const shootHeld = held(scene, "J") || held(scene, "CTRL") || touchState.shoot || pad.shoot;
  const knifeHeld = held(scene, "K") || touchState.knife || pad.knife;
  const grenadeHeld = held(scene, "L") || touchState.grenade || pad.grenade;
  const downHeld =
    held(scene, "S") ||
    held(scene, "C") ||
    Boolean(scene.cursors?.down.isDown) ||
    touchState.down ||
    pad.down;
  const pauseHeld = held(scene, "P") || held(scene, "ESC");

  const jumpPressed = jumpHeld && !scene.prevJump;
  const shootPressed = shootHeld && !scene.prevShoot;
  const knifePressed = knifeHeld && !scene.prevKnife;
  const grenadePressed = grenadeHeld && !scene.prevGrenade;
  const pausePressed = pauseHeld && !scene.prevPause;
  scene.prevJump = jumpHeld;
  scene.prevShoot = shootHeld;
  scene.prevKnife = knifeHeld;
  scene.prevGrenade = grenadeHeld;
  scene.prevPause = pauseHeld;

  return {
    moveX,
    jumpHeld,
    jumpPressed,
    down: downHeld,
    shootHeld,
    shootPressed,
    knifeHeld,
    knifePressed,
    grenadeHeld,
    grenadePressed,
    pausePressed,
  };
}
