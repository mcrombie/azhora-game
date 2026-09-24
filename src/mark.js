import { BOTANY_LESSON } from './botany.js';
import { GEOLOGY_LESSON } from './geology.js';

// Keep the saved identity, placement and harbour-alarm behaviour of the man on
// the shore. His displayed name and his lessons are now Mark's.
export const MARK = Object.freeze({
  id: 'doomsayer', name: 'Mark', role: 'Doomsayer and naturalist', modelRole: 'doomsayer', color: 0x49434b,
});
export const MARK_SKILLS = Object.freeze(['botany', 'geology']);

const LESSONS = Object.freeze({
  botany: Object.freeze({ name: 'Botany', lines: Object.freeze([
    'Botany. The plants and trees, and what they tell you. A leaf is a much better sign than a cloud shaped like a skull, though nobody ever crowds round to hear about a leaf.',
    ...BOTANY_LESSON,
  ]) }),
  geology: Object.freeze({ name: 'Geology', lines: Object.freeze([
    'Geology. The ground under all our feet has a history, and a stone will tell you a little of it if you know what to ask. This is a separate lesson from the plants; even I do not read every sign at once.',
    ...GEOLOGY_LESSON,
  ]) }),
});

const WARNING = Object.freeze([
  'The dark lord of Cape Thalmagar. Remember that title. Far beyond this quiet shore, he waits at the end of a much longer road. What he intends... the signs have not yet shown me. That is warning enough for one morning.',
  'The cape lies beyond the northern end of the Oremindi: mountains that climb until the sky gives up. Their passes close for whole seasons. Even the coast gives way to cliffs. You will not stroll there with a borrowed map and a brave expression.',
  'First find your feet here. The cape lies far to the northwest, past every province of the failing Empire and the Oremindi beyond them, and no chart a traveler carries marks it; the mapmakers stopped where their courage did. It is a destination for the end of your travels. Today, help the people along the road through Drent.',
]);

/** Each choice completes one lesson through its existing, independently saved model. */
export function markConversation(npc, context) {
  if (npc?.id !== MARK.id) return false;
  const { skills, botany, geology, openDialogue, closeDialogue, onLearn = () => {} } = context;
  const models = { botany, geology }, again = () => markConversation(npc, context);
  const lessons = MARK_SKILLS.map(id => {
    const lesson = LESSONS[id], taught = skills.taught(id);
    return { id: `learn-${id}`, label: taught ? `Remind me about ${lesson.name}.` : `Teach me ${lesson.name}.`, action: () => {
      openDialogue(npc, [...lesson.lines], null, taught ? 'Back to Mark' : `Learn ${lesson.name}`, { onComplete: () => {
        const result = models[id].meet();
        onLearn(id, result);
        if (taught) again();
      } });
    } };
  });
  openDialogue(npc, [
    'Doom! Doom upon the distant cape! ...And good morning. Mark, at your service. I read the signs. Plants, stones, the dreadful future. The first two I can teach you to read for yourself.',
  ], null, 'Until next time', { choices: [
    { id: 'doom-warning', label: 'What waits at the distant cape?', action: () => openDialogue(npc, [...WARNING], null, 'Back to Mark', { onComplete: again }) },
    ...lessons,
    { id: 'leave-doomsayer', label: 'Keep watching the signs, Mark.', action: closeDialogue },
  ] });
  return true;
}
