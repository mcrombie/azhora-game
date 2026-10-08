import {createTouchControls,wantsTouch} from '../../ui/input/touch-controls.js';

/**
 * **Touch controls for the exploration host** (8 October 2026: the Lizeemi War Scenario on a phone).
 *
 * The adventure's layer (src/ui/input/touch-controls.js) with this host's own buttons. Nothing here
 * moves the hero: the stick is written into the same `keys` set the keyboard fills (eight directions,
 * Shift for a run or a canter), so walking, riding, flying and the field skirmish read it as they read
 * WASD, and on the ground and in the saddle `steer` turns those keys into the stick's exact direction.
 * Every button is a key event the host already listens for (src/app/exploration/exploration.js),
 * held for at least a frame so that a skirmish tick, which reads `keys`, sees a quick tap.
 */
export const EXPLORATION_TOUCH_ACTIONS=Object.freeze([
  Object.freeze({id:'use',label:'Use',key:'KeyF',when:Object.freeze(['travel'])}),
  Object.freeze({id:'ride',label:'Ride',key:'KeyG',when:Object.freeze(['travel'])}),
  Object.freeze({id:'call',label:'Call',key:'KeyH',when:Object.freeze(['travel'])}),
  Object.freeze({id:'jump',label:'Jump',key:'Space',hold:true,when:Object.freeze(['travel'])}),
  Object.freeze({id:'run',label:'Run',toggle:true,when:Object.freeze(['travel'])}),
  Object.freeze({id:'strike',label:'Strike',key:'KeyX',hold:true,when:Object.freeze(['skirmish'])}),
  Object.freeze({id:'dodge',label:'Dodge',key:'Space',hold:true,when:Object.freeze(['skirmish'])}),
  Object.freeze({id:'target',label:'Target',key:'KeyT',when:Object.freeze(['skirmish'])}),
]);
export const EXPLORATION_TOUCH_TOP=Object.freeze([
  Object.freeze({id:'map',label:'Map',key:'KeyM',when:Object.freeze(['travel'])}),
  Object.freeze({id:'save',label:'Save',key:'F5',when:Object.freeze(['travel'])}),
  Object.freeze({id:'pause',label:'Pause',key:'Escape',when:Object.freeze(['travel'])}),
  Object.freeze({id:'withdraw',label:'Withdraw',key:'Escape',when:Object.freeze(['skirmish'])}),
]);
/** A tapped key stays down this long, so the next frame's tick reads it however quick the tap. */
export const MIN_HOLD=90;
const HELP_MS=9000;
export const SKIRMISH_HELP='Stick to move \u00b7 hold it and Dodge to dodge that way \u00b7 Strike \u00b7 Target locks on \u00b7 drag to look';

/** Walking about (and the room between departures), a field skirmish, or anything else (menus, map, cards, loading). */
export function touchContext(mode){return mode==='skirmish'?'skirmish':mode==='playing'||mode==='limbo'?'travel':'away';}

