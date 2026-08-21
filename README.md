# GROOM FORCE — Chapel of the Damned

Co-op 2D raid for the groomsmen. Run, double-jump, empty the sidearm, dodge bone shots, plant the banner.

1–4 players. Keyboard, gamepad, or touch.

## Play with friends (this is the important bit)

Room codes only work if **everyone is on the same running copy of the game**. Four people each doing `npm run dev` on four laptops will **not** see each other — each copy has its own radio.

### Easiest: one host, everyone else just opens a browser

1. **One groomsman** (the host) clones this repo and starts the game (see Local setup).
2. Host creates a squad. Copy the squad link from the lobby.
3. Friends join the **same Hamachi network** as the host (or the same LAN).
4. Friends paste the host’s Hamachi / LAN link into their browser, e.g. `http://25.x.x.x:8080/?room=ABCD`.
5. They pick a groomsman and hit **Join squad** / **Enter chapel**. They should show up in the lobby.

They do **not** need to clone the repo if they are only playing. Clone is for the host, or if someone wants to tinker.

Hamachi: install it, make a network, everyone join that network. The lobby lists Hamachi (`25.x`) and LAN addresses automatically — tap one to copy.

### Also fine: one deployed URL

If this is deployed (Vercel / the live Grok app), everyone just opens **that** URL, same room code. No Hamachi, no local server.

## Local setup (host / development)

You need **Node.js 22+**.

```bash
git clone https://github.com/EttieneW/groomsday.git
cd groomsday
npm install
npm run dev
```

Then open `http://localhost:8080` (or the Hamachi IP on port 8080).

Useful scripts:

- `npm run dev` — game on `0.0.0.0:8080`
- `npm run build` — production build
- `npm run typecheck`

## Controls

| Action | Keys |
| --- | --- |
| Move | A / D or arrows |
| Jump / double-jump | W, Space, or up |
| Crouch (shoot low) | S or down |
| Drop through | S + jump |
| Fire | J, K, Ctrl, Shift, F |
| Restart | R after a wipe |

Enemies **telegraph**. Skeletons raise a pistol and flash gold before the bone shot flies. Jump or run past it.

## Stack

Phaser 3 arcade platformer inside a TanStack Start + React shell. Multiplayer is WebRTC P2P (`/api/rtc` is only the handshake). Casual co-op among people who choose to play together — not ranked, not cheat-proof.

## Keep building locally

See [GROK.md](GROK.md) for a prompt you can drop into a local Grok CLI agent.
