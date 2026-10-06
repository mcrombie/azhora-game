# Suval highlands and the burned Iscare islands

Implemented for the 27 September 2026 vigilante quest. The user's war chronology supersedes the older peaceful-city descriptions in the lore: Wilhelm's independent army burned Imlamdris, Solis and Zecron while offering destruction to Nanvir, before sailing south in 978. No new civilian characters are introduced by this terrain work.

## Suval

- Seven real height-field peaks raise the West and South Suval uplands. Bent ridge lines, unequal flanks, erosion channels and smaller shoulders replace circular domes. Exposed limestone faces follow the terrain and remain physical obstacles to direct summit walks.
- Three graded routes wind through the uplands: a northern ridge track, the Hollow Ridge cave approach, and a recovery road around the west side of the South Suval ridge to Imlamdris. Paths are about 2.3–2.8 metres wide. Their visible ribbons, navigation lines and terrain grades use the same straight segments, including at hairpins.
- Fine ground across the peaks and path corridors replaces the coarse seven-metre country mesh. The broad mesh is lowered beneath it. This keeps narrow cut paths visible rather than buried under triangles spanning the mountain faces.
- The cave is an actual shelter with a stone roof, solid side/back walls, an open entrance and a level interior. Its inhabitants can walk out to a clear flight apron. It is tucked behind the ridge instead of placed at the top of an obvious straight road.
- The original route through the Imlamdris pass, Stillwater lake and all closed East Suval gates remain intact. Ordinary walking access to East Suval remains barred.
- Imlamdris retains its terraces, street plan and lake-facing foundations. Sixteen houses are now roofless ruins with charred beams. The Stillwater Temple has broken columns, a missing roof, fallen rafters and a real breach in its back wall. Four small timber homes and a fifth house frame stand on the western edge of the ruins.
- Four bounded areas of burned vegetation and abandoned offering stones show the lingering Nanvir devastation without making the whole region impassable. Existing South Suval animals remain, with boar starts moved clear of new cliff faces.
- East Suval's sealed border now has varied cliff shoulders, exposed strata and needles, stepped wall heights, and four winding false approaches. Two terminate in rockfalls; two reveal barred posterns. They stay outside the country and have clear retreat routes. Existing gates and the authorized smugglers' door retain their positions. See `docs/east-suval-border-variety.md`.
- The Sultana's Solis berth now sits beyond the timber pier instead of overlapping it. Its arrival/departure route bends around the offshore shoal; the complete hull retains enough draft along its approach.

The shared pure API is `src/content/regions/suval-highlands/suval-highlands.js`:

| Export | Meaning |
| --- | --- |
| `BAT_CAVE.entrance` | `(-182, 1084)`, South Suval |
| `BAT_CAVE.perch` | `(-182, 1078)`, level cave floor at 76 m |
| `BAT_CAVE.apron` | `(-182, 1093)`, roof-free launch/landing point |
| `BAT_CAVE.approach` | `(-196, 1088)`, last turn of the approach |
| `BAT_LANDING` | `(-404, 703)`, safe northern West Suval ground outside the East border |
| `SUVAL_HIGHLAND_TRAILS` | Three graded trails for scenery and navigation |

## Iscare

The atlas names this region **Iscare Archipeligo**, with that exact spelling. This is kept as the stable registry key; it is a separate region from **Isareos**, the inland western country. The generated survey now includes all ten authored Iscare land hexes. Coastlines, channels and gaps come from those actual atlas cells; no land bridges were invented.

The atlas does not mark a city of Zecron. For this implementation, Zecron occupies the northernmost island, hex `(1,119)`, nearest Solis: world centre approximately `(-650,1155)`. That is an implementation placement, not a recovered map label. It has twelve roofless buildings, a broken lighthouse and burned quay piles. Five other islands have three burned homes apiece. Every island has persistent hares and gulls, coastal rocks and scrub; sheltered ground carries a few wind-bent trees. Zecron and the smaller settlements have no residents.

Iscare is marked **Playable · early** in the developer chart. Terrain, ruins and wildlife are built; ferries, normal boating, interiors and an island campaign are not part of this pass. Testing travel and the developer bat provide access for inspection.

## Validation

Focused Node checks cover:

- Exact agreement with the authored island hexes and generated survey.
- All island wildlife anchors on actual collision-free ground, with mammals as well as birds.
- Both cave quest points and the flight apron on standable South Suval ground, and the final landing in West Suval.
- Every metre of all three highland routes clear of the completed world's props and collision.
- Continuous route grades, ordinary movement along the switchbacks, and visible solid cliff faces.
- Downward mesh raycasts along the trails to catch a walking surface buried by rendered terrain.
- Existing Stillwater swimming, terraces, stairs, closed frontier pass and southern cliffs.
- Ruined temple breaches, sixteen ruined homes, four new wooden homes and the new frame.
- Map discovery areas, developer build descriptions and survey regeneration.
- Half-metre sampling of the solid East Suval boundary, ordinary/horse-width gate approaches, all four false-passage routes and their physical dead ends, with the old smugglers' quest route still usable.
- All seven Sultana tests pass against the completed world, including full hull depth checks at every port and along every arrival route.

The main implementation's refreshed native Batman run passed all 80 checks. Native captures of the rockfall and barred cut are `tests/artifacts/bat-rockfall.png` and `tests/artifacts/bat-barred-cut.png`. No separate Electron process was launched for this terrain subtask.

## Natural terrain refinement - 27 September 2026

The Suval hills now blend across hex boundaries using all nearby terrain samples. Mountain shoulders ease into the Stillwater basin and the city edge instead of ending in abrupt height steps. The seven highland peaks have distinct elongated profiles, gently bending crests, smaller shoulders and erosion channels. Exposed limestone, heath and grass vary across their slopes. Exposed bedrock follows irregular contours and blends into the hillside instead of forming equally spaced upright crowns. Broad shoulders support the switchbacks without narrow raised earth walls.

The winding hiking routes, cave chamber and launch apron, northern landing, lake shore, city terraces and locked East Suval frontier remain accessible in the same ways. The terrain pass itself only added graded hiking trails. The subsequent [Suval climbing implementation](climbing-suval.md) adds gripping, stamina, ledges, falls, animation and a Climbing skill while preserving those walking routes.

Flight checkpoints now record route lengths so changing the terrain does not invalidate a completed tour or move a resumed flight to the wrong progress. Older flight saves migrate without replaying discovery or skill rewards.

Final terrain validation: all 32 focused tests pass against the completed world, including walking surfaces, Catie's route, cave and landing access, flight clearance, lake and city preservation, and the locked frontier. The final native Batman run passes 88 checks with no renderer errors, including held/released Tab turbo; the final terrain views were visually reviewed. The scenic tour remains about 123 seconds and reveals all 63 Suval hexes at landing.
