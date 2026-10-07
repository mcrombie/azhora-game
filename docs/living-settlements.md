# Hearthfall × Azhora: living settlements

## Show the demonstration

[Open the Feradom Annals](https://d1ka8cpbx2rxkb.cloudfront.net/azhora-demo/index.html). This public, read-only volume contains a reproducible thirty-day scenario with three communities, thirty-six residents, and ninety-three separately generated diary/woodcut pairs. Browsing makes no model calls and needs no login.

For a short demonstration:

1. Open the illustrated annals and select a community.
2. Choose an early dated account, then a later one. The stores, people, prose and illustration belong to that date.
3. Select a household to inspect its residents, relationships, trust and remembered events.
4. Trace the Common Reserve's founding occasions to see how actual assistance produced a local custom.
5. Download the settlement pack from the page footer and import it through the game's F8 pilot controls to continue its simulation.

The traveler in this saved scenario is scripted, starts with a finite inventory, and uses the same delivery, repair and message transactions as a player. Community work and consequences come from the deterministic engine. This is a proposed integration for Crombie's review, not a merged or approved expansion of world canon.

## Run the pilot

```sh
npm install
npm run start:settlements
```

Open F8 testing tools and find **Living settlements · Feradom pilot**. The three Visit buttons load Feradom and take the traveler to a community. The ordinary passes remain subject to Azhora's existing closed-border rules. Walk to a resident and press F. Read the chronicle from dialogue or the **Settlement chronicles** button. The book only lists discovered communities.

The pilot contains twelve persistent residents in each of the Northward Nets, Shared Furrows, and Lower Holt. Unspecified resident appearances use the existing neutral gray placeholders. Four households surround each common hearth. Sites are surveyed against actual terrain, water, paths, landmarks and collision shapes before scenery is added; the survey yields between candidates rather than scanning the world in a single frame. No authored content is removed.

The renderer smoke measured these world positions at the pinned source revision:

| Community | X | Z |
|---|---:|---:|
| Northward Nets | -540 | -890 |
| Shared Furrows | -350 | -720 |
| Lower Holt | -480 | -740 |

## Shared engine

`src/settlements/engine.js` is a plain ES module with no renderer or AWS dependency:

```js
const world = createSettlementWorld({seed: 980, worldId: 'my-edition'});
world.advanceTo(gameSeconds);
world.applyAction({settlementId, requestId, contactId, action: 'complete'}, inventory);
const checkpoint = world.snapshot();
const restored = createSettlementWorld({saved: checkpoint});
const pendingPages = restored.entries();
// Acknowledge only after durable archive storage:
await flushChronicles(restored, archive);
```

One active second equals one Azhora calendar minute. The first midnight is game second 1080 because the calendar begins at 06:00. Explicit time jumps are advanced in batches of thirty days, with an outbox limit preventing discarded pages when storage is unavailable. Pauses and elapsed time outside the game do not advance the simulation. Every enabled settlement receives an opening page and a page at each daily boundary, including unvisited settlements.

Daily work uses deterministic seed/day decisions. Food scarcity shifts labor toward food; weather reduces yields and damages shared infrastructure; households consume food, water and fuel; the water keeper repairs fittings with actual planks; the healer uses herbs. Prolonged shortages damage health and relationships and lead workers to seek support from kin. Recovery permits their return. Resident IDs, households, motives, relationships, trust, memories and migration dates survive saves.

The pilot is deliberately bounded: twelve residents per site, migration and recovery, and three experience-driven customs. It does not simulate births, deaths, arbitrary new religions, or a continent-wide strategic economy. The reserve custom starts extra food work earlier, witnessed rationing reduces the morale penalty of shortages, and recovery suppers improve morale recovery. Each custom records the actual events that established it; the book can trace those events.

Transferable items are existing inventory IDs: `barley`, `cooked-fish`, `pine-logs`, `oak-plank`, `herbs`, and `copper-piece`. Water and care remain community systems. Production belongs to aggregate community holdings and never credits a player harvest node. Intercommunity aid debits its donor. Delivery and repair rewards come from a finite common purse. The inventory transaction validates every debit and credit before changing either, and the settlement completes the request in the same synchronous turn. A checkpoint captures both together.

The three request templates are supply delivery, material-funded repair, and a carried message that can only be completed at its destination. They use Azhora's dialogue renderer and Feradom language proficiency. Existing player survival, combat, farming and harvesting rules are unchanged.

## Authoring a pack

```sh
npm run settlements:generate -- --region Feradom --seed 980 --days 30 --dry-run
npm run settlements:generate -- --region Feradom --seed 980 --days 30 --out tests/artifacts/settlements
```

The default thirty-day history contains ninety daily pages and three opening records. `preview.html` is a self-contained interactive antique book; `settlement-pack.json` contains the versioned facts, residents, customs and generation references. Choose a subset with `--sites feradom-fishers,feradom-fields`. Other regions fail admission until their lore conflicts and placement have been reviewed.

Load a pack through the F8 pilot's file input. Import validates the entire pack and files its history before replacing the current settlement simulation. It leaves the rest of the player's progress intact. Packs end at the calendar epoch and catch up to the current game date. Each import gets its own future edition while reusing the immutable authored history.

Paid writing and images require an activated service and an invited collaborator's short-lived access token:

```sh
# Set AZHORA_CHRONICLES_URL and AZHORA_CHRONICLES_TOKEN in your shell.
# Do not put tokens in command arguments, screenshots, source files, or commits.
npm run settlements:generate -- --generate --out tests/artifacts/settlements
npm run settlements:generate -- --resume --generate --out tests/artifacts/settlements
```

The authoring command saves facts before submitting jobs and checkpoints generation results after admission and polling. `--wait-minutes` defaults to twenty; unfinished jobs remain resumable. Authoring jobs are shared with authenticated invited collaborators so Crombie can reuse the pack's images. In-game jobs remain private to their creator. Shared does not mean public.

## Chronicle and persistence

The antique book displays the selected day's resource figures, residents, memories, relationships and customs. Select a measure for its opening/closing comparison, or a household for the people recorded on that date. Browsing history does not advance time. Pending pages display recorded facts and an explicitly unfinished illustration, never pretend generated prose or a reused woodcut.

The optional `settlements` checkpoint section stays compact. Older version-1 road saves still load. Immutable pages live separately in IndexedDB on the web or in the Electron user's `settlement-chronicles` directory, outside the served repository. The restricted IPC accepts only put/get/list/update operations and hashes record IDs into filenames. Image bytes never enter the checkpoint. Listing reads compact metadata: IndexedDB migrates existing archives transactionally to an indexed catalog, and the desktop store rehydrates its catalog once with bounded file reads.

Published history cannot be overwritten. Loading an earlier checkpoint creates a new edition if a later daily account already exists. Parent-edition references keep earlier pages and existing generated assets readable; future events continue independently. Original histories remain in the archive.

## Generation service

See [the press operations guide](../services/chronicles/README.md). Simulation facts determine all state. Haiku writes a first-person account from bounded facts and canonical lore, and must return cited event IDs and a scene description. The scene is validated before Stable Image Core creates a new woodcut. Images and prose are saved privately, then the page becomes ready. Reopening a page refreshes an expired signed URL without another model call.

Output validation checks structure, lengths and references; it cannot prove every prose sentence is free of model invention. Generated text cannot alter game state. Review authored packs before treating their prose as approved lore.

### AWS activation record

Activated with account-owner approval on 2026-10-06 in `us-east-1`: stack `azhora-chronicles`, initially created from reviewed change set `press-1791340631` (`e889d14d-b301-4662-a160-76708f1b905f`). CloudFormation created the 25 resources and subsequent updates deployed the generation and rate-limit recovery code. The checked-in public configuration points to the active service. Release bundles and original artifacts remain private.

Both model agreements and authorization checks are available. The inspected US Haiku inference profile routes to `us-east-1`, `us-east-2`, and `us-west-2`; the worker role lists those exact model ARNs. This account's Lambda concurrency quota is ten, so the queue limits processing to two concurrent workers without reserving capacity that the account cannot allocate.

Live prose and woodcuts were commissioned from the signed-in AWS operator session through the same Lambda admission, DynamoDB reservation and SQS worker path. The unsigned HTTP API correctly returns 401. Cognito collaborator accounts have not been created; a successful end-to-end collaborator login is still unverified. Crombie can review the public book and import its saved assets without credentials. New in-game generations require an invited account.

The thirty-day volume reserves $7.44 for ninety-three pages, plus an eight-cent initial trial reservation. Reservations are not actual billed totals. Explicit Bedrock image rate rejections exposed by the volume run are recovered with delayed retries and preserved prose. Unknown billing outcomes never retry automatically. The public export contains permanent copies of completed assets and no tokens or signed private URLs.

## Provenance and lore decisions

| Source | Revision |
|---|---|
| Azhora | `b58d1b460bf5defb9a4da5eac2b7672bd29e3e4e` |
| world-builder lore | `97cb61e4dbd9f7d83affaf608add6bb967398bb2` |
| Hearthfall reference | `27b374627eaa4e276efccbe94dffbcb60afbc26b` |

[Feradom's source lore](https://github.com/mcrombie/world-builder/blob/97cb61e4dbd9f7d83affaf608add6bb967398bb2/azhora_lore/geography/regions/feradom.md) governs this integration. Its harbor, valley and pass-lords coordinate through councils. The campaign registry, regional description, fort descriptions and current garrison dialogue now use that baseline instead of introducing a central duke. Existing faction IDs, campaign paths, soldiers and their requested uniforms remain compatible with saved progress.

Yunethre remains blocked: its Gate Lord/toll authority conflicts with the game's independent clans. Caricas remains blocked: its Water Council and protected fox corridor conflict with the garrison-town baseline. A new region needs a versioned canon profile, explicit reconciliation, actual inventory mappings, traversable surveyed sites and performance checks. Neither the World Builder repository nor its atlas is modified.

Hearthfall supplies the event-to-account design and antique book/woodcut direction. This integration is native Azhora JavaScript; it does not transplant Hearthfall's React interface or its public AWS diagnostic suite.

## Validation

```sh
npm run test:settlements
npm run test:settlement-game
```

New Node tests are listed in the explicit manifest. The Electron smoke exercises actual Feradom loading, all three sites and resident approaches, Azhora dialogue, chart fog, resource controls, the household map, identities, paused time, unvisited daily advancement, full road-checkpoint validation/restoration and published-history rewinds. The isolated browser harness at `tests/settlement-web.html` tests schema migration and a real page reload without touching the player's archive.

On 2026-10-06, the affected existing suite passed **133 tests in seven files** both here and in an untouched checkout of the pinned Azhora revision: inventory, road checkpoints, save round trips, living story, living-story host, campaign and Feradom world. A broader baseline was sampled through the beginning of batch 39/470 and reproduced existing terrain/scenery failures; it was stopped to prioritize the directly affected checks. This is not a claim that the full repository suite passes. See [known failures](known-failing.md).
