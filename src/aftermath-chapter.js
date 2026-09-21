import { HELD_AT_TUNED_LEVEL } from './border-chapter.js';
/**
 * After the border battle: the four chapters the campaign can reach from it.
 * The Empire's sellsword either goes into Solis with the army (`solis-sweep`)
 * or holds the outpost's gate on the retreat (`moros-fallback`); the Republic's
 * either storms the army's outpost at the centre of the Moros
 * (`moros-outpost`) or holds the gate of Solis (`solis-fallback`). Each is the
 * same shape: rally to your commander, fight one corner of the day beside your
 * allies, and report to whoever sends you on. Where the people stand is the
 * host's business: this module names sites and the host resolves them
 * (`src/aftermath-sites.js`).
 * Pure: no DOM, no three.
 */
export const AFTERMATH_VERSION = 1;
export const AFTERMATH_LEGATE_ID = 'post-camp-legate';

/** People the chapter brings on; the Marshal already stands at his tent. */
export const AFTERMATH_NPCS = Object.freeze([
  Object.freeze({ id: 'aftermath-tribune', name: 'Captain Oswin Brulan', role: 'Captain of the army’s left', modelRole: 'legion-officer', color: 0x832d2b }),
  Object.freeze({ id: 'aftermath-captain', name: 'Captain Arlen Voss', role: 'Captain of the Lauvel companies', modelRole: 'suvali-guard', color: 0x3f5f86 }),
  Object.freeze({ id: 'aftermath-envoy', name: 'Envoy Telis Orren', role: 'Envoy of the Republic and the Coalition', modelRole: 'rise-custodian', color: 0x3f5f86 }),
]);

// The Coalition outbids the Empire in hard coin (the user's brief: their offer is the better one); the paper promise on top is talk, not an item.
const SCRIP_NOTE = 'a note for forty more when the Republic has a treasury that is not a chest on a ship';

/**
 * What the traveler can do with the orders, which is not the same on the two sides.
 * Ambron stands in Elagos and the ground between it and the Moros is walkable end to
 * end, so an Empire sellsword can ride there and stand in the city; what is missing is
 * the chapter that happens when they arrive. Izolveth is on the island of Izol across
 * the Izoli Channel, with no crossing in the world, so a Republic sellsword cannot get
 * there at all. Two different frontiers, and the journal should not call them the same.
 */
const AMBRON_ONWARD = 'You can ride to Ambron and walk its streets; what the Lord Marshal does with a sellsword who holds a square is the next chapter, and it is not built yet.';
const IZOLVETH_ONWARD = 'There is no ship out of Solis yet: the passage to West Izol is not built, and Izolveth waits on the far side of the channel for the chapter that carries you there.';

const variant = (id, spec) => Object.freeze({ id, encounterId: `aftermath-${id}`, ...spec });

