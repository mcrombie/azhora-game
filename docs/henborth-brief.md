# Henborth: terrain and wildlife

Brief written 4 October 2026 by the coordinating Claude session under the
[joint completion plan](regional-completion-joint-plan.md) (queue row 7: "Continental plains connecting Celder/Mithala to
the mountain approaches; open habitats, restrained relief"). **Terrain, climate, water, scenery and wildlife only -
nothing that belongs to anybody.** Two agents in one worktree, split by layer: a ground agent and a life agent.

## Where things stand

- **Worktree** `C:\Users\Michael\Programs\typescript\azhora-game-henborth`, branch `henborth`, cut from ``452d7d9`` (the
  Ibenal delivery, stacked on Alezhor, East Izol and Celder). Do not commit, push or stash; touch no other checkout.
- **Registered and wired**: runtime ID **67** (provisional); stubs `src/henborth-world.js` (`HENBORTH`, `henborthOwns`,
  `HENBORTH_ARRIVAL`, `HENBORTH_LANDMARKS`, `HENBORTH_TRAILS`, `HENBORTH_VIEWS`, `henborthGround(x, z, incoming,
  before)`, `henborthTint`), `src/henborth-scenery.js`, `src/henborth-wildlife.js`.
- Precedents in this worktree: `src/south-celder-world.js` (a plain, seam tables read edge by edge), the Ibenal and
  Alezhor modules (the newest), `docs/alezhor-brief.md` (file ownership, tests, final message).
- **The user's standing decisions**: lore may be rewritten in place where the atlas contradicts it (minimally, in its
  own voice; never commit in `..\world-builder`; never touch a lore file someone else already modified); new animals
  are welcome where the overview and neighbours support them (label them as extensions).

## The atlas - measured

- **Henborth**: 27 hexes, **all plains, all Dfa**; rows 83-89, hex centres x -2750 to -2050, z -1963 to -1443:
  row 83 (4,83)(5,83); 84 (1..4); 85 (0..3); 86 (-2..2); 87 (-3..0); 88 (-4..-1); 89 (-5..-2).
- **Neighbours by shared edges**: **North Celder 8** (built, a frozen delivery: meet its ground live, it is
  reshaped against your outland now), **West Mithala 8** (built), **North Mithala 6** (built); Narcosh 9, Lesser
  Oremindi Mountains 6, North Oreminidi Mountains 6, Acor Wetlands 2, East Oremindi Mountains 1 (all unbuilt: feather
  to what stands there).
- **Water**: no river edges on the atlas.

## The lore - and where the atlas wins

`henborth.md` (77 lines, unmodified): read it all. Its geography places Henborth "between Lond's northern edge and ...
the tundra approach", cold, with a short season, the Endevor country west and the Baldro approaches east. **The atlas
puts it directly north of Celder and the Mithala, against the Oremindi and Narcosh, all Dfa (hot-summer continental).**
Rewrite those sentences in place to fit (keep its passes: the atlas's northern neighbours are the North and Lesser
Oremindi, so "three passes northward" into the mountains fits), and list each edit. Keep what does not contradict:
the thinning, elevated transition character; the wind; the summer-only productivity; the cranberry and herb grounds
(owned gathering, but the bog and herb ground is terrain - you may shape damp hollows for it).

- The fauna overview: the **frostback buffalo's northern summer circuit "sometimes reaches Henborth"** (line 73) -
  the Celder herds' kin; plus open-plain birds and small mammals the neighbours carry.

## Ground and life

As in `docs/alezhor-brief.md`. Ground: restrained relief rising gently north toward the mountain approaches; the pass
approaches as natural ground only (no roads, no markers); damp hollows; meet North Celder, West and North Mithala live.
Life: open continental grassland, cold-margin scrub toward the north, a frostback summer band (varied layout from
Celder's), what else the overview supports. Scoped world `[67, 62, 29, 31]`. Final messages as there; ground agent:
say clearly when the ground is final.

## Tests - fast, and the registration list

Scoped worlds, at most two test processes per agent, never the full suite, no Electron. Run your own files, then the
registration list every new region must pass (`docs/` lessons): `region-layout`, `region-survey`, `region-sky`,
`map-fog`, `developer-atlas`, `southwest-world` (tint guard), `mithala-world` (the coordinator already added your
edges to its table: West Mithala 8, North Mithala 6), `open-country` (its probes of ground nobody owns: if Henborth
covers one, move the probe off Henborth and say so), `nobody-sealed-in`; life agent: `west-life` per zone,
`wildlife-loading`, `regional-build-steps`. Red before you started, the same on `a2e49c3`: `languages`,
`local-map-data`, `baldro-world`, `izol-world`, `open-country` 4/8 (compare names and messages before calling anything
pre-existing). The world box should not move for Henborth (it is inland); if it does, say so.
