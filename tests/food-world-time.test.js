import test from 'node:test';
import assert from 'node:assert/strict';
import {foodReportTime} from '../src/app/food-world/report-time.js';

test('elapsed food report labels the completed minute, not the unfinished clock fraction',()=>{
  const time=foodReportTime({day:3},{sharedOpening:2,fullCampaign:true,elapsedSeconds:223});
  assert.equal(time.heading,'Adventure 03:00');
  assert.match(time.period,/completed campaign minute/);
  assert.equal(time.text('Received 5 food on day 3.'),'Received 5 food at 03:00.');
  assert.equal(time.text('Closed: battle in Caricas until day 6'),'Closed: battle in Caricas until 06:00');
  assert.equal(time.text('About 1.5 more days at this deficit.'),'About 1.5 more campaign minutes at this deficit.');
  assert.doesNotMatch(time.pending,/\bday\b/);
});

test('new reserves and legacy day reports retain their correct unit',()=>{
  assert.match(foodReportTime({day:0},{sharedOpening:2}).period,/first adventure minute/);
  const legacy=foodReportTime({day:3},{});
  assert.equal(legacy.heading,'Day 3');
  assert.equal(legacy.text('Received 5 food on day 3.'),'Received 5 food on day 3.');
  assert.match(legacy.pending,/next day/);
});
