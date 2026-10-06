// A Luscian name using Mittoli's existing cael root and -om ending. The seer
// belongs to this roadside place; his warnings do not start or time an invasion.
export const LUSCIA_PROPHET = Object.freeze({
  id: 'luscia-prophet', name: 'Caelom', role: 'The one-eyed seer',
  modelRole: 'doomsayer', color: 0x625f51,
  look: Object.freeze({ eyePatch: true, hair: 0xb9b7a7 }),
});

const WARNINGS = Object.freeze({
  winter: Object.freeze([
    'Caelom cups his hands as though warming them above a fire. There is no fire. "Winter. Another... under it." He shivers, watching something beyond your shoulder.',
    'His stick scratches a house in the soil, then lines of snow above its roof. "No thaw. Bread... stone." He rubs the drawing out before you can ask how long.',
    '"Saw it. Not... yet." His one eye searches your face. Whether he has seen a possible future or is lost in an old fear, you cannot tell.',
  ]),
  invaders: Object.freeze([
    'He draws several small figures, then a towering, clawed shape among them. His hand shakes. "Not men. Teeth... in the white."',
    'He presses the end of his stick into the little houses until only holes remain. "Islands... burning. All down." He tries to say more, but the words will not come.',
    'Caelom turns toward the distant hills and holds up a hand as though barring a door. His warning gives you neither a name nor a date.',
  ]),
  eye: Object.freeze([
    'Caelom touches the worn patch and falls still. "Before... words." He moves his fingers beside his mouth, trying to catch a sentence that will not form.',
    '"After... see." He points to his remaining eye, then shuts it tight. You cannot tell whether he means the visions began with his injury. He does not want to explain it again.',
  ]),
  directions: Object.freeze([
    'For a moment his hand is steady. He points along the southern road. "Nothom. South." Then he turns his stick toward the western branch. "Elagos. West."',
    'He points back east. "Caloss. Bridge. Drent." He traces the fork once in the soil, so there is no mistaking which road he means.',
  ]),
});

/** An optional conversation: no quest, reward, faction, or calendar mutation. */
export function lusciaProphetConversation(npc, context) {
  if (npc?.id !== LUSCIA_PROPHET.id) return false;
  const { openDialogue, closeDialogue } = context;
  const again = () => lusciaProphetConversation(npc, context);
  const ask = (id, label) => ({
    id: `seer-${id}`, label,
    action: () => openDialogue(npc, [...WARNINGS[id]], null, 'Back to Caelom', { onComplete: again }),
  });
  openDialogue(npc, [
    'An old man in a weathered robe rocks beside the fork, counting on his fingers and starting again. A patch covers one eye. He notices you and grips his stick with both hands.',
    '"Caelom." He taps his chest. "Cold... coming. Things... behind it." The effort leaves him breathless. He waits, watching you with his one uncovered eye.',
  ], null, 'Leave him in peace', { choices: [
    ask('winter', 'What have you seen of winter?'),
    ask('invaders', 'What is coming behind it?'),
    ask('eye', 'What happened to your eye?'),
    ask('directions', 'Where do these roads lead?'),
    { id: 'leave-luscia-prophet', label: 'Keep warm, Caelom. I should go.', action: closeDialogue },
  ] });
  return true;
}
