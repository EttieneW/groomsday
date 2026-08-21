# Local Grok CLI prompt

Paste this to a Grok CLI / coding agent on your machine after cloning `https://github.com/EttieneW/groomsday`.

---

You are continuing **GROOM FORCE** (repo: groomsday), a Phaser 3 + TanStack Start co-op 2D platformer. Four groomsmen raid a haunted chapel. Do not rebuild from scratch. Do not switch engines.

## Get it running first

```bash
cd groomsday
npm install
npm run dev
```

The game must listen on `0.0.0.0:8080`. Keep `startup.sh` if present. Auth stays OFF. Do not add a database unless asked.

Verify: title screen → pick a groomsman → Solo raid. A/D moves, W/Space jumps, J fires. No magenta boxes around characters. Skeletons wind up (gold flash + shoot pose) then fire a large glowing bone shot you can jump over.

## What is already built

- `src/game/scenes/play-scene.ts` — arcade platformer: coyote, jump buffer, variable jump, weapons, enemies, P2P snapshots
- `src/components/game-app.tsx` — title / how / select / lobby / play
- `src/lib/multiplayer` — WebRTC mesh, signaled at `/api/rtc`
- `src/routes/api/lan.ts` — lists LAN / Hamachi IPs for the lobby
- Sprites in `public/game/sprites/` — 256px cells. Heroes have 4-frame idle/jump and **6-frame run**. `skeleton-shoot.png`, `ghost-shoot.png`, `enemy-shot.png`, `muzzle.png`
- Magenta leftover boxes were the old bug. If you regenerate art, solid `#FF00FF` background, flood-key from edges, pack with feet-align, **no leftover cell rectangles**

## Multiplayer rules (do not “fix” this into four local servers)

Room codes only work when every player’s browser talks to **the same origin**. One person runs `npm run dev`, friends open `http://HOST_HAMACHI_IP:8080/?room=CODE`. They do not each host. P2P is co-op among friends, not competitive.

## If the user asks for more

Stay in this game. Typical next work: extra levels, more enemy types, tighter net interpolation, hero shoot body sheets, Hamachi/LAN QA, audio, juice. Use existing skills/pipelines if this workspace has `.grok/skills` (`generate2dsprite` for magenta sheets, `building-games`, `controls`, `multiplayer-p2p`).

Do not strip Grok PWA branding, `__root.tsx` PreviewHostBridge, or `og:*` tags. `src/lib/og/site.json` stays `"type": "x:game"`.

When you change movement, A = left on screen and D = right. Expose `window.__controlsTest`.

---
