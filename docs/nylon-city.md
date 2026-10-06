# Nylon: the vertical city at the Lizeem mouth

Built from the user's 3 October 2026 brief. Nylon occupies southwest **Eer**, on the eastern bank of the Lizeem estuary. The existing river, its mouth and the opposite bank stay in place.

The city is deliberately compressed and tall: its enclosed ground is roughly 20% larger than Solis, while 40-metre curtain walls and 52-57-metre wall towers, with spires above them, make its defenses the tallest city circuit built so far. Most ordinary building bodies rise 23-35 metres. The Great Library has a broad, ornate 38-metre principal volume with a crown reaching about 62 metres; the narrow palace rises 76 metres before its roof and orrery crown, about 84 metres overall. Open streets and courts preserve views upward through the skyline.

## Architectural direction

Nylon's lore describes an independent city of river trade, booksellers, printing houses, academies, salons and public debate. The architecture expresses those institutions through tall masonry houses, layered arcades and civic courts, rather than copying Ambron's imperial terraces or Solis's sun-horse defenses. Cream limestone and ivory masonry, deep teal roofs and bronze fretwork give it a shared civic palette. The library is immaculate and richly detailed. The requested palace is the **Palace of the Civic Council**: a tower palace consistent with Nylon's council government, without introducing a new monarchy.

The Lizeem Gate connects to a large fortified estuary harbor. Two 27-metre waterfront curtains run from the city gate to offshore breakwaters, wrapping the eastern sea basin immediately below the Lizeem mouth. Substantial sea towers protect the opening: 36 metres between their centres, leaving more than 20 metres clear for ships between their foundations. The river retains its full authored channel to the sea, west of the harbor works. There is no new bridge or ford across the Lizeem.

The working waterfront has a 64-by-10-metre stone provision quay, three long finger piers, two unloading cranes, stored cargo, mooring posts, a grain barge, a coastal cutter and a small library launch. The quay and piers stand at 4.2 metres, above the sea's 0.45-metre surface. A gently sloping ramp joins the real riverbank to the quay; the same declared deck geometry drives rendering and player support. Submerged piles and breakwater foundations reach the actual sea bed. These are static harbor props, not a shipping simulation or new civilian cast.

## Finding and testing it

- Use the developer travel controls for **Eer > Nylon** to arrive in the central court at `-1320, 1115`. To approach from outside, enter `-1308, 1048` in **Go to a point**, just north of the Gate of Inquiry.
- Explore the central court, the library entrance, Council Tower approach and river gate. Follow the fortified approach to the harbor at `-1302, 1191`; the three piers are walkable. The sea entrance is at `-1288, 1300`. The large civic buildings currently have exterior detail only.
- The journal map gives Nylon the same castle badge and nameplate as other built cities, labeled **City-state**. Its outline follows the actual walls; ordinary exploration and fog still apply.
- The city is part of Eer's scenery, so both Full loading and Fast mode's region loader include it.

The pure layout is in `src/content/regions/nylon/nylon-city.js`; the shared coordinates govern masonry, collision, streets, terrain preparation, map detail and travel landmarks. Existing Eer scenery is excluded from the city and its approaches so wild trees do not appear in the streets when the region streams in.

## Scope left open

Building interiors, civilian residents, shops, the working library collection, shipping, customs and civic quests remain future work. No unnamed civilian cast or royal family is invented in this exterior build. The wider Eer countryside retains its current terrain and wildlife; its villages, cultivated farms and drainage network are separate future work.

Lore reference: the read-only sibling files `world-builder/azhora_lore/geography/regions/nylon.md` and `eer.md`. The user's riverbank placement and exaggerated vertical proportions take priority over older notes that Nylon was outside the built atlas window.

## Verification

The original city pass completed 55 focused checks and native review of its skyline, map badge and 583 metres of streets. The expanded estuary harbor adds deck, river-clearance and ship-entry checks: all 11 focused city/scenery tests pass. They sample the original river across 90% of its width, verify a seven-metre-wide passage through the sea entrance, check grounded culvert supports, and walk every authored city and pier route against actual colliders and terrain/deck heights. The first build's 400k-vertex budget becomes 500k for the added harbor; the combined scenery currently uses approximately 434k vertices in fewer than 65 merged meshes. The expanded harbor also passed native desktop visual and movement review: 1,189 metres walked through city streets, the approach ramp and piers, with a maximum route grade of 0.1985 and no renderer errors. The fortified sea entrance and the unblocked river mouth were inspected from the sea. Results are recorded in `tests/artifacts/nylon-checks.json`.

The full Eer world fixture passes 11 of 12 tests. Its remaining assertion expects West Oremindi to use the default sky, although that region already declares its own sky; neither that palette nor its sky logic changes in this city pass. Eer's terrain, watercourses, plants, wildlife and travel checks pass.

For a desktop review: `node scripts/launch.cjs --smoke-test --fast-load --review-views=nylon-overview,nylon-library,nylon-palace,nylon-gate,nylon-drain,nylon-harbor --review-clean --review-size=1440x900`. Omit `--review-clean` when checking `--review-views=map-nylon`.
