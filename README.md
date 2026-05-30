# Chef La Grenade

Dead Cells–style 2D roguelite platformer concept — bombs as weapons and doors.

## Kitchen Gym (playable prototype)

A single handcrafted room in the browser to test:

- Fast platforming (coyote time, jump buffer, roll)
- Instant destruction (throw → break weak floor → drop)
- Planted charges + **detonate all**
- **Tactical view** (hold Tab) + chain reaction (rack → exit wall)

### Quick start

1. Install [Node.js 18+](https://nodejs.org/).
2. From this folder:

```bash
npm install
npm run dev
```

3. Open the URL shown in the terminal (default `http://localhost:5173`).

See [docs/kitchen-gym-prototype.md](docs/kitchen-gym-prototype.md) for controls and the intended route.

### Controls (summary)

**A/D** move · **Space** jump · **Shift** roll · **J** throw · **K** plant · **E** detonate · **Tab** tactical view · **R** restart

### Build

```bash
npm run build
npm run preview
```

Static output goes to `dist/` for deployment when you're ready.
