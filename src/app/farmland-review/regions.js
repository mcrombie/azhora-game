import {NETHEREUM_FARMS,NETHEREUM_BUILDINGS,NETHEREUM_FARM_VIEW,NETHEREUM_BRIDGES,NETHEREUM_QUAY,NETHEREUM_LANES,fieldAt,nethereumFoodCapacity,inNethereumWildland} from '../../content/regions/nethereum/nethereum-agriculture.js';
import {createNethereumAgricultureSteps} from '../../content/regions/nethereum/nethereum-agriculture-scenery.js';
import {CARICAS_FARMS,CARICAS_AGRICULTURE_BUILDINGS,CARICAS_FARM_VIEW,CARICAS_AGRICULTURE_QUAY,CARICAS_AGRICULTURE_LANES,caricasFieldAt,caricasFoodCapacity,inCaricasAgricultureWoods} from '../../content/regions/minora-frontier/caricas-agriculture.js';
import {createCaricasAgricultureSteps} from '../../content/regions/minora-frontier/caricas-agriculture-scenery.js';
import {caricasTownGround} from '../../content/regions/minora-frontier/caricas-town-ground.js';
import {OVESOS_FARMS,OVESOS_AGRICULTURE_BUILDINGS,OVESOS_FARM_VIEW,OVESOS_AGRICULTURE_QUAY,OVESOS_AGRICULTURE_LANES,ovesosFieldAt,ovesosFoodCapacity,inOvesosAgricultureWildland} from '../../content/regions/oves/ovesos-agriculture.js';
import {createOvesosAgricultureSteps} from '../../content/regions/oves/ovesos-agriculture-scenery.js';
import {NESDOR_FARMS,NESDOR_AGRICULTURE_BUILDINGS,NESDOR_FARM_VIEW,NESDOR_AGRICULTURE_QUAY,NESDOR_AGRICULTURE_LANES,nesdorFieldAt,nesdorFoodCapacity,inNesdorAgricultureWoods} from '../../content/regions/nesdor/nesdor-agriculture.js';
import {createNesdorAgricultureSteps} from '../../content/regions/nesdor/nesdor-agriculture-scenery.js';
import {ISAREOS_FARMS,ISAREOS_RURAL_BUILDINGS,ISAREOS_FARM_VIEW,isareosFieldAt,isareosFoodCapacity,inIsareosAgricultureWoods} from '../../content/regions/minora-frontier/isareos-agriculture.js';
import {createIsareosAgricultureSteps,ISAREOS_REVIEW_BUILDINGS,ISAREOS_REVIEW_LANES,isareosReviewGround,isareosReviewDeckHeight} from '../../content/regions/minora-frontier/isareos-agriculture-scenery.js';
import {LIZEEM,ISAREOS_RIVER,ISAREOS_BECKS,NETH,NETHEREUM_OUTLET,NETHEREUM_STREAMS,CARICA,OVETH_UPPER,ELA_SOUTH_REACH,NESDOR_BECK,LIZEEM_REACH} from '../../content/regions/western-regions/west-regions.js';

