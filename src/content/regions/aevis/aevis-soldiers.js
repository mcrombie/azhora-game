import * as THREE from 'three';
import { createCharacter } from '../../characters/characters.js';
import { createSceneryBuilder } from '../../../world/scenery/scenery-builder.js';
import { AEVIS_SOLDIERS as STANDS } from './aevis-city.js';

const BRONZE=['#c08b48','#a9783e','#bd9358','#8a7950'];
const TRIM='#dfba76', PATINA='#4f7c68', LEATHER='#59442f';
const SKIN=[0xb98458,0xd1a97b,0x946542,0xc38e64];
const HAIR=[0x31231b,0x594232,0x262222,0x766354];
const CLOTH=[0x743d32,0x42665c,0x9b845d,0x505553];
export const AEVIS_SOLDIERS=Object.freeze(STANDS.map((stand,i)=>Object.freeze({
  ...stand, role:'aevis-soldier', soldier:true, maxHp:150, armed:true, variant:stand.variant??i,
  look:Object.freeze({noHat:true,hairStyle:'short-cropped',hair:HAIR[i%HAIR.length],skin:SKIN[i%SKIN.length]}),
})));

const metal=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.54,metalness:.5,flatShading:true});

/** Broad segmented bronze armour reads differently from the Empire's mail and
 * tabard. The base character supplies the same movable humanoid joints, face,
 * feet and combat poses; every bronze addition remains attached to a joint. */
export function createAevisSoldier({variant=0,look={}}={}) {
  const index=Math.abs(Math.trunc(variant))%8,bronze=BRONZE[index%BRONZE.length];
  const actor=createCharacter({role:'warden',tunic:CLOTH[index%4],skin:look.skin??SKIN[index%4],hat:false,
    look:{...look,noHat:true,hairStyle:'short-cropped',hair:look.hair??HAIR[index%4]},armed:false});
  const group=actor.group;group.name=`Avite bronze soldier ${index+1}`;
  const joint=name=>{const p=group.getObjectByName(name);if(!p)throw new Error(`Avite rig missing ${name}`);return p;};
  const chest=joint('Chest'),wrists=[joint('Left Wrist'),joint('Right Wrist')];
  const add=(name,parent,build)=>{const b=createSceneryBuilder(name);build(b);const mesh=b.finish(parent);mesh.material=metal;return mesh;};
  const armour=add('Avite segmented bronze cuirass',chest,b=>{
    // The chest sits at body height .935. Curved, overlapping bands surround
    // the torso rather than becoming a flat gold recolour of a soldier's tunic.
    b.cylinder(LEATHER,0,-.25,0,.285,.58);
    for(let band=0;band<5;band++){
      const y=-.25+band*.12,r=.315-band*.009;
      b.cylinder(band%2?bronze:BRONZE[(index+1)%4],0,y,0,r,.145);
      b.cylinder(TRIM,0,y+.11,0,r+.004,.025);
      for(const side of [-1,1])b.rock(TRIM,side*r*.68,y+.068,r*.7,.021,.021,.016);
    }
    // Raised throat guard and broad, layered shoulder plates are Dendra-like
    // proportions, without adding a helmet or hiding the man's face.
    b.cylinder(bronze,0,.32,0,.185,.13);
    b.cylinder(TRIM,0,.435,0,.192,.018);
    for(const side of [-1,1]){
      b.rock(bronze,side*.275,.37,0,.175,.11,.21);
      b.rock(TRIM,side*.29,.405,0,.16,.045,.19);
      b.box(PATINA,side*.18,.23,.255,.05,.18,.024);
    }
    b.box(LEATHER,0,-.28,0,.61,.055,.46);
    b.box(TRIM,0,-.28,.246,.105,.08,.02);
  });
  for(const side of ['Left','Right']){
    add(`${side} Avite bronze greave`,joint(`${side} Knee`),b=>{
      b.rock(bronze,0,-.115,.062,.098,.17,.084);
      b.box(TRIM,0,-.11,.132,.03,.26,.025);
      for(const y of [-.02,-.22])b.box(LEATHER,0,y,-.004,.18,.028,.17);
      b.rock(TRIM,0,.005,.055,.094,.057,.073);
    });
    add(`${side} Avite bronze arm plate`,joint(`${side} Elbow`),b=>{
      b.rock(bronze,0,-.08,0,.09,.13,.09);
      b.box(TRIM,0,-.09,.081,.045,.19,.018);
    });
  }
  const shield=new THREE.Group();shield.name=index%2?'Avite broad tower shield':'Avite figure-eight shield';
  shield.position.set(-.09,-.01,.15);shield.rotation.set(-.3,-.22,-.03);wrists[0].add(shield);
  const board=add(shield.name+' bronze face',shield,b=>{
    if(index%2){
      b.box(LEATHER,0,0,0,.54,.86,.065);b.box(bronze,0,0,.042,.5,.82,.025);
      for(const s of [-1,1])b.box(TRIM,s*.265,0,.055,.035,.88,.032);
      for(const s of [-1,1])b.box(TRIM,0,s*.42,.055,.54,.035,.032);
    } else {
      // Two swollen lobes joined at a pinched waist make the large shield
      // recognizable even at gameplay distance.
      for(const s of [-1,1]){
        b.rock(LEATHER,0,s*.24,0,.33,.3,.065);
        b.rock(bronze,0,s*.24,.032,.31,.28,.045);
        for(let j=0;j<8;j++){
          const a=j*Math.PI/4;b.rock(TRIM,Math.cos(a)*.277,s*.24+Math.sin(a)*.255,.07,.016,.016,.012);
        }
      }
      b.box(bronze,0,0,.03,.22,.5,.07);
    }
    b.box(PATINA,0,0,.087,.055,.69,.026);
    b.rock(TRIM,0,0,.115,.10,.10,.04);
  });
  const spear=new THREE.Group();spear.name='Avite bronze-tipped spear';wrists[1].add(spear);
  spear.position.set(.01,-.07,.025);
  add('Avite ash spear and bronze leaf point',spear,b=>{
    b.cylinder('#715137',0,-.64,0,.022,2.1);
    b.cylinder(TRIM,0,1.39,0,.032,.13);
    b.rock(bronze,0,1.62,0,.065,.24,.025);
    b.cylinder(BRONZE[1],0,-.70,0,.032,.13);
    for(let y=-.11;y<.12;y+=.04)b.cylinder(LEATHER,0,y,0,.03,.023);
  });
  group.userData.avite={variant:index,bronze:true,headwear:false,shield:index%2?'tower':'figure-eight'};
  const animate=actor.animate;
  actor.animate=(time,speed=0,grounded=true,pose={})=>{
    animate(time,speed,grounded,pose);
    // Keep the planted spear near vertical during the ordinary watch pose;
    // during attacks it follows the weapon arm's existing combat motion.
    if(!pose.attack&&!pose.swing){
      const arm=joint('Right Shoulder'),elbow=joint('Right Elbow');
      spear.rotation.x=-(arm.rotation.x+elbow.rotation.x+chest.rotation.x);
      spear.rotation.z=-(arm.rotation.z+elbow.rotation.z+chest.rotation.z);
    } else spear.rotation.set(0,0,0);
  };
  actor.setShield=value=>{shield.visible=!!value;};
  actor.setWeapon=id=>{const valid=id===null||['ash-spear','war-pike','simple-sword'].includes(id);if(valid)spear.visible=id!==null;return valid;};
  return actor;
}
