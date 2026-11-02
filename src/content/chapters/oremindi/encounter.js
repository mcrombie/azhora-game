import {createLizeemEncounter} from '../../../gameplay/combat/lizeem-encounter.js';
import {encounterAutoplayInput} from '../../../gameplay/autoplay/encounter-input.js';

const copy=value=>structuredClone(value),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);

/** Authored local staging. Negative local Z is the defended upper terrace;
 * the host rotates this layout to fit the actual mountain approach. */
export function oremindiEncounterLayout(kind,centre={x:0,z:0},heading=centre.heading??0){
  if(!['ambush','highground'].includes(kind)||!finite(centre)||!Number.isFinite(heading))throw Error('Choose a valid Oremindi encounter and centre.');
  const at=(x,z,rest={})=>({x:centre.x+Math.cos(heading)*x+Math.sin(heading)*z,z:centre.z-Math.sin(heading)*x+Math.cos(heading)*z,...rest});
  if(kind==='ambush')return {hero:at(0,4),rally:at(0,0),allies:[],guards:[[-6,-5],[6,-5],[0,-11]].map(([x,z])=>at(x,z,{unitType:'orc-raider'}))};
  return {hero:at(0,-7),rally:at(0,-4),allies:[
    at(-7,-12,{unitType:'militiaman',ranged:{arrows:36,damage:23}}),at(7,-12,{unitType:'militiaman',ranged:{arrows:36,damage:23}}),
    at(-3,-3,{unitType:'ambron-soldier'}),at(3,-3,{unitType:'ambron-soldier'}),
  ],guards:[
    ...[-10,-3,4,10].map(x=>at(x,16,{unitType:'orc-raider'})),
    ...[-7,0,7].map(x=>at(x,22,{unitType:'orc-warrior'})),
    at(0,28,{commander:{id:'south-oremindi-chief',name:'South Oremindi chief',faction:'oremindi-south-orcs',unitType:'veteran-orc-warrior',canRetreat:false}}),
  ]};
}

/** Reuses the established staff/guard/dodge/formation model. The small wrapper
 * owns only this chapter's staging, grounded slope costs and completion facts.
 * No campaign command, inventory award or territorial mutation occurs here. */
