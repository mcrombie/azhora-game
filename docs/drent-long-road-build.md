# Building the long road through Drent

For the builder. The design and its reasons are `docs/drent-long-road.md`; read sections 2, 3, 4
and 11 of it before anything here. `docs/design-answers.md` wins over both. Five questions at the
end of the design are still open — pieces that depend on an answer say so, and the rest do not.

## Before you start

- Rebase on `main` first. Another branch is moving Lakota out of the bird garden and Perrin in,
  and has touched `src/mercenaries.js`, `src/birding.js` and `src/skills.js`. This brief assumes
  that has landed: the id `bird-watcher` stands, the name on it is Perrin.
- Navigate by `docs/codebase-map.md`. Run only the test files you touch; the coordinator runs the
  suite once at merge. No Electron without asking.
- Every piece below is one commit, leaves the game playable, and says *why* in its message.

## What must not change

1. **Ids.** No npc id, subregion id, item id, skill id, journey field or `questSteps` stage number
   is renamed or renumbered. Names on screen may change; ids never (`eastreena` is the precedent).
2. **The clock's numbers.** `ARRIVALS`, every `departs` and `pace`, the three stops and their
   dwells, the muster point. The design's length is derived from them. (Question 1 may change one
   number, Ed's `departs`. Not before it is answered.)
3. **The short road.** Corvan's parcels, the bridge, the waymarkers, Iven, the Lauvel, the horse:
   same steps, same rewards, same order. `world.paths[0]` stays the main road and stays first.
4. **Level 0.** No new fight in Drent. Nothing attacks unless a quest that exists today says so.
5. **Once.** Every reward is given exactly once, and loading a save grants nothing.
6. **Old saves load** and nothing moves under them (piece 4 says how).
7. **Optional life never advances the main journey** — the long road reads other modules' views;
   it never writes to them.

## The pieces, in order

### 1. Pin the number
A test, no source change. `tests/long-road-clock.test.js`: with `MAIN_ROAD`, the three stops as
`main.js` builds them (`regionNpcPositions` for `meadow-courier`, `crossing-keeper`, `relay-clerk`;
dwells 90, 60, 120) and `STORY_SITES.legionCamp`, the last of the fixed ten reaches `mustered` at
5,233 s ± 2; Mus at his latest draw (3,810 s) musters before that; the landings fall at 360, 1,080,
1,980, 2,880 and 3,780 s. The failure message names `docs/drent-long-road.md`, so whoever retunes
the clock learns the long road's length moved with it.
*Touches:* `tests/` only.

### 2. `src/long-road.js`, pure
The usual shape: `createLongRoad`, `view`, `act`, `snapshot`, `restore`, a validator, a test.

- `LONG_ROAD_STOPS`: frozen table, one row per stop — `id`, `leg` (0–5), `kind` (`spine` or
  `branch`), `npcId` or `place`, `skillId` or `system`, `subregion`, and the *name of a view* that
  says it is done. Done is **derived**, the way `story-chapters.js` derives its chapters: from
  `skills` (learned), `acornQuest`, `journey` (`courierComplete`, `bridgeComplete`), `mapFog`
  (charted), `linguist`. The only stops with saved state are those with no view of their own:
  the play at Fernway and the five drills.
- Saved: `{ version, revision, told, drills, played, seenAt: { mercId: stopId }, chris: { releasedAt, releasedDistance } | null }`.
  The validator rejects `drills` outside 0–5, unknown ids in `seenAt`, and a release without both
  numbers.
- `view(state)` gives: the next spine stop (what wears the open gold), the legs with their stops
  done or open, whether a drill is on offer (its leg's spine stops done, Chris with you, drills <
  leg), and `finished`.
- `notice(placements, travelerPoint, subregionOf)`: the mercenaries newly noticed this frame —
  `walking` or `stopped`, in the traveler's named ground or within 40 m, not yet in `seenAt` — and
  records the stop the traveler was nearest.
*Touches:* `src/long-road.js`, `tests/long-road.test.js`, one line each way in
`src/road-checkpoint.js` beside the other validators. Mind the checkpoint's 64 KB.

### 3. The fork's words
- The letter's text gains the rule (two sentences; the item lives in `src/inventory.js`).
- Chris's lines at stage 7 → 8. Find where his lines live from `mercenaryLines` in
  `src/mercenaries.js`. He speaks plainly — `speechFor` already gives him no tongue.
- Corvan in `src/journey-content.js`: the register. His first meeting and his `done(2)` line gain
  the count, passed in through `context` from `company.summary(playSeconds)` the way `musterCount`
  already reaches the Moros conversation. Same choices, same ids, same rewards.
- Mara: one clause on the pier.
- `questSteps` in `src/game-state.js`: text of stages 8 and 10 only. **No new stage.**
- While here: Corvan's `!state.started` line still says "finish your business with Lakota".
*Tests:* `tests/journey-content.test.js`, `tests/journey.test.js`, `tests/story-spine.test.js`
unchanged and green; a new assertion that Corvan's lines carry the count he is given.

