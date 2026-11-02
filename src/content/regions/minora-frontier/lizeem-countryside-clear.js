import {nethereumFarmReserved} from '../nethereum/nethereum-farm.js';
import {nesdorFarmReserved} from '../nesdor/nesdor-farm.js';
import {ovesosFarmReserved} from '../oves/ovesos-farm.js';
import {menoraReserved} from './menora-city.js';
import {isareosHamletReserved} from './isareos-hamlet.js';
import {caricasSettlementReserved} from './caricas-settlement.js';
import {lizeemCrossingReserved} from './lizeem-crossings.js';
// Protect all authored paths, canal banks, flood works, houses and playable beds.
const reserved={Caricas:caricasSettlementReserved,Nethereum:nethereumFarmReserved,
  Nesdor:nesdorFarmReserved,Ovesos:ovesosFarmReserved,Isareos:(x,z,m)=>menoraReserved(x,z,m)||isareosHamletReserved(x,z,m)};
export const countrysideClear=(p,f)=>!lizeemCrossingReserved(p.x,p.z,2)&&!reserved[f.region]?.(p.x,p.z,1.5);
