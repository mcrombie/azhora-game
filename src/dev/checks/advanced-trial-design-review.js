import * as THREE from 'three';
import {ADVANCED_TRIALS} from '../../gameplay/combat/advanced-trials.js';
import {createTrialOpponent} from '../../app/exploration/trial-opponent-view.js';
import {disposeCharacter} from '../../content/characters/characters.js';

export function showAdvancedTrialDesigns(){
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xbac7c7);
  scene.add(new THREE.HemisphereLight(0xf8f2df,0x506574,2));
  const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(-3,6,5);scene.add(light);
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setScissorTest(true);
  const overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;z-index:100000;background:#bac7c7';overlay.append(renderer.domElement);document.body.append(overlay);
  const actors=ADVANCED_TRIALS.map(r=>createTrialOpponent(r.id));
  const camera=new THREE.PerspectiveCamera(35,1,.05,100),width=innerWidth/5,split=Math.floor(innerHeight*.34);
  actors.forEach((a,i)=>{
    scene.add(a.group);for(let f=0;f<30;f++)a.animate(f/60,0,true,{action:'idle',shieldRaised:ADVANCED_TRIALS[i].defense?.type==='shield'});
    const label=document.createElement('div');label.textContent=ADVANCED_TRIALS[i].name;label.style.cssText=`position:absolute;top:14px;left:${i*20}%;width:20%;text-align:center;font:600 20px Georgia;color:#253838`;overlay.append(label);
  });
  actors.forEach((a,i)=>{
    actors.forEach((b,j)=>b.group.visible=i===j);
    const height=new THREE.Box3().setFromObject(a.group).max.y;
    renderer.setViewport(i*width,split,width,innerHeight-split);renderer.setScissor(i*width,split,width,innerHeight-split);
    camera.aspect=width/(innerHeight-split);camera.position.set(height*.35,height*.64,height*2.9);camera.lookAt(0,height*.49,0);camera.updateProjectionMatrix();renderer.render(scene,camera);
    renderer.setViewport(i*width,0,width,split);renderer.setScissor(i*width,0,width,split);
    const head=a.group.getObjectByName('Head'),center=head.localToWorld(i===3?new THREE.Vector3(0,.06,.24):new THREE.Vector3(0,.22,0));
    camera.aspect=width/split;camera.position.copy(center).add(new THREE.Vector3(height*.12,height*.08,height*.44));camera.lookAt(center);camera.updateProjectionMatrix();renderer.render(scene,camera);
  });
  return {info:{ids:ADVANCED_TRIALS.map(r=>r.id)},dispose(){actors.forEach(disposeCharacter);renderer.dispose();overlay.remove();}};
}
