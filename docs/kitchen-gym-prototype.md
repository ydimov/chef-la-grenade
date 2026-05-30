# Kitchen Gym — Prototype Spec

One-room Godot 4 vertical slice to test **fast destruction**, **planted charges**, and **tactical detonation**.

## Hypotheses

1. Breaking a weak point and falling through feels immediate.
2. Plant + remote detonate is satisfying without standing still.
3. Brief tactical zoom reads armed charges without killing pace.
4. One authored chain pays off in a single detonate.

## Controls

| Action | Keys |
|--------|------|
| Move | A / D or ← / → |
| Jump | Space / Z |
| Roll | Shift / X |
| Throw (La Grenade) | J / LMB |
| Plant (Pressure Cooker) | K / RMB |
| Detonate all | E |
| Tactical view | Hold Tab / Q |
| Drop through one-way | S / ↓ while on platform |
| Restart | R |

## Intended route (30–90s)

1. **Throw** at orange weak floor → break → **drop** to lower kitchen.
2. **Plant** a charge near the red **Rack** (or on the wall beside it).
3. Sprint toward the purple **exit wall** (chain-only — throws won't break it).
4. Hold **Tab** for tactical view → **E** to detonate → rack triggers → wall opens.
5. Reach the green goal platform.

## Run in Godot

1. Install [Godot 4.2+](https://godotengine.org/download).
2. Import project: open `/workspace` (contains `project.godot`).
3. Press F5 (main scene: `scenes/kitchen_gym.tscn`).

## Project layout

```
scripts/
  game_globals.gd    # Autoload: armed bombs, tactical flag, hit-stop
  player.gd          # Platforming + throw/plant/detonate
  weak_point.gd      # One-shot breakables
  throwable_bomb.gd  # Instant weak-point break
  planted_bomb.gd    # Armed charge + blast
  chain_prop.gd      # Rack → triggers linked weak wall
  tactical_camera.gd # Zoom + overlay
  kitchen_gym.gd     # Level build + UI
scenes/
  kitchen_gym.tscn
  player.tscn
  throwable_bomb.tscn
```

## Out of scope (this build)

- Roguelite meta, hub, bosses
- Mise en Place freeze (stretch next)
- Proc-gen, multiple biomes
- Mobile controls
- Final ligne claire art

## Next steps if feel tests pass

- Mise en Place lite (1.5s freeze, 2 plants, weak-point highlights)
- Soufflé / Confit traversal bombs
- Slow-mo tactical view vs full pause A/B test
