/** Tiny synth SFX. Unlocks on first user gesture. */

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlockAudio() {
  ac();
}

function beep(freq: number, dur: number, type: OscillatorType, gain = 0.08, slide = 0) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  shoot: (kind: string) => {
    if (kind === "shotgun") {
      beep(140, 0.12, "square", 0.07, -80);
      beep(90, 0.16, "sawtooth", 0.05, -40);
    } else if (kind === "heavy") {
      beep(220 + Math.random() * 40, 0.06, "square", 0.045, -30);
    } else if (kind === "rocket") {
      beep(90, 0.28, "sawtooth", 0.08, 40);
    } else if (kind === "laser") {
      beep(880, 0.05, "square", 0.04, 220);
      beep(1400, 0.04, "sine", 0.03, 0);
    } else {
      beep(420 + Math.random() * 40, 0.07, "square", 0.05, -120);
    }
  },
  jump: () => beep(380, 0.09, "sine", 0.05, 220),
  double: () => beep(520, 0.08, "sine", 0.045, 180),
  coin: () => {
    beep(880, 0.08, "square", 0.05, 200);
    beep(1320, 0.1, "square", 0.04, 0);
  },
  hit: () => beep(160, 0.1, "sawtooth", 0.07, -80),
  hurt: () => beep(110, 0.18, "square", 0.07, -50),
  explode: () => {
    beep(70, 0.28, "sawtooth", 0.09, -30);
    beep(50, 0.32, "triangle", 0.06, 0);
  },
  pickup: () => {
    beep(520, 0.1, "square", 0.05, 80);
    beep(780, 0.14, "square", 0.045, 120);
  },
  checkpoint: () => beep(440, 0.2, "triangle", 0.06, 220),
  win: () => {
    beep(523, 0.18, "square", 0.06, 0);
    beep(659, 0.22, "square", 0.05, 0);
    beep(784, 0.4, "square", 0.05, 0);
  },
  land: () => beep(90, 0.06, "triangle", 0.03, -20),
  windup: () => beep(180, 0.16, "triangle", 0.04, 90),
  enemyShot: () => {
    beep(260, 0.1, "square", 0.05, -70);
    beep(140, 0.12, "sawtooth", 0.035, -40);
  },
};
