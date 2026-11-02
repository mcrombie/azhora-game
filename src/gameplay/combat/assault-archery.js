import {forestBodyHit} from './forest-arrows.js';
import {forestSegmentHit} from './forest-sightline.js';
import {physicalDamage} from './combat-units.js';
import {encounterFacing} from './encounter-target.js';
import {isEncounterGuarding} from './encounter-defense.js';

// Optional ranged allies for an existing local assault. Shafts have fixed XYZ
// directions at release; the first body or terrain hit consumes each arrow.
export function createAssaultArchery(state,{heightAt=()=>0,arrowHit=null,walk,checkBreak}){
  let serial=0;const projectiles=[];
  const ground=(p)=>heightAt(p.x,p.z),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const alive=a=>a.hp>0&&!a.escaped;
  const cover=(a,b)=>arrowHit?arrowHit(a,b):forestSegmentHit({heightAt},a,b,{radius:.055});
  const eye=(a,lift=1.45)=>({x:a.x,y:ground(a)+lift,z:a.z});
  const bodies=()=>[state.hero,...state.guards,...state.allies].filter(alive);
  function tickActor(a,dt){
    const r=a.ranged;if(!r)return false;
    r.arrows??=36;r.draw??=1.05;r.recovery??=1.5;r.range??=27;r.damage??=23;
    a.bowHome??={x:a.x,z:a.z};a.bowDraw=0;
    const foes=state.guards.filter(alive).sort((x,y)=>distance(a,x)-distance(a,y)||x.id-y.id),nearest=foes[0];
    // At close quarters the ordinary sword/contact phases take over. An archer
    // cannot fire through an opponent standing in their bow arm.
    if(['windup','strike','recover','stagger'].includes(a.phase)||!r.arrows||nearest&&distance(a,nearest)<4){
      if(a.phase.startsWith('bow-')){a.phase='approach';a.timer=.25;}
      r.active=false;return false;
    }
    r.active=true;
    if(a.phase==='bow-recover'){a.timer=Math.max(0,a.timer-dt);if(!a.timer)a.phase='approach';return true;}
    if(a.phase==='bow-draw'){
      a.timer=Math.max(0,a.timer-dt);a.bowDraw=1-a.timer/r.draw;
      const target=state.guards.find(g=>g.id===a.targetId&&alive(g));
      if(!target){a.phase='bow-recover';a.timer=.35;return true;}
      if(a.timer>.32)a.bowAim=eye(target,1.15);
      a.heading=Math.atan2(a.bowAim.x-a.x,a.bowAim.z-a.z);
      if(!a.timer){
        const origin=eye(a),aim=a.bowAim,length=Math.hypot(aim.x-origin.x,aim.y-origin.y,aim.z-origin.z);
        if(length>.01&&projectiles.length<8){
          projectiles.push({id:'assault-arrow-'+ ++serial,owner:a.id,side:'allies',x:origin.x,y:origin.y,z:origin.z,
            dx:(aim.x-origin.x)/length,dy:(aim.y-origin.y)/length,dz:(aim.z-origin.z)/length,damage:r.damage,travelled:0,source:{...origin}});
          r.arrows--;a.shots=(a.shots??0)+1;
        }
        a.phase='bow-recover';a.timer=r.recovery;a.bowDraw=0;
      }
      return true;
    }
    const target=foes.find(g=>{
      const advantage=ground(a)-ground(g),range=r.range+Math.max(0,Math.min(8,advantage*1.5));
      return distance(a,g)<=range&&!cover(eye(a),eye(g,1.15));
    });
    if(target){
      a.targetId=target.id;a.heading=Math.atan2(target.x-a.x,target.z-a.z);a.bowAim=eye(target,1.15);
      a.heightAdvantage=ground(a)-ground(target);a.phase='bow-draw';a.timer=r.draw;a.open=true;
    }else if(distance(a,a.bowHome)>.5)walk(a,a.bowHome,dt,2.5);
    // Hold the defended terrace rather than chasing the charge down its slope.
    return true;
  }
  function tick(dt){
    for(let i=projectiles.length-1;i>=0;i--){
      const p=projectiles[i],from={x:p.x,y:p.y,z:p.z},step=32*dt;
      const to={x:p.x+p.dx*step,y:p.y+p.dy*step,z:p.z+p.dz*step};let hit=cover(from,to);
      for(const b of bodies()){
        if(b.id===p.owner)continue;
        const y=ground(b),contact=forestBodyHit(from,to,{...b,r:b.bodyRadius??.45,minY:y,maxY:y+(b.unitType?.includes('orc')?2.15:1.85)},.055);
        if(contact&&(!hit||contact.t<hit.t))hit={...contact,body:b};
      }
      if(hit){
        const b=hit.body;
        if(b&&state.guards.includes(b)){
          // A terrace can clear a forward-facing shield; ordinary same-level
          // arrows still respect that shield and every hit respects armor.
          const guarded=p.source.y-1.45-ground(b)<1.5&&isEncounterGuarding(b)&&encounterFacing(b,p.source,Math.PI*.55);
          const loss=Math.min(b.hp,physicalDamage(p.damage,b,{guarded}).damage);
          b.hp-=loss;b.hurt=loss?.28:0;b.block=guarded?.28:0;
          state.squad.damageByAllies+=loss;state.squad.arrowHits=(state.squad.arrowHits??0)+(loss>0?1:0);
          if(!b.hp){b.phase='down';b.open=false;}
          checkBreak();
        }
        projectiles.splice(i,1);
      }else{Object.assign(p,to);p.travelled+=step;if(p.travelled>48)projectiles.splice(i,1);}
    }
    state.archeryProjectiles=projectiles.map(p=>({...p,source:{...p.source}}));
  }
  return {tickActor,tick,clear(){projectiles.length=0;state.archeryProjectiles=[];}};
}