### 4. Chris as companion
The one piece that touches the clock's code. It touches none of its numbers.

- `src/mercenaries.js`: `mercenaryProgress` takes an optional `startDistance` on the mercenary
  (default 0) and skips stops behind it. `createMercenaryCompany` takes
  `companion: { id, releasedAt, releasedDistance } | { id, with: true } | undefined`. `with` gives
  that one the phase `with-traveler` and no road position (the host places him); released, he is
  the same pure function with `arrival = releasedAt`, `departs = 0` and the start distance.
  `summary` counts the new phase under its own key, and `arrived` still includes him.
  `travelerRank` counts him as behind the traveler.
- **Undefined means today's clock, exactly.** A save with no `longRoad` snapshot restores as
  undefined, so nothing moves under an old save.
- `src/main.js`: place a `with-traveler` Chris two and a half metres behind the traveler's left
  shoulder; he walks when more than four metres off, is set down beside you when more than forty,
  waits at the road when you take the ferry or pass the Tessen post, and stays out of the raid's
  fight box. `linguist.interpreterNearby` needs no change — it measures distance and checks for
  `mustered`.
- Release on: reaching the muster ground (distance = `musterDistance`, so he is `mustered` at
  once); the bridge vertex of `MAIN_ROAD` with `playSeconds >= ARRIVALS.princes`; a new choice in
  his conversation, "Go on to the muster without me". Taking him back: at the camp, until the
  border stage is `march`, "Walk Drent with me" clears the release.
- Slot rule: the companion is whoever `companyFor(playerId)` has at arrival 0 — Chris, or Crom
  when the player is Chris. Only Chris interprets.
*Tests:* `tests/mercenaries.test.js` — released at the bridge at 4,800 s he musters ten minutes
later, to the second the function gives; with no companion argument every placement at 0, 600,
1,800 and 5,300 s is identical to today's (snapshot the old output first); a `with` companion
never musters. `tests/linguist.test.js` — the aside works for a `with-traveler` placement.

### 5. Two golds
`src/quest-markers.js`: `main` gains an `open` variant — same colours and shape, the ring without
the stone. It ranks below solid `main` and above `plot`. **Not a fourth kind**: `MARKER_KINDS`
stays three. `markerFor` returns `{ kind: 'main', open: true }` for the npc or place of
`longRoad.view().next`. `src/characters.js` builds the mesh. The minimap and trail-map glow take a
second, ringed target. Chapter 1 in `src/story-chapters.js` gains a field, not steps:
`longWay: { title, legs }`, drawn under its five steps by the journal. `done` is untouched.
*Tests:* `tests/quest-markers.test.js`, `tests/story-chapters.test.js`, `tests/story-spine.test.js`,
`tests/minimap.test.js`, `tests/trail-map.test.js`.

### 6. The re-spacing — three commits, one person each
For each: move the stand; change every sentence that says where they are (the `teacher` string in
`src/skills.js`, the "you have not learned this" hint in their own module — `src/mycology.js`
line 139 is one — subregion notes, local-map labels, ambient lines in `src/town-life.js` and
`src/rena-people.js`); move any prop with them; fix any smoke script that walks to the old stand
(`src/forest-smoke.js` and its kin). Keep the two standing rules from `src/rena.js`: nothing
within reach of an army post, nothing inside a bird's home ground (`BIRD_HABITATS`).

| Id | To | Check |
|---|---|---|
| `mycologist` | Fernway Rest, beside the cairn, within 8 m of `MAIN_ROAD` | Mushrooms spawn in the wood within 60 m — Fern Hollow. If they do not, extend the spawn ground; do not move him back. Clear of the players' Fernway camp (−111, 29). |
| `botanist` | The Sunken Lane: `DRENT_DEEP_PLACES[0]`, on the hedge bank by the road | Two new hedge plants here, hazel and bramble (piece 8). `BOTANIST_STAND` keeps its name. |
| `geologist` | The Toll House stream: `DRENT_DEEP_PLACES[1]`, with a cart. The dug bank under the Weatherhead stays as scenery, renamed in words as his old pit. **Hold this commit for question 5.** | A findable stone within 60 m: scatter ironstone and clay down the stream if the furrows are too far. `GEOLOGIST_STAND` keeps its name. Cabe and the Weatherhead lose nothing. |

New test `tests/drent-spacing.test.js`, pure, reading stands from modules that import no three
(and source text where they do — the trick `tests/tills.test.js` uses): no two spine teachers
within 35 m of each other; every spine teacher within 45 m of `MAIN_ROAD` or inside a named
ground; every spine teacher reachable (`canStand` at the stand). Also green:
`tests/mycology.test.js`, `botany`, `geology`, `local-map-data`, `map-fog`, `no-avatar-twins`,
`bystanders` (its village list may keep the three ids; they are simply never near the raid).

