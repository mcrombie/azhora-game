# Day and night

A design brief. Nothing here is built.

**Decided by the user (`docs/design-answers.md`):**

- A real cycle that changes the world: night is more dangerous off the road (Luscia's wolves hunt
  in packs at night), some birds and animals are nocturnal, villagers go indoors, Batman is a
  creature of dusk, camps and inns matter.
- **A full day and night takes 48 real minutes**: about 32 of daylight and 16 of night. (2026-09-21)

## What is there now

No clock but `playSeconds`. One sky: a fixed sun (`DirectionalLight`, warm, 3.1), a fixed
hemisphere light, one fog colour, all set once at `src/main.js:162-165`. One lit lamp in the whole
world (`src/world.js:1429`). Everything that moves on a schedule — the ten mercenaries, the
Sultana, Ed the Word's ship — is a pure function of `playSeconds`, and the day should be too.

## The clock

One day is 2,880 seconds, in four parts:

| Part | Seconds into the day | Real minutes |
|---|---|---|
| **Dawn** | 0 – 180 | 3 |
| **Day** | 180 – 1,740 | 26 |
| **Dusk** | 1,740 – 1,920 | 3 |
| **Night** | 1,920 – 2,880 | 16 |

**The traveler lands at first light.** Second 0 of the game is second 0 of day one. That was
chosen against the company's timetable, and it makes the arrivals mean something:

| Who | Lands at | Which is |
|---|---|---|
| You and Chris Scotwood | 0:00 | first light, day one |
| Ed the Word | 6 min | morning |
| Jerry, Kristen, Ciarán | 18 min | just past midday |
| **Lakota** | 33 min | **one minute after nightfall** — a lantern on the pier, and the birder arrives with the owls |
| **Eliana** | 48 min | **first light, day two**, to the second |
| Matt and Al the Tun | 63 min | late morning, day two |
| Mus | anywhere | nobody sees, whatever the hour |

A traveler who walks straight to the muster arrives in the afternoon of day one and never sees a
night. A traveler on the long road (`docs/drent-long-road.md`) meets the first night in the near
wood, minutes 32 to 48, and the timetable could have been written for it: Bran's fishing lesson at
Willowmere falls at dusk, when the fish bite; the catch is cooked over Lysa's tinderbox fire in
the dark, which is what a fire is for; and the traveler walks into Fernway at first light, to the
players' camp waking up. They come in to the muster after dark on day two; the tenth mercenary is
in at minute 87, about seven minutes into the second night. **The battle is fought by daylight:** arrive after
dusk and the Marshal says "at first light", and you sleep in the camp.

The hour is told **in words, never digits** — "first light", "morning", "midday", "afternoon",
"dusk", "nightfall", "the small hours", "an hour before dawn" — in the journal's header and
beside the minimap, with a small sun-and-moon dial. It is the same rule as the difficulty ladder:
words in the world, numbers only in the journal's own pages.

### One clock, and sleeping moves it

Sleeping skips to the next dawn (or, from an inn in daytime, to dusk). **It moves the world, not
just the sky:** the mercenaries keep walking, the Sultana keeps sailing. So:

- `worldSeconds = playSeconds + slept`, where `slept` is a running total, saved, and **reset at
  both starts** (`tests/session-clock.test.js` already polices exactly this for anything taken
  from the clock; the same law applies to anything added).
- Everything on a timetable reads `worldSeconds`. `playSeconds` stays what it is: time played.
- A night's sleep on day one costs sixteen minutes of the muster. "First is guaranteed" is a
  promise to a traveler who goes straight there, and that traveler never needs to sleep.

## The sky

- **Sun:** the one directional light, moved along an arc from east (the sea, off Tidehaven) to
  west, and tinted: rose-gold at dawn, today's warm white by day, amber then red at dusk.
- **Night is dark blue, not black.** The lore gives Corav two moons
  (`azhora_lore/geography/world.md`): **Sova**, large and yellow-white, "bright enough to read by
  at full phase", on a 29-day cycle; and **Vel**, small, cooler, fast, on an 11-day cycle and
  easily missed near a town's lights. At night the directional light becomes Sova's: dim, cool,
  still casting a shadow. The road must always be readable at night; the woods off it need not be.
