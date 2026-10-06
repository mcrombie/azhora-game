# Future campaign simulation

This directory reserves a home for the proposed autonomous world core. It contains no runtime implementation yet.

The intended responsibilities are campaign time, territories, persistent armies, faction relationships and world events. It should run without DOM, Three.js, Electron or loaded scenery. Player knowledge must remain distinct from hidden world truth.

The initial proving ground is the Ambron, West Suval and Izol conflict. A campaign battle should resolve abstractly or accept hero participation while preserving its identity and consequences across saving and loading.

Existing authored campaign logic remains in [content/chapters/civil-war](../content/chapters/civil-war/campaign.js). The frontier prototype remains in [experiments/frontier-command](../experiments/frontier-command/strategic-prototype.js). Moving files has not merged either system into this future core.
