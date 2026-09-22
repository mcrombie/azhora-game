# The opening sequence: sailing into Tidehaven

The user asked for this in these words: *"An opening sequence. It should be like gameplay, but you
can't control it. It's more like you're watching a cutscene that you still see through your own
perspective, and it's you sailing in with Chris Gotwood from the sea. It should be simple, and you
just click 'Skip Cutscene.' In that time, the text will announce the basics of the context and
story. It is like your mercenary arriving from sea."*

This is the design. The data that carries it is `src/opening-sequence.js` (pure: the beats, the
boat's path, the captions, `stateAt(seconds)`, `SKIP`), tested by `tests/opening-sequence.test.js`.
What the host has to do with that data is `docs/opening-sequence-build.md`. Nothing in this note is
implemented in `src/main.js` yet.

**Running time: 44 seconds** from the first frame to the first controllable one. Skip is one
click, Esc or Enter, from the first frame.

---

## The world it plays in

Everything below was measured through `createWorld` headlessly (`tests/module-loader.js`), not
read off a map. World metres; **north is −z, the open sea is east, +x.** The village is a quarter
turn from its own local frame: `villageToWorld(lx, lz) = (lz − 20, 29 − lx)`.

| Thing | Where | Source |
| --- | --- | --- |
| The traveler's landing, `world.spawn` | (23, 29), deck at 1.80 m | `villageToWorld(0, 43)` |
| The pier deck | x 2…28, z 26.8…31.2, 1.80 m; the ramp down to the shore at x = −1 | `heightAt`'s deck rule, local \|x\| < 2.2, z 22…48 |
| The pier's root, `world.pierHead`, where Jojo stands | (0, 25), ground 1.53 m, facing west (yaw −π/2) | `villageToWorld(4, 20)`; the builder's `pierHead.yaw` |
| The arrival boat's berth | (23, 34), bow east, yaw π/2 − 0.12; the gangplank at (23, 32.25) up to the deck | world.js `boat(-5.0, 43, 1, -.12, true)`, a child of the village root |
| Water at the berth | harbour floor −5.82 m; sea level 0.06 | `heightAt`, `SEA_LEVEL` |
| Jess's ferry boat and Jess | boat at (25, 24.8) on the pier's north face; he stands at (27, 30.6), the pier's end | `FERRY_MOORINGS.drent`, `FERRY_LANDINGS.drent.stand` |
| Tobin the fisher | (2, 44), on the shore south of the pier's root | `npcPositions.fisher` |
| The Greenway warning bell | (−45, 25), the village's inland edge, 70 m west of the landing | world.js `bellX, bellZ` |
| The cottages | between x −41 and −7, z 0 and 54; chimneys smoke | world.js `cottage(...)` |
| Gulls | circling over the pier's end, centred (31, 29) | world.js `birds`, `worldSpawn.x + 8` |
| The rise north of the harbour | 9.15 m at (0, −70); the coast juts east from there, to x ≈ 104 at z −80 and x ≈ 152 at z −120…−170 — the north cape | `heightAt` samples |
| The shore near the harbour | land ends at x ≈ 12 north of the pier (z 0…20) and x ≈ 4…6 south of it (z 40…60) | `heightAt` samples |
| A sailing boat at anchor in the roads | (77, 85), to port on the way in | world.js `boat(-56, 97, .6, 1.1, true)` |
| A sailing boat under the cape | (98, −37), to starboard | world.js `boat(66, 118, .74, -.65, true)` |
| The Sultana's channel and berth | in from (240, 70) to her berth at (44, 40) | `SALT_PORTS[0]` |
| The Sultana herself | at sea for the first 900 s of every new game, so her berth is empty while the boat passes it | `createSaltSultan()` |
| The camera | 54° vertical field, far plane 650 m; third-person orbit at yaw π/2, pitch 0.39, 9 m | main.js |

The boat the traveler arrives in is **the world's own arrival boat**: the 6.4 m single-sailed open
boat that has always been moored at the gangplank. The sequence borrows it, sails it in along the
Sultana's channel and leaves it exactly where the world has always drawn it. No new hull, no new
mooring: after the sequence, and in every game that never plays it, the harbour is the harbour as
built. (The Sultana's hull was considered and set aside: 12 m and 1.3 m of draft is a coaster,
and a coaster does not come alongside a three-metre fishing pier; she berths off its end.)

## The shot list

Seen from the traveler's own eyes. They sit on the middle thwart, just forward of the mast and
on the **port** side, so the sail hangs behind the right shoulder and the companion is not in the
middle of the view. The eye is 1.41 m above the boat's origin seated (1.79 m above the sea, plus
the boat's bob), 1.54 m standing. The companion stands in the bow on the starboard side, 2.3 m
forward and 0.3 m right of the traveler's line, feet on the bottom boards, facing forward. The
traveler's own model is hidden for the whole ride. Nobody at the tiller is shown or named; the
eye never looks astern.

The boat's path, in world metres and seconds (`BOAT_PATH`). Straight between keyframes; the last
leg eases out to a stop.

| t | Position | Heading | What it is |
| --- | --- | --- | --- |
| 0 | (190, 62) | west, a little north (yaw −1.71) | in the roads, 170 m out, on the Sultana's channel |
| 25 | (60, 44) | west (yaw −1.62) | the pier's end coming abeam, 32 m off; 5.25 m/s |
| 35 | (17, 42) | west (yaw −π/2) | past the end, 11 m off the pier's south face; 4.3 m/s; the helm goes over |
| 36 | (14.2, 40.8) | north-west | the round-up to starboard: a 4 m circle centred (17, 38) |
| 37 | (13, 38) | north | head to the shore, the pier dead ahead 9 m; 3.1 m/s |
| 38 | (14.2, 35.2) | north-east | |
| 39 | (17, 34) | east (yaw −3π/2) | round, running east along the face, losing way |
| 44 | (23, 34) | east, the berth's own yaw | alongside, stopped, where the boat has always lain |

The turn's westmost point (13, 38) is five or six metres off the little beach south of the pier
root (the shore there is at x ≈ 6–8), and the run-in passes about three metres from the
Sultana's empty berth. Every position sampled at a quarter-second is afloat (the test checks the
ground under the boat is at least 0.8 m below the sea) and nothing exceeds the Sultana's own
6 m/s.

