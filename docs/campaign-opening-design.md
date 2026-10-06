# Azhora campaign and hero modes

Updated 6 October 2026. The player is one character in an ongoing world. The campaign map is primarily informational: it explains changing faction territory, regions, stability and quests. Direct influence through the map may be explored in middle-to-late development; full faction government is not a requirement of the current interface. Hero play provides personal participation in war in place of a separate Total War style tactical battle mode. The opening below is the user's revised starting situation. Timing and implementation choices identified as proposals remain open.

The 6 October UI revision supersedes the earlier command-oriented prototype. The normal **M** map remains the entry point and defaults to **Regions**, with **Geopolitical** and **Stability** as alternate views. Country profiles explain known rulers, allegiances, wars and territory, and connect to Chapter 1's quests. No Campaign/Hero/Observe navigation, time controls, timeline or chronicle belongs in this minimal prototype. The [current prototype guide](campaign-ui-prototype.md) describes the revised interface and its isolated territory-change examples.

Chapter 1 supplies the first authored political change: the monarchist assault captures Solis and transfers **West Suval to Ambron**; the republican/Coalition assault captures the Moros outpost and transfers **Moros Plain to Izol**, representing the Coalition. West Suval begins under republican/Coalition control as a distinct country allied with Izol. These are alternate successful outcomes, not cumulative gains. The map changes on actual capture, before the final report; winning the earlier field battle is insufficient. Geopolitical and Stability show only visited territory unless developer reveal-all is enabled. This supersedes the initial implementation's automatic final-report conquest and unrestricted political map.

This opening takes precedence over older descriptions of a wholly imperial Caricas, a politically stable Minoran League, or Cedric merely taking refuge in Minora. It also replaces the earlier weak-bandit characterization of both Lotharn regions with open rebellion. It does not prescribe the eventual winners of those conflicts.

## An authored scenario in a dynamic world

The campaign is an authored scenario with an intended progression, played out by active factions and persistent people. Hero play remains Azhora's main embodied experience, and the campaign map lets the player read the same world's political situation. The scenario supplies the major developing threats and events; exploration, quests, politics and war determine the circumstances in which those events unfold.

| Intended phase | Authored direction | What the live world changes |
| --- | --- | --- |
| Opening | Ambroni succession conflict, Cedric's captured League and Wilhelm's arrival; an internal undead coup follows early | Local loyalties, interference with the coup and what the hero discovers |
| Early northern pressure | Eshtor's undead slowly expand into isolated human kingdoms; four independent goblin allies periodically raid Lond | Saved or lost communities, available quests, defensive strength and outside intervention |
| Long preparation | North Gorgi secretly musters Thalmagar's major goblin/orc army while undead gains can prepare its future route | Army strength, remaining human resistance, supplies, political access and interruptions to preparation |
| Middle developments | The intended story brings Wilhelm's hidden allegiance into focus while the player faces southern conflicts and northern losses | Investigation can expose him sooner; discovery and public belief have separate consequences |
| Middle-to-late invasion | The prepared army advances through Lond, Endevor and Acor toward Mithala, Celder, Yunethre, Minora and finally Ambron, with mountain columns and ongoing raids | Which routes are open, which cities hold, the forces available and how far the offensive succeeds |
| Resistance and recovery | Repel the major offensive and progressively push back an enemy that may hold much of the world | Surviving allies, armies, people, supply bases and the scale of the counteroffensive |
| Beyond the main crisis | Continue the same world after Thalmagar's defeat | Reconstruction, succession, changing alliances, new conflicts and stories arising from the surviving world |

This is the intended event path, not a guarantee that the map reaches the same ownership on every playthrough. In an unchecked campaign, the undead can overrun the northern humans and give the later army a largely friendly approach. Effective intervention should matter to that outcome. An army-readiness event does not silently conquer the corridor, restore defeated forces or remove the hero's prior successes.

The proposed event system records a preparation period, prerequisites, warning evidence, effects and resolved outcome for each major beat. Events can depend on elapsed world time and actual conditions; they are not all triggered by entering a region or accepting a quest. Exact durations and which interventions delay, weaken, redirect or prevent particular beats remain to be designed. Saving and changing modes preserve the same event history.

The baseline campaign assumes resistance to Thalmagar. Becoming his servant and potentially winning through that allegiance is retained as a future branch to explore, without designing it as the current primary path.

## A world that continues after the main quest

