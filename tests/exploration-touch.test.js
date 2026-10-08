import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createExplorationTouch,createLookDrag,stickCodes,steer,touchContext,touchHelpText,phoneLayout,PHONE_QUERY,MIN_HOLD,
  EXPLORATION_TOUCH_ACTIONS,EXPLORATION_TOUCH_TOP,SKIRMISH_HELP} from '../src/app/exploration/exploration-touch.js';
import {explorationQuality,createFrameLog,QUALITY} from '../src/app/exploration/exploration-quality.js';
import {explorationMovement} from '../src/app/exploration/movement.js';
import {stickInput} from '../src/ui/input/touch-controls.js';

/**
 * The Lizeemi War Scenario on a phone (8 October 2026): the exploration host's touch layer, its
 * stick and look, and the phone's layout flag and quality. A small fake DOM, as tests/touch-controls.test.js has.
 */
function fakeDocument(){
  const byId=new Map();
  const element=tag=>{
    const listeners={},classes=new Set();
    return {tag,children:[],dataset:{},style:{},hidden:false,textContent:'',className:'',id:'',
      classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),toggle:(c,on)=>(on??!classes.has(c))?classes.add(c):classes.delete(c),contains:c=>classes.has(c)},
      appendChild(child){this.children.push(child);if(child.id)byId.set(child.id,child);return child;},
      addEventListener(type,fn){(listeners[type]??=[]).push(fn);},
      fire(type,event={}){for(const fn of listeners[type]??[])fn({preventDefault(){},pointerId:1,clientX:0,clientY:0,...event});},
      getBoundingClientRect:()=>({left:0,top:0,width:100,height:100}),setPointerCapture(){},setAttribute(){}};
  };
  const help=element('footer');help.id='exploration-help';help.textContent='WASD / arrows \u00b7 Shift run \u00b7 Space jump \u00b7 Right-drag look \u00b7 Scroll zoom \u00b7 M map \u00b7 F5 save';byId.set(help.id,help);
  return {createElement:element,body:element('body'),getElementById:id=>byId.get(id)};
}
function fixture(search='?touch=1'){
  const document=fakeDocument(),keys=new Set(),log=[],timers=[];let now=0;
  const touch=createExplorationTouch({document,keys,search,dispatch:(type,code)=>log.push([type,code]),clock:()=>now,
    later:(fn,ms)=>timers.push({at:now+ms,fn}),onTakeControl:()=>log.push(['take'])});
  const advance=ms=>{now+=ms;for(const t of timers.filter(t=>t.at<=now)){timers.splice(timers.indexOf(t),1);t.fn();}};
  const stick=touch.element.children.find(child=>child.className==='touch-stick');
  return {document,keys,log,touch,advance,stick,button:id=>touch.controls.buttons.get(id)};
}

test('every touch button is a key the exploration host or its field skirmish already reads', ()=>{
  const host=fs.readFileSync(new URL('../src/app/exploration/exploration.js',import.meta.url),'utf8');
  const keydown=host.slice(host.indexOf("listen(document,'keydown'"),host.indexOf("listen(document,'keyup'"));
  const skirmish=fs.readFileSync(new URL('../src/app/exploration/world-skirmish.js',import.meta.url),'utf8');
  const focus=fs.readFileSync(new URL('../src/app/exploration/combat-focus-view.js',import.meta.url),'utf8');
  for(const entry of [...EXPLORATION_TOUCH_ACTIONS,...EXPLORATION_TOUCH_TOP].filter(e=>!e.toggle)){
    const read=entry.when.includes('travel')?keydown.includes(`'${entry.key}'`)
      :entry.key==='KeyT'?focus.includes("'KeyT'"):entry.key==='Escape'?keydown.includes("event.code==='Escape'"):skirmish.includes(`keys.has('${entry.key}')`);
    assert.ok(read,`${entry.id} presses ${entry.key}, which the host reads in its context`);
  }
  assert.deepEqual(EXPLORATION_TOUCH_ACTIONS.filter(a=>a.when.includes('travel')).map(a=>a.id),['use','ride','call','jump','run']);
  assert.deepEqual(EXPLORATION_TOUCH_ACTIONS.filter(a=>a.when.includes('skirmish')).map(a=>[a.id,a.key]),[['strike','KeyX'],['dodge','Space'],['target','KeyT']]);
  assert.deepEqual(EXPLORATION_TOUCH_TOP.map(t=>[t.id,t.key]),[['map','KeyM'],['save','F5'],['pause','Escape'],['withdraw','Escape']]);
  assert.equal(touchContext('playing'),'travel');assert.equal(touchContext('limbo'),'travel');assert.equal(touchContext('skirmish'),'skirmish');
  for(const mode of ['map','pause','developer','loading','briefing','chronicle','encounter','combat-menu'])assert.equal(touchContext(mode),'away',mode);
});

