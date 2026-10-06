# Azhora strategic layer: discussion draft

30 September 2026 discussion draft; updated 5 October. The first isolated prototype is available through **F8 > Quest playtests > Frontier command**; see [prototype usage and limits](strategic-prototype.md). The next priority is a readily accessible campaign view that reflects the active adventure world. The user has specified the [opening political state](campaign-opening-design.md), including imperial rebellions, Cedric's seizure of the Minoran League, Goblinland's four independent allied factions and a separate undead realm on Eshtor. The [Thalmagar crisis](thalmagar-crisis-design.md) establishes the overarching alliance-building objective and concealed vassals. Those relationships supersede older examples below. Broader government mechanics and the faction decision cadence remain design proposals, not implemented gameplay.

The central structure is an **authored scenario within a dynamic campaign**. Its intended progression connects early undead expansion, a long secret muster in North Gorgi, southern infiltration, a major invasion and resistance. Hero mode is the main embodied way to experience and influence these developments; strategic play uses the same world. The [scenario phases](campaign-opening-design.md#an-authored-scenario-in-a-dynamic-world) distinguish authored events from contingent territorial outcomes. Exact event timing and effects of interruption remain to be designed.

The world is intended to continue beyond Thalmagar's defeat. The user wants to leave an ongoing simulation unfolding, return to meaningful developments and potentially chronicle them in a blog. The [living-world continuation design](living-world-continuation-design.md) proposes autonomous factions, postwar recovery, succession and further stories from persistent conditions. This is a speculative extension of the same world, not an implemented unattended service or a reset after victory. Background/offline execution and long-term hero succession remain open.

## What already exists

The developer atlas contains **132 regions and 3,756 hexes assigned to those regions**. Its immutable `(q,r)` cells, terrain and shared edges are a useful strategic foundation. It does not contain a complete sovereign-country registry, population or economy. The game currently uses **100 world metres per hex**; the older 56 m figures in some documents are superseded. Strategic travel cannot be calibrated as though these compressed adventure spaces were literal continental distances. Sources: [atlas export](../assets/azhora-dev-regions.json), [exporter](../scripts/export-developer-atlas.mjs), [world scale](../src/world/terrain/world-scale.js).

| Example | Verified geography | Political data caveat |
| --- | --- | --- |
| Ambroni Empire | Many individually named provinces rather than one atlas region named Ambron; Ambron is the capital in Elagos | Current initial `empire` control covers Drent, Elagos, Moros Plain, Caricas and Isareos. Nine regions are `contested`. This is **not** a definitive list of imperial claims or historical borders. |
| Ascarth | Northern Ascarth, 16 hexes; Southern Ascarth, 18 | Both currently use the campaign's `wild` label. A country registry and its government remain to be designed. |
| Lond | North 38, East 36, South 29, West 45, Central 58: **five regions, 206 hexes** | None has an explicit `REGION_DESIGN` entry. Do not interpret the fallback “No ruler” as established political history. |
| Dwarfland | West Baldro Mountains, 36 hexes; East Baldro Mountains, 32 | Both are confirmed dwarf-controlled despite lacking campaign region entries. Government and internal connections remain open. |

[`campaign-world.js`](../src/content/chapters/civil-war/campaign-world.js) supplies region design, atlas adjacency and a mixed faction list: countries, an alliance, and labels such as `contested` and `wild`. [`campaign.js`](../src/content/chapters/civil-war/campaign.js) saves chapter progress, trust, truces, regional arcs and one effective-control label per region. Arcs and particular chapter victories change that label. Its `battleOdds()` is a quest-derived modifier, not a simulation of army composition, supply or maneuver.

There are real local battles, marching escorts and persistent individuals. However, the [border chapter](../src/content/chapters/chapter-one/border-chapter.js), [temporary battle reinforcements](../src/gameplay/combat/file-fill.js), [living company](../src/gameplay/company/living-story.js), [ranger defense](../src/content/regions/ibenwood/ibenwood-defense.js) and [frontier raids](../src/content/regions/minora-frontier/frontier-raids.js) do not constitute a continental army system. Temporary assigned soldiers explicitly disappear after their encounter; turning them into permanent regiments would change an existing rule.

## Recommended structure

Use the existing atlas for a **country → region → local holding** hierarchy, with armies moving across its hex graph. This combines regional administration with meaningful crossings and maneuver.

| Layer | Proposed responsibility |
| --- | --- |
| Country | Diplomacy, treasury, recruitment policy, nominal territory and government. A large country has more regions, not a different ruleset. |
| Region | Stable geographic identity and administration; aggregates production, supply and political conditions. Borders do not change whenever an army marches. |
| Holding | A town, fort, port, grove, pasture range or mountain entrance with a controller, access rules and productive or military role. Existing exact footprints can override a hex's general jurisdiction. |
| Hex / crossing | Terrain travel cost, local occupation or influence, reconnaissance and route capacity. Roads, fords, bridges and passes are edges or sites rather than another ownership hierarchy. |
| Army | Persistent identity, allegiance, troops, condition, orders, supplies and route progress. A moving army does not own every hex it passes through. |

Separate **nominal sovereignty**, **effective control**, **local political support** and **alliance membership**. “Contested” becomes a computed description; “unwritten political data” stays visibly unknown. An Izoli force fighting in the Coalition should retain its home identity. Feradom's nominal loyalty need not erase its autonomy. Capturing an imperial town need not erase an imperial claim or instantly convert its inhabitants.

Regions should remain named exactly as authored. Add stable country IDs alongside them; do not reuse the numeric IDs that select rendered regions. A region can contain holdings of several sovereigns, so the hierarchy is an organizational view rather than an exclusive country-parent relationship. Record local exceptions such as Elod and the Yunethre free town instead of coloring an entire region with one sovereign and treating that as complete truth.

## What the player would see and do

**6 October UI direction:** the campaign map is primarily for reading information as one character. The minimal prototype has Geopolitical, Regions and Stability views and a region/faction/quest inspector. Geopolitical view combines controlled regions into faction territory with country labels and outer borders; regional labels and internal borders are hidden there. Regions restores them, and Stability adds condition colors. Remove the separate Campaign/Hero/Observe tabs, command previews, time controls and chronicle. Any map-based influence belongs to possible later development. The following broader system and governance ideas remain future proposals, not current UI requirements. See the [revised prototype](campaign-ui-prototype.md).

First add an observational **Campaign** view on the existing main world map, reading the active world and its saved quest outcomes. The main map is the interface and dominant interactive surface; do not adopt Frontier Command's UI. Reuse useful backend mechanics where appropriate. The full atlas and all geographic names are always visible during development, starting at the whole-map view. Fog of war is deferred; this presentation override must not grant discoveries, Cartography XP or tutorial progress. The [opening design](campaign-opening-design.md) specifies nominal territory, local control and stability; show all three without turning every rebellion into a new sovereign state. Keep the same recognizable lakes,
mountains, roads and region names. Political color shows effective control;
dashed boundaries show claims, and hatching marks divided control. Offer focused
overlays for supply, diplomacy and intelligence instead of displaying everything
at once. Unconfirmed governments remain unknown until the country roster is
reviewed.

Geographic fog of war is deferred while the complete development map remains visible. Covert diplomatic ties are nevertheless hidden in the ordinary faction view from the start: the Eshtor duke, Wilhelm and North Gorgi are secret vassals of Thalmagar. Hero investigation can expose them. A separate developer truth inspector may show actual relationships without granting in-world knowledge. Keep traveler discoveries separate so full-map inspection never awards exploration rewards or permanently records allegiance secrets.

Later, when government is supported, selecting a country opens its treasury, food reserves, recruiting capacity,
relations and objectives. Selecting a region shows its holdings and local
support. Selecting an army shows its commander, units, morale, supplies and
orders. Clicking a destination previews the route, required permissions,
crossings, expected arrival and supply problems before committing the order.
Army banners should animate along the route; a border does not change simply
because a banner crossed it.

Useful first orders would be **march, hold, patrol, escort and resupply**. Later
orders could add raid, besiege, blockade and retreat. Construction decisions
could begin with repairing a bridge, improving a depot or restoring a ruined
town, all at identifiable sites in the adventure world. This gives the strategy
layer visible consequences that the traveler can visit.

At the revised opening, Cedric has seized Minora and the League government, Wilhelm's army has just apparently reinforced him, and Caricas, Nethereum, Ovesos and Nesdor are separately rebelling against that captured government. Wilhelm is secretly undead and Thalmagar's vassal; his disguised undead force prepares an internal coup in the first few campaign cycles. That second takeover is not already complete at the opening. The four member rebellions are loosely coordinated, and neither coup automatically establishes blanket occupation of Isareos or every member region. Supplies, routes and negotiations can become playable consequences; their outcomes remain open.

A smaller country should have viable aims: protecting a pass, sustaining a
trading network, winning recognition or surviving a war. A large empire would
gain resources alongside longer supply routes, contested loyalties and more
demands on its forces. Relative size need not make every campaign a conquest
race. Guilds, magical knowledge and religious institutions could become sources
of influence once the basic simulation works.

## Adventure, time and battles

**Confirmed structure:** campaign mode and hero mode are two ways to play the same ongoing world. The player may govern entirely from the campaign map while the hero physically remains in a room, or switch to hero mode and personally act in wars. Hero participation takes the place of a separate tactical battle mode. The hero remains vulnerable to the world's events, including enemies reaching a conquered settlement; switching views grants no invulnerability and does not relocate the character.

**Confirmed direction:** the campaign reflects active world developments from quests, units and elapsed game time, including while the campaign interface remains open. **Proposed mechanism:** continuous progression with discrete faction decision moments. Their cadence and whether they are presented as faction turns remain open. Use an explicit shared running/paused state rather than inheriting the journal's unconditional modal pause. Acceleration uses the same timeline with interruptions before consequential events. A manually advanced isolated scenario is still useful for testing but is not the intended default world behavior.

The current [saved world calendar](../src/gameplay/company/living-story.js) maps one active second to one calendar minute: a displayed day takes 24 active minutes. Loading does not advance it; menus pause it. Reuse that source of elapsed time if the living-world option is chosen, but first decide whether its pace suits an army campaign. Use fixed strategic update steps and saved order progress, not wall-clock timestamps or frame-dependent movement. Avoid silently changing quest deadlines, crop growth or companion travel to force a new war calendar to fit. The prototype can advance by explicit test commands while this is unsettled.

Strategic distance should be expressed as **march effort and arrival time**, calibrated to the compressed map. Terrain, crossings, weather and supply affect it; adventure walking speed does not define the size of the continent. Do not stretch the built world or pretend a 100 m hex contains a realistically scaled province. Larger troop strengths can be represented abstractly, with a limited nearby scene showing part of the column or battle.

Unobserved battles can progress statistically without fully rendering or simulating each physical action. They still need a location, duration, elapsed progress and persistent participant state. Walking or flying into an ongoing battle materializes its current survivors, positions, casualties and conditions on the actual terrain. It does not restart the battle. A completed battle yields aftermath instead of a retroactive opportunity to fight.

The visible force and strategic army share one roster and outcome. Local combat owns materialized participants; the statistical resolver cannot simultaneously move or fight those same people. Leaving the battle returns its current state to statistical simulation. Save random state and resolved events so entry, exit and reload cannot reroll past losses. Hero intervention may alter the future. Exact troop-detail limits, battle rates and loss rules remain design choices; the existing small temporary encounter is not already this system. See [battle detail and handoff](campaign-opening-design.md#battles-at-different-levels-of-detail).

## Economy and logistics

Start with **food, coin and available recruits**, plus army fatigue, morale and carried supply. Generate regional output from reviewed holdings and terrain suitability; coarse atlas terrain alone cannot establish farms, mines, populations or crop yields. Existing [farm plots](../src/world/scenery/regional-farmland.js) and [levy disputes](../src/content/chapters/civil-war/civil-war-quests.js) provide concrete anchors, not a finished national economy.

An army draws supply through friendly or permitted holdings and crossings. Breaking a bridge, blockading a port or isolating a depot should matter more than occupying every empty forest hex. Local forage has limits; heavy requisition reduces reserves and support. Reinforcement needs both recruits and access, preventing instant recovery deep in hostile country. Add timber, metal, trade commodities, seasonal harvests and naval logistics only after this small model works. Character inventory remains personal; a handful of harvested carrots should not fund a national campaign through an accidental conversion.

## Thalmagar and the main campaign objective

Thalmagar is the overarching enemy of the resistance campaign. Early and middle play emphasize fortification, mustering, limited expansion and efforts to align with or control factions among centaurs, elves, dwarves and goblins. His major offensive arrives in the middle-to-late campaign. The hero must assemble sufficient collective strength through politics, faction support, diplomacy and potentially conquest while the world keeps changing. Becoming Thalmagar's servant and potentially winning on his side is reserved as a future design option.

Local quests can earn trust and practical commitments without automatically recruiting whole kingdoms. The proposed implementation tracks forces, supply, access and other explicit contributions rather than only an alliance score. Exact crisis rates, thresholds, dates and victory conditions remain open.

The Forsaken Citadel is on **Eshtor Plateau**, ruled by an undead Duke of North Ganun who publicly claims the plateau for Ganun but secretly serves Thalmagar. Eshtor is removed from Goblinland, which retains Orgmala, North/South Gorgi Mountains and Gorgiwood. **Acor Wetlands** is disputed by Acreland, Endevor and Thalmagar, without a sole controller assigned. Wilhelm is another concealed undead vassal of Thalmagar. See the [crisis design](thalmagar-crisis-design.md) for public versus actual relationships and the planned early Minora coup.

The Eshtor undead faction, all four Goblinland members and both independent Baldro dwarf states begin mutually at peace because they oppose human expansion. Peace does not establish shared command, transit rights or universal submission to Thalmagar. The duke instead advances slowly into Witherst and Riesov, then toward East Ganun and the remaining Ganun regions. Thoth offers another branch through West Witherst. These preferences create sustained pressure, not guaranteed conquests. The [northern silver quests](northern-silver-quests-design.md) help people resist and seek distant intervention; original opportunities can permanently disappear as their people become hostile undead. Retaking territory does not automatically restore those people or quests.

Goblinland's independent members normally raid Lond and coordinate little. North Gorgi alone is a confirmed secret Thalmagar vassal, preparing the powerful goblin/orc army. Ideally for Thalmagar, the undead have secured much of the north before it is ready. His intended invasion goes through North Lond, West Lond, East Endevor, South Endevor and Acor Wetlands, then threatens Mithala and Celder before the main push through Yunethre and Isareos toward Minora and ultimately Ambron. Smaller forces raid and secure mountain approaches. Every march still requires actual access, forces and supply; the eastern undead advance does not automatically clear Lond or Endevor. Ambron's fall is a severe prospective defeat, not yet a fixed game-over condition. See the [invasion sequence](thalmagar-crisis-design.md#from-remote-expansion-to-the-southern-invasion).

The fictional Blood Plague kills and raises cognizant, rotting undead; exact rules and Thalmagar's own possible undeath remain open. Explicit necromantic transformation is a saved world event, not permission for scene loading to restore casualties or duplicate a person.

## Civil war and distinct societies

The Ambroni civil war needs competing legitimacy and local loyalties, not just two painted countries. Current regional quests should produce strategic consequences without a second system overwriting their results every tick. The first prototype should preserve the campaign as the authority for scripted settlements and use a single adapter for strategic effects. A later dynamic campaign would require explicit revision of whole-region `resolveArc()` behavior, chapter gates and reward rules.

Cedric has captured recently independent Minora by infiltration and surprise, rather than merely taken refuge there. Wilhelm's army has just reinforced him. Willard holds Ambron as constitutional monarch. Four League members wage separate independence rebellions; both Lotharns are in open rebellion, and only Drent and Elagos are stable among Ambron's eleven named nominal provinces. Model claimant, government, movement and country identities separately from a generic `empire` label. Their later outcomes remain open; see the [opening design](campaign-opening-design.md).

Distinct systems should follow established territory and institutions, with the details still proposed:

- **Elfland:** groves and protected living forest are its base. Use the actual irregular inner belt, including portions of the outer Ibenwoods; human outer-forest communities are not automatically elven subjects. The confirmed withdrawal premise removes access to Elfland while leaving the forest present. A proposed strategic rule would therefore change access rather than award cleared land to an attacker. Its trigger remains undecided.
- **Yunethre centaurs:** represent independent clans, mobile camps, pasture access, trade and raids. Proposed power comes from mobility and knowledge of routes rather than compulsory farming-town conquest. Keep the neutral lakeside town and Elfland's support distinct from subordination to Elfland.
- **Dwarfland:** both Baldro regions remain dwarf-controlled under two independent states, each party to the opening peace with the Eshtor undead faction, Goblinland and the other dwarf state. Mountain entrances, inhabited underground cities and surface valleys offer a different holding network; local admission rules remain distinct from peace. Internal tunnels, production advantages and siege rules are proposals; neither the atlas nor the confirmed premise establishes their routes or exact rules. See the [Dwarfland draft](dwarfland-design-draft.md).

## Existing prototype and the next delivery

The implemented isolated prototype covers **Isareos, Caricas and Yunethre**, with one Imperial field force, one centaur band, supply, marching, raiding and battle reconciliation. It uses generic temporary encounter soldiers and separate test time. It demonstrates mechanics; its starting control is not the revised campaign opening.

The next delivery is the ready campaign view, reflecting the authored geopolitical opening and existing live events. A subsequent small demonstration should join persistent people, a company order and a real journey across both views. Government and faction planning follow that shared-state foundation. A League grain scenario must account for the captured central government and four rebellions rather than assume peaceful cooperation.

**Luscia, Moros Plain and West Suval** would be a useful second scenario for testing integration with the existing civil-war branch and chapter battles, after their outcome rules have an explicit strategic adapter. Drent/Elagos could provide fixed background context and Elod remain neutral.

Success means orders survive reload, both armies respect geography, supply disruption changes a choice, a holding can change hands without rewriting atlas regions, and one adventure action has one durable strategic consequence. The map must explain claims versus actual control. Test entirely in a separate strategic fixture first; existing saves and quest outcomes stay authoritative. A future optional strategy snapshot should migrate from existing campaign control, not reset completed arcs or revive casualties through state reconstruction. An explicitly recorded undead transformation remains a valid world event.

The decisions that most affect the design are:

1. **Who does the player command?** Direct faction government is part of the larger vision. The first campaign view is observational; how the traveler obtains command, and which claimant or movement the player can govern, remain open.
2. **When do factions decide?** World progression follows active play. Decide whether faction planning is simultaneous, staggered or shown as turns, and what interruptions or warnings accompany acceleration.
3. **Which other story events need protections or fallbacks?** Northern quests can be lost when their people become hostile undead; this consequence is confirmed. Whether other required towns or named rulers can fall, or the civil war can end before its planned chapter, still needs decisions. A limited prototype should preserve those existing scripted outcomes until their dynamic rules are authored.
4. **Which local details and victory conditions remain unknown?** The territorial roster, revised opening and intended crisis arc are now described. Resolve remaining ambiguous dictated names, exact holding control, capitals not yet named and outside Lotharn forces. Define what defeats Thalmagar and what ends a particular character's resistance campaign, while allowing the world to continue beyond that main crisis.

These remaining choices constrain later simulation and governance. They do not prevent the observational view from displaying the revised starting state and supported world events. This remains a design update, not implementation of the full campaign.