Defeating Thalmagar ends the main crisis, not the world's existence. The user wants a potentially indefinite simulation that can be left unfolding and checked periodically, with enough continuing geopolitical and personal change to remain interesting after the authored campaign. Hero play and strategic intervention can continue in the same history. The aftermath retains the actual surviving factions, people, borders and relationships rather than resetting to the opening map.

This is a speculative long-term design goal. A proposed observer option lets autonomous factions continue without repeated player orders, while a dated chronicle makes changes understandable on return and could support the user's own blog about the world. Succession, recovery, changing institutions, migration, diplomacy and resource disputes are candidate sources of continuing stories. Repeating the same invasion or generating disconnected emergencies is not the intended basis of longevity.

Leaving the active game running is distinct from operating in the background, simulating while the application is closed, or running a hosted world. Those execution models, accelerated-time settings, unattended hero behavior and succession after death remain to be decided. No background service, automatic publishing or offline advancement is implemented by this design update. See the [living-world continuation design](living-world-continuation-design.md) for proposed systems and a staged way to test them.

## Two modes in one world

The latest opening places the **player in Minora, Isareos**, as Wilhelm arrives and the League crisis unfolds. This supersedes Drent as the intended campaign scenario starting location. It does not silently relocate the existing tutorial, migrate saves or implement a new playable opening. Wilhelm also rules the separate western Ithzel undead faction described in the [island conflict](thalmagar-crisis-design.md#the-blood-princes-island-faction).

**Campaign mode** currently means an informational view of the existing world map. The player reads geopolitical developments while remaining an individual character. Its geography and faction state belong to the same world around the hero. Possible later influence or command features require further design rather than occupying the current interface.

**Hero mode** is the existing embodied adventure: walking, riding, flying where supported, interacting with people and taking part in wars. It supplies the player's local battle experience. There is no required third mode that teleports armies to a separate tactical battlefield.

Switching modes changes the interface and the level of simulation detail. It does not reset elapsed time, move the hero, duplicate an army, recreate casualties or start another campaign. Looking at a remote battle on the map does not put the hero there. The hero must physically reach an ongoing battle to participate, including by walking or flying into it. Any future remote character-switching or travel shortcut would be a separate explicit design choice.

The hero remains a person at a saved physical location during campaign play. A player can leave the hero in a room and conduct the campaign without walking around. The surrounding world continues: enemies may approach, capture the settlement or reach the hero. Campaign mode grants no invulnerability. Conquest can put the hero in danger and can eventually lead to death; changing ownership does not itself prove the hero has been killed. Personal survival and faction victory are related but separate facts.

Guards, escape, capture, rescue, succession and what happens after the hero dies are later design decisions. A warning and interruption when immediate danger reaches the hero is recommended, especially during accelerated time. That should offer a chance to act without making the hero safe merely because the campaign interface is open.

## Campaign view and world progression

The campaign exists while the traveler adventures. Opening its view observes the current world; it does not create a parallel scenario or restart the political situation. The current minimal interface shows faction territory, regional geography and stability, with details available by selection. Dates, force displays and event history may be considered later; they are not required visible panels now.

### Use the existing main map

The **Geopolitical** view groups territory by its current controlling faction, with one country name over the combined territory and no regional names or internal regional borders. Lond initially combines its five regions under Lond. A loss of East Lond removes that region from Lond's shape. An Undeadland conquest of North Riesov combines it with Eshtor Plateau under Undeadland. Recompute territory geometry and label placement from the current control record rather than merely changing the selected region's tint. Unresolved or shared control must remain distinguishable from sole ownership.

The **Regions** view retains the authored region borders and names. The **Stability** view uses those same regions and names, with colors for stability and conflict; it replaces the earlier Unrest name. Switching views changes presentation, not the underlying territory state. The side panel remains for inspection, with faction and quest lists. Keep the map uncluttered; chronicle and broader interaction ideas remain deferred.

The existing world map is the campaign interface: retain its authored terrain, coasts, rivers, region outlines, lettering, pan and zoom. Put political overlays, force markers, selections and detail panels on that map. The main map remains the dominant visible surface and the place where the player interacts. Do not adopt the Frontier Command interface as the campaign UI. Its useful order, route, supply or outcome logic may inform the underlying system.

During development the entire main campaign map is always visible from the start, with all geographic regions and their names available. Open the campaign at the whole-atlas view, with the existing controls available for zooming into places and returning to the full map. No exploration, map lesson or reveal toggle should be required to inspect the developing campaign. Geographic fog of war is deferred. The later secrecy ruling still hides covert diplomatic ties in the ordinary faction view: full geographic visibility is not omniscient allegiance knowledge.

Full development visibility is a presentation rule, separate from saved exploration. It must not award Cartography experience, mark every place visited, complete the map lesson, change quest discoveries, or erase the data needed for future fog of war. A separate developer truth inspection can expose hidden story information without claiming that the traveler has learned it; ordinary diplomacy initially conceals Thalmagar's secret vassals. The standalone discussion visualization illustrates the state model; it is not the proposed replacement for the game's authored main map.

The proposed timing model is continuous progression with discrete faction decisions. People travel and ongoing work advances with elapsed world time. Factions reconsider orders at scheduled intervals and when important events occur. These decision moments could be simultaneous, staggered, or presented as faction turns; their cadence is undecided. A faction decision does not teleport an army or require the whole world to remain stationary until the player ends a turn.

Use one saved world clock. The campaign interface can remain open while the world advances; it must not inherit the journal's unconditional modal pause. Provide a clear running or paused state and explicit pause control. Both modes consume the same game time, and switching preserves the selected time state subject to necessary loading or encounter handoff. Loading a save adds no elapsed time. Acceleration must process intervening events and stop at consequential interruptions rather than skipping them. The existing 24-active-minute day is a starting constraint, not an accepted continental campaign balance. This describes progression during active play; offline advancement has not been specified.

Direct influence or governance through the map is a possible later feature, subject to further design. No command interface is part of the current informational map. Settling every country's economy and decision schedule is not a prerequisite to displaying today's politics. Faction decisions may use discrete intervals without making map inspection an end-turn action. The shared-clock controls discussed above remain future simulation proposals rather than controls in this minimal prototype.

## Battles at different levels of detail

An unobserved battle needs statistical simulation, not a fully rendered battlefield. Forces, composition, morale, supply, terrain, leadership and fortifications can determine its chances and evolving losses. The exact statistical model is still to be designed. A campaign player can follow those results without ever entering hero mode.

Every battle still has a place, participating forces, start time, elapsed progress and a duration. A battle can be ongoing while the hero travels toward it. Keep enough durable state to represent its surviving people, casualties, wounds, supplies, control of important positions and retreat state. A compact phase and formation model is sufficient; offscreen simulation need not animate every sword stroke or pathfind every soldier continuously.

When the hero approaches an ongoing battle, stream the actual terrain and materialize its current participants from those records. Enter at the present stage of fighting. Earlier casualties retain their recorded state, including any subsequent explicit undead raising event; consumed supplies remain consumed, and routed troops do not reappear as fresh reinforcements. Preserve routes and approach directions so the arrival makes geographic sense. This is a handoff in detail, not a restart or reroll.

Freeze shared simulation during a blocking load so slower hardware cannot determine losses. Use a consistent handoff snapshot. Visual reconstruction must not consume the random draws used by combat; simply loading people into view must not change their future chances.

The statistical resolver yields authority over the materialized participants to local simulation. Record the hero's subsequent actions and their consequences once. If the hero leaves, the survivors and current positions return to statistical simulation. The two levels must never simultaneously resolve the same soldiers. Other distant forces and other battles may continue on the shared clock.

Persist the random seed or random-state position and already-applied battle events. Changing modes or loading must not repeatedly roll a more favorable past. The future can legitimately change when the hero intervenes or new forces arrive. A predicted victory shown on the map is an estimate, not a result already committed to history. A completed battle cannot be entered retroactively: arriving then finds its aftermath.

All commanded units still represent actual people. Statistical aggregation reduces computation, not identity. At minimum, individual roster membership, death, wounds, allegiance and any personally observed state must reconcile exactly across both modes. The distant renderer can be absent while the world records remain authoritative.

## Political state with more than one meaning

| Record | What it describes |
| --- | --- |
| Realm and territorial claim | The country, league or other polity that claims a region; competing claims may coexist |
| Government and claimant | Who holds an institution and who claims the throne; these are distinct from the country itself |
| Local authority | Who controls a particular city, fort, crossing or countryside area |
| Stability and conflict | Stable, unstable, open rebellion or another authored condition; no invented numerical scores |
| Movement and army allegiance | Who a rebellion, commander or company serves; an Imperial army need not support the same claimant as another Imperial army |
| Treaty and superior rank | Alliance, league membership, vassal oath, disputed obligations and practical enforcement |
| Intelligence | What the viewer knows, when it was learned and whether the report is stale |

The initial campaign map should make nominal affiliation visible while overlaying rebellion, occupation and disputed control. An effective-control view can then emphasize particular holdings. An army's presence alone does not award an entire region to its ruler. Unknown local control stays unknown.

Ambron, Mithala and Celder remain nominal vassals of the High King of the Stone Fist. His practical sway over the distant crowns is weak. Ambron is more powerful than Lond, acknowledges the oath for Cref tradition and has adopted southern ways. This allegiance does not make its provinces directly administered by Lond. The northern lower kingdoms and Acorwood's honorary allied kingship keep their previously described distinctions.

## Ambroni Empire at the opening

Ambron ostensibly holds eleven atlas regions. Elagos and Drent are its only stable provinces in this opening. Stability describes the provincial situation; a stable province can still have local danger or a political quest.

| Atlas region | Nominal affiliation | Opening condition |
| --- | --- | --- |
| Elagos | Ambroni Empire | Stable; Ambron is the seat of Willard's constitutional government |
| Drent | Ambroni Empire | Stable |
| Amod | Ambroni Empire | Unstable, with rebellion and the local silver-grade political quest context |
| Pueth | Ambroni Empire | Unstable, with rebellion and the local silver-grade political quest context |
| Luscia | Ambroni Empire | Destabilized |
| Moros Plain | Ambroni Empire | Destabilized |
| Vastos | Ambroni Empire | Destabilized |
| Meneth | Ambroni Empire | Destabilized |
| Peblos | Ambroni Empire | Destabilized |
| East Lotharn Mountains | Ambroni Empire | Open rebellion; effective imperial authority fractured; other factions and units to be specified |
| West Lotharn Mountains | Ambroni Empire | Open rebellion; effective imperial authority fractured; other factions and units to be specified |

These provinces remain part of the Empire despite their stability problems. The initial detail of rebel governments, garrisons and outside intervention is not yet assigned. Feradom remains an independent ally, not an additional imperial province.

The dictated names "Amil" and "Play" are provisionally read as Amod and Pueth. "Moros, Planitia" is provisionally read as Moros Plain; there is no separate Planitia region in the atlas. These interpretations do not create an additional province. The old king's precise naming in the latest dictation is also unresolved: retain the established royal family without inventing a new ancestor.

## The League before Cedric arrives

Minora in Isareos and the four river-centered agricultural regions of Caricas, Nethereum, Ovesos and Nesdor formed the Minoran League after breaking from Ambron. Independence was declared within the past year, following the old king's death. The League is a wealthy breadbasket with little military strength; strong city defenses do not imply a large dependable army.

Minora led the League while the other four members retained limited sovereignty. That recent common government matters to the opening: Cedric captures an existing institution that its members had created to escape Ambroni domination.

## The opening sequence

1. The old king dies. Cedric succeeds him and rules poorly. The League's independence belongs to the ensuing period, within the year before the game.
2. Republican opposition seeks to replace Cedric with his younger half-brother Willard. Willard is installed in Ambron as constitutional monarch, consistent with the existing political settlement.
3. Cedric flees with his elite guard. He infiltrates Minora and seizes the city by surprise, taking control of the League's central government. His presence is an imposed seizure, not a voluntary invitation from the League.
4. Caricas, Nethereum, Ovesos and Nesdor rebel against the captured League. Each pursues its own independence war. They attempt to coordinate, but their former political center has been taken over.
5. At the game opening, Wilhelm, the Blood Prince and Cedric's brother, has just brought his army to Minora, apparently to reinforce Cedric. In truth Wilhelm and his soldiers are concealed undead; Wilhelm secretly serves Thalmagar. Cedric remains one of several claimants to the Ambroni throne.
6. During the first few campaign cycles, the planned next development is an undead coup from within Minora. It is distinct from Cedric's prior seizure and has not yet completed at the initial snapshot. Exact trigger, outcomes, potential hero intervention and Cedric's fate remain open.

The order of the initial events is fixed; the number of days between the revolution, seizure, apparent reinforcement and traveler arrival is not. Wilhelm's earlier itinerary and the details and later consequences of the planned undead coup remain open. The earlier one-day revolution timing must not override this revised sequence or compress journeys without a deliberate decision.

## The League at the opening

| Location | Institutional association | Current situation |
| --- | --- | --- |
| Minora city in Isareos | Seat of the Minoran League | Cedric controls the city and captured central government; Wilhelm's apparently supporting army conceals the undead infiltration that will drive the early coup |
| Isareos outside Minora | League heartland | Extent of effective control unspecified; city capture does not establish blanket occupation |
| Caricas | Member of the recently formed League | Separate independence rebellion against Cedric's captured League |
| Nethereum | Member of the recently formed League | Separate independence rebellion against Cedric's captured League |
| Ovesos | Member of the recently formed League | Separate independence rebellion against Cedric's captured League |
| Nesdor | Member of the recently formed League | Separate independence rebellion against Cedric's captured League |

Represent the four rebellions as distinct political movements, with coordination between them. A shared resistance label can aid navigation, but it must not give them a single government, army, treasury or automatically recognized independence. Their leadership, military strength and exact territorial control are still to be specified.

Keep Cedric's royal claimant identity, the League institution, Wilhelm's army and the four independence movements separate. Seizing the League government neither transfers every member province to Cedric nor automatically annexes the League to the Empire. Minora remains physically intact; that is different from political stability or popular consent.

## Goblinland and Undead Land

Goblinland is a **loose confederation of four independent allied goblin factions**, each holding one of **Orgmala, North Gorgi Mountains, South Gorgi Mountains and Gorgiwood**. They coordinate little and retain separate governments and armies. All want to invade wealthy, strongly defended Lond, but periodic raiding is their usual early and middle campaign activity. Eshtor Plateau belongs to **Undead Land**, a separate undead faction centered on the **Forsaken Citadel**. The earlier five-region and single-faction Goblinland descriptions are superseded. The atlas has no East or West Gorgi region; the latest dictated East Gorgy is provisionally matched to South Gorgi.

North Gorgi is secretly a Thalmagar vassal and spends a long preparation period building the powerful goblin/orc army for the later southern invasion. The other three goblin factions are not automatically his vassals, and their alliance does not pool their armies under his command. See the [Goblinland and invasion design](thalmagar-crisis-design.md#goblinland-independent-allies-and-the-north-gorgi-muster).

The Duke of North Ganun relocated to the ancient abandoned Citadel on Eshtor and claims the plateau for Ganun. In practice he rules a separate undead faction and secretly serves Thalmagar. He is an undead necromancer spreading the fictional Blood Plague, a working name. His title does not move the Citadel back to North Ganun or transfer North Ganun to the undead. See the [crisis and Citadel design](thalmagar-crisis-design.md).

The Eshtor undead faction, all four Goblinland members and the two independent Baldro dwarf states maintain mutual peace, sharing opposition to human expansion. This directs the duke toward vulnerable human kingdoms instead of conquering these neighbors. Their peace does not by itself create a joint army, military transit rights or additional secret vassals.

## Overarching crisis and alliance building

Thalmagar is the overarching enemy of the resistance campaign. He spends much of the early and middle campaign fortifying, mustering, recruiting partners and making limited gains, before a major middle-to-late campaign offensive threatens the human kingdoms. He seeks alliance with or control of factions among the centaurs, elves, dwarves and goblins. Their individual allegiances are not yet all assigned.

The Eshtor duke's early offensive is a separate, slow and persistent regional expansion: Witherst and Riesov first, then East Ganun and the other Ganun regions. Thoth is another possible frontier through West Witherst, without requiring Ganun to fall first. This long-running pressure can consume vulnerable human communities unless the hero and more distant kingdoms intervene; the actual conquests and exact timing remain dynamic.

The hero's larger main-quest objective is to assemble sufficient collective strength to resist his armies. Local service and side quests can build trust and practical faction support for whichever political alignment the player pursues. The player chooses whether to conquer neighbors, ally with them or combine those methods while the live world changes. The Ambroni succession struggle is part of that politics, not the entire campaign's final objective.

Thalmagar's own undead nature and the origin story in which he created the undead remain tentative. The duke's undeath, necromancy and secret vassalage are established. Crisis pacing, concrete alliance commitments, plague rules and eventual victory conditions are developed in the [crisis design](thalmagar-crisis-design.md), with proposals distinguished from the user's fixed premises.

Wilhelm's undeath and secret vassalage to Thalmagar are also established. His forces can pass as human soldiers or civilians. The ordinary diplomatic view initially hides the true superior of the duke, Wilhelm and North Gorgi; the hero investigates to expose those hidden faction ties. Full development geography does not remove this political secrecy. Wilhelm's early coup and the intended middle-game revelation of his allegiance are distinct events, with earlier discovery possible through hero action.

**Acor Wetlands** is a three-way dispute between Acreland, the existing Acorwood faction, the Lower Kingdom of Endevor, and Thalmagar's Empire. No sole controller is assigned. The user's Vandor has been confirmed as Endevor; it is not a new kingdom.

## Connecting quests and people to the campaign

The campaign view first reads existing saved outcomes and observed movements. An adventure event should identify what changed and where: a ruler entered a city, a company arrived, a crossing was repaired, a local agreement was reached, or a holding changed hands. Infection, death, undead raising and hostile allegiance are distinct saved events attached to persistent people. Each event must be recorded once and remain true after changing views or reloading.

The silver-grade civil-war quests provide local political context. Amod's military water demands and Pueth's recruitment and timber disputes can affect local support, obligations or access. Finishing a local settlement does not automatically end a provincial rebellion or award the entire province to the player's side. The existing Vastos implementation already distinguishes a local agreement from province conquest.

The [northern silver quests](northern-silver-quests-design.md) gradually address the Eshtor undead faction's early expansion into Witherst and Riesov, its first major human targets. They begin with local needs and uncertain reports, progress toward evidence of the duke's activities and concealed allegiance, and seek intervention by more distant human kingdoms. Their emergence follows events and discoveries while the world continues; they do not announce Thalmagar's ultimate role before the hero has grounds to uncover it.

These quest opportunities can permanently disappear when the relevant people become hostile undead, including before the hero accepts them. Their former quest givers can become enemies. Availability follows actual local conditions as the threat extends toward Ganun and Thoth; conquest alone does not instantly convert everyone. Record which event invalidated the quest without exposing facts unknown to the hero. Retaking a town or changing modes does not automatically cure its people, recreate a living quest giver or restore the old quests.

Forces eventually share persistent person records with third-person play. A map company and its physical members have the same identities, allegiance, injuries, cargo and outcomes. Offscreen updates preserve those records without rendering every body. A local encounter takes ownership of its participants until its result is committed; abstract combat cannot resolve those same participants at the same time.

A dated event history remains a possible later explanation aid; the current UI omits it. For this development phase the map shows the full geography. Ordinary diplomatic knowledge already distinguishes apparent and hidden relationships: Eshtor's undead duke, Wilhelm and North Gorgi are secret vassals until exposed. Revealing geography must not grant their allegiance secrets, personal exploration or knowledge of Thalmagar's secret capital. Any future developer truth inspector remains separate. Previously rendered discussion maps are earlier author snapshots, not a live game connection or the latest complete roster.

## Delivery order and remaining choices

1. **Minimal informational map.** Geopolitical, Regions and Stability views on the existing full atlas, with region, faction and quest inspection. Country names and boundaries follow current controlled territory. No mode tabs, command previews or timeline. Prototype ownership examples demonstrate visual changes without implementing the simulation.
2. **Shared people and battle handoff.** Follow persistent forces statistically, approach an ongoing battle in hero mode, participate, leave and reload. Verify that elapsed combat, identities, casualties, cargo and outcomes agree in both modes. Include a campaign-only session with the hero physically remaining in a room.
3. **Later simulation and influence design.** Develop faction decisions and, if selected, ways for the player to influence them through the map. Orders, stores, recruitment and direct government remain possible later work. The League scenario must start from Cedric's seizure and the members' rebellions, rather than an undisturbed cooperative grain league.

Outstanding choices are the faction decision cadence and time speeds; the statistical battle model and entry/exit boundaries; protections or fallbacks for other story-required characters and places; which government or movement the player commands; death, capture and succession rules; precise regional control footprints; and the named outside forces in the Lotharns. Northern quests being lost through hostile undead conversion is now a confirmed consequence, rather than an unresolved story-protection choice. The campaign's ability to run while open, alternating with hero mode, is part of the intended structure. These remaining details do not prevent displaying the authored opening and already-supported events.

Implementation references: [strategic layer](strategic-layer-brainstorm.md), [existing prototype](strategic-prototype.md), [royal history](the-war-and-the-house-of-ambron.md), [local civil-war quests](ambroni-civil-war.md), and [persistent company runtime](living-company-runtime.md).
