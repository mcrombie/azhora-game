# Chapter 3 combat integration

The mountain ambush and the rangers' high-ground battle use the Stillroom's
`createLizeemEncounter` model, player combat stats, unit profiles, defenses,
attack warnings, and hero poses. The chapter wrapper owns staging, slope costs,
retreat completion, and story results. Orc stats and individual attack timings
come from the same profiles used in the one-on-one trials.

The November 1, 2026 correction connects the missing presentation adapters:

- `encounter-view.js` uses the shared `createCombatFocus` controller: T locks or
  unlocks, E cycles, and manual camera movement temporarily releases tracking.
  X/click attacks, held F blocks, Space dodges, and H opens combat help.
- Chapter 3 creates the same `createFireballHost` used by combat practice. Q
  spends the normal mana cost and launches a physical projectile. Both wrapper
  layers expose targeting, cast eligibility, cast commitment, and damage hooks.
- Briefings, help, retreat aftermath, and reports suspend spells. Late hits
  cannot change a completed encounter. A spell victory still requires the last
  ambusher's retreat and a separate evidence interaction.
- Optional validated sorcery data persists in Chapter 3 saves. Older saves
  remain valid and start with full mana. Rehearsals restore the prior mana and
  clear projectiles on exit without changing chapter progress.
- The starting camera faces into the battlefield from the hero's staged
  position, including the ambush's approach from the opposite direction.

Regression coverage lives in `tests/oremindi-encounter.test.js`,
`tests/oremindi-encounter-view.test.js`, `tests/oremindi-chapter.test.js`, and
`tests/oremindi-host.test.js`. The native Chapter 3 review includes ordinary
keyboard controls, a real projectile hit, pause behavior, spent-mana reload,
both battle outcomes, evidence collection, and the final report. Run it with
`node scripts/launch.cjs --exploration --oremindi --smoke-test --internal-review`.
It uses an isolated test profile and leaves player saves untouched.
