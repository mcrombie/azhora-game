/**
 * **Haethom and Ninehands in the running game** (the Farmlands of the Lizeem, Builds 2 and 3: the design of 5 October
 * 2026, built and wired 6 October 2026). The Electron smoke `--lizeem-farms-checks` (`npm run test:lizeem-farms`).
 *
 * With the developer teleport it stands at Haethom's levee and at Ninehands, and checks in each that the scenery was
 * built, the farm's beds are drawn (the Nesdor beds turned down their strips), and the people stand on their stands;
 * that the meadow hatch and a strip's end post put up their prompts; and that one draw-off (the hatch opened, the
 * water left to the shine, drawn off with F) and one strip reaped by walking it (begun with F at the end post) work,
 * with screenshots. Gwyddno's weir is hauled once on the way.
 *
 * Fast load builds a region only when it is visited, so each country is checked once its region has come in, and one
 * that does not come in, or fails, is written down rather than stopping the other: the result names what loaded.
 *
 * Hooks (src/main.js): the road-skill hooks (world, npcById, farming, inventory, frames, tap, warp, close, prepare,
 * advancePlay, getState), and scene, meadow, weir, reaping, goTo(point, facing), view(yaw, pitch, distance),
 * prompt() -> { shown, label, row, stripEnd, hatch, weir, npc, mode }, toasts(), capture(name), loaded(regionId).
 */
import { NETHEREUM_SITES, NETHEREUM_FARM_ROWS, HAETHOM } from './nethereum-farm.js';
import { NINEHANDS, NESDOR_FARM_ROWS, nesdorStrip } from './nesdor-farm.js';
import { NETHEREUM_PEOPLE } from './lizeem-nethereum-people.js';
import { NESDOR_PEOPLE } from './lizeem-nesdor-people.js';

const NETHEREUM_REGION = 17, NESDOR_REGION = 14;

