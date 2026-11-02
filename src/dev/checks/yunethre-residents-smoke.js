import {TOWER, TOWER_DOOR} from '../../app/exploration/tower-state.js';
import {guildWizardPosition} from '../../app/exploration/tower-wizard-host.js';
import {LIZEEM_RESIDENTS} from '../../content/regions/minora-frontier/lizeem-residents.js';
import {canStand} from '../../gameplay/movement/locomotion.js';
import {RIDE} from '../../gameplay/movement/riding.js';

const assert = (value, message) => {if (!value) throw Error(message);};
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const press = code => {
  document.dispatchEvent(new KeyboardEvent('keydown', {code, bubbles: true, cancelable: true}));
  document.dispatchEvent(new KeyboardEvent('keyup', {code, bubbles: true}));
};
async function until(api, predicate, label, timeout = 3000) {
  const end = performance.now() + timeout;
  while (!predicate()) {
    assert(performance.now() < end, label);
    await pause(50); api.step(0, 0);
  }
}
const history = api => JSON.stringify(api.chapter.save(null, null).history);
const player = api => {const [x, y, z] = api.state().position; return {x, y, z};};
const person = (api, id) => api.testWorld.state().residents?.people.find(value => value.id === id);

function approach(api, id) {
  const resident = person(api, id);
  assert(resident?.visible, 'The ordinary Minora resident is visibly constructed');
  const [x, y, z] = resident.position;
  // Use the real target/sight test and clearance for a horse with its rider.
  // This avoids turning a building corner or a raised pavement into a false failure.
  for (const radius of [2.6, 3, 2.2, 3.4]) for (let i = 0; i < 24; i++) {
    const at = {x: x + Math.sin(i * Math.PI / 12) * radius, z: z + Math.cos(i * Math.PI / 12) * radius};
    at.y = api.testWorld.supportAt?.(at.x, at.z, {maxY: y, stepUp: .45, groundSlope: false})?.height
      ?? api.testWorld.heightAt(at.x, at.z);
    if (api.testWorld.waterAt(at.x, at.z) - at.y > RIDE.wadingDepth) continue;
    if (!canStand(at.x, at.z, {...api.testWorld, bodyHeight: RIDE.bodyHeight}, RIDE.radius, at.y)) continue;
    if (api.testWorld.residentTarget(at)?.id === id) return {...at, yaw: Math.atan2(x - at.x, z - at.z)};
  }
  throw Error('No clear mounted conversation approach to ' + id);
}

async function talk(api, id, mounted, originalHistory, originalCampaign) {
  await until(api, () => document.getElementById('resident-interact')?.hidden === false,
    'The ordinary resident F prompt did not appear');
  const prompt = document.getElementById('resident-interact');
  assert(prompt?.textContent.includes('Rudiger'), 'F prompt identifies the nearby resident');
  assert(api.testWorld.residentTarget(player(api))?.id === id, 'The nearby target is the intended resident');
  assert(api.stable.mounted === mounted, 'Conversation starts in the intended riding state');
  press('KeyF');
  assert(api.residentHost.state().speaking === id && api.state().mode === 'briefing',
    'F opens ordinary resident dialogue ' + (mounted ? 'on the owned horse' : 'on foot'));
  const dialog = document.getElementById('resident-dialog');
  assert(dialog && !dialog.hidden && document.getElementById('resident-words').textContent.trim(),
    'The resident dialogue and greeting are visible');
  assert(prompt.hidden, 'The proximity prompt clears during conversation');

  const elapsed = api.chapter.state().elapsed, position = [...person(api, id).position], topics = {};
  for (const topic of ['work', 'war', 'future', 'memory', 'news']) {
    const button = dialog.querySelector(`[data-topic="${topic}"]`);
    assert(button && !button.hidden, 'Postwar conversation offers ' + topic);
    button.click(); topics[topic] = document.getElementById('resident-words').textContent;
    assert(topics[topic].trim(), 'Authored conversation text exists for ' + topic);
    api.step(.04, 3);
  }
  assert(topics.work !== topics.memory, 'Work and personal war memory are distinct topics');
  assert(api.chapter.state().elapsed === elapsed, 'Conversation holds the active Chapter 2 clock');
  assert(JSON.stringify(person(api, id).position) === JSON.stringify(position), 'The resident stops wandering to speak');
  assert(history(api) === originalHistory, 'Conversation does not rewrite saved Chapter 1 history');
  assert(JSON.stringify(api.chapter.residentCampaign()) === originalCampaign, 'Conversation does not advance the completed campaign');
  assert(api.stable.mounted === mounted, 'Conversation does not unexpectedly dismount the player');
  press('Tab');
  assert(document.activeElement?.closest('#resident-dialog'), 'Tab remains inside the conversation');
  return {mounted, prompt: prompt.textContent, elapsed, topics};
}

