import * as THREE from 'three';
import {createYunethre,chapterObjective,BATTLE_START,BATTLE_END} from './chapter.js';
import {CHAPTER_LOCATIONS as places,CANERD_ENTRY} from './locations.js';
import {yunethreMap} from './map.js';
import {disposeCharacter} from '../../characters/characters.js';
import {createLaketownCouncilMember} from '../../regions/minora-frontier/laketown-characters.js';
import {createCentaur} from '../../../world/actors/centaur-model.js';
import {createCelderKnight} from '../../../world/actors/celder-knight.js';
import {createCelderPresence} from './celder-presence.js';
import {TOWER,TALETH_SPOT,TOWER_DOOR,TOWER_EXIT,LOOKOUT_DOOR,LOOKOUT_TALETH} from '../../../app/exploration/tower-state.js';
import {createYunethreQuestView,createYunethreJournalView} from './journal-view.js';
import {yunethreJournal} from './journal.js';
import {TRANSFORM} from '../../../world/terrain/region-world.js';
import {yunethreResidentCampaign} from './resident-context.js';
import {CENTAUR_BATTLEFIELD} from '../../regions/minora-frontier/centaur-camp-layout.js';
import {BANE} from '../../regions/minora-frontier/centaur-culture.js';

export function createYunethreHost({saved,scene,world,position,towerState,mode,setMode,transition,notice,onDirty,map,save,mainMenu,onJournalOpen=()=>{},onBattle=null,onWitness=null,onContinueChapter=null}){
  const campaign=createYunethre(saved.chapter);let state=campaign.snapshot(),history=saved.history,tickSeconds=0,disposed=false;
  let residentCampaign=yunethreResidentCampaign(saved);
  world.setCouncil?.(residentCampaign);
  const root=new THREE.Group();root.name='Chapter 2 / diplomatic speakers';scene.add(root);
  const celderPresence=createCelderPresence({parent:root,world});
  const guide=new THREE.Mesh(new THREE.OctahedronGeometry(.28),new THREE.MeshBasicMaterial({color:'#efd393'}));guide.name='Chapter 2 objective';root.add(guide);guide.visible=false;
  const people=new Map();
  let conversationId=null,clockText='';
  let journalState=null,journalHistory=null,journalModel=null;
  function journal(){if(journalState!==state||journalHistory!==history){journalModel=yunethreJournal(state,residentCampaign,history);journalState=state;journalHistory=history;}return journalModel;}
  const questView=createYunethreQuestView({position,mode,quest:()=>mode()==='playing'?quest():null,projection:journal,onOpenJournal:()=>journalView.open()});
  const prompt=document.createElement('button');prompt.id='yunethre-interact';prompt.hidden=true;
  const dialog=document.createElement('section');dialog.id='yunethre-dialog';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','yunethre-speaker');
  dialog.innerHTML='<div class="tower-dialog-card"><span class="eyebrow">CHAPTER 2 / YUNETHRE</span><h2 id="yunethre-speaker"></h2><p></p><div class="tower-dialog-actions"></div></div>';
  document.body.append(prompt,dialog);
  const words=dialog.querySelector('p'),actions=dialog.querySelector('.tower-dialog-actions');
  const journalView=createYunethreJournalView({projection:journal,onOpen(){if(mode()!=='playing')return false;onJournalOpen();setMode('briefing');},onClose(){setMode('playing');}});
  const near=(p,r=5)=>Math.hypot(position.x-p.x,position.z-p.z)<r&&(!p.y||Math.abs(position.y-p.y)<3);
  const ready=p=>!towerState().inside&&world.readyAt(p.x,p.z);
  const chartRegions=()=>['Yunethre','Isareos','Nethereum','Ovesos','Caricas','Nesdor','North Celder','South Celder',...(state.returned?['South Oremindi Mountains']:[])];
  function sync(){state=campaign.snapshot();onDirty();map.setSimulation(yunethreMap(state));map.setRegionScope(chartRegions(),{label:'Chapter 2'});document.getElementById('atlas-izol').textContent='Yunethre';}
  function command(c){const result=campaign.command(c);if(!result.ok)notice(result.reason);else sync();return result;}
  function close(){dialog.hidden=true;setMode('playing');}
  function button(id,label,run){const b=document.createElement('button');b.dataset.chapterAction=id;b.textContent=label;b.onclick=run;actions.append(b);return b;}
  function show(id,title,text){conversationId=id;setMode('briefing');dialog.hidden=false;dialog.querySelector('h2').textContent=title;words.textContent=text;actions.replaceChildren();requestAnimationFrame(()=>{if(!disposed&&!dialog.hidden)actions.querySelector('button')?.focus();});}
  async function travel(room,point,cost=0){close();const moved=await transition(room,point);if(!moved)return false;if(!state.departed&&room===null)command({type:'depart'});if(cost)campaign.advance(cost);sync();return true;}
  function taleth(){
    show('taleth','Taleth / A country beyond the war',
      'The Lizeemi League has made peace at home. Ask Laketown whether it will join us. Its council values the old peoples, and the centaurs face an attack from the Knights of Celder.\n\nSeek an agreement if you can. I advise staying out of their battle; choosing a side may win us allies, but it will also make enemies. Do not promise that the elves will be treated as foes.\n\nThe armies are expected to meet fifteen active minutes after you leave. Time stands still here, and while you are speaking or reading the map.');
    button('accept',state.briefed?'Return to my assignment':'Accept the diplomatic assignment',()=>{command({type:'brief'});towerState().begin();close();});
    if(state.briefed){button('lookout','Sky Lookout',()=>travel('lookout'));button('depart','Return to the tower door',()=>travel('tower'));}
    button('close','Continue this conversation later',close);
  }
  function meeting(id){
    if(!ready(places[id])||!near(places[id],7))return false;
    if(!command({type:'visit',place:id}).ok)return false;
    if(id==='town')town();else if(id==='centaurs')centaurs();else celder();return true;
  }
  function town(){
    const resolved=['resolved','averted'].includes(state.battle.status),foughtForCelder=state.battle.joined==='celder',protectedEnough=state.battle.winner==='celder'||state.centaurProtection;
    let text='I am Rowan, chosen to speak for the council. Humans, elves, dwarves, centaurs and satyrs live and work together here. Joining your League must not mean abandoning our neighbours. While the centaurs survive, we require a protection agreement. We will never join a power hostile to the elves. Speak with the centaurs, then carry their concerns to Canerd.';
    if(state.battle.status==='averted')text='Both parties have accepted the compact. Celder will withdraw its attack; the centaurs guarantee peaceful passage. The battle has been averted. We can decide now, without waiting for its former deadline.';
    else if(resolved)text=state.battle.winner==='celder'
      ?foughtForCelder?'You fought for Celder and defeated the centaur camp. Laketown remains autonomous; your field victory did not conquer our town. After your attack on our neighbours, we will not join your League. Accept our independence and carry that decision back.':'Celder has destroyed the centaur camp. Our town remains autonomous. You did not fight for Celder, and their victory does not make us their province. We can now discuss membership.'
      :foughtForCelder?'The centaurs have held their ground against Celder. You fought against our neighbours, and we will not join your League. Accept our independence and carry that decision back.':state.centaurProtection?'The centaurs have held their ground, and your protection is recorded. We can now discuss joining your League.':'The centaurs have held their ground. We still require a commitment to their protection before we can join you.';
    if(state.aftermathVisited)text='Our decision is recorded: '+(state.laketown==='league'?'Laketown has joined the Lizeemi League.':state.laketown==='celder'?'Laketown is under Celder.':'Laketown remains outside the League.')+' Return toward Minora to report to Taleth.';
    show('town','Councillor Rowan / Laketown',text);
    if(resolved&&!state.aftermathVisited){
      if(!foughtForCelder&&protectedEnough&&!state.elfHostile)button('join','Welcome Laketown into the League',()=>{command({type:'laketown-decision',decision:'join'});town();});
      else if(state.elfHostile)words.textContent+='\n\nYour hostility to the elves prevents our accession.';
      else if(!foughtForCelder)button('close','I will seek the centaurs\' protection agreement',close);
      button('decline','Accept that Laketown will remain independent',()=>{command({type:'laketown-decision',decision:'decline'});town();});
    }
    button('close','Return to the road',close);
  }
  function baneTopic(topic){
    if(state.battle.winner==='celder')return centaurs();
    show(topic.id,BANE.name+' / '+BANE.title,topic.text);
    button('back-to-negotiation','Back to the negotiation',centaurs);
    button('close','Return to the road',close);
  }
  function centaurs(){
    show('centaurs',BANE.name+' / '+BANE.title,state.battle.winner==='celder'?'The camp has fallen. There is no speaker left to negotiate with.':state.battle.status==='averted'?'The compact is sealed. Our community remains independent, protected by your agreement. You should take the news to Laketown.':state.battle.status==='resolved'?'We survived, but the knights may return. If you promise to protect us, we will stand with your League. Celder will regard that commitment as hostility.':BANE.introduction+'\n\nCelder is assembling against us. We will grant safe passage to peaceful travelers if the knights abandon their attack and recognize our camp. Carry those terms to Canerd. Hearing their counteroffer does not bind you to their army.');
    if(state.battle.status==='pending'&&!state.compact.centaurs)button('consent','Agree to carry the safe-passage compact',()=>{command({type:'compact',side:'centaurs'});centaurs();});
    if(state.battle.status==='pending'&&state.compact.centaurs)words.textContent+='\n\nThe centaurs\' consent is recorded. Next, travel to Canerd and secure Celder\'s consent before the battle deadline.';
    if(state.battle.winner==='centaurs'&&state.battle.joined==='celder')words.textContent='We survived the army you joined against us. We will not accept a protection agreement from you. Laketown must decide its own future.';
    if(state.battle.winner==='centaurs'&&!state.centaurProtection&&state.battle.joined!=='celder')button('protect','Pledge protection / Celder becomes hostile',()=>{command({type:'protect'});centaurs();});
    if(state.battle.status==='pending'){
      words.textContent+='\n\nThe passage to Canerd takes 1 minute 30 seconds of campaign time. You travel immediately; this time is deducted from the battle countdown.';
      button('travel-celder','Travel to Canerd (1m 30s journey)',()=>travel(null,CANERD_ENTRY,90));
    }
    if(state.battle.winner!=='celder')for(const topic of BANE.topics)button(topic.id,topic.label,()=>baneTopic(topic));
    button('close','Return to the road',close);
  }
  function battlefield(){
    show('battle','The field below Bane’s Camp','The Reed Kin are defending their homes. Celder’s lancers are trying to break their archers and overrun the camp. Choosing a side makes this your battle. Winning this field does not automatically annex Laketown. You can also remain neutral.');
    if(onBattle&&state.battle.status==='active')for(const side of state.battle.joined?[state.battle.joined]:['centaurs','celder'])
      button('fight-'+side,state.battle.joined?'Resume the joined battle':side==='centaurs'?'Defend the centaurs / Celder becomes hostile':'Fight for Celder against the centaurs',()=>{close();onBattle({side});});
    button('close','Remain outside the battle',close);
  }
  function celder(){
    show('celder','Canerd / The Celder envoy',state.battle.status==='averted'?'The compact is binding. The knights will stand down; the centaurs must keep their undertaking of peaceful passage. This is peace, not a military alliance.':state.battle.status==='pending'?'We will consider reciprocal safe passage and a halt to raids, if the centaurs accept those terms. Bring us their consent.\n\nOr fight with us when the armies meet. Help us destroy the camp and take Laketown, and Celder will become your military ally. Yunethre would then belong to Celder.':'The hour for the compact has passed. The battle will decide what remains to negotiate.');
    if(state.battle.status==='pending'){
      if(state.compact.celder)words.textContent+='\n\nCelder\'s consent is recorded. The centaurs have not yet agreed. Next, take the return passage and ask their speaker to accept the compact.';
      else button('consent',state.compact.centaurs?'Secure Celder\'s consent / Avert the battle':'Record Celder\'s consent',()=>{if(command({type:'compact',side:'celder'}).ok){celder();notice(state.battle.status==='averted'?'Both parties have agreed. Battle averted. Return to Laketown.':'Celder\'s consent recorded. Return to the centaur speaker for the remaining agreement.');}});
    }
    words.textContent+=state.battle.status==='pending'?'\n\nThe return passage takes 1 minute 30 seconds of campaign time. You travel immediately to the centaur camp; this time is deducted from the battle countdown.':'\n\nThe return passage lands beside the centaur camp in Yunethre. From there, follow the main quest marker to Laketown.';
    button('return-yunethre','Return to the centaur camp'+(state.battle.status==='pending'?' (1m 30s journey)':''),()=>travel(null,{x:places.centaurs.x-10,z:places.centaurs.z+5},state.battle.status==='pending'?90:0));
    if(state.battle.status==='pending')button('offer','Hear the military offer',()=>{show('offer','The military offer','Fighting for Celder would put you at war with the centaurs. Only a field victory followed by Laketown\'s conquest would earn the military alliance.\n\nThe field battle can be joined at the meadow south of Bane’s Camp when the armies meet. Laketown’s separate conquest is not yet playable; a field victory alone grants neither the town nor an alliance. Hearing this offer has not committed you.');button('back','Back to the envoy',celder);});
    button('close','Explore Canerd',close);
  }
  function road(){
    if(state.aftermathVisited){
      show('road','Return toward Minora','Take the road back to report Laketown\'s decision.');
      button('return',state.returned?'Hear the messenger again':'Watch the assault on Minora',async()=>{if(!state.returned&&onWitness){close();if(!await onWitness())return;}if(command({type:'return'}).ok)messenger();});
    }else{show('road','The road to Minora','The Muster Gate leads back to Minora. Your assignment is in Yunethre, to the northwest; follow the main quest marker to Laketown.');}
    button('close','Continue exploring',close);
  }
  function messenger(){
    show('messenger','A speaking bird of the Wizard Guild','Teresod! Do not enter Minora. Wilhelm has taken the city. The three council banners have been torn down, and his soldiers hold the five League provinces.\n\nThe Guild has moved the tower to the lakeside cottage in South Oremindi. Taleth awaits you there. We are calling ourselves the Wizards\' League now. Your agreements still matter; they are what we have left.\n\nThe tower is a refuge within the orc chief\'s territory. We have not conquered the mountains.');
    button('map','View the changed geopolitical map',()=>{close();document.getElementById('open-map').click();map.open({regions:chartRegions(),view:'geopolitical'});});
    if(onContinueChapter)button('continue-chapter','Continue Chapter 3 / Seek the relocated tower',()=>{close();onContinueChapter();});
    button('menu','Save and return to the main menu',()=>{close();if(save().ok)mainMenu();});button('close','Remain on the road',close);
  }
  function target(){
    if(towerState().room==='lookout')return near(LOOKOUT_TALETH,3.5)?'taleth':near(LOOKOUT_DOOR,3)?'chamber':null;
    if(towerState().inside)return near({...TALETH_SPOT,y:TOWER.y})?'taleth':near({...TOWER_DOOR,y:TOWER.y})?'leave':null;
    if(!state.returned&&near({...TOWER_EXIT,y:TOWER.y},3))return 'enter';
    if(state.battle.status==='active'&&ready(CENTAUR_BATTLEFIELD.approach)&&near(CENTAUR_BATTLEFIELD.approach,9))return 'battle';
    for(const p of Object.values(places))if(ready(p)&&near(p,p.id==='departure'?12:5)&&!(p.id==='centaurs'&&state.battle.winner==='celder'))return p.id;
    return null;
  }
  function interact(){
    if(mode()!=='playing')return false;
    const t=target();if(!t)return false;
    if(t==='taleth')taleth();else if(t==='chamber')travel('tower');else if(t==='leave'){if(state.briefed)travel(null,TOWER_EXIT);else notice('Speak with Taleth before leaving.');}
    else if(t==='enter')travel('tower');else if(t==='departure')road();else if(t==='battle')battlefield();else meeting(t);return true;
  }
  prompt.onclick=interact;
  function updatePeople(time,dt){
    world.setYunethreCampActive?.(state.battle.winner!=='celder');
    root.visible=!towerState().inside;
    celderPresence.update(time,root.visible);
    if(!root.visible)return;
    for(const id of ['town','centaurs','celder']){
      const p=places[id];if(!ready(p)){const actor=people.get(id);if(actor)actor.group.visible=false;continue;}
      if(!people.has(id)){
        const actor=id==='centaurs'?createCentaur({envoy:true}):id==='celder'?createCelderKnight({envoy:true}):createLaketownCouncilMember();
        actor.group.position.set(p.x,world.heightAt(p.x,p.z),p.z);actor.group.rotation.y=Math.PI;root.add(actor.group);people.set(id,actor);
      }
      const actor=people.get(id);actor.group.visible=id!=='centaurs'||state.battle.winner!=='celder';actor.animate?.(time,0,true,{});
      const dx=position.x-p.x,dz=position.z-p.z,gap=Math.hypot(dx,dz);
      const facing=gap>.15&&gap<10&&Math.abs(position.y-actor.group.position.y)<3?Math.atan2(dx,dz):Math.PI;
      const turn=Math.atan2(Math.sin(facing-actor.group.rotation.y),Math.cos(facing-actor.group.rotation.y));
      actor.group.rotation.y+=turn*(1-Math.exp(-4*Math.max(0,Math.min(.1,dt))));
    }
  }
  function update(){
    const playing=mode()==='playing',t=playing?target():null;prompt.hidden=!t;
    if(t)prompt.textContent='F / '+({taleth:'Speak with Taleth',centaurs:'Speak with '+BANE.name+' / '+BANE.title,chamber:'Return to the chamber',leave:'Set out for Yunethre',enter:'Enter the Guild tower',battle:'The centaur–Celder battlefield',departure:state.aftermathVisited?'Report to Taleth':'The Minora road'}[t]??places[t].name);
    const left=Math.max(0,Math.ceil((state.battle.status==='active'?BATTLE_END:BATTLE_START)-state.elapsed)),label=Math.floor(left/60)+':'+String(left%60).padStart(2,'0');
    clockText=state.returned?'Chapter 2 complete':state.battle.status==='averted'?'Peace secured / Battle averted':state.battle.status==='resolved'?'Battle ended / '+(state.battle.winner==='celder'?'Celder':'Centaurs')+' won':!state.departed?'Time held in the tower':state.battle.status==='active'?'Battle underway / Resolves in '+label:'Battle in '+label+(towerState().inside?' / Time held':'');
    guide.visible=false;
    if(playing&&!towerState().inside){
      const goal=marker();
      if(!state.returned&&ready(goal)&&Math.hypot(position.x-goal.x,position.z-goal.z)<90){guide.visible=true;guide.position.set(goal.x,world.heightAt(goal.x,goal.z)+3.3,goal.z);}
    }
  }
  function marker(){
    const room=towerState().room;
    if(room)return !state.briefed?{y:TOWER.y,...(room==='lookout'?LOOKOUT_TALETH:TALETH_SPOT),id:'taleth',label:'Speak with Taleth'}:
      {y:TOWER.y,...(room==='lookout'?LOOKOUT_DOOR:TOWER_DOOR),id:'door',label:room==='lookout'?'Return to the chamber':'Leave for Yunethre'};
    return travelGoal();
  }
  function travelGoal(){
    const resolved=['resolved','averted'].includes(state.battle.status),overseas=[61,62].includes(world.regionAt(position.x,position.z).id);
    if(state.battle.status==='active'&&!overseas)return {...CENTAUR_BATTLEFIELD.approach,id:'battle',region:38,kind:'quest',markerKind:'main',directionsKnown:true,shortLabel:'Battlefield',label:'The centaur–Celder battle',detail:'Ride to the meadow south of Bane’s Camp. Press F at its approach to choose a side, or let the battle unfold without you.'};
    const id=overseas?'celder':state.aftermathVisited?'departure':!state.visits.town?'town':resolved?
      state.battle.winner==='centaurs'&&!state.centaurProtection&&!state.elfHostile?'centaurs':'town':state.battle.status==='active'?'town':'centaurs';
    const passage=id==='centaurs'&&state.battle.status==='pending'&&state.compact.centaurs;
    return {...places[id],kind:'quest',markerKind:'main',directionsKnown:state.briefed,
      shortLabel:{town:'Laketown',centaurs:'Centaur camp',celder:'Canerd',departure:'Minora road'}[id],label:passage?'Travel to Canerd / centaur speaker':places[id].name,
      detail:overseas?(resolved||state.aftermathVisited?'Ask Celder\'s envoy for passage back to Yunethre, then ride to Laketown.':state.compact.celder?'Celder has agreed. Ask the envoy for return passage and obtain the centaurs\' consent.':'Speak with Celder\'s envoy and explicitly record his consent to the compact.'):
        passage?'Speak with the centaur speaker to arrange passage to Canerd.':undefined};
  }
  // Taleth and the speakers give directions, not surveyed terrain. Sharing
  // this one destination keeps the atlas, compass and quest card in step.
  function navigation(){return state.returned?null:marker();}
  function mapMarks(){
    if(!state.briefed||state.returned)return [];
    const goal=travelGoal();
    return [{id:'yunethre-objective',targetId:goal.id,kind:'quest',markerKind:'main',directionsKnown:true,
      name:goal.shortLabel,...TRANSFORM.worldToAtlas(goal.x,goal.z)}];
  }
  function quest(){const goal=marker();return {label:'MAIN QUEST / CHAPTER 2',title:state.returned?'The Guild in exile':goal.label,
    detail:(goal.detail??chapterObjective(state))+(towerState().inside?'':' '+Math.round(Math.hypot(position.x-goal.x,position.z-goal.z))+' m direct.')+'  P toggles quest autoplay.',clock:clockText,
    target:{...goal,y:goal.y!==undefined?goal.y+2.25:ready(goal)?world.heightAt(goal.x,goal.z)+3.3:position.y+3.3},
    markerLabel:goal.shortLabel??goal.label,edgeMarker:!towerState().inside,showMarker:!state.returned};}
  sync();
  return {state:()=>campaign.snapshot(),residentCampaign:()=>residentCampaign,journal,openJournal:chapterId=>journalView.open(chapterId),command,interact,update,meeting,marker,navigation,mapMarks,drawQuest:questView.draw,
    conversation:()=>dialog.hidden?null:{id:conversationId,text:words.textContent,actions:[...actions.querySelectorAll('button')].filter(b=>!b.hidden&&!b.disabled).map(b=>b.dataset.chapterAction)},
    choose(id){const b=[...actions.querySelectorAll('button')].find(b=>b.dataset.chapterAction===id&&!b.hidden&&!b.disabled);if(dialog.hidden||!b)return false;b.click();return true;},
    tick(dt,active,time){if(disposed)return;updatePeople(time,dt);if(active&&state.departed&&!state.returned&&['pending','active'].includes(state.battle.status)){tickSeconds+=dt;if(tickSeconds>=.25){const previous=state.battle.status;campaign.advance(tickSeconds);tickSeconds=0;state=campaign.snapshot();onDirty();if(previous!==state.battle.status){sync();notice(state.battle.status==='active'?'The armies have met south of Bane’s Camp. Follow the battlefield marker to join, or remain neutral.':'The battle is over. Return to Laketown for its decision.');}}}update();},
    save(exploration,tower,riding){return {format:'azhora-yunethre',version:1,history,chapter:campaign.snapshot(),tower,exploration,riding};},
    restore(data){const result=campaign.restore(data.chapter);if(!result.ok)throw Error(result.reason);journalView.close();history=data.history;state=campaign.snapshot();residentCampaign=yunethreResidentCampaign(data);world.setCouncil?.(residentCampaign);tickSeconds=0;dialog.hidden=true;sync();},
    keydown(event){
      if(journalView.isOpen()){if(event.code==='Escape'||event.code==='KeyJ'){event.preventDefault();if(!event.repeat)journalView.close();}return true;}
      if(!dialog.hidden){if(event.code==='Escape'){event.preventDefault();close();}return !event.target?.closest('button')||!['Enter','Space','Tab'].includes(event.code);}
      if(event.code==='KeyJ'&&event.shiftKey&&mode()==='playing'){event.preventDefault();if(!event.repeat)journalView.open();return true;}
      if(event.code==='KeyF'&&mode()==='playing'&&!event.repeat){const handled=interact();if(handled)event.preventDefault();return handled;}return false;
    },
    developerWait(){close();if(!state.departed){notice('Leave the tower before advancing the chapter.');return;}if(!['pending','active'].includes(state.battle.status)){notice('This conflict is already settled.');return;}campaign.advance(Math.max(0,BATTLE_END-state.elapsed));sync();notice('Neutral battle resolved. Return to Laketown.');},
    developerBattle(){close();if(!state.departed){notice('Leave the tower before advancing the chapter.');return false;}if(state.battle.status!=='pending'){notice('The battle is already underway or settled.');return false;}campaign.advance(Math.max(0,BATTLE_START-state.elapsed));sync();notice('Battle started. Follow the battlefield marker south of the camp.');return true;},
    dispose(){disposed=true;journalView.dispose();questView.dispose();prompt.remove();dialog.remove();celderPresence.dispose();for(const actor of people.values()){if(actor.dispose)actor.dispose();else disposeCharacter(actor);}people.clear();root.removeFromParent();root.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});},
  };
}
