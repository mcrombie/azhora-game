import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSkills } from '../src/skills.js';
import { createCombat } from '../src/combat.js';
import { renderFieldCard } from '../src/field-card.js';

function card() {
  const nodes = new Map(['kicker','name','note','fill','level'].map(id => [`#bird-card-${id}`, {textContent:'',style:{}}]));
  const classes = new Set();
  nodes.get('#bird-card-fill').parentElement = {style:{}};
  return { mount:{querySelector:id=>nodes.get(id),classList:{add:id=>classes.add(id)}},
    field:id=>nodes.get(`#bird-card-${id}`),classes };
}

test('a companion death delivered after a winning swing displays a narrative card without reading null progress',()=>{
  const ui=card(),skills=createSkills(),events=[];
  skills.learn('blades');skills.gain('blades',90);
  renderFieldCard(ui.mount,{kicker:'BLADES',name:'Level two',skill:'blades'},skills);
  assert.match(ui.field('level').textContent,/Blades 2/);
  const world={bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},colliders:[],heightAt:()=>1.5};
  const combat=createCombat({world,position:{x:0,z:0},onEvent:event=>events.push(event),
    getWeapon:()=>({id:'simple-sword',usable:true,damage:[100,100,100],reachMultiplier:1})});
  assert.equal(combat.startEncounter({id:'road-ambush',level:0,center:{x:0,z:0},checkpoint:{x:0,z:5},retreatZ:18,
    enemies:[{id:'last-rebel',kind:'rebel',x:0,z:1.6,hp:70,entry:10}],
    allies:[{id:'scottwood',name:'Chris Scottwood',kind:'legionary',x:.5,z:1.5,hp:20}]}),true);
  combat.attack(0);combat.update(.3);
  assert.equal(combat.state.phase,'won');
  const fallen=events.find(event=>event.type==='ally-down');assert.ok(fallen);
  assert.ok(events.findIndex(event=>event.type==='victory')<events.indexOf(fallen),'the final swing can win before the companion death is presented');
  assert.doesNotThrow(()=>renderFieldCard(ui.mount,{kicker:'CHRIS SCOTTWOOD IS DEAD',name:'Chris Scottwood fell in Drent',
    note:'Your blow killed him. It is written down as that.'},skills));
  assert.equal(ui.field('name').textContent,'Chris Scottwood fell in Drent');
  assert.equal(ui.field('fill').parentElement.style.display,'none');
  assert.equal(ui.field('level').textContent,'');assert.equal(ui.field('level').style.display,'none');
  assert.ok(ui.classes.has('visible'));
  // The shared presentation remains useful for the next ordinary discovery.
  skills.learn('birding');skills.gain('birding',34);
  renderFieldCard(ui.mount,{kicker:'FIRST SIGHTING',name:'A familiar bird',skill:'birding'},skills);
  assert.equal(ui.field('fill').parentElement.style.display,'');assert.equal(ui.field('level').style.display,'');
  assert.match(ui.field('level').textContent,/Birding 1.*34 \/ 83 experience/);
  assert.equal(ui.field('fill').style.width,'41%');
});

test('missing and obsolete skill ids preserve notice text without inventing a skill level',()=>{
  const ui=card(),skills=createSkills();
  for(const skill of [undefined,null,'old-combat-skill']) {
    assert.deepEqual(renderFieldCard(ui.mount,{name:'A field notice',note:'Keep walking.',skill},skills),{hasProgress:false});
    assert.equal(ui.field('note').textContent,'Keep walking.');assert.equal(ui.field('level').textContent,'');
  }
});

test('the live game routes the shared card through the optional-progress presenter',()=>{
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  assert.match(main,/renderFieldCard\(\$\('bird-card'\),\{kicker,name,note,skill\},skills\)/);
});
