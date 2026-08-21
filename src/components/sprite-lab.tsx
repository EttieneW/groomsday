import { useEffect, useMemo, useRef, useState } from "react";
import {
  SPRITE_ACTORS,
  SPRITE_LAB_MOVES,
  crouchDisplay,
  expectedSheetSize,
  type SpriteActor,
  type SpriteSheet,
  type SheetId,
} from "@/game/sprite-catalog";

export type CellReport = {
  i: number;
  opaque: number;
  magenta: number;
  empty: boolean;
  magentaLeak: boolean;
  missingFace: boolean;
};

export type SheetReport = {
  url: string;
  ok: boolean;
  sizeWrong: boolean;
  gotW: number;
  gotH: number;
  cells: CellReport[];
};

type ImgCache = Map<string, HTMLImageElement>;

const CHECKER =
  "repeating-conic-gradient(#1c1216 0% 25%, #2a1a1f 0% 50%) 50% / 16px 16px";

function loadImage(url: string, cache: ImgCache): Promise<HTMLImageElement> {
  const hit = cache.get(url);
  if (hit?.complete && hit.naturalWidth) return Promise.resolve(hit);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      cache.set(url, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error(`load failed: ${url}`));
    img.src = url;
  });
}

function analyzeSheet(img: HTMLImageElement, sheet: SpriteSheet, faceCheck: boolean): SheetReport {
  const want = expectedSheetSize(sheet);
  const sizeWrong = img.naturalWidth !== want.w || img.naturalHeight !== want.h;
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return { url: sheet.url, ok: false, sizeWrong, gotW: img.naturalWidth, gotH: img.naturalHeight, cells: [] };
  }
  ctx.drawImage(img, 0, 0);
  const cells: CellReport[] = [];
  for (let i = 0; i < sheet.frames; i++) {
    const col = i % sheet.cols;
    const row = Math.floor(i / sheet.cols);
    const x = col * sheet.cell;
    const y = row * sheet.cell;
    const data = ctx.getImageData(x, y, sheet.cell, sheet.cell).data;
    let opaque = 0;
    let magenta = 0;
    let faceOpaque = 0;
    let minY = sheet.cell;
    let maxY = 0;
    let minX = sheet.cell;
    let maxX = 0;
    for (let p = 0; p < data.length; p += 4) {
      const a = data[p + 3];
      if (a < 24) continue;
      opaque += 1;
      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];
      if (r > 170 && g < 90 && b > 150) magenta += 1;
      const px = (p / 4) % sheet.cell;
      const py = Math.floor(p / 4 / sheet.cell);
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }
    const h = Math.max(1, maxY - minY);
    const faceBottom = minY + h * 0.32;
    for (let p = 0; p < data.length; p += 4) {
      if (data[p + 3] < 24) continue;
      const py = Math.floor(p / 4 / sheet.cell);
      if (py >= minY && py <= faceBottom) faceOpaque += 1;
    }
    const empty = opaque < 120;
    const magentaLeak = magenta > opaque * 0.02 && magenta > 40;
    const missingFace = faceCheck && !empty && faceOpaque < opaque * 0.08;
    cells.push({ i, opaque, magenta, empty, magentaLeak, missingFace });
  }
  const ok = !sizeWrong && cells.every((c) => !c.empty && !c.magentaLeak && !c.missingFace);
  return { url: sheet.url, ok, sizeWrong, gotW: img.naturalWidth, gotH: img.naturalHeight, cells };
}

