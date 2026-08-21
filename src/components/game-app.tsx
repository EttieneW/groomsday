import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CampaignBoard } from "@/components/campaign-board";
import { MissionIntro } from "@/components/mission-intro";
import { UpgradeScreen } from "@/components/upgrade-screen";
import {
  applyUpgrade,
  completeMission,
  loadCampaign,
  MISSIONS,
  newCampaign,
  nextPlayableMission,
  type CampaignSave,
  type MissionId,
  type UpgradeId,
} from "@/game/campaign";
import { HEROES, HERO_ORDER, type HeroId } from "@/game/constants";
import { touchState } from "@/game/input";
import { isNetEvent, isPlayerSnap, isWorldMsg, makeLocalNet } from "@/game/net";
import type { CreateGameOptions, GameHud, NetBridge, PlayerSnap } from "@/game/types";
import { useP2PRoom } from "@/lib/multiplayer";

type Screen = "title" | "how" | "select" | "lobby" | "campaign" | "intro" | "play";

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function useQueryRoom() {
  const [room, setRoom] = useState("");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const r = (q.get("room") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    if (r) setRoom(r);
  }, []);
  return room;
}

export function GameApp() {
  const invited = useQueryRoom();
  const [screen, setScreen] = useState<Screen>("title");
  const [hero, setHero] = useState<HeroId>("stache");
  const [name, setName] = useState("Best Man");
  const [room, setRoom] = useState("");
  const [isHost, setIsHost] = useState(true);
  const [joinInput, setJoinInput] = useState("");
  const [save, setSave] = useState<CampaignSave>(() => loadCampaign());
  const [mission, setMission] = useState<MissionId>(1);

  useEffect(() => {
    if (invited) {
      setJoinInput(invited);
      setScreen("select");
    }
  }, [invited]);

  const startSolo = () => {
    setIsHost(true);
    setRoom("");
    setScreen("intro");
  };
  const playMission = (id: MissionId) => {
    setIsHost(true);
    setRoom("");
    setMission(id);
    setScreen("select");
  };
  const createSquad = () => {
    const code = makeCode();
    setRoom(code);
    setIsHost(true);
    setScreen("lobby");
  };
  const joinSquad = () => {
    const code = joinInput.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    if (code.length < 3) return;
    setRoom(code);
    setIsHost(false);
    setScreen("lobby");
  };
  const raidDef = MISSIONS.find((m) => m.id === mission) ?? MISSIONS[0];

  return (
    <div className="relative min-h-dvh bg-bg text-fg font-sans">
      {screen !== "play" && (
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: "url(/game/map/sky.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
      {screen === "title" && (
        <TitleScreen
          raidLabel={`${raidDef.code} — ${raidDef.title}`}
          onRaid={() => setScreen("select")}
          onHow={() => setScreen("how")}
          onCampaign={() => setScreen("campaign")}
        />
      )}
      {screen === "how" && <HowScreen onBack={() => setScreen("title")} />}
      {screen === "select" && (
        <SelectScreen
          hero={hero}
          name={name}
          joinInput={joinInput}
          invited={Boolean(invited)}
          onName={setName}
          onHero={setHero}
          onJoinInput={setJoinInput}
          onSolo={startSolo}
          onCreate={createSquad}
          onJoin={joinSquad}
          onBack={() => setScreen("title")}
        />
      )}
      {screen === "campaign" && (
        <CampaignBoard
          save={save}
          onPlay={playMission}
          onNew={() => {
            setSave(newCampaign());
            setMission(1);
          }}
          onBack={() => setScreen("title")}
        />
      )}
      {screen === "intro" && (
        <MissionIntro missionId={mission} onDone={() => setScreen("play")} />
      )}
      {screen === "lobby" && room && (
        <LobbyScreen
          key={room}
          room={room}
          name={name}
          hero={hero}
          isHost={isHost}
          onStart={() => setScreen("intro")}
          onBack={() => setScreen("select")}
        />
      )}
      {screen === "play" && (
        <PlayScreen
          key={`${room}-${hero}-${mission}-${isHost ? "h" : "c"}`}
          hero={hero}
          name={name}
          room={room}
          isHost={isHost}
          mission={mission}
          upgrades={save.upgrades}
          onQuit={() => setScreen(room ? "lobby" : "campaign")}
          onUpgraded={(id) => {
            const next = completeMission(applyUpgrade(save, id), mission);
            setSave(next);
            const nxt = nextPlayableMission(mission);
            if (nxt) {
              setMission(nxt);
              setScreen("intro");
            } else {
              setScreen("campaign");
            }
          }}
        />
      )}
    </div>
  );
}

function TitleScreen({
  raidLabel,
  onRaid,
  onHow,
  onCampaign,
}: {
  raidLabel: string;
  onRaid: () => void;
  onHow: () => void;
  onCampaign: () => void;
}) {
  return (
    <main className="relative z-10 mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
      <p className="font-mono text-sm tracking-[0.35em] text-muted uppercase">A horror wedding raid</p>
      <h1 className="mt-3 font-display text-5xl leading-none tracking-tight text-bone sm:text-7xl">
        GROOM
        <br />
        FORCE
      </h1>
      <p className="mt-4 max-w-md text-lg text-muted">Ivory is gone. Suit up.</p>
      <p className="mt-6 max-w-lg text-sm leading-relaxed text-subtle">
        Stache&apos;s bride was torn from the aisle by Lord Ashcroft Morrow, the Hollow Groom. Ten
        missions. The Veil King dies at midnight.
      </p>
      <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
        <button
          type="button"
          onClick={onRaid}
          className="rounded-lg bg-accent px-6 py-3.5 text-base font-semibold tracking-wide text-accent-fg transition-transform duration-[var(--motion-quick)] hover:brightness-110 active:scale-[0.98]"
        >
          {raidLabel}
        </button>
        <button
          type="button"
          onClick={onCampaign}
          className="rounded-lg border border-border bg-surface px-6 py-3.5 text-base font-semibold text-fg transition-colors hover:bg-elevated"
        >
          Campaign
        </button>
        <button
          type="button"
          onClick={onHow}
          className="rounded-lg border border-border bg-surface px-6 py-3.5 text-base font-semibold text-fg transition-colors hover:bg-elevated"
        >
          How to raid
        </button>
      </div>
      <p className="mt-10 font-mono text-xs uppercase tracking-widest text-subtle">
        1–4 players · J fire · K knife · L grenade
      </p>
      <a href="/sprites" className="mt-6 font-mono text-[11px] uppercase tracking-widest text-subtle hover:text-bone">
        Sprite lab
      </a>
    </main>
  );
}

function HowScreen({ onBack }: { onBack: () => void }) {
  const rows = [
    ["Move", "A / D or arrows"],
    ["Jump / double-jump", "W, Space, or up"],
    ["Crouch / crawl-shoot", "S or down — hold to kneel and fire low"],
    ["Drop through", "S + jump on a thin ledge"],
    ["Fire", "J or tap Fire"],
    ["Knife", "K — close range, no ammo"],
    ["Grenade", "L — bounce, boom, 10 to start"],
    ["Dodge", "Watch the gold wind-up, then jump or run past the shot"],
    ["Restart", "R after a wipe"],
    ["Squad", "One host shares the room link — friends open that same URL"],
  ];
  return (
    <main className="relative z-10 mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-12">
      <h2 className="font-display text-3xl text-bone">How to raid</h2>
      <ul className="mt-6 space-y-3">
        {rows.map(([k, v]) => (
          <li key={k} className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
            <span className="text-muted">{k}</span>
            <span className="font-mono text-sm text-fg">{v}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm leading-relaxed text-muted">
        Grab gold rings, smash pews and crates, rescue guests (they drop frags), and kill the Lychwing
        at the far nave. Hold S to crouch-shot crawlers. Enemies gold-flash before they fire — jump the
        bone. After the chapel, pick speed, damage, health, or quicker guns.
      </p>
      <button
        type="button"
        onClick={onBack}
        className="mt-8 rounded-lg border border-border bg-surface px-5 py-3 font-semibold text-fg hover:bg-elevated"
      >
        Back
      </button>
    </main>
  );
}

function SelectScreen(props: {
  hero: HeroId;
  name: string;
  joinInput: string;
  invited: boolean;
  onName: (v: string) => void;
  onHero: (h: HeroId) => void;
  onJoinInput: (v: string) => void;
  onSolo: () => void;
  onCreate: () => void;
  onJoin: () => void;
  onBack: () => void;
}) {
  return (
    <main className="relative z-10 mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-8 sm:px-8">
      <button type="button" onClick={props.onBack} className="self-start text-sm text-muted hover:text-fg">
        Back
      </button>
      <h2 className="mt-4 font-display text-3xl text-bone">Pick your groomsman</h2>
      <label className="mt-4 block max-w-xs text-xs uppercase tracking-widest text-subtle">
        Callsign
        <input
          value={props.name}
          onChange={(e) => props.onName(e.target.value.slice(0, 16))}
          className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-base text-fg outline-none focus:border-accent"
        />
      </label>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {HERO_ORDER.map((id) => {
          const h = HEROES[id];
          const on = props.hero === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => props.onHero(id)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                on ? "border-accent bg-elevated" : "border-border bg-surface hover:bg-elevated"
              }`}
            >
              <img
                src={`/game/portraits/${id}.png`}
                alt={h.name}
                className="mx-auto h-28 w-auto bg-transparent object-contain"
                style={{ background: "transparent" }}
                crossOrigin="anonymous"
              />
              <p className="mt-2 font-display text-lg text-bone">{h.name}</p>
              <p className="font-mono text-xs uppercase tracking-wider text-accent">{h.title}</p>
              <p className="mt-1 text-xs leading-snug text-muted">{h.blurb}</p>
              <p className="mt-2 font-mono text-[11px] text-subtle">
                HP {h.hp} · SPD {h.speed}
              </p>
            </button>
          );
        })}
      </div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={props.onSolo}
          className="rounded-lg bg-accent px-5 py-3.5 font-semibold text-accent-fg hover:brightness-110"
        >
          Solo raid
        </button>
        <button
          type="button"
          onClick={props.onCreate}
          className="rounded-lg border border-border bg-surface px-5 py-3.5 font-semibold hover:bg-elevated"
        >
          Create squad
        </button>
      </div>
      <div className="mt-4 flex max-w-md flex-col gap-2 sm:flex-row">
        <input
          value={props.joinInput}
          onChange={(e) => props.onJoinInput(e.target.value.toUpperCase())}
          placeholder="Room code"
          className="flex-1 rounded-md border border-border bg-surface px-3 py-3 font-mono tracking-widest text-fg outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={props.onJoin}
          className="rounded-lg border border-border bg-surface px-5 py-3 font-semibold hover:bg-elevated"
        >
          Join squad
        </button>
      </div>
    </main>
  );
}

function LobbyScreen({
  room,
  name,
  hero,
  isHost,
  onStart,
  onBack,
}: {
  room: string;
  name: string;
  hero: HeroId;
  isHost: boolean;
  onStart: () => void;
  onBack: () => void;
}) {
  const p2p = useP2PRoom({ room, name: `${name}|${hero}` });
  const [copied, setCopied] = useState(false);
  const [lan, setLan] = useState<{ origin: string; hamachi: string[]; urls: string[] } | null>(null);
  const hamachi = lan?.hamachi ?? (lan?.urls ?? []).filter((u) => u.startsWith("http://25."));
  const otherLan = (lan?.urls ?? []).filter((u) => !u.startsWith("http://25."));
  const localShare = typeof window !== "undefined" ? `${window.location.origin}?room=${room}` : `?room=${room}`;
  const share = hamachi[0] ? `${hamachi[0]}?room=${room}` : localShare;

  useEffect(() => {
    void fetch("/api/lan")
      .then((r) => r.json())
      .then((d: { origin?: string; hamachi?: string[]; urls?: string[] }) => {
        setLan({ origin: d.origin ?? "", hamachi: d.hamachi ?? [], urls: d.urls ?? [] });
      })
      .catch(() => {
        /* ignore */
      });
  }, []);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <main className="relative z-10 mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-12">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted">Squad lobby</p>
      <h2 className="mt-2 font-display text-4xl tracking-widest text-bone">{room}</h2>
      <p className="mt-2 text-sm text-muted">
        {p2p.joined
          ? "Linked. Friends open THIS same page — they should not each host their own server."
          : "Linking the chapel radio…"}
      </p>
      <ul className="mt-6 space-y-2 rounded-xl border border-border bg-surface p-4">
        <li className="flex justify-between text-sm">
          <span>
            {name} · {HEROES[hero].name}
          </span>
          <span className="font-mono text-xs text-accent">{isHost ? "HOST" : "YOU"}</span>
        </li>
        {p2p.peers.map((p) => (
          <li key={p.id} className="flex justify-between text-sm text-muted">
            <span>{p.name.split("|")[0] || p.name}</span>
            <span className="font-mono text-xs">{p.connectionState}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => copy(share)}
        className="mt-4 rounded-lg border border-accent bg-elevated px-4 py-3 text-sm font-semibold hover:bg-surface"
      >
        {copied ? "Copied" : hamachi.length ? "Copy Hamachi link" : "Copy squad link"}
      </button>
      <p className="mt-2 break-all font-mono text-sm text-bone">{share}</p>
      {hamachi.length > 0 && (
        <p className="mt-1 text-xs text-muted">
          Send that to anyone already in your Hamachi network. They open it in a browser — no extra
          server. You keep this page running.
        </p>
      )}
      {otherLan.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted">Same Wi-Fi</p>
          <ul className="mt-2 space-y-1">
            {otherLan.map((u) => {
              const href = `${u}?room=${room}`;
              return (
                <li key={u}>
                  <button
                    type="button"
                    onClick={() => copy(href)}
                    className="w-full truncate rounded-md px-1 py-1 text-left font-mono text-xs text-bone hover:bg-elevated"
                  >
                    {href}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onStart}
          className="flex-1 rounded-lg bg-accent px-5 py-3.5 font-semibold text-accent-fg"
        >
          {isHost ? "Start mission" : "Enter chapel"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-border px-5 py-3.5 font-semibold"
        >
          Leave
        </button>
      </div>
    </main>
  );
}

function PlayScreen({
  hero,
  name,
  room,
  isHost,
  mission,
  upgrades,
  onQuit,
  onUpgraded,
}: {
  hero: HeroId;
  name: string;
  room: string;
  isHost: boolean;
  mission: MissionId;
  upgrades: CampaignSave["upgrades"];
  onQuit: () => void;
  onUpgraded: (id: UpgradeId) => void;
}) {
  if (room) {
    return (
      <OnlinePlay
        hero={hero}
        name={name}
        room={room}
        isHost={isHost}
        mission={mission}
        upgrades={upgrades}
        onQuit={onQuit}
        onUpgraded={onUpgraded}
      />
    );
  }
  return (
    <LocalPlay
      hero={hero}
      name={name}
      mission={mission}
      upgrades={upgrades}
      onQuit={onQuit}
      onUpgraded={onUpgraded}
    />
  );
}

function LocalPlay({
  hero,
  name,
  mission,
  upgrades,
  onQuit,
  onUpgraded,
}: {
  hero: HeroId;
  name: string;
  mission: MissionId;
  upgrades: CampaignSave["upgrades"];
  onQuit: () => void;
  onUpgraded: (id: UpgradeId) => void;
}) {
  const net = useMemo(() => makeLocalNet(hero, name), [hero, name]);
  return (
    <MountedGame
      hero={hero}
      name={name}
      mission={mission}
      net={net}
      upgrades={upgrades}
      onQuit={onQuit}
      onUpgraded={onUpgraded}
    />
  );
}

function OnlinePlay({
  hero,
  name,
  room,
  isHost,
  mission,
  upgrades,
  onQuit,
  onUpgraded,
}: {
  hero: HeroId;
  name: string;
  room: string;
  isHost: boolean;
  mission: MissionId;
  upgrades: CampaignSave["upgrades"];
  onQuit: () => void;
  onUpgraded: (id: UpgradeId) => void;
}) {
  const p2p = useP2PRoom({ room, name: `${name}|${hero}` });
  const remotes = useRef(new Map<string, PlayerSnap>());
  const p2pRef = useRef(p2p);
  p2pRef.current = p2p;
  const net = useMemo<NetBridge>(
    () => ({
      isHost,
      selfId: p2p.selfId,
      hero,
      name,
      remotes: remotes.current,
      world: null,
      sendState: (snap) => p2pRef.current.broadcast({ t: "p", ...snap }),
      sendWorld: (world) => p2pRef.current.broadcast({ t: "w", world }),
      sendEvent: (ev) => p2pRef.current.send(ev),
    }),
    [hero, name, isHost, p2p.selfId],
  );

  useEffect(() => {
    return p2p.onMessage((from, data, channel) => {
      if (channel === "state") {
        if (isPlayerSnap(data)) remotes.current.set(from, data);
        if (isWorldMsg(data)) {
          net.world = data.world;
        }
      } else if (isNetEvent(data)) {
        window.__playScene?.ingestEvent(data);
      }
    });
  }, [p2p, net]);

  useEffect(() => {
    net.selfId = p2p.selfId;
    net.remotes = remotes.current;
  }, [net, p2p.selfId]);

  return (
    <MountedGame
      hero={hero}
      name={name}
      mission={mission}
      net={net}
      upgrades={upgrades}
      onQuit={onQuit}
      onUpgraded={onUpgraded}
    />
  );
}

function MountedGame({
  hero,
  name,
  mission,
  net,
  upgrades,
  onQuit,
  onUpgraded,
}: {
  hero: HeroId;
  name: string;
  mission: MissionId;
  net: NetBridge;
  upgrades: CampaignSave["upgrades"];
  onQuit: () => void;
  onUpgraded: (id: UpgradeId) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [hud, setHud] = useState<GameHud | null>(null);
  const [win, setWin] = useState<number | null>(null);
  const [dead, setDead] = useState(false);
  const [toast, setToast] = useState("");
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 800;
    setTouch(coarse);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let game: { destroy: (r: boolean) => void } | null = null;
    let gone = false;
    const opts: CreateGameOptions = {
      hero,
      playerName: name,
      net,
      upgrades,
      missionId: mission,
      callbacks: {
        onHud: (h) => setHud(h),
        onWin: (c) => setWin(c),
        onDeath: () => {
          setDead(true);
          setTimeout(() => setDead(false), 900);
        },
        onCheckpoint: (label) => {
          setToast(label);
          setTimeout(() => setToast(""), 1600);
        },
      },
    };
    void import("@/game/create-game").then(({ createGame }) => {
      if (gone || !rootRef.current) return;
      game = createGame(rootRef.current, opts);
    });
    return () => {
      gone = true;
      game?.destroy(true);
    };
  }, [hero, name, net, upgrades, mission]);

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <div className="flex items-center justify-end px-3 py-2">
        <button type="button" onClick={onQuit} className="font-mono text-xs uppercase tracking-widest text-muted hover:text-fg">
          Abort
        </button>
      </div>
      <div ref={rootRef} className="min-h-0 flex-1 touch-none" />
      {touch && <TouchBar />}
      {toast && (
        <div className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 rounded-md bg-elevated px-4 py-2 font-mono text-sm text-bone">
          Checkpoint · {toast}
        </div>
      )}
      {win !== null && <UpgradeScreen stacks={upgrades} waiting={false} onPick={onUpgraded} />}
      {hud?.bossHp != null && hud.bossMax != null && (
        <div className="pointer-events-none absolute inset-x-0 top-10 z-10 flex flex-col items-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-accent">{hud.bossName}</p>
          <div className="mt-1 h-2 w-80 max-w-[70vw] overflow-hidden rounded-full bg-elevated">
            <div className="h-full bg-danger" style={{ width: `${Math.max(0, (100 * hud.bossHp) / hud.bossMax)}%` }} />
          </div>
        </div>
      )}
      {dead && (
        <div className="pointer-events-none absolute inset-x-0 top-24 text-center font-display text-2xl text-danger">
          Down — returning to stone
        </div>
      )}
    </div>
  );
}

function hold(key: keyof typeof touchState, on: boolean) {
  touchState[key] = on;
}

function TouchBar() {
  const bind = useCallback((key: keyof typeof touchState) => {
    return {
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        hold(key, true);
      },
      onPointerUp: () => hold(key, false),
      onPointerCancel: () => hold(key, false),
    };
  }, []);
  const btn =
    "h-14 min-w-14 rounded-lg border border-border bg-surface/90 px-4 font-mono text-sm uppercase tracking-wide text-fg active:bg-accent active:text-accent-fg";
  return (
    <div className="flex items-end justify-between gap-3 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
      <div className="flex gap-2">
        <button type="button" className={btn} {...bind("left")}>
          Left
        </button>
        <button type="button" className={btn} {...bind("right")}>
          Right
        </button>
      </div>
      <div className="flex gap-2">
        <button type="button" className={btn} {...bind("down")}>
          Crouch
        </button>
        <button type="button" className={btn} {...bind("jump")}>
          Jump
        </button>
        <button type="button" className={btn} {...bind("knife")}>
          Knife
        </button>
        <button type="button" className={btn} {...bind("shoot")}>
          Fire
        </button>
        <button type="button" className={btn} {...bind("grenade")}>
          Frag
        </button>
      </div>
    </div>
  );
}
