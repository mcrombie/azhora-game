/**
 * **Liz, her bees, and the cat that will not be told.** Her quest in Pueth (the user,
 * 22 September 2026).
 *
 * Liz keeps the skeps in a clearing in Pueth's woods and is the game's source of honeycomb now
 * that Troy has gone to sea (the user's ruling; it was his at the Bee Fold in Drent). She is a
 * beast sorcerer, which in practice means the bees put up with her and she is modest about it.
 *
 * **The cat is eating scraps on the outskirts of the goblin camp**, twenty-two metres out from
 * the middle of it, which is close enough that anybody fetching it is in the camp's business
 * whether they meant to be or not. The quest is not to kill the goblins. The quest is to get the
 * cat home alive, and the goblins are what is in the way of that.
 *
 * **The cat has opinions.** It will not be carried and it will not be led. It follows somebody it
 * has decided about, at its own pace and its own distance, and it stops to consider things. A
 * fight frightens it: it bolts for the nearest thing to hide under and has to be collected again.
 * It can be killed, and if it is, the quest ends and Liz is told, which is a worse errand than
 * the goblins were.
 *
 * **The reward** is the guild's money or the first lesson in beast sorcery — summon bees — one or
 * the other, once, which is the shape all three of these have (src/sorcery.js).
 *
 * Pure: no DOM, no three. The host walks the cat and lays the fight.
 */
import { BEE_LINES } from './beekeeper.js';

export const CAT_QUEST_VERSION = 1;

/**
 * Liz. Straight black hair, tan skin, and the user's word for her is pretty; what the game can
 * draw of that is the hair, the skin and a face that is not doing anything defensive.
 */
export const LIZ = Object.freeze({
  id: 'liz-beekeeper', name: 'Liz', role: 'Keeper of the Pueth skeps',
  // Her own build (`skep-keeper`, src/characters.js): Troy's trade and Troy's smock, and none of
  // Troy's head. He is `bee-keeper`, and that role is a red beard and a grin.
  modelRole: 'skep-keeper', color: 0xd8d2bc, skin: 0xc79a6b,
  look: Object.freeze({ hair: 0x14110f, hairStyle: 'long', slight: true }),
});

/**
 * Her clearing, and the cat's spot, both measured on the built world. The world places her at
 * the same point (`LIZ_CLEARING`, src/pueth-world.js); she faces the trail her visitors come up.
 */
export const LIZ_STAND = Object.freeze({ x: -36, z: -171, yaw: 2.2 });
export const CAT = Object.freeze({
  id: 'liz-cat', name: 'Mop',
  /**
   * Twenty-two metres north of the camp's middle and nineteen from the nearest goblin: on its
   * outskirts, in among its scraps, and a ninety-one metre walk from Liz.
   */
  at: Object.freeze({ x: 55, z: -168 }),
  /** How near you have to be before it will decide about you, and how far it then follows. */
  reach: 3.2, follow: 4.4,
  /** How far from Liz counts as home. */
  home: 6,
});

/** What the guild's beekeeper pays, in copper, if you would rather have it than the lesson. */
export const PURSE = 30;
export const REWARDS = Object.freeze({
  purse: Object.freeze({ id: 'purse', stage: 'paid', label: 'Take the coin' }),
  lesson: Object.freeze({ id: 'lesson', stage: 'taught', label: 'Ask her to teach you the bees' }),
});

export const STAGES = Object.freeze(['unmet', 'asked', 'looking', 'following', 'home', 'paid', 'taught', 'lost']);

const emptyState = () => ({ version: CAT_QUEST_VERSION, stage: 'unmet', found: false, bolted: 0 });

export function validateCatQuestSnapshot(value) {
  if (!value || typeof value !== 'object' || value.version !== CAT_QUEST_VERSION) return false;
  if (!STAGES.includes(value.stage)) return false;
  if (typeof value.found !== 'boolean') return false;
  if (!Number.isSafeInteger(value.bolted) || value.bolted < 0 || value.bolted > 999) return false;
  // It cannot be home, or paid for, without having been found first.
  if (['following', 'home', 'paid', 'taught'].includes(value.stage) && !value.found) return false;
  return true;
}

