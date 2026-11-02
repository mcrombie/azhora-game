import {EXPEDITION_TRIALS} from '../../gameplay/combat/expedition-trials.js';
import * as THREE from 'three';
import {FRONTIER_TRIALS} from '../../gameplay/combat/frontier-trials.js';
import {createTrialOpponent} from '../../app/exploration/trial-opponent-view.js';
import {disposeCharacter} from '../../content/characters/characters.js';

export function showFrontierTrialDesigns(expedition=false){
  const roster=expedition?EXPEDITION_TRIALS:FRONTIER_TRIALS;
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xc1cccb);
  scene.add(new THREE.HemisphereLight(0xfff4df,0x536775,2.1));
  const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(-3,6,5);scene.add(light);
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setScissorTest(true);
  const overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;z-index:100000;background:#c1cccb';overlay.append(renderer.domElement);document.body.append(overlay);
  const actors=roster.map(p=>createTrialOpponent(p.id)),camera=new THREE.PerspectiveCamera(35,1,.05,100),cols=expedition?4:5,rows=expedition?3:2,w=innerWidth/cols,h=innerHeight/rows;
  actors.forEach((a,i)=>{scene.add(a.group);for(let f=0;f<40;f++)a.animate(f/60,0,true,{action:'idle',warded:true,empowered:true});
    const label=document.createElement('div');label.textContent=roster[i].name;label.style.cssText=`position:absolute;top:${Math.floor(i/cols)*h+10}px;left:${i%cols*w}px;width:${w}px;text-align:center;font:600 17px Georgia;color:#233d3c`;overlay.append(label);
  });
  actors.forEach((a,i)=>{
    actors.forEach((b,j)=>b.group.visible=i===j);
    const bounds=new THREE.Box3().setFromObject(a.group),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
    const d=Math.max(size.y*2.1,size.x*2.6,size.z*2.1);
    renderer.setViewport(i%cols*w,(rows-1-Math.floor(i/cols))*h,w,h);renderer.setScissor(i%cols*w,(rows-1-Math.floor(i/cols))*h,w,h);
    camera.aspect=w/h;camera.position.copy(center).add(new THREE.Vector3(d*.24,d*.13,d));camera.lookAt(center);camera.updateProjectionMatrix();renderer.render(scene,camera);
  });
  return {info:{ids:roster.map(p=>p.id)},dispose(){actors.forEach(disposeCharacter);renderer.dispose();overlay.remove();}};
}
