/** Optional local lives along the road. This module never advances the main journey. */
export const REGIONAL_LIFE_NPCS = Object.freeze([
  Object.freeze({ id: 'commons-miller', name: 'Enna', role: 'Commons miller', modelRole: 'commons-miller', color: 0xa18452, x: -236, z: 62, region: 2 }),
  Object.freeze({ id: 'reed-worker', name: 'Merren', role: 'Reed worker and boatkeeper', modelRole: 'reed-worker', color: 0x5f8078, x: -380, z: 120, region: 3 }),
  Object.freeze({ id: 'shelter-keeper', name: 'Oda', role: 'Waystation shelter keeper', modelRole: 'shelter-keeper', color: 0x827b6d, x: -152, z: 322, region: 4 }),
]);

const site = (id, name, x, z, region, storyId, prompt, lines) => Object.freeze({
  id, name, x, z, region, storyId, prompt, lines: Object.freeze(lines),
});
export const REGIONAL_LIFE_SITES = Object.freeze([
  site('mill-commons', 'The Mill Commons', -238, 63, 2, 'village-share', 'Read the common mill tally', [
    "Household names run down the mill tally: Iria, Pell, the lower cottages. Each has a modest share beside it. Several names have been crossed through and their sacks added to a column headed Army requisition.",
    "The old figures are still readable. Whoever changed the tally has counted the grain carefully; the people waiting for it do not appear in the new total.",
  ]),
  site('mill-hoist', 'The Village Grain Hoist', -243, 67, 2, 'village-share', 'Lower the village grain basket', [
    "A grain basket hangs from the mill's short hoist. The rope is sound, but its weight holds the catch tight. A chalk mark on the basket reads Village share.",
    "Enna keeps the common mill. Ask before working the catch; this is somebody's supper, not an abandoned sack.",
  ]),
  site('landing-workshop', 'The Working Landing', -385, 124, 3, 'landing-nets', 'Look over the working landing', [
    "Reed mats dry beside a small working boat. A repaired basket, a wrapped blanket, and the scuffed edge of the landing suggest more than fish have passed this way.",
    "Two net floats are caught in tight knots just west of Merren's work place. Most of the net is sound. Patient hands would do more good here than a blade.",
  ]),
  site('net-float-west', 'Near Net Float', -389, 126, 3, 'landing-nets', 'Ease the near float knot free', [
    "A pale float has twisted back through its own line. The knot tightens whenever the wet net pulls. A little slack and a careful turn should free it.",
    "This is Merren's working net. Ask whether help is wanted before undoing a line that somebody depends on.",
  ]),
  site('net-float-east', 'Far Net Float', -392, 128, 3, 'landing-nets', 'Ease the far float knot free', [
    "The farther float is caught against a reed stem. Its line is doubled through a small, stubborn knot; the float itself is unbroken.",
    "There is no need to cut the cord. Merren can tell you which lines are holding the boat and which belong to the net.",
  ]),
  site('waystation-shelter', 'The Waystation Shelter', -156, 324, 4, 'shelter-account', 'Read the shelter notice', [
    "The old waystation has become a shelter. A notice offers water and a dry place to wait. It asks visitors to leave enough room for the next family.",
    "Beside the notice is a smaller line: Leave the families in peace. Oda keeps the shelter and has an account she wants carried to the relay.",
  ]),
  site('shelter-ledger', 'The Shelter Writing Board', -158, 326, 4, 'shelter-account', 'Record the shelter account', [
    "A dry writing board and an open book wait beneath the shelter. A strip of cloth holds the last page clear of the wind.",
    "Oda has left space for an account of the families arriving here. Ask her what needs setting down.",
  ]),
]);

const sites = new Map(REGIONAL_LIFE_SITES.map(item => [item.id, item]));
const npcIds = new Set(REGIONAL_LIFE_NPCS.map(npc => npc.id));
const flags = ['millAccepted', 'millLowered', 'millCompleted', 'netsAccepted', 'netWestFreed', 'netEastFreed',
  'netsCompleted', 'testimonyAccepted', 'testimonyDelivered'];
