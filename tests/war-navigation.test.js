import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAtlasScope,scopeMinimumZoom,clampScopeOffset} from '../src/ui/map/atlas-scope.js';
import {MODES} from '../src/app/exploration/modes.js';
import {createWorldWar,WORLD_WAR_SCENARIO} from '../src/app/exploration/world-war.js';
import {worldWarArmies} from '../src/app/exploration/war-armies.js';
import {warMinimapEvents,projectWarMinimap,drawWarMinimap} from '../src/app/exploration/war-minimap.js';

test('scenario map clips the actual five regions and leaves the unrestricted atlas available',()=>{
  const svg=readFileSync(new URL('../assets/azhora-world-map.svg',import.meta.url),'utf8');
  const tints=svg.match(/<g id="region-tints"[^>]*>([\s\S]*?)<\/g>/)[1];
  const paths=new Map([...tints.matchAll(/<path data-region="([^"]+)"[^>]* d="([^"]+)"/g)].map(m=>[m[1],m[2]]));
  const scope=createAtlasScope(MODES.war.mapRegions,paths);
  assert.equal(scope.names.length,5);assert(scope.contains({x:1186.287,y:2548.387}));assert(!scope.contains({x:0,y:0}));
  assert(!scope.path.includes('undefined'));assert.equal(createAtlasScope(null,paths),null);
  assert.equal(MODES.explore.mapRegions,undefined);
  const zoom=scopeMinimumZoom(scope,900,600,.2);assert(zoom>1);
  const a=clampScopeOffset(scope,{width:900,height:600,scale:.2*zoom,x:-1e9,y:1e9});
  const b=clampScopeOffset(scope,{width:900,height:600,scale:.2*zoom,x:1e9,y:-1e9});
  assert.deepEqual(a,b,'Fit view cannot be panned out to the rest of the continent');
});
test('minimap shows discovered marches and active battles, retires ended events, and cannot reveal hidden intelligence',()=>{
  const war=createWorldWar();war.advance(3);const s=war.snapshot(),before=JSON.stringify(s);
  const armyMarks=worldWarArmies(s,WORLD_WAR_SCENARIO),events=warMinimapEvents({armies:armyMarks,battles:s.engagements});
  assert(events.some(e=>e.kind==='army'));assert(events.some(e=>e.kind==='battle'));
  assert(events.filter(e=>e.kind==='army').every(e=>/daily estimate/.test(e.detail)));
  assert.deepEqual(warMinimapEvents({armies:worldWarArmies(s,WORLD_WAR_SCENARIO,()=>false),battles:s.engagements,known:()=>false}),[]);
  assert(!warMinimapEvents({battles:s.engagements.map(b=>({...b,status:'resolved'}))}).length);
  assert.equal(JSON.stringify(s),before);
});
test('event bearings use true north, nearby markers stay local, and overlapping edge arrows keep their direction',()=>{
  const events=[{id:'one',x:0,z:-1000,kind:'army',color:'#789e91',selected:true},{id:'two',x:0,z:-1100,kind:'army',color:'#bf7969'},{id:'battle',x:5,z:0,kind:'battle',color:'#f2b468'}];
  const positions=projectWarMinimap(events,{position:{x:0,z:0},radius:85,size:300,northOffset:Math.PI/2});
  const one=positions.find(p=>p.id==='one'),two=positions.find(p=>p.id==='two'),near=positions.find(p=>p.id==='battle');
  assert(one.clamped&&two.clamped&&!near.clamped);assert(one.x>150&&Math.abs(one.y-150)<.001);
  assert(Math.hypot(one.x-two.x,one.y-two.y)>=21);assert.equal(one.bearing,two.bearing);
  const ctx={};for(const method of ['save','translate','beginPath','arc','fill','stroke','moveTo','lineTo','closePath','rotate','restore','clip','setLineDash'])ctx[method]=(...args)=>assert(args.every(v=>typeof v!=='number'||Number.isFinite(v)));
  drawWarMinimap(ctx,positions);
});