// Isolated Chapter 2 check. The native launcher owns the profile, screenshot and
// process. This fixture prepares Minora once, never visits another region, and
// leaves an ordinary mounted conversation open for its final screenshot.
export async function conversations(api) {
  assert(api.state().launch === 'yunethre', 'Launch Chapter 2 for the resident check');
  assert(api.residentHost && api.civicHost && api.guildWizards, 'Shared conversation hosts exist in Chapter 2');
  assert(api.stable.owned, 'Chapter 2 retains the player\'s owned horse');
  window.dispatchEvent(new Event('focus'));
  const originalHistory = history(api), originalCampaign = JSON.stringify(api.chapter.residentCampaign());
  assert(api.chapter.residentCampaign().winner, 'Residents receive the completed war winner');
  assert(api.chapter.residentCampaign().regions?.isareos, 'Residents receive the actual Minora ledger');
  assert(!api.testWorld.state().exteriorLoaded, 'Fresh check begins before Minora exterior preparation');

  assert(api.chapter.interact() && api.chapter.choose('accept'), 'Accept Taleth\'s Chapter 2 assignment');
  assert(await api.chapterTransition('tower'), 'The existing tower chamber opens');
  const wizard = guildWizardPosition('hadrin');
  await api.visit({...wizard, z: wizard.z + 2}); api.step(0, 0);
  assert(!document.getElementById('guild-wizard-interact').hidden, 'Optional guild wizard F prompt is visible');
  press('KeyF');
  assert(api.guildWizards.state().id === 'hadrin' && api.state().mode === 'briefing', 'F reaches the optional guild wizard');
  const wizardElapsed = api.chapter.state().elapsed;
  api.step(.04, 5);
  assert(api.chapter.state().elapsed === wizardElapsed && history(api) === originalHistory, 'Wizard conversation preserves chapter time and war history');
  press('Escape');
  assert(api.state().mode === 'playing' && !api.guildWizards.state().open, 'Escape leaves the wizard conversation');
  assert(!api.testWorld.state().exteriorLoaded, 'Wizard conversation does not load the exterior');

  await api.visit({...TOWER_DOOR, y: TOWER.y}); press('KeyF');
  await until(api, () => api.chapter.state().departed && api.state().mode === 'playing',
    'The physical tower door did not open into Minora', 300000);
  assert(api.testWorld.state().exteriorLoaded && !api.testWorld.state().inside, 'One departure prepared the Minora exterior');
  const id = 'rudiger', resident = LIZEEM_RESIDENTS.find(value => value.id === id);
  await api.visit({x: resident.x, z: resident.z + 4});
  for (let i = 0; i < 8; i++) api.step(.04, .04);
  const at = approach(api, id);
  await api.visit(at); api.look({yaw: at.yaw + Math.PI, pitch: .22, distance: 6});
  const foot = await talk(api, id, false, originalHistory, originalCampaign);
  press('Escape');
  assert(api.state().mode === 'playing' && api.residentHost.state().speaking === null, 'Escape resumes exploration after ordinary conversation');
  const beforeResume = api.chapter.state().elapsed;
  api.step(.04, 1);
  assert(api.chapter.state().elapsed > beforeResume, 'The outdoor chapter clock resumes after Goodbye');

  // Only place the already-owned horse in this isolated fixture. Mounting and
  // speaking still go through the same G/F input paths used by the player.
  const riding = api.stable.snapshot(), mountedAt = player(api);
  api.stable.restore({...riding, horse: {x: mountedAt.x, z: mountedAt.z, yaw: at.yaw}});
  api.step(.04, .04); press('KeyG'); api.step(.04, .04);
  assert(api.stable.mounted && api.state().mount.kind === 'horse' && api.state().mount.horseSpeed === 1,
    'G mounts the owned horse, not a developer mount');
  const mounted = await talk(api, id, true, originalHistory, originalCampaign);
  // Leave the future topic visible; the harness itself never saves or advances
  // the historical campaign, and the paused dialogue makes a stable screenshot.
  document.querySelector('#resident-dialog [data-topic="future"]').click();
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  assert(!api.state().frameErrors.length, 'No conversation renderer errors');
  return {checks: ['Optional wizard dialogue', 'Single Minora departure', 'Ordinary resident F prompt on foot and horseback',
    'Postwar topics', 'Chapter clock held', 'Historical campaign unchanged', 'Owned horse retained'],
  winner: api.chapter.residentCampaign().winner, speaker: id, foot, mounted, position: api.state().position,
  mount: api.state().mount, regions: api.state().enabledRegions, errors: api.state().frameErrors};
}
