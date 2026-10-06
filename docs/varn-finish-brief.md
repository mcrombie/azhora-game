# Varn: finish the user's three decisions on main

Brief written 2026-10-03 by the coordinating session. A short job on work that is nearly done: two red
tests, a verification pass, one render and the report.

## Where things stand

Varn and the three Lotharn pass forts were built on 2026-10-02 by an agent in this worktree
(`docs/varn-brief.md`, `docs/varn-report.md`). The user then decided, in these words:

> 1. There should be a very difficult climber's route. 2. All gates shut by default. 3. garrison the walls.

and, when asked about the survivable 34 m jump and the climb together, answered with the climber's route —
so the coordinator's reading is: **a hard climb is the only way round Varn; no fall gets anyone past it.**

That agent was stopped mid-way for the night. Overnight the other worker (Codex) imported its unfinished
files into main and pushed them (`cfa4839`). **Main now has**: Varn, the forts, every gate shut on one flag
with an inside-only wicket in the Amod Gate, the garrison (`src/content/regions/varn/varn-garrison.js`), the one table of
no-hold rock (`src/gameplay/movement/no-climb-zones.js`), and the climber's route — the Slabs, held by a test that a
level-17 climber finishes them with the game's own controller and wind and a level-16 one falls.

Read the "Main-build integration status" section at the top of `docs/varn-report.md`: it is Codex's own
account of what it left red and why.

## Your worktree

`C:\Users\Michael\Programs\typescript\azhora-game-varn`, branch `varn-finish`, which **is main**
(`cfa4839`). Work only there. **Do not commit, push or stash.** Never touch the main checkout
`azhora-game` (the other worker may be writing in it) or any other checkout. A clean copy of the same
commit is at `C:\Users\Michael\Programs\typescript\azhora-game-land` for baselines: run single test files
there, read-only.

The stopped agent's **later** edits — written after Codex's import, so not on main — are kept in commit
`d219a2f` (branch `varn`). They may be the unfinished fix for exactly what is red. See them with:

    git diff cfa4839 d219a2f -- src/content/regions/varn/varn-world.js tests/lattice-flood.js tests/east-lotharn-peaks.test.js tests/varn-world.test.js tests/lotharn-forts.test.js

(That branch does not have the rest of main, so never merge it or diff it wholesale: only those files.)
Its last note to itself was: "Now the peaks test's bald law: skip the rim cells, with a note."

## The work

1. **`tests/varn-world.test.js` is 21 of 22.** The failure seeds a traveler on the west jamb's top: a
   diagonal step onto the natural rim near (-1266, -722) allows a fall of about 39 m into Amod behind the
   city. A fall never costs more than 100 health and health runs 100-400, so that is a way past Varn for
   anyone strong enough. **Close it in the ground, locally**: nobody at any health may come down past
   Varn alive, or reach the place at all. Codex tried raising the rim everywhere and reverted it because
   it broke other ledges; do not do that. Do not touch the game-wide fall rule. Do not weaken the
   assertion.
2. **`tests/lotharn-forts.test.js` is 11 of 12.** Its failing assertion opens Varn's north gate with the
   south gate shut and expects a 1.5 m lattice to find the 1.2 m wicket; the flood reports a fall route
   instead. Decide which is wrong, the test's method or the ground, by measuring: if the wicket is
   passable by the game's real movement, fix how the test looks (finer sampling at the door, or the
   physical-movement check the Varn suite already uses) without weakening what it claims; if the flood is
   right that there is a fall route, that is a real hole — close it.
3. **Verify the three decisions on the final code**, by measurement, each held by a test:
   - **One very difficult climber's route and nothing easier.** The Slabs, with real stamina: the level
     that finishes and the level that does not. No other way round for a climber of any level — in
     particular the eastern peak's first ramp from the forecourt, which was the easy way before. And no
     fall past the city for a character at maximum health.
   - **Every gate shut by default**, Varn's two and the forts' three, on the one flag; the wicket opens
     from inside only; nobody is sealed in with everything shut.
   - **The garrison**: how many, where, at Varn and at each fort; no names, no dialogue, nothing a
     soldier does to the traveler that an existing garrison soldier does not.
4. **The forts' climbers**: do not rebuild anything. Measure the easiest climber's way round each of the
   three and report what it takes.
5. **One review render after the last change**: Varn from the pass and from Amod, the Slabs, the Amod
   Gate's wicket, the garrison on a wall, the place you changed in item 1, one fort with its men. Look at
   the pictures yourself.
6. **The report.** Keep Codex's integration section but make its numbers true. Add a section "The user's
   three decisions" saying what was built for each and the measurements. Section 10 ("Decisions left for
   the user") is stale — it still says the Amod Gate is always open and there is no garrison: rewrite it
   as what is actually still open.

## Tests

`node scripts/run-tests.cjs <files>` runs each file in its own process (`npm run test:varn` is the Varn
set). **One invocation at a time; never the full suite.** A world-building file takes one and a half to
three minutes.

Run at least: `varn-world`, `lotharn-forts`, `town-life`, `climbing`, `climbing-world`,
`nobody-sealed-in`, `east-lotharn-peaks`, `east-lotharn-world`, `west-lotharn-peaks`, `amod-world`,
`telemonia-world` (it shares the no-climb table), `map-fog`, and anything else you touch. Before calling
a red test pre-existing, run that file in `azhora-game-land` and compare names and messages.

Machine notes: big heredocs fail and backslashes inside python heredocs get eaten — write scripts to a
file and run the file; keep every file's line endings as found; generated files are regenerated by their
scripts, never hand-edited.

## Final message

Read by the coordinator, who will check it, commit, and push. Lead with whether both suites are green and
what you changed to get there; then the measurements for the three decisions; then the forts' climbers;
then anything still open or not verified. Say plainly if "nobody gets past Varn except by the Slabs" is
proved or only partly proved.