test('a tapped button holds its key long enough for a frame to read it; a held one stays down until the finger lifts', ()=>{
  const f=fixture();f.touch.sync('playing');
  f.button('use').fire('pointerdown');
  assert.deepEqual(f.log,[['take'],['keydown','KeyF']],'Use takes the reins and presses F');
  f.advance(MIN_HOLD-1);assert.equal(f.log.length,2,'F is still down within a frame or two');
  f.advance(1);assert.deepEqual(f.log.at(-1),['keyup','KeyF']);
  f.log.length=0;f.touch.sync('skirmish');
  f.button('dodge').fire('pointerdown');f.advance(400);
  assert.deepEqual(f.log,[['take'],['keydown','Space']],'Dodge is Space, held while the finger is down');
  f.button('dodge').fire('pointerup');f.advance(0);assert.deepEqual(f.log.at(-1),['keyup','Space']);
  f.log.length=0;f.button('strike').fire('pointerdown');f.button('strike').fire('pointerup');f.advance(10);
  assert.deepEqual(f.log,[['take'],['keydown','KeyX']],'a quick tap of Strike is not let go before the skirmish ticks');
  f.advance(MIN_HOLD);assert.deepEqual(f.log.at(-1),['keyup','KeyX']);
  f.log.length=0;f.button('map').fire('click');f.advance(MIN_HOLD);
  assert.deepEqual(f.log,[['keydown','KeyM'],['keyup','KeyM']],'the top row presses keys without taking the reins');
});

test('a thumb lifted from a button cancels the click that would land on the card it opened; the top row keeps its click', ()=>{
  const f=fixture();let cancelled=0;const lift=(inTop,cancelable=true)=>f.touch.element.fire('touchend',{cancelable,target:{closest:selector=>inTop&&selector==='.touch-top'?{}:null},preventDefault(){cancelled++;}});
  lift(false);assert.equal(cancelled,1,'Use opens Taleth\u2019s card; the tap\u2019s click must not press the card\u2019s button beneath');
  lift(true);assert.equal(cancelled,1,'Map, Save and Pause act on their click');
  lift(false,false);assert.equal(cancelled,1,'the end of a drag cannot be cancelled and is left alone');
});

test('the buttons follow the context: travel, a field skirmish, and away from play', ()=>{
  const f=fixture(),shown=()=>[...f.touch.controls.buttons].filter(([,b])=>!b.hidden).map(([id])=>id);
  f.touch.sync('playing');assert.deepEqual(shown(),['use','ride','call','jump','run','map','save','pause']);
  f.touch.sync('skirmish');assert.deepEqual(shown(),['strike','dodge','target','withdraw']);
  assert.equal(f.touch.state().help,SKIRMISH_HELP);
  f.touch.sync('map');assert.equal(f.touch.element.hidden,true,'the map, menus and cards have the screen to themselves');
  f.touch.sync('playing');assert.equal(f.touch.element.hidden,false);
  assert.equal(f.document.body.classList.contains('touch'),true,'the page knows, so the keyboard legend steps out');
});

