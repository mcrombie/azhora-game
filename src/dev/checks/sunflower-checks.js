import { ARI, ARI_STAND, SUNFLOWER_ROWS, ARI_GARDEN_SUPPLIES } from '../../content/quests/ari/ari-garden.js';
import { createFarming, CROPS, WATERING_XP } from '../../gameplay/skills/farming/farming.js';
import { SUNFLOWER_LESSON_XP } from '../../content/quests/skill-lessons/sunflower-lesson.js';
import { canStand } from '../../gameplay/movement/game-state.js';

/** Native proof using actual F prompts and dialogue choices. Only the crop clock is accelerated. */
export async function runSunflowerChecks(h) {
  const checks = [], started = performance.now(), row = SUNFLOWER_ROWS[0];
  const assert = (ok, message) => { if (!ok) throw new Error(message); checks.push(message); };
  const quest = () => h.lesson.view(h.getState().playSeconds);
  const visitAri = async () => { await h.close(); await h.visit(ARI.id); await h.finish(); };
  const visitBed = async () => {
    await h.close(); h.warp(row.x, row.z); await h.frames(3); h.tap('KeyF'); await h.frames(2); await h.finish();
    assert(h.getState().mode === 'dialogue', 'F opens the real garden bed menu');
  };
  const normal = h.saved?.();
  await h.prepare(); await h.prepareGlun();
  h.lesson.restore(); h.farming.restore(createFarming().snapshot());
  h.inventory.remove('sunflower-seed', h.inventory.count('sunflower-seed'));
  h.inventory.remove('sunflower', h.inventory.count('sunflower'));
  await h.frames(2);
  for (const point of [ARI_STAND, ...SUNFLOWER_ROWS, ARI_GARDEN_SUPPLIES]) {
    assert(canStand(point.x, point.z, h.world, .45), `${point.id ?? 'Ari or garden supplies'} has clear, dry footing`);
  }
  const npc = h.npcById.get(ARI.id);
  assert(npc?.look?.hairStyle === 'long-curly' && npc.look.dress && !npc.look.hat, 'Ari keeps her long curly hair, dress and bare head');
  assert(Math.hypot(npc.actor.group.position.x - ARI_STAND.x, npc.actor.group.position.z - ARI_STAND.z) < 1,
    'Ari stands in Applegarth rather than at her former Port Calos position');
  await visitAri();
  assert(h.marker(ARI.id).visible && h.marker(ARI.id).kind === 'skill', 'Ari has the green skill-training book');
  await h.choose('ari-sunflower-accept'); await h.finish();
  assert(quest().stage === 'plant' && h.inventory.count('sunflower-seed') === 2, 'Ari supplies two seed packets through her normal conversation');
  assert(!h.farming.met, 'Ari leaves Stanley\'s separate first lesson available');
  const xp = h.skills.xp('farming');
  await visitBed(); await h.choose('farm-sow-sunflower');
  assert(quest().stage === 'water', 'Planting in Ari\'s bed advances the lesson');
  await visitBed(); await h.choose('farm-water');
  assert(quest().stage === 'growing', 'Watering records the real planting and tending');
  await h.close();
  const partial = h.snapshot();
  await h.restore(partial); await h.frames(3);
  assert(quest().stage === 'growing' && h.farming.rowState(row.id, h.getState().playSeconds).watered,
    'Reloading preserves both the lesson and its watered crop');
  h.advancePlay(91); await h.frames(2);
  assert(quest().stage === 'harvest', 'The planted sunflowers ripen on the active-play clock');
  await h.capture?.('ari-sunflowers-ripe');
  await visitBed(); await h.choose('farm-harvest');
  assert(quest().stage === 'report' && h.inventory.count('sunflower') === 3, 'The real harvest supplies flowers and unlocks the report');
  await visitAri(); await h.choose('ari-sunflower-report'); await h.finish(); await h.close(); await h.frames(2);
  assert(quest().complete, 'Ari\'s report completes the lesson');
  assert(h.skills.xp('farming') === xp + WATERING_XP + CROPS.sunflower.xp + SUNFLOWER_LESSON_XP,
    'Watering, harvest and the lesson pay their Farming experience exactly once');
  assert(!h.marker(ARI.id).visible, 'The completed lesson clears Ari\'s green book');
  const completed = h.snapshot(), earned = h.skills.xp('farming');
  await h.restore(completed); await h.frames(2);
  assert(quest().complete && !h.lesson.report().ok && h.skills.xp('farming') === earned,
    'Reloading the completed quest cannot pay the reward again');
  if (h.saved) assert(h.saved() === normal, 'The test never changes the normal adventure checkpoint');
  assert(!h.getState().frameErrors?.count, 'The lesson completes without renderer errors');
  // Leave a fully grown, normally replanted bed for the review screenshot.
  await visitBed(); await h.choose('farm-sow-sunflower');
  await visitBed(); await h.choose('farm-water'); await h.close(); h.advancePlay(91); await h.frames(2);
  await h.present?.();
  return { sunflowerChecks: checks.length, checks, elapsedMs: Math.round(performance.now() - started) };
}
