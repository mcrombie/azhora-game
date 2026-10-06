/** Glun's first chart: issuing the item, looking at it, and reporting back are three acts.
 * Kept apart from cartography skill ownership: receiving the skill must not finish the lesson.
 * Pure and saved as a single stage, so a reload cannot skip the required return conversation. */
export const CHART_LESSON_STAGES = Object.freeze(['unissued', 'open-map', 'return-to-glun', 'complete']);

export function validateChartLesson(value) {
  return typeof value === 'string' && CHART_LESSON_STAGES.includes(value);
}

const CHART_CARD = Object.freeze({
  id: 'glun-chart', kicker: 'OFFICER GLUN · CARTOGRAPHY', title: 'Read your first chart',
  text: 'This is your world map. Your position marks where you stand in Tidehaven, on Drent’s coast. Enter a hex to confirm its full detail. Its six neighbours show only rough terrain silhouettes; their roads, buildings and exact places remain unknown until you visit.',
  controls: 'Zoom in for the ground around you, or out to see how the regions connect. Look for the westward road. Press M or Esc to close the map, then speak to Officer Glun again.',
});

export function createChartLesson(initial = 'unissued') {
  let stage = validateChartLesson(initial) ? initial : 'unissued';
  function transition(from, to) {
    if (stage !== from) return false;
    stage = to;
    return true;
  }
  return {
    issue: () => transition('unissued', 'open-map'),
    noteMapOpened: () => transition('open-map', 'return-to-glun'),
    report: () => transition('return-to-glun', 'complete'),
    view() {
      const active = stage === 'open-map' || stage === 'return-to-glun';
      return { stage, active, done: stage === 'complete', card: active ? { ...CHART_CARD } : null };
    },
    snapshot: () => stage,
    restore(value) {
      if (!validateChartLesson(value)) return false;
      stage = value;
      return true;
    },
    get stage() { return stage; },
  };
}
