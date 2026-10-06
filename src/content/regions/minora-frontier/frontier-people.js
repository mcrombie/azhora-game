import {MENORA_NPC_ANCHORS} from './menora-city.js';
import {CARICAS_GUARD_POSTS} from './caricas-settlement.js';
import {YUNETHRE_TOWN,YUNETHRE_CAMP} from './yunethre-world.js';
const freeze=Object.freeze;
const soldier=(id,name,role,at,index=0,extra={})=>freeze({id,name,role,x:at.x,z:at.z,yaw:at.yaw??Math.PI,
  modelRole:index===0?'legion-officer':'legion-soldier',color:index===0?0x722b2e:0x8f3b30,
  look:freeze({hairStyle:'short-cropped',hair:index%2?0x4b3529:0x7a6845,noHat:true}),hat:false,armed:true,soldier:true,...extra});
export const FRONTIER_PRINCES=freeze([
  freeze({id:'prince-cedric',name:'Prince Cedric',role:'Claimant to the Ambroni crown',...MENORA_NPC_ANCHORS.cedric,
    modelRole:'mercenary',prince:true,color:0x786480,skin:0xd4b994,essential:true,maxHp:260,
    look:freeze({hairStyle:'long-loose',hair:0xa59061,headgear:'bare',facialHair:'clean',garment:'gambeson',weapon:'sword'}),hat:false}),
  freeze({id:'prince-wilhelm',name:'Prince Wilhelm',role:'The Blood Prince',...MENORA_NPC_ANCHORS.wilhelm,
    modelRole:'legion-officer',prince:true,color:0x69272d,skin:0xd8c8b2,essential:true,maxHp:600,
    look:freeze({hairStyle:'short-cropped',hair:0xe5e1cd,expression:'twisted',noHat:true}),hat:false,armed:true}),
]);
export const MENORA_SOLDIERS=freeze([
  ...MENORA_NPC_ANCHORS.guards.map((p,i)=>soldier(`menora-guard-${i+1}`,'Minora guard','Temple-city garrison',p,i+1)),
  ...MENORA_NPC_ANCHORS.army.map((p,i)=>soldier(`blood-prince-soldier-${i+1}`,i?'Blood Prince’s soldier':'Blood Prince’s captain','Prince Wilhelm’s army',p,i,{color:i?0x632d30:0x431d26,maxHp:280})),
]);
export const CARICAS_SOLDIERS=freeze(CARICAS_GUARD_POSTS.map((p,i)=>soldier(`caricas-soldier-${i+1}`,i?'Ambroni soldier':'Caricas garrison officer','Imperial occupation garrison',p,i)));
const centaur=(id,at,i,extra={})=>freeze({id,name:'Centaur warrior',role:'Defender of the Yunethran grasslands',modelRole:'centaur',
  centaur:true,kind:'centaur',variant:i,radius:.76,maxHp:230,armed:true,hat:false,soldier:true,...at,...extra});
export const CENTAUR_RAIDER_IDS=freeze(['yunethre-raider-1','yunethre-raider-2','yunethre-raider-3']);
export const YUNETHRE_PEOPLE=freeze([
  ...[[-8,-7],[8,-7],[-9,8],[9,8]].map(([x,z],i)=>centaur(`yunethre-camp-guard-${i+1}`,{x:YUNETHRE_CAMP.x+x,z:YUNETHRE_CAMP.z+z,yaw:i*Math.PI/2},i,{archer:i%2===0})),
  ...CENTAUR_RAIDER_IDS.map((id,i)=>centaur(id,{x:YUNETHRE_CAMP.x+(i-1)*4,z:YUNETHRE_CAMP.z+17,yaw:Math.PI},i,{raider:true,role:'Bane’s Camp raiding patrol'})),
  centaur('yunethre-free-town-centaur',{x:YUNETHRE_TOWN.x+6,z:YUNETHRE_TOWN.z-4,yaw:-Math.PI/2},1,
    {name:'Centaur peacekeeper',role:'Guardian of the free town’s truce',neutral:true,envoy:true}),
  freeze({id:'yunethre-free-town-elf',name:'Elven peacekeeper',role:'Guardian of the free town’s truce',modelRole:'mercenary',
    x:YUNETHRE_TOWN.x-6,z:YUNETHRE_TOWN.z-4,yaw:Math.PI/2,color:0x526858,skin:0xcfbea4,
    look:freeze({elven:true,hairStyle:'long',hair:0x786543,headgear:'bare',facialHair:'clean',weapon:'bow'}),
    scale:1.04,hat:false,armed:true,neutral:true,soldier:true,maxHp:260}),
  freeze({id:'yunethre-free-town-human',name:'Human peacekeeper',role:'Guardian of the free town’s truce',modelRole:'mercenary',
    x:YUNETHRE_TOWN.x+5,z:YUNETHRE_TOWN.z+8,yaw:Math.PI,color:0x82684c,skin:0xb68e6b,
    look:freeze({hairStyle:'short-cropped',hair:0x3c3027,headgear:'bare',facialHair:'clean',weapon:'spear'}),
    hat:false,armed:true,neutral:true,soldier:true,maxHp:220}),
]);
export const FRONTIER_NPCS=freeze([...FRONTIER_PRINCES,...MENORA_SOLDIERS,...CARICAS_SOLDIERS,...YUNETHRE_PEOPLE]);
const ids=new Set(FRONTIER_NPCS.map(n=>n.id));
export const isFrontierNpc=id=>ids.has(id);
export function frontierConversation(id){
  if(id==='prince-cedric')return [
    'They have put my half-brother Willard on the throne in Ambron. That does not make it his crown.',
    'Minora has received me beneath the protection of this temple. Its walls still stand, its guild still watches, and I have not renounced my claim.',
    'My brother Wilhelm is here with his army. What comes next is not yet settled.',
  ];
  if(id==='prince-wilhelm')return [
    'The Blood Prince. They say it as though a name could frighten me.',
    'My brother Cedric keeps his court in the temple. My soldiers keep their blades close. Minora is a beautiful city. Such very white walls.',
    'I have no commission for you today. Watch the road.',
  ];
  if(id.startsWith('blood-prince-'))return ['The prince’s camp. Keep the muster ground clear.','We march when Prince Wilhelm gives the order. Until then, we hold here.'];
  if(id.startsWith('menora-'))return ['Minora’s gates are held. The temple and the Sorcerers’ Guild are under our protection.',
    'Centaur bands are raiding the north and west of Isareos. Inside these walls, the watch keeps the peace.'];
  if(id.startsWith('caricas-'))return ['Caricas is occupied in full by the Ambroni Empire. The roads, market and grain stores are under our guard.',
    'That does not mean everyone here has accepted it. There is still a civil war to settle. For now, keep the road clear.'];
  if(id.includes('free-town'))return ['No imperial banners here. This town belongs to neither Ambron, Celder nor Elfland.',
    'Human, elf and centaur share its hearths. Feuds stay outside the town. Every side knows why a peaceful meeting place matters.',
    'The elves trade with the centaurs and help them defend Yunethre. Here, they can meet people without drawing a bow.'];
  if(id.startsWith('yunethre-'))return ['Humans press onto our grazing grounds from Celder in the north and Isareos in the south. We will not surrender the last of the grasslands.',
    'Our camps move with the season. Our families keep the herds and the routes; our warriors ride on no borrowed legs.',
    'The elves have lost their forests as we have lost our plains. They trade with us, and help us hold this passage between Oremindi and Lotharn.'];
  return null;
}