- **Phase is real.** Sova's phase follows the day count, so some nights are bright and some are
  properly dark — and a dark night off the road in Luscia is the most dangerous thing in the first
  three countries. Vel is a small disc in the sky and no more. (The two moons' Great Tides are in
  the lore too; they are for later, and for swimming.)
- **Stars**, and fog that takes the sky's colour hour by hour.
- **Lamps.** Windows glow and lanterns light from dusk to dawn in every settlement: emissive
  glass, not real lights, with a handful of true lights where the traveler actually walks (the
  pier, an inn door, a camp fire). The lighthouse finally has a job.
- **A lantern** the traveler can buy and carry: a small warm light, a free hand lost (no shield).

**Every review view pins its hour**, mid-morning unless the view asks otherwise, so no existing
review picture changes. The clock may only be pinned inside a `view===` line; the test that says
so stays.

## What night changes

Each of these is its own piece of work and none depends on the others.

1. **People go in.** At dusk villagers walk to their doors and are gone until dawn. A teacher
   teaches by day. Those with a night to keep stay out: innkeepers, the watch, sentries at the
   Moros camp, a fisherman at his lamp. **The law:** no step of the main arc can be stuck behind a
   shut door for longer than "wait for dawn", and wherever that can happen there is somewhere to
   sleep within a short walk.
2. **The country is one level harder off the road after dark.** The region card's words do not
   change — the level-1 words are already "Mind the road at night", and now they are true. On a
   road, within sight of a settlement's lamps, night is no worse than day. In Luscia the wolves
   that go alone by day run in packs of three to five by night.
3. **Other animals, other birds.** Owls, nightjars and bats by night; a **dawn chorus**, three
   minutes when birding pays better and everything sings; deer at dusk at the wood's edge; fish
   that bite at dusk and dawn. Day birds roost and cannot be found. This is where birding gets
   its second half.
4. **Batman is a creature of dusk.** He can be met only in the three minutes of dusk (and, if the
   user likes, the three of dawn). Six minutes in forty-eight: you have to mean to find him.
5. **Inns and camps.** An inn costs copper, heals you, saves, and wakes you at first light. A
   camp needs a fire (woodcutting's sticks, the tinderbox Lysa gives) and is free. In country of
   level 3 and above a camp can be attacked in the night **unless a companion keeps watch** —
   the company mattering once more. Sleeping is never forced: a traveler may walk all night.
6. **Sound.** A night bed (crickets, an owl, the sea louder), the chorus at dawn, the village
   quiet. A bell on the pier for a night landing.

## Build order

1. **The clock and the sky.** A pure module (`src/day-clock.js`): part of day, the hour in words,
   sun and moon positions, Sova's phase, all from `worldSeconds`. The host moves and tints the
   lights and fog. The dial and the journal's hour. Review views pinned. This alone is worth
   shipping: the world gets mornings and evenings.
2. **Lamps and windows**, and the lantern.
3. **Sleeping:** inns first, then camps; `slept` and the one world clock.
4. **People go in**, with the law about the main arc.
5. **Night's danger:** the level rule, Luscia's packs.
6. **Night's animals**, the dawn chorus, Batman's hours.
7. **Sound.**

## Laws, to be written as tests

- The four parts of the day add up to 2,880 seconds, and the hour is a pure function of the clock:
  same second, same sky, across a save and a reload.
- **The timetable keeps its meaning:** Lakota lands at night, Eliana at dawn, and the rest by
  day. If anyone retimes an arrival or a part of the day, this test is what tells them what they
  just changed.
- Anything added to or taken from the clock is a running total, saved, and reset at both starts.
- Every review view pins its hour.
- The road is readable at night: the sky's light never falls below a floor, whatever Sova's phase.
- No main-arc step is unreachable for longer than one night, and there is a bed near each.
- Night never raises the level on a road within a settlement's lamps.

## Still to ask

- May Batman also be met at dawn, or only at dusk?
- Does a night landing (Lakota's) ring the pier bell, or come in quietly?
