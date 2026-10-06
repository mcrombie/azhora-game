/** Catie's search and the mutually exclusive Suvali bounty. Pure persistent quest state. */
export const BATMAN_QUEST = Object.freeze({ id: 'batman-suval', title: 'A Kindness with Wings',
  headItem: 'batman-head', bounty: 100, flyingXp: 45, cartographyXp: 120 });
// A new coastal Mittoli epithet: verra (bat, coined here) + the attested dross
// (broken). The compound is authored game vocabulary, not a claim that the lore
// dictionary already contains a word for bat. Spoken gloss: "Batsmasher".
export const BATSMASHER = Object.freeze({ id: 'officer-verradross', name: 'Officer Verradross',
  epithet: 'Batsmasher', role: 'Suvali bounty officer', modelRole: 'soldier',
  color: 0x71463c, skin: 0xc69a72, hair: 0x302a24, maxHp: 230, reward: BATMAN_QUEST.bounty });
export const BATMAN_COMBAT = Object.freeze({ hp: 420, armor: .48, damage: 32, speed: 5.7,
  reach: 2.3, windup: .46, recovery: .48, radius: .76 });
export const BATMAN_QUEST_STAGES = Object.freeze(['available', 'searching', 'found', 'friendly', 'flying', 'complete', 'hostile', 'dead']);
const bounties = ['none', 'offered', 'accepted', 'declined', 'paid'];
const fresh = () => ({ version: 1, stage: 'available', offered: false, bounty: 'none', headTaken: false,
  catieTold: false, returned: false });

export const CATIE_BATMAN_OFFER = Object.freeze([
  'Everyone at Port Calos calls him a monster. I have listened to the people he rescued. They describe the same huge bat, and the same kindness.',
  'He shelters in the high country between West and South Suval. Follow the winding ridge paths; his cave is tucked under a stone overhang. You will not find it by charging straight over the mountains.',
  'Please look for him, and let him speak. I want our neighbors to understand who has been keeping their roads safe.'
]);
export const BATSMASHER_OFFER = Object.freeze([
  'Verradross. The men translate it as Batsmasher. There is an enormous winged creature hiding in the Suval highlands.',
  'Bring me its head and I will pay one hundred copper. A drawing, a story, or a promise is not proof.'
]);
export const BATMAN_GREETING = Object.freeze([
  'The shape in the cave unfolds into a towering, furred creature. Those are wings, not a cloak. He watches your hands before he watches your face.',
  '"You have climbed a long way. Put down the threat in your hand, and tell me whether somebody needs help."'
]);
export const BATMAN_PEACE = Object.freeze([
  '"Catie listened. Most people look at the teeth and stop listening. I protect whoever is left on these roads. Four years of war have left too many people with no one else."',
  '"Come above it with me. The burned farms have names. The people who lived there have names. I can show you what happened, and teach you how to keep your balance in the air."',
  '"Hold my shoulders. Let your weight follow mine. This is your first flying lesson; it is a carried journey, not permission to leap from a cliff."'
]);
/** Narrative beats run in order during the tour; the flight host reports them once each. */
export const BATMAN_HISTORY = Object.freeze([
  { id: 'flight', title: 'Flying over Suval', text: 'Keep your hands on my shoulders. Breathe with the rise of the wings. Look below us; every field once fed somebody.' },
  { id: '976', title: '976 — the siege begins', text: 'In 976, Prince Maro of Solis kidnapped the princess of Ambron. Ambron and its coalition laid siege to Solis. That siege lasted about a year.' },
  { id: 'inseld', title: 'The army from Inseld', text: 'Then Prince Wilhelm arrived. His army had been stationed on Inseld, far to the north, for ten years. No one here has ever given me a reason for those ten years.' },
  { id: 'nanvir', title: 'The Blood Prince', text: 'Wilhelm landed in South Suval. He looted the country and burned farms and towns as offerings to Nanvir, a taboo blood god. That is why people call him the Blood Prince.' },
  { id: 'imlamdris', title: 'Imlamdris', text: 'Imlamdris was razed. See the small wooden roofs beside the black stone? Those are the people beginning again. Much of South Suval is still said to carry the corruption he left behind.' },
  { id: 'solis', title: 'Two armies and a city', text: 'Later that year he fell on the siege and on Solis itself. He destroyed the forces on both sides, sparing the other Ambroni forces, and razed the city as well.' },
  { id: 'war', title: 'A war carried outward', text: 'Wilhelm acted independently. Pyros, Eer, Aevis, Selemis, and Marosh still saw what he had done as a declaration of war by Ambron. People paid for a decision they had never made.' },
  { id: 'zecron', title: 'Zecron and the islands', text: 'He took to the sea and burned Zecron in the Iscare archipelago. The island is still abandoned. Smaller settlements across those islands were broken with it.' },
  { id: '978', title: '978 — south into silence', text: 'In 978 the Blood Prince sailed south with his army. Little has been heard from him in the two years since. Silence is not the same thing as repair.' },
  { id: 'east', title: 'The spared country', text: 'East Suval alone escaped that devastation. Its closed frontier is below us. We may look from the air; we will land on the western side, where you are allowed to stand.' },
  { id: 'people', title: 'The people beneath the map', text: 'Remember the people of Suval when you hear their anger or their fear. A ruined wall is easy to see. What a family carries away from it is harder.' }
].map(Object.freeze));
export const BATMAN_LANDING_WORDS = Object.freeze([
  '"Here. Northern West Suval, beside the eastern border. Your own feet again."',
  '"Tell Catie you found me. More than that, try to understand the people here. They have survived what their rulers made of them."'
]);

