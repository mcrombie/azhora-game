import { clearLine, freeDirection, moveInput } from './autopilot.js';
import { CAGNEY, CAGNEY_QUEST, CAGNEY_AMBUSH } from './cagney-quest.js';
import { createEscortFollower } from './escort-autopilot-follow.js';

const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),still=()=>({forward:0,side:0,run:false});
/** Input-only escort playtest: the single initial teleport belongs to Testing Tools. */
export function createCagneyAutopilot({world,read,act={},options={}}={}) {
  const listeners=new Set(),config={dialoguePace:1.5,choicePace:1,timeout:1800,...options};
  let active=false,intent='',reason='',move=still(),yaw=null,guard=false,clock=0,speech=0,touch=0,swing=0,eat=0,idle=0;
  let last=null,progress='',stuck=0,side=1,detour=0;
  const follower=createEscortFollower({world,guideSpeed:CAGNEY_QUEST.pace});
  const notify=event=>{for(const listener of listeners)listener(event);};
  function stop(text='Cagney autoplay stopped. You have control.',completed=false){
    if(!active)return false;active=false;reason=text;intent='';move=still();yaw=null;guard=false;notify({type:'stop',reason:text,completed,questId:CAGNEY_QUEST.id});return true;
  }
  function start(){if(active)return false;active=true;reason='';intent='Speaking with Cagney';clock=speech=touch=swing=eat=idle=stuck=detour=0;follower.reset();last=null;progress='';notify({type:'start',questId:CAGNEY_QUEST.id});return true;}
  function walk(s,target,radius,dt){
    if(gap(s.position,target)<=radius)return;
    let d=freeDirection(s.position,target,world,side);
    if(last&&gap(last,s.position)<.025)stuck+=dt;else stuck=0;
    if(stuck>1.6){side=-side;detour=.7;stuck=0;}
    if(detour>0){detour-=dt;const n={x:d.z*side,z:-d.x*side};if(clearLine(s.position,{x:s.position.x+n.x,z:s.position.z+n.z},world))d=n;}
    yaw=Math.atan2(-d.x,-d.z);move=moveInput(yaw,d.x,d.z);
  }
  function step(dt=1/60){
    if(!active)return null;move=still();yaw=null;guard=false;
    dt=Math.min(.25,Math.max(0,dt));const s=read(),q=s?.quest,c=s?.combat??{},actions=[];
    if(!s?.position||!q){stop('Cagney autoplay could not read the quest.');return null;}
    if(q.stage==='complete'){stop('Cagney is safely home. You received 45 copper.',true);return null;}
    if(q.over||s.cagney?.available===false){stop('Cagney cannot continue. You have control.');return null;}
    if(s.mode==='defeated'||c.hp<=0){stop('The traveler has fallen. Choose how to recover.');return null;}
    if(!['playing','dialogue'].includes(s.mode)){intent='Paused';return {intent,move,yaw,guard,actions};}
    clock+=dt;touch+=dt;swing+=dt;eat+=dt;idle+=dt;
    const stamp=JSON.stringify([q.stage,q.walk?.waypoint,c.hp,c.enemies?.map(e=>e.hp)]);
    if(stamp!==progress||(last&&gap(last,s.position)>.015))idle=0;progress=stamp;
    if(clock>config.timeout||idle>90){stop('Cagney autoplay could not make progress. You have control.');return null;}
    if(s.mode==='dialogue'){
      speech+=dt;intent='Listening to Cagney';
      if(s.dialogue?.npcId!==CAGNEY.id){stop('Another conversation interrupted Cagney’s quest.');return null;}
      const choices=(s.dialogue.choices??[]).filter(c=>c.enabled!==false);
      if(choices.length&&speech>=config.choicePace){
        const wanted=choices.find(c=>['cagney-accept','cagney-reward'].includes(c.id));
        if(!wanted){stop('Cagney’s expected reply is unavailable.');return null;}
        actions.push({type:'choose',id:wanted.id});speech=0;
      }else if(!choices.length&&speech>=config.dialoguePace){actions.push({type:'continue'});speech=0;}
    }else{
      speech=0;
      if(s.riding?.mounted){intent='Dismounting to escort Cagney';if(touch>.8){actions.push({type:'dismount'});touch=0;}}
      else if(c.phase==='active'){
        if(c.encounterId!==CAGNEY_AMBUSH.id){stop('Another fight interrupted the escort.');return null;}
        intent='Protecting Cagney';follower.reset();
        const enemies=(c.enemies??[]).filter(e=>e.hp>0&&e.active!==false).sort((a,b)=>gap(a,s.position)-gap(b,s.position)),target=enemies[0];
        if(target){
          yaw=Math.atan2(s.position.x-target.x,s.position.z-target.z);
          const threat=enemies.find(e=>gap(e,s.position)<3.1&&((e.action==='windup'&&e.progress>.65)||(e.action==='attack'&&e.progress<.65)));
          if(c.action==='idle'){
            if(c.hp<55&&s.inventory?.pawpaws>0&&eat>3&&!threat){actions.push({type:'eat',id:'pawpaw'});eat=0;}
            else if(threat&&c.hasShield&&c.stamina>20){guard=true;intent='Guarding against a cagnapper';}
            else if(gap(target,s.position)<=2.3&&swing>.31&&c.stamina>=8){
              const aim=Math.atan2(target.x-s.position.x,target.z-s.position.z),friend=s.cagney;
              const angle=friend?Math.atan2(friend.x-s.position.x,friend.z-s.position.z)-aim:Math.PI;
              if(!friend||gap(friend,s.position)>2.7||Math.abs(Math.atan2(Math.sin(angle),Math.cos(angle)))>1.1){actions.push({type:'attack',yaw:aim});swing=0;}
              else{intent='Moving clear of Cagney before swinging';walk(s,{x:target.x+(target.z-s.position.z),z:target.z-(target.x-s.position.x)},.7,dt);}
            }else if(gap(target,s.position)>2)walk(s,target,1.95,dt);
          }
        }
      }else if(q.stage==='escorting'){
        intent=q.walk?.waiting?'Catching up to Cagney':'Walking with Cagney';
        const guide=s.cagney;if(!guide){stop('Cagney is unavailable.');return null;}
        ({move,yaw}=follower.step(s.position,guide,dt));
      }else if(['unmet','asked','home'].includes(q.stage)){
        intent=q.stage==='home'?'Collecting Cagney’s reward':'Speaking with Cagney';
        if(s.interaction?.npcId===CAGNEY.id&&c.action==='idle'){if(touch>.8){actions.push({type:'interact'});touch=0;}}
        else if(s.cagney)walk(s,s.cagney,1.3,dt);
      }
    }
    last={...s.position};for(const a of actions)act[a.type]?.(a);
    return {intent,move,yaw,guard,actions};
  }
  return {start,stop,step,get active(){return active;},get intent(){return intent;},get move(){return move;},get yaw(){return yaw;},get guard(){return guard;},
    get reason(){return reason;},get stopReason(){return reason;},onEvent(listener){listeners.add(listener);return()=>listeners.delete(listener);}};
}
