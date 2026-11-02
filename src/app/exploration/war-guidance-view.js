import * as THREE from 'three';
import {guidanceScreenPoint} from './war-guidance.js';
import {writeHud} from './hud-write.js';
import {warPointerPlacement} from './war-pointer-layout.js';

// One opt-in navigation light. It has depth testing; the modest HUD pointer is
// what remains when a hill/building occludes it or the player looks away.
export function createWarGuidanceView(scene,world){
  const geometry=new THREE.CylinderGeometry(.45,.45,1,6,1,true);
  const material=new THREE.MeshBasicMaterial({color:0x91e8de,transparent:true,opacity:.43,depthWrite:false,fog:false,side:THREE.DoubleSide});
  const beam=new THREE.Mesh(geometry,material);beam.name='Selected army or battle light';beam.visible=false;scene.add(beam);
  const label=document.createElement('div');label.id='war-world-pointer';label.hidden=true;label.setAttribute('role','img');
  const arrow=document.createElement('span'),text=document.createElement('span');arrow.textContent='\u25c6';label.append(arrow,text);document.body.append(label);
  const target=new THREE.Vector3();let model=null,enabled=false,snapshot={visible:false};
  let lastLayout=-Infinity,obstacles=[],size={width:100,height:38},viewport={width:innerWidth,height:innerHeight};
  // Bounds are shared for a quarter second: camera updates never force a
  // layout read every frame. Include notices/help as well as the three panels.
  const hudIds=['world-war-report','exploration-minimap','teresod-sorcery','exploration-hud','exploration-help','world-autoplay','tower-objective','exploration-status'];
  function layout(){
    const now=performance.now();if(now-lastLayout<250)return;
    lastLayout=now;viewport={width:innerWidth,height:innerHeight};obstacles=[];
    for(const id of hudIds){const node=document.getElementById(id);if(!node||node.hidden)continue;const r=node.getBoundingClientRect();if(r.width&&r.height)obstacles.push(r);}
    const r=label.getBoundingClientRect();if(r.width&&r.height)size={width:r.width,height:r.height};
  }
  return {
    update(value,visible){model=value;enabled=visible;if(!visible){beam.visible=false;writeHud(label,'hidden',true);snapshot={visible:false};}},
    draw(camera,position){
      const at=model?.location,distance=at?Math.hypot(at.x-position.x,at.z-position.z):0;
      const visible=enabled&&!!at;writeHud(label,'hidden',!visible);beam.visible=false;
      if(!visible){snapshot={visible:false};return;}
      const ready=world.readyAt(at.x,at.z),ground=ready?Math.max(world.heightAt(at.x,at.z),world.waterAt(at.x,at.z)):position.y;
      const height=Math.min(90,Math.max(12,distance*.25));
      beam.visible=ready&&distance>24;beam.position.set(at.x,ground+height/2,at.z);beam.scale.setScalar(1);beam.scale.y=height;
      // Hold a small but readable beam width at long range.
      beam.scale.x=beam.scale.z=Math.max(1,distance/150);
      camera.updateMatrixWorld();target.set(at.x,ground+(distance>24?Math.min(height*.6,25):2.5),at.z).applyMatrix4(camera.matrixWorldInverse);
      const focal=1/Math.tan(camera.fov*Math.PI/360),point=guidanceScreenPoint({x:target.x*focal,y:target.y*focal,z:target.z},camera.aspect);
      const words=distance<6?(model.near??model.label):`${model.label} / ${Math.round(distance)} m`;
      const compact=distance<6?words:`${Math.round(distance)} m`;
      if(text.textContent!==compact)text.textContent=compact;
      if(label.getAttribute('aria-label')!==words)label.setAttribute('aria-label',words);
      if(label.title!==words)label.title=words;
      layout();
      const desired={x:(point.x+1)*viewport.width/2,y:(point.y+1)*viewport.height/2};
      // Near-interaction wording may grow before the next cached measurement.
      const bounds=distance<6?{width:230,height:64}:size;
      const placed=warPointerPlacement(desired,viewport,bounds,obstacles);
      if(!placed){writeHud(label,'hidden',true);snapshot={visible:false,beam:beam.visible,occluded:true,label:words,location:{...at}};return;}
      label.style.left=`${placed.x}px`;label.style.top=`${placed.y}px`;
      const edge=point.edge||placed.shifted,angle=placed.shifted&&!point.edge?Math.atan2(desired.y-placed.y,desired.x-placed.x):point.angle;
      arrow.textContent=edge?'\u279c':'\u25c6';arrow.style.transform=edge?`rotate(${angle}rad)`:'none';
      label.classList.toggle('edge',edge);snapshot={visible:true,beam:beam.visible,edge,label:words,location:{...at}};
    },state:()=>snapshot,dispose(){beam.removeFromParent();geometry.dispose();material.dispose();label.remove();}
  };
}
