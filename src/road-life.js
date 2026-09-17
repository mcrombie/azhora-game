import * as THREE from 'three';
import { canStand } from './game-state.js';
import { toWorld } from './world-scale.js';

const TAU = Math.PI * 2;
const sphere = new THREE.IcosahedronGeometry(1, 1);
const box = new THREE.BoxGeometry(1, 1, 1);
const cone = new THREE.ConeGeometry(1, 1, 5);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 5);
const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .94, flatShading: true });
// Ranges and grazing spots in authored metres. Each flock is a world-scale
// cluster, so it walks to its region's new place keeping its own spread: the
// same animals over the same ground, not a thinner flock over a bigger field.
const AUTHORED_ZONES = [
  { id: 'sunmeadow-sheep', species: 'sheep', region: 2, minX: -448, maxX: -412, minZ: 306, maxZ: 344,
    sites: [[-440,312],[-432,320],[-422,314],[-438,330],[-428,336],[-418,326]], radius: .43 },
  { id: 'reedwater-birds', species: 'bank-bird', region: 3, minX: -300, maxX: -268, minZ: 78, maxZ: 106,
    sites: [[-294,84],[-282,94],[-274,100]], radius: .2 },
  { id: 'threefold-hares', species: 'rock-hare', region: 4, minX: -132, maxX: -84, minZ: 356, maxZ: 402,
    sites: [[-124,366],[-96,390]], radius: .23 },
];
const zones = AUTHORED_ZONES.map(zone => {
  const low = toWorld(zone.minX, zone.minZ), high = toWorld(zone.maxX, zone.maxZ);
  return { ...zone, minX: low.x, maxX: high.x, minZ: low.z, maxZ: high.z,
    sites: zone.sites.map(([x, z]) => { const p = toWorld(x, z); return [p.x, p.z]; }) };
});
/** The three authored flock ranges, so tests and reviews read the same numbers. */
export const ROAD_LIFE_ZONES = Object.freeze(zones.map(zone => Object.freeze({ ...zone, sites: Object.freeze(zone.sites.map(site => Object.freeze([...site]))) })));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const angleDelta = (a, b) => Math.atan2(Math.sin(a-b), Math.cos(a-b));

// Merge the fixed pieces of each joint once. Every animal of a species shares
// these vertex-colored geometries; instancing keeps the entire flock inexpensive.
function geometry(pieces) {
  const positions = [], normals = [], colors = [];
  const matrix = new THREE.Matrix4(), normalMatrix = new THREE.Matrix3();
  const p = new THREE.Vector3(), n = new THREE.Vector3(), q = new THREE.Quaternion();
  for (const [source, color, position, scale, rotation = [0,0,0]] of pieces) {
    q.setFromEuler(new THREE.Euler(...rotation));
    matrix.compose(new THREE.Vector3(...position), q, new THREE.Vector3(...scale));
    normalMatrix.getNormalMatrix(matrix);
    const data = source.index ? source.toNonIndexed() : source, tint = new THREE.Color(color);
    for (let i=0; i<data.attributes.position.count; i++) {
      p.fromBufferAttribute(data.attributes.position, i).applyMatrix4(matrix); positions.push(p.x,p.y,p.z);
      n.fromBufferAttribute(data.attributes.normal, i).applyMatrix3(normalMatrix).normalize(); normals.push(n.x,n.y,n.z);
      colors.push(tint.r,tint.g,tint.b);
    }
    if(data!==source)data.dispose();
  }
  const result = new THREE.BufferGeometry();
  result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  result.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  result.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  result.computeBoundingSphere(); return result;
}

