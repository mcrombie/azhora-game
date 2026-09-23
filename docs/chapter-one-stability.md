# Chapter 1 stability pass — 23 September 2026

Vastos is parked. The current priority is Chapter 1, then Chapter 2, then Chapter 3.

- Hold **V** to guard. Backpedaling keeps the shield toward the camera's aim. Autoplay uses the same guard input and completes Glun's shield lesson.
- Autoplay routes along connected road segments, including bends that temporarily lead away from its destination.
- The Caloss rebels now have visible human actors, attack warnings, health bars and rebel encounter labels.
- Caloss's broken bridge has a missing deck, rails and supports. The dirt-road mesh no longer covers the hole. Repair restores the span.
- Chris follows his own Jojo → Glun → west road sequence. His practice has strike, shield and dodge poses; nearby conversations are captioned. This never changes the player's lesson or quest progress.
- Chris cannot be invited before his training is complete. Afterward he asks an untrained player to finish with Glun. Once both have trained, his conversation offers partnership. Joining and sending him ahead use the existing companion system; the invitation flag survives saving.
- The pirate sail appears when Chris completes training, about 86 seconds into an ordinary landing. The shore watch and nearby villagers move to the beach; Orris runs in alarm. Glun remains available for the player's lesson. Ed is thrown overboard, swims ashore, exchanges words with the watch, accepts mercenary service and takes the road.
- Later arrival groups are three minutes apart. Notices and bells are limited to Tidehaven's hex and the six adjacent hexes. Elsewhere, the event just happens without you being notified. Returning does not replay missed notices.
- All quest categories share the filled diamond and ring. Gold, silver, copper and green identify their types.

Validation is bounded: focused Node tests for the affected systems, real-world road and bridge tests, and isolated Electron input/scene checks. No full-suite or full-campaign completion claim.

Desktop runs load this checkout directly through `scripts/launch.cjs`; reopening the desktop app loads these changes. To review without changing a saved adventure:

```powershell
node scripts/launch.cjs --smoke-test --main-arc-checks
node scripts/launch.cjs --smoke-test --review-views=rebel-ambush,caloss-broken,caloss-repaired,chris-training,harbour-alarm,ed-enlists
```

The autonomous lesson and arrival schedule derive from saved play time. Existing adventures resume at that time; use a fresh adventure to watch the whole opening sequence.
