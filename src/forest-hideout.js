/** An optional, contained fight for Lumber Town's stolen stores, at a goblin camp in north Luscia. Drent, a level 0 province, has none. */
export const FOREST_HIDEOUT_QUEST = Object.freeze({
  id: 'forest-hideout', siteId: 'bramble-scout-camp', name: 'Bramble Scout Camp',
  approach: Object.freeze({ x: -441, z: 145 }),
  supplies: Object.freeze({ id: 'forest-hideout-supplies', x: -466, z: 159 }),
  recipientId: 'garrison-captain', informantId: 'garrison-casso', minimumQuestStage: 10,
  reward: Object.freeze({ id: 'copper-piece', quantity: 30 }),
  encounter: Object.freeze({ id: 'forest-hideout', center: Object.freeze({ x: -456, z: 154 }),
    checkpoint: Object.freeze({ x: -441, z: 145 }), retreatAxis: 'x', retreatLine: -433,
    enemies: Object.freeze([
      Object.freeze({ id: 'forest-scout-west', x: -453, z: 157, hp: 65, entry: .2 }),
      Object.freeze({ id: 'forest-scout-east', x: -459, z: 160, hp: 65, entry: 1.4 }),
    ]),
  }),
});

/**
 * Lumber Town's garrison. Legionary Casso tells a hired sword about the camp; Captain Varo
 * and his two men march with the traveler and fight beside them once the traveler says so.
 */
export const HIDEOUT_GARRISON = Object.freeze([
  Object.freeze({ id: 'garrison-captain', name: 'Captain Decimus Varo', role: 'Captain of the Lumber Town garrison', modelRole: 'legion-officer', color: 0x832d2b, kind: 'officer' }),
  Object.freeze({ id: 'garrison-casso', name: 'Legionary Casso', role: 'Ambroni Legion soldier', modelRole: 'legion-soldier', color: 0x8f3b30, kind: 'legionary' }),
  Object.freeze({ id: 'garrison-brill', name: 'Legionary Brill', role: 'Ambroni Legion soldier', modelRole: 'legion-soldier', color: 0x8f3b30, kind: 'legionary' }),
]);

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
  // The garrison marching with the traveler is a moment, not a save: it ends with a reload.
  let escort = false;
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
      undiscovered: ['A trail off the Luscia road', 'Torn pennants mark a side trail west of the rise.', []],
      observed: ['Supplies beyond the brambles', 'Two goblins guard sacks stolen from Lumber Town. This is an optional fight: Captain Varo and his men will march with you if you ask, or you can go alone.', ['bramble-scout-camp']],
      'ready-to-retry': ['The supplies can wait', 'You left the camp before the job was done. Return to the approach when you want to challenge the two goblins again.', ['bramble-scout-camp']],
      fighting: ['Drive the scouts from their camp', 'Defeat the two goblins. Watch their attack tells and dodge into space; retreat east toward the road if you need to recover.', ['bramble-scout-camp']],
      'recover-supplies': ['Bring the supplies out', 'The scouts are gone. Press F beside the stolen sacks at the far side of the camp to recover Lumber Town’s stores.', ['forest-hideout-supplies']],
      'return-supplies': ['Stores worth a march', 'Bring the recovered stores to Captain Varo on Lumber Town’s square. They are tracked here in your journal, not as a satchel item.', ['garrison-captain']],
      complete: ['Back where they belong', 'Captain Varo has the grain, salt and rope back under lock. He paid thirty copper from the garrison chest and wrote your name in his report.', []],
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

  /** Casso's account marks the camp on the traveler's chart without a walk to it. */
  function hear() {
    if (state.inspected) return { ok: true, changed: false, reason: '' };
    state.inspected = true;
    return emit('hear-of-hideout', 'Legionary Casso told you of a goblin camp north of the rise. Captain Varo will march when you are ready.');
  }

  function march() {
    if (!state.inspected) return fail('Hear about the camp from the garrison first.');
    if (state.cleared) return fail('The camp is already broken.');
    if (active) return fail('The fight is already underway.');
    escort = true;
    return { ok: true, changed: false, reason: '', escort: true, message: 'Captain Varo, Casso and Brill fall in behind you. Lead them up the trail west of the rise.' };
  }

  function standDown() {
    escort = false;
    return { ok: true, changed: false, reason: '', escort: false, message: 'The garrison returns to the square.' };
  }

  function begin({ questStage = 0 } = {}) {
    if (!readyForFight(questStage)) return fail('Finish your business in Tidehaven before challenging this camp.');
    if (!state.inspected) return fail('Inspect the camp from its approach before choosing to fight.');
    if (state.cleared) return fail('The scouts have already been driven away.');
    if (active) return fail('The camp encounter is already underway.');
    active = true;
    if (!state.accepted) {
      state.accepted = true;
      return { ...emit('challenge-hideout', 'You chose to recover Lumber Town’s stolen stores.'), startEncounter: true };
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
    return emit('clear-hideout', 'The camp is quiet. Recover the stolen sacks before returning to Captain Varo.');
  }

  /** Retreat, defeat, or a failed combat start leave the accepted errand intact. */
  function endEncounter(encounterId) {
    if (encounterId !== FOREST_HIDEOUT_QUEST.id || !active) return fail('There is no matching active hideout encounter.');
    active = false;
    return { ok: true, changed: false, reason: '', encounterId, message: 'The supplies remain in the camp. Return when you are ready.' };
  }

  function recover() {
    if (!state.cleared || active) return fail('Drive the two scouts away before lifting the town’s stores.');
    if (state.recovered) return fail('You have already recovered these supplies.');
    state.recovered = true;
    return emit('recover-hideout-supplies', 'The town’s stores are secured. Return them to Captain Varo; your journal keeps track of the bundle.');
  }

  function turnIn() {
    if (!state.recovered) return fail('Recover the stolen sacks from the cleared camp before returning to Captain Varo.');
    if (state.returned) return fail('Captain Varo has already received these stores and paid for them.');
    const { id, quantity } = FOREST_HIDEOUT_QUEST.reward;
    if (!inventory?.add?.(id, quantity)) return fail('The Captain could not pay you. You still have the stores; speak again.');
    state.returned = true; escort = false;
    return emit('return-hideout-supplies', 'Lumber Town has its stores again. Captain Varo paid thirty copper.', { reward: { id, quantity } });
  }

  function availableActions(siteId, { questStage = 0 } = {}) {
    const result = [action('inspect-hideout', state.inspected ? 'Look over the camp again' : 'Inspect the goblin camp', 'bramble-scout-camp')];
    if (state.inspected && !state.cleared && !active) result.push(action('challenge-hideout',
      state.accepted ? 'Challenge the two scouts again' : 'Challenge the two scouts · optional fight', 'bramble-scout-camp',
      readyForFight(questStage) ? '' : 'Finish your business in Tidehaven first.'));
    if (state.cleared && !state.recovered) result.push(action('recover-hideout-supplies', 'Lift the town’s stolen stores', 'forest-hideout-supplies'));
    if (state.recovered && !state.returned) result.push(action('return-hideout-supplies', 'Return the stores · accept 30 copper', 'garrison-captain'));
    return siteId === undefined ? result : result.filter(option => option.siteId === siteId);
  }

  function act(actionId, options = {}) {
    if (actionId === 'inspect-hideout') return inspect();
    if (actionId === 'hear-of-hideout') return hear();
    if (actionId === 'march-on-hideout') return march();
    if (actionId === 'stand-down-hideout') return standDown();
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
    active = false; escort = false;
    return true;
  }

  return { inspect, hear, march, standDown, begin, markCleared, endEncounter, recover, turnIn, act, availableActions,
    view, snapshot, restore,
    get state() { return { ...snapshot(), active, escort, stage: stage(), complete: state.returned }; } };
}

