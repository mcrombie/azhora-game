import { clearLine, freeDirection, moveInput } from './autopilot.js';
import { BEN, SPIDER_DEN } from './spider-quest.js';
import { createEscortFollower } from './escort-autopilot-follow.js';
import { BEN_GUIDE_PACE } from './ben-guide.js';

const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const facing=(a,b)=>Math.atan2(a.x-b.x,a.z-b.z);
const still=()=>({forward:0,side:0,run:false});
const point=value=>value&&Number.isFinite(value.x)&&Number.isFinite(value.z);
const defaults=Object.freeze({dialoguePace:2.2,choicePace:1.4,interactEvery:.8,swingEvery:.3,
  followDistance:3,stuckAfter:1.6,idleLimit:60,maxSeconds:900});

/** Ordinary inputs against the spider's visible tell, with room for a sideways dodge. */
export function benFightCommand(snapshot,world){
  const {position,combat}=snapshot;
  const enemies=(combat.enemies??[]).filter(enemy=>enemy.active!==false&&enemy.hp!==0&&enemy.action!=='dead')
    .sort((a,b)=>gap(position,a)-gap(position,b));
  const target=enemies[0],command={intent:'Keeping Ben safe',move:still(),yaw:null,guard:false,actions:[]};
  if(!target)return command;
  command.yaw=facing(position,target);
  if(['dodge','hurt','dead'].includes(combat.action))return command;
  const threat=enemies.find(enemy=>gap(position,enemy)<4.7
    &&((enemy.action==='windup'&&enemy.progress>=.45)||(enemy.action==='attack'&&enemy.progress<.7)));
  if(threat){
    command.yaw=facing(position,threat);
    const late=threat.action==='attack'||threat.progress>=.75;
    if(late&&combat.action==='idle'&&combat.stamina>=25){
      const dx=position.x-threat.x,dz=position.z-threat.z,length=Math.hypot(dx,dz)||1;
      for(const sign of [1,-1]){
        const direction={x:-dz/length*sign,z:dx/length*sign};
        if(clearLine(position,{x:position.x+direction.x*2.9,z:position.z+direction.z*2.9},world)){
          command.intent='Stepping aside from the spider';
          command.actions.push({type:'dodge',...direction});return command;
        }
      }
    }
    if(combat.action==='idle'&&combat.hasShield&&combat.stamina>=(combat.guardCost??18)){
      command.intent='Holding the shield against the spider';command.guard=true;
    }else command.intent='Watching the spider’s strike';
    return command;
  }
  if(combat.action!=='idle')return command;
  // Its long tell is a warning to stop attacking, even before the dodge window.
  if(['windup','attack'].includes(target.action)){command.intent='Waiting for the spider to commit';return command;}
  if(gap(position,target)<=2.3&&combat.stamina>=8){
    command.intent='Striking while the spider recovers';
    command.actions.push({type:'attack',yaw:Math.atan2(target.x-position.x,target.z-position.z)});return command;
  }
  if(gap(position,target)>2.05){
    const direction=freeDirection(position,target,world);
    command.yaw=Math.atan2(-direction.x,-direction.z);
    command.move=moveInput(command.yaw,direction.x,direction.z);
    command.intent='Moving between Ben and the spider';
  }else command.intent='Catching breath';
  return command;
}

/** A single side-quest pilot using the main pilot's host interface.
 * read(): {mode,position,quest,ben:{x,z,available},combat,weapon,dialogue,interaction,riding?}.
 * act supplies ordinary interact/continue/choose/attack/dodge/equip/dismount inputs.
 * The host owns launching the isolated test, its initial teleport and manual interruption.
 * This controller never moves actors directly, changes quest state or retries a death.
 */