/** One entry per campaign chapter. `foe` is the look of the soldiers you fight; sites are resolved by the host. */
export const AFTERMATH_VARIANTS = Object.freeze({
  'solis-sweep': variant('solis-sweep', {
    side: 'empire', outcome: 'victory', region: 'West Suval', title: 'Solis, taken', foe: 'coalition', reward: 40, onward: AMBRON_ONWARD,
    commanderId: 'aftermath-tribune', rallySite: 'solis-road', arena: 'solis-gate-assault', principalId: 'aftermath-tribune', reportSite: 'solis-hall',
    // The defenders stand before the gate, and the last two come out of the gateway itself.
    enemyOffsets: [[-6, -9, .2], [6, -9.5, .9], [0, -11, 1.8], [-4, -10.5, 6], [4, -10.5, 7.5], [-1, -14.5, 11], [1, -15, 12.5]],
    rally: ['The hired company on the Solis road', 'The Coalition broke at the border and fell back on Solis, and shut themselves in behind the Gate of Sun Horses. Captain Oswin Brulan has the hired company on the road north of the gate. Follow the road south-east into West Suval and find him.'],
    fight: ['Take the Gate of Sun Horses', 'Seven of the Republic’s best hold the Gate of Sun Horses, and the last of them will come out of the gateway. Break them, with your company beside you. Fall back up the road if you must.'],
    report: ['The Coalition’s chair', 'The gate is taken, and the city with it: the council took ship while its gate held. Captain Brulan has taken the Court of Oaths. Report to him there.'],
    done: 'Solis is the Emperor’s, and West Suval with it. The Marshal’s dispatch says a hired company went in first, and you carry it to Ambron.',
    orders: [
      'They shut the gate on us. The council is taking ship at the quay, and the best of what the Republic has left is holding the Gate of Sun Horses to buy them the tide.',
      'Orders: take the gate. Once it is ours, no fire, no looting, and no one touched who has put his weapon down. The Marshal wants a city that pays tax, not a ruin. The men at the gate have not put theirs down.',
      'Your company goes at it first. Say when.',
    ],
    ready: 'We take the gate.',
    debrief: [
      'Sit if you like. It is the Coalition’s chair, and it is as hard as ours.',
      'Solis is the Emperor’s tonight, and West Suval with it by the week’s end. The rolls will say the army took it. The Marshal’s dispatch says a hired company went in first. I wrote that part.',
      'Forty copper, the day’s rate doubled. And orders: the Lord Marshal wants to see what kind of sellsword holds a square. You ride for Ambron, north-west across the Moros. Dismissed.',
    ],
    close: 'Take the pay and the orders.',
    after: ['Ambron, sellsword. North-west across the Moros. The dispatch does not carry itself.'],
    toasts: { start: 'The hired company goes at the gate first.', won: 'The Gate of Sun Horses is taken. The Captain has the Court of Oaths.', closed: 'Forty copper, and the Marshal’s dispatch for Ambron.' },
  }),
  'moros-fallback': variant('moros-fallback', {
    side: 'empire', outcome: 'defeat', region: 'Moros Plain', title: 'The line at the Moros', foe: 'coalition', reward: 40, onward: AMBRON_ONWARD,
    commanderId: 'aftermath-tribune', rallySite: 'camp-gate', arena: 'camp-approach', principalId: AFTERMATH_LEGATE_ID, reportSite: null,
    rally: ['Back across the plain', 'The army lost the field and is falling back across the plain to its camp. Captain Oswin Brulan holds the camp’s gate for the last of the wounded. Get back to him.'],
    fight: ['Hold the gate', 'Seven of the Coalition’s pursuit come at the gate. Hold it, with your company beside you, until the carts are in.'],
    report: ['A field, not a war', 'The gate held and the carts are in. Marshal Hadric Venmor wants you at the command tent.'],
    done: 'The Coalition holds the border stockade; the army holds its camp. You carry the Marshal’s dispatch to Ambron.',
    orders: [
      'You are alive. Half the left is not. Their pursuit is behind us and the wounded carts are still on the road.',
      'Orders: this gate stays open until the last cart is through it, and it does not fall while it is open. Your company, and what I have left.',
      'Say when.',
    ],
    ready: 'We hold the gate.',
    debrief: [
      'The gate held. I am told who held it.',
      'I lost a field today. Not an army, and not a war. The Coalition has the stockade; let them garrison it and feed it.',
      'Ambron must hear this from someone who was on the field and has no career to protect. That is you. Forty copper, and my dispatch. North-west across the Moros into Elagos. Go.',
    ],
    close: 'Take the pay and the dispatch.',
    after: ['You have my dispatch. Ambron.'],
    toasts: { start: 'Their pursuit is on the road. Hold the gate.', won: 'The gate held. The Marshal wants you at the command tent.', closed: 'Forty copper, and the Marshal’s dispatch for Ambron.' },
  }),
  'moros-outpost': variant('moros-outpost', {
    side: 'coalition', outcome: 'victory', region: 'Moros Plain', title: 'The outpost on the plain', foe: 'legion', reward: 60, onward: IZOLVETH_ONWARD,
    commanderId: 'aftermath-captain', rallySite: 'outpost-approach', arena: 'outpost-gate', principalId: 'aftermath-envoy', reportSite: 'outpost-command',
    rally: ['The army’s outpost', 'The army broke and ran for its outpost at the centre of the Moros. Captain Arlen Voss means to take it before Venmor can shut the gate and send for Ambron. Find him on the road outside its north-east gate.'],
    fight: ['Storm the gate', 'Seven soldiers hold the ground before the north-east gate, shields locked, while the Marshal’s baggage goes out the back. Break them, with the valley companies beside you. Fall back east along the road if you must.'],
    report: ['The Republic’s flag', 'The gate is taken and the army has quit its outpost. Envoy Telis Orren has ridden up behind the army and taken the Marshal’s tent. Report to her there.'],
    done: 'The Republic’s flag flies over the army’s outpost at the centre of the Moros, and Solis is safe behind it. The envoy sends you on to West Izol.',
    orders: [
      'They ran. I have waited since the Lauvel to say that. But they ran to that: a ditch, a palisade, towers, and a Marshal who is already writing to Ambron for another army.',
      'If the gate shuts tonight we sit outside it until that army comes. It is open now because their wounded are still going in. No one here has stormed anything; most of my men had never held a spear before this spring. You have. So you go first, and we go with you.',
      'Say when.',
    ],
    ready: 'We take it now.',
    debrief: [
      'So this is an imperial command tent. It is smaller than the tax it cost.',
      `The Republic’s flag goes up over this outpost tonight, and the council will vote you its thanks, which is worth what votes are worth. I prefer to pay: sixty copper, hard coin, which is more than Venmor ever counted out for you, and ${SCRIP_NOTE}.`,
      'West Izol raised this war and has not yet met the sellsword who turned its first battle. There is a ship at the Solis quay. Be on it.',
    ],
    close: 'Take the coin and the passage.',
    after: ['The ship will not wait for the council to finish talking. Neither should you.'],
    toasts: { start: 'You go first, and the valley companies go with you.', won: 'The gate is taken and the army is gone. The envoy has the Marshal’s tent.', closed: 'Sixty copper in hard coin, and passage from Solis to West Izol.' },
  }),
  'solis-fallback': variant('solis-fallback', {
    side: 'coalition', outcome: 'defeat', region: 'West Suval', title: 'Back to Solis', foe: 'legion', reward: 60, onward: IZOLVETH_ONWARD,
    commanderId: 'aftermath-captain', rallySite: 'solis-gate', arena: 'solis-approach', principalId: 'aftermath-envoy', reportSite: 'solis-hall',
    rally: ['The road back', 'The Coalition lost the field and fell back on Solis, and the army’s outriders are close behind. Captain Arlen Voss is at the city gate. Get back to him.'],
    fight: ['Hold the gate of Solis', 'Seven of the army’s outriders come up the road. Hold them off, with the valley companies beside you, until the gate can shut.'],
    report: ['The council argues', 'The gate is shut and Solis still stands. Envoy Telis Orren is in the council hall. Report to her.'],
    done: 'The army holds the border, and Solis holds its walls. The envoy sends you on to West Izol, where the rest of the army waits.',
    orders: [
      'We broke. I will not dress it up. The valley companies stood as long as farmers can stand against that.',
      'Their outriders are on the road behind the last of us, and the gate cannot shut until the stragglers are in. Same work as this morning, and fewer of us to do it.',
      'Say when.',
    ],
    ready: 'We hold the gate.',
    debrief: [
      'The gate is shut and Solis is still ours. The council is already arguing over whose fault the morning was. I told them the afternoon was yours.',
      `We lost a field. Ambron has lost provinces and not noticed. The Republic needs its sellsword more tonight, not less: sixty copper, hard coin, which is more than Venmor ever counted out for you, and ${SCRIP_NOTE}.`,
      'West Izol has the army that was supposed to be here. Go and tell them what waiting cost. There is a ship at the quay.',
    ],
    close: 'Take the coin and the passage.',
    after: ['The ship will not wait for the council to finish talking. Neither should you.'],
    toasts: { start: 'Their outriders are on the road. Hold the gate.', won: 'The gate is shut. The envoy is in the council hall.', closed: 'Sixty copper in hard coin, and passage from Solis to West Izol.' },
  }),
});

