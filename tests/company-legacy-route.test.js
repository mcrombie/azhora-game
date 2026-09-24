import test from 'node:test';
import assert from 'node:assert/strict';
import {legacyCompanyProgress} from '../src/company-route.js';
import {createLivingStory} from '../src/living-story.js';

const p=x=>({x,z:0});
const base={road:[p(0),p(100)],ambush:p(20),bridgeExit:p(45),relay:p(65),
  roster:[{id:'merc-matt'},{id:'merc-mus',route:'wild'}],wildRoute:[{x:0,z:10},{x:20,z:10},{x:60,z:10}]};
const convert=placement=>legacyCompanyProgress({...base,placements:[placement]})[0];

test('legacy travelers keep crossing and Nothom progress without repeating earlier errands',()=>{
  const across=convert({id:'merc-matt',phase:'walking',distance:51,...p(51)});
  assert.equal(across.stage,'nothom');assert.deepEqual(across.position,p(51));
  assert.ok(across.tasks.includes('crossing'));assert.equal(across.reported,false);
  const reporting=convert({id:'merc-matt',phase:'stopped',distance:65,stopId:'relay',...p(65)});
  assert.equal(reporting.stage,'nothom');assert.equal(reporting.reported,false);
  const reported=convert({id:'merc-matt',phase:'walking',distance:74,...p(74)});
  assert.equal(reported.stage,'imperial-muster');assert.equal(reported.reported,true);
  assert.ok(reported.tasks.includes('nothom'));
  const story=createLivingStory({roster:base.roster,legacy:{actors:[reported],playSeconds:400}});
  assert.equal(story.actor(reported.id).reportedAt,400);
  assert.ok(Object.hasOwn(story.actor(reported.id).tasks,'nothom'));
  assert.equal(story.satchel().assignee,null,'an old report must not claim a newly introduced job');
  assert.equal(story.snapshot().horses.length,0,'migration must not manufacture historical rewards');
});

test('legacy Mus resumes the next wilderness waypoint rather than being sent to Chip',()=>{
  const wild=convert({id:'merc-mus',phase:'walking',distance:27,x:27,z:10});
  assert.equal(wild.stage,'road');assert.equal(wild.route.waypoint,2);assert.deepEqual(wild.tasks,[]);
  const last=convert({id:'merc-mus',phase:'walking',distance:63,x:63,z:10});
  assert.equal(last.stage,'imperial-muster');assert.equal(last.reported,false);
  const mustered=convert({id:'merc-mus',phase:'mustered',distance:75,...p(75)});
  assert.equal(mustered.stage,'mustered');
});

test('legacy companions use the saved player location and retain independent progress when released',()=>{
  const [a]=legacyCompanyProgress({...base,playerPosition:p(53),placements:[{id:'merc-matt',phase:'with-traveler',distance:0,x:null,z:null}]});
  assert.equal(a.withPlayer,true);assert.equal(a.stage,'nothom');assert.deepEqual(a.position,p(53));
  const story=createLivingStory({roster:base.roster,legacy:{actors:[a]}});
  assert.equal(story.actor(a.id).stage,'nothom');
  story.observe(a.id,{withPlayer:false});assert.equal(story.actor(a.id).stage,'nothom');
});

test('legacy landing lessons and future arrivals remain on the authored opening schedule',()=>{
  for(const placement of [{phase:'coming'}, {phase:'landing'}, {phase:'walking',chapterOne:'combat-training'}]){
    const a=convert({id:'merc-matt',distance:12,...p(12),...placement});
    assert.equal(a.stage,'arrival');assert.deepEqual(a.tasks,[]);
  }
});
