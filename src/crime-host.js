import {createCrime,LAW} from './crime.js';
import {COPPER_ITEM} from './economy.js';
import {guardLineOfSight} from './drent-host.js';
import {canStand} from './game-state.js';
import {BODY,bodyWorld,stepToward} from './bodies.js';
import {meleeContacts} from './melee-contact.js';
import {QUEST_IDS} from './cast.js';

export const LAW_ENCOUNTER_ID='imperial-arrest';
export const CORE_PEOPLE=new Set([...QUEST_IDS,'harbor-master','harbourmaster','dock-keeper','jojo']);
export const imperialGuard=npc=>!!npc&&(npc.id==='instructor'||/^tidehaven-watch-|^drent-barracks-/.test(npc.id)
  ||(/^legion-(soldier|officer)$/.test(npc.modelRole??'')&&!/clerk|quartermaster/i.test(npc.role??'')));
export function npcLawProfile(npc,{essential=CORE_PEOPLE.has(npc?.id)||npc?.id?.startsWith('merc-')||npc?.essential===true}={}){
  const authored=Number(npc?.maxHp??npc?.hp);
  const maxHp=authored>0&&authored<=10000?authored:npc?.id==='instructor'?420
    :npc?.ogre?620:imperialGuard(npc)||/soldier|guard|officer/.test(npc?.modelRole??'')?240
      :npc?.id?.startsWith('merc-')?100:npc?.horse?100:npc?.cat?25:npc?.dog?45:60;
  return {maxHp,essential:!!essential};
}
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const location=npc=>npc?.actor?.group?.position;

/** World-facing law. The host moves arresting guards with the ordinary collision-aware
 * mover. A guard must actually arrive before an arrest can interrupt.
 * Call frame after other patrol hosts, and skip ordinary movement for controlsNpc(id).
 */
