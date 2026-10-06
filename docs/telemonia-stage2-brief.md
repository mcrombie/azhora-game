# Telemonia, stage 2: the town, the farms, the people, and how they treat an outsider

Brief written 2026-10-03 by the coordinating session. Stage 1 (the country: rim, passes, the Galmeth,
Kethorn's crag and wall, the terraces, the Rothkar and the way up to it) is on main. This is the stage
that puts people in it. The user sees it before it is committed.

## Where you work, and the rules that do not bend

- **Your worktree**: `C:\Users\Michael\Programs\typescript\azhora-game-telemonia`, branch
  `telemonia-stage2`, cut from main `470cfcc`. Work only there.
- **Do not commit. Do not push.** Never a bare `git stash`. Never edit, stage or run a state-changing
  git command in any other checkout. **Never touch the main checkout `azhora-game`**: another worker is
  writing in it right now. A clean copy of your base is at
  `C:\Users\Michael\Programs\typescript\azhora-game-land` for baselines: single test files, read-only.
- **The lore repo** (`C:\Users\Michael\Programs\typescript\world-builder`) is read, not rewritten: the
  Telemonia lore was rewritten for this on 2026-10-01. If something you build needs a line of lore
  added, add it in place, briefly, and say so; never commit, stage or stash there. **Do not change the
  atlas.**
- **Ask before a design decision.** Where the specification below and the lore are silent, derive the
  answer from the lore and the game's own precedents and label it yours, or leave it open and report it.
- This machine: big heredocs fail and backslashes inside python heredocs get eaten, so write scripts to
  a file and run the file; keep every file's line endings as found; three.js is vendored.

Read first: `docs/telemonia-stage1-report.md` — above all "What stage 2 will need to know", which gives
you the rock's frame, the sites for the halls, the fields' areas, the washes that are not to be built
in, the passes and the rules a builder there inherits — then the two lore files
(`azhora_lore/geography/regions/telemonia.md`, `peoples/the_telemon.md`) in full.

## What the user said — this is the specification

> They worship a grim, laconic god comparable to Crom in Conan the Barbarian, except they are more like
> Sparta with a collective society. Their men are all great warriors who run slave farms like the
> Spartans. Their main city in the center should be well fortified naturally and by walls and there
> should be helot-like slave worked farmland surrounding it. [...] The Telemon warriors should carry
> long spears and shield and knives in scabbards. The women also carry knives and are no strangers to
> combat. There are no designated guards. All the men basically function as the guards and the women too
> though they are not as good in combat.

Asked whether a traveler can get in, the user chose: **"In, but challenged"** — *no gate at the border.
Any Telemon who sees an outsider walks up, turns him round and escorts him to the edge. Resist or come
back, and it is a fight with everyone in earshot. Reaching the city unseen is possible and hard.*

And: the field people are **the descendants of invaders who never got home**. Names derive from the
`kellith` profile (`world-builder/azhoran_language_profiles.py`; in use: Tormon, Kethorn, the Galmeth,
the Rothkar, the Belketh, the Tarnel, *toreth*). The god is **Tormon** — the game's hero is Cromb, and
nothing here is ever named Crom.

## What to build

### 1. Kethorn, on the rock

The lore: built of the stone it stands on; **the halls of the bands**, where the fighting men eat and
sleep in common; **the granaries and the cisterns**; **the hall of the king**, "distinguishable from the
others mainly by where it stands"; no inn, no market, no foreign quarter, no temple, no watch and no
gatehouse — "whoever is nearest the gate is the gate". The stage 1 report says where each can stand.
Plain, heavy, stone; a town that looks like what it is. Leave a clear way from the gate to the king's
end. Everything is inside the unclimbable line and reached only by the gate.

### 2. The farms

"Around the rock, the plain is farmed to its edges, and where the plain ends the terraces begin."
Barley and pulses on the Galmeth, the dry-country vine on the terraces, as planted ground with rows that
read from the rim. **Nothing in a wash.** Where the field people live the lore does not say: they are
bound to the land and allotted to the band halls, not to households. Derive it (the game has farmland
precedents: `src/world/scenery/regional-farmland.js`, `src/world/scenery/regional-farmland-scenery.js`), keep it poor and low, and
label it yours. Cattle and the compact Telemon horse are the kingdom's: a modest number, on ground a
body can reach (the rim is not walked onto except by the one way).

### 3. The people

- **Telemon men**: compact, dark-complexioned; every one a warrior, **long spear, shield, and a knife in
  a scabbard at the belt**. New character builds in `src/content/characters/characters.js`, in the manner of the existing
  soldier builds, plain and unadorned — the Avites do display, the Telemon do not.
- **Telemon women**: the same people, **a knife at the belt**, at ordinary work (a water jar, a
  terrace wall, the gate). They fight; they are not the equal of the men.
- **The field people** (*toreth*): unarmed, in the fields and on the terraces. Lowlanders by descent:
  they do not look like the Telemon.
- Nobody has a name. People go by what they are. A few short lines each at most, in the game's
  ordinary English (the linguist mode is not this job). The Telemon say very little. What a field hand
  says to a traveler who reaches the terraces unseen is yours to derive from the lore ("it is said that
  the field people still speak the lowland tongues among themselves"), briefly.
- **No children.** The lore has boys on a training run; a fight "with everyone in earshot" must never
  include a child, so leave them out and say so.
- **No king as a character, no quest, no trade, no hiring.** The border markets stand on other
  countries' ground and are not this job.
- Keep the numbers modest and honest about cost: people who can challenge are real NPCs; people far
  off or on the rock's edge can be figures (`src/world/life/town-life.js`). Say how many of each and where.
  They load through the step-wise build like everything else (`regionBuild` in `src/world.js`).

### 4. Challenged on sight — the new behaviour

This is the part with no precedent as a whole, and it must be built from the pieces the game already
has rather than beside them: `src/gameplay/law/stealth.js` (who notices whom: range, cone, sneaking, line of sight),
`src/gameplay/combat/forest-sightline.js` (cover), `src/gameplay/law/crime.js` and `src/gameplay/law/crime-host.js` (somebody walks up to the
traveler, a standing that is saved, a fight when it is refused), `src/world/travel/closed-border.js` (turned back at
a border), `src/gameplay/autoplay/escort-autopilot-follow.js`, `src/content/quests/roadside/harbour-alarm.js`, and the combat host.

The rule, in the user's words above. Made exact:

- **Every Telemon is a watcher** — man or woman, at whatever they are doing. There are no guards
  because nobody is exempt. The field people are not watchers.
- **Seen for the first time**: the nearest Telemon comes to the traveler, says a few words, and
  **walks him to the edge** — the nearest pass mouth — and stops there. The Telemon do not pursue past
  their own border; that is the lore's own law and it must hold.
- **Resisting** — refusing to go, going further in, drawing on them — **or being seen inside again
  after having been walked out** ("the second crossing is received differently"): **a fight, and every
  Telemon in earshot joins it.** Men are hard opponents at this region's level (3); women are easier.
  A traveler who leaves the country is not followed.
- **Unseen is possible and hard.** A traveler who uses the game's own stealth and cover, or comes over
  the rim by climbing, can reach the terraces and the foot of the rock. Getting onto the rock means the
  gate. Prove that at least one unseen route to the terraces exists and that walking in by a pass in
  the open is always seen.
- **The standing is saved** with the game, in the manner of the crime state: validated on load, absent
  in old saves, reset by whatever resets the world's other standings.
- What happens to a traveler who **loses** the fight is the game's existing defeat. (The lore would
  make him a field hand; that is a design decision, not yours. Report it as open.)
- Where the mechanics are yours to choose — how long the walk out may take, what counts as refusing,
  how far earshot is, whether the traveler's companions matter — choose from the precedents, keep the
  numbers in one frozen table, and list each choice in the report.

Put the rule in its own pure module (no three, no DOM) with its own tests, and wire it into
`src/main.js` the way the other hosts are wired. Somebody set down inside by the developer's travel
tool must not be trapped or break the rule: they are simply an outsider who has been seen or has not.

### 5. The registers

Build status, the campaign file's entry, chart and landmarks for the town's places, review views
(`telemonia-*` in `src/main.js`), and `docs/lore-adjusted-to-atlas.md` if anything in it moves.

## Not in this job

The border markets; mercenary contracts; the seasonal ceremonies as events; the king; any quest; the
landing at the Rothkar's foot and whether it opens onto the rim (an open decision of the user's);
changing stage 1's ground except where a building or a field needs a level floor, and then say exactly
what moved and re-run stage 1's tests.

