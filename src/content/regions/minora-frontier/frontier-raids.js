import { YUNETHRE_RAID_ROUTE, YUNETHRE_TOWN } from './yunethre-world.js';
import { CENTAUR_RAIDER_IDS } from './frontier-people.js';
import { BODY, bodyWorld, stepToward } from '../../../gameplay/combat/bodies.js';
import { canStand } from '../../../gameplay/movement/game-state.js';

export const FRONTIER_RAID_FIGHT='yunethre-raiding-party';
const copy=p=>({x:p.x,z:p.z});
const route=YUNETHRE_RAID_ROUTE;
export function validateFrontierRaids(value){
 if(value===undefined)return true;
 return value&&Array.isArray(value.patrol)&&value.patrol.length===3&&value.patrol.every((p,i)=>
  p.id===CENTAUR_RAIDER_IDS[i]&&Number.isInteger(p.next)&&p.next>=0&&p.next<route.length&&
  [1,-1].includes(p.direction)&&Number.isFinite(p.wait)&&p.wait>=0&&p.wait<=180&&
  Number.isFinite(p.cooldown)&&p.cooldown>=0&&p.cooldown<=120&&
  Number.isFinite(p.x)&&Number.isFinite(p.z)&&route.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<300));
}

/** Persistent individuals travel out from camp and return along the same dry pass.
 * Combat borrows their actual centaur bodies and the ordinary NPC health records. */
export function createFrontierRaids({world,npcById,combat,crime,playerPosition,bodies=()=>[],save=()=>{},toast=()=>{}}){
 const navigation=bodyWorld(world);
 let patrol=[],fighting=false,provoked=false;
 const nearNeutral=p=>Math.hypot(p.x-YUNETHRE_TOWN.x,p.z-YUNETHRE_TOWN.z)<105;
 function place(row){const npc=npcById.get(row.id);if(!npc)return;
  npc.actor.group.position.set(row.x,world.heightAt(row.x,row.z),row.z);
  world.npcPositions[row.id]=copy(row);
 }
 function remember(enemy){if(!enemy)return;const row=patrol.find(p=>p.id===enemy.id);if(!row)return;
  row.x=enemy.x;row.z=enemy.z;place(row);
  crime.recordCombatHit({id:row.id,hp:enemy.hp,maxHp:enemy.maxHp,source:'world',selfDefense:true,
   permanent:enemy.hp<=0,notify:false,x:enemy.x,z:enemy.z});
 }
 function begin(){
  if(combat.state.phase==='active'||combat.state.player.hp<=0||nearNeutral(playerPosition()))return false;
  const enemies=patrol.filter(p=>!crime.isDown(p.id)&&Math.hypot(p.x-playerPosition().x,p.z-playerPosition().z)<45&&canStand(p.x,p.z,world,BODY.centaur)).map(p=>{
   const h=crime.health(p.id);return{id:p.id,npcId:p.id,name:'Centaur raider',kind:'centaur',x:p.x,z:p.z,hp:h.maxHp,currentHp:h.hp};});
  if(!enemies.length)return false;
  const at=copy(playerPosition());
  if(!combat.startEncounter({id:FRONTIER_RAID_FIGHT,level:0,center:at,checkpoint:at,retreatZ:at.z+50,enemies,allies:[]}))return false;
  fighting=true;provoked=false;toast('A centaur raiding band wheels across the grass.','ISAREOS FRONTIER');save();return true;
 }
 function frame(dt,{playing=true,disabled=false}={}){
  for(const row of patrol){const npc=npcById.get(row.id);if(npc)npc.residentMotion=0;}
  if(fighting){for(const enemy of combat.state.enemies)remember(enemy);if(combat.state.phase!=='active')fighting=false;else return;}
  if(!playing||disabled)return;
  const player=playerPosition();navigation.setBodies(bodies());
  for(const row of patrol){
   if(crime.isDown(row.id))continue;
   row.cooldown=Math.max(0,row.cooldown-dt);
   const npc=npcById.get(row.id);if(!npc)continue;
   // Territory raids occur in Isareos; the free town and its approaches remain peaceful.
   if(!row.cooldown&&!nearNeutral(row)&&!nearNeutral(player)&&(provoked||world.regionAt(row.x,row.z).name==='Isareos')&&Math.hypot(row.x-player.x,row.z-player.z)<16){if(begin())return;}
   if(row.wait>0){row.wait=Math.max(0,row.wait-dt);continue;}
   const target=route[row.next];
   if(Math.hypot(row.x-target.x,row.z-target.z)<2.8){
    if(row.next===route.length-1){row.direction=-1;row.wait=16;}
    if(row.next===0){row.direction=1;row.wait=45+patrol.indexOf(row)*4;}
    row.next+=row.direction;save();continue;
   }
   const before=copy(row);navigation.moving(row,BODY.centaur,row.id);
   stepToward(row,target,dt*3.7,navigation,BODY.centaur,patrol.indexOf(row)%2?1:-1);
   const moved=Math.hypot(row.x-before.x,row.z-before.z);npc.residentMotion=dt?moved/dt:0;
   if(moved>.001)npc.actor.group.rotation.y=Math.atan2(row.x-before.x,row.z-before.z);
   place(row);
  }
 }
 function combatEvent(event){if(!fighting)return;
  for(const enemy of event.enemies??combat.state.enemies)remember(enemy);
  if(['victory','retreat','defeat'].includes(event.type)){
   fighting=false;provoked=false;
   for(const row of patrol){row.cooldown=60;row.direction=-1;row.next=Math.max(0,row.next-1);npcById.get(row.id).combatPosition=null;}
   save();
  }
 }
 function restore(value){if(!validateFrontierRaids(value))return false;
  fighting=false;provoked=false;patrol=value?value.patrol.map(p=>({...p})):CENTAUR_RAIDER_IDS.map((id,i)=>{
   const npc=npcById.get(id),at=npc??route[0];return{id,x:at.x,z:at.z,next:1,direction:1,wait:12+i*4,cooldown:0};});
  for(const row of patrol){const npc=npcById.get(row.id);npc.residentMotion=0;npc.combatPosition=null;place(row);}return true;
 }
 restore();
 return{frame,combatEvent,restore,snapshot:()=>({patrol:patrol.map(p=>({...p}))}),
  state:()=>({fighting,patrol:patrol.map(p=>({...p,health:crime.health(p.id)}))}),
  assault(event){if(CENTAUR_RAIDER_IDS.includes(event.npcId)&&event.source==='player'&&event.hp>0){provoked=true;for(const p of patrol)p.cooldown=0;}}
 };
}
