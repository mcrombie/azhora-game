# Design answers

Decisions the user has made in conversation, written down so that whoever builds next does not
have to ask again. Newest first. Where an answer supersedes the spoken brief
(`docs/original-brief.md`) or an earlier note, the answer here wins.

## 2026-10-01 — Four decisions on the finished southwest: the ghubr, the tortoise, five names, a table

**Four open questions the southwestern programme had left, answered in one sitting.** Built to
`docs/southwest-finish-brief.md`; the whole account is `docs/southwest-finish-report.md`. No new region.

- **The Ganesh dustback: "just come up with what you think it should be based on the lore."** Three
  builders had refused it because they were looking for a body description; the description is
  behavioural and it exists. It is the **ghubr** (`ganesh_desert.md`, `culture/azhoran_livestock.md`,
  `peoples/languages/moreshi.md`): small, dry, insectivorous, of the northern desert margin, with a pale
  powdery ridge along the spine and shoulders, moving at the surface and resting in shade. **Whether it
  is a bird or a small mammal the lore does not say; the build chose a bird and says so** - the guides
  read wind direction off it, it is watched standing in daylight where the desert's mammals are
  nocturnal, and a four-legged build would be the confusion the lore's own second sentence exists to
  prevent. It is **not** the Moroshé bovid, which is somebody's stock and stays unbuilt.
- **The canyon tortoise: build it, and let it withdraw.** The blocker was the west's first law, that
  nothing in it can be walked down. The decision: **the law assumed every animal flees, and a tortoise
  does not - it stops and shuts.** So the behaviour is built (`SHUT`, `src/content/regions/western-regions/west-regions-life.js`) and
  **the law was changed to ask the right question** rather than exempting the animal with a flag, which
  the user explicitly rejected: `tests/west-life.test.js` now asks of an animal that shuts whether
  walking it down *got anybody anything*, and chooses that half by what the animal did in the chase
  itself. Its home is the Dinelv Highlands' north gap basin, which the lore calls a desert seep.
- **Five watercourses: derive the names from the language profiles.** Three were named and two were
  not, and both outcomes are the lore's. Gala's Telemonia border stream is **the Treloss** and the one
  chain that Gala and the Oves Desert each built a reach of is **the Caelin**, both from the `mittoli`
  profile's own roots and endings (`src/gameplay/skills/languages.js`: `roots.border` *trelith*, `roots.flow` *caelin*,
  `roots.river` *caeloss*). **Gala's distributary and Ovesos's Dry Gully stay descriptive**: `gala.md`
  says the names of Gala's small rivers are from a pre-Mittoli layer nobody can gloss, and a dry cut
  with no water in it has no word in a water-administration vocabulary. A name that cannot be derived
  honestly is left undrawn.
- **`groundTint` should be a table.** It already was at the top level (job 4 did it); the level below,
  `southwestTint`, was still a chain of three boxes with a branch per country nested in each, which is
  the shape job 3 nearly lost the Dinelv plateau's colours to. It is now **thirteen rows walked in
  order**, each naming the country it speaks for, and the guard asserts both that every row paints
  somewhere on its own hexes and that **every one of the thirteen countries comes out tinted**.
  Behaviour is identical: 362,894 answers compared against the base commit, none different.

## 2026-09-30 — What a deep forest is, and the southwest finished (job 4: Marosh and Trogo)

**The user's decision, asked directly and answered in one sentence:** a deep forest in Azhora is
**a country you cannot see far in *and* cannot go straight through**. Built to
`docs/southwest-4-brief.md`; the whole account is `docs/southwest-4-report.md`. Terrain, climate,
water, scenery and wildlife only, and nothing that belongs to anybody. **Job 4 of four**, which
finishes the southwest quarter: thirteen countries, three hundred and twenty-two hexes.

- **A deep forest is two rules and they are independent.** The first is **haze**: Trogo's
  `palette.hazeDensity` is **`.0144`**, which is nearly two and a third times the game's own default
  and hides a traveler **half at fifty-eight metres, nine tenths at a hundred and five and entirely
  at a hundred and twenty**. The shortest sight line in Azhora before this was Nethereum's `.0071`
  at two hundred and forty-four metres. The haze colour has to be **dark** — `0x6d7d6b`, the
  darkest in the game — because job 1 measured that a near-white haze is over half of every pixel
  past a hundred and fifty metres, and what this actually is, is the lore's own fog: "warm and thick
  and close", cloud sitting inside a canopy.
- **The second is `src/world/scenery/undergrowth.js`, shaped exactly like `src/gameplay/movement/climbing.js`.** It owns no input, no
  rendering and no saved state; it gates movement through the `canTraverse` hook `moveCharacter`
  already takes; it is composed with `canWalkSlope` in one line of `src/main.js`; and **it applies
  only inside a named region set**, because the rest of Azhora has thicket sitting on the autoplays'
  roads. A forest country hands it a region set and one field, `open(x, z)` — nothing else. The
  Ibenwoods are one row in its table and one field in their own world module.
- **The rule refuses exactly one thing: a step that leaves a way and enters the thicket.** A step on
  to open ground is always allowed and **a step out of the thicket is never refused**, so nobody can
  be sealed in however they got there — the same asymmetry `canWalkSlope` makes when it allows a
  descent and refuses an ascent. The thicket carries **no collider at all**: the emergents and the
  canopy trees are ordinary tree colliders kept off the ways, and the understory that actually stops
  a body is a rule rather than three thousand rocks. That is why `tests/nobody-sealed-in.test.js` is
  untouched by this country.
- **Three kinds of way through, and the measurement is the design**: the watercourse (the Trogoreth,
  thirteen metres either side), four stream gullies (nine), five animal paths (four and a half) and
  six clearings. **Forty-four per cent of the country can be walked and twenty-three per cent of the
  closed canopy** — so four fifths of the forest proper is refused.
  `tests/trogo-undergrowth.test.js` floods the country both ways: from the desert margin it reaches
  both shores, the river's mouth and **every walkable cell**; from the southern shore it reaches
  every point of the crest; and with the ways shut it reaches **nothing**.
- **`deep_forest` had no meaning in the game's world before this.** It is `REGION_TERRAIN`'s first
  profile for the word: base 52 against the South Meroshe's 14 across thirteen hex edges, which is
  the "wall of dark canopy" job 2's own landmark promised a job in advance.
- **Marosh's line is drawn by height, not by the ocean**, which is the answer to the question job 3
  left. Hama's wet/dry line runs sixty-nine to a hundred and ten metres inland of the surf; Marosh
  has no wet/dry line at all, because **it has no desert hex**. The line it does have is `Csa`
  against `Csb` — the hot-summer and warm-summer forms of the same climate — and on a coastal
  strip two hexes wide only altitude can decide that. The atlas writes `hills` on precisely the eight
  hexes it writes `Csb` on, and **every one of those eight touches the desert and none of them
  touches the sea** while all twenty ocean edges are on the grass. Three statements, one line.
- **Marosh is the reason the Meroshe is a desert**, and that is a build decision taken from the
  atlas: a single oak-and-maquis crest at base 74 between twenty hex edges of Iberos water and the
  Central Meroshe's sand sea. One gap breaks it, and **the atlas found the gap rather than a
  builder**: the only three river edges the map draws on that whole coast meet at one hex corner
  beside the ridge's elbow, which is what a water gap is, and it is where the caravan road crosses.
