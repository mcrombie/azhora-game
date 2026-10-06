/** Optional, local woodland lives. These never advance or replace the main journey. */
export const FOREST_STORY_VERSION = 1;
export const FOREST_STORY_NPC = Object.freeze({
  id: 'forest-woodcutter', name: 'Tamsin', role: 'Woodcutter',
  modelRole: 'forest-woodcutter', color: 0x927052, x: -57, z: 42,
});

// Coordinates and IDs match forest-places.js; these names describe local places,
// rather than adding countries or other large-scale lore to the authored atlas.
export const FOREST_STORY_SITES = Object.freeze([
  Object.freeze({ id: 'charcoal-hearth', name: 'Old Charcoal Hearth', x: -68, z: 57,
    prompt: 'Examine the old hearth',
    note: 'A cold charcoal hearth, a rough shelter, and the remains of a hurried working day.',
    lines: Object.freeze([
      'The mound is cold. Blackened soil, stacked billets, and a low shelter mark a place where somebody worked long hours while the village slept.',
      'Fresh boot scuffs cut across the old ash. A bundle tied with red cord lies beside the shelter. Its cloth bears a stitched T. Someone left in a hurry when the warning bell sounded.',
    ]),
  }),
  Object.freeze({ id: 'bee-fold', name: 'The Bee Fold', x: -55, z: -13,
    prompt: 'Watch the bee garden',
    note: 'A little tended garden in the trees. Even here, somebody keeps a place for summer.',
    lines: Object.freeze([
      'A low boundary shelters a bright patch of flowers. Bees drift between the blossoms and the old hives; a stool and a covered basket wait in the shade.',
      'A notice on the fence reads: “Mind the flowers. The deer cannot read.” Below it, in a smaller hand: “Neither can certain neighbors.”',
    ]),
  }),
  Object.freeze({ id: 'fallen-oak', name: 'Stormfall Oak', x: -117, z: -14,
    prompt: 'Explore the fallen oak',
    note: 'A storm-felled giant left standing as a home for the smaller lives of the wood.',
    lines: Object.freeze([
      'The old oak lies where the storm put it, its roots holding a wall of earth. Young growth crowds the gaps in the fallen crown. Old nut shells and little tracks collect between the ridges of bark.',
      'A small timber tag reads: “Leave this one. Good wood is not always firewood. — T.” Someone has cleared a path around the trunk instead of cutting through it.',
    ]),
  }),
  Object.freeze({ id: 'moss-shrine', name: 'Mosskeeper’s Shrine', x: -107, z: 66,
    prompt: 'Read the woodland dedication',
    note: 'A small wayside remembrance, cared for by the people who walk this wood.',
    lines: Object.freeze([
      'Moss softens three old stones beside a resting place. The little wooden wayboard has slipped from its rotten peg and leans in the weeds.',
      'Beneath the mud you can make out: “For those who brought the next traveler home.” One sound forest stick would make a new peg. Nobody has left a name to claim the work.',
    ]),
  }),
  Object.freeze({ id: 'fern-hollow', name: 'Fern Hollow', x: -147, z: 58,
    prompt: 'Listen in the fern hollow',
    note: 'Below the road, a quiet pocket of ferns and shade slows the journey for a moment.',
    lines: Object.freeze([
      'The road noise falls away as the ground dips. Ferns crowd the cool hollow; a little movement beneath them could be a bird, a lizard, or simply the breeze.',
      'Someone has set a flat stone where a tired traveler might sit. There is no sign, no toll, and nothing asked of you. For a moment, it is enough to be here.',
    ]),
  }),
  Object.freeze({ id: 'coast-lookout', name: 'Saltwind Lookout', x: -2, z: 78,
    prompt: 'Look back across the shore',
    note: 'The sheltered bay opens beside Tidehaven. Along this shore, the first steps of the journey become a place.',
    lines: Object.freeze([
      'The trees open onto salt air. Tidehaven’s little landing looks smaller from here: roofs, mooring posts, the pale seam of beach, and the boat that brought you.',
      'A weathered rail holds old fishing knots. People have been coming here to watch for returning boats much longer than anyone has been posting orders on the village road.',
    ]),
  }),
]);

const siteById = new Map(FOREST_STORY_SITES.map(site => [site.id, site]));
const flags = ['workAccepted', 'bundleRecovered', 'bundleReturned', 'memorialRestored'];
const emptyState = () => ({ version: FOREST_STORY_VERSION, revision: 0, inspected: [],
  workAccepted: false, bundleRecovered: false, bundleReturned: false, memorialRestored: false });
