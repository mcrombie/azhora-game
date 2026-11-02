# Minora: civic life and the first integrated pass

Minora is a neutral, mostly human river city in the opening Lizeemi campaign. Its
temple, Guild and civic government have different histories and interests, but
share responsibility for a city that depends on food arriving from both banks.
This design describes that opening. It does not import the occupation politics
of the separate, broader authored campaign.

## History and government

The first human settlers established a shrine to **Shay**, the female deity of
the river, agriculture and fertility, in the first century of the calendar,
nearly a thousand years ago. The temple teaches that Shay instructed the settlers
to build here. Its charitable obligations and local authority predate the Guild.

About a century ago the last king of **House Vey** invited the Wizard Guild.
Formerly Taleth's pupil and fascinated by magic, he sought help for a city under
economic pressure from the Cref wars. Under the resulting accord he became Mayor
and shared authority with the temple and Guild. He was still king when he issued
the invitation; the Guild was not invited by an already established mayoralty.

Representatives elected by four neighborhoods meet in the Assembly, downstairs
in River Hall, with the Mayor's office above. Crafts, trade and established
families influence elections. The mayoralty is elective, but House Vey's estates,
rentals and patronage have helped the family win it repeatedly. **Ishkur Vey** is
a capable mayor with a blind spot for that patronage. His adult son has private
doubts; no personal name, detailed character arc or public confession is settled.

The Mayor, High Priest and Guild share civic authority through the Council of
Three. One city watch answers to the **High Councilor**, currently Taleth; it is
not three rival institutional guard forces. Minora's neutrality excludes the
leagues' marching armies. Civilian refugees from either league can receive help.

## The four neighborhoods and building register

The working neighborhood identities are **Old Shrine Quarter**, **Riverward**,
**Guild Quarter** and **Hall Quarter**. Their uses are assigned to the existing
footprints; exact political boundaries remain provisional. The register covers
the twenty original city buildings and the separate Guild stable: **21 buildings,
including 13 houses that retain permanent residential use**. Some houses combine
homes with a workshop, office, inn or charitable lodging. Ordinary households
remain a substantial part of the city.

| Existing ID | Public identity and use | Neighborhood / ownership |
| --- | --- | --- |
| `menora-grand-temple` | Temple of Shay; worship and administration | Old Shrine / Temple |
| `menora-sanctuary-annex` | Shay's Cloister; kitchen, relief and care | Old Shrine / Temple |
| `menora-west-barracks` | City Watch Barracks; duty, equipment and provisions | Old Shrine / City |
| `menora-house-1` | Cloister Guesthouse; charitable beds and resident household | Old Shrine / Temple |
| `menora-house-2` | Vey Court Homes; rented family homes | Old Shrine / House Vey |
| `menora-house-6` | Watch Families' Homes | Old Shrine / City |
| `menora-storehouse` | Public River Granary; municipal food reserve | Riverward / City |
| `menora-house-5` | Quayside Cooper; workshop and family home | Riverward / Cooper household |
| `menora-house-11` | Riverworkers' Homes; rented households | Riverward / House Vey |
| `menora-house-13` | River Provisions; private food shop and home | Riverward / Provisioner household |
| `menora-sorcerers-guild` | Wizard Guild; teaching and chambers | Guild / Guild |
| `menora-guild-library` | Guild Library; books and civic records | Guild / Guild |
| `minora-guild-stable` | Guild Stable; Bear, horses and tack | Guild / Guild |
| `menora-house-7` | Guild Lodgings; staff and apprentices | Guild / Guild |
| `menora-house-8` | Elfland Legation; ambassador's home and office | Guild / Legation |
| `menora-house-9` | Ink and Binding; books, stationery and family home | Guild / Bookbinder household |
| `menora-river-hall` | River Hall; Assembly below, Mayor's office above | Hall / City |
| `menora-house-3` | Market Bakehouse; bakery and family home | Hall / Baker household |
| `menora-house-4` | The Four Bridges; paid inn and resident household | Hall / Innkeeper household |
| `menora-house-10` | White Bridge Office; crossing records and warden's home | Hall / City |
| `menora-house-12` | House Vey Residence; private estate house | Hall / House Vey |

The Elfland ambassador lives alone without a staff, observes Minoran politics,
and has particular concern for Ibbenwood. Existing residents retain civic work:
Seshat keeps Guild records, Satet works at the cloister, Hapi tends river trade,
Nepri measures public grain, Imhotep serves the bridge, and Rudiger provisions
the watch. The Mayor's son currently helps with public works, not a new quest arc.

## Food, housing and institutional responsibilities

