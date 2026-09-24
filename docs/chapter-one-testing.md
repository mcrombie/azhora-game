# Chapter 1 regression checks

Run `npm run test:chapter1:desktop` for the real Electron renderer checks. The launcher
uses an isolated test profile and does not overwrite the player's normal save.
Results are written to `tests/artifacts/main-arc-checks.json`.

The check covers:

- Starting the game without a browser click event and receiving the starting kit.
- Jojo's conversation and the selectable, readable letter in the inventory.
- Glun's actual combat drill: two contacts, held shield guard, and a dodge.
- Training without an owned shield, including saving and restoring during the lesson.
  The practice shield is available only at the training post; it is not free equipment.
- Opening the chart, reading the introduction, and returning to Glun for the report.
- Bypassing the rebel ambush and then defeating its three normal 120 HP combatants
  with the main-quest autopilot. The optional silver quest leaves the main quest intact.
- Swimming across the Caloss with normal movement input before accepting Chip's quest.
- Reporting to Iven without repairing the bridge and receiving the payment once.
- Completing Chip's optional Carpentry introduction afterward, with one-time rewards.
- Held guard behavior, Chris's training requirement, nearby arrival notifications,
  and the shore watch's response.

The checks shorten distant travel with fixture positioning. They do not constitute
an uninterrupted country-wide autoplay run. `tests/autopilot-tutorial.test.js` and
`tests/autopilot-bridge.test.js` additionally exercise the actual tutorial controller
and both sides of the authored Caloss crossing. In particular, autoplay must not take
the player back to Chip after the player has already swum to Iven's bank.

`npm run test:drent:desktop` separately checks the optional Civil War in Drent quest,
both faction endings, checkpoint restoration, and the selectable gold/silver tracker.
The tracker must fit above the full bottom-left stats panel, including money.

The latest Chapter 1 and Drent checks reported no renderer or frame errors. Offscreen
Electron can still emit a Chromium GPU shutdown warning after writing a successful
result, sometimes returning exit code 1. Inspect the assertion result and stderr
separately; a shutdown warning does not excuse a failed or missing assertion result.

For Ben, Liz, and Troy, see [Introductory spell quests](introductory-magic.md) and run
`npm run test:magic:desktop`.

The Ben encounter also has a live visual regression: `npm run test:ben:desktop`. It checks the rendered spider, Ben's sorcerer appearance and fireball, retreat, and safe checkpoint recovery. See the introductory spell quest document for its exact coverage.
