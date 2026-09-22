# The long road through Drent: its ground, probed

A read-only check of `docs/drent-long-road.md` and `docs/drent-long-road-build.md` (branch
`drent-long-road`) against the world as it is built. Headless: the real world build, the real
company on the real road, `canStand` and the rules the code already holds people and plants to.
No source was edited. Measured on main at `19417df` plus the bug-hunter's commits, none of which
touch Drent.

**In one paragraph.** Two of the three new stands are good exactly where the design puts them.
Odger's is not: the cairn stands inside a woodpecker's home ground and beside it he would be in
the path the company walks, so he wants to be at the bench, seven metres off. The clock
reproduces the design's table to a tenth of a minute. The user's ruling that *first is
guaranteed* is not yet true, and not because of Ed: **Mus walks the main road today and can
muster at minute 19.8**, and Chris, on today's clock, at 28.1. The legs hold about seven minutes
of walking in all, so the eighty-seven minutes are carried by the lessons. The boats are seen
landing from the first two legs only, and heard by nobody who has not turned the sound on. There
is ample ground for the hedge and the orchard.

## 1. The three stands

Rules applied, each one the world's own: `canStand` at 0.45 m; inside Drent's outline; the ground
opens out to 25 m (the check that found Ammi Tal sealed in); at least 3.3 m from anybody else's
stand (talking range, so nobody contests F); a metre clear of anything solid; outside every bird's
home ground (`src/rena.js`: a stand takes a bird's perches away; the birds themselves keep 1.6 m
from a stand); and clear of the 4.6 m either side of the road's centreline that the company
walks in.

| | Where now | The design's spot | Verdict |
|---|---|---|---|
| **Odger Pell** | (−50, 25), set in `src/main.js:289`, not in `src/mycology.js` | beside the cairn, (−132.3, 34.6) | **Fails two rules.** |
| **Nell Harrow** | `BOTANIST_STAND` (−40, 44) | the Sunken Lane's centre, (−482.4, 38.3) | Passes all. |
| **Silas Garrow** | `GEOLOGIST_STAND` (−5, 97) | the Toll House's centre, (−510.0, 101.4) | Passes all; the cart wants siting. |