## Tests — and how long they take

`node scripts/run-tests.cjs <files>` runs each file in its own process. **One invocation at a time;
never the full suite.** A world-building file takes one and a half to three minutes.

Your own tests first: the rule's pure module, and a `telemonia-people` (or similar) world test — the
town stands on the rock inside the wall, the fields are off the washes, everybody placed stands on
ground a body can stand on and has a walked way out, the gear is on the builds, nobody has a name, no
child exists, and the challenge rule's cases (seen, walked out, resisted, seen again, unseen route,
not pursued past the border, saved and restored).

Then at least: `telemonia-world`, `nobody-sealed-in`, `town-life`, `climbing`, `map-fog`,
`campaign-world`, `region-layout`, `regional-build-steps`, `region-loading`, `gala-world`,
`oves-world`, the stealth and crime tests, the save round-trip test, and anything else you touch.

**Known red on this base, not yours** (run the file in `azhora-game-land` and compare names and
messages before calling anything else pre-existing): `town-life` ("life-avrel-farmer cannot be reached
from the road"), `nobody-sealed-in` (four tests about the mercenary company's placement), `amod-world`
(world bounds), `campaign-world` (Drent's hex count), `languages` (East Ibenwood has no tongue),
`isareos-world` (menora). `docs/known-failing.md` is older than this base and incomplete.

**No long Electron runs.** One review render at the very end, after the last change —
`node scripts/launch.cjs --smoke-test --review-clean --review-jpeg "--review-views=..."` — of the town
from the plain, the town from inside the gate, a band hall, the fields from the rim, a Telemon man and
a woman close enough to see the spear, shield and knife, and a field hand. Look at the pictures
yourself. The challenge itself is proved by the pure tests; say plainly that it was not played by hand.

## Report

`docs/telemonia-stage2-report.md`: what you built and the lore line or user's words each piece came
from, your own choices labelled; the numbers (buildings, fields' area, how many people of each kind and
where); the challenge rule as built, its table of numbers and each choice in it; the proof of "seen in
the open, unseen by stealth, not pursued past the border"; what is saved; every test file run with its
result and the baseline for anything red; the review views; and every decision left for the user.

Your final message is read by the coordinator: lead with what is built and whether it is green, then
the open decisions, then what you could not do and why. State plainly anything you did not verify.
