/**
 * The smith of Tidehaven, and the buying (docs/combat-brief.md, phase 3).
 *
 * He is the first place the gear table meets the player: `smithStock` decides what he has,
 * `priceOf` decides what it costs, and `gear.wear` is what the traveler walks away in. Everything
 * here is a function of the country's level, so the same smith in a richer country sells better
 * iron without a line of his own - **Drent is level 0, so what he has is what you landed with**,
 * and the bog iron is a country up the road.
 *
 * **Most smiths are named for the smiths of myth** (the user, 2026-09-21: "name them things like
 * Vulcan and other mythical terms for smiths"). It is a naming register of the user's own, so it
 * takes nothing from Azhora's place-name generators: Wayland at the Moros camp, Goibniu in Ostel,
 * Hephaestus in Ambron City. Tidehaven's smith is now Martin, by the user's later request. Later ones
 * draw from the same well - Ilmarinen, Brokkr and Sindri, Tubal-cain, Svarog, Kothar. In prose
 * they are still the smith and the armourer; the name is what is shown where a name is shown.
 *
 * Pure: no DOM, no three, no world. The host owns the actor and the dialogue.
 */
import { stockOfTier, tiernamed, tierSoldAt, WEIGHTS, validPiece, armourOf, SLOTS } from './gear.js';
import { COPPER_ITEM, describeSum } from './economy.js';
import { BOW } from './archery.js';

export const SMITH_NPC = Object.freeze({
  id: 'tidehaven-smith', name: 'Martin', role: 'Smith of Tidehaven',
  modelRole: 'forest-woodcutter', color: 0x6b5a3c,
  look: Object.freeze({ hair: 0x171615, hairStyle: 'cropped', beard: false, glasses: true, hat: false }),
});

/** The army's armourer at the Moros outpost, beside the smithy tent that was already standing. */
export const MOROS_ARMOURER_NPC = Object.freeze({
  id: 'moros-armourer', name: 'Wayland', role: 'Armourer of the Moros outpost',
  modelRole: 'legion-soldier', color: 0x8f3b30,
});
/** Ostel's own smith, who was in the world before any of this and needed nobody added beside him. */
export const AMOD_SMITH_ID = 'ostel-smith';

/**
 * The capital's armourer, at his forge on Ambron's timber strand (`AMBRON_FORGE`, `src/ambron.js`).
 * The city would not have a forge among its granaries and its record house, so he is on the
 * working bank with the boatyard, the sawpit and the ropewalk, where the fire and the noise are
 * somebody else's ordinary day.
 */
export const AMBRON_ARMOURER_NPC = Object.freeze({
  id: 'ambron-armourer', name: 'Hephaestus', role: 'Armourer of Ambron',
  modelRole: 'forest-woodcutter', color: 0x5a544c,
});

/**
 * The register every smith in the game is named from, used and reserved together (the user,
 * 2026-09-21). A seller's shown name comes out of this list and out of nothing else; no Azhoran
 * place-name generator is asked for a person. It is the *name*, not the trade: the same man is
 * still the smith of Tidehaven and still the armourer of the Moros camp in anybody's prose.
 */
export const MYTH_SMITHS = Object.freeze(['Vulcan', 'Wayland', 'Goibniu', 'Hephaestus',
  'Ilmarinen', 'Brokkr', 'Sindri', 'Tubal-cain', 'Svarog', 'Kothar']);

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
    'Goibniu. Pruning hooks, channel knives, hinge work, mill fittings, and the small metal that keeps a water gate honest.',
    'Not swords. Armour is not a sword, so I will do you armour, and I will not pretend it is my trade. '
      + 'Rings are easier than hinges and there is more of the mountain in them.',
  ]),
  [MOROS_ARMOURER_NPC.id]: Object.freeze([
    'Issue, repair, and what the quartermaster has not written down yet. You are not on my rolls, so you pay.',
    'Everything here is made to be mended in a field by a tired man, which is why it is heavier than it looks and why it lasts. '
      + 'Buy the cap first. Men who buy the coat first get hit on the head.',
  ]),
  [AMBRON_ARMOURER_NPC.id]: Object.freeze([
    'Hephaestus. Issue patterns, city work, and the mending the Lord Marshal’s stores will not admit to needing.',
    'A capital is not a county. Everything on this water comes from somewhere better than here, so I keep two grades on the rack '
      + 'and I keep them both honest. Ask me for a third and I will send you to an officer, and the officer will say no.',
  ]),
});
/** Whether this person sells armour at all. The only list of them there is. */
export const sellsHere = id => Object.hasOwn(SMITH_VOICES, id);

