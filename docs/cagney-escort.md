# Cagney and the Cagnappers

Cagney waits near Caelom at the west fork beyond the Caloss bridge. She has long black hair, glasses, and ribbons on her shirt. Caelom warned that going home alone would leave her at the mercy of “cagnappers”; she asks the traveler to escort her to Ambron.

Accepting starts an optional silver quest. Cagney leads along the west road and waits when the traveler falls behind. Three cagnappers crouch in shrubs and young trees beside the Luscian end of the road just before Elagos. Their leaf-covered shapes are present before the ambush; those same figures emerge to attack. The traveler must protect her, then continue through the Ossen Gate and the upper lane to her house. Speaking to her at home grants 45 copper once.

The checkpoint preserves her progress, health, and which cagnappers were defeated. Retreating does not reset the gang. Old saves without this quest begin with Cagney waiting at the fork.

Testing Tools provides a dedicated Cagney playtest beside Ben, Liz, and Troy. It starts at Cagney, accepts the quest, walks with her, fights the ambush, and collects the reward. After its initial testing teleport, the pilot uses ordinary movement and combat inputs. Manual input takes control back.

Validation covers quest outcomes and rewards, checkpoint compatibility, the actual world route and house approach, and native autoplay.


## Playtest refinements (25 September 2026)

Ben and Cagney share a continuous guide-following controller. It matches the guide's walking pace, eases changes in the gap, and keeps steering independent of the trailing camera. Native quest tests measure movement and camera reversals during sustained following, in addition to completing each quest.

Cagnappers begin at full regional health. Saved injuries use a fraction of their authored health so Luscia's combat scaling cannot make untouched attackers appear wounded, heal real injuries on retreat, or resurrect dead attackers. Survivors walk back into their permanent roadside cover after disengaging.

Cagney's home has a dusty-blue doorway, a small rain canopy, rose shutters and flower boxes, and a matching mailbox labeled Cagney. Her approach and doorstep remain clear. Native review views: `cagnappers-hidden`, `cagnappers-active`, and `cagney-home`.

Verification: full native Ben (84 seconds) and Cagney (259 seconds) autoplay passed, including reward choices/completion, save isolation and manual takeover. Ben recorded no stop/start transitions over 45 seconds of sustained following; Cagney recorded one over 232 seconds. Cagnappers were visually checked at 70/70 health each before contact. Focused quest, route, camouflage and marker checks and the web build passed. Review-only captures reported no game errors, with the existing Electron GPU warning appearing during shutdown.
