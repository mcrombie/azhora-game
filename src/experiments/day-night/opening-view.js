import {adventureTimeLabel,durationLabel,openingCountdown,waitActionLabel} from './opening-time-label.js';

/** Shared presentation for elapsed campaigns and the isolated opening rehearsal. */
export const openingDateLabel=(clock={})=>adventureTimeLabel(clock.elapsedSeconds);

export function openingAftermathSummary(campaign={}){
  const battle=[...(campaign.events??[])].reverse().find(event=>event.type==='battle'&&event.region==='caricas');
  const side=battle?(battle.captured?battle.attacker:battle.defender):campaign.regions?.caricas?.owner;
  const name=side==='west'?'West Lizeem':side==='east'?'East Lizeem':null;
  return name?`${name} holds Caricas after the battle. The wider war remains unresolved.`:'The first battle at Caricas is over. The wider war remains unresolved.';
}

export function createOpeningTimeView({war,getMode,setMode,safePlace,onExit}){
  const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./opening.css',import.meta.url).href;document.head.append(css);
  const bar=document.createElement('aside');bar.id='opening-world-time';bar.hidden=true;bar.setAttribute('aria-label','Adventure time');
  bar.innerHTML='<div class="opening-time-heading"><strong data-clock></strong><span class="opening-time-state" data-status></span></div><div class="opening-time-action"><p class="opening-time-countdown" data-countdown></p><button type="button" data-wait aria-label="Wait for the next campaign event">Wait here</button></div><details id="opening-time-help"><summary>Time &amp; waiting</summary><p class="opening-time-explanation" data-explanation></p><p data-hint></p><p class="opening-time-daylight">Daylight: <span data-period></span></p></details>';
  const transition=document.createElement('p');transition.id='opening-time-transition';transition.hidden=true;transition.setAttribute('role','status');
  const dialog=document.createElement('dialog');dialog.id='opening-time-dialog';dialog.setAttribute('aria-labelledby','opening-time-title');dialog.setAttribute('aria-describedby','opening-time-detail');
  dialog.innerHTML='<p class="opening-time-eyebrow" data-eyebrow></p><h2 id="opening-time-title"></h2><p class="opening-time-destination" data-destination></p><p id="opening-time-detail"></p><ul data-consequences></ul><p class="opening-time-error" role="alert" data-error hidden></p><div class="opening-time-buttons"><button type="button" data-cancel></button><button type="button" class="opening-time-primary" data-confirm></button></div>';
  document.getElementById('world-war-report').prepend(bar);
  document.body.append(transition,dialog);
  const find=(root,selector)=>root.querySelector(selector),clockText=find(bar,'[data-clock]'),period=find(bar,'[data-period]'),countdown=find(bar,'[data-countdown]'),status=find(bar,'[data-status]'),hint=find(bar,'[data-hint]'),wait=find(bar,'[data-wait]'),explanation=find(bar,'[data-explanation]');
  const title=find(dialog,'h2'),eyebrow=find(dialog,'[data-eyebrow]'),destination=find(dialog,'[data-destination]'),detail=find(dialog,'#opening-time-detail'),consequences=find(dialog,'[data-consequences]'),error=find(dialog,'[data-error]'),cancel=find(dialog,'[data-cancel]'),confirm=find(dialog,'[data-confirm]');
  const write=(node,key,value)=>{if(node[key]!==value)node[key]=value;};
  let disposed=false,updating=false,lastUpdate=-Infinity,modal=null,expectedKey=null,previousMode='playing',completionSeen=false,completionReadyAt=null,lastTransition=null,transitionUntil=0,forecast=null,current=null;

  function close(restore=true){
    modal=null;expectedKey=null;
    if(dialog.open)dialog.close();
    if(restore&&getMode()==='time-wait')setMode(previousMode);
    document.getElementById('exploration-canvas')?.focus();
    update(true);
  }
  function show(kind){
    if(disposed||modal||getMode()!=='playing')return;
    modal=kind;previousMode=getMode();error.hidden=true;error.textContent='';confirm.disabled=false;
    setMode('time-wait');
    dialog.showModal();cancel.focus();
    bar.hidden=true;
  }
  function showWait(){
    if(getMode()!=='playing'||!safePlace())return;
    const next=war.waitForecast();if(!next?.ok){update(true);return;}
    expectedKey=next.key;forecast=next;
    eyebrow.textContent='Rest / adventure time advances';title.textContent=next.title;
    destination.textContent=`${openingDateLabel(war.state().clock)} → ${openingDateLabel(next)} · Wait ${durationLabel(next.remainingSeconds)}`;
    detail.textContent=next.detail;
    consequences.replaceChildren(...(next.consequences??[]).map(text=>{const item=document.createElement('li');item.textContent=text;return item;}));
    consequences.hidden=!consequences.children.length;
    cancel.textContent='Keep exploring';confirm.hidden=false;confirm.textContent=waitActionLabel(next.kind);
    show('wait');
  }
  function showComplete(snapshot){
    completionSeen=true;
    eyebrow.textContent='Lizeemi War / opening experiment';title.textContent='The first battle is settled';
    destination.textContent=`${openingDateLabel(snapshot.clock)} · Time held`;
    detail.textContent=openingAftermathSummary(snapshot.campaign);
    const item=document.createElement('li');item.textContent='This experiment ends here. You can explore the aftermath and speak with the people; time will remain held.';
    consequences.replaceChildren(item);consequences.hidden=false;
    cancel.textContent='Explore aftermath / time held';confirm.hidden=false;confirm.textContent='Return to main menu';
    show('complete');
  }
  function showInterruption(result){
    modal='interrupted';expectedKey=null;
    eyebrow.textContent='Rest / New campaign event';title.textContent='Rest interrupted';
    destination.textContent=`${openingDateLabel(result.to)} · Time held`;
    detail.textContent=(result.notice?result.notice+' ':'A new campaign event needs your attention. ')+'Time is held while this window is open and resumes when you return to the world.';
    consequences.replaceChildren();consequences.hidden=true;error.hidden=true;
    confirm.hidden=true;cancel.textContent='Return to the world';cancel.focus();
    update(true);
  }
  function reject(reason){error.textContent=reason||'The situation has changed. Close this window and review the next event again.';error.hidden=false;confirm.disabled=true;cancel.focus();}
  function accept(){
    if(modal==='complete'){close(false);onExit();return;}
    if(modal!=='wait'||getMode()!=='time-wait')return;
    if(!safePlace()){reject(war.state().clock?.fullCampaign?'You are no longer in a safe resting place. Dismount and find quiet, dry ground away from the battlefield.':'You are no longer in a safe resting place. Return to Bear’s stable or the Caricas north road.');return;}
    const next=war.waitForecast();
    if(!next?.ok||next.key!==expectedKey){reject(next?.reason??'The forecast has changed. Keep exploring, then review the new event.');return;}
    confirm.disabled=true;
    const result=war.waitOpening(expectedKey);
    if(!result?.ok){reject(result?.reason);return;}
    if(result.interrupted){showInterruption(result);return;}
    close();
  }
  function update(force=false){
    if(disposed||updating)return;
    const now=performance.now();if(!force&&now-lastUpdate<200)return;
    lastUpdate=now;updating=true;
    try{
      const snapshot=war.state(),clock=snapshot.clock??{};current=clock;
      const active=!!clock.sharedOpening,mode=getMode();
      if(modal&&(!active||mode!=='time-wait')){modal=null;expectedKey=null;if(dialog.open)dialog.close();}
      write(bar,'hidden',!active||mode!=='playing');
      if(!active){transition.hidden=true;return;}
      if(!clock.complete)completionSeen=false;
      if(!clock.complete||mode!=='playing'||modal)completionReadyAt=null;
      write(clockText,'textContent',openingDateLabel(clock));write(period,'textContent',clock.periodLabel??'');
      const state=clock.complete?'Complete · held':clock.heldReason?.includes("Taleth's tower")?'Tower · held':clock.heldReason?.startsWith('Campaign paused')?'Paused':clock.heldReason?.startsWith('Reading /')?'Reading · held':clock.heldReason||!clock.running?'Time held':'Running';
      write(status,'textContent',state);write(bar.dataset,'timeState',clock.complete||clock.heldReason||!clock.running?'held':'running');
      write(explanation,'textContent',clock.complete?(clock.fullCampaign?'The war is settled. Return to Taleth at the tower to review your campaign. Time stays held while you explore.':'The opening is complete. Time stays held while you explore.'):clock.heldReason??(clock.running?'Time passes outdoors, even while standing still. Reading and conversations hold it; close them to resume.':'Adventure time is held. Resume the campaign from the map when you are ready.'));
      const place=mode==='playing'?safePlace():null;
      forecast=war.waitForecast();
      write(countdown,'textContent',openingCountdown(forecast));write(countdown,'hidden',!!clock.complete||!forecast?.ok);
      const canWait=!!place&&!!forecast?.ok&&!clock.complete;
      write(wait,'hidden',!canWait);
      write(wait,'title',canWait?`${place} · Preview the next event before waiting`:'Wait for the next campaign event');
      write(hint,'textContent',clock.complete?'Explore the aftermath at your own pace.':place?(forecast?.ok?`${place} · Rest here to advance to the next event.`:forecast?.reason??'No campaign event is ready to await.'):clock.fullCampaign?'Dismount and find quiet, dry ground away from battle to wait for the next event.':'Rest on foot at Bear’s stable or the Caricas north road to await a campaign event.');
      if(!clock.transition&&lastTransition!==null){lastTransition=null;transitionUntil=0;transition.textContent='';}
      if(clock.transition&&clock.transition.id!==lastTransition){
        lastTransition=clock.transition.id;transitionUntil=now+11000;
        const change=clock.transition;
        const reason={'wait-for-army':'The army has arrived','wait-for-aftermath':'The battle is settled','wait-for-orders':'Command review','battle-completion':'The battle is settled','time-advance':'Time passes'}[change.reason]??'Time passes';
        write(transition,'textContent',`${reason} · ${openingDateLabel(change.from)} → ${openingDateLabel(change.to)}`);
      }
      write(transition,'hidden',now>transitionUntil||!transition.textContent||!['playing','encounter','skirmish'].includes(mode));
      // Encounter closure briefly returns to playing before death/another
      // phase changes mode. Wait for stable control before announcing the end.
      if(clock.complete&&!clock.fullCampaign&&!completionSeen&&mode==='playing'&&!modal){
        completionReadyAt??=now+250;
        if(now>=completionReadyAt)showComplete(snapshot);
      }
    }finally{updating=false;}
  }
  wait.onclick=showWait;cancel.onclick=()=>close();confirm.onclick=accept;
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  // Native <dialog> owns tab focus. Prevent game shortcuts/movement from acting
  // on the same keys while its controls are focused; native activation remains.
  for(const type of ['keydown','keyup'])dialog.addEventListener(type,event=>event.stopPropagation());
  for(const type of ['keydown','keyup'])bar.addEventListener(type,event=>{if(['Space','Enter','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.stopPropagation();});
  update(true);
  return {
    update,
    keydown(event){if(!modal)return false;if(event.code==='Escape'){event.preventDefault();close();}return true;},
    state:()=>({visible:!bar.hidden,modal,completionSeen,expectedKey,forecast,clock:current}),
    dispose(){if(disposed)return;disposed=true;if(dialog.open)dialog.close();bar.remove();transition.remove();dialog.remove();css.remove();},
  };
}
