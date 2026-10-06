# Catie quest playtest

F8 → Quest playtests → Catie starts a fresh, isolated run of **A Kindness with Wings** beside Catie at Port Calos. It accepts her request, walks the public roads around the closed East Suval frontier, climbs every turn of the hollow ridge path, speaks peacefully with Batman, and accepts the roughly two-minute scenic tour through all three Suvals. The normal quest reveals all 63 regional hexes on landing without visiting every hex. The computer acknowledges the landing conversation and gives control back in northern West Suval.

The tour is controlled by the normal Batman quest. Autoplay does not move Batman, teleport along the route, reveal the map itself, award skills or edit quest progress. Its only initial teleport belongs to the testing setup beside Catie. Choosing the playtest again resets its local quest, flight, bounty and Flying lesson while leaving the normal saved adventure intact.

Any player input takes control. P resumes the focused Catie quest, including while Batman is carrying the traveler. Taking control during the flight does not cancel Batman's flight. Pausing or opening a menu pauses the carried tour. An unrelated conversation, combat, hostile choice, death or blocked route stops the pilot with an explanation instead of choosing a different story branch or recovery.

The planner uses camera-independent movement directions to avoid steering feedback, the live actor collision view, and the normal movement solver. Resuming halfway up the mountain rejoins the current path segment instead of returning to Catie or cutting across the cliff.

## Validation

- `tests/catie-autopilot.test.js`: conversation choices, carried-flight ownership, pause and takeover, failure stops, and path resumption.
- `tests/catie-autopilot-world.test.js`: samples the real road route outside East Suval and drives ordinary movement through the complete built world to the cave.
- `src/dev/checks/catie-autoplay-checks.js`: drives the public F8 button and real rendered frames through the whole quest, verifies road and flight takeover/pause, 63 surveyed hexes, safe landing, normal-save preservation and repeatability. The native runner additionally checks actual keyboard takeover and P resumption.

Historical native validation on 27 September 2026, before the tour was shortened, passed all **27 checks**, with zero frame or renderer errors. That original long-route run took 831 real seconds, walked 1,609 metres, flew 8,395 horizontal metres, and surveyed all 63 hexes. These measurements describe the previous itinerary, not the current shorter tour. Road and air takeover/resume, menu pause, completion, a fresh repeat, actual native WASD/P input and normal-checkpoint preservation all passed. The test uses the usual isolated profile and in-memory saves.

The shortened tour was checked separately in a Node simulation using the complete constructed world: 120.2 seconds from takeoff to landing, 2,301 metres along the smoothed 3D route, all three regions traversed, all 11 narration beats and all 63 map reveals at landing. A new full native Catie autoplay run has not been claimed for this revision.

The live run exposed two integration issues that were fixed: selecting Catie's objective stopped its own pilot, and Sela's automatic roadside offer interrupted the focused demonstration. Side-quest demos now defer that unsolicited offer; her conversation remains available when the player takes control.
