/**
 * **The company is the faculty** (docs/combat-brief.md, phase 7).
 *
 * Friendship with a mercenary is how you learn the weapon they carry, and a mercenary who dies
 * takes the lessons with them. Two things hang off that:
 *
 *   **A lesson** is what a teacher gives at a regard milestone: a lump of experience in his own
 *     family, once each, and a raised sparring ceiling. The first one is also what *shows* you
 *     the weapon - until somebody has, the weapon works and banks nothing (`arms.learn`).
 *   **A bout** is sparring: a practice fight that can kill nobody, which pays up to a ceiling set
 *     by how good a friend the teacher is **and bounded by his own level**, because nobody can
 *     teach past what he knows. A real fight has no ceiling.
 *
 * Every number the user will want to tweak is in `MERCENARY_ARMS` (src/companions.js) or in the
 * two frozen tables below, and the copy is each man's own voice: `MERCENARY_STYLES` already has
 * him explaining his weapon, and these say the same things about how that weapon now behaves.
 *
 * Nothing here knows where anybody is standing, what the traveler is holding or whether a fight
 * is on. It is handed the answers. Pure: no DOM, no three, no world.
 */
import { MERCENARY_ARMS, RUNGS, rungFor } from './companions.js';
import { ARMS, ARMS_IDS, familyOf } from './combat-skills.js';
import { mercenaryById } from './mercenaries.js';

const freeze = Object.freeze;

export const TEACHERS_VERSION = 1;

/**
 * Toughness is taught by nobody - "it is taught by being hit and living" - so it is never a
 * man's craft, however tough he is. Everything else on the grid can be shown to you by somebody.
 */
export const TEACHABLE = freeze(ARMS_IDS.filter(id => id !== 'toughness'));

/**
 * The three rungs above a stranger, in order, and therefore the three lessons. `RUNGS` is
 * `['unfamiliar', 'acquainted', 'friendly', 'fond']`, so a man's rung index *is* the number of
 * lessons he has to give you - which is what makes "a lesson at each friendship milestone" a
 * lookup rather than a rule of its own.
 */
export const LESSON_RUNGS = freeze(RUNGS.slice(1));

/**
 * How high sparring pays, by the number of lessons he has actually given you. Index 0 is a man
 * who has shown you nothing, and he cannot spar at all. The first is `ARMS.ceiling.sparring`,
 * spelled once in src/combat-skills.js with the straw post's, so the user tweaks both together.
 *
 * **Every one of these is then cut down to the teacher's own level.** Mus is 45 and Al the Tun
 * is 20, and neither can take you past himself, so the top figure here is headroom for the
 * teachers the wider world will have later - a side's drill sergeant, a hunter in Rena - and not
 * a promise anybody in this company can keep.
 */
export const SPARRING_CEILINGS = freeze([0, ARMS.ceiling.sparring, 35, 60]);

/**
 * What a lesson is worth, before the teacher's own standing is taken into account: the first is
 * the smallest, because the first lesson's real gift is that the skill begins at all, and the
 * third is the one that is worth walking a road for. Scaled by his level against `LESSON_LEVEL`,
 * so Mus at 45 teaches half again what a man of thirty does and Al the Tun teaches two thirds.
 *
 * Three lessons alone from a man of thirty are 2,100 experience, which is level 13. That is a
 * beginning and nothing more: the rest is use, and sparring, and being hit.
 */
export const LESSON_XP = freeze([140, 460, 1500]);
export const LESSON_LEVEL = 30;

/**
 * What a man teaches, worked out from what he is rather than written down twice: **the thing he
 * is best at**, out of the weapon he carries and the shield he carries it with. That is one rule
 * and it gets Kristen right without an exception - her blade is 25 and her shield is 35, so the
 * shield is her craft, which is what "I take the first blow on the boards" says about her.
 * Toughness is excluded because nobody teaches it.
 */
export function teachesOf(id) {
  const arms = MERCENARY_ARMS[id];
  if (!arms) return null;
  const best = [{ family: arms.weapon, level: arms.level }, ...(Number.isFinite(arms.shield) ? [{ family: 'shield', level: arms.shield }] : [])]
    .filter(entry => TEACHABLE.includes(entry.family))
    .sort((a, b) => b.level - a.level)[0];
  return best ? freeze({ family: best.family, level: best.level }) : null;
}

