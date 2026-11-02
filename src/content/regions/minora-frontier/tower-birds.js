import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {towerBirdFor} from './tower-bird-roster.js';
import {createTowerBirdModel} from './tower-bird-model.js';

function buildPerch(parent,d,p){
  const b=createSceneryBuilder(`${d.name}: ${d.perch} perch`),h=d.height;
  const wood=p.wood,gold=p.gold,stone=p.trim;
  // One solid base, a comfortable round branch, and an open approach. These
  // belong beside the room's furnishings, clear of the central/stair aisles.
  b.cylinder(p.shade,0,0,0,.49,.10);
  if(d.perch==='branch'||d.perch==='flowers'){
    b.beam(wood,[-.18,.10,.10],[.07,h-.37,0],.17,.14);
    b.beam(wood,[.07,h-.37,0],[0,h,0],.10,.085);
    b.beam(wood,[.04,h-.5,0],[.43,h-.13,.10],.06);
    for(let i=0;i<4;i++)b.rock('#68855a',.22+i*.07,h-.22+i*.03,.10,.12,.032,.065,i*.8);
  }else if(d.perch==='luggage'){
    for(let i=0;i<3;i++){
      const y=.1+i*.27,c=['#6d5342','#9a7750','#506f66'][i];
      b.block(c,0,y,0,.78-i*.09,.25,.58-i*.04,(i-1)*.12);
      for(const x of [-.24,.24])b.block('#c2ad7f',x,y,.01,.035,.26,.59-i*.04);
      b.box(gold,.20,y+.13,.305,.06,.065,.015);
    }
    b.beam(wood,[0,.84,0],[0,h,0],.075);
  }else{
    b.cylinder(d.perch==='water'?'#829d9c':wood,0,.10,0,.065,h-.1);
    for(const y of [.17,h-.25])b.cylinder(gold,0,y,0,.105,.055);
    if(d.perch==='dial'){
      for(let i=0;i<12;i++){
        const a=i*Math.PI/6;b.rock(gold,Math.cos(a)*.35,.12,Math.sin(a)*.35,.035,.018,.035);
      }
    }
    if(d.perch==='archive'){
      for(let i=0;i<3;i++){
        b.block(['#6e5550','#556966','#8c7650'][i],0,.12+i*.13,0,.65,.11,.46);
        b.block('#d7cbb0',.012,.145+i*.13,.025,.60,.065,.42);
      }
    }
    if(d.perch==='lyre')for(const s of [-1,1]){
      b.beam(gold,[s*.22,.40,0],[s*.30,h,0],.045);
      for(let i=1;i<=3;i++)b.beam('#cfbd91',[s*i*.065,.42,0],[s*i*.065,h-.03,0],.007);
    }
    if(d.perch==='moon'){
      for(let i=0;i<12;i++){
        const a=(i/12*1.4+.3)*Math.PI,c=((i+1)/12*1.4+.3)*Math.PI;
        b.beam('#b5c6cf',[Math.cos(a)*.22,h-.30+Math.sin(a)*.22,.05],[Math.cos(c)*.22,h-.30+Math.sin(c)*.22,.05],.026);
      }
    }
    if(d.perch==='workshop'){
      b.block('#5a6668',0,.11,0,.64,.16,.5);
      for(const x of [-.23,.23])b.cylinder(gold,x,.27,0,.045,.045);
      b.rock('#a3c1bb',.24,.31,.04,.055,.045,.05);
    }
    if(d.perch==='theatre'){
      b.beam(gold,[-.2,h-.65,0],[.2,h-.1,0],.03);
      b.beam(gold,[.2,h-.65,0],[-.2,h-.1,0],.03);
      b.rock(p.cloth,0,h-.37,0,.115,.16,.04);
    }
  }
  // A rounded branch rather than a knife-thin rail beneath the feet.
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6,c=(i+1)*Math.PI/6,r=.035;
    b.quad(wood,[-.38,h+Math.cos(a)*r,Math.sin(a)*r],[-.38,h+Math.cos(c)*r,Math.sin(c)*r],[.38,h+Math.cos(c)*r,Math.sin(c)*r],[.38,h+Math.cos(a)*r,Math.sin(a)*r]);
  }
  const basin=d.perch==='basin'||d.perch==='water';
  if(basin){
    b.cylinder(stone,.27,.10,.22,.19,.12);b.cylinder('#7caeb1',.27,.221,.22,.155,.008);
    for(let i=0;i<12;i++){const a=i*Math.PI/6;b.rock(stone,.27+Math.sin(a)*.17,.235,.22+Math.cos(a)*.17,.035,.025,.035);}
  }
  if(d.perch==='flowers')for(let i=0;i<4;i++){
    const x=-.22+i*.14,z=.17+Math.sin(i)*.14,y=h-.10+i*.03;
    b.beam('#728451',[x,.14,z],[x,y,z],.016);
    b.rock('#5a7c4c',x+.07,y-.20,z,.10,.035,.06);
    for(let j=0;j<5;j++){const a=j*Math.PI*.4;b.rock('#b85f62',x+Math.cos(a)*.035,y+Math.sin(a)*.035,z,.035,.026,.06);}
    b.rock('#e9c882',x,y,z-.04,.016,.016,.016);
  }
  const mesh=b.finish(parent,{castShadow:false});mesh.material=mesh.material.clone();
  return mesh;
}

