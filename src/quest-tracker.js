/** The player's selected errand. This reads quest views; it never starts or advances them. */
import { BRIDGE_QUEST, CLOSED, LIVE, questLive } from './quest-slate.js';
import { BEN, SPIDER_QUEST } from './spider-quest.js';
import { TESTIMONY, TROY } from './murder-quest.js';
import { CAT, LIZ } from './cat-quest.js';

export const QUEST_TRACKER_TYPES = Object.freeze({
  main: Object.freeze({ label: 'Main quest', grade: 'main', order: 0 }),
  secondary: Object.freeze({ label: 'Secondary quest', grade: 'plot', order: 1 }),
  tertiary: Object.freeze({ label: 'Tertiary quest', grade: 'deed', order: 2 }),
});
const namedGates = new Set([...LIVE, ...CLOSED]);
const finished = quest => !!quest?.complete || !!quest?.over || ['complete', 'done', 'closed', 'abandoned', 'failed'].includes(quest?.stage);
const validPoint = point => Number.isFinite(point?.x) && Number.isFinite(point?.z);
const copyTarget = target => validPoint(target) ? { ...target } : null;
const copyQuest = quest => quest ? { ...quest, destinationIds: [...quest.destinationIds], target: copyTarget(quest.target) } : null;
const typeFor = quest => Object.hasOwn(QUEST_TRACKER_TYPES, quest.type) ? quest.type
  : ['main', 'gold'].includes(quest.grade) ? 'main' : ['plot', 'silver'].includes(quest.grade) ? 'secondary' : 'tertiary';

/** The three already-built magic stories, read from their existing state getters. */
export function activeOptionalQuests({ spider = null, murder = null, cat = null } = {}) {
  const tasks = [];
  if (spider && ['walking', 'fighting', 'killed'].includes(spider.stage) && !spider.over) {
    const reward = spider.stage === 'killed';
    tasks.push({ id: SPIDER_QUEST.id, active: true, type: 'secondary', title: 'The spider in the thorns', stage: spider.stage,
      detail: reward ? 'Speak to Ben and choose your share of the bounty or his lesson in fire.'
        : spider.stage === 'fighting' ? 'Defeat the spider and keep Ben alive.' : 'Accompany Ben from Nothom to the spider den.',
      destinationIds: reward ? [BEN.id] : ['thorn-den'],
      target: reward ? null : { ...SPIDER_QUEST.den, id: 'thorn-den', name: 'The spider den' },
    });
  }
  if (murder && ['asking', 'solved'].includes(murder.stage) && !murder.over) {
    const heard = Array.isArray(murder.heard) ? murder.heard : [];
    const witnesses = Object.values(TESTIMONY).filter(witness => !heard.includes(witness.gives)).map(witness => witness.id);
    tasks.push({ id: 'cobble-murder', active: true, type: 'secondary', title: 'The tally-keeper of Cobble', stage: murder.stage,
      detail: murder.stage === 'solved' ? 'Return to Troy and choose the guild purse or his lesson in the reading.'
        : witnesses.length ? `Ask the people of Cobble about Bregga's death (${3 - witnesses.length} / 3 accounts heard).`
          : 'Take the testimony to Troy and explain whom you believe killed Bregga.',
      // The tracker gives no answer to a mystery the player has not solved.
      destinationIds: murder.stage === 'solved' || !witnesses.length ? [TROY.id] : witnesses,
    });
  }
  if (cat && ['looking', 'following', 'home'].includes(cat.stage) && !cat.over) {
    tasks.push({ id: 'liz-cat', active: true, type: 'tertiary', title: 'Bring Mop home', stage: cat.stage,
      detail: cat.stage === 'looking' ? 'Find Mop near the goblin camp in Pueth. Approach quietly and let him come to you.'
        : cat.stage === 'following' ? 'Walk Mop back to Liz. Stay close and keep him away from fighting.'
          : 'Speak to Liz and choose the coin or her lesson in the bees.',
      destinationIds: cat.stage === 'looking' ? [CAT.id] : [LIZ.id],
    });
  }
  return tasks;
}

