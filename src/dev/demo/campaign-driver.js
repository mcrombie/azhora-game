import {COMBAT_LESSONS} from '../../gameplay/combat/combat-tutorial.js';
import {encounterKeys,clearCombatKeys} from '../checks/encounter-controls.js';
import {planWarTravel} from '../../gameplay/autoplay/war-travel.js';
import {planWarEntry} from '../../gameplay/autoplay/war-entry-route.js';
import {autoplayReadingTime} from '../../gameplay/autoplay/reading-time.js';
import {availableBattleStage} from '../../simulation/battle-stages.js';
import {LIZEEM_PORTS} from '../../content/regions/minora-frontier/lizeem-passages.js';
import {TALETH_SPOT,TOWER_DOOR,TOWER_EXIT,LOOKOUT_TALETH} from '../../app/exploration/tower-state.js';

// A recording director for the current, ordinary new-game path. It owns inputs,
// not simulation time: the recorder pumps this once before each captured RAF.
// There are no position assignments, forced outcomes, restores or advance calls.
const $=id=>document.getElementById(id);
const shown=e=>!!e&&!e.hidden&&e.getClientRects().length>0;
const click=id=>{const e=$(id);if(!shown(e)||e.disabled)throw Error('Unavailable demo control: '+id);e.click();};
const key=code=>{for(const type of ['keydown','keyup'])document.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));};
const host=()=>window.__EXPLORATION__??window.__STILLROOM__;
const point=a=>{const p=a?.state().position;return Array.isArray(p)?{x:p[0],y:p[1],z:p[2]}:p;};
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const visibleWords=()=>{
  const panels=[...document.querySelectorAll('dialog[open],[role="dialog"],#world-skirmish-result:not([hidden])')].filter(shown);
  return panels.filter(e=>!panels.some(parent=>parent!==e&&parent.contains(e))).map(e=>e.innerText).join(' ');
};

