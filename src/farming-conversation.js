import { CROPS, FARMER, FARM_ROWS, FARMING_LESSON, WATERING_XP } from './farming.js';

export const farmWait = seconds => {
  const whole = Math.max(0, Math.ceil(seconds)), minutes = Math.floor(whole / 60);
  return minutes ? `${minutes}m ${whole % 60}s` : `${whole}s`;
};

/** The same model serves Stanley, the field prompts and future farms. No chapter state is changed. */
export function farmingConversation(npc, context) {
  if (npc?.id !== FARMER.id) return false;
  const { farming, cooking, inventory, openDialogue, closeDialogue, onChange = () => {}, notify = () => {} } = context;
  const clock = () => typeof context.playSeconds === 'function' ? context.playSeconds() : context.playSeconds ?? 0;
  const back = () => farmingConversation(npc, context);
  const choices = [];
  if (!farming.met) choices.push({ id: 'stanley-farming', label: 'Introduce me to Farming', action: () => {
    openDialogue(npc, [...FARMING_LESSON], null, 'Take the seeds', { noWayfinding: true, onComplete: () => {
      const learned = farming.learn(); onChange();
      if (learned.first) notify('Farming learned. Carrot and barley seeds are in your satchel. Choose a crop at a bare row.', 'STANLEY\u2019S GARDEN');
    } });
  } });
  choices.push({ id: 'stanley-seeds', label: 'May I have seeds for the commons rows?', action: () => {
    const result = farming.stockSeeds(); onChange();
    openDialogue(npc, [result.added.length
      ? 'There you go. Enough of every crop you can grow for four rows. Each harvest saves seed for the next planting, and I can top your packets up again.'
      : 'Your seed packets are full already. Put some in the ground; I will still be here when you need more.'], null, 'Back to Stanley', { onComplete: back });
  } });
  choices.push({ id: 'stanley-rows', label: 'Show me how my garden is doing', action: () => {
    const farm = farming.view(clock());
    const lines = farm.rows.map((row, index) => `Row ${index + 1}: ${row.stage === 'bare' ? 'bare; ready for seed'
      : row.stage === 'ripe' ? `${row.cropName}, ready to harvest (${row.quantity})`
      : `${row.cropName}, ${farmWait(row.left)} until harvest${row.watered ? '; watered' : '; could use water'}`}.`);
    openDialogue(npc, [lines.join('\n'), 'The four dark beds beside me are yours to work. Press F at a bed to choose a crop, water it or harvest. Water once for 4 Farming XP, a quarter less growing time and one extra crop. The watering can stays here for everybody.'], null, 'Back to Stanley', { onComplete: back });
  } });
  choices.push({ id: 'stanley-cooking', label: cooking?.met ? 'Teach me your farm recipes' : 'Introduce me to Cooking', action: () => {
    if (context.fireMaking && !context.fireMaking.ready) {
      openDialogue(npc, ['A useful fire comes before a cooking lesson. Lee Anne at the empty village fire ring in Tidehaven can teach you Fire Making.',
        'Make your first fire with her, then I can show you farm pot and roasted beets. You can still grow crops and eat carrots or beets raw in the meantime.'], null, 'Back to Stanley', { noWayfinding: true, onComplete: back });
      return;
    }
    openDialogue(npc, [
      'You can eat a carrot or a beet straight from your satchel with I. Cooking makes the same harvest feed you better. Jojo shows travelers the basics at the harbor, but if you missed that lesson, we can begin right here.',
      'Farm pot is one carrot and one barley, simmered at a lit fire. It restores up to 45 health. A roasted beet restores 35. Use the fire ring beside the rows: F opens it, then choose your recipe. Keep growing and cooking as long as you like; none of this is an army assignment.',
    ], null, 'Learn the recipes', { noWayfinding: true, onComplete: () => {
      const first = !cooking?.knows?.('farm-pot');
      const learned = cooking?.learn?.('farm-pot');
      if (!learned?.ok) { notify(learned?.reason ?? 'A cooking lesson could not begin.', 'COOKING'); return; }
      cooking?.learn?.('roasted-beet');
      if (first) {
        if (!inventory.has('tinderbox')) inventory.grant('tinderbox');
        inventory.add('forest-stick', 2);
      }
      context.teachCooking?.({ teacher: npc, recipes: ['farm-pot', 'roasted-beet'], first });
      onChange(); notify('Farm pot and Roasted beet are in your recipes. Bring your harvest to a lit fire. Gather branches for later fires.', 'STANLEY\u2019S KITCHEN');
    } });
  } });
  choices.push({ id: 'stanley-stay', label: 'You do not mind me staying to farm?', action: () => {
    openDialogue(npc, ['Mind? Those rows were bare this morning. Give me someone who leaves them growing over another person telling me where the road goes.',
      'I am Stanley. Enna keeps the mill, I keep the crops, and between us we try to keep a few people fed. The road is right there when you want it. Your plants will carry on growing while you travel, but they wait when you pause or close the game.'], null, 'Back to Stanley', { onComplete: back });
  } });
  choices.push({ id: 'stanley-bye', label: 'Back to the clearing', action: closeDialogue });
  openDialogue(npc, [farming.met ? 'How is the garden treating you? More seeds, another recipe, or just a little time off the road?'
    : 'Stanley. If you have a few minutes, I can show you how to turn an empty row into supper. Four beds beside the mill, a watering can to share, and no officer counting how long you stay.'], null, 'Back to the clearing', { choices });
  return true;
}

