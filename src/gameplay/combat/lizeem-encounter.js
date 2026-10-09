// Small, independent encounter model. No campaign mutation or legacy skill rules.
// The host reports one bounded outcome; strategic consequences belong to the
// campaign. Optional waypoints turn the guards into an interception objective.
import {createAlliedAssault} from './allied-assault.js';
import {ENCOUNTER_BALANCE as B} from './encounter-balance.js';
import {aliveTarget,FOCUS_RANGE} from './combat-focus.js';
import {encounterAttack,ENCOUNTER_ATTACKS} from './encounter-attacks.js';
import {moveEncounterBody,encounterSteering,escortScreen} from './encounter-space.js';
import {selectEncounterTarget,encounterClearStrike,encounterFacing as facing,ENCOUNTER_REACH} from './encounter-target.js';
export const ENCOUNTER_TIMING=Object.freeze({swing:.35,contact:.15,attackCooldown:.55,buffer:.16,hurt:.28,dodge:.3,dodgeCooldown:.9,victory:2.25});
export const isEncounterGuarding=g=>g.hp>0&&!g.escaped&&g.role!=='runner'&&!g.open&&g.phase!=='stagger';
export function createLizeemEncounter({heroStart={x:0,z:5},guardStarts=[{x:-3,z:-3},{x:3,z:-3},{x:0,z:-5}],move=null,canHit=()=>true,reinforcementRoute=null,rallyPoint=null,attackPattern=['thrust','sweep'],allyStarts=null,retreatRoute=null}={}){
  if(reinforcementRoute&&rallyPoint)throw Error('Choose one encounter objective.');
  if(!attackPattern.length||attackPattern.some(name=>!ENCOUNTER_ATTACKS[name]))throw Error('Choose a known encounter attack pattern.');
  if(allyStarts&&(!rallyPoint||reinforcementRoute||allyStarts.length>3))throw Error('Allies require a bounded rally assault.');
  const T=ENCOUNTER_TIMING;
  const state={time:0,outcome:null,hero:{...heroStart,hp:100,heading:Math.PI,cooldown:0,swing:0,swingTargetId:null,targetId:null,focusId:null,dodge:0,dodgeCooldown:0,dodgeStartedAt:null,dodgeObstruction:null,lastDodge:null,hurt:0,hitGrace:0,lastStrike:null,lastDefense:null},
    guards:guardStarts.map(({x,z,role},i)=>({id:i,x,z,hp:50,role:reinforcementRoute?(role??(i===guardStarts.length-1?'runner':'escort')):'soldier',phase:'approach',timer:i*.3,heading:Math.atan2(heroStart.x-x,heroStart.z-z),waypoint:0,escaped:false,hurt:0,block:0,open:false,evadedAt:null,dodged:false,attack:attackPattern[i%attackPattern.length],attacks:0,contactResolved:false,hitThisAttack:false,speed:0})),
    skill:{blocks:0,dodges:0,counters:0,dodgeCounters:0,counterTypes:{thrust:0,sweep:0}},
    objective:rallyPoint?{type:'rally',rally:{...rallyPoint},secured:0,required:T.victory,reason:null}:reinforcementRoute?{type:'intercept',rally:{...reinforcementRoute.at(-1)},reason:null}:null};
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),clamp=n=>Math.max(-7,Math.min(7,n));
  let attackBuffer=0,contactPending=false,dodgeHeld=false,dodgeDirection={x:0,z:0},nextEnemyAttackAt=0;
  const bodies=()=>[state.hero,...state.guards,...(state.allies??[])];
  const strikeClear=(a,b)=>canHit(a,b)&&encounterClearStrike(a,b,(state.allies??[]).filter(t=>t!==a),()=>true);
  function advance(actor,dx,dz,hero=false){
    const terrainMove=(a,x,z)=>move?move(a,x,z):{x:hero?clamp(a.x+x):a.x+x,z:hero?clamp(a.z+z):a.z+z};
    const next=moveEncounterBody(actor,dx,dz,bodies(),terrainMove);actor.x=next.x;actor.z=next.z;return next.obstruction;
  }
  function walk(g,target,dt,speed=2.1){
    const direction=encounterSteering(g,target,bodies()),stride=Math.min(distance(g,target),speed*dt),before={x:g.x,z:g.z};
    g.heading=Math.atan2(direction.x,direction.z);advance(g,direction.x*stride,direction.z*stride);g.speed=distance(g,before)/dt;
  }
  const squad=allyStarts?createAlliedAssault(state,{starts:allyStarts,walk,retreatRoute,canHit:(a,b)=>encounterClearStrike(a,b,bodies().filter(t=>t!==a),canHit)}):null;
  function tick(dt,input={}){
    if(!Number.isFinite(dt)||dt<=0||dt>.1)throw Error('Encounter steps must be between 0 and 0.1 seconds.');
    if(state.outcome)return snapshot();
    const h=state.hero;state.time+=dt;
    const focused=state.guards.find(g=>g.id===input.focusId&&aliveTarget(g)&&distance(h,g)<=FOCUS_RANGE);h.focusId=focused?.id??null;
    for(const key of ['cooldown','swing','dodge','dodgeCooldown','hurt','hitGrace'])h[key]=Math.max(0,h[key]-dt);
    attackBuffer=Math.max(0,attackBuffer-dt);
    for(const g of state.guards){g.hurt=Math.max(0,g.hurt-dt);g.block=Math.max(0,g.block-dt);}
    const x=Number.isFinite(input.x)?Math.max(-1,Math.min(1,input.x)):0,z=Number.isFinite(input.z)?Math.max(-1,Math.min(1,input.z)):0,len=Math.hypot(x,z);
    if(input.dodge&&!dodgeHeld&&h.dodgeCooldown>0)h.lastDodge={at:state.time,kind:'cooldown',readyIn:h.dodgeCooldown};
    if(input.dodge&&dodgeHeld&&h.dodgeCooldown===0&&h.lastDodge?.kind!=='release')h.lastDodge={at:state.time,kind:'release'};
    if(input.dodge&&!dodgeHeld&&h.dodgeCooldown===0){
      h.dodge=T.dodge;h.dodgeCooldown=T.dodgeCooldown;h.swing=0;contactPending=false;attackBuffer=0;
      h.dodgeStartedAt=state.time;h.dodgeObstruction=null;h.lastDodge={at:state.time,kind:'started'};
      dodgeDirection=len?{x:x/len,z:z/len}:{x:-Math.sin(h.heading),z:-Math.cos(h.heading)};
      for(const g of state.guards){const a=encounterAttack(g);if(g.hp>0&&['windup','strike'].includes(g.phase)&&distance(g,h)<=a.reach&&facing(g,h,a.halfAngle)&&canHit(g,h))g.evadedAt=state.time;}
    }
    dodgeHeld=!!input.dodge;
    if(h.dodge>0){
      const obstruction=advance(h,dodgeDirection.x*9*dt,dodgeDirection.z*9*dt,true);
      if(obstruction&&!h.dodgeObstruction){h.dodgeObstruction=obstruction;h.lastDodge={at:state.time,kind:obstruction.kind+'-blocked'};}
    }
    else if(len){const speed=h.swing>0?2.8:4;advance(h,x/Math.max(1,len)*speed*dt,z/Math.max(1,len)*speed*dt,true);if(!h.swing&&!focused)h.heading=Math.atan2(x,z);}
    if(focused&&!h.swing&&!h.dodge)h.heading=Math.atan2(focused.x-h.x,focused.z-h.z);
    if(input.attack&&h.dodge===0&&h.cooldown<=T.buffer)attackBuffer=T.buffer;
    if(attackBuffer>0&&h.cooldown===0&&h.dodge===0){
      attackBuffer=0;h.cooldown=T.attackCooldown;h.swing=T.swing;contactPending=true;
      // Movement or optional focus supplies facing. Keep the chosen strike and
      // heading committed through contact, even if focus changes mid-swing.
      h.swingTargetId=selectEncounterTarget(h,state.guards,strikeClear,h.focusId)?.id??null;
    }
    if(contactPending&&h.swing<=T.swing-T.contact){
      contactPending=false;
      const nearby=state.guards.filter(g=>g.hp>0&&!g.escaped&&distance(g,h)<=ENCOUNTER_REACH);
      const arc=nearby.filter(g=>facing(h,g,Math.PI/3));
      const target=state.guards.find(g=>g.id===h.swingTargetId),nearest=target&&arc.includes(target)&&encounterClearStrike(h,target,state.guards,strikeClear)?target:null;
      const miss=target?(!target.hp||target.escaped?'target-gone':distance(h,target)>ENCOUNTER_REACH?'out-of-range':!facing(h,target)?'off-angle':'blocked'):
        arc.some(g=>!encounterClearStrike(h,g,state.guards,strikeClear))?'blocked':arc.length?'no-target':nearby.length?'off-angle':'out-of-range';
      h.lastStrike={at:state.time,kind:nearest?'hit':miss,target:h.swingTargetId};
      if(nearest){
        if(isEncounterGuarding(nearest)&&facing(nearest,h,Math.PI*.55)){
          nearest.block=T.hurt;h.lastStrike.kind='guarded';state.skill.blocks++;
        }else{
          const counter=nearest.open;
          if(counter){h.lastStrike.kind='counter';state.skill.counters++;if(nearest.dodged){state.skill.dodgeCounters++;state.skill.counterTypes[nearest.attack]++;}}
          if(squad)state.squad.damageByHero+=Math.min(25,nearest.hp);
          nearest.hp=Math.max(0,nearest.hp-25);nearest.hurt=T.hurt;
          squad?.heroHit(nearest);
          // A flank hit hurts, but cannot cancel an already committed attack.
          // Only a counter after a miss interrupts and consumes the opening.
          if(!nearest.hp){nearest.phase='down';nearest.open=false;}
          else if(counter||!['windup','strike'].includes(nearest.phase)){
            nearest.phase='stagger';nearest.timer=T.hurt;nearest.open=false;
          }
        }
      }
    }
    for(const g of state.guards){
      g.speed=0;if(g.hp===0||g.escaped)continue;const victim=squad?squad.enemyTarget(g):h;if(!victim)continue;const d=distance(g,victim),attack=encounterAttack(g);
      if(g.phase==='turn'){squad.turn(g,victim,dt);continue;}
      const screen=escortScreen(g,h,state.guards);
      if(reinforcementRoute&&(g.role==='runner'||d>5&&!screen)&&['approach','march'].includes(g.phase)){
        g.phase='march';let target=reinforcementRoute[g.waypoint];
        if(distance(g,target)<=1.2){g.waypoint++;target=reinforcementRoute[g.waypoint];}
        if(!target){g.escaped=true;g.phase='escaped';continue;}
        walk(g,target,dt,g.role==='runner'?2.3:2.1);continue;
      }
      if(g.phase==='march')g.phase='approach';
      if(g.phase==='approach'){
        g.heading=Math.atan2(victim.x-g.x,victim.z-g.z);
        if(d>1.91){
          const target=screen&&d>2.8?screen:{x:victim.x+(g.x-victim.x)/d*1.9,z:victim.z+(g.z-victim.z)/d*1.9};
          if(distance(g,target)>.001)walk(g,target,dt);
        }
        else if(victim!==h||state.time>=nextEnemyAttackAt){
          g.attack=attackPattern[(g.attacks+g.id)%attackPattern.length];g.attacks++;const chosen=encounterAttack(g);
          g.phase='windup';g.timer=chosen.windup;g.evadedAt=null;g.dodged=false;g.open=false;g.contactResolved=false;g.hitThisAttack=false;
          // Stagger the squad's commitments so warnings and counter windows can
          // be read. Other soldiers still approach, guard and threaten space.
          if(victim===h)nextEnemyAttackAt=state.time+chosen.windup+chosen.strike+B.commitmentGap;
        }
      }else{
        const before=g.timer;
        g.timer-=dt;
        if(g.phase==='strike'&&!g.contactResolved){
          const since=attack.strike-g.timer,previous=attack.strike-before,end=attack.contact+attack.active;
          // A sweep stays dangerous across its visible arc. Invulnerability can
          // cover part of it, but a sideways dodge must actually clear the blade.
          if(since>=attack.contact&&previous<=end){
            const contact=victim.hp>0&&d<=attack.reach&&facing(g,victim,attack.halfAngle)&&(squad?encounterClearStrike(g,victim,bodies().filter(b=>b!==g),canHit):canHit(g,victim));
            if(victim!==h&&contact&&!g.hitThisAttack)g.hitThisAttack=squad.strike(g,victim);
            if(victim===h&&contact&&h.dodge===0&&!g.hitThisAttack){
              g.hitThisAttack=true;
              // Consume a connecting strike during brief post-hit protection.
              // It cannot hit again when protection ends or earn a false dodge.
              if(h.hitGrace===0){
                const damage=Math.min(h.hp,B.enemyDamage);h.hp=Math.max(0,h.hp-damage);h.hurt=T.hurt;h.hitGrace=B.hitGrace;
                const reason=h.lastDodge?.kind==='cooldown'&&state.time-h.lastDodge.at<.5?'cooldown':
                  h.dodgeObstruction&&state.time-h.dodgeStartedAt<.95?h.dodgeObstruction.kind+'-blocked':
                  g.evadedAt!==null&&state.time-g.evadedAt<.95?(g.attack==='sweep'?'sweep-caught':'dodge-ended'):'no-dodge';
                h.lastDefense={at:state.time,kind:'hit',target:g.id,attack:g.attack,reason,damage};
              }
            }
          }
          if(since>=end){
            g.contactResolved=true;g.open=!g.hitThisAttack;g.dodged=g.open&&g.evadedAt!==null&&state.time-g.evadedAt<=.95;
            if(g.dodged&&victim===h)state.skill.dodges++;
            if(g.open&&victim===h)h.lastDefense={at:state.time,kind:g.dodged?'dodged':'missed',target:g.id,attack:g.attack};
          }
        }
        if(g.timer<=0){
          if(g.phase==='windup'){g.phase='strike';g.timer=attack.strike;}
          else if(g.phase==='strike'){g.phase='recover';g.timer=attack.recovery;}
          else{g.phase='approach';g.open=false;}
        }
      }
    }
    squad?.tick(dt);
    // The fight decides victory. This short beat lets the line break and allies
    // regroup; neither the hero's location nor an ally's path can delay it.
    if(rallyPoint){const o=state.objective;o.secured=state.guards.every(g=>!g.hp||g.routed)?Math.min(o.required,o.secured+dt):0;}
    if(h.hp===0||state.time>=90&&!(rallyPoint&&state.guards.every(g=>!g.hp||g.routed))){state.outcome='defeat';if(state.objective)state.objective.reason=h.hp===0?'driven-back':'time-expired';}
    else if(state.guards.every(g=>!g.hp||g.routed)&&(!rallyPoint||state.objective.secured>=state.objective.required)){state.outcome='success';if(state.objective)state.objective.reason=rallyPoint?'rally-secured':'vanguard-broken';}
    else if(reinforcementRoute&&state.guards.every(g=>!g.hp||g.escaped)){state.outcome='defeat';state.objective.reason='runner-arrived';}
    return snapshot();
  }
  const snapshot=()=>{
    state.hero.targetId=state.outcome?null:state.hero.swing>0?state.hero.swingTargetId:selectEncounterTarget(state.hero,state.guards,strikeClear,state.hero.focusId)?.id??null;
    return JSON.parse(JSON.stringify(state));
  };
  function fireballHit(id,damage){
    if(state.outcome||state.hero.hp<=0||!Number.isFinite(damage)||damage<=0)return false;
    const g=state.guards.find(g=>g.id===id&&g.hp>0&&!g.escaped);if(!g)return false;
    const loss=Math.min(g.hp,damage);if(squad)state.squad.damageByHero+=loss;g.hp=Math.max(0,g.hp-damage);g.hurt=T.hurt;g.phase=g.hp?'stagger':'down';g.timer=T.hurt;g.open=false;
    squad?.heroHit(g);
    state.hero.lastStrike={at:state.time,kind:'fireball',target:id,damage:loss};return true;
  }
  return {tick,snapshot,fireballHit,aftermath:dt=>{if(state.outcome==='success')squad?.aftermath(Math.min(.1,dt));return snapshot();}};
}
