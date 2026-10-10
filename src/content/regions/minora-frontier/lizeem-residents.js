import {MINORA_RESIDENTS} from './minora-residents.js';
import {LIZEEM_MARKET_STANDS} from './menora-city.js';

// Appearance-only adaptations of the existing farmland cast. No imports from
// the old quest/merchant modules. Melka and Nera are new local civilians.
const grey=0x9a968e,white=0xe4e1d8;
const stall=LIZEEM_MARKET_STANDS.find(s=>s.factor==='adapa');
export const CORRIDOR_RESIDENTS=Object.freeze([
  {id:'adapa',name:'Adapa',occupation:'Ovesian factor',place:'Minora',region:'isareos',side:'west',role:'mercenary',tunic:0x6e5034,x:stall.x,z:stall.z,yaw:stall.yaw,
    look:{build:'tall-lean',headgear:'bare',hairStyle:'receding',hair:grey,facialHair:'forked',garment:'robe',jerkin:false}},
  {id:'nepri',name:'Nepri',occupation:'Grain measurer',place:'Minora',region:'isareos',role:'mercenary',tunic:0x6b5238,x:-2337,z:192.5,yaw:Math.PI,walk:[2,0],
    look:{build:'broad',headgear:'bare',hairStyle:'bald',hair:white,facialHair:'trimmed',garment:'jerkin'}},
  {id:'rudiger',name:'Rudiger',occupation:'Barracks commissary',place:'Minora',region:'isareos',role:'relay-clerk',tunic:0x8f3b30,x:-2421,z:79.5,yaw:Math.PI,
    look:{hairStyle:'cropped',hair:0x5b3a28}},
  {id:'imhotep',name:'Imhotep',occupation:'White Bridge warden',place:'Minora gates',region:'isareos',role:'bridge-keeper',tunic:0x7c7f80,x:-2254,z:127,yaw:.6,walk:[3,0],
    look:{slight:true,hairStyle:'short-cropped',hair:0x141710,beard:false,hat:false}},
  {id:'melka',name:'Melka',occupation:'Road carrier',place:'Caricas road',region:'caricas',role:'mercenary',tunic:0x596c79,x:-2142,z:146,yaw:Math.PI,walk:[1,3],
    look:{headgear:'bare',hairStyle:'cropped',hair:0x30201a,facialHair:'stubble',garment:'jerkin'}},
  {id:'egeria',name:'Egeria',occupation:'Voice of the Caricas council',place:'Caricas',region:'caricas',side:'east',role:'villager',tunic:0x7d8a72,x:-2100,z:272.6,yaw:Math.PI,
    shelter:[[-2108,274],[-2113.4,281]],look:{slight:true,dress:true,hair:0x4a443e,hairStyle:'topknot'}},
  {id:'consus',name:'Consus',occupation:'Grain factor and sworn measurer',place:'Caricas',region:'caricas',side:'east',role:'mercenary',tunic:0x7a6248,x:-2084,z:272.6,yaw:Math.PI,
    shelter:[[-2077,274],[-2075.1,279]],look:{build:'heavy',headgear:'bare',hairStyle:'bald',hair:white,facialHair:'moustache',garment:'jerkin'}},
  {id:'ilmarinen',name:'Ilmarinen',occupation:'Toolsmith',place:'Caricas',region:'caricas',role:'mercenary',tunic:0x5b4a3a,skin:0x8f6a52,x:-2100.3,z:312,yaw:Math.PI/2,walk:[0,1.5],
    shelter:[[-2100.3,314],[-2099.6,314]],look:{build:'broad',headgear:'bare',hairStyle:'cropped',hair:0x7f7f7f,facialHair:'bushy',garment:'bare-forearms',marks:['scar']}},
  {id:'vertumnus',name:'Vertumnus',occupation:'Keeper of the North Farm',place:'Caricas north fields',region:'caricas',role:'rise-custodian',tunic:0x55703f,x:-2103,z:143,yaw:-Math.PI/2,walk:[0,4],
    look:{hairStyle:'cropped',hair:0xd8d6d0,cloak:false}},
  {id:'messor',name:'Messor',occupation:'Field hand',place:'Caricas north fields',region:'caricas',role:'mercenary',tunic:0x6b5232,x:-2112,z:137,yaw:Math.PI/2,walk:[5,0],
    look:{headgear:'bare',hairStyle:'cropped',hair:0x5c4124,facialHair:'clean',garment:'jerkin'}},
  {id:'pomona',name:'Pomona',occupation:'Orchard keeper',place:'Caricas east orchard',region:'caricas',side:'east',role:'villager',tunic:0x5f7a45,x:-2020,z:291,yaw:Math.PI,walk:[0,3],
    look:{slight:true,dress:true,hair:0x8a3f1f,hairStyle:'long-loose'}},
  {id:'nera',name:'Nera',occupation:'Seed sorter',place:'Caricas east orchard',region:'caricas',role:'relay-clerk',tunic:0xa48b58,x:-2001.7,z:315,yaw:Math.PI,
    look:{slight:true,dress:true,hair:0x30251c,hairStyle:'braid'}},
].map(d=>Object.freeze(d)));
export const LIZEEM_RESIDENTS=Object.freeze([
  ...MINORA_RESIDENTS.map(d=>Object.freeze({...d,place:'Minora',region:'isareos'})),...CORRIDOR_RESIDENTS,
]);
