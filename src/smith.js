/**
 * The smith of Tidehaven, and the buying (docs/combat-brief.md, phase 3).
 *
 * He is the first place the gear table meets the player: `smithStock` decides what he has,
 * `priceOf` decides what it costs, and `gear.wear` is what the traveler walks away in. Everything
 * here is a function of the country's level, so the same smith in a richer country sells better
 * iron without a line of his own - **Drent is level 0, so what he has is what you landed with**,
 * and the bog iron is a country up the road.
 *
 * **He has no name.** The invented-name registers that cover Drent are place-name registers, and
 * Drent's people are named in a plainer one; deriving a person from a place generator would
 * misuse it. Until somebody names him he is "the smith", which is what a village calls its smith
 * anyway.
 *
 * Pure: no DOM, no three, no world. The host owns the actor and the dialogue.
 */
import { smithStock, tiernamed, WEIGHTS, validPiece, armourOf, SLOTS } from './gear.js';
import { COPPER_ITEM, describeSum } from './economy.js';

export const SMITH_NPC = Object.freeze({
  id: 'tidehaven-smith', name: 'The smith', role: 'Smith of Tidehaven',
  modelRole: 'forest-woodcutter', color: 0x6b5a3c,
});

/**
 * What each place on the body is called when somebody is selling it. The tier's own name is the
 * material and says nothing about the shape - "light wood and bone" is a true description of a
 * cap and a useless name for one - so the shape is named here, where the selling happens, and
 * the table keeps saying only what things are made of.
 */
export const SLOT_NOUNS = Object.freeze({ body: 'Jack', head: 'Cap', hand: 'Buckler' });
export const pieceName = item =>
  `${SLOT_NOUNS[item.slot] ?? 'Piece'}, ${(WEIGHTS[item.weight]?.name ?? '').toLowerCase()} ${tiernamed(item.tier)}`.trim();

/** What he has today, named the way he would name it, with what each piece turns. */
export function smithOffers(countryLevel) {
  return Object.freeze(smithStock(countryLevel).map(item => Object.freeze({
    ...item, label: pieceName(item),
    // What this one piece on its own would turn, as a share, for a player deciding between them.
    turnsPercent: Math.round(armourOf({ [item.slot]: { weight: item.weight, tier: item.tier } }).turns * 100),
  })));
}

/**
 * Buy one piece and put it on. **Atomic**: the money only moves if the piece is a thing the game
 * has and the purse can cover it, and if the wearing somehow fails the money comes back. The
 * piece already in that place is replaced, and the caller is told what it was so it can say so.
 */
export function buyFromSmith({ inventory, gear, item } = {}) {
  if (!item || !SLOTS.includes(item.slot) || !validPiece({ weight: item.weight, tier: item.tier }))
    return { ok: false, reason: 'He does not make that.' };
  const price = Math.max(0, Math.round(Number(item.price) || 0));
  const purse = inventory?.count?.(COPPER_ITEM) ?? 0;
  if (purse < price) return { ok: false, reason: `That is ${price} copper, and you have ${describeSum(purse)}.` };
  const had = gear?.wearing?.(item.slot) ?? null;
  if (!inventory.remove(COPPER_ITEM, price)) return { ok: false, reason: 'Your purse is lighter than it looks.' };
  const worn = gear.wear(item.slot, { weight: item.weight, tier: item.tier });
  // Nothing above should be able to refuse it, but if it does he is not out the money as well.
  if (!worn.ok) { inventory.add(COPPER_ITEM, price); return { ok: false, reason: 'It does not sit right on you.' }; }
  return { ok: true, reason: '', item, had, price, ...worn };
}

/** What he says when the traveler walks up: what he is, what he has, and what he has not. */
export function smithGreeting(countryLevel, { worn = {} } = {}) {
  const best = tiernamed(0);
  const lines = [
    `Hooks, hinges, nails, and a share of the village's edges. ${best === null ? '' : `What I have to sell you is ${best}: `}`
      + 'boiled hide on a wooden frame. It is not mail and I will not call it mail.',
    'Mail wants bog iron, and bog iron wants a smith with a country behind him. There is one up the road, past the Caloss. '
      + 'What I can do is keep a stick or a bad swing off your ribs, and that is worth the copper on a road like this one.',
  ];
  const on = SLOTS.filter(slot => worn[slot]);
  if (on.length) lines.push(`You have something on already. Buy a piece for a place you are wearing and I will take the old one in part, `
    + `which is to say I will take it off your hands and say no more about it.`);
  return Object.freeze(lines);
}

/**
 * The whole scene. `context` gives the host's own doors: what he is worth, what he is wearing,
 * and the two callbacks the dialogue system uses.
 */
export function smithConversation(npc, context) {
  const { level = 0, inventory, gear, openDialogue, closeDialogue, act } = context ?? {};
  if (!npc || npc.id !== SMITH_NPC.id) return false;
  const purse = inventory?.count?.(COPPER_ITEM) ?? 0;
  const offers = smithOffers(level);
  const choices = offers.map(item => ({
    id: `smith-buy-${item.slot}-${item.weight}-${item.tier}`,
    label: `${item.label} — ${item.price} copper${purse < item.price ? ' (you cannot yet)' : ''}`,
    action: () => { closeDialogue?.(); act?.(`smith-buy:${item.slot}:${item.weight}:${item.tier}`); },
  }));
  openDialogue(npc, [...smithGreeting(level, { worn: gear?.view?.().worn ?? {} }),
    `You are carrying ${describeSum(purse)}.`], null, 'Back to the village', {
    choices: [...choices, { id: 'leave-smith', label: 'Another day.', action: closeDialogue }],
  });
  return true;
}
