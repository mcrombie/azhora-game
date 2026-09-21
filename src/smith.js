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
import { smithStock, tiernamed, tierSoldAt, WEIGHTS, validPiece, armourOf, SLOTS } from './gear.js';
import { COPPER_ITEM, describeSum } from './economy.js';

export const SMITH_NPC = Object.freeze({
  id: 'tidehaven-smith', name: 'The smith', role: 'Smith of Tidehaven',
  modelRole: 'forest-woodcutter', color: 0x6b5a3c,
});

/** The army's armourer at the Moros outpost, beside the smithy tent that was already standing. */
export const MOROS_ARMOURER_NPC = Object.freeze({
  id: 'moros-armourer', name: 'The armourer', role: 'Armourer of the Moros outpost',
  modelRole: 'legion-soldier', color: 0x8f3b30,
});
/** Ostel's own smith, who was in the world before any of this and needed nobody added beside him. */
export const AMOD_SMITH_ID = 'ostel-smith';

/**
 * What each of them says for himself. **The material is not in here**: what a smith sells is a
 * function of the country he stands in, so the sentence naming it is generated below and these
 * are only the man. An Amod mountain smith and an army armourer are not the Tidehaven man.
 */
export const SMITH_VOICES = Object.freeze({
  [SMITH_NPC.id]: Object.freeze([
    'Hooks, hinges, nails, and a share of the village\u2019s edges.',
    'Mail wants bog iron, and bog iron wants a smith with a country behind him. There is one up the road, past the Caloss. '
      + 'What I can do is keep a stick or a bad swing off your ribs, and that is worth the copper on a road like this one.',
  ]),
  [AMOD_SMITH_ID]: Object.freeze([
    'Mern. Pruning hooks, channel knives, hinge work, mill fittings, and the small metal that keeps a water gate honest.',
    'Not swords. Armour is not a sword, so I will do you armour, and I will not pretend it is my trade. '
      + 'Rings are easier than hinges and there is more of the mountain in them.',
  ]),
  [MOROS_ARMOURER_NPC.id]: Object.freeze([
    'Issue, repair, and what the quartermaster has not written down yet. You are not on my rolls, so you pay.',
    'Everything here is made to be mended in a field by a tired man, which is why it is heavier than it looks and why it lasts. '
      + 'Buy the cap first. Men who buy the coat first get hit on the head.',
  ]),
});
/** Whether this person sells armour at all. The only list of them there is. */
export const sellsHere = id => Object.hasOwn(SMITH_VOICES, id);

/** What each material is, said once, wherever it is sold. Tiers 5 and 6 have no names and no note. */
export const TIER_NOTES = Object.freeze({
  0: 'boiled hide on a wooden frame. It is not mail and I will not call it mail.',
  1: 'bog iron: rings for a shirt, plates for a cap. It will turn a stick, and it will turn a bad swing.',
  2: 'wrought iron, hammered and folded, which is a different thing from the bog stuff and wears better.',
  3: 'steel. The Empire issues it, and what I sell you is what they wear.',
  4: 'fine steel, which is what officers wear and what you will pay for.',
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

/**
 * What he says when the traveler walks up: who he is, what the country lets him sell, and what he
 * is already looking at. The middle sentence is **generated from the level**, so a smith moved to
 * a richer country tells the truth about his own iron without anybody rewriting him.
 */
export function smithGreeting(countryLevel, { worn = {}, id = SMITH_NPC.id } = {}) {
  const voice = SMITH_VOICES[id] ?? SMITH_VOICES[SMITH_NPC.id];
  const tier = tierSoldAt(countryLevel), material = tiernamed(tier);
  const lines = [voice[0]];
  if (material) lines.push(`What I have to sell you is ${material} \u2014 ${TIER_NOTES[tier] ?? 'what this country can make.'}`);
  lines.push(...voice.slice(1));
  const on = SLOTS.filter(slot => worn[slot]);
  if (on.length) lines.push('You have something on already. Buy a piece for a place you are wearing and I will take the old one in part, '
    + 'which is to say I will take it off your hands and say no more about it.');
  return Object.freeze(lines);
}

/**
 * The whole scene. `context` gives the host's own doors: what he is worth, what he is wearing,
 * and the two callbacks the dialogue system uses.
 */
export function smithConversation(npc, context) {
  const { level = 0, inventory, gear, openDialogue, closeDialogue, act } = context ?? {};
  if (!npc || !sellsHere(npc.id)) return false;
  const purse = inventory?.count?.(COPPER_ITEM) ?? 0;
  const offers = smithOffers(level);
  const choices = offers.map(item => ({
    id: `smith-buy-${item.slot}-${item.weight}-${item.tier}`,
    label: `${item.label} — ${item.price} copper${purse < item.price ? ' (you cannot yet)' : ''}`,
    action: () => { closeDialogue?.(); act?.(`smith-buy:${item.slot}:${item.weight}:${item.tier}`); },
  }));
  openDialogue(npc, [...smithGreeting(level, { worn: gear?.view?.().worn ?? {}, id: npc.id }),
    `You are carrying ${describeSum(purse)}.`], null, 'Back to the village', {
    choices: [...choices, { id: 'leave-smith', label: 'Another day.', action: closeDialogue }],
  });
  return true;
}
