# Freedom Fly

<div align="center">
  <img src="public/web-app-manifest-512x512.png" alt="Freedom Fly logo" width="128" height="128" />
</div>

> Endless mountains, open sky. No goals, no clock — just fly.

**Freedom Fly** is a free, open-source flight simulator that runs entirely in the browser. Take off, soar over procedural mountains, stall, land, and take off again — no downloads, no install, no account. Built on Next.js, React Three Fiber, and Three.js, with a real (if lightweight) flight-physics model and an endless-world terrain system.

Play it: [https://freedom-fly.online](https://freedom-fly.online)  
Source: [https://github.com/skmercur/freedom-fly](https://github.com/skmercur/freedom-fly)

---

## Features

- **Real-time 6-DoF flight physics** — the aircraft is a [Rapier](https://github.com/dimforge/rapier) rigid body (WASM) with a custom aerodynamic model on top: angle-of-attack lift with true stalls, parasitic + induced drag, prop thrust that fades with airspeed and altitude, wind, ground effect, adverse yaw, engine torque, gyroscopic inertia, integrated per frame.
- **Endless world** — terrain and clouds wrap around the camera, so you never run out of sky.
- **Land anywhere flat enough** — touch down gently, wings level, on shallow ground and you roll out safely; steep or fast contact is a crash.
- **Realistic landings & takeoffs** — sink-rate, up-vector and slope checks decide whether contact is a landing or a wreck.
- **Dynamic sky** — drifting cumulus cloud field, speed-driven FOV, crash camera shake.
- **Multi-input controls** — keyboard, gamepad, and touch (on-screen stick + throttle rail) all blended into a single shared input bus.
- **Responsive UI** — animated menus, live flight instruments (airspeed, altitude, throttle, flight time), stall warning and ground-roll hint.
- **Audio** — procedural engine, wind, touchdown and crash sounds synthesized via the Web Audio API (no asset downloads).
- **Configurable** — every physics, camera, and cloud constant lives in [`lib/constants.ts`](lib/constants.ts) and is a one-line tweak.

## Getting Started

### Prerequisites

- Node.js 18.18+ (Next.js 16 requirement)
- npm, pnpm, yarn, or bun

### Install & run

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command         | Description                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Start the dev server with HMR        |
| `npm run build` | Production build                     |
| `npm run start` | Run the production build              |
| `npm run lint`  | Lint with ESLint + `eslint-config-next` |

## Controls

| Input            | Action                       |
| ---------------- | ---------------------------- |
| **↑ / ↓**        | Pitch (climb / dive)         |
| **← / →**        | Roll (bank left / right)     |
| **Z / S**        | Throttle up / down           |
| **Q / D**        | Rudder (yaw left / right)    |
| **1 – 4**        | Throttle presets (0/33/66/100%) |
| **Esc**          | Pause / resume                |
| **Mouse drag**   | Look around (free-look orbit) |
| **Gamepad**      | Left stick = pitch/roll, triggers = throttle |
| **Touch**        | Left thumb-stick = roll/pitch, right rail = throttle |

Keep your angle of attack in check — pull too hard or fly too slow and the wing **stalls** (you'll feel the buffet). Turns are flown by banking: the lift vector tilts and the nose comes around. Touch down gently, wings level, and you can **land** and take off again.

## Project Structure

```
app/                     Next.js App Router (server entry, layout, globals)
components/              React gluing layer
  ├─ GameShell.tsx       Owns DOM/canvas layout, boot flow, audio unlock
  ├─ GameCanvas.tsx      R3F <Canvas> + scene graph
  └─ ErrorBoundary.tsx
game/
  ├─ entities/          Aircraft, Terrain, propeller, GLTF loader
  ├─ effects/           Clouds, environment lighting, crash burst, shake
  ├─ hooks/             useKeyboard
  ├─ systems/           Flight physics, input, gamepad, terrain, scene, engine
  └─ ui/                HUD, MainMenu, Settings, TouchControls, LoadingScreen
lib/
  ├─ constants.ts       ALL tunable values (physics, camera, clouds, palette)
  ├─ math.ts            Small math helpers
  └─ audio.ts           Web Audio engine/wind/crash synth
stores/                 Zustand stores (game state, settings)
public/
  ├─ models/            cessna.glb, terrain.glb
  └─ icons + manifest
```

## Customizing

Everything is tuned from a single file: [`lib/constants.ts`](lib/constants.ts).

```ts
// Make it floaty & arcade-like:
export const GRAVITY = 6;
export const LIFT_K = 0.0030;
export const DRAG_K = 0.0004;

// Triple the clouds:
export const CLOUD_COUNT = 100;

// Pull the camera in tight:
export const CAMERA_DISTANCE = 14;
```

No `#ifdef`, no config files — edit a number, save, and the dev server reloads.

## Tech Stack

- **[Next.js 16](https://nextjs.org)** (App Router)
- **[React 19](https://react.dev)** + **[React Three Fiber 9](https://docs.pmnd.rs/react-three-fiber)**
- **[Rapier](https://github.com/dimforge/rapier)** (`@dimforge/rapier3d-compat`) — WASM rigid-body dynamics
- **[Three.js](https://threejs.org)** + **[@react-three/drei](https://github.com/pmndrs/drei)** + **postprocessing**
- **[Zustand](https://github.com/pmndrs/zustand)** for non-reactic game state
- **[Framer Motion](https://www.framer.com/motion/)** for UI transitions
- **[Tailwind CSS 4](https://tailwindcss.com)** for the HUD/menus

## Architecture Notes

- **Zero re-render state.** Flight physics, input blending, audio and camera live in plain module-level singletons (`game/systems/*`). React mounts the canvas and the DOM overlay; it does **not** hold the per-frame game state. A single `useFrame` drives physics + camera, gauges are pushed via their own private rAF.
- **Rapier dynamics, custom aero.** The aircraft is a Rapier rigid body — Rapier integrates forces, torques, gravity and the inertia tensor (with gyroscopic coupling); the aerodynamic model (`game/systems/flight.ts`) computes the forces/torques it applies. Terrain contact uses the game's own ground probes because the endless wrapping world can't be a Rapier heightfield.
- **SSR-safe.** The WebGL canvas is dynamically imported with `ssr: false`; everything Three-related runs on the client only.
- **Multi-input fusion.** Keyboard, gamepad and the touch joystick each publish to a shared `input` bus (`game/systems/input.ts`); the physics just reads the combined, clamped result.

## Contributing

Contributions are welcome! This is an open-source project — issues, PRs, and ideas all count.

1. Fork the repo
2. Create your branch: `git checkout -b feat/my-idea`
3. Commit your changes (`npm run lint` should stay green)
4. Open a Pull Request

Please keep new tunables in `lib/constants.ts` and avoid adding heavy new dependencies — the current footprint is intentional so the game loads fast.

## License

This project is open-source. See the [LICENSE](LICENSE) file for details.
If no LICENSE file is present yet, it is released under the **MIT License** — feel free to use, fork, and remix.

## Author

- **Sofiane KHOUDOUR** — [https://github.com/skmercur/](https://github.com/skmercur/)

## Acknowledgements

- Built with [Next.js](https://nextjs.org), [Three.js](https://threejs.org) and [React Three Fiber](https://docs.pmnd.rs/react-three-fiber).
- Aircraft & terrain models ship under their respective licenses in `public/models/`.
- Inspired by every free-flight sim that ever let you "just fly."