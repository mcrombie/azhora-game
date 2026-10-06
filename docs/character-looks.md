# Character looks: everyone their own person

> Historical proposal from 20 September 2026, preserved during integration on 3 October.
> This is not an approved implementation plan. Later appearance instructions in
> [CLAUDE.md](../CLAUDE.md) and [design-answers.md](design-answers.md) take precedence,
> including featureless placeholders where no appearance was supplied, no unsolicited
> headwear, and short hair without buns. The cast counts and screenshots below are historical.

A design proposal, not a build. Nothing in `src/` changed for this document. The pictures
are from the game as it stands on `main` at `f33717d` (2026-09-20), taken with the
existing review views; the contact sheet is nine of them cropped and captioned.

The problem, in your words: *"There are a lot of characters that are just repeats
visually with different names. I would like everyone to have a distinct look."*

The short version: the game has **233 named people** and **28 bodies**. Eight of those
bodies were each built as a portrait of one specific person on the Tidehaven road
(Sava, Oda, Enna, Merren, Tamsin, Hollis, Iven, Corvan) and are now worn by **155
people** across seven regions, who carry that first person's beard, kerchief, flour or
net spool with them. 150 of the 155 differ from the original wearer by exactly one hex
value: the tunic colour. The fix I recommend is not more bespoke modelling; it is to
take the parts kit the game already built for its eleven mercenaries, extend it to
the whole cast, seed it from region and trade, and hold every person to a silhouette
test. Section 3 says what that costs and what it gives up.

![The nine villagers of `cast-folk`](character-looks/cast-folk.jpg)

---

## 1. What exists now

### How a person is made

`createCharacter({ role, tunic, skin, look, armed })` in `src/content/characters/characters.js` (3,354
lines; `createCharacter` itself is 1,544 of them) builds one flat-shaded figure from
boxes, spheres and cylinders. `role` selects a chain of `if (isCustodian) … else if
(isClerk) …` blocks that add the role's clothes, hair, props and a role-keyed idle in
`makeAnimator`. `tunic` colours the cloth. `skin` colours the skin. `look` is read for
exactly two roles: `mercenary` (build, headgear, hair, jaw, garment, marks) and
`elodi-guard` (`kit: 'bow'`, `officer`). Everyone else ignores it.

Every NPC declaration in the game is one line of the shape
`person('ambron-fishwife', 'Berra Ossul', 'Fish seller', 'rise-custodian', 0x60705e)`:
an id, a name, a job, a `modelRole`, a colour. That is the whole of what most people
are allowed to be.

`batchRigidParts` then merges every mesh under each joint by material *finish*
(roughness, metalness, side, emissive, transparency) and bakes the colours into
vertex colours. Colour is free. A new finish in a joint is one more draw call. The
budgets the tests hold: local workers **18 draws / 4,200 triangles**, soldiers **30 /
7,500**, mercenaries **32 / 6,500**, Elodi guards **30 / 7,500**.

### The numbers

Counted by regex over every `person(`, `soldier(`, `post(`, `outsider(` and
`modelRole:` declaration in `src/` (the script and its output are not committed;
the method is in the report to the lead). Not counted: the traveler, animals,
Batman, Ed, the hawk, and thirteen unnamed wall figures in `src/world/life/town-life.js`.

| | |
| --- | --- |
| Human figure stands declared | **259** |
| Of which named | 238 (233 distinct people; Voss, Brulan and Orren appear in two chapters) |
| Of which generic ("Soldier", "Coalition spearman", "Elodi guard") | 21 |
| Distinct `modelRole` values in use | **28** |
| Shared civilian bodies (8 roles) | worn by **155** stands |
| Soldier bodies (5 roles) | worn by **88** stands |
| One-off bodies (15 roles) | worn by 16 stands |
| Civilian stands that override `skin` | **5** (Smiths, Silas Garrow, Toft Ellery, Livia Seravo, Nico Arrend) |
| Civilian stands that differ from their body's first wearer by tunic colour alone | **150 of 155** |

The most-worn bodies:

| Body | Built as | Carries with it | Worn by |
| --- | --- | --- | --- |
| `rise-custodian` | Sava, keeper of the rise (`journey-content.js`) | grey hair, a **grey beard**, a weathered cloak, a fieldbook in the left hand, a walking staff in the right | **34** |
| `suvali-guard` | Suval's border guards | studded jerkin, plain iron cap, spear | **32** |
| `legion-soldier` | Ambron's footmen | mail, red tabard, bascinet, heater shield | **33** |
| `shelter-keeper` | Oda, the waystation keeper | **silver temple strands**, a crossed shawl, a long skirt-coat | **27** |
| `commons-miller` | Enna, the commons miller | a rolled **headwrap**, a **flour-dusted apron**, a low bun | **24** |
| `forest-woodcutter` | Tamsin, the woodcutter (`forest-story.js`) | a **faded red kerchief**, low tied hair, a patched work apron, tools at the belt | **22** |
| `bridge-keeper` | Hollis, the crossing keeper | a bandanna, a beard, a short apron, a **hammer** hanging at the hip | **17** |
| `reed-worker` | Merren, reed worker and boatkeeper | a **net spool** on the belt, a wet hem, a soft cap | **16** |
| `relay-clerk` | Iven, the relay clerk | a desk coat with ink-stained pockets, **rolled papers** in hand, a charcoal stick | **13** |