const schemaKeys = new Set(['version', 'revision', 'inspected', 'testimonyMode', ...flags]);
const emptyState = () => ({ version: 1, revision: 0, inspected: [], millAccepted: false, millLowered: false,
  millCompleted: false, netsAccepted: false, netWestFreed: false, netEastFreed: false, netsCompleted: false,
  testimonyAccepted: false, testimonyMode: null, testimonyDelivered: false });
const fail = reason => ({ ok: false, changed: false, reason });
const action = (id, label, siteId, region, storyId, reason = '') => ({ id, label, siteId, objectiveId: siteId,
  region, storyId, optional: true, enabled: !reason, reason });

/** Missing data belongs to an older save; present data must describe reachable progress exactly. */
export function validateRegionalLifeSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== 1
    || Object.keys(data).some(key => !schemaKeys.has(key))
    || !Number.isSafeInteger(data.revision) || data.revision < 0
    || flags.some(key => typeof data[key] !== 'boolean')
    || ![null, 'anonymous', 'signed'].includes(data.testimonyMode)
    || !Array.isArray(data.inspected) || data.inspected.length > sites.size
    || data.inspected.some(id => !sites.has(id)) || new Set(data.inspected).size !== data.inspected.length
    || (data.millLowered && !data.millAccepted) || (data.millCompleted && !data.millLowered)
    || ((data.netWestFreed || data.netEastFreed) && !data.netsAccepted)
    || (data.netsCompleted && (!data.netWestFreed || !data.netEastFreed))
    || (data.testimonyMode !== null && !data.testimonyAccepted)
    || (data.testimonyDelivered && data.testimonyMode === null)) return false;
  return data.revision === data.inspected.length + flags.reduce((sum, key) => sum + Number(data[key]), 0)
    + Number(data.testimonyMode !== null);
}

