import {createLusciaCivilWar,LUSCIA_CIVIL_QUEST_ID,LUSCIA_OPERATIVE_ID,LUSCIA_SOLDIER_ID,LUSCIA_LOYALISTS} from './luscia-civil-war.js';
import {LUSCIA_SITES} from './luscia-chapter.js';
import {toWorld} from './world-scale.js';

export const LUSCIA_REPUBLICAN_FIGHT_ID='luscia-relay-republican';
const hut=LUSCIA_SITES['courier-satchel'];
export const LUSCIA_RECRUIT_NPCS=Object.freeze([
  Object.freeze({x:hut.x,z:hut.z,id:LUSCIA_SOLDIER_ID,name:'Davin',role:'Lauvel Republican soldier',modelRole:'suvali-guard',color:0x526651,yaw:Math.PI/2}),
  Object.freeze({id:'luscia-ranger',name:'Renn',role:'A traveler at the burned hamlet',modelRole:'ranger',color:0x5d6f47,...toWorld(-338,220),yaw:Math.PI}),
]);
export const LUSCIA_RECRUIT_POSITIONS=Object.freeze(Object.fromEntries(LUSCIA_RECRUIT_NPCS.map(n=>[n.id,{x:n.x,z:n.z,yaw:n.yaw}])));
// The existing crate beside the relay lean-to, not an invisible search point in the turf.
export const LUSCIA_DISPATCH_SITE=Object.freeze({id:'luscia-relay-dispatches',name:'Signed relay dispatches',...toWorld(-395,187)});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

/** Host adapter: one peaceful person becomes one combatant only after an explicit refusal.
 * Shared satchel ownership is authoritative in living-story and is supplied by the host. */
