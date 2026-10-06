# Azhora after the crisis: an ongoing living world

Updated 5 October 2026. The user wants to explore a world that can continue after Thalmagar's defeat, potentially leaving it running and returning to see what happened. Its history could become material for a blog. This is a design discussion, not an implemented simulation, running service or publishing arrangement.

The [campaign and hero design](campaign-opening-design.md) establishes the two modes and authored opening. The [Thalmagar crisis](thalmagar-crisis-design.md) supplies the first major historical arc. This document proposes how the same world could outlast that arc without discarding its consequences.

## Confirmed direction and open choices

- Victory over Thalmagar need not end the world's history. The player can continue inhabiting, governing or watching the resulting world.
- The initial campaign still has its intended scenario progression. Continuing afterward does not replace it with an entirely unstructured opening.
- The appeal includes returning occasionally to discover meaningful developments and potentially writing about them.
- Indefinite continuation is an ambition to investigate, not a claim that the current game runs autonomously forever or maintains a server.

The exact defeat condition, post-victory player role, autonomous policies, pace and degree of intervention remain design choices. The mechanisms below are proposals unless they restate existing shared-world rules.

## Victory closes a crisis, not the world

Record victory as a dated outcome of the authored crisis. Stop that crisis's pending invasion instructions when their prerequisites no longer exist; do not repeatedly launch the original army merely to sustain activity. Exact conditions for declaring the crisis resolved still belong to its design.

Continue from the actual resulting state: conquests, surviving governments, displaced people, casualties, ruined holdings, depleted stores, debts, treaties and grievances. A liberated province does not automatically recover its population, buildings or former ruler.

Undead survivors retain their identities and recorded condition. Defeating Thalmagar does not establish a universal cure, destroy every undead person, end the plague by implication or reopen lost quests. Their agency, allegiance and any dependence on particular magic require the still-open undead rules. See [northern quest loss](northern-silver-quests-design.md).

Former coalition members may remain allies, negotiate a settlement or pursue incompatible interests. Their wartime cooperation is historical evidence, not a permanent guarantee of unity or an automatic trigger for betrayal.

Neither Thalmagar nor defeated armies return just because the world needs another enemy. A future crisis needs distinct causes and resources. Peaceful recovery can itself be a successful, interesting outcome.

## What can generate later history

Use a modest set of interacting systems whose changes produce readable consequences. The following are candidate systems, not newly assigned events for particular countries.

| Source of change | Concrete cause | Possible consequence |
| --- | --- | --- |
| Succession | An actual ruler dies, abdicates or loses recognized authority | An accepted heir, regency, negotiated settlement or contested claim; a civil war is not inevitable |
| Institutional change | A council, claimant, province or guild gains sustained support and bargaining power | Revised obligations, autonomy, representation or a different government while the polity retains its history |
| Recovery | Labor, material and food reach a damaged holding | Repaired homes or crossings, returning residents, restored production and changing local confidence |
| Trade | Producing communities exchange real surpluses over permitted routes | New dependencies, prosperous ports, route competition or an incentive to maintain peace |
| Migration | People choose or are forced to leave because of danger, work, kin or displacement | Arrivals change labor, demand and relationships at a destination; departures reduce the origin population |
| Border disputes | Competing claims meet a local incident, contested access or shifting control | Arbitration, compensation, patrols, a limited conflict or a wider war if support and resources exist |
| New political entities | A supported faction separates from an existing institution or communities form a new association | A new polity with identifiable people, territory or access, institutions and a transferred resource base |

New factions must inherit or acquire actual supporters and assets; creating a banner cannot create an army, treasury or population. Retain links to predecessor entities and record what transferred. Splits, unions and peaceful incorporation all remain possible.

Migration likewise transfers people rather than generating identical populations at both ends. Births and later generations would require explicit demographic rules; the current short adventure calendar does not already support believable centuries of succession.

Each government can pursue a small number of priorities appropriate to its situation: rebuilding, securing food, enforcing an obligation, opening trade or pressing a claim. Review priorities at faction decision moments and on significant events, following the shared timing design.

Story opportunities should follow these causes. A disputed inheritance can create an investigation; a damaged route can create a repair or escort need. Record who needs help, why, where and what success changes. Do not generate a quest whose required person, cargo or destination does not exist.

Keep the ability to author later regional arcs. An authored event may use live prerequisites and available participants, but cannot rewrite an earlier death or invent fulfilled preparations. Missing prerequisites should delay, change or close the opportunity under its stated rules.

## Meaningful peace

An uneventful frontier can be evidence that agreements are working. Give reconstruction, reliable harvests, returning refugees, renewed trade and durable institutions a place in the history alongside battles.

Proposed peacetime choices include prioritizing repairs, negotiating access, reducing wartime levies and deciding how conquered communities are governed. Their effects should be visible in local lives and resources, without requiring a fresh catastrophe to make every period count.

Do not force wars, rebellions or empire collapse to keep the map colorful. A durable dominant state is an allowed result if its administration and consent support it. Investigate whether that result follows the rules or exposes a broken incentive before changing balance.

## Playing, watching and returning

Hero mode remains the primary embodied experience, sharing people and places with campaign mode. A continued world can offer government, direct intervention or a proposed observer option with autonomous factions. Observing changes who issues orders, not the history being simulated.

If the player delegates their faction, use explicit standing policies and the same legal orders available to other governments. Record important delegated decisions so taking control again is understandable. Exact delegation scope and whether an observer has any governing authority remain open.

