import {worldToVillage} from './region-world.js';
import {groundWithRiver,villageBase,villageWeight,lerp} from './world-terrain.js';
import {AVREL_POND,avrelPondGround} from '../../content/regions/drent/avrel-pond.js';
import {portCalosGround} from '../../content/regions/port-calos/port-calos-world.js';
import {groveGround} from '../../content/regions/ibenwood/ibenwood-pilot.js';
import {brandyHomeGround} from '../../content/quests/brandy/brandy-home-world.js';
import {createIbenwoodRiverSystem} from '../../content/regions/ibenwood/ibenwood-rivers.js';
import {createAlezhorBankGround} from '../../content/regions/alezhor/alezhor-bank-ground.js';

// Shared authored surface, before rendering-only sinks and bridge/deck overrides.
// The playable world supplies its local pond; the distant export never shows it.
export function createWorldGround(localGround=villageBase){
  const avrelSurface=groundWithRiver(AVREL_POND.x,AVREL_POND.z)-1.15;
  function rawGroundHeight(x,z){
    const local=worldToVillage(x,z),weight=villageWeight(local.x,local.z);
    if(weight<=0)return portCalosGround(x,z,avrelPondGround(x,z,groundWithRiver(x,z),avrelSurface));
    const village=localGround(local.x,local.z);
    return weight>=1?village:lerp(groundWithRiver(x,z),village,weight);
  }
  const uncarvedForestGround=(x,z)=>groveGround(x,z,(a,b)=>brandyHomeGround(a,b,rawGroundHeight));
  const ibenwoodRivers=createIbenwoodRiverSystem({groundHeight:uncarvedForestGround});
  const legacyAlezhorBankHeight=(x,z)=>ibenwoodRivers.ground(x,z,uncarvedForestGround(x,z));
  const alezhorBanks=createAlezhorBankGround(ibenwoodRivers);
  const groundHeight=(x,z)=>alezhorBanks.ground(x,z,legacyAlezhorBankHeight(x,z));
  return {groundHeight,legacyAlezhorBankHeight,ibenwoodRivers,avrelSurface};
}
