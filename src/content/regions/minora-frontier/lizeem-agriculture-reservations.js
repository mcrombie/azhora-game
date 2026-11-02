import {menoraBridgeAt,menoraReserved} from './menora-city.js';
import {lizeemCrossingReserved} from './lizeem-crossings.js';
import {NETHEREUM_BRIDGES,NETHEREUM_QUAY} from '../nethereum/nethereum-agriculture.js';
import {CARICAS_AGRICULTURE_QUAY} from './caricas-agriculture.js';
import {OVESOS_AGRICULTURE_QUAY} from '../oves/ovesos-agriculture.js';
import {NESDOR_AGRICULTURE_QUAY} from '../nesdor/nesdor-agriculture.js';

// Farms can cross a regional border's scenery: notably Caricas at the end of
// Minora's White Bridge. Reserve the shared transport footprints in every
// agricultural layout, including standalone reviews, not only the world host.
const decks=[...NETHEREUM_BRIDGES,...[NETHEREUM_QUAY,CARICAS_AGRICULTURE_QUAY,OVESOS_AGRICULTURE_QUAY,NESDOR_AGRICULTURE_QUAY]
  .map(q=>({x:(q.bank+q.end)/2,z:q.z,width:q.width,length:Math.abs(q.end-q.bank),yaw:Math.PI/2}))]
  .map(d=>({...d,c:Math.cos(d.yaw),s:Math.sin(d.yaw)}));
export function lizeemAgricultureReserved(x,z,radius=0){
  if(menoraBridgeAt(x,z,radius)||menoraReserved(x,z,radius)||lizeemCrossingReserved(x,z,radius))return true;
  return decks.some(d=>Math.abs((x-d.x)*d.c-(z-d.z)*d.s)<=d.width/2+radius&&
    Math.abs((x-d.x)*d.s+(z-d.z)*d.c)<=d.length/2+radius);
}