/**
 * The lessons themselves, in each man's own voice. `MERCENARY_STYLES` is the specification: it
 * already has him explaining his weapon, phase 5 took the tempo and the arc straight out of it,
 * and these say what those numbers now do in his hands.
 *
 * Three lessons each, one for each rung above a stranger, and one bout he will stand for.
 *
 * **`lends` is his spare, for the length of the bout.** Without it the only way to spar with a
 * spear would be for a spearman to die first - nobody who carries a pole will trade one, so the
 * traveler's hand reaches a polearm only off the ground where its owner fell, and the dead teach
 * nothing. That is perverse, so a teacher hands you his second one and takes it back at the
 * yield. Matt's spare pike and Mus's short spear are already in the fiction; the rest are the
 * plain equivalent, and none of them is a named weapon. `wrong` is what the one man with nothing
 * spare says instead: Jerry, until bows exist at all.
 */
const teaching = (offer, ...lines) => freeze({ offer, lines: freeze(lines) });
const loan = (what, hand, back) => freeze({ ...what, hand, back });
export const TEACHING = freeze({
  'merc-gotwood': freeze({
    lessons: freeze([
      teaching('Show me the sword properly.',
        'We carry the same blade, so this is worth something. Three cuts, and they run into each other: the second is heavier than the first and the third is heavier than both.',
        'Do not spend everything on the third. Keep enough wind back for one step aside, because the step aside is the only thing that makes a blow miss.'),
      teaching('What am I still doing wrong?',
        'You go when he goes. Do not. The amber is him telling you where he is about to be, and it is the same length every time — his kind does not get faster because the country is harder.',
        'Let it land on nothing, then cut. A man getting over a swing is a man who is not holding anything up.'),
      teaching('Is there anything left to teach me?',
        'Not much. The window for the second cut closes in under a second, so if you are thinking about it you have lost it; that is all thumbs and no teaching.',
        'The rest is only that you hit harder every year and the timing never changes. I have watched four men die waiting for the timing to get easier.'),
    ]),
    spar: freeze({ offer: 'Stand up and go a few with me.',
      wrong: 'With that? Put a sword in your hand and I will show you something. I cannot teach you mine with something else in the way.',
      done: 'Good. Do that when it is not me in front of you and I will be very pleased with both of us.' }),
    lends: loan({ weapon: 'simple-sword' },
      'Take my spare. Same blade, same weight, blunted at the point — I am not sending you to a war with a hole in you.',
      'Give it back. You will have one of your own soon enough and you will want to have handled this one first.'),
  }),
  'merc-word': freeze({
    lessons: freeze([
      teaching('Teach me the dagger.',
        'A dagger! Everyone is disappointed, and then everyone is surprised, and I find the whole sequence delightful. It is short and it is quick — nearly half again the speed of your sword and about two thirds the reach.',
        'So you do not fight at your distance. You fight at theirs, and then you take one more step than they were expecting.'),
      teaching('How do I get inside a long weapon?',
        'A wide weapon has a hole in it and the hole is at the hilt. Everything that makes a greatsword frightening happens a long way from the man holding it.',
        'Go in on the recovery, not on the swing. On the swing you are being helpful.'),
      teaching('Anything else, Ed?',
        'Yes: never be where the fight is. People call that cowardice. People are usually dead, and I am usually having a drink.',
        'A narrow blade wants one thing at a time. If there are two of them, that is not a dagger problem, that is a leaving problem.'),
    ]),
    spar: freeze({ offer: 'Show me, then. Slowly.',
      wrong: 'Not with that. Come back with an edge you can actually get close with and I shall be insufferable about it.',
      done: 'There! You see? You were inside, and inside is a completely different conversation.' }),
    lends: loan({ weapon: 'long-dagger' },
      'Here. No, keep the big one on your back, you cannot learn this holding that. A man should own two knives and lend one out, it makes him look generous.',
      'Mine, thank you. I am generous, not careless. There is a difference and I have spent years establishing it.'),
  }),
  'merc-jerry': freeze({
    lessons: freeze([
      teaching('Teach me the bow.',
        'Thirty paces, one arrow, and then I do not have to think about it any more. That is the entire appeal and I will not pretend it is anything deeper.',
        'It is all the draw. Hold it, let it settle, loose. A rushed draw is an arrow in the ground and an arrow you do not have.'),
      teaching('What shortens the draw?',
        'Practice, and nothing else. You will feel it come down as you go — it is a long slow bargain, and at the end of it you are drawing in half the time you started with.',
        'Do not wait for the perfect one. A settled draw and a fair line beats a beautiful one you never loosed.'),
      teaching('And in a wood?',
        'In woodland I am a man holding a stick. Every trunk between you and it is a trunk your arrow finds first, and it does not go through.',
        'So know where the open ground is before it matters. That is not archery. That is just not being an idiot in a forest.'),
    ]),
    spar: freeze({ offer: 'Put me through it.',
      wrong: 'With what? I have one bow. One. I am not handing my one bow to a man who has never drawn one, and you cannot learn this on a borrowed stick. Find yourself a bow and I will make you worth something at thirty paces.',
      done: 'Well. You are not going to do that to me twice.' }),
  }),
  'merc-christin': freeze({
    lessons: freeze([
      teaching('Teach me the shield.',
        'Hold it. That is the whole verb — you hold it up, and while it is up it takes the greater part of anything that comes at your front. It is not a parry and there is no answer to it. It is a share.',
        'And only your front: about sixty degrees of it, the same as any legionary gets. Anything from the side arrives exactly as if you had no boards at all.'),
      teaching('What does holding it cost?',
        'Wind. Every blow it catches costs you, and when you have none left the boards are simply not up, whatever you are doing with your arm.',
        'So it is not a wall to stand behind. It is something you spend, the same as a swing or a step aside.'),
      teaching('Why hold it instead of stepping aside?',
        'Because a caught blow does not rock you. That is the whole of it. He hits the boards, nothing moves, and it is still up for the next one — which is how I stand in front of somebody who needs it.',
        'And against a shield: feint high, cut low. I am telling you how to beat me because you are more use to me knowing it.'),
    ]),
    spar: freeze({ offer: 'Come at me. I will keep it up.',
      wrong: 'Get something on that arm first. I cannot teach you the boards when you are not carrying any.',
      done: 'Better. You stopped flinching, which is most of it.' }),
    lends: loan({ shield: true },
      'Strap this on. It is the one I learned on and it is too small for me now. Arm through, hand on the grip, and do not hide behind it.',
      'Off it comes. Buy yourself one — you will want it on your arm and not in a pack when it matters.'),
  }),
  'merc-ciaran': freeze({
    lessons: freeze([
      teaching('Teach me the spear.',
        'Two paces of ash between you and the thing trying to kill you. Thrust, recover, thrust. I have never once wanted to be nearer and neither will you.',
        'But it is a point, not an edge — it goes almost straight ahead and nowhere either side. Face what you are killing or you are holding a pole.'),
      teaching('What happens when they get past it?',
        'Then you have the wrong weapon for the next second and a half, so do not let it happen. Give ground along the line of the shaft, not across it.',
        'Two men in front of you is two men too many. A spear answers one thing at a time, properly.'),
      teaching('You said never back.',
        'If a spearman gets his point on you, go left or right. Never back — back is exactly where he is sending you, and he has more of the road in front of him than you have behind you.',
        'That is worth more to you than anything I can teach you about holding it.'),
    ]),
    spar: freeze({ offer: 'Take the guard up. Thrust when I say.',
      wrong: 'Not with that in your hands. Find something with two paces of wood on it and we will do this properly.',
      done: 'Thrust, recover, thrust. You have it. Now do it when you are tired.' }),
    lends: loan({ weapon: 'ash-spear' },
      'Take the practice shaft. Same ash, same two paces, and a button on the point instead of a head. Hands where mine are.',
      'Shaft back. I carry two so that I never have to learn this again with one.'),
  }),
  'merc-lakota': freeze({
    lessons: freeze([
      teaching('Teach me the staff.',
        'A staff. Go on, laugh, everyone does. It has two ends and it strikes twice as often as your sword — that is not a manner of speaking, it is the plain arithmetic of it.',
        'Each blow is worth less. You are trading weight for tempo, and tempo wins more fights than weight does.'),
      teaching('Where do I put it?',
        'It will not cut, so there is no point pretending. Hands and knees. A man who cannot hold his weapon has lost, and he gets to walk home about it.',
        'That is the other thing a staff is for: it lets you win without anybody being buried afterwards.'),
      teaching('Is that all of it?',
        'Nearly. It does not go dull, it does not chip, and no watchman has ever once asked me to leave it at a gate. I have walked into places with this that I could not have walked into with a knife.',
        'And it was a stick, before it was a staff. Whatever you have picked up off a road is already most of the way there.'),
    ]),
    spar: freeze({ offer: 'All right. Both ends. Try.',
      wrong: 'Not with that. Pick up a stick — a real one, off the road — and come back. You will feel it at once.',
      done: 'Twice as often. You felt it. Everybody feels it and nobody believes it until they do.' }),
    lends: loan({ weapon: 'quarterstaff' },
      'Use the spare. Not mine — mine has never let me down and I am not starting today — but the same length, and it will not cut you either.',
      'Back to me. You can cut a stave off any coppice in Drent, which is the other thing I like about it.'),
  }),
  'merc-eliana': freeze({
    lessons: freeze([
      teaching('Teach me the greatsword.',
        'Two hands, one edge, and everything within a cart’s width of me. It reaches wider than anything else you will hold, and it is slow to start, and both of those are the same fact.',
        'Do not chase with it. Stand where the width is worth something and let them come into it.'),
      teaching('What about the third swing?',
        'It cannot be stopped once it is going. That is a thing to know about it and also about me — you cannot step aside out of that one at any point in it, so start it only when you have decided.',
        'The first two you can abandon after they land. The third you own.'),
      teaching('And against one?',
        'Get inside the arc or stay well outside it. The middle is where people die and they always choose the middle.',
        'Inside, it is a heavy stick and you are close enough to be a nuisance. Outside, it is a lot of work going nowhere. Do not stand in between deciding.'),
    ]),
    spar: freeze({ offer: 'Come on. Mind the width.',
      wrong: 'Not with that. Bring some weight and I will show you what the weight is for.',
      done: 'Slow to start, impossible to stop. You are beginning to swing it instead of carrying it.' }),
    lends: loan({ weapon: 'greatsword' },
      'Take the blunt one. Same length, same weight, no edge on it — the weight is the lesson and the edge is only the last half-inch of it.',
      'Hand it over. Your back will thank me and your arms will not, and that is the correct order.'),
  }),
  'merc-matt': freeze({
    lessons: freeze([
      teaching('Teach me the pike.',
        'The phalanx is four hundred years old and has never once been improved upon. Nothing reaches you before you reach it — this is the longest thing anybody in this company carries, by some way.',
        'And it is a point. Almost nothing either side of the line of it, so you hold a line with it and you do not dance.'),
      teaching('What is the catch?',
        'Room. In a doorway I am furniture, and I mean that literally: within two paces of a wall it will not go at all, and you will feel it refuse.',
        'So know what is behind you and beside you before the fighting starts. A pike in a lane is a very long walking stick.'),
      teaching('And against a wall of them?',
        'Go round it. The front of it is a hedge of points and the men behind are not tired yet.',
        'Nobody has ever walked into the front of one and been glad. Nobody sensible has ever tried twice.'),
    ]),
    spar: freeze({ offer: 'Form up. Point at me.',
      wrong: 'Not with that — you would have to get past the point first and that is rather the argument against it. Find a pole.',
      done: 'That is the line. Hold that when there are four hundred people shouting and you are a soldier.' }),
    lends: loan({ weapon: 'war-pike' },
      'My spare. Every man in a phalanx carries a spare, because the first thing a phalanx does is break pikes. Feel how much of it is behind your hands.',
      'And I will have it back. A prince with one pike is a man with a long stick; a prince with two is still a phalanx.'),
  }),
  'merc-altun': freeze({
    lessons: freeze([
      teaching('Teach me the mace.',
        'The mace is for when the other thing has not worked. It does not cut, it breaks, and what it is really for is a man wearing something your edge will not go through.',
        'Hold it lower than you think. It wants to fall, and most of the work is letting it.'),
      teaching('What is the cost of it?',
        'Time. It comes up slowly and it comes down slowly, and in between you are a man holding a weight above his head with his ribs showing.',
        'So do not start one you have not decided on. There is no second blow in me and there will not be one in you either.'),
      teaching('And if somebody swings one at me?',
        'Do not block it. Be elsewhere. It comes down slower than a sword, which gives you the time, and it does not stop, which means the time is all you get.',
        'I would rather it never came to the mace at all. It comes to the mace less with two of us, which is why I am here.'),
    ]),
    spar: freeze({ offer: 'If we must. Gently.',
      wrong: 'Not with that. Bring something that breaks things and I will explain why I dislike it.',
      done: 'There. Now please put it down and let us go and find something to eat.' }),
    lends: loan({ weapon: 'iron-mace' },
      'There is a second one in the roll. I have never once been glad of that and today I suppose I am. Hold it low. Let it fall.',
      'Back in the roll with it, and we will both hope it stays there.'),
  }),
  'merc-mus': freeze({
    lessons: freeze([
      teaching('Show me.',
        'Hold it here. Not there.',
        'Two paces of reach and nothing wide. Point it and step. That is all of it.'),
      teaching('Show me the other one.',
        'A medium one for standing. A short one that leaves the hand.',
        'The first thing most people learn about a fight with me is that there is a spear in their leg. Learn it now and save yourself the leg.'),
      teaching('What else.',
        'Count a man’s spears before you close. He will not come near you until the short one has gone.',
        'You have been counting mine. Good.'),
    ]),
    spar: freeze({ offer: 'Now.',
      wrong: 'Wrong thing in your hands. Come back with a shaft.',
      done: 'Better. Not good. Better.' }),
    lends: loan({ weapon: 'ash-spear' },
      'The medium one. Not the short one.',
      'Mine.'),
  }),
});

