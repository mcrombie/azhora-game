# Portfolio preparation — 4 November 2026

Local candidate based on `098b068bf3adbad0a3b6215f73d44e22a73f196a`, prepared in
the isolated `azhora-portfolio-20261104` worktree. No commit, push, deployment,
new video, Cromblog edit, gameplay expansion or private-manuscript access.

The original checkout's 14 modified Night Elf files and untracked
`src/content/characters/elven-cultures.js` remain unchanged. The latter's SHA-256
is `1554ba9b72b2963d10a2c17cfa0ea1f04afa9a4a5e9c389ebbd3d760aa9b497b`.
Its README changes overlap this pass's README; retain both when integrating.
This candidate deliberately does **not** include the uncommitted Night Elf work.

## Resulting launch behavior

- Browser default: Story first, Explore second, in visual and keyboard order.
  Story uses the existing introduction, Uguth preparation, Taleth briefing,
  allegiance and Lizeemi campaign. Explore automatically uses Fast/progressive
  loading. No public loading choice or countdown.
- Public Continue appears only for compatible saved progress, including the
  separate prologue checkpoint. No save formats, keys or campaign rules changed.
- Native desktop explicitly selects the developer presentation. Browser users
  can select it with `?launcher=developer`. All three chapters, Explore's
  Full/Fast selection, Combat Testing, folded rehearsals and explicit diagnostic
  routes remain. Hidden controls are not an access-control boundary; development
  modules remain in the public artifact as before.

## Loading findings

Measured locally in Electron 32.3.3's Chromium; these are observations, not
promised timings on other computers or over the internet.

| Path | Observed time | Result |
| --- | ---: | --- |
| Native Fast Explore | 83.7 s | Starting region, movement, atlas and save worked; 30/318 jobs ready |
| Native Full Explore | 572.6 s | All 318 jobs completed; distant travel took 0.33 s without new construction |
| Built-browser Fast Explore | 61.2 s | Playable; nearby Caricas already prepared by the shared Lizeem job; a deferred Yunethre job constructed on demand |
| Built-browser Story introduction | 6.1 s | No exterior world constructed before the door |
| Story door to Taleth's tower | 3.2 s | Five-region campaign host; exterior deferred until leaving the tower |

Full was slow, not hung in this run. Construction consumed about 522 seconds of
loader tick time, with a longest individual step of 822 ms. Cooperative scheduling
cannot interrupt such a step. Fast still has a significant initial delay and
possible streaming hitches (a 379 ms step was recorded). A broad geometry or
worker redesign was not undertaken. Story is the recommended first impression.

The native loading harness completed all 39 assertions and wrote `complete:true`,
but its process exited nonzero after a GPU command-buffer error during shutdown.
This is **not** recorded as a clean native pass. The separate built-browser run
exited cleanly, tested both Continue paths and recovered from an intentionally
blocked world-module request without changing production or normal saves.

## Verification and remaining limits

- `npm ci --no-audit --no-fund`: installed the locked dependencies. No upgrades.
  Node **24.15.0** was used; package and lockfile now declare **>=22.15.0**.
- `npm run check:layout`: passed; 2,195 modules / 9,111 local references at first
  check. `npm run check:modules`: 1,382 modules linked successfully.
- Focused campaign, loading, guidance, privacy and launcher group: **93/93**.
  Additional exploration, world-war, arrival, allegiance, desktop checkpoint and
  loading compatibility group: **68/68**.
- Newly reviewed test group: **134/137 assertions**, across 20 files including
  the new launcher tests. The three failures are retained and classified below.
- Built-browser portfolio checks: **41/41** in the expanded public run, including
  keyboard order, genuinely deferred-region construction, failure recovery and
  both Continue paths. No unexpected console errors or nonlocal requests.
- Separate developer chapter-entry run: **21/21**, clean exit. Chapters Two and
  Three start, save and Continue with identical checkpoints and prior chapter
  history. Startup/restore took about 7.8 s each for Yunethre and 35.3 s each for
  Oremindi. This verifies entry and persistence, not complete chapter playthroughs.
  The new test waits for each asynchronously loaded save validator before checking
  Continue; its first attempt had checked the button prematurely.
- `npm run build:web`: succeeded; approximately **67.8 MB**. The build now writes
  `public/build-info.json` with a deterministic asset-content fingerprint.
