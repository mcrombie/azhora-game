import {unitBody,physicalDamage} from './combat-units.js';
import {commanderBody,updateCommanderMorale} from './commander-morale.js';
import {encounterAttack} from './encounter-attacks.js';
import {encounterFacing} from './encounter-target.js';
import {isEncounterGuarding} from './encounter-defense.js';
import {createAssaultArchery} from './assault-archery.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const alive=a=>a&&a.hp>0&&!a.escaped;
export const ALLIED_ASSAULT=Object.freeze({allies:3,practiceEnemies:4,allyHealth:50,bladeDamage:12,guardedDamage:6,enemyDamage:16,enemyGuardedDamage:8,attention:4,turnWarning:.38,breakPause:.75});

// Bounded local soldiers, not additional campaign armies. The hero's own input,
// attacks, dodge and damage remain in the ordinary encounter model.
export function createAlliedAssault(state,{starts,walk,canHit,retreatRoute,reserve=null,canOccupy=null,canTraverse=null,heightAt,arrowHit}){
  const S=ALLIED_ASSAULT;
  state.allies=starts.map((p,i)=>({...p,id:100+i,hp:S.allyHealth,...commanderBody(p.commander),role:'ally',heading:0,phase:'approach',timer:i*.13,attack:'thrust',attacks:0,open:false,hurt:0,block:0,speed:0,targetId:null,contactResolved:false}));
  for(const a of state.allies){a.tempo=state.tempo??'classic';if(a.unitType&&!a.commanderId)Object.assign(a,unitBody(a.unitType,a.weapon));if(a.ranged){a.guarding=false;a.defense={type:'weapon',reduction:.25};}}
  state.squad={damageByAllies:0,damageByHero:0,alliesLost:0,routed:0,regrouped:false};
  const hero=state.hero;hero.id=-1;
  const bodies=()=>[hero,...state.guards,...state.allies];
  const ready=a=>alive(a)&&!['down','retreat'].includes(a.phase);
  const archery=starts.some(a=>a.ranged)?createAssaultArchery(state,{heightAt,arrowHit,walk,checkBreak}):null;
  function choose(actor,candidates,team){
    const available=candidates.filter(ready);
    const score=p=>distance(actor,p)+team.filter(t=>t!==actor&&ready(t)&&t.targetId===p.id).length*2.8-(p.id===actor.targetId?1.2:0);
    return available.sort((a,b)=>score(a)-score(b)||a.id-b.id)[0]??null;
  }
  function enemyTarget(g){
    const current=[hero,...state.allies].find(a=>a.id===g.targetId);
    // Damage creates attention, not a mid-swing aim correction. Recovery and
    // counter windows finish before an enemy chooses a new opponent.
    if(g.phase!=='approach'&&current)return current;
    const attackers=state.guards.filter(t=>t!==g&&ready(t)&&t.targetId===hero.id).length;
    const provoked=hero.hp>0&&g.heroThreatUntil>state.time&&distance(g,hero)<10&&attackers<2;
    const target=provoked?hero:choose(g,[hero,...state.allies],state.guards);
    if(provoked&&g.targetId!==hero.id){g.phase='turn';g.timer=S.turnWarning;g.reactedAt=state.time;g.open=false;}
    g.targetId=target?.id??null;return target;
  }
  function heroHit(g){
    if(g.hp>0)g.heroThreatUntil=state.time+S.attention;
    // One nearby comrade can notice a flank attack too. Otherwise two quick
    // blows kill the victim before its committed swing can finish reacting.
    const witness=state.guards.filter(t=>t!==g&&ready(t)&&distance(t,g)<6&&distance(t,hero)<8&&canHit(t,hero)).sort((a,b)=>distance(a,hero)-distance(b,hero)||a.id-b.id)[0];
    if(witness)witness.heroThreatUntil=state.time+S.attention;
    checkBreak();
  }
  function turn(g,target,dt){
    const wanted=Math.atan2(target.x-g.x,target.z-g.z),delta=Math.atan2(Math.sin(wanted-g.heading),Math.cos(wanted-g.heading));
    g.heading+=Math.max(-6*dt,Math.min(6*dt,delta));g.timer=Math.max(0,g.timer-dt);
    if(!g.timer&&Math.abs(delta)<.06)g.phase='approach';
  }
  function approachPoint(a,target){
    if(reserve)return reserve(a,target,state.allies,bodies(),state.time,{hero});
    // Reserve the hero-facing sector for the player. Stable, briefly held
    // side slots avoid three allies pursuing the same centre or switching lanes.
    const base=Math.atan2(hero.x-target.x,hero.z-target.z),point=angle=>({x:target.x+Math.sin(angle)*(a.engage??1.85),z:target.z+Math.cos(angle)*(a.engage??1.85)});
    if(a.slotTarget!==target.id||state.time>=(a.slotUntil??0)){
      const candidates=[-1.15,1.15,-2.25,2.25,Math.PI].map(offset=>{
        const angle=base+offset,p=point(angle);
        const occupied=state.allies.filter(b=>b!==a&&alive(b));
        const score=distance(a,p)+Math.max(0,2.2-distance(hero,p))*7+occupied.reduce((n,b)=>{
          const reserved=b.slotTarget===target.id?point(b.slotAngle):b;
          return n+Math.max(0,1.8-distance(b,p))*5+Math.max(0,1.6-distance(reserved,p))*4;
        },0);
        const clear=(!canOccupy||canOccupy(p,a.bodyRadius??.45))&&(!canTraverse||canTraverse(a,p,a.bodyRadius??.45));
        return {angle,score,clear};
      }).filter(p=>p.clear);
      if(!candidates.length)return {x:a.x,z:a.z,rank:1};
      candidates.sort((a,b)=>a.score-b.score);a.slotAngle=candidates[0].angle;a.slotTarget=target.id;a.slotUntil=state.time+.65;
    }
    return point(a.slotAngle);
  }
  function strike(attacker,target){
    const move=encounterAttack(attacker);
    if(!alive(target)||!canHit(attacker,target)||!encounterFacing(attacker,target,attacker.combat?move.halfAngle:Math.PI/4)||distance(attacker,target)>(attacker.combat?move.reach:2.7))return false;
    const guarded=(target.combat?isEncounterGuarding(target):(target.phase==='approach'||target.phase==='recover'&&!target.open))&&encounterFacing(target,attacker,Math.PI*.55);
    const loss=Math.min(target.hp,attacker.combat||target.defense?physicalDamage(move.damage??S.enemyDamage,target,{guarded,armorPiercing:move.armorPiercing??0}).damage:(attacker.role==='ally'?(guarded?S.guardedDamage:S.bladeDamage):(guarded?S.enemyGuardedDamage:S.enemyDamage)));
    target.hp-=loss;target.hurt=.28;if(guarded)target.block=.28;
    if(attacker.role==='ally')state.squad.damageByAllies+=loss;
    if(!target.hp){target.phase='down';target.open=false;}
    checkBreak();
    return true;
  }
  function tick(dt){
    // Enemy strikes resolve first. Count a last allied casualty even when the
    // final enemy also fell in this step and the formation starts regrouping.
    state.squad.alliesLost=state.allies.filter(a=>!a.commanderId&&!a.hp).length;
    if(state.guards.every(g=>!alive(g))){retreat(dt);regroup(dt);return;}
    for(const a of state.allies){
      a.speed=0;a.hurt=Math.max(0,a.hurt-dt);a.block=Math.max(0,a.block-dt);if(!alive(a))continue;
      if(a.ranged&&archery.tickActor(a,dt))continue;
      const attack=encounterAttack(a);
      if(a.phase==='approach'){
        const target=choose(a,state.guards,state.allies);a.targetId=target?.id??null;if(!target)continue;
        if(a.defend&&distance(target,a.defend)>a.defend.radius+(a.engage??1.9)){
          if(distance(a,a.defend)>.5)walk(a,a.defend,dt);
          else a.heading=Math.atan2(target.x-a.x,target.z-a.z);
          continue;
        }
        const slot=approachPoint(a,target);a.engagementRank=slot.rank??0;a.timer=Math.max(0,a.timer-dt);
        if(distance(a,slot)>.45){walk(a,slot,dt,a.combat?.moveSpeed??2.6);}
        else{
          a.heading=Math.atan2(target.x-a.x,target.z-a.z);
          if(!slot.rank&&!a.timer&&distance(a,target)<(a.engage??1.9)+.4&&canHit(a,target)){if(a.pattern){a.attack=a.pattern[a.attacks++%a.pattern.length];}a.phase='windup';a.timer=encounterAttack(a).windup;a.contactResolved=false;a.hitThisAttack=false;a.open=false;}
        }
      }else{
        const before=a.timer;a.timer-=dt;
        if(a.phase==='strike'&&!a.contactResolved){
          const since=attack.strike-a.timer,previous=attack.strike-before,end=attack.contact+attack.active;
          if(since>=attack.contact&&previous<=end&&!a.hitThisAttack){
            const target=state.guards.find(g=>g.id===a.targetId);a.hitThisAttack=strike(a,target);
          }
          if(since>=end){a.contactResolved=true;a.open=!a.hitThisAttack;}
        }
        if(a.timer<=0){if(a.phase==='windup'){a.phase='strike';a.timer=attack.strike;}
          else if(a.phase==='strike'){a.phase='recover';a.timer=attack.recovery;}
          else{a.phase='approach';a.open=false;a.timer=a.tempo==='matched'?0:.2;}}
      }
    }
    archery?.tick(dt);
    state.squad.alliesLost=state.allies.filter(a=>!a.commanderId&&!a.hp).length;
    checkBreak();retreat(dt);
  }
  function route(g){
    g.routed=true;g.escaped=true;g.phase='breaking';g.timer=S.breakPause;g.brokeAt=state.time;g.open=false;g.speed=0;
    if(g.role!=='ally'&&!g.commanderId)state.squad.routed++;
    g.retreatElapsed=0;g.retreatStall=0;g.retreatRetries=0;planRetreat(g);
  }
  function checkBreak(){
    updateCommanderMorale(state);
    const standing=state.guards.filter(alive),regulars=standing.filter(g=>!g.commanderId);
    // A commander must actually be fought: isolation alone never wins against a healthy captain.
    const captain=standing.find(g=>g.commanderId);
    if(captain&&captain.canRetreat!==false&&captain.hp<=60&&regulars.length<=1)route(captain);
    if(state.morale?.enemies<=25&&!standing.some(g=>g.commanderId&&!g.routed))for(const g of regulars)route(g);
    else if(hero.hp>0&&standing.length===1&&!standing[0].commanderId&&state.guards.length>=3&&state.guards.filter(g=>!g.hp||g.routed).length>=state.guards.length-1)route(standing[0]);
    const allyCaptain=state.allies.find(a=>a.commanderId&&alive(a));
    if(allyCaptain&&allyCaptain.hp<=40&&!state.allies.some(a=>!a.commanderId&&alive(a)))route(allyCaptain);
    updateCommanderMorale(state);
  }
  function planRetreat(g){
    const heading=Math.atan2(g.x-hero.x,g.z-hero.z);
    g.retreatPath=retreatRoute?retreatRoute(g,hero):[{x:g.x+Math.sin(heading)*24,z:g.z+Math.cos(heading)*24}];
    g.retreatIndex=0;g.retreatStall=0;
  }
  function retreat(dt){for(const g of [...state.guards,...state.allies].filter(g=>g.routed&&!g.departed)){
    if(g.phase==='breaking'){g.timer=Math.max(0,g.timer-dt);g.speed=0;if(!g.timer)g.phase='retreat';}
    else{
      g.retreatElapsed+=dt;const target=g.retreatPath[g.retreatIndex];
      if(target){
        const before={x:g.x,z:g.z};walk(g,target,dt,3.2);
        g.retreatStall=distance(g,before)<dt*.3?g.retreatStall+dt:0;
        if(distance(g,target)<.25)g.retreatIndex++;
        if(g.retreatStall>.6&&g.retreatRetries<2){g.retreatRetries++;planRetreat(g);}
      }
      // Finish evacuation, including on constrained ground or after a dynamic
      // obstruction. A routed soldier must never remain as a frozen opponent.
      if(!target||g.retreatStall>1.5||g.retreatElapsed>30){g.departed=true;g.phase='escaped';g.speed=0;}
    }
  }}
  function regroup(dt){
    state.allies.forEach((a,i)=>{if(!alive(a))return;const p=state.objective.rally;
      const target={x:p.x+(i-1)*2.2,z:p.z+3};a.phase='regroup';a.targetId=null;a.open=false;a.hurt=Math.max(0,a.hurt-dt);
      if(distance(a,target)>.3)walk(a,target,dt,1.8);else a.speed=0;
    });state.squad.regrouped=true;
  }
  function aftermath(dt){retreat(dt);regroup(dt);}
  return {enemyTarget,heroHit,turn,strike,tick,aftermath,bodies,clearProjectiles:()=>archery?.clear()};
}
