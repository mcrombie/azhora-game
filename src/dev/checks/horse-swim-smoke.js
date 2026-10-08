import {canStand,canSwim} from '../../gameplay/movement/locomotion.js';
import {RIDE} from '../../gameplay/movement/riding.js';

const assert=(value,message)=>{if(!value)throw Error(message);};
const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));

// Locate a real, already-loaded riverbank outside Minora. Both legs of the
// check use ordinary mounted movement, not a teleport into the channel.
function findBank(world){
  const valid=(x,z)=>world.readyAt(x,z)&&world.canExploreAt(x,z)&&world.regionAt(x,z).id===16;
  const clear=(x,z)=>valid(x,z)&&(canStand(x,z,world,RIDE.radius)||canSwim(x,z,world,RIDE.radius,world.waterAt(x,z)-RIDE.floatOffset));
  const dryBank=(x,z)=>{
    const water=world.waterAt(x,z),support=world.supportAt?.(x,z,{maxY:water-RIDE.floatOffset,stepUp:.45})?.height??world.heightAt(x,z);
    return valid(x,z)&&canStand(x,z,world,RIDE.radius)&&support>=water+.05;
  };
  for(let z=225;z<=280;z+=5)for(let x=-2465;x<=-2340;x+=5){
    if(!valid(x,z)||world.waterAt(x,z)-world.heightAt(x,z)<1.65||!clear(x,z))continue;
    for(let angle=0;angle<Math.PI*2;angle+=Math.PI/4)for(let distance=4;distance<=22;distance+=2){
      const bank={x:x+Math.sin(angle)*distance,z:z+Math.cos(angle)*distance};
      // Do not mistake a deck overhead or the last centimetre of shoreline for
      // a bank that a swimming horse can actually climb onto and dismount upon.
      if(![[0,0],[1,0],[-1,0],[0,1],[0,-1]].every(([dx,dz])=>dryBank(bank.x+dx,bank.z+dz)))continue;
      let open=true;
      for(let n=0;n<=distance*2;n++)if(!clear(x+(bank.x-x)*n/(distance*2),z+(bank.z-z)*n/(distance*2))){open=false;break;}
      if(open)return {bank,water:{x,z}};
    }
  }
  throw Error('No clear loaded Minora bank found for horse swimming');
}

function rideTo(api,target){
  api.hold('KeyW',true);
  try{
    for(let i=0;i<600;i++){
      const state=api.state(),p=state.position,gap=Math.hypot(p[0]-target.x,p[2]-target.z);
      if(gap<.08)return;
      api.look({yaw:Math.atan2(p[0]-target.x,p[2]-target.z),pitch:.3,distance:9});
      const speed=(state.mount.swimming?RIDE.swim:RIDE.walk)*state.mount.horseSpeed;
      api.step(Math.min(.04,Math.max(.002,(gap-.04)/speed)));
    }
    throw Error('Horse did not reach river target: '+JSON.stringify({target,...diagnostic(api)}));
  }finally{api.hold('KeyW',false);}
}

function diagnostic(api){
  const state=api.state(),[x,y,z]=state.position,world=api.testWorld;
  return {position:state.position,mount:state.mount,mode:state.mode,ground:world.heightAt(x,z),water:world.waterAt(x,z),depth:world.waterAt(x,z)-world.heightAt(x,z),
    support:world.supportAt?.(x,z,{maxY:y,stepUp:.45}),probe:api.groundProbe(x,z)};
}

export async function checkHorseSwimming(api){
  assert(api.stable.owned&&!api.tower.state().inside,'Bear must have given his horse outside before swimming check');
  api.war.pause();const world=api.testWorld,site=findBank(world),checks=[];
  for(const developer of [false,true]){
    await api.visit(site.bank);
    if(developer)assert(api.selectMount('horse').ok,'Developer horse mounts at riverbank');
    else{
      api.stable.restore({...api.stable.snapshot(),horse:{...site.bank,yaw:0}});
      api.stable.toggleMount();assert(api.stable.mounted,'Normal horse mounts at riverbank');
    }
    rideTo(api,site.water);for(let i=0;i<40;i++)api.step(.04);
    const state=api.state(),p=state.position,water=world.waterAt(p[0],p[2]);
    assert(state.mount.swimming,'Horse enters a real deep river');
    assert(Math.abs(p[1]-(water-RIDE.floatOffset))<.05,'Horse floats near water surface instead of walking on bed');
    const beforeDismount=diagnostic(api),dismount=api.selectMount('foot');
    if(dismount.ok){
      // This narrow channel may have a reachable bank beside the swimmer.
      // A safe step onto it is valid; falling into the water is not.
      const after=api.state().position,support=world.supportAt?.(after[0],after[2],{maxY:after[1],stepUp:.45})?.height??world.heightAt(after[0],after[2]);
      assert(api.state().mount.kind==='foot'&&Math.hypot(after[0]-p[0],after[2]-p[2])<=2&&support>=world.waterAt(after[0],after[2])&&Math.abs(after[1]-support)<.1,
        'Nearshore dismount reaches clear dry footing: '+JSON.stringify({developer,site,before:beforeDismount,after:diagnostic(api),dismount}));
      checks.push(`${developer?'Developer':'Normal'} nearshore dismount uses a reachable dry bank`);
      await api.visit(site.bank);
      if(developer)assert(api.selectMount('horse').ok,'Developer horse remounts on dry bank');
      else{api.stable.restore({...api.stable.snapshot(),horse:{...site.bank,yaw:0}});api.stable.toggleMount();assert(api.stable.mounted,'Normal horse remounts on dry bank');}
      rideTo(api,site.water);for(let i=0;i<8;i++)api.step(.04);
    }else assert(api.state().mount.kind==='horse','An unavailable dismount leaves the rider mounted');
    checks.push(`${developer?'Developer':'Normal'} horse swims through the real Minora river and remains mounted safely`);
    if(!developer){
      rideTo(api,site.bank);for(let i=0;i<8;i++)api.step(.04);
      assert(!api.state().mount.swimming,'Horse returns to land gait on bank: '+JSON.stringify({site,...diagnostic(api)}));
      assert(api.selectMount('foot').ok&&!api.stable.mounted,'Normal horse dismounts on dry bank');
      checks.push('Normal horse returns to dry land and safely dismounts');
    }
  }
  api.look({yaw:Math.PI/2,pitch:.5,distance:3.5});
  await frame();assert(!api.state().frameErrors.length,'Horse swim rendering has no frame errors');
  return {checks,site,state:api.state().mount};
}