/** Everyone in the company who teaches anything, with what they teach and how far they know it. */
export const TEACHERS = freeze(Object.fromEntries(Object.keys(TEACHING).map(id => {
  const craft = teachesOf(id);
  return [id, freeze({ id, name: mercenaryById(id)?.name ?? id, ...craft, ...TEACHING[id] })];
})));
export const TEACHER_IDS = freeze(Object.keys(TEACHERS));
/** Who teaches a given family, best first. Blades has two, polearms three, Toughness nobody. */
export const teachersOf = family => TEACHER_IDS.filter(id => TEACHERS[id].family === family)
  .sort((a, b) => TEACHERS[b].level - TEACHERS[a].level);

/**
 * How high a bout with this man pays, given the lessons he has actually given you: the rung's
 * ceiling, **cut down to his own level**, because nobody can teach past what he knows.
 */
export function sparringCeiling(given, level) {
  const lessons = Math.max(0, Math.min(SPARRING_CEILINGS.length - 1, Math.floor(Number(given) || 0)));
  return Math.max(0, Math.min(SPARRING_CEILINGS[lessons], Math.floor(Number(level) || 0)));
}

/** What a lesson pays in his family: the lesson's own worth, weighted by how good he is. */
export const lessonXp = (index, level) =>
  Math.round((LESSON_XP[index] ?? 0) * Math.max(1, Math.floor(Number(level) || 1)) / LESSON_LEVEL);

