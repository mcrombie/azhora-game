# Money in Azhora

Recorded 2026-09-16 from the user's design. Only the first line of it is built.

## Built now

- **Copper pieces** (`copper-piece`, a stackable inventory item of type Money). The traveler lands with an advance of 24 copper. Wendel the peddler on Tidehaven's green sells staples and tools for copper and explains the coinage; Legion pay and beggars use copper too.

## Designed, not built

- **Ambroni Empire coinage**: copper, silver and gold pieces. Ten copper make a silver; ten silver make a gold; a gold is a hundred copper. Silver and gold items come with markets that need them (`CURRENCIES` in `src/economy.js` already carries the values).
- **Coalition scrip**: the rebels print paper money to fight the war. It is a separate currency with no copper value at Empire posts; across the Caloss and among the Coalition it buys goods and goodwill, and holding a great deal of it pays off if the traveler helps the republic win the main quest.
- **Later**: prices that vary by region and by who controls it, wages from the Legion or the Coalition, exchange between coin and scrip at a loss, and what the Legion does to a hired sword found carrying rebel paper.

The user asked that this not be developed further yet.
