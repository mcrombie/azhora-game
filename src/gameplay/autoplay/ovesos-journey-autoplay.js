import {OVESOS_JOURNEY} from '../../content/scenarios/ovesos-journey.js';

// A named, repeatable developer scenario. Travel uses the normal horse input;
// the only relocation is the explicitly advertised fresh-run setup in Minora.
export function createOvesosJourneyAutoplay({war,mode,prepare,position,ride,clearInput,dismount,attack,showMap,resume,status}){
  let active=false,stage='idle',ticket=0,index=1,seconds=0,stuck=0,last=null,battleId=null,rideSeconds=0;
  const battle=()=>war.state().campaign.engagements.find(b=>b.region==='ovesos'&&b.status==='active');
  function phase(next,message){stage=next;seconds=0;status(message,true);}
  function stop(message='Ovesos ride stopped. You have control.'){
    if(!active)return;active=false;ticket++;clearInput();war.pause();status(message,false);
  }
  function start(){
    if(!['playing','developer','map'].includes(mode()))return;
    active=true;const request=++ticket;index=1;stuck=0;last=null;battleId=null;rideSeconds=0;clearInput();war.pause();phase('preparing','Ovesos ride: preparing a fresh Minora start');
    Promise.resolve().then(()=>active&&ticket===request?prepare(()=>active&&ticket===request):false).then(ok=>{
      if(!active||ticket!==request)return;
      if(!ok){stop('Ovesos ride could not start.');return;}
      war.advance(1);war.setSpeed(1);const incoming=war.state().campaign.armies.find(a=>a.owner==='east'&&a.from==='caricas'&&a.to==='ovesos'&&a.status==='marching');if(incoming)war.track({kind:'army',id:incoming.id});showMap('opening');phase('opening-map','Campaign map: East is marching toward West-held Ovesos');
    }).catch(error=>{if(active&&ticket===request)stop('Ovesos ride stopped: '+error.message);});
  }
  function tick(dt,enabled){
    if(!active||!enabled||stage==='preparing'||mode()==='loading')return;
    if(['developer','pause'].includes(mode())){stop();return;}
    seconds+=dt;
    if(stage==='opening-map'){if(seconds<6)return;resume();war.run();phase('ride','Ovesos ride: Guild Way');return;}
    if(stage==='battle-map'){if(seconds<4)return;resume();phase('join','Ovesos ride: defending West Lizeem');return;}
    if(stage==='ride'){
      rideSeconds+=dt;const p=position(),target=OVESOS_JOURNEY[index];
      if(Math.hypot(p.x-target.x,p.z-target.z)<1.2){
        clearInput();index++;stuck=0;
        if(index>=OVESOS_JOURNEY.length){war.pause();dismount();war.setSpeed(20);phase('wait','Ovesos ride: arrived; waiting for battle at 20x');return;}
        status('Ovesos ride: '+OVESOS_JOURNEY[index].name,true);return;
      }
      stuck=last&&Math.hypot(p.x-last.x,p.z-last.z)<.005?stuck+dt:0;last={...p};
      if(stuck>2){stop('Ovesos ride blocked near '+target.name+'. You have control.');return;}
      if(war.state().campaign.day>=8){stop('The Ovesos battle window was missed.');return;}
      ride(target);return;
    }
    if(stage==='wait'){
      const b=battle();if(b){battleId=b.id;if(war.state().tracking?.target?.kind!=='battle'||war.state().tracking?.target?.id!==b.id)war.track({kind:'battle',id:b.id});showMap('battle');phase('battle-map','Campaign map: Ovesos is under attack; Teresod will help West');return;}
      if(war.state().campaign.day>=8){stop('Ovesos has already resolved.');return;}
      if(seconds>=1.5){seconds-=1.5;war.advance();}return;
    }
    if(stage==='join'){
      if(war.join(battleId).ok){phase('fight','Ovesos ride: defending West Lizeem');war.help('west');}
      else if(seconds>6)stop('Could not join Ovesos. Enter the marked battlefield on dry ground.');return;
    }
    if(stage==='fight'){
      const encounter=war.state().encounter.encounter;
      if(encounter?.outcome){clearInput();phase('review','Ovesos ride: result review / next stage in 4s / P to keep this screen');return;}
      if(mode()==='skirmish')attack();else if(seconds>6)stop('Ovesos encounter did not open.');return;
    }
    if(stage==='rally-brief'){if(seconds<4)return;war.help('west');phase('rally-fight','Ovesos: break the rally guards, then hold the gold ring');return;}
    if(stage==='rally-fight'){
      if(war.state().encounter.encounter?.outcome){clearInput();phase('rally-review','Ovesos: rally result / P to take control');return;}
      if(mode()==='skirmish')attack();else if(seconds>6)stop('The rally assault did not open.');return;
    }
    if(stage==='rally-review'){if(seconds<4)return;war.continue();showMap('result');phase('resolve','Ovesos: regional outcome');return;}
    if(stage==='review'){
      if(Math.ceil(4-seconds)!==Math.ceil(4-seconds+dt)&&seconds<4)status(`Ovesos ride: result review / next stage in ${Math.ceil(4-seconds)}s / P to keep this screen`,true);
      if(seconds<4)return;
      if(war.state().campaign.pending?.stage==='intercept'){
        war.continue();
        if(war.state().campaign.pending?.stage==='rally'){phase('rally-brief','Ovesos: regrouping for the decisive rally assault');return;}
      }else war.withdraw();showMap('interception');phase('resolve','Ovesos ride: applying the regional outcome at 20x');return;
    }
    if(stage==='resolve'){
      if(battle()){if(seconds>=1.5){seconds-=1.5;war.advance();}return;}
      showMap('result');stop(`Ovesos ride complete (${Math.round(rideSeconds)}s riding). The report explains the result. F5 saves this run.`);
    }
  }
  return {start,stop,tick,state:()=>({active,stage,index,battleId,rideSeconds})};
}
