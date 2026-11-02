import {TOWER,TOWER_SPAWN,TOWER_DOOR,TALETH_SPOT} from '../../app/exploration/tower-state.js';
import {guildWizardPosition} from '../../app/exploration/tower-wizard-host.js';
import {TOWER_FLOORS,towerFloorAt,towerStairPoint} from '../../content/regions/minora-frontier/tower-floor-layout.js';
import {validateWorldWarSave} from '../../app/exploration/war-checkpoint.js';
import {HADRIN_EXHIBITS,hadrinExhibitTarget} from '../../content/regions/minora-frontier/hadrin-exhibits.js';

// Isolated native launch. Repositioning is reserved for regression setup;
// reaching both new floors uses the real walking controller and stair treads.
const checks=[];
const $=id=>document.getElementById(id);
const assert=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);console.log('EXPLORATION_CHECK '+label);};
const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const key=code=>{for(const type of ['keydown','keyup'])document.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));};
const click=id=>{const button=$(id);assert(button&&!button.hidden&&!button.disabled,'Available guild control: '+id);button.click();};
const point=a=>{const [x,y,z]=a.state().position;return {x,y,z};};
const atFloor=(a,id)=>towerFloorAt(point(a).y).id===id;
const time=a=>JSON.stringify({day:a.war.state().campaign.day,fraction:a.war.clock().fraction,seconds:a.war.clock().elapsedSeconds,hour:a.dayNight?.state().hour});
const ticks=(a,n=100)=>{for(let i=0;i<n;i++)a.step(.04);};
const result=a=>({checks:[...checks],tower:a.tower.state(),wizard:a.guildWizards.state(),workshop:a.workshop?.state(),position:point(a),render:a.renderStats()});
let openingTime,initialSave;

