import {createArmyUnit} from '../../content/characters/army-unit-view.js';
import {militiaWeapon} from '../../gameplay/combat/combat-units.js';
import {createLizeemCommander} from '../../content/characters/lizeem-commanders.js';
import * as THREE from 'three';
import {campaignColumns,columnRoadPoint} from './war-columns.js';
import {createColumnRoutes,clearColumnPoint} from './war-column-routes.js';
import {waterAt} from '../../gameplay/movement/locomotion.js';

export const MARCHING_COLUMN_BUDGET=Object.freeze({columns:3,soldiers:24,commanders:2,nearDistance:145,visibleDistance:420});
const colorFor=owner=>owner==='west'?0x789e91:0xbf7969;

// A bounded visual sample of all current orders. Campaign state alone owns
// strength, arrival and outcomes; distant armies have no animated actors.
export function createMarchingColumns(scene,world){
  const root=new THREE.Group();root.name='Campaign marching columns';scene.add(root);
  const routes=createColumnRoutes(world),soldiers=[],commanders=new Map(),slots=[];
  const poleGeometry=new THREE.CylinderGeometry(.075,.075,5.6,6),flagGeometry=new THREE.PlaneGeometry(2,1.9);
  const poleMaterial=new THREE.MeshStandardMaterial({color:0x6f5234});
  const dustGeometry=new THREE.IcosahedronGeometry(1,0),dustMaterial=new THREE.MeshBasicMaterial({color:0xd6c296,transparent:true,opacity:.16,depthWrite:false});
  const dummy=new THREE.Object3D();let models=[],time=0,primary=null;
  for(let i=0;i<MARCHING_COLUMN_BUDGET.columns;i++){
    const group=new THREE.Group(),flagMaterial=new THREE.MeshBasicMaterial({color:0xbf7969,side:THREE.DoubleSide,fog:false});
    const pole=new THREE.Mesh(poleGeometry,poleMaterial),flag=new THREE.Mesh(flagGeometry,flagMaterial),dust=new THREE.InstancedMesh(dustGeometry,dustMaterial,8);
    group.add(pole,flag,dust);group.visible=false;root.add(group);slots.push({group,pole,flag,flagMaterial,dust});
  }
  function soldier(index,owner){
    if(!soldiers[index]){
      const color=colorFor('west'),light=new THREE.Color(color).lerp(new THREE.Color(0xe4d3a1),.18).getHex();
      const actor=createArmyUnit({weapon:militiaWeapon(index),variant:index,tunic:color}),cloth=new Set(),trim=new Set();
      actor.group.traverse(o=>{for(const material of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){
        if(material.color?.getHex()===color)cloth.add(material);else if(material.color?.getHex()===light)trim.add(material);
      }});
      root.add(actor.group);soldiers[index]={actor,cloth,trim,owner:'west'};
    }
    const entry=soldiers[index];if(entry.owner!==owner){
      for(const m of entry.cloth)m.color.setHex(colorFor(owner));
      for(const m of entry.trim)m.color.setHex(colorFor(owner)).lerp(new THREE.Color(0xe4d3a1),.18);
      entry.owner=owner;
    }return entry.actor;
  }
  function commander(owner){if(!commanders.has(owner)){const actor=createLizeemCommander(owner);root.add(actor.group);commanders.set(owner,actor);}return commanders.get(owner);}
  const loaded=p=>world.readyAt(p.x,p.z);
  return {
    update(state,clock,position,known,dt,enabled){
      const room=world.state?.();
      if(room?.inside||room?.inLimbo){
        root.visible=false;models=[];primary=null;return;
      }
      root.visible=true;
      // Search continues while time is held, independently of campaign time.
      campaignColumns(state,clock,routes.get);routes.step();
      // Keep the last known assembly point available to every navigation view
      // until a permitted physical route exists. This is intelligence only:
      // never render or allow interception of a fictitious waiting column.
      models=campaignColumns(state,clock,(from,to)=>routes.get(from,to)??routes.staging(from,to))
        .map(model=>({...model,pendingRoute:!!model.road.pendingRoute}));time+=enabled&&clock.running?dt:0;
      for(const slot of slots)slot.group.visible=false;
      for(const entry of soldiers)entry.actor.group.visible=false;
      for(const actor of commanders.values())actor.group.visible=false;
      for(const model of models){
        model.loaded=!model.pendingRoute&&loaded(model.location);model.visible=false;model.contactEligible=false;model.soldiers=[];
        if(model.loaded){const clear=clearColumnPoint(world,model.location,{loaded:true});if(clear)model.location=clear;else model.loaded=false;}
      }
      const nearby=models.filter(m=>enabled&&m.loaded&&known(m.location)&&Math.hypot(position.x-m.location.x,position.z-m.location.z)<MARCHING_COLUMN_BUDGET.visibleDistance)
        .sort((a,b)=>Math.hypot(position.x-a.location.x,position.z-a.location.z)-Math.hypot(position.x-b.location.x,position.z-b.location.z))
        .slice(0,MARCHING_COLUMN_BUDGET.columns);
      let nextSoldier=0;
      for(const [index,model]of nearby.entries()){
        const slot=slots[index],at=model.location,y=world.heightAt(at.x,at.z),near=Math.hypot(position.x-at.x,position.z-at.z)<MARCHING_COLUMN_BUDGET.nearDistance;
        slot.group.visible=true;slot.flagMaterial.color.setHex(colorFor(model.owner));
        slot.pole.position.set(at.x,y+2.8,at.z);slot.flag.position.set(at.x+1,y+4.55,at.z);slot.flag.rotation.y=Math.sin(time*2)*.15;
        model.wading=y<waterAt(at.x,at.z,world);model.visible=true;model.contactEligible=near&&!model.retreating&&!model.wading;
        if(near)for(let i=0;i<model.count;i++){
          const distance=model.distance-i*2.8;
          let planned=i?columnRoadPoint(Math.max(0,distance),model.road):at;
          if(i&&distance<0){
            const side=i%2?1.4:-1.4,back=Math.ceil(i/2)*2.2;
            planned={x:planned.x+Math.cos(planned.yaw)*side-Math.sin(planned.yaw)*back,z:planned.z-Math.sin(planned.yaw)*side-Math.cos(planned.yaw)*back,yaw:planned.yaw};
          }
          const p=clearColumnPoint(world,planned,{loaded:true,reach:8});if(!p)continue;
          const actor=!i&&model.commander?.status==='active'?commander(model.owner):soldier(nextSoldier++,model.owner);
          actor.group.visible=true;actor.group.position.set(p.x,world.heightAt(p.x,p.z),p.z);actor.group.rotation.y=p.yaw;
          actor.animate(time+i*.2,clock.running?2.3:0,true,{action:'idle',progress:0});model.soldiers.push(actor.group.position.toArray());
        }
        slot.dust.visible=near&&clock.running;
        if(slot.dust.visible){for(let i=0;i<8;i++){
          const age=(time*.55+i/8)%1,p=columnRoadPoint(Math.max(0,model.distance-i*2.8-age*3),model.road);
          dummy.position.set(p.x+Math.sin(i*2.4+time)*age,world.heightAt(p.x,p.z)+.15+age*.7,p.z);
          dummy.scale.setScalar(.18+age*.7);dummy.updateMatrix();slot.dust.setMatrixAt(i,dummy.matrix);
        }slot.dust.instanceMatrix.needsUpdate=true;}
      }
      primary=nearby[0]??models[0]??null;
    },
    targets:()=>models,
    target:id=>models.find(m=>m.id===id)??null,
    state:()=>({visible:!!primary?.visible,army:primary?.id??null,route:primary?.route??null,owner:primary?.owner??null,location:primary?.location??null,strength:primary?.strength??0,marching:!!primary?.marching,
      soldiers:primary?.soldiers??[],columns:models.map(({road,...model})=>({...model})),routes:routes.state(),budget:MARCHING_COLUMN_BUDGET,actors:soldiers.length+commanders.size}),
    dispose(){root.removeFromParent();const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
  };
}