export function createRegionalLife({ inventory, onEvent = () => {} } = {}) {
  let state = emptyState();
  const snapshot = () => ({ ...state, inspected: [...state.inspected] });
  const stages = () => ({
    mill: state.millCompleted ? 'complete' : state.millLowered ? 'return-to-enna' : state.millAccepted ? 'lower-share' : 'not-started',
    nets: state.netsCompleted ? 'complete' : state.netWestFreed && state.netEastFreed ? 'return-to-merren' : state.netsAccepted ? 'free-floats' : 'not-started',
    testimony: state.testimonyDelivered ? 'complete' : state.testimonyMode ? 'take-to-iven' : state.testimonyAccepted ? 'record-account' : 'not-started',
  });

  function availableActions(siteId) {
    const list = REGIONAL_LIFE_SITES.map(item => action(`inspect-${item.id}`, item.prompt, item.id, item.region, item.storyId));
    if (!state.millAccepted) list.push(action('accept-mill-share', 'Help lower the village share', 'commons-miller', 2, 'village-share'));
    if (!state.millLowered) list.push(action('lower-mill-share', 'Ease the catch and lower the basket', 'mill-hoist', 2, 'village-share',
      state.millAccepted ? '' : 'Ask Enna at the commons before working the grain hoist.'));
    if (state.millLowered && !state.millCompleted) list.push(action('return-mill-share', 'Tell Enna the village share is down', 'commons-miller', 2, 'village-share'));
    if (!state.netsAccepted) list.push(action('accept-net-help', 'Help free the two net floats', 'reed-worker', 3, 'landing-nets'));
    for (const [id, flag, label] of [['net-float-west', 'netWestFreed', 'Ease the near knot free'], ['net-float-east', 'netEastFreed', 'Ease the far knot free']])
      if (!state[flag]) list.push(action(`free-${id}`, label, id, 3, 'landing-nets', state.netsAccepted ? '' : 'Ask Merren which lines need freeing first.'));
    if (state.netWestFreed && state.netEastFreed && !state.netsCompleted)
      list.push(action('return-net-help', 'Tell Merren the net is free - accept 2 raw fish', 'reed-worker', 3, 'landing-nets'));
    if (!state.testimonyAccepted) list.push(action('accept-witness-account', 'Carry an account from the shelter', 'shelter-keeper', 4, 'shelter-account'));
    if (!state.testimonyMode) {
      const reason = state.testimonyAccepted ? '' : 'Ask Oda for her account before writing at the board.';
      list.push(action('record-testimony-anonymous', 'Leave the account unsigned', 'shelter-ledger', 4, 'shelter-account', reason));
      list.push(action('record-testimony-signed', "Sign with Oda's name", 'shelter-ledger', 4, 'shelter-account', reason));
    }
    if (state.testimonyMode && !state.testimonyDelivered) list.push(action('deliver-testimony', state.testimonyMode === 'signed'
      ? 'Leave the signed account with Iven' : 'Leave the unsigned account with Iven', 'relay-clerk', 4, 'shelter-account'));
    return siteId === undefined ? list : list.filter(option => option.siteId === siteId);
  }

  function act(actionId) {
    const selected = availableActions().find(option => option.id === actionId);
    if (!selected) return fail('That local task is not ready, or has already been completed.');
    if (!selected.enabled) return fail(selected.reason);
    let message = '', reward = null;
    if (actionId.startsWith('inspect-')) {
      if (state.inspected.includes(selected.siteId)) return { ok: true, changed: false, reason: '', siteId: selected.siteId };
      state.inspected.push(selected.siteId); message = `${sites.get(selected.siteId).name} added to your road notes.`;
    } else if (actionId === 'accept-mill-share') {
      state.millAccepted = true; message = 'Enna asked for a hand at the hoist beside the commons. The grain stays with the village.';
    } else if (actionId === 'lower-mill-share') {
      state.millLowered = true; message = 'The grain basket is down. Let Enna know the village share is ready.';
    } else if (actionId === 'return-mill-share') {
      state.millCompleted = true; message = 'Enna will see the grain to its households. She remembers your help.';
    } else if (actionId === 'accept-net-help') {
      state.netsAccepted = true; message = 'Merren needs two float knots freed beside the landing. Either knot can be done first.';
    } else if (actionId === 'free-net-float-west' || actionId === 'free-net-float-east') {
      state[actionId === 'free-net-float-west' ? 'netWestFreed' : 'netEastFreed'] = true;
      message = state.netWestFreed && state.netEastFreed ? 'Both floats are free. Tell Merren the net is ready.' : 'One float is free. The other knot is just along the landing.';
    } else if (actionId === 'return-net-help') {
      if (!inventory?.add?.('raw-fish', 2)) return fail('Merren could not put the fish in your satchel. Your help is remembered; ask again for the two fish.');
      state.netsCompleted = true; reward = { id: 'raw-fish', quantity: 2 };
      message = 'Merren shared two raw fish. Cook them over a fire before eating.';
    } else if (actionId === 'accept-witness-account') {
      state.testimonyAccepted = true; message = "Record Oda's account at the shelter writing board. The families' names stay out.";
    } else if (actionId === 'record-testimony-anonymous' || actionId === 'record-testimony-signed') {
      state.testimonyMode = actionId === 'record-testimony-signed' ? 'signed' : 'anonymous';
      message = state.testimonyMode === 'signed' ? "Oda's signed account is ready for Iven at the North Relay."
        : 'The unsigned shelter account is ready for Iven at the North Relay.';
    } else if (actionId === 'deliver-testimony') {
      state.testimonyDelivered = true; message = state.testimonyMode === 'signed'
        ? "Iven filed Oda's signed account on its own page. The families' names were left out."
        : 'Iven filed the unsigned account on its own page. The families remain unnamed.';
    }
    state.revision++;
    const event = { type: 'regional-life-progress', sequence: state.revision, actionId, siteId: selected.siteId,
      region: selected.region, storyId: selected.storyId, message, reward, optional: true };
    onEvent(event);
    return { ok: true, changed: true, reason: '', ...event };
  }

  function view() {
    const task = (storyId, region, title, detail, destinationIds, complete) => ({ storyId, id: storyId, region,
      title, detail, destinationIds: [...destinationIds], objectiveId: destinationIds[0] || null, complete, optional: true });
    const tasks = [];
    if (state.millAccepted) tasks.push(task('village-share', 2, state.millCompleted ? 'A share back with its people' : 'The village share',
      state.millCompleted ? 'Enna has the village grain ready for its households, and remembers who helped lower it.'
        : state.millLowered ? 'Tell Enna beside the commons that the basket is safely down. The grain belongs to the village.'
          : 'Work the hoist beside Enna to lower the village grain basket. This is a helping hand, without a promised item reward.',
      state.millCompleted ? [] : state.millLowered ? ['commons-miller'] : ['mill-hoist'], state.millCompleted));
    if (state.netsAccepted) tasks.push(task('landing-nets', 3, state.netsCompleted ? 'A working net again' : 'Two patient knots',
      state.netsCompleted ? 'Merren has her net back in working order and shared two raw fish for your cooking fire.'
        : state.netWestFreed && state.netEastFreed ? 'Both floats are free. Return to Merren for two raw fish; they need cooking before eating.'
          : 'Ease the two float knots free just west of Merren. Either can be done first; no tool or material is spent.',
      state.netsCompleted ? [] : state.netWestFreed && state.netEastFreed ? ['reed-worker']
        : [...(!state.netWestFreed ? ['net-float-west'] : []), ...(!state.netEastFreed ? ['net-float-east'] : [])], state.netsCompleted));
    if (state.testimonyAccepted) tasks.push(task('shelter-account', 4, state.testimonyDelivered ? 'An account kept on record' : 'An account from the shelter',
      state.testimonyDelivered ? state.testimonyMode === 'signed'
        ? "Iven filed Oda's signed account. The other households remain unnamed."
        : 'Iven filed the unsigned account. The households remain unnamed.'
        : state.testimonyMode ? `Bring the ${state.testimonyMode === 'signed' ? 'account bearing Oda\'s name' : 'unsigned account'} to Iven at the North Relay. Your journal keeps the copy.`
          : "Use the shelter writing board. Leave the account unsigned, or sign with Oda's offered name. Leave the families out.",
      state.testimonyDelivered ? [] : state.testimonyMode ? ['relay-clerk'] : ['shelter-ledger'], state.testimonyDelivered));
    const entries = [
      { id: 'village-share', region: 2, title: 'The common mill', detail: 'The commons tally still shows the households behind the grain. Army requisitions have crossed some of their shares into another column.',
        afterword: state.millCompleted ? 'Enna remembers your help. The village basket is down and ready for the households that depend on it.' : state.millLowered ? 'The basket is safely down. Enna is waiting beside the commons.' : '' },
      { id: 'landing-nets', region: 3, title: 'A landing for neighbors', detail: "Merren's working boat carries fish, food, and families. The neighbors an army notice calls rebels still mend lines and help one another here.",
        afterword: state.netsCompleted ? 'Both float knots are free; Merren shared two raw fish.' : state.netWestFreed || state.netEastFreed ? `${Number(state.netWestFreed) + Number(state.netEastFreed)} of two float knots freed.` : '' },
      { id: 'shelter-account', region: 4, title: 'The shelter account', detail: 'The shelter offers water and room to people caught between northern goblin attacks and imperial demands. Oda asks that an account reach the relay without exposing the households passing through.',
        afterword: state.testimonyMode ? `${state.testimonyMode === 'signed' ? "The account carries Oda's offered name" : 'The account is unsigned'}. ${state.testimonyDelivered ? 'Iven has filed the account.' : 'The account awaits delivery to Iven.'}` : '' },
    ].filter(entry => tasks.some(item => item.storyId === entry.id)
      || state.inspected.some(id => sites.get(id).storyId === entry.id));
    const knownIds = new Set(state.inspected);
    for (const item of tasks) for (const id of item.destinationIds) knownIds.add(id);
    if (state.millAccepted) ['mill-commons', 'commons-miller', 'mill-hoist'].forEach(id => knownIds.add(id));
    if (state.netsAccepted) ['landing-workshop', 'reed-worker', 'net-float-west', 'net-float-east'].forEach(id => knownIds.add(id));
    if (state.testimonyAccepted) ['waystation-shelter', 'shelter-keeper', 'shelter-ledger'].forEach(id => knownIds.add(id));
    if (state.testimonyMode) knownIds.add('relay-clerk');
    return { title: 'People along the road', optional: true, entries, tasks, knownIds: [...knownIds],
      completedCount: Number(state.millCompleted) + Number(state.netsCompleted) + Number(state.testimonyDelivered),
      inspectedCount: state.inspected.length, totalSites: sites.size };
  }

  function siteView(siteId) {
    const place = sites.get(siteId); if (!place) return null;
    let lines = [...place.lines];
    if (siteId === 'mill-hoist' && state.millLowered) lines = [
      'The basket rests on the lower platform. The catch is slack and the rope lies neatly beside it. Village share is still chalked on its side.',
      state.millCompleted ? 'Enna has the grain ready for its households. You have already done your part here.' : 'Enna is close by at the commons. Tell her the share is ready.',
    ];
    else if (siteId === 'mill-hoist' && state.millAccepted) lines[1] = 'Enna has asked you to ease the catch and lower this one basket. The hoist takes the weight; guide the rope until the basket rests on its platform.';
    if (['net-float-west', 'net-float-east'].includes(siteId)) {
      const freed = siteId === 'net-float-west' ? state.netWestFreed : state.netEastFreed;
      if (freed) lines = ['The float hangs clear of the knot. The cord is intact, ready for another day on the water.',
        state.netsCompleted ? 'Merren has already thanked you for the repaired net.' : state.netWestFreed && state.netEastFreed ? 'Both floats are free. Let Merren know the net is ready.' : 'One knot remains a few steps along the landing.'];
      else if (state.netsAccepted) lines[1] = 'Merren has shown you which line belongs to the net. Ease the loop back over the float without cutting the cord.';
    }
    if (siteId === 'shelter-ledger' && state.testimonyMode) lines = [
      state.testimonyMode === 'signed' ? "The book is covered against the damp. Oda's name stands beneath her account. The families are not named."
        : 'The book is covered against the damp. The account is unsigned, and the families are not named.',
      state.testimonyDelivered ? 'Iven has filed the account at the relay.' : 'The copy is tucked into your journal. Iven waits at the North Relay.',
    ];
    else if (siteId === 'shelter-ledger' && state.testimonyAccepted) lines = [
      'Oda describes families driven south by goblins, then made to surrender grain and shelter to the Ambroni levy. The households still support the republic the rebels declared, and one another.',
      "The account is ready to copy. Oda offered her own name if a witness was needed. You can leave it unsigned instead; the families stay out of either version.",
    ];
    return { id: place.id, name: place.name, x: place.x, z: place.z, region: place.region, storyId: place.storyId,
      prompt: place.prompt, lines, inspected: state.inspected.includes(siteId), actions: availableActions(siteId) };
  }

  function restore(data) {
    if (!validateRegionalLifeSnapshot(data)) return false;
    state = data === undefined ? emptyState() : { version: 1, revision: data.revision, inspected: [...data.inspected],
      ...Object.fromEntries(flags.map(key => [key, data[key]])), testimonyMode: data.testimonyMode };
    return true;
  }
  return { act, view, siteView, availableActions, snapshot, restore,
    get state() { return { ...snapshot(), testimonyRecorded: state.testimonyMode !== null, stages: stages() }; } };
}

