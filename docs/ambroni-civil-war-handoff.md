# Claude handoff: Ambroni Civil War / Vastos

Developed in `C:\Users\Michael\Programs\typescript\azhora-game-codex-vastos`, branch `codex/vastos-civil-war`, commit `47ae36e`, based on `907269b`. On 23 September 2026 the user requested desktop integration. The Vastos patch is now applied to the **desktop checkout** at `C:\Users\Michael\Programs\typescript\azhora-game` on `main`, preserving Claude's uncommitted `characters.js`, `main.js` and `peblos-people.js` changes. The existing desktop `Azhora.lnk` already launches that checkout, so no shortcut redirection was needed. The sibling World Builder and `CLAUDE.md` are unchanged.

## What is integrated

**The Common Water** is the first playable local settlement in the silver **Ambroni Civil War** series (`grade: 'plot'`, quest id `civil-war-vastos`). Vastos now has Mera Rusk's herder camp, Republican delegate Tessa Mere, Sergeant Alden, three stray cattle, a blocked watering place, and the physical sites used to record terms.

The shared work is to return the strays and reopen the water, then hear the two claims. The player deliberately chooses a route at Mera: post the communities' route-right notice or file a limited royal levy. A discovered covenant, Mera's testimony and both delegates' needs unlock a third proposal, which requires a separate concession from each delegate before settlement. Each route grants exactly two salt-beef provisions, once, with distinct local governance consequences.

This does **not** change global allegiance, choose a prince, conquer Vastos, or call `campaign.resolveArc`. The monarchy question follows `the-war-and-the-house-of-ambron.md`: Republicans can support Willard's constitutional monarchy; Alden's Crown claim does not identify a succession winner.

`civil-war-quests.js` registers 14 regions. **Only Vastos is playable**; all other entries are planned designs, including the twelve-region requested coverage plus Drent and Elagos. `Moros` resolves to `Moros Plain`. Their author-facing `routes` are not used as normal journal text. The journal and silver markers follow the current Vastos objective; the covenant is not listed until discovered.

## Where to continue

| File | Responsibility |
| --- | --- |
| `src/vastos-civil-war.js` | Pure quest state, gates, endings, reward and snapshot validation |
| `src/vastos-dialogue.js` | NPC and site conversations; explicit route choice |
| `src/vastos-camp.js` | Camp, site positions, cattle, local props and state visuals |
| `src/vastos-host.js` | Dialogue, journal/HUD, markers, known locations and runtime boundary |
| `src/main.js` | Registers/binds/ticks host, interactions, journal, save/restore and test travel |
| `src/road-checkpoint.js` | Validates and copies optional `vastos` save section |
| `src/civil-war-quests.js` | Series and regional design registry |
| `docs/ambroni-civil-war.md` | Requirements, lore authority and proposed regional story details |

The road checkpoint remains version 1. Its optional **`vastos`** section stores this quest's version-1 snapshot. Missing sections initialize an unmet quest; invalid sections are rejected before replacing a checkpoint. Restoration itself grants no food. Testing mode retains the game's existing rule that test travel does not replace a normal saved adventure.

## Launch and review

Launch the existing desktop **Azhora** icon, or run `npm start` in the main desktop checkout. After entering the game, open **F8 → Vastos: the Common Water**. This places the traveler beside Mera at the silver scroll. Use **F** to talk/interact and **J** for current terms and directions. The debug hook under `?test=1` is `window.__AZHORA__.vastos` (`view`, `snapshot`, `restore`, `act`, `metrics`, `visit`).

**Focused integration validation: 97 tests passed, 0 failed.** This includes all three quest branches, checkpoint stages and legacy saves, real camp geometry and walkable stands, the host with a DOM adapter, cast registration, silver markers, local-map knowledge and prompt/travel regressions. JavaScript syntax checks and `git diff --check` also passed. The full repository suite is reserved for merge time under the project working rule. The user withdrew the cost-based Electron approval gate. The four-view isolated desktop review passed with no renderer errors; the subsequent layout review checks the journal placement and map-tutorial/HUD priority.

```text
node --test --test-isolation=none tests/civil-war-quests.test.js tests/vastos-civil-war.test.js tests/vastos-camp.test.js tests/vastos-save.test.js tests/vastos-host.test.js tests/cast.test.js tests/quest-markers.test.js tests/road-checkpoint.test.js tests/save-round-trip.test.js tests/local-map-data.test.js tests/prompt-priority.test.js tests/testing-travel.test.js
```

The five new test files are in `package.json`'s explicit test list. Vastos's build-status description now acknowledges the camp and keeps the rest of its missing settlements and roads explicit. Silver interactions take the same priority in their prompt labels as in the F handler.

The prepared visual review uses one isolated test profile, does not touch a normal save, and photographs four views:

```text
node scripts/launch.cjs --smoke-test --review-views=vastos-camp,vastos-dialogue,vastos-journal,vastos-settled
```

This command passed in the desktop checkout. Follow with a manual walk through each route when reviewing gameplay. Cattle recovery currently moves the animal directly to the corral; animated herding is future polish. The camp banners and the dialogue record the local outcome; no province-wide patrol, economy or faction simulation is claimed.

The initial branch patch is already in the desktop checkout; do not reapply it. Integration retained Claude's stage-0 duplicate-marker correction and all of the Ari/Imani appearance changes. The journal now starts with the discovered silver quest, and the map tutorial takes priority over the optional quest tracker when both would occupy the same HUD corner. The full repository test run is recorded below after completion.
