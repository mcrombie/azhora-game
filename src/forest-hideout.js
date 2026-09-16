/** An optional, contained fight for Tidehaven's stolen supplies. */
export const FOREST_HIDEOUT_QUEST = Object.freeze({
  id: 'forest-hideout', siteId: 'bramble-scout-camp', name: 'Bramble Scout Camp',
  approach: Object.freeze({ x: -129, z: -16 }),
  supplies: Object.freeze({ id: 'forest-hideout-supplies', x: -143, z: -41 }),
  recipientId: 'forest-woodcutter', minimumQuestStage: 5,
  reward: Object.freeze({ id: 'pawpaw', quantity: 3 }),
  encounter: Object.freeze({ id: 'forest-hideout', center: Object.freeze({ x: -138, z: -31 }),
    checkpoint: Object.freeze({ x: -129, z: -16 }), retreatAxis: 'x', retreatLine: -121,
    enemies: Object.freeze([
      Object.freeze({ id: 'forest-scout-west', x: -141, z: -28, hp: 65, entry: .2 }),
      Object.freeze({ id: 'forest-scout-east', x: -144, z: -34, hp: 65, entry: 1.4 }),
    ]),
  }),
});

const flags = ['inspected', 'accepted', 'cleared', 'recovered', 'returned'];
const initial = () => ({ version: 1, revision: 0, inspected: false, accepted: false,
  cleared: false, recovered: false, returned: false });
const fail = reason => ({ ok: false, changed: false, reason });
const readyForFight = questStage => Number.isSafeInteger(questStage)
  && questStage >= FOREST_HIDEOUT_QUEST.minimumQuestStage;
const action = (id, label, siteId, reason = '') => ({ id, label, siteId, objectiveId: siteId,
  enabled: !reason, reason });

/** Missing optional data is a valid older save; present corrupt data is not. */
export function validateForestHideoutSnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== 1
    || !Number.isSafeInteger(data.revision) || data.revision < 0
    || flags.some(key => typeof data[key] !== 'boolean')) return false;
  for (let i = 1; i < flags.length; i++) if (data[flags[i]] && !data[flags[i - 1]]) return false;
  return data.revision === flags.reduce((count, key) => count + Number(data[key]), 0);
}

