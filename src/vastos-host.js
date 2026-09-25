/** Vastos integration boundary: the main host only registers, binds, saves and ticks this. */
import { createVastosCivilWar, VASTOS_NPCS, VASTOS_QUEST_ID, VASTOS_ENDINGS } from './vastos-civil-war.js';
import { vastosConversation, vastosSiteConversation } from './vastos-dialogue.js';
import { createVastosCamp, VASTOS_CAMP, VASTOS_POSITIONS } from './vastos-camp.js';
import { CIVIL_WAR_SERIES } from './civil-war-quests.js';
import { makeQuestMarker } from './characters.js';
import { questLive } from './quest-slate.js';

// An explicit opt-in keeps the preserved prototype testable; the game follows the quest slate.
export function createVastosHost({scene,world,npcData,enabled=questLive(VASTOS_QUEST_ID)}) {
  const live=enabled===true,camp=live?createVastosCamp(scene,world):null;
  let hooks={},near=null,clock=0,hudKey=null;
  const quest=createVastosCivilWar({inventory:{add:(...args)=>hooks.inventory?.add(...args)??false}});
  if(live){
    if(!world.landmarks.some(place=>place.id===VASTOS_CAMP.id))world.landmarks.push({...VASTOS_CAMP});
    for(const npc of VASTOS_NPCS){const at=VASTOS_POSITIONS[npc.id];world.npcPositions[npc.id]={x:at.x,z:at.z};npcData.push({...npc});}
  }
  const siteMarkers=new Map();
  if(live)for(const [id,at] of Object.entries(VASTOS_POSITIONS))if(id.startsWith('vastos-')&&!VASTOS_NPCS.some(n=>n.id===id)){
    const marker=makeQuestMarker('plot');marker.visible=false;scene.add(marker);siteMarkers.set(id,marker);
  }
  const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;};
  const journal=el('section',null,'civil-war-journal');journal.id='journal-civil-war-quests';journal.hidden=true;
  document.getElementById('journal-content').prepend(journal);
  const hud=el('aside',null,'civil-war-hud');hud.id='civil-war-hud';hud.hidden=true;hud.setAttribute('aria-label','Optional silver quest');document.body.append(hud);

  function act(id){
    if(!live||hooks.canAct?.()===false)return {ok:false,reason:'Finish what you are doing first.'};
    const result=quest.act(id);
    if(result.ok){camp.setState(quest.state());hudKey=null;hooks.onChange?.(result);}
    else hooks.toast?.(result.reason,'THE COMMON WATER');
    return result;
  }
  const context=()=>({quest,act,openDialogue:hooks.openDialogue,closeDialogue:hooks.closeDialogue});
  function knownLocations(discovered=false){
    if(!live)return [];
    const ids=new Set([...quest.view().knownIds,...(discovered?['vastos-herder']:[])]);
    return [...ids].map(id=>{const at=VASTOS_POSITIONS[id],person=VASTOS_NPCS.find(n=>n.id===id);
      return at?{id,...at,name:person?.name??at.name??'The Common Water',description:person?.role??at.prompt??'',kind:'plot'}:null;}).filter(Boolean);
  }
  function renderJournal(discovered=false){
    const view=quest.view(),s=quest.state();journal.hidden=!live||(!s.accepted&&!discovered);journal.replaceChildren();if(journal.hidden)return;
    journal.append(el('span','SILVER QUEST · '+CIVIL_WAR_SERIES.title,'eyebrow'),el('h3',`${view.title} · Vastos`),el('p',view.detail));
    if(s.outcome)journal.append(el('strong',VASTOS_ENDINGS[s.outcome].title));
    const notes=el('ul');for(const entry of view.entries)notes.append(el('li',entry));journal.append(notes);
    for(const id of view.destinationIds){const at=VASTOS_POSITIONS[id];if(!at)continue;
      const person=VASTOS_NPCS.find(n=>n.id===id),button=el('button',`Mark ${person?.name??at.name??'the next place'}`,'secondary');
      button.type='button';button.onclick=()=>hooks.track?.(id);journal.append(button);
    }
  }
  function frame(dt,observer,mode='playing',busy=false){
    if(!live)return;clock+=Math.max(0,dt);
    const view=quest.view(),playing=mode==='playing'&&!busy;
    camp.update(dt,observer,playing);
    const active=new Set(view.destinationIds);
    for(const [id,marker] of siteMarkers){const at=VASTOS_POSITIONS[id];
      marker.visible=playing&&active.has(id)&&Math.hypot(observer.x-at.x,observer.z-at.z)<100;
      if(marker.visible){marker.position.set(at.x,world.heightAt(at.x,at.z)+2.5+Math.sin(clock*2)*.1,at.z);marker.rotation.y=clock*.4;}
    }
    near=playing?Object.entries(VASTOS_POSITIONS).map(([id,at])=>{const offer=quest.siteView(id);return offer?{...at,...offer,d:Math.hypot(observer.x-at.x,observer.z-at.z)}:null;})
      .filter(at=>at&&at.d<2.8).sort((a,b)=>a.d-b.d)[0]??null:null;
    const visible=playing&&quest.state().accepted&&world.regionAt(observer.x,observer.z)?.name==='Vastos';
    hud.hidden=!visible;
    const key=JSON.stringify([view.stage,view.detail]);
    if(visible&&key!==hudKey){hudKey=key;hud.replaceChildren(el('span','SILVER · AMBRONI CIVIL WAR','eyebrow'),el('h3',view.title),el('p',view.detail),el('small','J · journal and directions'));}
  }
  return {
    quest,bind(options){hooks=options;camp?.setState(quest.state());},act,
    converse(npc){return live&&vastosConversation(npc,context());},
    interact(){return !!near&&vastosSiteConversation(near.id,context());},
    get nearby(){return near;},frame,knownLocations,renderJournal,
    markerIds(){return live?quest.view().destinationIds.filter(id=>VASTOS_NPCS.some(n=>n.id===id)):[];},
    snapshot:quest.snapshot,
    restore(data){const ok=quest.restore(data);if(ok){camp?.setState(quest.state());near=null;hudKey=null;}return ok;},
    get start(){return VASTOS_POSITIONS['vastos-herder'];},
    metrics:()=>camp?.metrics(),
    dispose(){camp?.dispose();for(const marker of siteMarkers.values()){scene.remove(marker);marker.traverse(node=>{node.geometry?.dispose();const materials=Array.isArray(node.material)?node.material:[node.material];materials.forEach(m=>m?.dispose());});}journal.remove();hud.remove();},
  };
}
