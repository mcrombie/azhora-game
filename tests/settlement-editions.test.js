import test from 'node:test';
import assert from 'node:assert/strict';
import {createSettlementWorld,DAY_SECONDS,validateSettlementSnapshot} from '../src/settlements/engine.js';
import {createMemoryArchive,flushChronicles} from '../src/settlements/archive.js';
import {forkEdition,inheritedArchive,importPack} from '../src/settlements/editions.js';
import {generatePack} from '../scripts/generate-settlements.mjs';
test('A restored past branches future days without replacing published history',async()=>{
 const archive=createMemoryArchive(),core=createSettlementWorld({worldId:'original'});
 await flushChronicles(core,archive);core.advanceTo(DAY_SECONDS);await flushChronicles(core,archive);
 const checkpoint=core.snapshot();core.advanceTo(4*DAY_SECONDS);await flushChronicles(core,archive);
 const branch=createSettlementWorld({saved:forkEdition(checkpoint,'recovery')});
 branch.advanceTo(2*DAY_SECONDS);await flushChronicles(branch,archive);
 const history=inheritedArchive(archive,()=>branch.snapshot());
 const rows=await history.list('recovery','feradom-fishers');
 assert.equal(rows.length,3);assert.equal(rows.at(-1).day,1);assert.match(rows.at(-1).id,/^recovery_/);
 assert.equal((await archive.list('original','feradom-fishers')).length,5);
});
test('An authoring pack imports into independent saves and preserves its existing illustrations',async()=>{
 const archive=createMemoryArchive(),pack=await generatePack({days:2});
 const subset=await generatePack({days:2,sites:['feradom-fishers']});
 assert.notEqual(subset.snapshot.worldId,pack.snapshot.worldId);
 const a=await importPack(pack,archive,'save-a'),b=await importPack(pack,archive,'save-b');
 assert.notEqual(a.worldId,b.worldId);assert.equal(a.parents[0].worldId,pack.snapshot.worldId);
 assert.equal((await inheritedArchive(archive,()=>a).list('save-a','feradom-fishers')).length,3);
 const damaged=structuredClone(pack);damaged.snapshot.settlements[0].dayOpening.stocks.barley=-1;
 assert.equal(validateSettlementSnapshot(damaged.snapshot),false);await assert.rejects(importPack(damaged,archive,'bad'));
});
