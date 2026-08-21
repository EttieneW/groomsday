import { MISSIONS, type CampaignSave, type MissionId } from "@/game/campaign";

export function CampaignBoard({
  save,
  onPlay,
  onNew,
  onBack,
}: {
  save: CampaignSave;
  onPlay: (id: MissionId) => void;
  onNew: () => void;
  onBack: () => void;
}) {
  return (
    <main className="relative z-10 mx-auto flex min-h-dvh max-w-3xl flex-col px-6 py-12">
      <button type="button" onClick={onBack} className="self-start text-sm text-muted hover:text-fg">
        Back
      </button>
      <p className="mt-4 font-mono text-xs uppercase tracking-[0.3em] text-muted">Campaign</p>
      <h2 className="mt-2 font-display text-4xl text-bone">Ivory is gone. Suit up.</h2>
      <div className="mt-4 flex gap-3">
        <img src="/game/portraits/ivory.png" alt="Ivory Hale" className="h-28 w-auto rounded-md border border-border object-cover" />
        <img src="/game/portraits/morrow.png" alt="The Hollow Groom" className="h-28 w-auto rounded-md border border-border object-cover" />
        <img src="/game/portraits/veil-king.png" alt="The Veil King" className="h-28 w-auto rounded-md border border-border object-cover" />
      </div>
      <p className="mt-3 max-w-lg text-sm text-muted">
        Ten missions. The Veil King dies on the last altar. Clear a mission and the next loads after your upgrade.
        Missions 1–2 are open steel — the rest of the road is marked.
      </p>
      <ul className="mt-8 space-y-2">
        {MISSIONS.map((m) => {
          const open = m.id <= save.unlocked && m.playable;
          const done = save.completed.includes(m.id);
          const locked = !open;
          return (
            <li key={m.id}>
              <button
                type="button"
                disabled={locked}
                onClick={() => open && onPlay(m.id)}
                className={`flex w-full items-start justify-between gap-4 rounded-lg border px-4 py-3 text-left ${
                  open ? "border-accent bg-elevated hover:brightness-110" : "border-border bg-surface opacity-70"
                }`}
              >
                <span>
                  <span className="font-mono text-[11px] uppercase tracking-widest text-accent">{m.code}</span>
                  <span className="ml-2 font-display text-lg text-bone">{m.title}</span>
                  <p className="mt-1 text-xs text-muted">{locked ? m.lockedFlavor : `${m.place} · ${m.boss}`}</p>
                </span>
                <span className="font-mono text-[11px] uppercase text-subtle">
                  {done ? "Clear" : locked ? "Locked" : "Ready"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={onNew} className="mt-8 self-start text-sm text-subtle hover:text-fg">
        New campaign (clears upgrades)
      </button>
    </main>
  );
}
