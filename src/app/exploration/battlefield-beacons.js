import * as THREE from 'three';

// A cheap location marker, not a deployment of the abstract armies as NPCs.
export function createBattlefieldBeacons(scene,world){
  const markers=new Map(),poleGeometry=new THREE.CylinderGeometry(.08,.08,4,6),flagGeometry=new THREE.PlaneGeometry(1.8,1.1);
  const poleMaterial=new THREE.MeshStandardMaterial({color:0x654a32}),flagMaterial=new THREE.MeshStandardMaterial({color:0xdb9850,side:THREE.DoubleSide});
  function update(battles,known,position){
    const active=new Set(battles.filter(b=>b.status==='active').map(b=>b.id));
    for(const [id,group]of markers)if(!active.has(id)){scene.remove(group);markers.delete(id);}
    for(const battle of battles.filter(b=>b.status==='active')){
      const at=battle.location,visible=known(at)&&world.readyAt(at.x,at.z)&&Math.hypot(position.x-at.x,position.z-at.z)<180;
      let group=markers.get(battle.id);
      if(!group&&visible){group=new THREE.Group();const pole=new THREE.Mesh(poleGeometry,poleMaterial),flag=new THREE.Mesh(flagGeometry,flagMaterial);pole.position.y=2;flag.position.set(.9,3.4,0);group.add(pole,flag);scene.add(group);markers.set(battle.id,group);}
      // Offset the visual a few metres so arriving at the rendezvous does not
      // put the pole through the hero. Campaign coordinates stay unchanged.
      if(group){group.visible=visible;if(visible)group.position.set(at.x+3,Math.max(world.heightAt(at.x+3,at.z-3),world.waterAt(at.x+3,at.z-3)),at.z-3);}
    }
  }
  return {update,state:()=>[...markers].filter(([,g])=>g.visible).map(([id])=>id),dispose(){for(const group of markers.values())scene.remove(group);markers.clear();poleGeometry.dispose();flagGeometry.dispose();poleMaterial.dispose();flagMaterial.dispose();}};
}
