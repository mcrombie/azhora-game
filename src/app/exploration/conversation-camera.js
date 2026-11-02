import * as THREE from 'three';

// Keep the two people in the unoccupied part of the screen. The camera's
// projection shifts the composition; neither actor moves to make room for UI.
export function createConversationCamera(camera,obstruction){
  let active=false,key=null;
  const focus=new THREE.Vector3(),eye=new THREE.Vector3();
  function update({hero,speaker,dialogRect,width,height,speakerHeight=1.85,ignoreCollider,backWeight=.72,sideWeight=.7}){
    const next=[hero.x,hero.y,hero.z,speaker.x,speaker.y,speaker.z,speakerHeight,width,height,backWeight,sideWeight,
      dialogRect?.left,dialogRect?.right,dialogRect?.top,dialogRect?.bottom].join(',');
    if(next!==key){
      const margin=Math.min(24,width*.035),full={x:margin,y:margin,w:width-2*margin,h:height-2*margin};
      const gap=Math.hypot(hero.x-speaker.x,hero.z-speaker.z),pairWidth=gap+1.1;
      const r=dialogRect,areas=r?[
        {...full,h:r.top-2*margin},
        {...full,y:r.bottom+margin,h:height-r.bottom-2*margin},
        {...full,w:r.left-2*margin},
        {...full,x:r.right+margin,w:width-r.right-2*margin},
      ].filter(a=>a.w>64&&a.h>64):[full];
      areas.sort((a,b)=>Math.min(b.w/pairWidth,b.h/2.4)-Math.min(a.w/pairWidth,a.h/2.4));
      const area=areas[0]??full,points=[];
      for(const [p,h] of [[hero,1.95],[speaker,speakerHeight]])for(const x of [-.4,.4])for(const z of [-.32,.32])for(const y of [0,h])
        points.push(new THREE.Vector3(p.x+x,p.y+y,p.z+z));
      const bounds=new THREE.Box3().setFromPoints(points);bounds.getCenter(focus);
      const back=new THREE.Vector3(hero.x-speaker.x,0,hero.z-speaker.z);
      if(back.lengthSq()<.01)back.set(0,0,1);else back.normalize();
      const tangent=new THREE.Vector3(back.z,0,-back.x),tan=Math.tan(camera.fov*Math.PI/360);
      const halfWidth=tan*(width/height)*(area.w/width)*.9,halfHeight=tan*(area.h/height)*.9;
      let best=null;
      for(const side of [1,-1]){
        const direction=back.clone().multiplyScalar(backWeight).addScaledVector(tangent,side*sideWeight);direction.y=.42;direction.normalize();
        const right=new THREE.Vector3(direction.z,0,-direction.x).normalize(),up=new THREE.Vector3().crossVectors(direction,right);
        let reach=4.7;
        for(const p of points){const relative=p.clone().sub(focus),depth=relative.dot(direction);
          reach=Math.max(reach,depth+Math.abs(relative.dot(right))/halfWidth,depth+Math.abs(relative.dot(up))/halfHeight);
        }
        const desired=focus.clone().addScaledVector(direction,reach),clip=obstruction(focus,desired,{ignoreCollider});
        if(!best||clip>best.clip){best={clip,eye:desired};if(clip>=1)break;}
      }
      eye.lerpVectors(focus,best.eye,best.clip);
      camera.setViewOffset(width,height,width/2-(area.x+area.w/2),height/2-(area.y+area.h/2),width,height);
      key=next;
    }
    active=true;camera.position.copy(eye);camera.lookAt(focus);camera.updateMatrixWorld(true);
  }
  function reset(){if(active){camera.clearViewOffset();active=false;key=null;}}
  return {update,reset};
}
