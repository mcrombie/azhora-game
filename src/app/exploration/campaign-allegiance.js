// Allegiance belongs to the player's campaign, not the autonomous war engine.
// Legacy saves may lack it; completed aid remains history, not a forced choice.
import {validTowerState} from './tower-state.js';

// A missing side in this checkpoint is an intentional, still-open decision for
// Taleth. Older outdoor saves without tower progress remain legacy migrations.
export function isUnbriefedTowerCheckpoint(saved){
  return validTowerState(saved?.tower)&&!saved.tower.briefed;
}

export const CAMPAIGN_SIDES=Object.freeze([
  Object.freeze({id:'west',name:'West Lizeem',description:'Support the western councils of Nethereum and Ovesos. Captain Meret Voss leads their forces; their opening army is marching on Caricas.'}),
  Object.freeze({id:'east',name:'East Lizeem',description:'Support the eastern league of Caricas and Nesdor. Captain Serevan Dain commands its river guard; Caricas must withstand the western advance.'}),
]);

export const isCampaignSide=side=>side==='west'||side==='east';
export function campaignSideFromSearch(search){
  const side=new URLSearchParams(search).get('campaign-side');return isCampaignSide(side)?side:null;
}
export function pendingCampaignCommitment(pending){
  return [pending?.duel?.faction,pending?.rally?.faction,pending?.participation?.faction].find(isCampaignSide)??null;
}
export function activeCampaignCommitment(state){
  const pending=pendingCampaignCommitment(state?.pending);if(pending)return pending;
  // A partly fought encounter must retain its side when an older save migrates.
  // Once all its playable stages have ended, either allegiance may be chosen.
  const battle=(state?.engagements??[]).findLast(b=>b.status==='active'&&
    (b.participation?.intercept?.status==='available'||b.rally?.status==='available')&&
    isCampaignSide(pendingCampaignCommitment(b)));
  return pendingCampaignCommitment(battle);
}
export function savedCampaignCommitment(saved,state){
  return activeCampaignCommitment(state)??(isCampaignSide(saved?.afterlife?.death?.side)?saved.afterlife.death.side:null);
}
export function legacyCampaignSidesConflict(saved,state){
  // Before fixed allegiance, an undead hero could fight for the other league
  // while keeping an older Reaper retry. Preserve that rare save's original
  // battle choices: assigning either side would invalidate one playable branch.
  if(saved?.campaignSide!==undefined)return false;
  const active=activeCampaignCommitment(state),retry=saved?.afterlife?.death?.side;
  return !!active&&isCampaignSide(retry)&&active!==retry;
}
