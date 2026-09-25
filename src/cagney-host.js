import { CAGNEY, CAGNEY_START, CAGNEY_HOME, CAGNEY_QUEST, CAGNEY_AMBUSH, CAGNAPPERS, CAGNEY_ROUTE, cagneyGuideTarget } from './cagney-quest.js';
import { BODY, bodyWorld, stepToward } from './bodies.js';

/** Scene integration; the quest owns outcomes, the normal NPC navigator owns her feet. */
export function createCagneyHost({ quest, npc, world, combat, player, crime, corpses, toast, refresh, save,
  openDialogue, closeDialogue, reward, focus, makeAmbusher }) {
  let cooling = 0, regrouping = false, retryPending = false;
  const ambushers=new Map(), stands=new Map(CAGNAPPERS.map(e=>[e.id,{x:e.x,z:e.z}]));
  const returnWorld=bodyWorld(world), walking=new Map();
  const ambushWaypoint=CAGNEY_ROUTE.findIndex(p=>p.x<CAGNEY_AMBUSH.center.x);
  const waitingPoint={x:CAGNEY_AMBUSH.center.x+9,z:CAGNEY_AMBUSH.center.z};
  const actor=id=>{if(!CAGNAPPERS.some(e=>e.id===id)||!makeAmbusher)return null;
    if(!ambushers.has(id))ambushers.set(id,makeAmbusher(CAGNAPPERS.find(e=>e.id===id)));return ambushers.get(id);};
  const release=id=>ambushers.delete(id);
  function update(time){
    const s=quest.state, fighting=combat.state.encounterId===CAGNEY_AMBUSH.id&&combat.state.phase==='active';
    for(const [i,foe]of CAGNAPPERS.entries()){
      if(fighting)continue;
      if(s.enemies[i]<=0){const old=ambushers.get(foe.id);if(old)old.group.visible=false;continue;}const person=actor(foe.id);if(!person)continue;
      const p=stands.get(foe.id),near=Math.hypot(player.group.position.x-p.x,player.group.position.z-p.z)<150;
      person.group.visible=near&&!s.ambushCleared;person.group.position.set(p.x,world.heightAt(p.x,p.z),p.z);
      person.group.rotation.y=walking.get(foe.id)?.yaw??Math.PI/2;
      if(near)person.animate(time+i,walking.get(foe.id)?.speed??0,true,{armed:true});
    }
  }
  const at = () => npc.combatPosition ?? npc.actor.group.position;
  const changed = () => { refresh(); save(); };
  function restore() {
    const s = quest.state, p = s.walk;
    for(const e of CAGNAPPERS)stands.set(e.id,{x:e.x,z:e.z});
    Object.assign(npc, { hidden: ['captured','dead'].includes(s.stage), escorting: false, walkingWith: false, combatPosition: null, pace: undefined });
    npc.actor.group.position.set(p.x, world.heightAt(p.x,p.z), p.z);
    world.npcPositions[CAGNEY.id] = { x:p.x,z:p.z }; cooling = 2;
    regrouping=false;retryPending=!s.ambushCleared&&p.waypoint>=ambushWaypoint;walking.clear();
  }
  function remember() {
    const p=at(), walk=quest.state.walk;
    quest.rememberWalk({ ...walk, x:p.x, z:p.z });
    if(quest.state.stage==='ambushed'&&combat.state.encounterId===CAGNEY_AMBUSH.id&&combat.state.phase==='active'){
      const ally=combat.state.allies.find(one=>one.id===CAGNEY.id);
      if(ally?.hp>0)quest.rememberBattle({hp:ally.hp,enemies:CAGNAPPERS.map((one,i)=>combat.state.enemies.find(e=>e.id===one.id)?.hp??quest.state.enemies[i])});
    }
  }
  function frame(dt, playing) {
    if (!playing) return;
    cooling=Math.max(0,cooling-dt);
    walking.clear();
    // A chase can carry survivors beyond the authored combat spawn bounds.
    // Walk those same bodies back before rebuilding an encounter; replaying
    // their farthest chase positions would make startEncounter refuse forever.
    if(regrouping&&!(combat.state.encounterId===CAGNEY_AMBUSH.id&&combat.state.phase==='active')){
      const s=quest.state,people=CAGNAPPERS.filter((e,i)=>s.enemies[i]>0).map(e=>({id:e.id,...stands.get(e.id),r:BODY.person}));
      returnWorld.setBodies([...people,{id:CAGNEY.id,...at(),r:BODY.person},{id:'traveler',...player.group.position,r:BODY.traveler}]);
      const step=Math.min(.25,Math.max(0,dt));
      for(const [i,foe]of CAGNAPPERS.entries()){
        if(s.enemies[i]<=0)continue;
        const p=stands.get(foe.id),before={...p};
        stepToward(p,foe,2.8*step,returnWorld.moving(p,BODY.person,foe.id));
        const moved=Math.hypot(p.x-before.x,p.z-before.z);
        if(moved>0)walking.set(foe.id,{speed:moved/Math.max(step,.001),yaw:Math.atan2(p.x-before.x,p.z-before.z)});
      }
      regrouping=CAGNAPPERS.some((e,i)=>s.enemies[i]>0&&Math.hypot(stands.get(e.id).x-e.x,stands.get(e.id).z-e.z)>.1);
    }
    if (quest.state.over) {if(['captured','dead'].includes(quest.state.stage))npc.hidden=true;return;}
    if (crime.isDown(CAGNEY.id) || corpses.ownsNpc(CAGNEY.id)) {
      if (quest.died()) { npc.hidden=true; changed(); } return;
    }
    const s=quest.state;
    if (s.stage!=='escorting' || combat.state.phase==='active') return;
    const p=at(), guide=cagneyGuideTarget(p,player.group.position,s.walk);
    // Hold at the east approach until the uncleared ambush can restart. This
    // also repairs a saved escort that had already walked past the trigger.
    if(!s.ambushCleared&&(retryPending||guide.progress.waypoint>=ambushWaypoint)){
      guide.target=guide.progress.waiting?p:waitingPoint;guide.arrived=false;
    }
    quest.rememberWalk(guide.progress);
    world.npcPositions[CAGNEY.id]={...guide.target};npc.pace=guide.pace;npc.walkingWith=true;npc.escorting=true;
    if (guide.arrived && quest.arrive(p)) {
      npc.walkingWith=npc.escorting=false;npc.pace=undefined;world.npcPositions[CAGNEY.id]={...CAGNEY_HOME};
      toast('Cagney is safely home. Speak with her for your reward.',CAGNEY_QUEST.title.toUpperCase());changed();return;
    }
    if (!s.ambushCleared && !cooling && !regrouping
      && Math.hypot(p.x-CAGNEY_AMBUSH.center.x,p.z-CAGNEY_AMBUSH.center.z)<12
      && Math.hypot(player.group.position.x-p.x,player.group.position.z-p.z)<11) {
      const enemies=CAGNAPPERS.map((e,i)=>({...e,...stands.get(e.id),currentHp:s.enemies[i]})).filter(e=>e.currentHp>0);
      const spec={...CAGNEY_AMBUSH,enemies,allies:[{ id:CAGNEY.id,name:CAGNEY.name,kind:'bystander',x:p.x,z:p.z,
        hp:85,currentHp:s.hp,armed:false,capturable:true,refuge:{x:CAGNEY_AMBUSH.center.x+18,z:CAGNEY_AMBUSH.center.z},
        model:{role:CAGNEY.modelRole,tunic:CAGNEY.color,look:{...CAGNEY.look}} }]};
      if (combat.startEncounter(spec)) {
        retryPending=false;quest.begin();world.npcPositions[CAGNEY.id]={x:p.x,z:p.z};
        toast('Three cagnappers block the road. Keep them away from Cagney!',CAGNEY_QUEST.title.toUpperCase());changed();
      }
    }
  }
  function combatEvent(event) {
    if (combat.state.encounterId!==CAGNEY_AMBUSH.id) return;
    const terminal=['victory','defeat','retreat'].includes(event.type);
    if(event.type==='enemy-defeated'||terminal){
      const foes=event.enemies??combat.state.enemies,prior=quest.state;
      quest.rememberEnemies(CAGNAPPERS.map((one,i)=>foes.find(e=>e.id===one.id)?.hp??prior.enemies[i]));
      for(const foe of foes)if(stands.has(foe.id))stands.set(foe.id,{x:foe.x,z:foe.z});
      if(quest.state.stage!=='ambushed'){if(terminal)changed();return;}
    }
    if(quest.state.stage!=='ambushed')return;
    const loss=['ally-down','ally-wounded'].includes(event.type)&&event.id===CAGNEY.id;
    if (!loss&&!['victory','defeat','retreat'].includes(event.type)) return;
    const allies=event.allies??combat.state.allies, foes=event.enemies??combat.state.enemies;
    const ally=allies.find(a=>a.id===CAGNEY.id), prior=quest.state;
    const enemies=CAGNAPPERS.map((enemy,i)=>foes.find(e=>e.id===enemy.id)?.hp??prior.enemies[i]);
    for(const foe of foes)if(stands.has(foe.id))stands.set(foe.id,{x:foe.x,z:foe.z});
    if(ally){quest.rememberWalk({...prior.walk,x:ally.x,z:ally.z});world.npcPositions[CAGNEY.id]={x:ally.x,z:ally.z};}
    quest.settle({hp:ally?.hp??prior.hp,enemies,dead:ally?.hp<=0&&!ally?.wounded});
    npc.escorting=npc.walkingWith=false;cooling=4;
    retryPending=!quest.state.ambushCleared;
    regrouping=CAGNAPPERS.some((e,i)=>quest.state.enemies[i]>0&&Math.hypot(stands.get(e.id).x-e.x,stands.get(e.id).z-e.z)>.1);
    if(quest.state.over){npc.hidden=true;toast(quest.state.stage==='captured'?'The cagnappers have overcome Cagney. You could not get her home safely.':'Cagney did not survive. Her journey home is over.','CAGNEY');}
    else if(quest.state.ambushCleared)toast('The cagnappers are defeated. Stay with Cagney on the road to Ambron.','THE ROAD IS CLEAR');
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
    else openDialogue(person,[s.stage==='complete'?'It is good to be home. Thank you again.':s.ambushCleared?'We are clear of them. The road takes us through the Ossen Gate to my house.':'Stay close. I will wait whenever you need to catch up.'],null,'Back to the road',{choices:[leave]});
    return true;
  }
  return {frame,remember,restore,combatEvent,conversation,update,actor,release};
}