The **public granary**, **private merchants** and **temple reserves** are distinct
in the design. The temple secretly keeps food for famine, independence and
political leverage; only the High Priest and trusted confidants know the true
amount. Public signs, resident dialogue and doorstep inspections must not disclose
that secret or exact totals from which it could be calculated.

The city supports the Guild with food and maintenance in exchange for teaching,
engineering and public assistance. Private commissions are separate. The cloister
supports locals in need and a modest number of civilians displaced from both
leagues, with room for conditions to worsen as the war develops.

**The implemented economy connection is an accounting projection of the existing
regional ledger, not persistent institutional asset transactions.** Institutional
stock shares and meals are derived from Isareos's existing food state. They create
no second stockpile, food demand, production, transfer, budget or consumption tick.
The temple's projected sealed share is not yet a physical reserve exempt from the
regional rationing system. Building services do not independently produce or buy
goods, and no money, rents or Guild maintenance payments move through accounts.

Permanent population and housing capacity remain the authoritative regional
figures. Thirteen rendered houses represent residential provision; they are not
a literal household census. Individual accommodation capacities have not been
authored. Paid guest rooms and charitable beds are identified separately from
permanent housing without increasing either population or housing capacity.
Nearby fighting, shortages and unrest change public relief descriptions; there
is **no refugee migration model or population change** from adding these actors.
Watch figures represent the existing garrison and do not add soldiers or rations.

## What this pass implements

- A renderer-free register of every building's purpose, owner, ward, public
  history and residential use, shared by scenery and doorstep inspection.
- Readable building plaques, ward colors, a faded royal emblem beneath civic
  changes, and compact work props, laundry, relief seating and trade counters.
  These fit the current streets and footprints; paths and bridge approaches stay
  clear. All additions are static: two merged scenery batches, one shared text
  atlas, and no extra animation loop.
- Ten watch positions and thirteen additional civic resident definitions,
  including workers, tenants, refugees, the Mayor's son and the lone ambassador.
  The ambassador has an authored route through the city. These are representative
  residents, sharing the existing **12 visible resident-rig cap** rather than
  rendering a population-sized crowd.
- Public conversations and **F / About** doorstep inspections that connect a
  place with its work and history. Existing people and working doors take input
  priority. Food-aware dialogue reports the current supply and relief situation
  through a public-only adapter; a non-food campaign receives unassessed text.
- River Hall now fits its exterior footprint, with Assembly seating downstairs,
  a working staircase and Ishkur's office upstairs. Valid upstairs saves retain
  their floor; positions from the old oversized hall recover at the entry.

This is not an all-buildings-interior system. Houses remain exterior scenery
with readable purposes, while existing accessible institutional rooms keep their
own interactions. Ward elections, property transactions, institutional purchasing,
daily household schedules and a full refugee simulation are future systems, not
features implied by the register. The first pass adds no save schema or migration.

## Source responsibilities and checks

- [`minora-civic-layout.js`](../src/content/regions/minora-frontier/minora-civic-layout.js)
  owns the public building and ward register; `guild-stable-layout.js` provides
  the stable footprint without importing rendering.
- [`minora-civic-scenery.js`](../src/content/regions/minora-frontier/minora-civic-scenery.js)
  adds static plaques and props through `menora-scenery.js`.
- [`minora-civic-residents.js`](../src/content/regions/minora-frontier/minora-civic-residents.js)
  owns the additional identities, work/home references, routes and public speech.
- [`minora-civic.js`](../src/simulation/minora-civic.js) is the independent,
  read-only ledger projection. The regional
  [`minora-civic-economy.js`](../src/content/regions/minora-frontier/minora-civic-economy.js)
  supplies configuration and public reports.
- [`minora-civic-host.js`](../src/app/exploration/minora-civic-host.js) owns doorstep
  targeting and the inspection card; exploration assembles it with existing
  council, resident, stable and tower interactions.

Focused model checks cover the register, unchanged house footprints, disclosure
boundary, food accounting, routes and actual scenery-collider clearance. Run the
relevant `minora-civic*`, `menora-city` and `minora-stable` tests, plus
`npm run check:layout` and `npm run check:modules`.

The native civic check was run in both the older war mode and the current food
campaign. It checked all added residents' footing, the twelve-rig cap, building
inspection and reading pauses, both stair directions, upstairs conversation,
Save/Continue and legacy hall placement. Captured screenshots were reviewed for
plaque legibility and dialogue placement. The current report records no game
frame errors. Re-run it with:

```powershell
node scripts/launch.cjs --exploration --world-war --smoke-test --internal-review --minora-civic-checks
```

Incidental resident routes survive rendering eviction and tower visits, but
restart from their authored anchors after a full application save/reload.