const asChoices = (options, context) => options.map(option => ({ ...option,
  action: () => { context.closeDialogue(); context.act(option.id); } }));

export function regionalLifeConversation(npc, context) {
  if (!npcIds.has(npc?.id)) return false;
  const { regionalLife, openDialogue, closeDialogue, act } = context;
  const state = regionalLife.state;
  const back = () => regionalLifeConversation(npc, context);
  const choices = asChoices(regionalLife.availableActions(npc.id), context);
  let lines;
  if (npc.id === 'commons-miller') {
    lines = state.millCompleted ? [
      "There you are. The village share is down, and I have stopped having to say nearly to everybody who asks. You made an ordinary evening possible. I will remember that.",
      "No purse of coins hidden in the flour, I'm afraid. But you can stand in this yard without somebody wondering what you have come to take.",
    ] : state.millLowered ? [
      'The catch is loose and the basket is down? Good. Let me know you have finished, and I can call the households waiting for their share.',
    ] : state.millAccepted ? [
      'The short hoist is just south of me, beside the mill. Ease the catch and guide the basket down. One basket; the village share stays here.',
      'Then tell me it is ready. I have people waiting, and they have been patient long enough.',
    ] : [
      "Enna. I mind the commons mill. Everyone puts in a little work, and everyone gets a share. Lately the army's share keeps arriving before everyone else.",
      'Could you help lower the village basket from the hoist beside us? I have no payment to offer. It would just mean the people waiting here get their grain before dark. Ask me when you are ready, and leave the rest of the stores alone.',
    ];
    choices.push({ id: 'enna-tally', label: 'Whose grain is on that tally?', action: () => {
      act('inspect-mill-commons'); openDialogue(npc, [
        ...regionalLife.siteView('mill-commons').lines,
        'Those are the households that ground it. The quartermaster has orders, and I have a queue. I would like somebody making the orders to see the queue.',
      ], null, 'Back to Enna', { onComplete: back });
    } });
  } else if (npc.id === 'reed-worker') {
    lines = state.netsCompleted ? [
      'My patient pair of hands. Both floats are free, and the net is working again. The two fish were yours; I hope you found a fire for them.',
      'People keep asking who keeps this landing open. A better question is who has ever used it without somebody else holding the rope.',
    ] : state.netWestFreed && state.netEastFreed ? [
      'Both knots clear, and no cord cut. That saves me a length I could not easily replace. Tell me the net is ready and take two raw fish for the work.',
      'Cook them before you eat them. A fire ring, two branches, and a tinderbox will serve you better than trying to swallow a favor raw.',
    ] : state.netsAccepted ? [
      `${Number(state.netWestFreed) + Number(state.netEastFreed)} of two floats free. The near and far knots are just west of my work place. Either can be done first; give the loop slack before you turn it.`,
    ] : [
      'Merren. Reeds, nets, boat repairs, whatever the river has made urgent today. Today it has managed two knots in a net that was perfectly polite yesterday.',
      'Would you ease the two float knots free, just west of me? No blade needed; I will show you the net line. I can share two raw fish when both are clear. They will need cooking.',
    ];
    choices.push({ id: 'merren-crossings', label: 'Who uses your boat?', action: () => {
      act('inspect-landing-workshop'); openDialogue(npc, [
        'Fish in the morning, reed bundles after that. Sometimes a family needs the short bank passage, or a basket needs to reach a neighbor. There is rarely a day when the boat is only mine.',
        'Most households here help the people your army calls rebels. I know them as neighbors who mend a net, mind a child, or bring food when a roof leaks. The notices make them sound much farther away.',
        'Goblins press from the north. Imperial collectors arrive from the road. We still have to get one another through the day between them.',
      ], null, 'Back to Merren', { onComplete: back });
    } });
  } else {
    lines = state.testimonyDelivered ? [
      state.testimonyMode === 'signed' ? 'Under my own name? Good. Those were things I saw, and I can stand by them. Thank you for leaving the families out.'
        : 'Unsigned? Good. Let them read what happened here without sending another stranger to somebody\'s door.',
      'The shelter is still needed. A report does not mend a roof or stop an army, but at least those families have not been written out of the story altogether.',
    ] : state.testimonyMode ? [
      state.testimonyMode === 'signed' ? 'My name is on it, then. I would like somebody at the relay to listen.'
        : 'No names, then. The account can stand on what happened.',
      'Iven is up at the North Relay. Keep the copy dry. The rain has already had quite enough of our records.',
    ] : state.testimonyAccepted ? [
      'The writing board is under the shelter, a few steps west. Set down the goblin attacks and the grain the levy takes from people already driven from home.',
      'Use the name I offered, or leave it unsigned. Just leave the families out.',
    ] : [
      'I am Oda. This waystation used to shelter loads. Now it shelters the people whose loads have been taken. We keep water ready and make room where we can.',
      'Would you carry a short account to Iven at the relay? Set it down at the board here. Use my name if it needs a witness. Leave the families out; they have enough to fear. An unsigned account will do, too.',
    ];
    choices.push({ id: 'oda-shelter', label: 'What are the families fleeing?', action: () => {
      act('inspect-waystation-shelter'); openDialogue(npc, [
        'Northern goblin attacks, and then the imperial levies along the road. People reach us having escaped one demand only to meet another. A dry blanket is useful whichever direction they came from.',
        "The republic the Lauvel valleys declared is what most people here wanted, though the Empire calls its defenders rebels. That word does not tell you who carried a neighbor to shelter or whose grain kept a family alive.",
        'The shelter is not large enough to wait for a winner. People need water now.',
      ], null, 'Back to Oda', { onComplete: back });
    } });
  }
  choices.push({ id: 'leave-regional-neighbor', label: `Take care, ${npc.name}.`, action: closeDialogue });
  openDialogue(npc, lines, null, 'Back to the road', { choices });
  return true;
}

