import {createOremindi,oremindiObjective} from './chapter.js';
import {oremindiJournal} from './journal.js';
import {oremindiMap} from './map.js';
import {OREMINDI_LOCATIONS as P,OREMINDI_MAP_REGIONS} from './locations.js';
import {createOremindiRefuge} from './refuge-view.js';
import {createYunethreQuestView,createYunethreJournalView} from '../yunethre/journal-view.js';
import {yunethreResidentCampaign} from '../yunethre/resident-context.js';
import {TOWER,TOWER_DOOR,TALETH_SPOT,LOOKOUT_TALETH,LOOKOUT_DOOR} from '../../../app/exploration/tower-state.js';
import {TRANSFORM} from '../../../world/terrain/region-world.js';

export function createOremindiHost({saved,scene,world,position,towerState,mode,setMode,transition,notice,onDirty,map,onBattle,onJournalOpen=()=>{}}){
  const campaign=createOremindi(saved.chapter);let state=campaign.snapshot(),history=saved.history,historySource=saved.historySource;
  let residents=yunethreResidentCampaign(history),cached=null,cachedState=null,disposed=false,conversationId=null,clock=0;
  const scenery=createOremindiRefuge({scene,world});
  const journal=()=>{if(cachedState!==state){cachedState=state;cached=oremindiJournal(state,history,residents,{historySource});}return cached;};
  const prompt=document.createElement('button');prompt.id='oremindi-interact';prompt.className='oremindi-interact';prompt.hidden=true;
  prompt.style.cssText='position:fixed;bottom:17%;left:50%;transform:translateX(-50%);z-index:30;padding:12px 18px;background:#20483e;color:#f4e7c7;border:1px solid #cab879;border-radius:4px';
  const dialog=document.createElement('section');dialog.id='yunethre-dialog';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','oremindi-speaker');
  dialog.innerHTML='<div class="tower-dialog-card"><span class="eyebrow">CHAPTER 3 / THE MOUNTAIN ALLIANCE</span><h2 id="oremindi-speaker"></h2><p></p><div class="tower-dialog-actions"></div></div>';document.body.append(prompt,dialog);
  const words=dialog.querySelector('p'),actions=dialog.querySelector('.tower-dialog-actions');
  const journalView=createYunethreJournalView({projection:journal,onOpen(){if(mode()!=='playing')return false;onJournalOpen();setMode('briefing');},onClose(){setMode('playing');}});
  const questView=createYunethreQuestView({position,mode,quest:()=>mode()==='playing'?quest():null,projection:journal,onOpenJournal:()=>journalView.open(),autoplayHint:'F8 · Encounter rehearsals'});
  const near=(p,r=5)=>Math.hypot(position.x-p.x,position.z-p.z)<r&&(p.y===undefined||Math.abs(position.y-p.y)<3);
  const ready=p=>world.readyAt(p.x,p.z);
  function sync(){state=campaign.snapshot();cachedState=null;onDirty();map.setSimulation(oremindiMap(state,history.chapter));map.setRegionScope(OREMINDI_MAP_REGIONS,{label:'Chapter 3'});document.getElementById('atlas-izol').textContent='South Oremindi';}
  function command(c){const r=campaign.command(c);if(r.ok)sync();else notice(r.reason);return r;}
  function close(){dialog.hidden=true;setMode('playing');}
  function button(id,label,run){const b=document.createElement('button');b.dataset.chapterAction=id;b.textContent=label;b.onclick=run;actions.append(b);}
  function show(id,title,text){conversationId=id;setMode('briefing');dialog.hidden=false;dialog.querySelector('h2').textContent=title;words.textContent=text;actions.replaceChildren();requestAnimationFrame(()=>{if(!disposed&&!dialog.hidden)actions.querySelector('button')?.focus();});}
  async function travel(room,point){close();if(await transition(room,point)){if(room&&!state.arrived)command({type:'arrive-refuge'});return true;}return false;}
  function taleth(){
    if(state.reported){show('taleth','Taleth / An alliance in exile','The chief is dead, and the North Ibenwood Rangers have stood beside us. We have a foothold and friends again. The other mountain chiefs still rule their own war bands; this victory did not free the entire range.\n\nKeep the agreements you made in Yunethre. We will need them. Your work in this chapter is complete.');}
    else if(state.battle.status==='victory'){
      show('taleth','Taleth / The mountain report','Tell me about the high ground, the chief, and the elves who held it with you. Our refuge survives through such alliances; we cannot simply claim their lands as ours.');
      button('report','Report the chief\'s defeat / Complete Chapter 3',()=>{if(command({type:'report'}).ok)taleth();});
    }else{
      show('taleth','Taleth / The Guild in exile','Wilhelm took Minora while we were looking elsewhere. We saved the tower, its people and its rooms. The five League provinces are occupied. We call ourselves the Wizards\' League now; the alliances you earned still stand.\n\nThis is only a refuge. Orc war bands have destroyed the human settlements in these mountains. Their chieftains are divided, but we cannot face them alone.\n\nFind the North Ibenwood Rangers in the southern foothills. They answer to Elfland, as do the separate eastern, western and southern ranger commands. Ask the northern rangers what aid we can offer them. Time stands still inside the tower.');
      if(!state.briefed)button('accept','Accept the ranger assignment',()=>{if(command({type:'brief'}).ok)close();});
    }
    if(towerState().room!=='lookout')button('lookout','Visit the mountain lookout',()=>travel('lookout'));
    else button('chamber','Return to Taleth\'s chamber',()=>travel('tower'));
    button('close','Continue exploring the tower',close);
  }
  function rangers(){
    if(!state.briefed){show('rangers','The North Ibenwood Rangers','Your tower has appeared by the lake. Hear Taleth\'s account before asking us to enter his war.');}
    else if(state.proof==='carried'){
      show('rangers','The ranger speaker / A pledge kept','You found the raiders. Show us the proof. Our war party will meet you at the cairned high-ground position in six active minutes. We will fight as allies of the Wizards\' League, while remaining the North Ibenwood Rangers.');
      button('present-proof','Present the head / Secure the alliance',()=>{if(command({type:'present-proof'}).ok){close();notice('North Ibenwood alliance secured. The war party assembles in six active minutes.');}});
    }else if(state.rangerAlliance){show('rangers','The ranger speaker / Allies on the mountain',state.battle.status==='victory'?'The chief is defeated. Carry our account to Taleth. The other chieftains still hold their lands.':'Follow the cairns up the shoulder to our rendezvous. Our archers will hold the upper ledge; stay with the sword-bearers and stop the raiders reaching them. You may wait for us there.');}
    else{
      show('rangers','The ranger speaker / Proof from the heights','The southern chief has sent raiders along the northern mountain path. Investigate the broken shelf above the tarn. Bring back the head of one of those raiders as proof. Then we can bind our people to your cause.\n\nFollow the broad cairned traverse. The heights beyond it are steep, and the ruined human holdings are no longer safe.');
      button('accept-rangers',state.rangersMet?'I will return with the proof':'Agree to investigate the raiders',()=>{if(command({type:'meet-rangers'}).ok)close();});
    }
    button('close','Return to the trail',close);
  }
  function investigate(){
    if(!state.rangersMet)return;
    show('ambush','The broken shelf','Three raiders emerge from the rocks. There is room to dodge on the shelf, but the mountain path falls away beyond it. Defeat two; the surviving raider will flee.');
    button('fight','Face the raiders',()=>{close();onBattle({kind:'ambush'});});button('close','Withdraw before the ambush',close);
  }
  function proof(){
    show('proof','The fallen raiders','Two raiders lie on the shelf. The third escaped into the heights. The rangers asked for physical proof; it has not yet been placed in your inventory.');
    button('collect-proof','Take one orc head as proof',()=>{if(command({type:'collect-proof'}).ok){close();notice('Orc head added to your quest inventory. Return to the North Ibenwood Rangers.');}});button('close','Leave the remains',close);
  }
  function rendezvous(){
    if(!state.rangerAlliance)return;
    if(!state.rendezvousVisited)command({type:'visit-rendezvous'});
    const remaining=Math.max(0,Math.ceil(state.rendezvousAt-state.elapsed));
    show('rendezvous','The cairned high ground',remaining?`The war party is on its way. It will assemble in ${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')} of active time. You can explore, or wait here until they arrive.`:'Two archers and two sword-bearers hold the upper shelf. Below, the chief leads eight orcs: raiders in front, armored warriors behind, and the chief at their back.\n\nKeep the archers alive, fight alongside the sword-bearers, and defeat the chief. Your allies are outnumbered. A retreat or defeat can be retried from this rendezvous.');
    if(remaining)button('wait','Wait here until the war party arrives',()=>{if(command({type:'wait-rendezvous'}).ok)rendezvous();});
    else button('fight','Fight beside the North Ibenwood Rangers',()=>{close();onBattle({kind:'highground'});});
    button('close','Continue exploring',close);
  }
  function target(){
    const room=towerState().room;
    if(room==='lookout')return near(LOOKOUT_TALETH,3.5)?'taleth':near(LOOKOUT_DOOR,3)?'chamber':null;
    if(room)return near({...TALETH_SPOT,y:TOWER.y})?'taleth':near({...TOWER_DOOR,y:TOWER.y})?'leave':null;
    if(ready(P.refuge)&&near(P.refuge,5))return 'enter';
    if(ready(P.rangers)&&near(P.rangers,6))return 'rangers';
    if(state.rangersMet&&state.ambush.status!=='victory'&&ready(P.ambush)&&near(P.ambush,11))return 'ambush';
    if(state.proof==='available'&&ready(P.proof)&&near(P.proof,5))return 'proof';
    if(state.rangerAlliance&&state.battle.status!=='victory'&&ready(P.rendezvous)&&near(P.rendezvous,10))return 'rendezvous';return null;
  }
  function interact(){if(mode()!=='playing')return false;const t=target();if(!t)return false;
    if(t==='taleth')taleth();else if(t==='enter')travel('tower');else if(t==='leave')travel(null,P.refuge);else if(t==='chamber')travel('tower');else if(t==='rangers')rangers();else if(t==='ambush')investigate();else if(t==='proof')proof();else rendezvous();return true;}
  prompt.onclick=interact;
  function marker(){
    const goal=oremindiObjective(state),id=goal.destination?.id,room=towerState().room;
    if(room){const isTaleth=id==='taleth',p=room==='lookout'?(isTaleth?LOOKOUT_TALETH:LOOKOUT_DOOR):(isTaleth?{...TALETH_SPOT,y:TOWER.y}:{...TOWER_DOOR,y:TOWER.y});return {...p,id:isTaleth?'taleth':'leave',label:isTaleth?'Speak with Taleth':'Leave the tower',shortLabel:isTaleth?'Taleth':'Tower exit'};}
    const p=P[id==='taleth'?'refuge':id]??P.refuge;return {...p,label:p.name,shortLabel:p.name,kind:'quest',markerKind:'main',directionsKnown:true};
  }
  function update(){const t=mode()==='playing'?target():null;prompt.hidden=!t;if(t)prompt.textContent='F / '+({taleth:'Speak with Taleth',enter:'Enter the relocated tower',leave:'Return to South Oremindi',chamber:'Return to the chamber',rangers:'Speak with the North Ibenwood Rangers',ambush:'Investigate the raiders',proof:'Search a fallen raider',rendezvous:'Meet the war party'}[t]);}
  function quest(){const goal=marker();return {label:'MAIN QUEST / CHAPTER 3',title:oremindiObjective(state).title,detail:oremindiObjective(state).action,clock:journal().deadline?.label??(towerState().inside?'Time held in the tower':''),target:{...goal,y:(goal.y??(ready(goal)?world.heightAt(goal.x,goal.z):position.y))+2.5},markerLabel:goal.shortLabel,edgeMarker:!towerState().inside,showMarker:!state.reported};}
  sync();
  return {command,journal,interact,marker,navigation:()=>state.reported?null:marker(),drawQuest:questView.draw,update,
    state:()=>campaign.snapshot(),residentCampaign:()=>residents,openJournal:id=>journalView.open(id),scenery:()=>scenery.state(),
    mapMarks(){if(state.reported)return [];const g=oremindiObjective(state),p=P[g.destination.id==='taleth'?'refuge':g.destination.id];return [{id:'oremindi-objective',targetId:p.id,kind:'quest',markerKind:'main',directionsKnown:true,name:p.name,...TRANSFORM.worldToAtlas(p.x,p.z)}];},
    worldPosition:()=>towerState().inside?P.refuge:position,
    tick(dt,active,time){if(disposed)return;scenery.update(time,dt,state,towerState().inside);if(active){clock+=dt;if(clock>=.25){campaign.advance(clock);clock=0;state=campaign.snapshot();onDirty();}}update();},
    save(exploration,tower,riding,sorcery){return {format:'azhora-oremindi',version:1,history,historySource,chapter:campaign.snapshot(),tower,riding,exploration,...(sorcery?{sorcery}: {})};},
    restore(data){const r=campaign.restore(data.chapter);if(!r.ok)throw Error(r.reason);journalView.close();history=data.history;historySource=data.historySource;residents=yunethreResidentCampaign(history);clock=0;dialog.hidden=true;sync();},
    conversation:()=>dialog.hidden?null:{id:conversationId,text:words.textContent,actions:[...actions.querySelectorAll('button')].map(b=>b.dataset.chapterAction)},
    choose(id){const b=actions.querySelector(`[data-chapter-action="${id}"]`);if(dialog.hidden||!b)return false;b.click();return true;},
    keydown(event){if(journalView.isOpen()){if(event.code==='Escape'||event.code==='KeyJ'){event.preventDefault();if(!event.repeat)journalView.close();}return true;}if(!dialog.hidden){if(event.code==='Escape'){event.preventDefault();close();}return !event.target?.closest('button')||!['Enter','Space','Tab'].includes(event.code);}if(event.code==='KeyJ'&&event.shiftKey&&mode()==='playing'){event.preventDefault();if(!event.repeat)journalView.open();return true;}if(event.code==='KeyF'&&mode()==='playing'&&!event.repeat){const handled=interact();if(handled)event.preventDefault();return handled;}return false;},
    dispose(){disposed=true;scenery.dispose();journalView.dispose();questView.dispose();prompt.remove();dialog.remove();},
  };
}
