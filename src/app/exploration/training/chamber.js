import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';

export const STILLROOM_PALETTE=Object.freeze({
  mist:'#dce5e5',floor:'#d9e1df',stone:'#e1dbc7',trim:'#f0e9d5',
  shade:'#b6beb8',roof:'#29494b',gold:'#b5a26c',light:'#d9f6ef',
});

/** A small return pavilion in a seemingly boundless, empty mist field.
 * This is a separate training scene: no terrain loading, sky clock or world AI.
 * Positions are local metres; actors and lesson props belong to the controller.
 */
export function createTrainingScenery(scene){
  const p=STILLROOM_PALETTE,root=new THREE.Group();root.name='The Stillroom';scene.add(root);
  const previous={background:scene.background,fog:scene.fog};
  const background=new THREE.Color(p.mist),fog=new THREE.Fog(p.mist,24,90);
  scene.background=background;scene.fog=fog;
  // Keep the return building behind the entire lesson camera orbit. Its bounds
  // also let the camera shorten its boom safely when the player approaches it.
  const pavilionOffset=18;
  const portal={x:0,z:15+pavilionOffset},spawn={x:0,z:6},taleth={x:3.8,z:1},portalRadius=2.8;
  const cameraBounds={minX:-4.8,maxX:4.8,minY:0,maxY:8.6,minZ:31.2,maxZ:39.4};
  const geometries=[],materials=[],colliders=[];
  const b=createSceneryBuilder('Stillroom return pavilion');
  const solid=(x,z,hx,hz)=>colliders.push({x,z:z+pavilionOffset,hx,hz,minY:0,maxY:6,kind:'training-pavilion'});
  const box=(color,x,y,z,w,h,d)=>b.block(color,x,y,z,w,h,d);

  // The floor continues well past both the fog and the generous movement limit.
  // It has no visible edge, expensive transparency layers or particle simulation.
  const groundGeometry=new THREE.PlaneGeometry(600,600);
  const groundMaterial=new THREE.MeshStandardMaterial({color:p.floor,roughness:1,metalness:0});
  const floor=new THREE.Mesh(groundGeometry,groundMaterial);floor.name='Mist field';
  floor.rotation.x=-Math.PI/2;floor.position.y=-.012;floor.receiveShadow=true;root.add(floor);
  geometries.push(groundGeometry);materials.push(groundMaterial);

  // A single familiar landmark. Its small paved approach leads through an open
  // portico to the luminous door; everything outside that approach stays empty.
  box(p.shade,0,-.04,17,9.2,.055,8.1);
  box(p.trim,0,-.025,16.7,8.7,.05,7.9);
  box('#cbd4d0',0,-.005,11.5,3.1,.025,3);
  for(const z of [10.2,11.5,12.8])box(p.trim,0,.023,z,2.85,.008,1.12);
  for(const x of [-1.48,1.48])box(p.gold,x,.033,11.5,.025,.008,3.9);

  for(const s of [-1,1]){
    box(p.stone,s*3.65,0,17.4,.6,5.65,6.8);solid(s*3.65,17.4,.3,3.4);
    box(p.trim,s*3.65,.1,17.4,.8,.18,7);
    box(p.shade,s*3.31,.45,18.2,.07,.09,4.5);
    for(const z of [14,19.9]){
      box(p.trim,s*3.65,0,z,1,.26,1);
      box(p.trim,s*3.65,.24,z,.74,5.3,.74);
      box(p.gold,s*3.65,5.19,z,.86,.1,.86);
      box(p.trim,s*3.65,5.3,z,1,.29,1);
    }
    // Tall narrow side recesses echo the Guild's windows without another room.
    box(p.roof,s*3.961,2.2,17.7,.012,2.15,1.2);
    for(const z of [17.06,18.34])box(p.trim,s*3.985,2.1,z,.03,2.35,.1);
    box(p.gold,s*3.99,3.22,17.7,.04,.07,1.25);
    // The doorway has a broad approach; piers never obstruct its centre.
    box(p.stone,s*2.77,0,17.95,1.24,5.65,.5);solid(s*2.77,17.95,.62,.25);
    box(p.trim,s*1.95,0,17.58,.32,4.95,.5);
    box(p.gold,s*1.72,.05,17.49,.04,4.8,.08);
  }
  box(p.stone,0,0,20.55,7.9,5.65,.55);solid(0,20.55,3.95,.275);
  box(p.shade,0,0,18.13,3.8,5.2,.25);solid(0,18.13,1.9,.125);
  box(p.trim,0,4.83,17.58,4.3,.33,.5);
  box(p.stone,0,5.12,17.95,4.5,.54,.5);
  box(p.trim,0,5.56,17.3,8.75,.25,7.4);
  box(p.gold,0,5.78,17.3,8.9,.065,7.5);

  // Low hipped roof rather than a second tower: one quiet, readable silhouette.
  const a=[-4.55,5.86,13.45],c=[4.55,5.86,13.45],d=[4.55,5.86,21.15],e=[-4.55,5.86,21.15];
  const r0=[0,7.75,16.1],r1=[0,7.75,18.5];
  b.sheet(p.roof,a,e,r1,r0);b.sheet(p.roof,c,r0,r1,d);
  b.triangle(p.roof,a,r0,c);b.triangle(p.roof,e,d,r1);
  b.beam(p.gold,r0,r1,.11);
  b.cylinder(p.gold,0,7.7,17.3,.045,.65);
  b.rock(p.gold,0,8.4,17.3,.11,.15,.11);

  // A stopped hourglass over the entrance identifies Taleth's sanctuary.
  const emblemZ=17.57,emblemY=5.37;
  for(const s of [-1,1]){
    b.beam(p.gold,[-.29,emblemY+s*.19,emblemZ],[.29,emblemY+s*.19,emblemZ],.04);
    b.beam(p.gold,[s*.24,emblemY-.17,emblemZ],[-s*.24,emblemY+.17,emblemZ],.035);
  }
  const architecture=b.finish(root,{castShadow:true});
  if(architecture){architecture.position.z=pavilionOffset;geometries.push(architecture.geometry);}

  // A softly luminous door is one opaque plane, cheap even from close up.
  const doorGeometry=new THREE.PlaneGeometry(3.32,4.72);
  const doorMaterial=new THREE.MeshBasicMaterial({color:p.light});
  const door=new THREE.Mesh(doorGeometry,doorMaterial);door.name='Return to the Wizard\'s Tower';
  door.rotation.y=Math.PI;door.position.set(0,2.4,17.46+pavilionOffset);root.add(door);
  geometries.push(doorGeometry);materials.push(doorMaterial);
  const sky=new THREE.HemisphereLight(0xf1f5f2,0x839798,2);root.add(sky);
  const sun=new THREE.DirectionalLight(0xfff0da,2.1);sun.position.set(-14,28,12);
  sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-22,right:22,top:25,bottom:-16,near:1,far:65});
  sun.shadow.bias=-.0004;sun.shadow.normalBias=.035;sun.shadow.radius=3;root.add(sun,sun.target);

  const limit=96;
  const blocked=(x,z,r)=>colliders.some(q=>Math.hypot(Math.max(0,Math.abs(x-q.x)-q.hx),Math.max(0,Math.abs(z-q.z)-q.hz))<r);
  /** Returns a sliding/clamped {x,z}, not a boolean. Substeps stop fast movement
   * crossing the pavilion walls; the distant limit is entirely within the fog. */
  function canMove(from,x,z,r=.5){
    if(!Number.isFinite(x)||!Number.isFinite(z))return {x:from.x,z:from.z};
    let px=from.x,pz=from.z;
    const length=Math.hypot(x,z),radius=Math.max(.05,Math.min(2,r));
    if(length>limit-radius){x*=(limit-radius)/length;z*=(limit-radius)/length;}
    const dx=x-px,dz=z-pz,steps=Math.min(600,Math.max(1,Math.ceil(Math.hypot(dx,dz)/.3)));
    for(let i=0;i<steps;i++){
      const nx=px+dx/steps,nz=pz+dz/steps;
      if(!blocked(nx,nz,radius)){px=nx;pz=nz;}
      else if(!blocked(nx,pz,radius))px=nx;
      else if(!blocked(px,nz,radius))pz=nz;
    }
    return {x:px,z:pz};
  }
  let disposed=false;
  return {root,portal,portalRadius,spawn,taleth,colliders,cameraBounds,heightAt:()=>0,canMove,update(){},
    state:()=>({name:'The Stillroom',portal:{...portal},spawn:{...spawn},taleth:{...taleth},
      mist:{near:fog.near,far:fog.far},radius:limit,staticDraws:3,vertices:b.vertexCount,buildings:1}),
    dispose(){
      if(disposed)return;disposed=true;root.removeFromParent();
      for(const geometry of geometries)geometry.dispose();
      for(const material of materials)material.dispose();
      sun.shadow.dispose();
      if(scene.background===background)scene.background=previous.background;
      if(scene.fog===fog)scene.fog=previous.fog;
    },
  };
}
