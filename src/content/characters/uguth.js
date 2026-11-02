import {createCharacter} from './characters.js';
import {createSceneryBuilder} from '../../world/scenery/scenery-builder.js';

export const UGUTH=Object.freeze({name:'Uguth',title:'Battle Wizard',role:'mercenary',hat:false,armed:false,tunic:0x536672,
  look:{hairStyle:'bald',hair:0x9b9e9c,facialHair:'long',build:'broad'}});

// A bare crown, grey beard, silver-blue mail and a long, sheathed back sword.
// Accessories are merged onto existing pivots, never separate animated actors.
export function createUguth({armed=false}={}){
  const actor=createCharacter({...UGUTH,armed,look:{...UGUTH.look,weapon:'greatsword'}});actor.group.name='Uguth, Battle Wizard';actor.setShield(false);
  const chest=actor.group.getObjectByName('Chest'),head=actor.group.getObjectByName('Head');
  const b=createSceneryBuilder('Uguth: mithril hauberk and two-handed sword');
  const silver='#b8ced1',shade='#708e98',leather='#493a30';
  b.box(shade,0,1.08,0,.54,.51,.37);b.box(shade,0,.73,0,.56,.25,.39);
  // Small linked chevrons read as chain mail without hundreds of draw calls.
  for(const side of [-1,1])for(let row=0;row<12;row++)for(let col=0;col<9;col++){
    const x=-.24+col*.058+(row%2)*.013,y=.64+row*.056,z=side*.202;
    b.beam(silver,[x-.018,y+.018,z],[x,y,z+.004*side],.012);
    b.beam(row%2?silver:'#d1e0df',[x,y,z+.004*side],[x+.018,y+.018,z],.012);
  }
  b.box(leather,0,.84,.014,.59,.085,.43);b.box('#aebdc0',0,.84,.242,.08,.07,.022);
  b.beam(leather,[-.24,.62,-.27],[.32,1.66,-.27],.14,.09);
  b.beam(silver,[-.23,.65,-.326],[.31,1.64,-.326],.026);
  if(!armed){
  b.beam(silver,[.12,1.72,-.29],[.5,1.51,-.29],.055);
  b.beam('#353e42',[.31,1.64,-.29],[.49,1.99,-.29],.065);
  for(let i=0;i<6;i++)b.beam('#8fa6aa',[.33+i*.027,1.7+i*.05,-.33],[.38+i*.027,1.67+i*.05,-.33],.016);
  b.rock(silver,.5,2.01,-.29,.07,.075,.045);
  }
  const armor=b.finish(chest,{castShadow:false});armor.position.y=-chest.position.y;armor.material=armor.material.clone();armor.material.metalness=.38;armor.material.roughness=.57;
  for(const side of [-1,1]){
    const shoulder=actor.group.getObjectByName(side<0?'Left Shoulder':'Right Shoulder');
    if(!shoulder)continue;
    const sleeve=createSceneryBuilder('Uguth: mail sleeve');sleeve.rock(shade,0,-.09,0,.105,.16,.11);
    for(let row=0;row<5;row++)for(let col=0;col<4;col++)sleeve.beam(silver,[-.073+col*.045,-.025-row*.045,.105],[-.052+col*.045,-.045-row*.045,.11],.014);
    const mesh=sleeve.finish(shoulder,{castShadow:false});mesh.material=armor.material;
  }
  const face=createSceneryBuilder('Uguth: stern brows and grey temples');
  for(const s of [-1,1]){
    face.beam('#747b7c',[s*.025,.272,.19],[s*.116,.302,.17],.023);
    face.rock('#a3a6a3',s*.177,.24,-.052,.035,.065,.08);
  }
  const detail=face.finish(head,{castShadow:false});detail.material=detail.material.clone();
  actor.group.userData.design={bald:true,beard:'grey',armor:'mithril chain mail',weapon:armed?'two-handed sword':'sheathed two-handed sword'};
  return actor;
}
