/**
 * **Taleth, Master Sorcerer of the Guild**, outside the tower in Minora (the user, 5 October 2026:
 * "The master sorcerer is called Taleth." A master sorcerer inspired by Merlin stands outside the
 * tower, with several things to talk about and, for now, one quest).
 *
 * He stands on the forecourt a few steps ahead of where the Developer Start puts Rollo, and to his
 * right, turned to face him (src/minora-opening.js). Very old and thin, a long white beard, white
 * hair to the shoulder and a midnight-blue robe. Bare-headed: the question of a hat was asked and
 * not answered, and characters are hatless unless the user asks (docs/design-answers.md).
 *
 * Five things to talk about (docs/lizeem-farmlands-design.md, section 3): the Guild and its tower,
 * the river, the war in the valley, sorcery, and the farmlands of the Lizeem, which is the charge
 * he gives. Taking it teaches *Sound the Soil*, the first working of field sorcery, which nobody
 * else teaches (src/sorcery.js). The quest itself is another module's (src/lizeem-farmlands.js):
 * here it is only `offer()` when he puts the charge, `accept()` when it is taken, and `accepted()`.
 * Whatever that module wants to add to his topics (the tart from Caricas) comes in through
 * `context.extraChoices`. Two later charges show as locked topics,
 * because an unavailable lesson is shown locked rather than granted as a placeholder
 * (docs/design-answers.md).
 *
 * The Dividing (Build 5, 6 October 2026): a third locked topic, "The Dividing", until all four
 * countries are restored. src/dividing.js opens it by handing in a choice with the same id through
 * `extraChoices`, and once the Dividing is held (`context.dividing.held()`) the two later charges
 * stay locked with the reason that they come after it and are not yet written.
 *
 * Pure: no DOM, no three. The host supplies the dialogue box.
 */

/** Where the Developer Start puts the player, and so where Taleth has to be "a few steps ahead and to the right". */
const START = Object.freeze({ x: -2414, z: 63 });

/**
 * Taleth as the world builds him. `modelRole: 'mercenary'` is the kit that takes a look by parts
 * (src/characters.js); `jerkin: false` leaves the company's laced leather off a Guild robe.
 */
export const TALETH = Object.freeze({
  id: 'taleth', name: 'Taleth', role: 'Master Sorcerer of the Guild',
  modelRole: 'mercenary', color: 0x1b2147, skin: 0xe2c4a8,
  x: -2409.5, z: 58, yaw: -0.73,
  essential: true, hat: false,
  look: Object.freeze({ build: 'slight', headgear: 'bare', hairStyle: 'lank', hair: 0xefece4, facialHair: 'long',
    garment: 'robe', jerkin: false, marks: Object.freeze([]) }),
  // What Mind Read finds (src/magic.js `thoughtOf`).
  thought: 'He is counting the lines of the Measure that are still empty, and has been since before you arrived.',
});
export const TALETH_START = START;

/**
 * The four things he will talk about whenever asked. The fifth, the charge, changes once it has
 * been taken, so it is built in `talethConversation`.
 */
export const TALETH_TOPICS = Object.freeze([
  Object.freeze({ id: 'taleth-guild', label: 'Tell me about the Guild and the tower', lines: Object.freeze([
    'The Guild is the oldest thing in Minora that belongs neither to the temple nor to the crown. We keep records, train whoever can be trained, and work what the river allows.',
    'The tower stands at the fork because that is where the two waters meet and argue. A sorcerer wants to live near an argument. It is where the work is.',
    'Master Sorcerer is a rank, not a compliment. It means I have outlived everybody who might have objected.',
    'The door sticks. It has stuck for forty years, and the Guild has twice voted not to mend it, on grounds nobody can now remember.',
  ]) }),
  Object.freeze({ id: 'taleth-river', label: 'And the river?', lines: Object.freeze([
    'The Lizeem comes down from the north, and the Isa meets it under our walls. Below the fork it carries everything: grain, fish, barges, and now and then a magistrate.',
    'Nobody wades it and nobody swims it. The White Bridge is the only crossing, and the Bridge Wardens will tell you so at length.',
    'Four countries live off it below us. Caricas over the White Bridge and Nesdor beyond it, on the east bank; Nethereum over the Pilgrims’ Bridge and Ovesos beyond it, on the west. The two banks meet only here.',
    'Each farms its own way and is sure the other three are doing it wrong. Caricas rests its ground in turn. Nethereum drowns its meadows on purpose. Nesdor plants by how high a strip stands above the water. Ovesos shares its water out by turns and argues about it for eleven years at a time.',
  ]) }),
  Object.freeze({ id: 'taleth-war', label: 'What is happening in the valley?', lines: Object.freeze([
    'Less than a year ago the old king died, and the League put Ambron’s crown down and walked away from it. Five countries, one council here in Minora, and very few soldiers. It was brave, and it was not well defended.',
    'Cedric had already lost one crown, to the republicans and his half-brother Willard. He came over our wall by night with his guard and took the city and the League’s government with it. He was not going to be particular about the second crown.',
    'Now his brother Wilhelm is camped outside the Muster Gate with an army, come to hold it for him. One prince inside the walls and one outside them. The city has never been so well guarded, and nobody in it has ever felt less safe.',
    'Caricas, Nethereum, Ovesos and Nesdor have each risen against the League he holds. Separately, which is how rivers do things. They are trying to keep in step without a council to meet in.',
    'And everybody still eats. The garrison eats Carican grain, and the court eats whatever it is sent. Down the river, a man from Minora is a man from Cedric’s city until he proves otherwise.',
    'The Guild measures the river for the river, not for the crown. I told the prince so. He took it about as well as you would expect, and the tower is still standing, so we are even.',
  ]) }),
  Object.freeze({ id: 'taleth-sorcery', label: 'Talk to me about sorcery', lines: Object.freeze([
    'It costs focus. Not wind and not blood: focus. It comes back if you stop and nobody is hitting you, which is good advice for most of life.',
    'A staff or a wand, in the hand you would otherwise fight with. You cannot have both, and you would be surprised how many young men try.',
    'I will not teach fire. Not because it is dangerous; everything is dangerous. A sorcerer who learns fire first spends the rest of his life looking for things to set alight, and I am too old to watch that again. Ben teaches it in Nothom, and is welcome to.',
    'What I teach is older and quieter. Field sorcery: the ground, the water, and what grows between them. It will never kill a spider, and it has fed more people than every fireball ever thrown.',
    'Frost and wards nobody teaches at present, whatever you are told in a tavern.',
  ]) }),
]);

