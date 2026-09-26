import { bodyWorld, stepToward } from './bodies.js';
import { moveCharacter } from './game-state.js';
import { KAYLA_RACE } from './kayla-race.js';

/** Ordinary movement and bodies, with the traveler sitting on the same Kayla actor. */
export function createKaylaRaceHost({ quest, world, bodies = () => [], readKayla = null, placeKayla = () => {}, placeEd = () => {},
  onMount = () => {}, onDismount = () => {}, poof = () => {}, save = () => {},
  openDialogue = () => {}, closeDialogue = () => {}, reward = () => {}, focus = () => {}, toast = () => {} }) {
  const nav = bodyWorld(world);
  let wasMounted = false, previousStage = quest.state().stage, appeared = false;
  function navigation(position, radius, id) {
    const other = id === 'kayla' ? quest.edPosition : quest.position;
    const list = bodies().filter(body => !['kayla', 'ed', 'player', 'traveler'].includes(body.id));
    if (quest.state().edVisible) list.push({ id: id === 'kayla' ? 'ed' : 'kayla',
      x: other.x, z: other.z, r: id === 'kayla' ? KAYLA_RACE.edRadius : KAYLA_RACE.radius });
    return nav.setBodies(list).moving(position, radius, id);
  }
  function sync() {
    const s = quest.state();
    if (s.edVisible && !appeared) { poof({ ...s.ed, type: 'arrive' }); appeared = true; }
    if (!s.edVisible && appeared) { poof({ ...s.ed, type: 'leave' }); appeared = false; }
    if (s.stage !== 'complete') placeKayla({ x: s.kayla.x, z: s.kayla.z, yaw: s.kayla.yaw, speed: s.kayla.speed });
    placeEd({ x: s.ed.x, z: s.ed.z, yaw: s.ed.yaw, speed: s.ed.speed, visible: s.edVisible });
    if (s.mounted && !wasMounted) onMount({ ...s.kayla });
    if (!s.mounted && wasMounted) onDismount({ ...s.kayla });
    if (previousStage !== s.stage) {
      previousStage = s.stage; save();
      if (s.stage === 'won') toast('You beat Ed! Speak to Kayla for your share of the honey.', 'THE HONEY RACE');
      if (s.stage === 'lost') toast(`${s.reason} Speak to Kayla to try again.`, 'THE HONEY RACE');
      if (s.stage === 'racing') toast('Go! Hold Shift to run. Follow the road east to the crossroads.', 'THE HONEY RACE');
    }
    wasMounted = s.mounted; return s;
  }
  function tick(dt, { playing = true, input = {} } = {}) {
    // Outside a mounted race the persistent NPC owns her feet. In particular,
    // surviving a fight must not snap her back to a stale race coordinate.
    // Explicit sync/restore still places the saved runner before ticking again.
    if (playing && readKayla) quest.rememberKayla(readKayla());
    quest.tick(dt, { playing, input,
      moveKayla: (position, dx, dz) => moveCharacter(position, dx, dz, navigation(position, KAYLA_RACE.radius, 'kayla'), KAYLA_RACE.radius),
      returnKayla: (position, target, maximum) => stepToward(position, target, maximum, navigation(position, KAYLA_RACE.radius, 'kayla'), KAYLA_RACE.radius),
      moveEd: (position, target, maximum) => stepToward(position, target, maximum, navigation(position, KAYLA_RACE.edRadius, 'ed'), KAYLA_RACE.edRadius),
    });
    return sync();
  }
  function conversation(npc) {
    const s = quest.state(), begin = retry => {
      closeDialogue(); const ok = retry ? quest.retry() : quest.accept(); if (ok) { focus(KAYLA_RACE.id); sync(); }
    };
    if (s.stage === 'available') {
      openDialogue(npc, [
        '“Oh, dear. Ed the Chameleon stole my honey. He says he will only give it back if I beat him in a race.”',
        '“He rides a unicycle. I have four perfectly good feet, but I am hopeless at choosing the quick line round a bend. Would you ride on my back and steer?”',
        '“We race east along this road to the crossroads, where the prophet stands. Hold Shift to run. I promise to share the honey if we win.”',
      ], null, 'The honey race', { choices: [
        { id: 'kayla-race-accept', label: 'Climb on. Let us win your honey back.', action: () => begin(false) },
        { id: 'kayla-race-leave', label: 'Not just yet.', action: closeDialogue },
      ] }); return true;
    }
    if (s.stage === 'won') {
      openDialogue(npc, ['“We did it! He gave it all back. Thank you, dear. Here is some for you.”',
        '“Now I must find my cub by the river in Drent. Little paws get into such trouble when I am away.”'], null, 'Honey, fairly won', { choices: [
        { id: 'kayla-race-reward', label: `Take ${KAYLA_RACE.reward} honeycomb.`, action: () => {
          closeDialogue(); const count = quest.takeReward(); if (count) { reward('honeycomb', count); sync(); }
        } },
      ] }); return true;
    }
    if (s.stage === 'lost') {
      openDialogue(npc, ['“Never mind, dear. We can try again. I will carry you back to the east gate, and Ed can pedal back with us.”'], null, 'Another race', { choices: [
        { id: 'kayla-race-retry', label: 'Ride back for another try.', action: () => begin(true) },
        { id: 'kayla-race-leave', label: 'I will come back later.', action: closeDialogue },
      ] }); return true;
    }
    return false;
  }
  return { tick, frame: tick, sync, conversation, get mounted() { return quest.mounted; },
    restore(value) { if (!quest.restore(value)) return false; previousStage = quest.state().stage; sync(); return true; },
    snapshot: quest.snapshot, state: quest.state };
}
