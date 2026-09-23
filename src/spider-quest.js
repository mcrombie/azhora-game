/**
 * **Ben and the spider in the thorns**, a side quest in Luscia (the user, 22 September 2026).
 *
 * Ben is a fire sorcerer of the guild, sent to Nothom to kill a giant spider that has been seen
 * north-west of the town. He has done the arithmetic and does not like the answer, so he stands
 * on the square asking. He is light brown, bald under a wide hat, wears round spectacles, carries
 * a wand and nothing else, and he does not like spiders — which he will tell you is irrelevant,
 * professionally speaking, twice, without being asked.
 *
 * **How it goes.** Say yes and he walks you out to the den, talking. The fight is hard: one
 * creature the size of a cart, and his fireballs are the reason it is winnable at all. Kill it
 * with Ben alive and he pays what the guild sent him with — **a share of the bounty, or the first
 * lesson in fire.** One or the other. That choice is the quest's ending and there is no way to
 * have both.
 *
 * **And if you never come**, or you come and stand back, the spider kills him. He is not a
 * companion the game protects: `abandoned` is a real ending, and what you find at the den
 * afterwards is a wand on the ground and a hat. The quest closes there, unfinished, and fire
 * stays unlearned - Ben is the only person in Azhora who teaches it (src/sorcery.js).
 *
 * Pure: no DOM, no three, no world. The host walks him, lays the fight, and pays.
 */

export const SPIDER_QUEST_VERSION = 1;

/**
 * Ben, as the world builds him. Light brown, bald under the hat, round spectacles, and a wand -
 * `hairStyle: 'bald'` draws nothing on top, which is not the same as leaving the hair unsaid
 * (src/characters.js). `sorcerer` is his own build and nobody else wears it.
 */
export const BEN = Object.freeze({
  id: 'ben-sorcerer', name: 'Ben', role: 'Of the sorcerer’s guild',
  modelRole: 'sorcerer', color: 0x6b4f86, skin: 0xa9754e,
  look: Object.freeze({ hairStyle: 'bald', hat: true, slight: true }),
});

/** The spider, which is one creature and has one name. */
export const SPIDER = Object.freeze({ id: 'thorn-spider', name: 'The spider in the thorns', hp: 220, kind: 'spider' });

/**
 * The fight at the den. The way out runs back the way you came in - east, toward the town - and
 * the thing comes out of the thorns half a second after you are inside its reach.
 *
 * **Ben stands in it as an ally**, at his own numbers, because the fireballs are the reason it is
 * winnable and because he has to be able to die in it. `legionary` is the nearest ally kind the
 * combat module has to a man who fights at range and does not last long if something reaches him
 * (src/combat.js); what makes him a sorcerer is the wand in the model and the fire in the fiction.
 */
export const SPIDER_DEN = Object.freeze({
  id: 'thorn-den',
  center: Object.freeze({ x: -796, z: 276 }),
  checkpoint: Object.freeze({ x: -774, z: 276 }),
  retreatAxis: 'x', retreatLine: -762,
  enemies: Object.freeze([
    Object.freeze({ id: SPIDER.id, name: SPIDER.name, kind: SPIDER.kind, x: -800, z: 272, hp: SPIDER.hp, entry: .6 }),
  ]),
  allies: Object.freeze([
    Object.freeze({ id: 'ben-sorcerer', name: 'Ben', kind: 'legionary', x: -790, z: 280, hp: 78 }),
  ]),
});

/** Where he stands, where the den is, and what the guild is paying. */
export const SPIDER_QUEST = Object.freeze({
  id: 'ben-spider',
  ben: 'ben-sorcerer',
  /**
   * The den: measured on the built world at 125 m from Nothom's square and 100 m off the road,
   * a hundred metres from the nearest living soul, with nine clear metres round it for a fight
   * (tests/spider-quest.test.js keeps all four of those true).
   */
  den: Object.freeze({ x: -796, z: 276 }),
  /** The bounty, in copper: above the goblin camp's thirty, below the border battle's forty. */
  bounty: 35,
  /** What the other half of the fork is worth, which is the only fire anybody teaches. */
  lesson: Object.freeze({ skill: 'fire', spell: 'fireball' }),
});

