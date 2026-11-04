# Integrated portfolio candidate — November 4, 2026

This is an uncommitted integration based on the approved portfolio commit
`be792bb4ffa00cfd068fb838476fd98440062e98`, in worktree
`typescript/azhora-integrated-20261104`, branch
`release/portfolio-integrated-2026-11-04`. The approved release branch and the
original development checkout remain unchanged. No commit, push, main merge,
Render deployment, or Cromblog modification is part of this pass.

## Inventory and preservation

The inventory examined the original checkout's tracked and untracked project
files, local branch ancestry, all registered worktrees, and stashes. Before this
new worktree there were **100 local branches, 20 registered worktrees, and no
stashes**. Of those branches, 79 tips are already ancestors of the portfolio
commit; 21 have commits outside its ancestry. An ancestry difference alone does
not establish missing functionality: several deliveries were ported, corrected,
and reorganized under different commits.

The original checkout has exactly **14 modified tracked files and one untracked
project file**, all belonging to the November Night Elf change. There are no
additional current modifications in that checkout. A binary patch, byte-for-byte
copies of all 15 files, original status, and SHA-256 manifest were saved before
integration in ignored `.tmp/integration-inventory/`. This snapshot contains only
the explicitly inventoried public project files, not private references. The
original checkout was not stashed, reset, staged, committed, or otherwise edited.
An independent recovery copy also lives outside both worktrees at
`Programs/azhora-release-backups/portfolio-integration-20261104/`.

### Current work integrated

| Files | Contribution |
| --- | --- |
| `src/content/characters/elven-cultures.js` (new) | Shared living Night Elf / Day Elf definitions; explicitly distinguishes Night Elves from undead Dark Elves. |
| `src/content/characters/characters.js` | Optional iris color, preserving the existing default. |
| `src/content/regions/ibenwood/ibenwood-defense-view.js` | Culture-aware ranger construction; existing wood elves retain their appearance. |
| `src/content/regions/sevron/sevron-host.js` | All four actual residents use Night Elf models, names, and dialogue. |
| `src/content/regions/sevron/sevron-interiors.js` | Physical garden arcade and sheltered tender; plant light well remains open. |
| `src/content/chapters/civil-war/campaign-world.js`, `assets/campaign-factions.json`, `src/ui/map/world-map-detail.js` | Regional lore, faction descriptions, and discovery-gated Night Elf city label. |
| `src/dev/checks/sevron-smoke.js` | Running-game resident culture assertion. |
| `tests/elf-ranger-model.test.js`, `tests/west-oremindi.test.js`, `tests/world-map-detail.test.js` | Actual rendered color, shelter raycast, dialogue, and atlas coverage. |
| `README.md`, `docs/oremindi-frontier.md`, `docs/sevron-west-oremindi-design.md` | Corresponding public documentation. |

### Other worktrees