/**
 * **A capital is the exception to "a smith sells what his country's level allows"** (the user,
 * 2026-09-21). Ambron's armourer sells wrought iron *and* steel whatever level Elagos is, because
 * an imperial capital's racks are stocked by an empire and not by the county outside its gate.
 * Fine steel is not on it: that is a gift from a side you have served, not a purchase.
 *
 * **This table is the whole of the exception.** A seller with no entry sells the tier his country
 * allows and nothing else, which is why every other board is unchanged to the digit, and why
 * adding a second capital later is a line here rather than a branch in the host.
 */
export const SELLER_TIERS = Object.freeze({ [AMBRON_ARMOURER_NPC.id]: Object.freeze([2, 3]) });

/** Which materials this seller has today: his own list if he has one, else his country's one. */
export function tiersSoldBy(id, countryLevel) {
  const fixed = SELLER_TIERS[id];
  if (fixed) return fixed;
  const tier = tierSoldAt(countryLevel);
  return tier < 0 ? Object.freeze([]) : Object.freeze([tier]);
}

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

/**
 * **Arrows, at every forge** (the user, 2026-09-21: "the smiths sell arrows", and there is no
 * fletcher and no new person). An iron head on an ash shaft is smith's work in a way a bow is
 * not, which is why the bow is given and never sold.
 *
 * A dozen at nine copper against a starting purse of twenty-four: a traveler who has just been
 * given a bow can walk to a forge and fill a quiver twice over, and still not be rich.
 */
export const ARROWS = Object.freeze({ kind: 'arrows', id: BOW.arrow, bundle: 12, price: 9,
  label: 'Arrows, a dozen' });

/**
 * A dozen shafts, bought the same atomic way a jack is: the money only moves if the satchel takes
 * them, and if it will not, the money comes back. Nothing here cares whether he owns a bow - a
 * man may lay arrows in before he has anything to shoot them with, and Jerry's gift is a
 * friendship away.
 */
function buyArrows({ inventory, item }) {
  const price = Math.max(0, Math.round(Number(item.price) || 0));
  const bundle = Math.max(1, Math.round(Number(item.bundle) || 1));
  const purse = inventory?.count?.(COPPER_ITEM) ?? 0;
  if (purse < price) return { ok: false, reason: `That is ${price} copper, and you have ${describeSum(purse)}.` };
  if (!inventory.remove(COPPER_ITEM, price)) return { ok: false, reason: 'Your purse is lighter than it looks.' };
  if (!inventory.add(item.id, bundle)) { inventory.add(COPPER_ITEM, price); return { ok: false, reason: 'You have nowhere to put them.' }; }
  return { ok: true, reason: '', item, had: null, price, arrows: bundle, quiver: inventory.count(item.id) };
}

/**
 * What he has today, named the way he would name it, with what each piece turns. `id` is which
 * seller: the board is *his*, not the street's, so the capital's two grades come out of the one
 * table above rather than out of a branch here.
 */
export function smithOffers(countryLevel, { id = SMITH_NPC.id } = {}) {
  const armour = tiersSoldBy(id, countryLevel).flatMap(tier => stockOfTier(tier)).map(item => Object.freeze({
    ...item, kind: 'armour', label: pieceName(item),
    // What this one piece on its own would turn, as a share, for a player deciding between them.
    turnsPercent: Math.round(armourOf({ [item.slot]: { weight: item.weight, tier: item.tier } }).turns * 100),
  })).sort((a, b) => a.price - b.price || a.slot.localeCompare(b.slot));
  // Arrows are the same at every forge in every country: a shaft is a shaft, and the tier table
  // is about armour. They sit first because they are the cheapest thing on any of these boards.
  return Object.freeze([ARROWS, ...armour]);
}

/**
 * Buy one piece and put it on. **Atomic**: the money only moves if the piece is a thing the game
 * has and the purse can cover it, and if the wearing somehow fails the money comes back. The
 * piece already in that place is replaced, and the caller is told what it was so it can say so.
 */
