import {YUNETHRE_TOWN as T,YUNETHRE_CAMP as C} from '../../regions/minora-frontier/yunethre-world.js';
import {CANERD} from '../../regions/canerd/canerd-world.js';
export const CHAPTER_LOCATIONS=Object.freeze({
  town:{id:'town',name:'Laketown council representative',x:T.x+4,z:T.z+4,region:38},
  centaurs:{id:'centaurs',name:'Centaur speaker',x:C.x-5,z:C.z+4,region:38},
  // The open western court leaves the garden entrance, oak conversation and
  // household walking lanes clear. Keep the envoy's five-metre greeting here.
  celder:{id:'celder',name:'Celder envoy',x:CANERD.courtyard.x-6,z:CANERD.courtyard.z-1,region:62},
  departure:{id:'departure',name:'The road to Minora',x:-2470,z:148,region:16},
});
export const YUNETHRE_ENTRY={x:-2850,z:-230.8076211353316};
export const CANERD_ENTRY={x:CANERD.gate.x,z:CANERD.gate.z+12};
