import * as THREE from 'three';
import {createAgricultureSheepModel} from '../scenery/agriculture-livestock.js';
import {createColliderGrid} from '../collision/collider-grid.js';
import {colliderOverlapsHeight} from '../collision/walk-surfaces.js';

const rand=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const feet=[[-.19,-.31],[.19,-.31],[-.19,.30],[.19,.30]],up=new THREE.Vector3(0,1,0),right=new THREE.Vector3(1,0,0);
export const LIVESTOCK_ACTIVE_DISTANCE=140;

/** Six sheep per pasture, three instanced batches. Only nearby flocks think;
 * paused/hidden worlds never catch up using wall time. Collision remains live
 * even for sleeping flocks and is queried separately from the static grid. */
export function createAgricultureLivestock({parent,heightAt,waterAt=()=>-Infinity,colliders,pastures,clearAt}){
  const root=new THREE.Group();root.name='Living farm sheep';parent.add(root);
  const model=pastures.length?createAgricultureSheepModel():null,animals=[],flocks=[],bodies=[];
  let obstacles,disposed=false,updates=0,active=0;
  function refreshColliders(){obstacles=createColliderGrid(colliders.filter(c=>!c.dynamic));}
  refreshColliders();
  function safe(a,x,z,player=null){
    const r=.98*a.size,f=a.field,y=heightAt(x,z);
    if(!Number.isFinite(y)||Math.abs(x-f.x)>f.width/2-r||Math.abs(z-f.z)>f.depth/2-r||!clearAt(x,z,r))return false;
    for(const [dx,dz] of [[0,0],[r,0],[-r,0],[0,r],[0,-r]]){
      const h=heightAt(x+dx,z+dz);if(!Number.isFinite(h)||h<waterAt(x+dx,z+dz)+.06||Math.abs(h-y)>.5)return false;
    }
    if(player&&Math.abs(player.y-y)<2.5&&Math.hypot(x-player.x,z-player.z)<1.7)return false;
    for(const c of obstacles.near(x,z,r)){
      if(c.kind==='river-water'||c.kind==='pond-water'||!colliderOverlapsHeight(c,y,1.25*a.size))continue;
      if(c.r!==undefined?Math.hypot(x-c.x,z-c.z)<r+c.r:Math.abs(x-c.x)<r+c.hx&&Math.abs(z-c.z)<r+c.hz)return false;
    }
    return !animals.some(b=>b!==a&&Math.hypot(x-b.x,z-b.z)<1.65*(a.size+b.size)/2);
  }
  function syncBodies(a){
    for(const c of a.bodies){c.x=a.x+Math.sin(a.heading)*c.offset;c.z=a.z+Math.cos(a.heading)*c.offset;
      c.minY=Math.min(a.y,heightAt(c.x,c.z))-.08;c.maxY=a.y+1.25*a.size;}
  }
  for(const pasture of pastures){
    const flock={field:pasture.field,animals:[],meshes:{},elapsed:0};
    for(const [i,p] of pasture.positions.entries()){
      const a={...p,id:pasture.id+'-sheep-'+i,field:pasture.field,size:.88+rand(p.seed+7)*.19,heading:rand(p.seed+23)*Math.PI*2,clock:rand(p.seed+51)*14,gait:p.seed,speed:0,head:1.1,bodies:[]};
      for(let attempt=0;!safe(a,a.x,a.z)&&attempt<24;attempt++){
        a.x=a.field.x+(rand(a.seed+attempt*3+901)-.5)*(a.field.width-4);a.z=a.field.z+(rand(a.seed+attempt*3+902)-.5)*(a.field.depth-4);
      }
      if(!safe(a,a.x,a.z))continue;
      a.y=heightAt(a.x,a.z);animals.push(a);flock.animals.push(a);
      for(const [r,offset] of [[.49,-.10],[.36,.51]]){
        const c={kind:'livestock',dynamic:true,animalId:a.id,r:r*a.size,offset:offset*a.size};a.bodies.push(c);bodies.push(c);colliders.push(c);
      }
      syncBodies(a);
    }
    if(!flock.animals.length)continue;
    for(const [part,geometry] of Object.entries(model.parts)){
      const mesh=new THREE.InstancedMesh(geometry,model.material,flock.animals.length*(part==='leg'?4:1));
      mesh.name=pasture.id+' / sheep '+part;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.receiveShadow=true;
      const f=flock.field;mesh.boundingSphere=new THREE.Sphere(new THREE.Vector3(f.x,heightAt(f.x,f.z)+1,f.z),Math.hypot(f.width,f.depth)/2+8);
      flock.animals.forEach((a,i)=>{if(part!=='leg')mesh.setColorAt(i,new THREE.Color(part==='head'&&rand(a.seed+81)<.27?0x827568:0xffffff).multiplyScalar(.92+rand(a.seed+37)*.08));});
      root.add(mesh);flock.meshes[part]=mesh;
    }
    flocks.push(flock);
  }
  const base=new THREE.Matrix4(),local=new THREE.Matrix4(),matrix=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),scale=new THREE.Vector3();
  function draw(flock){
    for(const [i,a] of flock.animals.entries()){
      const c=Math.cos(a.heading),s=Math.sin(a.heading);
      const ground=(u,v)=>(heightAt(a.x+a.size*(u*c+v*s),a.z+a.size*(-u*s+v*c))-a.y)/a.size;
      const lift=feet.reduce((sum,[u,v])=>sum+ground(u,v),0)/4;
      base.compose(p.set(a.x,a.y,a.z),q.setFromAxisAngle(up,a.heading),scale.setScalar(a.size));
      function part(name,index,x,y,z,angle=0,sy=1){local.compose(p.set(x,y,z),q.setFromAxisAngle(right,angle),scale.set(1,sy,1));matrix.multiplyMatrices(base,local);flock.meshes[name].setMatrixAt(index,matrix);}
      part('body',i,0,lift+.008*Math.sin(a.clock*2),0);
      part('head',i,0,lift+.55,.37,a.head);
      for(const [j,[u,v]] of feet.entries()){
        const swing=a.speed>.05?Math.sin(a.gait+(j===0||j===3?0:Math.PI)):0;
        const z=v+swing*.07,foot=ground(u,z)+Math.max(0,swing)*.09;
        part('leg',i*4+j,u,foot,z,0,Math.max(.3,(lift+.52-foot)/.52));
      }
    }
    for(const mesh of Object.values(flock.meshes))mesh.instanceMatrix.needsUpdate=true;
  }
  for(const flock of flocks)draw(flock);
  function update(dt,player){
    active=0;if(disposed||!(dt>0)||!player)return;
    for(let o=root;o;o=o.parent)if(!o.visible)return;
    for(const flock of flocks){
      const f=flock.field,d=Math.hypot(Math.max(0,Math.abs(player.x-f.x)-f.width/2),Math.max(0,Math.abs(player.z-f.z)-f.depth/2));
      if(d>LIVESTOCK_ACTIVE_DISTANCE){flock.elapsed=0;continue;}
      active++;flock.elapsed+=Math.min(dt,.1);if(flock.elapsed<(d<55?.05:.2))continue;
      const elapsed=flock.elapsed;flock.elapsed=0;
      for(const a of flock.animals){
        a.clock+=elapsed;const period=11+rand(a.seed+11)*5;
        const alarm=Math.abs(player.y-a.y)<2.5&&Math.hypot(player.x-a.x,player.z-a.z)<3.6;
        const walking=alarm||a.clock%period>period-4;
        const target=alarm?Math.atan2(a.x-player.x,a.z-player.z):rand(a.seed+Math.floor(a.clock/period)*29)*Math.PI*2;
        const angle=Math.atan2(Math.sin(target-a.heading),Math.cos(target-a.heading));
        if(walking)a.heading+=Math.max(-elapsed*2.8,Math.min(elapsed*2.8,angle));
        const distance=walking?(alarm?1.45:.42)*elapsed:0,steps=Math.max(1,Math.ceil(distance/.1));let moved=0;
        for(let i=0;i<steps;i++){
          const x=a.x+Math.sin(a.heading)*distance/steps,z=a.z+Math.cos(a.heading)*distance/steps;
          if(!safe(a,x,z,player)){a.heading+=elapsed*2.4;break;}
          a.x=x;a.z=z;moved+=distance/steps;
        }
        a.y=heightAt(a.x,a.z);a.speed=moved/elapsed;a.gait+=moved*8;
        a.head+=((walking?.06:1.13+.08*Math.sin(a.clock*2.7))-a.head)*Math.min(1,elapsed*3);
        syncBodies(a);
      }
      draw(flock);updates++;
    }
  }
  return {update,refreshColliders,
    nearColliders:(x,z,r=0)=>bodies.filter(c=>Math.abs(x-c.x)<=r+c.r&&Math.abs(z-c.z)<=r+c.r),
    state:()=>({animals:animals.map(a=>({id:a.id,x:a.x,y:a.y,z:a.z,heading:a.heading,speed:a.speed,head:a.head,field:a.field.id})),flocks:flocks.length,active,updates,batches:flocks.length*3,disposed}),
    dispose(){if(disposed)return;disposed=true;const owned=new Set(bodies);for(let i=colliders.length-1;i>=0;i--)if(owned.has(colliders[i]))colliders.splice(i,1);bodies.length=0;
      for(const flock of flocks)for(const mesh of Object.values(flock.meshes))mesh.dispose();model?.dispose();root.removeFromParent();},
  };
}