function AnimPreview({
  img,
  sheet,
  playing,
  flip,
  frame,
  onFrame,
  w,
  h,
}: {
  img: HTMLImageElement | null;
  sheet: SpriteSheet;
  playing: boolean;
  flip: boolean;
  frame: number;
  onFrame: (n: number) => void;
  w: number;
  h: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const playingRef = useRef(playing);
  const frameRef = useRef(frame);
  const onFrameRef = useRef(onFrame);
  playingRef.current = playing;
  frameRef.current = frame;
  onFrameRef.current = onFrame;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let f = frameRef.current;
    const tick = (now: number) => {
      const canvas = ref.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx && img) {
        if (playingRef.current) {
          const step = 1000 / sheet.fps;
          if (now - last >= step) {
            last = now;
            f = (f + 1) % sheet.frames;
            onFrameRef.current(f);
          }
        } else {
          f = frameRef.current;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const col = f % sheet.cols;
        const row = Math.floor(f / sheet.cols);
        ctx.save();
        if (flip) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(
          img,
          col * sheet.cell,
          row * sheet.cell,
          sheet.cell,
          sheet.cell,
          0,
          0,
          canvas.width,
          canvas.height,
        );
        ctx.restore();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [img, sheet, flip]);

  return (
    <canvas
      ref={ref}
      width={w * 2}
      height={h * 2}
      className="h-full w-full object-contain"
      style={{ imageRendering: "auto" }}
    />
  );
}

function SheetBoard({
  img,
  sheet,
  report,
  frame,
  onPick,
}: {
  img: HTMLImageElement | null;
  sheet: SpriteSheet;
  report: SheetReport | null;
  frame: number;
  onPick: (i: number) => void;
}) {
  const want = expectedSheetSize(sheet);
  return (
    <div className="relative inline-block max-w-full overflow-hidden rounded-lg border border-border">
      <div className="relative" style={{ background: CHECKER }}>
        {img ? (
          <img
            src={sheet.url}
            alt=""
            className="block max-h-56 w-auto"
            style={{ imageRendering: "auto" }}
          />
        ) : (
          <div className="flex h-40 w-64 items-center justify-center text-xs text-subtle">loading</div>
        )}
        <div
          className="pointer-events-none absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${sheet.cols}, 1fr)`,
            gridTemplateRows: `repeat(${sheet.rows}, 1fr)`,
          }}
        >
          {Array.from({ length: sheet.cols * sheet.rows }).map((_, i) => {
            const cell = report?.cells[i];
            const active = i === frame;
            const bad = cell && (cell.empty || cell.magentaLeak || cell.missingFace);
            return (
              <button
                key={i}
                type="button"
                className={`pointer-events-auto border ${
                  active ? "border-accent" : bad ? "border-danger/80" : "border-white/15"
                }`}
                onClick={() => onPick(i)}
                aria-label={`frame ${i}`}
              />
            );
          })}
        </div>
      </div>
      <p className="bg-surface px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-subtle">
        {want.w}×{want.h} · {sheet.cols}×{sheet.rows} · {sheet.frames} frames
        {report?.sizeWrong ? ` · GOT ${report.gotW}×${report.gotH}` : ""}
      </p>
    </div>
  );
}