| Worktree / branch | Outstanding state and disposition |
| --- | --- |
| `azhora-game-alex` / `circus-bears` | Ten tracked edits plus `src/bear-circus.js` and its test. Historical September circus-family work already integrated into the feature-owned paths. `docs/design-answers.md` records its October 2 integration; current code also contains later save/corpse fixes. Do not restore the old flat layout or old test command. |
| `azhora-game-feradom` / `feradom` | 27 tracked edits plus seven untracked files: `scripts/region-map.mjs`, five `src/feradom-*.js` modules, and `tests/feradom-world.test.js`. Existing region modules, garrison, forts, terrain, wildlife, closed-border handling, and tests are already in the candidate with subsequent corrections. The old map helper is development tooling, not an omitted runtime feature. The old language registration is superseded by the later English-dialogue decision. |
| `azhora-game-smedley` / `smedley` | Four tracked edits. All substantive added lines are already present after resolving moved imports: model, review views, resident registration, and test. No additional integration needed. |
| `.claude/worktrees/agent-a1d1303d0740c3b28` / `integration` | One old character-name documentation edit. Cromb and Kristen corrections are already present; the old proposed `Zorkies` spelling differs from the current `Zorkys`. That historical naming discrepancy is deferred, not silently treated as integrated. No runtime behavior is missing. |
| `.claude/worktrees/agent-a92ad5ca68dfc2263` / `six-regions` | One partial old `west-regions.js` edit. The lower Lizeem and Eer drainage already exist in the current module, including subsequent channel revisions. The partial copy references `EER_BECKS` before initialization; it is not a usable replacement. |
| `codex/vastos-civil-war`, `codex/noth-orsa-map-20261012`, `codex/region-review-2026-10-04`, `codex/settlement-chart-20261019` | Clean worktrees; branch tips already included. |
| `release/portfolio-2026-11-04` | Clean approved release, left unchanged. |
| Nine old temporary worktrees | `fae-realms`, `lizeem-farmlands`, `flyover-video`, `lizeem-west-video`, `minora-polish`, `minora-polish-render`, `mistwood`, `mistwood-render`, `ride-west-video`. Every tracked path is reported deleted in these leftover directories, with no replacement/untracked project files. These are missing old checkout contents, not deletion patches to apply. Git history remains available; nothing was pruned or deleted. |

The complete machine inventory and the nonempty surviving worktree patches are
retained locally under `.tmp/integration-inventory/`. Ignored dependencies,
build output, local profiles, saves, logs, and captures are not development
deliveries. Private reference contents were not read, indexed, or backed up.

### Branches not reachable by ancestry

These are the 21 pre-existing local branches with commits outside the approved
release ancestry. Counts include shared ancestors, not distinct missing changes.

| Branch(es) | Commits outside approved ancestry | Disposition |
| --- | ---: | --- |
| `alezhor` | 8 | Corrected regional port already integrated. |
| `celder` | 2 | Corrected port; see `docs/region-reviews/celder-main-mirror-audit.md`. |
| `east-izol` | 5 | Corrected regional port already integrated. |
| `ibenal` | 12 | Original deliveries mapped to integrated commits in `docs/region-reviews/integration-2026-10-05.md`. |
| `henborth` | 15 | Same documented regional integration. |
| `mithala-city` | 21 | Same documented integration, followed by newer city changes. |
| `east-lotharn`, `feradom` | 1 each | Old terrain delivery; current source and later corrections retained. |
| `ascarth`, `gala` | 2 each | Old regional deliveries; current region implementation retained. |
| `ambron-lake-city` | 2 | Early September lake-city prototype, superseded by the current interlake city. |
| `minora-polish` | 8 | Polish is already present; later river-wall and registered-tree changes must survive. |
| `minora-polish-render` | 28 | Old rendering/integration snapshot, not a new gameplay delivery. |
| `flyover-video`, `ride-west-video` | 15 each | Older recording snapshots/tooling; not current runtime work. Current Lizeem recorder remains. |
| `lizeem-west-video` | 18 | Older campaign filming snapshot; do not revert the subsequent campaign. |
| `varn` | 3 | Explicit incomplete WIP, superseded by `varn-finish`, which is already included. |
| `perf-fast-load-experiment` | 13 | Explicit preserved WIP performance experiment. Not merged into the verified progressive loader. |
| `mistwood`, `mistwood-render` | 22 / 45 | Historical optional Veliben expansion, absent from current Azhora runtime; not treated as recent original-checkout work. Requires a separate content/scope review, not blind reintegration. |
| `fae-realms` | 7 | Separate manuscript-derived expansion. Excluded under the repository's private-material separation rules; no source or manuscript passages imported. |

No current original-checkout change was omitted. The explicitly incomplete,
historical optional, and separate-setting branches above remain preserved for a
future decision; this integration does not claim that all old experiments have
been shipped.

## Conflict resolution and functional scope

