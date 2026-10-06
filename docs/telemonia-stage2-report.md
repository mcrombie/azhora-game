# Telemonia, stage 2: the town, the farms, the people, and how they meet an outsider

Branch `telemonia-stage2`, worktree `../azhora-game-telemonia`, cut from main `470cfcc`. **Nothing is committed,
pushed or stashed.** Three agents built it in this worktree by file ownership (the coordinator's split): the
**town** (`src/content/regions/telemonia/telemonia-town.js`, `src/content/regions/telemonia/telemonia-town-scenery.js`, `tests/telemonia-town.test.js` - its own
numbers and choices are in those files' headers), the **rule** (`src/content/regions/telemonia/telemon-watch.js`,
`tests/telemon-watch.test.js`), and this report's author: the people, the stock, the wiring, the save, the
registers and the integration. The brief is `docs/telemonia-stage2-brief.md`.

## What is built

| | what | from |
| --- | --- | --- |
| Kethorn (town agent) | six halls of the bands down the two long sides of the top, the hall at the end of the one street (the king's: a band hall's size, turned across the street's head on the highest ground), six round corbelled granaries, two cisterns, a paved street from the gate; 931 colliders | telemonia.md: "the halls of the bands ... the granaries and the cisterns; and the hall of the king, which is said to be distinguishable from the others mainly by where it stands"; no inn, market, temple or gatehouse |
| the fields (town agent) | 102 blocks on the rock's grain, 88 sown: 5,173 rows of barley and 2,934 of pulses (18,670 m of row); fallow by the south pass; the vine along every tread, 2,995 stocks over 5,397 m; nothing in a wash, on a pass floor, a stair or its 10 m lane, the way or the apron | "the plain is farmed to its edges, and where the plain ends the terraces begin" |
| the field people's huts (town agent) | 12 low dry-stone huts with brush-and-earth roofs in four rows of three at the terraces' foot, between stairs; a cattle fold and a horse fold with open gateways | **builder's choice** (the lore says only "allotted to the band halls") |
| **the people** (`src/content/regions/telemonia/telemonia-people.js`) | **13 Telemon men** (3 by the pass heads - back off the desert road at the Tarnel, with the horses by the east pass, with the cattle by the south pass; 2 sparring in the yard inside the gate; 4 at band-hall doors; 1 at the king's hall door; 3 overseeing the field people), **10 Telemon women** (2 inside the gate, 2 at the cisterns, 1 at a granary, 1 on the spur with a water jar, 3 dressing terrace walls, 1 bringing water to the south huts), **12 field hands** (2 in the rows and 1 at the vines by each row of huts), all real NPCs; **12 field-hand figures** in the far fields (src/world/life/town-life.js, drawn within 95 m, never spoken to). Placed at the town's own sites | the user's paragraph; the lore's "a woman with a knife at her belt and a water jar on her shoulder", "how to hold a gate, a terrace wall, a cistern, a stair" |
| **the builds** (`src/content/characters/characters.js`) | `telemon-man`: undyed wool, a short cloak pinned at the right shoulder, a close beard, cropped hair, a slightly compact build, **a 2.95 m spear planted (held in a fight), a big plain round shield of hide, iron-rimmed, and a knife in a leather scabbard at the left hip**. `telemon-woman`: the slighter build, a dress to the calf, long hair, **a knife in a scabbard**, a clay water jar on the shoulder for some; a long knife in hand in a fight. `toreth`: rough undyed cloth, rolled sleeves, a rope belt, nothing in hand ever. Telemon skins dark, field people's lowland | the user: "long spears and shield and knives in scabbards"; "compact, dark-complexioned"; "They carry no weapons" |
| **the stock** (`src/content/regions/telemonia/telemonia-ways.js`) | **5 Telemon horses** (createHorse at 0.9 scale): 3 loose by the east pass's head, 2 in their fold; **6 cattle** as a western wildlife range (`nethrani-cattle`, the compact short-legged beast) on the fallow by the south pass | "the hill pastures carry cattle and horses" - the rim is not walked onto, so the Galmeth's margins |
| registers | build status (still `early`: no markets, ceremonies, king, quest), the campaign's Kethorn and region text, the chart's Galmeth and Kethorn areas, three landmarks (the halls of the bands, the hall of the king, the field people's huts), Telemonia's region text, eight review views | |

**Nobody has a name** ("Telemon warrior", "Telemon woman", "Field hand"). **No child**: the lore's boys on a
training run are left out so that a fight "with everyone in earshot" can never include one. **No king as a
character, no quest, no trade, no hiring.** Nothing is named Crom. Every Telemon is stood up after the trimmed
cast (src/content/characters/cast.js), since each is a watcher in the country's rule and not a town's atmosphere.

## Challenged on sight

**The rule kept is the rule agent's `src/content/regions/telemonia/telemon-watch.js`**, and mine (`src/telemonia-challenge.js`, written
before the split) is deleted: by the time both existed my host had been rewired to it, its test was green, and it
already met the coordinator's list (stealth.js awareness per watcher, never past the border, a bad or missing
standing is clean, numbers in one frozen table with precedents). `src/content/regions/telemonia/telemonia-host.js` binds it to the world.

- **Every Telemon is a watcher**; the field people are not. Noticing is src/gameplay/law/stealth.js's model (range, 100° cone,
  sneaking, suspicion), one meter per watcher, with the sightline from **src/gameplay/combat/forest-sightline.js** (the ground, every
  solid with its height, the trees): eye 1.6 m to the traveler's chest, 1.3 m standing, 0.7 m crouched to sneak.
- **Seen**: the nearest who noticed walks up (3.2 m/s), says a few words, turns the traveler round and **walks
  behind him to the nearest pass mouth**; at the mouth he stops 2.2 m inside the border and the traveler walks out
  alone (`walkedOut` + 1). The escort goes off the rock by the gate and off a terrace by a stair (src/content/regions/telemonia/telemonia-ways.js).
- **Resisting** - going 12 m further from the mouth than his best, 8 s without a metre's progress, a blow swung or a
  bow drawn on the walk, or striking any Telemon anywhere in the country - **or being seen inside again after a walk
  out or a fight**: hostile. Everyone within 65 m joins, and anyone who comes within 65 m while it lasts; those
  within 14 m start the fight (the combat's own arena, `arenaAround`), the rest run to it at 3.6 m/s and join;
  **at most 12 fight at once** (the combat's cap). Men fight as the game's `soldier` (110 health), women as its
  `rebel` (70), at level 3. A Telemon killed is a body that stays (the corpse host).
- **Out of the country nobody follows**: leaving ends a walk, an approach or a fight (`combat.disengage`), and
  everybody goes home. Losing is the game's own defeat.
- **The standing** `{ version: 1, walkedOut, fights }` is saved under `telemon` (src/app/saves/road-checkpoint.js), absent in
  old saves, and a bad one is dropped (clean) rather than costing the save; reset with the other standings on a new
  game and in the testing and living-scenario preparations.

**Numbers.** The rule's, `WATCH` in src/content/regions/telemonia/telemon-watch.js: earshot 65 (the crime host's notice radius), talk 3.2,
escort gap 2.2, pace 3.2, dawdle 8 s, stray 12 m, calm 10 s. The wiring's, `TELEMON_FIGHT` in src/content/regions/telemonia/telemonia-host.js,
**all builder's choices**: vision **40 m** (stealth's 12 m is a guard in a yard; this is open highland), the eye and
chest heights above, the men's and women's fight kinds and health, start 14 m, run 3.6 m/s.

**Proved** (tests/telemonia-people.test.js, on the real ground and sightlines with everybody at their places):
walking in by **each of the three passes in the open is seen** (by the man at its head); **over the western rim**
(two hexes thick, no pass) a traveler comes down onto the terraces and crosses to the foot of the rock's north-west
cliffs **unseen, sneaking or walking**; sneaking up the spur to the gate is seen; seen in front of the horse herdsman,
the traveler is turned round and walked to a mouth, **the escort never leaves the country**, and `walkedOut` is 1;
the second crossing is a fight at once (`returned`) with three or more in it, all within earshot. Climbing the rim
itself is stage 1's proof (the bands give holds); the rock gives none, so the gate is the only way onto it.

## Tests

One file a process, up to four at once. All on the final state of every file.

| file | result |
| --- | --- |
| `telemonia-people` (new, scoped world) | **8/8**, 27 s |
| `telemon-watch` (rule agent), `telemonia-town` (town agent), `save-round-trip`, `road-checkpoint`, `law-checkpoint`, `stealth`, `crime`, `closed-border` | **90/90** in one process |
| `telemonia-world` (stage 1's, whole world) | **18/18**, 3.2 min |
| `map-fog`, `campaign-world`, `player-characters`, `lazy-character` | **42/42** |
| `town-life` (whole world) | 4/5: `every new stand can be walked to ...` - `life-avrel-farmer cannot be reached from the road`, **the brief's known red on this base**, same test and message |

`tests/telemonia-world.test.js` was changed only where stage 2 changes what it held: collider kinds in the country
may now be the town's (`kethorn-*`, `telemonia-*`), the landmarks include the town's three, the build status's work
names the border markets, and the animals test no longer claims nothing is domestic (the wild ranges are unchanged;
the cattle are their own list). The three agents' test files are in `tests/test-manifest.json`. `west-life` was not
run: the cattle range meets its reach law (half its diagonal under 130 m, every site inside its box), which the
people test asserts; its chase laws stop at their first failing band on this base.

## The review render

One launch after the last change: `node scripts/launch.cjs --smoke-test --review-clean --review-jpeg
"--review-views=telemonia-town,telemonia-town-gate,telemonia-band-hall,telemonia-fields,telemonia-huts,npc-telemon-man-6,npc-telemon-woman-2,npc-toreth-4"`
- 2 min 50 s, exit 0, `"errors": []`, pictures in `tests/artifacts/`. Looked at, every one:

- `telemonia-fields` - the whole plain from the north-eastern rim: the blocks of barley (gold) and pulses (green)
  on the grain to the terrace foot, the rock with the halls, granaries and wall on its top, the vine in rows on every
  terrace, the horse fold with two horses in it and the three loose ones below the rock, a row of huts. The best picture.
- `telemonia-town` - meant from the plain; the review camera stopped against the halls and it is instead the town
  from the king's end of the street: the paved street to the gate and its towers, halls down both sides with their
  doors and slits, the corbelled granaries, the two cistern tanks with dark water. Reads as plain heavy stone.
- `npc-telemon-man-6` - a Telemon man at his hall's door: dark, bearded, cropped hair, undyed tunic, the long spear
  planted, the round hide shield on his arm (the knife at his hip is behind the shield from this side).
- `npc-telemon-woman-2` - a Telemon woman inside the gate: the dress to the calf, long dark hair, the clay jar on her
  shoulder, the knife in its scabbard at her hip; men with spears along the street behind her.
- `npc-toreth-4` - a red-haired field hand kneeling in the barley, the overseer with spear and shield behind him, two
  huts and the vine terraces. Up close the barley rows read as solid ridges; from the rim they read as rows.
- **`telemonia-town-gate`, `telemonia-band-hall`, `telemonia-huts` came out occluded** (the review camera inside a
  wall or a roof): the street inside the gate and a hut row are not separately photographed (both show in the
  pictures above). The views' framing wants fixing; it was not re-rendered.

## Open for the user

1. **What becomes of a traveler who loses** - the game's defeat now; the lore would make him a field hand.
2. **Where the field people live** (rows of huts at the terraces' foot) and **the folds** - builder's.
3. **The cattle's breed** (the west's compact beast) and **the horses' look** (the game's horse at 0.9 scale).
4. **Vision 40 m**; the men as soldiers and the women as rebels in a fight; earshot 65 m; at most 12 at once.
5. **The rule's shape** (the rule agent's): the escort walks *behind* to the nearest mouth by straight line, no
   dialogue choice - refusing is not walking; "a weapon in hand" was read as a swing or a drawn bow, because the
   traveler's sword is always at the hip.