/**
 * Whether a man can spar in his own craft with what the traveler has on him. A weapon teacher
 * needs the traveler holding something of his family - you cannot be taught the pike while
 * carrying a sword - and the shield's teacher needs a shield on the arm, because the shield is
 * not a weapon and is worn rather than held (`gear.js`: the hand slot IS the shield).
 */
export function handsFor(family, { weapon = null, shield = false } = {}) {
  if (family === 'shield') return !!shield;
  if (!TEACHABLE.includes(family)) return false;
  return familyOf(weapon) === family;
}

/**
 * What he puts in your hands when they are wrong for his craft, or null for a man with nothing
 * spare - which today is Jerry alone, because the game has no bow at all yet.
 *
 * **A loan is not a gift.** It exists for the length of the bout and nowhere else: it never
 * enters the satchel, it cannot be kept, sold or dropped, nothing about it is written down, and
 * the traveler's own weapon is back in his hand the moment the bout ends, however it ends.
 */
export const lendOf = id => TEACHERS[id]?.lends ?? null;
/** Whether what he lends is a thing he could actually be teaching: his own craft, in his own hands. */
export const lendFits = id => {
  const lent = lendOf(id);
  if (!lent) return false;
  return handsFor(TEACHERS[id].family, { weapon: lent.weapon ?? null, shield: !!lent.shield });
};