export function createCrimeHost({world,npcById,additionalPeople=()=>[],inventory,combat,position,openDialogue,closeDialogue,
  safeToInterrupt=()=>true,stopAutoplay=()=>{},toast=()=>{},onChange=()=>{},onJail=()=>{},
  onDeath=()=>{},onAssault=()=>{},onRevive=()=>{},onCleanup=()=>{},isGuard=imperialGuard,isEssential=null,
  canRevive=npc=>!npc.fallen,profile=null,jailSpawn=null}={}){
  const crime=createCrime(),controlled=new Map(),fightIds=new Set(),navigators=new Map(),seenImpacts=new Set();
  let offeredId=null,nextOffer=0,leadId=null,saveClock=0;
  // Some authored creatures have their own animation host rather than a row in the
  // ordinary cast. Resolve them here too, without mutating that cast or saving meshes.
  const extraPeople=()=>{const seen=new Set(npcById.keys());return (additionalPeople()??[]).filter(npc=>{
    if(!npc?.id||!location(npc)||seen.has(npc.id))return false;seen.add(npc.id);return true;});};
  const people=()=>[...npcById.values(),...extraPeople()];
  const npcFor=id=>npcById.get(id)??extraPeople().find(npc=>npc.id===id)??null;
  const getNpc=value=>typeof value==='string'?npcFor(value):value;
  const available=npc=>!!location(npc)&&!npc.hidden&&!npc.fallen&&npc.actor.group.visible!==false
    &&(typeof npc.available!=='function'||npc.available());
  const config=npc=>profile?.(npc)??npcLawProfile(npc,isEssential?{essential:isEssential(npc)}:{});
  const health=value=>{const npc=getNpc(value);return npc?crime.health(npc.id,config(npc)):null;};
  const isDown=id=>{const person=health(id);return !!person&&person.status!=='alive';};
  function changed(){inventory.refresh?.();onChange();}
  function restoreControl(id){const home=controlled.get(id),npc=npcFor(id);if(!home||!npc)return;
    if(home.target)world.npcPositions[id]={...home.target};
    npc.pace=home.pace;npc.escorting=home.escorting;npc.walkingWith=home.walkingWith;npc.lawControlled=false;npc.crimeControlled=false;
    controlled.delete(id);
  }
  function release(){for(const id of [...controlled.keys()])restoreControl(id);leadId=null;offeredId=null;}
  function setControlled(npc,target){if(!controlled.has(npc.id))controlled.set(npc.id,{target:world.npcPositions[npc.id]?{...world.npcPositions[npc.id]}:null,
    pace:npc.pace,escorting:npc.escorting,walkingWith:npc.walkingWith});
    npc.lawControlled=true;npc.crimeControlled=true;npc.escorting=true;npc.walkingWith=true;npc.pace=3.2;world.npcPositions[npc.id]={x:target.x,z:target.z};}
  function death(id,person,source){const npc=npcFor(id);if(!npc)return;
    npc.crimeDown=true;npc.hidden=true;if(npc.actor?.group)npc.actor.group.visible=false;
    restoreControl(id);const at=person.position??location(npc);
    onDeath({id,npc,x:at.x,z:at.z,y:at.y??world.heightAt(at.x,at.z),kind:person.status,source,
      recoverAt:person.recoverAt,permanent:person.status==='dead'});
  }
  function process(events){for(const event of events){const npc=npcFor(event.id);
    if(event.type==='revived'&&npc&&canRevive(npc)){npc.crimeDown=false;npc.hidden=false;if(npc.actor?.group)npc.actor.group.visible=true;onRevive({id:event.id,npc});}
    else if(event.type==='cleanup')onCleanup({id:event.id,npc});
  }if(events.length)changed();}
  function assault({npcId,damage,source='player',selfDefense=false}={}){
    const npc=npcFor(npcId),at=location(npc);if(!npc||!at||!available(npc)||fightIds.has(npcId))return {ok:false,reason:'unavailable'};
    const result=crime.hit({id:npcId,damage,...config(npc),position:{x:at.x,y:at.y??world.heightAt(at.x,at.z),z:at.z},
      unlawful:source==='player'&&!selfDefense});
    if(!result.ok)return result;
    if(result.hp===0)death(npcId,result.person,source);
    if(result.crime){nextOffer=0;offeredId=null;toast(`${npc.name??'A resident'} was ${result.hp?'struck':'felled'}. Bounty: ${result.bounty} copper.`,'ASSAULT · IMPERIAL LAW');}
    onAssault({npcId,source,hp:result.hp,damage});changed();return result;
  }
  function availableGuards(){const p=position();return people().filter(npc=>isGuard(npc)&&location(npc)
    &&!npc.hidden&&!npc.crimeDown&&!fightIds.has(npc.id)&&health(npc).status==='alive'
    &&gap(location(npc),p)<=LAW.noticeRadius&&(!npc.escorting||npc.lawControlled))
    .sort((a,b)=>gap(location(a),p)-gap(location(b),p));}
  function nearbyGuard(npc){return npc&&isGuard(npc)&&!npc.hidden&&!isDown(npc.id)&&gap(location(npc),position())<=LAW.talkRange
    &&guardLineOfSight(world,location(npc),position());}
  function fine(npc){if(!nearbyGuard(npc)||!crime.view().wanted)return false;
    const result=crime.settle('fine',amount=>inventory.count(COPPER_ITEM)>=amount&&inventory.remove(COPPER_ITEM,amount));
    if(!result.ok){say(npc,'You cannot cover the fine. Serve your sentence, or refuse arrest.',true);return false;}
    closeDialogue();release();changed();toast(`Paid ${result.amount} copper. The watch has cleared your bounty.`,'FINE PAID');return true;}
  function safeJailPoint(){const desired=jailSpawn??world.pierHead??world.spawn??position();
    if(!world.bounds)return {x:desired.x,z:desired.z};
    for(let ring=0;ring<12;ring++)for(let turn=0;turn<12;turn++){
      const a=turn*Math.PI/6,at={x:desired.x+Math.sin(a)*ring*.6,z:desired.z+Math.cos(a)*ring*.6};
      if(canStand(at.x,at.z,world,BODY.traveler))return at;
    }return {x:position().x,z:position().z};
  }
  function jail(){if(!crime.view().wanted)return false;
    const result=crime.settle('jail');if(!result.ok)return false;
    closeDialogue();combat.revive?.();syncFight();release();process(crime.tick(result.seconds));
    const spawn=safeJailPoint(),p=position();p.x=spawn.x;p.z=spawn.z;p.y=world.heightAt(spawn.x,spawn.z);
    onJail({seconds:result.seconds,spawn,amount:result.amount});changed();
    toast('You served your sentence. Your bounty is cleared, your belongings remain yours, and you are fit to travel.','RELEASED FROM CUSTODY');return true;
  }
  function say(npc,intro,replacing=false){if(combat.state.phase==='active'||!nearbyGuard(npc)||(!replacing&&!safeToInterrupt()))return false;
    offeredId=npc.id;nextOffer=crime.state().time+8;stopAutoplay();
    const bounty=crime.view().bounty,affordable=inventory.count(COPPER_ITEM)>=bounty;
    openDialogue(npc,[intro??`You are wanted for assault. Your fine is ${bounty} copper. Pay it now, or come with us and serve your sentence.`,
      'Refusing arrest means facing the Imperial watch.'],null,'Decide', {choices:[
      {id:'law-pay',label:affordable?`Pay fine · ${bounty} copper`:`Pay fine · ${bounty} copper (not enough)`,action:()=>fine(npc)},
      {id:'law-jail',label:'Serve time in jail',action:()=>{if(nearbyGuard(npc))jail();}},
      {id:'law-refuse',label:'Refuse arrest · Fight the guards',action:()=>{if(!nearbyGuard(npc))return;closeDialogue();if(!startFight(npc))toast('The guard is waiting. Speak to them again to resolve the arrest.','ARREST');}},
    ]});return true;
  }
  function startFight(lead){if(!nearbyGuard(lead)||!crime.view().wanted||combat.state.phase==='active')return false;
    const p=position(),guards=[lead,...availableGuards().filter(n=>n.id!==lead.id)]
      .filter(n=>{const at=location(n);return Math.abs(at.x-p.x)<11&&at.z-p.z>-20&&at.z-p.z<17;}).slice(0,3);
    if(!guards.length)return false;
    const enemies=guards.map(npc=>{const at=location(npc),h=health(npc);return {id:npc.id,name:npc.name,
      kind:npc.id==='instructor'?'officer':'soldier',look:'legion',hp:h.maxHp,x:at.x,z:at.z,entry:.15,
      model:{role:npc.modelRole??'legion-soldier',tunic:npc.color??0x8f3b30,skin:npc.skin,look:npc.look}};});
    // Claim the NPCs before getAllies is queried: an attacking mercenary cannot enlist the
    // arresting guard on their side as well. The host's ally callback should omit lawControlled.
    for(const npc of guards){setControlled(npc,location(npc));fightIds.add(npc.id);npc.hidden=true;npc.actor.group.visible=false;}
    const config={id:LAW_ENCOUNTER_ID,level:0,center:{x:p.x,z:p.z},checkpoint:{x:p.x,z:p.z},retreatLine:p.z+28,enemies,allies:[]};
    if(!combat.startEncounter(config)){for(const npc of guards){npc.hidden=false;npc.actor.group.visible=true;fightIds.delete(npc.id);}return false;}
    // Keep the full-health denominator stable, then restore injuries. Starting with only
    // remaining HP would promote that smaller number to a new maximum on every arrest.
    for(const enemy of combat.state.enemies??[])if(fightIds.has(enemy.id))enemy.hp=Math.min(enemy.hp,health(enemy.id).hp);
    crime.resist();offeredId=null;changed();return true;
  }
  function recordCombatHit({id,hp,maxHp,source='player',selfDefense=false,permanent=false,recoverable=false,notify=true,x,z}={}){
    const npc=npcFor(id);if(!npc||!Number.isFinite(hp))return {ok:false};const before=health(npc);
    // Encounter actors can be scaled by level. Store their remaining fraction against the
    // named person's own health, so the next encounter cannot heal an injured friend.
    const remaining=Number.isFinite(maxHp)&&maxHp>0?before.maxHp*Math.max(0,hp)/maxHp:Math.max(0,hp);
    if(before.status!=='alive'||remaining>=before.hp)return {ok:false};
    const at=Number.isFinite(x)&&Number.isFinite(z)?{x,z}:
      [...(combat.state.enemies??[]),...(combat.state.allies??[])].find(actor=>actor.id===id||actor.npcId===id)??location(npc);
    const result=crime.hit({id,damage:before.hp-remaining,...config(npc),position:{x:at.x,z:at.z,y:world.heightAt(at.x,at.z)},
      unlawful:source==='player'&&!selfDefense,permanent,recoverable});
    if(result.ok&&!result.hp){if(notify)death(id,result.person,source);else{npc.crimeDown=true;npc.hidden=true;npc.actor.group.visible=false;}}
    if(result.ok)changed();return result;
  }
  function handleImpact(event){
    if(!event||!['melee-impact','arrow-impact'].includes(event.type))return {handled:false,hits:[],externalHits:0};
    const key=event.id?`${event.type}:${event.id}`:null;
    if(key&&seenImpacts.has(key))return {handled:true,hits:[],externalHits:0};
    if(key){seenImpacts.add(key);if(seenImpacts.size>256)seenImpacts.delete(seenImpacts.values().next().value);}
    const hits=[],source=event.source??'player',encounterId=event.encounterId??combat.state.encounterId;
    // Authored enemies (including Killian) belong to their quest's death rules. A companion
    // killed in an ordinary encounter keeps that encounter's permanent-death rules too.
    for(const hit of event.hits??[]){
      const id=hit.npcId??hit.id;if(!npcFor(id)||event.bout||hit.kind==='dummy')continue;
      if(hit.team==='enemy'&&encounterId!==LAW_ENCOUNTER_ID)continue;
      const ownArrest=encounterId===LAW_ENCOUNTER_ID&&hit.team==='enemy';
      const result=recordCombatHit({id,hp:hit.hp,maxHp:hit.maxHp,source,
        selfDefense:source!=='player',permanent:!ownArrest&&!hit.spared&&hit.hp<=0,recoverable:!!hit.spared,
        notify:ownArrest,x:hit.x,z:hit.z});
      if(result.ok)hits.push({...result,internal:true});
    }
    const internal=new Set([...(event.combatantIds??[]),...(event.affectedIds??[])]);
    const candidates=people().filter(npc=>available(npc)&&!internal.has(npc.id)&&!isDown(npc.id))
      .map(npc=>({id:npc.id,...location(npc),hp:health(npc).hp}));
    const contacts=event.type==='arrow-impact'?candidates.filter(npc=>npc.id===(event.targetNpcId??event.targetId)):meleeContacts(event,candidates,world);
    let externalHits=0;
    for(const contact of contacts){
      const npc=npcFor(contact.id),armor=Number.isFinite(npc.armor)?Math.max(0,Math.min(.95,npc.armor))
        :isGuard(npc)?npc.id==='instructor'?.3:.2:0;
      const raw=Number(event.damage);if(!(raw>0))continue;
      const result=assault({npcId:npc.id,damage:Math.max(1,Math.round(raw*(1-armor))),source,selfDefense:source!=='player'});
      if(result.ok){hits.push({...result,internal:false});externalHits++;}
    }
    return {handled:true,hits,externalHits};
  }
  function syncFight(){
    for(const id of [...fightIds]){const npc=npcFor(id),enemy=combat.state.enemies?.find(e=>e.id===id);
      if(enemy)recordCombatHit({id,hp:enemy.hp,maxHp:enemy.maxHp,source:'world',selfDefense:true});
      if(npc&&health(npc).status==='alive'){if(enemy){const at=location(npc);at.x=enemy.x;at.z=enemy.z;at.y=world.heightAt(at.x,at.z);}
        npc.hidden=false;npc.actor.group.visible=true;}
      fightIds.delete(id);
    }
  }
  function combatEvent(event){if(combat.state.encounterId!==LAW_ENCOUNTER_ID)return false;
    if(event.type==='hit'&&fightIds.has(event.targetId)){const enemy=combat.state.enemies?.find(e=>e.id===event.targetId);
      const source=event.source??(event.by&&event.by!=='traveler'?'enemy':'player');
      if(enemy)recordCombatHit({id:enemy.id,hp:enemy.hp,maxHp:enemy.maxHp,source,selfDefense:source!=='player'});}
    if(['victory','retreat','defeat'].includes(event.type)){
      syncFight();crime.leaveFight();release();nextOffer=crime.state().time+10;
      if(event.type==='defeat')jail();else{changed();toast('Your bounty remains. The next patrol can still arrest you.','WANTED');}
    }return true;
  }
  function frame(dt,{playing=true}={}){
    if(playing){process(crime.tick(dt));saveClock+=dt;if(saveClock>=10&&Object.keys(crime.state().people).length){saveClock=0;changed();}}
    for(const [id,person] of Object.entries(crime.state().people))if(person.status!=='alive'){
      const npc=npcFor(id);if(npc){npc.crimeDown=true;npc.hidden=true;npc.actor.group.visible=false;}}
    if(!playing||combat.state.phase==='active')return;
    if(!crime.view().wanted){release();return;}
    const guards=availableGuards();if(!guards.length){release();return;}
    const p=position(),lead=guards.find(n=>n.id===leadId)??guards[0];leadId=lead.id;
    const bodies=[{id:'traveler',x:p.x,z:p.z,r:BODY.traveler},...people().filter(n=>!n.hidden&&location(n)).map(n=>({id:n.id,x:location(n).x,z:location(n).z,r:BODY.person}))];
    guards.slice(0,3).forEach((npc,index)=>{const from=location(npc),d=gap(from,p),reach=2.2+index*.6;
      const target=d>reach?{x:p.x+(from.x-p.x)/(d||1)*reach,z:p.z+(from.z-p.z)/(d||1)*reach}:from;
      setControlled(npc,target);
      if(!navigators.has(npc.id))navigators.set(npc.id,bodyWorld(world).moving(from,BODY.person,npc.id));
      const nav=navigators.get(npc.id);nav.setBodies(bodies);const before={x:from.x,z:from.z};
      const moved=stepToward(from,target,3.2*Math.min(.1,Math.max(0,dt)),nav,BODY.person);
      from.y=world.heightAt(from.x,from.z);npc.crimeMoving=moved>.001;
      if(npc.actor.group.rotation)npc.actor.group.rotation.y=moved>.001?Math.atan2(from.x-before.x,from.z-before.z):Math.atan2(p.x-from.x,p.z-from.z);
    });
    for(const id of [...controlled.keys()])if(!guards.slice(0,3).some(n=>n.id===id))restoreControl(id);
    if(crime.state().time>=nextOffer&&safeToInterrupt()&&nearbyGuard(lead))say(lead);
  }
  function restore(value){const prior=crime.state();if(!crime.restore(value))return false;
    for(const id of new Set([...fightIds,...Object.keys(prior.people).filter(id=>prior.people[id].status!=='alive')])){
      const npc=npcFor(id);if(npc&&health(id).status==='alive'&&canRevive(npc)){npc.crimeDown=false;npc.hidden=false;npc.actor.group.visible=true;
        if(prior.people[id]?.status!=='alive')onRevive({id,npc});}}
    release();fightIds.clear();seenImpacts.clear();nextOffer=0;
    for(const [id,person] of Object.entries(crime.state().people))if(person.status!=='alive'){
      if(!person.cleaned)death(id,person,'restore');else{const npc=npcFor(id);if(npc){npc.crimeDown=true;npc.hidden=true;npc.actor.group.visible=false;}}}
    return true;
  }
  return {assault,health,frame,combatEvent,recordCombatHit,handleImpact,person:npcFor,people,extraPeople,
    healthFraction(id){const person=health(id);return person?person.hp/person.maxHp:1;},
    converse(npc){return crime.view().wanted&&isGuard(npc)?say(npc):false;},
    state:crime.state,snapshot:crime.snapshot,view:crime.view,restore,
    owns:id=>controlled.has(id)||fightIds.has(id),controlsNpc:id=>controlled.has(id)||fightIds.has(id),isDown,
    get leadId(){return leadId;},get offeredId(){return offeredId;},
  };
}
