import {createArmyUnit} from '../../characters/army-unit-view.js';
import {disposeCharacter} from '../../characters/characters.js';
import {createElvenRanger} from '../../regions/ibenwood/ibenwood-defense-view.js';
import {encounterGuardPose} from '../../../app/lizeem/encounter-presentation.js';

export function createOremindiCombatActor(unit,{ally=false,index=0}={}){
  const actor=ally?createElvenRanger(index):createArmyUnit({unitType:unit.unitType??'orc-raider',variant:index});
  actor.group.name=ally?unit.ranged?'North Ibenwood archer':'North Ibenwood swordsman':unit.commanderId?'South Oremindi chief':unit.name;
  actor.group.userData.oremindiCombat=true;let held=null,disposed=false;
  function update(one,time,ground,fall=1){
    actor.group.position.set(one.x,ground,one.z);actor.group.rotation.y=one.heading;actor.group.visible=!one.departed;
    const bow=!!one.ranged?.active,weapon=bow?'hunting-bow':'simple-sword';
    if(ally&&held!==weapon){actor.setWeapon(weapon);actor.setShield(!bow&&!unit.ranged);held=weapon;}
    actor.setArmed(one.hp>0&&!one.routed);
    const pose=encounterGuardPose(one,fall);
    if(bow&&one.hp>0){pose.action=one.hurt?'hurt':'idle';pose.draw=one.bowDraw??0;pose.shieldRaised=false;}
    actor.animate(time,one.hp>0?one.speed??0:0,true,pose);
  }
  return {group:actor.group,actor,update,dispose(){if(disposed)return;disposed=true;disposeCharacter(actor);}};
}