**Odger.** The cairn's collider is at (−133.9, 34.6), 5.9 m from Fernway Rest's centre. The
pileated woodpecker's ground (`greenway-pileated`, `src/drent-birds.js:473`) is centred at
(−138, 36) with an 8 m radius, and the cairn is 4.3 m from that centre: *anywhere* beside the
cairn is inside it, the design's spot by 2.1 m. The same spot is 2.8 m from the road's centreline,
inside the band the company walks in — Eliana passes one metre from it at minute 51.0. Everything
else about it passes (standable, Drent, the shelter 1.4 m off, opens out, Bran 40 m away, the
players' camp 20.5 m, the nearest soldier's stand 40 m).
*Proposed:* **(−128.4, 39.6)**, on the bench side: 7.4 m from the cairn, 5.6 m from the Rest's
centre, 5.5 m from the road (outside the company's band, inside the 8 m the build brief asks),
2.3 m clear of the woodpecker's ground, 1.1 m from the nearest solid thing, 20 m from the players'
camp, 41 m from Bran. 197 half-metre spots within 14 m of the cairn pass every rule; this is among
the four nearest the cairn, all within a metre of each other. If "beside the cairn" matters more
than the woodpecker, the other way out is to move the bird's ground six metres west, which is a
design call and not made here. Note that Fernway Rest is in no kept-clear disc (`RENA_CLEARINGS`
covers the three deep places, not the Rest): there are over a hundred small props within 10 m, and
`keepPropsClear` will take the ones within 0.8 m of him when he is placed.

**Nell.** 19.0 m from the main road, 67.5 m from Enna (the nearest stand), 2.4 m from the nearest
hedge bank, inside the lane's kept-clear disc, 69 m from the nearest bird ground. From the road
beside her nothing is in the line of sight; from thirty metres before, coming from Tidehaven, one
hedge bank is — which is the landmark itself: thirty-five `drove-bank` colliders cross the road
here. Findable without a mark.

**Silas.** 21.0 m from the main road, 100.6 m from Enna, 1.9 m from the toll house wall, inside
its kept-clear disc, 72 m from the kingfisher's ground. From the road beside him the line is
clear; from thirty metres before, the toll house itself stands between him and a traveler coming
from Tidehaven. He is found by finding the house, which is fine, but the cart is what should face
the road: only 14 of 42 spots within 2.5 m of him take a body 0.8 m wide, so a marl cart has one
side it fits on and that side should be chosen with the building in view.

After the move the nearest pair of spine teachers is Corvan and Enna at 42 m (the build brief's
rule is 35 m); Nell–Enna 68 m, Nell–Silas 69 m.

## 2. The clock

Road 1,677 m; muster at 1,277 m; stops at 432, 681 and 946 m. Muster times, in minutes, with the
roster as it is: Chris 28.1, Ed 29.4, Ciarán 40.1, Jerry 40.4, Kristen 40.9, Lakota 55.7, Eliana
69.4, Matt 87.0, Al the Tun 87.2; Mus 83.8 at his latest draw. **The design's table is right to a
tenth of a minute.**

**The pinned number is 5,234.5 s, not 5,233.** Al the Tun first reads `mustered` at 5,234.50 s
with the road and stands `src/main.js` uses, and at 5,234.51 s with the pure inputs the build
brief names (`MAIN_ROAD`, `regionNpcPositions`, `STORY_SITES.legionCamp`). The brief's
`5,233 s ± 2` passes by half a second; pin 5,234.5.

**Ed the Word, `departs` 180 → 1,500:** he leaves the landing at 31:00 and musters at **51.4**
(was 29.4). The order becomes Chris 28.1, the riders 40.1–40.9, Ed 51.4, Lakota 55.7, Eliana
69.4, the princes 87.0 and 87.2.

**"First is guaranteed" is not yet true. Two people beat a direct traveler, and neither is Ed.**

- **Mus.** `route: 'wild'` is authored and read by nothing (`docs/known-issues.md`), so he is
  placed like everyone else: he waits in the landing ring, walks the main road, pauses at all
  three stops, and musters 20.3 minutes after whatever he draws. At his earliest draw (−30 s) he
  is standing **4.9 m from where the traveler steps off the boat at t = 0**, is 64 m up the main
  road a minute later, and **musters at minute 19.8**. The design's "beaches round the headland …
  and is never on the road" is not what the roster does. Drawn evenly over −30 … 3,810 s, he is
  already at the muster for a traveler who arrives at minute 20 in 0% of games, at minute 27 in
  11%, at 35 in 24%, at 40 in 32%.
- **Chris**, on today's clock, musters at 28.1. That stops mattering only when he is the
  traveler's companion and his clock follows the traveler's (build piece 4); until then he is a
  second man who can be in first.

The road itself is no obstacle: landing to muster is 1,295 m, 5.1 minutes at a walk (4.2 m/s) and
3.0 at a run (7.2 m/s) without a stop. How long the *mandatory* beats take — Jojo, the post, the
raid, Eren, Luscia's errands — cannot be measured headless; the design's own figure for the short
road is about 27 minutes, which is the minute-27 row above. To guarantee first for a traveler who
is in by minute *M*, Mus's draw needs a floor of *M* × 60 − 1,218 s (for *M* = 30, 582 s), or his
wild route needs building with a length that cannot beat the road. Either is a decision.

## 3. The legs

Distances are road-and-spur (off the road to the road, along it, off again), with the straight
line in brackets; they are estimates, not a pathfinder's. With Odger at the proposed spot leg 3
changes by a few metres.

| Leg | Minutes allowed | Distance | At a walk | At a run | Stop to stop |
|---|---|---|---|---|---|
| 0 harbour | 12 | 98 m (85) | 0.4 min | 0.2 | practice post 39, Eren 59 |
| 1 Tidehaven | 16 | 332 m (294) | 1.3 | 0.8 | bird garden 87, Lysa 44, Jojo 21, Weatherhead 72, Koopwood 109 |
| 2 near wood | 17 | 246 m (140) | 1.0 | 0.6 | Bran 123, Bowden 123 |
| 3 Fernway | 11 | 173 m (127) | 0.7 | 0.4 | Odger 145, players' camp 28 |
| 4 Avrel | 15 | 553 m (527) | 2.2 | 1.3 | Corvan 331, Rena 90, Enna 132 |
| 5 Caloss road | 13 | 345 m (267) | 1.4 | 0.8 | Nell 95, Silas 96, Hollis 154 |

About 1,750 m and **seven minutes of walking in eighty-four**. The length is in the lessons, as
the design says; nothing here depends on a player being slow on their feet.

**Is each boat seen or heard?** Figures are drawn within 180 m. A "line of sight" here is a
straight line on the ground crossed by solid things, not a rendered view.

| Minute | Where the design has the player | From the landing | Seen? |
|---|---|---|---|
| 6 | the Watch, with Eren | 108 m | Yes: drawn, nothing in the line. |
| 18 | Lysa's kitchen | 34 m | Yes: a withy bed and one prop in the line. |
| 33 | Willowmere, with Bran | 127 m | Doubtful: a house and two other things in the line. |
| 48 | Fernway Rest, with Odger | 153 m | Barely: one thing in the line, and about twelve pixels tall. |
| 63 | the ruins of Rena | 430 m | **No: not drawn at that range.** |

*Heard:* the bell is a synthesized effect with no position (`src/road-audio.js`), so it would
carry across Drent as designed — but **sound does not exist until the player clicks the Sound
button** (`src/main.js:2520`), and every `audio?.effect('bell')` before that is a no-op. For a
player who never turns sound on, five bells announce nothing. The design's other means, Chris's
line when somebody comes within 40 m, is the one that reaches everybody, so it matters that it
fires on every leg. It does:

| Leg | Who comes within 40 m of a stop while the player is meant to be there (Ed at 1,500; Mus at his latest) |
|---|---|
| 1 Tidehaven | The three riders at 19.6–20.0: Jojo 2–7 m, Lysa 3–8 m, the bird garden 22–28 m, the Koopwood 35–40 m. Nobody passes the Weatherhead. |
| 2 near wood | **Ed, 21 m from Bran at 32.2** and 36 m from Bowden at 31.4; Lakota, 20 m from Bran at 35.3. |
| 3 Fernway | Eliana past the Rest at 51.0 and 13 m from the players' camp at 50.8. |
| 4 Avrel | Matt 5 m from Corvan at 70.9, Al 18 m at 71.0; Al 19 m and Matt 33 m from Enna. Nobody passes Rena, which is 110 m north of the road. |
| 5 Caloss road | Matt 15 m from Nell at 73.3, Al 24 m at 73.4; Al 16 m and Matt 25 m from Silas at 74.0–74.1; Matt 6 m from Hollis at 75.8, Al 2 m at 77.0. |

The design's timeline is borne out where it names a moment: Lakota by the pond at 35.3 (the
design says 35:10, 25 m; measured 20 m), Eliana past the bench at 51.0, the princes at Corvan's
desk from 70.9 (19–33 m from the mill, not 45), through the lane past Nell at 73.3, Hollis at
75.8. **One row the ruling has made false:** "9–12 … Ed walks up the Greenway past the Watch, wet
to the neck — the first of them you see go by. He musters at 29.4." He now leaves at 31:00, passes
Willowmere at 32.2 three minutes ahead of Lakota, and musters at 51.4; the first of them anybody
sees go by are the riders in the village street at 19.6.