The original patch applied cleanly. README was the only file changed by both
the portfolio release and this development patch: the new employer introduction
remains, and the Night Elf text is retained in the existing Sevron section.
No other portfolio implementation file was replaced by an old version.

Sevron is connected to the retained original adventure's `createSevronHost` in
`src/main.js`, not to the public Explore host. Its real residents, interaction
dialogue, gallery geometry, saved discovery/treasure state and map label use the
new code. This is not an unused culture file. Public Story's early Lizeem campaign
and public Explore do not acquire a new Sevron quest or portal in this pass.

The four residents remain underground. Night-only surface travel is their stated
way of life, **not an implemented patrol/scheduling system**. No sunlight-damage
rule, new allegiance, campaign balance, save schema, or extra feature was added.
Public Story/Explore, progressive loading, developer Full and diagnostic routes,
and the AI-assistance disclosure are preserved.

## Verification

The prior artifact fingerprint in `portfolio-release-review.md` identifies only
the approved baseline. The combined public artifact is:

```text
SHA-256: 742b6d35204df08c93775dd87c943d38367ded02b1207cc9177d9596eefb7061
Files:   1,464 (plus build-info.json)
Bytes:   67,834,828 (excluding build-info.json)
Delta:   +1 file, +2,925 bytes relative to the approved artifact
```

The fingerprint was independently recomputed from the actual published files.
Every output file matches its source. The lookout rebuild changed only
`sourceHash` and `sceneHash` in its metadata; its compressed landscape binary is
byte-identical to the approved candidate. This existing build dependency
invalidates when shared character code changes and triggers offline construction
of the 76-region reference scene. That build-time work is not visitor startup.
No dependencies, package lock, deployment configuration, or public launcher
implementation changed during integration.

| Check | Result |
| --- | --- |
| `npm ci --offline --ignore-scripts` | Locked dependencies installed; no dependency update. |
| `npm run check:layout` | 2,198 modules, 9,119 local references. |
| `npm run check:modules` | 1,384 modules link. |
| `npm run check:tests` | 731 discovered = 726 registered + 5 explicitly excluded, unchanged. |
| Night Elf, atlas, public launcher, loading, privacy, guidance tests | 64 / 64 pass. |
| Campaign simulation, tactical combat, Chapter 3 encounters, battle timing, regional loading, circus and Smedley tests | 147 / 147 pass. |
| Save/Continue model checks plus the explicit legacy Alex probe | 27 pass; the same known Alex/Cagney assertion fails. |
| Clean Chrome public Story / Explore / load-failure recovery | 7 / 7 / 4 assertions pass respectively, with no unexpected errors. |
| Approved Story save continued in integrated build | 8 browser assertions pass. |
| Running original-adventure Sevron route | 27 / 27 traversal, resident, treasure and save assertions pass; no frame exceptions. Harness exits 1 because of the existing original-adventure `/favicon.ico` 404. |
| Developer combat exercise browser probe | Reproduces the known squad autoplay defeat: 0 HP, two enemies remaining. Failure assertion retained. |
| Build/source equivalence and positive distribution allowlist | Pass; no private references, Git data, tests, local saves, logs, profiles or symlinks in output. `src/app/saves/` is legitimate save-handling code, not a saved game. |
| Credential-pattern scan | 2,540 candidate text files, no high-confidence matches. Not a comprehensive security audit. |
| Diff whitespace and original development snapshot hashes | Pass; all 15 original files unchanged. |

These are **238 passing model assertions and one deliberately rechecked known
legacy failure**, not a claim that the complete default suite passes. The entire
suite and developer Full loading were not rerun.

### Clean browser and timing comparison

Installed Chrome 156 ran headlessly against the real static output over loopback
HTTP, with a new isolated profile for each run. Existing test helpers navigate
dialogue and use the supported tutorial skip; real CDP keyboard input verifies
movement. This is not an unassisted human playthrough, audible sound review,
headed-browser assessment, or slow-network benchmark.

