import * as THREE from 'three';
import { createGoblin } from './characters.js';

// A handful of pooled effects and three articulated actors; nothing allocates
// new geometry during a swing. Combat rules remain independent of the renderer.
export function createCombatView(scene, world, camera) {
  const actors = new Map();
  const labels = document.getElementById('enemy-labels');
  const projection = new THREE.Vector3();
  const sparkGeometry = new THREE.IcosahedronGeometry(.055, 0);
  const sparkMaterial = new THREE.MeshBasicMaterial({color:0xffe5a2});
  const sparks = new THREE.InstancedMesh(sparkGeometry, sparkMaterial, 48);
  sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  sparks.frustumCulled = false;
  const particles = Array.from({length:48},()=>({life:0,x:0,y:0,z:0,vx:0,vy:0,vz:0}));
  const transform = new THREE.Object3D();
  let nextParticle=0, hitFlash=0, shake=0, trainingSway=0;
  scene.add(sparks);
  const swing = new THREE.Mesh(new THREE.RingGeometry(.8,1.9,24,1,0,Math.PI*.82),
    new THREE.MeshBasicMaterial({color:0xffedbe,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
  swing.rotation.x=-Math.PI/2; scene.add(swing);

  function burst(x,z,count=12) {
    for(let i=0;i<count;i++) {
      const p=particles[nextParticle++%particles.length], a=i*2.399;
      Object.assign(p,{life:.32+i%4*.045,x,y:world.heightAt(x,z)+.9,z,vx:Math.cos(a)*(1+i%3*.5),vy:1.5+i%4*.4,vz:Math.sin(a)*(1+i%3*.5)});
    }
  }
  function event(e) {
    if(e.type==='hit'&&e.damage===0)return;
    if(['hit','practice-hit','enemy-defeated'].includes(e.type)) {
      burst(e.x,e.z,e.type==='enemy-defeated'?22:10);
      shake=e.type==='enemy-defeated'?.075:.035;
      if(e.type==='practice-hit')trainingSway=.22;
    }
    if(e.type==='player-hit'){hitFlash=.4;shake=.1;burst(e.x,e.z,8);}
  }
  function createEnemy(enemy,index) {
    const actor=createGoblin({variant:index});scene.add(actor.group);
    const tell=new THREE.Group();scene.add(tell);
    const sector=new THREE.Mesh(new THREE.CircleGeometry(2.3,32,-.85,1.7),new THREE.MeshBasicMaterial({color:0xeab34f,transparent:true,opacity:.2,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));
    // In local coordinates +Y of the disc becomes +Z on the ground.
    sector.rotation.set(Math.PI/2,0,Math.PI/2); tell.add(sector);
    const edge=new THREE.Mesh(new THREE.RingGeometry(2.22,2.32,32,1,-.85,1.7),new THREE.MeshBasicMaterial({color:0xf6c867,transparent:true,opacity:.95,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));
    edge.rotation.copy(sector.rotation);tell.add(edge);
    const badge=document.createElement('div');badge.className='enemy-badge';
    const name=document.createElement('span');name.textContent=index===0?'Bramble scout':'Bramble raider';
    const health=document.createElement('div');health.className='enemy-health';const fill=document.createElement('i');health.append(fill);
    const intent=document.createElement('small');badge.append(name,health,intent);labels.append(badge);
    const item={actor,tell,sector,edge,badge,fill,intent,deadTime:0};actors.set(enemy.id,item);return item;
  }
  function update(dt,time,state,position,visible=true) {
    const ids=new Set(state.enemies.filter(e=>e.kind==='goblin').map(e=>e.id));
    for(const [id,item] of actors)if(!ids.has(id)){item.actor.group.visible=false;item.tell.visible=false;item.badge.hidden=true;}
    let index=0;
    for(const enemy of state.enemies) {
      if(enemy.kind!=='goblin')continue;
      const item=actors.get(enemy.id)||createEnemy(enemy,index);index++;
      const dead=enemy.hp<=0;
      item.deadTime=dead?item.deadTime+dt:0;
      const group=item.actor.group;
      group.visible=(dead||enemy.active!==false)&&item.deadTime<1.6;
      group.position.set(enemy.x,world.heightAt(enemy.x,enemy.z),enemy.z);
      group.rotation.y=enemy.yaw;
      group.scale.setScalar(dead?Math.max(0,1-Math.max(0,item.deadTime-.65)):1);
      item.actor.animate(time+index*1.9,enemy.speed||0,true,{action:enemy.action,progress:enemy.progress,alert:state.phase==='active',armed:true});
      const warning=enemy.action==='windup'||enemy.action==='attack';
      item.tell.visible=visible&&!dead&&warning;
      item.tell.position.set(enemy.x,world.heightAt(enemy.x,enemy.z)+.07,enemy.z);
      item.tell.rotation.y=enemy.yaw;
      const striking=enemy.action==='attack';
      item.sector.material.color.setHex(striking?0xdb754d:0xe9b550);
      item.edge.material.color.copy(item.sector.material.color);
      item.sector.material.opacity=striking?.38:.10+enemy.progress*.2;
      // The clearing slopes gently. Drape the warning over the ground so its
      // far edge cannot disappear inside the hill just as the player needs it.
      if(warning&&!dead)for(const mesh of [item.sector,item.edge]){
        const vertices=mesh.geometry.attributes.position;
        for(let i=0;i<vertices.count;i++){
          const x=vertices.getX(i),y=vertices.getY(i);
          const dx=-y*Math.cos(enemy.yaw)+x*Math.sin(enemy.yaw),dz=y*Math.sin(enemy.yaw)+x*Math.cos(enemy.yaw);
          vertices.setZ(i,world.heightAt(enemy.x,enemy.z)-world.heightAt(enemy.x+dx,enemy.z+dz));
        }
        vertices.needsUpdate=true;
      }
      const range=Math.hypot(enemy.x-position.x,enemy.z-position.z);
      projection.set(enemy.x,group.position.y+1.73,enemy.z).project(camera);
      item.badge.hidden=!visible||dead||enemy.active===false||range>21||projection.z>1||projection.z< -1;
      if(!item.badge.hidden){
        item.badge.style.transform=`translate(-50%,-100%) translate(${(projection.x*.5+.5)*innerWidth}px,${(-projection.y*.5+.5)*innerHeight}px)`;
        item.fill.style.width=`${Math.max(0,100*enemy.hp/enemy.maxHp)}%`;
        item.intent.textContent=enemy.action==='windup'?'Winding up — dodge!':enemy.action==='hurt'?'Staggered':enemy.action==='attack'?'Swinging':' ';
        item.badge.classList.toggle('warning',warning);
      }
    }
    for(let i=0;i<particles.length;i++) {
      const p=particles[i];p.life=Math.max(0,p.life-dt);
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=7*dt;
      transform.position.set(p.x,p.y,p.z);transform.scale.setScalar(Math.min(1,p.life*7));transform.updateMatrix();sparks.setMatrixAt(i,transform.matrix);
    }
    sparks.instanceMatrix.needsUpdate=true;
    const action=state.player;
    swing.visible=visible&&action.action==='attack'&&action.progress>.25&&action.progress<.72;
    swing.position.set(position.x,position.y+.9,position.z);
    swing.rotation.z=action.yaw-Math.PI/2-Math.PI*.41+(action.progress-.485)*2.1;
    swing.material.opacity=swing.visible?Math.sin((action.progress-.25)/.47*Math.PI)*.35:0;
    hitFlash=Math.max(0,hitFlash-dt);shake=Math.max(0,shake-dt*.6);
    document.getElementById('damage-flash').style.opacity=String(hitFlash);
    if(world.training?.object){trainingSway*=Math.exp(-8*dt);world.training.object.rotation.z=Math.sin(time*24)*trainingSway;}
    return shake;
  }
  return {event,update};
}
