# Climbing: Suval proof of concept

Implemented 27 September 2026. The Suval hills provide the first playable terrain-climbing system: choose a face, manage stamina, traverse toward a ledge, and decide whether to risk another ascent. Climbing is learned automatically on the first successful grip; no teacher or quest is required.

## Controls and progression

| Input | Action |
| --- | --- |
| Space near a steep face | Grip the rock. Face uphill and approach until the contextual prompt appears. |
| W / S | Climb up / down the face. |
| A / D | Traverse across it, independently of camera direction. |
| Space while attached | Spend 14 stamina for a 0.45-second upward boost. |
| X | Let go. |

The climbing meter shows remaining stamina. Moving consumes stamina; descending costs less, and hanging still consumes a small amount. A gentle, clear ledge automatically ends the climb and allows normal stamina recovery. Pause freezes climbing and its costs.

Experience comes from actual climbing movement, never standing still. Higher Climbing levels improve speed and stamina efficiency. Releasing or exhausting stamina starts a continuous fall or slide along the real hillside. Large drops injure the player; this is not a teleport back to the approach.

## Terrain and safety rules

- The mechanic currently applies to terrain in West, South and East Suval. Ordinary walking cannot ascend a climbing face; authored paths remain walkable, including Catie's route to the cave.
- Only `suval-peak-face` colliders represent climbable exposed terrain. Trees, people, houses, cave walls, separate boulders, frontier ridges, gates and fortifications remain solid.
- Every climbing and falling step checks the closed border. Climbing cannot unlock East Suval. A tester already placed inside it can use suitable interior terrain.
- This first version follows the terrain heightfield. Climbing separate props, vertical building walls, ceilings and overhangs is not implemented.
- A save made while climbing resumes from the last safe foothold, with earned skill progress retained. It does not reload the player attached to a cliff.

## Useful test locations

Use Testing tools → Go to a point. Coordinates are world `x, z`; face the indicated uphill heading before pressing Space. The short ledges leave plenty of stamina at beginner level.

| Location | Coordinates | Uphill yaw, radians | Purpose |
| --- | --- | --- | --- |
| West Suval short ledge | `-501.981207, 610.925240` | `-0.511079` | Grip, climb, crest and recover. |
| South Suval short ledge | `-321.711436, 1010.879388` | `0.058984` | Repeat the basic loop on different terrain. |
| West Suval tall face | `-517.273331, 677.280100` | `1.345364` | Traversal, stamina exhaustion, release and fall injury. |

Run the focused checks with:

```sh
npm run test:climbing
npm run test:climbing:desktop
```

The pure controller tests cover movement, pause, stamina, experience, boosts, falls, obstacles and border refusal. Built-world tests exercise actual West/South faces, all Suval switchbacks, Catie's complete walking route and the frontier barriers. The desktop command drives the actual renderer. Final desktop verification passed 41 checks with no renderer errors; captures show the gripping, climbing and ledge poses. Focused controller, real-terrain, pose, movement, combat and skill regressions pass, the existing swimming suite passes all 17 checks, and the web build succeeds.

## East Lotharn compatibility

Separate worktree `../azhora-game-south-suval`, branch `east-lotharn`, commit `b108263`, contains East Lotharn terrain, ramps, eight caves and an older automatic scrambling rule. It has not been merged into this worktree.

Both versions define `src/gameplay/movement/climbing.js` and `createClimbing`, but their APIs differ. The older rule uses `mayStep`, `pace`, `climbed` and `slip`; the Suval controller uses `probe`, `grab`, `tick`, `view` and `release`. Their `main.js`, movement integration and climbing tests also overlap.

Before a future merge, give the older policy its own module and name, then choose whether to replace it with the skill-based controller. Its cliffs were designed to require ramps and caves: enabling free climbing there would change that design. Preserve cave-floor movement and the local horse restrictions rather than applying surface climbing to cave roofs or replacing those rules accidentally.