| # | Beat | Seconds | The eye rests on | What is seen |
| --- | --- | --- | --- | --- |
| 1 | `open-water` | 0–7 | ahead, along the bow, a little down | The bow lifting. The coast a line ahead: the low shore, the rise north of the harbour to the right of the bow, the cape's shoulder beyond it. The companion in the bow, back to you. A sail at anchor off to port. |
| 2 | `the-headland` | 7–14.5 | the rise north of the harbour, (30, 7, −70) | The head turns right: the headland, green over grey, the small boat under the cape. |
| 3 | `drent` | 14.5–22 | the cottage roofs, (−20, 5, 29) | Back toward the bow: the village coming up out of the haze, chimney smoke, the pier a dark line on the water. |
| 4 | `ambron` | 22–29.5 | ahead | The pier growing. Gulls over its end. A man at the end of it (Jess) watching you come. |
| 5 | `the-bell` | 29.5–35 | the bell, (−45, 3, 25) | **The bell rings at 30 s.** The eye goes to the village's inland edge. The pier's end passes close to starboard. |
| 6 | `rounding-up` | 35–39 | the pier's middle, (15, 2.5, 29) | The helm goes over; the whole pier swings across the view from right to left as the boat turns through the north; the beach and the fisher's cottages close on the left; **the companion turns to face you at 36 s.** |
| 7 | `alongside` | 39–44 | the companion, then the settle | The face of the pier sliding past to port. The companion facing you, the pier behind him. **At 40 s you stand** (the eye rises 0.13 m over two seconds); **at 42 s you step up**: the eye cranes back and up over two seconds to the game's own camera behind you on the pier, and the companion steps onto the deck beside you. **At 44 s the frame is yours.** |