export function validateBatmanQuestSnapshot(s, { allowMissing = true } = {}) {
  if (s === undefined) return allowMissing;
  if (!s || s.version !== 1 || !BATMAN_QUEST_STAGES.includes(s.stage) || !bounties.includes(s.bounty)
    || ['offered', 'headTaken', 'catieTold', 'returned'].some(key => typeof s[key] !== 'boolean')) return false;
  if (s.headTaken && s.stage !== 'dead') return false;
  if (s.bounty === 'paid' && (s.stage !== 'dead' || !s.headTaken)) return false;
  if (['flying', 'complete'].includes(s.stage) && (s.headTaken || ['accepted', 'paid'].includes(s.bounty))) return false;
  if ((s.catieTold || s.returned) && s.stage !== 'complete') return false;
  return true;
}
export function migrateBatmanQuest({ katy, hunt } = {}) {
  const s = fresh();
  if (katy?.stage === 'looking' || (hunt?.stage && hunt.stage !== 'unknown')) { s.stage = 'searching'; s.offered = true; }
  else if (katy?.stage === 'met') s.offered = true;
  return s;
}
export function createBatmanQuest({ onEvent = () => {} } = {}) {
  let s = fresh();
  const state = () => ({ ...s });
  const emit = (type, extra = {}) => onEvent({ type, questId: BATMAN_QUEST.id, ...extra });
  function offer() { if (s.offered) return false; s.offered = true; emit('batman-offered'); return true; }
  function accept() {
    if (s.stage !== 'available') return false;
    s.offered = true; s.stage = 'searching'; emit('batman-searching'); return true;
  }
  function discover() {
    if (!['available', 'searching'].includes(s.stage)) return false;
    s.stage = 'found'; emit('batman-found'); return true;
  }
  function offerBounty() {
    if (s.bounty !== 'none' || ['flying', 'complete'].includes(s.stage)) return false;
    s.bounty = 'offered'; emit('batman-bounty-offered'); return true;
  }
  function acceptBounty() {
    if (!['none', 'offered'].includes(s.bounty) || ['flying', 'complete'].includes(s.stage)) return false;
    s.bounty = 'accepted'; if (s.stage === 'available') s.stage = 'searching';
    emit('batman-bounty-accepted'); return true;
  }
  function speak() {
    if (!['found', 'searching', 'available'].includes(s.stage)) return false;
    s.stage = 'friendly'; emit('batman-friendly'); return true;
  }
  function attack() {
    if (s.stage === 'complete') { emit('batman-hostile-after-completion'); return true; }
    if (['hostile', 'dead', 'flying'].includes(s.stage)) return false;
    s.stage = 'hostile'; emit('batman-hostile'); return true;
  }
  function killed() {
    // The ordinary health/corpse store owns death after a finished quest; the
    // completed kindness is historical and does not turn into a bounty reward.
    if (s.stage === 'complete') { emit('batman-killed-after-completion'); return true; }
    if (!['hostile', 'found', 'friendly', 'searching', 'available'].includes(s.stage)) return false;
    s.stage = 'dead'; emit('batman-killed'); return true;
  }
  function takeHead({ grant = () => false } = {}) {
    if (s.stage !== 'dead' || s.headTaken || !grant(BATMAN_QUEST.headItem)) return false;
    s.headTaken = true; emit('batman-head-taken'); return true;
  }
  function claimBounty({ take = () => false, reward = () => {} } = {}) {
    if (s.stage !== 'dead' || !s.headTaken || s.bounty !== 'accepted' || !take(BATMAN_QUEST.headItem)) return false;
    s.bounty = 'paid'; reward(BATMAN_QUEST.bounty); emit('batman-bounty-paid', { copper: BATMAN_QUEST.bounty }); return true;
  }
  function beginFlight() {
    if (s.stage !== 'friendly') return false;
    s.stage = 'flying'; s.bounty = 'declined'; emit('batman-flight-started'); return true;
  }
  function finishFlight() {
    if (s.stage !== 'flying') return false;
    s.stage = 'complete'; emit('batman-flight-complete', { flyingXp: BATMAN_QUEST.flyingXp, cartographyXp: BATMAN_QUEST.cartographyXp }); return true;
  }
  function interruptFlight() {
    if (s.stage !== 'flying') return false;
    s.stage = 'friendly'; emit('batman-flight-interrupted'); return true;
  }
  function finishReturn() {
    if (s.stage !== 'complete' || s.returned) return false;
    s.returned = true; emit('batman-home'); return true;
  }
  function reportToCatie() {
    if (s.stage !== 'complete' || s.catieTold) return false;
    s.catieTold = true; emit('batman-catie-told'); return true;
  }
  function restore(value) {
    if (!validateBatmanQuestSnapshot(value)) return false;
    s = value === undefined ? fresh() : { ...value }; return true;
  }
  return { state, snapshot: state, restore, offer, accept, discover, offerBounty, acceptBounty, speak, attack,
    killed, takeHead, claimBounty, beginFlight, interruptFlight, finishFlight, finishReturn, reportToCatie,
    get completed() { return s.stage === 'complete' || s.bounty === 'paid'; } };
}
