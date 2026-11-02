import {createSceneryBuilder} from '../../world/scenery/scenery-builder.js';
import {TOWER} from './tower-state.js';
import {createCharacter,createGoblin,disposeCharacter} from '../../content/characters/characters.js';

// Optional, temporary visual costume. No shared material, identity, inventory
// or campaign state changes; restore on leaving Neris, loading or disposal.
export function createGuildDisguise(actor){
  let pieces=[],borrowed=null,hidden=[],appearance=null,originalForm=null,previous=null,clock=0;
  function restore(){
    for(const mesh of pieces){mesh.removeFromParent();mesh.geometry.dispose();mesh.material.dispose();}pieces=[];
    if(borrowed)disposeCharacter(borrowed);borrowed=null;
    for(const [group,visible] of hidden)group.visible=visible;
    hidden=[];appearance=null;previous=null;
  }
  function borrow(kind='mask'){
    if(!['mask','elf','goblin'].includes(kind))return false;
    restore();const chest=actor.group.getObjectByName('Chest'),head=actor.group.getObjectByName('Head');if(!chest||!head)return false;
    originalForm=actor.form;
    if(kind!=='mask'){
      borrowed=kind==='goblin'?createGoblin({variant:2}):createCharacter({role:'mercenary',armed:false,hat:false,tunic:0x476d61,skin:0xcdb293,
        look:{elven:true,build:'tall-lean',hair:0xd5c99b,hairStyle:'long-tied',headgear:'bare',facialHair:'clean',garment:'short-cloak',jerkin:false}});
      borrowed.setArmed(false);borrowed.group.name='Borrowed '+kind+' appearance';
      hidden=actor.group.children.map(group=>[group,group.visible]);for(const [group] of hidden)group.visible=false;
      actor.group.add(borrowed.group);borrowed.animate(clock,0,true);appearance=kind;return true;
    }
    const mask=createSceneryBuilder('Neris: borrowed emerald mask');
    mask.rock('#458d81',0,.20,.245,.185,.14,.045);
    for(const side of [-1,1]){mask.rock('#203e49',side*.075,.235,.286,.045,.025,.009);mask.beam('#d7b66d',[side*.12,.28,.26],[side*.23,.37,.24],.025);}
    const m=mask.finish(head,{castShadow:false});m.material=m.material.clone();pieces.push(m);
    const mantle=createSceneryBuilder('Neris: borrowed plum mantle');
    mantle.box('#793d73',0,1.18,-.19,.62,.28,.14);mantle.box('#793d73',0,.82,-.225,.57,.6,.08);
    for(const side of [-1,1])mantle.beam('#d4b46c',[side*.24,1.3,-.22],[side*.23,.55,-.28],.035);
    const c=mantle.finish(chest,{castShadow:false});c.position.y=-chest.position.y;c.material=c.material.clone();pieces.push(c);appearance='mask';return true;
  }
  return {borrow,restore,active:()=>appearance!==null,state:()=>({appearance,cosmetic:true}),
    demonstrate(id){if(id==='restore-face'){restore();return true;}const kind={'borrow-face':'mask','borrow-elf':'elf','borrow-goblin':'goblin'}[id];return kind?borrow(kind):false;},
    update(room,point,dt=0){
      if(!appearance)return;
      if(room!=='tower'||Math.abs(point.y-(TOWER.y+21.6))>5||Math.abs(point.x-TOWER.x)>100||actor.form!==originalForm){restore();return;}
      if(borrowed){
        const speed=previous&&dt>0?Math.min(8,Math.hypot(point.x-previous.x,point.z-previous.z)/dt):0;
        clock+=Math.min(.1,Math.max(0,dt));borrowed.animate(clock,speed,true);previous={x:point.x,z:point.z};
      }
    },dispose:restore};
}
