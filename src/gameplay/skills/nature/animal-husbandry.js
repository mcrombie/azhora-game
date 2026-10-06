/** Caring for domestic animals, separate from observing wild birds or casting animal spells. */
export const HUSBANDRY_SKILL = 'husbandry';
export const HUSBANDRY_REACH = 4.2;
export const HUSBANDRY_COOLDOWN = 30;
export const JEAN_SHEEP = Object.freeze({ x: -55, z: 36 });
export const LIVESTOCK = Object.freeze({ sheep: 'sheep', horse: 'horse', goat: 'goat', chicken: 'chicken',
  cow: 'cow', longhorn: 'longhorn', 'hill-sheep': 'hill sheep', 'nethrani-cattle': 'cow' });
export const HUSBANDRY_LESSON = Object.freeze([
  'Animal Husbandry is caring for the animals that live alongside us: sheep, cattle and horses. Birding is how we observe wild birds. Neither is the same as commanding an animal with magic.',
  'Approach quietly and use F beside livestock to check and calm it. Jean keeps two tame sheep beside the road for practice. Give an animal time between visits; repeated care earns experience, repeated clicking does not.',
  'As you improve, your handling keeps animals calm for longer. Watch the ears and the feet before reaching out. An animal tells you when it is uneasy, provided you are listening with more than your ears.',
]);

const finitePoint = p => Number.isFinite(p?.x) && Number.isFinite(p?.z);
const alive = animal => animal && animal.alive !== false && animal.dead !== true && !(Number.isFinite(animal.hp) && animal.hp <= 0);
const validAnimal = animal => alive(animal) && typeof animal.id === 'string' && animal.id.length > 0
  && Object.hasOwn(LIVESTOCK, animal.species) && finitePoint(animal);

export function validateHusbandrySnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  return !!data && data.version === 1 && typeof data.taught === 'boolean'
    && !!data.cared && typeof data.cared === 'object' && !Array.isArray(data.cared)
    && Object.entries(data.cared).every(([id, at]) => id.length > 0 && id.length < 160 && Number.isFinite(at) && at >= 0);
}

export function createAnimalHusbandry({ skills } = {}) {
  let state = { version: 1, taught: false, cared: {} };
  const taught = () => state.taught || !!skills?.taught?.(HUSBANDRY_SKILL);
  function learn() {
    state.taught = true;
    return skills?.learn?.(HUSBANDRY_SKILL) ?? { ok: true, first: true };
  }
  function nearby(position, animals = []) {
    if (!finitePoint(position)) return null;
    let nearest = null, distance = HUSBANDRY_REACH;
    for (const animal of animals) {
      if (!validAnimal(animal)) continue;
      const d = Math.hypot(position.x - animal.x, position.z - animal.z);
      if (d <= distance) { nearest = animal; distance = d; }
    }
    return nearest ? { ...nearest, name: nearest.name || LIVESTOCK[nearest.species], distance } : null;
  }
  function care(animal, position, now) {

    if (!validAnimal(animal) || !finitePoint(position) || !Number.isFinite(now) || now < 0)
      return { ok: false, reason: 'There is no living farm animal to tend here.' };
    if (Math.hypot(position.x - animal.x, position.z - animal.z) > HUSBANDRY_REACH)
      return { ok: false, reason: 'Come closer to check the animal.' };
    const previous = state.cared[animal.id];
    if (previous !== undefined && now - previous < HUSBANDRY_COOLDOWN)
      return { ok: false, reason: 'This animal has been tended recently. Give it a little time.' };
    state.cared[animal.id] = now;
    const gain = skills?.gain?.(HUSBANDRY_SKILL, 10) ?? {};
    const level = skills?.level?.(HUSBANDRY_SKILL) ?? 1;
    return { ...gain, ok: true, id: animal.id, xp: 10, calmSeconds: 8 + Math.min(20, level - 1) * 2,
      message: `You check the ${LIVESTOCK[animal.species]} and settle it with a quiet voice.` };
  }
  const snapshot = () => ({ ...state, taught: taught(), cared: { ...state.cared } });
  function restore(data) {
    if (!validateHusbandrySnapshot(data)) return false;
    state = data ? { version: 1, taught: data.taught, cared: { ...data.cared } } : { version: 1, taught: false, cared: {} };
    return true;
  }
  return { learn, nearby, care, snapshot, restore, get taught() { return taught(); } };
}