/** The charge, as he gives it before it is taken (section 3, "Why a sorcerer cares about farms"). */
export const TALETH_CHARGE = Object.freeze([
  'Every year before the Dividing, the Guild takes the Measure of the River. Somebody walks down both banks and brings back the best of what each country grows, sealed by a Minoran measurer, and we lay it up in the tower.',
  'Our workings draw on a living valley, and the Measure is how we know it is still alive. Nobody has walked it since the League broke with Ambron.',
  'The farmers are in the rebellion or keeping their heads down. Cedric’s garrison holds the granary in Caricas. The farmsteads stand empty, and I am too old to walk to the gate, never mind to Ovesos.',
  'So: go down the river. Work the ground in each of the four countries their own way, bring in a fine harvest, cook their dish, have it sealed and carry it back to me. Four countries, four leaves of the Measure. Take your time. The river does.',
  'And remember what I said. Down there you are a man from Cedric’s city until you prove otherwise. Proving it is mostly a matter of being useful.',
]);

/** What he says as he teaches Sound the Soil, which is the farmer's test from the lore, worked with a staff. */
export const SOUND_THE_SOIL_LESSON = Object.freeze([
  'Then take this with you. Plant the staff beside a bed and ask the ground what it needs. It will tell you how rested it is, how wet and how salt, and what it last carried.',
  'And the farmer’s test, which is older than the Guild: soil that rolls into a cord and breaks when you bend it is ready. Soil that smears is too wet. Soil that crumbles has missed its moment.',
  'That is Sound the Soil. It costs a little focus and saves a great deal of guessing. Stand within a few paces of the bed when you cast it.',
]);

/** Once the charge is taken, what he says about it. */
export const TALETH_MEASURE = Object.freeze([
  'The Measure is in your journal: four leaves, one for each country, and every line empty until you fill it. Bring each country’s best to Minora at Fine or better, have a measurer seal it, and the line is yours.',
  'Start where you like. Caricas is over the White Bridge and nearest, which is the only argument I will make for it.',
]);

/** The two later charges, shown and not offered (the project rule: an unavailable lesson is locked, not faked). */
export const TALETH_LATER = Object.freeze([
  Object.freeze({ id: 'taleth-second-charge', label: 'A second charge · locked', reason: 'Taleth has nothing more to ask while the Measure of the River is still to be taken.' }),
  Object.freeze({ id: 'taleth-third-charge', label: 'A third charge · locked', reason: 'Not before the Dividing has been held on the forecourt.' }),
]);
/**
 * The Dividing, shown locked until the river is whole (6 October 2026). src/dividing.js answers a choice with this
 * id through `extraChoices` once all four countries are restored, and that choice takes this one's place.
 */
export const TALETH_DIVIDING = Object.freeze({ id: 'taleth-dividing', label: 'The Dividing · locked',
  reason: 'Not until all four countries down the river are restored. The Dividing waits for the whole river.' });
/** What the later charges say once the Dividing is held: they come after it, and Taleth has not written them. */
export const TALETH_AFTER_DIVIDING = 'After the Dividing: not yet written.';

/** The spell the charge teaches. */
export const TALETH_TEACHES = 'sound-the-soil';

