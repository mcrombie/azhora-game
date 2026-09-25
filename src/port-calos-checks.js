import { FERRY_NPC, FERRY_LANDINGS, FERRY_SCENE } from './ferry.js';
import { QUEST_DONE, canStand } from './game-state.js';
import { createRoadCheckpoint } from './road-checkpoint.js';

/** Renderer integration through ordinary dialogue choices and ferry callbacks.
 * Only initial preparation and elapsed crossing time use fixture seams. */
export async function runPortCalosChecks(h) {
  const checks = [], failures = [], started = performance.now();
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
    checks.push(message);
  };
  // Restorers may reconstruct schema fields in another insertion order. Compare
  // actual values recursively, preserving array order and missing-key differences.
  const same = (a, b) => {
    if (Object.is(a, b)) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object'
      || Array.isArray(a) !== Array.isArray(b)) return false;
    const left = Object.keys(a).sort(), right = Object.keys(b).sort();
    return left.length === right.length && left.every((key, i) => key === right[i] && same(a[key], b[key]));
  };
  // A new coastline may legitimately pay exploration XP; it must not teach
  // skills, finish lessons, hand out quest items, or advance any chapter.
  const progress = s => ({
    questStage: s.questStage, journey: s.journey, campaign: s.campaign,
    luscia: s.luscia, moros: s.moros, border: s.border,
    chartLesson: s.chartLesson,
    practice: [s.woodland?.practiceHits, s.woodland?.practiceGuards, s.woodland?.practiceDodges],
    inventory: [...s.inventory].sort((a, b) => a.id.localeCompare(b.id)),
    cartographyTaught: s.cartography?.met, taught: s.skills?.taught,
  });
  let expectedCrossings = 0;
  const progressUnchanged = (expected, label) => {
    const actual = progress(h.snapshot());
    const changed = Object.keys(expected).filter(key => !same(actual[key], expected[key]));
    assert(!changed.length, label + (changed.length ? ': changed ' + changed.join(', ') : ''));
  };
  const choices = () => h.choices().map(choice => typeof choice === 'string' ? choice : choice.id);
  async function menu() {
    await h.conversation(h.npcById.get(FERRY_NPC.id));
    for (let n = 0; n < 16 && h.state().mode === 'dialogue' && !choices().includes('board-ferry'); n++) {
      await h.nextSpeech(); await h.frames(1);
    }
    assert(h.state().mode === 'dialogue' && choices().includes('board-ferry'), 'Jess presents the ordinary ferry choices');
  }
  async function arrive(id, label) {
    await h.advanceFerry(FERRY_SCENE.done + .1); await h.frames(8);
    const landing = FERRY_LANDINGS[id], saved = h.snapshot(), p = saved.position;
    assert(h.state().mode === 'playing' && !h.ferry.state.crossing && h.ferry.state.side === id,
      label + ': the crossing returns control at the intended shore');
    assert(Math.hypot(p.x - landing.ashore.x, p.z - landing.ashore.z) < .35,
      label + ': the player stands at the authored landing');
    assert(saved.ferry.crossings === expectedCrossings, label + ': the scene records exactly one crossing');
    assert(canStand(p.x, p.z, h.world) && h.world.heightAt(p.x, p.z) >= h.world.waterAt(p.x, p.z),
      label + ': the arrival deck is solid and above water');
    const jess = h.npcById.get(FERRY_NPC.id), at = jess?.actor.group.position;
    assert(!!jess && jess.actor.group.visible && !jess.hidden
      && Math.hypot(at.x - landing.stand.x, at.z - landing.stand.z) < .35,
    label + ': the same Jess remains visible beside her boat after normal frames');
    assert(canStand(landing.stand.x, landing.stand.z, h.world), label + ': Jess has a reachable, solid stand');
  }
  async function board(choice, label) {
    expectedCrossings = h.ferry.state.crossings + 1;
    await h.choose(choice);
    assert(h.state().mode === 'ferry' && h.ferry.state.crossing,
      label + ': selecting the real dialogue button keeps ferry mode active');
  }
  try {
    for (const stage of [0, QUEST_DONE]) {
      const label = stage === 0 ? 'Before the tutorial' : 'After the tutorial';
      await h.reset(stage); await h.frames(8);
      const before = h.snapshot(), expected = progress(before);
      assert(before.questStage === stage, label + ': fixture preserves the requested lesson stage');
      await menu();
      assert(choices().includes('board-ferry-port-calos'), label + ': Port Calos is offered alongside Peblos');
      await board('board-ferry-port-calos', label); await arrive('port-calos', label);
      progressUnchanged(expected, label + ': sea travel grants no quest progress, items or lessons');

      const arrival = h.snapshot(), values = new Map();
      const store = createRoadCheckpoint({ storage: {
        getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value),
        removeItem: key => values.delete(key),
      } });
      const written = store.save(arrival);
      assert(written.ok, label + ': the real arrival snapshot passes checkpoint validation' + (written.reason ? ': ' + written.reason : ''));
      assert(await h.saveAndReload(), label + ': the isolated native checkpoint reload succeeds');
      await h.frames(8);
      const loaded = h.snapshot();
      assert(Math.hypot(loaded.position.x - arrival.position.x, loaded.position.z - arrival.position.z) < .35,
        label + ': reload stays on the Port Calos quay');
      progressUnchanged(expected, label + ': reload preserves unfinished and completed tutorial state exactly');
      assert(loaded.mapTutorial === arrival.mapTutorial, label + ': reload preserves the regional map hint');
      assert(h.ferry.state.side === 'port-calos', label + ': reload resolves Jess to Port Calos');

      await menu(); await board('board-ferry', label + ' return'); await arrive('drent', label + ' return');
      progressUnchanged(expected, label + ': returning to Tidehaven does not advance the quest');
      await menu();
      assert(choices().includes('board-ferry-port-calos'), label + ': Port Calos remains available after a return trip');
      await board('board-ferry', label + ' Peblos'); await arrive('peblos', label + ' Peblos');
      await menu(); await board('board-ferry', label + ' Peblos return'); await arrive('drent', label + ' Peblos return');
      progressUnchanged(expected, label + ': the original Peblos return route preserves quest state');
    }
    await h.testingPort(); await h.frames(8);
    const landing = FERRY_LANDINGS['port-calos'].ashore, at = h.snapshot().position;
    assert(h.state().mode === 'playing' && Math.hypot(at.x - landing.x, at.z - landing.z) < .35,
      'The Testing Tools button closes the panel and places the player on the Port Calos quay');
    assert(h.ferry.state.side === 'port-calos' && h.npcById.get(FERRY_NPC.id).actor.group.visible,
      'The Testing Tools visit also places Jess beside the return ferry');
    assert(!h.state().frameErrors?.count, 'All coastal crossings and reloads complete without renderer errors');
  } catch (error) {
    failures.push({ message: error.stack ?? error.message });
  } finally {
    await h.closeDialogue();
  }
  return { ok: failures.length === 0, checks, failures, durationMs: Math.round(performance.now() - started),
    frameErrors: h.state().frameErrors };
}