export function validateTeachersSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== TEACHERS_VERSION) return false;
  if (!data.lessons || typeof data.lessons !== 'object' || Array.isArray(data.lessons)) return false;
  for (const [id, given] of Object.entries(data.lessons)) {
    if (!TEACHER_IDS.includes(id)) return false;
    if (!Number.isInteger(given) || given < 0 || given > LESSON_RUNGS.length) return false;
  }
  return true;
}

/**
 * @param companions `createCompanions()` - who walks with you, who is gone, and how well each
 *   knows you. The rungs are read from it and never kept here.
 * @param arms `createCombatSkills()` - where a lesson's experience is banked and where the
 *   sparring ceiling is enforced.
 */
export function createTeachers({ companions = null, arms = null, onEvent = () => {} } = {}) {
  const state = { lessons: {} };

  const teacher = id => TEACHERS[id] ?? null;
  const given = id => state.lessons[id] ?? 0;
  const dead = id => !!companions?.view?.().find(entry => entry.id === id)?.dead;
  /**
   * **The dead teach nothing, and a man sent on ahead teaches nothing until he is back.** Both
   * fall out of one question - is he here, walking with you - which `companions` already answers
   * and which is false for anybody who has died.
   */
  const present = id => !!teacher(id) && !dead(id) && !!companions?.walksWith?.(id);
  const rungOf = id => companions?.rung?.(id) ?? rungFor(0);
  /** How many lessons he has reached the standing to give: his rung is the count. */
  const earned = id => RUNGS.indexOf(rungOf(id));

  /** The lesson he owes you now, or null: he must be here, and his standing must be ahead of what he has taught. */
  function owed(id) {
    if (!present(id)) return null;
    const index = given(id);
    if (index >= LESSON_RUNGS.length || index >= earned(id)) return null;
    const { family, level, lessons } = teacher(id);
    return freeze({ id, index, rung: LESSON_RUNGS[index], family, ...lessons[index],
      xp: lessonXp(index, level), ceiling: sparringCeiling(index + 1, level) });
  }

  /**
   * He gives it. The first one is also the one that *shows* you the weapon: `arms.learn` is what
   * makes the family bankable at all, and before it the weapon works and teaches nothing.
   * A lesson has no ceiling - it is not practice, it is a man telling you something.
   */
  function teach(id) {
    const lesson = owed(id);
    if (!lesson) return { ok: false };
    state.lessons[id] = lesson.index + 1;
    const learned = arms?.learn?.(lesson.family) ?? { first: false };
    const paid = arms?.pay?.(lesson.family, lesson.xp, 'lesson') ?? { xp: 0 };
    onEvent({ type: 'lesson', id, family: lesson.family, index: lesson.index, rung: lesson.rung,
      first: !!learned.first, xp: paid.xp ?? 0, ceiling: lesson.ceiling });
    return { ok: true, ...lesson, first: !!learned.first, xp: paid.xp ?? 0, level: paid.level ?? 1 };
  }

  /**
   * May he stand up with you, and what would it be worth? He must be here, and he must have shown
   * you his craft at least once - a man does not spar you in something he has never explained.
   *
   * The traveler needs the right thing in his hands, and **if he has not got it the teacher lends
   * his spare**, because otherwise the only way to spar with a spear would be for a spearman to
   * die first. `loan` is what is put in his hand for the bout and taken back at the yield; a man
   * with nothing spare says so in his own words instead. `ceiling` is what the bout pays up to;
   * **a real fight has no ceiling and this is not a real fight.**
   */
  function bout(id, hands = {}) {
    if (!present(id)) return { ok: false, reason: 'away' };
    const { family, level, spar } = teacher(id);
    if (!given(id)) return { ok: false, reason: 'untaught' };
    const own = handsFor(family, hands);
    const lent = own ? null : lendOf(id);
    if (!own && !lent) return { ok: false, reason: 'hands', line: spar.wrong, family };
    return { ok: true, id, family, ceiling: sparringCeiling(given(id), level), offer: spar.offer, done: spar.done, loan: lent };
  }

  /** What a bout with this man pays up to today, or 0 for a man who will not stand up with you. */
  const ceilingFor = id => (present(id) && given(id) ? sparringCeiling(given(id), teacher(id).level) : 0);

  const view = () => TEACHER_IDS.map(id => ({ id, name: TEACHERS[id].name, family: TEACHERS[id].family,
    level: TEACHERS[id].level, given: given(id), earned: earned(id), here: present(id),
    owed: !!owed(id), ceiling: ceilingFor(id), lends: lendOf(id)?.weapon ?? (lendOf(id)?.shield ? 'shield' : null) }));

  function snapshot() { return { version: TEACHERS_VERSION, lessons: { ...state.lessons } }; }

  function restore(data) {
    state.lessons = {};
    if (!validateTeachersSnapshot(data, { allowMissing: false })) return false;
    state.lessons = { ...data.lessons };
    return true;
  }

  return { owed, teach, bout, ceilingFor, view, snapshot, restore,
    given, teaches: id => teacher(id)?.family ?? null,
    get lessons() { return { ...state.lessons }; } };
}
