import {LOOKOUT_TOUR} from '../../content/regions/minora-frontier/lookout-tour.js';
import {TALETH_SPOT,TOWER_DOOR,TOWER_EXIT,LOOKOUT_TALETH} from '../../app/exploration/tower-state.js';
import {MINORA_STABLE as STABLE} from '../../content/regions/minora-frontier/minora-stable.js';
import {availableBattleStage} from '../../simulation/battle-stages.js';
import {planWarTravel} from './war-travel.js';
import {planWarEntry} from './war-entry-route.js';
import {autoplayReadingTime} from './reading-time.js';

export function selectAutoplayBattle(campaign,side,position){
  return campaign.engagements.filter(b=>b.status==='active'&&availableBattleStage(b)&&(!b.participation?.faction||b.participation.faction===side))
    .sort((a,b)=>(a.endsOn-b.endsOn)||Math.hypot(a.location.x-position.x,a.location.z-position.z)-Math.hypot(b.location.x-position.x,b.location.z-position.z))[0]??null;
}

// A manual Continue may dispose the result while the watch driver is paused.
// Resume from the recorded battle, never demand that the player reopen it.
export function resumeAfterBattleResult(stage,mode,campaign,battleId){
  if(stage!=='result')return null;
  if(mode==='encounter'&&campaign.pending?.battleId===battleId&&campaign.pending.stage==='rally')return 'brief';
  if(mode!=='playing'||campaign.pending)return null;
  const battle=campaign.engagements.find(b=>b.id===battleId);
  if(battle?.status==='resolved')return 'letter-wait';
  if(battle&&availableBattleStage(battle))return 'choose';
  return null;
}

const lookoutStages=['river','politics','east',...LOOKOUT_TOUR.map(p=>p.view)];
export function autoplayLookoutStage(progress){
  return progress?.menu?'conclusion':lookoutStages[progress?.page??0]??'river';
}