export const AFTERMATH_IDS = Object.freeze(Object.keys(AFTERMATH_VARIANTS));
/** The chapters that follow a lost border battle. Winning the fight wins the battle now, so no new game reaches them. */
const FALLBACKS = Object.freeze(['moros-fallback', 'solis-fallback']);
export const AFTERMATH_SITE_IDS = Object.freeze([...new Set(Object.values(AFTERMATH_VARIANTS).flatMap(spec => [spec.rallySite, spec.reportSite].filter(Boolean)))]);
export const AFTERMATH_ARENA_IDS = Object.freeze(Object.values(AFTERMATH_VARIANTS).map(spec => spec.arena));

/** The campaign chapter a side and a battle outcome lead to. */
export const aftermathFor = (side, outcome) => AFTERMATH_IDS.find(id => AFTERMATH_VARIANTS[id].side === side && AFTERMATH_VARIANTS[id].outcome === outcome) ?? null;

// An arena is a centre, a retreat axis and the way the retreat runs along it (+1, or -1 for a way out toward -axis).
// Offsets are [across, along, entry]: `along` is negative toward the enemy's end, and the allies form up behind the traveler.
const ENEMY_OFFSETS = [[-6, -12, .2], [6, -13, .9], [0, -16, 1.8], [-8, -18, 6], [8, -19, 7.5], [-3, -19.5, 11], [3, -20, 12.5]];
const ALLY_OFFSETS = [[-6, 10], [6, 10], [-9, 14], [9, 14]];
const CHECKPOINT_ALONG = 13, RETREAT_ALONG = 21;