/**
 * The stages, in the order they can happen.
 *
 *   `unmet`      he is on the square and has not asked yet
 *   `asked`      he has asked and you have not answered
 *   `walking`    you said yes and he is taking you there
 *   `fighting`   the den, and the thing is out
 *   `killed`     the spider is dead and Ben is alive; he owes you a choice
 *   `paid`       you took the bounty
 *   `taught`     you took the lesson
 *   `abandoned`  the spider killed him
 */
export const STAGES = Object.freeze(['unmet', 'asked', 'walking', 'fighting', 'killed', 'paid', 'taught', 'abandoned']);

/** The two ways it can end well, and what each hands over. */
export const REWARDS = Object.freeze({
  bounty: Object.freeze({ id: 'bounty', stage: 'paid', label: 'Take a share of the bounty' }),
  lesson: Object.freeze({ id: 'lesson', stage: 'taught', label: 'Ask him to show you the fire' }),
});
export const REWARD_IDS = Object.freeze(Object.keys(REWARDS));

const emptyState = () => ({ version: SPIDER_QUEST_VERSION, stage: 'unmet', benDown: false, spiderDown: false });

export function validateSpiderQuestSnapshot(value) {
  if (!value || typeof value !== 'object' || value.version !== SPIDER_QUEST_VERSION) return false;
  if (!STAGES.includes(value.stage)) return false;
  if (typeof value.benDown !== 'boolean' || typeof value.spiderDown !== 'boolean') return false;
  // A man cannot be dead and paying you, and the quest cannot be over with the thing still alive.
  if (value.benDown && !['abandoned', 'fighting'].includes(value.stage)) return false;
  if (['killed', 'paid', 'taught'].includes(value.stage) && !value.spiderDown) return false;
  if (value.stage === 'abandoned' && !value.benDown) return false;
  return true;
}

export function createSpiderQuest({ onEvent = () => {} } = {}) {
  let state = emptyState();
  const snapshot = () => ({ ...state });
  const at = (...stages) => stages.includes(state.stage);

  /** He asks, once, when the traveler first speaks to him. */
  function ask() {
    if (!at('unmet')) return false;
    state.stage = 'asked';
    return true;
  }

  /** Said yes: he sets off, and from here he is walking with you (the host moves him). */
  function accept() {
    if (!at('asked')) return false;
    state.stage = 'walking';
    onEvent({ type: 'spider-accepted' });
    return true;
  }

  /** The den is reached and the thing comes out of the thorns. */
  function begin() {
    if (!at('walking')) return false;
    state.stage = 'fighting';
    onEvent({ type: 'spider-roused' });
    return true;
  }

  /**
   * The fight, resolved. `benAlive` is the only thing that decides which ending this is: the
   * spider dying is not a victory if the man who came for it did not get up.
   */
  function settle({ spiderDead = false, benAlive = true } = {}) {
    if (!at('fighting')) return false;
    if (!benAlive) { state.benDown = true; state.spiderDown = !!spiderDead; state.stage = 'abandoned'; onEvent({ type: 'spider-took-ben' }); return true; }
    if (!spiderDead) return false;
    state.spiderDown = true; state.stage = 'killed';
    onEvent({ type: 'spider-killed' });
    return true;
  }

  /** The spider got him while the traveler was somewhere else entirely. */
  function benFell() {
    if (state.benDown || at('paid', 'taught')) return false;
    state.benDown = true; state.stage = 'abandoned';
    onEvent({ type: 'spider-took-ben' });
    return true;
  }

  /** The fork, and the whole of the ending: one of them, once. */
  function take(rewardId) {
    const reward = REWARDS[rewardId];
    if (!reward || !at('killed')) return null;
    state.stage = reward.stage;
    onEvent({ type: 'spider-paid', reward: reward.id });
    return reward;
  }

  function restore(data) {
    if (!validateSpiderQuestSnapshot(data)) return false;
    state = { version: SPIDER_QUEST_VERSION, stage: data.stage, benDown: data.benDown, spiderDown: data.spiderDown };
    return true;
  }

  return {
    ask, accept, begin, settle, benFell, take, snapshot, restore,
    /** What the traveler may choose right now, which is nothing at all until the thing is dead. */
    choices: () => (state.stage === 'killed' ? REWARD_IDS.map(id => REWARDS[id]) : []),
    get state() { return { ...snapshot(), walking: state.stage === 'walking', over: ['paid', 'taught', 'abandoned'].includes(state.stage) }; },
  };
}
