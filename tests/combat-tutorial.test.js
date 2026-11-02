import test from 'node:test';
import assert from 'node:assert/strict';
import {COMBAT_LESSONS} from '../src/gameplay/combat/combat-tutorial.js';
import {createLizeemEncounter} from '../src/gameplay/combat/lizeem-encounter.js';
import {encounterAutoplayInput} from '../src/gameplay/autoplay/encounter-input.js';
import {UGUTH_DUEL} from '../src/gameplay/combat/uguth-duel.js';
import {DEFAULT_PLAYER_COMBAT} from '../src/gameplay/combat/combat-stats.js';
import {COMBAT_TRIALS} from '../src/gameplay/combat/combat-trials.js';
import {sourceModule} from './module-loader.js';
const create=(tutorial,extra={})=>createLizeemEncounter({tutorial,opponent:COMBAT_LESSONS.find(l=>l.id===tutorial)?.opponent,heroStart:{x:0,z:0},guardStarts:[{x:0,z:-2}],move:(p,x,z)=>({x:p.x+x,z:p.z+z}),...extra});
test('staff lesson needs real, focused hits; spell kills reform instead of granting the wrong lesson',()=>{
  const m=create('staff');m.fireballHit(0,999);let s=m.tick(1/60);assert(!s.outcome);assert.equal(s.tutorial.reformed,1);
  for(let i=0;i<80;i++)s=m.tick(1/60,{attack:true});assert(!s.outcome);assert.equal(s.tutorial.goals[0].value,0);
  for(let i=0;i<180&&!s.outcome;i++)s=m.tick(1/60,{attack:true,focusId:0});
  assert.equal(s.outcome,'success');assert(s.tutorial.complete);assert(s.guards[0].yielded);
});
test('block lesson counts absorbed contacts, not merely holding the key',()=>{
  const m=create('block',{guardStarts:[{x:0,z:-15}]});let s=m.tick(.1,{block:true});assert.equal(s.tutorial.goals[0].value,0);
  for(let i=0;i<2000&&!s.outcome;i++)s=m.tick(1/60,{block:true,focusId:0});
  assert.equal(s.outcome,'success');assert.equal(s.skill.staffBlocks,2);assert(s.hero.hp>0&&s.hero.hp<100);
});
test('dodge lesson requires an evaded attack and a genuine counter; militia is a real final fight',()=>{
  for(const id of ['dodge','militia']){
    const m=create(id,{guardStarts:[{x:0,z:-6}]});let s=m.snapshot();
    for(let i=0;i<12000&&!s.outcome;i++)s=m.tick(1/60,encounterAutoplayInput(s));
    assert.equal(s.outcome,'success',id+': '+JSON.stringify(s.tutorial));assert(s.tutorial.complete);
    if(id==='dodge')assert(s.skill.dodges>0&&s.skill.dodgeCounters>0);
  }
});
test('Fireball instruction requires spell contact; lesson validation prevents accidental campaign changes',()=>{
  const m=create('fireball');let s=m.snapshot();for(let i=0;i<120;i++)s=m.tick(1/60,{attack:true,focusId:0});assert(!s.outcome);
  for(let i=0;i<60;i++)m.tick(1/60);assert(m.beginCast());assert(m.fireballHit(0,45));s=m.tick(1/60);assert(s.tutorial.complete);assert.equal(s.outcome,'success');
  assert.throws(()=>createLizeemEncounter({tutorial:'block',opponent:'wolf',guardStarts:[{x:0,z:0}]}));
});
test('Uguth is a separate, finite master with attacks faster than the player and much greater endurance',()=>{
  assert(!COMBAT_TRIALS.some(t=>t.id==='uguth'));assert(UGUTH_DUEL.hp>Math.max(...COMBAT_TRIALS.map(t=>t.hp))*4);
  for(const a of Object.values(UGUTH_DUEL.combat.attacks)){
    assert(a.windup+a.contact<=DEFAULT_PLAYER_COMBAT.timing.contact);
    assert(a.windup+a.strike+a.recovery<=DEFAULT_PLAYER_COMBAT.timing.attackCooldown);
  }
  const m=createLizeemEncounter({opponent:'uguth',tempo:'matched',guardStarts:[{x:0,z:0}]});let s=m.snapshot();
  for(let i=0;i<3600&&!s.outcome;i++)s=m.tick(1/60,encounterAutoplayInput(s));
  assert.equal(s.outcome,'defeat');assert(s.guards[0].hp>s.guards[0].maxHp*.8);
  // He is difficult, not invulnerable: spell damage is real and finite.
  const n=createLizeemEncounter({opponent:'uguth',guardStarts:[{x:0,z:0}]});n.fireballHit(0,1600);assert.equal(n.tick(1/60).outcome,'success');
});
test('Taleth quest survives tower exploration and clears when his briefing is complete',async()=>{
  const {towerQuest}=await sourceModule('../src/app/exploration/tower-quest-view.js');
  const s={inside:true,room:'tower',briefed:false};const at={y:21.3};
  assert.equal(towerQuest(s,at,'playing').title,'Speak with Taleth');assert(towerQuest(s,at,'playing').showMarker);
  assert(!towerQuest(s,{y:21.3-32.4},'playing').showMarker);assert(towerQuest(s,{y:21.3-32.4},'playing').detail.includes('central floor'));
  assert.equal(towerQuest(s,at,'training'),null);assert.equal(towerQuest({...s,briefed:true},at,'playing'),null);
});

