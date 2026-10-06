/** The built gold arc, broken into fresh, bounded demonstrations. */
export const MAIN_QUEST_PLAYTESTS = Object.freeze([
  { id: 'arrival', title: 'Peninsula tutorial', description: 'Eight lessons, then Glun’s letter', stop: 'training' },
  { id: 'road', title: 'The road to Nothom', description: 'Greenway ambush and the Caloss crossing', stop: 'drent-road' },
  { id: 'lauvel', title: 'The lost courier', description: 'Recover the Lauvel satchel for Iven', stop: 'luscia-aftermath' },
  { id: 'moros', title: 'The Moros muster', description: 'Report to the Marshal and claim your horse', stop: 'moros-camp' },
  { id: 'solis-empire', title: 'Solis: the Empire', description: 'Parley, border battle and its aftermath', side: 'empire', stop: 'aftermath' },
  { id: 'solis-republic', title: 'Solis: the Republic', description: 'Parley, border battle and its aftermath', side: 'coalition', stop: 'aftermath' },
].map(entry => Object.freeze(entry)));

export const mainQuestPlaytest = id => MAIN_QUEST_PLAYTESTS.find(entry => entry.id === id) ?? null;

// Wait for the final conversation to finish before handing the controls back.
export function mainQuestPlaytestFinished(entry, snapshot) {
  if (!entry || snapshot.mode !== 'playing') return false;
  if (entry.stop === 'training') return snapshot.tutorial?.completed ?? (snapshot.chartLesson === 'complete' && !!snapshot.journey?.started);
  if (entry.stop === 'aftermath') return !!snapshot.aftermath?.complete;
  return snapshot.campaign?.completed?.includes(entry.stop) ?? false;
}
