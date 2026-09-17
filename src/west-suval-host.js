/**
 * West Suval in the running game: the one place `src/main.js` hands Solis its
 * people, its conversations and its frame. Everything here works on the host's
 * own objects (the NPC records, the world, the chapters), so main.js needs a
 * registration call, a conversation call and a frame call, and nothing else.
 *
 *  - Registration puts Solis's people into the host's NPC list. Their occupation
 *    stakes (`holds`/`region`) are honoured by the host's occupation pass.
 *  - The frame shows who holds Solis on the ground (the camp, banners and
 *    standards through `world.setSolisHolder`), stands both garrisons down while
 *    the Legion is still clearing the square, and walks the border chapter's column
 *    at the traveler's back during the march: the file of legionaries or the
 *    valley companies, and on the Empire's side the hired company's mustered men.
 *    A marcher left far behind is moved up out of sight; one fighting as a combat
 *    ally is hidden while the combat view draws him. When the column comes up to
 *    the line, `arrive()` starts the fight.
 * No DOM, no three.
 */
import { SOLIS_NPCS, SOLIS_NPC_IDS, solisConversation } from './solis-town.js';
import { solisHolder } from './west-suval.js';
import { BORDER_MARCHERS, BORDER_ARENA, BORDER_ARRIVAL_RADIUS, BORDER_ENCOUNTER_ID, MARCH, marchSlot } from './border-chapter.js';

export function createWestSuvalHost({ world, npcData }) {
  for (const person of SOLIS_NPCS) {
    world.npcPositions[person.id] = { x: person.x, z: person.z };
    npcData.push({ ...person });
  }
  let holder = null, arrivalAsked = false, lastColumn = [];
  const garrison = npcData.filter(npc => SOLIS_NPC_IDS.has(npc.id) && npc.holds);

  /** Talk to someone from Solis. Returns false for anyone else. */
  function converse(npc, { border, control, aftermath, openDialogue, closeDialogue, act }) {
    if (!SOLIS_NPC_IDS.has(npc?.id)) return false;
    return solisConversation(npc, { border, holder: solisHolder(control ?? {}, aftermath), openDialogue, closeDialogue, act });
  }

  /**
   * Once a frame, after the host's occupation pass. `mustered` lists the hired
   * company's men on the muster roll (ids); `fightingAllies` the ids the combat
   * view is drawing as allies right now.
   */
  function frame({ npcById, player, border, control, aftermath, mustered = [], fightingAllies = [], encounterId = null, playing = true, arrive = () => {} }) {
    const next = solisHolder(control ?? {}, aftermath);
    if (next !== holder) { holder = next; world.setSolisHolder?.(holder); }
    if (holder === 'routed') for (const npc of garrison) npc.hidden = true;

    const view = border.view();
    // Anyone the combat view draws as an ally on the line is not drawn twice.
    if (encounterId === BORDER_ENCOUNTER_ID) for (const id of fightingAllies) { const npc = npcById.get(id); if (npc) npc.hidden = true; }
    if (view.stage !== 'march') {
      arrivalAsked = false;
      for (const npc of lastColumn) npc.escorting = false;
      lastColumn = [];
      return { holder, marching: false };
    }

    const cast = new Set(border.cast());
    const column = [...BORDER_MARCHERS.filter(id => cast.has(id)), ...(view.side === 'empire' ? mustered : [])]
      .map(id => npcById.get(id)).filter(Boolean);
    for (const npc of lastColumn) if (!column.includes(npc)) npc.escorting = false;
    lastColumn = column;
    const traveler = player.group.position, heading = player.group.rotation.y;
    column.forEach((npc, index) => {
      const slot = marchSlot(index, traveler, heading), at = npc.actor.group.position;
      npc.hidden = false; npc.escorting = true;
      world.npcPositions[npc.id] = slot;
      const behind = Math.hypot(at.x - slot.x, at.z - slot.z);
      if (behind > MARCH.catchUp) {
        // Left far behind: fall in at the back of the column, out of the traveler's way, and walk up from there.
        const back = marchSlot(index + 8, traveler, heading);
        at.set(back.x, world.heightAt(back.x, back.z), back.z);
      }
      npc.pace = behind > 5 ? MARCH.jog : MARCH.pace;
    });
    // The column is up: the line forms and the fight begins, once.
    const near = Math.hypot(traveler.x - BORDER_ARENA.checkpoint.x, traveler.z - BORDER_ARENA.checkpoint.z) < BORDER_ARRIVAL_RADIUS;
    if (near && playing && !arrivalAsked) { arrivalAsked = true; arrive(); }
    if (!near) arrivalAsked = false;
    return { holder, marching: true, column: column.map(npc => npc.id) };
  }

  return { converse, frame, get holder() { return holder; } };
}