By city, the same thing: Ambron puts 32 people on 10 bodies, Izolveth 25 on 9, Elod 21
on 7, Ostel 19 on 6, Solis 21 on 7. Ostel has six people in Tamsin's kerchief.

### The worst offenders, by name

![Fifteen people, four bodies](character-looks/repeats.jpg)

- **Sava's grey beard is on about twenty women.** The `rise-custodian` block puts a
  beard under every wearer's chin (`round(head, hairMat, [0, .06, .112], …)` with
  `hairMat` fixed at grey `0x8e8b7d`). Wearers include Sela, kneeling on the Lauvel
  burial line *looking for her son*; Neira Sarn of the King's Council; Bregga Sell,
  net-mistress of Cobble; Keeper Ilaria of the temple of sea and sun; Nerea the
  water-carrier; Sabeth Lune, whose sail loft is the hospital; Sela Imri, a scribe in
  her fourth year; Tirzah Vane the dyer; Ottilie Sarn, Sennaia Orm, Thessa Ollan,
  Mella Drusk, Berra Ossul, Kessa Orun, Wenna Sarn, Anwe, Isen Caerel, Sennet Ollo,
  Iria, Hara, Sela Vane, Ilva. Every one of them also carries Sava's fieldbook and
  staff. The priest of the Threshold in Elod carries a Drent road-keeper's fieldbook.
- **Tamsin's kerchief is on eighteen men**, including three smiths (Rook, Mern,
  Armourer Peder), two boatwrights (Hallin Orme, Old Fer), a raftsman, a sawyer, two
  mule drivers, the highland representative of Izol, and Smiths the beggar.
- **Enna's flour is on a stone-cutter** (Marek Dunn, Ambron), a capstan ganger (Bolm
  Harrick), a ship's master (Dols Brack of the *Serrow*), a grain factor, an ostler, a
  retired pilot, two carters and an army cook.
- **Oda's silver temple strands and shawl are on the gravedigger** (Old Hewe), a
  theologian (Zohar Immer), a surgeon (Neve Arral), the warden of the ice-roads, the
  keeper of the North Light, a cellarer, a drover and a corpse-bearer.
- **Seven nations of the Coalition wear one Suvali jerkin.** At Solis the captains of
  Izol, Suval, the Ambroni rebels, Selemis, Marosh, the island cities and the Pyrosi
  contingent are the same man in seven colours (`solis-town.js`). The brief is explicit
  that this is wrong: *"you see it's all culturally different. They dress differently.
  It's clear they're distinct … a bunch of other people represented in the forces"*
  (`docs/original-brief.md`).
- **The boys are grown men**: Dob the fisher's boy, Dreo Vell the tally boy, Corm the
  apprentice, and the quay runners Dunnock and Duro. There is no child frame.
- **Old Ketto, the water-steps beggar of Ambron, is Orris the doomsayer** in a
  different grey: the same deep hood, the same gnarled staff, the same beard.
- **Bettis and Wenna**, innkeepers four hundred kilometres apart, are the same woman.
  **Marek and Joss**, sawyer and timber foreman, are the same woman. **Pell and
  Dagny**, carters, are Enna in the same headwrap.

The soldiers are a different case. Uniform is correct for the army, and the kit is
good. But 33 footmen have literally the same face, jaw and build under the same
helmet, so Footman Ottar at the landing, Quartermaster Halde in the camp stores and
Footman Nabel counting barrels on Cobble are one man on three postings.

![Two footmen, an officer, a Suvali guard](character-looks/soldiers.jpg)

### Why it happened

Each shared body was made well, for one person, on the Tidehaven road, before there
were seven regions. Sava's block is a good portrait of Sava. Then `docs/content-pass.md`
told the region builders to "give NPCs these as `modelRole`", and every later region
had eight bodies and a colour picker. The people files are honest about it:
`docs/west-izol-report.md` says *"the model is `suvali-guard` for all of them."*
Nobody chose a beard for Sela. The beard came with the book.

---

## 2. What the game already does well

The twelve of `cast-line` all read as individuals, at line-up distance and in a
screenshot. Here is why, as rules the rest of the cast could be held to, each with the
trick in the code that earns it.

![Lakota, Brandy, Katy, Troy, Imani, Addison, Subtractidaughter, Bowden, Juan, Nika, John, Ed](character-looks/cast-line.jpg)