/** Call at the camp approach, outside the combat circle. */
export function hideoutConversation(context) {
  const { hideoutQuest, questStage = 0, openDialogue, closeDialogue, act } = context;
  act('inspect-hideout');
  const state = hideoutQuest.state;
  let lines;
  if (state.returned) lines = [
    'The little camp is deserted. The torn pennants still show the trail, but the sacks are back in Lumber Town and the lowered camp pennant hangs still.',
    'A small nuisance removed from the scrub. The town will notice the grain and rope more than it notices the quiet.',
  ];
  else if (state.recovered) lines = [
    'The scouts are gone, and you have secured the town’s stores. The empty place beside the shelter marks what they took.',
    'Captain Varo can see the grain and rope back under lock. The bundle is tracked in your journal until you return it.',
  ];
  else if (state.cleared) lines = [
    'The two scouts have fled. Beyond the shelter are sacks and a crate with Lumber Town’s store mark burned into the boards.',
    'Walk to the stores at the far side of the camp and press F to lift them. Bring them to Captain Varo on the town square.',
  ];
  else lines = [
    state.escort ? 'Two goblins have made a rough camp in the scrub. Captain Varo and his two men wait at your shoulder, swords out, for your word.' : 'Two goblins have made a rough camp in the scrub. Among their scraps are the town’s grain sacks and a coil of sound rope. Torn pennants mark their route from the road.',
    readyForFight(questStage)
      ? 'You can leave them unchallenged. If you choose to recover the supplies, prepare your weapon and food first, then challenge the two scouts. Watch their amber attack tells and leave yourself room to dodge. Retreat east toward the road if you need a rest.'
      : 'For now, keep your distance. Finish your business in Tidehaven before choosing another battle. This camp is optional; its stores can wait.',
  ];
  const choices = hideoutQuest.availableActions('bramble-scout-camp', { questStage })
    .filter(option => option.id !== 'inspect-hideout').map(option => ({ ...option,
      action: () => { closeDialogue(); act(option.id); } }));
  choices.push({ id: 'leave-hideout', label: state.cleared ? 'Back to the trail.' : 'Leave the camp unchallenged.', action: closeDialogue });
  openDialogue({ id: FOREST_HIDEOUT_QUEST.siteId, name: FOREST_HIDEOUT_QUEST.name, role: 'An optional encounter in north Luscia' },
    lines, null, 'Back to the trail', { choices });
  return true;
}

