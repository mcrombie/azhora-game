import test from 'node:test';
import assert from 'node:assert/strict';
import {postwarPlans,postwarMemory,bearAfterWar} from '../src/app/exploration/postwar-conversations.js';
import {createWorldWar} from '../src/app/exploration/world-war.js';

test('peace conversations cover both winners without changing campaign or inventing player service',()=>{
  const ids=['mayor','temple','seshat','satet','portunus','njord','manawydan','hapi'];
  assert.equal(postwarPlans('mayor',createWorldWar().snapshot()),null);
  for(const side of ['west','east']){
    const w=createWorldWar();w.campaign.reinforce(side==='west'?'nethereum':'caricas',500);w.advance(200);
    const s=w.snapshot(),before=structuredClone(s);assert.equal(s.winner,side);
    for(const id of ids){assert(postwarPlans(id,s).length>70);assert.match(postwarMemory(id,s),/let the armies decide/);}
    assert.match(bearAfterWar(s),/horse is still yours/);assert.doesNotMatch(bearAfterWar(s),/you went into the fighting/);
    assert.deepEqual(s,before);
  }
});

test('people remember the actual faction chosen, even if the player withdrew',()=>{
  const w=createWorldWar();w.advance(3);w.syncRegion('Caricas');const b=w.snapshot().engagements[0];
  assert(w.campaign.joinBattle(b.id,b.location).ok);assert(w.campaign.resolveEncounter(b.id,'east','withdraw','withdrew',0,{escaped:0}).ok);w.advance(200);
  const s=w.snapshot();assert.match(postwarMemory('mayor',s),/chose East Lizeem at Caricas.*against my people/);
  assert.match(postwarMemory('temple',s),/stood with my people/);assert.match(bearAfterWar(s),/you went into the fighting/);
});
