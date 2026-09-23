# Ambroni Civil War

## Requirements and scope

The user's requirements are a silver **Ambroni Civil War** quest series across the old Empire's regions, with a distinct local quest in each region. Every regional quest must support Republican and Monarchist solutions and a less obvious mediation route. These are substantial local stories, not copies of a single capture-province task. Normal journal text must not advertise the hidden outcome or reveal future branches.

This pass makes **Vastos: The Common Water** playable. All other entries are explicit **planned** metadata. The registry covers Vastos, Meneth, Caricas, Moros Plain, Nesdor, Luscia, Peblos, Pueth, Feradom, Amod, East Lotharn Mountains and West Lotharn Mountains. Drent and Elagos also have planned entries to include the starting province and the capital's home region. A planned entry is not a playable quest, a promise that the region has been built, or a new map claim. The short name **Moros** resolves to **Moros Plain**.

The series uses `id: 'ambroni-civil-war'`, `title: 'Ambroni Civil War'`, and the existing silver quest grade `plot`. Vastos uses `id: 'civil-war-vastos'`, `title: 'The Common Water'`. Republican, Monarchist and mediation outcomes describe a local settlement. None changes the traveler's global allegiance or calls `campaign.resolveArc`, which would conquer a province.

## Lore authority

`the-war-and-the-house-of-ambron.md` is authoritative where older campaign notes conflict. The present year is 980. Republicans have installed **Willard as constitutional monarch**; they are not uniformly opposed to any king. A Vastos royal officer's local claim must not silently choose a prince for the player. In dialogue, a royalist may invoke the Empire for legitimacy, while a republican may use that word for the old tyranny. The force is the army or Imperial army, and its men are soldiers or men-at-arms, not a Roman legion.

The sibling World Builder remains read-only. Its `azhora_lore/geography/regions/vastos.md` supplies Vastos's cold upland grazing, longhorn herds, braided seasonal river, crossing rights and **vel-vastos** seasonal movement. A working relationship with outside administration can provide security and markets; imposed grain quotas and fixed boundaries have repeatedly failed. The conflict should follow those practical pressures, not present one faction as inherently competent and the other as foolish.

The authored `azhora.wwmap` and its game exports govern actual region placement. Lore prose describes culture and terrain but does not authorize invented borders or moving a region. The other planned hooks draw on the corresponding regional lore files; the atlas names in `campaign-world.js` remain the naming authority. Caricas's local woodland and river traditions can inform a quest without using prose adjacency to override the map.

## Proposed implementation details: Vastos

The following concrete beats, documents, concessions and rewards are implementation proposals for this pass, rather than additional facts dictated by the user or established historical canon.

1. **Shared recovery.** At the seasonal camp, hear the immediate problem, recover the scattered herd and restore the damaged watering place. Both faction delegates depend on the same functioning crossing. These practical tasks precede political commitment.
2. **The claims.** Hear both delegates. The Republican wants a publicly witnessed right to move herds and a local say over future requisitions. The Monarchist wants a predictable provision for the soldiers guarding the crossing. Each must explain an actual need rather than demand an abstract loyalty oath.
3. **The open choices.** Complete a Republican route-right notice or negotiate a Monarchist limited levy, then return to settle the camp. Signing is an intentional choice, not an automatic result of speaking to a delegate.
4. **The discoverable alternative.** A herder's account and an old watering covenant explain how access once survived competing claims. Mediation becomes available only after the player has found the covenant, heard the herder and learned both delegates' needs. It still requires two separate concessions: the Republican accepts an accountable provision for protection, and the Monarchist accepts protected seasonal access and a ceiling on the levy. Discovering the document alone does not end the dispute.
5. **Settlement.** Return to the camp after finishing the chosen route. The ending records a visible local governance consequence and gives the same **two salt-beef provisions** on every route, once only. No outcome receives a superior material reward simply for its politics.

The Republican settlement puts route rights and future consent before the local assembly. The Monarchist settlement keeps a royal officer responsible for crossing security under a limited recorded demand. Mediation leaves a jointly witnessed camp compact with reciprocal obligations; it is a negotiated arrangement, not a declaration that politics has disappeared. Completion must survive saving and loading without re-granting the reward.

## Planned regional stories

