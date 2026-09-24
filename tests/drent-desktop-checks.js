import {DRENT_SITES} from '../src/drent-sites.js';
import {DRENT_EVIDENCE_ID,DRENT_QUEST_ID,DRENT_SUPPLIES_ID} from '../src/drent-civil-war.js';

/** A bounded renderer integration check, launched with an isolated Electron profile. */
export async function runDrentDesktopChecks(h){
  const {drent,inventory,skills,combat,npcById}=h,checks=[];
  const check=(ok,name)=>{if(!ok)throw new Error(`Drent desktop: ${name}`);checks.push(name);};
  const frames=async(n=2)=>{for(let i=0;i<n;i++)await new Promise(requestAnimationFrame);};
  const choice=id=>{
    for(let i=0;i<8&&!document.querySelector(`[data-choice="${id}"]`);i++)h.nextSpeech();
    const button=document.querySelector(`[data-choice="${id}"]`);
    check(button&&!button.disabled,`Dialogue choice available: ${id}`);button.click();
  };
  const reset=()=>{h.prepare();inventory.remove(DRENT_EVIDENCE_ID,inventory.count(DRENT_EVIDENCE_ID));inventory.remove(DRENT_SUPPLIES_ID,inventory.count(DRENT_SUPPLIES_ID));drent.restore();h.selectQuest('main');};
  const evidence=()=>{h.warp(DRENT_SITES.evidence);drent.frame(0,{playing:true});check(drent.nearby?.id==='drent-rebel-camp','Camp offers actual search interaction');h.interact();check(inventory.has(DRENT_EVIDENCE_ID),'Searching adds sealed evidence');h.closeDialogue();};
  reset();const goldBefore=h.mainProgress();
  drent.defeatedAmbush();check(!drent.state().accepted,'Winning does not silently accept investigation');
  const focusPanel=document.getElementById('quest-choice-panel'),focusOverlay=document.getElementById('quest-choice-overlay');
  check(focusPanel&&focusOverlay&&!focusOverlay.hidden,'Ambush opens a neutral quest choice panel');
  check(focusPanel.querySelector('[data-choice="drent-main"]')&&focusPanel.querySelector('[data-choice="drent-focus"]'),'Both gold and silver choices appear together');
  check(document.getElementById('dialogue').classList.contains('hidden'),'Quest choice does not open an NPC conversation');
  h.press('Escape');check(focusOverlay.hidden&&h.tracked()==='main'&&!drent.state().accepted,'Escape dismisses focus choice without choosing or accepting');
  check(drent.trackableView().active,'Dismissed silver lead remains available in Objectives');
  drent.offerFocus();choice('drent-focus');check(focusOverlay.hidden,'Choosing a focus closes the neutral panel');
  check(h.tracked()===DRENT_QUEST_ID&&!drent.state().accepted,'Silver lead can be focused before accepting');
  check(document.querySelector('#quest-choices [data-quest-id]')?.dataset.questId===DRENT_QUEST_ID,'Silver focus is first on the left');
  h.renderHUD();await frames();
  check(document.getElementById('quest').getBoundingClientRect().bottom+8<=document.getElementById('vitals').getBoundingClientRect().top,'Quest choices fit above health and stamina');
  document.querySelector('#quest-choices [data-quest-id="main"]').click();
  check(h.tracked()==='main','Main quest remains one click away');
  h.selectQuest(DRENT_QUEST_ID);h.conversation(npcById.get('instructor'));choice('drent-accept');choice('drent-focus');
  check(drent.state().accepted&&h.mainProgress()===goldBefore,'Accepting silver leaves main quest unchanged');
  h.openJournal();await frames();
  check(document.querySelector('.journey-entry')?.dataset.entryId===DRENT_QUEST_ID,'Focused silver leads the journal');
  check(document.querySelector('.journey-reading-title')?.textContent==='Civil War in Drent','Journal displays silver story');h.closeModal();
  evidence();h.toggleInventory();inventory.select(DRENT_EVIDENCE_ID);await frames();
  check(!drent.state().evidenceRead,'Selecting evidence preserves the seal');
  check(!document.querySelector('.inventory-detail')?.textContent?.includes('Killian in Tidehaven'),'Unopened inventory does not expose Killian');
  const read=document.querySelector('[data-item-action="read-evidence"]');check(read,'Explicit read button exists');read.click();
  check(drent.state().evidenceRead&&!drent.state().chosenPath,'Reading unlocks a choice without choosing allegiance');
  check(document.body.textContent.includes('Killian in Tidehaven keeps'),'Inventory actually displays the evidence');inventory.close();
  h.warp(DRENT_SITES.killian);h.conversation(npcById.get('killian'));choice('drent-killian');h.closeDialogue();
  check(drent.state().chosenPath==='republican'&&skills.taught('stealth')&&!inventory.has(DRENT_EVIDENCE_ID),'Killian receives evidence and teaches Stealth');
  check(!drent.quest.allowed('report-glun'),'Faction handoff locks the opposite branch');
  h.press('KeyX');check(drent.sneaking,'X toggles real sneak mode');
  h.warp(DRENT_SITES.supplies);drent.frame(.05,{playing:true});
  check(drent.nearby?.id==='drent-barracks-supplies'&&!drent.awareness.visible,'Supply chest is reachable behind real cover');
  h.interact();check(drent.state().suppliesStolen&&inventory.has(DRENT_SUPPLIES_ID),'F steals the supplies while hidden');
  check(skills.level('stealth')>=2,'First successful raid reaches Stealth level 2');
  h.warp(DRENT_SITES.killian);h.conversation(npcById.get('killian'));choice('drent-finish-republican');
  check(drent.state().outcome==='republican'&&drent.state().favor.republic===10&&!npcById.get('killian').hidden,'Republic ending grants favor and keeps Killian alive');
  check(h.save()&&h.reload(),'Republic ending saves and reloads in desktop');
  h.freeze();check(drent.state().outcome==='republican'&&skills.level('stealth')>=2,'Reload preserves chosen ending and skill');
  check(h.mainProgress()===goldBefore,'Republic side quest never advances main story');

  reset();drent.act('defeat-ambush');h.conversation(npcById.get('instructor'));choice('drent-accept');choice('drent-focus');evidence();
  h.conversation(npcById.get('instructor'));choice('drent-glun');
  check(!drent.state().evidenceRead&&drent.state().chosenPath==='monarchist','Sealed evidence can be delivered to the Empire');
  choice('drent-confront');
  check(drent.state().confrontationStarted,'Glun waits for readiness before leaving');
  // The independent real-world test verifies the complete collision-safe walk.
  // Here advance to its end to exercise dialogue and real combat without an idle-time wait.
  const g=npcById.get('instructor').actor.group.position,k=DRENT_SITES.killian;
  g.set(k.x+2.5,h.world.heightAt(k.x+2.5,k.z+1.5),k.z+1.5);
  h.warp({x:k.x+6,z:k.z+4});drent.frame(.05,{playing:true});choice('drent-fight');
  check(combat.state.phase==='active'&&combat.state.allies.some(a=>a.id==='instructor'),'Glun joins the actual fight');
  check(npcById.get('killian').hidden&&npcById.get('instructor').hidden,'Combat actors replace town actors without doubles');
  for(let i=0;i<1600&&combat.state.phase==='active';i++){combat.update(.05);h.handleCombatEvents();}
  check(drent.state().killianDefeated,'Real combat resolves Killian defeat');
  check(combat.state.allies.find(a=>a.id==='instructor')?.hp>0,'Glun survives fighting Killian');
  h.conversation(npcById.get('instructor'));choice('drent-finish-imperial');
  check(drent.state().outcome==='monarchist'&&drent.state().favor.empire===10,'Final Glun report awards Empire favor');
  check(h.save()&&h.reload(),'Empire ending saves and reloads in desktop');h.freeze();
  check(npcById.get('killian').hidden&&drent.state().killianDefeated,'Killian stays dead after reload');
  check(h.mainProgress()===goldBefore,'Empire side quest never advances main story');
  h.openJournal();h.showCompleted();await frames();
  check(document.body.textContent.includes('Empire favor +10'),'Completed journal shows earned faction favor');
  check(h.errors().count===0,'No renderer frame errors');
  return {checks:checks.length,passed:checks,branches:['republican','monarchist'],frameErrors:h.errors()};
}
