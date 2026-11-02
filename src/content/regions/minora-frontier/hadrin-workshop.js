import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {HADRIN_EXHIBITS} from './hadrin-exhibits.js';
import {createHadrinConveniences} from './hadrin-conveniences.js';

// A small workshop display, not a creature simulation. Articulated parts share
// static batches per pivot; short demonstrations use presentation time.
export function createHadrinWorkshop({parent,palette:p,solid,finish,ownedMaterials}){
  const root=new THREE.Group();root.name='Hadrin: enchanted objects and unfinished golem';parent.add(root);
  const staticParts=createSceneryBuilder('Hadrin: stocked benches and golem work station'),parts=[],materials=new Set();
  const iron='#47565a',steel='#8b9998',stone='#a8aa98',dark='#273e45',copper='#ac754a',paper='#d6c29a',aqua='#86d5cd';
  let time=0,start=0,active=null,last=null,count=0;
  const durations={golem:6,everlight:5,'mending-hammer':5,wayfinder:5,'rainkeeper-cup':5,armor:5,broom:7};
  const objects=HADRIN_EXHIBITS.map(({id,x,z})=>({id,x,z}));
  function part(name,at,build,parentGroup=root,{glow=false}={}){
    const group=new THREE.Group();group.name=name;group.position.set(...at);parentGroup.add(group);
    const b=createSceneryBuilder(name);build(b);const mesh=b.finish(group,{castShadow:false});
    mesh.material=mesh.material.clone();if(glow){mesh.material.emissive.set('#83c4bd');mesh.material.emissiveIntensity=.4;}
    materials.add(mesh.material);ownedMaterials.add(mesh.material);parts.push(mesh);return group;
  }
  function ring(b,color,x,y,z,r,width=.035,vertical=false){
    for(let i=0;i<20;i++){
      const a=i*Math.PI/10,c=(i+1)*Math.PI/10;
      b.beam(color,[x+Math.cos(a)*r,y+(vertical?Math.sin(a)*r:0),z+(vertical?0:Math.sin(a)*r)],
        [x+Math.cos(c)*r,y+(vertical?Math.sin(c)*r:0),z+(vertical?0:Math.sin(c)*r)],width);
    }
  }
  function bolts(b,x,y,z,w,h){for(const xx of [-1,1])for(const yy of [-1,1])b.rock(p.gold,x+xx*w/2,y+yy*h/2,z,.045,.045,.025);}
  function scroll(x,z,turn=0){staticParts.frame(x,1.44,z,turn,()=>{
    staticParts.block(paper,0,0,0,.7,.026,.5);
    for(let i=0;i<4;i++)staticParts.block(iron,-.03,.03,-.16+i*.10,.43-i*.04,.008,.018);
    for(const zz of [-.26,.26])staticParts.block(p.trim,0,.02,zz,.76,.07,.065);
  });}
  function bottle(x,z,color,h=.5){
    staticParts.rock(color,x,1.44+h*.4,z,.15,h*.4,.15);staticParts.cylinder(p.gold,x,1.44+h*.7,z,.075,h*.3);staticParts.cylinder(p.wood,x,1.44+h,z,.08,.065);
  }
  function runeTile(x,z,color,angle=0){staticParts.frame(x,1.44,z,angle,()=>{
    staticParts.block(p.shade,0,0,0,.36,.07,.34);staticParts.beam(color,[-.1,.08,-.1],[.1,.08,.1],.025);staticParts.beam(color,[-.1,.08,.1],[.1,.08,-.1],.025);
  });}

  // A marked repair pad keeps the machine and its construction parts clear of
  // the east approach. His forward face looks north into the room.
  staticParts.block(p.shade,9,.005,9.6,2.65,.07,2.65);
  for(const xx of [-1,1])staticParts.block(p.gold,9+xx*1.25,.079,9.6,.035,.015,2.5);
  for(const zz of [-1,1])staticParts.block(p.gold,9,.079,9.6+zz*1.25,2.5,.015,.035);
  ring(staticParts,'#d9d3b3',9,.095,9.6,1.02,.025);
  solid(9,0,9.6,2.65,4.1,2.65,'hadrin-golem');
  // Oak bracing, clamps and a loose breast plate make construction legible.
  for(const side of [-1,1]){
    staticParts.block(p.wood,9+side*1.14,.08,10.4,.17,3.75,.2);
    staticParts.beam(iron,[9+side*1.14,.2,10.4],[9+side*.55,1.1,10.4],.085);
    staticParts.block(iron,9+side*1.14,2.75,10.4,.22,.2,.25);
  }
  staticParts.block(p.wood,9,3.7,10.4,2.55,.18,.24);
  for(let i=0;i<10;i++)staticParts.block(p.gold,8.6,2.3+i*.14,10.4,.055,.085,.075);
  staticParts.rock(steel,10,0.32,9.1,.33,.12,.49,.18);bolts(staticParts,10,.33,8.65,.42,.1);
  staticParts.block(p.wood,7.95,.09,10.0,.42,.35,.65);staticParts.block(iron,7.93,.45,10.0,.34,.08,.48);
  staticParts.beam(copper,[7.95,.54,9.8],[8.12,.54,10.15],.08);
  staticParts.rock(p.gold,9.9,.16,10.52,.19,.055,.17);staticParts.rock(p.gold,10.25,.16,10.4,.13,.05,.13);

  const golem=new THREE.Group();golem.name='Unfinished articulated guild golem';golem.position.set(9,.1,9.6);root.add(golem);
  part('Golem: planted legs and open chest',[0,0,0],b=>{
    for(const side of [-1,1]){
      b.block(iron,side*.37,0,-.12,.48,.22,.77);
      b.block(stone,side*.37,.22,0,.34,.60,.39);b.rock(p.gold,side*.37,.88,-.025,.22,.22,.22);
      b.block(steel,side*.37,1.03,0,.36,.54,.42);b.block(copper,side*.37,.34,-.215,.08,.42,.04);
      b.rock(p.gold,side*.37,1.54,0,.23,.24,.23);
      b.block(iron,side*.52,1.7,0,.13,.95,.65);b.block(p.gold,side*.52,1.92,-.34,.07,.12,.07);
      b.rock(p.gold,side*.78,2.47,0,.25,.25,.25);
    }
    b.block(iron,0,1.49,0,1.05,.23,.65);b.block(p.gold,0,1.61,-.35,.6,.12,.06);
    b.block(dark,0,1.78,.15,.88,.88,.3);b.block(steel,0,2.52,.0,1.14,.15,.66);
    // Left armor is fitted; the right half remains open around the mechanism.
    b.block(stone,-.28,1.85,-.25,.4,.67,.25);bolts(b,-.28,2.18,-.39,.25,.47);
    for(const y of [1.86,2.08,2.30])b.beam(copper,[.10,y,-.08],[.48,y,-.08],.055);
    b.cylinder(p.gold,0,2.65,0,.17,.24);
  },golem);
  const core=part('Golem: exposed winding wheel',[.23,2.15,-.31],b=>{
    ring(b,p.gold,0,0,0,.23,.045,true);for(let i=0;i<6;i++){const a=i*Math.PI/3;b.beam(copper,[0,0,0],[Math.cos(a)*.21,Math.sin(a)*.21,0],.035);}b.rock(aqua,0,0,-.03,.08,.08,.06);
  },golem,{glow:true});
  const head=part('Golem: head and lit eyes',[0,2.89,0],b=>{
    b.block(stone,0,-.04,0,.60,.48,.54);b.block(steel,0,.42,0,.64,.10,.58);
    b.block(iron,0,.20,-.28,.42,.12,.04);for(const side of [-1,1])b.block(aqua,side*.12,.235,-.31,.09,.045,.028);
    b.block(p.gold,0,.06,-.29,.21,.045,.03);for(const side of [-1,1])b.rock(p.gold,side*.33,.19,0,.08,.12,.08);
    bolts(b,0,.43,-.30,.46,.025);
  },golem);
  const arms=[];
  for(const side of [-1,1]){
    const shoulder=part(`Golem: ${side<0?'fitted':'unfinished'} upper arm`,[side*.78,2.47,0],b=>{
      b.rock(p.gold,0,0,0,.24,.24,.24);b.block(side<0?stone:iron,-side*.02,-.61,0,.3,.47,.34);
      if(side>0)for(const xx of [-.13,.13])b.beam(copper,[xx,-.08,-.13],[xx,-.62,-.13],.055);
      else b.block(steel,0,-.17,0,.42,.20,.43);
    },golem);
    const forearm=part('Golem: brass elbow and articulated fingers',[0,-.7,0],b=>{
      b.rock(p.gold,0,0,0,.21,.21,.21);b.block(side<0?stone:steel,0,-.53,0,.31,.39,.34);
      b.block(p.gold,0,-.60,0,.32,.08,.35);b.block(iron,0,-.76,-.03,.32,.19,.31);
    },shoulder);
    const fingers=part('Golem: testing fingers',[0,-.80,-.07],b=>{
      for(let j=0;j<3;j++){b.block(steel,-.10+j*.10,-.20,0,.07,.20,.10);b.block(p.gold,-.10+j*.10,-.10,-.055,.07,.045,.045);}
    },forearm);arms.push({shoulder,forearm,fingers});
  }

  // The northern bench is laden with experiments, not copies of a single vial.
  scroll(-3.25,-8.1,-.16);scroll(.15,-7.72,.10);
  for(let i=0;i<4;i++)runeTile(-3.15+i*.43,-8.88,['#8dbba9','#b493bf','#ddbb70','#8ab2cb'][i],i*.07);
  staticParts.block(p.wood,3.15,1.44,-8.7,1.10,.13,.68);
  for(let i=0;i<4;i++)bottle(2.78+i*.25,-8.7,['#7fa49b','#b58e71','#9195bb','#97a37a'][i],.32+i*.06);
  // A keyed lock, spare rings and a miniature pair of levitating boots.
  staticParts.block(copper,2.7,1.44,-7.67,.40,.40,.25);staticParts.block(dark,2.7,1.57,-7.81,.035,.11,.02);
  ring(staticParts,p.gold,3.24,1.49,-7.68,.18,.035);staticParts.beam(p.gold,[3.4,1.50,-7.7],[3.69,1.50,-7.7],.035);
  for(const x of [-.45,-.13]){staticParts.block('#5d4b3b',x,1.44,-8.9,.19,.35,.22);staticParts.block('#5d4b3b',x,1.44,-8.75,.19,.11,.30);staticParts.block(p.gold,x,1.64,-8.77,.15,.045,.035);}

  // Everlight: a brass cradle and suspended many-faceted light. Its brightness
  // comes from its own material, never another dynamic point light.
  staticParts.cylinder(p.shade,1.5,1.44,-8.6,.48,.13);ring(staticParts,p.gold,1.5,1.60,-8.6,.37,.04);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;staticParts.beam(p.gold,[1.5+Math.cos(a)*.35,1.57,-8.6+Math.sin(a)*.35],[1.5+Math.cos(a)*.24,2.05,-8.6+Math.sin(a)*.24],.045);}
  const everlight=part('Everlight: suspended lantern',[1.5,2.30,-8.6],b=>{
    b.rock('#d8eecc',0,0,0,.21,.32,.21);ring(b,p.gold,0,-.33,0,.27,.035);ring(b,p.gold,0,.33,0,.27,.035);
    for(let i=0;i<3;i++){const a=i*Math.PI*2/3;b.beam(p.gold,[Math.cos(a)*.27,-.33,Math.sin(a)*.27],[Math.cos(a)*.27,.33,Math.sin(a)*.27],.035);}
    b.cone(p.gold,0,.35,0,.30,.16);b.rock(p.gold,0,.56,0,.075,.08,.075);
  },root,{glow:true});

  // Mending hammer: a split tablet visibly joins when the tool taps it.
  staticParts.block(p.wood,-1.7,1.44,-8.6,1.22,.10,.85);
  for(let i=0;i<4;i++)staticParts.rock(p.gold,-2.5+i*.17,1.48,-7.75,.045,.03,.045);
  staticParts.beam(copper,[-1.05,1.48,-7.75],[-.8,1.48,-7.92],.035);staticParts.beam(copper,[-.8,1.48,-7.92],[-.62,1.48,-7.74],.035);
  const fragments=[-1,1].map(side=>part('Mending tile half',[-1.7+side*.22,1.55,-8.6],b=>{
    b.block('#a5b1ac',0,0,0,.39,.10,.57);b.block(p.gold,0,.105,0,.18,.015,.035);
  }));
  const hammer=part('Mending hammer',[-1.7,2.30,-8.6],b=>{
    b.block(p.wood,0,-.06,0,.085,.65,.09);b.block(steel,0,-.22,0,.55,.22,.27);b.block(p.gold,0,-.22,0,.08,.24,.29);
  });

  // The second table holds surveying and household enchantments.
  scroll(-9.65,6.55,.15);scroll(-8.0,7.95,-.12);
  for(let i=0;i<3;i++)bottle(-6.65+i*.25,6.58,['#92aa90','#ac92b3','#b9a37b'][i],.35+i*.07);
  staticParts.block(p.wood,-9.55,1.44,7.85,.76,.17,.52);staticParts.block(paper,-9.55,1.49,7.85,.65,.11,.44);
  staticParts.block(p.cloth,-9.55,1.61,7.85,.77,.055,.53);runeTile(-6.2,7.95,aqua,.18);
  staticParts.cylinder(copper,-8.8,1.44,7.2,.48,.13);staticParts.cylinder(p.trim,-8.8,1.57,7.2,.40,.04);
  ring(staticParts,p.gold,-8.8,1.64,7.2,.43,.045);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;staticParts.beam(iron,[-8.8+Math.sin(a)*.29,1.63,7.2+Math.cos(a)*.29],[-8.8+Math.sin(a)*.35,1.63,7.2+Math.cos(a)*.35],.025);}
  const needle=part('Wayfinder: responsive compass needle',[-8.8,1.67,7.2],b=>{
    b.triangle('#a65343',[0,.025,-.34],[-.075,.025,0],[.075,.025,0]);b.triangle(p.gold,[0,.025,.31],[.075,.025,0],[-.075,.025,0]);b.rock('#7dc5d1',0,.10,0,.10,.09,.10);
  });
  staticParts.cylinder(p.gold,-7.1,1.44,7.2,.22,.08);staticParts.cylinder(copper,-7.1,1.52,7.2,.08,.16);
  staticParts.cylinder(copper,-7.1,1.67,7.2,.27,.30);ring(staticParts,'#c0cbc5',-7.1,1.98,7.2,.28,.035);
  staticParts.cylinder('#477f8a',-7.1,1.972,7.2,.225,.01);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;staticParts.rock(aqua,-7.1+Math.cos(a)*.43,1.49,7.2+Math.sin(a)*.43,.045,.04,.045);}
  staticParts.cylinder(iron,-6.35,1.44,7.45,.31,.12);staticParts.cylinder('#6c9ca3',-6.35,1.565,7.45,.25,.01);
  const cupWater=part('Rainkeeper cup: a held bead of water',[-7.1,2.22,7.2],b=>{
    b.rock('#a5dfdb',0,0,0,.07,.11,.07);
  },root,{glow:true});

  const conveniences=createHadrinConveniences({palette:p,staticParts,part,ring,solid});
  const staticMesh=finish(staticParts,root);
  const pulse=(id)=>active===id?Math.sin(Math.min(1,(time-start)/durations[id])*Math.PI):0;
  function update(next){
    if(Number.isFinite(next))time=next;
    if(active&&time-start>=durations[active])active=null;
    const go=pulse('golem');
    head.rotation.y=Math.sin(time*.45)*.07+go*.34;head.rotation.x=-go*.11;
    arms[0].shoulder.rotation.x=.04+go*.95;arms[0].forearm.rotation.x=.05+go*.55;
    arms[0].fingers.rotation.x=.55-go*.55;arms[0].fingers.scale.x=1+go*.60;
    arms[0].shoulder.rotation.z=Math.sin(time*.55)*.035-go*.12;
    arms[1].shoulder.rotation.x=.025+Math.max(0,Math.sin(time*.65))*.08;
    arms[1].fingers.rotation.x=.55-go*.30;
    arms[1].forearm.rotation.x=.06+go*.25;core.rotation.z=time*.22+go*2;core.scale.setScalar(1+go*.08);
    everlight.position.y=2.30+Math.sin(time*.7)*.06+pulse('everlight')*.28;everlight.rotation.y=time*.18;
    everlight.children[0].material.emissiveIntensity=.4+pulse('everlight')*1.3;
    const mend=pulse('mending-hammer'),tap=active==='mending-hammer'?Math.max(0,Math.sin((time-start)*6))*mend:Math.pow(Math.max(0,Math.sin(time*1.1)),12);
    hammer.position.y=2.30-tap*.44;hammer.rotation.z=-.12+tap*.12;
    fragments.forEach((q,i)=>q.position.x=-1.7+(i===0?-1:1)*(.22-mend*.025));
    needle.rotation.y=active==='wayfinder'?Math.sin((time-start)*3)*pulse('wayfinder')*2.1:Math.sin(time*.25)*.035;
    const fill=pulse('rainkeeper-cup');cupWater.position.y=2.22+Math.sin(time*.8)*.025+fill*.06;
    conveniences.update(time,{polishing:pulse('armor'),sorting:pulse('broom')});
  }
  update(0);
  return {root,update,
    demonstrate(id){if(!Object.hasOwn(durations,id))return false;active=id;last=id;start=time;count++;return true;},
    workshopState:()=>({demonstration:{id:active??last,active:!!active,elapsed:last?Math.min(durations[last],Math.max(0,time-start)):0,count},golem:{headYaw:head.rotation.y,armLift:arms[0].shoulder.rotation.x,fingerSpread:arms[0].fingers.scale.x,corePulse:core.scale.x},conveniences:conveniences.state(),objects:objects.map(o=>({...o})),movingMeshes:parts.length}),
    dispose(){root.removeFromParent();for(const m of parts)m.geometry.dispose();staticMesh.geometry.dispose();materials.add(staticMesh.material);for(const m of materials){m.dispose();ownedMaterials.delete(m);}},
  };
}

