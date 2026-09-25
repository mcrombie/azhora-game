/**
 * Food changes health only; it does not reset combat or grant protection.
 * Every id here must also be a `Food` entry in INVENTORY_ITEMS (src/inventory.js),
 * which supplies the satchel name, icon and description. `missing` is shown when the
 * traveler tries to eat something they do not carry, and says where it comes from.
 */
import { ATTIC_WINES, ATTIC_WINE_IDS } from './attic-wines.js';

const define = (healing, missing) => Object.freeze({ healing, missing });

export const FOODS = Object.freeze({
  'jojo-sandwich': define(35, 'You have no sandwich. Jojo shares one when she welcomes you at the landing.'),
  carrot: define(15, 'You have no carrots. Stanley shares seeds for the commons rows at the Avrel clearing.'),
  beet: define(20, 'You have no beets. Grow them at the Avrel clearing once Farming reaches level 2.'),
  'roasted-beet': define(35, 'You have no roasted beets. Stanley teaches the recipe at the Avrel clearing.'),
  'farm-pot': define(45, 'You have no farm pot. Cook carrot and barley at a lit fire using Stanley\u2019s recipe.'),
  // Gathered and cooked on the road today.
  pawpaw: define(25, 'You have no pawpaw fruit. Gather some in the forest.'),
  'cooked-fish': define(40, 'You have no cooked fish. Cook a fresh catch at a lit firepit.'),
  // Juan’s bottles, from Tharganhom in Solis.
  ...Object.fromEntries(ATTIC_WINE_IDS.map(id => [ATTIC_WINES[id].item, define(ATTIC_WINES[id].healing, `You have no ${ATTIC_WINES[id].name}. Juan sells it at Tharganhom, the Wine Attic in Solis.`)])),
  'hot-chocolate': define(45, 'You have no hot chocolate. Once Lakota has taught you, make it at a lit fire from chocolate and a jug of milk.'),

  // Foraged in Drent’s broadleaf forest and along its hedges.
  'wood-sorrel': define(10, 'You have no wood sorrel. It grows in the shade of Drent’s broadleaf woods.'),
  hazelnuts: define(15, 'You have no hazelnuts. Look for hazel thickets where the forest meets the fields.'),
  'bramble-berries': define(15, 'You have no bramble berries. Pick them from the thorn tangles the bramble goblins are named for.'),
  honeycomb: define(30, 'You have no honeycomb. The keeper of the bee-fold sometimes parts with a piece.'),
  'dried-venison': define(35, 'You have no dried venison. Drent’s hunters dry deer meat in chimney smoke for the winter road.'),

  // Tidehaven kitchens and the farms of the Avrel clearing.
  'boiled-egg': define(15, 'You have no boiled eggs. Hens scratch behind every cottage in Tidehaven.'),
  oatcake: define(20, 'You have no oatcakes. Farm kitchens around the Avrel clearing bake them on a griddle stone.'),
  'avrel-apple': define(20, 'You have no apples. The Avrel valley orchards are the best in Drent.'),
  'acorn-flatbread': define(30, 'You have no acorn flatbread. Lysa bakes it from leached acorn meal at her outdoor kitchen.'),
  'rye-loaf': define(30, 'You have no rye bread. The Clearing Mill grinds the Avrel harvest, and the miller’s household bakes it dark and dense.'),
  'ewe-cheese': define(30, 'You have no ewe’s cheese. The shepherds of the Avrel clearing press it from their flock’s milk.'),
  'honey-cake': define(35, 'You have no honey cakes. Lysa’s little cakes need acorn meal and bee-fold honey.'),
  'smoked-sausage': define(40, 'You have no smoked sausage. Drent households hang forest-hog sausages in the chimney smoke all winter.'),
  'salt-beef': define(35, 'You have no salt beef. It comes out of a barrel in a ship’s hold and keeps for a year, which is the only good thing anybody says about it.'),
  herbs: define(12, 'You have no herbs. Nell Harrow, at the Sunken Lane, teaches what grows on either side of the road.'),
  tuckahoe: define(30, 'You have no tuckahoe. The arrowhead leaves stand in the river shallows in southern Drent, where the road runs down to Luscia.'),
  mushrooms: define(18, 'You have no mushrooms. Odger Pell, at Fernway Rest, teaches which ones are supper.'),
  'roast-duck': define(45, 'You have no roast duck. The fowlers at Willowmere Pond take birds in the reeds.'),
  'mutton-pie': define(50, 'You have no mutton pie. A farm kitchen with a sheep to spare and a hot oven makes one.'),

  // The Tidehaven landing, the Stills and the Pebbles.
  'marsh-samphire': define(10, 'You have no samphire. It grows on the salt flats along the Stills; the reedcutters know where.'),
  'stills-oysters': define(20, 'You have no oysters. The calm sounds behind the Pebbles are famous for them as far away as Solis.'),
  'salt-shoal-fish': define(30, 'You have no salt shoal-fish. The Pebbles fleet salts the migratory catch in barrels for the whole coast.'),
  'dressed-crab': define(35, 'You have no dressed crab. Pebble islanders pot flat-water crab in the Stills and sell it at the landing.'),
  'smoked-eel': define(40, 'You have no smoked eel. Eel traps line the slow reaches of the Caloss and the Avrel.'),
  'fish-stew': define(50, 'You have no fish stew. It is ladled out at the Tidehaven landing whenever the boats come in.'),

  // army rations and traders’ goods from farther off.
  hardtack: define(15, 'You have no hardtack. Quartermaster Corvan issues it by the sack; it keeps for years and tastes like it.'),
  'brined-olives': define(15, 'You have no olives. Galan traders bring them up the Iberos coast in brine jars.'),
  'dried-figs': define(25, 'You have no dried figs. They come the long way, on the desert road out of Marosh.'),
  'dried-pears': define(25, 'You have no dried pears. They travel from the Sorten orchards of Ovesos in traders’ packs.'),
  'roasted-chestnuts': define(30, 'You have no roasted chestnuts. They come down from the Amod terraces by the sackful each autumn.'),
  'salt-pork': define(35, 'You have no salt pork. The army’s barrels come up the coast from the Elagosi lake country.'),
  'smoked-whitefish': define(45, 'You have no smoked whitefish. Ambron’s lake fleet smokes it for the army’s supply trains.'),
  'narcoshi-cheese': define(45, 'You have no Narcoshi cheese. The eastern-valley cheese sells dear on the Iberos coast and rarely reaches Drent.'),
});