export function createCatQuest({ onEvent = () => {} } = {}) {
  let state = emptyState();
  const snapshot = () => ({ ...state });
  const at = (...stages) => stages.includes(state.stage);

  function ask() {
    if (!at('unmet')) return false;
    state.stage = 'asked';
    return true;
  }

  /** Said yes: she tells you roughly where, which is more than she wants to say out loud. */
  function accept() {
    if (!at('asked')) return false;
    state.stage = 'looking';
    onEvent({ type: 'cat-sought' });
    return true;
  }

  /** You got near enough and it decided about you. */
  function found() {
    if (!at('looking')) return false;
    state.found = true; state.stage = 'following';
    onEvent({ type: 'cat-found' });
    return true;
  }

  /**
   * Something frightened it. It is not lost — it is under the nearest thing, and it has to be
   * gone back for. Counted, because a player who keeps starting fights around it should feel that.
   */
  function bolts() {
    if (!at('following')) return false;
    state.bolted = Math.min(999, state.bolted + 1);
    state.stage = 'looking';
    onEvent({ type: 'cat-bolted', times: state.bolted });
    return true;
  }

  /** It was killed, which ends the errand and is the one outcome Liz cannot be paid for. */
  function died() {
    if (at('paid', 'taught', 'lost') || !state.found) return false;
    state.stage = 'lost';
    onEvent({ type: 'cat-lost' });
    return true;
  }

  /** Home, and alive, which is the whole of what she asked for. */
  function home() {
    if (!at('following')) return false;
    state.stage = 'home';
    onEvent({ type: 'cat-home' });
    return true;
  }

  function take(rewardId) {
    const reward = REWARDS[rewardId];
    if (!reward || !at('home')) return null;
    state.stage = reward.stage;
    onEvent({ type: 'cat-paid', reward: reward.id });
    return reward;
  }

  function restore(data) {
    if (!validateCatQuestSnapshot(data)) return false;
    state = { version: CAT_QUEST_VERSION, stage: data.stage, found: data.found, bolted: data.bolted };
    return true;
  }

  return {
    ask, accept, found, bolts, died, home, take, snapshot, restore,
    choices: () => (state.stage === 'home' ? Object.values(REWARDS) : []),
    get state() {
      return { ...snapshot(), walking: state.stage === 'following',
        over: ['paid', 'taught', 'lost'].includes(state.stage) };
    },
  };
}

/**
 * **Mop, walking.** A pure behaviour, like the harbour cat's (src/village-cat.js): the host tells
 * it where its model is and what is happening, and it says where the cat wants to be and how it
 * should be posed. It never reads the world itself.
 *
 * The rules are the user's: it will not be carried and it will not be led. It sits at the midden
 * until somebody is near enough and slow enough to be worth deciding about, and then it follows
 * at its own distance and stops to consider things. A fight anywhere near it and it is gone —
 * under the nearest thing, and it has to be walked back to.
 */
export const MOP = Object.freeze({
  /** Metres. */
  decide: CAT.reach,        // this near, and moving slowly, and it decides about you
  follow: CAT.follow,       // how far behind it will trail
  lose: 26,                 // further than this and it stops following and sits down
  fight: 16,                // a fight this near and it bolts
  bolt: 14,                 // how far it goes
  /** Metres a second. */
  walk: 1.5, trot: 2.9, run: 5.4,
  /** Seconds. */
  settle: 2.4,              // standing still this long and it sits down too
  hides: 6,                 // how long it stays hidden before it will be approached again
  still: .6,                // a traveler slower than this is standing still
});

