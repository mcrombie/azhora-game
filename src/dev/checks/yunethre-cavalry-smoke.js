import {YUNETHRE_CAMP as C} from '../../content/regions/minora-frontier/yunethre-world.js';
import {CENTAUR_BATTLEFIELD} from '../../content/regions/minora-frontier/centaur-camp-layout.js';
const assert=(v,m)=>{if(!v)throw Error(m);};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const key=(code,type='keydown')=>document.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));
const press=code=>{key(code);key(code,'keyup');};
let baseline,positionBefore,phases=new Set(),events=new Set();
async function waitForReturn(api){for(let i=0;i<1000&&(api.cavalry.controller()||api.state().mode!=='playing');i++)await delay(20);assert(!api.cavalry.controller()&&api.state().mode==='playing','Encounter disposes and restores exploration on Continue');}
async function closeResult(api){const c=api.cavalry.controller();if(!c)return;c.withdraw();c.tick(2,true);press('Enter');await waitForReturn(api);}
function sameChapter(api){const current=api.chapter.state(),before=JSON.parse(baseline);assert(Math.abs(current.elapsed-before.elapsed)<1,'Rehearsal does not advance chapter time');current.elapsed=before.elapsed;assert(JSON.stringify(current)===baseline,'Rehearsal leaves chapter facts unchanged');}
export async function review(api,stage){
  window.dispatchEvent(new Event('focus'));
  if(stage==='camp'){
    assert(api.chapter.interact()&&api.chapter.choose('accept'),'Taleth briefing');
    assert(await api.chapterTransition(null,{x:C.x-5,z:C.z+6}),'Camp loads');api.chapter.command({type:'depart'});api.resume();
    for(let i=0;i<120&&(api.testWorld.regionalLife()?.camp?.loaded??0)<6;i++){api.step(.04,0);await delay(50);}
    const life=api.testWorld.regionalLife();assert(life.campResidents===6,'Six named camp residents load: '+JSON.stringify(life.camp));
    assert(api.testWorld.residentPeople().filter(p=>p.id.startsWith('centaur-')).length===6,'Six residents exposed for conversation');
    api.look({yaw:Math.PI,pitch:1.05,distance:65});api.step(.04,0);await delay(120);return {stage,life:life.camp,render:api.renderStats()};
  }
  if(stage==='conversation'){
    const person=api.testWorld.residentPeople().find(p=>p.id==='centaur-saera')??api.testWorld.residentPeople().find(p=>p.id.startsWith('centaur-'));
    let p;for(let i=0;i<16;i++){const a=i*Math.PI/8,at={x:person.x+Math.sin(a)*2.8,z:person.z+Math.cos(a)*2.8,y:person.y};if(api.groundProbe(at.x,at.z).clear&&api.testWorld.residentTarget(at)?.id===person.id){p=at;break;}}
    assert(p,'Camp resident can be approached');await api.visit(p);api.resume();api.step(.04,0);assert(api.residentHost.interact(),'Camp F conversation opens');
    const custom=document.querySelector('#resident-dialog [data-topic="customs"]');assert(custom,'Custom cultural topic is available');custom.click();
    await delay(120);return {stage,speaker:person.name,text:document.getElementById('resident-words').textContent};
  }
  if(stage==='briefing'){
    press('Escape');api.resume();baseline=JSON.stringify(api.chapter.state());positionBefore=api.state().position;
    assert(await api.cavalry.open({rehearsal:true,watch:true}),'Rehearsal opens');
    const s=api.cavalry.controller().snapshot();assert(s.paused&&!s.started,'Battle begins with a readable briefing');
    assert(!api.save().ok,'Saving is blocked inside rehearsal');api.step(0,0);await delay(120);return {stage,units:s.units.length,position:api.state().position,render:api.renderStats()};
  }
  if(stage==='bane'){
    press('Escape');await api.visit({x:C.x-5,z:C.z+6});api.resume();assert(api.chapter.interact(),'Bane can be approached');
    assert(api.chapter.conversation().actions.includes('bane-pride'),'Bane has personal topics');const before=JSON.stringify(api.chapter.state());
    assert(api.chapter.choose('bane-pride'),'Bane speaks about his choices');assert(JSON.stringify(api.chapter.state())===before,'Personal lore leaves diplomacy untouched');
    await delay(120);return {stage,text:api.chapter.conversation().text};
  }
  if(stage==='controls'){
    const c=api.cavalry.controller();c.start();press('KeyG');c.tick(.04,true);assert(!c.snapshot().hero.mounted,'G dismounts at rest');
    key('KeyR');c.tick(.8,true);key('KeyR','keyup');c.tick(.04,true);assert(c.snapshot().hero.shots===1,'R draws and releases a real arrow');
    const at=c.snapshot().hero;key('KeyW');c.tick(.3,true);key('KeyW','keyup');assert(Math.hypot(c.snapshot().hero.x-at.x,c.snapshot().hero.z-at.z)>.1,'W moves the hero');
    press('Space');c.tick(.02,true);assert(c.snapshot().hero.dodge>0,'Space starts a physical dodge');
    const before=c.snapshot().time;c.pause();c.tick(.5,true);assert(c.snapshot().time===before,'Tactical pause holds combat');
    await closeResult(api);sameChapter(api);
    assert(api.state().position.every((v,i)=>Math.abs(v-positionBefore[i])<.02),'Rehearsal restores location');
    baseline=JSON.stringify(api.chapter.state());assert(await api.cavalry.open({rehearsal:true,watch:true}),'Second rehearsal opens cleanly');api.cavalry.controller().start();return {stage,controls:'mount, draw/release, movement, dodge, pause, restore'};
  }
  if(stage==='field'){
    const c=api.cavalry.controller();for(let i=0;i<40&&!c.snapshot().outcome;i++){c.tick(.25,true);for(const u of c.snapshot().units)phases.add(u.phase);for(const e of c.snapshot().events)events.add(e.type);if(i%8===0)await delay(5);}
    for(let i=0;i<20;i++)api.step(.04,0);assert(c.cameraTarget(),'Computer camera follows its real target');assert(document.getElementById('world-autoplay').hidden,'Quest autoplay cannot obscure combat controls');await delay(120);return {stage,time:c.snapshot().time,phases:[...phases],events:[...events],render:api.renderStats()};
  }
  if(stage==='result'){
    const c=api.cavalry.controller();for(let i=0;i<800&&!c.snapshot().outcome;i++){c.tick(.25,true);for(const u of c.snapshot().units)phases.add(u.phase);for(const e of c.snapshot().events)events.add(e.type);if(i%30===0)await delay(5);}
    c.tick(2,true);assert(c.snapshot().outcome,'Computer reaches a real field outcome');assert(events.has('charge')&&events.has('hit')&&events.has('release'),'Charges, arrows and contact occurred: '+[...events]);
    assert(JSON.stringify(api.chapter.state())===baseline,'Autoplay rehearsal never changes politics');api.step(0,0);await delay(120);return {stage,outcome:c.snapshot().outcome,hero:c.snapshot().hero,phases:[...phases],errors:api.state().frameErrors};
  }
  if(stage==='mounted-return'){
    press('Enter');await waitForReturn(api);assert(api.stable.whistle(),'Owned horse can be summoned at the camp');
    for(let i=0;i<60;i++)api.step(.04,0);api.stable.toggleMount();assert(api.stable.mounted,'Mounted entry fixture uses the owned horse');
    const before=api.state().position,chapter=api.chapter.state();assert(await api.cavalry.open({rehearsal:true}),'Mounted rehearsal opens');
    document.querySelector('[data-cv-cancel]').click();await waitForReturn(api);assert(api.stable.mounted,'Cancelling restores the owned horse ride');
    assert(api.state().position.every((v,i)=>Math.abs(v-before[i])<.02),'Mounted return restores location');assert(api.chapter.state().battle.joined===chapter.battle.joined,'Cancellation never commits a side');
    await delay(120);return {stage,mounted:api.stable.mounted,position:api.state().position};
  }
  if(stage==='campaign'){
    api.stable.park();api.selectMount('foot');
    api.chapter.developerBattle();assert(api.chapter.state().battle.status==='active','Live campaign battle starts');
    await api.visit(CENTAUR_BATTLEFIELD.approach);api.resume();assert(api.chapter.interact(),'Battlefield approach has F interaction');
    assert(api.chapter.conversation().actions.includes('fight-centaurs'),'Explicit side choice is available');api.chapter.choose('close');
    assert(await api.cavalry.open({side:'centaurs',watch:true}),'Live battle opens');const c=api.cavalry.controller();c.start();assert(api.chapter.state().battle.joined==='centaurs','Start records selected side');
    for(let i=0;i<800&&!c.snapshot().outcome;i++){c.tick(.25,true);if(i%30===0)await delay(5);}c.tick(2,true);
    const facts=api.chapter.state();assert(facts.battle.status==='resolved','Physical outcome reaches campaign.js');assert(facts.laketown==='autonomous','Battle does not annex Laketown');
    assert(facts.events.filter(e=>e.type==='battle-'+facts.battle.winner).length===1,'Result is recorded once');
    assert(!api.state().frameErrors.length,'No frame errors');api.step(0,0);await delay(120);return {stage,battle:facts.battle,laketown:facts.laketown,events:facts.events};
  }
  throw Error('Unknown cavalry stage '+stage);
}