export function createForestHideoutQuest({ inventory, onEvent = () => {} } = {}) {
  let state = initial();
  // A fight is a runtime state, never a resumable battle hidden in a checkpoint.
  let active = false;
  const snapshot = () => ({ ...state });
  function stage() {
    if (state.returned) return 'complete';
    if (state.recovered) return 'return-supplies';
    if (state.cleared) return 'recover-supplies';
    if (active) return 'fighting';
    if (state.accepted) return 'ready-to-retry';
    return state.inspected ? 'observed' : 'undiscovered';
  }
  function view() {
    const current = stage();
    const text = {
      undiscovered: ['A trail off the Greenway', 'Blue scraps of cloth mark a side trail in the eastern woods.', []],
      observed: ['Supplies beyond the brambles', 'Two goblins guard sacks stolen from Tidehaven. This is an optional fight: inspect the camp and choose whether to challenge them.', ['bramble-scout-camp']],
      'ready-to-retry': ['The supplies can wait', 'You left the camp before the job was done. Return to the approach when you want to challenge the two goblins again.', ['bramble-scout-camp']],
      fighting: ['Drive the scouts from their camp', 'Defeat the two goblins. Watch their attack tells and dodge into space; retreat toward the Greenway if you need to recover.', ['bramble-scout-camp']],
      'recover-supplies': ['Bring the supplies out', 'The scouts are gone. Press F beside the stolen sacks at the far side of the camp to recover Tidehaven’s supplies.', ['forest-hideout-supplies']],
      'return-supplies': ['A pantry worth protecting', 'Bring the recovered village supplies to Tamsin at Tidehaven’s northwestern edge. They are tracked here in your journal, not as a satchel item.', ['forest-woodcutter']],
      complete: ['Back where they belong', 'Tamsin has returned the food and rope to the village. She shared three ripe pawpaws, and remembers who brought the supplies home.', []],
    };
    const [title, detail, destinations] = text[current];
    return { optional: true, title, detail, stage: current, active,
      discovered: state.inspected, complete: state.returned, suppliesCarried: state.recovered && !state.returned,
      destinationIds: [...destinations], objectiveId: destinations[0] ?? null,
      task: state.accepted ? { title, detail, optional: true, complete: state.returned,
        destinationIds: [...destinations], objectiveId: destinations[0] ?? null } : null };
  }

  function emit(actionId, message, extra = {}) {
    state.revision++;
    const event = { type: 'forest-hideout-progress', actionId, sequence: state.revision,
      encounterId: FOREST_HIDEOUT_QUEST.id, optional: true, message, reward: null, ...extra };
    onEvent(event);
    return { ok: true, changed: true, reason: '', ...event };
  }

  function inspect() {
    if (state.inspected) return { ok: true, changed: false, reason: '' };
    state.inspected = true;
    return emit('inspect-hideout', 'You found the Bramble Scout Camp. The fight is optional.');
  }

  function begin({ questStage = 0 } = {}) {
    if (!readyForFight(questStage)) return fail('Finish the first three-goblin fight on the Greenway before challenging this camp.');
    if (!state.inspected) return fail('Inspect the camp from its approach before choosing to fight.');
    if (state.cleared) return fail('The scouts have already been driven away.');
    if (active) return fail('The camp encounter is already underway.');
    active = true;
    if (!state.accepted) {
      state.accepted = true;
      return { ...emit('challenge-hideout', 'You chose to recover Tidehaven’s stolen supplies.'), startEncounter: true };
    }
    // Retrying grants nothing and does not manufacture extra save revisions.
    return { ok: true, changed: false, reason: '', startEncounter: true,
      encounterId: FOREST_HIDEOUT_QUEST.id, message: 'You return to challenge the two scouts.' };
  }

  /** Called by the host only after the matching combat victory event. */
  function markCleared(encounterId) {
    if (encounterId !== FOREST_HIDEOUT_QUEST.id || !active || !state.accepted || state.cleared)
      return fail('There is no matching active hideout encounter to complete.');
    active = false; state.cleared = true;
    return emit('clear-hideout', 'The camp is quiet. Recover the stolen sacks before returning to Tamsin.');
  }

  /** Retreat, defeat, or a failed combat start leave the accepted errand intact. */
  function endEncounter(encounterId) {
    if (encounterId !== FOREST_HIDEOUT_QUEST.id || !active) return fail('There is no matching active hideout encounter.');
    active = false;
    return { ok: true, changed: false, reason: '', encounterId, message: 'The supplies remain in the camp. Return when you are ready.' };
  }

  function recover() {
    if (!state.cleared || active) return fail('Drive the two scouts away before lifting the village supplies.');
    if (state.recovered) return fail('You have already recovered these supplies.');
    state.recovered = true;
    return emit('recover-hideout-supplies', 'Village supplies secured. Return them to Tamsin; your journal keeps track of the bundle.');
  }

  function turnIn() {
    if (!state.recovered) return fail('Recover the stolen sacks from the cleared camp before returning to Tamsin.');
    if (state.returned) return fail('Tamsin has already received these supplies and shared her thanks.');
    const { id, quantity } = FOREST_HIDEOUT_QUEST.reward;
    if (!inventory?.add?.(id, quantity)) return fail('Tamsin could not put the pawpaws in your satchel. You still have the supplies; speak again.');
    state.returned = true;
    return emit('return-hideout-supplies', 'The village has its supplies again. Tamsin shared three ripe pawpaws.', { reward: { id, quantity } });
  }

  function availableActions(siteId, { questStage = 0 } = {}) {
    const result = [action('inspect-hideout', state.inspected ? 'Look over the camp again' : 'Inspect the goblin camp', 'bramble-scout-camp')];
    if (state.inspected && !state.cleared && !active) result.push(action('challenge-hideout',
      state.accepted ? 'Challenge the two scouts again' : 'Challenge the two scouts · optional fight', 'bramble-scout-camp',
      readyForFight(questStage) ? '' : 'Finish the first three-goblin fight on the Greenway first.'));
    if (state.cleared && !state.recovered) result.push(action('recover-hideout-supplies', 'Lift the stolen village supplies', 'forest-hideout-supplies'));
    if (state.recovered && !state.returned) result.push(action('return-hideout-supplies', 'Return the supplies · accept 3 pawpaws', 'forest-woodcutter'));
    return siteId === undefined ? result : result.filter(option => option.siteId === siteId);
  }

  function act(actionId, options = {}) {
    if (actionId === 'inspect-hideout') return inspect();
    if (actionId === 'challenge-hideout') return begin(options);
    if (actionId === 'recover-hideout-supplies') return recover();
    if (actionId === 'return-hideout-supplies') return turnIn();
    // Combat success is deliberately absent from the public dialogue actions.
    return fail('That is not a woodland hideout action.');
  }

  function restore(data) {
    if (!validateForestHideoutSnapshot(data)) return false;
    state = data === undefined ? initial() : { version: 1, revision: data.revision,
      ...Object.fromEntries(flags.map(key => [key, data[key]])) };
    active = false;
    return true;
  }

  return { inspect, begin, markCleared, endEncounter, recover, turnIn, act, availableActions,
    view, snapshot, restore,
    get state() { return { ...snapshot(), active, stage: stage(), complete: state.returned }; } };
}