function held(a,label){const before=time(a);ticks(a);assert(time(a)===before,label+' holds campaign and sky time');}
function walkTo(a,target){
  a.hold('KeyW',true);
  try{
    for(let i=0;i<700;i++){
      const p=point(a),distance=Math.hypot(p.x-target.x,p.z-target.z);
      if(distance<.045)return;
      a.look({yaw:Math.atan2(p.x-target.x,p.z-target.z),pitch:.19,distance:5});
      a.step(Math.min(.025,distance/5));
    }
    throw Error('Walking cannot reach '+JSON.stringify(target)+' from '+JSON.stringify(point(a)));
  }finally{a.hold('KeyW',false);}
}
function local(a,x,z){walkTo(a,{x:TOWER.x+x,z:TOWER.z+z});}
function spiral(a,from,to){
  const count=Math.round(Math.abs(to-from)*96);let worstError=0;
  for(let i=1;i<=count;i++){
    const target=towerStairPoint(from+(to-from)*i/count);walkTo(a,target);
    worstError=Math.max(worstError,Math.abs(point(a).y-target.y));
  }
  assert(worstError<.4,`Ordinary walking follows spiral ${from} to ${to} (height error ${worstError.toFixed(3)} m)`);
}
function approachWizard(a,id){local(a,10,0);local(a,4,0);const target=guildWizardPosition(id);walkTo(a,{...target,z:target.z+2});a.step(0);}
function leaveWizard(a){local(a,4,0);local(a,10,0);}
function workshopControlsFit(label){
  if(innerWidth<=650)return;
  const card=$('tower-workshop-dialog').querySelector('.tower-workshop-card').getBoundingClientRect();
  for(const id of ['tower-workshop-action','tower-workshop-close']){
    const button=$(id);if(button.hidden)continue;const rect=button.getBoundingClientRect();
    assert(rect.width>0&&rect.height>0&&rect.top>=Math.max(0,card.top)-1&&rect.left>=0&&rect.right<=innerWidth+1&&rect.bottom<=Math.min(innerHeight,card.bottom)+1,label+' keeps '+id+' fully visible without scrolling');
  }
}
function talk(a,id){
  key('KeyF');assert(a.state().mode==='briefing'&&a.guildWizards.state().id===id,'F speaks to '+id+' on his own floor');
  assert(!$('guild-wizard-dialog').hidden&&$('tower-briefing').hidden,'Guild dialogue opens without Taleth dialogue');
  assert(document.activeElement===$('guild-wizard-question'),'Guild conversation focuses its first available topic');
  held(a,'Talking to '+id);
  const speaker=guildWizardPosition(id),camera=a.state().cameraPosition;
  assert(Math.hypot(camera[0]-speaker.x,camera[1]-speaker.y,camera[2]-speaker.z)>2,'The '+id+' conversation camera stays clear of his own collider');
  assert(a.state().heroVisible,'Teresod remains visible while talking to '+id);
  click('guild-wizard-question');
  assert(a.guildWizards.state().topic==='work'&&!$('guild-wizard-back').hidden,'The optional '+id+' topic can be read');
  const before=$('guild-wizard-words').textContent;key('Tab');assert(document.activeElement===$('guild-wizard-close'),'Tab reaches Continue exploring');
  key('Tab');assert(document.activeElement===$('guild-wizard-back'),'Tab stays inside the guild conversation');
  click('guild-wizard-back');assert(a.guildWizards.state().topic==='hello'&&$('guild-wizard-words').textContent!==before,'Returning from the topic restores the introduction');
}
async function saveAndReturn(a,id){
  key('Escape');assert(a.state().mode==='playing'&&!a.guildWizards.state().open,'Escape ends the '+id+' conversation');
  const before=point(a);assert(a.save().ok,'The '+id+' floor saves normally');const saved=structuredClone(a.store.read().data);
  assert(validateWorldWarSave(saved,saved.format),'The '+id+' floor checkpoint validates');
  assert(saved.tower.location==='tower'&&!saved.tower.briefed&&!saved.campaignSide,'The '+id+' visit preserves the uncommitted tower state');
  await a.loadSaved();a.resume();window.dispatchEvent(new Event('focus'));a.step(0);
  const after=point(a);assert(atFloor(a,id)&&Math.abs(after.y-before.y)<.05&&Math.hypot(after.x-before.x,after.z-before.z)<.1,'Continue restores the exact '+id+' floor and position');
  assert(!a.guildWizards.state().open&&$('guild-wizard-dialog').hidden,'Continue clears stale '+id+' conversation state');
  held(a,'The restored '+id+' floor');
}

