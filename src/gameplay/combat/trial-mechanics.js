// Bounded encounter-local mechanics. No timers, world mutation or campaign state.
export function createTrialMechanics(state,{advance,canHit,receiveHit}){
  let nextBolt=0;
  state.projectiles=[];
  for(const g of state.guards){
    if(g.regeneration){g.burnRemaining=0;g.regenFraction=0;g.healed=0;}
    if(g.restoration){g.ritualCooldown=8;g.ritualDuration=2.4;g.restorations=0;g.interruptions=0;}
  }
  function hit(g,{fire=false,restoring=false}={}){
    if(fire&&g.regeneration){g.burnRemaining=6;g.regenFraction=0;}
    if(restoring&&g.hp>0){g.phase='recover';g.timer=1.4;g.open=true;g.ritualCooldown=8;g.interruptions++;}
  }
  function beginRestoration(g){
    if(!g.restoration||g.ritualCooldown>0||g.hp>g.maxHp*.78)return false;
    g.phase='restore';g.timer=g.ritualDuration;g.open=true;return true;
  }
  function enemy(g,dt,attack){
    if(g.restoration)g.ritualCooldown=Math.max(0,g.ritualCooldown-dt);
    if(g.regeneration){
      g.burnRemaining=Math.max(0,g.burnRemaining-dt);
      if(!g.burnRemaining&&!g.hurt&&g.hp<g.maxHp){
        g.regenFraction+=dt*g.regeneration;
        if(g.regenFraction>=1){const amount=Math.min(g.maxHp-g.hp,Math.floor(g.regenFraction));g.hp+=amount;g.healed+=amount;g.regenFraction-=Math.floor(g.regenFraction);}
      }
    }
    if(g.phase==='restore'){
      g.timer-=dt;
      if(g.timer<=0){g.hp=Math.min(g.maxHp,g.hp+35);g.restorations++;g.ritualCooldown=8;g.phase='recover';g.timer=1.4;g.open=true;}
      return true;
    }
    if(g.sidestep&&g.phase==='recover'&&g.timer>attack.recovery-.3){
      const side=g.attacks%2?1:-1;
      advance(g,Math.cos(g.heading)*g.sidestep*side*dt,-Math.sin(g.heading)*g.sidestep*side*dt);
      g.speed=g.sidestep;
    }
    return false;
  }
  function launch(g,a){
    if(state.projectiles.length>=8)return;
    const dx=Math.sin(g.heading),dz=Math.cos(g.heading);
    state.projectiles.push({id:nextBolt++,owner:g.id,x:g.x+dx*.7,z:g.z+dz*.7,dx,dz,remaining:a.projectile.range,
      speed:a.projectile.speed,radius:a.projectile.radius,damage:a.damage,kind:a.projectile.kind??'arcane',attack:g.attack});
  }
  function projectiles(dt){
    const h=state.hero;
    state.projectiles=state.projectiles.filter(p=>{
      const owner=state.guards.find(g=>g.id===p.owner);if(!owner?.hp||h.hp<=0)return false;
      const distance=Math.min(p.remaining,p.speed*dt),next={x:p.x+p.dx*distance,z:p.z+p.dz*distance};
      if(!canHit(p,next))return false;
      const along=Math.max(0,Math.min(distance,(h.x-p.x)*p.dx+(h.z-p.z)*p.dz));
      if(Math.hypot(h.x-(p.x+p.dx*along),h.z-(p.z+p.dz*along))<.55+p.radius){
        if(h.dodge>0){h.lastDefense={at:state.time,kind:'dodged',target:p.owner,attack:p.attack};state.skill.dodges++;}
        else receiveHit(owner,{style:'cast',damage:p.damage},{source:{x:h.x-p.dx,z:h.z-p.dz},reason:'projectile'});
        return false;
      }
      Object.assign(p,next);p.remaining-=distance;return p.remaining>0;
    });
  }
  return {hit,beginRestoration,enemy,launch,projectiles};
}