const fail = reason => ({ ok: false, changed: false, reason });
const choice = (id, label, siteId, reason = '') => ({ id, label, siteId, objectiveId: siteId, enabled: !reason, reason });

/** Older road saves have no forest field. A present but malformed field is rejected. */
export function validateForestStorySnapshot(data, { allowMissing = true } = {}) {
  if (data === undefined) return allowMissing;
  if (!data || typeof data !== 'object' || Array.isArray(data)
    || data.version !== FOREST_STORY_VERSION
    || !Number.isSafeInteger(data.revision) || data.revision < 0
    || flags.some(key => typeof data[key] !== 'boolean')
    || !Array.isArray(data.inspected) || data.inspected.some(id => !siteById.has(id))
    || new Set(data.inspected).size !== data.inspected.length
    || (data.bundleReturned && (!data.workAccepted || !data.bundleRecovered))) return false;
  return data.revision === data.inspected.length + flags.reduce((count, key) => count + Number(data[key]), 0);
}

export function createForestStory({ inventory, weapons, onEvent = () => {} } = {}) {
  let state = emptyState();

  function snapshot() { return { ...state, inspected: [...state.inspected] }; }
  function hasNote(id) {
    return state.inspected.includes(id) || (id === 'charcoal-hearth' && state.bundleRecovered)
      || (id === 'moss-shrine' && state.memorialRestored);
  }
  function stage() {
    if (state.bundleReturned) return 'complete';
    if (state.bundleRecovered) return state.workAccepted ? 'return-bundle' : 'find-owner';
    return state.workAccepted ? 'find-bundle' : 'not-started';
  }

  function view() {
    const current = stage();
    const stages = {
      'not-started': null,
      'find-bundle': { title: 'A working day interrupted', detail: 'Tamsin left her tools in a red-tied bundle at the Old Charcoal Hearth, west of the village road. Recover it and bring it back to her.', destinationIds: ['charcoal-hearth'] },
      'find-owner': { title: 'A bundle with a name', detail: 'You secured the red-tied work bundle. Ask Tamsin, the woodcutter at the village’s northwestern edge, whether it is hers.', destinationIds: ['forest-woodcutter'] },
      'return-bundle': { title: 'Bring the day’s work home', detail: 'Return Tamsin’s work bundle at the village’s northwestern edge. She has offered two cooked fish for the trouble.', destinationIds: ['forest-woodcutter'] },
      complete: { title: 'Tools back in good hands', detail: 'Tamsin has her tools again, and remembers who brought them home. She shared two cooked fish for the road.', destinationIds: [] },
    };
    const task = stages[current];
    return {
      title: 'Small lives in the wood', optional: true, stage: current,
      task: task ? { ...task, optional: true, complete: state.bundleReturned, destinationIds: [...task.destinationIds] } : null,
      discoveredCount: FOREST_STORY_SITES.filter(site => hasNote(site.id)).length,
      totalSites: FOREST_STORY_SITES.length,
      entries: FOREST_STORY_SITES.filter(site => hasNote(site.id)).map(site => ({
        id: site.id, title: site.name, detail: site.note,
        afterword: site.id === 'charcoal-hearth' && state.bundleReturned ? 'Tamsin’s tools are home again.'
          : site.id === 'charcoal-hearth' && state.bundleRecovered ? 'The red-tied bundle is secured for its owner.'
            : site.id === 'moss-shrine' && state.memorialRestored ? 'You set the wayboard upright with a new wooden peg.' : '',
      })),
    };
  }

  function availableActions(siteId) {
    const actions = [];
    for (const site of FOREST_STORY_SITES) {
      actions.push(choice(`inspect-${site.id}`, state.inspected.includes(site.id) ? 'Read the woodland note again' : site.prompt, site.id));
    }
    if (!state.bundleRecovered) actions.push(choice('recover-work-bundle', 'Lift the red-tied work bundle', 'charcoal-hearth'));
    if (!state.memorialRestored) actions.push(choice('restore-memorial', 'Set the wayboard upright · 1 stick', 'moss-shrine',
      (inventory?.count?.('forest-stick') ?? 0) < 1 ? 'Gather one forest stick for a new peg, then return to the shrine.' : ''));
    if (!state.workAccepted) actions.push(choice('accept-woodcutter-errand', state.bundleRecovered ? 'I found a bundle with your mark.' : 'I’ll look for your work bundle.', 'forest-woodcutter'));
    if (state.workAccepted && state.bundleRecovered && !state.bundleReturned)
      actions.push(choice('return-work-bundle', 'Return the tools · accept two cooked fish', 'forest-woodcutter'));
    return siteId === undefined ? actions : actions.filter(action => action.siteId === siteId);
  }

  function siteView(siteId) {
    const site = siteById.get(siteId);
    if (!site) return null;
    let lines = [...site.lines];
    if (siteId === 'charcoal-hearth' && state.bundleRecovered) lines[1] = state.bundleReturned
      ? 'The red-tied bundle is back with Tamsin. Tomorrow she can work again. The cold hearth still carries the signs of the day that the goblin bell interrupted.'
      : 'You have secured the red-tied bundle. Its stitched T should be enough for somebody in Tidehaven to recognize its owner.';
    if (siteId === 'moss-shrine' && state.memorialRestored) lines = [
      'The little wayboard stands straight on the peg you fitted. Its face is clear enough to read again: “For those who brought the next traveler home.”',
      'The next person through this wood will find the path a little easier. Three mossy stones keep their quiet company beside it.',
    ];
    return { id: site.id, name: site.name, prompt: site.prompt, lines,
      inspected: state.inspected.includes(siteId), discovered: hasNote(siteId),
      actions: availableActions(siteId),
    };
  }

  function act(actionId) {
    const selected = availableActions().find(action => action.id === actionId);
    if (!selected) return fail('That woodland task is already finished, or is not ready yet.');
    if (!selected.enabled) return fail(selected.reason);
    let reward = null, message = '';
    if (actionId.startsWith('inspect-')) {
      if (state.inspected.includes(selected.siteId)) return { ok: true, changed: false, reason: '', siteId: selected.siteId };
      state.inspected.push(selected.siteId);
      message = `${siteById.get(selected.siteId).name} added to your woodland notes.`;
    } else if (actionId === 'accept-woodcutter-errand') {
      state.workAccepted = true;
      message = state.bundleRecovered ? 'The bundle belongs to Tamsin. Return it when you are ready.' : 'Tamsin’s work bundle was left at the Old Charcoal Hearth.';
    } else if (actionId === 'recover-work-bundle') {
      state.bundleRecovered = true;
      message = 'Work bundle secured. Bring it to Tamsin at the edge of Tidehaven.';
    } else if (actionId === 'return-work-bundle') {
      if (!inventory?.add?.('cooked-fish', 2)) return fail('Tamsin could not put the food in your satchel. You still have her bundle; speak again.');
      state.bundleReturned = true;
      reward = { id: 'cooked-fish', quantity: 2 };
      message = 'Tamsin remembers your kindness. Two cooked fish added to your satchel.';
    } else if (actionId === 'restore-memorial') {
      // Spend through the weapon controller, so a partly worn carried branch
      // stays worn when a spare stick is used for the peg.
      if (!weapons?.spendSticks?.(1)) return fail('The peg needs one forest stick. Check your satchel and try again.');
      state.memorialRestored = true;
      message = 'You fitted a fresh peg and set the woodland wayboard upright.';
    }
    state.revision++;
    const event = { type: 'forest-progress', sequence: state.revision, actionId,
      siteId: selected.siteId, reward, message, optional: true };
    onEvent(event);
    return { ok: true, changed: true, reason: '', ...event };
  }

  function restore(data) {
    if (!validateForestStorySnapshot(data)) return false;
    state = data === undefined ? emptyState() : { version: FOREST_STORY_VERSION,
      revision: data.revision, inspected: [...data.inspected],
      ...Object.fromEntries(flags.map(key => [key, data[key]])) };
    return true;
  }

  return { act, view, siteView, availableActions, snapshot, restore,
    get state() { return { ...snapshot(), stage: stage(), complete: state.bundleReturned }; } };
}