export function menu(mode='war'){
  assert(!$('start-screen').hidden,'Ordinary main menu is available');const button=document.querySelector(`[data-start-mode="${mode}"]`);
  assert(button,'Ordinary '+mode+' launch is available');button.click();return {checks:[...checks]};
}
export async function opening(a){
  window.dispatchEvent(new Event('focus'));a.step(0);
  assert(a.state().mode==='playing'&&a.tower.state().room==='tower'&&!a.tower.state().briefed,'Fresh play begins in the freely explorable tower');
  assert(!a.war.state().campaignSide&&atFloor(a,'taleth'),'Taleth is the central starting floor before allegiance');
  assert(!a.tower.state().exteriorLoaded,'The three chambers do not load outdoor regions');
  assert(a.save().ok,'The initial tower checkpoint saves');initialSave=structuredClone(a.store.read().data);openingTime=time(a);
  held(a,'Taleth chamber');a.look({yaw:.7,pitch:.17,distance:7});await frame();return result(a);
}
export async function stairway(a){
  local(a,10,7);local(a,10,0);local(a,12.4,0);
  assert(atFloor(a,'taleth'),'The spiral doorway is reachable from the starting chamber on foot');
  assert(time(a)===openingTime,'Walking to the stairway holds campaign and sky time');
  a.look({yaw:-Math.PI/2,pitch:.1,distance:4.8});await frame();return result(a);
}
// A focused doorway review avoids loading the distant sanctuary for a stair
// regression. Each threshold is crossed with the real walking controller.
export async function thresholds(a){
  for(const floor of TOWER_FLOORS){
    const y=TOWER.y+floor.y;
    await a.visit({x:TOWER.x+12,y,z:TOWER.z});a.step(0);
    let error=0;
    for(const z of [-.85,0,.85]){
      local(a,12,z);
      for(const x of [13.4,13.7,14.1,14.7,15.5,14.7,14.1,13.7,13.4,12]){
        local(a,x,z);error=Math.max(error,Math.abs(point(a).y-y));
      }
    }
    assert(error<.05,floor.id+' threshold can be crossed both ways without catching or dropping');
    assert(atFloor(a,floor.id),floor.id+' keeps the visitor on the correct floor');
    for(const yaw of [1.1,1.35,1.57,1.8,2.0]){a.look({yaw,pitch:.45,distance:3});a.step(0);await frame();}
  }
  assert(time(a)===openingTime,'Crossing all eleven thresholds preserves frozen tower time');
  assert(!a.state().frameErrors.length,'Every doorway renders without runtime errors');
  const floor=TOWER_FLOORS.find(f=>f.id==='veyra');
  await a.visit({x:TOWER.x+14.8,y:TOWER.y+floor.y,z:TOWER.z});a.step(0);
  a.look({yaw:Math.PI/2,pitch:.5,distance:3});await frame();return result(a);
}
export async function thresholdLeft(a){a.look({yaw:1.1,pitch:.5,distance:3});await frame();return result(a);}
export async function thresholdRight(a){a.look({yaw:2.0,pitch:.5,distance:3});await frame();return result(a);}
export async function stairWindowReview(a,{floor='helba',view='up'}={}){
  const f=TOWER_FLOORS.find(f=>f.id===floor),start=f.y/10.8+1;
  const progress=start+(view==='wall'?.5:view==='down'?.64:.36),at=towerStairPoint(progress);
  await a.visit(at);a.step(0);
  const ahead=towerStairPoint(progress+(view==='down'?-.02:.02));
  a.look({yaw:view==='wall'?-Math.PI/2:Math.atan2(at.x-ahead.x,at.z-ahead.z),pitch:view==='wall'?-.1:.27,distance:3});
  ticks(a,8);await frame();return result(a);
}
export async function landingSignReview(a,id){
  const f=TOWER_FLOORS.find(f=>f.id===id);await a.visit({x:TOWER.x+14,y:TOWER.y+f.y,z:TOWER.z-.7});
  a.look({yaw:-1.1,pitch:.22,distance:3.8});ticks(a,10);await frame();return result(a);
}
export async function landingSignSheet(){
  const {paintGuildSign}=await import('../../content/regions/minora-frontier/guild-sign-designs.js');
  const sheet=document.createElement('canvas');sheet.width=1536;sheet.height=4*248;
  const ctx=sheet.getContext('2d');ctx.fillStyle='#292e2a';ctx.fillRect(0,0,sheet.width,sheet.height);
  TOWER_FLOORS.forEach((floor,i)=>{
    const canvas=document.createElement('canvas');paintGuildSign(floor,canvas);
    ctx.drawImage(canvas,(i%3)*512,Math.floor(i/3)*248,512,224);
    ctx.fillStyle='#ddd3b8';ctx.font='14px Arial';ctx.fillText(floor.id,(i%3)*512+12,Math.floor(i/3)*248+240);
  });return sheet.toDataURL('image/png');
}
export async function lower(a){
  if(point(a).x<TOWER.x+10)local(a,10,7);
  local(a,10,0);walkTo(a,towerStairPoint(1));spiral(a,1,0);approachWizard(a,'senro');
  assert(atFloor(a,'senro')&&a.guildWizards.state().near==='senro','The lower landing reaches Snero Fold on foot');
  assert(time(a)===openingTime,'Walking downstairs does not advance campaign or daylight');
  assert($('tower-interact').hidden,'Taleth cannot be addressed through the ceiling');
  a.look({yaw:.65,pitch:.2,distance:7});await frame();return result(a);
}
export async function lowerConversation(a){talk(a,'senro');await frame();return result(a);}
export function conversationInView(a,speaker,dialogId,speakerHeight=1.85){
  const card=document.querySelector('#'+dialogId+' .tower-dialog-card').getBoundingClientRect();
  assert(a.state().heroVisible,'Third-person conversation keeps Teresod visible');
  for(const [name,p,height] of [['Teresod',point(a),1.85],['Speaker',speaker,speakerHeight]])for(const y of [0,height]){
    const projected=a.project({...p,y:p.y+y}),x=(projected.x+1)*innerWidth/2,screenY=(1-projected.y)*innerHeight/2;
    assert(x>0&&x<innerWidth&&screenY>0&&screenY<innerHeight,name+' stays inside the conversation view');
    assert(x<card.left||x>card.right||screenY<card.top||screenY>card.bottom,name+' remains clear of the dialogue box');
  }
}
let conversationReturn;
async function reviewConversation(a,id){
  if(a.guildWizards.state().open)key('Escape');
  const speaker=guildWizardPosition(id);
  await a.visit({...speaker,z:speaker.z+2});a.look({yaw:.7,pitch:.25,distance:7});a.step(0);
  conversationReturn=a.state();talk(a,id);await frame();conversationInView(a,speaker,'guild-wizard-dialog');return result(a);
}
export const conversationVeyra=a=>reviewConversation(a,'veyra');
export const conversationSnero=a=>reviewConversation(a,'senro');
export const conversationHadrin=a=>reviewConversation(a,'hadrin');
export async function conversationReturnView(a){
  key('Escape');a.step(0);await frame();const state=a.state();
  assert(state.mode==='playing'&&state.heroVisible,'Closing conversation restores third-person exploration');
  assert(JSON.stringify(state.camera)===JSON.stringify(conversationReturn.camera),'Conversation preserves the chosen exploration zoom and orbit');
  assert(Math.hypot(...state.cameraPosition.map((v,i)=>v-conversationReturn.cameraPosition[i]))<.05,'Closing restores the original camera position');
  assert(time(a)===openingTime&&!state.frameErrors.length,'Conversation review holds time and has no rendering errors');
  return result(a);
}
export async function conversationBear(a){
  const {prepareWarExterior}=await import('./tower-smoke.js');
  const {meetBear}=await import('./stable-smoke.js');
  await prepareWarExterior(a);await meetBear(a);
  conversationInView(a,a.stable.state().bear,'stable-lesson',1.4);
  click('stable-next');a.step(0);await frame();
  assert(a.state().mode==='playing'&&a.state().heroVisible&&a.stable.owned&&!a.stable.mounted,'Bear keeps the one-click horse handoff and third-person exploration');
  assert(!a.state().frameErrors.length,'Outdoor conversation has no rendering errors');
  return result(a);
}
export async function senroDetails(a){
  const before=JSON.stringify({campaign:a.war.state().campaign,mana:a.sorcery.snapshot()});
  assert(a.guildWizards.state().id==='senro'&&a.guildWizards.state().topic==='hello','Snero offers his expanded introduction after the first conversation');
  assert(!$('guild-wizard-question').hidden&&!$('guild-wizard-question-windows').hidden&&!$('guild-wizard-question-routes').hidden,'Snero offers three optional subjects without forcing a tutorial');
  for(const id of ['guild-wizard-question','guild-wizard-question-windows','guild-wizard-question-routes','guild-wizard-close']){
    const r=$(id).getBoundingClientRect();assert(r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth,'Snero keeps '+id+' visible without scrolling');
  }
  click('guild-wizard-question-windows');
  assert(a.guildWizards.state().topic==='windows'&&['Cold Stones','Azhor Stones','Drent','West Oremindi Mountains'].every(name=>$('guild-wizard-words').textContent.includes(name)),'Snero identifies the real places shown in his four windows');
  assert($('guild-wizard-question').hidden&&$('guild-wizard-question-routes').hidden,'Reading one subject hides the other questions');
  held(a,'Reading about Snero\'s windows');key('Tab');assert(document.activeElement===$('guild-wizard-close'),'The expanded conversation keeps its simple two-button topic focus');
  click('guild-wizard-back');click('guild-wizard-question-routes');
  assert(a.guildWizards.state().topic==='routes'&&/stairs/.test($('guild-wizard-words').textContent),'Snero distinguishes future guild routes from the working staircase');
  assert(JSON.stringify({campaign:a.war.state().campaign,mana:a.sorcery.snapshot()})===before&&!a.tower.state().exteriorLoaded,'Snero\'s lore does not change the campaign or load distant regions');
  click('guild-wizard-back');click('guild-wizard-close');
  assert(a.state().mode==='playing'&&!a.guildWizards.state().open,'The player can leave Snero\'s optional subjects and explore');
  const windows=()=>a.testWorld.state().guild.senro.windows;
  assert(windows().views.length===4&&windows().views.every(view=>!view.error)&&windows().kind==='live-perspective','All four windows use live regional perspective views');
  assert(new Set(windows().views.map(view=>view.wall)).size===4,'The four views occupy four different walls');
  assert(windows().remoteSimulations===0&&!a.tower.state().exteriorLoaded,'The distant windows do not run remote campaigns or load the exterior');
  a.look({yaw:0,pitch:-.14,distance:7});await frame();return result(a);
}
async function windowView(a,wall,x,z,yaw){
  // Walk the clear circulation route before approaching each window. This also
  // catches furniture accidentally placed across the new viewing positions.
  local(a,4,0);local(a,x,0);local(a,x,z);
  held(a,'Viewing the '+wall+' window');
  a.look({yaw,pitch:.12,distance:4});await frame();
  const end=performance.now()+15000,view=()=>a.testWorld.state().guild.senro.windows.views.find(v=>v.wall===wall);
  while(!view().frames&&performance.now()<end)await new Promise(r=>setTimeout(r,40));
  assert(view().ready&&view().frames>0&&!view().error,'The '+wall+' window renders on ordinary walking approach');
  return result(a);
}
export const sneroNorth=a=>windowView(a,'north',-8,-3.5,0);
export const sneroSouth=a=>windowView(a,'south',-5,4,Math.PI);
export const sneroEast=a=>windowView(a,'east',9,-7.5,-Math.PI/2);
export const sneroWest=a=>windowView(a,'west',-5,2.4,Math.PI/2);
export async function senroLuggage(a){
  local(a,4,0);local(a,5,3);
  const study=a.testWorld.state().guild.senro.study;
  assert(study.luggage.length===3&&study.luggage.every(item=>item.rotation.some(angle=>Math.abs(angle)>.2)),'Snero has three differently suspended pieces of luggage');
  held(a,'Exploring the folded study');
  a.look({yaw:-2.65,pitch:-.22,distance:5});await frame();return result(a);
}
export async function upper(a){
  if(!a.guildWizards.state().open){approachWizard(a,'senro');key('KeyF');}
  await saveAndReturn(a,'senro');leaveWizard(a);walkTo(a,towerStairPoint(0));spiral(a,0,1);
  local(a,10,0);assert(atFloor(a,'taleth'),'The middle landing remains accessible between the two flights');
  walkTo(a,towerStairPoint(1));spiral(a,1,2);approachWizard(a,'hadrin');
  assert(atFloor(a,'hadrin')&&a.guildWizards.state().near==='hadrin','The upper landing reaches Hadrin Brightlock on foot');
  assert(time(a)===openingTime,'Walking through all three floors does not advance campaign or daylight');
  assert($('tower-interact').hidden,'The upper room does not trigger Taleth below');
  a.look({yaw:.65,pitch:.2,distance:7});await frame();return result(a);
}
export async function upperConversation(a){
  talk(a,'hadrin');
  assert($('guild-wizard-question-windows').hidden&&$('guild-wizard-question-routes').hidden,'Hadrin never inherits Snero\'s conversation subjects');
  for(const id of ['guild-wizard-question','guild-wizard-question-conveniences','guild-wizard-question-equipment','guild-wizard-close']){
    const b=$(id),r=b.getBoundingClientRect();assert(!b.hidden&&r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth,'Hadrin keeps '+id+' visible without scrolling');
  }
  const before=JSON.stringify({campaign:a.war.state().campaign,mana:a.sorcery.snapshot()});
  click('guild-wizard-question-conveniences');held(a,'Talking about Hadrin\'s everyday enchantments');click('guild-wizard-back');
  click('guild-wizard-question-equipment');
  assert(/cannot alter your staff yet/.test($('guild-wizard-words').textContent),'Hadrin clearly presents equipment improvements as future work');
  assert(JSON.stringify({campaign:a.war.state().campaign,mana:a.sorcery.snapshot()})===before,'Workshop conversation grants no equipment or campaign changes');
  click('guild-wizard-back');await frame();return result(a);
}
export async function workshop(a){
  key('Escape');assert(a.state().mode==='playing','Hadrin lets the player explore his experiments');
  const before=JSON.stringify({campaign:a.war.state().campaign,mana:a.sorcery.snapshot()}),shown=[];
  assert(!a.workshop.interact()&&!a.workshop.state().near,'A distant exhibit cannot be inspected from the middle of the workshop');
  local(a,4,0);local(a,4,-5.3);local(a,-1.7,-5.3);a.step(0);
  const overlap=point(a),objectTarget=hadrinExhibitTarget({x:overlap.x-TOWER.x,y:overlap.y-TOWER.y,z:overlap.z-TOWER.z},{room:'tower',mode:'playing'});
  assert(a.guildWizards.state().near==='hadrin'&&objectTarget?.id==='mending-hammer','The overlap regression reaches both Hadrin and the hammer');
  assert(!$('guild-wizard-interact').hidden&&$('tower-workshop-interact').hidden&&!a.workshop.state().near,'Only Hadrin advertises F when wizard and object ranges overlap');
  key('KeyF');assert(a.guildWizards.state().id==='hadrin'&&!a.workshop.state().open,'The F action agrees with Hadrin\'s visible prompt');
  key('Escape');assert(a.state().mode==='playing','Closing the priority conversation resumes workshop exploration');
  function inspect(id){
    a.step(0);assert(a.workshop.state().near===id,'The nearby workshop target is '+id);key('KeyF');
    assert(a.state().mode==='briefing'&&a.workshop.state().id===id&&!$('tower-workshop-dialog').hidden,'F opens the '+id+' observation');
    assert($('guild-wizard-dialog').hidden&&$('tower-briefing').hidden,'Object observation stays separate from wizard conversation');
    assert($('tower-workshop-name').textContent===HADRIN_EXHIBITS.find(e=>e.id===id).name,'The '+id+' observation identifies the visible object');
    const at=point(a);a.hold('KeyW',true);ticks(a,12);a.hold('KeyW',false);
    assert(Math.hypot(point(a).x-at.x,point(a).z-at.z)<.001,'Reading about '+id+' keeps the visitor beside it');
    held(a,'Observing '+id);shown.push(id);
    if(id!=='golem'){
      assert($('tower-workshop-action').hidden,'The '+id+' observation does not promise an unavailable action');
      key('Tab');assert(document.activeElement===$('tower-workshop-close'),'Keyboard focus stays inside the '+id+' observation');
      click('tower-workshop-close');assert(a.state().mode==='playing'&&!a.workshop.state().open,'Closing '+id+' restores exploration');
    }
  }
  local(a,4,0);local(a,4,-6.1);local(a,1.5,-6.1);inspect('everlight');
  local(a,-1.7,-6.1);inspect('mending-hammer');
  local(a,4,-6.1);local(a,4,0);local(a,4,9);local(a,-7.1,9);inspect('rainkeeper-cup');
  local(a,-8.8,9);inspect('wayfinder');
  local(a,4,9);local(a,4,5);local(a,9,5);local(a,9,7.1);
  a.pause();assert(!a.workshop.interact()&&!a.workshop.state().near,'A paused workshop cannot open an observation');a.resume();a.step(0);
  const approach=point(a);
  for(const y of [TOWER.y,TOWER.y-10.8]){
    await a.visit({...approach,y});a.step(0);
    assert(!a.workshop.interact()&&!a.workshop.state().near,'Workshop objects cannot be inspected through another chamber floor at '+y);
  }
  await a.visit(approach);inspect('golem');
  key('Tab');assert(document.activeElement===$('tower-workshop-close'),'Tab reaches the golem observation close button');
  key('Tab');assert(document.activeElement===$('tower-workshop-action'),'Tab cycles back to the golem demonstration');
  const display=()=>a.testWorld.state().guild.workshop,initialCount=display().demonstration.count;
  click('tower-workshop-action');
  assert(display().demonstration.active&&display().demonstration.id==='golem'&&display().demonstration.count===initialCount+1,'Watching the test starts the real golem demonstration exactly once');
  ticks(a,25);const early=display().golem.armLift;ticks(a,50);const raised=display().golem.armLift;
  assert(raised>early+.2,'The golem visibly raises its articulated arm during the test');
  assert(!$('tower-workshop-response').hidden,'The golem test supplies an understandable response');
  ticks(a,90);assert(!display().demonstration.active&&display().golem.armLift<.1,'The bounded golem test finishes with its arm safely lowered');
  assert(JSON.stringify({campaign:a.war.state().campaign,mana:a.sorcery.snapshot()})===before,'Workshop observations and demonstrations preserve campaign state and mana');
  assert(!a.tower.state().exteriorLoaded&&!a.tower.state().briefed&&!a.war.state().campaignSide,'The workshop does not load the world or choose a campaign side');
  assert(shown.length===5&&new Set(shown).size===5,'Both enchanted tables and the golem have distinct usable observations');
  click('tower-workshop-action');ticks(a,60);await frame();workshopControlsFit('The golem demonstration');
  return {...result(a),demonstration:display()};
}
export async function workshopBench(a){
  click('tower-workshop-close');local(a,9,5);local(a,4,5);local(a,4,-6.1);local(a,1.5,-6.1);a.step(0);
  assert(a.workshop.state().near==='everlight','The enchanted northern bench remains reachable after the golem test');key('KeyF');
  assert(a.workshop.state().id==='everlight'&&!$('tower-workshop-dialog').hidden,'The tabletop view identifies the Everlight lantern');
  await frame();workshopControlsFit('The enchanted bench observation');
  return result(a);
}
export async function workshopArmor(a){
  click('tower-workshop-close');local(a,4,-6.1);local(a,4,0);local(a,-8.2,0);local(a,-8.2,-3.8);a.step(0);
  assert(a.workshop.state().near==='armor','The armor repair stand has a clear approach');key('KeyF');
  assert(a.workshop.state().id==='armor','F opens the self-polishing armor observation');
  const display=()=>a.testWorld.state().guild.workshop,before=display().conveniences;
  click('tower-workshop-action');ticks(a,45);const after=display().conveniences;
  assert(Math.hypot(after.polishingCloth.x-before.polishingCloth.x,after.polishingCloth.y-before.polishingCloth.y)>.05,'The enchanted cloth visibly rubs the armor');
  assert(after.hoveringLamps.length===2&&after.hoveringLamps.some((lamp,i)=>Math.abs(lamp.y-before.hoveringLamps[i].y)>.03),'Both extra task lamps hover using visible geometry');
  held(a,'Watching the self-polishing armor');ticks(a,90);
  assert(!display().demonstration.active,'The armor demonstration finishes normally');
  click('tower-workshop-action');ticks(a,35);await frame();workshopControlsFit('The armor observation');return result(a);
}
export async function workshopBroom(a){
  click('tower-workshop-close');local(a,-8.2,0);local(a,4,0);local(a,4,5);local(a,5.8,5);local(a,5.8,7.5);a.step(0);
  assert(a.workshop.state().near==='broom','The reorganizing broom has a clear approach beside the golem');key('KeyF');
  assert(a.workshop.state().id==='broom','F opens the overhelpful broom observation');
  const display=()=>a.testWorld.state().guild.workshop,before=display().conveniences.sorting;
  click('tower-workshop-action');ticks(a,45);const after=display().conveniences.sorting;
  assert(Math.abs(after.toolsX-before.toolsX)>.05&&Math.abs(after.broomX-before.broomX)>.05,'The broom actually rearranges tools on the bench');
  held(a,'Watching the broom sort');ticks(a,75);
  assert(!display().demonstration.active,'The broom demonstration finishes normally');
  assert(!a.tower.state().exteriorLoaded&&a.testWorld.state().guild.activeRoomLights===1,'Household enchantments require no outdoor regions or additional room lights');
  click('tower-workshop-action');ticks(a,45);await frame();workshopControlsFit('The broom observation');return result(a);
}
export async function returnAndRegressions(a){
  if(a.workshop?.state().open){click('tower-workshop-close');approachWizard(a,'hadrin');key('KeyF');}
  await saveAndReturn(a,'hadrin');leaveWizard(a);walkTo(a,towerStairPoint(2));spiral(a,2,1);local(a,10,0);local(a,4,0);
  assert(atFloor(a,'taleth'),'Walking down from Hadrin returns to Taleth');
  assert(!a.tower.state().exteriorLoaded,'Exploration, conversations and Continue leave the exterior unloaded');
  await a.visit({...TOWER_DOOR,y:TOWER.y,z:TOWER_DOOR.z-1});key('KeyF');
  assert(a.tower.state().inside&&!a.tower.state().briefed&&!a.war.state().campaignSide,'The outside door remains locked after exploring both new floors');
  await a.visit({...TALETH_SPOT,y:TOWER.y,z:TALETH_SPOT.z+2});key('KeyF');
  assert(a.state().mode==='briefing'&&!$('tower-briefing').hidden&&!a.guildWizards.state().open,'Taleth still opens his own middle-floor conversation');
  assert(!$('tower-allegiance-west').hidden&&!$('tower-allegiance-east').hidden&&$('tower-next').disabled,'Both allegiance choices remain with Taleth');
  click('tower-training-start');const end=performance.now()+30000;
  while(a.state().mode!=='training'&&performance.now()<end)await new Promise(resolve=>setTimeout(resolve,30));
  assert(a.state().mode==='training'&&a.training?.state().active,'Taleth still opens the Stillroom before allegiance');held(a,'The Stillroom after visiting all three floors');
  a.training.exit();assert(a.state().mode==='playing'&&atFloor(a,'taleth'),'Leaving the Stillroom returns to Taleth chamber');
  key('KeyF');click('tower-allegiance-west');click('tower-next');
  assert(a.tower.state().briefed&&a.war.state().campaignSide==='west','Taleth still commits the chosen league after tower exploration');
  held(a,'The committed tower');
  assert(a.store.save(initialSave).ok,'The isolated original checkpoint remains valid');await a.loadSaved();a.resume();
  assert(!a.tower.state().briefed&&!a.war.state().campaignSide,'An older uncommitted checkpoint still restores correctly');
  await a.visit(TOWER_SPAWN);a.look({yaw:.6,pitch:.2,distance:7});a.step(0);await frame();
  assert(!a.state().frameErrors.length,'The tower floors, conversations, stairs and reloads have no renderer errors');
  return result(a);
}
