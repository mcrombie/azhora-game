/** Local Drent-to-Luscia errands beyond the first shore. No render or DOM dependencies. */
export const JOURNEY_VERSION = 1;
export const PARCEL_IDS = Object.freeze(['cart-parcel-1', 'cart-parcel-2', 'cart-parcel-3']);
export const BEACON_IDS = Object.freeze(['beacon-west', 'beacon-east', 'beacon-north']);
export const JOURNEY_REGIONS = Object.freeze({
  2: Object.freeze({ name: 'Sunmeadow Plain', title: 'Into imperial service' }),
  3: Object.freeze({ name: 'Reedwater Crossing', title: 'Whose road is this?' }),
  4: Object.freeze({ name: 'Threefold Rise', title: 'The people called rebels' }),
});

const emptyState = () => ({
  version: JOURNEY_VERSION, revision: 0, started: false,
  courierAccepted: false, parcels: [], courierComplete: false,
  bridgeAccepted: false, bridgeRepaired: false, bridgeComplete: false,
  ridgeAccepted: false, beacons: [], reportDelivered: false,
});
const booleanFields = ['started', 'courierAccepted', 'courierComplete', 'bridgeAccepted',
  'bridgeRepaired', 'bridgeComplete', 'ridgeAccepted', 'reportDelivered'];
const fail = reason => ({ ok: false, reason });
const action = (id, label, objectiveId, reason = '') => ({ id, label, objectiveId, enabled: !reason, reason });

function validCollection(value, allowed) {
  return Array.isArray(value) && value.every(id => allowed.includes(id)) && new Set(value).size === value.length;
}

/** Reject inconsistent saves atomically; loading a save never grants rewards. */
function validateSnapshot(value) {
  if (!value || typeof value !== 'object' || value.version !== JOURNEY_VERSION
    || !Number.isSafeInteger(value.revision) || value.revision < 0
    || booleanFields.some(key => typeof value[key] !== 'boolean')
    || !validCollection(value.parcels, PARCEL_IDS) || !validCollection(value.beacons, BEACON_IDS)) return false;
  if ((!value.started && value.courierAccepted)
    || (!value.courierAccepted && value.parcels.length)
    || (value.courierComplete && value.parcels.length !== PARCEL_IDS.length)
    || (value.bridgeAccepted && !value.courierComplete)
    || (value.bridgeRepaired && !value.bridgeAccepted)
    || (value.bridgeComplete && !value.bridgeRepaired)
    || (value.ridgeAccepted && !value.bridgeComplete)
    || (value.beacons.length && !value.ridgeAccepted)
    || (value.reportDelivered && value.beacons.length !== BEACON_IDS.length)) return false;
  // Every accepted action advances exactly once. This also catches partial or
  // internally contradictory saves without inferring missing quest progress.
  const actions = booleanFields.reduce((count, key) => count + Number(value[key]), 0)
    + value.parcels.length + value.beacons.length;
  return value.revision === actions;
}

