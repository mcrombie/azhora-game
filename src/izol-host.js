/**
 * West Izol in the running game: the one place `src/main.js` hands Izolveth its
 * people, their conversations and their frame. Everything here works on the
 * host's own objects, so main.js needs a registration call, a conversation call
 * and a frame call, and nothing else.
 *
 *  - Registration puts Izolveth's people, Ardveth's elder and the boatwright at
 *    Kelvath Cove into the host's NPC list at their stands.
 *  - The frame decides where the three generals stand. Chapter 2's outcome sets
 *    who holds Solis, and that decides whether General Kellveth is in Solis with
 *    a command or at home in West Izol without one. He is the only person in the
 *    region whose presence is conditional; everybody else is always out, and
 *    four of them say their last line differently depending on the same flag
 *    (`IZOL_ALTERNATES` in src/izol-people.js).
 *
 * No DOM, no three.
 */
import { IZOL_NPCS, IZOL_NPC_IDS, CONDITIONAL_NPC_IDS, izolConversation } from './izol-people.js';
import { IZOL_NPC_POSITIONS, generalsStance } from './izol-world.js';

export function createIzolHost({ world, npcData }) {
  for (const person of IZOL_NPCS) {
    const spot = IZOL_NPC_POSITIONS[person.id];
    world.npcPositions[person.id] = { x: spot.x, z: spot.z };
    npcData.push({ ...person });
  }
  const ids = new Set(IZOL_NPC_IDS);
  let stance = null, lastSolis;

  /** Talk to somebody from West Izol. Returns false for anybody else. */
  function converse(npc, { control, openDialogue, closeDialogue }) {
    if (!ids.has(npc?.id)) return false;
    return izolConversation(npc, { control: control ?? {}, openDialogue, closeDialogue });
  }

  /** Once a frame, after the host's occupation pass. Cheap when nothing has changed. */
  function frame({ npcById, control }) {
    // Nothing is allocated on a frame where Chapter 2's outcome has not changed.
    const solis = control?.['West Suval'];
    if (stance && solis === lastSolis) return stance;
    lastSolis = solis;
    const next = generalsStance(control ?? {});
    if (stance && stance.kellvethHome === next.kellvethHome) { stance = next; return stance; }
    stance = next;
    for (const id of CONDITIONAL_NPC_IDS) {
      const npc = npcById?.get(id);
      if (npc) npc.hidden = !next.kellvethHome;
    }
    return stance;
  }

  return { converse, frame, ids, get stance() { return stance; } };
}