export function createCampaignDemo({side='west',tour=false}={}){
  if(!['west','east'].includes(side))throw Error('Invalid demonstration side.');
  let stage='idle',seconds=0,total=0,error=null,busy=false,done=false,route=[],nextStage=null,routeLabel='',limit=180;
  let currentBattle=null,lesson=0,battles=0,lastPoint=null,stuck=0,routeTarget=null,replans=0,reading=0,lastCast=-10;
  let fightStart=null,terminalHold=0,preloaded=false,planGeneration=0;
  const timeline=[],fights=[],notes=[];
  const clear=()=>{const a=host();if(!a)return;clearCombatKeys(a);for(const k of ['KeyF','ShiftLeft'])a.hold(k,false);};
  const campaign=()=>window.__EXPLORATION__?.war.state().campaign;
  const enter=(name,caption,timeout=180)=>{
    clear();stage=name;seconds=0;limit=timeout;reading=autoplayReadingTime(visibleWords(),7);
    timeline.push({stage,caption,total:+total.toFixed(3),campaignSeconds:window.__EXPLORATION__?.war.clock().elapsedSeconds??0});
  };
  const fail=e=>{error=String(e?.stack??e);clear();busy=false;stage='failed';};
  function walk(points,next,caption,{target=null,replan=false}={}){
    route=points.map(p=>Array.isArray(p)?{x:p[0],z:p[1]}:{...p});nextStage=next;routeLabel=caption;
    routeTarget=target;lastPoint=null;stuck=0;if(!replan)replans=0;
    enter('walk',caption,360);
  }
  function plan(to,next,caption,{battle=null,replan=false}={}){
    const a=host(),from=point(a),generation=++planGeneration;
    clear();busy=true;enter('planning',caption,300);
    const obstacles=[...(a.war?.state().soldiers?.people??[]),...(a.testWorld.residentPeople?.()??[])].map(p=>({...p,r:a.stable.mounted?1.45:1}));
    const horse=a.stable?.state().horse;
    if(horse&&!a.stable.mounted)obstacles.push({...horse,r:1.3});
    const options={radius:a.stable.mounted?.9:.6,spacing:2,maxNodes:100000,obstacles,cancelled:()=>!!error||generation!==planGeneration};
    // Preparing geometry is the same streaming work performed ahead of a rider;
    // it does not move the player or alter campaign state.
    Promise.resolve(a.testWorld.prepare(to.x,to.z)).then(()=>battle
      ?planWarEntry(a.testWorld,from,battle,options):planWarTravel(a.testWorld,from,to,options))
      .then(points=>{
        if(generation!==planGeneration||error)return;busy=false;
        if(!points)throw Error('No clear demonstration route to '+JSON.stringify(to));
        walk(points,next,caption,{target:{to:{...to},next,caption,battle},replan});
      }).catch(fail);
  }
  function approachHorse(next='choose'){
    const a=host();if(a.stable.mounted){enter(next,'Ready to ride');return;}
    key('KeyH');nextStage=next;enter('horse-return','Calling the horse',60);
  }
  function selectBattle(){
    const c=campaign(),p=point(host());
    return c.engagements.filter(b=>b.status==='active'&&availableBattleStage(b)&&(!b.participation?.faction||b.participation.faction===side))
      .sort((a,b)=>a.endsOn-b.endsOn||gap(a.location,p)-gap(b.location,p))[0]??null;
  }
  function fightInput(a,s){
    const yaw=a.snapshot().camera.yaw,input=encounterKeys(s,yaw,a.encounterInput?.(yaw));
    for(const [k,v]of Object.entries(input))a.hold(k,v);
    if(s.tutorial?.id==='block'){
      clearCombatKeys(a);a.hold('KeyF',true);
    }else if(s.tutorial?.id==='fireball'){
      clearCombatKeys(a);if(seconds-lastCast>1){key('KeyQ');lastCast=seconds;}
    }else{
      a.hold('KeyF',!!input.KeyF);
      if(!s.tutorial&&seconds-lastCast>5&&seconds>2){key('KeyQ');lastCast=seconds;}
    }
  }
  function begin(){
    if(stage!=='idle')return false;
    window.dispatchEvent(new Event('focus'));enter('menu','Begin the Lizeemi War');return true;
  }
  function tick(dt=0){
    if(error||done||stage==='idle')return status();
    try{
      if(window.__EXPLORATION_ERROR__)throw Error(window.__EXPLORATION_ERROR__);
      const a=host(),state=a?.state(),c=campaign();
      // Loading runs may be omitted from the film, but no gameplay frames may
      // be omitted. A busy path search is safe to pump with the clock frozen.
      if(busy)return status();
      if(shown($('loading-screen'))&&!['menu','opening','world-loading','exterior','ascent','tower-return'].includes(stage))return status();
      const delta=Math.max(0,Math.min(.25,Number(dt)||0));seconds+=delta;total+=delta;
      // Defeat animations finish before the report opens. Measure the report
      // once it exists, rather than advancing after a short pre-popup delay.
      if(stage.endsWith('-read')||stage.endsWith('-brief')||stage.endsWith('-result'))reading=Math.max(reading,autoplayReadingTime(visibleWords(),7));
      if(seconds>limit)throw Error(`Demo stage timed out: ${stage} / ${JSON.stringify(point(a))} / ${state?.mode}`);
      if(total>7200)throw Error('Demonstration exceeded two hours of filmed game time.');
      if(state?.frameErrors?.length)throw Error('Game rendering error: '+state.frameErrors.at(-1));
      if(stage==='menu'){
        if(shown($('new-world-war'))&&seconds>3){click('new-world-war');enter('opening','Entering the Spirit and Time Realm',600);}return status();
      }
      if(stage==='opening'){
        if(window.__STILLROOM__){enter('introduction','Taleth approaches');}return status();
      }
      if(!a)return status();
      if(stage==='introduction'){
        if(shown($('arrival-handoff'))){enter('introduction-read','An assignment across the ages');}return status();
      }
      if(stage==='introduction-read'&&seconds>reading){click('arrival-handoff');walk([{x:-1,z:18}],'uguth','Meet Uguth, the Battle Wizard');return status();}
      if(stage==='walk'){
        if(state.mode==='encounter'){currentBattle=c.engagements.find(b=>b.id===c.pending?.battleId)??currentBattle;clear();route=[];enter('battle-brief','Join the battle');return status();}
        if(a.stable?.state().offerOpen){clear();enter('bear-read','A horse for the road');return status();}
        if(currentBattle&&nextStage==='battle-boundary'){
          const b=c?.engagements.find(b=>b.id===currentBattle.id);
          if(!b||b.status!=='active'){clear();route=[];enter('choose','The armies have settled this field');return status();}
        }
        if(!route.length){enter(nextStage,routeLabel);return status();}
        if(state.mode&&state.mode!=='playing')return status();
        const p=point(a),target=route[0],distance=gap(p,target);
        if(distance<(route.length===1?.65:.8)){route.shift();clear();lastPoint=null;return status();}
        stuck=lastPoint&&gap(p,lastPoint)<delta*.16?stuck+delta:0;lastPoint={...p};
        if(stuck>2){
          if(routeTarget&&replans++<3){const t=routeTarget;plan(t.to,t.next,t.caption,{battle:t.battle,replan:true});return status();}
          throw Error('Demo movement blocked at '+JSON.stringify(p)+' toward '+JSON.stringify(target));
        }
        a.look({yaw:Math.atan2(p.x-target.x,p.z-target.z),pitch:.27,distance:a.stable?.mounted?11:8});
        a.hold('KeyW',true);a.hold('ShiftLeft',distance>2);return status();
      }
      if(stage==='uguth'){key('KeyF');if(shown($('arrival-train')))enter('uguth-read','Uguth explains preparation');return status();}
      if(stage==='uguth-read'&&seconds>reading){click('arrival-train');enter('training-brief','Combat training');return status();}
      if(stage==='training-brief'){
        if(shown($('combat-trial-start'))&&seconds>reading){click('combat-trial-start');key('KeyT');fightStart=a.state().encounter;lastCast=-10;enter('training-fight',COMBAT_LESSONS[lesson]?.name??'Training',300);}return status();
      }
      if(stage==='training-fight'||stage==='battle-fight'){
        const training=stage==='training-fight',s=training?state.encounter:a.war.state().encounter.encounter;
        if(!s){if(state.mode==='limbo')throw Error('Teresod fell during the demonstration.');return status();}
        if(s.outcome){
          clear();fights.push({lesson:training?COMBAT_LESSONS[lesson].id:null,battle:training?null:currentBattle?.region,outcome:s.outcome,hp:s.hero.hp,seconds:s.time,enemies:fightStart?.guards?.length,allies:fightStart?.allies?.length});
          enter(training?'training-result':'battle-result',training?'Lesson complete':'Battle result');return status();
        }
        fightInput(a,s);return status();
      }
      if(stage==='training-result'&&seconds>Math.max(reading,8)){
        const s=state.encounter;if(s.outcome!=='success')throw Error('Training failed: '+COMBAT_LESSONS[lesson].id);
        if(!shown($('world-skirmish-continue')))return status();
        click('world-skirmish-continue');lesson++;
        enter(lesson<COMBAT_LESSONS.length?'training-brief':'approval','Uguth prepares the next step');return status();
      }
      if(stage==='approval'){
        if(!state.progress.approved)throw Error('Uguth did not approve the completed tutorial.');
        if(shown($('arrival-door'))){if(seconds>reading){click('arrival-door');walk([{x:0,z:38.5}],'portal','The doorway to Azhora');}}
        else if(!state.dialogue&&seconds>3)walk([{x:0,z:38.5}],'portal','The doorway to Azhora');return status();
      }
      if(stage==='portal'){key('KeyF');if(shown($('arrival-depart')))enter('portal-read','Azhora awaits');return status();}
      if(stage==='portal-read'&&seconds>reading){click('arrival-depart');enter('world-loading','Entering Taleth\u2019s chamber',900);return status();}
      if(stage==='world-loading'){
        if(window.__EXPLORATION__&&!shown($('loading-screen')))walk([{x:TALETH_SPOT.x+1,z:TALETH_SPOT.z+2}],'taleth','Speak with Taleth');return status();
      }
      if(stage==='taleth'){key('KeyF');if(shown($('tower-next')))enter('allegiance-read','Taleth explains the Lizeemi War');return status();}
      if(stage==='allegiance-read'&&seconds>reading){click('tower-allegiance-'+side);enter('allegiance-confirm','Supporting '+(side==='west'?'West':'East')+' Lizeem');return status();}
      if(stage==='allegiance-confirm'&&seconds>reading){
        click('tower-next');busy=true;enter('prepare-country','Preparing the river country',900);
        Promise.resolve().then(async()=>{
          // prepareRegion delegates to the active interior while in the tower;
          // this exterior-specific loader builds the actual five river towns.
          for(const port of LIZEEM_PORTS)await a.testWorld.prepareExterior(port.arrival);
          preloaded=true;busy=false;walk([{x:TOWER_DOOR.x,z:TOWER_DOOR.z-1}],'tower-exit','Leave the timeless tower');
        }).catch(fail);return status();
      }
      if(stage==='tower-exit'){key('KeyF');enter('exterior','Entering Minora',900);return status();}
      if(stage==='exterior'){
        if(state.mode==='playing'&&!a.tower.state().inside){
          if(!preloaded)throw Error('Demonstration country was not prepared.');
          enter('bear','Bear brings your horse');
        }return status();
      }
      if(stage==='bear'){
        if(a.stable.state().offerOpen)enter('bear-read','A horse for the road');
        else if(seconds>20){const bear=a.stable.state().bear;plan({x:bear.x+1,z:bear.z-2},'bear','Meet Bear');}return status();
      }
      if(stage==='bear-read'&&seconds>reading){click('stable-next');enter('mount-first','Mounting the horse');return status();}
      if(stage==='mount-first'){
        if(!a.stable.mounted)key('KeyG');
        if(a.stable.mounted)walk([[-2404,70],[-2328,70],[-2308,70],[-2308,135],[-2232,135],[-2232,159]],'harbor-approach','Ride to Minora\u2019s White Bridge harbor');return status();
      }
      if(stage==='harbor-approach'){const port=LIZEEM_PORTS.find(p=>p.id==='minora');plan({x:port.keeper.x,z:port.keeper.z-1.6},'harbor-talk','Speak with the boatkeeper');return status();}
      if(stage==='harbor-talk'){key('KeyF');if(a.harbor.state().speaking)enter('harbor-read','Downriver to Caricas');return status();}
      if(stage==='harbor-read'&&seconds>reading){
        const b=document.querySelector('#harbor-dialog [data-port="caricas"]');if(!shown(b))throw Error('Caricas passage missing');b.click();enter('voyage','Sailing downriver to Caricas',300);return status();
      }
      if(stage==='voyage'){
        if(state.mode==='sailing'){a.look({yaw:2.35,pitch:.38,distance:16});}
        if(!a.harbor.state().busy&&state.mode==='playing'){
          const trip=a.harbor.state().lastTrip;currentBattle=c.engagements.find(b=>b.id===trip?.battleId)??selectBattle();
          if(currentBattle)plan(currentBattle.location,'battle-boundary','Approach the Caricas battlefield',{battle:currentBattle});else enter('choose','Finding the next front');
        }return status();
      }
      if(stage==='battle-boundary'){
        if(state.mode==='encounter')enter('battle-brief','Review the battle');
        else if(seconds>3){currentBattle=selectBattle();if(currentBattle)plan(currentBattle.location,'battle-boundary','Approach the battlefield',{battle:currentBattle});else enter('choose','Finding the next front');}return status();
      }
      if(stage==='battle-brief'){
        if(seconds>reading){const pending=c.pending;if(!pending)throw Error('No battlefield decision is open');currentBattle=c.engagements.find(b=>b.id===pending.battleId)??currentBattle;click(pending.attacker===side?'fight-attacker':'fight-defender');enter('battle-loading','Joining the armies',600);}return status();
      }
      if(stage==='battle-loading'){
        if(state.mode==='skirmish'){key('KeyT');fightStart=a.war.state().encounter.encounter;lastCast=-10;enter('battle-fight','Fighting for '+side+' Lizeem',360);}return status();
      }
      if(stage==='battle-result'&&seconds>Math.max(reading,9)){
        if(!shown($('world-skirmish-continue')))return status();click('world-skirmish-continue');battles++;enter('choose','Taleth\u2019s next recommendation');return status();
      }
      if(stage==='choose'){
        if(state.mode==='encounter'){enter('battle-brief','Continue the battle');return status();}
        if(state.mode!=='playing')return status();
        if(c.winner){currentBattle=null;approachHorse('return-home');return status();}
        currentBattle=selectBattle();
        if(currentBattle){if(!a.stable.mounted)approachHorse('choose');else plan(currentBattle.location,'battle-boundary','Ride to '+currentBattle.region,{battle:currentBattle});}
        else if(seconds>3){key('KeyM');enter('map-wait-read','Waiting for the next development');}return status();
      }
      if(stage==='map-wait-read'){
        if(state.mode==='map'&&seconds>6){const b=document.querySelector('#world-war-map-time [data-speed="20"]');if(!shown(b)||b.disabled)throw Error('Campaign waiting control unavailable');b.click();enter('map-wait','The war continues',600);}return status();
      }
      if(stage==='map-wait'){
        if(c.winner||selectBattle()){
          document.querySelector('#world-war-map-time [data-speed="0"]')?.click();key('KeyM');enter('choose','A new development');
        }return status();
      }
      if(stage==='horse-return'){
        if(a.stable.mounted){enter(nextStage,'Ready to ride');return status();}
        const horse=a.stable.state().horse,p=point(a);
        if(horse&&gap(p,horse)<2.85){key('KeyG');}
        else if(horse&&gap(p,horse)<5&&!a.stable.state().called){
          a.look({yaw:Math.atan2(p.x-horse.x,p.z-horse.z),pitch:.27,distance:8});a.hold('KeyW',true);
        }return status();
      }
      if(stage==='return-home'){plan(TOWER_EXIT,'home-door','Return to Taleth in Minora');return status();}
      if(stage==='home-door'){
        if(a.stable.mounted){key('KeyG');return status();}
        if(gap(point(a),TOWER_EXIT)>2.5){plan(TOWER_EXIT,'home-door','Approach the Wizard\u2019s Tower');return status();}
        key('KeyF');enter('tower-return','Return to the Guild',900);return status();
      }
      if(stage==='tower-return'){
        if(state.mode==='playing'&&a.tower.state().room==='tower')walk([{x:TALETH_SPOT.x,z:TALETH_SPOT.z+2}],'final-talk','Tell Taleth how the war ended');return status();
      }
      if(stage==='final-talk'){key('KeyF');if(shown($('tower-next')))enter('final-invitation','The river country after the war');return status();}
      if(stage==='final-invitation'&&seconds>reading){click('tower-next');enter('ascent','Ascend to the Guild lookout',900);return status();}
      if(stage==='ascent'){
        if(state.mode==='playing'&&a.tower.state().room==='lookout')walk([{x:LOOKOUT_TALETH.x-1,z:LOOKOUT_TALETH.z-1}],'lookout-talk','Join Taleth at the parapet');return status();
      }
      if(stage==='lookout-talk'){key('KeyF');if(shown($('tower-next')))enter('lookout-read','The Lizeem country');return status();}
      if(stage==='lookout-read'&&seconds>Math.max(reading,14)){
        click('tower-next');
        if(a.tower.state().concluded){enter(tour?'tour-read':'complete-read','The Lizeemi War is complete');}
        else enter('lookout-read','Your impact on the war');return status();
      }
      if(stage==='tour-read'&&seconds>Math.max(reading,14)){
        const text=$('tower-next')?.textContent??'';click('tower-next');
        enter(text==='Finish the tour'?'complete-read':'tour-read','The countries beyond the Lizeem');return status();
      }
      if(stage==='complete-read'&&seconds>Math.max(reading,10)){
        if(shown($('tower-close')))click('tower-close');enter('ending','The Lizeemi War is complete');return status();
      }
      if(stage==='ending'){
        terminalHold+=delta;if(terminalHold>8){if(!c.winner||!a.tower.state().concluded)throw Error('Missing campaign conclusion');done=true;clear();stage='complete';}return status();
      }
    }catch(e){fail(e);}return status();
  }
  function status(){
    const a=host(),s=a?.state(),c=campaign();return {stage,caption:timeline.at(-1)?.caption??'',seconds,total,busy,done,error,side,lesson,battles,
      mode:s?.mode??(window.__STILLROOM__?'stillroom':'loading'),position:a?point(a):null,loading:shown($('loading-screen'))||['crossing','loading'].includes(s?.mode),
      currentBattle:currentBattle?{id:currentBattle.id,region:currentBattle.region}:null,campaignSeconds:a?.war?.clock().elapsedSeconds??0,
      winner:c?.winner??null,concluded:!!a?.tower?.state().concluded,route:route.slice(0,2),timeline,fights,notes};
  }
  return {begin,tick,pump:tick,state:status,stop(){planGeneration++;clear();stage='stopped';}};
}
