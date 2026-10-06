import { TELEMON_FIGHT_ID, inTelemonia } from '../../content/regions/telemonia/telemonia-host.js';
import { PASS_MOUTHS, groundKind } from '../../content/regions/telemonia/telemonia-ways.js';
import { TELEMONIA_PEOPLE_IDS, isTelemon } from '../../content/regions/telemonia/telemonia-people.js';
import { WATCH } from '../../content/regions/telemonia/telemon-watch.js';

/**
 * **The challenge, played in the running game** (`node scripts/launch.cjs --smoke-test --telemonia-checks`).
 * The native runner holds ordinary movement keys; small rule-only callers may omit drive and
 * use scripted positions. The result states which movement mode was used. Everything else -
 * who notices him, who comes, where they walk, the fight and who joins it, the border, the save - is the
 * game's own frame loop, read back from its own state each frame:
 *
 *  1. set down outside the east pass and run in up its floor in the open: noticed, one of them comes, the
 *     line is said, he is turned round, walked to the mouth and released, and the standing reads walked out once;
 *  2. back in: seen again, a fight at once, the others in earshot join it, never more than the cap;
 *  3. run out of the country: the fight breaks off and nobody crosses the border after him;
 *  4. save and reload through the game's own recovery checkpoint: the standing is still there;
 *  5. set down by the developer's travel where the gap route over the western rim comes down onto the terraces
 *     (tests/telemonia-people.test.js: north of the cone of the man on the terraces opposite the town) and sneak
 *     along it, over the terraces and the plain to the foot of the rock's cliffs: not noticed.
 *
 * Kept honest: the traveler's health is topped up while he stands in the fight (it is the rule being watched,
 * not his swordwork), and he never fights back.
 */