**1. Change the silhouette, not the colour.** Lakota's head is scaled `1.08` and
carries thirteen cone spikes and a hooked nose; Bowden has a domed shell and horns;
John's kaftan goes to the ankle under a five-turn turban; Katy's hair is a flat sheet
to the middle of her back with a scalloped cape over it; Brandy's skirt is seven
cylinders whose radii go `0.18, 0.28, 0.315 … 0.34` so she has hips. Every one of them
is a different black shape. Every shared-body villager is the same black shape.

**2. One prop that *is* the job, in the hand or on the head.** Troy's smoker, Imani's
shears standing out of the apron pocket with the block book beside them, Addison's
coil of line "which she does not put down to talk to anybody", Subtractidaughter's
lamp "held low and away from her face", Nika's open book, Juan's tastevin on a
ribbon. The best one rides the head:

```js
// The spyglass is at her right eye and looks where she looks: it rides on the head,
// and her hands come up to it.
const glass = new THREE.Group(); glass.name = 'Katy’s spyglass'; head.add(glass);
```

The lesson cuts both ways: Sava's fieldbook was identity when one person held it. Held
by 34 people it is wallpaper. A prop is only identity if it is *rare*.

**3. Posture is identity, and it is cheap.** Every bespoke person has a block in
`makeAnimator` keyed on `role`, eight to twelve lines, no geometry:

```js
} else if (role === 'rival-keeper') {
  // She stands entirely still, which is the first thing anybody notices about her: the lamp
  // down at the end of her left arm where it lights the ground and not her face, the right
  // hand loose, and a head that turns to you and then does not move again.
```

Juan talks with both hands, Brandy sighs, Kat punches the cap down, Imani turns a leaf
over. The game already knows that what a person is *doing* reads before what they wear.

**4. Asymmetry.** Bosco's left ear "has never stood all the way up and never will";
Kat's hair is tucked behind one ear and loose on the other; the traveler's hem is
patched on one side; Juan's quiff is off-centre; Brandy's ribbons hang on one side.
Symmetric figures look like tokens. One asymmetric part makes a person.

**5. A colour nobody else owns.** Brandy's rainbow, Ed's tie-dye, Subtractidaughter's
black oilskins, Troy's cream canvas, John's indigo-saffron-and-salt-white. Meanwhile
every colour in the people files is a desaturated mid-tone (`0x5d6f6a`, `0x6d7f7a`,
`0x7a6f5c`, `0x62705a`): the palette of a crowd, applied to individuals.

**6. Frame.** Juan is scaled `1.08 × 1.13`, Nika and Katy `0.92 × 0.93`, Bowden
`1.14`, an Elodi guard `0.93 × 1.03` with the head scaled back so a tall man is not a
long face. The mercenaries formalised this as twelve named builds:

```js
export const MERCENARY_BUILDS = Object.freeze({
  ordinary: { height: 1, girth: 1, shoulders: 0 },
  bull:     { height: 0.96, girth: 1.12, shoulders: 0.055 },
  slight:   { height: 0.94, girth: 0.9, shoulders: -0.03 }, …
```

Nothing outside the hired company uses them.

**7. Colour is free; finish is not.** The batching comment is the whole material
policy: *"bake its cloth/skin/wood colors into vertices … Metallic badges stay
separate."* A part may add any number of colours to a joint for nothing. It adds a draw
only if it brings a finish the joint did not have: metal (gold, iron, brass), a
`DoubleSide` cloth (cloaks, shawls, capes), an emissive (Batman's eyes, Ed's pipe
coal), a texture (Ed's toga, the *Sultana*'s sail), or a new animated pivot (the
cloak hem, a planted staff). That is why a hired sword with a fur mantle, a braided
beard, tattoos and a topknot comes in at 28 draws, while Oda's whole budget is 18 and
her one shawl takes a real share of it: it is two-sided and swings on its own joint.

**8. A deliberate pair.** Addison and Subtractidaughter share a face and a build on
purpose: *"the same face and the same build, cut square at the jaw and dressed in
black."* Sameness that is *chosen* is a look. Sameness that is *default* is the
problem.

**9. The mercenary kit is the proof that parts work.** Commit `da51f3c`: *"The eleven
other mercenaries were one silhouette in eleven colours … They now differ in build
first and colour second."* Twelve builds, eight headgears, ten heads of hair, seven
jaws, eleven garments, four marks, every feature in a named `lookGroup` so a test can
ask what a man wears, and a test that fails if two men share a combination:

```js
test('no two hired swords share a build, a headgear, a hair, a jaw and a garment', …
  `${name} and ${combinations.get(key)} are the same man in different colours (${key})`
```

And the garments are already regional: the gambeson is "a fen veteran's quilted coat"
(Marosh), the bandana is "a Selemi habit kept inland", the fur cap is "Pyrosi hill
fur", the wrapped kilt and tattoos are the southern islands, the wide brim is "a port
man's" (Izoli). The Coalition's costume language exists in the game today. It is worn
by eleven men on the Tidehaven road and by nobody in the Coalition.

