import test from 'node:test';
import assert from 'node:assert/strict';
import {createUnattendedLookout} from '../src/dev/tools/lizeem-lookout-preview.js';
import {createWorldWar} from '../src/app/exploration/world-war.js';
import {validateWorldWarSave} from '../src/app/exploration/war-checkpoint.js';
import {talethFinale} from '../src/app/exploration/taleth-correspondence.js';

test('lookout preview preserves the natural default outcome without hero interventions',()=>{
  const expected=createWorldWar();expected.advance(1000);
  const data=createUnattendedLookout(),actual=createWorldWar(data).snapshot();
  assert.ok(validateWorldWarSave(data));assert.deepEqual(actual,expected.snapshot());
  assert.ok(actual.winner);assert.ok(actual.engagements.every(b=>!b.heroResult));
  assert.equal(data.tower.location,'lookout');assert.equal(data.tower.concluded,false);
  const pages=talethFinale(actual);assert.equal(pages[0].view,'river');assert.equal(pages[2].view,'east');assert.equal(pages.at(-1).view,'west-lotharn');
  assert.match(pages[1].words,/left the fighting to the armies/);
});
