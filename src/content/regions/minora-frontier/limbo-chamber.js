import * as THREE from 'three';
import {TOWER} from '../../../app/exploration/tower-state.js';

// Original provisional staging, not manuscript text or a canonical adaptation.
// This room occupies a separate space behind the same world-interface adapter.
export const LIMBO_SPAWN={x:TOWER.x,y:TOWER.y,z:TOWER.z+5};
export const REAPER_SPOT={x:TOWER.x,y:TOWER.y,z:TOWER.z-1};
export function createLimboChamber(parent){
  const root=new THREE.Group();root.name='The room between departures';root.position.set(TOWER.x,TOWER.y,TOWER.z);parent.add(root);
  const materials=new Map(),geometries=new Set(),colliders=[];
  const mat=c=>{if(!materials.has(c))materials.set(c,new THREE.MeshStandardMaterial({color:c,flatShading:true,roughness:.8}));return materials.get(c);};
  function shape(g,c,x,y,z){geometries.add(g);const m=new THREE.Mesh(g,mat(c));m.position.set(x,y,z);root.add(m);return m;}
  function box(c,x,y,z,w,h,d,solid=false){const m=shape(new THREE.BoxGeometry(w,h,d),c,x,y+h/2,z);if(solid)colliders.push({x:TOWER.x+x,z:TOWER.z+z,hx:w/2,hz:d/2,minY:TOWER.y+y,maxY:TOWER.y+y+h,kind:'tower-furnishing'});return m;}
  box(0x293544,0,-.5,0,24,.5,24);
  box(0x465562,0,.01,2,4,.035,19);
  for(let x=-10;x<=10;x+=2)for(let z=-10;z<=10;z+=2)if(Math.abs(x)>2)box((x+z)%4?0x344552:0x394957,x,.01,z,1.94,.025,1.94);
  for(const x of [-11,11])for(const z of [-10,-4,2,8]){
    shape(new THREE.CylinderGeometry(.4,.65,8,6),0x84939a,x,4,z);
    box(0xbdab80,x,7.5,z,1.1,.25,1.1);
  }
  box(0x1b2534,0,0,-11.7,24,10,.6,true);
  // An enormous stopped pendulum and open arches give the room impossible scale.
  shape(new THREE.TorusGeometry(3.3,.12,5,32),0xc4b486,0,6,-11.25);
  box(0xd5c9a4,0,3,-11.05,.08,4.8,.06);
  shape(new THREE.IcosahedronGeometry(.55,0),0xb9cbd0,0,3,-11);
  for(const x of [-7,7]){
    for(const side of [-1,1])box(0x71858e,x+side*1.7,0,-9,.5,6,.7);
    box(0xd4c093,x,5.8,-9,4,.45,.8);
    const pane=box(0x6c9b9e,x,.15,-9.1,2.9,5.5,.06);pane.material=new THREE.MeshBasicMaterial({color:x<0?0x55717e:0x847180});materials.set('arch'+x,pane.material);
  }
  // A spare waiting bench, a ledger, and a single unclaimed place at the desk.
  for(const x of [-7,7]){box(0x524858,x,0,5,3,.65,1.2,true);box(0x726875,x,.65,5.5,3,1.1,.2);}
  box(0x342d40,0,0,-3,5,1.2,1.8,true);box(0xbca77f,0,1.2,-3,5.3,.15,2);
  const book=box(0xdbd1b0,.6,1.37,-2.8,1.1,.12,.8);book.rotation.y=.2;
  // A human skull above a closed, floor-length cloak with sleeved arms.
  // These are provisional, original shapes; no manuscript appearance is asserted.
  const reaper=new THREE.Group();reaper.name='The Grim Reaper';reaper.position.set(0,0,-1);reaper.scale.setScalar(.86);root.add(reaper);
  const part=(g,c,x,y,z)=>{const m=shape(g,c,0,0,0);root.remove(m);m.position.set(x,y,z);reaper.add(m);return m;};
  const bone=0xd4c9a7,joint=0xb7ad91,socket=0x161921,cloth=0x242333;
  function segment(a,b,r=.045,c=bone,parent=reaper){
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),direction=end.clone().sub(start);
    const m=part(new THREE.CylinderGeometry(r*.82,r,direction.length(),5),c,0,0,0);
    if(parent!==reaper){reaper.remove(m);parent.add(m);}
    m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());return m;
  }
  function facet(x,y,z,sx,sy,sz,c=bone,parent=reaper){
    const m=part(new THREE.IcosahedronGeometry(1,0),c,x,y,z);m.scale.set(sx,sy,sz);
    if(parent!==reaper){reaper.remove(m);parent.add(m);}return m;
  }
  // Closed angular cloth below the skull; only the face and fingertips remain exposed.
  function drape(rows,c,span=2.55){
    const vertices=[],indices=[],steps=10;
    rows.forEach(([y,rx,rz,z])=>{for(let i=0;i<=steps;i++){const a=-span+i*span*2/steps;vertices.push(Math.sin(a)*rx,y,z-Math.cos(a)*rz);}});
    for(let row=0;row<rows.length-1;row++)for(let i=0;i<steps;i++){const a=row*(steps+1)+i,b=a+steps+1;indices.push(a,b,a+1,a+1,b,b+1);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const m=part(geometry,c,0,0,0);m.material.side=THREE.DoubleSide;return m;
  }
  const cloak=drape([[.04,.73,.55,.02],[.76,.58,.47,.02],[1.55,.47,.44,.02],[2.06,.59,.43,.01],[2.25,.23,.29,.08]],cloth,Math.PI);cloak.name='Closed Reaper cloak';
  // The hood forms an actual opening around the skull, with a raised crown.
  drape([[2.12,.43,.34,.02],[2.56,.59,.39,.04],[2.94,.43,.32,.03],[3.08,.08,.08,-.09]],0x1c1d2b,2.38);
  for(const s of [-1,1]){
    const lapel=part(new THREE.BoxGeometry(.105,.68,.09),0x393748,s*.35,1.88,.29);lapel.rotation.z=s*.2;
    segment([s*.34,2.05,.15],[s*.12,2.12,.22],.07,cloth);
  }
  // Faceted cranium, separate cheekbones and jaw frame deep dark eye sockets.
  const cranium=part(new THREE.IcosahedronGeometry(1,1),bone,0,2.64,.18);cranium.scale.set(.355,.395,.3);
  for(const s of [-1,1]){
    const eye=part(new THREE.IcosahedronGeometry(1,1),socket,s*.155,2.64,.43);eye.scale.set(.12,.13,.052);
    const brow=part(new THREE.BoxGeometry(.25,.068,.095),bone,s*.15,2.766,.44);brow.rotation.z=s*.11;
    facet(s*.25,2.48,.415,.105,.082,.09);
    segment([s*.26,2.48,.38],[s*.2,2.285,.35],.044);
    segment([s*.2,2.285,.35],[s*.12,2.26,.47],.044);
  }
  const nose=part(new THREE.ConeGeometry(.065,.15,3),socket,0,2.495,.489);nose.rotation.z=Math.PI;
  part(new THREE.BoxGeometry(.32,.075,.085),bone,0,2.395,.43);
  part(new THREE.BoxGeometry(.27,.063,.085),bone,0,2.27,.47);
  part(new THREE.BoxGeometry(.28,.071,.025),socket,0,2.33,.469);
  for(let i=0;i<6;i++){
    part(new THREE.BoxGeometry(.035,.047,.045),0xe3d9bc,(i-2.5)*.045,2.367,.485);
    part(new THREE.BoxGeometry(.032,.033,.04),bone,(i-2.5)*.041,2.3,.496);
  }
  // One hand loosely addresses the visitor; the other curls around the scythe.
  const arm=new THREE.Group();arm.position.set(-.43,2.02,.08);reaper.add(arm);
  segment([0,0,0],[-.2,-.34,.06],.19,cloth,arm);facet(-.2,-.35,.06,.17,.17,.17,cloth,arm);
  segment([-.2,-.35,.06],[-.17,-.68,.25],.15,cloth,arm);
  facet(-.17,-.69,.265,.085,.105,.04,bone,arm);
  for(let i=0;i<4;i++){
    const x=-.23+i*.037,tip=-.85-Math.sin(i/3*Math.PI)*.045;
    segment([x,-.74,.27],[x,tip,.3],.018,bone,arm);segment([x,tip,.3],[x+.009,tip-.065,.34],.016,bone,arm);
  }
  segment([-.105,-.65,.27],[-.075,-.73,.32],.021,bone,arm);
  segment([.44,2.04,.07],[.69,1.77,.09],.19,cloth);facet(.69,1.77,.09,.17,.17,.17,cloth);
  segment([.69,1.77,.09],[.86,1.98,.12],.14,cloth);
  facet(.86,2.035,.155,.068,.11,.055);
  for(let i=0;i<4;i++){
    const y=1.97+i*.046;segment([.85,y,.2],[.955,y,.18],.018);segment([.955,y,.18],[.968,y,.085],.018);
  }
  part(new THREE.CylinderGeometry(.055,.07,3.8,6),0x7b6855,.9,1.9,.1);
  const blade=part(new THREE.ConeGeometry(.22,1.55,3),0xc7d5d5,.22,3.5,.1);blade.rotation.z=Math.PI/2;
  colliders.push({x:REAPER_SPOT.x,z:REAPER_SPOT.z,r:.68,minY:TOWER.y,maxY:TOWER.y+3.3,kind:'reaper'});
  for(const [x,c] of [[-6,0x96d3dc],[6,0xd9b0d3]]){const l=new THREE.PointLight(c,70,20,2);l.position.set(x,4,1);root.add(l);}
  return {root,colliders,update(time,player){reaper.rotation.y=Math.max(-.45,Math.min(.45,Math.atan2(player.x-REAPER_SPOT.x,player.z-REAPER_SPOT.z)));arm.rotation.x=.1+Math.sin(time*.7)*.1;},
    dispose(){root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials.values())m.dispose();}};
}
