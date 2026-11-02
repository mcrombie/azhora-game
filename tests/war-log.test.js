import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdventureWar} from '../src/experiments/day-night/opening-war.js';
import {UNIFIED_WORLD_WAR_SCENARIO as scenario} from '../src/app/exploration/world-war.js';
import {warLogEntries} from '../src/app/exploration/war-log.js';
import {commanderOutcome} from './fixtures/commander-outcomes.js';
import {nextCampaignOpportunity} from '../src/app/exploration/campaign-opportunity.js';

test('journal preserves exact player intervention time, outcomes, casualties and replay',()=>{
  const war=createAdventureWar();war.begin();for(let i=0;i<37;i++)war.tick(1,true);
  const c=war.campaign,b=c.snapshot().engagements[0];c.locateHero(b.region);
  assert(c.joinBattle(b.id,b.location).ok);assert(c.chooseFieldBattle(b.id,'west').ok);
  assert(c.chooseAssault(c.snapshot().pending.id,'allied').ok);const p=c.snapshot().pending;
  assert(c.resolveEncounter(p.id,'west','success','rally-secured',p.rally.guards,{escaped:0,alliesLost:1,routed:1,allyDamage:160,...commanderOutcome(c,'west',true)}).ok);
  const before=war.checkpoint(),entries=warLogEntries(war.snapshot(),scenario);
  assert(entries.some(e=>e.personal&&e.elapsedSeconds===37&&/enemy strength removed/.test(e.detail)));
  assert(entries.some(e=>e.personal&&/captured Caricas/.test(e.title)));
  assert(entries.some(e=>e.personal&&/1 allied soldiers fell; 1 enemies routed and survived/.test(e.detail)));
  assert(entries.every((e,i)=>i===0||e.id<entries[i-1].id));
  assert.equal(new Set(entries.map(e=>e.id)).size,entries.length);
  assert.deepEqual(war.checkpoint(),before,'Opening the log is read-only');
  const next=nextCampaignOpportunity(war.snapshot(),scenario,[],()=>true,{side:'west'});
  assert.equal(next.region,'ovesos');assert.equal(next.deadline,5);
  assert.deepEqual(next.target,{kind:'battle',id:war.snapshot().engagements.find(b=>b.region==='ovesos').id},'Taleth follows the battle that began while Caricas was being settled');
  assert.equal(nextCampaignOpportunity(war.snapshot(),scenario,[],()=>false,{side:'west'}).kind,'regroup','The destination must be known');
  assert.deepEqual(warLogEntries(createAdventureWar(before).snapshot(),scenario),entries);
  war.advance(5);const later=warLogEntries(war.snapshot(),scenario);
  assert(later.some(e=>!e.personal&&/left this field to the armies/.test(e.detail)));
  assert.deepEqual(later.filter(e=>e.personal),entries.filter(e=>e.personal),'Later battles keep previous player consequences');
});

test('journal never invents player impact or reveals unknown fronts',()=>{
  const war=createAdventureWar();war.advance(5);
  const entries=warLogEntries(war.snapshot(),scenario);
  assert(!entries.some(e=>e.personal));
  assert.equal(warLogEntries(war.snapshot(),scenario,()=>false).length,1);
  assert(entries.some(e=>e.title==='Battle begins at Ovesos'&&e.elapsedSeconds===120));
  assert(!entries.some(e=>/day \d/.test(e.detail)));
});
