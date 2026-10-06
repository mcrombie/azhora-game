import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrontierRaids,validateFrontierRaids} from '../src/content/regions/minora-frontier/frontier-raids.js';
import {FRONTIER_NPCS,CENTAUR_RAIDER_IDS,FRONTIER_PRINCES} from '../src/content/regions/minora-frontier/frontier-people.js';
import {YUNETHRE_RAID_ROUTE,YUNETHRE_TOWN} from '../src/content/regions/minora-frontier/yunethre-world.js';
function fixture(){
 const npcById=new Map(FRONTIER_NPCS.map(p=>[p.id,{...p,actor:{group:{position:{set(x,y,z){Object.assign(this,{x,y,z});}},rotation:{y:0}}}}]));
 const hp=new Map(CENTAUR_RAIDER_IDS.map(id=>[id,230])),position={x:0,z:0};
 const world={heightAt:()=>5,waterAt:()=>0,colliders:[],bounds:{minX:-9999,maxX:9999,minZ:-9999,maxZ:9999},npcPositions:{},regionAt:()=>({name:'Isareos'})};
 const crime={isDown:id=>hp.get(id)<=0,health:id=>({hp:hp.get(id),maxHp:230,status:hp.get(id)>0?'alive':'dead'}),recordCombatHit:e=>{hp.set(e.id,Math.min(hp.get(e.id),e.hp));}};
 const combat={state:{phase:'idle',player:{hp:100},enemies:[]},startEncounter(e){this.state.phase='active';this.state.enemies=e.enemies.map(x=>({...x,maxHp:x.hp,hp:x.currentHp}));return true;}};
 const host=createFrontierRaids({world,npcById,combat,crime,playerPosition:()=>position});return{host,world,npcById,hp,position,crime,combat};
}
test('Patrol travels out and returns, preserving wounded and dead individuals across restoration',()=>{
 const f=fixture();const initial=f.host.snapshot();for(let i=0;i<100;i++)f.host.frame(.25);
 assert.ok(f.host.snapshot().patrol.some((p,i)=>Math.hypot(p.x-initial.patrol[i].x,p.z-initial.patrol[i].z)>10));
 const snapshot=f.host.snapshot();f.hp.set(CENTAUR_RAIDER_IDS[0],120);f.hp.set(CENTAUR_RAIDER_IDS[1],0);
 assert.equal(f.host.restore(snapshot),true);f.host.frame(.5);
 assert.equal(f.hp.get(CENTAUR_RAIDER_IDS[0]),120);assert.equal(f.hp.get(CENTAUR_RAIDER_IDS[1]),0);
 assert.equal(f.host.snapshot().patrol[1].x,snapshot.patrol[1].x,'Dead raiders do not move or reappear');
 assert.equal(validateFrontierRaids(undefined),true);assert.equal(validateFrontierRaids({...snapshot,patrol:[snapshot.patrol[0]]}),false);
 assert.equal(f.host.restore({...snapshot,patrol:snapshot.patrol.map(p=>({...p,next:99}))}),false);
 assert.ok(validateFrontierRaids(f.host.snapshot()));
});
test('The neutral town remains peaceful and Isareos combat keeps each centaur health denominator',()=>{
 const f=fixture();let s=f.host.snapshot();s.patrol.forEach((p,i)=>Object.assign(p,{x:YUNETHRE_TOWN.x+i*3,z:YUNETHRE_TOWN.z,wait:0}));
 f.host.restore(s);Object.assign(f.position,YUNETHRE_TOWN);f.host.frame(.01);assert.equal(f.combat.state.phase,'idle');
 const end=YUNETHRE_RAID_ROUTE.at(-1);s=f.host.snapshot();s.patrol.forEach((p,i)=>Object.assign(p,{x:end.x+i*3,z:end.z,wait:0}));
 f.host.restore(s);Object.assign(f.position,{x:end.x,z:end.z+8});f.hp.set(CENTAUR_RAIDER_IDS[0],120);f.host.frame(.01);
 assert.equal(f.combat.state.phase,'active');assert.equal(f.combat.state.enemies[0].hp,120);assert.equal(f.combat.state.enemies[0].maxHp,230);
 f.combat.state.enemies[0].hp=60;f.host.frame(.01);assert.equal(f.hp.get(CENTAUR_RAIDER_IDS[0]),60);
 f.host.combatEvent({type:'retreat',enemies:f.combat.state.enemies});assert.equal(f.host.state().fighting,false);
 assert.ok(f.host.snapshot().patrol.every(p=>p.cooldown===60));
});
test('The princes retain the specified hair and no invented civilian is added to the frontier',()=>{
 assert.equal(FRONTIER_PRINCES.find(p=>p.id==='prince-cedric').look.hairStyle,'long-loose');
 assert.equal(FRONTIER_PRINCES.find(p=>p.id==='prince-wilhelm').look.hairStyle,'short-cropped');
 assert.ok(FRONTIER_NPCS.every(p=>p.prince||p.soldier));assert.ok(FRONTIER_NPCS.every(p=>p.hat===false));
});
