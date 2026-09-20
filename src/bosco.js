/**
 * Bosco, who belongs to Brandy Frank and would say it the other way round.
 *
 * A chihuahua-terrier: apple head, ears like a fruit bat, a wiry little beard he
 * has not earned, eyes too big for the head they are in, four very short legs, and
 * between them a barrel. He is plump. Everybody who sees him says so and Brandy has
 * stopped defending him. He is shaped like a loaf and moves like one being carried
 * at speed, and he is entirely convinced that he is an enormous dog and that the
 * yard is his to hold.
 *
 * He lives in the dye yard on the lane to Saltwind Lookout (src/brandy.js), and
 * because he lives in a dye yard he is never entirely his own colour: he leans on
 * things, and the things are vats, and what comes off on him does not wash out for
 * a month. Every visit he is wearing some fresh impossible colour somewhere he has
 * no business having one (`BOSCO_DYES`, `dyedNow`), and Brandy is mildly sorry
 * about it, the way she is mildly sorry about everything.
 *
 * What he does: patrols his four or five spots, comes to see who has arrived,
 * leans on whoever is nearest, and sits on Brandy's foot when there is nothing
 * else on. What the traveler can do is make a fuss of him, which is the whole of
 * the mechanic and is enough.
 *
 * Pure: no DOM, no three. The dog himself is src/bosco-model.js.
 */
import { yardPoint } from './brandy.js';

const freeze = Object.freeze;

export const BOSCO = freeze({
  id: 'bosco', name: 'Bosco', role: 'Brandy’s dog, and the yard’s',
  /** Fawn, with a white chest and a white blaze, and one ear that has never stood all the way up. */
  coat: 0xc79b62, cream: 0xf0e3cc, dark: 0x6d4c30,
  /** Waist high on nobody. */
  height: 0.29, talk: 2.2,
});

/** His spots, in the yard's own frame: the bench, the shade under the lines, the gate, and Brandy's feet. */
export const BOSCO_HAUNTS = freeze([
  freeze({ ...yardPoint(-2.2, -2.5), what: 'under the bench, in the one patch of shade the yard has' }),
  freeze({ ...yardPoint(2.4, -1.6), what: 'under the drying lines, where the cloth drips on him and he does not mind' }),
  freeze({ ...yardPoint(1.6, 3.2), what: 'at the gate, holding the lane against everything that comes up it' }),
  freeze({ ...yardPoint(-1.4, 1.4), what: 'sitting on Brandy’s foot, which is where he would always be if he could' }),
  freeze({ ...yardPoint(-3.6, 1.2), what: 'beside the vats, which is how this keeps happening' }),
]);

/**
 * What he has got on him this time, and where. The colours are Brandy's own
 * (src/brandy-boards.js): nothing in Drent has any business being any of them.
 */
export const BOSCO_DYES = freeze([
  freeze({ colour: 0xff3fa4, name: 'hot pink', where: 'down his whole left side' }),
  freeze({ colour: 0x2f7dff, name: 'electric blue', where: 'over one ear and half his face' }),
  freeze({ colour: 0x9be22d, name: 'a green that hums', where: 'on his back end, in a perfect print of the vat he sat against' }),
  freeze({ colour: 0x8e44ec, name: 'violet', where: 'up his chest and under his chin, like a very small bad decision' }),
  freeze({ colour: 0xffe135, name: 'yellow', where: 'on all four feet, which took some doing' }),
  freeze({ colour: 0x1ec8d8, name: 'a blue-green with no name', where: 'along his tail, which he is delighted about' }),
]);

/** How he greets people, which is the same every time and works every time. */
export const BOSCO_GREETS = freeze([
  'Something small comes round the vat at a flat run, ears up, and stops dead at your boots with its whole back end going.',
  'He arrives. There is no other word for it. He sits on your foot, leans his entire weight against your shin — which is not very much weight, and is somehow a great deal of weight — and looks up.',
  'He has brought you a stick. It is not a stick. It is a dyeing paddle and Brandy has been looking for it since Tuesday.',
  'He barks once, at nothing, to establish the general principle, and then immediately forgets about it and comes to be admired.',
  'He is lying on his side in the sun with all four legs pointing the same way, and one eye opens. The tail starts. The rest of him stays exactly where it is.',
]);