export function createLusciaCivilWarHost({world,npcById,combat,position,mode=()=> 'playing',
  openDialogue,closeDialogue,toast=()=>{},onChange=()=>{},onTrack=()=>{},
  living=()=>null,luscia=null,takeSatchel=()=>({ok:false,reason:'The courier job is not active.'}),
  onRepublicJoined=()=>({ok:true}),onImperialCommitted=()=>{},onImperialCompleted=()=>{},
  reportPlayer=()=>{},onImperialOnward=()=>{},mercenaryName=id=>id,
  isUnavailable=()=>null,stopAutoplay=()=>{}}={}){
  const quest=createLusciaCivilWar();let nearby=null,automaticApproach=false,grantingSatchel=false;
  const model=n=>({role:n.modelRole??'villager',tunic:n.color,skin:n.skin,look:n.look});
  const person=id=>npcById.get(id),at=id=>person(id)?.actor?.group?.position??world.npcPositions[id];
  const shared=()=>living()?.satchel?.();
  const choice=(id,label,action)=>({id,label,action});
  const leave=()=>choice('luscia-civil-leave','Back to the road.',closeDialogue);
  const say=(npc,lines,choices=[])=>openDialogue(npc,lines,null,'Back to the road',{choices:[...choices,leave()]});
  const changed=()=>{sync();onChange();};
  function result(value){if(value?.ok)changed();else if(value?.reason)toast(value.reason,'CIVIL WAR IN LUSCIA');return value;}
  function isPersonalJob(){const task=shared();return !task||task.assignee==='player'||task.carrier==='player';}
  function satchelTaken(){return shared()?.carrier==='player'||luscia?.state?.satchelTaken;}
  function acceptPromise(npc){
    // The transfer must succeed before the soldier leaves. No dialogue can duplicate the item.
    let took;try{grantingSatchel=true;took=takeSatchel();}finally{grantingSatchel=false;}
    if(!took?.ok){result(took);return;}
    result(quest.agreeSoldier());closeDialogue();
    toast('Davin gives you the satchel and Hara’s name. Delivering the rolls alone chooses no side. Speak to Hara, or deliberately report the network to Sergeant Talven.','TWO WAYS FORWARD');
  }
  function startSoldierFight(){
    const npc=person(LUSCIA_SOLDIER_ID),p=at(LUSCIA_SOLDIER_ID);if(!npc||!p)return false;
    if(combat.state.phase==='active')return false;
    const success=combat.startEncounter({id:LUSCIA_REPUBLICAN_FIGHT_ID,center:{x:p.x,z:p.z},checkpoint:{x:p.x+8,z:p.z+8},retreatLine:p.z+30,
      enemies:[{id:LUSCIA_SOLDIER_ID,npcId:LUSCIA_SOLDIER_ID,name:npc.name,kind:'soldier',hp:110,x:p.x,z:p.z,entry:.3,model:model(npc)}],allies:[]});
    if(success){result(quest.opposeSoldier());npc.hidden=true;stopAutoplay();}return success;
  }
  function offerRepublic(npc){
    const s=quest.state();
    say(npc,[s.betrayed||s.soldier==='dead'
      ? 'You have already cost us people. I will not pretend otherwise. But the Republic is more than one messenger, and you have found us. The choice you make now is yours.'
      : 'The Republic was chosen by the people the Empire now calls rebels. Davin sent you because you listened. Listening was not a contract. This is.',
      'Join us and your main orders lead to Captain Arlen Voss at the Gate of Sun Horses in Solis, south-east across the Moros border. Our mercenaries muster with our companies. The Imperial muster will not send for you.',
      'The work here in Luscia is separate. You can keep it in your journal while following the gold campaign.'],[
      choice('luscia-join-republic','Join the Republic · change the main campaign',()=>{
        if(!quest.recruitmentAvailable())return result({ok:false,reason:'Hara is no longer available.'});
        const joined=onRepublicJoined(quest.state().mindRead?'luscia-mindread':'luscia-introduction');if(joined?.ok===false)return result(joined);
        result(quest.joinRepublic());closeDialogue();onTrack('main');toast('Report to Captain Arlen Voss at Solis. Civil War in Luscia remains a separate silver quest.','REPUBLICAN MAIN CAMPAIGN');
      }),choice('luscia-recruit-later','I need more time. I have not chosen.',closeDialogue)]);
  }
  function confront(npc){
    const s=quest.state();if(s.path!=='empire'||!s.proof.includes(npc.id)||s.dead.includes(npc.id))return false;
    say(npc,['You have the signed dispatches. Then you know where those supplies went. I will not give Talven another name.'],[
      choice(`luscia-confront-${npc.id}`,'Carry out Talven’s order · attack',()=>{
        const p=at(npc.id);if(!p)return;closeDialogue();
        const ok=combat.startEncounter({id:`luscia-loyalist-${npc.id}`,center:{x:p.x,z:p.z},checkpoint:{x:p.x+7,z:p.z+7},retreatLine:p.z+28,
          enemies:[{id:npc.id,npcId:npc.id,name:npc.name,kind:'rebel',hp:90,x:p.x,z:p.z,entry:.2,model:model(npc)}]});
        if(ok){npc.hidden=true;stopAutoplay();}
      })]);return true;
  }
  function converse(npc){
    if(!npc)return false;const s=quest.state();
    if(npc.id==='relay-clerk'&&luscia?.state?.started){
      reportPlayer();const task=shared();
      if(task&&((task.status==='delivered'&&task.completedBy!=='player')||(task.assignee&&task.assignee!=='player'&&task.carrier!=='player'))){
        const who=mercenaryName(task.completedBy??task.assignee),complete=task.status==='delivered';
        if(s.path==='coalition'){
          say(npc,[complete?`${who} has already filed the rolls. There is no second recovery job.`:`${who} has the courier assignment. I have no other rolls for you to fetch.`]);return true;
        }
        say(npc,[complete?`${who} delivered the satchel. There is only one set of rolls, and that work is finished.`:`${who} has the courier assignment now. I will not promise a second recovery reward for the same rolls.`,
          'Your army orders continue. Go to the muster on Moros Plain. If all four remounts have been allocated, you must walk; no missing token blocks your service.'],[
          choice('luscia-onward-muster','Take onward orders · continue the main quest',()=>{onImperialOnward({completedBy:who,finished:complete});closeDialogue();changed();})]);return true;
      }
    }
    if(npc.id===LUSCIA_SOLDIER_ID){
      if(s.soldier==='dead')return false;
      if(s.soldier==='hostile'){say(npc,['You chose the Empire. Leave, or draw your weapon.'],[choice('luscia-fight-republican','Draw your weapon.',()=>{closeDialogue();startSoldierFight();})]);return true;}
      if(!isPersonalJob()){say(npc,['These rolls are already somebody else’s errand. I have no other satchel to give you.']);return true;}
      if(s.soldier==='departed'){say(npc,['Hara keeps the timber and cloth stall in Nothom. You can still decide whom to trust.']);return true;}
      if(!luscia?.state?.briefed){say(npc,['A soldier has been through these belongings already. If Iven sent you, ask him whose errand this is before claiming it.']);return true;}
      result(quest.meetSoldier());say(npc,[
        'I found the courier before you. His satchel is safe. Those rolls name our neighbors as prisoners and rebels because they chose their own representatives when the old king died.',
        'The Empire buys your sword. It does not buy your judgment. Go to Hara at the timber and cloth stall in Nothom. Hear how the valley survives between the goblins and an army that calls it property.',
        'I offer no purse of gold. Take the rolls, and think about whom you are serving.'],[
        choice('luscia-listen-republican','I will hear Hara out. Give me the satchel.',()=>acceptPromise(npc)),
        choice('luscia-support-empire','I support the Empire. Draw your weapon.',()=>{closeDialogue();startSoldierFight();})]);return true;
    }
    if(npc.id===LUSCIA_OPERATIVE_ID){
      if(s.operative!=='free')return false;
      if(confront(npc))return true;
      if(s.path==='coalition'){
        say(npc,['Our local work is quieter than the army’s march. I am preparing the next safe route for the valley families. You are part of that work now; no province has been won by a conversation.',
          'For the main campaign, find Captain Arlen Voss at the Gate of Sun Horses in Solis. Tell the watch Hara sent you.'],[
          ...(!s.republicContact?[choice('luscia-local-briefing','Record the Luscia network’s briefing',()=>{result(quest.contactRepublic());closeDialogue();})]:[]),
          choice('luscia-track-local','Focus Civil War in Luscia',()=>{onTrack(LUSCIA_CIVIL_QUEST_ID);closeDialogue();})]);return true;
      }
      if(quest.recruitmentAvailable()){offerRepublic(npc);return true;}
      // Deliberately intercept the old three ordinary questions. Missing the unique job
      // requires actual Mind Read; knowing the answer outside the game is not an introduction.
      say(npc,['Timber offcuts and cloth by the ell. The square has seen enough soldiers lately. Can I help you find something?',
        'Iven keeps the relay on the square. Bede tends the stable yard. The main road leaves through the south-west gate.']);return true;
    }
    if(npc.id==='lauvel-picket'&&(s.introduced||s.mindRead||s.soldier==='dead'||s.accepted)){
      if(s.path==='coalition'){say(npc,['Keep to the road. My orders are the field and the picket.']);return true;}
      if(s.path==='empire'){
        if(s.imperialComplete){say(npc,['Your report is filed. The Empire has broken this supply network.']);return true;}
        const finished=LUSCIA_LOYALISTS.every(n=>s.dead.includes(n.id)&&s.proof.includes(n.id));
        say(npc,[finished?'The dispatches and the deaths are accounted for. Give me your final report.':'Find signed proof in the abandoned relay dispatches. Names without evidence are rumors. Once you have identified the network, confront its members and kill those who resist our order.'],[
          ...(finished?[choice('luscia-finish-imperial','Report the outcome · complete silver investigation',()=>{const done=quest.finishEmpire();if(done.ok){onImperialCompleted();changed();closeDialogue();}})]:[]),
          choice('luscia-focus-investigation','Focus Civil War in Luscia',()=>{onTrack(LUSCIA_CIVIL_QUEST_ID);closeDialogue();})]);return true;
      }
      say(npc,['You have something to report about Republican activity? I am responsible for the garrison’s response. Iven keeps the rolls; he does not order investigations.',
        'A report here commits you to exposing this network for the Empire. Delivering Iven’s satchel alone does not.'],[
        choice('luscia-report-empire','Expose the Republican network · work for the Empire',()=>{const answer=quest.reportEmpire();if(answer.ok){onImperialCommitted();changed();closeDialogue();onTrack(LUSCIA_CIVIL_QUEST_ID);toast('Search the signed relay dispatches. Evidence is required before confronting the named loyalists.','CIVIL WAR IN LUSCIA');}})]);return true;
    }
    if(confront(npc))return true;
    if(npc.id==='luscia-ranger'){say(npc,['The hamlet lost enough in the last march. Keep to the road.']);return true;}
    return false;
  }
  function mindRead(event){
    if(event?.targetId!==LUSCIA_OPERATIVE_ID)return false;
    const unavailable=isUnavailable(LUSCIA_OPERATIVE_ID);if(unavailable)quest.closeOperative(unavailable==='arrested'?'arrested':'dead');
    const answer=result(quest.readOperative());if(answer.ok)toast('Hara carries Republican messages to Solis. Speak with her to choose recruitment; reading her mind has not changed your allegiance.','A REPUBLICAN CONNECTION');return answer.ok;
  }
  function npcKilled(id){
    if(id===LUSCIA_SOLDIER_ID){living()?.soldierKilled?.({position:at(id)});result(quest.soldierKilled());return true;}
    if(LUSCIA_LOYALISTS.some(n=>n.id===id)){result(quest.recordDeath(id));return true;}return false;
  }
  function combatEvent(event){
    const id=combat.state.encounterId;
    if(id!==LUSCIA_REPUBLICAN_FIGHT_ID&&!id?.startsWith('luscia-loyalist-'))return false;
    if(event.type==='victory'){const target=id===LUSCIA_REPUBLICAN_FIGHT_ID?LUSCIA_SOLDIER_ID:id.slice('luscia-loyalist-'.length);
      const body=combat.state.enemies?.find(n=>n.id===target),npc=person(target);
      if(body&&Number.isFinite(body.x)&&Number.isFinite(body.z)){
        world.npcPositions[target]={x:body.x,z:body.z};
        if(npc?.actor?.group?.position)Object.assign(npc.actor.group.position,{x:body.x,z:body.z});
      }
      npcKilled(target);
      if(target===LUSCIA_SOLDIER_ID)toast('Davin is dead. Recover the one courier satchel from his body.','THE RELAY HUT');}
    if(['victory','retreat','defeat'].includes(event.type))sync();return true;
  }
  function sync(){
    const s=quest.state(),battle=['active','defeated'].includes(combat.state.phase)?combat.state.encounterId:null;
    const soldier=person(LUSCIA_SOLDIER_ID);
    if(soldier){soldier.hidden=s.soldier==='dead'||battle===LUSCIA_REPUBLICAN_FIGHT_ID||!!shared()?.completedBy&&s.soldier==='unmet';
      if(s.soldier==='departed'){const away=toWorld(-389,183);world.npcPositions[soldier.id]=away;soldier.pace=2.1;}
      if(['unmet','peaceful'].includes(s.soldier))world.npcPositions[soldier.id]={x:hut.x,z:hut.z};
      const dropped=shared();
      if(s.soldier==='dead'&&dropped?.location==='remains-relay-republican'&&dropped.position){
        world.npcPositions[soldier.id]={...dropped.position};
        if(soldier.actor?.group?.position)Object.assign(soldier.actor.group.position,dropped.position);
      }}
    const operative=person(LUSCIA_OPERATIVE_ID);if(operative)operative.thought=s.operative==='free'?'Hara counts cloth orders and thinks of Captain Arlen Voss at Solis. The Republican muster needs mercenaries. She can bring a willing recruit into that campaign.':undefined;
    for(const n of LUSCIA_LOYALISTS){const p=person(n.id),hidden=s.dead.includes(n.id)||battle===`luscia-loyalist-${n.id}`;
      if(p&&(p.lusciaHidden||hidden)){p.hidden=hidden||!!isUnavailable(n.id);p.lusciaHidden=hidden;}}
  }
  function frame(_dt,{playing=false}={}){
    const cause=isUnavailable(LUSCIA_OPERATIVE_ID);if(cause&&quest.state().operative==='free')result(quest.closeOperative(cause==='arrested'?'arrested':'dead'));
    sync();nearby=null;if(!playing)return;
    for(const actor of living()?.actors?.()??[]){
      const begun=actor.tasks?.['relay-discussion-begun'];
      if(begun===undefined||actor.tasks?.['relay-soldier']!==undefined||!actor.alive||actor.withPlayer||actor.detained)continue;
      if(living().clock()-begun<6)continue;
      const task=shared();if(task?.assignee!==actor.id||task.status==='delivered')continue;
      // The route driver reports a real arrival. A pause/reload preserves this six-second
      // exchange; an NPC who moved away cannot finish it by the clock alone.
      const npcPosition=at(actor.id)??actor.position;if(!npcPosition||distance(npcPosition,hut)>10)continue;
      living().experience(actor.id,'heard-republican-argument');
      const taken=living().takeSatchel(actor.id,{from:task.carrier??task.location});
      if(taken.ok){living().completeTask(actor.id,'relay-soldier');quest.soldierDeparture();changed();}
    }
    const s=quest.state(),p=position(),soldier=at(LUSCIA_SOLDIER_ID);
    if(s.path==='empire'&&s.proof.length<LUSCIA_LOYALISTS.length&&distance(p,LUSCIA_DISPATCH_SITE)<3)nearby={id:LUSCIA_DISPATCH_SITE.id,prompt:'Search signed Republican dispatches'};
    if(s.soldier==='dead'&&shared()?.status!=='delivered'&&!satchelTaken()&&soldier&&distance(p,soldier)<3)nearby={id:'luscia-satchel-remains',prompt:'Recover the courier satchel from Davin’s body'};
    if(!automaticApproach&&s.soldier==='unmet'&&luscia?.state?.briefed&&isPersonalJob()&&soldier&&distance(p,soldier)<5&&mode()==='playing'&&combat.state.phase!=='active'){
      automaticApproach=true;converse(person(LUSCIA_SOLDIER_ID));
    }
  }
  function npcHutArrived(id){
    const actor=living()?.actor?.(id),task=shared();
    if(!actor?.alive||actor.withPlayer||task?.assignee!==id||task.status==='delivered')return false;
    living().completeTask(id,'relay-discussion-begun');
    living().observe(id,{activity:quest.state().soldier==='dead'?'Recovering the courier’s rolls from the remains':'Speaking with Davin at the relay hut'});
    return true;
  }
  function interact(){if(!nearby)return false;
    if(nearby.id==='luscia-satchel-remains'){const taken=takeSatchel();if(taken?.ok){changed();toast('The courier satchel is in your inventory. Return it to Iven.','SATCHEL RECOVERED');}else result(taken);return true;}
    if(nearby.id===LUSCIA_DISPATCH_SITE.id){for(const person of LUSCIA_LOYALISTS)quest.evidence(person.id);changed();say({id:'relay-dispatches',name:'Signed dispatches',role:'Corroborated evidence'},LUSCIA_LOYALISTS.map(n=>n.evidence));return true;}return false;
  }
  function canTake(){const state=quest.state();return grantingSatchel||state.soldier==='dead'?{ok:true}:{ok:false,reason:'Speak with the Republican soldier and choose whether to listen or fight.'};}
  return {converse,frame,interact,combatEvent,npcKilled,npcHutArrived,mindRead,canTake,sync,
    state:quest.state,snapshot:quest.snapshot,view:quest.view,trackableView:()=>({...quest.view(),notes:quest.view().entries.join('\n\n')}),
    restore(data){const ok=quest.restore(data);if(ok){automaticApproach=false;sync();
      // Loading an earlier checkpoint must undo a later departure in this live scene.
      const soldier=person(LUSCIA_SOLDIER_ID),target=world.npcPositions[LUSCIA_SOLDIER_ID];
      if(soldier?.actor?.group?.position&&target){Object.assign(soldier.actor.group.position,{x:target.x,z:target.z});
        if(world.heightAt)soldier.actor.group.position.y=world.heightAt(target.x,target.z);}
    }return ok;},get nearby(){return nearby;},
    extraChoices(npc){return npc?.id==='relay-clerk'&&quest.view().offered?[choice('luscia-network-report','Where should I report Republican activity?',()=>say(npc,['Sergeant Talven holds the Lauvel picket. Speak to him about the Republican network if you intend to expose it. Filing these rolls alone tells me nothing about your allegiance.']))]:[];}};
}
