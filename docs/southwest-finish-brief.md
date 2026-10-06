# Southwest follow-ups: the ghubr, the tortoise, five river names, and groundTint

Brief written 2026-10-01 by the coordinating session, after the user resolved four open decisions.
This is a short job on a finished block: **four separate items, none of them a new region.**

Base: branch `southwest-finish`, cut from `southwest-4` (`e030e72`) — main plus the West Lotharn,
the four Mithala countries and all thirteen southwest countries. **Do not commit**; leave the work
uncommitted and report. Never cd into another checkout; never a bare `git stash`.

Read `docs/southwest-1-report.md` through `-4-report.md` for the block you are working in, and
`docs/southwest-4-brief.md` for its standing rules. The three `southwest-*` modules and
`tests/southwest-world.test.js` are what you extend.

---

## 1. The Ganesh dustback — build it

**The user's decision (2026-10-01): "just come up with what you think it should be based on the
lore."** Three previous builders refused this because they were looking for a body description. The
description exists; it is behavioural, and it is in
`world-builder/azhora_lore/geography/regions/ganesh_desert.md`:

> The **Ganesh dustback** (*ghubr*, in the Moreshi pastoral vocabulary borrowed from the broader
> desert tradition) appears in the northern desert margin during hot dry months. **It is not the
> Meroshe's dustback**, which the deeper-desert pastoral traditions regard as a distinct phenomenon
> with its own calendar and behavioral rules. The Ganesh dustback is a **smaller, drier creature,
> feeding on the surface-level insect populations** that persist even in dry years. Caravan guides
> use its presence as an indicator of the wind direction and the air temperature near the surface —
> **the dustback does not stand still in conditions where the surface air is actively dangerous**,
> and a **dustback seen resting in shade** is a reliable signal of temperature conditions that the
> caravan's load animals will find stressful.

And the shared name is explained under the *domestic* Moroshé dustback in
`azhora_lore/culture/azhoran_livestock.md`: *"They are called dustbacks because their coats carry a
pale powdery ridge along the spine and shoulders."* That ridge is the only thing the two animals
share, and it is what the name means.

**So what it is, derived not invented:** small, dry, **insectivorous**, of the **northern desert
margin** (not the deep sand sea), with a **pale powdery ridge along the spine**, which **moves at
the surface** and **shelters in shade**. My reading, which you may improve on if the lore supports
it: a **ground-running creature rather than a flying one** — it feeds at the surface, it is watched
standing or resting, and caravan guides read its posture, all of which want an animal on the ground
and in view. Whether it is a bird or a small mammal the lore does not say; choose, say why, and
label the choice as yours in the note.

- **Name it the ghubr** — the Moreshi word the lore gives. `moreshi` is one of the ten profiles in
  `world-builder/azhoran_language_profiles.py`; check it for anything that bears on the spelling.
- **Place it where the lore puts it**: the northern desert margin of the Ganesh Desert — job 1's
  country, which it called the one thing the Ganesh was short of.
- **It is not domestic stock.** The block's standing rule holds; this is the wild animal, and the
  Moroshé bovid stays unbuilt.
- The behaviour the lore describes — moving when the surface is dangerous, resting in shade — is
  worth whatever the rigs can express. If it cannot be expressed, say so rather than faking it.

## 2. The canyon tortoise — build it, and let it withdraw

**The user's decision: build it; it withdraws instead of fleeing.** Job 2 raised it and job 3 found
its home: the Dinelv Highlands' basins are literally "desert seeps" in the lore. The blocker has
always been the west's law that **no animal can be walked down** — and a tortoise plainly can be.

The answer the user chose: **the law assumes every animal flees. A tortoise does not — it stops and
shuts.** Build that as its actual behaviour, so the law is answered rather than broken or exempted.
Concretely:

- Give it a withdraw state in place of a flee state, and make the chase laws' intent hold for it:
  a traveler who walks it down does not catch it, because there is nothing to catch — it is shut.