/** What making a fuss of him is like. */
export const BOSCO_PETS = freeze([
  'The ears go flat and the eyes shut and one back leg starts going on its own, and he leans until he is more or less standing on you.',
  'He turns over immediately and comprehensively, and presents a round pink belly with a streak of somebody else’s colour on it.',
  'He puts his chin on your knee and sighs like a much larger dog with much larger problems.',
  'He gets the good spot behind the ear and his whole face comes apart. He is not a dignified animal and has never once tried to be.',
  'He follows you three steps when you stop, and sits, and waits, on the clear understanding that there has been a mistake and it will be corrected.',
]);

/**
 * What he wants, in order, every time, from everybody. He has never varied it and he has
 * never once been embarrassed by it.
 */
export const BOSCO_WANTS = freeze(['beef', 'walk', 'pets']);
/** What he means by beef. He asks for beef. He will take any of this and call it beef. */
export const BOSCO_BEEF = 'salt-beef';
export const BOSCO_TAKES = freeze(['salt-beef', 'dried-venison', 'smoked-sausage', 'mutton-pie', 'roast-duck', 'cooked-fish', 'honeycomb']);

/** Being given the actual beef, as opposed to the other things, which he also accepts. */
export const BOSCO_BEEF_GIVEN = freeze([
  'He takes it out of your fingers with enormous care, which is the only careful thing he does, carries it four steps away, puts it down, looks at it, looks at you, and then eats it in one go without chewing.',
  'Gone. He is already looking at your hand again, on the reasonable theory that hands that have had beef in them once may have beef in them again.',
]);
export const BOSCO_FOOD_GIVEN = freeze([
  'It is not beef. He asked for beef. He eats it immediately and completely and at no point raises the discrepancy.',
  'He checks it over, decides it is beef in every way that matters, and it is gone.',
]);
export const BOSCO_NO_FOOD = freeze([
  'He sits down in front of you and stares at the hand that is not holding anything, and waits, because he has all day and you will crack eventually.',
]);

/** Taking him out. This is the best thing that happens to him and he never sees it coming. */
export const BOSCO_WALK_START = freeze([
  'He goes up in the air. All four feet, twice, and a noise you would not think a dog that size could make.',
  'Then he is at the gate before you are, looking back, in case you have changed your mind in the last two steps, which he clearly believes is possible.',
]);
export const BOSCO_WALKING = freeze([
  'He is out in front, then behind, then out in front again. He has covered four times the distance you have and shows no sign of knowing it.',
  'He has stopped to read something on a post and it is taking a very long time, and then he catches you up at a flat sprint as if you were the one who dawdled.',
  'He barks at a gull. The gull does not care. He takes this as a win and trots on with his chest out.',
]);
export const BOSCO_WALK_END = freeze([
  'He comes back through the gate, drinks half a bucket, and lies down in the doorway of the shed with his legs out behind him like a frog, and is asleep before you have turned round.',
  'Brandy looks at him, and then at you. "Well," she says. "You have ruined him. He is going to expect that now, every day, for the rest of his life. Thank you."',
]);

/** The things about him that are true whether or not anybody is looking. */
export const BOSCO_FACTS = freeze([
  'He is convinced he is an enormous dog. He holds the gate against carts, gulls, the wind, and the sea, and he has never lost.',
  'One ear stands up and the other gets halfway and gives up, and it has been like that since he was small enough to fit in a dye pan, which is where she found him.',
  'He cannot get onto the bench in one go and will not be helped. He does it in two, and looks round afterwards to see whether anybody saw the two.',
  'He is frightened of exactly one thing on this coast, and it is the village cat, and the village cat knows it.',
  'He sleeps against the vat that has been used most recently, because it is warm, which is the entire reason he is never his own colour.',
]);

export const BOSCO_VERSION = 1;

export function validateBoscoSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== BOSCO_VERSION) return false;
  if (!Number.isInteger(data.pets) || data.pets < 0 || data.pets > 1e6) return false;
  for (const key of ['fed', 'walks']) {
    if (data[key] === undefined) continue;
    if (!Number.isInteger(data[key]) || data[key] < 0 || data[key] > 1e6) return false;
  }
  return Number.isInteger(data.dye) && data.dye >= 0 && data.dye < BOSCO_DYES.length && typeof data.met === 'boolean';
}

/**
 * Bosco's state and his wandering. `update` moves him between his spots and brings him
 * to the traveler; the host puts the model where this says, the way it does for the
 * village dog (src/village-dog.js).
 */
