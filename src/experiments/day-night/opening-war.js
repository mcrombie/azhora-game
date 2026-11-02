import {createWorldWar,OPENING_WORLD_WAR_SCENARIO,SECONDS_PER_DAY} from '../../app/exploration/world-war.js';
import {UNIFIED_WORLD_WAR_SCENARIO,isUnifiedWorldWar,worldWarScenario} from '../../app/exploration/world-war.js';
import {DAY_NIGHT_SECONDS,daylightWords} from './day-night-clock.js';

// The opening rehearsal and full campaign share one elapsed adventure clock. Each minute processes one
// strategic order tick; the solar cycle takes 24 minutes from dawn at 06:00.
// Tower time is held, so the first exit always reveals this sunrise. Later
// visits and restored checkpoints continue at their elapsed adventure time.
// Campaign `day` is an internal order index here, never a calendar date.
export const OPENING_ORDER_SECONDS=60;
const SCALE=OPENING_ORDER_SECONDS/SECONDS_PER_DAY;
const firstBattle=state=>state.engagements.find(b=>b.region==='caricas');
const timeLabel=seconds=>`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
const moment=clock=>({elapsedSeconds:clock.elapsedSeconds,hour:clock.hour});
const sunHour=seconds=>(6+seconds/(DAY_NIGHT_SECONDS/24))%24;

export function openingWaitForecast(state,clock){
  if(clock.complete||firstBattle(state)?.status==='resolved')return {ok:false,reason:'The opening experiment is complete.'};
  if(state.pending)return {ok:false,reason:'Finish or leave the current encounter before waiting.'};
  const battle=firstBattle(state);
  let kind,tick,id,armyId,battleId,title,detail,consequences;
  if(battle?.status==='active'){
    kind='battle-aftermath';tick=battle.endsOn;id=battle.id;battleId=id;title='Wait for the Caricas result';
    detail='Remain out of this battle and let the armies settle the field.';
    consequences=['Caricas will be decided without further help from you. Any contribution already made is retained.','Armies elsewhere continue their orders while you wait.'];
  }else{
    const army=state.armies.filter(a=>a.status==='marching'&&a.kind==='attack'&&a.to==='caricas').sort((a,b)=>a.arrives-b.arrives||a.id-b.id)[0];
    const planned=worldWarScenario(state.scenario).openingOrders.find(order=>order.to==='caricas');
    if(!army&&!planned)return {ok:false,reason:'No opening arrival is currently forecast.'};
    kind='army-arrival';tick=army?.arrives??1+planned.marchDays;id=army?.id??'planned';armyId=army?.id;title='Await the army at Caricas';
    detail='Let the remaining preparation time pass. You stay where you are.';
    consequences=['The West Lizeem army reaches Caricas and the battle opens.','Waiting does not choose your side or enter the battle for you.'];
  }
  const dueAt=tick*OPENING_ORDER_SECONDS;
  if(!Number.isInteger(tick)||dueAt<=clock.elapsedSeconds)return {ok:false,reason:'This event needs an updated campaign report.'};
  return {ok:true,key:[kind,id,tick,state.day,state.commands.length].join(':'),kind,dueAt,elapsedSeconds:dueAt,hour:sunHour(dueAt),
    remainingSeconds:Math.max(0,dueAt-clock.elapsedSeconds),region:'caricas',
    ...(armyId!==undefined?{armyId}:{}),...(battleId?{battleId}:{}),title,detail,consequences};
}

// Forecast from already issued orders. Reading the map or clock must never run
// a speculative campaign turn, consume random state, or dispatch an army.
export function adventureWaitForecast(state,clock){
  if(clock.complete||state.winner)return {ok:false,reason:'The Lizeemi War is complete.'};
  if(state.pending)return {ok:false,reason:'Finish or leave the current encounter before waiting.'};
  if(state.day===0&&!state.engagements.length)return {...openingWaitForecast(state,clock),regionName:'Caricas'};
  const candidates=[
    ...state.engagements.filter(b=>b.status==='active').map(b=>({kind:'battle-aftermath',tick:b.endsOn,id:b.id,battleId:b.id,region:b.region})),
    ...state.armies.filter(a=>['marching','retreating'].includes(a.status)).map(a=>({kind:'army-arrival',tick:a.arrives,id:a.id,armyId:a.id,region:a.to})),
  ].filter(event=>Number.isInteger(event.tick)&&event.tick*OPENING_ORDER_SECONDS>clock.elapsedSeconds)
    .sort((a,b)=>a.tick-b.tick||String(a.id).localeCompare(String(b.id)));
  // A regrouping front may have no march to follow. Offer the next command
  // review instead of stranding the player without a waiting option. New orders
  // are not guaranteed; a commander may still need more time to recover.
  const scenario=worldWarScenario(state.scenario),every=scenario.rules.decisionEvery;
  const event=candidates[0]??{kind:'campaign-orders',tick:1+(Math.floor((state.day-1)/every)+1)*every,id:'orders',region:null};
  const {kind,tick,id,region,armyId,battleId}=event,dueAt=tick*OPENING_ORDER_SECONDS;
  const place=scenario.regions.find(r=>r.id===region)?.name??'the front';
  const title=kind==='battle-aftermath'?`Wait for the ${place} result`:kind==='army-arrival'?`Await the army at ${place}`:'Await the next army orders';
  const detail=kind==='battle-aftermath'?'Remain out of this battle and let the armies settle the field.':kind==='army-arrival'?'Let the remaining march time pass. You stay where you are.':'Let the armies regroup until their next command review. You stay where you are.';
  const consequences=kind==='battle-aftermath'?[`${place} will be decided without further help from you. Any contribution already made is retained.`,'An earlier arrival or new battle interrupts the wait.']:
    kind==='army-arrival'?[`An army is expected to reach ${place}. Earlier events may interrupt the wait.`,'Waiting does not choose your side or enter a battle for you.']:
    ['Commanders review their next orders; recovering armies may need more time.','Armies elsewhere continue their orders while you wait.'];
  return {ok:true,key:[kind,id,tick,state.day,state.commands.length].join(':'),kind,dueAt,elapsedSeconds:dueAt,hour:sunHour(dueAt),
    remainingSeconds:Math.max(0,dueAt-clock.elapsedSeconds),region,regionName:place,...(armyId!==undefined?{armyId}:{}),...(battleId?{battleId}:{}),title,detail,consequences};
}

export function createOpeningWar(saved=null){return createElapsedWar(saved,false);}
export function createAdventureWar(saved=null){return createElapsedWar(saved,true);}

function createElapsedWar(saved,fullCampaign){
  const allowed=id=>id===OPENING_WORLD_WAR_SCENARIO.id||fullCampaign&&isUnifiedWorldWar(id);
  if(saved&&(saved.sharedOpening!==2||!allowed(saved.simulation?.scenario)||saved.speed!==1))throw Error('Invalid elapsed-clock campaign checkpoint.');
  if(saved&&(fullCampaign?saved.fullCampaign!==true:saved.fullCampaign!==undefined))throw Error('This elapsed-clock checkpoint belongs to a different campaign mode.');
  const scenario=saved?worldWarScenario(saved.simulation.scenario):fullCampaign?UNIFIED_WORLD_WAR_SCENARIO:OPENING_WORLD_WAR_SCENARIO;
  const base=createWorldWar(saved??{simulation:{scenario:scenario.id,seed:scenario.defaultSeed,day:0,commands:[]},fraction:0,speed:1});
  if(!saved)base.campaign.watchBattles(true);
  base.pause();base.setSpeed(1);
  let status=null,transition=null,transitionId=0,eventTimes=[];
  function elapsed(){return status.day*OPENING_ORDER_SECONDS+base.clock().fraction*SCALE;}
  function remember(state,at=null){
    status={day:state.day,pending:!!state.pending,localBattleTiming:state.localBattleTiming??scenario.rules.localBattleTiming,
      complete:fullCampaign?!!state.winner:firstBattle(state)?.status==='resolved'};
    for(let i=eventTimes.length;i<state.events.length;i++)eventTimes.push(at??elapsed());
    if(status.complete)base.pause();return state;
  }
  const initial=base.snapshot();
  if(saved){
    const times=saved.openingEventTimes,maximum=initial.day*OPENING_ORDER_SECONDS+base.clock().fraction*SCALE;
    if(!Array.isArray(times)||times.length!==initial.events.length||times.some((value,i)=>!Number.isFinite(value)||value<initial.events[i].day*OPENING_ORDER_SECONDS||value>maximum+1e-7||value>=(initial.events[i].day+1)*OPENING_ORDER_SECONDS||i>0&&value<times[i-1]))throw Error('Invalid opening event timestamps.');
    eventTimes=[...times];
  }
  remember(initial);
  // Replay old outcomes under their original timing, then adopt the corrected
  // completion rule for future fights. The command survives saves and retries.
  if(fullCampaign&&!initial.winner&&status.localBattleTiming==='immediate'){
    const upgrade=base.campaign.setBattleTiming('scheduled');
    if(!upgrade.ok)throw Error('Could not update campaign battle timing.');
    remember(base.snapshot());
  }
  function record(reason,from){const to=moment(clock());if(Math.abs(from.elapsedSeconds-to.elapsedSeconds)>1e-8)transition={id:++transitionId,reason,from,to};}
  function snapshot(){
    const state=base.snapshot();
    for(let i=0;i<state.events.length;i++)state.events[i].elapsedSeconds=eventTimes[i];
    for(const b of state.engagements)Object.assign(b,{startedAt:b.started*OPENING_ORDER_SECONDS,endsAt:b.endsOn*OPENING_ORDER_SECONDS,...(b.resultId?{resolvedAt:eventTimes[b.resultId-1]}:{})});
    return state;
  }
  function clock(){
    const normal=base.clock(),fraction=normal.fraction*SCALE,elapsedSeconds=status.day*OPENING_ORDER_SECONDS+fraction,hour=sunHour(elapsedSeconds);
    return {...normal,sharedOpening:true,...(fullCampaign?{fullCampaign:true}:{}),timeline:'elapsed',elapsedSeconds,fraction,secondsPerDay:OPENING_ORDER_SECONDS,solarCycleSeconds:DAY_NIGHT_SECONDS,hour,
      minute:Math.floor(hour*60+1e-7)%60,periodLabel:daylightWords(hour),pending:status.pending,complete:status.complete,localBattleTiming:status.localBattleTiming,
      transition:transition?structuredClone(transition):null};
  }
  function advance(orders=1){
    if(!Number.isInteger(orders)||orders<0||orders>10000)throw Error('Advance between 0 and 10000 whole order ticks.');
    const from=moment(clock());let state=base.snapshot();
    for(let i=0;i<orders&&!state.pending&&!state.winner&&!status.complete;i++){
      base.resetPhase();state=remember(base.advance());
    }
    record('time-advance',from);return snapshot();
  }
  function toggle(){if(status.complete)return false;return base.toggle();}
  function tick(dt,active){
    if(!Number.isFinite(dt)||dt<0||dt>1)throw Error('Invalid world clock step.');
    const normal=base.clock();if(!active||!normal.running||status.pending||status.complete)return false;
    const seconds=normal.fraction*SCALE+dt;
    if(seconds<OPENING_ORDER_SECONDS-1e-8){base.resetPhase(seconds/SCALE);return false;}
    const boundary=(status.day+1)*OPENING_ORDER_SECONDS;
    base.resetPhase(Math.max(0,seconds-OPENING_ORDER_SECONDS)/SCALE);remember(base.advance(),boundary);return true;
  }
  function forecast(){return (fullCampaign?adventureWaitForecast:openingWaitForecast)(snapshot(),clock());}
  // A paid-in-time journey processes the same minute boundaries as watching
  // it sail. Preserve fractional seconds, issued orders, RNG and prior pause.
  function advancePassage(seconds){
    if(!Number.isFinite(seconds)||seconds<0||seconds>3600)throw Error('Invalid passage duration.');
    const from=clock(),wasRunning=base.clock().running;
    if(!wasRunning&&!status.complete&&!status.pending)base.toggle();
    let left=seconds;
    while(left>1e-8&&!status.complete&&!status.pending){const dt=Math.min(1,left);tick(dt,true);left-=dt;}
    if(!wasRunning)base.pause();
    return {seconds:clock().elapsedSeconds-from.elapsedSeconds,complete:status.complete};
  }
  function wait(kind,key){
    const proposal=forecast();
    if(!proposal.ok)return proposal;
    if(proposal.kind!==kind||key!==proposal.key)return {ok:false,reason:'The campaign has changed. Review the waiting forecast again.'};
    const from=moment(clock()),initial=base.snapshot(),existing=new Set(initial.engagements.map(b=>b.id));
    base.pause();let state=initial,interrupted=false,notice=null;
    while(elapsed()<proposal.dueAt&&!state.pending&&!state.winner&&!status.complete){
      base.resetPhase();state=remember(base.advance());
      const nextBattle=state.engagements.find(b=>!existing.has(b.id)&&b.status==='active');
      const arrival=state.events.find(e=>e.day===state.day&&e.type==='arrive');
      if(elapsed()<proposal.dueAt&&(state.pending||nextBattle||arrival)){
        interrupted=true;
        const place=scenario.regions.find(r=>r.id===(nextBattle?.region??arrival?.region??state.pending?.region))?.name??'another region';
        const destination=fullCampaign?scenario.regions.find(r=>r.id===proposal.region)?.name??'next army orders':'Caricas';
        const expected=kind==='battle-aftermath'?`the ${destination} outcome`:kind==='army-arrival'?`the ${destination} arrival`:'the next army orders';
        notice=`${nextBattle?'A new battle has begun':arrival?'An army has arrived':'An encounter is waiting'} in ${place} at Adventure ${timeLabel(elapsed())}. Waiting stopped before ${expected}.`;
        break;
      }
    }
    record(kind==='army-arrival'?'wait-for-army':kind==='campaign-orders'?'wait-for-orders':'wait-for-aftermath',from);
    return {ok:true,seconds:elapsed()-from.elapsedSeconds,from,to:moment(clock()),interrupted,...(notice?{notice}:{}),complete:status.complete};
  }
  // A completed field battle can process several normal minute boundaries in
  // one transaction. Keep entry-time events at their precise original instant,
  // timestamp intervening events at their own boundary, and discard the old
  // fractional minute so the hero emerges exactly at the scheduled finish.
  const campaign=Object.fromEntries(Object.entries(base.campaign).map(([name,method])=>[name,
    name==='step'?advance:name==='snapshot'?snapshot:(...args)=>{
      const from=moment(clock()),day=status.day,answer=method(...args),state=base.snapshot();
      if(state.day!==day){
        base.resetPhase();
        for(let i=eventTimes.length;i<state.events.length;i++)eventTimes.push(state.events[i].day===day?from.elapsedSeconds:state.events[i].day*OPENING_ORDER_SECONDS);
        remember(state);record('battle-completion',from);
      }else remember(state);
      return answer;
    }]));
  return {campaign,snapshot,clock,tick,advance,advancePassage,toggle,pause:base.pause,
    syncRegion(name){const answer=base.syncRegion(name);remember(base.snapshot());return answer;},
    begin(){if(!status.complete&&!base.clock().running)base.toggle();},
    setSpeed(value){if(value!==1)throw Error(`The elapsed-clock ${fullCampaign?'campaign':'opening'} runs at normal speed. Use the waiting forecast to advance time.`);},
    checkpoint(){return {...base.checkpoint(),sharedOpening:2,...(fullCampaign?{fullCampaign:true}:{}),openingEventTimes:[...eventTimes]};},forecast,
    advanceToNextEvent:key=>wait(fullCampaign&&forecast().kind==='campaign-orders'?'campaign-orders':'army-arrival',key),advanceToAftermath:key=>wait('battle-aftermath',key)};
}