export function createBenAutopilot({world,read,act={},options={}}={}){
  const config={...defaults,...options},listeners=new Set();
  let active=false,intent='',stopReason='',move=still(),yaw=null,guard=false;
  let elapsed=0,idle=0,dialogueClock=0,interactClock=0,swingClock=0,eatClock=0,stuck=0,detour=0,side=1;
  let lastPosition=null,lastProgress='';
  const follower=createEscortFollower({world,distance:config.followDistance,guideSpeed:BEN_GUIDE_PACE});
  const notify=event=>{for(const listener of listeners)listener(event);};
  function stop(reason='Ben autoplay stopped. You have control.',completed=false){
    if(!active)return false;
    active=false;move=still();yaw=null;guard=false;stopReason=reason;intent='';
    notify({type:'stop',reason,completed,questId:'ben-spider'});return true;
  }
  function start(){
    if(active)return false;
    active=true;intent='Speaking with Ben';stopReason='';move=still();yaw=null;guard=false;
    elapsed=idle=dialogueClock=interactClock=swingClock=eatClock=stuck=detour=0;side=1;
    lastPosition=null;lastProgress='';follower.reset();
    notify({type:'start',questId:'ben-spider'});return true;
  }
  function walk(snapshot,target,radius,dt){
    if(gap(snapshot.position,target)<=radius){stuck=0;return;}
    let direction=freeDirection(snapshot.position,target,world,side);
    if(lastPosition&&gap(snapshot.position,lastPosition)<.025)stuck+=dt;else stuck=0;
    if(stuck>config.stuckAfter){side=-side;detour=.6;stuck=0;}
    if(detour>0){
      detour-=dt;const sideways={x:direction.z*side,z:-direction.x*side};
      if(clearLine(snapshot.position,{x:snapshot.position.x+sideways.x,z:snapshot.position.z+sideways.z},world))direction=sideways;
    }
    yaw=Math.atan2(-direction.x,-direction.z);move=moveInput(yaw,direction.x,direction.z);
  }
  function step(dt=1/60){
    if(!active)return null;
    move=still();yaw=null;guard=false;
    if(!Number.isFinite(dt)||dt<=0)return null;
    dt=Math.min(dt,.25);
    const snapshot=read(),actions=[];
    if(!snapshot||!point(snapshot.position)){stop('Ben autoplay could not read the traveler’s position.');return null;}
    const quest=snapshot.quest??{},combat=snapshot.combat??{},stage=quest.stage;
    if(stage==='taught'||stage==='paid'){stop(stage==='taught'?'Ben’s quest is complete. Fireball is learned.':'Ben’s quest is complete. You chose the bounty.',true);return null;}
    if(stage==='abandoned'||quest.benDown){stop('Ben has fallen. You have control.');return null;}
    if(snapshot.mode==='defeated'||combat.hp<=0){stop('The traveler has fallen. Choose how to recover.');return null;}
    if(!['playing','dialogue'].includes(snapshot.mode)){intent='Paused';return {goal:'wait',intent,move,yaw,guard,actions};}
    elapsed+=dt;idle+=dt;interactClock+=dt;swingClock+=dt;eatClock+=dt;
    const progress=JSON.stringify([stage,combat.hp,(combat.enemies??[]).map(enemy=>[enemy.id,enemy.hp])]);
    if(progress!==lastProgress||(lastPosition&&gap(snapshot.position,lastPosition)>.015))idle=0;
    lastProgress=progress;
    if(elapsed>config.maxSeconds||idle>config.idleLimit){stop('Ben autoplay could not make progress. You have control.');return null;}
    let goal='talk';
    if(snapshot.mode==='dialogue'){
      goal='dialogue';intent='Listening to Ben';dialogueClock+=dt;
      const dialogue=snapshot.dialogue;
      if(dialogue?.npcId&&dialogue.npcId!==BEN.id){stop('Another conversation interrupted Ben’s quest.');return null;}
      const choices=(dialogue?.choices??[]).filter(choice=>choice.enabled!==false);
      if(stage==='killed'&&choices.some(choice=>choice.id==='ben-lesson')){
        stop('The spider is defeated. Choose your reward: money or Fireball and a spare wand.',true);return null;
      }
      if(choices.length&&dialogueClock>=config.choicePace){
        const wanted=choices.find(choice=>choice.id==='ben-yes');
        if(!wanted){stop('Ben’s expected reply is unavailable. You have control.');return null;}
        actions.push({type:'choose',id:wanted.id});dialogueClock=0;idle=0;
      }else if(!choices.length&&dialogueClock>=config.dialoguePace){actions.push({type:'continue'});dialogueClock=0;idle=0;}
    }else{
      dialogueClock=0;
      if(snapshot.riding?.mounted){
        intent='Stepping down to walk with Ben';
        if(interactClock>=config.interactEvery){actions.push({type:'dismount'});interactClock=0;}
      }else if(combat.phase==='active'){
        goal='fight';
        if(combat.encounterId&&combat.encounterId!==SPIDER_DEN.id){stop('Another fight interrupted Ben’s quest.');return null;}
        if(snapshot.weapon?.usable===false){stop('The equipped weapon cannot fight. You have control.');return null;}
        const command=benFightCommand(snapshot,world);
        ({intent,move,yaw,guard}=command);
        if(combat.action==='idle'&&combat.hp<55&&(snapshot.inventory?.pawpaws??0)>0&&eatClock>=3
          &&!guard&&!command.actions.some(action=>action.type==='dodge')){
          intent='Eating a pawpaw';actions.push({type:'eat',id:'pawpaw'});eatClock=0;
        }else for(const action of command.actions){
          if(action.type!=='attack'||swingClock>=config.swingEvery){actions.push(action);if(action.type==='attack')swingClock=0;}}
        follower.reset();
      }else if(!point(snapshot.ben)||snapshot.ben.available===false){
        stop('Ben is not available to continue. You have control.');return null;
      }else if(stage==='walking'){
        goal='follow';intent='Following Ben to the thorns';
        ({move,yaw}=follower.step(snapshot.position,snapshot.ben,dt));
        if(gap(snapshot.position,snapshot.ben)<=config.followDistance+.2)intent='Keeping pace with Ben';
      }else if(['unmet','asked','killed'].includes(stage)){
        intent=stage==='killed'?'Returning to Ben for your reward':'Speaking with Ben';
        const ready=snapshot.interaction?.npcId===BEN.id;
        if(ready&&combat.action==='idle'){
          yaw=facing(snapshot.position,snapshot.ben);
          if(interactClock>=config.interactEvery){actions.push({type:'interact'});interactClock=0;}
        }else walk(snapshot,snapshot.ben,1.3,dt);
      }else {stop('Ben’s quest cannot continue from here. You have control.');return null;}
    }
    lastPosition={...snapshot.position};
    for(const action of actions)act[action.type]?.(action);
    return {goal,intent,move,yaw,guard,actions};
  }
  return {start,stop,step,get active(){return active;},get intent(){return intent;},get stopReason(){return stopReason;},
    get reason(){return stopReason;},get move(){return move;},get yaw(){return yaw;},get guard(){return guard;},
    onEvent(listener){listeners.add(listener);return()=>listeners.delete(listener);}};
}