function models() {
  const fleece=0xd0c7a9, shade=0xa69c7f, face=0x5d5748, dark=0x262a23;
  return {
    sheep: {
      body: geometry([[sphere,fleece,[0,.62,0],[.37,.37,.62]], [sphere,fleece,[-.18,.71,-.28],[.23,.25,.29]],
        [sphere,shade,[.15,.69,.20],[.25,.26,.28]], [sphere,fleece,[0,.62,-.59],[.13,.13,.23]]]),
      head: geometry([[sphere,face,[0,-.015,.05],[.18,.23,.26]], [sphere,face,[0,-.12,.24],[.13,.115,.17]],
        [sphere,fleece,[0,.15,-.01],[.21,.14,.20]], [sphere,face,[-.24,.10,.01],[.17,.07,.09]],
        [sphere,face,[.24,.10,.01],[.17,.07,.09]], [sphere,dark,[-.155,.018,.19],[.021,.024,.024]],
        [sphere,dark,[.155,.018,.19],[.021,.024,.024]]]),
      leg: geometry([[cylinder,shade,[0,-.19,0],[.071,.38,.073]], [box,face,[0,-.37,.026],[.13,.12,.17]]]),
    },
    'bank-bird': {
      body: geometry([[sphere,0x839da1,[0,.72,0],[.15,.19,.35]], [sphere,0xb6c0b0,[0,.86,.20],[.08,.24,.095]],
        [sphere,0xa8baba,[0,1.09,.26],[.105,.11,.125]], [cone,0xc4a75c,[0,1.055,.48],[.052,.32,.047],[Math.PI/2,0,0]],
        [sphere,dark,[-.089,1.102,.305],[.012,.015,.016]], [sphere,dark,[.089,1.102,.305],[.012,.015,.016]],
        [sphere,0x526e77,[0,.76,-.30],[.105,.08,.24]]]),
      wing: geometry([[sphere,0x617f8b,[.24,0,0],[.34,.048,.25]], [sphere,0x496571,[.46,-.012,-.09],[.25,.035,.18]]]),
      leg: geometry([[cylinder,0x766f44,[0,-.245,0],[.019,.49,.019]], [box,0x807751,[0,-.49,.04],[.058,.026,.115]]]),
    },
    'rock-hare': {
      body: geometry([[sphere,0x977d5f,[0,.24,0],[.18,.21,.33]], [sphere,0xb49b74,[0,.22,.22],[.15,.17,.18]],
        [sphere,0xddd3b4,[0,.24,-.31],[.08,.075,.09]], [sphere,0x79644e,[-.16,.10,-.15],[.10,.09,.18]],
        [sphere,0x79644e,[.16,.10,-.15],[.10,.09,.18]], [sphere,0xc1aa86,[-.1,.04,.23],[.055,.04,.12]],
        [sphere,0xc1aa86,[.1,.04,.23],[.055,.04,.12]]]),
      head: geometry([[sphere,0xb29977,[0,0,0],[.145,.145,.17]], [sphere,0xc9b798,[0,-.042,.14],[.075,.065,.08]],
        [sphere,dark,[-.119,.023,.077],[.021,.029,.023]], [sphere,dark,[.119,.023,.077],[.021,.029,.023]],
        [sphere,0x6f5c4a,[0,-.02,.216],[.025,.019,.018]]]),
      ear: geometry([[sphere,0x927653,[0,.135,0],[.044,.185,.04]], [sphere,0xb99d87,[0,.14,.026],[.021,.14,.013]]]),
    },
  };
}