The eye turns from one beat's point to the next over the first 1.5 s of the beat (`LOOK_TURN`),
smoothstepped, so there is never a cut. The camera position is continuous through the standing
and the step up, and `stateAt(44)` is exactly the third-person camera; the test holds all of it.

The boat's bob and roll are the world's own (`world.update` gives the arrival boat
`y = .38 + sin(.72 t) · .085`); the eye adds the same bob (`boatBob(elapsed)`).

## What happens in the world during it

- **The boat** is moved along `BOAT_PATH` by the host through a new `world.placeArrivalBoat(x, z, yaw)`
  (the boat is a child of the village root; the brief gives the conversion). At the end, and in
  every game that skips or never plays the sequence, it is at its berth.
- **The companion** (`merc-gotwood`, or whoever `companionFor(player)` names) is moved to the bow
  each frame, facing forward, then aft from 36 s; from 42 to 44 s he goes from the bow to the
  landing ring's first place, (23, 31.2) facing north — which is exactly where `placements()` in
  `src/mercenaries.js` stands the first man of the roster while he waits at the landing, so the
  host's `settleMercenaries()` agrees with the end of the sequence to the metre.
- **The traveler** is hidden, and `player.group.position` follows the eye, so the sea is what the
  road audio hears, the sun and shadows follow the boat, and every villager is far enough away to
  stand at home. At 44 s the traveler stands on the landing.
- **The bell** rings at 30 s: `world.ringBell(elapsed)` and `audio.effect('bell')`, once. The swing
  decays over six seconds. Jojo's first line — *"That bell was going before you were tied up"* —
  is true.
- **The company's clock** (`playSeconds`) does not run during the sequence. The roster counts
  arrivals in seconds *after the traveler lands*; Mus's drawn hour may be as early as half a
  minute before that, and it should not be spent watching the boat come in.
- **Nothing is saved.** The sequence changes no quest, satchel, campaign or save state; quest stage
  is 0 throughout and stays 0 at the landing, as now.
- **The Sultana** is at sea; Jess waits at the pier's end; the gulls circle; the smoke rises.
  None of it is staged: it is the harbour as it already is.

## The captions

Six captions, each inside its beat, fading in and out over 0.6 s. They announce the four things
the traveler knows and nothing more: a mercenary hired from abroad by the Ambroni Empire against a
rebellion; Drent, the quietest province left, and Tidehaven; the capital Ambron, a city in a lake,
to the west; a war not yet understood. The bell, the goblins, the letter and Jojo are Jojo's to
tell. `{companion}` is the slot for whoever came off the boat with the traveler.

| Shown | Eyebrow | Text |
| --- | --- | --- |
| 1.5–6.5 s | THE STILLS | The last morning of the crossing. {companion} is in the bow, watching the coast come up. |
| 8.5–14 s | A HIRED SWORD | You are a mercenary, hired from abroad by the Ambroni Empire to help put down a rebellion. |
| 16–21.5 s | DRENT | Drent, the quietest province the Empire has left. The village ahead is Tidehaven. |
| 23.5–29 s | AMBRON | The Empire is ruled from Ambron, a city built in a lake, to the west. |
| 31–34.5 s | TIDEHAVEN | The warning bell carries across the water. |
| 39.5–43.5 s | THE FIRST SHORE | There is a war in this country. You have been told what it is. You have not understood it yet. |

"Empire" is the word the traveler's employers use, which is the rule in
`docs/the-war-and-the-house-of-ambron.md`: a royalist's word, and the traveler is a royalist's
hire. "The quietest province the Empire has left" is the campaign's own line for Drent
(`src/campaign.js`). "The warning bell carries across the water" is the opening card's line,
now said where it happens. "The Stills" is the sea's name (`water.name` in world.js).

