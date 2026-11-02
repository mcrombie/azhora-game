import test from 'node:test';
import assert from 'node:assert/strict';
import {columnTransitAllowed,MINORA_ARMY_CLEARANCE} from '../src/app/exploration/war-column-access.js';
import {MENORA_GATES} from '../src/content/regions/minora-frontier/menora-city.js';

test('army transit excludes Minora streets, courts and every open city gate',()=>{
  for(const p of [{x:-2308,z:60},{x:-2308,z:160},{x:-2404,z:148},{x:-2338,z:143},...MENORA_GATES]){
    assert.equal(columnTransitAllowed(p.x,p.z),false,`No army passage at ${p.id??JSON.stringify(p)}`);
  }
});

test('army clearance protects walls while allowing the outside northern assembly',()=>{
  assert.equal(columnTransitAllowed(-2350,10-MINORA_ARMY_CLEARANCE),false);
  assert.equal(columnTransitAllowed(-2350,10-MINORA_ARMY_CLEARANCE-1),true);
  assert.equal(columnTransitAllowed(-2350,10-MINORA_ARMY_CLEARANCE-1,1.2),false,'A soldier cannot overlap the wall buffer');
  assert.equal(columnTransitAllowed(-2308,-24,1),true);
  assert.equal(columnTransitAllowed(-2670,100,1),true,'The upstream countryside is available');
  assert.equal(columnTransitAllowed(-2098,279,1),true,'Caricas remains available');
});