/** The fight for a variant on the host's arena `{ center: {x, z}, retreatAxis: 'x' | 'z' }`. */
export function aftermathEncounter(variantId, arena, allies = []) {
  const spec = AFTERMATH_VARIANTS[variantId];
  if (!spec || !arena?.center || !['x', 'z'].includes(arena.retreatAxis) || ![arena.center.x, arena.center.z].every(Number.isFinite)) return null;
  const sign = arena.retreatSign === -1 ? -1 : 1;
  const place = (across, along) => (arena.retreatAxis === 'x'
    ? { x: arena.center.x + sign * along, z: arena.center.z + across } : { x: arena.center.x + across, z: arena.center.z + sign * along });
  return { id: spec.encounterId, level: HELD_AT_TUNED_LEVEL, center: { x: arena.center.x, z: arena.center.z }, checkpoint: place(0, CHECKPOINT_ALONG),
    retreatAxis: arena.retreatAxis, retreatSign: sign, retreatLine: arena.center[arena.retreatAxis] + sign * RETREAT_ALONG,
    enemies: (spec.enemyOffsets ?? ENEMY_OFFSETS).map(([across, along, entry], index) => ({ id: `${spec.encounterId}-foe-${index + 1}`, ...place(across, along), entry, hp: 100, kind: 'soldier', look: spec.foe })),
    allies: allies.slice(0, ALLY_OFFSETS.length).map((ally, index) => ({ ...ally, ...place(...ALLY_OFFSETS[index]) })) };
}

const fail = reason => ({ ok: false, reason });
const action = (id, label, objectiveId) => ({ id, label, objectiveId, enabled: true, reason: '' });
const initial = () => ({ version: AFTERMATH_VERSION, revision: 0, variant: null, cleared: false, complete: false });

export function validateAftermathSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== AFTERMATH_VERSION
    || Object.keys(data).some(key => !['version', 'revision', 'variant', 'cleared', 'complete'].includes(key))
    || !Number.isSafeInteger(data.revision) || data.revision < 0 || typeof data.cleared !== 'boolean' || typeof data.complete !== 'boolean'
    || (data.variant !== null && !AFTERMATH_IDS.includes(data.variant))) return false;
  if ((data.cleared && !data.variant) || (data.complete && !data.cleared)) return false;
  return data.revision === Number(data.variant !== null) + Number(data.cleared) + Number(data.complete);
}