export const FARMLAND_REGIONS={
  isareos:{id:'isareos',name:'Isareos',faction:'Neutral Minora',
    description:'Minora and its surrounding farms: a large city dependent on grain from both leagues.',
    foodDescription:'These farms provide 100 food per day against 270 needed by civilians and soldiers. Nethereum normally supplies 140 and Caricas 30. Starting reserves cover fourteen days of the deficit if both import routes close and local production stays healthy.',
    farms:ISAREOS_FARMS,buildings:ISAREOS_REVIEW_BUILDINGS,terrainBuildings:ISAREOS_RURAL_BUILDINGS,box:ISAREOS_FARM_VIEW,bridges:[],quay:null,lanes:ISAREOS_REVIEW_LANES,
    groundAt:isareosReviewGround,deckHeight:isareosReviewDeckHeight,
    courses:[LIZEEM,ISAREOS_RIVER,...ISAREOS_BECKS],createScenery:createIsareosAgricultureSteps,fieldAt:isareosFieldAt,capacity:isareosFoodCapacity,inWildland:inIsareosAgricultureWoods,
    wildlandLabel:'Western margin',wildlandDescription:'Isareos western woodland',
    spawns:{town:[-2308,60,Math.PI],fields:[-2440,-115,Math.PI/2]},
    views:{
      overview:{target:[-2470,30,0],distance:820,yaw:.15,pitch:1.05},
      fields:{target:[-2420,24,-55],distance:345,yaw:.15,pitch:.92},
      town:{target:[-2340,42,116],distance:365,yaw:1.05,pitch:.7},
      wildland:{target:[-2750,20,18],distance:220,yaw:-.6,pitch:.85},
    },
  },
  nethereum:{id:'nethereum',name:'Nethereum',faction:'West Lizeem',
    description:'Western fields, a small river town, and the wild northwestern margin.',
    farms:NETHEREUM_FARMS,buildings:NETHEREUM_BUILDINGS,box:NETHEREUM_FARM_VIEW,bridges:NETHEREUM_BRIDGES,quay:NETHEREUM_QUAY,lanes:NETHEREUM_LANES,
    courses:[LIZEEM,ISAREOS_RIVER,NETH,NETHEREUM_OUTLET,...NETHEREUM_STREAMS],
    createScenery:createNethereumAgricultureSteps,fieldAt,capacity:nethereumFoodCapacity,inWildland:inNethereumWildland,
    wildlandLabel:'Meadow & brush',wildlandDescription:'Northwestern meadow and brush',
    spawns:{town:[-2218,388,-Math.PI/2],fields:[-2770,339,Math.PI/2]},
    views:{
      overview:{target:[-2500,15,355],distance:815,yaw:.05,pitch:1.1},
      fields:{target:[-2657,16,330],distance:215,yaw:-.65,pitch:.68},
      town:{target:[-2216,19,388],distance:128,yaw:1.15,pitch:.67},
      wildland:{target:[-2868,17,222],distance:210,yaw:-.6,pitch:.7},
    },
  },
  caricas:{id:'caricas',name:'Caricas',faction:'East Lizeem',abstractEconomy:true,
    groundAt:caricasTownGround,
    description:'A river market around a civic square, three separate farmsteads, and an eastern orchard and woodland.',
    foodDescription:'The region produces 170 food per day at full condition. These representative farms show its changing health; their acreage and building count do not determine campaign population, housing or production.',
    farms:CARICAS_FARMS,buildings:CARICAS_AGRICULTURE_BUILDINGS,box:CARICAS_FARM_VIEW,bridges:[],quay:CARICAS_AGRICULTURE_QUAY,lanes:CARICAS_AGRICULTURE_LANES,
    courses:[LIZEEM,CARICA],createScenery:createCaricasAgricultureSteps,fieldAt:caricasFieldAt,capacity:caricasFoodCapacity,inWildland:inCaricasAgricultureWoods,
    wildlandLabel:'River woods',wildlandDescription:'The wooded Carica corridor',
    spawns:{town:[-2098,279,-Math.PI/2],fields:[-1990,395,Math.PI/2]},
    views:{
      overview:{target:[-1970,22,255],distance:760,yaw:.12,pitch:1.08},
      fields:{target:[-1990,25,395],distance:225,yaw:.65,pitch:.78},
      town:{target:[-2110,19,273],distance:195,yaw:-.75,pitch:.78},
      wildland:{target:[-1735,28,417],distance:220,yaw:.5,pitch:.8},
    },
  },
  ovesos:{id:'ovesos',name:'Ovesos',faction:'West Lizeem',
    description:'A compact river town, three farming clusters, and an open western margin.',
    foodDescription:'These farms feed Ovesos and can share supplies with Nethereum through open friendly routes. Ovesos has no direct Minora export contract.',
    farms:OVESOS_FARMS,buildings:OVESOS_AGRICULTURE_BUILDINGS,box:OVESOS_FARM_VIEW,bridges:[],quay:OVESOS_AGRICULTURE_QUAY,lanes:OVESOS_AGRICULTURE_LANES,
    courses:[LIZEEM,NETH,OVETH_UPPER],createScenery:createOvesosAgricultureSteps,fieldAt:ovesosFieldAt,capacity:ovesosFoodCapacity,inWildland:inOvesosAgricultureWildland,
    wildlandLabel:'Western margin',wildlandDescription:'Western meadow and scrub',
    spawns:{town:[-1910,602,-Math.PI/2],fields:[-2100,690,Math.PI/2]},
    views:{
      overview:{target:[-2000,15,688],distance:735,yaw:.05,pitch:1.05},
      fields:{target:[-2100,15,678],distance:280,yaw:.5,pitch:.9},
      town:{target:[-1915,14,605],distance:192,yaw:1.0,pitch:.78},
      wildland:{target:[-2252,14,665],distance:200,yaw:-.5,pitch:.75},
    },
  },
  nesdor:{id:'nesdor',name:'Nesdor',faction:'East Lizeem',
    description:'A river town and productive clearings within a much more wooded countryside.',
    foodDescription:'Nesdor barely covers its own needs. Disruptions make it dependent on Caricas through open friendly routes, leaving Caricas less food to send to Minora. Forests are uncultivated potential; logging is not simulated.',
    farms:NESDOR_FARMS,buildings:NESDOR_AGRICULTURE_BUILDINGS,box:NESDOR_FARM_VIEW,bridges:[],quay:NESDOR_AGRICULTURE_QUAY,lanes:NESDOR_AGRICULTURE_LANES,
    courses:[LIZEEM,CARICA,ELA_SOUTH_REACH,NESDOR_BECK,LIZEEM_REACH],createScenery:createNesdorAgricultureSteps,fieldAt:nesdorFieldAt,capacity:nesdorFoodCapacity,inWildland:inNesdorAgricultureWoods,
    wildlandLabel:'Woodlands',wildlandDescription:'Nesdor woodland and clearings',
    spawns:{town:[-1578,850,Math.PI/2],fields:[-1370,832,-Math.PI/2]},
    views:{
      overview:{target:[-1480,12,705],distance:775,yaw:.1,pitch:1.12},
      fields:{target:[-1410,10,822],distance:235,yaw:.35,pitch:.85},
      town:{target:[-1574,9,840],distance:195,yaw:-.9,pitch:.78},
      wildland:{target:[-1330,13,724],distance:245,yaw:.45,pitch:.83},
    },
  },
};
