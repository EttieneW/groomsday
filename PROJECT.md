# GROOM FORCE

Co-op Metal Slug-style 2D raid. Four groomsmen chase Ivory Hale after the Hollow Groom steals her from the altar.

## Summary

Phaser 3 + TanStack Start run-and-gun. Mission 1 (Chapel of the Damned) is playable: denser chapel, knife/grenades, laser, guests, a parked hearse, and the Lychwing boss. Ten-mission campaign is mapped; 2–10 locked.

## Status

- **Status:** active
- **Completeness:** 48%
- **Last dashboard sync:** 2026-08-21

## Goals

1. Metal Slug feel: special guns with ammo, knife, grenades, destructibles, POWs, unique bosses
2. Ten-mission story ending with the Veil King (Lord Ashcroft Morrow) at the Midnight Nuptials
3. Per-player upgrades after each clear (speed, damage, health, gunnery)
4. 1–4 player WebRTC co-op on one host origin

## Next steps

1. Playtest Mission 1 length, Lychwing tells, and J/K/L
2. Unique sprites for usher / bomber / priest / gargoyle (currently tinted)
3. Build Mission 2 — The Bone Orchard
4. Rideable hearse-slug in Mission 3
5. Hero shoot-body sheets

## Tech stack

- Phaser 3, TanStack Start, React 19, Vite, WebRTC P2P

## How to run

```text
npm install
npm run dev
```

Local URL: `http://localhost:8080` (binds `0.0.0.0:8080`)

## Dashboard registry

`C:\projects\projects-dashboard\data\projects.json`

## Open questions

Rideable vehicles debut on Mission 3. Missions 6–10 remain outline until 2–5 exist.