export function createBosco({ random = Math.random, onEvent = () => {} } = {}) {
  const state = { met: false, pets: 0, fed: 0, walks: 0, walking: false,
    dye: Math.floor(random() * BOSCO_DYES.length) % BOSCO_DYES.length,
    mode: 'patrol', haunt: 0, timer: 2, clock: 0 };
  const point = { x: BOSCO_HAUNTS[0].x, z: BOSCO_HAUNTS[0].z };

  const dyedNow = () => BOSCO_DYES[state.dye];
  /** He has been against another vat. This is what passes for news in the yard. */
  function redye() {
    const next = (state.dye + 1 + Math.floor(random() * (BOSCO_DYES.length - 1))) % BOSCO_DYES.length;
    state.dye = next;
    onEvent({ type: 'bosco-dyed', dye: dyedNow() });
    return dyedNow();
  }
  function meet() {
    const first = !state.met;
    state.met = true;
    return { first, dye: dyedNow() };
  }
  /**
   * Beef. `take` removes it from the satchel and says whether it was there; anything on
   * `BOSCO_TAKES` will do, and he will not mention that it was not beef.
   */
  function feed(id, { take = () => true } = {}) {
    if (!BOSCO_TAKES.includes(id)) return { ok: false, reason: 'He would eat it. He would eat almost anything. But he asked for beef.' };
    if (!take(id)) return { ok: false, reason: 'You have none on you, and he can tell.' };
    state.fed++;
    const beef = id === BOSCO_BEEF;
    onEvent({ type: 'bosco-fed', id, beef, fed: state.fed });
    return { ok: true, beef, fed: state.fed,
      line: (beef ? BOSCO_BEEF_GIVEN : BOSCO_FOOD_GIVEN)[(state.fed - 1) % 2] };
  }

  /** A walk. He comes off his patrol and follows the traveler anywhere at all. */
  function startWalk() {
    if (state.walking) return { ok: false };
    state.walking = true;
    state.mode = 'greet';
    state.walks++;
    onEvent({ type: 'bosco-walk-begun', walks: state.walks });
    return { ok: true, first: state.walks === 1, walks: state.walks };
  }
  /** Home again. He goes back to holding the yard, once he has slept. */
  function endWalk() {
    if (!state.walking) return { ok: false };
    state.walking = false;
    state.mode = 'patrol';
    state.timer = 4;
    onEvent({ type: 'bosco-walk-ended', walks: state.walks });
    return { ok: true, walks: state.walks };
  }

  /** Making a fuss of him. He has never once refused and never will. */
  function pet() {
    state.pets++;
    onEvent({ type: 'bosco-petted', pets: state.pets });
    return { ok: true, pets: state.pets, line: BOSCO_PETS[(state.pets - 1) % BOSCO_PETS.length] };
  }

  /** Where he wants to be, how fast, and whether he is sitting on it. */
  function update(dt, traveler = null) {
    if (!Number.isFinite(dt) || dt <= 0) return { ...point, sitting: state.mode === 'sit', mode: state.mode, speed: 0 };
    state.clock += dt;
    state.timer -= dt;
    // On a walk he follows the traveler wherever they go, and the yard is not a consideration.
    const near = traveler && (state.walking || Math.hypot(traveler.x - point.x, traveler.z - point.z) < 7);
    if (near && state.mode !== 'greet') { state.mode = 'greet'; state.timer = 1e9; }
    if (!near && state.mode === 'greet') { state.mode = 'patrol'; state.timer = 1.5 + random() * 2; }
    if (state.mode === 'patrol' && state.timer <= 0) {
      const next = (state.haunt + 1 + Math.floor(random() * (BOSCO_HAUNTS.length - 1))) % BOSCO_HAUNTS.length;
      state.haunt = next;
      state.mode = random() < .35 ? 'sit' : 'patrol';
      state.timer = 3 + random() * 4;
      // Whichever spot he picks, if it is the vats he comes away a different colour.
      if (BOSCO_HAUNTS[next].what.includes('vats') && random() < .5) redye();
    }
    if (state.mode === 'sit' && state.timer <= 0) { state.mode = 'patrol'; state.timer = 2 + random() * 3; }

    const target = state.mode === 'greet' && traveler
      ? { x: traveler.x, z: traveler.z }
      : BOSCO_HAUNTS[state.haunt];
    const dx = target.x - point.x, dz = target.z - point.z, distance = Math.hypot(dx, dz);
    // He has short legs and no patience, so he is either flat out or stopped.
    const stopAt = state.walking ? 1.6 : state.mode === 'greet' ? .85 : .25;
    const speed = distance > stopAt ? (state.mode === 'greet' ? 2.9 : 1.7) : 0;
    if (speed) {
      const step = Math.min(distance - stopAt, speed * dt);
      point.x += dx / distance * step;
      point.z += dz / distance * step;
    }
    const sitting = !state.walking && (state.mode === 'sit' || (state.mode === 'greet' && speed === 0));
    return { x: point.x, z: point.z, speed, sitting, mode: state.mode,
      facing: distance > .01 ? Math.atan2(dx, dz) : null };
  }

  const snapshot = () => ({ version: BOSCO_VERSION, met: state.met, pets: state.pets, fed: state.fed, walks: state.walks, dye: state.dye });
  function restore(data) {
    state.met = false; state.pets = 0; state.fed = 0; state.walks = 0; state.walking = false;
    if (!validateBoscoSnapshot(data, { allowMissing: false })) return false;
    state.met = data.met; state.pets = data.pets; state.dye = data.dye;
    state.fed = data.fed ?? 0; state.walks = data.walks ?? 0;
    return true;
  }

  return { meet, pet, feed, startWalk, endWalk, redye, update, snapshot, restore,
    get met() { return state.met; }, get pets() { return state.pets; },
    get fed() { return state.fed; }, get walks() { return state.walks; },
    get walking() { return state.walking; },
    get dye() { return dyedNow(); }, get mode() { return state.mode; },
    get position() { return { x: point.x, z: point.z }; } };
}