/** How he greets you: he answers the first question a moment before it is asked. */
export function talethGreeting({ playerId = null, accepted = false, held = false } = {}) {
  const rollo = playerId === 'rollo';
  // After the Dividing (6 October 2026).
  if (accepted && held) return [rollo ? 'Rollo. Walker of the Measure, and still you climb the hill to ask me things. What else?' : 'Walker of the Measure. The bowls are still out, if you want to look at them. What else?'];
  if (accepted) return [rollo ? 'Rollo. The river has not moved since you last asked. What else?' : 'You again. The river has not moved since you last asked. What else?'];
  return rollo
    ? ['Yes, it still sticks. The door. You were about to ask, and I have saved you the breath.',
      'Rollo. You took the long way back, as you always do. Sit, if the step will have you. I have a few things to tell you and one thing to ask.']
    : ['Yes, this is the Guild’s tower, and no, it is not open to visitors. You were about to ask.',
      'I am Taleth, Master Sorcerer of the Guild. I have a few things I will tell anybody who stands still long enough, and one thing I ask of very few.'];
}

/**
 * The topic hub: the four topics, the charge (offered, or talked about once taken), anything the
 * quest adds, the two locked charges and a way out. Every topic comes back here. Returns false for
 * anybody who is not Taleth.
 *
 * `context`: `{ openDialogue, closeDialogue, farmlands: { offer, accept, accepted }, magic, notify,
 * onChange, playerId, extraChoices, dividing: { held } }`. Hearing the charge is `offer()`; taking it is `accept()` (or,
 * for a quest with no separate acceptance, `offer()`), and once it is taken Sound the Soil is
 * taught with `magic.learn`. `extraChoices(npc, back)` answers more choices for the hub.
 */
export function talethConversation(npc, context) {
  if (npc?.id !== TALETH.id) return false;
  const { openDialogue, closeDialogue, farmlands = null, magic = null, notify = () => {}, onChange = () => {} } = context;
  const playerId = typeof context.playerId === 'function' ? context.playerId() : context.playerId ?? null;
  const accepted = () => !!farmlands?.accepted?.();
  const back = () => talethConversation(npc, context);
  const topic = entry => ({ id: entry.id, label: entry.label, action: () => openDialogue(npc, [...entry.lines], null, 'Back to Taleth', { noWayfinding: true, onComplete: back }) });

  function teach() {
    if (!magic || magic.known?.(TALETH_TEACHES)) return false;
    const learned = magic.learn(TALETH_TEACHES);
    return !!learned?.ok;
  }
  const twoStep = typeof farmlands?.accept === 'function';
  function take() {
    const taken = twoStep ? farmlands.accept() : farmlands?.offer?.();
    if (!farmlands || (taken === false || taken?.ok === false) && !accepted()) {
      notify(taken?.reason ?? 'The charge cannot be taken just now.', 'TALETH');
      back();
      return;
    }
    teach(); onChange();
    openDialogue(npc, [...SOUND_THE_SOIL_LESSON], null, 'Back to Taleth', { noWayfinding: true, onComplete: back });
  }

  const choices = TALETH_TOPICS.map(topic);
  if (accepted()) {
    // A save that took the charge and somehow lost the lesson gets it back, quietly: nothing here
    // pays twice, and the spell cannot be learned twice (src/magic.js).
    choices.push({ id: 'taleth-measure', label: 'About the Measure of the River', action: () => {
      if (teach()) onChange();
      openDialogue(npc, [...TALETH_MEASURE], null, 'Back to Taleth', { noWayfinding: true, onComplete: back });
    } });
  } else {
    choices.push({ id: 'taleth-charge', label: 'You said there was one thing to ask', action: () => {
      // Hearing it is not taking it: the quest records that it was put (and shows on the slate).
      if (twoStep && farmlands.offer?.()) onChange();
      openDialogue(npc, [...TALETH_CHARGE], null, 'Back to Taleth', { noWayfinding: true, choices: [
        { id: 'taleth-take-charge', label: 'I will walk the river for the Measure', action: take },
        { id: 'taleth-not-yet', label: 'Not yet', action: back },
      ] });
    } });
  }
  const extras = (context.extraChoices?.(npc, back) ?? []).filter(extra => extra?.id && typeof extra.action === 'function');
  choices.push(...extras);
  // The Dividing stays locked until src/dividing.js hands in its own choice; once it is held, the later
  // charges are locked for a different reason (6 October 2026).
  if (!extras.some(extra => extra.id === TALETH_DIVIDING.id))
    choices.push({ id: TALETH_DIVIDING.id, label: TALETH_DIVIDING.label, disabled: true, reason: TALETH_DIVIDING.reason, action: () => {} });
  let held = false;
  try { held = !!context.dividing?.held?.(); } catch { held = false; }
  for (const later of TALETH_LATER) choices.push({ id: later.id, label: later.label, disabled: true, reason: held ? TALETH_AFTER_DIVIDING : later.reason, action: () => {} });
  choices.push({ id: 'taleth-leave', label: 'Leave him to the step', action: closeDialogue });
  openDialogue(npc, talethGreeting({ playerId, accepted: accepted(), held }), null, 'Leave him to the step', { choices });
  return true;
}
