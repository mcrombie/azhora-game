import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {STILLROOM_PALETTE} from './chamber.js';
import {buildArrivalDoor} from './arrival-door.js';

// One merged refuge, a mist floor and a few luminous accents. No landscape
// streaming, volumetric effects, shadow-map updates or per-object physics.
export function createArrivalScenery(scene){
  const p=STILLROOM_PALETTE,root=new THREE.Group();root.name='The refuge between ages';scene.add(root);
  scene.background=new THREE.Color(p.mist);scene.fog=new THREE.Fog(p.mist,24,90);
  const b=createSceneryBuilder('The Stillroom refuge'),colliders=[],owned=[];
  const wood='#644b38',dark='#303e40',gold='#bba06c',cream='#e8ddbf',stone='#c4b7a0',teal='#365e60';
  const solid=(x,z,hx,hz,maxY=7)=>colliders.push({x,z,hx,hz,minY:0,maxY,kind:'stillroom-refuge'});
  const box=(c,x,y,z,w,h,d)=>b.block(c,x,y,z,w,h,d);
  const wall=(x,z,w,d,h=7)=>{box(stone,x,0,z,w,h,d);solid(x,z,w/2,d/2,h);};
  // A broad open front and two generous aisles make the interior comfortable
  // for a third-person camera. The door has an unobstructed central approach.
  box(cream,0,-.06,34,17,.06,19);box('#bcbcae',0,-.018,22,5,.018,6);
  for(let z=26;z<43;z+=1.05)for(let x=-7.5;x<8;x+=1.02)box((Math.round(z+x)%3)?'#b7a17f':'#c4b08e',x,0,z,.99,.018,1);
  for(const x of [-7.8,7.8]){wall(x,34,.45,18);box(wood,x,0,34,.54,.5,18);for(const z of [25.2,30,36,42.8]){box(cream,x,0,z,.8,.3,.8);box(wood,x,.3,z,.35,6.8,.4);box(gold,x,6.4,z,.6,.16,.6);}}
  wall(0,43,16,.45);wall(-5.8,25,4,.45);wall(5.8,25,4,.45);
  // Recessed stained-glass niches and carved bands break up the broad facade.
  for(const x of [-5.9,5.9]){
    box(dark,x,2.1,24.75,1.7,2.65,.08);
    for(const dx of [-.48,.48])for(const y of [2.2,3.45])box(y<3?'#aabeaa':'#c5b67d',x+dx,y,24.69,.68,1.1,.04);
    for(const dx of [-.94,0,.94])box(dx?cream:gold,x+dx,2,24.62,.14,2.95,.18);
    for(const y of [1.9,3.4,4.85])box(cream,x,y,24.6,2.15,.14,.24);
    b.triangle(cream,[x-1.12,5,24.64],[x,5.8,24.64],[x+1.12,5,24.64]);
    for(const y of [.8,5.95])box(cream,x,y,24.66,3.8,.16,.26);
  }
  box(wood,0,6.5,25,16,.5,.5);
  for(const z of [25,31,37,43]){
    b.beam(wood,[-8,6.6,z],[0,10.2,z],.22);b.beam(wood,[0,10.2,z],[8,6.6,z],.22);
    b.beam(wood,[-7.8,6.6,z],[7.8,6.6,z],.18);
    for(const s of [-1,1])b.beam(wood,[s*7.5,4.9,z],[s*5.5,6.6,z],.15);
  }
  b.roof(teal,0,7.05,34,17.5,19.5,3.5,0,stone);
  b.beam(gold,[0,10.6,24.1],[0,10.6,43.9],.12);
  // Deep front portico and small turrets, with an unmistakable stopped dial.
  for(const x of [-4.2,4.2]){
    box(cream,x,0,23.5,.9,.24,.9);b.cylinder(stone,x,.24,23.5,.32,5.6);b.cylinder(gold,x,5.7,23.5,.5,.18);
    solid(x,23.5,.42,.42,6);
  }
  b.roof(teal,0,5.9,24.3,10,4.5,1.8);b.beam(gold,[0,7.75,22],[0,7.75,26.5],.1);
  for(const x of [-6.7,6.7]){
    b.cylinder(stone,x,6.8,40.8,1.25,3.4);b.cylinder(cream,x,9.9,40.8,1.36,.26);
    b.cone(teal,x,10.15,40.8,1.65,2.7);b.rock(gold,x,13.05,40.8,.13,.3,.13);
  }
  const arc=(c,cx,cy,z,r,start,end,n,w=.08)=>{for(let i=0;i<n;i++){const a=start+(end-start)*i/n,d=start+(end-start)*(i+1)/n;b.beam(c,[cx+Math.cos(a)*r,cy+Math.sin(a)*r,z],[cx+Math.cos(d)*r,cy+Math.sin(d)*r,z],w);}};
  arc(gold,0,8.5,24.15,1.1,0,Math.PI*2,48,.12);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;b.beam(gold,[Math.sin(a)*.88,8.5+Math.cos(a)*.88,24.1],[Math.sin(a)*1.01,8.5+Math.cos(a)*1.01,24.1],.06);}
  b.beam(gold,[0,8.5,24.08],[.52,8.88,24.08],.08);b.beam(gold,[0,8.5,24.08],[-.3,9.3,24.08],.055);
  // Central runner and a brass meridian lead directly to the portal.
  box(teal,0,.025,32.5,3.6,.025,16);for(const x of [-1.7,1.7])box(gold,x,.052,32.5,.045,.01,16);
  for(let i=0;i<32;i++){const a=i*Math.PI/16,c=(i+1)*Math.PI/16;b.beam(gold,[Math.sin(a)*2.4,.06,34+Math.cos(a)*2.4],[Math.sin(c)*2.4,.06,34+Math.cos(c)*2.4],.035);}
  const door=buildArrivalDoor(b,root);
  for(const x of [-2.49,2.49])solid(x,40.6,.44,.5);
  solid(0,40.65,2.2,.18,7);
  // Sitting area: two high backed chairs, a real alcove hearth and tea table.
  box(dark,-6.65,0,33.2,1.5,3.3,3.6);box(cream,-6.5,0,33.2,1.6,.2,4);
  for(const z of [31.4,35])box(stone,-6.1,.2,z,1,2.8,.4);
  box(cream,-6.3,2.9,33.2,1.9,.28,4);box(stone,-6.7,3.2,33.2,1.3,3.8,2);
  solid(-6.5,33.2,1,2);
  for(const z of [32.6,33.5])b.beam(wood,[-6.15,.15,z-.4],[-5.8,.35,z+.4],.18);
  const chair=(x,z,yaw)=>{b.frame(x,0,z,yaw,()=>{for(const a of [-.55,.55])for(const d of [-.5,.5])box(wood,a,0,d,.12,.65,.12);box('#9e7250',0,.6,0,1.3,.3,1.2);box(wood,0,.7,.55,1.4,1.5,.18);box('#a87750',0,.85,.43,1.1,1.1,.12);for(const a of [-.64,.64])box(wood,a,.9,0,.14,.15,1.2);});solid(x,z,.8,.8,2.3);};
  chair(-4.2,30.1,Math.PI);chair(-4.2,36.2,0);
  b.cylinder(wood,-4.1,0,33.1,.12,.72);b.cylinder(wood,-4.1,.72,33.1,.8,.12);solid(-4.1,33.1,.8,.8,1);
  b.cylinder(cream,-4.3,.85,33,.13,.16);b.cylinder(gold,-3.85,.84,33.3,.19,.27);
  // Library and workbench: varied books, charts, brass instruments and luggage.
  for(const z of [29,33,37]){
    box(wood,7.15,0,z,.55,3.4,2.8);solid(7,z,.6,1.4,3.5);
    for(let row=0;row<4;row++){
      box('#9d7852',6.85,.25+row*.8,z,1,.09,2.9);
      for(let i=0;i<9;i++){const color=['#6a4240','#4d6c64','#b79d68','#415164'][i%4];box(color,6.72,.34+row*.8,z-1.12+i*.27,.48,.38+(i%3)*.12,.19);box(gold,6.468,.43+row*.8,z-1.12+i*.27,.012,.025,.17);}
    }
  }
  box(wood,4.6,1.05,39.2,3.2,.16,1.7);for(const x of [3.3,5.9])for(const z of [38.6,39.8])box(wood,x,0,z,.15,1.05,.15);solid(4.6,39.2,1.7,.95,1.3);
  box(cream,4.4,1.22,39.2,1.45,.02,.9);for(let i=0;i<5;i++)box('#827c63',4.3,1.245,38.9+i*.12,.7,.009,.012);
  b.cylinder(gold,5.6,1.2,39.2,.18,.08);b.cylinder(cream,5.6,1.28,39.2,.06,.45);
  for(let i=0;i<3;i++){box(wood,-5.4,0,40+i*.55,2,.65,.5);for(const x of [-6,-4.8])box(gold,x,.02,40+i*.55,.07,.66,.52);solid(-5.4,40+i*.55,1,.28,.8);}
  // Armillary sphere and stopped hourglass on pedestals.
  for(const x of [-3.8,3.8]){b.cylinder(stone,x,0,27.6,.48,1.1);b.cylinder(gold,x,1.1,27.6,.58,.1);solid(x,27.6,.6,.6,2.5);}
  for(const y of [1.25,2.5])b.cylinder(gold,-3.8,y,27.6,.4,.08);
  for(const x of [-4.12,-3.48])b.cylinder(gold,x,1.3,27.6,.035,1.2);
  b.cone('#d5e0cf',-3.8,1.4,27.6,.31,.5);b.rock('#d5e0cf',-3.8,2.15,27.6,.3,.4,.3);
  for(const angle of [0,Math.PI/3,-Math.PI/3])b.frame(3.8,1.95,27.6,angle,()=>arc(gold,0,0,0,.68,0,Math.PI*2,32,.035));
  b.rock('#7b9e96',3.8,1.95,27.6,.3,.3,.3);
  const architecture=b.finish(root,{castShadow:false});owned.push(architecture.geometry);
  const floorGeometry=new THREE.PlaneGeometry(600,600),floorMaterial=new THREE.MeshStandardMaterial({color:p.floor,roughness:1});
  const floor=new THREE.Mesh(floorGeometry,floorMaterial);floor.rotation.x=-Math.PI/2;floor.position.y=-.012;root.add(floor);owned.push(floorGeometry,floorMaterial);
  const fireGeometry=new THREE.IcosahedronGeometry(1,0),fireMaterial=new THREE.MeshBasicMaterial({color:'#ffd895'});
  for(let i=0;i<5;i++){const flame=new THREE.Mesh(fireGeometry,fireMaterial);flame.position.set(-5.99,.5,32.5+i*.33);flame.scale.set(.22,.35+(.5-Math.abs(i-2)*.15),.2);root.add(flame);}owned.push(fireGeometry,fireMaterial);
  const hearth=new THREE.PointLight('#ffd49a',9,9,1.5);hearth.position.set(-5.1,1.7,33.2);root.add(hearth);
  const sky=new THREE.HemisphereLight('#e3eff0','#7b8176',1.7),sun=new THREE.DirectionalLight('#ffefd7',2);sun.position.set(-12,20,5);root.add(sky,sun);
  function canMove(from,x,z,r=.42){
    const radius=Math.hypot(x,z);if(radius>85){x*=85/radius;z*=85/radius;}
    const blocked=(x,z)=>colliders.some(c=>Math.hypot(Math.max(0,Math.abs(x-c.x)-c.hx),Math.max(0,Math.abs(z-c.z)-c.hz))<r);
    const dx=x-from.x,dz=z-from.z,n=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.2));let px=from.x,pz=from.z;
    for(let i=0;i<n;i++){const nx=px+dx/n,nz=pz+dz/n;if(!blocked(nx,nz)){px=nx;pz=nz;}else if(!blocked(nx,pz))px=nx;else if(!blocked(px,nz))pz=nz;}return {x:px,z:pz};
  }
  return {root,colliders,portal:{x:0,z:38.8},spawn:{x:0,z:12},taleth:{x:3,z:24},canMove,
    state:()=>({buildings:1,vertices:b.vertexCount,colliders:colliders.length,portal:{x:0,z:38.8},mist:{near:24,far:90}}),
    dispose(){root.removeFromParent();door.dispose();for(const item of owned)item.dispose();},
  };
}