| Measurement | Combined candidate | Approved artifact rerun |
| --- | ---: | ---: |
| Launcher handlers ready | 5.7s | 5.8–6.4s |
| Story opening after selection | 0.75s | 0.77s |
| Portal to playable tower | 2.76s | 2.90s |
| First tower departure to active campaign | 7.74s | 7.68s |
| Explore ready after selection | 39.92s | 56.66s |
| Explore Continue | 37.80s | 74.62s |
| Story Continue | 8.72s | Approved-save upgrade into new build: 12.53s |

The earlier approved release review measured Explore at 38.63s. The variability
in these individual runs is substantial. There is **no demonstrated startup
regression**, but no speed improvement is claimed: this integration makes no
loader optimization. Explore still prepares only 30 of 318 jobs before control
and continues progressively. Its elapsed loading display and activity indicator
were checked and captured; the long-load warning remains accurate. Multi-second
main-thread stalls remain a known limitation.

Story and Explore each passed movement, save, menu return and compatible Continue
with restored position. Story reached the active Caricas campaign. A separate
test created a save using the approved artifact, switched the same local origin
to the new artifact, reloaded, and successfully continued that save. These public
checks recorded no unexpected JavaScript, console, frame or network errors; all
game requests remained local.

### Known failures and limits

The documented Alex/Cagney doorway/proximity defect reproduces unchanged. The
corrected melee tests remain passing; no assertion was weakened. The prior
developer squad autoplay defeat also reproduces unchanged. The Electron capture
limitation, four excluded heavy legacy-world suites, and headed-browser validation gap are tracked separately in
`portfolio-release-review.md`. They are not relabeled as integration regressions
or erased to make this release appear fully green.

The original-adventure browser probe additionally requests a missing favicon.
`adventure.html` is byte-identical to the approved release and lacks its own icon
link; the public launcher already supplies one. All 27 Sevron assertions pass,
but the harness correctly reports the 404 and exits nonzero. This minor existing
legacy-route presentation defect was documented instead of suppressing the
failure or expanding the integration to unrelated HTML changes. Chrome screenshot
capture works, though transient legacy HUD notifications obscure the court still;
it is not presented as a polished character portrait or aesthetic signoff.

The Night Elf first pass has no outdoor patrol schedule, and Sevron remains on
the retained original-adventure route. No public-release claim should imply that
public Explore now exposes all original-adventure interactions. Historical
optional expansions and the minor old naming discrepancy listed above remain
outside this candidate pending separate review.

**Assessment:** no new critical blocker was detected on the tested public Story
and Explore paths. Story remains the recommended first demonstration; Explore
remains a slower secondary mode with explicit feedback. The combined version is
ready for review as a portfolio prototype, subject to the existing limitations
above and the explicit decision not to revive historical optional branches.
It has not been committed, pushed, merged, or deployed.

### Reproduction

```powershell
npm run check:layout
npm run check:modules
npm run check:tests
node --test --test-isolation=none tests/elf-ranger-model.test.js tests/west-oremindi.test.js tests/world-map-detail.test.js
node --test --test-isolation=none tests/launcher-presentation.test.js tests/exploration-loading.test.js tests/loading-choice.test.js tests/startup.test.js tests/private-reference.test.cjs tests/war-guidance.test.js
node --test --test-isolation=none tests/lizeem-simulation.test.js tests/adventure-war.test.js tests/world-skirmish.test.js tests/lizeem-combat.test.js tests/combat-units.test.js tests/melee-contact.test.js tests/assault-archery.test.js tests/oremindi-encounter.test.js tests/oremindi-encounter-view.test.js tests/battle-deadline.test.js tests/region-loading.test.js tests/bear-circus.test.js tests/smedley.test.js
node --test --test-isolation=none tests/save-round-trip.test.js tests/exploration.test.js tests/chapter-continuation.test.js tests/oremindi-checkpoint.test.js tests/alex.test.js
npm run build:web
node scripts/portfolio-startup-check.cjs --mode=story --label=integrated-story
node scripts/portfolio-startup-check.cjs --mode=explore --label=integrated-explore
node scripts/portfolio-startup-check.cjs --mode=failure --label=integrated-recovery
node scripts/portfolio-startup-check.cjs --mode=combat --label=integrated-combat
```

