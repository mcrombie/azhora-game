# Cartography, and the dark chart

The traveler carries a chart of Azhora and fills it in. This is the design the
user settled on; `src/cartography.js` is the model, `src/world-map.js` draws it,
and `src/region-levels.js` holds what a region costs to walk into.

## What the chart looks like

Unknown country is **dark**. Not parchment, not a hatch: dark, the way the edge
of a chart is dark when nobody has been there.

Three things can show through it:

- **A coastline you know** is a lighter silhouette of the landmass against the
  sea. The shape of the land, nothing inside it, and no label.
- **A region you have been told about** gets its name written across it in the
  journal's serif, placed roughly where it is. Nothing else. The atlas has its
  own labels but they are under the fog, so this one is drawn by hand.
- **Ground you have walked** shows the real atlas, hex by hex, exactly as the
  existing fog already does it (`src/map-fog.js`).

## The four states

Each region is in one of four states.

| state | what you know | what the chart shows |
| --- | --- | --- |
| `unknown` | nothing | dark |
| `heard` | the name and a rough bearing, from asking somebody | the name, placed approximately |
| `charted` | the shape of it | the coastline as a silhouette; the name too, if also heard |
| `explored` | you have walked a good share of it | the real atlas under your own hexes |

They are a ladder, except that `charted` does not imply `heard`: you can be
shown a coast without being told whose it is, and you can be told a name for
country you have never seen. So the model keeps a rank *and* a `named` flag, and
a label is drawn when a region is named, however it became so.

`explored` is reached by walking. A region counts as explored once the traveler
has charted **six** of its hexes — enough to be a walk through it rather than a
toe over its border, and small enough that the border regions of a chapter
qualify without a grand tour. Walking on always shows more of the atlas; the
region-level state is a summary for the journal, not a gate on the drawing.

## Where the chart starts

At the first minute the traveler has Tidehaven under their feet and a rough
chart Jojo the harbourmaster keeps. That chart shows:

- the coastline from **Feradom** through **Pueth** to **Drent**;
- the coastlines of **Luscia**, **East Suval** and **West Suval**;
- **Drent** named, and nothing else named.

So six regions are `charted`, one of them (Drent) also `named`, and Drent's
interior is fogged: you can see it is called Drent and you cannot see anything
in it. Everything else is dark.

Feradom is not one of the ten built regions and has no entry in
`REGION_OUTLINES`, so its coast is taken from `assets/azhora-dev-regions.json`,
which carries the cells of all 131 atlas regions in atlas coordinates. The same
source serves any region the chart ever needs to silhouette, so no coastline has
to be authored by hand.

Note that the atlas is not north-up; `src/region-layout.js`
(`HEX_WORLD_TRANSFORM`, `northOffset`) converts.

## Experience

Cartography is on the same table as every other skill (99 levels,
`src/skills.js`). It is paid for four things:

- the **first hex** charted in a region — 15
- a region reaching **heard** — 10
- a region reaching **charted** — 25
- a region reaching **explored** — 40

The starting chart pays nothing: it is where you begin, not something you did.

## Learning it, and asking the way

Jojo hands over the rough chart on the landing and gives directions, and that is
the lesson — learned on the spot, the way birding is. After that, any NPC can be
asked **"Which way to …?"**: a choice that appears in a conversation once the
traveler has the skill, offering regions near where that person lives. Asking
moves a region to `heard` and pays for it.

`CARTOGRAPHY_DIRECTIONS` is a table keyed by region with a line or two in a
neutral voice, plus a per-NPC override where an obvious one exists. Kept small
on purpose: it is a bearing, not a lecture.

## How hard a country is

Every region has a difficulty level, 0 to 11. The full table for all 131 regions
is `docs/difficulty-ladder.md`; `src/region-levels.js` is the pure module that
carries it, with `levelWords(level)` for the words.

Two places show it, and they show different things:

- **The region card**, on first entering, gives the level in **words** — "A
  quiet country" … "A dangerous country" … "Few return". No number.
- **The cartography section of the journal** gives the **number**, and only once
  the region is `charted`. Knowing how dangerous a country is, precisely, is
  part of having charted it.

Names settled with the world's own sources, for anything that touches them:
Lizeem is a **river** through Caricas and never a region; "Midy Mountains" is a
duplicate of the Oremindi; Cape Thalmagar stays 11's neighbour at 8.

## Saving

`cartography:` in the checkpoint beside `mapFog`, validated in
`src/road-checkpoint.js` with the rest. State and the hex counts per region are
stored; levels and XP come off the skill as usual.
