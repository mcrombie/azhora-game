# Equipment and satchel

Press **I** to open the inventory. The top row shows the equipped main hand, shield, body armor, and headgear. Selecting a slot shows compatible owned equipment. The three cloth garments are the traveler's ordinary base layers; they add no armor protection.

The item list and details scroll separately. Category buttons narrow the list, while the selected item's actions remain in the adjacent panel. Weapons show their condition and an explicit **Equip** button. Armor can be equipped or returned to the satchel. Switching equipment preserves the replaced item.

Ben's spare wand uses the existing `wand` inventory item and weapon slot. It must be equipped explicitly. When selected, its details explain that the previous weapon stays in the satchel, and that **Z** casts and **N** changes spells after closing the inventory.

## State and integration

Weapon ownership remains in `inventory.js`; weapon condition and the main-hand selection remain in `weapons.js`. Armor ownership and worn slots remain in `gear.js`, so inventory presentation does not create duplicate armor items in the ordinary bag.

`createGear().view()` adds `owned` and `clothing` to the existing armor view. `wear(slot, piece)` grants and wears a piece, `takeOff(slot)` retains it, and `equip(id)` accepts only an owned piece. The version-1 snapshot adds optional `owned` records. Old snapshots containing only `worn` migrate those pieces into ownership. The road checkpoint explicitly preserves both fields.

`createInventory` accepts `getGear`, `onGearEquip`, `onGearUnequip`, and `getEquipmentBlocked` alongside its existing weapon callbacks. The host updates the character's shield and saves after a successful equipment action. Base clothes remain worn beneath armor; this change does not add an undressing system or additional armor bonuses.

## Verification

`node --test --test-isolation=none tests/gear.test.js tests/inventory.test.js tests/smith.test.js tests/road-checkpoint.test.js`

The suite covers replacing and removing armor without losing it, equipment effects after re-equipping, old-save migration, actual checkpoint retention, refusal of invalid/unowned pieces, inventory categories, and clothing with no armor bonus. Native magic checks additionally select and equip the rewarded wand through the real inventory controls before casting.

## Design references

The slot-to-compatible-items navigation follows the equipment filtering approach described in [Larian's Baldur's Gate 3 UI update](https://baldursgate3.game/news/community-update-15-absolute-frenzy_49). Explicit Equip/Equipped labels, stable keyboard focus, and visible focus outlines follow [Xbox Accessibility Guideline 113](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/113). These patterns inform the implementation; this is not a claim of a full accessibility certification.