- **Do not exempt it from the law with a flag.** The user explicitly rejected that option. If the
  law's code cannot express "withdraws", change the law to ask the right question rather than
  skipping the animal, and say exactly what you changed.
- It should be the only animal in the game that behaves this way, and `tests/west-life.test.js` or
  your own test should prove both halves: it can be approached, and approaching it achieves nothing.

## 3. Five watercourses — name them from the language profiles

**The user's decision: derive them from the language profiles**, as job 1 named the Vaellir straight
from the Pyrosi lexicon's word for a river rather than coining one.

The five, from jobs 1 and 2's reports:

| course | where |
|---|---|
| the Telemonia border stream | Gala |
| the desert border stream | Gala / Oves Desert |
| the distributary | Gala, braiding to the south-west shore |
| the dry gully | Ovesos |
| the southern border stream | the Meroshe |

`world-builder/azhoran_language_profiles.py` has ten profiles: mittoli, moreshi, pyrosi, grassic,
ibnael, elodi, elagosi, kellith, boueni and one more — read the file. **Gala has no profile of its
own** (established 2026-09-28), so its three take Mittoli or stay descriptive; Ovesos's name is
Mittoli *oves-* by the lore's own account; the Meroshe is Moreshi country.

**Rules**: a name must be derivable from a profile's lexicon or morphology, not invented to sound
right. If a course cannot be honestly named, **leave it descriptive and say so** — that is a real
answer, and better than a coined one. Update every place the name appears: the module, the
landmarks, the map-fog areas, the reports and the lore if it names them.

## 4. groundTint should be a table, not an if/else chain

**The user's decision: do it.** `groundTint` in `src/world/terrain/world-terrain.js` has now failed **silently
twice** — job 2 found an entire block's tint computed and dropped because an `else if` was never
written, and job 3 met the same shape one level down inside `southwestTint`. A missing branch
produces no error, no warning and no visible difference until somebody photographs the right place.

Make it a table — region or predicate to tint function — so that **adding a country's tint is adding
a row**, and **a missing row is a missing row rather than silence**. Keep the behaviour identical:
this is a refactor, and `tests/drawn-ground.test.js` plus every region test should pass unchanged.
If you can make the table *assert* that every region claiming a tint has one, do; that is the whole
point.

---

## Tests

Run `tests/southwest-world.test.js`, `tests/trogo-undergrowth.test.js`, `tests/west-life.test.js`
(law by law — it is slow), `tests/drawn-ground.test.js`, `tests/regional-wildlife.test.js`,
`tests/region-layout.test.js`, `tests/map-fog.test.js`, `tests/languages.test.js`,
`tests/cartography.test.js`, and the region tests for anything you touch.

**`npm test` cannot run on this machine** — it exceeds the Windows command-line limit.

**Known-failing on this base, not yours**: `chameleon`, `regional-wildlife` (Iscare),
`south-suval-world` (the Stillwater), `amod-world`, `elagos-world`, `campaign-world`, and
`west-life` × 3 (`elagos-meadow-cattle` 0.34 m, `feradom-country-17-98` 25.5 s, `oveth-herons`).
**Note**: your tortoise work touches `west-life` directly, so be careful to distinguish what you
changed from what was already failing — run the base commit side by side if there is any doubt.

One short review render at the end if electron is available, **after** any final change — five
builders have photographed too early. Keep line endings as found (`main.js`, `world.js`,
`map-fog.js`, `developer-atlas.js` are CRLF).

## Report

`docs/southwest-finish-report.md`: what the ghubr is and every line of lore you derived it from;
what the tortoise does instead of fleeing and exactly what you changed in the law; each of the five
courses with its name, the profile and the morphology it came from, or why it stayed descriptive;
what `groundTint` looks like now and whether it can catch a missing row; every test run; review
views; and anything still open.
