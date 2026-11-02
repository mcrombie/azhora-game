import * as THREE from 'three';
import {TOWER} from '../../../app/exploration/tower-state.js';
import {createGuildLandingSign} from './guild-landing-signs.js';
import {TOWER_FLOORS,TOWER_ROOM_HALF_WIDTH,TOWER_STAIR,TOWER_STAIR_MIN,TOWER_STAIR_MAX,towerStairHeight,createTowerFloorSupport} from './tower-floor-layout.js';

// A single shared stair mesh and compact rail meshes avoid one draw call per
// tread. All coordinates are local to the chamber root at TOWER.
export function createTowerStaircase(parent){
  const root=new THREE.Group();root.name='The guild spiral staircase';parent.add(root);
  const materials=[],geometries=[],textures=[],s=TOWER_STAIR,TAU=Math.PI*2;
  const material=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.8,flatShading:true,...extra});materials.push(m);return m;};
  const stone=material('#9b9985'),tread=material('#d3c9aa'),brass=material('#b99854',{metalness:.35}),dark=material('#465356'),trim=material('#ded5b7');
  function mesh(g,m){const result=new THREE.Mesh(g,m);geometries.push(g);root.add(result);return result;}
  function box(x,y,z,w,h,d,m){const result=mesh(new THREE.BoxGeometry(w,h,d),m);result.position.set(x,y+h/2,z);return result;}
  function geometry(positions){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();return g;}
  const positions=[];
  const tri=(list,a,b,c)=>list.push(...a,...b,...c),quad=(list,a,b,c,d)=>{tri(list,a,b,c);tri(list,a,c,d);};
  // The sealed bottom and top landings also need paving on their gated side.
  const landingSteps=Math.ceil(s.landingAngle/TAU*s.steps);
  for(let step=TOWER_STAIR_MIN*s.steps-landingSteps;step<TOWER_STAIR_MAX*s.steps+landingSteps;step++){
    const p=step/s.steps,q=(step+1)/s.steps,a=Math.PI+p*TAU,b=Math.PI+q*TAU,
      y=(towerStairHeight(p)+towerStairHeight(q))/2-TOWER.y,low=y-.27;
    const point=(angle,r,h)=>[s.x+Math.cos(angle)*r,h,Math.sin(angle)*r];
    const top=[point(a,s.inner,y),point(a,s.outer,y),point(b,s.outer,y),point(b,s.inner,y)],bottom=top.map(v=>[v[0],low,v[2]]);
    quad(positions,top[3],top[2],top[1],top[0]);quad(positions,...bottom);
    for(let j=0;j<4;j++)quad(positions,bottom[j],bottom[(j+1)%4],top[(j+1)%4],top[j]);
  }
  // Fill only the gap between each room and the stair's actual polygon edge.
  // A rectangular landing used to cover both surfaces at the same height,
  // causing the striped flicker visible whenever the camera moved past a door.
  for(const floor of TOWER_FLOORS)for(let i=0;i<s.steps;i++){
    const a=Math.PI+i/s.steps*TAU,b=Math.PI+(i+1)/s.steps*TAU;
    if(Math.cos((a+b)/2)>=0)continue;
    const ax=s.x+Math.cos(a)*s.outer,az=Math.sin(a)*s.outer,
      bx=s.x+Math.cos(b)*s.outer,bz=Math.sin(b)*s.outer;
    const z0=Math.max(-1.6,Math.min(az,bz)),z1=Math.min(1.6,Math.max(az,bz));
    if(z1-z0<1e-6)continue;
    const edgeX=z=>ax+(bx-ax)*(z-az)/(bz-az),y=floor.y;
    const top=[[TOWER_ROOM_HALF_WIDTH,y,z0],[TOWER_ROOM_HALF_WIDTH,y,z1],[edgeX(z1),y,z1],[edgeX(z0),y,z0]],
      bottom=top.map(v=>[v[0],y-.22,v[2]]);
    quad(positions,...top);quad(positions,bottom[3],bottom[2],bottom[1],bottom[0]);
    for(let j=0;j<4;j++)quad(positions,bottom[j],top[j],top[(j+1)%4],bottom[(j+1)%4]);
  }
  const steps=mesh(geometry(positions),tread);steps.name='Guild stair treads and fitted thresholds';
  const base=TOWER_FLOORS[0].y,top=TOWER_FLOORS.at(-1).y+9.8;
  const core=mesh(new THREE.CylinderGeometry(2,2,top-base,20),stone);core.position.set(s.x,(top+base)/2,0);
  for(const floor of TOWER_FLOORS){
    for(const side of [-1,1]){
      box(13.8,floor.y+1.02,side*1.76,1.6,.12,.16,brass);
      for(const x of [13.1,14.5])box(x,floor.y,side*1.76,.13,1.08,.13,dark);
    }
    const band=mesh(new THREE.TorusGeometry(2.04,.11,5,20),brass);band.rotation.x=Math.PI/2;band.position.set(s.x,floor.y+3,0);
    // End landings have a sealed continuation beside the sign. A narrower
    // board keeps its shaped edges clear of those existing gate posts.
    const gated=floor===TOWER_FLOORS[0]||floor===TOWER_FLOORS.at(-1);
    const sign=createGuildLandingSign(floor,{width:gated?2.82:3.7});
    if(sign){root.add(sign);geometries.push(sign.geometry);materials.push(sign.material);textures.push(sign.material.map);}
  }
  for(const [floor,side] of [[TOWER_FLOORS[0],1],[TOWER_FLOORS.at(-1),-1]]){
    const z=side*1.58;
    for(const x of [13.9,17.2])box(x,floor.y,z,.19,3.8,.24,stone);
    box(15.55,floor.y+3.58,z,3.5,.22,.24,trim);
    for(let i=0;i<10;i++)box(14.1+i*.32,floor.y,z,.075,3.6,.075,brass);
    for(const y of [1.2,2.8])box(15.55,floor.y+y,z,3.3,.10,.12,dark);
    const seal=mesh(new THREE.TorusGeometry(.30,.065,5,12),brass);seal.position.set(15.55,floor.y+2.04,z);
  }
  // Masonry encloses the back of the stair well. A broad slit at the west
  // aligns with the chamber doorways, whose own walls close the other levels.
  const walls=[];
  for(let i=0;i<64;i++){
    const a=i/64*TAU,b=(i+1)/64*TAU,mid=(a+b)/2;
    if(Math.abs(Math.atan2(Math.sin(mid-Math.PI),Math.cos(mid-Math.PI)))<.39)continue;
    const point=(angle,h)=>[s.x+Math.cos(angle)*5.45,h,Math.sin(angle)*5.45];
    quad(walls,point(b,base-.4),point(a,base-.4),point(a,top),point(b,top));
  }
  stone.side=THREE.DoubleSide;mesh(geometry(walls),stone);
  const railVertices=[],posts=[];
  for(const radius of [s.inner+.03,s.outer-.08])for(let i=0;i<s.steps*(TOWER_FLOORS.length-1);i++){
    const p=TOWER_STAIR_MIN+i/s.steps,q=TOWER_STAIR_MIN+(i+1)/s.steps,a=Math.PI+p*TAU,b=Math.PI+q*TAU;
    // Open the outer rail only across the chamber doorway.
    if(radius>3&&Math.abs(Math.atan2(Math.sin((a+b)/2-Math.PI),Math.cos((a+b)/2-Math.PI)))<.30)continue;
    const ya=towerStairHeight(p)-TOWER.y+1.12,yb=towerStairHeight(q)-TOWER.y+1.12;
    const point=(angle,r,h)=>[s.x+Math.cos(angle)*r,h,Math.sin(angle)*r];
    const a0=point(a,radius-.065,ya-.055),a1=point(a,radius+.065,ya-.055),a2=point(a,radius+.065,ya+.055),a3=point(a,radius-.065,ya+.055);
    const b0=point(b,radius-.065,yb-.055),b1=point(b,radius+.065,yb-.055),b2=point(b,radius+.065,yb+.055),b3=point(b,radius-.065,yb+.055);
    quad(railVertices,a0,b0,b1,a1);quad(railVertices,a3,a2,b2,b3);quad(railVertices,a0,a3,b3,b0);quad(railVertices,a1,b1,b2,a2);
    if(i%3===0)posts.push({x:s.x+Math.cos(a)*radius,y:ya-.56,z:Math.sin(a)*radius});
  }
  mesh(geometry(railVertices),brass);
  const postGeometry=new THREE.CylinderGeometry(.055,.055,1.12,5);geometries.push(postGeometry);
  const postMesh=new THREE.InstancedMesh(postGeometry,dark,posts.length),matrix=new THREE.Matrix4();
  posts.forEach((p,i)=>{matrix.makeTranslation(p.x,p.y,p.z);postMesh.setMatrixAt(i,matrix);});root.add(postMesh);
  const glass=material('#a6b8b8',{emissive:'#76938f',emissiveIntensity:.22});
  // The east wall faces each flight halfway up its climb. Keep the whole
  // reveal beyond the outer tread radius, with its sill above those steps.
  // The top landing has no further flight or corresponding stair window.
  for(const floor of TOWER_FLOORS.slice(0,-1)){
    const midFlight=floor.y/s.rise+1.5,sill=towerStairHeight(midFlight)-TOWER.y+1.25;
    const pane=box(s.x+5.34,sill+.16,0,.055,2.7,1.3,glass);
    for(const z of [-.75,.75])box(s.x+5.28,sill,z,.12,3.02,.15,trim);
    box(s.x+5.28,sill,0,.12,.16,1.65,trim);box(s.x+5.28,sill+2.86,0,.12,.16,1.65,trim);
    pane.name=`Stair light at ${floor.id}`;
  }
  return {...createTowerFloorSupport(),root,dispose(){root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();}};
}
