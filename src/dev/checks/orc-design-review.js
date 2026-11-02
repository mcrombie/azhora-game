import * as THREE from 'three';
import {createArmyUnit} from '../../content/characters/army-unit-view.js';
import {disposeCharacter} from '../../content/characters/characters.js';

// Isolated model review: full silhouettes above, three-quarter faces below.
export function showOrcDesigns(){
  const scene=new THREE.Scene();scene.background=new THREE.Color(0xc5c5b2);
  scene.add(new THREE.HemisphereLight(0xfff4df,0x596250,2.2));
  const key=new THREE.DirectionalLight(0xffffff,2);key.position.set(-3,6,5);scene.add(key);
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);
  const overlay=document.createElement('div');overlay.style.cssText='position:fixed;inset:0;z-index:100000;background:#c5c5b2';overlay.append(renderer.domElement);document.body.append(overlay);
  const actors=['orc-raider','orc-warrior','veteran-orc-warrior'].map(unitType=>createArmyUnit({unitType}));
  const names=['Orc Raider / Axe + shield','Orc Warrior / Professional','Veteran Orc Warrior / Honor crest'];
  actors.forEach((a,i)=>{
    scene.add(a.group);a.setArmed(true);
    for(let frame=0;frame<30;frame++)a.animate(frame/60,0,true,{action:'idle',shieldRaised:true});
    const label=document.createElement('div');label.textContent=names[i];label.style.cssText=`position:absolute;top:18px;left:${i*100/3}%;width:33.33%;text-align:center;font:600 21px Georgia;color:#263323`;overlay.append(label);
  });
  renderer.setScissorTest(true);const camera=new THREE.PerspectiveCamera(35,1,.05,40),width=innerWidth/3,split=Math.floor(innerHeight*.35);
  actors.forEach((a,i)=>{
    actors.forEach((b,j)=>b.group.visible=i===j);
    renderer.setViewport(i*width,split,width,innerHeight-split);renderer.setScissor(i*width,split,width,innerHeight-split);
    camera.aspect=width/(innerHeight-split);camera.position.set(.45,1.45,4.6);camera.lookAt(0,1.12,0);camera.updateProjectionMatrix();renderer.render(scene,camera);
    renderer.setViewport(i*width,0,width,split);renderer.setScissor(i*width,0,width,split);
    const head=a.group.getObjectByName('Head'),center=head.localToWorld(new THREE.Vector3(0,.21,0));
    camera.aspect=width/split;camera.position.copy(center).add(new THREE.Vector3(.32,.2,1.05));camera.lookAt(center);camera.updateProjectionMatrix();renderer.render(scene,camera);
  });
  const info={units:actors.map(a=>a.group.userData.armyUnit),raiderShield:!!actors[0].group.getObjectByName('Round shield')?.visible,headDraws:actors.map(a=>{let n=0;a.group.getObjectByName('Orc hairless head').traverseVisible(o=>{if(o.isMesh)n++});return n;})};
  return {info,dispose(){for(const actor of actors)disposeCharacter(actor);renderer.dispose();overlay.remove();}};
}