/** Matches the existing paged dialogue interface; mutations stay in context.act. */
export function forestConversation(npc, context) {
  if (npc?.id !== FOREST_STORY_NPC.id) return false;
  const { forestStory, openDialogue, closeDialogue, act } = context;
  const state = forestStory.state;
  const back = { id: 'leave-forest-neighbor', label: 'Take care, Tamsin.', action: closeDialogue };
  const returnToNeighbor = () => forestConversation(npc, context);
  const tangent = (id, label, lines) => ({ id, label,
    action: () => openDialogue(npc, lines, null, 'Back to our conversation', { onComplete: returnToNeighbor }) });
  const choices = forestStory.availableActions(npc.id).map(option => ({ ...option,
    action: () => { closeDialogue(); act(option.id); } }));
  choices.push(tangent('tamsin-woodland', 'Do people work all through these woods?', [
    'Farther than the neat paths go. The bee fold east of town belongs to three households; they take turns minding it. At the charcoal hearth I used to trade dry wood for a share of the burn. Nothing here grows straight into somebody’s dinner.',
    'See the big fallen oak on the east side? I asked folk to leave it. There is sound deadfall elsewhere, and that old trunk has more tenants now than half the village. Past the shrine, the fern hollow is a good place to stop carrying the day for a minute.',
  ]));
  choices.push(tangent('tamsin-levy', 'Is it harder to make a living now?', [
    'The army wants timber, the village wants roofs, and my back wants a new owner. The levy clerk counted my billets twice last week. Said the first count was an estimate. I told him my supper was becoming an estimate too.',
    'Still, when that goblin bell rang, nobody asked whose wood I carried. They opened the gate. I would like to have enough left to mend it when this is over.',
  ]));
  if (state.memorialRestored) choices.push(tangent('tamsin-shrine', 'I set the shrine’s wayboard upright.', [
    'That was you? I noticed the new peg. My aunt kept that path clear until her knees gave out. She would be pleased that somebody bothered.',
    'The words are for anyone who has walked another person home. A small sort of honor, perhaps. I think it is a good one.',
  ]));
  choices.push(...(context.extraChoices?.(npc) || []), back);
  let lines;
  if (state.bundleReturned) lines = [
    'There you are. My tools are back where they belong, thanks to you. I went looking for the cord this morning and caught myself smiling when it was actually there.',
    'If somebody tells you there is nothing in those woods, they have only looked for things that shout. Take the little paths. People leave a great deal of their lives along them.',
  ];
  else if (state.bundleRecovered && state.workAccepted) lines = [
    'That red cord! And the ridiculous little T I sewed into the cloth. Yes, those are mine. The wedges alone would have taken me a week’s work to replace.',
    'Let me take the bundle. I saved two cooked fish for my supper; they travel better than gratitude, so have them for the road. I can eat at home tonight.',
  ];
  else if (state.bundleRecovered) lines = [
    'A bundle with a stitched T? Red cord, sailcloth, two wedges that never quite lie flat? You have found the part of my day I was most worried about.',
    'I am Tamsin. I cut and mend what the village needs. That bundle is my tools; I left it at the old charcoal hearth when the goblin bell sounded. Tell me you have it, then I can stop inventing new places to search.',
  ];
  else if (state.workAccepted) lines = [
    'The old charcoal hearth is west of the road, past the village’s last trees. There is a cold black mound and a low working shelter. My bundle has red cord around it.',
    'No need to chop wood or fight anything for me. Just bring the bundle home if you find it. I will share two cooked fish, and tomorrow I can get back to work.',
  ];
  else lines = [
    'Mind the chips. I am Tamsin; most of these cottages contain something I cut twice and still got wrong the first time.',
    'When the goblin bell rang, I left my tools at the old charcoal hearth west of the road. A sailcloth bundle, tied in red. Would you bring it back if you are exploring that way? I can spare two cooked fish. It would mean I can work tomorrow.',
  ];
  openDialogue(npc, lines, null, 'Take care, Tamsin', { choices });
  return true;
}

/** Call while standing at a place; merely opening a note records it once. */
export function forestSiteConversation(siteId, context) {
  const { forestStory, openDialogue, closeDialogue, act } = context;
  const site = forestStory.siteView(siteId);
  if (!site) return false;
  if (!site.inspected) act(`inspect-${siteId}`);
  const place = { id: siteId, name: site.name, role: 'A place in Drent' };
  const choices = forestStory.availableActions(siteId).filter(option => !option.id.startsWith('inspect-'))
    .map(option => ({ ...option, action: () => { closeDialogue(); act(option.id); } }));
  choices.push({ id: `leave-${siteId}`, label: 'Return to the woods.', action: closeDialogue });
  openDialogue(place, forestStory.siteView(siteId).lines, null, 'Return to the woods', { choices });
  return true;
}
