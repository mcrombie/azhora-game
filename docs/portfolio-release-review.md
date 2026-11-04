# Portfolio release-candidate review — November 4, 2026

This bounded follow-up uses the existing detached worktree
`typescript/azhora-portfolio-20261104`, based on
`098b068bf3adbad0a3b6215f73d44e22a73f196a`. No commit, push or deployment is
authorized or performed. The original checkout's Night Elf work remains separate.
This record supersedes the unresolved-failure classifications in
[the initial preparation record](portfolio-preparation.md).

## Startup investigation

The repeatable check uses installed Chrome 156, headless, against `public/` over
loopback HTTP. Each run has a fresh profile and no prior saves or browser cache.
This measures local construction/rendering, not Internet download performance.
The test instrumentation exposes existing development helpers without changing
the public launcher or selecting Full loading.

Before this follow-up, Explore reached its first WebGL draw at **38.64 seconds**
and the ready host at **39.19 seconds** after selection. The earlier Electron
measurement was **61.2 seconds**; these different runs are not a controlled
optimization comparison. The launcher itself first painted at 0.20 seconds,
but its handlers were ready only around 5.94 seconds after navigation.

In the 39.19-second run, world loading started at 1.32 seconds. Loading/evaluating
the world module took approximately another 6.08 seconds, initial terrain and
world setup ran until approximately 13.39 seconds, and the requested regional
queue completed at 38.15 seconds. Regional ticks consumed **24.19 CPU seconds**;
30 of 318 jobs were complete. Initial rendering and host setup then took about
one second. The measured maximum animation-frame gap was 5.58 seconds.

Minora depends on shared ground and countryside jobs; their prerequisites also
build scenery in Feradom and Elagos. `src/world.js` preserves ordering through
shared-region dependencies. Removing that ordering is not a supported small
fix: it risks terrain, road and scenery correctness. The largest jobs were
West Lotharn ground (4.62s), Feradom (2.57s), meadow ground (2.11s), and regional
farmland (2.11s). This is principally synchronous construction work, not a
large download or a wait for the entire world.

The previous screen already had status messages and a faint pulsing line. Its
percentage counted only six directly assigned jobs, so it stayed at 0% for
roughly twelve seconds while prerequisites completed. The targeted changes are:

- `src/app/exploration/exploration-loading.js` includes transitive prerequisite
  jobs in completion reporting. `src/world/loading/region-loading.js` exposes
  copied dependency IDs in its diagnostic state; scheduling is unchanged.
- `src/app/exploration/loading-feedback.js`, `entry.js`, `exploration.css` and
  `index.html` provide clearer activity, elapsed seconds, a reduced-motion
  alternative, and an honest long-load notice. Activity stops on success/error.
- README warns that Explore may take about a minute and recommends Story first.

These changes improve feedback, not construction speed. Job percentages are
completion counts, not a time estimate. Multi-second main-thread stalls remain.
Full remains available through developer mode.

The instrumented resource log (699 requests, about 14.9 MB transferred locally,
including headers) separates downloading from construction. Approximately 10.9 MB
had arrived within two seconds of selecting Explore; about 4 MB of chart data and
supporting modules arrived near the end. The two SVG chart requests are existing
behavior. The largest recorded individual request took 229ms on loopback. These
numbers do not predict loading over a slower public Internet connection.

## Final artifact and clean-browser results

The final static build has 1,463 fingerprinted files, 67.8 MB, and SHA-256:
`273be14780e60a16052f4aa736b0e4e8667a86731f489b5d2edf46eee03840ca`.
All published files match their local source; no private-reference/Git paths,
test files or symlinks were included. Rebuilding the lookout updated only its
`sourceHash` and `sceneHash` metadata; the landscape binary is byte-identical.
One additional small correction links the existing favicon, eliminating the
browser's automatic `/favicon.ico` 404. No new artwork was created.

| Measurement | Final local Chrome result |
| --- | --- |
| Launcher first paint | 0.22s |
| Launcher handlers ready | 5.65s Explore run / 5.76s Story run |
| Explore first 3D draw after selection | 38.10s |
| Explore ready after selection | 38.63s; preceding run 39.15s |
| Explore Continue after selection | 37.76s |
| Story opening ready after selection | 0.82s, approximately 6.58s from page navigation |
| Approved portal to playable tower | 2.91s |
| First tower departure to exterior campaign | 8.23s |
| Story Continue into campaign | 8.83s |

There is no demonstrated meaningful speed improvement: the new progress behavior
is the intended result. In the instrumented run, dependency-aware completion
changed from 0% to 3% in about one second, instead of remaining at 0% for twelve.
Elapsed time and the stronger animated activity indicator were visible. The
remaining roughly six-second startup/module-evaluation stalls cannot be fixed by
an elapsed-time display; this is an explicit performance limitation.

