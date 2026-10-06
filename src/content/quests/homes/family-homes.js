import { VILLAGE, villageToWorld } from '../../../world/terrain/region-world.js';
import { APPLEGARTH_BUILDINGS, OLD_ROAD_YAW } from '../rena/rena.js';

const freeze=Object.freeze;
export const homePoint=(home,x,z)=>freeze({x:home.house.x+x*Math.cos(home.house.yaw)+z*Math.sin(home.house.yaw),
  z:home.house.z-x*Math.sin(home.house.yaw)+z*Math.cos(home.house.yaw)});
function home(id,name,residents,house,style,extra={}) {
  const value={id,name,residents:freeze(residents),house:freeze(house),style,...extra};
  const front=Math.max(house.depth/2+1.5,Math.max(house.width,house.depth)*.62+1);
  value.approach=homePoint(value,0,front);
  value.door=homePoint(value,0,house.depth/2+.65);
  const mailboxX=(extra.mailboxSide??-1)*(house.width*.5+.45);
  value.mailbox=freeze({...homePoint(value,mailboxX,house.depth/2+1.6),name,yaw:house.yaw});
  value.mailboxStand=homePoint(value,mailboxX,house.depth/2+3.1);
  return freeze(value);
}
const localHouse=(x,z,width,depth,height,yaw)=>({...villageToWorld(x,z),width,depth,height,yaw:yaw+VILLAGE.yaw,local:freeze({x,z,yaw})});
const farm=APPLEGARTH_BUILDINGS.find(h=>h.id==='house-1');
export const FAMILY_HOMES=freeze([
  home('jess-family-home','Jess, Ryan and Barrett',['boatman','willowmere-ryan','willowmere-barrett','village-dog'],localHouse(12,13,6,5.3,3.8,-.61),'hippie',
    {pet:'Rip',mailboxSide:1,relationship:'Jess and Ryan are partners; Barrett is their child. Rip is the family dog.'}),
  home('glun-jojo-home','Glun and Jojo',['instructor','harbormaster'],localHouse(-11,12,5.2,4.7,3.15,.64),'orderly',
    {relationship:'Glun and Jojo are married.'}),
  home('martin-lee-anne-home','Martin and Lee Anne',['tidehaven-smith','lee-anne'],localHouse(11,-21,5.9,5.3,3.45,-.37),'hearth',
    {relationship:'Martin and Lee Anne are married.'}),
  home('jean-stanley-home','Jean and Stanley',['garden-keeper','avrel-farmer'],{...farm,yaw:OLD_ROAD_YAW+Math.PI*1.5},'garden',
    {buildingId: farm.id,relationship:'Jean and Stanley are married. Their shared home is in Applegarth; Jean still teaches beside the Tidehaven road.'}),
  home('mark-home','Mark',['doomsayer'],localHouse(-37,-34,5.6,4.8,3.05,.8),'moon',
    {newBuilding:true,relationship:'Mark keeps a peculiar cottage just beyond the village, hung with herbs and moon charms.'}),
]);
export const MARK_HOME=FAMILY_HOMES.find(h=>h.id==='mark-home');
export const MARK_HOME_PATH=freeze([
  villageToWorld(-28,-18),villageToWorld(-31,-24),villageToWorld(-32,-30),MARK_HOME.approach,
].map(freeze));
export const familyHomeForResident=id=>FAMILY_HOMES.find(h=>h.residents.includes(id))??null;
const lines=freeze({
  boatman:freeze(['Ryan is my boyfriend. Our place is the bright, rather untidy cottage near the landing. Barrett lives with us, and Rip considers the whole doorstep his.']),
  'willowmere-ryan':freeze(['Jess is my girlfriend. We share the colorful cottage near the landing with Barrett and our dog, Rip. The mess makes sense to us. Usually.']),
  'willowmere-barrett':freeze(['Jess and Ryan are my parents. Rip is our dog! Our house has all the bright cloth outside.']),
  instructor:freeze(['Jojo is my wife. We keep the cottage near the landing: swept step, straight fence, everything where it belongs. She runs a tighter household than I run a parade.']),
  harbormaster:freeze(['Glun is my husband. Our cottage is near the landing, with the neat little step and both our names on the mailbox. He straightens things; I tell him where they belong.']),
  'tidehaven-smith':freeze(['Lee Anne is my wife. Our cottage has the copper lantern and the ironwork by the door. I make the fittings; she keeps the hearth.']),
  'lee-anne':freeze(['Martin is my husband. Look for the copper lantern and his ironwork around our cottage door. We have our names together on the mailbox.']),
  'garden-keeper':freeze(['Stanley is my husband. Our home is in Applegarth, beside the farm country. I still come down here to keep an eye on the birds. They have terribly busy diaries.']),
  'avrel-farmer':freeze(['Jean is my wife. We share a cottage in Applegarth, with the bird boxes and the kitchen garden. She teaches by the Tidehaven road; I look after the farming.']),
  doomsayer:freeze(['My cottage is just beyond the village. Follow the little path to the moon charms. The herbs dry better away from everybody’s washing, and the stones prefer some peace.']),
});
export const familyHomeLines=id=>[...(lines[id]??[])];

function segmentGap(x,z,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a.x-dx*t,z-a.z-dz*t);}
/** Hide only trees in the newly occupied plot after seeded planting. Existing
 * tree indices elsewhere, squirrel homes and acorn IDs remain unchanged. */
export function familyHomeClear(x,z,margin=0){
  return Math.hypot(x-MARK_HOME.house.x,z-MARK_HOME.house.z)<5.5+margin
    ||MARK_HOME_PATH.some((b,i)=>i&&segmentGap(x,z,MARK_HOME_PATH[i-1],b)<1.1+margin);
}
