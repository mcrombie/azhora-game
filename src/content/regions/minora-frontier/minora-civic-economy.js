import {deriveMinoraCivicState,minoraPublicCivicReport} from '../../../simulation/minora-civic.js';
import {MINORA_CIVIC_BUILDINGS} from './minora-civic-layout.js';

// Authored allocation of the existing Isareos ledger, not new stores or people.
const CONFIG=Object.freeze({storageShares:{granary:.6,temple:.3,merchants:.1},
  sealedTempleShare:.2,guildMealShare:.02,charityMealShare:.05,reserveTarget:2380,
  battleWindow:4,reliefRegions:['nethereum','caricas','ovesos','nesdor']});
export function minoraCivicEconomy(campaign){
  const region=campaign?.regions?.isareos??{};
  return deriveMinoraCivicState(region,{config:CONFIG,day:campaign?.day??0,
    battles:campaign?.engagements??[],buildings:MINORA_CIVIC_BUILDINGS});
}
export const minoraCivicPublicReport=campaign=>minoraPublicCivicReport(minoraCivicEconomy(campaign));
export function minoraResidentCivicContext(campaign){
  const report=minoraCivicPublicReport(campaign);
  return {reliefText:report.relief,supplyText:report.granary};
}
export function minoraBuildingCondition(building,report){
  if(['temple','relief','charity'].includes(building.service))return report.temple+' '+report.relief;
  if(['guild','library','stable'].includes(building.service))return report.guild;
  if(building.service==='granary')return report.granary;
  if(['bakery','inn','provisions'].includes(building.service))return report.market;
  if(building.service==='assembly')return report.granary+' '+report.relief;
  return '';
}