export function createTowerBird(parent,id,palette,solid){
  const d=towerBirdFor(id);if(!d)return null;
  const buildStarted=performance.now();
  const root=new THREE.Group();root.name=`${id}: resident ${d.name}`;root.position.set(d.x,0,d.z);parent.add(root);
  const perch=buildPerch(root,d,palette),bird=createTowerBirdModel(root,d);
  const restY=d.height+.035;bird.root.position.y=restY;bird.root.rotation.y=d.yaw;
  solid(d.x,0,d.z,1.05,d.height+.08,1.05,'tower-bird-perch');
  let clock=0,updates=0,active=false;
  const buildMs=performance.now()-buildStarted;
  const position=new THREE.Vector3();
  return {root,bird,
    update(dt,player,visible){
      if(!visible){active=false;root.visible=false;return;}
      root.getWorldPosition(position);
      active=!!visible&&Math.abs(player.y-position.y)<8.6&&Math.hypot(player.x-position.x,player.z-position.z)<32;
      root.visible=active;
      if(!active)return;
      clock+=Math.min(.1,Math.max(0,dt));updates++;
      bird.animate(clock+id.length*.7);
      // A hummingbird hovers among Helba's flowers. Other birds stay perched,
      // occasionally looking around and stretching: no expensive flight AI.
      if(d.form==='hummingbird'){
        bird.root.position.set(Math.sin(clock*1.4)*.075,restY+.08+Math.sin(clock*2.1)*.025,Math.cos(clock*1.4)*.045);
      }else if(id==='taleth'){
        // An occasional short hop along the same broad perch, with planted
        // feet between hops. No pathfinding or additional renderer passes.
        const phase=clock%18,t=Math.min(1,Math.max(0,(phase-8)/.7)),back=Math.min(1,Math.max(0,(phase-13)/.7));
        bird.root.position.set(.23*(t-back),restY+.10*(Math.sin(t*Math.PI)+Math.sin(back*Math.PI)),0);
        bird.root.rotation.y=d.yaw+(t-back)*.8;
        if(t>0&&t<1||back>0&&back<1)bird.wings.forEach((w,i)=>w.rotation.z=(i?1:-1)*.5);
      }
    },
    state:()=>({species:d.species,name:d.name,length:d.length,active,updates,clock,position:[position.x+bird.root.position.x,position.y+bird.root.position.y,position.z+bird.root.position.z],batches:5,buildMs}),
    dispose(){bird.dispose();perch.geometry.dispose();perch.material.dispose();root.removeFromParent();},
  };
}
