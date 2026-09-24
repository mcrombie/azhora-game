import {createDrentCivilWar, DRENT_QUEST_ID, DRENT_EVIDENCE_ID, DRENT_SUPPLIES_ID, DRENT_EVIDENCE_TEXT} from './drent-civil-war.js';
import {DRENT_SITES, DRENT_NPCS, DRENT_GUARD_PATROLS} from './drent-sites.js';
import {createStealth, STEALTH} from './stealth.js';
import {INSTRUCTOR, INSTRUCTOR_STAND} from './instructor.js';
import {INVENTORY_ITEMS} from './inventory.js';

export const DRENT_FIGHT_ID = 'drent-killian-confrontation';
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const killianModel = () => {
  const npc=DRENT_NPCS.find(one=>one.id==='killian');
  return {role:npc.modelRole||'town-carter',tunic:npc.color,skin:npc.skin,look:npc.look};
};

/** Guards can see around a crate, not through it. Ground/water footprints are not walls. */
export function guardLineOfSight(world,a,b) {
  const d=distance(a,b),dx=b.x-a.x,dz=b.z-a.z;
  const shapes=world.nearColliders?.((a.x+b.x)/2,(a.z+b.z)/2,d/2+.1)??world.colliders??[];
  return !shapes.some(c=>{
    if(['river-water','pond-water','body','person'].includes(c.kind))return false;
    if(Number.isFinite(c.r)){
      const t=Math.max(0,Math.min(1,((c.x-a.x)*dx+(c.z-a.z)*dz)/(d*d||1)));
      return t>.02&&t<.98&&Math.hypot(a.x+dx*t-c.x,a.z+dz*t-c.z)<c.r;
    }
    let from=0,to=1;
    for(const [at,delta,center,extent] of [[a.x,dx,c.x,c.hx],[a.z,dz,c.z,c.hz]]){
      if(!Number.isFinite(extent))return false;
      if(Math.abs(delta)<1e-10){if(at<=center-extent||at>=center+extent)return false;}
      else {const p=(center-extent-at)/delta,q=(center+extent-at)/delta;from=Math.max(from,Math.min(p,q));to=Math.min(to,Math.max(p,q));}
    }
    return from<to&&to>.02&&from<.98;
  });
}

/** A side story host. All story transitions live in drent-civil-war; this connects people,
 * inventory, real movement/guard awareness, and the same combat used by the main road. */
