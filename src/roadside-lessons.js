import { ROCK_SPECIES, SPECIMEN_ITEM } from './geology.js';

/** Optional teachers share the same skill models; their small errands remain personal. */
export const ROADSIDE_LESSONS_VERSION = 1;
export const SANDWICH_ITEM = 'jojo-sandwich';
const GEOLOGY_TEACHERS = ['instructor', 'doomsayer'];
export function validateRoadsideLessons(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  return !!data && typeof data === 'object' && !Array.isArray(data) && data.version === 1 && typeof data.foodGiven === 'boolean'
    && !!data.geology && typeof data.geology === 'object' && !Array.isArray(data.geology)
    && Object.entries(data.geology).every(([id, value]) => GEOLOGY_TEACHERS.includes(id)
      && value && typeof value === 'object' && !Array.isArray(value) && Number.isInteger(value.target) && value.target > 0 && value.target <= 1e8 && typeof value.done === 'boolean');
}
export function createRoadsideLessons({ inventory, cooking, geology, skills } = {}) {
  let foodGiven = false, errands = {};
  // Clay beds and sandstone ledges are observations, not specimens that can be
  // brought to a teacher. Require a new portable find and a stone still carried.
  const specimens = () => Object.entries(geology?.found ?? {}).reduce((sum, [id, n]) => sum + (ROCK_SPECIES[id]?.keep ? n : 0), 0);
  const canReport = errand => specimens() >= errand.target && !!inventory?.has?.(SPECIMEN_ITEM);
  function welcome() {
    if (foodGiven) return { ok: true, first: false };
    if (!inventory.add(SANDWICH_ITEM, 1)) return { ok: false };
    foodGiven = true;
    return { ok: true, first: true };
  }
  function cook() {
    const first = !cooking.knows('cooked-fish');
    const result = cooking.learn('cooked-fish');
    if (!result.ok) return result;
    if (first) {
      inventory.grant('tinderbox');
      inventory.add('forest-stick', 2);
      inventory.add('raw-fish', 1);
    }
    return { ...result, supplies: first };
  }
  function startGeology(id) {
    if (!GEOLOGY_TEACHERS.includes(id)) return { ok: false };
    geology.meet();
    if (!errands[id]) errands[id] = { target: specimens() + 1, done: false };
    return { ok: true };
  }
  function reportGeology(id) {
    const errand = errands[id];
    if (!errand || errand.done || !canReport(errand)) return { ok: false };
    errand.done = true;
    const gained = skills.gain('geology', 24);
    return { ok: true, xp: gained?.ok ? 24 : 0 };
  }
  const geologyState = id => !errands[id] ? 'offered' : errands[id].done ? 'complete' : canReport(errands[id]) ? 'report' : 'search';
  function snapshot() { return { version: 1, foodGiven, geology: structuredClone(errands) }; }
  function restore(data) {
    foodGiven = false; errands = {};
    if (!validateRoadsideLessons(data, { allowMissing: false })) return false;
    foodGiven = data.foodGiven; errands = structuredClone(data.geology); return true;
  }
  return { welcome, cook, startGeology, reportGeology, geologyState, snapshot, restore };
}

export function jojoCookingChoice(npc, { lessons, cooking, openDialogue, onChange, back, fireMaking, leadToLeeAnne }) {
  return { id: 'jojo-cooking', label: cooking.met ? 'Show me your road cooking.' : 'Teach me Cooking · optional lesson', action: () => {
    if (fireMaking && !fireMaking.ready) {
      openDialogue(npc, ['We need a cooking fire first, and there is no fire ready here. Lee Anne teaches Fire Making. I will walk you to her; keep close and I will wait if you fall behind.',
        'Light your first fire with her, then speak to me for the cooking lesson. She teaches the fire itself; I teach the food.'], null, 'Follow Jojo to Lee Anne', { noWayfinding: true, onComplete: leadToLeeAnne });
      return;
    }
    openDialogue(npc, [
      'A few moves to keep you nourished on the road. The sandwich is yours already; open your satchel with I and eat it whenever you need health.',
      'Start with one fish. I will give you a tinderbox, two dry sticks, and a fish. At the village fire ring, press F, light the fire, and choose Cook one raw fish. A cooked fish restores more health than most food you can pick off a bush.',
      'Cook what you gather and try new recipes with people you meet. Stanley at the Avrel farm can show you a field supper too. Practice counts whoever first showed you how.',
    ], null, 'Take the cooking lesson', { onComplete: () => { lessons.cook(); onChange(); back?.(); } });
  } };
}

export function geologyFieldChoice(npc, { lessons, geology, openDialogue, onChange, back }) {
  const officer = npc.id === 'instructor', state = lessons.geologyState(npc.id);
  const label = state === 'offered' ? 'Geology · a stone for your teacher' : state === 'report' ? 'Show the stone I collected.' : state === 'complete' ? 'Remind me how to read stones.' : 'About my geology field lesson…';
  return { id: 'geology-field-lesson', label, action: () => {
    if (state === 'report') {
      const result = lessons.reportGeology(npc.id); onChange();
      return openDialogue(npc, [officer
        ? 'Good. Now describe its grain, not just its colour. At school they made us compare a tray of specimens before we were allowed to name a single one. You have made a proper start.'
        : 'There: the land gave you the answer. No classroom, no polished cabinet. Keep looking at where it lay as well as what it is. That is how the country teaches you.', `${result.xp ?? 0} Geology experience. Keep gathering stones along the road to improve.`], null, 'Back to our conversation', { onComplete: back });
    }
    const introduction = officer
      ? 'I studied geology at school, and did rather well. Fieldwork keeps an officer from building his wall on mud. Your exercise: collect one stone from a stream bank, field, or road cutting and bring it back for inspection.'
      : 'School? The land itself taught me. Watch where the rain exposes a bank, or the plough turns up something older than the farmer. Bring me one freshly gathered stone and we will read its story together.';
    openDialogue(npc, [introduction,
      'Walk close to a small collectible stone and press F to examine and gather it. Bring a quartz cobble, ironstone, fossil, or another stone small enough to keep in your satchel. Clay beds and stone ledges stay where they are. Reporting this exercise is optional.',
      state === 'search' ? 'Find a new specimen since we last spoke. I will be here when you return.' : 'If another teacher has already introduced Geology, your knowledge and experience carry over. This is another field exercise, not a fresh start.'
    ], null, state === 'offered' ? 'Start the field lesson' : 'Back to the road', { onComplete: () => {
      if (state === 'offered') lessons.startGeology(npc.id);
      onChange();
    } });
  } };
}