// A fresh, isolated rehearsal, driven through the real dialogue, doors, horse,
// battle decisions and encounter input policy. No simulation outcome patching.
export function createLizeemCampaignAutoplay({side,war,world,position,mode,room,stable,steer,clearInput,interact,click,prepareTravel,status,readingText=()=>'',towerProgress=()=>null}){
  let active=false,stage='idle',seconds=0,total=0,ticket=0,busy=false,route=[],arrival=null,battleId=null,stuck=0,last=null,phases=0,battles=0,error=null,stageLimit=120,travelGoal=null,replans=0,travelArrival=null,travelMessage='',pausedStage=null;
  const gap=p=>Math.hypot(position.x-p.x,position.z-p.z),campaign=()=>war.state().campaign;
  const readFor=minimum=>autoplayReadingTime(readingText(stage),minimum);
  const stableState=()=>stable?.state?.()??{};
  const awaitingBear=()=>stage==='bear'||(stage==='travel'&&arrival==='bear');
  function mountHorse(message='Mounting your horse'){
    const horse=stableState().horse??STABLE.horse,d=gap(horse);
    // A newly offered horse is already in reach. For an older parked horse,
    // approach its near side without steering through its collision body.
    const point=d<=2.85?position:{x:horse.x+(position.x-horse.x)/d*1.7,z:horse.z+(position.z-horse.z)/d*1.7};
    walk([point],'mount',message);
  }
  function meetBear(){
    const state=stableState(),bear=state.bear??STABLE.bear;
    if(state.offerOpen){phase('horse-lesson','Bear offers your horse');return;}
    if(stable?.owned){mountHorse();return;}
    walk([{x:bear.x+1,z:bear.z-2}],'bear','Bear is bringing your horse');
  }
  function phase(next,message,limit=120){stage=next;seconds=0;stageLimit=limit;clearInput();status(`${side==='west'?'West':'East'} Lizeem / ${message}`,true);}
  function stop(message='Autoplay stopped. You have control of this rehearsal.'){
    if(!active)return;pausedStage=stage==='complete'||error?null:{stage,room:room?.(),mode:mode?.(),running:!!war.state?.().clock?.running};active=false;ticket++;busy=false;clearInput();war.pause();war.setSpeed(1);status(message,false);
  }
  function fail(message){error=message;stop(message+' Autoplay stopped; your saved campaign is untouched.');}
  function walk(points,next,message){route=points.map(p=>Array.isArray(p)?{x:p[0],z:p[1]}:{...p});arrival=next;last=null;stuck=0;phase('travel',message,300);}
  function finishTravel(){clearInput();route=[];phase(arrival,arrival==='join'?'Entering the marked battlefield':arrival==='talk-final'?'Back with Taleth':'Arrived');}
  function plan(target,next,message,retry=false){
    travelGoal={...target};travelArrival=next;travelMessage=message;if(!retry)replans=0;
    const snapshot=war.state(),obstacles=[
      ...snapshot.soldiers.people.map(p=>({...p,r:stable.mounted?1.45:1})),
      ...(snapshot.courier?.people??[]).map(p=>({...p,r:stable.mounted?1.45:1})),
      ...(world.residentPeople?.()??[]).map(p=>({...p,r:stable.mounted?1.45:1})),
      ...snapshot.campaign.engagements.filter(b=>b.status==='active'&&b.id!==battleId&&b.entryRadius).map(b=>({...b.location,r:b.entryRadius+1}))
    ];
    const request=++ticket;busy=true;war.pause();phase('planning','Finding a clear route / '+message);
    const options={radius:stable.mounted?.9:.48,obstacles,cancelled:()=>!active||request!==ticket};
    const from={x:position.x,z:position.z},battle=next==='join'&&snapshot.campaign.engagements.find(b=>b.id===battleId);
    const search=battle?planWarEntry(world,from,battle,options):planWarTravel(world,from,target,options);
    search.then(points=>{
      if(!active||request!==ticket)return;busy=false;
      if(!points){fail('No clear route was found.');return;}
      walk(points,next,message);war.setSpeed(1);war.run();
    }).catch(e=>{if(active&&request===ticket)fail('Route search failed: '+e.message);});
  }
  function resume(){
    if(active||!pausedStage||mode?.()==='loading')return false;
    const transition={door:null,inside:'tower',ascend:'lookout','final-intro':'lookout'};
    const finishedDoor=Object.hasOwn(transition,pausedStage.stage)&&room?.()===transition[pausedStage.stage]&&mode?.()==='playing';
    if(room?.()!==pausedStage.room&&!finishedDoor){status('This rehearsal changed rooms. Start a fresh watch run from F8.',false);return false;}
    const previous=pausedStage;pausedStage=null;active=true;clearInput();last=null;stuck=0;
    if(previous.stage==='planning'){plan(travelGoal,travelArrival,travelMessage,true);return true;}
    if(previous.stage==='prepare'){phase('door','Resuming outside the tower');return true;}
    if(previous.stage==='final-intro'&&finishedDoor){walk([{x:LOOKOUT_TALETH.x-1,z:LOOKOUT_TALETH.z-1}],'panorama','Joining Taleth at the parapet');return true;}
    const progress=towerProgress();
    if(mode?.()==='playing'&&previous.stage==='intro'){
      if(progress?.briefed)walk([{x:TOWER_DOOR.x,z:TOWER_DOOR.z-1.5}],'door','Leaving the guild chamber');
      else phase('talk','Returning to Taleth');return true;
    }
    if(mode?.()==='playing'&&previous.stage==='horse-lesson'){
      if(stable.owned)mountHorse();
      else phase('bear','Returning to Bear');return true;
    }
    if(mode?.()==='playing'&&awaitingBear()&&stable?.owned){mountHorse();return true;}
    if(mode?.()==='playing'&&previous.stage==='final-intro'){phase('talk-final','Returning to Taleth');return true;}
    if(progress&&room?.()==='lookout'&&[...lookoutStages,'conclusion'].includes(previous.stage)){
      if(mode?.()==='briefing'&&progress.open){phase(autoplayLookoutStage(progress),'Resuming Taleth’s current view');return true;}
      if(mode?.()==='playing'){
        if(progress.menu&&['east',...LOOKOUT_TOUR.map(p=>p.view)].includes(previous.stage)){stage='complete';stop('Rehearsal complete. You have control. Your saved campaign is untouched.');return true;}
        phase('panorama','Returning to Taleth’s panorama');return true;
      }
    }
    // A player may acknowledge either battle result before resuming the watch
    // run. Follow the recorded state without replaying Continue or its effects.
    const snapshot=war.state?.(),current=snapshot?.campaign;
    const afterResult=current&&resumeAfterBattleResult(previous.stage,mode?.(),current,battleId);
    if(afterResult){
      if(afterResult==='letter-wait')battles++;
      phase(afterResult,afterResult==='brief'?'Regrouping with the allied assault':afterResult==='letter-wait'?'Taleth has news for you':'Returning to the unfinished battlefield');return true;
    }
    // Understood and Talk later both close the conversation during takeover.
    // Read the receipt: only acknowledged news permits moving to the next front.
    if(previous.stage==='letter'&&mode?.()==='playing'&&snapshot?.courier&&!snapshot.courier.conversation){
      phase(snapshot.courier.delivery?'letter-wait':'choose',snapshot.courier.delivery?'Listening for the unread message from Taleth':'Looking for the next front');return true;
    }
    if(mode?.()!==previous.mode&&!finishedDoor){active=false;pausedStage=previous;status('Close the current menu or conversation, then resume autoplay.',false);return false;}
    status(`${side==='west'?'West':'East'} Lizeem / Autoplay resumed`,true);
    if(previous.running&&stage==='travel')war.run();return true;
  }
  function start(){if(!['west','east'].includes(side))return false;active=true;error=null;total=phases=battles=0;war.pause();walk([{x:TALETH_SPOT.x,z:TALETH_SPOT.z+2}],'talk','Meeting Taleth');return true;}
  function tick(dt,enabled){
    if(!active||!enabled||busy||mode()==='loading')return;
    seconds+=dt;total+=dt;
    if(['limbo','reaper','crossing'].includes(mode())){stop('Teresod fell. Choose a fate with the Reaper, or take control.');return;}
    if(seconds>stageLimit||total>3600){fail('The rehearsal could not finish this step: '+stage);return;}
    if(awaitingBear()){
      const state=stableState();
      if(state.offerOpen){phase('horse-lesson','Bear offers your horse');return;}
      if(stable?.owned){mountHorse();return;}
      if(state.approaching){clearInput();return;}
    }
    if(stage==='travel'){
      const b=battleId&&campaign().engagements.find(b=>b.id===battleId);
      if(arrival==='join'&&(!b||b.status!=='active')){phase('choose','The field has resolved; looking for the next front');return;}
      if(arrival==='join'&&gap(b.location)<=b.entryRadius+.01){finishTravel();return;}
      if(!route.length){finishTravel();return;}
      if(gap(route[0])<(route.length>1?1:arrival==='mount'?.7:1.1)){route.shift();clearInput();if(!route.length)finishTravel();return;}
      if(mode()!=='playing')return;
      stuck=last&&Math.hypot(position.x-last.x,position.z-last.z)<.2*dt?stuck+dt:0;last={x:position.x,z:position.z};
      if(stuck>2){if(travelGoal&&replans++<3){plan(travelGoal,arrival,'Finding a way around the obstruction',true);return;}fail('The rider is blocked on the way to '+arrival+'.');return;}
      steer(route[0]);return;
    }
    if(stage==='talk'){interact();phase('intro','Taleth explains the war');return;}
    if(stage==='intro'&&seconds>readFor(9)){
      click('tower-allegiance-'+side);click('tower-next');
      if(towerProgress()?.briefed===false){fail('Taleth could not confirm the campaign allegiance.');return;}
      walk([{x:TOWER_DOOR.x,z:TOWER_DOOR.z-1.5}],'door','Leaving the guild chamber');return;
    }
    if(stage==='door'){
      if(room()==='tower'){interact();return;}
      busy=true;const request=++ticket;phase('prepare','Preparing the five-region rehearsal');
      Promise.resolve(prepareTravel()).then(()=>{if(!active||request!==ticket)return;busy=false;meetBear();}).catch(e=>{if(active&&request===ticket)fail(e.message);});return;
    }
    if(stage==='bear'){
      stable.interact();
      if(mode()==='briefing'||stableState().offerOpen)phase('horse-lesson','Bear offers your horse');
      else{const bear=stableState().bear??STABLE.bear;steer({x:bear.x+1,z:bear.z-2});}
      return;
    }
    if(stage==='horse-lesson'&&seconds>readFor(5)){click('stable-next');seconds=0;if(stable.owned)mountHorse();return;}
    if(stage==='mount'){
      stable.toggleMount();if(!stable.mounted)return;
      war.trackRoute();war.run();walk([[-2404,70],[-2328,70],[-2308,70],[-2308,135],[-2150,135],[-2120,150]],'choose','Riding through Minora toward Caricas');return;
    }
    if(stage==='choose'){
      if(campaign().winner&&war.state().courier?.delivery){war.pause();phase('letter-wait','Taleth says the war is over');return;}
      if(campaign().winner){battleId=null;if(!stable.mounted){stable.whistle();phase('horse-return','Calling the horse for the ride home');return;}war.trackCouncil();plan(TOWER_EXIT,'enter-tower','Returning to Taleth in Minora');return;}
      const b=selectAutoplayBattle(campaign(),side,position);
      if(b){battleId=b.id;war.track({kind:'battle',id:b.id});if(!stable.mounted){stable.whistle();phase('horse-return','Calling the horse for the next front');return;}plan(b.location,'join','Riding to '+b.region);return;}
      if(war.state().clock.running)war.pause();if(seconds>2){seconds=0;war.advance();}return;
    }
    if(stage==='horse-return'){
      const horse=stable.state().horse;if(horse&&gap(horse)<2.85){stable.toggleMount();if(stable.mounted)phase('choose','Choosing the next front');}
      else if(horse&&gap(horse)<5&&!stable.state().called)steer(horse);
      if(seconds>25)fail('The horse could not reach you.');return;
    }
    if(stage==='join'){
      if(war.join(battleId).ok)phase('brief','Preparing to support '+side+' Lizeem');
      else if(seconds>4)fail('This battlefield could not be entered.');return;
    }
    if(stage==='brief'&&seconds>readFor(5)){war.help(side);phase('fight','Fighting beside '+side+' Lizeem, at normal speed',180);return;}
    if(stage==='fight'){
      const encounter=war.state().encounter.encounter;
      if(encounter?.outcome){phases++;phase('result','Reviewing the battle result / Stop to take your time');}return;
    }
    if(stage==='result'&&seconds>readFor(7)){
      war.continue();war.pause();
      if(campaign().pending){phase('brief','Regrouping with the allied assault');return;}
      battles++;phase('letter-wait','Taleth has news for you');return;
    }
    if(stage==='letter-wait'&&seconds>4){
      const courier=war.state().courier;
      if(!courier.delivery){phase('choose','Looking for the next front');return;}
      clearInput();click('corris-call');
      if(war.state().courier.conversation)phase('letter','Listening to Taleth / Counsel through your thoughts');
      return;
    }
    if(stage==='letter'&&seconds>readFor(9)){click('corris-understood');phase('choose','Looking for the next front');return;}
    if(stage==='enter-tower'){
      if(stable.mounted){stable.toggleMount();return;}
      if(gap(TOWER_EXIT)>3){steer(TOWER_EXIT);return;}
      interact();phase('inside','Entering the Wizard Guild');return;
    }
    if(stage==='inside'&&room()==='tower'){walk([{x:TALETH_SPOT.x,z:TALETH_SPOT.z+2}],'talk-final','Meeting Taleth after the war');return;}
    if(stage==='talk-final'){interact();phase('final-intro','The Lizeemi League / Taleth’s invitation');return;}
    if(stage==='final-intro'&&seconds>readFor(8)){click('tower-next');phase('ascend','Ascending to the panorama');return;}
    if(stage==='ascend'&&room()==='lookout'){walk([{x:LOOKOUT_TALETH.x-1,z:LOOKOUT_TALETH.z-1}],'panorama','Joining Taleth at the parapet');return;}
    if(stage==='panorama'){interact();phase(autoplayLookoutStage(towerProgress()),'Taleth’s panorama / first-person view');return;}
    if(stage==='river'&&seconds>readFor(10)){click('tower-next');phase('politics','What this campaign changed');return;}
    if(stage==='politics'&&seconds>readFor(10)){click('tower-next');phase('conclusion','Campaign complete / choosing the optional tour');return;}
    if(stage==='conclusion'&&seconds>readFor(6)){click('tower-next');phase('east','Looking east toward Ambron');return;}
    if(stage==='east'&&seconds>readFor(12)){click('tower-next');phase(LOOKOUT_TOUR[0].view,LOOKOUT_TOUR[0].title);return;}
    const tourIndex=LOOKOUT_TOUR.findIndex(p=>p.view===stage);
    if(tourIndex>=0&&seconds>readFor(16)){
      click('tower-next');const next=LOOKOUT_TOUR[tourIndex+1];
      if(next)phase(next.view,next.title);
      else{stage='complete';stop('Rehearsal complete. You have control. Your saved campaign is untouched.');}
    }
  }
  return {start,stop,resume,tick,state:()=>({active,canResume:!!pausedStage,stage,side,seconds,total,busy,phases,battles,battleId,error,replans,route:route.slice(0,2)})};
}
