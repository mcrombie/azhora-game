import * as THREE from 'three';
import {createExpeditionTrialActor} from '../../content/characters/expedition-trial-actors.js';
import {disposeCharacter} from '../../content/characters/characters.js';

export function createExpeditionFieldView(parent,world){
  const root=new THREE.Group();root.name='Expedition field effects';parent.add(root);
  const resources=new Set(),ghosts=[];
  const material=(color,opacity=1)=>{const m=new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,side:THREE.DoubleSide,depthWrite:opacity===1});resources.add(m);return m;};
  const iron=material(0x74786a),cord=material(0xd5b48a),violet=material(0xc2a5df,.85),blue=material(0xa6ccd6,.7),marsh=material(0x456e67,.2),orange=material(0xf6a15c,.38),dust=material(0xcab98d,.75);
  const rockMaterial=new THREE.MeshStandardMaterial({color:0x8d9181,roughness:1,flatShading:true});resources.add(rockMaterial);
  function mesh(parent,geometry,mat,p=[0,0,0]){resources.add(geometry);const m=new THREE.Mesh(geometry,mat);m.castShadow=mat===rockMaterial;m.receiveShadow=mat===rockMaterial;m.position.set(...p);parent.add(m);return m;}
  function ring(parent,r,mat,width=.035){const m=mesh(parent,new THREE.RingGeometry(r-width,r,32),mat);m.rotation.x=-Math.PI/2;return m;}
  function group(name){const g=new THREE.Group();g.name=name;root.add(g);return g;}
  const traps=Array.from({length:3},()=>{
    const g=group('Spring snare');ring(g,.6,cord);ring(g,.4,iron,.065);
    for(let i=0;i<10;i++){const a=i*Math.PI/5;mesh(g,new THREE.ConeGeometry(.035,.15,4),iron,[Math.sin(a)*.35,.1,Math.cos(a)*.35]);}
    mesh(g,new THREE.BoxGeometry(.15,.035,.15),iron,[0,.025,0]);return g;
  });
  const ridges=Array.from({length:5},()=>{const g=group('Raised stone ridge');mesh(g,new THREE.DodecahedronGeometry(.5,0),rockMaterial,[0,.55,0]).scale.set(.86,1.5,.86);return g;});
  const knots=Array.from({length:3},()=>{const g=group('Binding knot');ring(g,.67,violet);const glyph=mesh(g,new THREE.OctahedronGeometry(.14),violet,[0,.15,0]);glyph.rotation.z=Math.PI/4;mesh(g,new THREE.BoxGeometry(1.15,.025,.035),violet);return g;});
  const preview=group('Incoming ridge or binding');const previewStroke=mesh(preview,new THREE.BoxGeometry(4.4,.02,.85),blue);
  const ripples=group('Reed-stalker ripples');mesh(ripples,new THREE.CircleGeometry(1.55,32),marsh).rotation.x=-Math.PI/2;
  const rippleRings=[.45,.95,1.45].map(r=>ring(ripples,r,blue));
  const vent=group('Furnace cooling cone'),fan=mesh(vent,new THREE.RingGeometry(.3,3.8,32,1,-Math.PI/4,Math.PI/2),orange);fan.rotation.x=-Math.PI/2;
  const embers=Array.from({length:6},()=>mesh(vent,new THREE.OctahedronGeometry(.055),orange));
  const footprints=group('Mirrorblade real footfall');ring(footprints,.48,dust,.08);const trail=mesh(footprints,new THREE.BoxGeometry(.13,.012,1),dust);
  function place(view,o){view.visible=!!o;if(o)view.position.set(o.x,world.heightAt(o.x,o.z)+.08,o.z);}
  function ensureGhosts(){
    if(ghosts.length)return;
    for(let i=0;i<2;i++){
      const actor=createExpeditionTrialActor('dark-elf-mirrorblade'),privateMaterials=new Map();
      actor.group.traverse(o=>{if(!o.isMesh)return;o.castShadow=false;o.receiveShadow=false;
        const own=m=>{if(!privateMaterials.has(m)){const copy=new THREE.MeshBasicMaterial({color:0xa9cbd6,transparent:true,opacity:.22,depthWrite:false});privateMaterials.set(m,copy);}return privateMaterials.get(m);};
        // Retain replaced owned materials until disposal; shared batches remain cached.
        if(o.name!=='Rigid character batch')for(const m of [].concat(o.material))resources.add(m);
        o.material=Array.isArray(o.material)?o.material.map(own):own(o.material);
      });
      actor.group.name='Harmless mirrorblade afterimage';root.add(actor.group);ghosts.push(actor);
    }
  }
  return {draw(s,time){
    root.visible=!s.outcome;if(!root.visible)return;
    const objects=(s.trialObjects??[]).filter(o=>o.hp>0);
    for(const [kind,pool] of [['trap',traps],['ridge',ridges],['binding',knots]]){const list=objects.filter(o=>o.kind===kind);pool.forEach((v,i)=>{place(v,list[i]);if(list[i])v.rotation.y=list[i].heading??0;});}
    const marking=s.guards.find(g=>g.hp>0&&g.fieldTarget&&['windup','strike'].includes(g.phase));place(preview,marking?.fieldTarget);
    if(marking){preview.rotation.y=marking.fieldTarget.heading;previewStroke.scale.x=marking.fieldTarget.kind==='binding'?.8:1;}
    const reed=s.guards.find(g=>g.hp>0&&['submerged','emerge'].includes(g.phase));place(ripples,reed);
    if(reed)rippleRings.forEach((r,i)=>r.scale.setScalar(.8+((time*.45+i*.3)%1)*.4));
    const furnace=s.guards.find(g=>g.hp>0&&g.phase==='vent');place(vent,furnace);
    if(furnace){fan.rotation.z=furnace.ventHeading-Math.PI/2;embers.forEach((e,i)=>{const r=.7+((time*.7+i*.2)%1)*2.6,a=furnace.ventHeading+(i%3-1)*.25;e.position.set(Math.sin(a)*r,.2+(i%2)*.15,Math.cos(a)*r);});}
    const mirrors=s.mirages??[];if(mirrors.length)ensureGhosts();
    ghosts.forEach((actor,i)=>{const m=mirrors[i];place(actor.group,m);if(m){actor.group.rotation.y=m.heading;actor.animate(time,0,true,{action:'windup',progress:.7,attackStyle:'thrust'});}});
    const real=s.guards.find(g=>g.hp>0&&g.mechanic==='mirrorblade');place(footprints,real);
    if(real){const origin=real.dustOrigin??real,dx=origin.x-real.x,dz=origin.z-real.z;trail.scale.z=Math.max(.1,Math.hypot(dx,dz));trail.rotation.y=Math.atan2(dx,dz);trail.position.set(dx/2,0,dz/2);}
  },dispose(){for(const actor of ghosts)disposeCharacter(actor);for(const r of resources)r.dispose();root.removeFromParent();}};
}
