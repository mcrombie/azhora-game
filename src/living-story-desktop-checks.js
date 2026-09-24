import { validateLivingStorySnapshot } from './living-story.js';

/** Short native-renderer regressions. The host supplies a separate testing-session save.
 * These stage shared events; road movement itself is covered by the route-driver scenarios.
 * Real dialogue buttons, the live render loop, HUD and checkpoint adapter are exercised here.
 */
export async function runLivingDesktopChecks(h) {
  const { getStory, getHost, prepare, frames, setMode, getMode, saveRoad, checkpoint,
    inventory, npcById, player, refresh, readState, nextSpeech, closeDialogue, restoreRoad } = h;
  let checks = 0;
  const assert = (value, text) => { checks++; if (!value) throw new Error(`Living story desktop: ${text}`); };
  const healthy = () => {
    const errors = readState().frameErrors;
    assert(!errors?.count, `renderer error: ${errors?.first?.message ?? 'unknown'}`);
  };
  const fresh = async () => {
    closeDialogue(); await prepare(); await frames(3); healthy();
    assert(validateLivingStorySnapshot(getStory().snapshot()), 'fresh live state does not validate');
    return getStory();
  };
  const choose = id => {
    let button;
    for (let page = 0; page < 8; page++) {
      button = document.querySelector(`#dialogue-choices button[data-choice="${id}"]`);
      if (button) break;
      nextSpeech();
    }
    assert(button && !button.disabled, `missing real dialogue choice ${id}`);
    button.click();
  };
  const putNearby = (story, id) => {
    const npc = npcById.get(id), p = player.group.position;
    assert(npc?.actor?.group && npc.role, `courier ${id} has no real actor/dialogue role`);
    npc.actor.group.position.set(p.x + 2, p.y, p.z);
    story.observe(id, { position: { x: p.x + 2, z: p.z }, activity: 'waiting beside traveler' });
    return npc;
  };

  let s = await fresh();
  assert(document.getElementById('world-calendar')?.textContent.includes('1 April 980'), 'calendar HUD missing starting date');
  const started = s.clock(); await frames(8); assert(s.clock() > started, 'active renderer frames do not advance the shared clock');
  setMode('pause'); const stopped = s.clock(); await frames(8);
  assert(s.clock() === stopped, 'pause advanced world time');
  setMode('playing'); await frames(2); assert(s.clock() > stopped, 'return to play did not restart clock'); healthy();

  s = await fresh(); setMode('pause');
  for (const actor of s.actors().slice(0, 4)) s.reportNothom(actor.id);
  getHost().reportPlayer();
  assert(s.availableHorses() === 0 && s.horseFor('player') === null, 'late player received a fifth remount');
  assert(!inventory.has('horse-token'), 'a fifth token was issued by the live report adapter');
  assert(/on foot/.test(getHost().horseNote()), 'late player is not told to march on foot');

  s = await fresh(); setMode('pause');
  const candidate = s.actors().find(a => npcById.has(a.id) && a.id !== 'merc-gotwood') ?? s.actors()[0];
  assert(candidate, 'no replacement mercenary exists in the actual roster');
  getHost().reportPlayer(); assert(s.acceptSatchel('player').ok, 'player could not deliberately accept job');
  assert(s.takeSatchel('player').ok, 'could not stage the unique satchel carrier'); inventory.add('courier-satchel', 1);
  s.reportNothom(candidate.id); s.tick(600);
  assert(s.satchel().carrier === 'player' && s.satchel().assignee === candidate.id, 'deadline moved or duplicated the physical satchel');
  assert(s.satchel().handover?.to === candidate.id, 'replacement does not have a physical handover task');
  const courier = putNearby(s, candidate.id); setMode('playing');
  assert(getHost().conversation(courier), 'near replacement could not open its actual handover dialogue');
  assert(getMode() === 'dialogue', 'handover dialogue did not pause normal input');
  closeDialogue(); assert(getHost().conversation(courier), 'closing the handover stranded the offer');
  choose('satchel-handover-yes');
  assert(!inventory.has('courier-satchel') && s.satchel().carrier === candidate.id, 'handover disagrees between model and actual inventory');
  assert(s.deliverSatchel(candidate.id).ok, 'replacement could not finish its unique delivery');
  assert(!s.deliverSatchel(candidate.id).ok, 'the same delivery paid twice');
  setMode('pause'); assert(saveRoad(false), 'live shared-story checkpoint could not save');
  const saved = checkpoint.read();
  assert(saved.ok && saved.data?.livingStory, `checkpoint dropped living story: ${saved.reason ?? ''}`);
  assert(saved.data.livingStory.satchel.completedBy === candidate.id, 'checkpoint changed the shared delivery owner');
  const savedClock = saved.data.livingStory.seconds;
  s.tick(17);
  await restoreRoad(saved.data);
  s = getStory();
  assert(s.clock() === savedClock, 'checkpoint did not restore exact active time');
  assert(s.satchel().completedBy === candidate.id && !inventory.has('courier-satchel'), 'load reissued the delivered satchel');
  healthy();

  s = await fresh(); setMode('pause');
  const challenger = s.actors().find(a => npcById.has(a.id) && a.id !== 'merc-gotwood') ?? s.actors()[0];
  getHost().reportPlayer(); s.acceptSatchel('player'); s.takeSatchel('player'); inventory.add('courier-satchel', 1);
  s.reportNothom(challenger.id); s.tick(600);
  const challengerNpc = putNearby(s, challenger.id); setMode('playing');
  assert(getHost().conversation(challengerNpc), 'replacement could not demand the satchel before refusal');
  choose('satchel-handover-no');
  assert(readState().phase === 'active', 'refusing handover did not start actual combat');
  assert(readState().enemies.filter(e => e.id === challenger.id).length === 1, 'hostile replacement is missing or duplicated');
  assert(s.satchel().carrier === 'player' && inventory.count('courier-satchel') === 1, 'refusal moved the physical satchel');
  assert(s.satchel().handover?.status === 'hostile', 'refusal did not persist after combat started');
  await frames(3); assert(readState().phase === 'active', 'the confrontation immediately exited because its arena was invalid');
  healthy();

  if(h.observeAmbush){
    s=await fresh();const seen=h.observeAmbush();
    assert(readState().phase==='active','nearby mercenary waited for the observer to enter the ambush');
    const ally=seen.allies.find(a=>a.id===seen.id);
    assert(ally&&Math.hypot(ally.x-seen.position.x,ally.z-seen.position.z)<.01,'independent ambush teleported the mercenary into a formation');
    await frames(3);assert(readState().phase==='active','observed NPC fight ended at the player retreat line');healthy();
  }
  // prepare() revives/clears the actual combat host before staging the recall.
  s = await fresh(); setMode('pause');
  const messenger = s.actors().find(a => npcById.has(a.id) && a.id !== 'merc-gotwood') ?? s.actors()[0];
  // This is a recall fixture, not a simulation of how the other people died.
  for (const actor of s.actors()) if (actor.id !== messenger.id) s.setAlive(actor.id, false);
  assert(s.arriveMuster(messenger.id), 'actual loyal messenger could not report to muster');
  s.tick(60); assert(s.recall().courier === messenger.id, 'first loyal arrival was not chosen for recall');
  const rider = putNearby(s, messenger.id); setMode('playing');
  assert(getHost().conversation(rider), 'recall could not open in the real dialogue renderer');
  const inDialogue = s.clock(); await frames(3); assert(s.clock() === inDialogue, 'dialogue consumes recall time');
  choose('recall-no'); assert(!s.player().imperialRefused, 'first No skipped permanent-refusal confirmation');
  choose('recall-confirm-no'); assert(s.player().imperialRefused, 'confirmed refusal was not persisted');
  refresh();
  assert(document.getElementById('quest-title')?.textContent.includes('Your own road'), 'refused Imperial objective is still on the HUD');
  assert(s.setPlayerSide('coalition', 'desktop-recruitment-check'), 'Imperial refusal incorrectly locks Republican allegiance');
  assert(s.player().imperialRefused, 'joining the Republic erased permanent Imperial refusal');
  healthy();
  closeDialogue();
  if(h.stageScenario){
    for(const kind of ['satchel','republic','recall']){h.stageScenario(kind);await frames(3);healthy();assert(readState().mode==='dialogue',`F8 ${kind} scenario did not open its actual conversation`);closeDialogue();}
    h.stageScenario('recall');h.earlyRecall?.();choose('recall-yes');await frames(3);
    assert(getStory().recall().status==='passenger','accepting the summons did not start passenger travel');
    for(const code of ['KeyG','Space','KeyC','KeyR'])h.press?.(code);await frames(3);
    assert(!readState().mounted&&readState().playerAction!=='dodge'&&readState().playerAction!=='attack','passenger controls allowed independent movement or fighting');
    assert(document.getElementById('interaction')?.classList.contains('hidden'),'passenger still sees an unusable interaction prompt');
    assert(document.getElementById('quest-title')?.textContent==='Ride to the Moros muster','passenger HUD still points at an old errand');healthy();
    h.finishRecall?.();refresh();
    assert(getStory().recall().status==='complete','passenger arrival did not finish the summons');
    assert(readState().campaign?.chapterId==='suval-envoy'&&readState().moros?.complete,'courier stranded an untrained early player in Chapter 1');
    assert(readState().questStage===0&&!readState().journey?.complete&&!readState().luscia?.complete,'recall invented completed training or recovery work');
    assert(!document.getElementById('quest-title')?.textContent.includes('Jojo'),'recall arrival sent the player back to the harbor');
    assert(saveRoad(false),'early-recall campaign checkpoint failed');
    const recallSave=checkpoint.read();assert(recallSave.ok&&recallSave.data.campaign.entryOrigin==='imperial-recall','early recall origin was not saved');
    await restoreRoad(recallSave.data);refresh();
    assert(readState().campaign?.chapterId==='suval-envoy','early recall progress was lost after loading');
    setMode('playing');const onward=h.autopilotGoal?.();
    assert(onward?.npcId==='post-camp-legate','live autoplay sent an early-recalled traveler back to the tutorial');
    const fallenMercenary=getStory().actors().find(a=>a.id!==getStory().recall().courier);getStory().setAlive(fallenMercenary.id,false);
    h.openCompany?.();await frames(3);assert(!document.getElementById('journal-company').classList.contains('hidden'),'company journal is not reachable');
    assert(document.querySelectorAll('#company-list li').length===getStory().actors().length,'company journal roster disagrees with living story');
    assert(document.querySelector('#company-list .company-dead'),'company journal did not remember fallen mercenaries');healthy();
  }
  closeDialogue(); setMode('pause');
  return { ok: true, checks, frameErrors: readState().frameErrors, clock: s.clock(),
    calendar: s.calendar(), sharedSatchel: saved.data.livingStory.satchel,
    refusal: s.player(), note: 'Short native UI/save regressions; full route simulation is a separate suite.' };
}