The hero stays physically present and vulnerable while the campaign runs. Waiting in a room does not grant safety. Unattended defense, escape, capture, aging, heirs and the ability to continue after the hero's death need design; indefinite world history does not imply an immortal hero or an already-approved character-succession system.

| Operating situation | Design status |
| --- | --- |
| Application open and actively running | Intended place to investigate unattended continuation using the shared clock and autonomous decisions |
| Application unfocused or minimized | Background behavior, resource limits and alert delivery are undecided |
| Application closed, machine asleep or offline catch-up | No advancement policy has been chosen or implemented for this design |
| Persistent server or hosted service | A separate possible architecture, not a requested or running service |

Do not infer elapsed game years from time away until an explicit policy exists. Current save loading adds no elapsed time. Opening the same save should not unexpectedly reveal a world simulated by an unrequested background process.

Proposed controls are a visible running/paused state, deliberate speeds, and an optional stop-at-date or stop-at-event instruction. Acceleration uses the same event sequence. Choosing a speed must not skip supplies, travel, casualties or political obligations.

An unattended session needs an explicit interruption policy. A watch-oriented policy might continue through ordinary faction decisions while pausing for direct danger to the hero or a decision reserved to the player. Alternative policies can delegate more. Which events pause, notify or merely enter the chronicle remains to be selected.

## Sustainable simulation and physical continuity

Simulate distant production, travel and combat abstractly, with bounded work per update. Keep persistent identities for commanded and encountered people; anonymous population can use cohorts only if transfers, counts and later identities remain consistent. Do not run a rendered character brain for every inhabitant.

Approaching a place materializes its current recorded state. A rebuilt holding exists because workers and supplies completed it; an arriving army consists of its surviving roster. Loading a scene must not retroactively invent the causes of the state it displays.

Use the existing battle-handoff principle for ongoing combat: local simulation owns materialized participants, while distant simulation owns the remainder. One person cannot be moved, damaged or rewarded by both resolvers. Save random state and committed outcomes; watching or reloading must not reroll history.

Proposed scheduling uses ordered events and fixed simulation steps, with coarse distant updates where equivalent. Speed changes affect how quickly steps run, not their rules. If computation falls behind, reduce effective speed or pause clearly rather than silently dropping events.

Long histories need periodic validated snapshots and an archival strategy. Keep the active working set bounded while preserving identity links, causal records and selected historical snapshots on disk. Retention, file growth and export limits require measurement; there is no promise of infinite storage.

## A chronicle suitable for reading and blogging

Build the chronicle from committed world events. A proposed record includes a stable event ID, game date, involved actor/faction/place IDs, changes to state, and links to relevant preceding events. Keep identity stable through renamed rulers, changing borders and institutional succession.

Separate an event's occurrence date from when an observer learned about it. Record observation, source and confidence for reports; a rumor is not a confirmed transformation or treaty. An apparent public allegiance and a hidden actual allegiance can both have valid histories for different audiences.

Offer distinct reading scopes: what the hero knows, what a governing faction knows, and an explicitly selected developer or author account. The fully visible development geography does not make covert vassals public knowledge. Historical summaries must not expose a secret to an in-world audience before discovery.

Summaries should explain supported relationships between events: a bridge loss cut a recorded supply route; a delivered shipment replenished a particular store. When motives or causation are uncertain, say so rather than turning a plausible explanation into a fact.

For a future blog workflow, propose a local export containing a chosen date range, factual timeline, map snapshots and a readable draft with references to the underlying events. Let the user choose knowledge scope and revise the prose. Exporting a draft does not publish it, create an account or authorize automatic posting.

## Proposed design prototype and validation

1. **Victory continuation fixture.** Define a small post-crisis save with surviving factions, damaged holdings, treaties and undead survivors. Specify the transition that closes the crisis and advances the same world for a limited horizon. Check that no global reset, cure or repeated invasion occurs.
2. **One peaceful and one political chain.** Model a delivered repair supply restoring trade, alongside a succession or border disagreement with several lawful outcomes. Show the same people and sites in hero mode and record the causal chain in the chronicle.
3. **Autonomous watch experiment.** Add proposed standing policies, visible time controls and an interruption policy in an isolated design prototype. Leave the active application running, return, and explain its decisions from actual records. This step does not add offline or server execution.
4. **Long-horizon comparison.** Run multiple initial conditions and seeds, including a devastated north, a strong united realm and a negotiated recovery. Compare uninterrupted, paused, accelerated and save/reloaded execution where the same commands should yield the same results.
5. **Local history export.** Produce one inspectable chronicle and map sequence for a chosen period. Verify facts, causal links and knowledge boundaries before treating it as material for the user's writing.

Track population and resource conservation; alive/dead/undead identity consistency; treasury and supply extremes; meaningful decisions and unresolved obligations; war and peace duration; reconstruction; migration; faction survival and dominance; event backlog, update cost, memory and save growth. Include quiet periods, not only active wars, in review.

Investigate a frozen map for deadlocked orders, unaffordable actions, inaccessible routes or missing decision triggers. Distinguish a functioning peaceful equilibrium from inactivity caused by a bug. Investigate runaway dominance through logistics, administration and diplomacy before adding arbitrary penalties or stronger enemies simply because someone is winning.

Validate that reported events actually occurred, hidden allegiances stay hidden for the chosen audience, approaching an offscreen place preserves its state, and unattended losses remain losses after reload. Check quest closure and explicit raising against the [northern quest rules](northern-silver-quests-design.md).

These are staged design experiments and acceptance questions. No implementation, unattended run, service, blog export or publishing action is part of this document's creation.
