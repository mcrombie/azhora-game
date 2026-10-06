import { ALEX, ALEX_DOOR, ALEX_FACING, ALEX_LINES, CAGNEY_AT_HOME, FLIRT_LABEL, ALEX_BOUT_ID, alexPresence, alexBout } from './alex.js';
import { CAGNEY } from '../cagney/cagney-quest.js';

/**
 * Alex in the world (src/content/quests/roadside/alex.js). She follows Cagney's own comings and goings at her door
 * (src/content/quests/homes/home-residents.js) rather than keeping any of her own, so there is nothing of hers to save:
 * whether she is out is whether Cagney is. The fight is the combat module's, as a bout; this only
 * starts it and says what is said when it is over.
 */
export function createAlexHost({ npc, cagney, world, combat, player, homeResidents, questComplete, crime, corpses,
  toast, openDialogue, closeDialogue, save = () => {} }) {
  let out = false, fought = null;
  const alive = person => person && !person.fallen && !crime?.isDown(person.id) && !corpses?.ownsNpc(person.id);

  function frame(dt, playing) {
    if (!playing || !npc) return;
    const next = alexPresence(out, { questComplete: questComplete() && alive(npc) && alive(cagney), cagney: homeResidents.state(CAGNEY.id) });
    if (next.out && !out) {
      // Out of the door behind Cagney.
      npc.actor.group.position.set(ALEX_DOOR.x, world.heightAt(ALEX_DOOR.x, ALEX_DOOR.z), ALEX_DOOR.z);
      npc.actor.group.rotation.y = ALEX_FACING;
      if (Math.hypot(player.group.position.x - ALEX_DOOR.x, player.group.position.z - ALEX_DOOR.z) < 25)
        toast('Cagney comes to the door, and Alex with her.', 'CAGNEY’S DOOR');
    }
    if (!next.out && out) fought = null;
    out = next.out;
    npc.hidden = !out;
    world.npcPositions[ALEX.id] = { ...next.target };
    npc.yaw = ALEX_FACING;
  }

  /** Alex's own conversation, when she is on the step. */
  function conversation(person) {
    if (person.id !== ALEX.id) return false;
    openDialogue(person, fought ? [...ALEX_LINES.wary] : [...ALEX_LINES.hello], null, 'Back to the road',
      { choices: [{ id: 'alex-leave', label: 'Nice to meet you, Alex.', action: closeDialogue }] });
    return true;
  }

  /**
   * What Cagney says on her step with Alex beside her, and the choice that starts it. Null when
   * Alex is not out, which leaves Cagney's own words in charge (src/content/quests/cagney/cagney-host.js).
   */
  function cagneyAtHome() {
    if (!out || npc.hidden) return null;
    return { lines: [...CAGNEY_AT_HOME.greeting], choices: [{ id: 'cagney-flirt', label: FLIRT_LABEL, action: flirt }] };
  }

  function flirt() {
    closeDialogue();
    openDialogue(cagney, [...CAGNEY_AT_HOME.flirted], null, 'Back to the road', { onComplete: () => {
      closeDialogue();
      openDialogue(npc, [...ALEX_LINES.stepIn], null, 'Back to the road', { onComplete: () => { closeDialogue(); fight(); } });
    } });
  }

  function fight() {
    if (combat.state.phase === 'active') return false;
    const here = npc.actor.group.position, me = player.group.position;
    if (!combat.startEncounter(alexBout({ x: me.x, z: me.z }, { x: here.x, z: here.z }))) {
      toast('Alex glares at you, and lets it go. There is no room on the step.', 'ALEX');
      return false;
    }
    toast('Alex puts her fists up. Nobody gets killed in this, but she means every punch.', 'ALEX');
    return true;
  }

  /** The bout is over: `winner` is `teacher` (Alex), `traveler`, or `walked-away`. */
  function boutOver(winner) {
    if (winner === 'walked-away') {
      fought = 'walked-away';
      toast('Alex lets you go. Her fists stay up until you are down the lane.', 'ALEX');
      save(); return;
    }
    const alexWon = winner !== 'traveler';
    fought = alexWon ? 'alex' : 'traveler';
    toast(alexWon ? 'Alex had the better of it. Nobody is badly hurt, least of all her.'
      : 'You had the better of it, and Alex is on her feet before you have your breath back.', 'ALEX');
    openDialogue(npc, [...(alexWon ? ALEX_LINES.won : ALEX_LINES.lost)], null, 'Back to the road', { onComplete: () => {
      closeDialogue();
      openDialogue(cagney, [...(alexWon ? CAGNEY_AT_HOME.alexWon : CAGNEY_AT_HOME.alexLost)], null, 'Back to the road', { onComplete: closeDialogue });
    } });
    save();
  }

  return Object.freeze({ frame, conversation, cagneyAtHome, flirt, fight, boutOver, get out() { return out; }, boutId: ALEX_BOUT_ID });
}
