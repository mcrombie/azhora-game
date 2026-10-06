# Baldro Dwarfland implementation

1 October 2026. The user authorized the first playable Baldro build after the
[design discussion](dwarfland-design-draft.md). Dwarfland is a confederation of two
surviving independent city kingdoms. Each controls its own gate and combines
inhabited working districts with abandoned quarters. The drowned West Oremindi
capital is still their greatest lost realm; West Oremindi and Sevron remain a
later phase.

## What this build contains

The complete authored West and East Baldro footprints are ordinary playable
regions, with 36 and 32 atlas hexes respectively. West Baldro has exposed rock
shoulders, open turf and sparse pine, birch and juniper cover. East Baldro has
more sheltered fir, pine and birch woods. The continuous terrain includes five
unequal ridge crowns, lower connecting shoulders, basins, contour approaches and
a walkable route between the kingdoms. No glacier, lake or coastal access is
invented. Eastern border water follows the atlas's twelve small-river sides,
with the rendered channel fitted to the owned bank; source map edges remain
available in the geography data.

Two decorated, solid mountain facades lead to **West Hold** and **East Hold**.
These are working city labels, not newly invented royal names. Each enclosed
interior has six rooms: gate hall, commons, hearth district, work district,
abandoned district and a raised memorial hall. Their plans share a construction
language, with mirrored layouts and different stone and metal palettes. Floors,
ramps, walls, furnishings, ceilings and the indoor camera belong to the interior
controller. Entry selects that floor explicitly; surface travel never acquires
an underground floor merely by crossing its X/Z coordinates.

Each city has two unnamed gate guards and four unnamed civic roles. They use a
dedicated short, broad dwarf model and local dialogue. These figures establish
ordinary life and the confederation's history; they do not yet have schedules,
personal stories or a full civilian simulation. The memorial and unused rooms
show losses alongside the active hearth and workshop spaces. There are no named
new sovereigns, religious systems or claims on the old Oremindi capital.

Visitors earn each city's permission separately. The western guard asks for
three route cairns to be repaired; the eastern guard asks for three sluices to
be cleared and reset. Work sites sit beside the approach, with the interaction
stands and walking routes clear. The materials are already present, so no
inventory fetch is required. Reporting all three repairs grants permanent
admission to that kingdom and **30 Construction XP once**. The second kingdom
still requires its own work and report. Completed works change visibly and
remain completed after loading.

Forests use registered stone pine, silver fir, silver birch and common juniper.
Every tree keeps its species, timber, collider and felling handles. Trunk roots
use the actual displayed terrain sampler over their whole footprint. Ground
cover includes scree chips, shrubs, turf and western orpine pockets. Instanced
scenery is divided into 96 m chunks with computed culling bounds; the gate and
each work site have separate merged meshes. Repair meshes remain separate from
the world's static merging so their visibility can change.

Persistent wildlife homes cover usable ground across both regions, rather than
appearing around the traveler. The existing hill-sheep graze seasonally in the
west, hares and deer inhabit both countries, and woodland boar use sheltered
eastern ground. All ground homes enforce ownership, altitude, slope, water and
settlement exclusions. The existing shared wildlife controller retains animals
while culled and animates them on the actual ground. No new animal rig is added.

## Guarded Smithing specialization

The skill registry now contains `dwarvenSmithing` as a child of `smithing`, shown
directly beneath **Smithing** in the journal's Skills browser. The Smithing guide
links to it, and its own guide links back to the parent. Untaught characters,
including old checkpoints without this skill, see it locked. The first teaching
must occur before it can receive experience; ordinary Smithing remains freely
practicable under its existing rules.

The West Hold artisan introduction is limited to **repair-riveting**: controlled
heat, fitting and peening the joint, then quenching and inspecting the result.
Its agreed reward is **45 Smithing XP plus 30 Dwarven Smithing XP once**. The
skill layer stores the first teaching and both experience totals; the Baldro
lesson state owns the once-only completion and reward transition. Opening the
journal or repeating `skills.learn` grants no experience.

The technique record distinguishes that first lesson from **further dwarven
techniques**, which remain locked for future quests at every skill level.
Neither the lesson nor entry permission establishes a political alliance,
confederation-wide trust, or permission to learn every guarded craft.

## Visiting and controls

For the short computer demonstration, use **F8 > Quest playtests > Silver >
Dwarfland**. It begins at the western gate, accepts **A Place at the Forge**,
repairs the three approach cairns through ordinary interactions, reports to the
gatekeeper, enters the city, and walks to the artisan. The player heats, fits and
peens, then quenches a practice rivet before presenting the work for the lesson.
The changing workpiece, hammer motion and quench steam mark the operations.

