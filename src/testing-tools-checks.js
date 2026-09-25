import { BEN } from './spider-quest.js';
import { LIZ } from './cat-quest.js';
import { TROY } from './murder-quest.js';
import { CAGNEY } from './cagney-quest.js';

/** Exercise the public quest demo controls without waiting through the quests. */
export async function runTestingToolsChecks(h) {
  const started = performance.now(), checks = [];
  const check = (ok, message) => {
    if (!ok) throw new Error(`Testing tools: ${message}; ${JSON.stringify(h.state())}`);
    checks.push(message);
  };
  const control = id => {
    const node = document.getElementById(id);
    check(node && !node.disabled && node.getClientRects().length, `${id} is available`);
    return node;
  };
  const open = async () => {
    await h.open();
    check(h.state().mode === 'testing', 'Testing tools open');
  };
  await h.prepare(); await h.frames(2);
  const saved = h.saved();
  check(!!saved, 'A normal adventure checkpoint exists before testing');
  const unchanged = label => check(h.saved() === saved, `${label} preserves the normal checkpoint`);
  try {
    for (const [kind, npc] of [['ben', BEN], ['liz', LIZ], ['troy', TROY], ['cagney', CAGNEY]]) {
      await open();
      control(`test-${kind}-autoplay`).click();
      check(h.autoplay.active && h.autoplay.id === kind && h.state().testingEnabled,
        `${npc.name}'s card starts its own testing autoplay`);
      // Stop synchronously, before a frame can advance dialogue or movement.
      h.stop(); await h.frames(2);
      check(!h.autoplay.active, `${npc.name}'s autoplay stops cleanly`);
      unchanged(`${npc.name}'s autoplay`);
      await open();
      const quests = JSON.stringify(h.snapshot());
      control(`test-${kind}`).click();
      const player = h.position(), person = h.npcPosition(npc.id);
      check(person && Math.hypot(player.x - person.x, player.z - person.z) < 3.5,
        `${npc.name}'s jump reaches the actual character`);
      check(h.state().mode === 'playing' && h.state().testingEnabled && !h.autoplay.active,
        `${npc.name}'s jump leaves control with the player`);
      check(JSON.stringify(h.snapshot()) === quests, `${npc.name}'s jump preserves quest progress`);
      unchanged(`${npc.name}'s jump`);
    }
    await open(); control('test-ben-autoplay').click(); h.stop();
    check(h.autoplay.id === 'ben', 'An unfinished Ben pilot is the previous selection');
    await open(); control('test-main-autoplay').click();
    check(h.autoplay.active && h.autoplay.id === 'main', 'Main quest starts the road instead of resuming Ben');
    h.stop();
    check(!h.autoplay.active, 'Main quest autoplay stops cleanly');
    unchanged('Main quest autoplay');
    await open();
    const advanced = document.getElementById('testing-advanced');
    check(advanced, 'Advanced tools are available');
    if (!advanced.open) advanced.querySelector('summary').click();
    for (const id of ['ghost-dev-open', 'test-reveal-chart', 'test-country', 'test-place', 'test-goto']) control(id);
    advanced.querySelector('summary').click();
    check(!advanced.open, 'Advanced tools collapse again after use');
    unchanged('Advanced tools');
    return { testingToolsChecks: checks.length, checks, elapsedMs: Math.round(performance.now() - started) };
  } finally { h.stop(); }
}
