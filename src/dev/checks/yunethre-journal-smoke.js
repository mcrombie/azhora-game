// Native journal presentation only. The launcher captures each returned stage.
// Chapter commands establish isolated quest facts while the player remains on
// the already-loaded lookout; this fixture never prepares exterior scenery or
// claims to test physical travel or the Celder conversation itself.
const STAGES = ['initial', 'progress', 'chapter-two', 'chapter-one', 'celder'];
const runs = new WeakMap();
const assert = (value, message) => {if (!value) throw Error(message);};
const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const press = (code, target = document, key = code, shiftKey = code === 'KeyJ') => {
  target.dispatchEvent(new KeyboardEvent('keydown', {code, key, shiftKey, bubbles: true, cancelable: true}));
  target.dispatchEvent(new KeyboardEvent('keyup', {code, key, shiftKey, bubbles: true}));
};
const dialog = () => document.getElementById('yunethre-journal');
const card = () => document.getElementById('tower-main-quest');
const chapter = (api, id) => api.chapter.journal().chapters.find(value => value.id === id);
const entry = (api, id) => chapter(api, 'chapter-two').entries.find(value => value.id === id);
const row = id => dialog().querySelector(`[data-quest="${id}"]`);
function command(api, value) {
  const result = api.chapter.command(value);
  assert(result.ok, 'Journal fixture command failed: ' + JSON.stringify(value) + ' / ' + result.reason);
}
function tab(id) {
  const button = dialog().querySelector(`[role="tab"][data-chapter="${id}"]`);
  assert(button, 'Journal chapter tab exists: ' + id); button.click();
  assert(button.getAttribute('aria-selected') === 'true'
    || dialog().querySelector(`[data-chapter="${id}"]`)?.getAttribute('aria-selected') === 'true',
  'The selected chapter tab is exposed accessibly: ' + id);
  assert(document.getElementById('yunethre-journal-panel').getAttribute('aria-labelledby') === 'yunethre-journal-tab-' + id,
    'The journal panel is labelled by its selected chapter');
}
function assertModal(api) {
  const view = dialog();
  assert(view instanceof HTMLDialogElement && view.open && view.matches(':modal'), 'Journal opens as a native modal dialog');
  assert(api.state().mode === 'briefing', 'The modal holds exploration in briefing mode');
  const elapsed = api.chapter.state().elapsed;
  for (let i = 0; i < 3; i++) api.step(.04, 4);
  assert(api.chapter.state().elapsed === elapsed, 'Reading the journal does not spend chapter time');
}
function closeWith(api, code) {
  press(code);
  assert(!dialog().open && api.state().mode === 'playing', code + ' closes the journal and restores exploration');
}
async function openFromCard(api) {
  await frame();
  const button = card()?.querySelector('.yunethre-open-journal');
  assert(button && !card().hidden, 'Visible quest card offers the journal button');
  button.click(); assertModal(api);
}
function assertFacts(api, completed, outstanding) {
  for (const id of completed) {
    assert(entry(api, id)?.status === 'completed', 'Recorded chapter fact is completed: ' + id);
    assert(row(id)?.dataset.status === 'completed', 'Completed fact appears in the rendered log: ' + id);
  }
  for (const id of outstanding) {
    assert(entry(api, id)?.status !== 'completed', 'Unperformed objective is not marked complete: ' + id);
    assert(row(id) && row(id).dataset.status !== 'completed', 'The log preserves the unfinished objective: ' + id);
  }
}