Any key takes control; **P** resumes. A saved workshop lesson reloads at the safe
exterior gate with its admission and forge step intact; autoplay re-enters and
continues. A repeated F8 run resets only West Hold's introduction/admission and
the testing session's guarded skill. East Hold's earned permission is preserved.
The normal adventure checkpoint is never replaced by this demonstration.

Run `npm run test:dwarves:autoplay` for the isolated desktop demonstration check.


1. Open **F8**, choose **Go Anywhere**, then **West Baldro Mountains** or **East
   Baldro Mountains**. Each arrival is outside its city on the mountain approach.
2. Follow the contour route uphill. Use the ordinary interaction key, **F**, at
   a gatekeeper or the door to ask for entry and accept the local work.
3. Follow the marked approach to the three exterior sites. Press **F** to do
   each repair, then report to that city's gatekeeper.
4. Enter through the guarded door. Use ordinary walking and camera controls to
   explore the six rooms, ramp and civic figures. The bronze door in the gate
   hall returns to the surface.

Mounting, jumping and exterior climbing are unavailable while inside. The
exterior country keeps normal walking, climbing and falling rules. Developer
travel exits an active interior before relocating the player. A checkpoint made
inside saves a safe exterior entrance position, together with the independent
admission and repair state. Older checkpoints without a Baldro section begin
with both gates unearned and remain loadable.

## Module map

| Module | Responsibility |
|---|---|
| `src/content/regions/baldro/baldro-world.js` | Atlas ownership, climate, ridges, basins, two gates and arrivals, task sites, approaches, shared saddle route and mapped border drainage |
| `src/content/regions/baldro/baldro-ground.js` | Local refinement of displayed terrain and the final triangle-height sampler |
| `src/content/regions/baldro/baldro-scenery.js` | Closed mountain facades, exterior works and work shelters, repair visibility, registered trees, local ground-cover batches and water ribbons |
| `src/content/regions/baldro/baldro-wildlife.js` | Stable terrain-derived habitat homes and species limits |
| `src/content/regions/baldro/baldro-state.js` | Independent service acceptance, repair, report, admission, exactly-once reward and checkpoint validation |
| `src/world/actors/dwarf-model.js` | Articulated dwarf body, clothing and occupation variants |
| `src/content/regions/baldro/baldro-interiors.js` | Six-room plans, physical floor and wall rules, ramp, furnishings, lights and indoor camera |
| `src/content/regions/baldro/baldro-host.js` | Guards, civic roles, dialogue, repair markers, explicit entry/exit and scene visibility |
| `src/world.js`, `src/world/terrain/world-terrain.js` | Ground/scenery composition, final footing, water and navigation integration |
| `src/main.js`, `src/app/saves/road-checkpoint.js` | Input, travel, interior floor ownership, rewards, save and restore |
| `src/content/regions/western-regions/west-regions-life.js` | Shared instantiated wildlife rigs and distance culling |
| `src/gameplay/skills/skills.js`, `src/ui/skills/skills-browser.js`, `src/ui/skills/skills-browser.css` | Lesson-gated Dwarven Smithing progress and its nested journal presentation under Smithing |
| `src/ui/skills/skill-icons.js`, `src/ui/skills/skill-announcement.js` | The specialization's mark and first-technique announcement |
| `src/world/terrain/region-world.js`, `src/dev/tools/build-status.js`, `src/ui/map/map-fog.js` | Normal region registry, travel/build status and discovery coverage |

The scenery factory is `buildBaldroScenery(scene, {heightAt, treeGroundAt,
colliders, isReserved})`. It returns `root`, registered `trees`, `stats`,
`landmarks`, `taskSites`, `entrances`, `batches`, `waterMeshes`, `reservations` and
`setTaskComplete(id, complete)`. `treeGroundAt` must sample displayed terrain;
the world passes the final Baldro triangle sampler. The host synchronizes every
repair mesh from saved progress. `BALDRO_WILDLIFE_ZONES` is included in the shared
`WEST_LIFE_ZONES` population.

## Validation

Focused Node checks can be run without Electron:

```sh
npm run test:baldro
```

The specialization has a focused test file:

```sh
node --test --test-isolation=none tests/dwarven-smithing.test.js
```

Its **6/6 checks passed** on 1 October: the teaching gate, separate parent/child
progress, later techniques remaining locked even at level 99, old and current
checkpoint behavior, nested filtering/search, and the journal browser's actual
parent/child controls on a small test DOM. A separate **39/39** skill, browser,
sheet, announcement, combat-skill and game-mode regression run also passed.
These results cover the skill layer; they do not by themselves claim a completed
desktop artisan walkthrough or its once-only host reward integration.