export function createConsumables({ inventory, combat, onEvent = () => {} }) {
  function status(id) {
    if (!Object.hasOwn(FOODS, id)) return null;
    const food = FOODS[id];
    const player = combat.state.player;
    const owned = inventory.has(id);
    let reason = '';
    if (!owned) reason = food.missing;
    else if (combat.state.phase === 'defeated' || player.action === 'dead' || player.hp <= 0)
      reason = 'You cannot eat while defeated. Retry to return to the road.';
    else if (!Number.isFinite(player.hp) || !Number.isFinite(player.maxHp) || player.maxHp <= 0)
      reason = 'You cannot eat right now. No food will be used.';
    else if (player.action !== 'idle') reason = player.action === 'hurt'
      ? 'Close the satchel and recover from the hit before eating.'
      : 'Close the satchel and finish your swing or dodge before eating.';
    else if (player.hp >= player.maxHp) reason = 'Health is full. No food will be used.';
    return {
      owned, canUse: !reason, healing: food.healing,
      health: player.hp, maxHealth: player.maxHp, reason,
    };
  }

  function consume(id) {
    const current = status(id);
    if (!current?.canUse) return {
      ok: false, healed: 0,
      reason: current?.reason ?? 'This item cannot be eaten.',
    };
    // The checks, removal, and health change are synchronous. A failed removal
    // cannot grant free health; a refused heal returns the untouched portion.
    if (!inventory.remove(id, 1)) return {
      ok: false, healed: 0, reason: 'No food was used. Select your food and try again.',
    };
    const healed = combat.heal(current.healing);
    if (!Number.isFinite(healed) || healed <= 0) {
      inventory.add(id, 1);
      return { ok: false, healed: 0, reason: 'You cannot eat right now. No food was used.' };
    }
    onEvent({ type: 'consume', id, healed });
    return { ok: true, healed, reason: '' };
  }

  return { status, consume };
}