test('the stick is written into the keys as the keyboard would hold them, and only while playing', ()=>{
  assert.deepEqual(stickCodes({forward:1,side:0}),['KeyW']);
  assert.deepEqual(stickCodes({forward:.7,side:.7}),['KeyW','KeyD']);
  assert.deepEqual(stickCodes({forward:-.3,side:-.95}),['KeyA'],'mostly left is left');
  assert.deepEqual(stickCodes({forward:0,side:0},true),['ShiftLeft'],'the Run toggle alone is Shift');
  const f=fixture();f.keys.add('KeyQ');f.touch.sync('playing');
  f.stick.fire('pointerdown',{clientX:50,clientY:0});f.touch.sync('playing');
  assert.deepEqual([...f.keys].sort(),['KeyQ','KeyW','ShiftLeft'],'pushed up to the rim: forward at a run');
  f.stick.fire('pointermove',{clientX:100,clientY:50});f.touch.sync('playing');
  assert.deepEqual([...f.keys].sort(),['KeyD','KeyQ','ShiftLeft']);
  f.touch.sync('pause');assert.deepEqual([...f.keys],['KeyQ'],'out of play the stick lets go, and never the keyboard\u2019s own key');
});

test('travel follows the stick\u2019s exact direction through the real movement code', ()=>{
  const baseWorld=()=>({bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},heightAt:()=>2,waterAt:()=>.45,colliders:[],readyAt:()=>true});
  for(const [dx,dy] of [[0,-50],[30,-40],[-50,10],[20,45]])for(const yaw of [0,.8,-2.4]){
    const move=stickInput(dx,dy,50),p={x:0,y:2,z:0},m=explorationMovement(p,baseWorld());
    const [held,heading]=steer(new Set(stickCodes(move)),yaw,move);
    for(let i=0;i<10;i++)m.step(held,heading,.04);
    const want={x:-Math.sin(yaw)*move.forward+Math.cos(yaw)*move.side,z:-Math.cos(yaw)*move.forward-Math.sin(yaw)*move.side},length=Math.hypot(want.x,want.z);
    assert.ok(Math.abs(p.x/Math.hypot(p.x,p.z)-want.x/length)<1e-9&&Math.abs(p.z/Math.hypot(p.x,p.z)-want.z/length)<1e-9,`stick ${dx},${dy} at yaw ${yaw}`);
    assert.ok(Math.abs(Math.hypot(p.x,p.z)-1.8)<1e-9,'at the ordinary walking pace');
  }
  const keys=new Set(['Space']);assert.deepEqual(steer(keys,1,{forward:0,side:0}),[keys,1],'a resting stick changes nothing');
});

test('a finger on the view looks round, two pinch the camera, and a mouse still needs its right button', ()=>{
  const look=createLookDrag();
  assert.equal(look.start({pointerType:'mouse',button:0}),false,'a left click strikes in a skirmish; it does not look');
  assert.equal(look.start({pointerType:'mouse',button:2}),true);
  assert.deepEqual(look.move({pointerType:'mouse',movementX:4,movementY:-2}),{dx:4,dy:-2,zoom:1});
  assert.equal(look.start({pointerType:'touch',isPrimary:true,pointerId:7,clientX:100,clientY:200}),true,'the primary touch looks');
  assert.deepEqual(look.move({pointerType:'touch',pointerId:7,clientX:130,clientY:190}),{dx:30,dy:-10,zoom:1});
  assert.equal(look.move({pointerType:'touch',pointerId:9,clientX:0,clientY:0}),null,'a finger it never saw does nothing');
  look.start({pointerType:'touch',pointerId:8,clientX:230,clientY:190});
  const pinch=look.move({pointerType:'touch',pointerId:8,clientX:330,clientY:190});
  assert.ok(pinch.dx===0&&Math.abs(pinch.zoom-.5)<1e-9,'spreading two fingers halves the camera distance');
  assert.equal(look.end({pointerId:8}),true,'one finger is still on the view');assert.equal(look.end({pointerId:7}),false);
});

