# Chapter 1, as it is built

Written for: whoever picks this codebase up next, including me.

Michael's direction of 22 September 2026, implemented the same day. This supersedes
[chapter-1-redesign.md](chapter-1-redesign.md) and [chapter-1-plan.md](chapter-1-plan.md), which
describe a longer Chapter 1 with a highwayman on the road; neither was built.

## What Chapter 1 is

Three subquests and nothing else.

| # | Subquest | Where it lives | Closes on |
|---|----------|----------------|-----------|
| 1 | Report to Harbourmaster Jojo | `questSteps[0..1]`, `src/game-state.js` | `accept-letter` — she gives the letter of introduction |
| 2 | Training with Officer Glun | `questSteps[2]`, `src/instructor.js` | `trained` — two strikes, one guard, one step |
| 3 | Report to Nothom | `questSteps[3]`, then `src/journey.js` | `deliver-report` — Iven at the relay post |

`QUEST_DONE` is 3 and is the whole of the tutorial. It used to be 10, and eleven steps.

The lesson is three things now, not two: **strike** (left button or R), **guard** (hold V), **step**
(C and a direction). Cromb comes ashore with a shield on his arm — tier 0, light, "what you land
with" — so the block the combat module has had since the shield-guard work is a thing the starting
character can actually do. The guard is measured as a *held* shield near the post for
`GUARD_SECONDS`, the same way the step is measured as a dodge near the post: the straw does not hit
back. `practiceGuards` is not saved; like `lessonSet` it is derived from the stage on load.

Glun hands over the chart, the road token, and the explanation of the other skills at the end of the
lesson, and the chart opens on Tidehaven and nothing else.

## What came off the main quest

All of it is still written, still built and still tested. `src/quest-slate.js` is the one switch.

- The three goblins at the woodland bell (`startAmbush`, guarded by `questLive('greenway')`).
- The report to Quartermaster Corvan in the Avrel clearing, his field register, and his three
  supply parcels — with the raiders among the field walls that went with them (`courier`).
- Sava's three waymarkers on the rise (`waymarkers`). Sava herself is out of the cast with them
  (`DROP_IDS`, `src/cast.js`); Corvan stays because the soldier rule keeps him.
- The satchel lesson, the Greenway Watch, Fernway Rest and the Caloss Gate as *steps*. The ground
  is all still there and still walked; none of it is a thing the game stops you to do.
- The long way round through Drent's teachers (`teachers`), because every stop on it is somebody
  the cast cull took out.

## The one other quest

**The bridge over the Caloss**, from Hollis. It was the fourth and fifth steps of the old
Chapter 1; it is a side quest now, off every ladder (`bridgeStage()` in `src/journey.js`). Hollis
asks for himself, it can be done whenever or never, and the alternative is swimming the river,
which he says out loud and does not recommend.

## Marks over heads

| Mark | Colour | Shape | What it means |
|------|--------|-------|---------------|
| `main` | gold | cut stone | the arc |
| `plot` | pale silver | rolled sheet | a story of its own — **reserved; nothing wears it yet** |
| `deed` | copper | ring | a one-off that changes the world and does not move the plot |
| `skill` | leaf green | leaf | a teacher or an errand that pays a skill — off the slate |

Today that is gold on Jojo, on Glun, and on whatever the chapter names, and copper on Hollis.

## Turning things back on

`TRIMMED = false` in `src/quest-slate.js` puts every quest back; adding one id to `LIVE` puts back
one. The rules that describe the switched-off content are injectable rather than read from the
module directly — `live` in `createJourney`, in `journeyConversation`, and in `markerFor`'s view —
so the tests read the whole of it whatever the slate says. Each of those files has one test at the
foot of it for the trimmed slate, which is what a player actually sees.

## Nothom

Luscia's market town, which the clerks used to call Lumber Town. `noth` (forest, timber) on `hom`
(settlement), from the Mittoli root list in `world-builder/azhoran_language_profiles.py`; Luscia
speaks Luscian Mittoli (`src/languages.js`). Its **id is still `lumber-town`** — in saves, in the
road smoke and in a dozen modules — exactly as Kristen's id is still `merc-christin`.