/** Call at the camp approach, outside the combat circle. */
export function hideoutConversation(context) {
  const { hideoutQuest, questStage = 0, openDialogue, closeDialogue, act } = context;
  act('inspect-hideout');
  const state = hideoutQuest.state;
  let lines;
  if (state.returned) lines = [
    'The little camp is deserted. The blue scraps still show the trail, but the sacks are back in Tidehaven and the lowered camp pennant hangs still.',
    'A small nuisance removed from the wood. The village will notice the food and rope more than it notices the quiet.',
  ];
  else if (state.recovered) lines = [
    'The scouts are gone, and you have secured the village supplies. The empty place beside the shelter marks what they took.',
    'Tamsin can see the food and rope back to the right households. The bundle is tracked in your woodland journal until you return it.',
  ];
  else if (state.cleared) lines = [
    'The two scouts have fled. Beyond the shelter are sacks and a crate marked with Tidehaven’s familiar knots and cord.',
    'Walk to the supplies at the far side of the camp and press F to lift them. Bring them to Tamsin at the village’s northwestern edge.',
  ];
  else lines = [
    'Two goblins have made a rough camp beyond the brambles. Among their scraps are village food sacks and a coil of sound rope. Blue scraps of cloth mark their route through the trees.',
    readyForFight(questStage)
      ? 'You can leave them unchallenged. If you choose to recover the supplies, prepare your weapon and food first, then challenge the two scouts. Watch their amber attack tells and leave yourself room to dodge. Retreat toward the Greenway if you need a rest.'
      : 'For now, keep your distance. Finish the first goblin fight on the Greenway and the village’s immediate business before choosing another battle. This camp is optional; its supplies can wait.',
  ];
  const choices = hideoutQuest.availableActions('bramble-scout-camp', { questStage })
    .filter(option => option.id !== 'inspect-hideout').map(option => ({ ...option,
      action: () => { closeDialogue(); act(option.id); } }));
  choices.push({ id: 'leave-hideout', label: state.cleared ? 'Back to the woods.' : 'Leave the camp unchallenged.', action: closeDialogue });
  openDialogue({ id: FOREST_HIDEOUT_QUEST.siteId, name: FOREST_HIDEOUT_QUEST.name, role: 'An optional woodland encounter' },
    lines, null, 'Back to the woods', { choices });
  return true;
}

/** Append these to Tamsin's existing choices; her original errand stays separate. */
export function hideoutTamsinChoices(npc, context) {
  if (npc?.id !== FOREST_HIDEOUT_QUEST.recipientId) return [];
  const { hideoutQuest, questStage = 0, openDialogue, closeDialogue, act, returnToNeighbor } = context;
  const state = hideoutQuest.state;
  if (!readyForFight(questStage) && !state.inspected) return [];
  const back = typeof returnToNeighbor === 'function' ? returnToNeighbor : closeDialogue;
  if (state.recovered && !state.returned) return [{ id: 'talk-hideout-return', label: 'I recovered the village supplies.', action: () => {
    openDialogue(npc, [
      'That is Lysa’s meal sack, and the rope Tobin was saving for the landing. We kept telling ourselves somebody had put them somewhere sensible. I suppose the goblins thought they had.',
      'Let me take these around the village. Have three ripe pawpaws for the road. A few full cupboards and one sound coil of rope make a better evening than you might think.',
    ], null, 'Return the supplies', { choices: [
      { id: 'return-hideout-supplies', label: 'Return the supplies · accept 3 pawpaws', action: () => { closeDialogue(); act('return-hideout-supplies'); } },
      { id: 'keep-hideout-supplies', label: 'I’ll bring them back in a moment.', action: back },
    ] });
  } }];
  if (state.returned) return [{ id: 'hideout-village-thanks', label: 'Did the supplies get back to everyone?', action: () => {
    openDialogue(npc, [
      'Every bit. Tobin inspected his rope as if you had brought a lost child home, and Lysa has stopped counting the empty space on her shelf.',
      'You brought something back instead of asking what else the village could spare. People remember that. I do.',
    ], null, 'Back to Tamsin', { onComplete: back });
  } }];
  return [{ id: 'ask-hideout-supplies', label: state.inspected ? 'Those scouts have village supplies.' : 'Have the goblins taken anything?', action: () => {
    const detail = state.cleared
      ? 'If the camp is clear, the sacks should be beside the shelter at its far edge. Lift them with F and bring them here; I will see they get home.'
      : 'I saw blue scraps on a little trail in the eastern woods, beyond the pond road. Look from the approach before you choose a fight. There are two scouts there, and no shame in coming back when you are ready.';
    openDialogue(npc, [
      'Food, good rope, the little things that turn a hard week into an impossible one. If you find our supplies, bring them here. I can share three ripe pawpaws, and get the rest back to the households that need it.', detail,
    ], null, 'Back to Tamsin', { onComplete: back });
  } }];
}
