import { CAGNEY, CAGNEY_START, CAGNEY_HOME, CAGNEY_QUEST, CAGNEY_HEALTH, CAGNEY_WAVES, ALL_CAGNAPPERS, CAGNEY_ROUTE, cagneyGuideTarget, cagneyWave } from './cagney-quest.js';
import { BODY, bodyWorld, stepToward } from '../../../gameplay/combat/bodies.js';
import { countryHealth } from '../../../gameplay/combat/combat-skills.js';
import { regionLevel } from '../../../world/terrain/region-levels.js';

/**
 * Scene integration; the quest owns outcomes, the normal NPC navigator owns her feet.
 *
 * Three gangs wait on her road (src/content/quests/cagney/cagney-quest.js), and only the next one matters at a time: its
 * three men crouch in their cover until she comes by with the traveler, then break for **her** -
 * they came for Cagney, not for whoever is walking with her (`prey`, src/gameplay/combat/combat.js). She fights
 * back, and without the traveler she loses, and a cagnapper's blade is not a capture.
 */
export function createCagneyHost({ quest, npc, world, combat, player, crime, corpses, toast, refresh, save,
  openDialogue, closeDialogue, reward, focus, makeAmbusher, atHome = () => null }) {
  let cooling = 0, regrouping = false, retryPending = false;
  const ambushers=new Map(), stands=new Map(ALL_CAGNAPPERS.map(e=>[e.id,{x:e.x,z:e.z}]));
  const returnWorld=bodyWorld(world), walking=new Map();
  const waveOf=id=>CAGNEY_WAVES.find(wave=>wave.enemies.some(e=>e.id===id))??null;
  const current=()=>quest.state.currentWave;
  const waitingPoint=wave=>({x:wave.center.x-wave.forward.dx*9,z:wave.center.z-wave.forward.dz*9});
  const actor=id=>{if(!ALL_CAGNAPPERS.some(e=>e.id===id)||!makeAmbusher)return null;
    if(!ambushers.has(id))ambushers.set(id,makeAmbusher(ALL_CAGNAPPERS.find(e=>e.id===id)));
    const person=ambushers.get(id);if(person.ambushCover)person.ambushCover.visible=false;person.setArmed?.(true);return person;};
  const release=id=>ambushers.delete(id);
  function update(time){
    const s=quest.state, wave=current(), fighting=!!cagneyWave(combat.state.encounterId)&&combat.state.phase==='active';
    for(const gang of CAGNEY_WAVES)for(const [i,foe]of gang.enemies.entries()){
      if(fighting&&gang.id===combat.state.encounterId){const person=ambushers.get(foe.id);if(person?.ambushCover)person.ambushCover.visible=false;person?.setArmed?.(true);continue;}
      // A beaten gang is gone from the road; the gang being fought hides those already down.
      const beaten=!wave||gang.index<wave.index||(gang===wave&&s.enemies[i]<=0);
      if(beaten){const old=ambushers.get(foe.id);if(old)old.group.visible=false;continue;}
      const p=stands.get(foe.id),near=Math.hypot(player.group.position.x-p.x,player.group.position.z-p.z)<150;
      if(!near&&!ambushers.has(foe.id))continue;
      const person=actor(foe.id);if(!person)continue;
      person.group.visible=near;person.group.position.set(p.x,world.heightAt(p.x,p.z),p.z);
      const moving=walking.get(foe.id);
      person.group.rotation.y=moving?.yaw??Math.atan2(gang.center.x-p.x,gang.center.z-p.z);
      if(person.ambushCover)person.ambushCover.visible=true;person.setArmed?.(false);
      if(near)person.animate(time+i,moving?.speed??0,true,{action:'idle',armed:false,sneaking:!moving});
    }
  }
  // Saves keep each attacker's health on the authored 48-point scale. Combat
  // still uses the country's level for full health and damage; convert both ways so
  // a fresh ambush does not look injured and real wounds survive a retry.
  const savedHealth=(foe,index,fallback,gang)=>foe?Math.max(0,Math.min(gang.enemies[index].hp,
    foe.maxHp>0?foe.hp/foe.maxHp*gang.enemies[index].hp:foe.hp)):fallback;
  const at = () => npc.combatPosition ?? npc.actor.group.position;
  const changed = () => { refresh(); save(); };
  function restore() {
    const s = quest.state, p = s.walk;
    for(const e of ALL_CAGNAPPERS)stands.set(e.id,{x:e.x,z:e.z});
    Object.assign(npc, { hidden: ['captured','dead'].includes(s.stage), escorting: false, walkingWith: false, combatPosition: null, pace: undefined });
    npc.actor.group.position.set(p.x, world.heightAt(p.x,p.z), p.z);
    world.npcPositions[CAGNEY.id] = { x:p.x,z:p.z }; cooling = 2;
    const wave=current();
    regrouping=false;retryPending=!!wave&&p.waypoint>=wave.waypoint;walking.clear();
  }
  function remember() {
    const p=at(), walk=quest.state.walk, gang=cagneyWave(combat.state.encounterId);
    quest.rememberWalk({ ...walk, x:p.x, z:p.z });
    if(quest.state.stage==='ambushed'&&gang&&combat.state.phase==='active'){
      const ally=combat.state.allies.find(one=>one.id===CAGNEY.id);
      if(ally?.hp>0)quest.rememberBattle({hp:ally.hp,enemies:gang.enemies.map((one,i)=>savedHealth(combat.state.enemies.find(e=>e.id===one.id),i,quest.state.enemies[i],gang))});
    }
  }
  function frame(dt, playing) {
    if (!playing) return;
    cooling=Math.max(0,cooling-dt);
    walking.clear();
    const wave=current();
    // A chase can carry survivors beyond the authored combat spawn bounds.
    // Walk those same bodies back before rebuilding an encounter; replaying
    // their farthest chase positions would make startEncounter refuse forever.
    if(regrouping&&wave&&!(combat.state.encounterId===wave.id&&combat.state.phase==='active')){
      const s=quest.state,people=wave.enemies.filter((e,i)=>s.enemies[i]>0).map(e=>({id:e.id,...stands.get(e.id),r:BODY.person}));
      returnWorld.setBodies([...people,{id:CAGNEY.id,...at(),r:BODY.person},{id:'traveler',...player.group.position,r:BODY.traveler}]);
      const step=Math.min(.25,Math.max(0,dt));
      for(const [i,foe]of wave.enemies.entries()){
        if(s.enemies[i]<=0)continue;
        const p=stands.get(foe.id),before={...p};
        stepToward(p,foe,2.8*step,returnWorld.moving(p,BODY.person,foe.id));
        const moved=Math.hypot(p.x-before.x,p.z-before.z);
        if(moved>0)walking.set(foe.id,{speed:moved/Math.max(step,.001),yaw:Math.atan2(p.x-before.x,p.z-before.z)});
      }
      regrouping=wave.enemies.some((e,i)=>s.enemies[i]>0&&Math.hypot(stands.get(e.id).x-e.x,stands.get(e.id).z-e.z)>.1);
    }
    if (quest.state.over) {if(['captured','dead'].includes(quest.state.stage))npc.hidden=true;return;}
    if (crime.isDown(CAGNEY.id) || corpses.ownsNpc(CAGNEY.id)) {
      if (quest.died()) { npc.hidden=true; changed(); } return;
    }
    const s=quest.state;
    if (s.stage!=='escorting' || combat.state.phase==='active') return;
    const p=at(), guide=cagneyGuideTarget(p,player.group.position,s.walk);
    // Hold short of the next gang until its fight can start. This also repairs a saved escort that
    // had already run past its trigger: she is walked back to meet them.
    if(wave&&(retryPending||guide.progress.waypoint>=wave.waypoint)){
      guide.target=guide.progress.waiting?p:waitingPoint(wave);guide.arrived=false;
    }
    quest.rememberWalk(guide.progress);
    world.npcPositions[CAGNEY.id]={...guide.target};npc.pace=guide.pace;npc.walkingWith=true;npc.escorting=true;
    if (guide.arrived && quest.arrive(p)) {
      npc.walkingWith=npc.escorting=false;npc.pace=undefined;world.npcPositions[CAGNEY.id]={...CAGNEY_HOME};
      toast('Cagney is safely home. Speak with her for your reward.',CAGNEY_QUEST.title.toUpperCase());changed();return;
    }
    if (wave && !cooling && !regrouping
      && Math.hypot(p.x-wave.center.x,p.z-wave.center.z)<12
      && Math.hypot(player.group.position.x-p.x,player.group.position.z-p.z)<11) {
      const level=regionLevel(world.regionAt?.(wave.center.x,wave.center.z)?.name)??0;
      const enemies=wave.enemies.map((e,i)=>({...e,...stands.get(e.id),prey:CAGNEY.id,
        currentHp:s.enemies[i]/e.hp*Math.round(e.hp*countryHealth(level))})).filter(e=>e.currentHp>0);
      // She fights back - a villager with something in her hand - and nobody takes her alive.
      const spec={...wave,level,enemies,allies:[{ id:CAGNEY.id,name:CAGNEY.name,kind:'villager',x:p.x,z:p.z,
        hp:CAGNEY_HEALTH,currentHp:s.hp,armed:true,
        model:{role:CAGNEY.modelRole,tunic:CAGNEY.color,look:{...CAGNEY.look}} }]};
      delete spec.forward; delete spec.index; delete spec.waypoint;
      if (combat.startEncounter(spec)) {
        retryPending=false;quest.begin();world.npcPositions[CAGNEY.id]={x:p.x,z:p.z};
        const gangs=CAGNEY_WAVES.length;
        toast(`Three cagnappers break from the roadside cover and make for Cagney${wave.index?` - the ${['first','second','third'][wave.index]} gang of ${gangs}`:''}. She will fight, but she cannot beat them alone.`,CAGNEY_QUEST.title.toUpperCase());changed();
      }
    }
  }
  function combatEvent(event) {
    const gang=cagneyWave(combat.state.encounterId);
    if (!gang) return;
    const terminal=['victory','defeat','retreat'].includes(event.type);
    if(event.type==='enemy-defeated'||terminal){
      const foes=event.enemies??combat.state.enemies,prior=quest.state;
      if(prior.currentWave?.id===gang.id||['captured','dead'].includes(prior.stage))
        quest.rememberEnemies(gang.enemies.map((one,i)=>savedHealth(foes.find(e=>e.id===one.id),i,prior.enemies[i],gang)));
      for(const foe of foes)if(stands.has(foe.id))stands.set(foe.id,{x:foe.x,z:foe.z});
      if(quest.state.stage!=='ambushed'){if(terminal)changed();return;}
    }
    if(quest.state.stage!=='ambushed')return;
    const loss=['ally-down','ally-wounded'].includes(event.type)&&event.id===CAGNEY.id;
    if (!loss&&!terminal) return;
    const allies=event.allies??combat.state.allies, foes=event.enemies??combat.state.enemies;
    const ally=allies.find(a=>a.id===CAGNEY.id), prior=quest.state;
    const enemies=gang.enemies.map((enemy,i)=>savedHealth(foes.find(e=>e.id===enemy.id),i,prior.enemies[i],gang));
    for(const foe of foes)if(stands.has(foe.id))stands.set(foe.id,{x:foe.x,z:foe.z});
    if(ally){quest.rememberWalk({...prior.walk,x:ally.x,z:ally.z});world.npcPositions[CAGNEY.id]={x:ally.x,z:ally.z};}
    const before=prior.wave;
    quest.settle({hp:ally?.hp??prior.hp,enemies,dead:ally?.hp<=0&&!ally?.wounded});
    npc.escorting=npc.walkingWith=false;cooling=4;
    const next=current();
    retryPending=!!next&&next.id===gang.id;
    regrouping=!!next&&next.id===gang.id&&gang.enemies.some((e,i)=>quest.state.enemies[i]>0&&Math.hypot(stands.get(e.id).x-e.x,stands.get(e.id).z-e.z)>.1);
    if(quest.state.over){npc.hidden=true;toast(quest.state.stage==='captured'?'The cagnappers have overcome Cagney. You could not get her home safely.':'The cagnappers killed Cagney. Her journey home is over.','CAGNEY');}
    else if(quest.state.ambushCleared)toast('The last of the cagnappers are beaten. The road to Ambron is clear; stay with Cagney.','THE ROAD IS CLEAR');
    else if(quest.state.wave>before)toast(`That gang is beaten, and Cagney binds her cuts. ${CAGNEY_WAVES.length-quest.state.wave===1?'One more is':'Two more are'} waiting further down the road. Stay close to her.`,'CAGNEY');
    else toast('The surviving cagnappers still hold the road. Cagney is waiting for you.','CAGNEY');
    changed();
  }
  function conversation(person) {
    if(person.id!==CAGNEY.id)return false;
    const s=quest.state;
    if(s.stage==='unmet')quest.ask();
    const leave={id:'cagney-leave',label:'Another time.',action:closeDialogue};
    if(['unmet','asked'].includes(s.stage))openDialogue(person,[
      'I am Cagney. That seer Caelom told me cagnappers would come for me if I traveled home alone. What the heck is a cagnapper? I do not know, but I would rather not find out alone.',
      'Will you walk home with me to Ambron? I can pay you 45 copper when we arrive.'
    ],null,'Back to the road',{choices:[{id:'cagney-accept',label:'I will walk with you.',action:()=>{closeDialogue();if(quest.accept()){refresh();focus(CAGNEY_QUEST.id);changed();}}},leave]});
    else if(s.stage==='home')openDialogue(person,['My own front door. Thank you for getting me here safely. These 45 copper are yours.'],null,'Back to the road',{
      choices:[{id:'cagney-reward',label:'Accept 45 copper.',action:()=>{const coins=quest.take();if(coins)reward(coins);closeDialogue();changed();}}]});
    // At home on her own step, with Alex beside her (src/content/quests/roadside/alex-host.js): her words are the house's.
    else if(s.stage==='complete'&&atHome()){const home=atHome();openDialogue(person,home.lines,null,'Back to the road',{choices:[...home.choices,leave]});}
    else openDialogue(person,[s.stage==='complete'?'It is good to be home. Thank you again.':s.ambushCleared?'We are clear of them. The road takes us through the Ossen Gate to my house.':'Keep up. I am not stopping for long, and they are out there somewhere.'],null,'Back to the road',{choices:[leave]});
    return true;
  }
  return {frame,remember,restore,combatEvent,conversation,update,actor,release};
}
