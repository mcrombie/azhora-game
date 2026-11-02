import {createExpeditionTactics} from './expedition-tactics.js';
import {encounterFacing,selectEncounterTarget} from './encounter-target.js';

// Small fixed pools, stepped by encounter time. Pausing/retrying owns all state.
export function createTrialSpecials(state,{advance,canHit,receiveHit}){
  state.trialObjects=[];state.echoes=[];
  let serial=-1;
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const objects=()=>state.trialObjects.filter(o=>o.hp>0);
  function add(kind,g,p,radius,life,hp=1){
    if(objects().filter(o=>o.kind===kind).length>=({web:3,trap:3,ridge:5,binding:3}[kind]??1)){
      const oldest=objects().find(o=>o.kind===kind);oldest.hp=0;
    }
    const o={id:serial--,kind,owner:g.id,x:p.x,z:p.z,radius,life,hp,maxHp:hp,name:({anchor:'Ward anchor',web:'Web silk',seal:'Blood seal',trap:'Spring snare',ridge:'Raised stone',binding:'Binding knot'})[kind]};
    state.trialObjects=objects();state.trialObjects.push(o);return o;
  }
  for(const g of state.guards){
    if(g.mechanic==='wraith'){g.phase='veil';g.timer=1.6;}
    if(g.mechanic==='slinger'||g.mechanic==='centaur')g.retreatRemaining=0;
    if(g.mechanic==='adept'){g.sealCooldown=0;g.interruptions=0;}
    if(g.mechanic==='runesmith'){
      const sites=[{x:g.x+2,z:g.z-1},{x:g.x-2,z:g.z-1},{x:g.x,z:g.z}];
      add('anchor',g,sites.find(p=>canHit(g,p))??g,4.2,null,40);
    }
  }
  const tactics=createExpeditionTactics(state,{advance,canHit,receiveHit,add,objects});
  function sync(){
    for(const g of state.guards){
      g.warded=g.hp>0&&objects().some(o=>o.kind==='anchor'&&o.owner===g.id&&distance(g,o)<o.radius);
      g.empowered=g.hp>0&&(g.furyRemaining>0||objects().some(o=>o.kind==='seal'&&o.owner===g.id&&distance(g,o)<o.radius));
      g.exposed=g.mechanic==='golem'&&g.phase==='recover';
    }
    state.hero.slowed=state.hero.snared>0||objects().some(o=>['web','binding'].includes(o.kind)&&distance(state.hero,o)<o.radius);
  }
  sync();
  function tick(dt){
    tactics.tick(dt);
    for(const o of state.trialObjects){if(o.life!==null)o.life-=dt;if(o.life!==null&&o.life<=0)o.hp=0;}
    state.trialObjects=objects();
    for(const echo of state.echoes){
      const before=echo.remaining;echo.remaining-=dt;
      const owner=state.guards.find(g=>g.id===echo.owner);
      if(!owner?.hp){echo.remaining=-1;continue;}
      if(before>0&&echo.remaining<=0){
        const h=state.hero;
        if(distance(h,echo)<=echo.reach&&encounterFacing(echo,h,echo.halfAngle)&&canHit(echo,h)){
          if(h.dodge>0){state.skill.dodges++;h.lastDefense={at:state.time,kind:'dodged',attack:'echo',target:owner.id};}
          else receiveHit(owner,{style:echo.style,damage:echo.damage},{source:echo,reason:'spectral-echo'});
        }
      }
    }
    state.echoes=state.echoes.filter(e=>e.remaining>-.22);sync();
  }
  function enemy(g,dt){
    const handled=tactics.enemy(g,dt);sync();if(handled)return true;
    if(g.mechanic==='wraith'&&g.phase==='veil'){
      g.timer-=dt;g.open=false;
      const d=distance(g,state.hero),h=Math.atan2(state.hero.x-g.x,state.hero.z-g.z);g.heading=h;
      if(d>g.engage){const stride=Math.min(d-g.engage,1.5*dt);advance(g,Math.sin(h)*stride,Math.cos(h)*stride);g.speed=1.5;}
      if(g.timer<=0)g.phase='approach';return true;
    }
    if(g.mechanic==='adept'){
      g.sealCooldown=Math.max(0,g.sealCooldown-dt);
      if(g.phase==='inscribe'){
        g.timer-=dt;g.open=true;
        if(g.timer<=0){add('seal',g,g,2.7,12);g.sealCooldown=10;g.phase='recover';g.timer=1.1;sync();}
        return true;
      }
      if(g.phase==='approach'&&g.sealCooldown===0){g.phase='inscribe';g.timer=2;g.open=true;return true;}
    }
    if(['slinger','centaur'].includes(g.mechanic)&&g.phase==='approach'&&g.retreatRemaining>0){
      g.retreatRemaining=Math.max(0,g.retreatRemaining-dt);
      const d=distance(g,state.hero),desired=g.mechanic==='centaur'?5:4;
      if(d<desired){
        const dx=(g.x-state.hero.x)/(d||1),dz=(g.z-state.hero.z)/(d||1),speed=g.mechanic==='centaur'?3:1.6;
        g.heading=Math.atan2(-dx,-dz);advance(g,dx*speed*dt,dz*speed*dt);g.speed=speed;return true;
      }
      g.retreatRemaining=0;
    }
    return false;
  }
  function begin(g,a){
    tactics.begin(g,a);
    if(a.web)g.webTarget={x:state.hero.x,z:state.hero.z};
    if(a.headingOffset)g.heading-=a.headingOffset;
  }
  function contact(g,a){
    tactics.contact(g,a);sync();
    if(a.web&&g.webTarget){add('web',g,g.webTarget,1.5,11);g.webTarget=null;sync();}
    if(a.echo&&state.echoes.length<2)state.echoes.push({owner:g.id,x:g.x,z:g.z,heading:g.heading,reach:a.reach,halfAngle:a.halfAngle,style:a.style,damage:Math.round(a.damage*.7),remaining:.85});
  }
  function finished(g){
    tactics.finished(g);sync();
    if(g.mechanic==='wraith'){g.phase='veil';g.timer=2;g.open=false;}
    if(['slinger','centaur'].includes(g.mechanic))g.retreatRemaining=1.2;
  }
  function damage(g,amount){
    sync();
    if(g.phase==='submerged'||g.mechanic==='wraith'&&g.phase==='veil')return 0;
    const scale=g.warded?.25:g.mechanic==='golem'?(g.exposed?1.25:.18):1;
    return amount>0?Math.max(1,Math.round(tactics.damage(g,amount)*scale)):0;
  }
  function hit(g,{previousPhase}={}){
    tactics.hit(g,{previousPhase});
    if(previousPhase==='inscribe'&&g.hp>0){g.phase='recover';g.timer=1.3;g.open=true;g.sealCooldown=8;g.interruptions++;}
  }
  function hitObject(id,amount){
    const o=objects().find(p=>p.id===id&&p.kind!=='seal');if(!o)return false;
    const damage=Math.min(o.hp,amount);o.hp=Math.max(0,o.hp-amount);tactics.objectHit(o);state.hero.lastStrike={at:state.time,kind:'hit',target:id,targetName:o.name,damage};sync();return true;
  }
  function staffObject(h,amount){
    const o=(h.focusId===null&&objects().find(o=>['web','binding','trap'].includes(o.kind)&&distance(h,o)<o.radius))||selectEncounterTarget(h,objects().filter(o=>o.kind!=='seal'),canHit);
    if(!o)return false;
    const guard=selectEncounterTarget(h,state.guards,canHit,h.focusId);
    // A locked living opponent keeps priority; ordinary aim can select the anchor.
    if(guard&&(h.focusId!==null||distance(h,guard)<distance(h,o)))return false;
    return hitObject(o.id,amount);
  }
  function cleanup(){state.trialObjects=[];state.echoes=[];state.mirages=[];state.hero.slowed=false;state.hero.snared=0;}
  return {tick,enemy,begin,contact,finished,damage,hit,hitObject,staffObject,cleanup,
    targets:()=>objects().filter(o=>o.kind!=='seal'),
    attack:(g,a)=>g.empowered?{...a,damage:Math.round(a.damage*1.5)}:a};
}
