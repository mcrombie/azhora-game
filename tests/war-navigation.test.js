import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createAtlasScope,scopeMinimumZoom,clampScopeOffset,atlasObjectiveFrame} from '../src/ui/map/atlas-scope.js';
import {CHAPTER_LOCATIONS} from '../src/content/chapters/yunethre/locations.js';
import {TRANSFORM} from '../src/world/terrain/region-world.js';
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

test('Chapter 2 map frames the departure and Laketown together before surveying either destination',()=>{
  const svg=readFileSync(new URL('../assets/azhora-world-map.svg',import.meta.url),'utf8');
  const tints=svg.match(/<g id="region-tints"[^>]*>([\s\S]*?)<\/g>/)[1];
  const paths=new Map([...tints.matchAll(/<path data-region="([^"]+)"[^>]* d="([^"]+)"/g)].map(m=>[m[1],m[2]]));
  const scope=createAtlasScope(['Yunethre','Isareos','Nethereum','Ovesos','Caricas','Nesdor','North Celder','South Celder'],paths);
  const at=place=>TRANSFORM.worldToAtlas(place.x,place.z),traveler=at(CHAPTER_LOCATIONS.departure),goal=at(CHAPTER_LOCATIONS.town);
  for(const [width,height]of [[1500,850],[900,600],[390,600]]){
    const fitScale=.2,localZoom=Math.min(width,height)/100/fitScale;
    const frame=atlasObjectiveFrame(traveler,goal,{width,height,fitScale,localZoom,minimumZoom:scopeMinimumZoom(scope,width,height,fitScale)});
    const scale=fitScale*frame.zoom,offset=clampScopeOffset(scope,{width,height,scale,x:frame.x,y:frame.y});
    assert.ok(frame.zoom<localZoom,'the distant destination needs a wider opening view');
    for(const point of [traveler,goal]){
      const x=offset.x+point.x*scale,y=offset.y+point.y*scale;
      assert.ok(x>=20&&x<=width-20&&y>=20&&y<=height-20,`visible in ${width}x${height}: ${x},${y}`);
    }
    const nearby=atlasObjectiveFrame(goal,{x:goal.x+1,y:goal.y+1},{width,height,fitScale,localZoom});
    assert.equal(nearby.zoom,localZoom,'nearby speakers retain street-level detail');
  }
  assert.equal(atlasObjectiveFrame(traveler,null,{width:900,height:600,fitScale:.2,localZoom:20}),null,'completed/no-objective maps fall back to normal traveler framing');
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
