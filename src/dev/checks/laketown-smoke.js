import {YUNETHRE_TOWN as T} from '../../content/regions/minora-frontier/yunethre-world.js';
import {LAKETOWN_FISHING as F} from '../../content/regions/minora-frontier/laketown-waterfront-layout.js';
import {CHAPTER_LOCATIONS} from '../../content/chapters/yunethre/locations.js';
const assert=(value,message)=>{if(!value)throw Error(message);};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const press=code=>{
  document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true,cancelable:true}));
  document.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));
};
const position=api=>{const [x,y,z]=api.state().position;return {x,y,z};};

export async function review(api,stage){
  window.dispatchEvent(new Event('focus'));
  if(stage==='town'){
    assert(api.chapter.interact()&&api.chapter.choose('accept'),'Taleth briefing works');
    assert(await api.chapterTransition(null,{x:T.x+12,z:T.z+5}),'Prepare Laketown directly');
    api.chapter.command({type:'depart'});api.resume();api.reveal(true);
    const end=performance.now()+30000;
    while((api.testWorld.regionalLife()?.town?.loaded??0)<10){
      assert(performance.now()<end,'Ten Laketown residents did not find clear sites: '+JSON.stringify(api.testWorld.regionalLife()?.town));
      api.step(.05,.05);await delay(60);
    }
    const town=api.testWorld.regionalLife().town;
    assert(new Set(town.people.map(p=>p.species)).size===5,'Five peoples are visible in Laketown');
    assert(town.people.every(p=>api.groundProbe(p.x,p.z).clear),'Residents stand on clear, walkable ground');
    api.look({yaw:.75,pitch:.32,distance:10});api.step(.04,.04);await delay(150);
    return {stage,town,render:api.renderStats()};
  }
  if(stage==='conversation'){
    const resident=api.testWorld.residentPeople().find(p=>p.id==='laketown-oren');assert(resident,'Fisherman exists');
    let approach;
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6,p={x:resident.x+Math.sin(a)*2.5,z:resident.z+Math.cos(a)*2.5,y:resident.y};
      if(api.groundProbe(p.x,p.z).clear&&api.testWorld.residentTarget(p)?.id===resident.id){approach=p;break;}
    }
    assert(approach,'Fisherman has an accessible conversation approach');
    await api.visit(approach);api.resume();api.step(.04,.04);await delay(200);api.step(.04,.04);
    press('KeyF');assert(api.residentHost.state().speaking===resident.id,'F opens fisherman dialogue');
    document.querySelector('#resident-dialog [data-topic="work"]').click();
    assert(document.getElementById('resident-words').textContent.includes('net'),'Fishing livelihood is explained');
    const elapsed=api.chapter.state().elapsed;api.step(.1,3);assert(api.chapter.state().elapsed===elapsed,'Conversation holds chapter clock');
    api.look({yaw:Math.atan2(approach.x-resident.x,approach.z-resident.z),pitch:.12,distance:5});await delay(150);
    return {stage,speaker:resident.name,words:document.getElementById('resident-words').textContent};
  }
  if(stage==='rowan'){
    press('Escape');api.resume();const p=CHAPTER_LOCATIONS.town;
    await api.visit({x:p.x+1.2,z:p.z+2.1});api.look({yaw:0,pitch:.06,distance:3.7});
    for(let i=0;i<30;i++)api.step(.04,.04);
    assert(api.chapter.meeting('town'),'Rowan remains the main quest speaker');
    assert(api.chapter.conversation().text.includes('I am Rowan'),'Rowan introduces himself');
    api.chapter.choose('close');api.look({yaw:0,pitch:.02,distance:3.2});api.step(.04,.04);await delay(150);
    return {stage,position:position(api),quest:api.chapter.journal().active?.title};
  }
  if(stage==='waterfront'){
    await api.visit({x:F.gangway.a.x,y:F.deckY,z:F.gangway.a.z});api.resume();
    api.look({yaw:1.6,pitch:.35,distance:14});api.step(.04,.04);await delay(250);
    assert(Math.abs(position(api).y-F.deckY)<1,'Landing walk surface supports player');
    assert(api.testWorld.regionalLife()?.fishing,'Working fishing boat exists');
    assert(!api.state().frameErrors.length,'No runtime errors');
    return {stage,fishing:api.testWorld.regionalLife().fishing,render:api.renderStats()};
  }
  if(stage==='fishing'){
    const phases=new Set(),initial=api.testWorld.regionalLife().fishing;
    // Advance the local presentation only: testing its loop must not decide the chapter battle.
    for(let i=0;i<2800;i++){api.testWorld.update(i*.05,.05,position(api));phases.add(api.testWorld.regionalLife().fishing.phase);}
    assert(phases.has('fishing')&&phases.has('returning')&&phases.has('unloading'),'Boat rows out, fishes, returns and unloads: '+[...phases]);
    api.look({yaw:1.6,pitch:.28,distance:12});api.step(0,0);await delay(150);
    return {stage,phases:[...phases],initial,final:api.testWorld.regionalLife().fishing,errors:api.state().frameErrors};
  }
  throw Error('Unknown Laketown stage '+stage);
}
