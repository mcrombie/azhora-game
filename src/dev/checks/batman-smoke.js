import { BAT_CAVE, BAT_LANDING } from '../../content/regions/suval-highlands/suval-highlands.js';
import { BATSMASHER, BATMAN_QUEST } from '../../content/quests/batman/batman-quest.js';
import { PORT_CALOS_PLACEHOLDER_NAMES } from '../../content/regions/port-calos/port-calos-roster.js';
import { PORT_CALOS_NPC_IDS, PORT_CALOS_PLACEHOLDER } from '../../content/regions/port-calos/port-calos-people.js';
import { BATSMASHER_STAND } from '../../content/quests/batman/batman-quest-host.js';
import { FERRY_HOSTS } from '../../world/travel/ferry.js';
import { insideRegion } from '../../world/terrain/region-world.js';
import { COPPER_ITEM } from '../../gameplay/inventory/economy.js';
import { SUVAL_FALSE_PASSES } from '../../content/regions/minora-frontier/frontier-ridges.js';
import { ZECRON } from '../../content/regions/iscare/iscare-world.js';
import { DEVELOPER_BAT } from '../tools/developer-bat.js';

/** Real renderer, real dialogue buttons, normal checkpoint validation and a carried player. */
export async function runBatmanChecks(h) {
  const checks = [], assert = (value, message) => { if (!value) throw new Error(message); checks.push(message); };
  const { host, player, npcById, skills, crime, combat, inventory, frames } = h;
  const advance = () => { for (let i = 0; i < 20 && h.dialogue() && !h.choices().length; i++) h.nextSpeech(); };
  const choose = words => { advance(); const button = h.choices().find(b => b.textContent.includes(words)); if (!button) throw new Error('Missing dialogue: '+words); button.click(); };
  const warp = p => h.warp(p.x, p.z);
  h.prepare(); await frames(3);
  for (const name of PORT_CALOS_PLACEHOLDER_NAMES) assert(npcById.get(`port-calos-${name.toLowerCase()}`)?.name === name, `Resident ${name} exists`);
  for (const id of PORT_CALOS_NPC_IDS.filter(id => id !== 'port-calos-harbourmaster')) {
    const npc = npcById.get(id); h.talk(npc); advance();
    assert(h.speech() === PORT_CALOS_PLACEHOLDER && h.choices().length === 0, `${npc.name} has only the requested placeholder`); h.closeDialogue();
  }
  assert(npcById.get('cobble-jessi').name === 'Jesse', 'Jesse spelling is used in the renderer');
  assert(npcById.get('port-calos-harbourmaster').name === 'Hallie', 'Hallie keeps Port Calos');
  for (const person of Object.values(FERRY_HOSTS)) assert(npcById.get(person.id)?.look?.nautical === true, `${person.name} wears nautical clothes`);
  const catie = npcById.get('katy'); warp(catie.actor.group.position); h.talk(catie); choose('I will look');
  assert(host.quest.state().stage === 'searching', 'Catie starts the highland search');
  await h.capture('port-calos');
  const officer = npcById.get(BATSMASHER.id); assert(!!officer, 'Batsmasher is an active character');
  warp(BATSMASHER_STAND); h.talk(officer); choose('Accept the bounty');
  assert(host.quest.state().bounty === 'accepted', 'Officer offers the opposing bounty');
  warp({ x: BAT_CAVE.perch.x, z: BAT_CAVE.perch.z + 3 }); await frames(3);
  await h.capture('cave'); h.talkBat(); choose('Speak to him');
  assert(host.quest.state().stage === 'friendly', 'The cave has a peaceful branch');
  choose('Show me Suval');
  assert(host.mounted && skills.taught('flying'), 'The flying lesson mounts the player');
  assert(host.flight.state().routeLength < 3000, 'The scenic tour uses a short route through Suval');
  assert(host.quest.state().bounty === 'declined', 'Taking the peaceful flight closes the bounty');
  const paused = JSON.stringify(host.flight.snapshot()); h.pause(true); await frames(5);
  assert(JSON.stringify(host.flight.snapshot()) === paused, 'Pause freezes the flight'); h.pause(false);
  h.freeze(true); for (let i = 0; i < 100; i++) host.tick(.1, { playing: true });
  assert(player.group.position.y > h.world.heightAt(player.group.position.x, player.group.position.z) + 10, 'Player is carried above the terrain');
  assert(host.flight.state().visited.length === 0, 'The full Suval chart is held until the passenger lands');
  const snapshot = h.snapshot(), traveled = host.flight.state().distance;
  assert(h.validate(snapshot).ok, 'Mid-flight checkpoint is valid');
  await h.restore(snapshot); h.freeze(true);
  assert(host.mounted && Math.abs(host.flight.state().distance - traveled) < .1, 'Checkpoint restores the same flight position');
  await h.capture('flight');
  const carriedAt=player.group.position.clone(),groundInput=h.groundInputs();
  assert(!groundInput.sneaking&&!groundInput.autoplay&&player.group.position.distanceTo(carriedAt)<.1&&host.mounted, 'Ground controls and Recover cannot break a carried flight');
  for (let i = 0; i < 800 && host.mounted; i++) {
    host.tick(.2, { playing: true });
    if (host.mounted && host.flight.state().visited.length) throw new Error('The Suval chart was awarded before landing');
  }
  assert(host.quest.state().stage === 'complete', 'Flight completes the peaceful quest');
  assert(host.flight.state().visited.length === host.routes.cells.length, 'Landing reveals the whole Suval chart');
  assert(host.routes.cells.every(c => h.knows(c.x,c.z)), 'All 63 Suval hexes are revealed at landing without flying over every one');
  assert(insideRegion('West Suval', player.group.position.x, player.group.position.z) && !insideRegion('East Suval',player.group.position.x,player.group.position.z), 'Passenger lands on the accessible western side');
  assert(Math.hypot(player.group.position.x-BAT_LANDING.x,player.group.position.z-BAT_LANDING.z) < 5, 'Landing is at the northern border');
  const xp = skills.xp('flying'); assert(xp >= BATMAN_QUEST.flyingXp, 'Flying experience is awarded');
  choose('Thank you'); await h.capture('landing');
  for (let i = 0; i < 6000 && host.flight.state().stage !== 'home'; i++) host.tick(.2, { playing: true });
  assert(host.quest.state().returned, 'Batman flies home');
  assert(skills.xp('flying') === xp, 'Returning home does not pay experience again');
  assert(h.validate(h.snapshot()).ok, 'Completed tour checkpoint is valid');
  await h.restore(h.snapshot()); h.freeze(true);
  assert(skills.xp('flying') === xp && !host.mounted, 'Reloading a completed tour does not repeat the lesson');

  // Reset only this isolated test fixture, then drive the conflicting combat and bounty branch.
  h.resetBat(); warp({ x: BAT_CAVE.perch.x, z: BAT_CAVE.perch.z + 3 });
  h.talk(officer); choose('Accept the bounty'); h.talkBat(); choose('Attack him');
  assert(combat.state.enemies.some(e => e.kind === 'batman' && e.maxHp === 420), 'Attacking starts the powerful vigilante’s self-defense');
  const enemy = combat.state.enemies.find(e => e.kind === 'batman');
  h.defeatBat(enemy); host.tick(.01, { playing: true });
  assert(host.quest.state().stage === 'dead', 'Combat death closes the peaceful route');
  warp({x:enemy.x,z:enemy.z+1}); host.takeHead(); choose('Take the head');
  assert(inventory.count(BATMAN_QUEST.headItem) === 1, 'The officer’s proof is a real inventory item');
  const purse = inventory.count(COPPER_ITEM); h.talk(officer); choose('Hand over');
  assert(inventory.count(COPPER_ITEM) === purse + 100 && inventory.count(BATMAN_QUEST.headItem) === 0, 'Bounty consumes the head and pays exactly 100 copper');
  assert(h.validate(h.snapshot()).ok, 'Bounty ending saves correctly');

  h.closeDialogue(); warp({x:-404,z:703}); h.enableDevBat();
  assert(h.devBat.active, 'The Hacks button grants a developer bat');
  h.stepDev(1,{lift:1,dx:1,dz:0}); assert(h.devBat.view().position.y > h.world.heightAt(-404,703)+8, 'Developer bat responds to climb and steering');
  // Drive held keys through the real renderer input loop, high enough that the
  // measurement tests speed rather than a nearby ridge blocking the mount.
  h.stepDev(18, { lift: 1 }); h.freeze(false);
  const devKey = (code, down) => { const e = new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true, cancelable: true }); document.dispatchEvent(e); return e; };
  try {
    devKey('KeyW', true); await frames(5);
    assert(Math.abs(h.devBat.view().speed - DEVELOPER_BAT.speed) < .01, 'Developer bat ordinary movement retains its normal pace');
    devKey('ShiftLeft', true); await frames(5);
    assert(Math.abs(h.devBat.view().speed - DEVELOPER_BAT.boost) < .01, 'Holding Shift retains the existing developer bat boost');
    const tab = devKey('Tab', true); await frames(5);
    assert(tab.defaultPrevented && Math.abs(h.devBat.view().speed - DEVELOPER_BAT.turbo) < .01, 'Holding Tab gives the developer bat super-fast turbo without moving UI focus');
    devKey('Tab', false); await frames(5);
    assert(Math.abs(h.devBat.view().speed - DEVELOPER_BAT.boost) < .01, 'Releasing Tab immediately restores the held Shift speed');
    devKey('ShiftLeft', false); await frames(5);
    assert(Math.abs(h.devBat.view().speed - DEVELOPER_BAT.speed) < .01, 'Releasing the speed keys restores ordinary developer bat flight');
  } finally {
    for (const code of ['KeyW', 'ShiftLeft', 'Tab']) devKey(code, false);
    h.freeze(true);
  }
  h.openTesting(); h.travel(BAT_LANDING); assert(!h.devBat.active, 'F8 travel ends developer flight safely');
  await h.capture('developer-landing');
  // Authored terrain views share the same renderer/height field as the quest run.
  for (const pass of SUVAL_FALSE_PASSES.slice(0,2)) {
    const at=pass.route[pass.route.length-1],end=pass.end;
    await h.viewAt(at,{yaw:Math.atan2(at.x-end.x,at.z-end.z),pitch:.24,distance:12});
    await h.capture(pass.kind);
  }
  await h.viewAt({x:-254,z:977},{yaw:1.8,pitch:.56,distance:92,up:14});await h.capture('highlands');
  await h.viewAt({x:-242,z:1020},{yaw:-1.1,pitch:.34,distance:210,up:34});await h.capture('ridge-panorama');
  await h.viewAt({x:-491,z:671},{yaw:.65,pitch:.34,distance:130,up:20});await h.capture('western-highlands');
  await h.viewAt({x:-296,z:1040},{yaw:-2.2,pitch:.18,distance:58,up:12});await h.capture('highland-path');
  await h.viewAt(ZECRON,{yaw:.8,pitch:.75,distance:78,up:3});await h.capture('zecron');
  assert(h.frameErrors() === 0, 'No renderer frame errors');
  return { ok: true, checks, cells: host.routes.cells.length, flyingXp: xp };
}
