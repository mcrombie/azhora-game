import {availableBattleStage} from '../../simulation/battle-stages.js';
// A bounded demonstration driver. It issues ordinary host actions and combat
// inputs; campaign ownership, casualties and encounter results remain model-owned.
export function createLizeemWorldAutoplay({war,mode,prepare,showMap,resume,attack,clearInput,status}){
  let active=false,stage='idle',seconds=0,ticket=0,battleId=null;
  const battle=()=>war.state().campaign.engagements.find(b=>b.id===battleId);
  function phase(next,message){stage=next;seconds=0;status(message,true);}
  function stop(message='Autoplay stopped. You have control.'){
    if(!active)return;
    active=false;ticket++;clearInput();war.pause();status(message,false);
  }
  function start(){
    if(!['playing','map','developer','skirmish','encounter'].includes(mode()))return;
    const s=war.state().campaign;
    const current=s.engagements.find(b=>b.region==='caricas'&&b.status==='active');
    if(s.pending&&s.pending.region!=='caricas'){status('Finish the current encounter before starting Caricas autoplay.',false);return;}
    active=true;ticket++;clearInput();war.pause();battleId=current?.id??null;
    if(!current&&s.day>=12){showMap();stop('Caricas has already resolved in this run. Begin a new world test to replay the demonstration.');return;}
    war.setSpeed(20);
    if(mode()==='skirmish'){phase('fight','Autoplay: fighting the Caricas interception');return;}
    if(mode()==='encounter'){phase('brief','Autoplay: joining West Lizeem');return;}
    if(current?.heroResult&&!availableBattleStage(current)){resume();phase('result','Autoplay: your interception result is recorded; the regional battle is still underway');return;}
    showMap();phase('advance','Autoplay: advancing the war at 20x to the Caricas battle');
  }
  function tick(dt,enabled){
    if(!active||!enabled||stage==='loading')return;
    if(['pause','developer','loading'].includes(mode())){stop();return;}
    seconds+=dt;
    if(stage==='advance'){
      const firstDay=war.state().campaign.scenario==='lizeem-world-v6'?3:10;
      if(war.state().campaign.day<firstDay){
        if(seconds<war.state().clock.secondsPerDay/20)return;
        seconds-=war.state().clock.secondsPerDay/20;war.advance();
        if(war.state().campaign.day<firstDay)return;
      }
      const s=war.state().campaign;
      const b=s.engagements.find(b=>b.region==='caricas'&&b.status==='active');
      if(!b){stop('No open Caricas battle remains in this run.');return;}
      battleId=b.id;phase('loading','Autoplay: developer transfer to Caricas (loading terrain)');
      const request=ticket;
      Promise.resolve().then(()=>active&&request===ticket?prepare():false).then(ok=>{
        if(!active||request!==ticket)return;
        if(!ok){stop('Autoplay stopped: Caricas could not load.');return;}
        phase('arrival','Autoplay: arrived at Caricas; preparing to help West Lizeem');
      }).catch(error=>{if(active&&request===ticket)stop('Autoplay stopped: '+error.message);});
    }else if(stage==='arrival'){
      if(war.join(battleId).ok)phase('brief','Autoplay: helping West Lizeem stop the reinforcements');
      else if(seconds>6)stop('Autoplay could not join here. Use F at the battlefield to investigate.');
    }else if(stage==='brief'){
      phase('fight','Autoplay: intercepting the vanguard with normal attacks');
      war.help('west');
    }else if(stage==='fight'){
      if(war.state().encounter?.encounter?.outcome){clearInput();phase('review','Autoplay: reviewing why the interception ended');return;}
      if(mode()==='skirmish'){attack();return;}
      clearInput();
      if(battle()?.heroResult)phase('result','Autoplay: interception recorded; regional control is decided at the battle deadline');
      else if(seconds>5)stop('Autoplay stopped: the encounter did not start.');
    }else if(stage==='review'){
      if(war.state().campaign.pending?.stage==='intercept'){
        war.continue();
        if(war.state().campaign.pending?.stage==='rally'){phase('rally-brief','Autoplay: regroup for the final assault');return;}
      }else war.continue();
      phase('result','Autoplay: phase recorded; reviewing the campaign result');
    }else if(stage==='rally-brief'){
      if(seconds<3)return;war.help('west');phase('fight','Autoplay: break the rally guards, then hold the gold ring');
    }else if(stage==='result'){
      phase('resolve','Autoplay: advancing at 20x to the regional battle result');
    }else if(stage==='resolve'){
      if(battle()?.status==='active'){
        if(seconds<war.state().clock.secondsPerDay/20)return;
        seconds-=war.state().clock.secondsPerDay/20;war.advance();
      }
      if(battle()?.status!=='active')phase('aftermath','Autoplay: inspect the controlling faction\'s banners and guards');
    }else if(stage==='aftermath'){
      showMap();stop('Autoplay complete. The political map shows the result. Close M to explore; F5 saves this run.');
    }
  }
  return {tick,start,stop,toggle:()=>active?stop():start(),state:()=>({active,stage,battleId})};
}
