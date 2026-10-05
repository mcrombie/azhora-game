import test from 'node:test';
import assert from 'node:assert/strict';
import { SELAMUS, SELAMUS_BUILDINGS, SELAMUS_CANALS, SELAMUS_BRIDGES, selamusPoint, selamusGround, selamusUrban, selamusCanalAt } from '../src/selamus-city.js';
import { hexOwnerAt, landDistance, SEA_LEVEL } from '../src/region-world.js';
import { groundWithRiver } from '../src/world-terrain.js';
import { ATLAS_CITY_DESIGNATIONS } from '../src/world-map-detail.js';
import { travelPlaces } from '../src/testing-travel.js';

test('Selemis fills most of its crescent with safe island foundations and a maritime city designation',()=>{
  assert.ok(SELAMUS_BUILDINGS.length>=70);
  let dry=0,urban=0;
  for(let x=-1002;x<=-600;x+=4)for(let z=2308;z<=2600;z+=4){if(hexOwnerAt(x,z)==='Selemi'&&landDistance(x,z)>0){dry++;if(selamusUrban(x,z))urban++;}}
  assert.ok(urban/dry>.7,`city district coverage ${urban/dry}`);
  for(const b of SELAMUS_BUILDINGS)for(const dx of [-b.width/2,0,b.width/2])for(const dz of [-b.depth/2,0,b.depth/2]){
    const p=selamusPoint(b.u+dx,b.v+dz);assert.equal(hexOwnerAt(p.x,p.z),'Selemi',b.id);
    assert.ok(landDistance(p.x,p.z)>6,b.id);assert.ok(selamusCanalAt(p.x,p.z).edge>1.3,b.id);
    assert.ok(Math.abs(groundWithRiver(p.x,p.z)-groundWithRiver(b.x,b.z))<.11,`${b.id} level foundation`);
  }
  assert.equal(ATLAS_CITY_DESIGNATIONS.selamus.name,'Selemis');
  assert.ok(travelPlaces('Selemi').some(p=>p.id==='selamus'));
});

test('four tidal canals have continuous submerged beds into the sea',()=>{
  assert.equal(SELAMUS_CANALS.length,4);
  for(const canal of SELAMUS_CANALS)for(let i=1;i<canal.points.length;i++){
    const a=canal.points[i-1],b=canal.points[i],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.8);
    for(let j=0;j<=n;j++){const x=a.x+(b.x-a.x)*j/n,z=a.z+(b.z-a.z)*j/n;
      assert.ok(groundWithRiver(x,z)<SEA_LEVEL-1.5,`${canal.id} dry mouth/bed at ${x},${z}`);}
  }
  for(const bridge of SELAMUS_BRIDGES)for(const p of [bridge.a,bridge.b])assert.ok(groundWithRiver(p.x,p.z)>2.5,`${bridge.id} dry bank`);
});

test('city edits do not move other regions or turn open water into reclaimed land',()=>{
  for(const [x,z] of [[-700,2280],[-921,1890],[0,0],[-1100,2400],[-550,2460]])assert.equal(selamusGround(x,z,7),7);
  for(let x=SELAMUS.bounds.minX;x<SELAMUS.bounds.maxX;x+=4)for(let z=SELAMUS.bounds.minZ;z<SELAMUS.bounds.maxZ;z+=4){
    if(landDistance(x,z)<0)assert.ok(selamusGround(x,z,-4)<=-4,'no reclaimed ocean or raised bed');
  }
});