export function createOremindiEncounter({kind='ambush',centre={x:0,z:0},layout=null,radius=kind==='ambush'?30:42,
  heightAt=()=>0,move=null,canHit=()=>true,canOccupy=null,canTraverse=null,arrowHit=null,retreatRoute=null,
  timeLimit=kind==='ambush'?180:240,heroAttributes={}}={}){
  layout=copy(layout??oremindiEncounterLayout(kind,centre));
  if(!['ambush','highground'].includes(kind)||!finite(centre)||!Number.isFinite(radius)||radius<12||!(timeLimit>0))throw Error('Invalid Oremindi encounter.');
  const all=[layout.hero,layout.rally,...layout.guards,...layout.allies];
  if(all.some(p=>!finite(p)||distance(p,centre)>radius-1))throw Error('Encounter staging must stay inside its battlefield.');
  if(kind==='ambush'&&(layout.guards.length!==3||layout.allies.length))throw Error('The investigation ambush has exactly three raiders.');
  if(kind==='highground'&&(layout.guards.filter(g=>g.commander).length!==1||!layout.allies.some(a=>a.ranged)))throw Error('The mountain battle requires its chief and elven archers.');
  if(kind==='highground')for(const ally of layout.allies)if(!ally.ranged)ally.defend={x:ally.x,z:ally.z,radius:4};
  const inside=p=>finite(p)&&distance(p,centre)<=radius-.55;
  const occupy=(p,r)=>inside(p)&&(!canOccupy||canOccupy(p,r));
  function groundedMove(actor,dx,dz){
    const length=Math.hypot(dx,dz);if(!length)return {x:actor.x,z:actor.z};
    const grade=(heightAt(actor.x+dx,actor.z+dz)-heightAt(actor.x,actor.z))/length;
    const cost=1/(1+Math.max(0,grade)*1.1+Math.max(0,-grade)*.12);
    const request={x:actor.x+dx*cost,z:actor.z+dz*cost};
    if(!inside(request))return {x:actor.x,z:actor.z};
    const next=move?move(actor,request.x-actor.x,request.z-actor.z):request;
    return inside(next)&&(!canOccupy||canOccupy(next,actor.bodyRadius??.45))?next:{x:actor.x,z:actor.z};
  }
  const retreat=retreatRoute??((at,hero)=>{
    const heading=Math.atan2(at.x-hero.x,at.z-hero.z);
    return [{x:centre.x+Math.sin(heading)*(radius-2),z:centre.z+Math.cos(heading)*(radius-2)}];
  });
  const base=createLizeemEncounter({heroStart:layout.hero,guardStarts:layout.guards,allyStarts:layout.allies,
    rallyPoint:layout.rally,fieldBattle:kind==='highground',morale:kind==='highground'?{allies:15,enemies:-9}:null,
    move:groundedMove,canHit,canOccupy:canOccupy?occupy:null,canTraverse,heightAt,arrowHit,retreatRoute:retreat,timeLimit,heroAttributes});
  let state=base.snapshot(),outcome=null,accumulator=0,settle=0;
  function facts(){
    const fallen=state.guards.filter(g=>g.hp<=0),survivor=state.guards.find(g=>g.hp>0);
    const exit=survivor?.retreatPath?.at(-1);
    return {fallen:fallen.length,retreated:kind==='ambush'&&fallen.length===2&&!!survivor?.departed&&!!exit&&distance(survivor,exit)<.5,
      chiefDefeated:!!state.guards.find(g=>g.commanderId&&g.hp<=0),proofPoint:fallen[0]?{x:fallen[0].x,z:fallen[0].z}:null};
  }
  function finish(result,reason){if(!outcome)outcome={result,reason,at:state.time,...facts()};}
  function snapshot(){return {...copy(state),kind,radius,centre:{...centre},combatOutcome:state.outcome,outcome:copy(outcome),settling:!!state.outcome&&!outcome,settleSeconds:settle,...facts()};}
  function step(dt,input){
    if(state.outcome==='success'){
      settle+=dt;state=base.aftermath(dt);const f=facts();
      if(kind==='ambush'){
        if(f.retreated)finish('victory','two-raiders-fallen-survivor-fled');
        else if(settle>=20)finish('defeat','retreat-route-blocked');
      }else if(!f.chiefDefeated)finish('defeat','chief-still-standing');
      else if(state.guards.every(g=>!g.hp||g.departed)||settle>=8)finish('victory','chief-fallen-formation-broken');
      return;
    }
    state=base.tick(dt,input);
    if(state.outcome==='defeat')finish('defeat',state.hero.hp<=0?'hero-defeated':'field-time-expired');
  }
  function advance(dt,input,navigation){
    if(!Number.isFinite(dt)||dt<0||dt>1)throw Error('Encounter time must be between zero and one second.');
    if(outcome||!dt)return snapshot();accumulator+=dt;
    while(accumulator+1e-10>=1/60&&!outcome){step(1/60,navigation?encounterAutoplayInput(state,navigation):input);accumulator-=1/60;}
    return snapshot();
  }
  const canCast=()=>!outcome&&!state.outcome&&base.canCast();
  return {snapshot,tick:(dt,input={})=>advance(dt,input),
  canCast,beginCast(){if(!canCast())return false;const accepted=base.beginCast();state=base.snapshot();return accepted;},
  spellTargets:()=>outcome||state.outcome?[]:copy(base.spellTargets()),
  fireballHit(id,damage){if(outcome||state.outcome)return false;const hit=base.fireballHit(id,damage);state=base.snapshot();return hit;},
  // Re-evaluate normal controller input at every simulation step, regardless
  // of render rate or developer batching. A long frame must not hold a stale
  // dodge/strike decision through a telegraph's contact window.
  autoplayTick:(dt,navigation={})=>advance(dt,null,navigation),
  withdraw(){finish('withdrawal','hero-withdrew');return snapshot();},
  autoplayInput(navigation={}){return encounterAutoplayInput({...state,outcome:state.outcome},navigation);}};
}