**10. Bespoke on top of a kit body.** John, Bowden and the five players of the troupe
are all `createCharacter({ role: 'mercenary', look })` plus a `hang(actor, joint, …)`
that bolts a kaftan, a shell or a ruff onto the rig. That helper is copied three times
(`salt-ship.js`, `troupe-models.js`, `woodcutter-model.js`). It is the seam where hand
work and kit work meet, and it should be one function in `characters.js`.

---

## 3. Directions

Five ways to fix this at the scale of the whole cast. I have tried to be honest about
cost in the unit that matters here: working sessions, and lines in a file that is
already too long.

### A. Bespoke modelling per person (what the best twelve got)

Each of the twelve cost, in `characters.js`: a hair block (13–30 lines), a body block
(14–42 lines), an idle block (8–12 lines), an entry in the `hat` exclusion list, a
branch in each of the `linen`, `trousers` and `hairMat` ternaries, a review view in
`main.js`, and usually a test. Call it 60–100 lines touched in five or six places per
person. For 233 people that is 15,000–20,000 lines in one function that is already
1,544 lines long, and every new person is a merge conflict with every other.

*Gains:* the best results in the game. Troy's grin and Addison's coil of line cannot be
generated. *Loses:* it does not finish. At the rate of the last month (twelve people)
the cast takes two years. *Verdict:* keep it, for the fifteen or so people who carry
story, and only after the kit exists to put them on.

### B. A parts kit, with one authored `look` per person

Extend the mercenary kit to everyone. The axes, most of which already exist:

