import {createWorldWar} from '../../app/exploration/world-war.js';
import {WORLD_WAR_KEY} from '../../app/exploration/war-checkpoint.js';
import {LOOKOUT_TALETH} from '../../app/exploration/tower-state.js';

// Fresh default-seed history, with no hero interventions or forced victor.
// Loaded only for the explicit developer preview; never changes the current run.
export function createUnattendedLookout(){
  const war=createWorldWar();war.advance(1000);
  const state=war.snapshot();
  if(!state.winner)throw Error('The default unattended war did not reach a settlement.');
  return {format:WORLD_WAR_KEY,version:1,...war.checkpoint(),
    tower:{version:1,location:'lookout',briefed:true,running:false,concluded:false},
    exploration:{version:1,character:'teresod',position:{x:LOOKOUT_TALETH.x-1,y:LOOKOUT_TALETH.y,z:LOOKOUT_TALETH.z-1},heading:0,camera:{yaw:0,pitch:.27,distance:8},elapsed:0,cells:[]}};
}
