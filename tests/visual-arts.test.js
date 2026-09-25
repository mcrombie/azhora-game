import test from 'node:test';
import assert from 'node:assert/strict';
import { createSkills } from '../src/skills.js';
import { createVisualArts, SYLVIA, SYLVIA_STUDIO, sylviaConversation } from '../src/visual-arts.js';

test('Sylvia teaches the unified skill through her completed lesson, with no XP shortcut',()=>{
  const skills=createSkills(),arts=createVisualArts({skills});let speech;
  const ctx={arts,openDialogue:(npc,lines,event,label,options)=>{speech={npc,lines,options};},closeDialogue:()=>{}};
  assert.equal(arts.begin('drawing').ok,false);
  assert.equal(sylviaConversation(SYLVIA,ctx),true);
  speech.options.choices.find(c=>c.id==='sylvia-visual-arts').action();
  assert.equal(arts.taught(),false);speech.options.onComplete();
  assert.equal(arts.taught(),true);assert.equal(skills.xp('visualarts'),0);
  assert.equal(sylviaConversation({id:'somebody-else'},ctx),false);
});
test('only completed timed studies award XP; pause, movement and lock levels are enforced',()=>{
  const skills=createSkills(),arts=createVisualArts({skills});arts.teach();
  assert.equal(arts.begin('painting').ok,false);
  assert.equal(arts.begin('drawing',{position:{x:0,z:0}}).ok,false);
  assert.equal(arts.begin('drawing').ok,true);arts.update(40,{paused:true});assert.equal(arts.pose().progress,0);
  arts.update(5);assert.equal(skills.xp('visualarts'),0);arts.update(.1,{blocked:true});assert.equal(arts.pose(),null);
  arts.begin('drawing');arts.update(6);assert.equal(skills.xp('visualarts'),18);arts.update(6);assert.equal(skills.xp('visualarts'),18);
  for(let i=0;i<4;i++){arts.begin('drawing');arts.update(6);}
  assert.equal(arts.level(),2);assert.equal(arts.begin('painting').ok,true);arts.update(8);assert.equal(skills.xp('visualarts'),114);
  const restored=createSkills();restored.restore(skills.snapshot());const reopened=createVisualArts({skills:restored});
  assert.equal(reopened.taught(),true);assert.equal(reopened.level(),2);assert.equal(reopened.pose(),null);
});