Raw logs, screenshots and JSON results remain in ignored `.tmp/` and
`tests/artifacts/rc-integrated-*`. The approved artifact was copied to
`.tmp/rc-baseline/` for comparison; its fingerprint was checked first. The local
`.tmp/integration-browser-check.cjs` adds a cross-artifact Continue probe and runs
the existing `__AZHORA__.sevronChecks()` against the original adventure, without
altering shipped code. These local test artifacts are not part of the release.

## Release procedure

Review this uncommitted integration diff and the verification evidence first.
After approval, stage only the enumerated source/docs/tests and required lookout
metadata, commit on this integration branch, and push that branch for review.
If main has moved, reconcile it and repeat affected checks before merging.
After a separately approved main merge, manually deploy the exact reviewed commit
on Render; compare `/build-info.json` with the reviewed artifact fingerprint and
check public Story, Explore, and Continue. A GitHub push alone is not deployment.

## Exact changed-file lists

Integration delta from the approved portfolio commit (17 files):

```text
README.md
assets/campaign-factions.json
assets/lookout/landscape.json
docs/oremindi-frontier.md
docs/portfolio-integration-review.md
docs/sevron-west-oremindi-design.md
src/content/chapters/civil-war/campaign-world.js
src/content/characters/characters.js
src/content/characters/elven-cultures.js
src/content/regions/ibenwood/ibenwood-defense-view.js
src/content/regions/sevron/sevron-host.js
src/content/regions/sevron/sevron-interiors.js
src/dev/checks/sevron-smoke.js
src/ui/map/world-map-detail.js
tests/elf-ranger-model.test.js
tests/west-oremindi.test.js
tests/world-map-detail.test.js
```

Combined candidate relative to the unchanged main commit `098b068` (46 files):

```text
README.md
assets/campaign-factions.json
assets/lookout/landscape.json
docs/architecture/README.md
docs/oremindi-frontier.md
docs/portfolio-demo.md
docs/portfolio-integration-review.md
docs/portfolio-preparation.md
docs/portfolio-release-review.md
docs/sevron-west-oremindi-design.md
index.html
package-lock.json
package.json
scripts/build-web.mjs
scripts/check-test-inventory.cjs
scripts/exploration-desktop.cjs
scripts/portfolio-startup-check.cjs
scripts/portfolio-web-checks.cjs
scripts/public-files.cjs
scripts/web-smoke.cjs
src/app/exploration/entry.js
src/app/exploration/exploration-loading.js
src/app/exploration/exploration.css
src/app/exploration/launcher-presentation.js
src/app/exploration/loading-feedback.js
src/content/chapters/civil-war/campaign-world.js
src/content/characters/characters.js
src/content/characters/elven-cultures.js
src/content/regions/ibenwood/ibenwood-defense-view.js
src/content/regions/sevron/sevron-host.js
src/content/regions/sevron/sevron-interiors.js
src/dev/checks/explore-loading-smoke.js
src/dev/checks/scenario-playthrough-review.js
src/dev/checks/sevron-smoke.js
src/ui/map/world-map-detail.js
src/world/loading/region-loading.js
tests/elf-ranger-model.test.js
tests/exploration-loading.test.js
tests/launcher-presentation.test.js
tests/melee-contact.test.js
tests/private-reference.test.cjs
tests/test-exclusions.json
tests/test-manifest.json
tests/war-guidance.test.js
tests/west-oremindi.test.js
tests/world-map-detail.test.js
```