- Public-output scan: no private/reference paths, repository metadata, test files,
  user-save directory or symlinks. A basic high-confidence credential-pattern
  scan of 1,441 public text files found no matches. This is not a forensic secret
  audit or a comparison against the confidential manuscript, which was not read.
- Real Chromium/WebGL was exercised through isolated Electron browser windows
  without the desktop preload or save bridge. Screenshots were visually inspected.
  A separate manual Chrome/Edge interactive session was unavailable; this is not
  a claim of complete human playtesting or mobile-browser compatibility.
  A later public rerun stopped at Electron's `Current display surface not available
  for capture` during the campaign screenshot. It does not supersede the earlier
  completed 41-check run and is not counted as a pass. The chapter-entry checks
  can be run independently of that capture and the expensive Explore startup.
- The entire registered test suite and four heavy legacy-world checks were not
  run. The old full-campaign driver initially timed out after a nonfatal defeat:
  it expected the afterlife despite the visible Continue report and 100 HP. Its
  verification-only branch now distinguishes surviving defeat from death.

The combined web regression is **not green**. The existing developer squad
exercise's ordinary-input automated fighter lost with 0 HP and two guards left;
the lesson and advanced exercises passed. This reproduced on a separate run,
without frame errors. No combat balance or success assertion was changed.
The harness now records this failure and still checks independent routes before
exiting nonzero. Hearthfall/Feradom entry, isolated browser save, return to menu
and fresh-renderer restoration all passed; its save does not enable public
Continue. Combat audio unlocked after input and mute persisted across retries.
`npm run test:portfolio:web` includes this developer regression and therefore
currently fails; the narrower `--portfolio-only` run isolates public/developer
launcher, startup and save checks without claiming the combat exercise passed.

The bounded native demo check then **passed cleanly**: all five tutorial lessons,
normal walking to Taleth, allegiance, Bear and the harbor, a real downstream voyage,
and the first 13-enemy/11-ally Caricas assault. The automated fighter survived a
timed defeat. Continue advanced Adventure 96.30 s to 182.02 s and resumed play.
Map time then advanced to 300.75 s, resolving a second battle without intervention.
Campaign event history survived save/reload. No frame or console errors were
reported. This verifies the short demo, not a complete campaign victory.

Reproduce the bounded check without recording a video:

```sh
node scripts/launch.cjs --exploration --smoke-test --internal-review --scenario-playthrough-review --portfolio-demo-review
```

The local build fingerprint is
`f5d53e9de244697602c389472e19b497fb3bc3d0a305bc65dcf7939ab20f98c1`
over 1,462 published files (plus the generated manifest itself). A later source
change requires rebuilding and recording a new fingerprint.

Focused checks used:

```sh
node --test --test-isolation=none tests/unified-war.test.js tests/adventure-war.test.js tests/food-world-time.test.js tests/food-world-presentation.test.js tests/tower-training.test.js tests/war-guidance.test.js tests/campaign-guidance.test.js tests/chapter-continuation.test.js tests/private-reference.test.cjs tests/launcher-presentation.test.js tests/region-loading.test.js tests/loading-choice.test.js
node --test --test-isolation=none tests/exploration.test.js tests/world-war.test.js tests/stillroom-arrival.test.js tests/campaign-allegiance.test.js tests/checkpoint-store.test.cjs tests/exploration-loading.test.js
npm run check:tests
npm run test:portfolio:web
# Narrower checks (each uses an isolated test profile):
node scripts/launch.cjs --smoke-test --web-checks --portfolio-only
node scripts/launch.cjs --smoke-test --web-checks --developer-chapters-only
```

### Test inventory reconciliation

The original discrepancy was **707 registered / 730 discovered**. Inspection found
ordinary Node tests, not a separate hidden test format. Seventeen omitted files
passed and were registered, along with the new launcher test. The final inventory
is **731 discovered = 725 registered + 6 explicit exclusions**. `npm run check:tests`
(also run before `npm test`) now fails on unclassified omissions or duplicate entries.

These exclusions are deliberate decisions in this pass, not a claim that the
previous omissions were documented or intentional:

- `tests/alex.test.js`: 6/7 pass; legacy door-dialogue expectation fails at line 108.
- `tests/melee-contact.test.js`: 7/9 pass; allied damage is 78 rather than 82 HP,
  and officer frontal mitigation does not satisfy the old assertion. Combat
  behavior was not altered to make a legacy test green.
- `tests/drent-combat.test.js`, `tests/drent-stealth-world.test.js`,
  `tests/drent-world.test.js`, `tests/kayla-world.test.js`: explicit manual checks
  that construct the complete original adventure world. Run each separately with
  `node --test --test-isolation=none <file>` to avoid retaining several whole worlds.

The two audit failures were stale tests, not gameplay fixes:
`war-guidance.test.js` now uses `createOpeningWar` for its legacy delayed-opening
fixture; current immediate-Caricas behavior is still checked by `adventure-war`.
`private-reference.test.cjs` checks the shared, complete positive distribution list
and both `.test.js`/`.test.cjs` exclusion, rather than matching an obsolete inline
list in the build script. Its actual private HTTP-path denial checks remain intact.

## Exact changed files

| File | Purpose |
| --- | --- |
| `README.md` | Employer introduction, runnable commands, honest AI contribution statement, existing demo/blog links; historical material retained |
| `docs/architecture/README.md` | Distinguish current Lizeemi implementation from original Solis chapter numbering |
| `docs/portfolio-demo.md` | Short existing-game walkthrough and source trace |
| `docs/portfolio-preparation.md` | This evidence, limitations and integration handoff |
| `index.html` | Public wording, two visible choices, prototype messaging and developer-only UI annotations |
| `src/app/exploration/launcher-presentation.js` | Shared explicit presentation policy and Continue visibility |
| `src/app/exploration/entry.js` | Apply policy; public progressive Explore; unchanged game modes/save slots |
| `scripts/exploration-desktop.cjs` | Native developer selection and bounded demo verification option |
| `src/dev/checks/explore-loading-smoke.js` | Correct five-card developer-menu expectation |
| `src/dev/checks/scenario-playthrough-review.js` | Correct nonfatal defeat handling; verify one battle plus unattended consequences |
| `scripts/web-smoke.cjs` | Public menu assertions, developer regressions, controlled load-failure injection and recorded combat failure without skipping independent checks |
| `scripts/portfolio-web-checks.cjs` | Built-browser startup, movement, deferred region, failure and save checks; separate Chapter Two/Three entry and Continue checks |
| `scripts/build-web.mjs` | Shared allowlist, safer output-directory guard, artifact fingerprint |
| `scripts/public-files.cjs` | Single positive distribution list and exclusions |
| `package.json` | Node requirement, inventory precheck and portfolio web check command |
| `package-lock.json` | Matching root Node requirement; dependency versions unchanged |
| `scripts/check-test-inventory.cjs` | Account for all public source/test files without scanning private material |
| `tests/test-manifest.json` | Register reviewed passing omissions and new launcher tests |
| `tests/test-exclusions.json` | Explicit failures/manual-heavy classification |
| `tests/launcher-presentation.test.js` | Public/developer policy, existing mode IDs and Continue behavior |
| `tests/war-guidance.test.js` | Correct legacy scenario fixture |
| `tests/private-reference.test.cjs` | Verify current distribution allowlist and serving gates |

Generated `public/`, `.tmp/` logs and `tests/artifacts/` screenshots/results are
ignored local verification artifacts, not proposed source commits.

## Remaining release steps — approval required before commit/push/deploy

1. Review this isolated diff and the subsequent [release review](portfolio-release-review.md).
   The final-review scope explicitly excludes the separate Night Elf work; leave
   it in the original checkout. Do not merge it as part of this release candidate.
2. After approval, commit the selected changes and push that exact revision.
   Do not describe the present detached, uncommitted worktree as a GitHub release.
3. Confirm the Render build runtime is Node 22.15+ (24.15.0 was tested) and uses
   the lockfile. Build the approved revision, then manually deploy with separate
   approval. `autoDeploy:false` remains unchanged.
4. Compare the deployed `/build-info.json` fingerprint with that revision's local
   artifact, and verify uncached launcher/source files. A push alone does not
   update Render; the prior audit found older production code.
5. Perform a fresh real-browser Story/Explore smoke check, audio after a user
   gesture, Continue and a first battle. Review the long Explore wait and native
   Full/GPU result before calling the broader experience polished.

Cromblog/project-listing wording remains a separate future approval item. No
changes were made to that repository or live site.