test('the shared main quest card accepts chapter objectives and still hides when its supplier clears',async t=>{
  const THREE=await sourceModule('../vendor/three.module.js');
  const {createTowerQuestView}=await sourceModule('../src/app/exploration/tower-quest-view.js');
  const previous={document:globalThis.document,innerWidth:globalThis.innerWidth,innerHeight:globalThis.innerHeight},nodes=[];
  class Element{
    constructor(){this.hidden=false;this.textContent='';this.style={};this.dataset={};this.classList={toggle(){}};this.children=new Map();}
    set innerHTML(html){for(const tag of html.matchAll(/<(small|h3|p|span|strong)\b/g))this.children.set(tag[1],new Element());}
    querySelector(tag){return this.children.get(tag);}
    getBoundingClientRect(){return {width:0,height:0};}
    remove(){const i=nodes.indexOf(this);if(i>=0)nodes.splice(i,1);}
  }
  globalThis.document={createElement:()=>new Element(),getElementById:id=>nodes.find(n=>n.id===id),body:{append:(...entries)=>nodes.push(...entries)}};
  globalThis.innerWidth=1280;globalThis.innerHeight=720;
  let objective={label:'MAIN QUEST / CHAPTER 2',title:'Speak with Taleth',detail:'At the Sky Lookout',clock:'The deadline has not begun.',target:{x:0,y:0,z:0},showMarker:true};
  const view=createTowerQuestView({position:{x:0,y:0,z:0},quest:()=>objective});
  t.after(()=>{view.dispose();for(const [name,value]of Object.entries(previous)){if(value===undefined)delete globalThis[name];else globalThis[name]=value;}});
  const camera=new THREE.PerspectiveCamera(60,16/9,.1,100);camera.position.z=5;camera.updateMatrixWorld();view.draw(camera);
  const [card,marker]=nodes;assert(!card.hidden);assert(!marker.hidden);
  assert.equal(card.querySelector('small').textContent,objective.label);assert.equal(card.querySelector('span').textContent,objective.clock);
  assert.equal(card.querySelector('h3').textContent,objective.title);assert.equal(marker.querySelector('strong').textContent,objective.title);
  objective={...objective,title:'Laketown council representative',markerLabel:'Laketown',edgeMarker:true,target:{id:'town',x:600,y:0,z:-800}};
  view.draw(camera);assert(!marker.hidden);assert.equal(marker.dataset.distance,'1000');assert.match(marker.querySelector('strong').textContent,/Laketown.*1000 m/);
  for(const target of [{x:1000,y:0,z:0},{x:-1000,y:0,z:0},{x:0,y:0,z:1000}]){
    objective.target={...target,id:'town'};view.draw(camera);assert(!marker.hidden,'off-screen and behind-camera destinations stay directional');
    assert.equal(marker.dataset.edge,'true');assert.equal(marker.querySelector('span').textContent,'\u279c');
    const x=parseFloat(marker.style.left),y=parseFloat(marker.style.top);assert.ok(x>0&&x<1280&&y>0&&y<720);
  }
  objective.showMarker=false;view.draw(camera);assert(marker.hidden,'completed quests do not leave a directional pin');
  objective=null;view.draw(camera);assert(card.hidden);assert(marker.hidden);
});
