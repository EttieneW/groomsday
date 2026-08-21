import { UPGRADES, UPGRADE_CAP, type UpgradeId, type UpgradeStacks } from "@/game/campaign";

const ORDER: UpgradeId[] = ["speed", "dmg", "hp", "gunnery"];

export function UpgradeScreen({
  stacks,
  waiting,
  onPick,
}: {
  stacks: UpgradeStacks;
  waiting: boolean;
  onPick: (id: UpgradeId) => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/85 px-4">
      <div className="w-full max-w-3xl rounded-xl border border-border bg-surface p-6">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">Mission complete</p>
        <h3 className="mt-2 font-display text-3xl text-bone">Choose your upgrade</h3>
        <p className="mt-2 text-sm text-muted">Each groomsman picks for himself. Stacks carry into the next chapel.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {ORDER.map((id) => {
            const u = UPGRADES[id];
            const n = stacks[id] ?? 0;
            const full = n >= UPGRADE_CAP;
            return (
              <button
                key={id}
                type="button"
                disabled={waiting || full}
                onClick={() => onPick(id)}
                className="rounded-lg border border-border bg-elevated p-4 text-left hover:border-accent disabled:opacity-40"
              >
                <p className="font-display text-xl text-bone">{u.name}</p>
                <p className="font-mono text-[11px] uppercase tracking-wider text-accent">
                  {u.per} · {n}/{UPGRADE_CAP}
                </p>
                <p className="mt-2 text-sm text-muted">{u.blurb}</p>
              </button>
            );
          })}
        </div>
        {waiting && <p className="mt-4 text-center font-mono text-xs uppercase tracking-widest text-subtle">Waiting for squad…</p>}
      </div>
    </div>
  );
}