const LEAN=Math.sin(Math.PI/8);
/** The stick as the keys the keyboard would hold: the nearest of eight directions, and Shift for a run. */
export function stickCodes({forward=0,side=0}={},run=false){
  const length=Math.hypot(forward,side),codes=[];
  if(length>1e-6){const f=forward/length,s=side/length;if(f>LEAN)codes.push('KeyW');if(f<-LEAN)codes.push('KeyS');if(s<-LEAN)codes.push('KeyA');if(s>LEAN)codes.push('KeyD');}
  if(run)codes.push('ShiftLeft');
  return codes;
}
const MOVE_CODES=['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
/**
 * Exact direction for travel: straight ahead along a heading turned by the stick's angle is the same
 * ground direction as forward/side at the camera's (src/app/exploration/movement.js), so the movement
 * code needs no analog input of its own.
 */
export function steer(keys,yaw,{forward=0,side=0}={}){
  if(!forward&&!side)return [keys,yaw];
  const held=new Set(keys);for(const code of MOVE_CODES)held.delete(code);held.add('KeyW');
  return [held,yaw-Math.atan2(side,forward)];
}

/**
 * The view's own pointers. A mouse turns the camera with its right button, as it always has; on a
 * touch screen any finger on the view does (the stick and buttons sit above it and keep their own),
 * and two fingers pinch the camera in and out. `move` answers in pixels and a distance factor.
 */
export function createLookDrag(){
  const fingers=new Map();
  const spread=()=>{const [a,b]=[...fingers.values()];return Math.hypot(a.x-b.x,a.y-b.y);};
  return {
    start(event){
      if(event.pointerType!=='touch')return event.button===2;
      if(fingers.size<2)fingers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      return fingers.has(event.pointerId);
    },
    move(event){
      if(event.pointerType!=='touch')return {dx:event.movementX??0,dy:event.movementY??0,zoom:1};
      const finger=fingers.get(event.pointerId);if(!finger)return null;
      if(fingers.size===2){const before=spread();finger.x=event.clientX;finger.y=event.clientY;const after=spread();return {dx:0,dy:0,zoom:before>0&&after>0?before/after:1};}
      const dx=event.clientX-finger.x,dy=event.clientY-finger.y;finger.x=event.clientX;finger.y=event.clientY;return {dx,dy,zoom:1};
    },
    /** A finger lifted; whether another is still on the view. */
    end(event){fingers.delete(event?.pointerId);return fingers.size>0;},
    get fingers(){return fingers.size;},
  };
}

const SHIFT={run:'rim to run',canter:'rim to canter',faster:'rim to hurry',boost:'rim to boost'};
/** The keyboard's help line (exploration.js `refreshTravelHelp`) in a thumb's terms: buttons that name themselves drop out. */
export function touchHelpText(keyboard=''){
  return keyboard
    .replace(/\s*[\u00b7/]\s*(?:Space jump|M map|F5 save|Esc pause|Ctrl down|Tab turbo|F8 tools)\b/g,'')
    .replace(/Space up/g,'Jump climbs').replace(/WASD \/ arrows/g,'Stick to move').replace(/\bWASD (\w+)/g,'Stick to $1')
    .replace(/\bShift (\w+)/g,(all,word)=>SHIFT[word]??'rim to '+word).replace(/Right-drag look/g,'drag to look').replace(/Right-drag/g,'Drag')
    .replace(/Scroll zoom/g,'pinch to zoom').replace(/\bF (\w+)/g,'Use to $1').replace(/\bG (\w+)/g,'Ride to $1').replace(/\bH (\w+)/g,'Call to $1');
}

/** A phone held either way up: the HUD's phone layout (exploration.css) and the phone quality default. */
export const PHONE_QUERY='(max-width: 480px), (max-width: 960px) and (max-height: 480px)';
export function phoneLayout(matchMedia=query=>globalThis.matchMedia?.(query)){try{return !!matchMedia?.(PHONE_QUERY)?.matches;}catch{return false;}}

/**
 * Builds the layer when the page wants it (a touch screen, or `?touch=1`; `?touch=0` never) and
 * otherwise answers with a do-nothing stand-in, so the host calls the same three things either way:
 * `sync(mode)` once a frame, `steer(keys,yaw)` for travel and `look` for the view's pointers.
 * `?dev` keeps the Developer button on a phone.
 */
export function createExplorationTouch({document,root=document.body,keys,search='',coarse=false,touchPoints=0,onTakeControl=()=>{},
  dispatch=null,clock=()=>performance.now(),later=(fn,ms)=>setTimeout(fn,ms)}){
  const look=createLookDrag();
  root.classList?.toggle?.('dev',/(?:^|[?&])dev(?:[=&]|$)/.test(search));
  if(!wantsTouch({search,coarse,touchPoints}))return {active:false,look,sync(){},steer:(held,yaw)=>[held,yaw],state:()=>({active:false})};
  const send=dispatch??((type,code)=>document.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true})));
  const pressed=new Map();
  const controls=createTouchControls({document,root,actions:EXPLORATION_TOUCH_ACTIONS,top:EXPLORATION_TOUCH_TOP,onTakeControl,
    press(code){const token={at:clock()};pressed.set(code,token);send('keydown',code);},
    release(code){
      const token=pressed.get(code);if(!token)return;
      later(()=>{if(pressed.get(code)!==token)return;pressed.delete(code);send('keyup',code);},Math.max(0,token.at+MIN_HOLD-clock()));
    }});
  controls.element.classList.add('exploration-touch');
  const source=document.getElementById?.('exploration-help'),help=document.createElement('p');help.id='exploration-touch-help';root.appendChild(help);
  let context=null,held=[],fresh=0;
  function sync(mode){
    const next=touchContext(mode);
    if(next!==context){context=next;controls.setContext(next);controls.setPlaying(next!=='away');controls.setVisible(next!=='away');help.hidden=next==='away';}
    for(const code of held)keys.delete(code);
    held=next==='away'?[]:stickCodes(controls.move,controls.run);
    for(const code of held)keys.add(code);
    if(next==='away')return;
    const text=next==='skirmish'?SKIRMISH_HELP:touchHelpText(source?.textContent??'');
    if(text!==help.textContent){help.textContent=text;help.dataset.fresh='1';const stamp=++fresh;later(()=>{if(stamp===fresh)delete help.dataset.fresh;},HELP_MS);}
  }
  return {active:true,look,controls,element:controls.element,sync,
    steer:(heldKeys,yaw)=>context==='travel'?steer(heldKeys,yaw,controls.move):[heldKeys,yaw],
    state:()=>({active:true,context,move:{...controls.move},run:controls.run,held:[...held],help:help.textContent})};
}