/** Inspection and deliberate acts share the host's normal paged dialogue UI. */
export function regionalLifeSiteConversation(siteId, context) {
  const { regionalLife, openDialogue, closeDialogue, act } = context;
  if (!regionalLife.siteView(siteId)) return false;
  act(`inspect-${siteId}`);
  const place = regionalLife.siteView(siteId);
  const choices = asChoices(place.actions.filter(option => !option.id.startsWith('inspect-')), context);
  choices.push({ id: `leave-${siteId}`, label: 'Back to the road.', action: closeDialogue });
  openDialogue({ id: siteId, name: place.name, role: 'A local life along the road' }, place.lines, null, 'Back to the road', { choices });
  return true;
}

/** Extra choices for Iven; his ordered main-story dialogue remains owned by the host. */
export function regionalLifeRelayChoices(npc, context) {
  if (npc?.id !== 'relay-clerk') return [];
  const { regionalLife, openDialogue, closeDialogue, act, returnToNeighbor } = context;
  const state = regionalLife.state;
  if (!state.testimonyMode) return [];
  const back = typeof returnToNeighbor === 'function' ? returnToNeighbor : closeDialogue;
  if (state.testimonyDelivered) return [{ id: 'relay-witness-receipt', label: 'Was the shelter account kept as agreed?', action: () => {
    openDialogue(npc, [state.testimonyMode === 'signed'
      ? "Oda's name is on it, just as she asked. No family roll tucked underneath."
      : 'Unsigned, as requested. The account says what was done here; it does not point to somebody\'s door.',
    'It has its own page among the field reports. Grain taken, roofs lost, families on the road. I will keep it dry.',
    ], null, 'Back to Iven', { onComplete: back });
  } }];
  return [{ id: 'relay-witness-account', label: 'I have an account from the waystation shelter.', action: () => {
    openDialogue(npc, [state.testimonyMode === 'signed'
      ? "Oda offered her name? I know the shelter. Leave it with me; I will enter her account as she gave it."
      : 'An unsigned account. There is enough here to record what happened. I will leave the names out.',
    'A separate page, beside the field returns. Some of this will make uncomfortable reading. That is no reason to lose it.',
    ], null, 'File the witness account', { choices: [
      ...asChoices(regionalLife.availableActions('relay-clerk'), context),
      { id: 'keep-witness-account', label: 'Let me hold on to it a little longer.', action: back },
    ] });
  } }];
}