/** A field work panel, explicitly labelled as ground rather than an imaginary speaker. */
export function farmRowConversation(id, context) {
  const { farming, openDialogue, closeDialogue, onChange = () => {}, notify = () => {} } = context;
  const clock = () => typeof context.playSeconds === 'function' ? context.playSeconds() : context.playSeconds ?? 0;
  const here = farming.rowState(id, clock());
  if (!here) return false;
  const rowNumber = FARM_ROWS.findIndex(row => row.id === id) + 1;
  const field = { id, name: `Commons row ${rowNumber}`, role: 'Farming \u00b7 field work', ...here };
  const act = action => { closeDialogue(); const result = action(); onChange(); if (!result.ok) notify(result.reason, 'THE COMMONS GARDEN'); };
  const choices = [];
  let detail;
  if (here.stage === 'bare') {
    detail = 'Choose a crop. One seed packet plants this bed; every harvest gives seed back for replanting. Stanley shares seed beside the rows. Growing time counts only while you are playing.';
    for (const kind of Object.values(CROPS)) {
      const unlocked = farming.view(clock()).level >= kind.level;
      const available = farming.sowable(id).find(item => item.id === kind.id)?.seeds ?? 0;
      choices.push({ id: `farm-sow-${kind.id}`, label: `${kind.name} \u00b7 ${farmWait(kind.seconds)} \u00b7 ${kind.xp} XP${unlocked ? ` \u00b7 ${available} seed` : ` \u00b7 level ${kind.level}`}`,
        disabled: !unlocked || available < 1, reason: !unlocked ? `Farming level ${kind.level} needed` : available < 1 ? 'Ask Stanley for a free seed packet' : kind.note,
        action: () => act(() => farming.sow(id, kind.id, clock())) });
    }
    choices.push({ id: 'farm-shared-seeds', label: 'Take seeds from the shared bin', action: () => {
      farming.stockSeeds(); onChange(); farmRowConversation(id, context);
    } });
  } else if (here.stage === 'ripe') {
    detail = `${here.cropName} are ready. Harvest ${here.quantity}, save one seed packet, and earn ${CROPS[here.crop].xp} Farming XP. The bed can be replanted immediately.`;
    choices.push({ id: 'farm-harvest', label: `Harvest ${here.cropName.toLowerCase()}`, action: () => act(() => farming.reap(id, clock())) });
  } else {
    detail = `${here.cropName} are growing: ${farmWait(here.left)} until harvest. ${here.watered ? 'The soil is watered. You can leave it to grow.'
      : 'Water once for a quarter less growing time, one extra crop at harvest, and 4 Farming XP.'} You may work another row or leave the clearing.`;
    if (!here.watered) choices.push({ id: 'farm-water', label: `Water this row \u00b7 +${WATERING_XP} Farming XP`, action: () => act(() => farming.water(id, clock())) });
  }
  choices.push({ id: 'farm-back', label: 'Back to the clearing', action: closeDialogue });
  openDialogue(field, [detail], null, 'Back to the clearing', { noWayfinding: true, choices });
  return true;
}