/** Tamsin no longer has anything to say about a goblin camp: Drent has none. Kept so older callers still work. */
export function hideoutTamsinChoices() { return []; }

/** The garrison's conversations: Casso tells of the camp, the Captain marches on it and pays for the stores. */
export function garrisonConversation(npc, context) {
  const { hideoutQuest, openDialogue, closeDialogue, act } = context;
  const state = hideoutQuest.state;
  const again = () => garrisonConversation(npc, context);
  const leave = { id: 'leave-garrison', label: 'As you were.', action: closeDialogue };
  if (npc.id === 'garrison-captain') {
    const choices = [];
    let lines = ['Decimus Varo, captain of what the Legion can spare for a timber town: two men and a relay clerk. You are one of the hired swords. Good. I have more work than soldiers.'];
    if (!state.inspected) lines.push('Speak to Casso if you want something to do. He has been watching the north scrub for a week and will not stop talking about it.');
    else if (state.returned) lines = ['The stores are back under lock and the scrub is quiet. I put your name in my report to the Legate, mercenary. It will not make you rich, but he reads them.'];
    else if (state.recovered) {
      lines = ['Those are the town’s sacks. Grain, salt, and the rope the sawyers have been swearing about. You did what my orders would not let me do alone.', 'Thirty copper from the garrison chest, and my thanks. Hand them over and I will see them back to the store.'];
      choices.push({ id: 'return-hideout-supplies', label: 'Return the stores · accept 30 copper', action: () => { closeDialogue(); act('return-hideout-supplies'); } });
    } else if (state.cleared) lines = ['The camp is broken, then. The sacks will be at the far side of it, by their shelter. Bring them in and the town eats this month.'];
    else if (state.escort) {
      lines = ['We are with you. Lead on: the trail leaves the road west of the rise, under torn pennants. When you challenge them, we go in beside you.'];
      choices.push({ id: 'stand-down-hideout', label: 'Stand the men down for now.', action: () => { closeDialogue(); act('stand-down-hideout'); } });
    } else {
      lines.push('Casso told you about the camp. Two goblins, maybe more, and they have been at the town’s stores. I cannot leave the town with two men, but with a third sword I can. Say when you are ready and we march with you and fight beside you.');
      choices.push({ id: 'march-on-hideout', label: 'I am ready. March on the camp.', action: () => { closeDialogue(); act('march-on-hideout'); } });
    }
    openDialogue(npc, lines, null, 'Back to the square', { choices: [...choices, leave] });
    return true;
  }
  if (npc.id === FOREST_HIDEOUT_QUEST.informantId) {
    if (!state.inspected) {
      openDialogue(npc, ['Casso. Garrison, such as it is. You are one of the hired swords, so you can go where I cannot.'], null, 'Back to the square', { choices: [
        { id: 'ask-hideout-work', label: 'Any work for a hired sword?', action: () => openDialogue(npc, [
          'North of here, past the rise where the shrine-keeper lives, a side trail leaves the road under torn pennants. Goblins have a camp at the end of it. Bramble goblins, down out of Pueth.',
          'They have been at the town’s stores twice: grain, salt, a coil of good rope. The Captain wants them gone but will not leave the town with two men. Tell him when you are ready and all three of us go with you.',
        ], null, 'Back to Casso', { onComplete: () => { act('hear-of-hideout'); again(); } }) }, leave] });
    } else openDialogue(npc, [state.cleared ? 'Quiet up there now. I walked the trail this morning to be sure. The Captain will want those sacks.' : state.escort ? 'On your word, then. I would rather fight them on their ground than on ours.' : 'The Captain is waiting on you. Say the word to him and we march.'], null, 'Back to the square', { choices: [leave] });
    return true;
  }
  openDialogue(npc, [state.escort ? 'Brill. I follow the Captain, and today the Captain follows you. Do not make me regret the walk.' : state.returned ? 'First full ration in a month. I will remember who fetched it.' : 'Brill. I watch the north road and count what comes down it. Lately it is goblins.'], null, 'Back to the square', { choices: [leave] });
  return true;
}