export function SpriteLab() {
  const cache = useMemo(() => new Map<string, HTMLImageElement>(), []);
  const [actorId, setActorId] = useState(SPRITE_ACTORS[0].id);
  const [move, setMove] = useState<SheetId>("idle");
  const [flip, setFlip] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [frame, setFrame] = useState(0);
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});
  const [reports, setReports] = useState<Record<string, SheetReport>>({});

  const actor = SPRITE_ACTORS.find((a) => a.id === actorId) ?? SPRITE_ACTORS[0];
  const sheet = actor.sheets.find((s) => s.id === move) ?? actor.sheets[0];
  const availableMoves = SPRITE_LAB_MOVES.filter((m) => actor.sheets.some((s) => s.id === m.id));

  useEffect(() => {
    let gone = false;
    const urls = SPRITE_ACTORS.flatMap((a) => a.sheets.map((s) => s.url));
    void Promise.all(
      urls.map(async (url) => {
        try {
          return [url, await loadImage(url, cache)] as const;
        } catch {
          return [url, null] as const;
        }
      }),
    ).then((entries) => {
      if (gone) return;
      const next: Record<string, HTMLImageElement> = {};
      const nextReports: Record<string, SheetReport> = {};
      for (const [url, img] of entries) {
        if (!img) continue;
        next[url] = img;
      }
      for (const a of SPRITE_ACTORS) {
        for (const s of a.sheets) {
          const img = next[s.url];
          if (!img) continue;
          nextReports[s.url] = analyzeSheet(img, s, a.faceCheck);
        }
      }
      setImages(next);
      setReports(nextReports);
    });
    return () => {
      gone = true;
    };
  }, [cache]);

  useEffect(() => {
    setFrame(0);
    if (!actor.sheets.some((s) => s.id === move)) {
      setMove(actor.sheets[0].id);
    }
  }, [actorId, actor.sheets, move]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyF") setFlip((v) => !v);
      if (e.code === "Space") {
        e.preventDefault();
        setPlaying((v) => !v);
      }
      if (e.code === "ArrowRight") {
        const i = SPRITE_ACTORS.findIndex((a) => a.id === actorId);
        setActorId(SPRITE_ACTORS[(i + 1) % SPRITE_ACTORS.length].id);
      }
      if (e.code === "ArrowLeft") {
        const i = SPRITE_ACTORS.findIndex((a) => a.id === actorId);
        setActorId(SPRITE_ACTORS[(i - 1 + SPRITE_ACTORS.length) % SPRITE_ACTORS.length].id);
      }
      const num = Number(e.key);
      if (num >= 1 && num <= availableMoves.length) setMove(availableMoves[num - 1].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [actorId, availableMoves]);

  const report = reports[sheet.url];
  const actorFails = actor.sheets.filter((s) => reports[s.url] && !reports[s.url].ok).length;
  const allOk = SPRITE_ACTORS.every((a) => a.sheets.every((s) => reports[s.url]?.ok));
  const analyzed = Object.keys(reports).length;

  useEffect(() => {
    window.__spriteLab = {
      actorId,
      move,
      reports,
      allOk,
      actors: SPRITE_ACTORS.map((a) => a.id),
    };
  }, [actorId, move, reports, allOk]);

  return (
    <main className="min-h-dvh bg-bg px-4 py-6 text-fg sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-accent">Combat school</p>
            <h1 className="font-display text-4xl text-bone">Sprite lab</h1>
            <p className="mt-1 max-w-xl text-sm text-muted">
              Every groomsman and enemy, every move. Checkerboard shows holes. Cell borders show packing.
              Add a hero to <span className="font-mono text-bone">HERO_ORDER</span> and drop sheets — they
              show up here.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-wider ${
                analyzed === 0 ? "bg-elevated text-subtle" : allOk ? "bg-ok/20 text-ok" : "bg-danger/20 text-danger"
              }`}
            >
              {analyzed === 0 ? "Scanning…" : allOk ? "All sheets pass" : "Issues found"}
            </span>
            <a href="/" className="text-sm text-muted hover:text-fg">
              Back to raid
            </a>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {SPRITE_ACTORS.map((a) => {
            const fail = a.sheets.some((s) => reports[s.url] && !reports[s.url].ok);
            const on = a.id === actorId;
            return (
              <button
                key={a.id}
                type="button"
                data-actor={a.id}
                onClick={() => setActorId(a.id)}
                className={`rounded-lg border px-3 py-2 text-left ${
                  on ? "border-accent bg-elevated" : "border-border bg-surface hover:bg-elevated"
                }`}
              >
                <span className="font-display text-lg text-bone">{a.name}</span>
                <span className="ml-2 font-mono text-[10px] uppercase text-subtle">{a.group}</span>
                {fail && <span className="ml-2 font-mono text-[10px] text-danger">FAIL</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {availableMoves.map((m, i) => (
            <button
              key={m.id}
              type="button"
              data-move={m.id}
              onClick={() => {
                setMove(m.id);
                setFrame(0);
                setPlaying(true);
              }}
              className={`rounded-md border px-3 py-1.5 font-mono text-xs uppercase tracking-wider ${
                move === m.id ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface hover:bg-elevated"
              }`}
            >
              {i + 1} {m.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFlip((v) => !v)}
            className={`rounded-md border px-3 py-1.5 font-mono text-xs uppercase tracking-wider ${
              flip ? "border-accent bg-elevated" : "border-border bg-surface"
            }`}
          >
            F Flip {flip ? "←" : "→"}
          </button>
          <button
            type="button"
            onClick={() => setPlaying((v) => !v)}
            className="rounded-md border border-border bg-surface px-3 py-1.5 font-mono text-xs uppercase tracking-wider hover:bg-elevated"
          >
            Space {playing ? "Pause" : "Play"}
          </button>
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-subtle">In-game size</p>
            <div
              className="mt-2 flex h-56 items-end justify-center rounded-xl border border-border p-3"
              style={{ background: CHECKER }}
              data-preview
            >
              <div
                style={{
                  width: actor.displayW * 1.6,
                  height: (move === "crouch" ? crouchDisplay(actor) : actor.displayH) * 1.6,
                }}
              >
                <AnimPreview
                  img={images[sheet.url] ?? null}
                  sheet={sheet}
                  playing={playing}
                  flip={flip}
                  frame={frame}
                  onFrame={setFrame}
                  w={actor.displayW}
                  h={move === "crouch" ? crouchDisplay(actor) : actor.displayH}
                />
              </div>
            </div>
            <p className="mt-2 font-mono text-xs text-muted">
              {actor.name} · {sheet.id} · frame {frame + 1}/{sheet.frames}
            </p>
            {actorFails > 0 && <p className="mt-1 font-mono text-xs text-danger">{actorFails} sheet(s) failing</p>}
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-subtle">Sheet · click a cell</p>
            <div className="mt-2">
              <SheetBoard
                img={images[sheet.url] ?? null}
                sheet={sheet}
                report={report ?? null}
                frame={frame}
                onPick={(i) => {
                  setPlaying(false);
                  setFrame(i);
                }}
              />
            </div>
            {report && (
              <ul className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-4">
                {report.cells.map((c) => (
                  <li
                    key={c.i}
                    className={`rounded-md px-2 py-1 font-mono text-[10px] uppercase ${
                      c.empty || c.magentaLeak || c.missingFace ? "bg-danger/15 text-danger" : "bg-elevated text-subtle"
                    }`}
                  >
                    f{c.i}
                    {c.empty ? " empty" : ""}
                    {c.magentaLeak ? " magenta" : ""}
                    {c.missingFace ? " no-face" : ""}
                    {!c.empty && !c.magentaLeak && !c.missingFace ? " ok" : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="mt-10">
          <p className="font-mono text-[10px] uppercase tracking-widest text-subtle">All moves · this actor</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {actor.sheets.map((s) => (
              <ActorMoveRow
                key={s.id}
                actor={actor}
                sheet={s}
                img={images[s.url] ?? null}
                report={reports[s.url]}
                active={s.id === sheet.id}
                onOpen={() => {
                  setMove(s.id);
                  setFrame(0);
                  setPlaying(true);
                }}
              />
            ))}
          </div>
        </section>

        <section className="mt-10">
          <p className="font-mono text-[10px] uppercase tracking-widest text-subtle">Roster compare · idle</p>
          <div className="mt-3 flex flex-wrap gap-4">
            {SPRITE_ACTORS.filter((a) => a.group === "hero").map((a) => {
              const idle = a.sheets.find((s) => s.id === "idle")!;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setActorId(a.id)}
                  className="rounded-xl border border-border bg-surface p-3 hover:border-accent"
                >
                  <div className="flex h-40 w-28 items-end justify-center" style={{ background: CHECKER }}>
                    <div style={{ width: a.displayW, height: a.displayH }}>
                      <AnimPreview
                        img={images[idle.url] ?? null}
                        sheet={idle}
                        playing
                        flip={false}
                        frame={0}
                        onFrame={() => {}}
                        w={a.displayW}
                        h={a.displayH}
                      />
                    </div>
                  </div>
                  <p className="mt-2 text-center font-display text-bone">{a.name}</p>
                </button>
              );
            })}
          </div>
        </section>

        <p className="mt-10 font-mono text-[11px] uppercase tracking-widest text-subtle">
          ← → actor · 1–4 move · F flip · space pause · npm run test:sprites
        </p>
      </div>
    </main>
  );
}

function ActorMoveRow({
  actor,
  sheet,
  img,
  report,
  active,
  onOpen,
}: {
  actor: SpriteActor;
  sheet: SpriteSheet;
  img: HTMLImageElement | null;
  report?: SheetReport;
  active: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex items-center gap-4 rounded-xl border p-3 text-left ${
        active ? "border-accent bg-elevated" : "border-border bg-surface hover:bg-elevated"
      }`}
    >
      <div className="flex h-24 w-20 shrink-0 items-end justify-center rounded-md" style={{ background: CHECKER }}>
        <div style={{ width: actor.displayW * 0.85, height: actor.displayH * 0.85 }}>
          <AnimPreview
            img={img}
            sheet={sheet}
            playing
            flip={false}
            frame={0}
            onFrame={() => {}}
            w={actor.displayW}
            h={actor.displayH}
          />
        </div>
      </div>
      <div className="min-w-0">
        <p className="font-display text-xl text-bone">{sheet.id}</p>
        <p className="font-mono text-[10px] uppercase text-subtle">
          {sheet.frames} frames · {sheet.fps} fps {sheet.loop ? "loop" : "once"}
        </p>
        {report && (
          <p className={`mt-1 font-mono text-[10px] uppercase ${report.ok ? "text-ok" : "text-danger"}`}>
            {report.ok
              ? "pass"
              : [
                  report.sizeWrong ? "size" : null,
                  report.cells.some((c) => c.empty) ? "empty" : null,
                  report.cells.some((c) => c.magentaLeak) ? "magenta" : null,
                  report.cells.some((c) => c.missingFace) ? "face" : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </p>
        )}
      </div>
    </button>
  );
}

declare global {
  interface Window {
    __spriteLab?: {
      actorId: string;
      move: string;
      reports: Record<string, SheetReport>;
      allOk: boolean;
      actors: string[];
    };
  }
}