Both final runs passed fresh launcher entry, keyboard movement, save and return
to menu, compatible Continue, and saved-position restoration. Story reached the
active Caricas campaign through the real introduction, **the supported tutorial
skip**, Taleth's West allegiance choice and tower departure. Existing test helpers
accelerated dialogue and positioning; this was not an unassisted manual traversal.
Explore prepared 30 of 318 jobs and left distant work deferred. A separate blocked
module check confirmed loading failure stops activity and offers a working return
to the public menu. The final Story/Explore/recovery runs recorded no unexpected
JavaScript, console, frame or network errors; all game requests stayed local.

Source layout, module linking, test inventory and whitespace checks pass. The
focused model checks pass **63/63** (38 combat/loading and 25 presentation/startup/
privacy/guidance). Developer Full remains available; its earlier long run was
not repeated or treated as a public blocker.

**Assessment:** Story is suitable as the lead experience for a clearly labeled
portfolio prototype. Explore is functional and acceptable as a secondary option
with its long-load warning, but it is not a polished instant-start experience.
There was no critical runtime blocker in the tested public paths. The outstanding
validation gap is a headed first-time browser check on an ordinary user machine;
slower hardware/network behavior and subjective performance remain unverified.
Keep the commit/deployment decision pending review rather than calling this a
completed production rollout.

## Failure classification

The original legacy tests were run against both this candidate and a public-only
archive of the base commit: **13 passed, the same three failed** in both.

| Failure | Classification and disposition |
| --- | --- |
| `tests/alex.test.js:108`, missing “Cagney comes to the door…” toast | **Existing unrelated content defect.** The retained quest-home porch and the building-derived Alex doorway are 163.6m apart in this fixture; the toast requires proximity within 25m. The expected wording is still in the host. Leave this legacy adventure repair outside the release; exclusion now describes the actual defect. |
| `tests/melee-contact.test.js:69`, expected 82 HP, actual 78 | **Outdated expectation.** The unified Ambron soldier does 22 damage, not 18. Updated exact target health to 78 and guarded player health to 91. Friendly-fire/contact checks remain. |
| `tests/melee-contact.test.js:139`, officer takes less frontal damage | **Outdated expectation.** Both raised shields fully block. Now asserts both remain at 420 HP, then separately tests unguarded damage: militia 396, armored veteran 402. No combat behavior or balance changed. |
| Developer squad automated fighter loses | **Existing automation limitation, reproduced on the base commit.** The unchanged driver loses with 0 HP and two opponents remaining. This does not demonstrate that the fight is unwinnable for a person. Retain the failing success assertion and report it; do not weaken enemies or suppress the failure. |
| Electron “Current display surface not available for capture” | **Capture/environment limitation.** The exception comes from `webContents.capturePage()` at the campaign screenshot, after host startup. Installed Chrome's separate capture path works. Windows capture also timed out twice. Exact Electron display-surface cause is unconfirmed; no gameplay fix is inferred from this error. |

The melee file is restored to the default manifest. Inventory is now
**731 discovered = 726 registered + 5 explicitly excluded**. Four exclusions
are previously documented heavy legacy-world suites; Alex is the remaining
known legacy failure.

## Reproduction and limits

```powershell
npm run check:layout
npm run check:modules
npm run check:tests
node --test --test-isolation=none tests/melee-contact.test.js tests/combat-units.test.js tests/exploration-loading.test.js tests/region-loading.test.js
node --test --test-isolation=none tests/launcher-presentation.test.js tests/loading-choice.test.js tests/startup.test.js tests/private-reference.test.cjs tests/war-guidance.test.js
npm run build:web
node scripts/portfolio-startup-check.cjs --mode=explore --label=explore-after
node scripts/portfolio-startup-check.cjs --mode=story --label=story-after
node scripts/portfolio-startup-check.cjs --mode=failure --label=loading-failure
node scripts/portfolio-startup-check.cjs --mode=combat --label=combat-candidate
```

The Chrome script requires a locally installed Chrome (or `AZHORA_CHROME` path),
uses Node's built-in CDP transport, and does not install packages. Logs, screenshots
and JSON evidence live in ignored `tests/artifacts/rc-*` and `.tmp/rc-*` files.
`--baseline` reads the temporary public-source archive prepared for this review,
not the original working checkout. The entire test suite and Full world load
were not repeated in this bounded pass.

Reliable headed interactive testing was **unavailable**: the browser integration
host was unavailable and Windows capture failed twice. Headless Chrome keyboard
events and screenshots are useful evidence, but are not a claim of a human
playthrough, subjective frame-rate review, or audible music verification.
