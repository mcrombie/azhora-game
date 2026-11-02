import {CHAPTER_LOCATIONS as places} from '../../content/chapters/yunethre/locations.js';
import {TALETH_SPOT,TOWER_DOOR,LOOKOUT_DOOR,LOOKOUT_TALETH} from '../../app/exploration/tower-state.js';
import {autoplayReadingTime} from './reading-time.js';

// Follow the existing assignment through movement and visible conversation
// choices. The chapter host remains the only writer of story consequences.
export function createYunethreAutoplay({chapter,position,room,region,mode,plan,steer,clearInput,interact,status,
  showMap,resumeWorld,canStart=()=>true}){
  let active=false,stage='idle',goal=null,route=[],ticket=0,pending=false,replans=0,stuck=0,last=null;
  let seconds=0,total=0,readKey=null,readSeconds=0,mapShown=false,error=null,interactionAttempts=0,interactionDelay=0;
  const point=p=>Array.isArray(p)?{x:p[0],z:p[1]}:{x:p.x,z:p.z};
  const gap=p=>Math.hypot(position().x-p.x,position().z-p.z);
  const settled=s=>['resolved','averted'].includes(s.battle.status);
  const overseas=()=>[61,62,'North Celder','South Celder'].includes(region());
  function phase(next,message){stage=next;seconds=0;clearInput();status('Chapter 2 / '+message,true);}
  function stop(message='Chapter 2 autoplay stopped. You have control.'){
    const wasActive=active;active=false;ticket++;pending=false;route=[];goal=null;last=null;clearInput();
    if(wasActive)status(message,false);return wasActive;
  }
  function fail(message){error=message;stage='blocked';stop(message+' Autoplay stopped; you have control.');}
  function complete(){stage='complete';stop('Chapter 2 autoplay complete. The geopolitical map shows what changed.');}
  function start(){
    if(active)return true;
    const s=chapter.state(),conversation=chapter.conversation();
    if(!canStart()||mode()==='loading')return false;
    if(s.returned&&conversation?.id!=='messenger'){
      status('Chapter 2 is already complete. Autoplay will not restart or overwrite it.',false);return false;
    }
    if(s.battle.status==='active'&&s.battle.joined){
      status('Finish the current hero encounter before resuming Chapter 2 autoplay.',false);return false;
    }
    active=true;ticket++;error=null;goal=null;route=[];pending=false;replans=stuck=seconds=total=0;
    last=null;readKey=null;readSeconds=0;interactionAttempts=interactionDelay=0;
    if(['map','developer','pause'].includes(mode()))resumeWorld();
    phase('choose','Following the current assignment / P to take control');return true;
  }
  function choose(action,conversation){
    if(!conversation.actions.includes(action)){fail('This conversation no longer offers '+action+'.');return;}
    clearInput();readKey=null;readSeconds=0;
    if(chapter.choose(action)===false)fail('The conversation choice could not be completed.');
  }
  function read(conversation,dt){
    // A choice may replace a passage without replacing its speaker. Read that
    // new passage as well; only visible text contributes to the timer.
    const key=JSON.stringify([conversation.id,conversation.text,conversation.actions]);
    if(key!==readKey){readKey=key;readSeconds=0;phase('conversation','Reading '+({taleth:'Taleth’s assignment',town:'Laketown’s decision',centaurs:'the centaurs’ terms',celder:'Celder’s answer',offer:'the military offer',road:'the return journey',messenger:'the Guild messenger'}[conversation.id]??'the conversation'));}
    readSeconds+=dt;if(readSeconds<autoplayReadingTime(conversation.text,8))return;
    const s=chapter.state();
    switch(conversation.id){
      case 'taleth':choose(s.briefed?'close':'accept',conversation);break;
      case 'town':{
        const canJoin=settled(s)&&!s.elfHostile&&s.battle.joined!=='celder'&&(s.battle.winner==='celder'||s.centaurProtection);
        choose(s.aftermathVisited||!settled(s)?'close':canJoin?'join':s.battle.winner==='centaurs'&&!s.centaurProtection&&s.battle.joined!=='celder'&&!s.elfHostile?'close':'decline',conversation);break;
      }
      case 'centaurs':
        choose(s.battle.status==='pending'&&!s.compact.centaurs?'consent':
          s.battle.winner==='centaurs'&&!s.centaurProtection&&s.battle.joined!=='celder'?'protect':
          s.battle.status==='pending'&&!s.compact.celder?'travel-celder':'close',conversation);break;
      case 'celder':choose(s.battle.status==='pending'&&!s.compact.celder?'consent':'return-yunethre',conversation);break;
      case 'offer':choose('back',conversation);break;
      case 'road':choose(s.aftermathVisited?'return':'close',conversation);break;
      case 'messenger':choose('map',conversation);if(active)complete();break;
      default:fail('This conversation needs your decision.');
    }
  }
  function desired(s){
    if(room()==='lookout')return s.briefed?{id:'chamber',...LOOKOUT_DOOR,z:LOOKOUT_DOOR.z-1.5,name:'Returning to Taleth’s chamber'}:
      {id:'taleth',...LOOKOUT_TALETH,x:LOOKOUT_TALETH.x-1,z:LOOKOUT_TALETH.z-1,name:'Meeting Taleth at Sky Lookout'};
    if(room()==='tower')return s.briefed?{id:'leave',...TOWER_DOOR,z:TOWER_DOOR.z-1.5,name:'Leaving the tower for Yunethre'}:
      {id:'taleth',...TALETH_SPOT,z:TALETH_SPOT.z+2,name:'Meeting Taleth'};
    if(room())return null;
    const target=overseas()?'celder':s.aftermathVisited?'departure':!s.visits.town?'town':
      settled(s)?(s.battle.winner==='centaurs'&&!s.centaurProtection&&s.battle.joined!=='celder'&&!s.elfHostile?'centaurs':'town'):
      s.battle.status==='active'?'town':'centaurs';
    return {...places[target],z:places[target].z+2,name:{town:'Walking to Laketown',centaurs:'Walking to the centaur camp',celder:'Walking to the Celder envoy',departure:'Returning toward Minora'}[target]};
  }
  function findRoute(target,retry=false){
    ticket++;goal={...target};route=[];last=null;stuck=0;interactionAttempts=0;interactionDelay=0;
    if(!retry)replans=0;
    if(gap(goal)<.8){pending=false;phase('arrive',goal.name);return;}
    const request=ticket,from=point(position());pending=true;phase('planning','Finding a path / '+goal.name);
    Promise.resolve().then(()=>{
      if(!active||request!==ticket)return null;
      return plan(from,point(target),{cancelled:()=>!active||request!==ticket});
    }).then(points=>{
      if(!active||request!==ticket)return;pending=false;
      if(!Array.isArray(points)||!points.length){fail('No walkable path was found for '+target.name+'.');return;}
      route=points.map(point);
      if(route.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.z))){fail('The walking route was invalid.');return;}
      // Planners may omit a goal already inside their final grid cell.
      if(Math.hypot(route.at(-1).x-target.x,route.at(-1).z-target.z)>.1)route.push(point(target));
      phase('walking',target.name);
    }).catch(e=>{if(active&&request===ticket){pending=false;fail('Could not prepare the route: '+e.message);}});
  }
  function retryRoute(){
    if(replans>=2){fail('Teresod is blocked on the way to '+goal.name+'.');return;}
    replans++;findRoute(goal,true);
  }
  function tick(dt,enabled=true){
    if(!active)return;
    if(!enabled||!Number.isFinite(dt)||dt<=0||['loading','pause','developer'].includes(mode())){clearInput();last=null;return;}
    if(!['playing','briefing','map'].includes(mode())){fail('Teresod needs your attention before continuing.');return;}
    seconds+=dt;total+=dt;
    if(total>3600){fail('The assignment took too long to complete automatically.');return;}
    const conversation=chapter.conversation();
    if(conversation){clearInput();read(conversation,dt);return;}
    readKey=null;readSeconds=0;
    if(stage==='map'){
      clearInput();if(mode()==='map'&&seconds<5)return;
      if(mode()==='map')resumeWorld();phase('choose','Returning to the road');return;
    }
    if(mode()==='map'){clearInput();return;}
    if(mode()==='briefing'){clearInput();return;}
    const s=chapter.state();
    if(s.returned){complete();return;}
    if(s.battle.status==='active'&&s.battle.joined){fail('The current hero encounter needs your control.');return;}
    if(s.aftermathVisited&&!mapShown){
      ticket++;pending=false;route=[];goal=null;mapShown=true;showMap();phase('map','Laketown’s decision on the geopolitical map');return;
    }
    const next=desired(s);
    if(!next){fail('Return to Taleth’s chamber or the chapter’s outdoor regions to continue.');return;}
    if(!goal||goal.id!==next.id){findRoute(next);return;}
    if(pending)return;
    if(stage==='walking'){
      while(route.length&&gap(route[0])<.8)route.shift();
      if(!route.length){phase('arrive',goal.name);last=null;stuck=0;return;}
      const p=position();stuck=last&&Math.hypot(p.x-last.x,p.z-last.z)<.2*dt?stuck+dt:0;last=point(p);
      if(stuck>3){retryRoute();return;}steer(route[0]);return;
    }
    // Conversations and transitions can finish while paused. Re-evaluate the
    // actual room and quest state rather than replaying a remembered button.
    if(gap(goal)>1.2){findRoute(next);return;}
    clearInput();
    if(s.battle.status==='active'&&goal.id==='town'){
      if(stage!=='waiting')phase('waiting','The battle is underway / Waiting for its result');return;
    }
    interactionDelay+=dt;if(interactionDelay<.75)return;interactionDelay=0;
    if(++interactionAttempts>4){retryRoute();return;}
    interact();
  }
  return {start,stop,toggle:()=>active?stop():start(),tick,
    state:()=>({active,stage,goal:goal?.id??null,pending,replans,seconds,total,readSeconds,mapShown,error})};
}
