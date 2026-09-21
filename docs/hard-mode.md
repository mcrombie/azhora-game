# Normal mode, and a tentative hard mode

The user's decision of 2026-09-21. There are two modes. **Normal** is the default, it is the game
we develop and the only one we test, and it is all in English. **Hard** is optional, something a
player could choose instead of the default, and it is tentative: what it consists of will be
worked out over time.

## What is known about hard mode

One thing so far:

- **The linguist skill and everything that comes with it.** Nobody in Azhora speaks the
  traveler's language, so what people say arrives in their own tongue and English surfaces as
  the traveler learns it: the tongue rendering of speech and of signs, a proficiency for each
  language, Chris Gotwood interpreting while he is with you, his language sittings on the long
  road, the phrasebook, the drills, and the key that shows a line as it was said
  (`src/linguist.js`, `src/languages.js`, `docs/languages.md`).

The code is kept, not deleted. It is reserved for hard mode.

## What normal mode means for it

In normal mode everybody is understood. Speech and signs are in English as they were written,
the Linguist tile is not on the skill sheet, nothing pays linguist experience, nothing is sold or
taught that exists only to teach a tongue, and no line of copy tells the player that they cannot
follow what is being said. A save that already holds linguist experience keeps it untouched.

## Rules for building

- Develop normal mode. Do not build out hard mode, and do not spend test time on it.
- A feature that belongs to hard mode goes behind the one gate (`src/game-mode.js`) and is listed
  here. Nothing reads the mode anywhere else.
- The pure tests of a reserved module may stay, because they are cheap and they keep the code
  from rotting while it waits. Tests of the game as played assert normal mode.
- There is no player-facing way to choose hard mode yet. That arrives when hard mode is
  something worth choosing.

## Candidates, not decided

Nothing here is agreed. They are written down so they are not lost: lethal swimming was the
user's choice for the game as it stands and stays in normal mode; weapon wear is switched off at
the user's request (`WEAPON_WEAR = false`) and could come back here; the border battle's level.