6. **The standing never lapses**: once walked out, every later sighting is a fight.
7. **Talking to a Telemon inside the country** gets no answer (walking up to one is being seen by him); a field hand
   speaks the lowland tongue only while nobody has the traveler in sight.
8. **No stealth practice** is earned near the Telemon (the rule's meters do not report it, as the Drent yard does).
9. **The western route is open**: nobody faces the western terraces. Whether it should be harder than the climb.

## Not verified

The challenge was **not played by hand**: it is proved by the pure rule tests and the world test above, and by one
review render; the escort walking, the fight starting and joining, the toasts, the HUD meter and the save/load
round trip were not exercised in the running game. No whole-suite run. The stage 1 report's other neighbour tests
were left to the coordinator's registration run.

## After the user's look, 2026-10-03

- **The shield hangs upright on the forearm** (`src/content/characters/characters.js`): a Telemon man now carries it as the Feradom and
  Ambroni soldiers do theirs - forearm forward, board upright, face out (measured: its face points 0.97 forward,
  0.24 up; the Feradom kite's 0.99 and 0.16) - at rest, walking and in a fight; the spear stays planted at rest.
- **The views**: every one now looks at a point in the open, because the review camera backs off from what it looks
  at until something stops it. `telemonia-town` is the town from the plain; the old picture is `telemonia-street`
  (from the king's end to the gate); `telemonia-town-gate`, `telemonia-band-hall` and `telemonia-huts` are reframed.
- **The challenge, played in the running game**: `node scripts/launch.cjs --smoke-test --telemonia-checks`
  (`src/dev/checks/telemonia-smoke.js`; 25 checks, 176 s of play, 4 min 47 s with the world's load; pictures
  `tests/artifacts/telemonia-play-escort.png` and `-fight.png`). Set down outside the east pass and run in: noticed
  by the man with the horses, "You. Stop.", turned round ("Turn round. Walk."), walked to the east pass's mouth
  with him behind, released ("Go. Do not come back."), walked out once, and he never left the country. Back in:
  "You were told.", a fight at once, the overseer from the north huts runs in and joins it (two in the combat, never
  over twelve, both within earshot). Run out: the fight breaks off at the border and nobody crosses it. Save and
  reload through the game's recovery checkpoint: walked out 1, fought 1. Set down on the western terraces and sneak
  onto the plain: suspicion never rose from 0. The script moves the traveler and tops his health up in the fight;
  everything else is the game's own frame loop.
- **What the play-through found and was fixed**: (1) a traveler noticed at the head of the east pass was to be walked
  to the Tarnel, nearer as the crow flies over eighty metres of cliff: the rule now takes the nearest mouth by the
  walked way (`mouthFor` in `src/content/regions/telemonia/telemon-watch.js`, given by the host). (2) The second Telemon called to the fight
  stood off at 26 m and never joined it, because the game's villagers back away from fights: Telemon men and women
  now count as fighters there (`SOLDIERLY` in `src/main.js`); the field people still back away.
