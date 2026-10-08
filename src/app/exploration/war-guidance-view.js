import * as THREE from 'three';
import {guidanceScreenPoint} from './war-guidance.js';
import {writeHud} from './hud-write.js';

// One opt-in navigation light. It has depth testing; the modest HUD pointer is
// what remains when a hill/building occludes it or the player looks away.
export function createWarGuidanceView(scene,world){
  const geometry=new THREE.CylinderGeometry(.45,.45,1,6,1,true);
  const material=new THREE.MeshBasicMaterial({color:0x91e8de,transparent:true,opacity:.43,depthWrite:false,fog:false,side:THREE.DoubleSide});
  const beam=new THREE.Mesh(geometry,material);beam.name='Selected army or battle light';beam.visible=false;scene.add(beam);
  const label=document.createElement('div');label.id='war-world-pointer';label.hidden=true;
  const arrow=document.createElement('span'),text=document.createElement('span');arrow.textContent='\u25c6';label.append(arrow,text);document.body.append(label);
  const target=new THREE.Vector3();let model=null,enabled=false,snapshot={visible:false};
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
      label.style.left=`${(point.x+1)*50}%`;label.style.top=`${(point.y+1)*50}%`;
      arrow.textContent=point.edge?'\u279c':'\u25c6';arrow.style.transform=point.edge?`rotate(${point.angle}rad)`:'none';
      const words=distance<6?(model.near??model.label):`${model.label} / ${Math.round(distance)} m`;
      if(text.textContent!==words)text.textContent=words;
      label.classList.toggle('edge',point.edge);snapshot={visible:true,beam:beam.visible,edge:point.edge,label:words,location:{...at}};
    },state:()=>snapshot,dispose(){beam.removeFromParent();geometry.dispose();material.dispose();label.remove();}
  };
}
