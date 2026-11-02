import {BUCKLER_NAME} from './characters.js';

// Shared by rank-and-file troops and their named captains. The board must face
// forward during guard and hang outside the body at rest, including on death.
export function applyArmyShieldPose(actor){
  const shield=actor.group.getObjectByName('Round shield')??actor.group.getObjectByName('Ambroni heater shield')??actor.group.getObjectByName(BUCKLER_NAME);
  if(!shield)return;
  const animate=actor.animate;
  actor.animate=(time,speed,grounded,pose={})=>{
    animate(time,speed,grounded,pose);
    const raised=pose.action!=='dead'&&(pose.guarding||pose.shieldRaised);
    shield.position.set(...(raised?[-.105,-.296,.013]:[-.05,-.20,.06]));
    shield.rotation.set(...(raised?[.588,.248,-.487]:[-1.426,-.095,-Math.PI/2]));
  };
}