Run the real desktop checks and capture the six initial review views:

```sh
npm run test:baldro:desktop
node scripts/launch.cjs --smoke-test --baldro-checks --review-views=baldro-west-gate,baldro-west-hall,baldro-east-gate,baldro-east-district,baldro-west-dwarf,baldro-east-overview
```

The earlier gate-and-interior Node run passed **45/45 checks** after the final interior and idle-pose
changes. A separate compatibility run passed **97/97 checks** covering checkpoints,
regional survey/layout/levels, testing travel, fog discovery, climbing and falling.
The real-world travel test constructs the full game terrain and confirms the F8
place destinations have standable ground. Interior tests traverse every district
and resident approach, check wall/furniture/body collision and camera rays, and
verify independent saved permissions, partial repairs and one-time rewards.

The scenery and wildlife files check portal, guard and work-site clearance;
every connected route up to the closed door's interaction threshold at metre
intervals; per-instance culling bounds; complete trunk footprint grounding;
species registration and felling; owned terrain habitats; and persistent wildlife
under animation, pause and distance culling. Those six checks passed on 1 October.

The final desktop run produced `tests/artifacts/baldro-checks.json` with **49
passing checks, 2,265 rendered-ground route samples, 82 animals and no reported
errors**. Its scenery inventory contains 871 registered trees across the two
regions. It checked both F8 destinations, unearned entry refusal, the two normal
guard conversations and six repair interactions, independent admission, interior
floor ownership, walking to the commons and raised memorial, safe exterior save
positions, state restoration, and exactly 60 Construction XP across both tasks
without repeat rewards. The ordinary player collision world also stopped the
traveler at both gatekeepers.

Both native mountain probes rejected uphill walking and instead supported an
attached two-second climb of more than three metres at a cost of 14 stamina.
Their steep descents started physical falls through the actual terrain and
scenery collision. This uses the rendered triangle height sampler, not only the
mathematical terrain profile. The native restore check applied saved state in
the running renderer; fresh-host restoration is covered by Node tests, but a
fresh-renderer reload was not run for this build.

The initial six screenshots prompted improvements to the facade rock shoulders,
interior masonry, furnishings, lantern fittings and idle character pose. Final
review captures include the west commons, east abandoned district, a dwarf,
east exterior overview, west hearth district, workshop and memorial. These are
visual reviews rather than exhaustive player-height border-channel validation.

The complete world is still constructed before play. The expanded land bounds
increase that existing loading cost; the isolated desktop runs took several
minutes to initialize in this session. Regional streaming and broader startup
performance work remain in the world implementation plan.

## Introduction playtest validation (1 October 2026)

- 36 focused state, host, autoplay and specialization checks passed.
- 39 existing skills, journal, announcements, combat-skill and game-mode checks passed.
- 56 checkpoint, quest-tracker, main-playtest and testing-travel checks passed.
- The isolated desktop run passed all 31 checks through the public F8 card. It
  accepted the real task, repaired all three cairns, earned admission, crossed
  the actual portal, navigated the furnished interior, completed all three forge
  operations, and received the one-time 30 Construction + 45 Smithing + 30
  Dwarven Smithing experience.
- The run took control and resumed outdoors, saved at the first forge operation,
  reloaded at the safe exterior gate, re-entered and finished the remaining work.
  A repeated F8 start reset the lesson. Both runs preserved the normal adventure.
- The measured run walked 601.6 metres, including the extra save/reload return,
  in 276 seconds. Apart from the two ordinary city portal crossings, the largest
  horizontal frame step was 0.36 metres. No renderer frame errors occurred.
- Reviewed gate, forge and completion screenshots. Review prompted explicit
  destination names and removal of the duplicate exterior marker; indoor task
  markers remain at the underground floor height.

The renderer reported no game errors. Chromium emitted a GPU teardown warning
only after successful completion and the process returned exit code 0.

## Deliberate limits

The wider optional arc remains future design: separate trust and politics in
each sovereign kingdom, goblin conflicts, cooperation that can help the cities
thrive, a viable choice to leave them alone, and adverse branches with their own
benefits and potentially destructive outcomes. None of those later branches is
implemented by the first guarded lesson. The confederation and the remembered
Oremindi loss inform this direction without establishing an automatic alliance
or a predetermined response to the player.

This is the first playable settlement build, not a full metropolis or completed
regional story. Each hold currently returns through the same gate it entered;
additional exits, room networks, major vertical levels and daily civilian
routines remain future expansion. Royal names, named residents, personal
stories, religion, magic, and the ancient capital's dwarf name and language are
undecided. Baldro's knowledge of Sevron is also undecided. No West Oremindi
geometry, Sevron settlement or siege-flood mechanics are added here.