export async function review(api, stage) {
  assert(STAGES.includes(stage), 'Unknown Yunethre journal review stage: ' + stage);
  if (stage === 'initial') {
    assert(api.state().launch === 'yunethre' && api.testWorld.state().room === 'lookout', 'Start this review at the fresh Chapter 2 lookout');
    assert(!api.chapter.state().briefed && api.chapter.state().premise.source === 'unattended', 'Review uses the unattended opening, not a played Chapter 1 save');
    runs.set(api, {next: 0, position: JSON.stringify(api.state().position),
      history: JSON.stringify(api.chapter.save(null, null).history), checks: []});
  }
  const run = runs.get(api);
  assert(run && STAGES[run.next] === stage, 'Run the journal stages once in the documented order');
  window.dispatchEvent(new Event('focus'));

  if (stage === 'initial') {
    api.step(0, 0); await frame();
    assert(card() && !card().hidden && card().classList.contains('yunethre-quest-card'), 'Chapter-owned quest card is visible on the lookout');
    assert(api.chapter.journal().active.id === 'assignment', 'Fresh objective asks for Taleth\'s assignment');
    assert(card().querySelector('[data-quest="assignment"]')?.dataset.status === 'current', 'HUD checklist distinguishes the current assignment');
    press('KeyJ', document, 'j', false);assert(document.getElementById('birding-dialog')?.open,'J retains the nature life list');press('Escape');
    press('KeyJ', document, 'j'); assertModal(api); closeWith(api, 'Escape');
    await openFromCard(api); closeWith(api, 'KeyJ');
    run.checks.push('Shift+J and card button open the quest journal; J retains the nature life list');
  } else if (stage === 'progress') {
    for (const value of [{type: 'brief'}, {type: 'depart'}, {type: 'visit', place: 'town'}]) command(api, value);
    api.step(0, 0); await frame();
    const model = api.chapter.journal();
    assert(model.active.id === 'centaur-consent' && model.active.destination.id === 'centaurs', 'Town visit points to the missing centaur agreement');
    assert(!card().hidden && card().textContent.includes(model.active.title), 'HUD updates its objective from the new chapter facts');
    assert(card().querySelector('[data-quest="centaur-consent"]')?.dataset.status === 'current', 'HUD makes missing consent explicit');
    assert(api.chapter.state().battle.status === 'pending' && !api.chapter.state().compact.centaurs, 'Visiting town has not manufactured peace');
    run.checks.push('HUD follows chapter facts and asks for explicit consent');
  } else if (stage === 'chapter-two') {
    await openFromCard(api); tab('chapter-two');
    assertFacts(api, ['assignment', 'departure', 'town-terms'], ['centaur-meeting', 'centaur-consent', 'celder-meeting', 'celder-consent', 'peace', 'town-decision', 'return']);
    assert(dialog().textContent.includes('Completed quests'), 'Chapter 2 has a separate completed quest log');
    run.checks.push('Chapter 2 log marks only the three recorded facts completed');
  } else if (stage === 'chapter-one') {
    assertModal(api); tab('chapter-one');
    const prior = chapter(api, 'chapter-one');
    assert(prior.provenance === 'unattended' && prior.entries.every(value => value.status === 'information'), 'Unattended Chapter 1 is world history, not player achievements');
    assert(!dialog().querySelector('[data-status="completed"]'), 'The unattended history panel has no completed personal quest rows');
    assert(!prior.entries.some(value => ['chapter-one-horse', 'chapter-one-assignment', 'chapter-one-review'].includes(value.id)
      || value.id.startsWith('chapter-one-encounter-')), 'Starting horse and tower access do not fabricate hero achievements');
    assert(row('chapter-one-unattended') && document.getElementById('yunethre-journal-panel').textContent.includes(prior.summary), 'Unattended provenance and explanation appear in the actual panel');
    press('ArrowRight', dialog().querySelector('[data-chapter="chapter-one"]'), 'ArrowRight');
    assert(dialog().querySelector('[data-chapter="chapter-two"]')?.getAttribute('aria-selected') === 'true', 'Right arrow selects Chapter 2');
    press('ArrowLeft', dialog().querySelector('[data-chapter="chapter-two"]'), 'ArrowLeft');
    assert(dialog().querySelector('[data-chapter="chapter-one"]')?.getAttribute('aria-selected') === 'true', 'Left arrow returns to Chapter 1');
    run.checks.push('Unattended provenance is truthful; chapter tabs support arrow navigation');
  } else if (stage === 'celder') {
    closeWith(api, 'KeyJ');
    command(api, {type: 'visit', place: 'celder'});
    assert(entry(api, 'celder-meeting').status === 'completed' && entry(api, 'celder-consent').status !== 'completed', 'Celder meeting alone is not consent');
    command(api, {type: 'compact', side: 'celder'});
    api.step(0, 0); press('KeyJ', document, 'j'); assertModal(api); tab('chapter-two');
    assertFacts(api, ['assignment', 'departure', 'town-terms', 'celder-meeting', 'celder-consent'], ['centaur-consent', 'peace', 'town-decision', 'return']);
    const model = api.chapter.journal();
    assert(model.active.id === 'centaur-consent' && model.active.destination.id === 'centaurs', 'Celder-first agreement targets the remaining centaur consent');
    assert(model.active.action.includes('Return to the centaur camp'), 'Next action gives the explicit route back from Canerd');
    assert(api.chapter.state().battle.status === 'pending' && !api.chapter.state().celderAlliance, 'One consent does not avert battle or grant a military alliance');
    run.checks.push('Celder-first agreement is logged and the missing centaur consent remains current');
  }

  await frame();
  assert(!api.testWorld.state().exteriorLoaded, 'Journal review must never prepare exterior scenery');
  assert(api.testWorld.state().room === 'lookout' && JSON.stringify(api.state().position) === run.position, 'Journal review leaves the physical player on the lookout');
  assert(JSON.stringify(api.chapter.save(null, null).history) === run.history, 'Quest presentation does not modify carried Chapter 1 history');
  assert(!api.state().frameErrors.length, 'No journal renderer errors');
  run.next++;
  const box = dialog().open ? dialog().getBoundingClientRect() : card().getBoundingClientRect();
  return {stage, checks: [...run.checks], active: api.chapter.journal().active,
    chapter: api.chapter.state(), selectedTab: dialog().open ? dialog().querySelector('[aria-selected="true"]')?.dataset.chapter : null,
    modal: dialog().open, mode: api.state().mode, exteriorLoaded: api.testWorld.state().exteriorLoaded,
    viewport: {width: innerWidth, height: innerHeight}, panel: {x: box.x, y: box.y, width: box.width, height: box.height},
    errors: api.state().frameErrors};
}