export function createMopWalk({ random = Math.random, at = CAT.at } = {}) {
  const state = { mode: 'waiting', x: at.x, z: at.z, gx: at.x, gz: at.z, timer: 0, still: 0, hidden: 0, angle: random() * 6.28 };
  const point = { x: at.x, z: at.z };
  const gap = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

  /** The host places the model each frame, the way it does the harbour cat's. */
  function place(x, z) { point.x = x; point.z = z; }

  function bolt(fromX, fromZ) {
    const away = Math.atan2(point.z - fromZ, point.x - fromX) + (random() - .5) * 1.2;
    state.gx = point.x + Math.cos(away) * MOP.bolt;
    state.gz = point.z + Math.sin(away) * MOP.bolt;
    state.mode = 'bolting'; state.hidden = MOP.hides;
  }

  /**
   * One step. `fight` is whether something is being fought near enough to hear, `threat` the
   * point it is being fought at, and `home` where Liz is standing.
   */
  function update(dt, { player, speed = 0, fight = false, threat = null, home = null } = {}) {
    const step = Math.max(0, Math.min(.1, dt));
    const toPlayer = player ? gap(point.x, point.z, player.x, player.z) : Infinity;
    const frightened = fight && (!threat || gap(point.x, point.z, threat.x, threat.z) < MOP.fight);
    let bolted = false;
    if (frightened && state.mode !== 'bolting' && state.mode !== 'hiding') {
      bolted = state.mode === 'following';
      bolt(threat?.x ?? player?.x ?? point.x, threat?.z ?? player?.z ?? point.z);
    }
    state.still = speed < MOP.still ? state.still + step : 0;

    if (state.mode === 'waiting' || state.mode === 'hiding') {
      state.hidden = Math.max(0, state.hidden - step);
      state.gx = point.x; state.gz = point.z;
      const ready = state.mode === 'waiting' || state.hidden === 0;
      if (ready && toPlayer < MOP.decide && state.still > .8 && !fight) state.mode = 'following';
    } else if (state.mode === 'bolting') {
      if (gap(point.x, point.z, state.gx, state.gz) < .6) { state.mode = 'hiding'; state.timer = 0; }
    } else if (state.mode === 'following') {
      if (toPlayer > MOP.lose) { state.mode = 'waiting'; state.gx = point.x; state.gz = point.z; }
      else if (toPlayer > MOP.follow) {
        const angle = Math.atan2(point.z - player.z, point.x - player.x);
        state.gx = player.x + Math.cos(angle) * (MOP.follow - .8);
        state.gz = player.z + Math.sin(angle) * (MOP.follow - .8);
      } else { state.gx = point.x; state.gz = point.z; }
    }

    const away = gap(point.x, point.z, state.gx, state.gz);
    // It trots when it is being left behind, and never otherwise: the distance that matters is
    // the one to the traveler, not the one to the patch of ground it is aiming at.
    const behind = state.mode === 'following' && toPlayer > MOP.follow + 2;
    const pace = state.mode === 'bolting' ? MOP.run : behind ? MOP.trot : away > .8 ? MOP.walk : 0;
    let x = point.x, z = point.z;
    if (pace > 0 && away > .05) {
      const move = Math.min(away, pace * step);
      x += (state.gx - point.x) / away * move;
      z += (state.gz - point.z) / away * move;
      state.angle = Math.atan2(state.gz - point.z, state.gx - point.x);
    }
    const sitting = pace === 0 && (state.mode !== 'following' || state.still > MOP.settle);
    // The poses are the harbour cat's (`CAT_POSES`, src/characters.js): on the midden he is
    // eating, under a thing he is crouched, behind you he is walking or sitting.
    const posture = state.mode === 'hiding' ? 'crouch'
      : state.mode === 'waiting' ? (pace > 0 ? 'walk' : 'eat')
        : sitting ? 'sit' : 'walk';
    const atHome = home ? gap(x, z, home.x, home.z) < CAT.home : false;
    return { x, z, pace, sitting, posture, angle: state.angle, mode: state.mode,
      following: state.mode === 'following', bolted, home: atHome && state.mode === 'following',
      near: toPlayer };
  }

  return { place, update, get mode() { return state.mode; },
    set mode(value) { state.mode = value; },
    get goal() { return { x: state.gx, z: state.gz }; } };
}

/** What she says when the cat is not the subject. The bees are in src/beekeeper.js. */
export const LIZ_LINES = Object.freeze([
  'Liz. Three skeps, a cat, and a long way from anybody, which is the arrangement I went looking for.',
  'The guild has a word for what I do and it is a grand one. What it means is that things with more legs than me put up with me, and I have never been stung in my life.',
  'Rimeholt takes the comb and asks no questions, and the army takes the comb and writes it down. I prefer Rimeholt.',
  'There are goblins somewhere south of here. Everybody says so and nobody has seen one, and I have decided that is somebody else’s business until it is mine.',
]);

/** The errand, as she puts it, which is not how she would put it to somebody she knew. */
export const LIZ_ASKING = Object.freeze([
  'Oh — you are a person. Good. I am going to ask you something and you are going to think less of me for it.',
  'My cat is missing. Four days. He is grey, he is enormous, he answers to Mop when it suits him, and he is not lost — I know where he is.',
  'There is a camp south-east of here through the birch, and there is a midden at the edge of it, and there is a cat on the midden. The camp is goblins.',
  'I cannot go. They would see me coming and they would not see a beekeeper. You are carrying a sword and you have not asked me for anything, which puts you ahead of most.',
]);