- **Two new rigs, which is the most any job in the block has spent**, both named and described by the
  fauna overview: the **forest edge-cat**, which `trogo.md` asks for in so many words ("the carnivores
  that hunt both zones are the most studied by the communities here"), and the **Iberos albatross**,
  which the overview says summers "somewhere beyond the horizon south of Azhora" — and Trogo's
  shore is the southernmost ground in the game. **The three standing refusals are held for the
  fourth time**: the Ganesh dustback, the canyon tortoise (Trogo was the last country that could want
  it, and it still fails the west's first law) and all domestic stock.
- **The rainforest is the densest country in the game**, at 0.379 ranges a hex against job 2's desert
  at 0.074 — and the two share thirteen hex edges.
- **`groundTint` is a table now**, which job 2 and job 3 both asked for after it failed silently
  twice, and `tests/southwest-world.test.js` carries the permanent guard: every family in the table
  must move the colour of the ground somewhere in its own country.
- **The world box moved south a fourth time**, to `maxZ` 3264.4264805429416 and 54.316 hexes tall —
  job 2's arithmetic predicted 3264.4 a job and a half in advance — **and the survey window moved
  west again without anything reaching west**, `minQ` −49 to −50, because one row deeper in the
  south is half a column further west at the same world x. It buys one hex: (1,145), an Azhor Stones
  hex whose terrain word is `deep_forest`, and `trogo.md` says its own coast looks at it.
- The lore was adjusted in place on **twelve claims** across `marosh.md` and `trogo.md`. The largest
  is that Trogo's descent runs the other way at its desert margin: the forest stands fifty metres
  **above** the Meroshe, which is why there is a rainforest there at all.

## 2026-09-30 — The southwest, job 3: Cape Heth, the Dinelv Highlands and Hama

Built to `docs/southwest-3-brief.md`; the whole account is `docs/southwest-3-report.md`. Terrain,
climate, water, scenery and wildlife only, and nothing that belongs to anybody. **Job 3 of the
four-job programme** covering Azhora's southwest, on a branch cut from job 2's. Seventy-three hexes,
and each of the three countries is a first.

- **Cape Heth holds the only `coast` hex any country on the atlas holds.** The map paints 1,332 of
  them round the continent and exactly one falls inside somebody's outline: (−39,127), the point of
  this cape, with four of its six neighbours open water. **Its `Cfb` is the sea's code and not the
  air's** — measured, all 1,332 `coast` hexes and 13,619 of 13,622 `ocean` hexes read `Cfb` — so the
  point takes the desert's own dryness and the cape is eighteen `BWh` hexes with the sea on three
  sides of it. Twenty-one hex edges of open water, the most maritime country in the block.
- **The Dinelv Highlands are the first desert highland in the game**: `BWh` on all thirty-five hexes
  with twenty-six `hills`, six `plains` and three `mountain` — and across the whole map `mountain`
  reads `BWh` exactly three times, all three here. That code decides what they can be, because a
  summit high enough to be a mountain in the Lotharn sense would carry snow; **they are flat-topped
  residual tables** sixty and seventy metres over the plateau with sides too steep to walk.
- **The bedding is a function of height and nothing else**, `h + A sin(2πh/P)`, which makes it
  horizontal by construction and impossible to lay crooked; with `A < P/2π` it stays single-valued so
  nothing overhangs. It draws treads and risers up every steep face in the country without changing
  the total fall by a centimetre, and it is the cheapest landform in the block.
- **The ridge systems are the atlas's own rows.** Read in the frame the lore's own sentence names —
  the peninsula's long axis, measured at thirty degrees west of due south — every hex but one falls on
  a row of constant cross-strike coordinate, and **the six `plains` hexes are the gaps in those rows**.
  So the lore's passes and its water-concentration points are the same four places, which is the one
  thing it says twice without joining up, and which is why the court's cisterns are at the passes.
- **The plateau can be walked up in exactly one place** — the lore's northern plateau pass, a graded
  ramp laid along the grain, 29 m to 85 m over 293 with a worst grade of 0.53 — and the tables cannot
  be walked at all. A flood fill at a 0.45 grade reaches 117.6 m and stops well under their 164.7.
- **Hama is the wet edge of the desert, and the atlas draws the line twice**: nine `grassland` hexes
  that are every one `Csb`, ten `plains` hexes that are every one `BWh`, and no hex where the two
  fields disagree. Measured on the ground, the line lies **sixty-nine to a hundred and ten metres
  inland of the surf** all the way round the corner of the continent — the ocean draws it and the
  Meroshe does not — and it explains job 2's South Meroshe fog belt: one ocean, rain on the exposed
  western face and fog on the sheltered southern one.
- **The world box moved again and job 2's brief had predicted it would not.** `minX` −3960.002 →
  **−4360.002**, the world 45.700 hexes wide → **49.700**, all of it Cape Heth's one `coast` hex,
  because `x = W(q + r/2)` and its rows are four higher than the Ganesh Desert's. **The lesson is that
  a prediction about the survey window is not a prediction about the world box**; three briefs in a
  row have made that substitution and two of them were wrong. `WINDOW.minQ` −45 → −49 with it, and
  that widening is the first that pulls in nothing at all: there is no claimed hex west of Cape Heth.
- **The Meroshe fan heads lifted with nothing changed**, which is what job 2 predicted when it wrote
  `merosheSkirt` as a one-sided ramp: the three apexes went from 9.28, 11.66 and 15.63 m to 38.73,
  33.54 and 33.95, and every metre came through the hex blend's own base.
- **Thirteen ranges over seventy-three hexes (0.178 a hex), and the block stops getting emptier.**
  Job 1 was 0.159 and job 2 was 0.074; Hama's nine `Csb` hexes carry **0.263 a hex**, the densest
  country in eleven, and Cape Heth's 0.211 is three sea birds and one hare. **No new rig**: the
  Ganesh dustback is held out for the third time (named, never described — the user's decision), and
  the canyon tortoise now has its perfect home in the Dinelv basins and still fails the west's first
  law that nothing can be walked down.
- **Two new dialects, both the lore's own**: `plateau` for the Dinelv highland Moreshi, which the lore
  describes down to a named phonemic contrast, and `haman` for Hama's merchant dialect. **Cape Heth
  speaks plain Maroshi as a marked stand-in**, because its own file names the Alezhor coast and
  Ibenale as its kin and spends four paragraphs ruling out the Boueni, and none of those is built.
- **`OWN_SKY` is one list now** (`tests/own-sky.js`), which is the permanent guard job 2 asked for
  after five builders found and extended the same two copies.
- **Eight files and ten stale assertions were moved**, six of them the world-box width; and two
  landmarks had to move a metre or four because growing the box shifts every vertex of the renderer's
  coarse band — job 1's Alezhor Water and Amod's Dromel Gate label (the gate itself is untouched).
- The lore was adjusted in place on nine claims across `cape_heth.md` (the cape runs into desert and
  not forest; the bight is north; there are no trees), `dinelv_highlands.md` (the coast is west; the
  escarpment's south-western corner is a sea cliff; the ridges' bearing; the three tables, which the
  lore does not mention) and `hama.md` (the two converging coasts are both open ocean; the green is
  nearly half the country).

## 2026-09-30 — The southwest, job 2: the four Meroshe deserts

Built to `docs/southwest-2-brief.md`; the whole account is `docs/southwest-2-report.md`. Terrain,
climate, water, scenery and wildlife only, and nothing that belongs to anybody. **Job 2 of the
four-job programme** covering Azhora's southwest, on a branch cut from job 1's.

- **The design question the brief set, answered: ninety-five hexes of `plains` and `BWh` are made
  worth crossing by the surface underfoot, not by relief.** Erg, reg, hamada and sabkha — sand sea,
  stone pavement, bare rock, salt pan — are four real and distinct desert surfaces and the game had
  drawn none of them at scale. One to each quarter, which is also the lore's own division of the
  Moroshe ("the rocky hammada of the northern transition zone… through the great sand seas of the
  central interior, to the canyon country of the south"). What changes between the four is **how far
  you can see** (to the horizon on the hamada, two hundred paces in the erg, twenty miles on the reg,
  six hundred metres in the fog), **how you navigate** (the hamada's rock benches strike north and
  south, the sand sea's ridges north-west to south-east on the wind, so the ground itself is the
  compass), and **which single edge of the desert each one faces** — the Ganesh Plain and Marosh's
  Mediterranean corner from the North, the Dinelv escarpment and the open ocean from the West, a
  rainforest and the southern ocean from the South, and **nothing at all** from inside the Central,
  which is why it is the largest of the four and carries one range of animals.
- **The climate is flat and that is the finding.** All ninety-five hexes are `BWh`; measured,
  `southwestAridity` reads 1.000 on ninety-four of them and 0.893 on the ninety-fifth, which is the
  one hex that stands beside the Ganesh Plain's `Csb` row. Job 1's half is sorted by a climate
  gradient and this half cannot be, so the scatter needed a second pass of its own.
- **Every hot-desert hex on the claimed atlas is in this one quarter of the continent** — 245 of
  them, of which these four are 95. There is no other desert in Azhora.
- **The world box grew, and south.** `minX` did not move, as the brief predicted; `maxZ` went from
  2398.401 to **3177.824** and the world from 45.656 hexes tall to **53.450**, because the South
  Meroshe reaches row 141. The survey window moved in **both** axes for it — `maxR` 135 → 144 and
  `minQ` −41 → −45, the second without anything reaching west at all, because x = W(q + r/2). Nine
  world-box guards in eight files were moved for it, and **a third of the 143 hexes the widening
  turned from sea into land are the block's own**: without it the whole South Meroshe would have been
  open water in the middle of a playable country.
- **The west and south edges are sea**, measured on the World Builder map: the West Meroshe's ten sea
  edges are six `coast` hexes and the South Meroshe's four are three, with `ocean` beyond both. So
  the driest ground in Azhora runs out at an **open** ocean twice more, and is as arid a hundred
  paces inland of the surf as twenty miles in.
- **No water at all.** The atlas draws 572 river edges and not one touches the ninety-five. The
  Malhat, the salt pan at the fan skirt's dead end, is a **crust and not a water surface** — the one
  place in the desert where water can be seen and not drunk.
- **The Ganesh Plain seam did not move anything.** Measured against the same ground built without the
  Meroshe: the plain's three channels fall 1.60, 3.00 and 4.07 m exactly as before and **the divide's
  crest is at the same two points**. What did move is the plain's southern margin, up 0.30 m, because
  the row south of it stopped being `outland` and became the hamada — the rib there disappearing.
- **Seven ranges over ninety-five hexes, five of them birds in the air**: 0.074 a hex against the
  Ganesh Desert's 0.097, so sparser per hex than the sparsest country in the game. The largest of the
  four carries **one**, fifty-two metres up. A bone-bird in each quarter and nothing else in more
  than one, because the lore's one direct statement is that they are "the most visible large animals
  of the Moroshé". **No new rig was spent**: the sand-cat still needs a night, the spine lizard a
  gait, and the **canyon tortoise** — which the lore does describe — fails the west's own law that
  nothing can be walked down. **The dustback is held exactly where job 1 held it**: named, never
  described, and inventing a shape for it is the user's decision.
- **Three skies over four countries**, all argued from the atlas: the two interior quarters take job
  1's desert sky at .0024, the West Meroshe .0032 for ten hex edges of open ocean, and the South
  Meroshe **.0046** for the fog — the one `BWh` country in the game whose air is thicker rather than
  thinner, and the only desert a traveler cannot see across.
- **Plain Maroshi and no dialect**, because the desert peoples' speech is the centre of that family
  and both dialects the game has are margins of it. **One name taken and nothing coined**: the salt
  pan is the **Malhat**, the tongue's own word for salt, the way job 1 took *vaellir* for the river.
- **The spelling: follow the atlas, *Meroshe*.** Both forms are in the archive and both are correct;
  a closing note was added to `moroshe_desert.md` saying which to use where, and the file was **not**
  renamed.
- The lore was adjusted in place on eight claims, the largest being that the desert is on the
  continent's south-west rather than its eastern face, that it **does** reach the coast on the west
  and the south, and that the fourth surface — the fan skirt and its salt pan — was missing from the
  file entirely.
- **A permanent guard was added for a mistake found in four separate files.** "These are the last N
  regions in the list" has now broken four times; `tests/region-layout.test.js` states the invariant
  it was always reaching for — PLAYABLE_REGIONS is in strictly increasing REGION_IDS order with no
  gaps — once, for every country, with no count in it.

## 2026-09-30 — The southwest, job 1: Navarth, West Pyros, the Ganesh Desert and the Ganesh Plain

Built to `docs/southwest-1-brief.md`; the whole account is `docs/southwest-1-report.md`. Terrain,
climate, water, scenery and wildlife only, and nothing that belongs to anybody. **This is the first
quarter of a four-job programme** covering Azhora's whole southwest — thirteen regions, 322 hexes —
which the user chose after asking how far "the southwest regions" reached, and which deliberately
leaves the Ibenwood forest belt unbuilt for now.

- **The block is an island, and the user chose that.** None of the four touches a built country: the
  built frontier in the west is Nethereum and Isareos, which border the unbuilt Ibenwoods. So these
  four are reached by F8 travel and by nothing else until the forest belt lands, every outer margin
  is `outland`, and the block's own internal coherence is the only standard there was. **Its datum is
  its two river mouths**, the gulf at the Ganesh Desert's north-west corner and the Vaellir's mouth
  at West Pyros's southern tip, because those are the two places in it where sea level is a fact
  rather than a choice. Jobs 2–4 inherit the same island and make it bigger.
- **This is the first true desert in the game.** Read per hex off the World Builder map, eighty-one
  of the hundred and seven hexes are **`BWh`** — hot desert — where nothing built before this was
  drier than `BSh`, and the Oves Desert's own report had noted that the map's author had `BWh`
  available and did not use it there. The Ganesh Desert's thirty-one hexes are the first country in
  the game with hot desert on every one of them.
- **And the climate is a gradient, which is the block's shape**: `BSh` × 18 down West Pyros's eastern
  columns beside the great river, `Csb` × 6 and `Csa` × 2 on two green corners — Navarth's
  north-eastern tip where the Ibenwood reaches in, and the south-eastern corner where Marosh and the
  southern sea begin — and `BWh` over everything else. **Aridity increases westward and inland.**
  `southwestAridity` blends it on the ground's own falloff and the scatter, the ground colour and the
  wildlife all read off it; measured, the steepest change anywhere is 0.157 in twenty metres, where
  the map itself puts `Csa` against `BWh` one hex apart.
- **The atlas's three odd hexes are the block's three features and every one is also one of its
  wettest.** The one `forest` hex is `Csb`; both `grassland` hexes are `Csa` and both are one hex
  from the sea. Terrain and climate agree, so each carries a feature and not a band — the way the
  West Lotharn's one `Dfa` hex became its cold head.
- **The world grew west**, from 36.20 hexes wide to **45.70**, which is more than anything has spent
  in that direction, and the Ganesh Desert alone spends it. `WINDOW.minQ` went **−33 to −41**,
  measured off the coast lattice, which turned 71 claimed hexes in six countries from sea into land —
  all of them the block's horizon and none of them its own ground. The world is now very nearly
  square, 45.70 by 45.656.
- **The lore of Navarth and of Pyros is the furthest from its atlas of anything built so far, and the
  atlas won.** `navarth.md` describes cold snowy plateau country; the map says hot desert over twenty
  of its twenty-two hexes, so the adjustment keeps the altitude, the exposure, the pastoral economy
  and the whole Fire-Memory-at-a-distance argument and changes only the weather. `pyros.md` says West
  Pyros is "the greener, wetter" half and East Pyros is in the rain shadow; the map reverses it, and
  gives West Pyros no `hills` hex at all, so its famous terraces are on the ridge at its eastern edge
  and its agriculture is bottomland. Nineteen claims across four lore files, adjusted in place.
- **One name is coined and it is not an invention.** This is the first block in the west whose
  people's tongue is actually in `azhoran_language_profiles.py`, so the great river is **the
  Vaellir**, which is `src/gameplay/skills/languages.js`'s own Pyrosi word for a river, used the way an Avon is a
  river. Two new dialects, both the lore's: `west-pyrosi` for Navarth and West Pyros (Navarth gets no
  dialect of its own because its lore makes it scrupulous about the centre's forms, not divergent
  from them), and `ganesh`, the contact speech of the Moreshi/Mittoli junction the plain sits on,
  shared with the desert, which has no speech of its own.
- **One new rig, and it was overdue: the bone-bird.** The fauna overview names it, gives it a
  two-and-a-half-metre wingspan and a bald head, and puts it exactly here — "the large scavenger of
  the desert margins... the most visible large animals of the Moreshe from caravan routes". Both the
  Oves and the Mithala had used the turkey-vulture as a stand-in for it and said so; the stand-in is
  spent here.
- **Emptiness is the answer, harder than in the Oves.** Seventeen ranges over a hundred and seven
  hexes, seven of them on the one river; **the Ganesh Desert, the largest of the four at thirty-one
  hexes, has three and two of those are birds in the air**, because its own lore says a severe dry
  year "presents a surface that appears essentially lifeless". The river fox is absent by
  measurement: the only river margin in Navarth is on an unbuilt border and the widest clear run
  behind any point of its bank is twelve metres, where a fox that never flees needs a hundred.
- **Seven stale lists**, three beyond the ones the brief named. The world-box guards in
  `region-layout`, `isareos-world` and `nethereum-world`; the `minX` pin in `west-lotharn-world`; the
  two `OWN_SKY` copies in `region-sky` and `eer-world`; and **two in `tests/mithala-world.test.js`**,
  one of them the third generation of the same "last in the list" mistake two previous builders had
  already rewritten in two other files. `open-country` passed untouched again.
- **One landmark of another country moved, and the render is why.** Growing the world west shifts
  every coarse-band terrain vertex, which pushed the Mithala's `east-mithala-gallery` from just under
  a metre buried in the drawn ground to 1.04 m. It stood on a levee crest the seven-metre grid cannot
  follow; it is eight metres further off the channel now, on the bank the gallery actually stands on.
- **`west-life`'s three failures are all somebody else's animals.** Run law by law (the chase tests
  are now very slow: five minutes for the run-down law, seventeen for the return-home one), the two
  laws about this block's own kind of animal pass and the three that fail name
  `elagos-meadow-cattle`, `feradom-country-17-98` and `oveth-herons` — the same three the last three
  builders have recorded as pre-existing. None of this block's seventeen ranges appears in any of them.
- **The colour pass took three renders and the haze was the culprit.** The desert came back as white
  sand; two rounds of darkening the ground swatches barely moved it, because at .0030 density a
  near-white haze was more than half of every pixel past a hundred and fifty metres. The desert sky's
  haze is a warm dust now (`0xc6b996`) at **.0024**, which is the clearest air in the game and is what
  a hot desert should have anyway.

## 2026-09-29 — The Mithala plain: four countries built as one landform

Built to `docs/mithala-brief.md`; the full account is `docs/mithala-report.md`. Terrain, climate,
water, scenery and wildlife only. Seven decisions worth writing down, because the next builder in
this quarter of the continent will meet all of them.

**1. Four countries, one profile, one sky, one dialect.** South, West, East and North Mithala share
forty-nine hex edges, one climate code and one river system, so they are quarters of one plain and
not four countries that happen to touch. Their terrain profiles are identical to the digit and every
difference of level between them is a landform (`mithalaTilt`), because a base or a wavelength that
differed across any of those forty-nine edges would put a step in the middle of one plain. The sky is
one for the same reason — a horizon that changed at an internal border would be a lie about a country
whose whole point is that the horizon does not change. And the dialect is one because the lore’s own
divisions here are **channels, not countries**: “they call themselves people of the Olveth Arm or the
Minoran plain… your identity is your channel”, and a channel crosses every one of the four borders.

**2. `Dfa` is drawn by the species, not the weather.** The plain is hot-summer humid continental on
all 116 hexes — the first properly continental country in the game — and the game has no seasons. So
the summer face is built and the winter is carried by what grows and grazes: tall warm-season prairie
grass and forbs, willow, black poplar and alder on the water and **not one evergreen anywhere**,
sedge on the fen margin, and a heavy cold-adapted wild bovid whose whole distribution is a seasonal
circuit. What winter should bring is written out in the report; this block, not the Oves, is where
seasons will show most, and the ground is already shaped for the flood.

**3. The world grew north, by more than any country has grown it.** −1301.17 m to **−2167.196**,
36.996 hexes tall to **45.656**, and `WINDOW.minR` 90 to **79** — measured off the coast lattice,
not guessed. It turned 329 claimed hexes in seventeen countries from sea into land, which is the
whole northern horizon: the Acor Wetlands, the Acorwood and the Oremindi.

**4. The atlas leaves one hex unclaimed inside South Mithala, and the game now holds it.**
`ENCLOSED_LAKES` (one lake, the Stillwater) became **`ENCLOSED_HEXES`** and carries terrain: (5,92)
is `hills` on the World Builder map, ringed by South Mithala on all six sides, and unclaimed. Left
out it was a hundred-metre hole of sea at 0.6 m in the middle of the flattest country in the game.
Taking it makes the plain one piece and the Lotharn’s apron the unbroken chain of five `hills` hexes
the map draws. **If a re-export ever produces a third such hex, nothing warns about it.**

**5. The biggest water in the game after the Lizeem, and it is not called the Lizeem.** The atlas
draws sixty-one new river edges in thirteen chains with one outlet. The largest is `medium` where the
Lizeem is `large` elsewhere, and the lore says the river below Minora is a set of channels rather
than one river — so it is **the main channel**, the great river’s name stays on the great river, and
the one name taken from the lore is **the north braid**. Nothing is coined: there is no Mithali
profile in `azhoran_language_profiles.py` and the lore says the name Mithala itself does not
decompose in Mittoli.

**6. A river on a flood plain runs on a floor it has laid itself.** Six of the eight channels are
drawn on a border and four of those borders are unbuilt, so up to two thirds of the hex blend along
them is `outland` at twelve times this plain’s amplitude. Before the **swale** — which levels the
ground within 45 m of every channel to the plain’s own designed surface — the west arm’s water was
forced down 6.79 m and arrived 5.3 m below the river it flows into. It is a landform and not a patch,
and the levees and backswamps go with it: **the ground is highest at the water and lowest halfway to
the next channel**, which is why the lore puts every village on a bank.

**7. One new rig, the frostback buffalo, and it is wild.** The fauna overview names it and places it
on this plain by name, and is explicit that it is **not** domestic stock — which is the only reason a
country built with nothing of anybody’s in it can carry a bovid. The river-horn, which is what the
Mithala is really about, belongs to households and is not built. The three Plains predators the
overview names — the hunt-hound pack, the grey grass-lion, the north wolf — are deliberately absent:
every animal in this system is ambient, and a grass-lion that stands in the open and backs off at a
walk is a worse lie about the animal than leaving it out.

## 2026-09-30 - Ibenwood guarded inner belt implemented

The user authorized the next Ibenwood phase: concealed, persistent ranger defenses
around the elven inner belt. This implements the existing decisions that outer
forests remain explorable, visible signs precede lethal arrows without a spoken
warning, and exceptional stealth can permit unauthorized entry. See the
[guarded-belt implementation and validation record](ibenwood-defense-implementation.md).

The current build adds boundary stones and signs, grounded ranger patrols,
individual sight and noise awareness, physical arrows that meet cover and bodies,
and combat counterplay. Taught Stealth and its level affect exposure and noise;
there is no automatic detection for crossing the boundary. Ranger health, deaths,
patrol positions and awareness persist in saves. Returning outside the belt
cancels new aim and shots; the patrols do not pursue throughout the outer forest.

**Implementation defaults, not additional user decisions:** 44 m sight range,
a 100-degree vision cone, 180 ranger health, 70 damage per arrow, a roughly
0.7-second draw tell after detection, and a 2-second shot cooldown. These are
tunable values for the first guarded-belt pass.

Permission quests, dimensional withdrawal, civilian communities, the king and
queen, building interiors, magical fauna and broader regional quests remain
future work. Further consequences for prohibited tree felling are undecided;
existing protected-tree refusal and fallen-branch gathering remain in place.
All five regions retain the Environment preview classification. Dwarfland
remains design only.

## 2026-09-30 - Begin Ibenwood implementation

The user authorized the next Ibenwood implementation phase after requesting denser
wild forest outside settled groves. The environment expansion covers the five
regions. Implementation defaults are traversable woodland with denser detour patches,
and selected canopy exteriors reached by stairs and bridges. These defaults were
proposed but not separately answered; do not record them as explicit user selections.
That environment pass established the forest and exterior settlements. The later
guarded-belt phase above adds rangers and unauthorized stealth entry; permission
quests and dimensional withdrawal remain future work. Dwarfland remains design only.

## 2026-09-30 - Ibenwood pilot feedback: denser wild forest

The user likes the representative grove pilot, but wants the wild forest outside
settled groves to be more densely wooded than the pilot. Preserve the distinction
between inhabited clearings and denser forest between settlements. This feedback
does not change the confirmed mixture of forest ages, wildlife, or elven entry rules.
This was followed by authorization to begin implementation (recorded above).

## 2026-09-30 - Dwarfland (design only)

The user places Dwarfland in West and East Baldro Mountains (spoken as
"Baldor"). Both regions remain dwarf-controlled. Dwarves have lived there for
thousands of years and built great inhabited cities inside the mountains.
Their culture is to be developed afresh; existing Azhora lore is inspiration
for human context, not a constraint on the new dwarf design.

Dwarves once dominated mountains and hills across the continent, including
Gorgi, Lotharn, Oremindi, and Suval. Elves held the forests. Their territories
were fairly equitable; they fought wars without wiping each other out.
Human expansion now threatens both peoples with extinction. The user asks
for terrain and wildlife design for the two Baldro regions, compared with
Elfland. Dwarfland implementation is not authorized yet. See the
[design draft](dwarfland-design-draft.md) for atlas constraints, proposals,
and unanswered questions.

## 2026-09-30 - Ibenwood and Elfland (one-grove pilot authorized)

The initial authorization covered one representative grove and its surrounding
forest, followed by assessment of usage, completion time, visual quality, and
corrections. The later five-region environment and guarded-belt phases above
supersede that initial limit. See the [pilot brief](ibenwood-pilot-brief.md) for
the original limited scope.
See [the design discussion](ibenwood-design-draft.md) for the confirmed premise,
proposed terrain and ecology, sources, and remaining questions.

**All four outer forests are explorable; a guarded inner belt protects Central
Ibenwood.** Elfland rules the center and the inward-facing parts of North, East,
South, and West Ibenwood. Forest Mittoli human communities remain in the outer
forest; elves rule the inner belt and heart.

**No spoken warning: visible boundary signs come before lethal arrows.** The
rangers are extremely skilled, concealed defenders. Do not add a spoken ultimatum
or warning-shot phase in place of the user's choice.

**When Elfland is present, exceptionally skilled players can sneak inside
without permission.** Consent is not an absolute entry requirement. The design
must preserve a real unauthorized stealth route into the kingdom.

**Wildlife is mostly natural outside; stranger creatures and plants become more
apparent inward.** Keep this a gradual progression through the forest.

**Elven settlements mix dwellings among branches, homes nestled around enormous
roots, and ancient stone buildings absorbed into the forest.** Individual building
designs remain to be discussed.

**Elfland has several inhabited groves with a distinct royal heart, leaving
substantial stretches of ancient forest between settlements.** Exact grove
locations, numbers, and sizes are not yet decided.

**In elven territory, gathering fallen wood is permitted; felling living trees
is prohibited.** Permission to gather does not grant permission to trespass.
Further consequences for prohibited felling remain undecided.

**When Elfland withdraws, the forest remains, but paths no longer reach Elfland.**
The user has not yet decided the conditions for withdrawal, how permission is
earned, or a connection to the Cromb Coo Coo material.

The user's new history places human arrival around 1,000 years ago, followed by
clearance of the widespread forests and elven retreat. Elfland is the continent's
only independent elf country, ruled by a powerful sorcerer king and queen. Older
draft lore does not override these instructions; discrepancies are recorded in
the design discussion rather than silently rewriting World Builder.
## 2026-09-26 — Addison's quest: her sister's fire (the user's premise)

**The quest.** Addison wants the traveler to steal the fire spirit out of her rival
Subtractidaughter's lighthouse (the Elod Light). The fire spirit is loosely inspired by
Calcifer in Howl's Moving Castle. Two ways to get it: stealth (though the spirit is dangerous
to touch), or fighting past Subtractidaughter and the Elodi guards. Addison gives the traveler
a key to a secret passage into East Suval. **The guards attack anyone they see without a
passport.** The spirit has to be smuggled back to Addison. It has its own computer autoplay
like the other side quests.

**Subtractidaughter is very strong** and wields a handheld grandfather clock as a wand; she
casts time magic through it. One spell to start: it slows the movement of whoever it hits,
for a while.

**Time Sorcery is begun, and not learnable by the traveler yet.**

What was built to those (src/content/quests/rival-light/rival-light.js, src/content/quests/rival-light/rival-light-host.js; my choices are marked):
the spirit is **Sovik** (name from the Elodi profile's sun root, *sov*); he replaces the
stepped lens the earlier version of this quest had, and the boat crossing is gone. The passage
is an old smugglers' door through the limestone ridge between West and East Suval, east of
Addison's light (my placement). Lifting Sovik burns 30 health, never the last point; carried,
he glows and the watch sees half as far again (my numbers). Two Elodi guards keep the Elod
Light's yard at night, one at the gap by the winch and one on the land side, and a postern in
the yard wall behind the land guard is the quiet way in (my layout); Subtractidaughter sleeps
in her blockhouse and comes out when the watch is roused. In a fight she **yields at one point
of health rather than dying** (my choice: she is Addison's twin). Her strength is her own
(320 health, heavy clock blows); the guards take East Suval's level like every fight. Slow
leaves whoever it hits at 45% pace for about four seconds at her level. The endings are the
three the lens had, rewritten for a fire: keep him in the Suval Light, give him to the Svaleen
Conclave, or let him go. Nobody issues Elodi papers yet.

## 2026-09-25 — no unsolicited hats

**Characters are hatless by default.** Add a hat only when the user explicitly
requests one. An occupation, character role, or model preset must not imply
headwear. Preserve exceptions the user has explicitly requested.

**Martin has no hat.** His short black hair and glasses should remain visible.

## 2026-09-21 — the highwayman is a man (the user's answer, on Codex's Chapter 1 brief)

Michael asked Codex to write a Chapter 1 redesign brief, leave it in this codebase and hand it
to Claude for an implementation plan: `docs/chapter-1-redesign.md`, with its prompt in
`docs/chapter-1-claude-prompt.md`. The brief replaces the opening three-goblin raid with a
single highway robber farther out on the road, and replaces the Lauvel wolves with that
robber's gang. Codex drafted the robber as a woman, reading the spoken word that way.

**The user's ruling: make the highwayman male.** Both documents are corrected throughout, and
the correction is a requirement rather than a proposal. Nothing else about the encounter
changed: still exactly one hostile actor, still farther from the village than the raid it
replaces, still the first real fight, still the gang that turns up again in Luscia.

Nothing of the brief is built. The plan Codex's prompt asks for has not been written.

## 2026-09-21 — the file's worth, and a battle that grows (the user's answers, after the hunter's round six)

The hunter re-measured the border battle at level 2 on the repaired placement (the file used to
form up among the enemy): a traveler alone with the six men the army assigns him wins 21 of 40 at
half health, with every assigned man dead and **5 of 40 still going at the two-minute cap**; with
three, six or ten companions it is 40 of 40. Asked four things:

**The assigned men are trained a little.** An assigned soldier carries **level 15 / toughness
12** instead of the kind's plain ninety. Measured by the hunter: alone becomes 32 of 40 at 59 %
health, no stalemates, 5.9 of 6 assigned men still dead - so friends still matter, and an assigned
stranger stays strictly weaker than the weakest companion (Altun is 20 / 17). Not chosen: leaving
them plain; raising the floor from six to eight (29 of 40, no stalemates, a bigger army on your
side and "fewer than six companions" becoming a number about nothing).

**A full company meets a bigger battle.** Ten companions win the border battle 40 of 40 in
seconds, a parade. The user chose: **the enemy line grows with the size of the company** - more
soldiers, never a higher level - so that ten companions meet a fight worth ten and a full company
is still a climax. To be built and measured: the size of the line at each company size is the
hunter's number, not a guess, and a short company (the floor of six, filled) must meet exactly
the battle measured above. Not chosen: the walkover as its own reward; parking it.

**The arrow cap stays at forty.** Forty spent shafts may lie on the ground at once; in a long
standoff the rest are dropped silently. A few dozen to walk over after a fight is plenty, and the
cap keeps the world tidy. Not chosen: raising it to about 120.

**No paid Electron run today** to drive a companion's death through a real save. The module
tests cover the lifecycle; the real-save check waits for the next milestone batch.

## 2026-09-21 — what an arrow meets (the user's answers, after the hunter's round on bows)

**Arrows hurt whoever they hit.** Real friendly fire, the traveler's and Jerry's alike. Offered and
not taken: passing through friends, and friends blocking a shaft unharmed. What follows from it,
decided by the coordinator: an arrow is stopped by the first body in its path as it is by the
first tree; a friend it strikes is hurt by it, and a companion killed by it is dead for good, his
death recorded as every death is (where, and what: the traveler's arrow), so the truth the
Marshal is given is that truth. An ally who shoots does not loose while a friend stands in his
line. The man struck remembers it; a companion killed by the traveler's arrow costs every living
witness a rung, as a lie does.

**Enemies come after an archer.** Shot from where they cannot reach, enemies leave their own
ground and chase the traveler anywhere inside the fight's outer limit; past that limit it is a
retreat, as it already is. A bow buys a few free shots, not a free battle.

**Mallec charges.** If his target stays out of reach for a few seconds the ogre makes a short,
fast charge with a clear tell that can be stepped out of. It keeps him a timing fight, and it is
the rule for other big slow creatures later.

**A second gift: a fine steel cap** when the traveler's side pays him after the day-after fight,
from whoever already pays him in that scene.

Decided by the coordinator alongside: pausing or losing focus at full draw lowers the bow and
keeps the arrow; a blow that eats a draw says so; an arrow is stopped by ground that rises above
its flight.

## 2026-09-21 — seven open questions, settled (the user's answers)

**Smiths are named for the smiths of myth.** The user's words: "Name them things like Vulcan and
other mythical terms for smiths." This is a naming register of the user's own, and it covers every
smith and armourer in the game. As assigned and approved: the Tidehaven village smith is **Vulcan**;
the army armourer at the Moros camp is **Wayland**; the new armourer in Ambron City is
**Hephaestus**; and Mern in Ostel is renamed **Goibniu**, so that every smith follows the rule.
Later smiths draw from the same well: Ilmarinen, Brokkr and Sindri (brothers), Tubal-cain, Svarog,
Kothar.

**The capital sells better gear, and your army rewards it.** Wrought iron and steel are sold by
Ambron City's armourer even though Elagos is an easy country: a capital is the exception to "a
smith sells what his country's level allows". Fine steel is not sold there; the side the traveler
signed with gives it as a reward for service, beginning after the border battle. The rule for
every other smith is unchanged.

**Tiers 5 and 6: the user will name them.** Avite bronze was offered for tier 5 and not taken.
Both stay unnamed and empty until the user gives the names.

**Jerry teaches by shooting at a mark.** He cannot spar - two archers at three paces is not a
lesson - so he sets up a straw target and the traveler shoots at it from a distance. It pays Bows
up to his ceiling, as sparring pays the other weapons.

**The border river of Isareos is the Isa.** The atlas draws one river there and the lore names one;
they are the same. Isamouth stands where the Isa joins the Lizeem at Isareos's south-east corner.

**Eer's two channels are the North Channel and the South Channel**, plain descriptive names, which
is how the lore says Eer names things.

**The Toll House is Drent's tenth named ground**, charted like the other nine, so Silas Garrow's
spot by the stream is on the map and counts toward charting Drent.

## 2026-09-21 — the army fills your file (the user's answer)

With the hold lifted the hunter measured the border battle at level 2 for a traveler alone and
with three companions, across every kit a smith sells and every level the game can give: nought
wins in forty in every row, the absolute ceiling included, because eight soldiers land a blow
every 0.3 s and a dodge is affordable every 1.9 s. Numbers on your side decide that fight, not
gear. Asked what should happen to a traveler who arrives with too few companions, the user chose:
**the army fills your file.** It is the army's battle; if fewer than about six stand with the
traveler, his commander assigns ordinary soldiers to make up the number. They are weaker than
companions, so friends still matter, and nobody meets a wall on the main arc. The number is to be
measured, not guessed. The same holds for the day-after fights, and for whichever side the
traveler signed with. Not chosen: a general rule that only a few enemies press the traveler at
once; easing the battle for a short company; leaving it and telling the player to recruit.

## 2026-09-21 — bows, the border battle, and the Nethermere (the user's answers)

**The first bow is Jerry's spare.** When Jerry comes to like the traveler he gives him his spare
bow with his first lesson: a named, given weapon, and the thing that shows the traveler the bow
at all. Nobody else hands one out. **The smiths sell arrows** - the Tidehaven smith, Mern in Ostel
and the camp armourer add them to their boards; there is no fletcher. Decided by the coordinator
around those two: with a bow in hand the swing button is held to draw and released to loose (no
new key); an arrow is a thing that travels and the first solid thing stops it; about two in
three can be picked up again; Jerry shoots as an ally; no enemy archers yet; fights only, with
the door left open for hunting.

**The border battle's hold is lifted to level 2.** The hunter measured it over forty seeds a row:
at level 0 a company wins it alone (ten companions, forty of forty, fifteen seconds, the
traveler standing still); at level 2 with six companions it is thirty-six of forty, about two
companions dead, and nought of forty if the traveler never swings. Seven companions come for the
asking, so that is what a player arrives with. If a full company of ten is to stay a climax, the
lever is the size of the battle, not the level - not asked for yet.

**The Nethermere is a spring flood over meadow, not a lake.** The atlas has `lake` and `wetland`
and uses neither in Nethereum, and the atlas wins. The lore is rewritten so that the Nethermere
is a shallow sheet of water that spreads over the basin's grass each spring and is gone by
midsummer. It keeps the Nethrani, the Flood Council, the Flood Recall and the cattle, and loses
the fishery, the reed-grain and the reed goods. Nethereum may now be built. Still open: whether
the one river the atlas draws in Isareos takes the lore's name, the Isa.

## 2026-09-21 — the company rides when you ride

The user, from the Nothom stable yard with Chris standing beside the horse: **"My companion
should also get a horse."** The rule as briefed to the builder: when the traveler rides, everyone
walking with him rides. The company has horses from the moment he owns one; their mounts are a
function of his riding state and of who walks with him, so nothing new is saved; stepped down,
their horses are picketed beside his and come when his is whistled; nobody fights from the
saddle, so whatever brings him down brings them down. Each horse has its own natural coat and
none is named.

## 2026-09-21 — normal mode, and a tentative hard mode

**The game we build and test is "normal", and it is all in English.** The user is switching off
the linguist skill and all its translations in the game as played: speech and signs are in
English, and nothing teaches or pays a tongue. The code is kept, reserved for an **optional,
tentative hard mode** that a player could set instead of the default. What else hard mode holds
is to be worked out over time; for now the one thing known is that **hard mode has the linguist
skill in it**. Keep developing normal mode, and do not build out or test hard mode
(`docs/hard-mode.md`).

## 2026-09-21 — the atlas is the authority

**"Favor the atlas over what the lore says. Adjust what the lore says to fit the atlas."** Where
the World Builder atlas (hex ownership, per-hex climate, rivers, coasts) and the written lore
disagree, the game is built from the atlas, and the lore file is rewritten to fit it — minimally,
in its own voice, changing only what the atlas contradicts. It came up over the six new countries
(`docs/six-regions-brief.md`): Isareos is landlocked, as the atlas draws it, not the sea coast the
lore described; Ovesos is hot steppe, not cold apple country; the Oves Desert lies where the map
puts it. What was changed in the lore, claim by claim, is in `docs/lore-adjusted-to-atlas.md`. The
lore lives in the user's World Builder repository and is edited there in place and left
uncommitted for them to review; nothing is ever committed there on their behalf.

## 2026-09-21 — companions (the user's answers to `docs/companions.md`)

**As many as will come.** There is no limit on how many of the ten walk with the traveler: you
may arrive at the muster with most of the company behind you. (The builder had proposed one on
the road and two after; the user chose the generous end.) What follows from it: they walk in a
file behind you and close up to single file on narrow ground; one of them speaks for an event,
not all of them; they are allies in every fight, which is the design's own answer to hard
country — and the price is that each of them can die there, and stays dead.

**Kristen comes if you know the road.** Her condition stands: she will not leave Jerry and
Ciarán unless you have charted it. It is the one recruitment that has to be earned, and it makes
cartography matter to the story.

**When the company musters short, the Marshal asks you what happened.** A short conversation,
once for each who is missing, and what you say is remembered — by him and by the company. A lie
is possible, and those who were walking with you when it happened know it for one.

**A dead companion's weapon lies where they fell, and you can take it.** It stays on the ground
there, marked, until it is picked up, and it is a named weapon — "Eliana's greatsword" — which is
what the combat brief says a given weapon should be.

## 2026-09-21 — the country's wall (coordinator's hold, the user's to lift)

The bug hunter measured combat phase 2 against the main arc (`docs/known-issues.md`): fair through
Luscia, not at level 2, because the traveler grows in a straight line while the country
multiplies. The design's own arithmetic (`docs/combat-brief.md`) closes that gap with gear and
with company, and neither exists yet. So, **until smiths, armour and companions are in, the
story's set-piece battles with armies in them — the border battle and the day after — are
authored at level 0, as they were tuned.** Everything else takes its country's level, Mallec
included: he is a toll before he is a fight. This is a hold, not a retune: no number in the
`ARMS` table or the ladder has changed, and it is one constant to lift.

## 2026-09-21 — names, and go-aheads

**Names, in the user's spelling: Cromb the Barbarian (never "Crom"), and Kristen (never
"Christin" or "Christian").** Ids keep their old spelling (`merc-christin`); what is on screen
and in the docs does not.

**The combat design is approved to build** (`docs/combat-brief.md`), and the user may tweak it:
keep its numbers in one table.

**The eleven character profiles are good for now**; the user may tweak them later. Nobody needs to
ask again.

**Chris Scotwood may stand dead-centre in the sail-in shot.**

**The long road is being built**, by its own builder, from `docs/drent-long-road-build.md`.

## 2026-09-21 — the long road through Drent, as built

**The five questions of `docs/drent-long-road.md` are answered and built.** First is guaranteed
(Ed the Word waits out twenty-five minutes on the shingle); Chris can die in Drent and the
interpreter is a role rather than a man; the march is the traveler's choice at the camp; Hesta
Ardry may give archaeology's first lesson at Rena; and Silas Garrow moves to the Toll House
stream while the marl pit under the Weatherhead stays his. The rulings are written out in full in
`docs/drent-long-road.md` under *The user's answers*.

**Jojo's three corners is a lesson, and it is keyed to ground walked.** The design's leg 1 has her
ask for the pier, the Weatherhead and the Koopwood charted. The chart cannot *name* the last two —
neither is a landmark or a named ground — so the errand is keyed to the fog's own answer at each
of the three points, which is what walking to a corner means. She countersigns on the return, once,
for a block of cartography. (Coordinator's ruling, 2026-09-21: it was in the approved design and
its absence from the build brief was an omission rather than a decision.)

**Two things the ground refused, and what was built instead.** Odger Pell stands at the bench side
of Fernway Rest, not beside the cairn, because the cairn is inside the pileated woodpecker's home
ground and inside the band the company walks in. Silas Garrow stands at the crossing stones a
metre off the stream, not at the Toll House's own centre, because the toll house is a stone box
with walls and a teacher needs five clear metres to be talked to in.

**Open for the user, and since answered:** whether the Toll House stream becomes a tenth named
ground on the chart. It was the one long-road stop the chart had no name for. **Answered yes**
on 2026-09-21 (the top section) and built: `the-toll-house`, Drent's tenth, small because the
Caloss Bank's reach comes within twenty metres of the stream crossing.

## 2026-09-21 — fighting, and the day

**Combat skills are divided by weapon: you get good at what you carry.** Blades, Heavy arms,
Polearms, Staves, Bows, Shield, and a shared Toughness, all on the 99-level table. Each of the ten
mercenaries carries a different weapon, so each is the teacher of theirs: the company is the
faculty. (`docs/combat-brief.md`)

**Levels widen the margins and never replace timing.** More damage, health, wind and a more
forgiving dodge; a level-1 traveler with perfect timing can still kill a level-8 monster, slowly,
and one mistake ends it. Hard country is dangerous, not locked. Tells never scale.

**Gear is bought, found and given — for now.** No crafting yet, but the user means to add a skill
for it later and sees nothing wrong with a long skill list, since not every skill is necessary.
So gear is designed in material tiers that a later Smithing skill can make (geology already finds
ironstone). The real cost of a new skill is filling 99 levels of it, not the length of the list.

**A full day and night is 48 real minutes**, about 32 of daylight and 16 of night, and the
traveler lands at first light. On that clock Lakota lands a minute after nightfall and Eliana at
first light on day two. (`docs/day-night-brief.md`)

**Mus's wild route is long, and he cannot beat the road.** He keeps his whole draw, thirty seconds
before the traveler included, but his route is read at last, keeps off the main road, and is
honestly longer: a traveler who walks straight to the muster is always in first. He can be found
in the woods. (2026-09-20; the detail is in `docs/drent-long-road.md`.)

## 2026-09-20 — foundations

**How the traveler gets stronger: all three at once.** Combat skills that level by use on the
same 99-level table as every other skill; gear that improves (better weapons, and armour, which
does not exist yet); *and* the company you keep — companions, allies, a side's soldiers — so that
hard country is survived by who walks with you as much as by what you have become. A fusion, not
a choice. (A design brief for combat skills and gear is owed before anyone builds it.)

**Magic: late, from the sage.** Magic exists and is witnessed from the first hour — Al the Tun,
Ed the Chameleon, Puck, the dragon in the box — but the traveler cannot do any until the sage
teaches it after the arcs converge in the South Oremindi. It is the reward for reaching the real
story and the tool for the level 8+ country. Al the Tun's sorcery is something you watch.

**Death: any fight, anywhere.** A companion can die in any fight — wolves on a night road as
surely as the border battle — and stays dead unless the player reloads. Deaths change the plot
but not the main arc's direction.

**Day and night: a real cycle that changes the world.** Night is more dangerous off the road
(Luscia's wolves hunt in packs at night), some birds and animals are nocturnal, villagers go
indoors, Batman is a creature of dusk, camps and inns matter. (A design brief is owed before
anyone builds it.)

## 2026-09-20 — the company of eleven

**The default hero is Cromb the Barbarian** — spelled with a *b* — **and he is a blank slate on
purpose.** He has no written past; the player's choices are his character. The other ten have
arcs; he has yours.

**Ed the Word's old crew are the rebels at Peblos.** The brief hides a rebel ship in a Peblos sea
cave, preparing to attack the Ambroni fleet there. That ship is Ed's, under the mutineers who put
him over the side at Tidehaven. His arc and the Peblos faction quest are one story, and whichever
side the traveler takes at Peblos is also a verdict on Ed.

**Mus is the sage's eyes.** He is watching the eleven for the one worth recruiting against
Thalmagar. If he travels with you, the sage in the Oremindi already knows your name; Mus is how
the late story reaches back into chapter one. He never says so.

**Eliana is a splice: the surveyor with someone else's name** (2026-09-21; the Surveyor and the
Daughter, the Creditor dropped). Born in Ambron to a marshal of the old emperor, sent abroad at
twelve "for her education" the year her father fell. She has come home the only way nobody checks,
on a mercenary's papers under her mother's name. What the education made of her is a scholar of
old stone, from a Pyrosi academy that stopped paying when Pyros started falling: she measures
ruins for a book nobody commissioned, the glasses are for inscriptions, she corrects people's
dates, and the greatsword is how a scholar crosses a war with her papers in order. She keeps two
secrets. Her name: she knows the Empire's forms of address too well and catches herself. And what
the stones say: every ruin she has surveyed is older than the empires, and they all face the same
way, north-west. She came home for that as much as for her father; the line the ruins draw runs
through the country she was sent away from. Her fixed line stands ("I would have come sooner, but
the boat I wanted was not the boat that was leaving"): the boat she wanted was going home. At the
fork her loyalties are the hardest in the company: the Republic's renegade prince was her
childhood friend, and the army is her father's life's work. On the road she takes archaeology
deeper than Lakota does.

**Anyone can be the player.** Eleven playable characters, Cromb first, then Chris Scotwood, Ed the
Word, and on through the company; the ten not chosen are the NPC roster. Starting skills differ
by character (Lakota's birding, Chris's Ambroni). The full character profiles are still to be
written by the user.

**The company share a working tongue: the language of the contract.** All eleven were hired
abroad on the same contract and sailed or rode here together, so every mercenary is readable from
the first minute, whoever the player is; it is the locals the traveler cannot follow. Their
origins and home tongues stay as data — that is who they are, and the toggle may still show it —
but they no longer hide what the company say to each other. Chris Scotwood is not special here any
more: he still interprets the *locals* while he is beside you, and when you are Chris nobody
needs to.

## 2026-09-20 — the world

**Ground outside every region outline is "open country".** Half of the walkable west lies outside
the outlines the atlas draws. `regionAt` stops snapping it to the nearest region: off every
outline it answers nothing (or an "open country" sentinel), and the region card, the minimap
caption, the autosave-on-enter, the map tutorial's first-province check and the chart all say so.
The ground itself does not change. (`docs/known-issues.md`, "Half of the walkable west…".)

**Open country has a shore fringe of 76 m.** *Coordinator's reading of the ruling above,
2026-09-21 — not a new answer from the user, and open to being overruled.* The ruling was about
the unowned west, which runs up to a kilometre past the outlines. It was not about a country's
own coast: the atlas is drawn in 100 m hexes and the world is built in metres, so Drent's beach
carries on east of the last hex Drent owns, and 1,055 standable cells of Tidehaven's own strand
— including the Weatherhead, where Cabe sits — were being called "Open country" in sight of the
pier. So `regionAt` gives an unowned point to the country beside it when it lies within 76 m of
that country's nearest hex centre, which is 26 m past a flat edge, about a quarter of a hex. 76
is measured, not chosen: the smallest whole metre that takes in every standable cell of Drent's
built coast (worst: the south-east strand at (25, 127), 75.86 m). It does not touch the west —
every pinned point there is still open country — and it moves the share of the walkable west
outside every outline from 53.1% to 50.4%. It changes only what the traveler is *told*: the
scatter still asks whose hex it is (`hexOwnerAt`), so the built world is byte-identical, and
`insideRegion` stays strict. (`docs/known-issues.md`, "Amended 2026-09-21: a shore fringe".)

**The Moros Horizon fence stays, as the army's line.** It stands where it is, 272 of its 344 m
inside Nesdor, as an Ambroni line inside a country the Empire does not hold. Only its name, its
minimap label and the build-status text change to say so. Nothing moves.

**The difficulty ladder** is `docs/difficulty-ladder.md`: every atlas region, 0–11. The level is
shown as *words* on the region card at first entry; the *number* appears only in the cartography
journal once the region is charted — discovering it is part of the cartography skill. The
level-11 hidden island is a **new island to be added to the atlas**, not the Cold Stones.

**The chart is dark.** Unknown country is near-black; known coastlines read as a lighter
silhouette with no interior and no label; explored ground shows the real atlas. At the start:
Tidehaven, the coast Feradom → Pueth → Drent, and the coastlines of Luscia, East Suval and West
Suval; only Drent is named.

**The first person you speak to is Jojo, the harbourmaster**, at the head of the pier. She gives
the letter of introduction and a rough chart, and giving directions is the first cartography
lesson. Chris Scotwood lands with you and gives the soldierly advice.

**Languages.** Nobody in Azhora speaks the traveler's language and the traveler starts knowing
none of theirs. Chris Scotwood interprets while he is with you and you learn faster beside him;
every new land is a new tongue to climb. Writing too: signs are in the local tongue until learned.
A toggle shows any line in the local tongue. The player never has to learn a word.

**The first conversation of the game is how the interpreter is taught.** The man off your boat —
Chris Scotwood, or Cromb when you are Chris — walks up the pier at your shoulder from the moment
you take control until the letter is in your satchel, so Jojo is glossed while she gives it to
you and you learn what an interpreter is for by being handed one. When the letter is taken he
says his piece and goes back to the roster, his hour at the landing starting from that moment
rather than from when the boat tied up. When you are Chris nobody walks up glossing her, because
you have the Ambroni yourself.

**Swimming is dangerous, and a skill.** Stamina drains in the water; at nothing you drown. The
swim to Peblos is possible early and deadly if misjudged.

**Quest markers come in three kinds**: gold for the main arc, a second for plotful side stories,
a third for skill quests — distinct in shape as well as colour.

**Skills** are all on the 99-level RuneScape table, shown as a grid of tiles (icon, name, level,
bar), with a guide and log behind each tile. Thirteen so far, combat skills to come.

## Working rules

- Several agents sharing this machine must never run the full `npm test` at once (it peaks near
  3 GB and the machine has 16): agents run the test files they touched; the coordinator runs the
  full suite once on `main` at merge time.
- Local Electron test and visual-review runs are authorized without a separate approval request
  (user correction, 23 September 2026). Use isolated test profiles to protect normal saves.

## Wildlife coverage (25 September 2026)

Wildlife should be present throughout explorable woods, including the stretches away from
roads and named places. A few populated landmarks do not satisfy this. Drent now uses
resident home ranges across the province, with birds and squirrels attached to real trees.
Verify coverage across the whole region as well as visibility, fleeing, revisiting and pause.

## Character additions and the three ports (25 September 2026)

Do not invent or add nonsoldier NPCs without an explicit user request. The user is
choosing individual characters deliberately; soldiers are the stated exception.
Remove the unsolicited Port Calos residents. Keep Port Calos to its single land hex
plus the harbor, deleting overflow buildings and moving its sign closer to town.

Jess serves Tidewater Haven; Maddie, a woman with long brown hair, serves Port Calos;
Howie, a woman, serves the Peblos port. Each stays based at her own harbor, offers passage
to either of the other two ports, and can introduce swimming. None has an unsolicited hat.

## Character homes and mailboxes (25 September 2026)

When the user assigns a character a specific house, give that home a mailbox labeled
with the character's name by default. Keep it beside the approach rather than across
the door, path or quest walking route. Liz's cottage now has a named mailbox, as Cagney's does.

## Winery, Wine lessons and closed East Suval (25 September 2026)

Paradise Springs (Vaervelm Caelazh) moves from West Suval into the single Luscian
land hex immediately southeast of Port Calos, with a lane from the town. Retain
the log cabin, hall, spring and eight grape varieties; do not duplicate the old site.
Its three winemakers are Rob, MAT and KAT. KAT keeps her original appearance. Rob
has cropped gray hair; MAT has cropped black hair and brown skin. Neither has a hat.
Do not add extra winery residents.

Wine is a separate skill, not a Farming subskill. KAT, MAT, Ben, Liz and Troy can
introduce Wine, alongside the existing Lakota and Juan routes. Rob's subject is
advanced viticulture, a Farming specialty. Its Farming level 5 prerequisite is
provisional and visibly explained; these advanced lessons are not playable yet.
Show an unavailable lesson as locked instead of granting a placeholder quest or XP.

Katy now stands in Port Calos. Her new quest is for later; do not offer the old
Batman search in her live dialogue. Keep legacy save data readable. Retire the
winery's former vine-keeper host rather than leaving a duplicate among the vines.

The Peblos harbor master is Hallie (renamed from Howie), with long straight blonde
hair. Keep her ferry routes, swimming lessons and saved identity. East Suval's
closed land borders need visible physical ridges and locked passes, including the
western and southern edges, so a player cannot simply walk around the road gate.

### Rob's name and hair (2026-09-25)

Display the head winemaker as **Rob**, with short gray hair and no bun or hat.
The close crop follows his skull without the shared rounded nape tuft. KAT and
MAT keep their existing names and appearances.


### 2026-09-25 - Quest teachers return home

- Scatter similar varied thorn thickets across the authored hexes west and northwest of Nothom, keeping the existing spider den and clear travel routes. No extra spiders.
- After the reward is chosen, Ben walks home to Ambron. His named-mailbox house is beside Cagney's, on the same lane, with purple shutters and a copper sun.
- Troy is also from Ambron; after his case he takes the Cobble-Port Calos ferry and walks to his own house on Raft Street, west of the river. His house has a named mailbox, sage frontage and reading bench.
- Cagney, Ben and Troy (the user confirmed Ben, not Bill) go inside once home and paid. Knock at their door and ask them outside to talk. They stay outside while visiting, then go back in after the player leaves. Building interiors remain future work.
- Travel and residency persist in checkpoints and pause with gameplay; quest playtests reset only their own resident. Older completed quests acquire a home journey without replaying rewards.

### 2026-09-25 - Jessi of Cobble

Jessi has twelve distinct hair colors in streaks across her crown and long tied ponytail. Keep her glasses and no hat; the generic fisher beard does not belong to her. Jess the ferrywoman is a separate character.


### 2026-09-25 - Kayla, Ari and Jessi

- Kayla is a specifically requested large, kind talking bear. She walks her own honey rounds through Drent, Pueth and Luscia, sometimes visiting Liz for a little comb. The player may give her honeycomb voluntarily. She is peaceful until attacked, then defends herself with formidable strength; her injuries and death persist like those of other named residents. Her route follows actual paths and bridges, with a short swim beside the broken Caloss bridge.
- Ari keeps her brown skin and purple palette, with long black curls and a long violet dress. No hat.
- Jessi keeps the twelve-color hair and glasses. They repair carriages, carry workshop tools instead of a fishing pole, and use abundant playful slang about their trade. Their murder-case testimony and alibi concern carriage repairs and deliveries; the clue structure remains unchanged.
- Addison stands clear of the Suval lighthouse cottage, facing its open yard entrance. Solis gets a connected physical harbor with walkable waterfront piers, moorings and boats. This adds scenery and access, not extra residents or new ferry destinations.

### 2026-09-26 - Kayla's race and her cub's honey lesson

- The user authorized this redesign and its implementation. It supersedes the plan that assigned the stealth theft to Kayla: an unnamed **Bear cub** gives that lesson beside the Drent bank of the Tessen crossing into Pueth. The user will choose the cub's name later.
- Kayla waits outside Ambron's east/Ossen Gate. Ed the Chameleon stole her honey and demands a race. Accepting makes the existing Ed poof into the scene, riding a unicycle; the player rides and steers Kayla to the prophet's Caloss crossroads. Cagney may already have left on her own quest. Winning awards honey once.
- The cub teaches Stealth and asks the player to steal a particular comb from Liz's apiary. Real sight, sound, facing, and solid cover determine detection. Liz retaliates against a caught thief with one telegraphed cast of ten bee swarms, using ordinary health, escape, and checkpoint recovery. Ordinary visits to Liz remain safe.
- After the race, Kayla physically returns to her cub. Both quests can be done in either order. Only after both are complete and the bears have reunited do Kayla and her cub roam together through Drent, Pueth, and Luscia, including Liz's apiary. Neither quest alone starts roaming.
- Add distinct **Kayla** race and **Bear cub** Stealth computer-autoplay cards alongside Ben, Liz, Troy, and Cagney in Quest playtests. These demonstrations use actual movement and interactions and preserve the normal saved adventure.
- The implementation and verification contract is in [Kayla, her cub, and the honey quests](kayla-honey-quest-plan.md). Native test completion is reported separately from this accepted design.


### 2026-09-26 - Liz's cat is Olive

Liz's rescue quest, dialogue, journal, playtest card and autoplay status use the name
**Olive**. This renames the existing cat; keep the `liz-cat` identity and saved quest
progress, behavior and rewards compatible with older checkpoints.

### 2026-09-27 - Literal blank-slate residents

The user corrected the Port Calos placeholders: people whose physical appearance has not been supplied must be visually blank too. The 21 newly named residents use identical featureless neutral-gray figures, with no hair, facial features, clothing details, accessories, or individualized proportions. Their names and exact placeholder dialogue remain. Previously specified/designed moved characters and the harbor hosts keep their existing requested appearances. Do not invent provisional personal appearances for future named blank slates.

### 2026-09-27 - Catie quest playtest

Add a Catie computer-autoplay card under Quest playtests, alongside the other named quests. It starts an isolated fresh quest beside Catie, follows the highland search, chooses the peaceful Batman conversation and completes the carried tour. Pause, taking control and resuming should work like the existing quest demonstrations, while preserving the normal adventure save.

### 2026-09-27 - Short scenic Suval tour

Shorten Batman's carried tour to a scenic route through the three Suvals. He does not need to fly through every hex. Reveal every authored hex in West, South and East Suval once the player lands. Keep the history narration, first Flying lesson, Cartography reward, northern West Suval landing, physical return to the cave, pause and checkpoint behavior.


### 2026-09-27 - Natural Suval mountains and climbing status

Make Suval's mountains and hills more natural: varied ridges and shoulders, irregular bedded rock, and smooth terrain transitions. Preserve the mountain hiking routes and locked East Suval frontier. The user also asked whether climbing had been introduced; it has not. Hiking up graded paths and the Flying lesson are implemented, but no player Climbing skill or cliff-climbing mechanic exists.

### 2026-09-27 - Developer bat Tab turbo

Holding Tab makes the testing-only developer bat fly at 240 metres per second, ten times its normal 24 m/s pace. Releasing Tab immediately returns to normal speed, or the existing 72 m/s Shift boost if Shift is still held. Keep pause, terrain clearance, bounds and landing rules; do not change the scripted Batman tour.


### 2026-09-27 - Implement climbing in Suval

The user authorized a playable climbing system inspired by Breath of the Wild, with Suval as the proof of concept. This supersedes the earlier climbing-status note: gripping natural terrain, directional traversal, stamina and upward boosts, ledge rest, physical falls, and a Climbing skill are now implemented. Keep the East Suval border closed and existing walking quest routes usable. See [Climbing: Suval proof of concept](climbing-suval.md).

Claude’s East Lotharn mountain integration is available separately in the east-lotharn worktree at b108263; it has not been merged here. It has a distinct automatic scrambling policy, so its terrain and caves must be reconciled with the Suval controller before merging overlapping movement code.

### 2026-09-27 - Brandy and Jon's coastal home

Move Brandy and her boards to the coastward Saltwind Lookout clearing shown by the player. Give her an accessible cottage, Bosco's corner, and a mailbox reading Jon and Brandy. Brandy works outside mornings and afternoons, goes indoors at midday and evening, and sleeps at night; knock to invite her out while awake. Jon the Salt Sultan treats this as his own home and walks there during rare Tidehaven calls, returning to his ship before departure. His stable saved ID remains john-salt; his displayed name is Jon. Tree roots follow the rendered hillside, including the tilt of trunks.

### 2026-09-27 - Ambron between the four lakes and Jesse's carriage

Expand and relocate Ambron onto dry land between Ela, Thelas, Brul, and Ossen, preserving the water geography. Use an irregular capital layout with distinct districts, existing characters and named homes. Cagney starts at a roadside hamlet farther along the Ambron road so her escort does not grow excessively; Kayla's race may be longer. Jesse leaves Port Calos for the opposite shoulder farther west from Cagney's former crossroads. Chip recommends Jesse. Jesse teaches assembling collected carriage parts with species-specific timber, awards Construction XP, then drives the player to Ambron's Carpenter's Guild with road conversation. Jesse goes inside and answers a knock; clearly mark the future Carpenter Guild arc as not yet fleshed out.

### 2026-09-28 - Developer dragon and Azhora thumbnail

Add a testing-only green dragon alongside the developer bat under F8 > Hacks. It carries the actual player on a saddle and uses the same steering, altitude, Shift speed, Tab turbo, safe-landing and testing-save isolation rules. Keep the developer bat available. Capture the player riding the dragon through East Lotharn in the actual game renderer for the Cromblog thumbnail and social preview. No illustrated replacement for the gameplay screenshot.
### 2026-09-27 - The East Lotharn's peaks: tall, hard to climb, with passages and caves

The user: "Can you work on the East Lotharn mountains, making sure to make the very tall so that
reaching the peak is difficult and there are lots of passages and caves and such." Asked, the user
chose: a climbing rule with cliffs; peaks of about 400 m; caves empty, to explore.

- Four peaks on the atlas's three massifs: eastern ~420 m (the highest ground in the range),
  central ~325 m, western ~275 m, south-west ~240 m. The valleys (Kemrath, the col, Stonegate,
  Upper Olveth), the pass road, the inn and the iron workings are unchanged.
- The faces are cliff bands: courses 36 m high at 70-80 degrees with ledges between them, and a
  flat grass bald on each summit. Forest on the ledges up to about 280 m.
- **Climbing rule** (src/gameplay/movement/climbing.js), in the East Lotharn only: ground up to about 35 degrees is
  walked; 35-50 degrees is climbed, slower, costing wind by the metre risen, with no wind back
  until the climb stops, and cannot be started winded; steeper cannot be climbed and a traveler
  standing on it slides down; down is always open. A horse stops at 35 degrees. It is not
  everywhere because the rest of Azhora has river banks, sea cliffs and seams steeper than 50
  degrees on the autoplays' roads.
- **Passages up**: every summit is reached only by its way - ramps cut slantwise across each cliff
  (about 40 degrees, a climb) joined by ledge paths round the mountain. Without the ways nobody
  gets above ~140 m on any massif (tests/east-lotharn-peaks.test.js proves both).
- **Caves** (src/content/regions/east-lotharn/east-lotharn-caves.js): four chimneys, each bypassing a cliff band from one ledge
  to the next; three chambers (a passage and a room); and the passage to Upper Olveth, through the
  ridge between Kemrath and Olveth's head. A cave is walked on its own floor from mouth to mouth
  (the surface above is still ground); inside, the camera stays in the passage, the daylight goes
  and a lantern glow lights the rock. Nothing lives in them yet.
- The mountains draw their own ground three metres apart (the world grid is sunk under it) and are
  coloured by what the ground is: rock on the cliffs, scree on the climbs, grass on the ledges.
- The lore (geography/regions/lotharn.md) was rewritten in place to fit: old stone worn into
  courses of cliff and ledge, ramps, chimneys and limestone caves.

### 2026-09-28 — Ovesos and the Oves Desert: terrain, climate, water, scenery and wildlife

Built together on one branch (`oves`) to `docs/oves-brief.md`; the report is `docs/oves-report.md`.
One job and one module family, because the two countries share thirteen hex edges, one river basin
and a boundary that is a lawsuit in the lore rather than a line on the ground.

- **Region ids 25 and 26**, in that order after Southern Ascarth (24), in every ordered list. Both
  were already in `PLAYABLE` and in `src/dev/tools/region-survey.js`; the survey was **not** regenerated.
- **Nothing that belongs to anybody**: no Water Council and no water right, no Branch Court, no King
  Melos, no Middle Reach dispute, no market town, no mill, no irrigated grain and no channel dug to
  water it, no Sorten grazing, no herding community and none of its stock, no Telemon route, no well
  and no watering point.
- **The atlas says both countries are one climate.** Read per hex off the World Builder map, Ovesos
  is `BSh` on all nineteen of its hexes and the Oves Desert `BSh` on all twenty-three of its — hot
  semi-arid steppe, every row of both, forty-two hexes and one code. **So neither has a gradient to
  draw**, unlike Gala's three bands, and the whole difference between them is **terrain and water**.
  The code says so wherever it could be read as claiming otherwise, and the test asserts that the set
  of codes over both countries has exactly one member.
- **Ovesos is a tilt to one river**: grassland rows at **16 m**, plains rows at **10** (the
  six-regions brief's own numbers), and the Oveth along the whole south-western border with the
  **Sorten** on the Ovesian bank — a bench 155 m wide and 0.95 m below the plain, with a levee at the
  water's edge, over the river's middle reach only. A gallery of poplar, willow and tamarisk on the
  water and **no other tree in the country**.
- **The Oves Desert is a wedge with no permanent water in it.** Plains at 12 m with a 9 m basin tilt
  falling from the rim to its eastern point (22 m under the rim, 12.5 m at the point); the atlas's
  three `hills` hexes are exactly the lore's north-western rim, built as three worn crests standing
  18–22 m over their own feet; a short broken stone relief on two turned bearings, because worn rock
  is not a sine wave; **four cut channels with nothing in any of them**, each stopping clear of the
  river; and one damp reach where the gravel holds water below the surface, which is the lore's own
  exception and the only green in the country. **Rocky, not sandy: no dune and no sand.**
- **Built as the dry year**, which is what the classification means. The wet-year flush is drawn as
  the seed-bank stubble it leaves behind, and is the first thing this country should gain when the
  game has seasons.
- **Every profile in both countries is on Gala's wavelength, 320**, and the desert's roughness is a
  landform instead of a shorter wave. That is the cure for the "outland ribs" Gala reported at
  x ≈ −1900, and it works **wherever two built countries meet** (steepest 1 in 1.54 over 4,421 points
  of all-built ground there) and nowhere else: at every border either country still shares with
  unbuilt ground the chirp is `outland`'s own, 1 in 0.46, and the open country beyond is 1 in 0.41.
- **The Oveth's hand-over to Gala.** Gala left "at or above 5.38 m at (−1800, 953)". Registering the
  two countries raised the ground at that corner, so both sides rose: Gala's reach now begins at
  **7.70 m** and the upper Oveth ends at **8.01 m**, a 0.31 m drop into the rocky lower section.
  **The deep water stops short of the corner** so that Gala's own ford is not walled by this one.
- **Deep in the middle and forded at both ends**, which no other river in the west does and which the
  lore asks for twice: "navigable for light boats" by the Sorten, and "below the Sorten it narrows,
  drops through a rocky lower section" — the reach Gala built waded over rock.
- **Wildlife**: otters, ducks, herons and the *vel-caric* on the Oveth, hares and a harrier on the
  upland grass, a vulture over the dry plain; hares, the dry-plateau hawk and a vulture in the
  desert, and nothing else at all, which is the honest population of a range unusable several years
  in each decade. **No domestic stock** and **no new rig**: the spine lizard, the bone-bird, the road
  fox and the sand-cat all want models the game has not got, and the cat wants a night as well.
- **Two skies**, the first `BSh` skies in the game: Ovesos takes Gala's own steppe air, because
  Gala's northern rows are this same country with another name on them, and the desert takes the
  clearest air in the game, because the one thing a rain shadow has is distance to look at.
- **Nothing coined.** There is no Ovesi or Oves naming profile in `azhoran_language_profiles.py`, so
  every name is the lore's own word (the Oveth, the Sorten, the Oves) or plain English. The dialect
  is `ovesos`, "Inner-branch Mittoli", which is what the lore calls it; **the Oves Desert has no
  speech of its own**, which is the lore's position and not a gap, so it takes Ovesos's.
- The lore (`geography/regions/ovesos.md`, `oves_desert.md`) was adjusted in place on seven more
  claims, all of them about which way things lie: the Oveth is Ovesos's south-western **boundary**,
  not a line through the middle of it; the desert is on the basin's **south-western** margin, not its
  eastern one; its wedge opens **westward from its own eastern point**; its rim hills step west as
  they run south; and **nothing inside the Oves carries water the year round**.

### 2026-09-28 - Gala: terrain, climate, water and wildlife, nothing that belongs to anybody

The user: "start building the wildlife and terrain of Galan [Gala], North Ascarth, and South
Ascarth". Gala was built on its own branch (`gala`) to the coordinator's brief
(docs/gala-brief.md); the report is docs/gala-report.md. What was fixed before the build, and
what the builder chose where the brief left it open (marked):

- **Region id 21**; the Ascarths are 22 and 23 and Feradom 20. Every ordered list takes Gala after
  Feradom (on this branch, which has no Feradom, after the East Lotharn).
- **The seam with Northern Ascarth** (both builders hold it): base 4.0 m, amplitude .6, wavelength
  320 on the grassland/plains of the hexes on the shared border - for Gala that is both its
  profiles - no ground written outside a country's own hexes, and every hand-built landform at
  least 100 m inside. Gala's north stands higher by a landform (`galaRise`, 4.2 m, gone within
  100 m of the seam), not by a second profile.
- **The Oveth's crossing** (the six-regions brief left it to whoever built Gala; the builder's):
  its Gala reach is waded over rock for its first two-fifths below the corner where Gala, Ovesos
  and the Oves Desert meet, and is a deep-water wall from there to the Lizeem. The desert border
  stream is waded anywhere. The Oveth stops 25 m short of the Lizeem's centre line and drops into
  it, so its water never lies on the Lizeem's reed bank (which would re-roll the west's scatter).
- **The delta** (the builder's): the Lizeem's mouth is at Gala's south-eastern tip, inside the
  seam's 100 m, so nothing is shaped there. The plain's own water - one distributary rising beside
  the Lizeem's western bank - runs south-west to Gala's short shore at the south-western tip and
  braids through reed and tamarisk over its last third. Like Eer's channels, it stops where the
  beach starts.
- **A dry wash** on the steppe (the builder's): gravel, low banks, no water, giving out where the
  Mediterranean rows begin.
- **Wildlife**: black migratory geese (a new `goose` rig, the one the brief allowed) as a raft on
  the distributary's last reach; stilts, egrets, herons, gulls and grey dolphins; hares, a harrier
  and a dry-plateau hawk on the steppe; boar in the maquis. **No domestic stock.**
- **Names**: no Galan naming profile exists, so nothing was coined. The dialect is called
  **Galan**, the lore's own word. The two atlas streams the lore does not name (the Telemonia
  border stream, the desert border stream) are left unnamed for the user.
- **The lore** (`gala.md`) was adjusted in place to the atlas: the steppe is Gala's own northern
  half, its rivers are on its borders, the Ascarth border is dry. Recorded claim by claim in
  docs/lore-adjusted-to-atlas.md.
### 2026-09-28 - The Ascarth Peninsula: terrain, climate and wildlife, nobody's

The user: "start building the wildlife and terrain of Galan, North Ascarth, and South Ascarth."
Gala is a sibling job; this entry is the two Ascarths (`docs/ascarth-brief.md`,
`docs/ascarth-report.md`).

- **Ids 22 and 23**, after Feradom (20) and Gala (21), appended in every ordered list. Terrain,
  climate, water and wildlife only: no Aevis, no city, harbour, road, mound, working or person.
- **The atlas wins** (the standing rule of 2026-09-21): 13 grassland + 3 hills in the north, 18
  grassland in the south. The climate, read per hex off the World Builder map, is `Csa` on every
  grass hex and `Csb` on the three hills and nowhere else. `azhora.cmap.json` says `Cfb` for both,
  as it does for 84 of its 116 regions - a region-level default, not a reading of the hexes.
- **It is on the far bank.** The one edge the peninsula shares with Eer is the Lizeem's last,
  going into the sea; its only dry border is Gala's eight edges. A traveler reaches it through Gala.
- **The land**: a low neck at Gala's level (the seam contract: grassland base 4.0, amp .6, wave 320;
  nothing written on Gala's or Eer's hexes; no landform within 100 m of the border), then a stony
  plateau of Mediterranean grass and scrub at 10-16 m, and the lore's "highland interior" as the
  atlas's three hill hexes: two rounded rocky hills (summits 35 and 37 m) with a saddle between, and
  the third hex, which touches Gala, the low shoulder the hex blend makes of it. Wooded in evergreen
  oak with pine on the tops; green copper stain on the south hill's stone, nothing dug.
- **The coast**: cliffs 12-16 m along the whole west and round the tip; the east lower, low cliffed
  headlands and four sheltered bays with beaches where the atlas's own coast steps in a hex (the
  north bay under the Lizeem's mouth among them). The west's notches are coves in the cliff with no
  beach.
- **Wildlife**: red deer on the saddle, boar at the south hill's wood edge, hares on the plateau and
  on the finger, gulls on the west cliffs and the tip, a hawk over the hills, a harrier toward the
  tip, grey dolphins off the east shore, and the **Great White Sea-plunger** - the one new rig -
  circling off the tip and folding into the sea in turn. No domestic stock.
- **The survey window** widened from row 133 to 135, measured: the tip moves the world's southern
  edge to 2398 m and the coast lattice then reaches row 135, where Selemi's shore lies across the
  channel. North to south the world is 36.996 hexes; the guard goes to 37.
- **Language**: the Avites' speech is carried as an accent of Mittoli (`avite`) - the lore names it
  a tongue of its own and gives it no family, and the World Builder has no Avite profile, so no name
  was coined anywhere.
- The lore (`geography/regions/ascarth.md`) was adjusted in place: the interior is three wooded hills
  in the north and open grass elsewhere; the cliffs are the west and the tip; Gala lies north-west of
  the peninsula's base, not south; Aevis's promontory is on the low neck.


## 2026-09-29: trees, teaching, and Drent households

- Every live tree has a concrete species. Ordinary forest trees participate in Woodcutting with species-specific logs, visible felling, removable trunk collision, and saved harvest/regrowth state. Fruit crops, the sentient Old Tree, and kept garden trees explain their protection rather than appearing anonymous.
- Short hair means no bun or protruding nape. Martin and Killian use the short-cropped style, preserving Martin's glasses and black hair and Killian's brown hair. No unrequested hats.
- Glun returns along his outward walk to the training-dummy post after finishing the Woodcutting lesson.
- Hacks appears first in the developer tools. Ari's sunflower lesson has a named computer autoplay playtest, using ordinary planting, watering, growth, harvest and reporting.
- Ari owns the existing cottage on her left in Applegarth: named mailbox, lavender details and sunflower decorations, with the lesson beds kept clear.
- Ryan is Jess's boyfriend, with short brown hair. He fishes at Willowmere and teaches Fishing there. Their son Barrett has short brown hair and a child's build. His geography conversation names one random region from the entire authored atlas, with no menu of destinations. He stays quiet on immediate repeat requests; the saved cooldown is 120 seconds of active play. Regions already named are excluded while unknown names remain. This reveals a location/name, not every terrain hex.
- Rip is the existing yellow dog, now Jess, Ryan and Barrett's family dog. Jess retains her Tidehaven ferry role; Jesse remains the separate carriage repairer.
- Household assignments: Jess/Ryan/Barrett in a messy, colorful house; married Glun/Jojo in a moderately orderly house; married Martin/Lee Anne in a house reflecting their trades; married Jean/Stanley by the farm, while Jean keeps her current daytime place. Mark has a strange pagan-decorated house just beyond the village. Every household has its own labeled mailbox; these assignments do not yet add indoor routines.

### 2026-09-29 — The West Lotharn Mountains: the taller half, and everything carried over

The user, asked directly, settled two things before the build and they are not to be re-opened:

1. **The West Lotharn is the taller half of the range, a crest of about five hundred and fifty
   metres.** The atlas gives it twenty-five `mountain` hexes to the East Lotharn's fifteen, over
   forty-eight hexes to thirty-eight, so the West is the main range and the East reads as its
   eastern foothills.
2. **Everything carries over from the East Lotharn**: cliffs in courses, cut ramps and ledge paths
   as the only ways up, and caves.

Built to `docs/west-lotharn-brief.md` on branch `west-lotharn`; the report is
`docs/west-lotharn-report.md`. Terrain, climate, water, scenery, caves and wildlife only — **the
East Lotharn's pass road, its inn and its iron workings were built to an earlier brief and are not
copied**, and nothing here belongs to anybody.

- **Region id 27**, after `'Oves Desert': 26`, in every ordered list. It was not in the survey, so
  `PLAYABLE` in `scripts/build-region-survey.mjs` gained it and `src/dev/tools/region-survey.js` was
  regenerated (twelve lines; `LAND_HEXES` unchanged).
- **The world box did not grow**, which is a first for a region this size: forty-eight hexes and not
  one new number in `tests/region-layout.test.js`, `tests/isareos-world.test.js`,
  `tests/nethereum-world.test.js` or `tests/izol-world.test.js`.
- **Seven summits**, measured on the built ground: the crest **550.8 m** (the highest ground in
  Azhora), the north summit 448, the west shoulder 404, the east summit 321, the spur 263, the cold
  head 256, the south rampart 217. The three lesser masses are lower **because the atlas gives them
  less room**: the rampart is four `mountain` hexes in a single row against Isareos.
- **The courses are forty metres and a half** (`BANDS` period 46) against the East's thirty-six, and
  **the tree line is 345 m** against the East's 280 — two hundred metres below the crest, which is the
  lore's "within a few hundred meters of their highest summits", leaving five courses of bare stone.
- **Every relief number is the East Lotharn's to the digit** (hills 58/8/215, mountain 96/13/250),
  because the two halves share seven hex edges and are one massif: a base or a wavelength that
  differed across that border would put a step or a chirp in the middle of one range. The whole
  difference between them is the landform, and a landform is nothing at the border it fades to
  (measured: **0.00 m** of this country's lift anywhere inside the East Lotharn's hexes).
- **The col is where the East Lotharn's Kemrath runs out.** Registering this country made Kemrath's
  floor and its water end three metres inside these hexes, at 43.8 m. A river cannot stop in the
  middle of a country, so **the Kemrath reach** takes the water on at exactly that level
  (`headOf: 'kemrath-water'`; the hand-over is 44.271 m on both sides), turns north because west of
  the col the ground climbs at once, and carries it down **the notch** to the Mithala margin.
  Nothing in `src/content/regions/east-lotharn/east-lotharn-world.js` was touched.
- **The long valley** is the atlas's own: eleven `hills` hexes in an unbroken chain across the whole
  country, 953 m, flat-floored, with a divide a fifth of the way along it and a beck leaving each
  end. **The north valley** drains the massif to the Mithala plain. No pass and no road: the atlas
  gives this half neither, and the crossing is a valley nobody has made anything of.
- **The climate is `Cfa` × 47 and `Dfa` × 1**, read per hex off the World Builder map. One hex
  cannot carry a band and none is drawn; the continental hex is (−8,100), a `mountain` hex and the
  westernmost in the country, and what it got is **a name and a note** — the three-hex block it
  stands on is **the cold head**.
- **Nobody gets up without the ways.** A flood fill from the two valleys, the notch and the col
  reaches all seven summits with the ramps and ledges open and **none of them** with them shut, and
  the highest ground reached without them anywhere in the country is **98.3 m**
  (`tests/west-lotharn-peaks.test.js`).
- **Nine caves**: five chimneys, three chambers and one way right through, from the col to the long
  valley under the east arm. Nothing lives in them. Each mouth runs a few metres along its ledge's
  own contour before the line ends, because a straight tail across a ten-metre ledge walks off the
  edge of it — an eight-metre drop the moment a traveler steps out of the rock. `world.lotharnCaves`
  stays the East's alone; these are `world.westLotharnCaves`, and `src/main.js` walks both through
  one controller.
- **The same dialect as the East** (`lotharn`), because the lore's own unit is the range and its
  divisions are the valleys. **Nothing coined**: Lotharn place names are substrate in the lore and
  cannot be built from the `mittoli` roots, so every name here is plain English.
- **One course outside the country moved, and only one.** Meneth's first valley beck ran west into
  what is now this range's southern front; measured along its own trough, the floor stops falling at
  x = −1840, so the beck now ends at −1848 and spreads and sinks there. The other three are untouched.
- **One of this build's own tests caught it in the wildlife**: the boar's range on the long valley
  floor was three metres wider than the hundred and thirty a fleeing animal is run from, and is now
  180 × 120. The other two `west-life` failures name Feradom's and Ovesos's animals; they were
  measured against this base with these nine ranges taken out and failed identically, so they are
  pre-existing.
- **Five stale lists were found**, three of them beyond the ones the brief names: `open-country` (the
  Caricas probe, moved to (−2530,−220)), `isareos-world` (its sixty-metre relief ring now read on
  Isareos's own ground), `region-sky` and **`eer-world`** (two copies of the same own-sky allow-list),
  and **`oves-world`** (`indexOf('Oves Desert') === length - 1`, now "nothing was inserted").
- The lore (`geography/regions/lotharn.md`) was adjusted in place on four claims: the courses run to
  five hundred metres and the western half is the main one; which lowland the southern face drains
  into depends on where along the range you stand (Amod for the eastern half, the ridge country and
  the lake country's western margin for this one); "the southern face descends into Amod" is the
  eastern half's; and not every Lotharn pass carries a road.

### 2026-09-29: West Lotharn integration and later-region planning

The user authorized editing Claude's West Lotharn draft and integrating it into the main desktop build. The imported region retains its approximately 550 m crest, seven summits, nine caves and wilderness-only scope. Terrain continuity, the summit silhouette, forest grounding, species-aware woodcutting and actual route traversal were refined. The full account and validation results are in `docs/west-lotharn-integration.md`; those details supersede the original build measurements above.

The user separately requested a design plan for the rest of the regions, explicitly without beginning implementation. `docs/remaining-regions-design-plan.md` is that review draft: 104 atlas regions outside the integrated regional build, including the four Mithalas already underway in a separate checkout. Its ordering, loading/performance work and proposed mechanics remain plans for review, not implemented features. No work was done in the Mithala checkout or the World Builder repository.

### 2026-09-30: South Oremindi terrain and wildlife

The user requested beginning South Oremindi Mountains terrain and wildlife after the Elfland work. The implemented environment follows the atlas footprint, with mountain relief, wooded feet, alpine ground, both mapped lakes and persistent wild fauna. NPCs, settlements and quests were not requested and are not part of this phase. The implementation record is [South Oremindi Mountains environment](south-oremindi-environment.md); its height and habitat tuning are build choices rather than additional user canon.

### 2026-09-30: Minora, the occupied Caricas and independent Yunethre

The user requested a beautiful holy frontier city called **Minora** (spelling
confirmed on 2 October) at the actual Isa-Lizeem fork in **Isareos**, by the Caricas/Nethereum
crossroads. It has great white walls, a spectacular Sorcerers' Guild tower and a
grand temple. Cedric is alive there, a claimant expelled from Ambron by rebels who
installed his half-brother Willard; he has long dirty-blonde hair. Wilhelm and his
army are also here; his hair is short, almost silver-blonde, with no bun or hat,
and his expression is twisted and maniacal. Minora remains stable and well
defended. Their Chapter 3/4 story is not decided, and old notes about Cedric's death,
a destroyed holy city or Wilhelm trapped at Nylon are superseded.

Caricas begins fully occupied by the Ambroni Empire, with soldiers, a town and
farms, while retaining its separate civil-war side-story design. Preserve the
existing wooded Carica corridor and river-fox habitat beside cultivated ground.

Yunethre is an independent steppe pass between West Lotharn and South Oremindi.
Nomadic centaurs, literally half person and half horse, resist human encroachment
from Celder in the north and Isareos in the south. Elfland supports and trades with
them. Their mounted culture may draw inspiration from Mongolian nomadic peoples
without treating real-world culture as a monster stereotype. Like elves and
dwarves, they have lost most of their former lands to expanding humans.
Bane's Camp is their base; another camp in Henborth is explicitly for later.
Northern and western Isareos suffer raids, while Minora is protected.

A small western Yunethre town beside the lake below South Oremindi is neutral,
independent of Ambron, Celder and Elfland, and respected by surrounding sides.
Humans, elves and centaurs coexist there. Generic civilian names and personal
stories are not invented: guards and requested faction presence communicate the
mixed settlement. Rivers and the lake retain their authored positions.

The implementation uses the atlas spellings Isareos, Caricas, Nethereum, Yunethre,
Celder, Henborth and Ambron for voice-to-text variations in this brief.

The completed build and its desktop testing instructions are recorded in
[Frontier implementation](frontier-implementation.md).

### 2026-09-30: Country-level strategy brainstorm

After the frontier work, the user requested brainstorming an optional strategic
layer on the existing map, with countries holding regions and hexes and potentially
controllable armies. Ambron, Ascarth and Lond illustrate different scales. The
[strategic-layer brainstorm](strategic-layer-brainstorm.md) is design only:
country command, time progression, economy, logistics and campaign integration
are proposals for discussion, not approved or implemented mechanics.

### 2026-09-30: Inquest Clearlistern placement — next morning

The user identified a wooded lakeshore clearing in South Oremindi Mountains in
two attached screenshots as the future wizard's home. The wizard starts the
main-quest continuation toward confronting “Kepthamigar” (as dictated). The next
pass should add a cottage and a **literal blank-slate figure** named **Inquest
Clearlistern**, with a named mailbox under the standing home rule. Appearance and
quest development remain undecided. The user is shutting down and explicitly
requested **a note for the morning, not implementation tonight**. Placement cues
and the bounded next-session task are saved in
[Inquest Clearlistern's cottage](next-session-inquest-clearlistern.md).

### 2026-10-01: Inquest cottage authorized

The user resumed with "go ahead with that cottage." Implemented the small Long Tarn cottage, named mailbox and literal blank-slate Inquest Clearlistern at the screenshot-matched shoreline clearing. The future main-quest role is still a design note only. See [the placement record](next-session-inquest-clearlistern.md) for coordinates and scope.

### 2026-10-01: Sevron and the lost dwarf capital

The user requested design work before implementing Dwarfland. West Oremindi will be extremely dangerous wilderness with many passes and caves. Its central hidden elven kingdom, Sevron, occupies the ruins of the greatest ancient dwarf capital. Centuries ago humans besieged that capital for years, killed the dwarf king and drowned the population by bringing the sea into the mountain, ending the kingdom and driving the dwarves from the Oremindi. Elves settled the ruined city centuries later; their small powerful kingdom remains legendary and unconfirmed to outsiders. The old dwarven name and language are deferred.

The surviving Baldro dwarves remember that realm as a lost golden age. Implementation order is Baldro Dwarfland, then West Oremindi and Sevron. The [Sevron plan](sevron-west-oremindi-design.md) and [updated Dwarfland draft](dwarfland-design-draft.md) distinguish this confirmed history from proposed flood mechanics, discovery routes and social responses. No implementation is part of this request.

### 2026-10-01: Baldro Dwarfland implementation authorized

The user moved Baldro from planning to implementation and settled the outstanding
choices: Dwarfland is a confederation of independent city kingdoms; only two
survive, one in each Baldro region. Many earlier cities were destroyed by humans
or overrun by goblins. Each surviving city has active, inhabited districts beside
abandoned quarters. Visitors must earn entry independently at each city's gate.

The first implementation uses the working labels West Hold and East Hold, real
mountain approaches, two enclosed six-room interiors, unnamed dwarf guards and
civic residents, and separate exterior service tasks. Restoring the western
cairns or eastern sluices and reporting to the respective guard grants that
kingdom's admission and 30 Construction XP once. These task rewards and the
specific first room plans are build choices, not additional user canon. Both
regions appear in F8 Go Anywhere. Active interior saves resume safely outside
their entrance while preserving admission and repaired sites.

The drowned West Oremindi capital remains the greatest ancient dwarf kingdom;
its old name and language, named Baldro residents, rulers and larger stories are
still deferred. West Oremindi and Sevron are the next phase, and are not built by
this change. The preceding Sevron entry records the earlier design-only request;
this later authorization supersedes that status for Baldro alone. See
[Dwarfland implementation](dwarfland-implementation.md) for the current module map,
controls, limits and validation, and [the updated design](dwarfland-design-draft.md)
for the confirmed choices and proposals that remain open.
### 2026-10-01 - Selemis: the island across the channel, terrain and wildlife, nobody's

The user: "start working on the Selemis region." Read as every region in this programme has been
read - terrain, climate, water, scenery and wildlife, and nothing that belongs to anybody
(`docs/selemis-brief.md`, `docs/selemis-report.md`).

- **Appended last on its base**, under the atlas's own key `Selemi` (the place is Selemis and its
  people the Selemi, as `Iscare Archipeligo` keeps the atlas's spelling). Its number is
  `REGION_IDS.Selemi` and is written in that one place: other countries took the next ids on main
  while it was being built, so it is renumbered at landing. No city, harbour works, road, ship, person
  or quest: nearly everything the lore has of Selemis is the city, and the city is somebody's.
- **The atlas wins** (the standing rule of 2026-09-21): eight `grassland` hexes, `Csa` on every one,
  no river edge, fourteen unclaimed sea hexes round them. It moved neither the world box nor the
  survey window, measured: the box is the same four numbers with it and without it.
- **The crescent is the atlas's own.** Exactly one sea hex has three of the island's hexes round it,
  (-7,133), and the hex across that water is the last hex of Southern Ascarth: the lore's "concave face
  turned toward the Azhoran coast", to the degree. That bay is the harbour, with a strand of sand round
  it and a rocky head at either end.
- **Builder's choices where the lore is silent**, each labelled in the report and each the user's to
  overturn: three grass hills along the island's back (the lore's "interior hills", on hexes the atlas
  calls grassland, so lower than the peninsula's and with no wood on their tops); a table tilted up
  toward the open sea, with a cliff on every shore that is not the harbour's; no stream and no spring,
  only two dry winter beds; and seabirds and dolphins with no land animal (a hare's range was measured
  and fits; none was added, because the lore gives the island no land animal).
- **Two names taken from the Selemi lexicon and none coined**: the bay is the Seloca (a harbour) and
  the channel the Nocveth (a crossing), both `LANGUAGES.selemi.roots` in `src/gameplay/skills/languages.js`, which
  derives that tongue from the World Builder's `tennoca` profile.
- **The swim crossing was measured and not decided.** The channel is 59.7-61.0 m of water shore to
  shore at its three pinches, six metres deep. Under the swim rule as it stands a level-1 swimmer
  crosses either way and arrives having drowned for the last few metres. Whether that should be so is
  the user's decision; the rule was not touched.
- **Decided 2026-10-02: the channel can be swum.** The user: "Selemis channel can be swum." The swim rule
  stays exactly as it was, and swimming is the way on and off the island until somebody builds a boat.
- The lore (`geography/regions/selemis.md`, `geography/regions/iberos_coast.md`,
  `peoples/the_selemi.md`) was adjusted in place in four sentences: the island lies off the
  peninsula's southern tip, not south-west of the peninsula; and its interior hills are low grass hills.
for the confirmed choices and proposals that remain open.

### 2026-10-02: Optional peninsula tutorial redesign — planning only

The user requested a design plan, explicitly **not implementation**, for moving
the opening lessons to the new forested Drent peninsula. The complete draft is
[Peninsula tutorial and foundational movement skills](peninsula-tutorial-design.md).

After loading, a new game offers Start tutorial or Start game. Start tutorial
requires completing the peninsula lessons before leaving. The final teacher
list is Chris Scotwood for Walking; Jojo for the sandwich/inventory introduction,
Running and Cooking; Glun for combat; Bear (currently Barrett) for Cartography;
Jess for Swimming; Ryan for Fishing. Catch a real fish with Ryan, then bring it
to Jojo and cook it. Walking and running improve through time spent actually
moving; walking's speed cap remains below beginner running. Running consumes
stamina and becomes faster and more efficient with practice. Swimming continues
to improve through use. A distinct Stamina skill versus Running's endurance
benefits remains a design choice; the draft recommends the latter.

The user explicitly confirmed that Glun's final letter starts Ed the Word's
arrival, and that Start game skips to just after this handoff with baseline
skills and the letter earned. It does not skip to enlistment. The letter sends
the player to Tidewater Haven to join the Ambroni army. Chris independently
completes the lessons, walks to Tidewater Haven, and waits there for the player's
completion if necessary. He then leaves without waiting for Ed and ordinarily
encounters the rebel ambush alone. Preserve existing character IDs through the
voice-transcribed spelling variations; do not create duplicate Chris/Glun/Bear
characters.

The user also requested enforceable tutorial boundaries. Jess warns against
swimming away; ignoring her and trying to escape toward Peblos triggers a giant,
overwhelming sea monster, visibly revealed before it kills the player. Flying
away, including on the developer dragon, triggers an overwhelming Balrog-like
winged demon that materializes and kills the player after a readable reveal.
These encounters return the player to the tutorial. The draft recommends keeping
completed lessons and legitimate inventory/XP on recovery and removing the
restrictions at graduation. A visible land gate, exact creature art, and tuning
are proposals rather than implemented or finalized details. No game code was
changed for this design request.


### 2026-10-02: Peninsula tutorial and West Oremindi implementation authorized

The user asked to implement the peninsula tutorial and its sea/air escape
encounters, together with the existing West Oremindi/Sevron plan. This supersedes
the earlier planning-only status. The initial implementation uses the recommended
visible timber gate, Running as the stamina-efficiency skill, and a fifteen-game-
minute skip anchored before Ed's arrival. Completed lessons and possessions remain
after either boundary creature defeats the player. Glun's letter, not Chris's
training progress, triggers Ed's arrival. Existing saves retain their prior opening.

See [the tutorial implementation record](peninsula-tutorial-design.md) and
[West Oremindi and Sevron](sevron-west-oremindi-design.md). The separate
[strategic layer brainstorm](strategic-layer-brainstorm.md) remains design only.

### 2026-10-02: City map designations and Minora spelling

The user confirmed **Minora** as the holy city's name and requested that Varn and
other established cities use the same map designation styling as Ambron and
Minora. The city badge uses the existing castle symbol and parchment name plaque;
subtitles distinguish the capital, holy city, fortress city, dwarven cities and
city ruins. It does not designate unbuilt lore settlements as cities or reveal
unvisited ground. Existing `menora` discovery IDs and save references remain
stable; all visible names use Minora. Varn's map footprint follows its six real
walls. Ordinary towns and villages retain their existing smaller map marks.


### 2026-09-26 - Kayla's family is a circus

The user: "Can we make Kayla's bear family a circus family? Michael is her husband. Ava is a
daughter. Elle is her other daughter."

- Five bears: **Kayla**, the strongbear, who presses an iron barbell over her head; **Michael**,
  her husband and the ringmaster (top hat, red coat), who juggles three balls; their daughters
  **Ava**, who balances on a big striped ball, and **Elle**, who dances and twirls on her hind
  paws; and their son **Bodhi**, the cub of the Stealth lesson, who tumbles (the user: "Bodhi is a
  boy"). Bodhi stays in the family and in the quest.
- Everyone wears circus costume (ruffs; Kayla's belt, Michael's hat and coat, the girls' tutus,
  Ava's and Bodhi's party hats, Elle's plume). There is no tent: the road is the ring.
- Until Kayla's race and Bodhi's lesson are both done, Michael, Ava and Elle wait in camp on the
  grass beside Bodhi at the Tessen crossing, practising. After the reunion all five walk Kayla's
  honey rounds in one file (Bodhi, Ava, Elle, then Michael at the back); Kayla waits for anyone
  who falls behind, and a bear that dies drops out of the file.
- The family performs whenever it is together and at rest: in camp, and at Kayla's three stops
  (not while she is eating honey, walking, fighting or talking). The show runs sixteen seconds in
  every twenty-two.
- Michael, Ava and Elle can be talked to about the show. Kayla has a new "Are you with a
  circus?" question.
- Code: src/content/quests/bear-family/bear-circus.js (who, acts, camp, dialogue), src/content/quests/kayla/kayla-character.js (looks and acts),
  src/content/quests/bear-family/bear-family.js (camp, file and show; save version 2, and older saves put the circus in camp).
  Review views `bear-circus` and `bear-circus-close`.


### 2026-10-02: Compatible Smedley and circus work integrated

Imported Claude's existing Smedley and bear-family work without replacing the newer opening tutorial, regions or strategic layer. Smedley retains the requested purple robe, powdered peruke and bad breath; he has no regional errand and does not inherit Oda's conversation. Both Smedley and the three circus relatives remain in the default cast. Circus progress accepts the older mother-and-cub saves, and malformed family positions are rejected before moving any bear. Corpses preserve each bear's costume while omitting performance props. The original source worktrees remain untouched.

### 2026-10-03: Telemonia and Varn - the user's answers

Asked by question after Telemonia stage 2 and Varn landed. The user's choices:

- **Losing a fight with the Telemon**: the game's ordinary defeat. (The lore would make the traveler a field hand; not built.)
- **The standing**: forever. Once walked out, every later sighting inside the country is a fight.
- **The western rim**: watched by three Telemon standing on the terraces and at the foot of the way up to the Rothkar. They see every upright crossing on the stretches
  they face and fifteen of twenty-five overall; the user chose to leave it at three when told that closing it would take six or seven.
- **Talking**: the escort gives two curt answers while he walks the traveler out, and nobody else answers.
- **The Rothkar's landing** stays walled: the three passes are the only walked ways out.
- **Varn** stays shut for now; nobody enters until a later quest or campaign rule opens it.
- **The Lotharn pass forts** "can be bypassed by climbers": they stop walkers, and that is what was meant.
- **The eastern peak's caves**: a way was restored to the high chimney and the three doors over the Empire's ground were railed; asked whether the eastern chamber
  and the low chimney should be reopened too, the user answered "one is enough".

### 2026-10-04: The city of Mithala - the user's answers

Asked to trade four hexes so that all four Mithalas meet in one circle and to build the central city of Mithala there with
north, east, west and south districts, the user took every recommendation in two rounds of questions
(`docs/mithala-city-brief.md` has the whole design and the measured site):

- **The trade**: North Mithala's 9,86 and 10,86 to East Mithala; East Mithala's 5,88 and 6,88 to North Mithala. Built as the game
  atlas correction `mithala-city-quarters-v1`, not as a World Builder edit, so no other checkout's provenance check breaks.
- **Name**: Mithala, the land's own name; the campaign's "river-city of Mithala".
- **Who holds it**: the Cref king, at the old seat; the south's "Mithalan Empire" is what is left of Mithala, and its rebellion is the
  warlords who broke away.
- **Defence**: flood banks round every district, and a stone curtain round the Fork only.
- **Look**: dark brick of fired flood clay, pale timber and reed thatch, on stone footings; granaries on posts.
- **The sky tower**: climbable, about 40 metres, with an open platform over the whole plain.
- **Districts**: the Fork (West), the Braid Bank (North), the Quays (East) and the Ford (South).
- **Gates**: open from the start; only the king's hall stays shut until it has people.
- **Scope**: the city first and the people later.

### 2026-10-05 Live campaign and the opening political situation

The user requests a campaign view that follows the active world as quests, units and elapsed game time change it. A readily accessible geopolitical view is the next design priority; direct government remains part of the larger vision. Faction turns and decision cadence are still undecided. Continuous progression with periodic faction decisions is a proposal, not a confirmed turn system. See [the opening design](campaign-opening-design.md) and the revised [strategic layer](strategic-layer-brainstorm.md).

The campaign interface must use the **existing main world map**, preserving its geography and interactive pan and zoom. The main map stays visible and is where interaction occurs. **Do not use Frontier Command's UI** as the campaign interface; its backend logic may be useful. During development the **whole map is always visible**, starting at the whole-atlas view, and **fog of war is deferred**. Development visibility must remain separate from saved exploration and reward state.

The user further specifies **two modes over one ongoing world**: campaign government in the style of the cited 4X games, and embodied **hero mode**, which replaces a separate tactical battle mode. The player can switch between them or spend a session in campaign mode while the hero remains in a room. The campaign therefore runs while its interface is open, subject to explicit shared pause controls. The hero stays physically present and vulnerable; conquest can expose them to death, but a map ownership change alone does not establish that they died.

Unobserved battles may progress statistically without full physical simulation. If the hero walks or flies into an ongoing battle, it should load so they can participate. The proposed handoff preserves elapsed progress, surviving participants, casualties and supplies, with one resolver owning any given participant. Leaving returns the current state to statistical simulation. Completed battles remain completed; switching modes or reloading must not reroll committed losses. Exact battle rates, time speeds, unattended hero behavior, capture/death outcomes and faction decision intervals remain open.

- **Ambron** ostensibly holds Elagos, Drent, Amod, Pueth, Luscia, Moros Plain, Vastos, Meneth, Peblos and both Lotharn regions. Only Elagos and Drent are stable. Amod and Pueth have rebellious instability associated with the silver-grade political quest context; Luscia, Moros Plain, Vastos, Meneth and Peblos are destabilized. Both Lotharns are in open rebellion, with other factions' units to be specified. These conditions do not automatically remove the provinces from the Empire.
- **Minoran League** declared independence from Ambron within the past year, after the old king died, and has little military strength. Its five regions are Isareos, Caricas, Nethereum, Ovesos and Nesdor. Minora is its capital in Isareos.
- **Cedric** ruled poorly after the old king. Republicans replaced him with Willard, his younger half-brother and the constitutional monarch in the existing settlement. Cedric fled with his elite guard, infiltrated Minora and seized the city and League government by surprise. At game start **Wilhelm, the Blood Prince, has just arrived with his army to reinforce Cedric**. Their later outcomes are not decided.
- **Caricas, Nethereum, Ovesos and Nesdor** each wage a separate independence rebellion against the now Cedric-controlled League. They try to coordinate despite losing their common political center. Do not treat them as one new government or assume Cedric controls all their territory. His capture of Minora does not establish control of all Isareos.
- **Goblinland**, after the later same-day corrections, is a loose confederation of four independent allied factions in Orgmala, North Gorgi Mountains, South Gorgi Mountains and Gorgiwood. Eshtor Plateau belongs to the separate undead faction below; the earlier fifth-region and single-faction allocations are superseded.
- **Stone Fist** remains the acknowledged superior of Ambron, Mithala and Celder, despite little practical sway over these distant crowns. Ambron is stronger than Lond, maintains formal allegiance for Cref tradition and has adopted southern ways. This supersedes the older current-state assumption of an Ambron-appointed steward governing Stonefist.

The dictated names "Amil" and "Play" are provisionally Amod and Pueth, and "Moros, Planitia" is provisionally Moros Plain; no separate Planitia region exists in the atlas. The newest phrase "Valdemar's father" does not by itself revise the established family tree. Precise event intervals and these transcription details remain open. The [royal history](the-war-and-the-house-of-ambron.md) records the revised sequence without an invented new ancestor or exact journey duration. This update changes design documents, not runtime faction control or existing save data.

### 2026-10-05 Thalmagar crisis and concealed undead vassals

The [crisis and Forsaken Citadel design](thalmagar-crisis-design.md) records the user's later additions:

- **Thalmagar** is the overarching enemy of the resistance campaign and a necromancer. Early and middle campaign behavior is mustering, fortification and cautious expansion, followed by a major middle-to-late offensive. The main quest requires sufficient collective resistance: the hero wins support through local service and politics, and chooses whether to ally with or conquer neighboring powers as the world changes. The later same-day discussion reserves serving him as a future alternate player path.
- Thalmagar seeks alliance with or control over factions among **centaurs, elves, dwarves and goblins**. The particular member factions and starting commitments are not all assigned. His creation of the undead is a proposed origin; his own undead nature and detailed backstory remain open.
- **Blood Plague** is a working name for the fictional affliction that kills and produces cognizant, rotting undead. The undead have a distinct race/faction system. Transmission, cures, timing and magical obedience remain unspecified.
- **Forsaken Citadel** is a small walled town and exceptionally tall, many-storied tower at an ancient haunted site on **Eshtor Plateau**, abandoned for centuries before the duke's occupation. It is not in North Ganun. Its ruler retains the working title **Duke of North Ganun**, has relocated here and publicly claims it for Ganun. In fact he rules a separate undead faction and is secretly Thalmagar's vassal. He is undead, practices necromancy and works to spread the plague. The Citadel is design only; its exact site and structure remain unbuilt.
- **Acor Wetlands** is disputed between **Acreland**, the existing Acorwood faction, **Endevor**, and **Thalmagar's Empire**. The user explicitly confirmed that Vandor means Endevor. No sole effective controller is assigned.
- **Wilhelm is secretly undead and a secret vassal of Thalmagar.** His soldiers are disguised undead infiltrators capable of appearing as soldiers or civilians. There are observable indications, but they can pass convincingly in human society. This does not make Cedric's original guard undead. After Cedric's already completed seizure, an internal undead coup in Minora is planned for the first few campaign cycles. Exact timing, potential prevention, Cedric's fate and wider control after it remain open.
- **Secret vassals currently established, including the later same-day addition:** the Eshtor undead duke at the Forsaken Citadel, Wilhelm, and the North Gorgi goblin faction. Eshtor, the Citadel and its duke describe one establishment, not separate extra vassals. These vassals are not placed beneath one another. More hidden vassals may be added.
- **Full geography and hidden diplomacy coexist.** The ordinary diplomatic view does not initially expose those vassal ties. Hero exploration and investigation can discover the true factions and their superior; such exposure without hero investigation is intended to be difficult. A developer truth inspector may show secret records separately, without revealing them in-world.

Necromantic raising must be an explicit persistent transformation of the same person, retaining the death event. It is not a scene-reset revival or a duplicate living actor. Concrete coalition commitments, the evidence system and preparation-based crisis pacing are implementation proposals; exact rates, triggers and final victory conditions remain open.

### 2026-10-05 Northern silver quests and early undead expansion

Northern Azhora will have gradually available silver-grade political quests addressing the growing influence behind the Forsaken Citadel. The Eshtor undead lord's first major human targets are **Witherst and Riesov**. They come under pressure early in the campaign, while help from more distant human kingdoms is needed for a sustained response.

The early quests concern local people, danger, plague activity and expansion; **Thalmagar is not immediately revealed as the overarching enemy**. Hero investigation can progressively uncover the undead faction and hidden vassal relationship. The [northern silver quest design](northern-silver-quests-design.md) proposes six relief, route, witness, defense, political evidence and distant-court hooks. Their titles, precise sites and rewards are proposals, not existing playable content. Regional outcomes, evidence and actual aid remain distinct from automatic province capture or an entire kingdom joining an alliance.

The user's next clarification makes these opportunities **time-sensitive and genuinely losable**. As communities fall and their people become hostile undead, their former quests disappear and familiar people can become enemies. Territorial conquest alone does not instantly convert everyone. Evacuation and resistance can save people; retaking a town does not automatically cure its population or restore old quests. New follow-ups must be authored separately. Infection, death, raising, allegiance and quest loss are persistent events, with journal knowledge limited to what the hero has learned.

The undead advance is **slow and persistent**: Witherst and Riesov first, then East Ganun and the rest of Ganun, with Thoth another opening through West Witherst. The Eshtor faction, all four Goblinland members and both Baldro dwarf states maintain mutual peace against perceived human expansion. The duke therefore directs conquest toward humans. Peace is distinct from military passage, shared command or vassalage. Ignoring the threat entirely can eventually allow it to overrun the northern human kingdoms.

### 2026-10-05 Goblin confederation and the intended invasion

**Goblinland has four independent allied governments**, with little coordination: Orgmala, North Gorgi, South Gorgi and Gorgiwood. The latest dictated East Gorgy is provisionally matched to the existing South Gorgi Mountains; North Gorgon and Gorgywood Mountains match North Gorgi Mountains and Gorgiwood. No new atlas regions are added. All four want to invade Lond, but its wealth and strength make periodic raiding their ordinary behavior for much of the campaign. Lond's strength in this northern comparison does not undo Ambron's previously established greater overall power.

**North Gorgi is secretly Thalmagar's vassal** and spends a long campaign preparation period building a powerful goblin/orc army. The other three members remain independent allies, without automatic allegiance to Thalmagar. Ideally for him, the Eshtor undead have secured much of northern Azhora when this army becomes ready, letting it march through friendly territory toward the south.

The user confirmed **North Lond → West Lond → East Endevor → South Endevor → Acor Wetlands** as the intended corridor. From North Gorgi, an intermediate goblin region such as Gorgiwood or South Gorgi is required to reach North Lond. Eastern conquests in Riesov and Ganun do not themselves clear this route; control, access and usable crossings must exist where the army actually marches. Acor Wetlands starts disputed, not already secured for Thalmagar.

The invasion targets **Mithala and Celder**, then the main army pushes toward **Yunethre, Isareos and Minora**, with **Ambron** the later, hardest major objective. Smaller columns secure mountain approaches and continuing raiders pressure other regions. The user confirmed Nethri as Yunethre, Sarios as Isareos, and Hitasarios/Hirasarious as probably another mention of Isareos, not a separate place. Minora is a city within Isareos, while Ambron is within Elagos; Meneth is a geographic connection between those regions. Specific passes and army subdivisions remain to be designed.

Ambron's fall should be close to defeat, but no automatic loss condition is fixed. A prepared player can repel the offensive and gradually push back, potentially against a dominant worldwide enemy. The player's strategic work throughout early and middle play is to curb Thalmagar's subordinate factions, preserve potential allies and build resistance while southern conflicts continue. Wilhelm's early internal coup is distinct from the intended middle-game revelation of his Thalmagar allegiance; hero investigation can expose him sooner.

The option to **serve Thalmagar and potentially win on his side** is retained for later design. The campaign currently being developed assumes resistance to him.

### 2026-10-05 Authored scenario within the live campaign

The user clarifies that this is an intended event progression inside a dynamic 4X-style campaign, alongside the hero mode that is Azhora's main embodied game. The scenario supplies the arc: northern undead pressure and ordinary goblin raids, the long North Gorgi muster and southern infiltration, the major invasion, and resistance or counteroffensive. Hero actions and faction simulation change the route, strength, timing, knowledge and surviving participants. This design is recorded in the [campaign scenario phases](campaign-opening-design.md#an-authored-scenario-in-a-dynamic-world).

Preparation periods, conditions, warning evidence and saved outcomes are proposed event-system fields. Exact rates, dates and the ability to delay, redirect or prevent particular events remain open. A scheduled army-readiness event does not automatically conquer its route, replace defeated troops or undo saved quest outcomes. This is a design update, not implementation of the scenario or its quests.

### 2026-10-05 Continuing world after the ultimate crisis

The user wants the potential for an **indefinitely continuing live world**, including after Thalmagar is defeated. They could leave it unfolding, check on its geopolitical and personal developments occasionally, and potentially blog about the history. Completing the authored main quest should not exhaust every event or automatically stop the simulation. Hero play and campaign intervention can remain available in the same surviving world.

This remains **speculative design**, not a claim that unlimited meaningful simulation has been implemented or solved. The [living-world continuation design](living-world-continuation-design.md) proposes ongoing faction autonomy, recovery, succession, changing relationships and institutions, new disputes and stories grounded in persistent people and conditions. The aftermath preserves the war's outcomes; it does not reset borders, resurrect casualties, cure all undead or repeat the same ultimate crisis by default.

A proposed observer mode and factual dated chronicle would make unattended developments readable, with possible local export for the user's own blog. Automatic public posting is not requested. Whether the game runs only while open, continues in the background, advances while closed, or eventually uses a hosted simulation remains undecided. Hero mortality, unattended decisions, time acceleration, resource use and long-term save/history storage need design and testing.

### 2026-10-05 UI prototype and the Blood Prince's island

The user requests a **UI-only prototype**, with a way to launch and test it, rather than implementation of the campaign systems. It uses the existing authored atlas, full geographic visibility, clickable political information and explicitly scripted sample developments. The playable game and saves stay separate.

The Blood Prince's existing Thalmagar vassal establishment is now a second territorial undead faction in **West Ithzel**. Wilhelm previously controlled the entire island but left with his main army. The human Lower King has returned to **East Ithzel** and leads the restoration against the remaining western undead. The latest balance is **roughly 50/50**, with early hero intervention able to tip the outcome. Eshtor is the stronger undead faction; Wilhelm's island receives less support while he focuses south.

An undead island victory can bring pressure into Ganun sooner than Eshtor's advance; the crossing, forces and specific pace are not set. Either side's resolution of the island war precedes Wilhelm's major southern commitment. He has already arrived at Minora; the exact relation between this new condition and the earlier planned first-cycles coup remains to be authored. This adds territory to Wilhelm's existing allegiance, not another unrelated secret vassal.

The user now specifies **Minora in Isareos as the player's campaign starting location**. The UI preview follows that ruling. Moving the actual adventure opening, its tutorial and saves is outside this UI-only request.

### 2026-10-06 Minimal informational campaign map

The player remains one character; the campaign view is primarily informational. The user rejects the separate Campaign/Hero/Observe tabs and excess interface clutter. Remove the bottom timeline/chronicle for now. Retain selection, faction information and quests. Direct influence through the map is a possible middle-to-late development feature, not current scope.

Replace the earlier Realms/Control/Unrest views with **Geopolitical / Regions / Stability**. Geopolitical shows factions' current combined territory, country names and outer boundaries, without individual region names or internal regional borders. Lond's five regions form one Lond area; losing East Lond shrinks it. If Undeadland captures North Riesov, that region joins Eshtor Plateau under one Undeadland label. Regional geography remains intact beneath these changing country assignments.

Regions shows the authored region names and borders. Stability uses the regional view with condition colors. The minimal UI-only prototype includes isolated ownership snapshots under Preview tools solely to test those changes, without a live simulation, timeline or gameplay commands. Secret vassal relationships are not automatically exposed by geographical control.

### 2026-10-06 Thalmagar's starting territory

**Cudon** and **Lesser Oremindi Mountains** belong directly to Thalmagar's Empire from the opening, alongside Cape Thalmagar, Urubond and Narcosh. These use the existing atlas spellings for the user's Kudon and Lesser Ormindy Mountains. The geopolitical prototype reflects this starting ownership.

### 2026-10-06 Chapter 1 and the normal map

Use the existing Chapter 1 for the campaign-map quest example. Successful monarchist service alongside the Ambroni army conquers Solis, transferring **West Suval to Ambron**. Successful rebel/republican/Coalition service transfers **Moros Plain to Izol**, representing the Coalition. West Suval starts in Coalition hands as a distinct country allied with Izol. The outcomes are alternatives; a newly conquered province is not automatically stable.

Access the map through the existing **M** key. Its default remains **Regions**, preserving the familiar map; switch to **Geopolitical** or **Stability** within that same interface. This supersedes the earlier geopolitical-default prototype. Country inspection and Chapter 1 links remain informational. Standalone outcome previews stay separate from gameplay choices. The in-game display reads the existing chapter completion at the final report; further battle or campaign systems are not part of this UI change.

### 2026-10-06 Discovery limits and the missing conquest

The user's correction supersedes the implementation described above: the in-game geopolitical map must respect explored territory. Only developer reveal-all can expose the full atlas. Faction labels and inspectors must also avoid disclosing unexplored holdings. Stability follows the same knowledge limit.

Chapter 1 must retain the post-battle conquest of Solis. Winning the field does not give Ambron West Suval; the player follows up with the army, assaults Solis, and actually takes it. The existing Solis and Coalition Moros-outpost aftermath encounters are reconnected between the commander report and final city report. Territorial control follows their cleared assault record. Old saves that reached the final report without this capture resume the unfinished conquest rather than grandfathering an unearned territorial gain.

### 2026-10-06 The Farmlands of the Lizeem integration

The user requested integration of Claude's latest work before committing. The delivered branch is `lizeem-farmlands` at `7ecba1a`; its [design record](lizeem-farmlands-design.md), section 0, records the user's October 5 decisions and the October 5 and 6 implementation go-aheads. These decisions are carried into this shared record:

- Developer Start uses **Rollo**, a new grey-bearded wizard in a grey robe, long brown cloak and raised dark-brown hood, carrying only an oaken staff. His explicitly requested hood is an exception to the general hatless rule. He starts knowing Fireball and stands outside the Sorcerers' Tower in Minora.
- **Taleth**, Master Sorcerer, stands outside the tower, has several conversation topics, and gives the initial farming charge. His Merlin-inspired appearance is provisional; he remains hatless under the standing default.
- The farming countries are **Caricas, Nethereum, Nesdor and Ovesos**. Ovesos is not orc country. It is fertile by the river and increasingly dry inland toward the south and west.
- Add people with mythological names, backgrounds and social roles across those four countries and Isareos/Minora. The extent to which those names were intended literally remains an open design question in the handoff.
- Harvests participate in a coin economy with actual buyers and merchants. This work supersedes the older hold on developing that economic system for these features.
- The Minoran League's recent independence, Cedric's seizure of its government, Wilhelm's reinforcement and the four countries' separate rebellions remain the political setting. The degree to which the farming quests should engage with the war remains open.

The delivered defaults use staff-cast field sorcery and aim for roughly an hour per country arc; these are implementation defaults rather than new user rulings. The five builds and their unfinished details are described in [Claude's handoff](region-reviews/lizeem-farmlands-handoff.md).
