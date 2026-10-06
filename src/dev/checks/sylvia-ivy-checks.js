import { SYLVIA, SYLVIA_STUDIO } from '../../gameplay/skills/performance/visual-arts.js';
import { IVY_PATCHES } from '../../content/quests/sylvia/ivy-sites.js';
import { COPPER_ITEM } from '../../gameplay/inventory/economy.js';
import { canStand } from '../../gameplay/movement/game-state.js';

/** Ordinary Sylvia dialogue and F-key work, with the real two-second clock. */
export async function runSylviaIvyChecks(h) {
  const checks = [], started = performance.now(), normal = h.saved();
  const check = (ok, name) => { if (!ok) throw new Error(name); checks.push(name); };
  const visit = async () => { h.close(); await h.visit(SYLVIA.id); await h.finish(); };
  const wait = async predicate => {
    const until = performance.now() + 15000;
    while (!predicate() && performance.now() < until) await h.frames(1);
    check(predicate(), 'The real ivy action finishes within its time budget');
  };
  h.prepare(); h.prepareGlun(); h.ivy.restore(); h.refresh(); await h.frames(3);
  for (const patch of IVY_PATCHES) {
    check(canStand(patch.stand.x, patch.stand.z, h.world, .45), `${patch.name} has a clear working position`);
    check(h.visible(patch.id), `${patch.name} is visibly overgrown before clearing`);
  }
  await visit();
  check(h.marker(SYLVIA.id).kind === 'deed', 'Sylvia advertises the ivy favor with a copper quest marker');
  check(!!document.querySelector('[data-choice="sylvia-visual-arts"]'), 'Her Visual Arts lesson remains available alongside the favor');
  await h.choose('sylvia-ivy-accept'); await h.finish(); h.close(); await h.frames(3);
  check(h.ivy.view().active, 'Sylvia accepts the ivy favor through her normal dialogue');
  const xp = h.skills.xp('farming'), money = h.inventory.count(COPPER_ITEM), hp = h.combat.state.player.hp;
  await h.capture('overgrown');
  const first = IVY_PATCHES[0];
  h.warp(first.stand.x, first.stand.z); await h.frames(3); h.tap('KeyF'); await h.frames(3);
  check(h.ivy.pose()?.id === first.id, 'F starts pulling the nearest ivy patch');
  h.warp(first.stand.x + 3, first.stand.z); await h.frames(3);
  check(!h.ivy.pose() && !h.ivy.isCleared(first.id) && h.skills.xp('farming') === xp,
    'Walking away interrupts the work without removing ivy or giving experience');
  for (const [index, patch] of IVY_PATCHES.entries()) {
    h.warp(patch.stand.x, patch.stand.z); await h.frames(3); h.tap('KeyF'); await h.frames(1);
    check(h.ivy.pose()?.id === patch.id, `The ordinary F prompt starts ${patch.name}`);
    await wait(() => h.ivy.isCleared(patch.id)); await h.frames(2);
    check(!h.visible(patch.id), `${patch.name} disappears when its roots are removed`);
    if (index === 1) {
      const partial = h.snapshot(); await h.restore(partial); await h.frames(3);
      check(IVY_PATCHES.slice(0, 2).every(p => h.ivy.isCleared(p.id) && !h.visible(p.id))
        && IVY_PATCHES.slice(2).every(p => !h.ivy.isCleared(p.id) && h.visible(p.id)),
      'Checkpoint reload keeps exactly the two cleared patches and the remaining growth');
    }
  }
  check(h.ivy.view().stage === 'report', 'Clearing all four patches directs the player back to Sylvia');
  check(h.combat.state.player.hp === hp, 'Drent ivy never harms the player');
  check(h.skills.xp('farming') === xp + 16, 'Four completed patches award Farming experience once each');
  await visit(); await h.choose('sylvia-ivy-report'); await h.finish(); h.close(); await h.frames(3);
  check(h.ivy.view().complete && h.inventory.count(COPPER_ITEM) === money + 24, 'Sylvia pays the promised reward once');
  check(h.marker(SYLVIA.id).kind === 'skill', 'After the favor, Sylvia still advertises her unlearned art lesson');
  const completed = h.snapshot(); await h.restore(completed); await h.frames(3);
  check(h.ivy.view().complete && !h.ivy.report().ok && h.inventory.count(COPPER_ITEM) === money + 24,
    'The completed favor and reward survive reload without another payment');
  check(canStand(SYLVIA_STUDIO.stand.x, SYLVIA_STUDIO.stand.z, h.world, .45), 'The spare easel remains accessible');
  check(h.saved() === normal, 'The isolated test preserves the normal saved adventure');
  check(!h.getState().frameErrors?.count, 'The ivy quest finishes without renderer errors');
  await h.capture('cleared');
  return { sylviaIvyChecks: checks.length, checks, elapsedMs: Math.round(performance.now() - started) };
}
