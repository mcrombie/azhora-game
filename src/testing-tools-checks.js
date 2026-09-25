import { BEN } from './spider-quest.js';
import { LIZ } from './cat-quest.js';
import { TROY } from './murder-quest.js';
import { CAGNEY } from './cagney-quest.js';
import { regions } from './region-world.js';

/** Exercise the public playtest, story, travel and hack controls without playing entire quests. */
export async function runTestingToolsChecks(h) {
  const started = performance.now(), checks = [];
  const check = (ok, message) => {
    if (!ok) throw new Error(`Testing tools: ${message}; ${JSON.stringify(h.state())}`);
    checks.push(message);
  };
  const control = (id, expand = false) => {
    const node = document.getElementById(id), section = node?.closest('details');
    if (expand && section && !section.open) section.querySelector('summary').click();
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
    }
    for (const [kind, npcId] of [['satchel', 'relay-clerk'], ['republic', 'relay-republican'], ['recall', null]]) {
      await open(); control(`test-story-${kind}`, true).click();
      check(h.state().mode === 'dialogue' && h.state().testingEnabled && !h.autoplay.active,
        `${kind} opens its story decision in the testing session`);
      check(h.dialogueNpc() === (npcId ?? h.recall().courier), `${kind} opens the intended character's conversation`);
      unchanged(`${kind} story jump`);
    }
    await open();
    const country = control('test-country'), place = control('test-place');
    const pueth = regions.find(region => region.name === 'Pueth');
    country.value = pueth.name; country.dispatchEvent(new Event('change', { bubbles: true }));
    place.value = '0'; control('test-goto').click();
    check(h.state().mode === 'playing' && Math.hypot(h.position().x - pueth.spawn.x, h.position().z - pueth.spawn.z) < .01,
      'Country and place travel reaches the selected arrival');
    unchanged('Country travel');
    await open();
    const drent = regions.find(region => region.id === 1).spawn;
    control('test-point').value = `${drent.x}, ${drent.z}`; control('test-point-go').click();
    check(h.state().mode === 'playing' && Math.hypot(h.position().x - drent.x, h.position().z - drent.z) < .01,
      'Coordinate travel reaches the requested point');
    unchanged('Coordinate travel');
    await open();
    const revealed = h.state().chartRevealed;
    control('test-reveal-chart').click();
    check(h.state().chartRevealed === !revealed, 'Map reveal toggles on or off');
    control('test-reveal-chart').click();
    check(h.state().chartRevealed === revealed, 'Map reveal returns to its previous setting');
    unchanged('Map reveal');
    control('test-dev-horse').click();
    check(h.state().mode === 'playing' && h.state().testingEnabled && h.horse().owned && h.horse().developerMount,
      'Developer horse is granted as a testing mount');
    unchanged('Developer horse');
    await open();
    return { testingToolsChecks: checks.length, checks, elapsedMs: Math.round(performance.now() - started) };
  } finally { h.stop(); }
}
