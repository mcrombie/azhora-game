/** Small discoveries only: no political allegiance or invented royal canon. */
export const SEVRON_THREAT_IDS=Object.freeze(['west-oremindi-pass-goblins','west-oremindi-ruin-goblins']);
export function validateSevronSnapshot(value){
 if(value===undefined)return true;
 return !!value&&value.version===1&&['entranceDiscovered','cityDiscovered','secretOpen','treasureTaken'].every(k=>typeof value[k]==='boolean')
  &&Array.isArray(value.defeatedThreats)&&new Set(value.defeatedThreats).size===value.defeatedThreats.length
  &&value.defeatedThreats.every(id=>SEVRON_THREAT_IDS.includes(id))&&(!value.cityDiscovered||value.entranceDiscovered)
  &&(!value.treasureTaken||value.secretOpen);
}
export function createSevronState(){
 const initial=()=>({version:1,entranceDiscovered:false,cityDiscovered:false,secretOpen:false,treasureTaken:false,defeatedThreats:[]});let data=initial();
 const snapshot=()=>({...data,defeatedThreats:[...data.defeatedThreats]});
 return {snapshot,state:snapshot,
 discoverEntrance(){data.entranceDiscovered=true;},discoverCity(){const fresh=!data.cityDiscovered;data.entranceDiscovered=true;data.cityDiscovered=true;return fresh;},
 openSecret(){const fresh=!data.secretOpen;data.secretOpen=true;return fresh;},
 takeTreasure(){if(data.treasureTaken||!data.secretOpen)return null;data.treasureTaken=true;return {item:'copper-piece',quantity:36};},
 defeat(id){if(!SEVRON_THREAT_IDS.includes(id)||data.defeatedThreats.includes(id))return false;data.defeatedThreats.push(id);return true;},
 restore(value){if(value===undefined){data=initial();return true;}if(!validateSevronSnapshot(value))return false;
 data={...initial(),...Object.fromEntries(['entranceDiscovered','cityDiscovered','secretOpen','treasureTaken'].map(k=>[k,value[k]])),defeatedThreats:[...new Set(value.defeatedThreats)]};return true;},
 };
}
