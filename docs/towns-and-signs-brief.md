# Brief: flesh out the towns and places, and make the signs belong

Start from the scaled world (`docs/world-scale-report.md`; hand-placed coordinates go through `src/world-scale.js`, and each place is a rigid cluster). The user finds many places undeveloped: a gate and a few boxes where a town should be. Make each place in the four regions feel built and lived in, and fix the signs, which do not match the rest of the game's look.

## Signs first

- Look at every kind of sign in the game: the village trail signs (`trailSign` in `src/world.js`), the road and border signposts in the regions, the Caloss signpost, the Moros gate, waymarkers. Capture them with the review screenshots (`npm run review:*`, see `CLAUDE.md`) or a scratch render, and compare with the village's buildings and props.
- Give the game one sign language: weathered timber posts and boards in the same woods and proportions as the village's carpentry, low-poly and flat-shaded like everything else, lettering that is readable at the follow camera's distance and consistent in colour and size, the same board shapes for the same meanings (a pointed board for a direction, a square board for a place name, a small plaque for a notice, a painted stone for a border). No glossy, emissive or default-material parts, no text that faces away from the road. Apply it everywhere and delete one-off variants.

## Places to develop

Keep each place's centre and its existing quest-critical stands, sites and colliders where they are; add around them. Every building gets a collider; every new NPC stand is standable, reachable and at least 4 m from quest NPCs; roads and trails stay clear.

- **Drent**: the Avrel clearing becomes a working farm hamlet (farmhouse, barn, byre, field walls, a stack yard, Corvan's Legion post as a proper lean-to with a flag); the Caloss Gate gets a gatehouse and a guard hut; Fernway Rest a shelter and a bench.
- **Luscia**: the Caloss crossing camp (Hollis's work yard, timber stacks, a ferryman's hut), the reedcutters' landing, Sava's shrine (a walled court, offerings), the old relay hut, the field at the Lauvel (more of the aftermath: trampled ground, a field hospital tent, a cairn), the burned hamlet (three or four ruined houses, a well, a scorched orchard). Lumber Town is new and mostly fine: add a palisade gate at each end of the road, a smithy, a chapel or hall, and lived-in detail (washing lines, carts, a notice board).
- **Moros Plain**: the Legion camp should read as a Legion camp: gate towers, a ditch line, ordered tent rows, the command tent with the Legate's standard, a smithy tent **with a working repair bench** (the quartermaster's lines promise one; register it like the other benches), a mess fire that works as a campfire, a parade ground where the mercenary company musters, the horse line. The Moros gate gets a proper gate and watch platform. The border stockade gets a fighting platform and a truce-flag pole.
- **East Suval**: Elod is a town in the lore and a gate and a few buildings in the game. Build it: stone houses climbing a slope above the sea, a market street, a harbour stair or quay, a shrine, 12 to 16 buildings, and six to eight Suvali townsfolk with ambient lines and one or two with a small favour or rumour (no new quest systems). The border post becomes a real post (barrier, guard hut, stable); the waystation and Oda's shelter get furniture and a yard; the bandit lookout a hidden camp with signs of recent use.

## People

Put new ambient NPCs and their lines in a new module (for example `src/town-life.js`) with one hook in `src/main.js` (CRLF, very long lines, do not reformat). Follow the tone rules in `docs/content-pass.md`: the Legion speaks in orders, locals speak plainly, soldiers are men by default, there is no South Pyros. Only the Legion's people wear Legion armor.

## Rules

- Work in your own worktree and branch. Another agent is building West Suval and Solis at the same time in new modules; do not touch `src/border-chapter.js`, `src/region-layout.js` or the region survey.
- Keep draw calls and triangles in check: reuse materials and the existing batching helpers; the traversal smoke's frame-time figures should not get worse by more than about 15%.
- `npm test` stays green; add tests that every new stand is standable and reachable and that no building blocks a road. Run `npm run test:game` and `npm run test:road` once each at the end and fix what they find; do not loop on smokes. Check your work by eye with review screenshots of each place and the signs.
- Commit in milestones on your branch; write `docs/towns-and-signs-report.md` with before and after screenshots' paths.
