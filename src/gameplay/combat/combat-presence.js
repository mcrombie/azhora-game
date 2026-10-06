/** World characters represented by the encounter renderer for this frame.
 * The road model must yield even when an NPC's walking schedule is still active.
 * Keep defeated encounters owned until their retry/exit transition is resolved. */
export function combatPresence(state) {
  const people = new Map();
  if (!['active', 'defeated'].includes(state?.phase)) return people;
  for (const actor of state.allies ?? []) people.set(actor.npcId ?? actor.id, actor);
  for (const actor of state.enemies ?? []) {
    // Sparring predates explicit npcId; its ID still names the same world person.
    const id = actor.npcId ?? (actor.id?.startsWith('spar-') ? actor.id.slice(5) : actor.id);
    people.set(id, actor);
  }
  return people;
}