export async function runTelemoniaChecks({ host, player, combat, npcById, travel, frames, sneak, camera = () => {}, capture = () => {},
  keepAlive = () => {}, drive = null, stopDriving = () => {}, saveAndReload, reset, progress = () => {}, state = () => ({}) }) {
  const checks = [], metrics = { lines: [], steps: {} }, started = performance.now();
  const check = (ok, message, detail) => { if (!ok) throw new Error(`Telemonia: ${message}\n${JSON.stringify({ checks, metrics, detail }, null, 1)}`); checks.push(message); progress(message); };
  const p = () => player.group.position;
  const view = () => host.view();
  const seconds = () => ((performance.now() - started) / 1000).toFixed(1);
  const east = PASS_MOUTHS.find(m => m.id === 'telemonia-east-pass');
  const telemonNpcs = () => [...TELEMONIA_PEOPLE_IDS].map(id => npcById.get(id)).filter(npc => npc && isTelemon(npc));
  const whereIs = npc => npc.combatPosition ?? npc.actor.group.position;
  let lastLine = null;
  /** One frame: record what was said, and keep the traveler on his feet if asked. */
  async function tick(alive) {
    await frames(1);
    if (alive) keepAlive();
    const line = view().line;
    if (line && line !== lastLine) metrics.lines.push({ t: seconds(), event: line.event, text: line.text, by: line.speaker });
    lastLine = line;
  }
  /** Moves the traveler toward `to` at `speed` m/s, frame by frame, until there, or `until()`, or `limit` seconds. */
  async function go(to, speed, { until = () => false, limit = 60, alive = false, each = () => {} } = {}) {
    let last = performance.now();
    const begin = last;
    try { for (;;) {
      if (drive) drive(to, speed);
      await tick(alive);
      const now = performance.now(), dt = Math.min(.1, (now - last) / 1000); last = now;
      each();
      if (until()) return true;
      if ((now - begin) / 1000 > limit) return false;
      const here = p(), d = Math.hypot(to.x - here.x, to.z - here.z);
      if (d < .25) return false;
      if (!drive) {
        const step = Math.min(d, speed * dt);
        here.x += (to.x - here.x) / d * step; here.z += (to.z - here.z) / d * step;
        player.group.rotation.y = Math.atan2(to.x - here.x, to.z - here.z);
      }
    } } finally { stopDriving(); }
  }
  async function along(points, speed, options) { for (const q of points) if (await go(q, speed, options)) return true; return false; }
  async function wait(secs, until = () => false, alive = false) { const begin = performance.now(); while ((performance.now() - begin) / 1000 < secs) { await tick(alive); if (until()) return true; } return false; }

  // --- 1. Walked in by the east pass, in the open -------------------------------------------------
  reset();
  await travel({ x: east.outside.x, z: east.outside.z });
  await wait(.5);
  check(!inTelemonia(p().x, p().z) && view().phase === 'outside', 'Set down outside the east pass, out of the country');
  check(view().walkedOut === 0 && view().fights === 0, 'A fresh standing: never walked out, never fought');
  const inward = [east.mouth, ...[...east.line].reverse().slice(1)];
  const noticed = await along(inward, 7.2, { until: () => view().phase === 'noticed', limit: 45 });
  const by = view().escortId;
  metrics.steps.noticed = { t: seconds(), at: { x: +p().x.toFixed(1), z: +p().z.toFixed(1) }, by };
  check(noticed && inTelemonia(p().x, p().z), 'Running in up the pass floor in the open, he is noticed inside the country', metrics.steps.noticed);
  check(by && isTelemon(npcById.get(by)), `A Telemon has noticed him and is the one who comes (${by})`);
  const escort = npcById.get(by);
  const turned = await wait(30, () => view().phase === 'escorting');
  check(turned, 'The one who noticed him walks up to him and turns him round', { phase: view().phase, gap: Math.hypot(whereIs(escort).x - p().x, whereIs(escort).z - p().z) });
  check(metrics.lines.some(l => l.event === 'notice') && metrics.lines.some(l => l.event === 'turn'), 'He is spoken to, in a few words, when noticed and when turned round', metrics.lines);
  const mouth = view().mouth;
  check(mouth?.id === east.id, `He is to be walked to the nearest pass mouth (${mouth?.id})`);
  // He walks out ahead of the escort, at a walk for the picture and then at a run; the escort follows behind.
  let escortOut = false, escortGap = 0;
  // While he is being walked out the escort is behind him (he walks at the rule's pace, the traveler faster at the end).
  // Once he is released the escort goes home, and an NPC whose home is far from the traveler is stood at it: that is
  // the game's own, so the gap is only measured while the walk lasts.
  let walking = 0;
  const watchEscort = () => { const e = whereIs(escort); if (view().phase === 'escorting' && !view().released) { escortGap = Math.max(escortGap, Math.hypot(e.x - p().x, e.z - p().z)); if (Math.hypot(e.x - p().x, e.z - p().z) < 12) walking++; } if (!inTelemonia(e.x, e.z)) escortOut = true; };
  /** The camera on the far side of the traveler from somebody, a little off the line, so both are in the picture. */
  const frameWith = at => camera(Math.atan2(p().x - at.x, p().z - at.z) + .45, .2, 7);
  await go({ x: mouth.x, z: mouth.z }, 4.2, { limit: 4, each: watchEscort });
  frameWith(whereIs(escort)); await wait(.3);
  capture('escort');
  await wait(.4);
  const released = await go({ x: mouth.x, z: mouth.z }, 7.2, { until: () => view().released, limit: 50, each: watchEscort });
  check(released, 'Walked all the way to the mouth with the Telemon behind him, he is released there', { phase: view().phase, at: p() });
  check(metrics.lines.some(l => l.event === 'release'), 'The escort tells him to go', metrics.lines.slice(-2));
  const out = await go(east.outside, 4.2, { until: () => view().phase === 'outside', limit: 15, each: watchEscort });
  await wait(1.5, () => false);
  watchEscort();
  check(out && view().walkedOut === 1, `Out of the country, the standing reads walked out once (${view().walkedOut})`);
  check(!escortOut, 'The escort never set foot outside his own country');
  check(walking > 30, `The escort walked behind him (within 12 m for ${walking} frames of the walk out)`);
  metrics.steps.walkedOut = { t: seconds(), escortGap: +escortGap.toFixed(1), escortAt: { x: +whereIs(escort).x.toFixed(1), z: +whereIs(escort).z.toFixed(1) } };

  // --- 2. Back in: seen again, and a fight with everyone in earshot -------------------------------
  const head = east.line[0];
  const seen = await along([east.mouth, ...inward.slice(1)], 7.2, { until: () => view().phase === 'hostile', limit: 45 });
  check(seen && view().cause === 'returned', `Back in, he is seen again and it is a fight at once (${view().cause})`);
  const joinedFar = [];
  let most = 0, fightStarted = false, overCap = false, captured = false, framed = 0;
  const watchFight = () => {
    const r = view(), here = p();
    for (const id of r.joined ?? []) { const npc = npcById.get(id), at = whereIs(npc), d = Math.hypot(at.x - here.x, at.z - here.z); if (d > WATCH.earshot + 1) joinedFar.push({ id, d }); }
    if (combat.state.encounterId === TELEMON_FIGHT_ID && combat.state.phase === 'active') {
      fightStarted = true; most = Math.max(most, combat.state.enemies.length); if (combat.state.enemies.length > 12) overCap = true;
    }
  };
  // On up the pass to its head, where the next Telemon is in earshot, and stand in the fight.
  await go({ x: head.x, z: head.z }, 3.5, { alive: true, each: watchFight, limit: 25 });
  const others = await wait(35, () => { watchFight(); if (!captured && fightStarted && most >= 2 && combat.state.enemies[0]) { frameWith(combat.state.enemies[0]); if (++framed > 12) { capture('fight'); captured = true; } } return view().fighters.length >= 2 && most >= 2 && captured; }, true);
  metrics.steps.fight = { t: seconds(), fighters: view().fighters, inCombat: combat.state.enemies.map(e => e.npcId), most };
  check(fightStarted, 'The fight starts in the game’s own combat, as the Telemon’s own encounter', metrics.steps.fight);
  check(others, `The others in earshot join it: ${view().fighters.join(', ')}`, metrics.steps.fight);
  check(!joinedFar.length, 'Everybody who joined was within earshot when he joined', joinedFar);
  check(!overCap && view().fighters.length <= 12, `Never more than the cap of twelve at once (at most ${most} in the combat)`);

  // --- 3. Run out of the country: the fight breaks off and nobody follows --------------------------
  let crossed = [];
  const watchBorder = () => { for (const npc of telemonNpcs()) { const at = whereIs(npc); if (!inTelemonia(at.x, at.z) && !npc.hidden) crossed.push({ id: npc.id, x: +at.x.toFixed(1), z: +at.z.toFixed(1) }); } };
  const leftIt = await along([...east.line.slice(1), east.outside], 7.2, { alive: true, until: () => view().phase === 'outside', each: watchBorder, limit: 45 });
  check(leftIt && !inTelemonia(p().x, p().z), 'He runs out of the country by the pass');
  await go({ x: east.outside.x + 6, z: east.outside.z - 2 }, 4.2, { limit: 2 });
  await wait(4, () => { watchBorder(); return false; });
  check(!(combat.state.encounterId === TELEMON_FIGHT_ID && combat.state.phase === 'active'), 'The fight is broken off at the border');
  check(!crossed.length, 'Nobody crossed the border after him', crossed.slice(0, 5));
  const standing = host.snapshot();
  check(standing.walkedOut === 1 && standing.fights >= 1, `The standing: walked out ${standing.walkedOut}, fought ${standing.fights}`);

  // --- 4. Save and reload -------------------------------------------------------------------------
  const reloaded = await saveAndReload();
  await wait(1);
  check(reloaded, 'The adventure saves and loads again through the recovery checkpoint');
  check(JSON.stringify(host.snapshot()) === JSON.stringify(standing), `After the reload the standing is still there: ${JSON.stringify(host.snapshot())}`);

  // --- 5. The gap over the western rim, sneaking: not noticed -------------------------------------
  // The route the people test proves (it is seen walked upright): down off the rim onto the terraces north of the cone of
  // the man opposite the town, across them, and over the plain to the foot of the rock's north-western cliffs.
  const west = { x: -2268, z: 1226.9 }, gapRoute = [{ x: -2252, z: 1226 }, { x: -2217, z: 1223 }, { x: -2172, z: 1214 }, { x: -2136, z: 1203 }];
  await travel(west);
  sneak(true);
  await wait(.5);
  check(groundKind(p().x, p().z) === 'terrace', 'Set down by the developer’s travel on the western terraces, where the gap route comes down off the rim');
  let highest = 0;
  const unseen = !(await along(gapRoute, 1.76, { limit: 40, until: () => ['noticed', 'hostile'].includes(view().phase), each: () => { highest = Math.max(highest, view().suspicion ?? 0); } }));
  sneak(false);
  metrics.steps.west = { t: seconds(), at: { x: +p().x.toFixed(1), z: +p().z.toFixed(1) }, highest: +highest.toFixed(2), phase: view().phase };
  check(unseen && groundKind(p().x, p().z) === 'plain' && Math.hypot(p().x + 2136, p().z - 1203) < 2, 'Sneaking through the gap between the western watchers’ cones, over the terraces and the plain to the rock’s foot, nobody notices him', metrics.steps.west);
  metrics.movement = drive ? 'ordinary keyboard input' : 'scripted positions';
  metrics.seconds = +seconds();
  const s = state();
  metrics.state = { region: s.region, frameErrors: s.frameErrors, loadingMode: s.loadingMode, loading: s.loading };
  return { ok: true, checks, metrics };
}
