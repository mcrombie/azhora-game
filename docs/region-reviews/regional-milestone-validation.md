# Combined regional milestone: bounded validation, 4 October 2026

The initial small subset checked the composed 64-region MAIN working copy after
Celder, East Izol and the then-pending Alezhor candidate, without constructing a
world or launching Electron. The
coordinator separately owns native Full/Fast and visual acceptance. The small
subset ran one file at a time through the existing explicit runner.

| Suite | Result | Integration reason |
| --- | ---: | --- |
| `region-survey.test.js` | 4/4 | Regenerated 64-region atlas ownership, surrounding land, bounds and route anchors |
| `streamed-world-data.test.js` | 4/4 | Newly loaded trees/supports, deferred saved stumps and no duplicated regrowth |
| `woodcutting-forest.test.js` | 5/6 | Full current species/log catalog and sparse typed-tree save state |
| `road-checkpoint.test.js` | 39/39 | Legacy checkpoint validation, expanded world bounds and unresolved tree records |
| `game-state.test.js` | 8/8 | Movement rules and ordered three-stage tutorial state |
| `long-road.test.js` | 29/31 | Main-road stops, quest routing and state after the expanded region registry |

**89/92 checks pass; three failures are reproduced identically on clean
`a2e49c3e23c8544720e328263966cf6d418bcbcb`.** The two failing files were rerun
there without changing that checkout. This is not a new all-green milestone.
Logs in MAIN: `tests/artifacts/regional-milestone-small-tests.log` and
`regional-milestone-baseline-failures.log`.

- `woodcutting-forest.test.js:20` expects Grey Vault to yield a log. Six Ibenwood
  species deliberately carry identity without recipes or harvest products; the
  existing test supplies `harvestable:true` for the entire species catalog.
  Source comments, the Ibenwood worker report and actual tree registrations all
  enforce living-tree protection. This is an existing test-contract mismatch,
  already listed in `docs/known-failing.md`, not authorization to add elven logs.
  A narrow follow-up may assert both ordinary-species yields and explicit
  protected-species refusal, retaining exhaustive catalog coverage.
- `long-road.test.js:563` and `:672` disagree on the unchanged Fernway stage:
  static stop `(-546,78.5)` versus the live troupe's `(-539.5,75.8)`. The two
  failures, source tables and tests are the same at the baseline. No regional
  change moves the troupe, story objective, rewards or quest state; a broader
  quest correction is outside this packet.

The previously completed atlas/layout, terrain-lattice/color preservation,
regional ground/loading and native driver results were retained rather than
repeated. Generic loader and chooser sources are unchanged. Full-world suites
such as `regions-world`, `woodcutting`, `tree-registry` and `road-surface` were
explicitly excluded after reading their constructors; this run does not claim
new whole-road physical traversal or an entire manifest pass.

The MAIN manifest audit finds **464 unique entries, all files present, zero new
omissions and exactly 21 preexisting unlisted tests**, compared with the clean
`a2e49c3` land checkout. All 22 separately protected unrelated leaf hashes are
unchanged. The initial test execution and manifest audit changed no source,
test, manifest or production acceptance flag; the approved test correction
that followed is recorded below.


## Protected-species test correction

The coordinator approved the test-only Ibenwood correction described above. The
ordinary loop excludes only the six explicitly named protected species; an
unintended missing recipe in any other catalog entry still fails. A new companion
check requires all six protected identities to have no recipe or product and
reject actual `wood.swing`, preserving both saved stock/rewards and skill XP.
The focused suite now passes **7/7**. MAIN and REVIEW receive the identical test;
`docs/known-failing.md` records the resolved contract mismatch. There are no new
production recipes or exemptions. The original **89/92** run and its baseline
failures remain recorded above; only the affected suite is rerun. Both preexisting
Fernway failures remain open, outside the regional source changes.


## Final file/manifest audit after the bounded R1 packet

Both manifests now include the four new R1 tests and the frozen Alezhor bank
test exactly once: MAIN has **469** entries and REVIEW **465**. Every listed file exists, with no duplicate entries.
The four MAIN-only entries belong to its protected dragon work. Both copies have
no new omissions and exactly 21 preexisting unlisted tests. The final bank packet
and its test are now mirrored and registered, with no REVIEW-only source/test
file left outside MAIN.

Seven new test writers now create their ignored `tests/artifacts/` directory
on a clean checkout, identically in MAIN and REVIEW, including the final
Alezhor bank test. All 14 copies pass syntax checks. Assertions, golden values and
fixture input paths are unchanged; no constructed world was rerun for this
portability-only correction. The R1 packet records its updated test hash.

The preserved 22-item snapshot contains one document as well as unrelated leaves.
All 21 other entries remain byte-exact, including the protected code and tests.
The sole change is the authorized current-execution pointer in
`docs/remaining-regions-design-plan.md`; its older design content remains intact.
The three integration files excluded from that frozen-leaf check retain MAIN's
dragon hooks. The current REVIEW/MAIN deltas otherwise consist of those protected
MAIN changes and preexisting formatting/comment differences. The Alezhor
bank source is now mirrored; its report wording is being reconciled separately. The CRLF-aware `git diff --check` passes. No commit was made.

Native 6254 has now exited 0 with 40 R1 checks plus 9 Continue checks and no
renderer errors. Both Mithala blade-seating frames were visually accepted for
that scoped correction. The final Alezhor bank repair is accepted: scoped 3/3 and native 49267 Fast
101 plus 25 Continue, explicit exit 0/errors []. The coordinator visually
approved the repaired otter bank and continuous upstream stream. Alezhor joins
the two Celders and East Izol as the fourth newly accepted environment. Its
plain teal water/angular cliff style remains documented. The clear elevated R1 overlook from native73887 now passes bounded pilot
visual review (exit0/errors[]); the earlier north/side frames were insufficient.
Wider R1 cliff repetition and the Upper Olveth connection remain open. Navarth's 25/25 runtime response and clear
response image stand; its modal-covered approach image is not visual acceptance.
The source worktree recheck found clean unchanged Celder, East Izol and Alezhor
deliveries, plus an active, unfrozen South/North Ibenal draft on raw `116799e`.
The ledger and prepared interface brief now record that actual pair state, not
a new South-only assignment or a completed delivery.
