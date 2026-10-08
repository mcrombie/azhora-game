// Limited scenario appearance/placement subset of Claude's authored Minora cast
// in lizeem-people.js and lizeem-minora-people.js. Kept data-only deliberately:
// those adventure modules also register merchants and depend on farming quests.
// This trial does not activate their old dialogue, trade, or story obligations.
import {LIZEEM_MARKET_STANDS} from './menora-city.js';
const stall=id=>{const {x,z,yaw}=LIZEEM_MARKET_STANDS.find(s=>s.factor===id);return {x,z,yaw};};
export const MINORA_RESIDENTS=Object.freeze([
  {id:'seshat',name:'Seshat',occupation:'Guild ledger clerk',role:'relay-clerk',tunic:0x2f3d5c,x:-2328,z:59.5,yaw:0,look:{slight:true,dress:true,hair:0x9a968e,hairStyle:'long-tied'}},
  {id:'satet',name:'Satet',occupation:'Temple bowl-keeper',role:'villager',tunic:0xbfc0bc,x:-2343,z:129,yaw:.34,walk:[1.5,1],look:{slight:true,dress:true,hair:0x221812,hairStyle:'braid'}},
  {id:'portunus',name:'Portunus',occupation:'Carican factor',role:'mercenary',tunic:0x4f6b3c,...stall('portunus'),look:{headgear:'bare',hairStyle:'cropped',hair:0x8b4a1f,facialHair:'stubble',garment:'jerkin'}},
  {id:'njord',name:'Njord',occupation:'Nesdor carter',role:'mercenary',tunic:0x6b4a2e,...stall('njord'),look:{build:'broad',headgear:'bare',hairStyle:'cropped',hair:0xcfae6a,facialHair:'full',garment:'fur-mantle'}},
  {id:'manawydan',name:'Manawydan',occupation:'Nethrani factor',role:'villager',tunic:0x5b5a46,skin:0xc29a7c,...stall('manawydan'),look:{slight:true,dress:true,hair:0x9a968e,hairStyle:'braid'}},
  {id:'hapi',name:'Hapi',occupation:'Barge master',role:'mercenary',tunic:0xcbc2a6,skin:0xb98a66,x:-2337,z:209.6,yaw:Math.PI/2,walk:[3,0],look:{build:'heavy',headgear:'bare',hairStyle:'curls',hair:0x9a968e,facialHair:'stubble',garment:'bare-forearms'}},
].map(Object.freeze));
