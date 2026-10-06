/** Runs the public F8 demonstration with actual movement, conversations and
 * forge interactions. Only starting a fresh playtest may relocate the player. */
export async function runDwarfAutoplayChecks(h) {
  const checks = [], stages = new Set(), started = performance.now();
  const frames = async (n = 1) => { for (let i = 0; i < n; i++) await new Promise(requestAnimationFrame); };
  const status = () => ({ mode: h.mode(), pilot: h.pilot(), quest: h.quest(), position: h.position(), inside: h.host.current, near: h.host.nearby()?.kind });
  const check = (ok, message) => { if (!ok) throw new Error(`${message}; ${JSON.stringify(status())}`); checks.push(message); };
  const until = async (condition, message, seconds = 25) => {
    const end = performance.now() + seconds * 1000;
    while (!condition()) {
      if (performance.now() > end || !h.pilot().enabled) throw new Error(`${message}; ${JSON.stringify(status())}`);
      await frames();
    }
  };
  async function start() {
    h.open(); await frames(2);
    const button = document.getElementById('test-dwarf-autoplay');
    check(h.mode() === 'testing' && !!button && !button.disabled, 'F8 includes the Dwarfland quest playtest');
    check(button.parentElement.getAttribute('aria-labelledby') === 'test-silver-heading', 'The introduction is under Silver side stories before named teachers');
    button.click(); await h.ready?.(); await frames(2);
    check(h.isTesting() && h.pilot().enabled && h.pilot().id === 'dwarf', 'The button starts isolated Dwarfland autoplay');
    check(!h.host.active && !h.host.model.canEnter('west') && h.quest().stage === 'unoffered', 'Fresh testing starts at the closed West Hold gate without bypassing admission');
    check(!h.skills.taught('dwarvenSmithing'), 'The secret technique begins unlearned in a fresh playtest');
  }
  await h.prepare(); await frames(2);
  const saved = JSON.stringify(h.checkpointCopy());
  check(!!h.checkpointCopy(), 'A normal adventure checkpoint exists before testing');
  await start();
  const initialXp = { smithing: h.skills.xp('smithing'), dwarvenSmithing: h.skills.xp('dwarvenSmithing'), construction: h.skills.xp('construction') };
  let previous = h.position(), previousInside = h.host.current, walked = 0, largestStep = 0, portals = 0;
  let resumeChecked = false, saveChecked = false, lastLog = performance.now(), capturedGate = false, capturedForge = false;
  const deadline = performance.now() + 600000;
  while (h.pilot().enabled) {
    await frames();
    const q = h.quest(), here = h.position(), inside = h.host.current;
    stages.add(q.stage);
    if (performance.now() > deadline) throw new Error(`Dwarf introduction exceeded ten minutes; ${JSON.stringify(status())}`);
    const step = Math.hypot(here.x - previous.x, here.z - previous.z);
    if (inside === previousInside) { walked += step; largestStep = Math.max(largestStep, step); }
    else { portals++; check(h.host.model.canEnter('west'), 'Every city portal crossing follows earned admission'); }
    previous = here; previousInside = inside;
    if (q.active && h.tracked() !== 'dwarf-introduction') throw new Error('The dwarf introduction lost objective focus');
    if (q.stage === 'service' && h.mode() === 'playing' && !resumeChecked) {
      h.stop('Test player takeover');
      const before = h.position(); await frames(8);
      check(Math.hypot(h.position().x - before.x, h.position().z - before.z) < .05, 'Taking control stops computer movement');
      check(h.resume() && h.pilot().id === 'dwarf', 'P resumes the focused dwarf introduction outdoors');
      resumeChecked = true;
    }
    if (q.stage === 'enter' && !capturedGate) { console.log('DWARF_CAPTURE gate-earned'); capturedGate = true; }
    if (inside && q.stage === 'forge' && q.forgeStep === 1 && h.mode() === 'playing' && !saveChecked) {
      h.stop('Testing the forge checkpoint');
      const snapshot = h.host.snapshot(), xp = h.skills.xp('dwarvenSmithing');
      check(h.save() && h.reload(), 'An in-progress forge lesson saves and reloads through the real checkpoint path');
      await frames(2);
      check(!h.host.active && h.host.model.canEnter('west'), 'Reload safely returns outside with earned West Hold entry');
      check(JSON.stringify(h.host.snapshot()) === JSON.stringify(snapshot) && h.quest().forgeStep === 1, 'Reload preserves the exact forge step and city permissions');
      check(h.skills.xp('dwarvenSmithing') === xp, 'Reload does not award lesson XP');
      check(h.resume() && h.pilot().id === 'dwarf', 'P resumes the saved lesson and can re-enter the city');
      saveChecked = true; previous = h.position(); previousInside = h.host.current;
    }
    if (inside && q.stage === 'forge' && q.forgeStep >= 2 && !capturedForge) { console.log('DWARF_CAPTURE riveting'); capturedForge = true; }
    if (performance.now() - lastLog > 15000) { console.log('DWARF_PROGRESS ' + JSON.stringify(status())); lastLog = performance.now(); }
  }
  check(h.quest().complete && h.mode() === 'playing' && h.host.current === 'west-baldro', 'Autoplay completes the introduction inside the actual West Hold workshop');
  check(['service', 'report', 'enter', 'smith', 'forge', 'reward', 'complete'].every(s => stages.has(s)), 'The run visits admission, entry, artisan, forge and reward stages');
  check(h.host.model.canEnter('west') && !h.host.model.canEnter('east'), 'The western introduction does not grant permission to the independent eastern city');
  check(h.skills.taught('dwarvenSmithing'), 'The artisan teaches the guarded Dwarven Smithing subset');
  check(h.skills.xp('smithing') === initialXp.smithing + 45 && h.skills.xp('dwarvenSmithing') === initialXp.dwarvenSmithing + 30
    && h.skills.xp('construction') === initialXp.construction + 30, 'Admission and lesson award their experience exactly once');
  check(walked > 100 && largestStep < 2 && portals >= 2, 'The demonstration walks the mountain approach and interior, using only real city portals');
  check(resumeChecked && saveChecked, 'The run exercises both manual takeover and mid-lesson save/resume');
  check(h.frameErrors().count === 0, 'The full introduction renders without frame errors');
  check(JSON.stringify(h.checkpointCopy()) === saved, 'The full playtest leaves the normal saved adventure unchanged');
  console.log('DWARF_CAPTURE lesson-complete'); await frames(5);
  const completion = { stages: [...stages], walked, largestStep, portals, elapsedMs: Math.round(performance.now() - started) };
  await start();
  await until(() => h.quest().stage === 'service' && h.mode() === 'playing', 'The completed introduction could not be restarted');
  check(h.quest().forgeStep === 0 && !h.host.model.canEnter('west'), 'Repeating the playtest resets entry and the lesson');
  check(JSON.stringify(h.checkpointCopy()) === saved, 'Repeated playtests still protect the normal adventure');
  h.stop();
  return { ok: true, dwarfAutoplayChecks: checks.length, checks, completion };
}