export function createDrentHost({world,npcById,inventory,skills,combat,position,mode,trained,
  openDialogue,closeDialogue,toast,onChange,onTrack,getTracked,openQuestChoice=null,stopAutoplay=()=>{}}) {
  let sneaking=false,nearby=null,patrolClock=0,escortStarted=false,fightPending=false;
  let lastSkillLevel=1,practiceSave=0;
  const stealth=createStealth({lineOfSight:(guard,player)=>guardLineOfSight(world,guard,player)});
  const quest=createDrentCivilWar({applyEffects(effects){
    // Validate the complete exchange before touching the satchel. A refused grant must
    // leave the camp searchable, and a refused lesson must not consume the evidence.
    const counts=new Map(),applied=[];
    for(const effect of effects.filter(e=>['grant','remove'].includes(e.type))){
      const item=INVENTORY_ITEMS[effect.id],before=counts.get(effect.id)??inventory.count(effect.id);
      const after=before+(effect.type==='grant'?effect.quantity:-effect.quantity);
      if(!item||!Number.isSafeInteger(after)||after<0||(!item.stackable&&after>1))return false;
      counts.set(effect.id,after);
    }
    const oldSkills=skills.snapshot();
    const rollback=()=>{for(const effect of [...applied].reverse()){
      if(effect.type==='remove')inventory.add(effect.id,effect.quantity);else inventory.remove(effect.id,effect.quantity);
    }skills.restore(oldSkills);return false;};
    for(const effect of effects.filter(e=>['grant','remove'].includes(e.type))){
      const ok=effect.type==='remove'?inventory.remove(effect.id,effect.quantity):inventory.add(effect.id,effect.quantity);
      if(!ok)return rollback();applied.push(effect);
    }
    for(const effect of effects){
      if(effect.type==='learn'&&!skills.learn(effect.id).ok)return rollback();
      if(effect.type==='skill-floor'){
        const have=skills.xp(effect.id);
        if(have<effect.xp&&!skills.gain(effect.id,effect.xp-have).ok)return rollback();
      }
    }
    return true;
  }});
  const state=()=>quest.state();
  const go=(id,label,action)=>({id,label,action});
  const leave=()=>go('drent-leave','Back to the road',closeDialogue);
  const say=(npc,lines,choices)=>openDialogue(npc,lines,null,'Back to the road',{choices:choices??[leave()]});
  function changed(){sync();inventory.refresh();onChange();}
  function act(action){const result=quest.act(action);if(result.ok)changed();return result;}
  function focus(id){onTrack(id);closeDialogue();}
  function offerFocus(){
    stopAutoplay();
    if(!openQuestChoice){toast('Civil War in Drent is available. Choose it in Objectives or continue to Nothom.','NEW SILVER QUEST LEAD');return;}
    openQuestChoice({title:'The road ahead',description:'The ambush is over. Continue your army orders, or return to report the rebels. Choose which objective to follow next.',choices:[
      {id:'drent-main',grade:'main',label:'Continue to Nothom',detail:'Carry your letter west and report for duty. Civil War in Drent remains available.',action:()=>onTrack('main')},
      {id:'drent-focus',grade:'plot',label:'Return to Officer Glun',detail:'Focus Civil War in Drent. Report the ambush and decide whether to investigate.',action:()=>onTrack(DRENT_QUEST_ID)},
    ]});
  }
  function defeatedAmbush(){if(act('defeat-ambush').ok)offerFocus();}
  function followChoice(npc){say(npc,['Find their camp in the woods beyond the Greenway junction. Search the belongings they left behind. If you find any papers, bring them straight to me. Do not read them.',
    'Your muster orders still stand. This investigation is separate; you may return to it when you are ready.'],[
    go('drent-focus','Focus Civil War in Drent',()=>focus(DRENT_QUEST_ID)),go('drent-main','Keep the main quest focused',()=>focus('main'))]);}
  function converse(npc){
    if(!['instructor','killian',...DRENT_NPCS.filter(n=>n.id!=='killian').map(n=>n.id)].includes(npc.id))return false;
    const s=state();
    if(npc.id==='instructor'){
      if(!trained()||!s.ambushDefeated)return false;
      if(!s.accepted){say(npc,['Rebels on the Greenway? Tell me exactly where they were. I need someone who can find their camp, not another rumor brought in off a boat.'],[
        go('drent-accept','Accept silver quest · Search for their camp',()=>{if(act('accept-investigation').ok)followChoice(npc);}),
        go('drent-decline','My orders take me to Nothom. Not now.',closeDialogue)]);return true;}
      if(s.outcome){say(npc,[s.outcome==='monarchist'?'You did your duty. I have recorded your service to the Crown. Drent remembers who keeps its roads open.':'Still on the road? See that your letter reaches Nothom.']);return true;}
      if(!s.evidenceFound){say(npc,['The camp is off the woodland junction, tucked into the trees nearby. Search the abandoned baggage. Bring back any papers unread.']);return true;}
      if(!s.chosenPath){say(npc,['You found their papers? Hand them over. If there is a name in them, I will deal with it.'],[
        go('drent-glun','Give evidence to Glun · Commit to the Empire',()=>{if(act('report-glun').ok)converse(npc);}),
        go('drent-wait','Keep the evidence for now',closeDialogue)]);return true;}
      if(s.chosenPath==='republican'){say(npc,['Have you brought me anything from that camp? I will be here when you do.']);return true;}
      if(s.killianDefeated){say(npc,['Killian is dead. The local Republican supply route has lost its keeper. You stood with the Crown when it mattered.'],[
        go('drent-finish-imperial','Report the outcome · Complete silver quest',()=>{if(act('report-victory').ok){closeDialogue();toast('Civil War in Drent complete. Empire favor +10.','SILVER QUEST COMPLETE');}})]);return true;}
      if(s.confrontationStarted){say(npc,['We will confront Killian together. Stay with me on the way to his cottage.']);return true;}
      say(npc,['Killian. I know that man. He has been supplying the Republicans from under our noses.',
        'Are you ready to confront him? He may resist, and I will use force if he does.'],[
        go('drent-confront','Yes. Go with Glun to confront Killian.',()=>{closeDialogue();if(act('confront-killian').ok){escortStarted=true;stopAutoplay();onTrack(DRENT_QUEST_ID);toast('Walk with Glun to Killian.','CIVIL WAR IN DRENT');}}),
        go('drent-not-ready','Not yet.',closeDialogue)]);return true;
    }
    if(npc.id!=='killian'){say(npc,['Garrison stores. Army personnel only beyond the barracks gate. Keep to the village street.']);return true;}
    if(s.killianDefeated)return false;
    if(s.confrontationStarted){confrontationDialogue(npc);return true;}
    if(!s.evidenceRead||s.chosenPath==='monarchist'){
      say(npc,[s.chosenPath==='monarchist'?'I have work to finish. Is there something you need?':'Boats arrive. Soldiers leave. The rest of us keep the village going. Are you looking for someone?'],[
        go('drent-directions','Can you point me in the right direction?',()=>say(npc,[
          'Jojo keeps the landing, at the head of the pier. Officer Glun trains the hired swords by the straw post at the village crossroads.',
          'For Nothom, follow the main road west through Greenway Watch and over the Caloss. The narrow dirt paths wander into the woods; they are no substitute for knowing where you are going.'
        ])),leave()]);return true;
    }
    if(!s.chosenPath){say(npc,['Those were our people at the junction. And now you have the names of everyone who fed them.',
      'The Crown calls us rebels. Our families chose representatives before the imperial officers chose themselves. Hand me those papers and help us keep people fed.'],[
      go('drent-killian','Give evidence to Killian · Commit to the Republic',()=>{if(act('report-killian').ok){onTrack(DRENT_QUEST_ID);say(npc,[
        'Thank you. The barracks has bandages and rations that our families need. Bring a bundle from the armory stores. No killing.',
        'I will teach you to move quietly. Press X to sneak; press X again to stand. Stay behind the guards, use the crates and walls as cover, and watch their suspicion meter.',
        'Circle the barracks instead of taking the front gate. Sneak to the supply chest and press F when you are out of sight. If a guard spots you, step out of the yard and let the alarm settle.'
      ]);toast('X toggles sneak. Practice near watchful guards; safe walking gives no experience.','KILLIAN TAUGHT YOU STEALTH');}}),leave()]);return true;}
    if(s.outcome){say(npc,['Those supplies are already on their way. You helped the Republic without leaving another body in the street. I will remember that.']);return true;}
    if(s.suppliesStolen){say(npc,['You got them. Bandages, rations, and no names for Glun to read. The Republic will remember this.'],[
      go('drent-finish-republican','Hand over the supplies · Complete silver quest',()=>{if(act('return-supplies').ok){closeDialogue();toast('Civil War in Drent complete. Republic favor +10.','SILVER QUEST COMPLETE');}})]);return true;}
    say(npc,['X to sneak. Come in around the barracks, behind the guards. Use the stacked crates to break their view. Press F at the armory chest while hidden. Bring the supplies straight back here.']);return true;
  }
  function itemActions(id){return id===DRENT_EVIDENCE_ID&&quest.allowed('read-evidence')?[{id:'read-evidence',label:'Break the seal and read — disobey Glun'}]:[];}
  function itemText(id){return id===DRENT_EVIDENCE_ID&&state().evidenceRead?DRENT_EVIDENCE_TEXT.join('\n\n'):null;}
  function itemAction(id,action){if(id!==DRENT_EVIDENCE_ID||action!=='read-evidence')return false;
    const result=act(action);if(result.ok)toast('The papers name Killian in Tidehaven. You may bring them to him or to Glun. Neither side is chosen yet.','EVIDENCE READ');return result.ok;}
  function trackableView(){const view={...quest.view(),notes:quest.view().entries.join("\n\n")},s=state();
    if(s.ambushDefeated&&!s.accepted)return {...view,active:true,complete:false,stage:'lead',title:'Civil War in Drent',detail:'Optional: report the rebel ambush to Officer Glun in Tidehaven. Your main orders to Nothom can wait, or you can continue west.',destinationIds:['instructor']};
    return view;
  }
  function toggleSneak(){if(!skills.taught('stealth')){toast('Someone who works in shadows could teach you to sneak.','STEALTH NOT YET TAUGHT');return false;}
    sneaking=!sneaking;toast(sneaking?'Move quietly. Keep out of the guards’ sight. X to stand.':'You stand up.','STEALTH');return true;}
  function sync(){const s=state();world.drentCivilWar?.setEvidenceTaken(s.evidenceFound);world.drentCivilWar?.setSuppliesTaken(s.suppliesStolen);
    const killian=npcById.get('killian'),glun=npcById.get('instructor');
    const inFight=combat.state.encounterId===DRENT_FIGHT_ID&&['active','defeated'].includes(combat.state.phase);
    if(killian)killian.hidden=s.killianDefeated||inFight;
    if(glun){glun.hidden=inFight;if(!s.confrontationStarted||s.killianDefeated){glun.escorting=false;glun.walkingWith=false;
      if(escortStarted){const a=combat.state.allies.find(a=>a.id==='instructor');if(a){glun.actor.group.position.set(a.x,world.heightAt(a.x,a.z),a.z);world.npcPositions.instructor={x:a.x,z:a.z};}escortStarted=false;}
    }}
  }
  function canConfront(){const k=npcById.get('killian'),g=npcById.get('instructor');return !!k&&!!g&&quest.allowed('kill-killian')
    &&combat.state.phase!=='active'&&distance(g.actor.group.position,k.actor.group.position)<5&&distance(position(),k.actor.group.position)<9;}
  function confrontationDialogue(killian){
    if(!canConfront()){say(killian,['If Glun has something to say to me, bring him here. I am not answering to an officer who is still halfway across the village.']);return;}
    // Esc may dismiss this without canceling the escort. Keep the automatic prompt one-shot;
    // speaking with Killian again explicitly reopens the same confrontation choice.
    fightPending=true;
    say(killian,['Glun has the papers, then. I will not give you the others. Tell him that before he calls this justice.'],[
      go('drent-fight','Stand with Glun',()=>{closeDialogue();fightPending=false;if(!startFight()){act('failed-confrontation');toast('Glun waits for you to regroup. Speak to him when you are ready.','CONFRONTATION PAUSED');}})]);
  }
  function startFight(){const k=npcById.get('killian'),g=npcById.get('instructor');if(!canConfront())return false;
    const at=k.actor.group.position,ga=g.actor.group.position;
    const encounter={id:DRENT_FIGHT_ID,center:{x:at.x,z:at.z},checkpoint:{x:at.x+5,z:at.z+5},retreatLine:at.z+24,
      enemies:[{id:'drent-killian',kind:'rebel',name:'Killian',hp:180,x:at.x,z:at.z,entry:.3,model:killianModel()}],
      allies:[{id:'instructor',kind:'officer',name:'Officer Glun',level:35,hp:280,spared:true,x:ga.x,z:ga.z,model:{role:INSTRUCTOR.modelRole,tunic:INSTRUCTOR.color,skin:INSTRUCTOR.skin,look:INSTRUCTOR.look}}]};
    const ok=combat.startEncounter(encounter);if(ok){sneaking=false;sync();}return ok;
  }
  function updateEscort(){const s=state();if(!s.confrontationStarted||s.killianDefeated||combat.state.phase==='active')return;
    const glun=npcById.get('instructor'),killian=npcById.get('killian');if(!glun||!killian)return;
    escortStarted=true;glun.escorting=true;glun.walkingWith=true;glun.pace=3.1;
    const from=glun.actor.group.position,to=killian.actor.group.position,nearPlayer=distance(from,position())<11;
    world.npcPositions.instructor=nearPlayer?{x:to.x+2.5,z:to.z+1.5}:{x:from.x,z:from.z};
    if(!fightPending&&canConfront())confrontationDialogue(killian);
  }
  function combatEvent(event){if(combat.state.encounterId!==DRENT_FIGHT_ID)return;
    if(event.type==='victory'){act('kill-killian');toast('Killian is dead. Speak to Glun to report the outcome.','CIVIL WAR IN DRENT');}
    else if(['defeat','retreat'].includes(event.type)){act('failed-confrontation');fightPending=false;sync();}
  }
  function guards(){return DRENT_NPCS.filter(n=>n.id!=='killian').flatMap(n=>{const actor=npcById.get(n.id)?.actor?.group;return actor?[{id:n.id,x:actor.position.x,z:actor.position.z,yaw:actor.rotation.y}]:[];});}
  function frame(dt,{playing=false,canSneak=true}={}){
    if(!canSneak)sneaking=false;
    if(playing){patrolClock+=dt;updateEscort();}
    const s=state(),p=position(),raid=s.chosenPath==='republican'&&!s.suppliesStolen&&!s.outcome;
    for(const n of DRENT_NPCS.filter(n=>n.id!=='killian')){const npc=npcById.get(n.id);if(!npc)continue;
      const patrol=DRENT_GUARD_PATROLS[n.id];if(playing&&patrol?.length){const next=patrol[Math.floor(patrolClock/9)%patrol.length];world.npcPositions[n.id]={x:next.x,z:next.z};npc.pace=1.25;npc.face=next.face??{x:next.x+Math.sin(next.yaw??n.yaw??0)*3,z:next.z+Math.cos(next.yaw??n.yaw??0)*3};}}
    const restricted=raid&&distance(p,DRENT_SITES.supplies)<22;
    const awareness=stealth.update({dt,position:p,sneaking,taught:skills.taught('stealth'),guards:restricted?guards():[],paused:!playing});
    if(awareness.xp){skills.gain('stealth',awareness.xp);practiceSave+=dt;
      const level=skills.level('stealth');if(level>lastSkillLevel){lastSkillLevel=level;toast(`Stealth level ${level}.`,'PRACTICE');onChange();}
      else if(practiceSave>8){practiceSave=0;onChange();}}
    if(awareness.caught)toast('The guards have spotted you. Leave the yard and wait for suspicion to fade before trying again.','BARRACKS ALERT');
    nearby=null;
    if(playing&&quest.allowed('search-camp')&&distance(p,DRENT_SITES.evidence??DRENT_SITES.camp)<2.8)nearby={id:'drent-rebel-camp',prompt:'Search the abandoned rebel baggage'};
    if(playing&&raid&&distance(p,DRENT_SITES.supplies)<2.6)nearby={id:'drent-barracks-supplies',prompt:!sneaking?'Sneak with X to take supplies':awareness.detected||awareness.visible||awareness.suspicion>STEALTH.clearAt?'Stay out of sight until suspicion fades':'Steal the armory supplies'};
    sync();return awareness;
  }
  function interact(){if(!nearby)return false;
    if(nearby.id==='drent-rebel-camp'){
      if(act('search-camp').ok){say({id:'drent-camp-baggage',name:'Abandoned baggage',role:'The rebel camp'},[
        'Cold ashes. Three bedrolls. Nobody returned from the ambush. Under a folded coat you find a sealed packet of orders.',
        'The evidence is in your satchel. Glun told you not to read it. Press I and choose “Break the seal and read” if you decide otherwise.'
      ]);}return true;
    }
    const awareness=stealth.view();
    if(!sneaking||awareness.detected||awareness.visible||awareness.suspicion>STEALTH.clearAt){toast('Sneak, break the guards’ line of sight, and let suspicion fall before taking the supplies.','ARMORY STORES');return true;}
    if(act('steal-supplies').ok){toast('Armory supplies added to your satchel. Return to Killian. Stealth has reached at least level 2.','SUPPLIES TAKEN');sneaking=false;}
    return true;
  }
  function restore(saved){const ok=quest.restore(saved);if(!ok)return false;sneaking=false;fightPending=false;stealth.reset(position());
    escortStarted=false;if(state().confrontationStarted&&!state().killianDefeated)quest.act('failed-confrontation');
    const glun=npcById.get('instructor');if(glun){glun.hidden=false;glun.escorting=false;glun.walkingWith=false;world.npcPositions.instructor={x:INSTRUCTOR_STAND.x,z:INSTRUCTOR_STAND.z};}
    sync();return ok;}
  return {quest,act,state,snapshot:quest.snapshot,restore,converse,defeatedAmbush,offerFocus,trackableView,itemActions,itemText,itemAction,
    toggleSneak,frame,combatEvent,interact,sync,startFight,
    get nearby(){return nearby;},get sneaking(){return sneaking;},get speedMultiplier(){return sneaking?STEALTH.speedMultiplier:1;},
    get awareness(){return stealth.view();},get markerIds(){return trackableView().destinationIds??[];},
    point(id){if(id==='drent-rebel-camp')return {...(DRENT_SITES.evidence??DRENT_SITES.camp),name:'Abandoned rebel camp'};if(id==='drent-barracks-supplies')return {...DRENT_SITES.supplies,name:'Barracks armory supplies'};return null;}};
}
