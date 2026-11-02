import {createSpeciesTrees,createSpeciesTreeLibrary} from '../../../world/scenery/species-trees.js';
import {getTreeRegistry} from '../../../world/scenery/tree-registry.js';
import * as THREE from 'three';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {SANCTUARY as S,SANCTUARY_ENTRY as ENTRY,SANCTUARY_HABITATS as HABITATS,SANCTUARY_PATHS,sanctuaryPathDistance} from './guild-sanctuary-layout.js';
import {sanctuaryGround,sanctuaryHabitatScenery} from './guild-sanctuary-landscape.js';
import {SANCTUARY_ANIMALS} from './sanctuary-roster.js';
import {createSanctuaryWildlife} from './sanctuary-wildlife.js';
import {TOWER} from '../../../app/exploration/tower-state.js';

export const sanctuaryRoster=()=>SANCTUARY_ANIMALS;
// Build in small stages while the visitor climbs the last flight. No regional
// campaign, worldwide fauna catalogue, teleport stations or remote scene pass.
export async function createGuildSanctuary(parent,{yieldBuild=()=>Promise.resolve()}={}){
  const begun=performance.now(),root=new THREE.Group();root.name='Bolbur: walkable indoor region';
  root.position.set(-TOWER.x,-TOWER.y,-TOWER.z);root.visible=false;parent.add(root);
  const owned=[],colliders=[],records=SANCTUARY_ANIMALS,treeViews=[],treeLibrary=createSpeciesTreeLibrary();
  const pools=[{x:TOWER.x-244,z:TOWER.z+245,r:57}];
  const ground=sanctuaryGround(pools),{heightAt,poolAt}=ground;
  const waterAt=(x,z)=>poolAt(x,z)?S.y-.25:-100;
  function finish(b){const mesh=b.finish(root,{castShadow:false});if(mesh){mesh.material=mesh.material.clone();owned.push(mesh);}return mesh;}
  try{
    for(const step of ground.buildSteps(finish)){void step;await yieldBuild();}
    for(const h of HABITATS){treeViews.push(sanctuaryHabitatScenery({parent:root,h,records,ground,finish,colliders,library:treeLibrary}));await yieldBuild();}
    const water=createSceneryBuilder('Woodland pond and beaver lodge');
    for(const pool of pools){
      for(let i=0;i<64;i++){
        const a=i*Math.PI/32,c=(i+1)*Math.PI/32;
        water.triangle('#789f9f',[pool.x,S.y-.25,pool.z],[pool.x+Math.sin(a)*pool.r*.98,S.y-.25,pool.z+Math.cos(a)*pool.r*.98],[pool.x+Math.sin(c)*pool.r*.98,S.y-.25,pool.z+Math.cos(c)*pool.r*.98]);
        const x=pool.x+Math.sin(a)*(pool.r+4),z=pool.z+Math.cos(a)*(pool.r+4),y=heightAt(x,z);
        if(i%2===0)for(let j=0;j<3;j++)water.beam('#7c935d',[x+j*.22,y,z],[x+j*.22+.15,y+1.3+(i%3)*.2,z],.04);
      }
      for(let i=0;i<24;i++){
        const x=pool.x+39+Math.sin(i*2.4)*3,z=pool.z-29+Math.cos(i*2.4)*2.5;
        water.beam(i%2?'#665640':'#897359',[x,S.y-.15,z],[x+2.4,S.y+.5+(i%4)*.22,z+2],.17);
      }
    }finish(water);await yieldBuild();
    // A field porch encloses only the real return doorway. The landscape starts
    // immediately beyond it; there is no ordinary room to cross first.
    const b=createSceneryBuilder('Bolbur field porch and doorway');
    const x=ENTRY.x;
    for(const z of [-3,3]){
      b.block('#8c967f',x+.35,S.y,TOWER.z+z,1.4,6.1,1.2);
      b.block('#dbd2b5',x-.45,S.y,TOWER.z+z,.24,6.3,.4);
      colliders.push({x:x+.35,z:TOWER.z+z,hx:.7,hz:.6,minY:S.y,maxY:S.y+6.1,kind:'sanctuary-doorpost'});
    }
    b.block('#a8b093',x+.25,S.y+5.7,TOWER.z,1.6,.5,7.3);
    b.roof('#657466',x+1.6,S.y+6.15,TOWER.z,5.2,8.2,1.7);
    // Low supply bench and a watering bowl, kept off the walking route.
    b.block('#77634b',TOWER.x+5,S.y+.7,TOWER.z-6,3.6,.17,1.1);
    for(const side of [-1,1])b.block('#65543f',TOWER.x+5+side*1.4,S.y,TOWER.z-6,.15,.7,1.0);
    for(let i=0;i<4;i++)b.rock(i%2?'#c7b689':'#9d956f',TOWER.x+3.9+i*.7,S.y+1.1,TOWER.z-6,.27,.30,.35);
    for(const z of [-8,8]){b.rock('#9ba98c',TOWER.x+9,S.y+.25,TOWER.z+z,1.1,.3,.9);b.rock('#6f8958',TOWER.x+9,S.y+.65,TOWER.z+z,.85,.65,.8);}
    for(let i=0;i<180;i++){
      const x=TOWER.x-8-(i*.618%1)*110,z=TOWER.z+Math.sin(i*2.399)*75,y=heightAt(x,z);
      if(sanctuaryPathDistance(x,z)<5)continue;
      for(let k=0;k<3;k++)b.beam(i%3?'#809657':'#9ea561',[x+k*.17,y,z],[x+k*.17+.12,y+.25+(i%4)*.09,z],.035);
      if(i%7===0)for(let k=0;k<3;k++)b.rock(i%2?'#e3cd88':'#b5a3c5',x+k*.2,y+.35,z,.11,.04,.11);
    }
    const porchTrees=[[-20,-23],[-28,22],[-70,-38],[-95,58]].map(([dx,dz],i)=>({
      id:`sanctuary-porch-${i}`,species:['white-oak','red-maple','beech','sycamore'][i],x:TOWER.x+dx,z:TOWER.z+dz,
      height:9,trunkRadius:.26,crownRadius:3.6,region:'The Folded Sanctuary',harvestable:false,
      protectedReason:'A living specimen in Bolbur?s sanctuary.',colliderKind:'sanctuary-tree'}));
    treeViews.push(createSpeciesTrees({parent:root,colliders,trees:porchTrees,heightAt,library:treeLibrary,name:'Sanctuary porch trees'}));
    finish(b);
    // A pale vaulted firmament keeps this recognisably a magical indoor region.
    const domeGeometry=new THREE.SphereGeometry(1500,40,16,0,Math.PI*2,0,Math.PI/2),colors=[];
    const positions=domeGeometry.attributes.position;
    for(let i=0;i<positions.count;i++){
      const tint=new THREE.Color('#d4dfd4').lerp(new THREE.Color('#78969f'),Math.max(0,positions.getY(i)/1500));colors.push(tint.r,tint.g,tint.b);
    }
    domeGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const dome=new THREE.Mesh(domeGeometry,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,fog:false}));
    dome.name='The sanctuary firmament';dome.position.set(S.x,S.y-8,S.z);dome.scale.y=.42;root.add(dome);owned.push(dome);
    const ribs=createSceneryBuilder('Faint silver ribs of the folded vault');
    for(let meridian=0;meridian<8;meridian++)for(let i=0;i<20;i++){
      const a=meridian*Math.PI/4,t=.08+i*.072,u=t+.072;
      const at=v=>[S.x+Math.cos(a)*Math.cos(v)*1488,S.y-8+Math.sin(v)*625,S.z+Math.sin(a)*Math.cos(v)*1488];
      ribs.beam('#b8c9c7',at(t),at(u),.75);
    }
    const ribMesh=finish(ribs);ribMesh.material.dispose();ribMesh.material=new THREE.MeshBasicMaterial({color:'#cad8d1',transparent:true,opacity:.42,depthWrite:false,fog:false});
    const light=new THREE.HemisphereLight('#eef0d7','#718571',1.35);root.add(light);
    const wildlife=createSanctuaryWildlife(root,{...ground,waterAt},records);
    const buildMs=Math.round(performance.now()-begun);let active=false;
    const map={radius:130,paths:SANCTUARY_PATHS,mapWaters:pools.map(p=>({...p,kind:'circle',radius:p.r}))};
    return {root,colliders,heightAt,waterAt,guides:[],map,supportAt:ground.supportAt,treeRegistry:getTreeRegistry(colliders),
      update(time,player,dt){root.visible=active=true;wildlife.update(dt,player);},
      hide(){root.visible=active=false;wildlife.hide();},
      state:()=>({active,species:records.length,roster:records,animals:wildlife.snapshot(),visuals:wildlife.stats(),size:S.radius*2,buildMs,trees:treeViews.reduce((n,v)=>n+v.trees.length,0),staticBatches:owned.length+treeViews.reduce((n,v)=>n+v.batches,0),staticTriangles:treeViews.reduce((n,v)=>n+v.vertices/3,0)+owned.reduce((n,m)=>n+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0)}),
      dispose(){wildlife.dispose();for(const view of treeViews)view.dispose();treeLibrary.dispose();for(const mesh of owned){mesh.geometry.dispose();mesh.material.map?.dispose();mesh.material.dispose();}root.removeFromParent();},
    };
  }catch(error){for(const view of treeViews)view.dispose();treeLibrary.dispose();for(const mesh of owned){mesh.geometry.dispose();mesh.material.dispose();}root.removeFromParent();throw error;}
}
