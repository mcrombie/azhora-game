import {createPassengerBoat} from '../../content/regions/minora-frontier/minora-harbor-scenery.js';
import {createRiverboatCrew} from '../../content/regions/minora-frontier/riverboat-crew.js';
import {disposeCharacter,createHorse} from '../../content/characters/characters.js';

export function createPassageBoat(scene,horseOwned){
  const root=createPassengerBoat(scene,{x:0,y:0,z:0,canopy:false});root.userData.passageActivity='moored';
  const crew=createRiverboatCrew(root,{kind:'passage',deck:.55,beam:3.5,length:11.6});
  const horse=horseOwned?createHorse({saddled:true}):null;
  if(horse){root.add(horse.group);horse.group.position.set(0,.55,-.8);}
  let disposed=false,moored=false,lastTime=0;
  return {root,
    update(p,time){
      if(disposed)return;
      for(let node=root;node;node=node.parent)if(!node.visible)return;
      lastTime=time;root.position.set(p.x,p.y,p.z);root.rotation.y=p.heading??p.yaw??0;
      const pose=moored?{...p,phase:'moored',speed:0,rowing:false}:p;
      root.userData.passageActivity=pose.phase??'sailing';crew.update(time,pose);
      if(horse?.group.visible)horse.animate(time,0,true);
    },
    dock(){if(disposed)return;moored=true;if(horse)horse.group.visible=false;root.userData.passageActivity='moored';crew.update(lastTime,{phase:'moored',speed:0,rowing:false});},
    state:()=>({phase:root.userData.passageActivity,horseAboard:!!horse?.group.visible,...crew.state()}),
    dispose(){
      if(disposed)return;disposed=true;crew.dispose();
      if(horse){horse.group.removeFromParent();disposeCharacter(horse);}
      const geometries=new Set();root.traverse(o=>{if(o.isMesh)geometries.add(o.geometry);});geometries.forEach(g=>g.dispose());root.removeFromParent();
    }
  };
}