/**
 * **Liz's conversation.** The comb is a trade she has always had; the cat is the errand. Both
 * live in one dialogue because she is one woman and it is one clearing.
 */
export function lizConversation(npc, context) {
  const { cat, comb, openDialogue, closeDialogue, act, coppers = 0, visits = 0, carrying = false } = context;
  if (npc?.id !== LIZ.id) return false;
  const stage = cat.state.stage;
  const leave = { id: 'leave-liz', label: 'Leave her to the bees.', action: closeDialogue };
  const price = comb.price();
  const combChoice = {
    id: 'take-honeycomb', label: price ? `Buy a comb (${price} copper)` : 'Take the comb',
    action: () => { closeDialogue(); act('take-honeycomb'); },
  };
  const bees = {
    id: 'ask-bees', label: 'Ask about the skeps.',
    action: () => openDialogue(npc, [BEE_LINES[visits % BEE_LINES.length]], null, 'Back to Liz',
      { onComplete: () => lizConversation(npc, { ...context, visits: visits + 1 }) }),
  };
  const her = {
    id: 'ask-liz', label: 'Ask about her.',
    action: () => openDialogue(npc, [LIZ_LINES[visits % LIZ_LINES.length]], null, 'Back to Liz',
      { onComplete: () => lizConversation(npc, { ...context, visits: visits + 1 }) }),
  };
  const trade = price === 0 || coppers >= price ? [combChoice] : [];

  if (stage === 'unmet' || stage === 'asked') {
    cat.ask();
    openDialogue(npc, [...LIZ_ASKING], null, 'Back to the clearing', { choices: [
      { id: 'cat-yes', label: 'I will fetch your cat.', action: () => { closeDialogue(); act('cat-accept'); } },
      { id: 'cat-goblins', label: 'How close is the camp?',
        action: () => openDialogue(npc, [
          'Ninety paces of birch and then a clearing you will wish you had not walked into. Go quietly and come back the same way.',
          'He will not be carried and he will not be led. Get close, let him decide about you, and then walk. He follows people he has decided about.'],
          null, 'Back to Liz', { onComplete: () => lizConversation(npc, context) }) },
      ...trade, bees, leave] });
    return true;
  }
  if (stage === 'looking') {
    openDialogue(npc, [carrying
      ? 'You have been out there. Is he — no. Go back and be patient with him; he is not a dog and he will not come because you want him to.'
      : 'South-east, through the birch, at the edge of their midden. Let him decide about you and then walk home slowly.'],
      null, 'Back to the clearing', { choices: [...trade, bees, leave] });
    return true;
  }
  if (stage === 'following') {
    openDialogue(npc, ['He is behind you. Do not look at him. Keep walking and bring him in.'],
      null, 'Back to the clearing', { choices: [leave] });
    return true;
  }
  if (stage === 'home') {
    openDialogue(npc, [
      'There he is. There he is, the enormous idiot — no, do not come to me, go and sit in the door where I can see you.',
      'Right. The guild pays me for the honey and I have been paid for it twice this season, so there is coin and you should take it.',
      'Or. You went into a goblin camp for a cat, which is the sort of thing the guild will not teach anybody, and I can teach you the other. One of the two, and I will not make a speech about it.'],
      null, 'Choose', { choices: [
        { id: 'cat-purse', label: `Take the coin · ${PURSE} copper`, action: () => { closeDialogue(); act('cat-reward', 'purse'); } },
        { id: 'cat-lesson', label: 'Teach me the bees.', action: () => { closeDialogue(); act('cat-reward', 'lesson'); } }] });
    return true;
  }
  if (stage === 'lost') {
    openDialogue(npc, ['I know. I heard it from here, and then I did not hear it.',
      'Do not say the thing people say. Take a comb and go on to wherever you were going.'],
      null, 'Back to the clearing', { choices: [...trade, leave] });
    return true;
  }
  const taught = stage === 'taught';
  openDialogue(npc, [taught
    ? 'Do not call them unless you mean it. They come because you are in trouble, and they do not ask you whether you are sure.'
    : 'He has not left the door since. I am told this is normal and I do not believe it.'],
    null, 'Back to the clearing', { choices: [...trade, bees, her, leave] });
  return true;
}