export function buyFromSmith({ inventory, gear, item } = {}) {
  if (item?.kind === 'arrows') return buyArrows({ inventory, item });
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

/** 'wrought iron' and 'steel' become 'wrought iron and steel'; three would take commas and do not. */
const nameList = names => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] ?? '');
const upperFirst = line => line.charAt(0).toUpperCase() + line.slice(1);

/**
 * What he says when the traveler walks up: who he is, what he is allowed to sell, and what he
 * is already looking at. The middle sentence is **generated from what he has**, so a smith moved
 * to a richer country tells the truth about his own iron without anybody rewriting him \u2014 and the
 * capital's armourer names both his grades without a line of his own either.
 */
export function smithGreeting(countryLevel, { worn = {}, id = SMITH_NPC.id } = {}) {
  const voice = SMITH_VOICES[id] ?? SMITH_VOICES[SMITH_NPC.id];
  const tiers = tiersSoldBy(id, countryLevel).filter(tier => tiernamed(tier));
  const lines = [voice[0]];
  if (tiers.length === 1)
    lines.push(`What I have to sell you is ${tiernamed(tiers[0])} \u2014 ${TIER_NOTES[tiers[0]] ?? 'what this country can make.'}`);
  else if (tiers.length > 1) {
    lines.push(`What I have to sell you is ${nameList(tiers.map(tiernamed))}, which is more than the country outside this wall could make.`);
    for (const tier of tiers) if (TIER_NOTES[tier]) lines.push(upperFirst(TIER_NOTES[tier]));
  }
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
  const { level = 0, inventory, gear, openDialogue, closeDialogue, act, skills, weapons, onChange = () => {} } = context ?? {};
  if (!npc || !sellsHere(npc.id)) return false;
  const purse = inventory?.count?.(COPPER_ITEM) ?? 0;
  const offers = smithOffers(level, { id: npc.id });
  // The action names the seller as well as the piece, because what is for sale is a fact about
  // the man and not only about the ground: the host rebuilds *his* board from it and looks the
  // line up there, so nothing can buy what he does not have and nothing has to be remembered.
  const choices = offers.map(item => ({
    id: item.kind === 'arrows' ? 'smith-buy-arrows' : `smith-buy-${item.slot}-${item.weight}-${item.tier}`,
    label: `${item.label} — ${item.price} copper${purse < item.price ? ' (you cannot yet)' : ''}`,
    action: () => { closeDialogue?.(); act?.(`smith-buy:${npc.id}:${item.kind === 'arrows' ? 'arrows' : `${item.slot}:${item.weight}:${item.tier}`}`); },
  }));
  openDialogue(npc, [...smithGreeting(level, { worn: gear?.view?.().worn ?? {}, id: npc.id }),
    `You are carrying ${describeSum(purse)}.`], null, 'Back to the village', {
    choices: [...(npc.id === SMITH_NPC.id && skills ? [{ id: 'martin-smithing', label: skills.taught('smithing') ? 'Practise repairing my weapons.' : 'Teach me Smithing · optional lesson', action: () => {
      openDialogue(npc, ['Martin. First rule: look at the damage before you reach for a hammer. Clean the blade, check its edge, and work only where it needs it.',
        'I can show you on a worn weapon. Once you know the method, use F at a repair bench to maintain your own gear. Actual repairs earn Smithing experience; an already sound weapon needs no work.'], null, skills.taught('smithing') ? 'Repair my worn weapons' : 'Learn Smithing', { noWayfinding: true, onComplete: () => {
        const first = skills.learn('smithing').first;
        const repaired = weapons?.repair?.() ?? false;
        if (repaired) skills.gain('smithing', 18);
        onChange();
        openDialogue(npc, [repaired ? 'There. Your weapons are ready again. Eighteen Smithing experience for useful work.' : first ? 'You know the method now. Your weapons are sound; come back after they have seen use.' : 'These are already sound. Use them, then come back when they need work.'], null, 'Back to the forge', { onComplete: () => smithConversation(npc, context) });
      } });
    } }] : []), ...choices, { id: 'leave-smith', label: 'Another day.', action: closeDialogue }],
  });
  return true;
}
