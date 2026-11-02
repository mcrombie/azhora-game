import {createWorldWar} from '../../../app/exploration/world-war.js';
import {createAdventureWar} from '../../../experiments/day-night/opening-war.js';

// Townspeople remember the completed campaign. Reconstruct its last snapshot
// only at chapter creation/load; never resume or advance that old simulation.
export function yunethreResidentCampaign(saved){
  const history=saved.history;
  if(history)return (history.fullCampaign?createAdventureWar(history):createWorldWar(history)).snapshot();
  // Older direct Chapter 2 saves know the winner but have no personal history
  // or regional ledgers. Do not invent battles, population or food stores.
  return {winner:saved.chapter.premise.winner,regions:{},armies:[],engagements:[]};
}
