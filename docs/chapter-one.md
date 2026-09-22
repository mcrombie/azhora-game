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

## Events, which are not quests

An **event** is a thing the world does on its own clock whether the traveler is there or not:
no mark over anybody's head, nothing in the journal, nobody asking you to go. There are two.

**The rebels on the Drent road** (`src/road-ambush.js`). Three of them lie up 520 m along the
road, on its emptiest stretch — between the Sunken Lane and the Toll House, 76 m from the nearest
living soul, the last of Drent before the Caloss. The company walks that road one party at a time
on the roster's clock, and by default:

| Who | What happens |
|-----|--------------|
| Chris Gotwood | first through, and alone. They kill him, and his body lies on the road. |
| Ed the Word | gets clear without drawing anything. Always. |
| Jerry, Kristen, Ciarán | walk to Luscia together and finish them; a third of the time it costs one of the three, and it can be any of them. |
| Lakota, Eliana | run, and get away, like Ed. |
| Matt and Al the Tun | finish whatever is left; about half the time it costs one of the two. |
| Mus | never goes that way (`src/wild-route.js`), so he can neither spring it nor die in it. |

The traveler changes it by walking that road with Chris (he is then not on it alone), by going up
ahead of him and springing it himself, or by taking one of the riders as a companion — two of them
still win, at a thinner margin, and a trio broken down to one man walks into what Chris walked
into. That last rule is the implementation's, not the brief's.

The roll is one seed stored with the save, hashed with the party's own name: a reload never
re-rolls the man you lost. The traveler's own fight is three of them off both verges, at the new
`rebel` enemy kind — harder than a goblin, softer than the army, no shield and no mail.

**Ed the Word's arrival** (`src/word-arrival.js`), swimming ashore from the rebel ship, is the
other one.

## The one other quest

**The bridge over the Caloss**, from Chip. It was the fourth and fifth steps of the old
Chapter 1; it is a side quest now, off every ladder (`bridgeStage()` in `src/journey.js`). Chip
asks for himself and it can be done whenever, or never.

**And the alternative is real.** Six paces of the middle of the span are in the river, so the
crossing is a swim until somebody mends it. That took two changes worth knowing about:

- **All rivers are real swimmable water** (`c1ed69c`). `canSwim` used to judge wet against one
  global sea line at 0.45 m, and rivers do not run at sea level — measured across all 1,494 river
  points in the world, the terrain under them sits at a median of 2.76 m. So every river read as
  dry land and was walled with colliders. The beds were carved all along (the Caloss carries
  0.96 m of water). Water has a local surface now: each water collider carries it, `world.waterAt`
  answers it, and the two predicates read it. Standable ground over the whole world was 12,306
  samples before and 12,306 after — nothing walkable became water.
- **The span is broken across the whole lane**, just past the centre on the Luscia side. `along`
  runs from the Drent bank at -13.5, which is the bank you arrive on, so you walk out on sound
  planks and mend it from the last of them — the repair site is 0.5 m past your feet, well inside
  F's 2.7 m. The hole is six metres, wider than a running jump, and closed besides.

Beside the bridge the swim is 9.5 to 16 m against a level-one swimmer's 58 m bar. A horse will
not go in at all, so a mounted traveler has no crossing until the span is down again.

**The autopilot mends it rather than swimming it**, because it routes by ground it can stand on
and would otherwise walk to the near lip and stop there for good (`src/autopilot.js`). Ask Chip,
gather the driftwood, lay the span — the same three steps a player takes, and only while the
crossing is actually down.

## Marks over heads

| Mark | Colour | Shape | What it means |
|------|--------|-------|---------------|
| `main` | gold | cut stone | the arc |
| `plot` | pale silver | rolled sheet | a story of its own — **reserved; nothing wears it yet** |
| `deed` | copper | ring | a one-off that changes the world and does not move the plot |
| `skill` | leaf green | leaf | a teacher or an errand that pays a skill — off the slate |

Today that is gold on Jojo, on Glun, and on whatever the chapter names, and copper on Chip.

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