/**
 * Bosco's conversation, which is one-sided. `act('pet-bosco')` makes a fuss of him in the
 * host. `visits` rotates how he greets people and what is true about him today.
 */
export function boscoConversation(npc, context) {
  const { bosco, openDialogue, closeDialogue, act, visits = 0 } = context;
  if (npc?.id !== BOSCO.id) return false;
  const again = () => boscoConversation(npc, { ...context, visits: visits + 1 });
  const dye = bosco.dye;
  const first = !bosco.met;
  if (first) bosco.meet();
  const opening = first
    ? [BOSCO_GREETS[0],
      `A chihuahua of some sort with a terrier somewhere in him: ears like a fruit bat, a beard he has not earned, and a barrel of a body on four very short legs. He is plump. There is no kind way to put it and he does not want one.`,
      `He is also ${dye.name} ${dye.where}, which is not a colour a dog comes in.`]
    : [BOSCO_GREETS[visits % BOSCO_GREETS.length],
      `Today he is ${dye.name} ${dye.where}.`];
  // He wants three things. He has always wanted the same three things.
  const carrying = BOSCO_TAKES.filter(id => (context.carrying ?? []).includes(id));
  openDialogue(npc, opening, null, 'Back to the yard', { choices: [
    ...(carrying.length ? [{ id: 'feed-bosco', label: carrying.includes(BOSCO_BEEF) ? 'Give him the beef.' : 'Give him something out of your satchel.',
      action: () => { closeDialogue(); act(`feed-bosco-${carrying.includes(BOSCO_BEEF) ? BOSCO_BEEF : carrying[0]}`); } }]
      : [{ id: 'bosco-no-beef', label: 'He is staring at your hand.',
        action: () => openDialogue(npc, [...BOSCO_NO_FOOD], null, 'Back to the yard', { onComplete: again }) }]),
    ...(bosco.walking
      ? [{ id: 'bosco-walk-end', label: 'Take him home.', action: () => { closeDialogue(); act('bosco-walk-end'); } }]
      : [{ id: 'bosco-walk', label: bosco.walks ? 'Take him out again.' : 'Take him for a walk.',
        action: () => { closeDialogue(); act('bosco-walk'); } }]),
    { id: 'pet-bosco', label: bosco.pets ? 'Make a fuss of him again.' : 'Make a fuss of him.',
      action: () => { closeDialogue(); act('pet-bosco'); } },
    { id: 'bosco-about', label: 'Watch him for a minute.',
      action: () => openDialogue(npc, [BOSCO_FACTS[visits % BOSCO_FACTS.length]], null, 'Back to the yard', { onComplete: again }) },
    { id: 'leave-bosco', label: bosco.walking ? 'Walk on.' : 'Leave him to his work.', action: closeDialogue },
  ] });
  return true;
}
