import {encounterAttack} from './encounter-attacks.js';
import {encounterFacing} from './encounter-target.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const alive=a=>a&&a.hp>0&&!a.escaped;
export const ALLIED_ASSAULT=Object.freeze({allies:3,practiceEnemies:4,allyHealth:50,bladeDamage:12,guardedDamage:6,enemyDamage:16,enemyGuardedDamage:8,attention:4,turnWarning:.38,breakPause:.75});

// Bounded local soldiers, not additional campaign armies. The hero's own input,
// attacks, dodge and damage remain in the ordinary encounter model.
export function createAlliedAssault(state,{starts,walk,canHit}){
  const S=ALLIED_ASSAULT;
  state.allies=starts.map((p,i)=>({...p,id:100+i,hp:S.allyHealth,role:'ally',heading:0,phase:'approach',timer:i*.13,attack:'thrust',attacks:0,open:false,hurt:0,block:0,speed:0,targetId:null,contactResolved:false}));
  state.squad={damageByAllies:0,damageByHero:0,alliesLost:0,routed:0,regrouped:false};
  const hero=state.hero;hero.id=-1;
  const bodies=()=>[hero,...state.guards,...state.allies];
  const ready=a=>alive(a)&&!['down','retreat'].includes(a.phase);
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
    // Reserve the hero-facing sector for the player. Stable, briefly held
    // side slots avoid three allies pursuing the same centre or switching lanes.
    const base=Math.atan2(hero.x-target.x,hero.z-target.z),point=angle=>({x:target.x+Math.sin(angle)*1.85,z:target.z+Math.cos(angle)*1.85});
    if(a.slotTarget!==target.id||state.time>=(a.slotUntil??0)){
      const candidates=[-1.15,1.15,-2.25,2.25,Math.PI].map(offset=>{
        const angle=base+offset,p=point(angle);
        const occupied=state.allies.filter(b=>b!==a&&alive(b));
        const score=distance(a,p)+Math.max(0,2.2-distance(hero,p))*7+occupied.reduce((n,b)=>{
          const reserved=b.slotTarget===target.id?point(b.slotAngle):b;
          return n+Math.max(0,1.8-distance(b,p))*5+Math.max(0,1.6-distance(reserved,p))*4;
        },0);
        return {angle,score};
      });
      candidates.sort((a,b)=>a.score-b.score);a.slotAngle=candidates[0].angle;a.slotTarget=target.id;a.slotUntil=state.time+.65;
    }
    return point(a.slotAngle);
  }
  function strike(attacker,target){
    if(!alive(target)||!canHit(attacker,target)||!encounterFacing(attacker,target,Math.PI/4)||distance(attacker,target)>2.7)return false;
    const guarded=target.phase==='approach'||target.phase==='recover'&&!target.open;
    const loss=Math.min(target.hp,attacker.role==='ally'?(guarded?S.guardedDamage:S.bladeDamage):(guarded?S.enemyGuardedDamage:S.enemyDamage));
    target.hp-=loss;target.hurt=.28;if(guarded)target.block=.28;
    if(attacker.role==='ally')state.squad.damageByAllies+=loss;
    if(!target.hp){target.phase='down';target.open=false;}
    checkBreak();
    return true;
  }
  function tick(dt){
    for(const a of state.allies){
      a.speed=0;a.hurt=Math.max(0,a.hurt-dt);a.block=Math.max(0,a.block-dt);if(!alive(a))continue;
      const attack=encounterAttack(a);
      if(a.phase==='approach'){
        const target=choose(a,state.guards,state.allies);a.targetId=target?.id??null;if(!target)continue;
        const slot=approachPoint(a,target);a.timer=Math.max(0,a.timer-dt);
        if(distance(a,slot)>.45){walk(a,slot,dt,2.6);}
        else{
          a.heading=Math.atan2(target.x-a.x,target.z-a.z);
          if(!a.timer&&distance(a,target)<2.3&&canHit(a,target)){a.phase='windup';a.timer=attack.windup;a.contactResolved=false;a.open=false;}
        }
      }else{
        a.timer-=dt;
        if(a.phase==='strike'&&!a.contactResolved&&attack.strike-a.timer>=attack.contact){
          a.contactResolved=true;const target=state.guards.find(g=>g.id===a.targetId);
          a.open=!strike(a,target);
        }
        if(a.timer<=0){if(a.phase==='windup'){a.phase='strike';a.timer=attack.strike;}
          else if(a.phase==='strike'){a.phase='recover';a.timer=attack.recovery;}
          else{a.phase='approach';a.open=false;a.timer=.2;}}
      }
    }
    state.squad.alliesLost=state.allies.filter(a=>!a.hp).length;
    checkBreak();retreat(dt);
  }
  function checkBreak(){
    const standing=state.guards.filter(alive);
    // The final isolated survivor breaks; routing is recorded separately from
    // deaths and never removes that soldier from campaign strength as a kill.
    if(hero.hp>0&&standing.length===1&&state.guards.length>=3&&state.guards.filter(g=>!g.hp).length>=state.guards.length-1){
      const g=standing[0];g.routed=true;g.escaped=true;g.phase='breaking';g.timer=S.breakPause;g.brokeAt=state.time;g.open=false;g.speed=0;state.squad.routed++;
      const dx=g.x-hero.x,dz=g.z-hero.z,d=Math.hypot(dx,dz)||1;g.retreat={x:g.x+dx/d*12,z:g.z+dz/d*12};
    }
  }
  function retreat(dt){for(const g of state.guards.filter(g=>g.routed)){
    if(g.phase==='breaking'){g.timer=Math.max(0,g.timer-dt);g.speed=0;if(!g.timer)g.phase='retreat';}
    else walk(g,g.retreat,dt,3.2);
  }}
  function aftermath(dt){
    retreat(dt);
    state.allies.forEach((a,i)=>{if(!a.hp)return;const p=state.objective.rally;
      const target={x:p.x+(i-1)*2.2,z:p.z+3};a.phase='approach';a.open=false;a.hurt=Math.max(0,a.hurt-dt);
      if(distance(a,target)>.3)walk(a,target,dt,1.8);else a.speed=0;
    });state.squad.regrouped=true;
  }
  return {enemyTarget,heroHit,turn,strike,tick,aftermath,bodies};
}