This table is an authoring plan and contains route spoilers. It must not be copied wholesale into the player's journal. The registry's `premise` field is the spoiler-free introduction; `routes` contains author-facing designs.

| Region and quest | Local problem | Republican route | Monarchist route | Hidden mediation lead |
| --- | --- | --- | --- | --- |
| Vastos — The Common Water | Herd movement and shared watering | Witnessed route-right notice | Recorded limited levy | Old watering covenant, herder testimony, both needs and two concessions |
| Meneth — The Junction Ledger | Duplicate freight seals at valley relays | Public freight ledger | Fixed royal transit warrant | Old tallies support a transferable receipt accepted by both collectors |
| Caricas — The Uncut Bank | Military timber marks threaten the wooded riverbank | Local cutting permits | Royal protected-bank order with an upland supply | Flood evidence supports managed-wood deliveries in exchange for bank protection |
| Moros Plain — The Weight of Grain | Duplicate provisioning claims on a granary | Growers authorize surplus purchases | Corrected supply warrant with a reserve | Independent scales establish a purchase schedule protecting seed and winter grain |
| Nesdor — Where the Ferry Waits | Rival passes strand families at a seasonal crossing | Civilian ferry committee | Royal safe-conduct hour | An older landing agreement supports reciprocal passes and a priority civilian queue |
| Luscia — Names at the Lauvel | Detention rolls and missing households disagree | Civilian testimony at a local hearing | An officer corrects the rolls and accounts for detentions | Matched witnesses enable supervised releases and a shared missing-person register |
| Peblos — The Pilot Lights | Closed approaches and disputed beacon signals | Pilots' harbor council | Paid local pilots under a naval warrant | An old rescue signal allows a neutral light and inspected civilian cargoes |
| Pueth — A Winter of Tallies | Recruiting and timber demands collide with the fishing season | Household service limits | Timber supplied against a fixed service obligation | Paid-delivery records and a winter labor calendar eliminate duplicate claims |
| Feradom — The Pass Lord's Bond | A hostage bond closes a pass before snow | A community pass charter | Limited lordly authority, release and fixed toll | Original guarantors exchange the hostage for reciprocal guarantees |
| Amod — The Terrace Measure | A supply diversion threatens irrigation turns | The water court limits military withdrawals | A measured allotment preserves existing turns | Old measurements support repair labor in exchange for a seasonal share |
| East Lotharn Mountains — The Bell Between Valleys | Rival valley alarm systems leave a pass exposed | A valley watch council | A pass captain preserves local home guards | The older signal chain enables a shared emergency bell without merging commands |
| West Lotharn Mountains — The Shelter Roll | Escorts dispute civilian departures from a refuge | Refugee and valley witnesses manage the roll | An accountable protected evacuation warrant | Refuge terms and inspected supplies secure passage accepted by both escorts |
| Drent — The Harbor Account | A missing account blocks clearance over an emergency due | Household delegates audit the levy | The Lord Protector sets a corrected due and end date | Duplicate account copies support a short audited collection and canceled duplicate charges |
| Elagos — The Narrows Petition | A ferry petition is stuck between new offices and royal clerks | A constitutional assembly hearing | A royal service guarantee and accountable steward | An older ferry charter supports a jointly registered ruling with an appeal |

The Lotharn quests concern civil authority and civilian survival alongside the existing goblin and orc campaign. They do not replace or prematurely resolve its battles. Feradom's pass politics and Amod's water courts likewise remain local institutions; resolving their quests must not invent a new allegiance for a Cref crown.

## Player presentation and verification

The series header is silver through `grade: 'plot'`. Show only a discovered quest's current practical objective and observed consequences. The initial Vastos premise mentions the herd and watering place; it does not enumerate endings. Evidence may suggest another approach once found, but an undiscovered mediation checklist must stay out of normal journal text. Planned regions must stay labeled as planned wherever authoring or developer tools expose the registry.

`tests/civil-war-quests.test.js` checks canonical coverage, unique region/quest ids and titles, unique local hooks, Vastos as the only playable entry, Moros normalization, and spoiler-free premises. Run it directly with `node --test tests/civil-war-quests.test.js`. The repository enumerates Node test files in `package.json`; integration must include this file in that list. Runtime validation also needs to cover each Vastos route, missing mediation evidence/concessions, old-save defaults and exactly-once settlement rewards.