### 7. Farming
`src/farming.js`, pure, in the shape of `src/woodcutting.js`. A working skill on the 99 table,
registered in `src/skills.js` as the fourteenth (teacher: "Enna, at the Mill Commons in the Avrel
clearing"). Three verbs: sow, wait, reap. Plots are named rows at the clearing's existing crop
fields — positions only, no new scenery in the first cut beyond a sown and a ripe look. A row
stores `sownAt` in play-seconds and is ripe at `sownAt + crop.seconds`: barley 240, Drent leaf 480.
Orchard trees at Applegarth (`APPLEGARTH_WORKS.orchard`) are picked, not sown, and bear again 600 s
later. Reaping pays experience and the crop; a save stores `sownAt` per row and `pickedAt` per
tree, and the validator rejects times in the future. Enna's lesson goes in `src/regional-life.js`
beside her existing errand, which does not change.
*Tests:* `tests/farming.test.js` (ripens on the clock; reaped once; a bad save refused);
`tests/skills.test.js` (fourteen); `tests/regional-life.test.js` green. The skills grid gains a
tile and needs an icon.

### 8. The six foods
Give every food in `src/consumables.js` a source, then **delete the entry from
`docs/known-issues.md`**.

- `avrel-apple`: farming's orchard pick.
- `hazelnuts`, `bramble-berries`: gatherables on Nell's hedge, and bramble also by the Caloss
  Gate; each is also a botany find the first time.
- `acorn-flatbread`, `honey-cake`: two recipes in `src/cooking.js`, taught by Lysa once the acorn
  errand is done — acorn meal; acorn meal and honeycomb — and cooked on any fire.
- `roasted-chestnuts`: `PEDDLER_STOCK` in `src/economy.js`. `tests/tills.test.js` must agree on
  the price.

New test `tests/larder-sources.test.js`: every food id appears in some source — an
`inventory.add`, a reward table, a recipe output, a shop stock. It reads source as text. This is
the check `known-issues.md` says nothing makes.

### 9. Noticing
Host side of `notice`: one aside in Chris's name per mercenary, through the `#speech-aside`
element outside dialogue, or a toast if that is simpler; one harbour bell per person landed
(`src/road-audio.js` has the bell) as the clock crosses each landing second. Reloading past a
landing rings nothing. When Chris is not with you the mercenary is still recorded, silently.
*Tests:* `tests/long-road.test.js` — noticed once; never while `coming` or `landing`; the stop
recorded is the nearest.

### 10. The drills
Five scenes of six lines, in the long-road module's content; each ends in
`linguist.study('ambroni', 35)`. Offered through Chris's conversation when `view().drill` is set;
never forced, never a quiz. The fourth is given at Corvan's desk. When the player is Chris the
same scenes run with the speakers swapped and pay the same.
*Tests:* from zero, five drills and twenty doubled lines from one Ambroni mouth reach at least 50;
drills cannot repeat; a drill without the companion is refused.

### 11. The muster's two faces
`src/moros-chapter.js` already receives `musterCount`. Add, as pure line tables: the first-in
variant (the count is 1 or 2: the empty pegs, Venmor's "early men"), the last-in variant (11:
"That's eleven", then one line from each of the ten built from `seenAt` — ten templates, one
phrase per stop), and one fresh line for each mercenary who musters after the traveler. First-in
adds a small gain to the army's trust in `src/campaign.js`, once. Mara's countersign — an item and
cartography experience, once, when all nine Drent grounds are charted — belongs to whichever
module holds Mara's conversation.
*Tests:* `tests/moros-chapter.test.js`; `tests/every-fight.test.js` untouched and green.

### 12. The eleven
A helper in the long-road module, `knowsAlready(skills, skillId)`, and one recognising branch per
spine teacher: the first-find step waived, the stop done on the conversation. Lakota at Perrin's
is the written example in the design, section 10.
*Tests:* for each spine stop, a traveler who starts with its skill finishes it in one
conversation; `tests/mercenary-characters.test.js` green.

### 13. Write it down
A row in `docs/codebase-map.md` section 8 for each new file; a paragraph in `docs/languages.md`
section 6 on the drills; farming in the map's Skills section; the user's answers to the five
questions into `docs/design-answers.md` when they come.

## Order, and what waits on an answer

1, 2, 3 and 5 depend on nothing. 4 needs 2. 9 and 10 need 4. 6 depends on nothing, but hold
Silas for question 5. 7 then 8. 11 needs 9. 12 last. Question 1 touches only a number in
`src/mercenaries.js` and the figures in piece 1's test; questions 2 and 3 change nothing here
until the company design exists; question 4 decides which conversation archaeology's first lesson
lives in — until then the Rena stop is done when the skill is learned, by whatever road.

## How you will know it worked

One Electron run, asked for, at the end: land, read the letter, walk the spine in order without
hurrying, and look at the play clock on the Caloss bridge. The design says 80 to 85 minutes. If
it says 60, the lessons are too thin and the company will not be in; if it says 110, cut from the
branches, never from the clock.