| Axis | Exists | To add |
| --- | --- | --- |
| **frame** | 12 mercenary builds; `slight`; Juan, Bowden, Elodi scales | women's frames (the game has none named; Nika, Katy and Brandy are hand-scaled), a **boy** frame (body 0.8, head 1.0), an **old** frame (chest pitched forward 0.06, shoulders in) |
| **hair** | 10 mercenary styles | the nine women's cuts already built for individuals, freed from their roles: Katy's sheet, Kat's tucked, Imani's bob, Addison's wave, Subtractidaughter's square, Nika's crop, Lysa's bun, Enna's low bun, Oda's low bun with grey strands |
| **jaw** | 7 | grey and white versions come free (colour) |
| **headgear** | 8 | kerchief (Tamsin's), headwrap (Enna's), bandanna (Hollis's), coif, straw hat, hood up, fur hat, sailcloth wrap, Elodi bare |
| **garment** | 11 | the apron family (Enna's, Tamsin's, Hollis's, Kat's hide, Imani's canvas, Juan's cellar), shawl (Oda's), desk coat (Iven's), jersey (Addison's), long coat, robe, smock, sheepskin waistcoat, kaftan (John's) |
| **marks** | scar, earring, tattoo, eye-patch | spectacles (`spectacles()` exists), freckles (Nika's), laugh lines (Troy's), heavy lids (Brandy's), stained forearms (Kat's must, Addison's ink, in soot / stone dust / whelk purple) |
| **prop** | fieldbook, staff, papers, hammer, spool, spoon, smoker, shears, lamp, coil, tastevin | spade, tally board, keys, mallet, net needle, bundle, bowl, sailmaker's palm, canvas bolt |
| **palette** | one `tunic` | a region pool (section D) from which tunic, trousers and linen are picked *together* |

`look` becomes a field every person may carry, read for every role; the eight role
blocks are split so that Sava's beard is a jaw, Tamsin's kerchief is a headgear,
Enna's flour is a mark. Sava, Oda, Enna, Merren, Tamsin, Hollis and Iven keep their
looks exactly, as named `look` data in their own files. Nothing they have is lost; it
stops being the default for strangers.

*Deterministic or authored?* Authored, with a generator. A hash of the id cannot know
that Sela is a woman or that a smith needs an apron, and it changes when ids change. So:
a script proposes a `look` for each person from (region, trade, sex, age, id-seed),
prints the roster, and the result is written into the people files as data, the way
the mercenary roster is. Then a test, scaled from the mercenaries' one, fails the build
if two people in the same region share (frame, hair, jaw, headgear, garment). With 6
frames × 19 hairs × 7 jaws × 17 headgears × 25 garments there are more than three
hundred thousand combinations; 233 people is not crowded.

*Cost:* about forty new parts at 8–25 lines each (600–900 lines, in a new
`src/wardrobe.js`, not in `createCharacter`); the untangling of the eight role blocks
(a real refactor, one session, protected by the existing tests and the `cast-folk`
view); the generator and the test (one session); the authoring pass over 233 lines of
data (one to two sessions, most of it reading the list and fixing the forty people
who matter). *Six to eight sessions in all.* Draw cost: zero for matte parts;
two-sided cloaks and metal stay rationed, one per person.

*Loses:* nobody outside the story fifteen gets a hand-made face. A forty-part kit over
233 people means each part recurs about six times, and you will notice the third
straw hat. And the eight originals stop being unique: Enna's headwrap will be on other
millers. That is right, because it was never hers; it is a miller's.

### C. Silhouette-first

The rule: every person must be identifiable as a black shape at fifty paces. The
practical form is not a strategy but an acceptance test: render each person's profile
(the game already renders cast line-ups, and `Box3` bounds are in the tests), compare
against everyone in the same region, and reject near-duplicates; and a design rule
that every `look` contains at least one silhouette part (frame, headgear, hem, prop,
hair length). Cheap to state, impossible to satisfy for 233 people without B.

*Loses:* some people *should* be ordinary. A crowd of silhouettes is a circus.
*Verdict:* adopt as the gate on B, weighted: silhouette-distinct within a town,
face-distinct within a conversation.

### D. Costume languages by region and trade

A parts pool and a palette per region, so a Suvali fisher cannot be mistaken for an
Amodian wall-wright even in the same body. The lore is almost silent on dress (I
grepped every regional and peoples file for cloth, wool, dye, hair, cloak, hat: nothing
usable), so these are derived from what it does say about climate, trade and belief,
in the lore's voice, and each would need your eye:

| Region | The lore says | The language (invented) |
| --- | --- | --- |
| **Drent** (Tidehaven, Lumber Town, Applegarth) | forest, river-mouth lords, fishing delta, birds, timber, apples | forest greens and bark browns, short capes, soft caps, leather; the estuary in oilskin |
| **Pueth** (Rimeholt) | cold-climate timber, hills, trappers, Drentish | fur-lined hoods pushed back, sheepskin, birch-bark, quilted bodices; the same greens gone grey |
| **Luscia** (the Lauvel, the town) | grassland, herd crossings, spring and autumn markets, wolves | undyed grey-brown valley wool, headscarves tied under the chin, sheepskin waistcoats wool-out, breeches tied below the knee |
| **Elagos / Ambron** | lake-effect winters, ice-roads, timber rafts, toll, records, the King | long dark coats with fur collars, iron-grey knots, felt caps, sledge-runner boots; **red and gold belong to the army alone**; a white ribbon on the sleeve for the republic's one day (invented) |
| **Amod** (Ostel) | terraces, water courts, goats, chestnuts, wool, stone, tools not weapons | undyed goat-hair wool, flat-crowned plaited straw hats, one knee-pad, channel knife and pruning hook on the belt, stone dust |
| **Peblos** (Cobble) | pilots, salt pans, lobster, salvage, the shrine light | oilskin smocks, kerchiefs knotted at the nape, tally boards on cords, clogs, salt-white everything |
| **West Suval / Solis** | Mediterranean limestone, wine, Laeron the sun god of "things being what they appear to be", burned in 977 | sun-bleached linen, a yellow sun disc (`0xd2b56a`, Ilaria's colour) for the temple, sandals, smoke-stained hems for the townsfolk; the Coalition garrison in seven languages (below) |
| **East Suval / Elod** | records, scribes, no images, Koleth script, the purple-whelk yard, cisterns, black guards (game's invention) | charcoal, not black, for everyone who is not a guard; standing collars; the only ornament a band of cut lettering at hem and cuff; tablet cases on straps; **whelk purple** on exactly one person |
| **West Izol** (Izolveth) | dark grey and iron-brown rock, pasture, boat-lineages, highland tribes, the goddess who *is* the island, no priesthood, oaths not paper | iron-brown and slate wool, closed mantles pinned with a chip of the island's rock (invented), grey braids, no paper in anyone's hand |
| **The Coalition contingents** | Izol, Suval, Ambroni rebels, Pyros, Selemis, Marosh, island cities | already in the mercenary kit: bandana and bare forearms (Selemis), fur cap and short cloak (Pyros), wrapped kilt and tattoos (islands), gambeson (Marosh fens), wide brim (Izoli ports); to add: the rebels' unpicked tabard, the Izoli three-peaks shield |

*Cost:* ten pools, about 300 lines of data and a day of design, plus the parts they
name. *Loses:* individuals inside a region still need B, and a pool drawn too tight
turns a region into a uniform (Elod will want watching). *Verdict:* this is the
seeding for B, not an alternative to it. It is also the only one of the five that
answers the brief's explicit line about the Coalition.

### E. Prop-and-posture-led

Keep the bodies; give every person a unique action and a unique thing in their hands.
The game already does this for 25 roles and it works. But scaling to 233 people means
two hundred idle blocks of eight lines each in `makeAnimator`, one function with a
role switch that is 425 lines today; and the fieldbook in 34 hands has already shown
that a prop shared by a crowd is not identity. *Verdict:* per-**trade** idles, not
per-person (thirty or forty trades cover the cast: a smith, a clerk, a fisher, a
priest, a carter, a sentry), and props as kit parts under B.

### What I would pick

**B, seeded by D, gated by C, with A reserved for the story fifteen and E done per
trade.** In order:

1. Make `look` universal and move the mercenary kit into `src/wardrobe.js` with the
   `hang()` helper beside it (one session). Nothing visible changes.
2. Split the eight role blocks into parts; the eight originals get their looks as
   data; the `cast-folk` view is the regression picture (one to two sessions).
3. Add the women's, boy's and old frames, the nine freed hair cuts, the apron family,
   the region headgear, the marks (one to two sessions).
4. Region pools, the generator, the uniqueness and silhouette tests (one session).
5. Author the roster: run the generator, read all 233 lines, hand-fix the forty who
   matter, starting with the Lauvel, Ambron and Solis (one to two sessions).
6. Trade idles for the dozen trades that have none (one session).
7. Then, and only then, bespoke faces for the story people who deserve them, on kit
   bodies, by `hang()`.

**What you give up:** the certainty that a person is unique in the world, which only A
gives; about a week of sessions before anything new is visible; and the eight
Tidehaven-road portraits as portraits. Sela stops being a bearded man on the first day
of step 5, and I would do her by hand in step 2 to prove the pipe.

---

## 4. Designs

Eighteen, for the cast's actual repeats. Each: who it is for, the silhouette in a line,
the thing you would describe to a friend, and the parts it needs (**kit** = exists in
the mercenary kit or a bespoke block and needs freeing; **new** = to build). Invented
cultural signs are marked so you can strike them. No new names anywhere; these are all
people the game already has.

**1. Sela, looking for her son.** *The Lauvel burial line, `lauvel-aftermath.js`; today
a bearded man with a fieldbook, kneeling.*
Silhouette: a low triangle with a covered head. The thing: she has her son's cloak
folded in her lap, and she is not looking at you. Parts: frame *spare woman* (new),
headscarf tied under the chin (Enna's headwrap geometry pulled forward, new), grey hair
under it (colour), Lauvel grey-brown wool (palette), a folded bundle held in the lap
(new, six lines), no book, no staff, no beard. Idle: the existing `kneel` posture with
the head down.

**2. Neira Sarn, of the King's Council, Ambron.** *`ambron-people.js`; today Sava in
purple.*
Silhouette: tall, narrow, a straight coat to the calf. The thing: iron-grey hair pulled
back so tight it looks painful, and a white ribbon on her sleeve that was not there
yesterday (invented: the republic's mark, one day old). Parts: long coat (new: a closed
single-sided cylinder, cheap), fur collar (mercenary fur-mantle tufts, scaled), Lysa's
knot in grey (kit), a ribbon (`ribbon()`), a rolled proclamation under the arm (Iven's
papers, kit). Idle: the officer's short point, slower.

**3. Hanun Sered, priest of the Threshold, Elod.** *`elod-people.js`; today Sava in
navy.*
Silhouette: a column; a stiff standing collar makes the head sit in a cup. The thing:
no image, no book, no beard; the only ornament on him is a band of pale cut lettering
at the hem and cuffs, and he carries his records as a slim case of tablets on a strap
at the hip. Parts: ankle-length charcoal robe (Katy's dress cylinder, kit), standing
collar (Addison's jersey neck, taller, kit), script band (a linen ribbon with dark
notches, new), tablet case (a box, new), close-cropped bare head (kit). Charcoal, not
the guards' black, so a priest and a guard read apart across a square.

**4. Bregga Sell, net-mistress of Cobble.** *`peblos-people.js`; today Sava in
slate.*
Silhouette: short and wide, a square smock. The thing: the Empire's one-in-five is on a
tally board hung round her neck on a cord, and she taps it when she says the number.
Parts: frame *broad woman* (new), oilskin smock to mid-thigh (Addison's oilskin
material, new shape), sleeves rolled (kit), kerchief knotted at the nape against the
wind (Tamsin's, kit), tally board on a cord (new), net needle in the belt (new),
clogs (colour on the boot). Idle: one hand on the board.

**5. Three smiths: Rook (Lumber Town), Armourer Peder (the army camp), Mern
(Ostel).** *Today all three are Tamsin.*
Silhouette: a leather apron split at the knee over bare shoulders. The thing: soot to
the elbow, and each carries what he makes. Parts: split hide apron (Kat's, longer,
kit), sleeveless arms (kit), soot bands on the forearms (Addison's ink geometry in
soot, kit), a leather skullcap (the iron skullcap in leather, kit). Rook: frame
*bull*, Hollis's hammer in the belt. Peder: frame *heavy*, the apron strap in the
army's red, a dented pauldron on the bench beside him is scenery not costume. Mern
("hooks, hinges and gate metal"; Amodian smiths make tools, not weapons): frame
*wiry*, a goat-hair cap, a hinge and a channel knife on a cord (new, tiny).

**6. Marek Dunn, stone-cutter and quarry assessor, Ambron.** *Today Enna's flour.*
Silhouette: square; knee-pads break the leg line. The thing: grey dust on his forearms
and boots, and a folded rule in his breast pocket he takes out to make a point. Parts:
sleeveless hide jerkin (kit), knee-pads (the greave geometry in leather, kit), mason's
mallet at the hip (Hollis's hammer, kit), folded rule (a box, new), dust bands (kit
trick in pale grey), flat felt cap (kit, `mercFelt`).

**7. Old Hewe, gravedigger of the Lauvel.** *Today Oda's shawl and silver strands,
digging.*
Silhouette: a shaggy shoulder line and a spade. The thing: a sheepskin waistcoat worn
wool-out, because the Lauvel's herds cross twice a year and that is what a valley man
wears. Parts: frame *raw-boned, old* (kit + new old pitch), receding white hair and
stubble (kit), sheepskin waistcoat (fur-mantle tufts on a short vest, new-ish),
breeches tied below the knee (a linen band on the knee joint, new), boots caked
(sole colour carried up the boot), the spade (exists). Idle: the existing dig.

**8. Two innkeepers: Bettis of the Sawyer's Rest, Wenna of the Birch Bench.** *Today
the same woman.*
Bettis (Lumber Town): silhouette big and round; the thing is a ring of keys at her
belt that you hear before you see her. Parts: frame *broad woman* (new), apron over a
green kirtle (apron family, kit), sleeves rolled (kit), white linen coif (new, small),
keys (a torus and three boxes, new). Wenna (Rimeholt, colder, older): silhouette
narrow with a hood down her back; the thing is a fur-lined hood pushed back and a
ladle through her belt. Parts: frame *slight, old*, quilted bodice (the gambeson rows,
kit), hood pushed back (kit), ladle (Lysa's spoon, longer, kit), a shawl pinned with a
wooden peg (Oda's shawl, kit).

**9. The Coalition's seven contingents at Solis and on the wall.** *Today one Suvali
jerkin in seven colours: Delisse, Sorell, Dask, Mael, Tesk, Arrant, Kesh, and every
"Coalition spearman".* One language each, so the camp lane reads as a coalition:

| Contingent | Silhouette | The thing | Parts |
| --- | --- | --- | --- |
| **Izoli** (Delisse, the marines) | a short quilted jack, round shield | the shield is painted with three peaks: the Three Presences (invented) | gambeson rows in slate-blue (kit), iron skullcap with a blue wrap band (kit), buckler with three triangles (new paint on the existing round shield) |
| **Suvali companies** (Sorell, the spearmen) | the current studded jerkin and iron cap, now theirs alone | a yellow Laeron sun disc on the shoulder (invented) | existing body, one `round()` in `0xd2b56a` |
| **Ambroni rebels** (Dask; Aurel Mant at Izolveth) | the army's own mail and tabard | the tabard is faded pink-brown and the tower has been unpicked: a paler rectangle where the device was; no plume; a green sprig in the cap (invented) | the legion body with `tabard` recoloured and the device replaced by one box (new, four lines), soft cap (kit) |
| **Selemis** (Mael) | bandana, bare forearms, a short sail-canvas cloak | a rope belt and a curved knife: a sailor, not a soldier | bandana, bare-forearms (kit), short cloak in bleached sailcloth (kit, recoloured), dagger (exists) |
| **Marosh** (Tesk, the riders) | a long dust-coloured coat split for riding, a wound head-cloth | the coat is the colour of a dustback's spine, and he stands like a man who would rather be sitting on something | John's kaftan geometry in dun (kit), John's turban with three turns (kit), sash (kit), javelin case (the `spears` kit) |
| **Pyros** (Kesh) | short and compact, fur cap, short cloak in Pyrosi red | dark-haired and built like the terraces he comes from | frame *short-stocky* (kit), fur cap (kit), short cloak (kit), a hooked hill-knife (dagger, kit) |
| **Island cities** (Arrant, the "Island marine") | wrapped kilt, bare chest under a leather harness, a tall narrow hide shield | tattoos, and a fur he bought in the first cold market | wrapped kilt, tattoos, fur mantle (kit), harness (mercenary `single-pauldron` straps without the plate, kit), tall shield (new: `makeShield` at 0.3 × 0.8) |

**10. Footmen with faces.** *The 33 `legion-soldier` stands; the kit stays exactly as
it is.*
Silhouette: unchanged, because uniform is the point. The thing: the man inside. Under
the bascinet's open face the seven jaws all show; add skin, the twelve builds, and one
campaign mark each: a scar, a shield with the paint worn through to a pale patch, a
dressing on the forearm, a spoon in the belt. Named men get a line of their own:
Footman Ottar at the landing, the first soldier the traveler meets, young, clean
jaw, everything new; Quartermaster Halde, no helmet, a grey beard, a ledger; Marshal
Hadric Venmor, the officer kit with a white-streaked beard and a gold chain; Lord
Marshal Duvo Harn, who declared for the King-in-Council at dawn, with a black plume
(invented). Parts: all kit. Cost: a `look` line per soldier.

**11. Fishers by water: Tobin (Tidehaven), Dag Brennel (Brul), Yael Corr (Sorrow
Beach), Maun (Cobble).** *Today four different bodies, none of them a fisher's.*
Tobin, the estuary: oilskin smock and the pond-fisher's wide brim (kit). Dag, the cold
deep lake: a fur hat, sheepskin, and ice-cleats on his boots (a row of `soleMat`
spikes, new); the thing is that he is dressed for a lake that freezes. Yael, open
water and no quay: bare legs to the knee, a net over the shoulder, linen bleached to
nothing, salt-white hair; the thing is that she is the only person in East Suval not
in charcoal. Maun: Addison's jersey, a leather apron, a pot-hook, and a lobster claw
tucked in his cap (new, five lines).

**12. The boys: Dob, Dreo Vell, Corm, Dunnock, Duro.** *Today five grown men.*
Silhouette: three-quarters height with a full-size head. The thing: they are children,
and every adult in the scene becomes taller for it. Parts: frame *boy* (body 0.8, head
1.0; new, using the existing inverse head scaling), cropped hair (kit), no jaw, bare
feet for Dob and Dunnock (skin colour on the ankle joint). Idle: the courier's glance,
faster.

**13. Tirzah Vane, dyer at the whelk yard, Elod.** *Today Sava in mauve.*
Silhouette: ordinary. The thing: she is purple to the elbow, and she is the only
purple in a charcoal city; the purple-whelk dye is Elod's one luxury export, so the
colour is lore-correct. Parts: Kat's must bands in whelk purple (kit), a charcoal
smock (new shape), a purple headcloth (Enna's headwrap, kit, recoloured). She is
Brandy's opposite number: one colour, and it is the city's.

**14. Andreth Vos, Speaker of the Izolveth meeting; Hanna Orwe, clerk; Keeper Ysel.**
*Today a relay clerk with Iven's papers, Sava, and Sava.*
Silhouette: a closed mantle to the knee. The thing: none of them carries paper,
because the confederation binds by oath, not by record; and each wears a chip of the
island's own dark rock pinned at the throat (invented: the goddess is the rock).
Parts: closed mantle (single-sided cylinder, new), stone brooch (a slate-grey
`round()`, new), grey braid (the `long-tied` style in grey, kit), iron-brown wool
(palette). Keeper Ysel, "that is not a priesthood", gets nothing else at all.

**15. Kesta Orrel, rebuilding the first terrace; Jorn, clearing the culvert
(Ostel).** *Today Tamsin twice.*
Kesta: silhouette broken by a flat-crowned plaited straw hat, the only flat disc in
the cast. The thing: one knee-pad, on the knee she kneels on, and a channel knife and
pruning hook on the belt, because Amodian smiths make those. Parts: straw hat (a
cylinder and a disc, new), one knee-pad (kit greave in leather, one side), goat-hair
wool (palette), stone dust to the elbow (kit trick). Jorn: sleeves off, a mattock, and
soaked to the thigh; the trouser colour goes dark below a wet line (a `ribbon()` band,
new). Idle: the woodcutter's tired shoulder roll, which was always about this.

**16. Sabeth Lune, sail loft mistress, whose loft is the hospital.** *Today Sava.*
Silhouette: a bolt of canvas over one shoulder. The thing: a sailmaker's leather palm
across her right hand and bandage strips tucked in her belt, because she is sewing
wounds now. Parts: canvas bolt (the bedroll cylinder in cream, kit), palm (a leather
band on the wrist joint, new), bandage strips (three linen ribbons, new), grey knot
(Lysa's bun in grey, kit), spectacles (`spectacles()`, kit).

**17. Old Ketto, water-steps beggar, Ambron.** *Today Orris the doomsayer in another
grey.*
Silhouette: lopsided. The thing: one boot. Parts: no hood; bald (the shaved-head
stubble crown, kit), a blanket worn as a cloak (a single-sided wrapped cylinder,
new), a bare foot on one ankle (skin colour on one joint), a wooden bowl held out
(new, three lines). Idle: Brandy's sigh, without the sigh.

**18. Smiths, of Lumber Town, who follows and asks for a coin.** *Today Tamsin with
darker skin.*
Silhouette: a coat too big for him. The thing: the garment is a size the frame is not;
the kit should allow a *heavy* garment on a *slight* frame, and he is the reason.
Parts: frame *slight* (kit), the fen gambeson (kit) scaled 1.1, a soft cap with the
peak torn (the cap without its `leather` peak, kit), the picked forest stick
(`makeStick`, exists).

---

## What to decide

1. **B over A** for the cast, with A for the story fifteen. If you would rather keep
   hand-building, say so and section 4 still stands as a list of the first eighteen.
2. **Authored looks, generated then committed**, rather than hashed from ids.
3. The invented signs: the republic's white ribbon, the rebels' unpicked tabard and
   green sprig, the Izoli stone brooch and three-peaks shield, the Laeron sun disc,
   Duvo Harn's black plume. Each is one line to remove.
4. Whether the eight Tidehaven-road originals keep their looks as *theirs* (my
   recommendation: yes, as data) or whether Sava, for one, should be redrawn now that
   thirty-three other people have worn him out.
