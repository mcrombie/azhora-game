import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LIZEEM_SURROUNDINGS as context} from '../src/content/scenarios/lizeem-surroundings.js';
import {createWorldWar,worldWarProjection} from '../src/app/exploration/world-war.js';
import {surroundingFactionHTML,nomadicPresenceHTML} from '../src/ui/map/surrounding-map-info.js';

test('surrounding holdings are unique, use real atlas names, and remain outside the war',()=>{
  const atlas=JSON.parse(readFileSync(new URL('../assets/azhora-world-map.json',import.meta.url),'utf8'));
  const names=new Set(atlas.regions.map(r=>r.name)),assigned=[];
  for(const f of context.factions)for(const name of f.regions){assert.ok(names.has(name),name);assigned.push(name);}
  assert.equal(assigned.length,new Set(assigned).size);
  for(const name of ['Isareos','Nethereum','Ovesos','Caricas','Nesdor'])assert.equal(context.regions[name],undefined);
  assert.equal(context.regions.Urubond,undefined);assert.equal(context.regions.Elfland,undefined);
  for(const r of context.relations)for(const id of [r.from,r.to])assert.ok(context.factions.some(f=>f.id===id));
});
test('claims, conquest, vassalage and city division are distinct',()=>{
  assert.equal(context.regions['West Lotharn Mountains'].owner,'lotharn-disputed');
  assert.equal(context.regions['East Lotharn Mountains'].owner,'lotharn-disputed');
  assert.equal(context.regions.Feradom.owner,'feradom');
  assert.ok(context.relations.some(r=>r.kind==='vassal'&&r.from==='feradom'&&r.to==='ambron'));
  assert.equal(context.regions['West Suval'].owner,'izol');assert.equal(context.regions['South Suval'].owner,'izol');
  assert.equal(context.regions.Eer.owner,'nylon');assert.match(context.regions.Eer.condition[0],/siege/);
  assert.equal(context.regions.Legemum.owner,'telemonia');
  assert.equal(context.regions['Ganesh Plain'].owner,'pyros-monarchists');assert.equal(context.regions['Nether Desert'].owner,'pyros-republicans');
  assert.equal(context.regions['Ganesh Desert'].owner,'marosh');
  assert.equal(context.regions['Cape Heth'].owner,'hama');
  assert.equal(context.regions.Selemi.owner,'selemis');assert.equal(context.regions['Azhor Stones'].owner,'selemis');
  for(const id of ['pyros-monarchists','pyros-republicans'])assert.match(context.factions.find(f=>f.id===id).notes,/Pyra.*(divided|split)|split.*Pyra/);
});
test('nomadic presence owns no territory and no fabricated daily march',()=>{
  const centaurs=context.presences[0];assert.equal(centaurs.region,'Yunethre');
  assert.equal(context.regions.Yunethre.owner,'laketown');
  assert.ok(!Object.values(context.regions).some(r=>r.owner===centaurs.id));
  assert.equal(centaurs.route,undefined);assert.equal(centaurs.capital,undefined);
  assert.match(nomadicPresenceHTML(centaurs),/not a territorial claim/);
});
test('projection cannot add factions or change either side of a saved campaign',()=>{
  for(const days of [100,17]){
    const game=createWorldWar(),before=JSON.stringify(game.checkpoint()),s=game.snapshot();
    const projection=worldWarProjection(s);
    assert.equal(projection.factions.length,3);assert.equal(Object.keys(projection.regions).length,5);
    assert.equal(Object.keys(s.regions).length,5);assert.equal(JSON.stringify(game.checkpoint()),before);
    assert.throws(()=>{projection.reference.regions.Elagos.owner='izol';},TypeError);
    game.advance(days);const after=worldWarProjection(game.snapshot());
    assert.equal(after.reference.regions.Elagos.owner,'ambron');assert.equal(after.reference.regions.Yunethre.owner,'laketown');
  }
});
test('reference inspectors explain relationships without listing undiscovered holdings',()=>{
  const ambron=context.factions.find(f=>f.id==='ambron'),html=surroundingFactionHTML(ambron,context,['Elagos']);
  assert.match(html,/Kingdom of Ambron/);assert.match(html,/Feradom is a vassal/);assert.match(html,/Izol and Ambron are at war/);
  assert.match(html,/outside the five playable regions/);assert.doesNotMatch(html,/data-region="Drent"/);
  const disputed=surroundingFactionHTML(context.factions.find(f=>f.id==='lotharn-disputed'),context,['West Lotharn Mountains']);
  assert.match(disputed,/Republican rebels/);assert.match(disputed,/Outlaw gangs/);assert.doesNotMatch(disputed,/Controlled charted/);
});