## 4. Ground for the foods

By the plant scatter's own rule (`src/drent-flora.js`: inside Drent's box, standable at 0.5 m,
3 m from any stand or other site, 2.4 m from every road vertex):

- **The Sunken Lane:** 474 of 613 one-metre cells within the lane's kept-clear disc would take a
  gatherable (77%), with Nell's stand excluded. Room for a hedge of hazel and bramble many times
  over.
- **By the Caloss Gate** (−176, 29): 543 of 613 (89%).
- **Orchard ground.** Applegarth's orchard (`APPLEGARTH_WORKS.orchard`) is 28 trees, all in Drent,
  all with standable ground within 1.8 m; the nearest is 117 m from the Avrel clearing's centre.
  At the clearing itself there is one `fruit-tree`, and 21 of Rena's own orchard gone wild
  (`rena-orchard-tree`) stand within 75 m of its centre — so "the clearing's trees" has trees to
  mean, if the wild orchard is meant.

Neither hazel nor bramble has a habitat rule yet; the scatter places by habitat, and the three
jimson weeds show the other way, authored stands, which is the simpler one for a hedge that has
to be *at* the lane.

## What this did not check

How long the mandatory beats take a real player, and so whether a direct traveler is in before
minute 28; anything rendered (crowns, relief and fog are not in a line-of-sight count); the
walking distances as a pathfinder would give them; and Perrin, who is not in this tree yet — leg
one uses the bird garden's own stand.