export function createJourney({ inventory, weapons, onEvent = () => {} } = {}) {
  let state = emptyState();

  function snapshot() {
    return { ...state, parcels: [...state.parcels], beacons: [...state.beacons] };
  }

  function stage() {
    if (!state.started) return 'not-started';
    if (!state.courierAccepted) return 'meet-courier';
    if (state.parcels.length < PARCEL_IDS.length) return 'recover-parcels';
    if (!state.courierComplete) return 'return-courier';
    if (!state.bridgeAccepted) return 'meet-crossing-keeper';
    if (!state.bridgeRepaired) return 'repair-bridge';
    if (!state.bridgeComplete) return 'return-crossing-keeper';
    if (!state.ridgeAccepted) return 'meet-ridge-keeper';
    if (state.beacons.length < BEACON_IDS.length) return 'restore-beacons';
    if (!state.reportDelivered) return 'deliver-report';
    return 'complete';
  }

  function view() {
    const current = stage();
    const views = {
      'not-started': [2, 0, 0, 'Beyond the first shore', 'Finish Eren’s road lessons and carry Mara’s message to the far edge of Eastreena.', ['border']],
      'meet-courier': [2, 1, 1, 'Report for field service', 'Bring Mara’s letter to Corvan, the Ambroni Legion quartermaster beside the meadow road. Press F to report.', ['meadow-courier']],
      'recover-parcels': [2, 2, 2, 'Your first army assignment', `Recover the three army supply parcels scattered by the goblin attack. ${state.parcels.length} of 3 recovered. Press F beside each parcel.`, PARCEL_IDS.filter(id => !state.parcels.includes(id))],
      'return-courier': [2, 3, 3, 'Supplies for the campaign', 'Report to Corvan with the recovered supplies. Your Legion service continues toward the Caloss; two cooked fish will provision the march.', ['meadow-courier']],
      'meet-crossing-keeper': [3, 4, 1, 'The army’s crossing', 'Corvan’s next assignment is the Reedwater supply route, where the Caloss marks Drent’s edge. Speak with Hollis beside the boardwalk.', ['crossing-keeper']],
      'repair-bridge': [3, 5, 2, 'A road above the water', 'Gather three forest sticks along the wetland paths, then press F at the damaged crossing to lash down fresh rails and decking.', ['bridge-repair']],
      'return-crossing-keeper': [3, 6, 3, 'Whose road is this?', 'Report the finished repair to Hollis. The bridge serves the army, but the people crossing it have their own account of the rebels.', ['crossing-keeper']],
      'meet-ridge-keeper': [4, 7, 1, 'Voices on the rise', 'Cross the Caloss and continue your route assignment up Threefold Rise, on the Luscia side. Speak with Sava about the markers and the people the Empire calls rebels.', ['ridge-keeper']],
      'restore-beacons': [4, 8, 2, 'Three markers on the rise', `Straighten the three leaning waymarkers along the hill paths. ${state.beacons.length} of 3 restored. Press F at a marker to set it upright and uncover its reflective face. No fuel is needed.`, BEACON_IDS.filter(id => !state.beacons.includes(id))],
      'deliver-report': [4, 9, 3, 'An uncomfortable report', 'Show Mara’s original letter to Iven at the imperial relay, and report what Sava revealed about the battle at the Lauvel and the people the Empire calls rebels.', ['relay-clerk']],
      complete: [4, 10, 3, 'Service, and its cost', 'Iven has copied Mara’s warning and recorded the people’s account. The Ambroni Empire still employs you; most people here wanted the republic it calls rebellion. Between a failing empire and goblin raids from the north, who will your service protect? The road on into Luscia is the next chapter.', []],
    };
    const [region, step, regionStep, title, detail, destinations] = views[current];
    return {
      region, regionName: JOURNEY_REGIONS[region].name, questTitle: JOURNEY_REGIONS[region].title,
      stage: current, step, regionStep, title, detail, complete: state.reportDelivered,
      objectiveId: destinations[0] ?? null, destinationIds: [...destinations],
    };
  }

  function availableActions() {
    switch (stage()) {
      case 'meet-courier': return [action('meet-courier', 'Report to the army quartermaster', 'meadow-courier')];
      case 'recover-parcels': return PARCEL_IDS.filter(id => !state.parcels.includes(id))
        .map(id => action(`collect-${id}`, 'Recover parcel', id));
      case 'return-courier': return [action('return-courier', 'Return the three parcels', 'meadow-courier')];
      case 'meet-crossing-keeper': return [action('meet-crossing-keeper', 'Ask about the damaged crossing', 'crossing-keeper')];
      case 'repair-bridge': return [action('repair-bridge', 'Repair the crossing · 3 sticks', 'bridge-repair',
        (inventory?.count?.('forest-stick') ?? 0) < 3 ? 'Gather three sticks to repair the crossing.' : '')];
      case 'return-crossing-keeper': return [action('return-crossing-keeper', 'Report the finished repair', 'crossing-keeper')];
      case 'meet-ridge-keeper': return [action('meet-ridge-keeper', 'Ask about the hillside markers', 'ridge-keeper')];
      case 'restore-beacons': return BEACON_IDS.filter(id => !state.beacons.includes(id))
        .map(id => action(`restore-${id}`, 'Restore waymarker', id));
      case 'deliver-report': return [action('deliver-report', 'Show Mara’s message', 'relay-clerk',
        inventory?.has?.('harbor-letter') ? '' : 'Bring Mara’s message in your satchel before speaking to Iven.')];
      default: return [];
    }
  }

  function emit(actionId, detail = {}) {
    state.revision++;
    const current = view();
    const event = { type: 'journey-progress', sequence: state.revision, actionId,
      region: current.region, stage: current.stage, ...detail };
    onEvent(event);
    return { ok: true, reason: '', ...event };
  }

  function start() {
    if (state.started) return fail('The journey beyond Eastreena has already begun.');
    if (!inventory?.has?.('harbor-letter') || !inventory?.has?.('road-token'))
      return fail('Carry Mara’s message and Eren’s travel token before leaving Eastreena.');
    state.started = true;
    return emit('start-journey');
  }

  function act(actionId) {
    const choice = availableActions().find(candidate => candidate.id === actionId);
    if (!choice) return fail(state.reportDelivered ? 'These local errands are complete. The onward road is still being prepared.'
      : !state.started ? 'Finish the first shore and begin the road beyond Eastreena.'
        : `Your current task: ${view().detail}`);
    if (!choice.enabled) return fail(choice.reason);
    let reward = null, completedRegion = null;
    if (actionId === 'meet-courier') state.courierAccepted = true;
    else if (actionId.startsWith('collect-')) state.parcels.push(choice.objectiveId);
    else if (actionId === 'return-courier') {
      if (!inventory?.add?.('cooked-fish', 2)) return fail('The courier could not add the food to your satchel. Your parcels are kept; speak again.');
      state.courierComplete = true; reward = { id: 'cooked-fish', quantity: 2 }; completedRegion = 2;
    } else if (actionId === 'meet-crossing-keeper') state.bridgeAccepted = true;
    else if (actionId === 'repair-bridge') {
      // The weapon controller preserves condition on a partly used branch when
      // spare branches are spent. Never remove weapon stacks behind its back.
      if (!weapons?.spendSticks?.(3)) return fail('Three sticks could not be used for the repair. Check your satchel and try again.');
      state.bridgeRepaired = true;
    } else if (actionId === 'return-crossing-keeper') {
      if (!inventory?.add?.('forest-stick', 4)) return fail('The keeper could not add the wood to your satchel. Your repair is remembered; speak again.');
      state.bridgeComplete = true; reward = { id: 'forest-stick', quantity: 4 }; completedRegion = 3;
    } else if (actionId === 'meet-ridge-keeper') state.ridgeAccepted = true;
    else if (actionId.startsWith('restore-')) state.beacons.push(choice.objectiveId);
    else if (actionId === 'deliver-report') { state.reportDelivered = true; completedRegion = 4; }
    return emit(actionId, { objectiveId: choice.objectiveId, reward, completedRegion });
  }

  function restore(data) {
    if (!validateSnapshot(data)) return false;
    // Do not retain caller-owned arrays or arbitrary fields from stored JSON.
    state = { version: JOURNEY_VERSION, revision: data.revision,
      ...Object.fromEntries(booleanFields.map(key => [key, data[key]])),
      parcels: [...data.parcels], beacons: [...data.beacons] };
    return true;
  }

  return {
    start, act, view, availableActions, snapshot, restore,
    get state() { return { ...snapshot(), stage: stage(), complete: state.reportDelivered,
      completedRegions: [state.courierComplete ? 2 : null, state.bridgeComplete ? 3 : null, state.reportDelivered ? 4 : null].filter(Boolean) }; },
  };
}
