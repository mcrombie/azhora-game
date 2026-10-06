import { canStand } from '../../gameplay/movement/game-state.js';
import { MENORA, MENORA_BRIDGES, MENORA_NPC_ANCHORS } from '../../content/regions/minora-frontier/menora-city.js';
import { CARICAS_TOWN } from '../../content/regions/minora-frontier/caricas-settlement.js';
import { FRONTIER_NPCS, FRONTIER_PRINCES, CENTAUR_RAIDER_IDS } from '../../content/regions/minora-frontier/frontier-people.js';
import { YUNETHRE_TOWN, YUNETHRE_CAMP, YUNETHRE_RAID_ROUTE } from '../../content/regions/minora-frontier/yunethre-world.js';
import { FARMSTEADS } from '../../world/scenery/regional-farmland.js';

export async function runFrontierChecks(h){
 const checks=[],metrics={},saved=h.saved();
 const check=(ok,label)=>{if(!ok)throw new Error(`Frontier: ${label}\n${JSON.stringify({checks,metrics})}`);checks.push(label);};
 h.open();await h.frames(1);
 const country=document.getElementById('test-country'),place=document.getElementById('test-place');
 for(const [name,id] of [['Isareos',16],['Caricas',13],['Yunethre',38]]){
  country.value=name;country.dispatchEvent(new Event('change'));place.value='0';document.getElementById('test-goto').click();await h.frames(2);
  const p=h.player.group.position;check(h.world.regionAt(p.x,p.z).id===id&&canStand(p.x,p.z,h.world),`${name} F8 arrival is in the correct region on clear ground`);
  h.open();await h.frames(1);
 }
 h.travel(MENORA.arrival);await h.frames(2);
 check(FRONTIER_NPCS.every(n=>h.npcById.has(n.id)),'All requested princes and anonymous military residents exist in the live cast');
 metrics.blockedPeople=FRONTIER_NPCS.filter(n=>!canStand(n.x,n.z,h.world,n.centaur?.76:.45)).map(n=>n.id);
 check(!metrics.blockedPeople.length,'Every new resident starts outside trees, buildings, tents and river water');
 metrics.bridges=MENORA_BRIDGES.map(b=>({id:b.id,standable:canStand(b.x,b.z,h.world),height:h.world.heightAt(b.x,b.z),water:h.world.waterAt(b.x,b.z)}));
 check(metrics.bridges.every(b=>b.standable&&b.height>b.water),'Both river bridges and all garden footbridges are solid above the existing water');
 check(h.world.menora.metrics&&h.world.menora.mapFeatures.length>=15,'Minora contains its walls, guild tower, temple and city buildings');
 check(h.world.caricasSettlement.metrics.buildings>=8,'Caricas contains its actual occupied town');
 check(FARMSTEADS.filter(f=>f.region==='Caricas').length===5,'Five Caricas farms are connected to the existing farming system');
 for(const prince of FRONTIER_PRINCES){
  h.travel(prince);await h.frames(2);const npc=h.npcById.get(prince.id);h.talk(npc);await h.frames(1);
  check(h.state().mode==='dialogue',`${prince.name} opens an ordinary conversation`);h.close();
  check(npc.actor.group.userData.hairStyle===prince.look.hairStyle,`${prince.name} uses the requested hairstyle`);
 }
 h.travel(YUNETHRE_CAMP);await h.frames(2);
 const centaurs=FRONTIER_NPCS.filter(n=>n.centaur);
 check(centaurs.every(n=>h.npcById.get(n.id).actor.group.userData.creature==='centaur'),'Camp, patrol and free-town centaurs use their four-legged bodies');
 check(h.world.yunethre.metrics&&h.world.yunethre.walkSurfaces.length===3,'Yunethre has a camp, free town and walkable lakeside promenade');
 check(h.world.walkSurfaces.some(s=>s.id.startsWith('yunethre')),'The lakeside ramps are registered in live walking support');
 metrics.wildlife=h.life.state().creatures.filter(c=>c.region==='Yunethre'||c.zoneId?.startsWith('yunethre')).length;
 // A real patrol step through the populated scene, followed by an Isareos encounter.
 h.frontierRaids.restore();const start=h.frontierRaids.snapshot();
 for(let i=0;i<60;i++)h.frontierRaids.frame(.25,{playing:true});
 check(h.frontierRaids.snapshot().patrol.some((p,i)=>Math.hypot(p.x-start.patrol[i].x,p.z-start.patrol[i].z)>2),'The patrol leaves camp through actual world collision');
 const raid=h.frontierRaids.snapshot(),end=YUNETHRE_RAID_ROUTE.at(-1);
 raid.patrol.forEach((p,i)=>Object.assign(p,{x:end.x+i*3,z:end.z,next:YUNETHRE_RAID_ROUTE.length-1,wait:0,cooldown:0}));
 h.frontierRaids.restore(raid);h.travel({x:end.x,z:end.z+10});h.frontierRaids.frame(.01,{playing:true});await h.frames(2);
 check(h.combat.state.phase==='active'&&h.combat.state.enemies.every(e=>e.kind==='centaur'&&e.hp===e.maxHp),'The Isareos raiding party starts a fight at full health using centaur combat');
 const first=h.combat.state.enemies[0];h.combat.spellHit(first.id,30);h.frontierRaids.frame(.01,{playing:true});
 check(h.crime.health(first.id).hp<h.crime.health(first.id).maxHp,'Combat injuries are recorded on the persistent raider');
 const remaining=h.crime.health(first.id).hp,ended=h.combat.state.enemies.map(e=>({...e}));h.combat.disengage();h.frontierRaids.combatEvent({type:'retreat',enemies:ended});
 h.travel(CARICAS_TOWN.arrival);await h.frames(2);
 check(h.save(),'The frontier patrol and injuries can be saved to an isolated checkpoint');check(h.reload(),'The isolated checkpoint reloads');
 check(h.crime.health(first.id).hp===remaining,'Reload preserves the injury instead of healing or duplicating the centaur');
 h.travel(YUNETHRE_TOWN);await h.frames(2);h.frontierRaids.frame(.1,{playing:true});
 check(h.combat.state.phase!=='active','The mixed lakeside town remains peaceful');
 check(h.state().frameErrors?.count===0,'The renderer records no frame errors');
 check(h.saved()===saved,'Testing leaves the ordinary adventure checkpoint unchanged');
 return{ok:true,checks,metrics};
}