function normalize(quest, id, type = typeFor(quest)) {
  const grade = QUEST_TRACKER_TYPES[type];
  const ids = quest.destinationIds ?? (quest.objectiveId ? [quest.objectiveId] : []);
  return { id, type, grade: grade.grade, label: grade.label,
    title: typeof quest.title === 'string' ? quest.title : 'An errand',
    detail: typeof quest.detail === 'string' ? quest.detail : '',
    kicker: typeof quest.kicker === 'string' ? quest.kicker : grade.label,
    stage: typeof quest.stage === 'string' ? quest.stage : null, complete: finished(quest),
    destinationIds: [...new Set((Array.isArray(ids) ? ids : []).filter(value => typeof value === 'string' && value.length > 0))],
    target: copyTarget(quest.target),
  };
}

/**
 * Main is always available. The built side quests appear once accepted, and
 * generic optional entries must explicitly say active:true. A parked quest
 * cannot be revived by an old save carrying its unfinished state.
 */
export function normalizeTrackableQuests({ main = {}, bridge = null, vastos = null, optional = [], live = questLive } = {}) {
  const result = [normalize({ title: 'The main quest', ...main }, 'main', 'main')];
  if (live('bridge') && bridge && !finished(bridge) && ['accepted', 'repaired'].includes(bridge.stage)) {
    const repaired = bridge.stage === 'repaired', sticks = Math.max(0, Math.min(3, Math.floor(Number(bridge.sticks) || 0)));
    result.push(normalize({ ...bridge, title: bridge.title ?? BRIDGE_QUEST.title,
      detail: bridge.detail ?? (repaired ? 'Return to Chip and report that the Caloss crossing is mended.'
        : sticks < 3 ? `Gather three forest sticks (${sticks} / 3), then mend the missing span at the Caloss bridge.`
          : 'You have the timber. Mend the missing span at the Caloss bridge.'),
      destinationIds: bridge.destinationIds ?? [repaired ? 'crossing-keeper' : 'bridge-repair'],
    }, 'bridge', 'tertiary'));
  }
  if (live('civil-war-vastos') && vastos && ['recover', 'claims', 'decision', 'terms', 'settle'].includes(vastos.stage) && !finished(vastos))
    result.push(normalize(vastos, 'civil-war-vastos', 'secondary'));
  for (const quest of Array.isArray(optional) ? optional : []) {
    if (!quest || typeof quest.id !== 'string' || !quest.id.trim() || quest.active !== true || quest.enabled === false || finished(quest)) continue;
    if (result.some(entry => entry.id === quest.id) || ['main', 'bridge', 'civil-war-vastos'].includes(quest.id)) continue;
    const gate = quest.slateId ?? (namedGates.has(quest.id) ? quest.id : null);
    if (gate && !live(gate)) continue;
    // The main story has one card. Optional entries cannot impersonate it.
    const type = typeFor(quest) === 'main' ? 'secondary' : typeFor(quest);
    result.push(normalize(quest, quest.id, type));
  }
  return result.sort((a, b) => QUEST_TRACKER_TYPES[a.type].order - QUEST_TRACKER_TYPES[b.type].order);
}

export function createQuestTracker({ selectedId = 'main' } = {}) {
  let wanted = typeof selectedId === 'string' ? selectedId : 'main', choices = null;
  function reconcile() {
    if (!choices) choices = normalizeTrackableQuests();
    if (!choices.some(quest => quest.id === wanted)) wanted = 'main';
  }
  function view() {
    reconcile();
    return { selectedId: wanted, selected: copyQuest(choices.find(quest => quest.id === wanted)), choices: choices.map(copyQuest) };
  }
  function update(source) { choices = normalizeTrackableQuests(source); reconcile(); return view(); }
  function select(id) {
    reconcile();
    const ok = typeof id === 'string' && choices.some(quest => quest.id === id);
    wanted = ok ? id : 'main';
    return { ok, ...view() };
  }
  /** A selected side errand replaces the pointer; a task without a place has no false arrow. */
  function target(mainTarget, resolveId = () => null, position = null) {
    reconcile();
    if (wanted === 'main') return copyTarget(mainTarget);
    const selected = choices.find(quest => quest.id === wanted);
    if (selected.target) return copyTarget(selected.target);
    const targets = selected.destinationIds.map(id => {
      const resolved = resolveId(id);
      return validPoint(resolved) ? { id, ...resolved } : null;
    }).filter(Boolean);
    if (validPoint(position)) targets.sort((a, b) => Math.hypot(a.x - position.x, a.z - position.z) - Math.hypot(b.x - position.x, b.z - position.z));
    return copyTarget(targets[0]);
  }
  return { update, select, view, target, get selectedId() { reconcile(); return wanted; } };
}
