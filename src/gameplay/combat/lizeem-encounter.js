// Small, independent encounter model. No campaign mutation or legacy skill rules.
// The host reports one bounded outcome; strategic consequences belong to the
// campaign. Optional waypoints turn the guards into an interception objective.
import {encounterAttack,ENCOUNTER_ATTACKS} from './encounter-attacks.js';
export const ENCOUNTER_TIMING=Object.freeze({swing:.35,contact:.15,attackCooldown:.55,buffer:.16,hurt:.28,dodge:.3,dodgeCooldown:.9});
export const isEncounterGuarding=g=>g.hp>0&&!g.escaped&&g.role!=='runner'&&!g.open&&g.phase!=='stagger';
export function createLizeemEncounter({heroStart={x:0,z:5},guardStarts=[{x:-3,z:-3},{x:3,z:-3},{x:0,z:-5}],move=null,canHit=()=>true,reinforcementRoute=null,attackPattern=['thrust','sweep']}={}){
  if(!attackPattern.length||attackPattern.some(name=>!ENCOUNTER_ATTACKS[name]))throw Error('Choose a known encounter attack pattern.');
  const T=ENCOUNTER_TIMING;
  const state={time:0,outcome:null,hero:{...heroStart,hp:100,heading:Math.PI,cooldown:0,swing:0,dodge:0,dodgeCooldown:0,hurt:0,lastStrike:null,lastDefense:null},
    guards:guardStarts.map(({x,z,role},i)=>({id:i,x,z,hp:50,role:reinforcementRoute?(role??(i===guardStarts.length-1?'runner':'escort')):'soldier',phase:'approach',timer:i*.3,heading:Math.atan2(heroStart.x-x,heroStart.z-z),waypoint:0,escaped:false,hurt:0,block:0,open:false,evadedAt:null,dodged:false,attack:attackPattern[i%attackPattern.length],attacks:0,contactResolved:false,hitThisAttack:false,speed:0})),
    skill:{blocks:0,dodges:0,counters:0,dodgeCounters:0,counterTypes:{thrust:0,sweep:0}},
    objective:reinforcementRoute?{type:'intercept',rally:{...reinforcementRoute.at(-1)},reason:null}:null};
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),clamp=n=>Math.max(-7,Math.min(7,n));
  let attackBuffer=0,contactPending=false,dodgeHeld=false,dodgeDirection={x:0,z:0},nextEnemyAttackAt=0;
  const facing=(a,b,cone)=>Math.cos(Math.atan2(b.x-a.x,b.z-a.z)-a.heading)>=Math.cos(cone);
  function advance(actor,dx,dz,hero=false){const next=move?move(actor,dx,dz):{x:hero?clamp(actor.x+dx):actor.x+dx,z:hero?clamp(actor.z+dz):actor.z+dz};actor.x=next.x;actor.z=next.z;}
  function tick(dt,input={}){
    if(!Number.isFinite(dt)||dt<=0||dt>.1)throw Error('Encounter steps must be between 0 and 0.1 seconds.');
    if(state.outcome)return snapshot();
    const h=state.hero;state.time+=dt;
    for(const key of ['cooldown','swing','dodge','dodgeCooldown','hurt'])h[key]=Math.max(0,h[key]-dt);
    attackBuffer=Math.max(0,attackBuffer-dt);
    for(const g of state.guards){g.hurt=Math.max(0,g.hurt-dt);g.block=Math.max(0,g.block-dt);}
    const x=Number.isFinite(input.x)?Math.max(-1,Math.min(1,input.x)):0,z=Number.isFinite(input.z)?Math.max(-1,Math.min(1,input.z)):0,len=Math.hypot(x,z);
    if(input.dodge&&!dodgeHeld&&h.dodgeCooldown===0){
      h.dodge=T.dodge;h.dodgeCooldown=T.dodgeCooldown;h.swing=0;contactPending=false;attackBuffer=0;
      dodgeDirection=len?{x:x/len,z:z/len}:{x:-Math.sin(h.heading),z:-Math.cos(h.heading)};
      for(const g of state.guards){const a=encounterAttack(g);if(g.hp>0&&['windup','strike'].includes(g.phase)&&distance(g,h)<=a.reach&&facing(g,h,a.halfAngle)&&canHit(g,h))g.evadedAt=state.time;}
    }
    dodgeHeld=!!input.dodge;
    if(h.dodge>0)advance(h,dodgeDirection.x*9*dt,dodgeDirection.z*9*dt,true);
    else if(len){const speed=h.swing>0?2.8:4;advance(h,x/Math.max(1,len)*speed*dt,z/Math.max(1,len)*speed*dt,true);if(!h.swing)h.heading=Math.atan2(x,z);}
    if(input.attack&&h.dodge===0&&h.cooldown<=T.buffer)attackBuffer=T.buffer;
    if(attackBuffer>0&&h.cooldown===0&&h.dodge===0){
      attackBuffer=0;h.cooldown=T.attackCooldown;h.swing=T.swing;contactPending=true;
      // Assist facing once at the start; the swing then commits to that direction.
      const target=state.guards.filter(g=>g.hp>0&&!g.escaped&&distance(g,h)<=3.2).sort((a,b)=>Number(b.open||b.role==='runner')-Number(a.open||a.role==='runner')||distance(a,h)-distance(b,h)||a.id-b.id)[0];
      if(target)h.heading=Math.atan2(target.x-h.x,target.z-h.z);
    }
    if(contactPending&&h.swing<=T.swing-T.contact){
      contactPending=false;
      const nearby=state.guards.filter(g=>g.hp>0&&!g.escaped&&distance(g,h)<=2.7);
      const arc=nearby.filter(g=>facing(h,g,Math.PI/3));
      const nearest=arc.filter(g=>canHit(h,g)).sort((a,b)=>Number(b.open||b.role==='runner')-Number(a.open||a.role==='runner')||distance(a,h)-distance(b,h)||a.id-b.id)[0];
      h.lastStrike={at:state.time,kind:nearest?'hit':arc.length?'blocked':nearby.length?'off-angle':'out-of-range',target:nearest?.id??null};
      if(nearest){
        if(isEncounterGuarding(nearest)&&facing(nearest,h,Math.PI*.55)){
          nearest.block=T.hurt;h.lastStrike.kind='guarded';state.skill.blocks++;
        }else{
          const counter=nearest.open;
          if(counter){h.lastStrike.kind='counter';state.skill.counters++;if(nearest.dodged){state.skill.dodgeCounters++;state.skill.counterTypes[nearest.attack]++;}}
          nearest.hp=Math.max(0,nearest.hp-25);nearest.hurt=T.hurt;
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
      g.speed=0;if(g.hp===0||g.escaped)continue;const d=distance(g,h),attack=encounterAttack(g);
      if(reinforcementRoute&&(g.role==='runner'||d>5)&&['approach','march'].includes(g.phase)){
        g.phase='march';let target=reinforcementRoute[g.waypoint];
        if(distance(g,target)<=1.2){g.waypoint++;target=reinforcementRoute[g.waypoint];}
        if(!target){g.escaped=true;g.phase='escaped';continue;}
        const length=distance(g,target),stride=Math.min(length,(g.role==='runner'?2.3:2.1)*dt),before={x:g.x,z:g.z};
        g.heading=Math.atan2(target.x-g.x,target.z-g.z);advance(g,(target.x-g.x)/length*stride,(target.z-g.z)/length*stride);g.speed=distance(g,before)/dt;continue;
      }
      if(g.phase==='march')g.phase='approach';
      if(g.phase==='approach'){
        g.heading=Math.atan2(h.x-g.x,h.z-g.z);
        if(d>1.91){const stride=Math.min(d-1.9,2.1*dt),before={x:g.x,z:g.z};advance(g,(h.x-g.x)/d*stride,(h.z-g.z)/d*stride);g.speed=distance(g,before)/dt;}
        else if(state.time>=nextEnemyAttackAt){
          g.attack=attackPattern[(g.attacks+g.id)%attackPattern.length];g.attacks++;const chosen=encounterAttack(g);
          g.phase='windup';g.timer=chosen.windup;g.evadedAt=null;g.dodged=false;g.open=false;g.contactResolved=false;g.hitThisAttack=false;
          // Stagger the squad's commitments so warnings and counter windows can
          // be read. Other soldiers still approach, guard and threaten space.
          nextEnemyAttackAt=state.time+chosen.windup+chosen.strike+.25;
        }
      }else{
        const before=g.timer;
        g.timer-=dt;
        if(g.phase==='strike'&&!g.contactResolved){
          const since=attack.strike-g.timer,previous=attack.strike-before,end=attack.contact+attack.active;
          // A sweep stays dangerous across its visible arc. Invulnerability can
          // cover part of it, but a sideways dodge must actually clear the blade.
          if(since>=attack.contact&&previous<=end){
            const contact=d<=attack.reach&&facing(g,h,attack.halfAngle)&&canHit(g,h);
            if(contact&&h.dodge===0&&!g.hitThisAttack){g.hitThisAttack=true;h.hp=Math.max(0,h.hp-25);h.hurt=T.hurt;h.lastDefense={at:state.time,kind:'hit',target:g.id,attack:g.attack};}
          }
          if(since>=end){
            g.contactResolved=true;g.open=!g.hitThisAttack;g.dodged=g.open&&g.evadedAt!==null&&state.time-g.evadedAt<=.95;
            if(g.dodged)state.skill.dodges++;
            if(g.open)h.lastDefense={at:state.time,kind:g.dodged?'dodged':'missed',target:g.id,attack:g.attack};
          }
        }
        if(g.timer<=0){
          if(g.phase==='windup'){g.phase='strike';g.timer=attack.strike;}
          else if(g.phase==='strike'){g.phase='recover';g.timer=attack.recovery;}
          else{g.phase='approach';g.open=false;}
        }
      }
    }
    if(h.hp===0||state.time>=90){state.outcome='defeat';if(state.objective)state.objective.reason=h.hp===0?'driven-back':'time-expired';}
    else if(state.guards.every(g=>!g.hp)){state.outcome='success';if(state.objective)state.objective.reason='vanguard-broken';}
    else if(state.objective&&state.guards.every(g=>!g.hp||g.escaped)){state.outcome='defeat';state.objective.reason='runner-arrived';}
    return snapshot();
  }
  const snapshot=()=>JSON.parse(JSON.stringify(state));
  return {tick,snapshot};
}
