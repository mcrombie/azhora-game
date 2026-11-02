import {createUguth} from '../../content/characters/uguth.js';
import {createExpeditionTrialActor} from '../../content/characters/expedition-trial-actors.js';
import {createAdvancedTrialActor} from '../../content/characters/advanced-trial-actors.js';
import {createFrontierTrialActor} from '../../content/characters/frontier-trial-actors.js';
import {createArmyUnit} from '../../content/characters/army-unit-view.js';
import {createOgreBruiser} from '../../content/characters/ogre-bruiser.js';
import {createCharacter,createGoblin,createWolf} from '../../content/characters/characters.js';

export function createTrialOpponent(id,weapon){
  const actor=(id==='uguth'?createUguth({armed:true}):null)??createExpeditionTrialActor(id)??createFrontierTrialActor(id)??createAdvancedTrialActor(id)??(id==='ogre-bruiser'?createOgreBruiser():!['bramble-goblin','wolf','bandit'].includes(id)?createArmyUnit({unitType:id,weapon}):id==='bramble-goblin'?createGoblin({variant:0}):id==='wolf'?createWolf({variant:1}):createCharacter({
    role:'mercenary',armed:true,tunic:0x695346,skin:0xb89370,
    look:{weapon:'sword',headgear:'bare',hairStyle:'lank',hair:0x392b24,facialHair:'stubble',garment:'jerkin',build:'ordinary'},
  }));
  actor.group.name='trial-'+id;actor.group.userData.trialOpponent=id;
  if(id==='bandit'){actor.setWeapon('simple-sword');actor.setShield(false);actor.group.userData.defense='weapon';}
  actor.setArmed(true);return actor;
}
