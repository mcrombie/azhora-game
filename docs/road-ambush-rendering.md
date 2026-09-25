# Persistent roadside ambushers

`src/road-ambush-watch.js` draws the three stable records supplied by
`createRoadAmbush().actors()`. Each is an ordinary human character wearing
irregular brown cloth and tied leaves. The outline deliberately keeps a head,
shoulders, hands and boots: a careful traveler can notice someone hiding before
entering the ambush. Waiting figures crouch and breathe. Returning survivors walk
at the positions supplied by the simulation.

`src/road-ambush-scenery.js` adds permanent waist-high shrubs and young trees
around those same hiding places. The foliage breaks up their silhouettes while
leaving glimpses of heads and shoulders. Only the narrow trunks are solid; they
stand on the woodland side so the road and the ambushers' exits remain open.
This authored cover does not consume the seeded woodland scatter or disappear
when an ambusher leaves or dies.

The watch view and combat view share a character rig. Construct the watch with
`{ scene, world, definitions: AMBUSH_REBELS }`, give combat its `actor(id)` accessor,
and update the watch after combat with `update(time, records, { combat })`.
The watch never adjusts an active combatant's transform. `actor(id)` also readies
the model for combat, so diagnostics should use `snapshot()` instead.

After the corpse view accepts a dead actor, call `release(id)`. The watch leaves
that actor's transform, visibility and parent untouched. A subsequent live
checkpoint creates a new living rig; the corpse host manages its own restored
bodies. The simulation owns health, identities, return routes and save data.

`tests/road-ambush-watch.test.js` checks readable opaque figures, stable actor
identity, combat ownership, return movement, corpse handoff and restoring a
living checkpoint. Native visual review should approach the junction from outside
the trigger, then observe a fight and retreat: no duplicate body or position jump
should appear at either transition.
