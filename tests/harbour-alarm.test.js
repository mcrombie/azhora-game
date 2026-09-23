import test from 'node:test';
import assert from 'node:assert/strict';
import { createHarbourAlarm, HARBOUR_WATCH, HARBOUR_ALARM_END } from '../src/harbour-alarm.js';
import { WORD_SHIP, WORD_ASHORE, WORD_BEACH } from '../src/word-arrival.js';

test('the watch and locals answer the sail, Orris panics, and everybody returns afterward', () => {
  const people = [...HARBOUR_WATCH, {id:'harbormaster'}, {id:'doomsayer'}, {id:'instructor'}, {id:'merc-gotwood'}, {id:'farmer'}];
  const homes = Object.fromEntries(people.map(n => [n.id, {x:-5,z:38}]));
  homes.farmer = {x:1000,z:1000};
  const original = JSON.stringify(homes), alarm = createHarbourAlarm({people,homes});
  assert.deepEqual(new Set(alarm.ids), new Set([...HARBOUR_WATCH.map(n=>n.id),'harbormaster','doomsayer']));
  assert.equal(alarm.pose('harbormaster',WORD_SHIP.sighted-1),null);
  assert.ok(alarm.pose(HARBOUR_WATCH[0].id,WORD_SHIP.sighted).alert);
  const a = alarm.pose('doomsayer',WORD_SHIP.sighted), b = alarm.pose('doomsayer',WORD_SHIP.sighted+4);
  assert.ok(a.panic && a.pace > 4);
  assert.notDeepEqual(a.target,b.target);
  assert.equal(alarm.pose(HARBOUR_WATCH[0].id,WORD_ASHORE).face,WORD_BEACH);
  assert.equal(alarm.pose('doomsayer',HARBOUR_ALARM_END),null);
  assert.equal(JSON.stringify(homes),original,'quest destinations must stay where they were');
});

test('shore targets use reachable ground and omit actors with no safe place', () => {
  const people=[...HARBOUR_WATCH], homes=Object.fromEntries(people.map(n=>[n.id,n]));
  const alarm=createHarbourAlarm({people,homes,standable:x=>x<=0});
  assert.ok(alarm.pose(people[0].id,WORD_SHIP.sighted).target.x<=0);
  assert.deepEqual(createHarbourAlarm({people,homes,standable:()=>false}).ids,[]);
});