/** Ambient creatures only: they cannot be attacked, collected or block a quest. */
export function createRoadLife(scene, world) {
  const shapes=models(), flocks=[], creatures=[];
  const dummy=new THREE.Object3D(), rootMatrix=new THREE.Matrix4(), resultMatrix=new THREE.Matrix4();
  const rotation=new THREE.Quaternion(), unit=new THREE.Vector3(1,1,1);
  let updates=0;
  function valid(x,z,zone) {
    return Number.isFinite(x)&&Number.isFinite(z)&&x>=zone.minX&&x<=zone.maxX&&z>=zone.minZ&&z<=zone.maxZ
      && canStand(x,z,world,zone.radius);
  }
  function clearPoint(x,z,zone) {
    if(valid(x,z,zone))return {x,z};
    for(let radius=.5;radius<=14;radius+=.5) for(let i=0;i<16;i++) {
      const p={x:x+Math.sin(i/16*TAU)*radius,z:z+Math.cos(i/16*TAU)*radius};
      if(valid(p.x,p.z,zone))return p;
    }
    return null;
  }
  function instances(group,name,shape,count) {
    const mesh=new THREE.InstancedMesh(shape,material,count);mesh.name=name;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.castShadow=true;mesh.receiveShadow=true;
    // The regional group supplies distance culling; dynamic instances must not
    // keep a stale bounding sphere at their original grazing location.
    mesh.frustumCulled=false;group.add(mesh);return mesh;
  }
  for(const zone of zones) {
    const group=new THREE.Group();group.name=zone.id;group.visible=false;scene.add(group);
    const animals=[];
    for(let i=0;i<zone.sites.length;i++) {
      const home=clearPoint(...zone.sites[i],zone);if(!home)continue;
      const animal={id:`${zone.species}-${i+1}`,species:zone.species,region:zone.region,...home,y:world.heightAt(home.x,home.z),
        home:{...home},yaw:(i*1.83+.5)%TAU,action:zone.species==='sheep'?'graze':'idle',timer:1.5+i*.63,
        clock:i*.37,speed:0,lift:0,index:i,zone,flight:null};
      animals.push(animal);creatures.push(animal);
    }
    const count=animals.length, shape=shapes[zone.species];
    const meshes={body:instances(group,`${zone.species} bodies`,shape.body,count)};
    if(shape.head)meshes.head=instances(group,`${zone.species} heads`,shape.head,count);
    if(shape.leg)meshes.legs=instances(group,`${zone.species} legs`,shape.leg,count*(zone.species==='sheep'?4:2));
    if(shape.wing)meshes.wings=instances(group,'Bank bird wings',shape.wing,count*2);
    if(shape.ear)meshes.ears=instances(group,'Rock hare ears',shape.ear,count*2);
    flocks.push({zone,group,animals,meshes,center:{x:(zone.minX+zone.maxX)/2,z:(zone.minZ+zone.maxZ)/2},ticks:0});
  }
  function move(animal,step) {
    const originalX=animal.x,originalZ=animal.z;
    for(const offset of [0,.55,-.55,1.1,-1.1]) {
      const yaw=animal.yaw+offset, dx=Math.sin(yaw)*step,dz=Math.cos(yaw)*step;
      const slices=Math.max(1,Math.ceil(step/.12));let clear=true;
      for(let i=1;i<=slices;i++) {
        const x=animal.x+dx*i/slices,z=animal.z+dz*i/slices;
        if(!valid(x,z,animal.zone)||Math.abs(world.heightAt(x,z)-animal.y)>.6){clear=false;break;}
      }
      if(clear){animal.x+=dx;animal.z+=dz;animal.yaw=yaw;return Math.hypot(animal.x-originalX,animal.z-originalZ);}
    }
    animal.yaw+=Math.PI*.71;return 0;
  }
  function takeFlight(animal,player) {
    const away=Math.atan2(animal.x-player.x,animal.z-player.z);
    for(const offset of [0,.6,-.6,1.2,-1.2,Math.PI]) {
      const x=clamp(animal.x+Math.sin(away+offset)*10,animal.zone.minX+1,animal.zone.maxX-1);
      const z=clamp(animal.z+Math.cos(away+offset)*10,animal.zone.minZ+1,animal.zone.maxZ-1);
      const target=clearPoint(x,z,animal.zone);
      if(target&&Math.hypot(target.x-animal.x,target.z-animal.z)>3) {
        animal.flight={from:{x:animal.x,z:animal.z,y:animal.y},to:{...target,y:world.heightAt(target.x,target.z)},time:0,duration:2.7};
        animal.action='flight';animal.yaw=Math.atan2(target.x-animal.x,target.z-animal.z);return;
      }
    }
  }
  function tickAnimal(animal,dt,player) {
    animal.clock+=dt;animal.timer-=dt;animal.speed=0;animal.lift=0;
    const near=Math.hypot(animal.x-player.x,animal.z-player.z);
    if(animal.flight) {
      const f=animal.flight;f.time+=dt;const t=clamp(f.time/f.duration,0,1),ease=t*t*(3-2*t);
      animal.x=f.from.x+(f.to.x-f.from.x)*ease;animal.z=f.from.z+(f.to.z-f.from.z)*ease;
      animal.y=f.from.y+(f.to.y-f.from.y)*ease;animal.lift=Math.sin(t*Math.PI)*3.2;animal.speed=4;
      if(t===1){animal.flight=null;animal.action='idle';animal.timer=2.4;animal.home={x:animal.x,z:animal.z};}
      return;
    }
    const bird=animal.species==='bank-bird',hare=animal.species==='rock-hare';
    if(bird&&near<5.5&&animal.timer<1.8){takeFlight(animal,player);if(animal.flight)return;}
    if(!bird&&near<(hare?7:6.5)) {
      animal.action='flee';animal.timer=1.8;
      const away=Math.atan2(animal.x-player.x,animal.z-player.z);
      animal.yaw+=angleDelta(away,animal.yaw)*Math.min(1,dt*5);
    }
    if(animal.timer<=0) {
      if(animal.action==='walk'||animal.action==='flee') {
        animal.action=animal.species==='sheep'?'graze':'idle';animal.timer=2.3+(animal.index%3)*.7;
      } else {
        animal.action='walk';animal.timer=1.3+(animal.index%2)*.7;
        const homeDistance=Math.hypot(animal.x-animal.home.x,animal.z-animal.home.z);
        animal.yaw=homeDistance>7?Math.atan2(animal.home.x-animal.x,animal.home.z-animal.z):animal.yaw+Math.sin(animal.clock+animal.index)*1.7;
      }
    }
    if(animal.action==='walk'||animal.action==='flee') {
      const speed=animal.action==='flee'?(hare?6.4:3.2):(bird?.38:hare?1.9:.48);
      animal.speed=move(animal,speed*dt)/dt;
      if(hare&&animal.speed>.1)animal.lift=Math.max(0,Math.sin(animal.clock*(animal.action==='flee'?16:10)))*(animal.action==='flee'?.28:.13);
    }
    animal.y=world.heightAt(animal.x,animal.z);
  }
  function place(mesh,index,x,y,z,rx=0,ry=0,rz=0,sx=1,sy=1,sz=1) {
    dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,rz);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();
    resultMatrix.multiplyMatrices(rootMatrix,dummy.matrix);mesh.setMatrixAt(index,resultMatrix);
  }
  function render(flock) {
    flock.animals.forEach((a,i)=>{
      rotation.setFromEuler(new THREE.Euler(0,a.yaw,0));
      rootMatrix.compose(new THREE.Vector3(a.x,a.y+a.lift,a.z),rotation,unit);
      const breath=Math.sin(a.clock*2.1)*.012,walk=a.speed>.05,phase=a.clock*(a.action==='flee'?13:7);
      place(flock.meshes.body,i,0,0,0,0,0,0,1,1+breath,1);
      if(a.species==='sheep') {
        const graze=a.action==='graze';place(flock.meshes.head,i,0,graze?.56:.86,.43,graze?.90:Math.sin(a.clock*.8)*.07,Math.sin(a.clock*.63)*.10);
        for(let leg=0;leg<4;leg++)place(flock.meshes.legs,i*4+leg,leg%2?.24:-.24,.43,leg<2?.36:-.34,walk?Math.sin(phase+(leg===0||leg===3?0:Math.PI))*.43:0);
      } else if(a.species==='bank-bird') {
        for(let side=0;side<2;side++) {
          const sign=side?1:-1, flying=a.action==='flight';
          place(flock.meshes.wings,i*2+side,sign*.12,.78,-.03,0,side?0:Math.PI,sign*(flying?Math.sin(a.clock*15)*.72:.13));
          place(flock.meshes.legs,i*2+side,sign*.055,.52,.025,flying?-.9:walk?Math.sin(phase+side*Math.PI)*.24:0);
        }
      } else {
        place(flock.meshes.head,i,0,.40,.24,walk?-.12:Math.sin(a.clock*.95)*.07,Math.sin(a.clock*.73)*.12);
        for(let side=0;side<2;side++)place(flock.meshes.ears,i*2+side,side?.08:-.08,.49,.215,walk?-.37:Math.sin(a.clock*1.5+side)*.13,0,(side?1:-1)*.11);
      }
    });
    for(const mesh of Object.values(flock.meshes))mesh.instanceMatrix.needsUpdate=true;
  }
  function update(dt,playerPosition,active=true) {
    if(!active||!Number.isFinite(dt)||dt<=0||!Number.isFinite(playerPosition?.x)||!Number.isFinite(playerPosition?.z))return;
    const step=Math.min(dt,.25);updates++;
    for(const flock of flocks) {
      const near=Math.hypot(playerPosition.x-flock.center.x,playerPosition.z-flock.center.z)<=100;
      flock.group.visible=near;if(!near)continue;
      flock.ticks++;for(const animal of flock.animals)tickAnimal(animal,step,playerPosition);render(flock);
    }
  }
  function snapshot() {
    return {updates,creatures:creatures.map(a=>({id:a.id,species:a.species,region:a.region,x:a.x,y:a.y+a.lift,z:a.z,
      groundY:a.y,yaw:a.yaw,action:a.action,speed:a.speed,clock:a.clock})),
      groups:flocks.map(f=>({id:f.zone.id,visible:f.group.visible,ticks:f.ticks,count:f.animals.length}))};
  }
  function setObserver(position) {
    if(!Number.isFinite(position?.x)||!Number.isFinite(position?.z))return;
    for(const flock of flocks)flock.group.visible=Math.hypot(position.x-flock.center.x,position.z-flock.center.z)<=100;
  }
  return {update,setObserver,snapshot,state:snapshot};
}