**Where and how.** One block, centred horizontally, its bottom 18 vh above the bottom of the
screen (the ferry crossing's caption sits the same way), max-width 640 px, `pointer-events: none`:

- the eyebrow in the opening's gold: `#f8df9f`, 12 px, letter-spacing .23 em, weight 600,
  upper case, 10 px above the text (the `.eyebrow` rule with `#opening .eyebrow`'s colour);
- the text in the Adventure serif (Georgia): 24 px, cream `#fffae8`, line-height 1.4, with
  the opening's text-shadow `0 3px 30px #102c37ab`;
- opacity from `stateAt(t).caption.alpha`.

Length bound: the block holds two lines of 24 px serif in 640 px, so `CAPTION_LIMITS` is 40
characters of eyebrow and 120 of text; the longest caption is 95, and the test holds every
caption for every playable traveler under the bound.

## Skip

A **`#skip-cutscene`** button, "Skip cutscene" with an `Esc` key cap, in the secondary style
(transparent, 1 px `#e1d2a64d` border), bottom-right where `#bottom-right` sits (22 px up,
34 px in), visible from the first frame of the sequence to its last, then gone.

- One click, or **Esc**, or **Enter**, skips.
- **F8** during the sequence skips and opens the testing tools (today F8 waits for the arrival;
  same result, sooner).
- **P** (autoplay) started on the opening screen skips the sequence at once: the computer plays
  the road, it does not watch the boat.
- Skipping applies **`SKIP`**, which is `stateAt(44)` and nothing else: the boat at its berth, the
  traveler on the landing facing west, the companion at his place, the camera behind, no caption;
  plus every event not yet fired (`eventsBetween(now, Infinity)`), which means the bell rings at
  the moment of the skip if it has not rung. Then the landing toast. Skipping at 3 s and watching
  to 44 s put the game in the same state; the test holds `SKIP` equal to `stateAt(end)`.

## The first controllable frame

At 44 s, or on skip:

- **The traveler** stands at (23, 29) on the pier deck, facing **west** (rotation −π/2), up the
  pier toward the village, the way the ferry sets a traveler down.
- **The camera** is the game's own: yaw π/2, pitch 0.39, 9 m — at (31.32, 6.72, 29) looking at
  (23, 3.3, 29), from the pier's seaward end west along it. The boat is alongside on the left,
  bow toward the camera; the companion is on the left edge of the deck 2.2 m away, facing across
  the pier; Jojo is 23 m ahead at the pier's root, on the right; the village and its smoke beyond.
- **The companion** stands at (23, 31.2) facing north (`placements()` index 0).
- **The toast**: *Goblins have attacked the northern road.* over the kicker **SPEAK TO MARA AT THE
  HEAD OF THE PIER** (`LANDED.toast`). This replaces today's *SPEAK TO CHRIS ON THE LANDING*, which
  the harbourmaster change (`6fbd9c6`) made wrong: the errand is Jojo's.
- Quest stage 0; `playSeconds` 0; nothing saved; the HUD returns; `mode = 'playing'`.

## What does not play the sequence

- **Continue adventure** (`continueRoad`): no sequence. The boat is at its berth, the traveler
  where the save left them.
- **Start at the newest chapter** (`beginNewestChapter`): no sequence. Boat at its berth.
- **Testing shortcuts** and every `?test=1` review view: no sequence, boat at its berth.
- **The title screen** (`mode === 'opening'`): the boat is at `stateAt(0)`, 170 m out at sea and
  outside the title camera's frame, because the traveler has not arrived; the traveler's model is
  hidden. Today the traveler stands bobbing in the moored boat during the title; that goes.

Rule for the host: the boat is at `stateAt(t)` while the sequence runs and at `stateAt(0)` on the
title screen; in every other state of the game it is at its berth.

## Any of the eleven

The traveler may be any of the eleven (`PLAYABLE_IDS`: `crom`, then the roster's ten by bare
name; `normalisePlayer` also takes `merc-gotwood`, `Chris`, `Ed the Word`).

- **Standard** (Cromb, Jerry, Kristen, Ciarán, Lakota, Eliana, Matt, Al the Tun): the sequence as
  above, the companion **Chris Gotwood**.
- **Chris Gotwood as the traveler**: the same sequence, the companion **Cromb** — "Cromb is in the
  bow, watching the coast come up."
- **Ed the Word** swims ashore out of a pirate ship that never docks, so there is no boat ride:
  `variantFor('word')` is one card over the landed frame, 6 s, skippable —
  **ED THE WORD · TIDEHAVEN** / *You swam the last of it. The ship that brought you has turned for
  open water and will not be back.* — then control, with Chris on the landing as ever (his own
  arrival is hour 0).
- **Mus** beaches his own boat round the headland: one card, 6 s —
  **MUS · ROUND THE HEADLAND** / *You put your boat on the shingle round the headland and came in
  on foot. The pier is where the paperwork is.* — then control on the landing. The world has one
  landing and one harbourmaster; his shingle strand is not a built place, so he lands here too.

Both shore variants end in `LANDED`, the same state as the standard sequence, so the tutorial
and Jojo's errand are untouched.

## Defaults chosen here

1. **Length 44 s**, in the 35–50 s the brief asked for; 25 s of open water, 10 s of harbour, 9 s
   of the round-up and the landing.
2. **The boat is the world's arrival boat**, moved and put back; not the Sultana, not a new hull.
3. **The way in is the Sultana's channel** from the east-south-east, the only charted approach.
4. **The round-up** is to starboard through a 4 m circle south of the pier root, so the boat ends
   bow-east in its authored berth and the harbour after the sequence is the harbour as built.
5. **First person from the port side of the middle thwart**, seated 1.41 m and standing 1.54 m
   above the boat's origin; the companion in the starboard bow.
6. **Nobody steers on camera.** No helmsman is named; the eye never looks astern.
7. **The companion stands** for the whole ride (there is no seated pose for a person in
   `src/characters.js` other than kneeling and sitting on the ground with the head bowed).
8. **The sail stays up**, because the arrival boat's sail is a fixed mesh; the world moors it with
   the sail up already.
9. **Six captions, 42 to 95 characters, gold eyebrow and serif text**, centred low; no caption
   over the last frame so the toast has the screen.
10. **The bell at 30 s**, once, from the water, before the round-up.
11. **`playSeconds` frozen** for the ride; the company's clock starts on the pier.
12. **Skip = `stateAt(end)` + the unfired events**; Esc and Enter both skip; F8 skips into
    testing; autoplay skips.
13. **The landing toast sends the traveler to Jojo**, not to Chris.
14. **The title screen shows the boat at sea and no traveler**; Continue, the newest chapter and
    testing show the boat at its berth and never play the sequence.
15. **Ed and Mus get one card each over the landed frame**; everyone else gets the boat, with
    Chris, or with Cromb when they are Chris.
16. **`mode` stays `'arriving'`** for the sequence: the autopilot's `wait`, the testing menu's
    `pendingTesting`, the HUD's hiding and `walkTime` all key off it already.

## Not settled by the world as built

- **No seated pose for a person.** `src/characters.js` offers `kneel` and `sit-ground` (knees up,
  head bowed); neither is a man on a thwart watching the coast, so the companion stands.
- **The arrival boat's sail cannot be lowered**: one fixed mesh in `boat()`.
- **The arrival boat is not reachable from outside `world.js`**; the host needs
  `world.placeArrivalBoat(x, z, yaw)` and `world.restArrivalBoat()` (in the brief).
- **`src/ferry.js` says Jess rowed the traveler ashore in the opening.** After this
  sequence the traveler sailed in; Jess's boat is on the north face and his is a rowing boat.
  The comment is a comment; his stand and lines do not depend on it. Left alone, noted.
- **The companion's landed spot sits on the deck's very edge.** (23, 31.2) is local x −2.2 to
  within floating point, and `heightAt`'s deck rule is `< 2.2`; it lands on the deck only because
  `29 − 31.2` is `−2.1999…`. That is the roster's ring, not this sequence, and
  `docs/known-issues.md` on the builder's branch already records the ring's reach; the test here
  pins that the spot is on the deck today so a change is noticed.
- **The playable-characters module's ids** are not on any branch yet; `normalisePlayer` accepts
  bare names, `merc-` ids and first names, and the default is `crom`.
- **The `?test=1` harness waits 30 s for `mode === 'playing'`** after clicking Step ashore
  (`until` in `main.js`); the sequence is 44 s, so the harness must click Skip (in the brief).