test('the phone layout flag and the phone quality come from the media query, and a URL can override them', ()=>{
  const asked=[],media=matches=>query=>{asked.push(query);return {matches};};
  assert.equal(phoneLayout(media(true)),true);assert.equal(phoneLayout(media(false)),false);
  assert.deepEqual(asked,[PHONE_QUERY,PHONE_QUERY]);assert.match(PHONE_QUERY,/max-width: 480px/);assert.match(PHONE_QUERY,/max-width: 960px\) and \(max-height: 480px/);
  assert.equal(phoneLayout(()=>{throw Error('no media');}),false);
  assert.equal(explorationQuality({phone:true}),QUALITY.phone);assert.equal(explorationQuality({coarse:true}),QUALITY.phone);
  assert.equal(explorationQuality({}),QUALITY.full);
  assert.equal(explorationQuality({search:'?quality=full',phone:true}),QUALITY.full);assert.equal(explorationQuality({search:'?mode=war&quality=phone'}),QUALITY.phone);
  assert.ok(QUALITY.phone.pixelRatio<=1.5&&!QUALITY.phone.antialias&&QUALITY.phone.far<QUALITY.full.far&&QUALITY.phone.far>560,'the phone still draws to the end of the fog');
  const lines=[],frames=createFrameLog({every:1000,log:line=>lines.push(line)});
  for(let i=0;i<59;i++)assert.equal(frames.tick(16.6),null);
  const summary=frames.tick(25);assert.equal(lines.length,1);assert.match(lines[0],/^EXPLORATION_FRAMES /);assert.equal(summary.frames,60);assert.equal(summary.worst,25);
});

test('the touch line speaks of the stick and the buttons, not the keyboard', ()=>{
  assert.equal(touchHelpText('WASD / arrows \u00b7 Shift run \u00b7 Space jump \u00b7 Right-drag look \u00b7 Scroll zoom \u00b7 M map \u00b7 F5 save'),'Stick to move \u00b7 rim to run \u00b7 drag to look \u00b7 pinch to zoom');
  assert.equal(touchHelpText('Your horse \u00b7 WASD ride \u00b7 Shift canter \u00b7 G dismount \u00b7 Right-drag look \u00b7 M map \u00b7 F8 tools'),'Your horse \u00b7 Stick to ride \u00b7 rim to canter \u00b7 Ride to dismount \u00b7 drag to look');
  assert.equal(touchHelpText('WASD walk / Right-drag look / F speak with the Reaper'),'Stick to walk / drag to look / Use to speak with the Reaper');
  const f=fixture();f.touch.sync('playing');assert.equal(f.touch.state().help,'Stick to move \u00b7 rim to run \u00b7 drag to look \u00b7 pinch to zoom');
});

test('without a touch screen nothing is built, the keys pass straight through, and ?dev keeps the Developer button', ()=>{
  const document=fakeDocument(),keys=new Set(['KeyW']);
  const touch=createExplorationTouch({document,keys,search:'?mode=war&dev=1'});
  assert.equal(touch.active,false);assert.deepEqual(document.body.children,[]);
  assert.deepEqual(touch.steer(keys,.5),[keys,.5]);touch.sync('playing');assert.deepEqual([...keys],['KeyW']);
  assert.equal(document.body.classList.contains('dev'),true);
  assert.equal(touch.look.start({pointerType:'touch',pointerId:1,clientX:0,clientY:0}),true,'a touch laptop can still look round');
  const off=fakeDocument();createExplorationTouch({document:off,keys,search:'?touch=0',coarse:true});assert.deepEqual(off.body.children,[],'?touch=0 never');
});