export async function runLizeemFarmsChecks(h) {
  const started = performance.now(), notes = [];
  const now = () => h.getState().playSeconds;
  const lastToast = () => h.toasts().at(-1) ?? null;
  /** The camera behind the traveller, looking at a point. */
  const look = (target, tilt = .32, away = 8) => {
    const p = h.player.group.position;
    h.view(Math.atan2(-(target.x - p.x), -(target.z - p.z)), tilt, away);
  };
  // The road-skill preparation stands the traveller in Drent, which Fast load has not built: go straight on to the first
  // country with no frame between, or the region guard holds every frame back while Drent loads (the first run of this
  // smoke, 6 October 2026, found the interaction label never written for that reason).
  await h.prepare();

  /** One country: go there, wait for its region, and run its checks; a failure is recorded and the next country still runs. */
  async function country(name, regionId, point, body) {
    const checks = [], assert = (ok, message) => { if (!ok) throw new Error(message); checks.push(message); };
    const out = { loaded: false, ok: false, checks };
    try { await h.goTo(point); } catch (error) { out.reason = `the teleport failed: ${error.message}`; notes.push(`${name}: ${out.reason}`); return out; }
    for (let n = 0; n < 2400 && (!h.loaded(regionId) || h.getState().waitingForRegion); n++) await h.frames(5);
    out.loaded = h.loaded(regionId);
    if (!out.loaded) { out.reason = `region ${regionId} did not load in fast mode`; notes.push(`${name}: ${out.reason}`); return out; }
    // The game's own frames must be running here (the region guard skips them while anything loads).
    const before = h.getState().frames;
    await h.frames(12);
    out.live = { frames: h.getState().frames - before, waitingForRegion: h.getState().waitingForRegion, mode: h.getState().mode };
    if (!(out.live.frames > 0)) { out.reason = `the game's frames are held back (${JSON.stringify(out.live)})`; notes.push(`${name}: ${out.reason}`); return out; }
    try { await body(assert, out); out.ok = true; } catch (error) { out.failed = error.message; notes.push(`${name}: ${error.message}`); }
    return out;
  }

  /** The farm's beds for a country, drawn by the farm view, each soil turned by its bed's yaw. */
  const bedsDrawn = (rows, assert, name) => {
    const group = h.scene.getObjectByName('Player garden beds');
    assert(!!group, 'the farm view is in the scene');
    for (const row of rows) {
      const soil = group.getObjectByName(`${row.name} soil`);
      assert(!!soil, `${row.id} is drawn`);
      assert(Math.abs(soil.rotation.y - (row.yaw ?? 0)) < 1e-6, `${row.id} is turned by its yaw`);
    }
    return `${rows.length} ${name} beds drawn`;
  };
  /** Each person where their stand says, on the ground. */
  const standing = (people, assert) => {
    for (const person of people) {
      const npc = h.npcById.get(person.id);
      assert(!!npc, `${person.name} is stood up`);
      const at = npc.actor.group.position;
      assert(Math.hypot(at.x - person.x, at.z - person.z) < 1.5, `${person.name} stands on the stand`);
      assert(Math.abs(at.y - h.world.heightAt(at.x, at.z)) < .6, `${person.name} stands on the ground`);
    }
  };

  // ---- Haethom ------------------------------------------------------------------------------------------------
  const nethereum = await country('Haethom', NETHEREUM_REGION, { x: NETHEREUM_SITES.common.x, z: NETHEREUM_SITES.common.z + 6 }, async (assert, out) => {
    const farm = h.world.nethereumFarm;
    assert(!!farm?.root?.isObject3D && farm.metrics?.batches > 0, 'Haethom, its levee, meadow and weir are built');
    assert(farm.hatch.state() === 'broken' && farm.meadowWater.state() === 'dry', 'the hatch is broken and the meadow dry');
    out.beds = bedsDrawn(NETHEREUM_FARM_ROWS, assert, 'Nethereum');
    standing(NETHEREUM_PEOPLE, assert);
    look(HAETHOM, .3, 10); await h.capture('haethom');

    const hatch = NETHEREUM_SITES.hatch;
    h.warp(hatch.approach.x, hatch.approach.z); await h.frames(6);
    let prompt = h.prompt();
    assert(prompt.hatch && prompt.shown && prompt.label === 'The meadow hatch · broken', `the broken hatch puts up its prompt (${JSON.stringify(prompt)})`);
    h.tap('KeyF'); await h.frames(3);
    assert(/broken/.test(lastToast()?.title ?? ''), 'F at the broken hatch says it is broken');
    h.inventory.add('pine-plank', 2); h.inventory.add('salvaged-metal', 1);
    assert(h.meadow.mendHatch().ok, 'two planks and a piece of ironwork mend the hatch');
    await h.frames(4);
    prompt = h.prompt();
    assert(prompt.label === 'Open the meadow hatch' && farm.hatch.state() === 'shut', `the mended hatch is shut and offers to open (${prompt.label})`);
    look(hatch, .34, 7); await h.capture('haethom-hatch');
    h.tap('KeyF'); await h.frames(4);
    assert(h.meadow.view().open && h.meadow.view().phase === 'blackwater', 'F opens the hatch and the water goes in black');
    assert(farm.hatch.state() === 'open' && farm.meadowWater.state() === 'blackwater', 'the scenery shows the hatch open and the meadow under black water');
    look(NETHEREUM_SITES.meadow, .45, 9); await h.capture('haethom-blackwater');
    h.advancePlay(200); await h.frames(4);
    prompt = h.prompt();
    assert(h.meadow.view().phase === 'siltshine' && prompt.label === 'Draw the water off · Siltshine', `the silt shines and the hatch offers the draw-off (${prompt.label})`);
    assert(farm.meadowWater.state() === 'siltshine', 'the scenery shows the shine');
    await h.capture('haethom-siltshine');
    h.tap('KeyF'); await h.frames(4);
    const water = h.meadow.view();
    assert(!water.open && water.drawn === 1 && water.last?.silt === 'fine', 'F at the shine draws it off and leaves fine silt');
    assert(farm.hatch.state() === 'shut' && farm.meadowWater.state() === 'dry', 'the scenery shows the hatch shut and the meadow dry');
    assert(h.farming.rowState('nethereum-meadow-1', now())?.crop === 'meadow-hay', 'the meadow grows its hay after the draw-off');
    assert(/fine silt/.test(lastToast()?.title ?? ''), 'the draw-off is announced');
    out.drawOff = { silt: water.last.silt, silted: Object.values(water.silt).filter(kind => kind === 'fine').length,
      hay: NETHEREUM_FARM_ROWS.filter(row => h.farming.rowState(row.id, now())?.crop === 'meadow-hay').length };

    // Gwyddno's weir, hauled once from its head on the bank.
    const weir = NETHEREUM_SITES.weir;
    h.warp(weir.x + 1.2, weir.z); await h.frames(6);
    prompt = h.prompt();
    assert(prompt.weir && /^Haul the weir trap · 3 fish/.test(prompt.label), `the weir head puts up its prompt (${JSON.stringify(prompt)})`);
    const fish = h.inventory.count('weir-fish') + h.inventory.count('weir-fish-fine');
    h.tap('KeyF'); await h.frames(3);
    assert(h.inventory.count('weir-fish') + h.inventory.count('weir-fish-fine') === fish + 3, 'F hauls three fish from the trap');
    look(weir.trap, .32, 8); await h.capture('gwyddno-weir');
  });

  // ---- Ninehands ----------------------------------------------------------------------------------------------
  const nesdor = await country('Ninehands', NESDOR_REGION, { x: NINEHANDS.x, z: NINEHANDS.z + 4 }, async (assert, out) => {
    const farm = h.world.nesdorFarm;
    assert(!!farm?.root?.isObject3D && farm.metrics?.batches > 0, 'Ninehands, the hazel wood, the inn and the Way are built');
    out.beds = bedsDrawn(NESDOR_FARM_ROWS, assert, 'Nesdor');
    standing(NESDOR_PEOPLE, assert);
    const bench = nesdorStrip('nesdor-bench');
    h.inventory.add('barley-seed', 3);
    for (const id of bench.beds) assert(h.farming.sow(id, 'barley', now()).ok, `${id} is sown with barley`);
    h.advancePlay(250); await h.frames(4);
    assert(bench.beds.every(id => h.farming.rowState(id, now()).stage === 'ripe'), 'the bench strip is ripe');
    h.warp(bench.start.x - .8, bench.start.z); await h.frames(6);
    let prompt = h.prompt();
    assert(prompt.stripEnd === 'nesdor-bench' && prompt.shown && prompt.label === 'Reap the bench strip · 6 seconds', `the strip's end post puts up its prompt (${JSON.stringify(prompt)})`);
    look({ x: bench.x, z: bench.z }, .36, 9); await h.capture('ninehands-strips');
    const barley = h.inventory.count('barley') + h.inventory.count('barley-fine');
    h.tap('KeyF'); await h.frames(3);
    assert(!!h.reaping.pose(), 'F at the end post begins the reap');
    assert(/^Reaping · \d+% · F to stop$/.test(h.prompt().label), `the prompt follows the reap (${h.prompt().label})`);
    h.advancePlay(7); await h.frames(4);
    assert(!h.reaping.pose(), 'the reap is finished at the end of the strip');
    assert(bench.beds.every(id => h.farming.rowState(id, now()).stage === 'bare'), 'the whole strip is reaped in one act');
    const got = h.inventory.count('barley') + h.inventory.count('barley-fine') - barley;
    assert(got >= 6, `the strip's barley is in the satchel (${got})`);
    assert(h.reaping.lastReap()?.strip === 'nesdor-bench', 'the reaping remembers the strip');
    assert(/^The bench strip is in: 3 beds in \d+(\.\d+)? seconds\.$/.test(lastToast()?.title ?? ''), `the reap is announced (${lastToast()?.title})`);
    out.reap = { ...h.reaping.lastReap(), barley: got };
    await h.capture('ninehands-reaped');
  });

  const frameErrors = h.getState().frameErrors ?? null;
  return { ok: nethereum.ok && nesdor.ok, nethereum, nesdor, notes, frameErrors, playSeconds: now(), elapsedMs: Math.round(performance.now() - started) };
}