export function createAftermathChapter({ onEvent = () => {} } = {}) {
  let state = initial(), active = false;
  const snapshot = () => ({ ...state });
  const spec = () => AFTERMATH_VARIANTS[state.variant] ?? null;

  function stage() {
    if (!state.variant) return 'not-started';
    if (!state.cleared) return active ? 'fighting' : 'rally';
    return state.complete ? 'complete' : 'report';
  }

  function view() {
    const current = stage(), chapter = spec();
    if (!chapter) return { stage: current, step: 0, steps: 3, title: 'After the battle', detail: 'The border battle is not fought yet.', kicker: 'AFTER THE BATTLE',
      variant: null, side: null, region: null, active: false, complete: false, fighting: false, objectiveId: null, destinationIds: [], siteId: null };
    const rows = {
      rally: [1, ...chapter.rally, chapter.commanderId, chapter.rallySite],
      fighting: [2, ...chapter.fight, null, null],
      report: [3, ...chapter.report, chapter.principalId, chapter.reportSite],
      complete: [4, chapter.title, `${chapter.done} ${chapter.onward}`, null, null],
    };
    const [step, title, detail, objectiveId, siteId] = rows[current];
    const kicker = `${chapter.region.toUpperCase()} · ${chapter.title.toUpperCase()}${current === 'complete' ? ' · DONE' : ` · ${Math.min(step, 3)} / 3`}`;
    return { stage: current, step, steps: 3, title, detail, kicker, variant: chapter.id, side: chapter.side, region: chapter.region,
      active: !state.complete, complete: state.complete, fighting: active, objectiveId, destinationIds: objectiveId ? [objectiveId] : [], siteId };
  }

  /** Which of the chapter's own people are out, and at which site. The Marshal is never listed: he keeps his tent. */
  function cast() {
    const chapter = spec(), current = stage();
    if (!chapter) return [];
    const own = id => AFTERMATH_NPCS.some(npc => npc.id === id);
    if (current === 'rally' || current === 'fighting') return [{ id: chapter.commanderId, site: chapter.rallySite }];
    return own(chapter.principalId) ? [{ id: chapter.principalId, site: chapter.reportSite }] : [];
  }

  function availableActions() {
    const chapter = spec();
    switch (stage()) {
      case 'rally': return [action('begin-assault', chapter.ready, chapter.commanderId)];
      case 'report': return [action('close-aftermath', chapter.close, chapter.principalId)];
      default: return [];
    }
  }

  function emit(actionId, detail = {}) {
    state.revision++;
    const event = { type: 'aftermath-progress', sequence: state.revision, actionId, variant: state.variant, stage: stage(), ...detail };
    onEvent(event);
    return { ok: true, reason: '', ...event };
  }

  /** Begin the chapter the campaign reached: one of `AFTERMATH_IDS`. */
  function start(variantId) {
    if (state.variant) return fail('The day after the battle has already begun.');
    if (!AFTERMATH_IDS.includes(variantId)) return fail('That is not a chapter that follows the border battle.');
    state.variant = variantId;
    return emit('start-chapter');
  }

  function act(actionId) {
    const choice = availableActions().find(candidate => candidate.id === actionId);
    if (!choice) return fail(state.complete ? 'That day’s work is done.' : !state.variant ? 'The border battle is not fought yet.' : `Your current task: ${view().detail}`);
    if (actionId === 'close-aftermath') {
      state.complete = true;
      return emit(actionId, { objectiveId: choice.objectiveId, reward: spec().reward, campaignChapter: state.variant });
    }
    // Going in starts a fight; it is not progress until the fight is won.
    active = true;
    return { ok: true, reason: '', actionId, startEncounter: spec().encounterId, variant: state.variant };
  }

  /** Retreat or defeat: the commander waits, and the word can be given again. */
  function endEncounter(encounterId) {
    if (!active || encounterId !== spec()?.encounterId) return fail('There is no fight of yours to end.');
    active = false;
    return { ok: true, reason: '' };
  }

  function winEncounter(encounterId) {
    if (!active || encounterId !== spec()?.encounterId || state.cleared) return fail('There is no fight of yours to win.');
    active = false;
    state.cleared = true;
    return emit('win-aftermath-fight', { objectiveId: spec().principalId });
  }

  function restore(data) {
    if (!validateAftermathSnapshot(data, { allowMissing: false })) return false;
    // A fallback chapter came from a border battle that was won and rolled as lost (see settleBorderBattle
    // in src/campaign.js): it starts over, and the host begins the conquest the campaign now points to.
    if (FALLBACKS.includes(data.variant)) { state = initial(); active = false; return true; }
    state = { version: AFTERMATH_VERSION, revision: data.revision, variant: data.variant, cleared: data.cleared, complete: data.complete };
    active = false;
    return true;
  }

  return { start, act, endEncounter, winEncounter, view, cast, availableActions, snapshot, restore,
    get spec() { return spec(); },
    get state() { return { ...snapshot(), stage: stage(), fighting: active }; } };
}

/** The commander, and whoever sends the traveler on, speak for the chapter while it is theirs. */
export function aftermathConversation(npc, context) {
  const { aftermath, openDialogue, closeDialogue, act } = context;
  const chapter = aftermath.spec, current = aftermath.view().stage;
  if (!chapter) return false;
  const option = id => { const found = aftermath.availableActions().find(item => item.id === id); return found ? [{ ...found, action: () => { closeDialogue(); act(id); } }] : []; };
  const leave = { id: 'leave-aftermath', label: 'Not yet.', action: closeDialogue };
  if (npc.id === chapter.commanderId && current === 'rally') {
    openDialogue(npc, chapter.orders, null, 'Step back', { choices: [...option('begin-assault'), leave] });
    return true;
  }
  if (npc.id === chapter.principalId && current === 'report') {
    openDialogue(npc, chapter.debrief, null, 'Step back', { choices: [...option('close-aftermath'), leave] });
    return true;
  }
  if (npc.id === chapter.principalId && current === 'complete') {
    openDialogue(npc, chapter.after, null, 'Step back');
    return true;
  }
  return false;
}
