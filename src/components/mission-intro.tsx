import { useEffect, useRef, useState } from "react";
import { INTRO_SHOTS, MISSIONS, type MissionId } from "@/game/campaign";
import { unlockAudio } from "@/game/audio";

export function MissionIntro({
  missionId,
  onDone,
}: {
  missionId: MissionId;
  onDone: () => void;
}) {
  const mission = MISSIONS[missionId - 1];
  const shots = missionId === 1 ? INTRO_SHOTS : [{ src: "/game/cinematics/shot-ivory-window.jpg", caption: mission.title }];
  const [shot, setShot] = useState(0);
  const [line, setLine] = useState(0);
  const [shown, setShown] = useState("");
  const [canSkip, setCanSkip] = useState(false);
  const bedRef = useRef<HTMLAudioElement | null>(null);
  const lineRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setCanSkip(true), 700);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    unlockAudio();
    const bed = new Audio("/game/audio/intro-tension.mp3");
    bed.loop = true;
    bed.volume = 0.38;
    bedRef.current = bed;
    const kick = () => {
      void bed.play().catch(() => {});
    };
    kick();
    window.addEventListener("pointerdown", kick);
    window.addEventListener("keydown", kick);
    return () => {
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
      bed.pause();
      bed.src = "";
      bedRef.current = null;
    };
  }, []);

  useEffect(() => {
    lineRef.current?.pause();
    if (missionId !== 1) return;
    const a = new Audio(`/game/audio/intro-line-${line}.mp3`);
    a.volume = 1;
    lineRef.current = a;
    const play = () => {
      void a.play().catch(() => {});
    };
    play();
    window.addEventListener("pointerdown", play, { once: true });
    return () => {
      window.removeEventListener("pointerdown", play);
      a.pause();
      a.src = "";
      if (lineRef.current === a) lineRef.current = null;
    };
  }, [line, missionId]);

  useEffect(() => {
    if (shot < shots.length - 1) {
      const t = window.setTimeout(() => setShot((s) => s + 1), 5200);
      return () => window.clearTimeout(t);
    }
  }, [shot, shots.length]);

  useEffect(() => {
    const full = mission.crawl[line] ?? "";
    setShown("");
    let i = 0;
    const t = window.setInterval(() => {
      i += 1;
      setShown(full.slice(0, i));
      if (i >= full.length) window.clearInterval(t);
    }, 22);
    return () => window.clearInterval(t);
  }, [line, mission.crawl]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!canSkip) return;
      if (e.code === "KeyJ" || e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const advance = () => {
    if (line < mission.crawl.length - 1) setLine((n) => n + 1);
    else onDone();
  };

  const current = shots[Math.min(shot, shots.length - 1)];

  return (
    <main className="relative min-h-dvh overflow-hidden bg-bg text-fg" onClick={() => canSkip && advance()}>
      <img
        key={current.src}
        src={current.src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-80 kenburns"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-bg/20" />
      <div className="relative z-10 mx-auto flex min-h-dvh max-w-3xl flex-col justify-end px-6 pb-16">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-accent">
          {mission.code} — {mission.title}
        </p>
        <p className="mt-3 min-h-[4.5rem] text-lg leading-relaxed text-bone">{shown}</p>
        <p className="mt-4 font-mono text-xs uppercase tracking-widest text-subtle">
          {current.caption} · {canSkip ? "J / click to continue" : "…"}
        </p>
      </div>
      <style>{`
        .kenburns { animation: ken 5.4s ease-out forwards; transform-origin: 50% 40%; }
        @keyframes ken { from { transform: scale(1); } to { transform: scale(1.08); } }
      `}</style>
    </main>
  );
}
