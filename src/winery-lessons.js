/** Rob's advanced Farming lessons are a visible future offer, not an XP shortcut.
 * The level-five prerequisite is provisional; production mechanics come later. */
export const WINERY_LESSON_REQUIREMENT = Object.freeze({
  skill: 'farming', level: 5, provisional: true,
  subjects: Object.freeze(['viticulture']),
});

export function wineryLessonsStatus({ farmingLevel = 0 } = {}) {
  const currentLevel = Number.isFinite(farmingLevel) ? Math.max(0, Math.floor(farmingLevel)) : 0;
  const requiredLevel = WINERY_LESSON_REQUIREMENT.level;
  return Object.freeze({ currentLevel, requiredLevel, requirementMet: currentLevel >= requiredLevel,
    available: false, markerKind: currentLevel >= requiredLevel ? 'skill' : 'skill-locked' });
}

export function wineryLessonLines(options = {}) {
  const status = wineryLessonsStatus(options);
  return [
    'Viticulture is the tending of vines. It builds on Farming; Wine is a separate skill taught by the wine teachers.',
    status.requirementMet
      ? `Farming level ${status.requiredLevel} required. Your Farming level: ${status.currentLevel}. You have the experience for this advanced lesson.`
      : `Farming level ${status.requiredLevel} required. Your Farming level: ${status.currentLevel}. Practice growing and harvesting crops before we take on the vines.`,
    'The advanced viticulture lessons are not available yet. There is no lesson or assignment to begin here today.',
  ];
}

/** This is informational only: no skill unlock, XP payment, reward or quest state. */
export function robWineryConversation(npc, { farmingLevel = 0, openDialogue, closeDialogue = () => {} } = {}) {
  const status = wineryLessonsStatus({ farmingLevel });
  openDialogue(npc, wineryLessonLines({ farmingLevel }), null, 'Back to the winery', { onComplete: closeDialogue });
  return status;
}
