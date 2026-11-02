import {encounterFacing} from './encounter-target.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const trialSolids=state=>(state.trialObjects??[]).filter(o=>o.hp>0&&o.kind==='ridge');
export function trialLineClear(state,a,b){
  const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
  return trialSolids(state).every(o=>{
    if(o.id===a.id||o.id===b.id||!length)return true;
    const t=Math.max(0,Math.min(1,((o.x-a.x)*dx+(o.z-a.z)*dz)/length));
    return Math.hypot(a.x+t*dx-o.x,a.z+t*dz-o.z)>o.radius*.9;
  });
}

// All clocks and objects belong to the encounter. No setTimeout, terrain edits,
// summoned world actors, or unbounded particle/obstacle spawning.
export function createExpeditionTactics(state,{advance,canHit,receiveHit,add,objects}){
  state.mirages=[];state.hero.snared=0;
  for(const g of state.guards){
    if(g.mechanic==='trapper'){g.trapCooldown=0;g.retreatRemaining=0;}
    if(g.mechanic==='penitent'){g.offeringCooldown=0;g.furyRemaining=0;g.interruptions=0;}
    if(g.mechanic==='reed-stalker'){g.phase='submerged';g.timer=1.6;g.interruptions=0;}
    if(g.mechanic==='oathbound'){g.stance='shield';g.pattern=['oath-shield'];}
    if(g.mechanic==='wyvern')g.pattern=['wyvern-pass','wyvern-bite','wyvern-tail'];
  }
  function tick(dt){
    state.hero.snared=Math.max(0,state.hero.snared-dt);
    for(const o of objects()){
      const owner=state.guards.find(g=>g.id===o.owner&&g.hp>0);
      if(!owner){o.hp=0;continue;}
      if(o.kind!=='trap')continue;
      o.arming=Math.max(0,o.arming-dt);
      if(o.arming>0)continue;
      // The owner has no immunity after the clearly visible arming period.
      const victim=[state.hero,owner].find(a=>distance(a,o)<o.radius+(a.bodyRadius??.3));
      if(!victim)continue;
      o.hp=0;
      if(victim===state.hero){if(!victim.dodge){receiveHit(owner,{style:'stomp',damage:10},{source:o,reason:'snare'});victim.snared=1.6;}}
      else{victim.hp=Math.max(0,victim.hp-20);victim.phase=victim.hp?'recover':'down';victim.timer=2;victim.open=!!victim.hp;victim.snaredByOwnTrap=(victim.snaredByOwnTrap??0)+1;}
    }
    state.mirages=state.mirages.filter(m=>{m.life-=dt;return m.life>0&&state.guards.some(g=>g.id===m.owner&&g.hp>0);});
  }
  function enemy(g,dt){
    const h=state.hero,d=distance(g,h),heading=Math.atan2(h.x-g.x,h.z-g.z);
    if(g.mechanic==='ranger'){
      const a=g.combat.attacks[g.attack];
      if(g.phase==='windup'&&a.trackUntil&&g.timer>a.trackUntil)g.heading=heading;
    }
    if(g.mechanic==='trapper'){
      g.trapCooldown=Math.max(0,g.trapCooldown-dt);
      if(g.phase==='approach'&&!g.trapCooldown){
        const p={x:g.x-Math.sin(heading)*.6,z:g.z-Math.cos(heading)*.6};
        const trap=add('trap',g,p,.6,14,12);trap.arming=1.3;
        g.trapCooldown=7;g.retreatRemaining=1.1;
      }
      if(g.phase==='approach'&&g.retreatRemaining>0){
        g.retreatRemaining=Math.max(0,g.retreatRemaining-dt);g.heading=heading;
        advance(g,-Math.sin(heading)*2*dt,-Math.cos(heading)*2*dt);g.speed=2;return true;
      }
    }
    if(g.mechanic==='penitent'){
      g.offeringCooldown=Math.max(0,g.offeringCooldown-dt);g.furyRemaining=Math.max(0,g.furyRemaining-dt);
      if(g.phase==='offering'){
        g.timer-=dt;g.open=true;
        if(g.timer<=0){g.hp=Math.max(1,g.hp-14);g.furyRemaining=6;g.offeringCooldown=11;g.phase='approach';g.open=false;}
        return true;
      }
      if(g.phase==='approach'&&!g.offeringCooldown){g.phase='offering';g.timer=1.5;g.open=true;return true;}
    }
    if(g.mechanic==='reed-stalker'){
      if(g.phase==='submerged'){
        g.timer-=dt;g.open=false;g.heading=heading;
        if(d>g.engage){advance(g,Math.sin(heading)*2.5*dt,Math.cos(heading)*2.5*dt);g.speed=2.5;}
        if(g.timer<=0){g.phase='emerge';g.timer=1.05;g.open=true;}return true;
      }
      if(g.phase==='emerge'){g.timer-=dt;g.open=true;if(g.timer<=0){g.phase='approach';g.open=false;}return true;}
    }
    if(g.mechanic==='furnace'&&g.phase==='vent'){
      g.timer-=dt;g.ventPulse-=dt;g.open=true;
      if(g.ventPulse<=0){
        g.ventPulse=.6;
        const source={...g,heading:g.ventHeading};
        if(d<3.8&&encounterFacing(source,h,Math.PI/4)&&canHit(g,h))receiveHit(g,{style:'stomp',damage:19},{source:g,reason:'furnace-vent'});
      }
      if(g.timer<=0){g.phase='approach';g.open=false;}return true;
    }
    if(g.mechanic==='wyvern')g.flightHeight=g.attack==='wyvern-pass'&&['windup','strike'].includes(g.phase)?.8:0;
    return false;
  }
  function begin(g,a){
    if(a.ridge||a.binding)g.fieldTarget={x:state.hero.x,z:state.hero.z,heading:g.heading,kind:a.ridge?'ridge':'binding'};
    if(g.mechanic==='mirrorblade'&&g.attack==='mirror-thrust')g.heading=Math.atan2(state.hero.x-g.x,state.hero.z-g.z);
  }
  function contact(g,a){
    if((a.ridge||a.binding)&&g.fieldTarget){
      const p=g.fieldTarget,kind=p.kind,count=kind==='ridge'?5:3;
      for(const old of objects().filter(o=>o.kind===kind))old.hp=0;
      for(let i=0;i<count;i++){
        const offset=(i-(count-1)/2)*(kind==='ridge'?.85:1.15);
        const q={x:p.x+Math.cos(p.heading)*offset,z:p.z-Math.sin(p.heading)*offset};
        // Never materialize a solid under a person; short ridges always have ends.
        if(kind==='ridge'&&[state.hero,...state.guards].some(b=>b.hp>0&&distance(q,b)<(b.bodyRadius??.55)+.6))continue;
        if(!canHit(g,q))continue;
        const o=add(kind,g,q,kind==='ridge'?.43:.67,8,kind==='ridge'?30:18);o.bodyRadius=o.radius;o.heading=p.heading;
      }
      g.fieldTarget=null;
    }
    if(a.mirrors){
      const origin={x:g.x,z:g.z};state.mirages=[];
      for(const side of [-1,1])state.mirages.push({owner:g.id,x:g.x+Math.cos(g.heading)*side*1.3,z:g.z-Math.sin(g.heading)*side*1.3,heading:g.heading,life:2.5});
      advance(g,Math.cos(g.heading)*.8, -Math.sin(g.heading)*.8);g.dustOrigin=origin;
    }
  }
  function finished(g){
    if(g.mechanic==='reed-stalker'){
      // An interrupted ambush grants a counter window, then a grounded fight.
      // Re-diving here would let repeated emergence hits prevent every attack.
      if(g.ambushInterrupted){g.ambushInterrupted=false;g.phase='approach';}
      else{g.phase='submerged';g.timer=2;}
      g.open=false;
    }
    if(g.mechanic==='furnace'){g.phase='vent';g.timer=3;g.open=true;g.ventHeading=g.heading+(g.attacks%2?1:-1)*Math.PI/2;g.ventPulse=.6;}
    if(g.mechanic==='oathbound'){g.stance=g.stance==='shield'?'pursuit':'shield';g.guarding=g.stance==='shield';g.pattern=[g.stance==='shield'?'oath-shield':'oath-pursuit'];}
  }
  function damage(g,amount){
    if(g.phase==='submerged')return 0;
    const scale=g.mechanic==='furnace'?(g.phase==='vent'?1.25:.25):g.mechanic==='stone-troll'&&g.phase==='recover'?1.5:1;
    return amount>0?Math.max(1,Math.round(amount*scale)):0;
  }
  function hit(g,{previousPhase}={}){
    if(g.hp<=0)return;
    if(previousPhase==='offering'){g.phase='recover';g.timer=1.5;g.open=true;g.offeringCooldown=8;g.interruptions++;}
    if(previousPhase==='emerge'){g.phase='recover';g.timer=1.7;g.open=true;g.ambushInterrupted=true;g.interruptions++;}
  }
  function objectHit(o){
    if(o.kind!=='binding'||o.hp>0)return;
    const g=state.guards.find(g=>g.id===o.owner&&g.hp>0);if(!g)return;
    g.phase='recover';g.timer=1.6;g.open=true;g.fieldTarget=null;g.interruptions=(g.interruptions??0)+1;
  }
  return {tick,enemy,begin,contact,finished,damage,hit,objectHit};
}
