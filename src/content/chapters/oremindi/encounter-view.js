import * as THREE from 'three';
import {createOremindiEncounter,oremindiEncounterLayout} from './encounter.js';
import {createOremindiCombatActor} from './encounter-actors.js';
import {createSkirmishGround} from '../../../app/exploration/skirmish-ground.js';
import {createEncounterWarnings,createEncounterTarget,encounterHeroPose} from '../../../app/lizeem/encounter-presentation.js';
import {encounterFeedback} from '../../../gameplay/combat/encounter-feedback.js';
import {forestSegmentHit} from '../../../gameplay/combat/forest-sightline.js';
import {oremindiEncounterReport} from './encounter-report.js';
import {createCombatFocus} from '../../../app/exploration/combat-focus-view.js';
import {localSight} from '../../../app/exploration/local-sight.js';
import {getMovementInput} from '../../../gameplay/movement/locomotion.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const names={ambush:'The mountain investigation',highground:'Hold the elven terrace'};

/** Feature-owned presentation over the game's established staff combat model.
 * onStart commits one chapter attempt; onEnd submits exactly one factual result.
 * The exploration host owns scene preparation, checkpointing and the return. */
export function openOremindiEncounter({scene,world,actor,position,keys,yaw,kind='ambush',centre,layout=null,
  radius=kind==='ambush'?30:42,regionId=null,watch=false,rehearsal=false,
  onStart=()=>true,onEnd=()=>{},onContinue=()=>{},onWithdraw=()=>{},onRetry=null}){
  const ground=createSkirmishGround(world,centre,regionId,radius);
  layout=layout??oremindiEncounterLayout(kind,centre);
  const staged=[layout.hero,...layout.guards,...layout.allies];
  if(!staged.every(p=>ground.clear(p.x,p.z,.55)))throw Error('An Oremindi encounter start is not on clear, loaded ground.');
  const navigation={canOccupy:(p,r)=>ground.clear(p.x,p.z,r),canTraverse:ground.segment};
  const model=createOremindiEncounter({kind,centre,layout,radius,move:ground.move,...navigation,canHit:ground.canHit,
    heightAt:(x,z)=>world.heightAt(x,z),arrowHit:(a,b)=>forestSegmentHit(world,a,b,{radius:.055}),retreatRoute:ground.retreatRoute});
  let state=model.snapshot(),started=false,paused=true,ended=false,shown=false,disposed=false,watching=watch,
    clickAttack=false,clickDodge=false,elapsed=0,beat=0,lastHero={...state.hero};
  const root=new THREE.Group();root.name='Chapter 3 / '+names[kind];scene.add(root);
  const enemies=state.guards.map((u,i)=>{const a=createOremindiCombatActor(u,{index:i});root.add(a.group);return a;});
  const allies=state.allies.map((u,i)=>{const a=createOremindiCombatActor(u,{ally:true,index:i});root.add(a.group);return a;});
  const warnings=createEncounterWarnings(root,enemies.length),target=createEncounterTarget(root),fallen=new Map();
  const ringGeo=new THREE.RingGeometry(.65,.76,24),ringMat=new THREE.MeshBasicMaterial({color:0x8bcbb0,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false});
  const rings=state.allies.map(()=>{const ring=new THREE.Mesh(ringGeo,ringMat);ring.rotation.x=-Math.PI/2;root.add(ring);return ring;});
  const arrowGeo=new THREE.CylinderGeometry(.016,.022,.9,4),arrowMat=new THREE.MeshStandardMaterial({color:0xd5c49c,roughness:.85}),arrows=new Map(),up=new THREE.Vector3(0,1,0),direction=new THREE.Vector3();
  const panel=document.createElement('section');panel.id='oremindi-encounter';panel.setAttribute('aria-label','Chapter 3 mountain encounter');
  panel.innerHTML=`<style>
    #oremindi-encounter{position:fixed;inset:0;pointer-events:none;color:#f0e5c6;font:14px Georgia,serif;z-index:35}
    #oremindi-encounter .oc-card{background:rgba(22,48,43,.96);border:1px solid #b2a77e;border-radius:5px;padding:18px;pointer-events:auto}
    #oremindi-encounter .oc-status{position:absolute;left:24px;top:24px;width:min(335px,calc(100vw - 84px))}
    #oremindi-encounter h2{font-size:25px;color:#f1dba3;margin:8px 0 12px}#oremindi-encounter p{line-height:1.5;margin:8px 0}
    #oremindi-encounter small{font:11px sans-serif;letter-spacing:.14em}#oremindi-encounter button{background:#284b43;color:#f0e5c6;border:1px solid #a49b77;border-radius:3px;padding:10px;margin:4px;cursor:pointer}
    #oremindi-encounter button:focus-visible{outline:2px solid #f3d189;outline-offset:2px}
    #oremindi-encounter .oc-modal{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(570px,calc(100vw - 70px));max-height:83vh;overflow:auto}
    #oremindi-encounter .oc-help{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);width:max-content;max-width:85vw;font:12px/1.6 sans-serif;text-align:center;padding:12px}
    #oremindi-encounter [data-feedback]{min-height:42px;color:#f2d796}#oremindi-encounter meter{width:100%;height:12px}#oremindi-encounter [hidden]{display:none!important}
    </style>
    <div class="oc-status oc-card"><small>${rehearsal?'COMBAT REHEARSAL':'CHAPTER 3'} / OREMINDI</small><h2>${names[kind]}</h2><p data-objective></p><label>Health <meter data-health min="0" max="100"></meter></label><p data-forces></p><div data-controls><button data-strike>Strike (X / click)</button><button data-block>Hold to block (F)</button><button data-dodge>Dodge ready (Space)</button></div><p data-feedback role="status"></p><button data-pause>Help / pause (H / Esc)</button></div>
    <div class="oc-help oc-card">WASD / arrows move · Click / X strike · Hold F to block · Space dodge · Q Fireball<br>T lock / unlock target · E next target · Right-drag camera · Fight on foot</div>
    <div class="oc-modal oc-card" role="dialog" aria-modal="true" aria-label="Mountain encounter briefing"><small data-kicker></small><h2 data-title></h2><p data-copy></p><div data-actions></div></div>`;
  document.body.append(panel);const $=s=>panel.querySelector(s),modal=$('.oc-modal'),actions=$('[data-actions]');
  const focus=createCombatFocus({scene:root,world,yaw,canSee:(a,b)=>localSight(world,a,b),snapshot:model.snapshot,
    controlsHost:$('[data-controls]'),onChoose(){watching=false;}});
  const controlsAbort=new AbortController(),guard=$('[data-block]');
  const hold=value=>{if(value){if(paused||ended||guard.disabled)return;watching=false;keys.add('KeyF');}else keys.delete('KeyF');};
  guard.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();guard.setPointerCapture(e.pointerId);hold(true);},{signal:controlsAbort.signal});
  for(const name of ['pointerup','pointercancel','lostpointercapture','blur'])guard.addEventListener(name,()=>hold(false),{signal:controlsAbort.signal});
  guard.addEventListener('keydown',e=>{if(['Space','Enter'].includes(e.code)){e.preventDefault();e.stopPropagation();hold(true);}},{signal:controlsAbort.signal});
  guard.addEventListener('keyup',e=>{if(['Space','Enter'].includes(e.code)){e.preventDefault();hold(false);}},{signal:controlsAbort.signal});
  $('[data-strike]').onclick=()=>{if(!paused&&!ended){watching=false;clickAttack=true;}};
  $('[data-dodge]').onclick=()=>{if(!paused&&!ended){watching=false;clickDodge=true;}};
  function button(text,action){const b=document.createElement('button');b.textContent=text;b.onclick=action;actions.append(b);return b;}
  function show(title,text,kicker='THE MOUNTAIN ALLIANCE'){paused=true;keys.clear();clickAttack=clickDodge=false;modal.hidden=false;$('[data-title]').textContent=title;$('[data-copy]').textContent=text;$('[data-kicker]').textContent=kicker;actions.replaceChildren();draw(0);}
  function begin(){if(disposed||ended)return false;if(!started&&onStart()===false)return false;started=true;paused=false;modal.hidden=true;keys.clear();draw(0);return true;}
  function finish(){if(ended)return;ended=true;onEnd(state.outcome);beat=1.25;keys.clear();}
  function withdraw(){if(disposed||ended||!started)return false;state=model.withdraw();paused=false;modal.hidden=true;finish();return true;}
  function pause(){if(ended)return;show('Read the ground','Use the moves Uguth taught you: click or X to strike, hold F to block, Space to dodge, and Q for Fireball. T locks or unlocks an opponent; E cycles targets. Rust attack footprints show committed strikes. Back away from broad axe cleaves and sidestep narrow chops. Staff guard softens frontal blows; flank a shield or counter during the green recovery opening. Green rings mark allies.');button(started?'Resume':'Enter the encounter',begin);button(started?'Withdraw and regroup':'Leave before the encounter',started?withdraw:onWithdraw);}
  $('[data-pause]').onclick=pause;
  function fall(id,hp){if(!hp&&!fallen.has(id))fallen.set(id,elapsed);return Math.min(1,(elapsed-(fallen.get(id)??elapsed))/.65);}
  function paint(){const h=state.hero;$('[data-health]').value=h.hp;$('[data-health]').max=h.maxHp;
    $('[data-strike]').disabled=paused||ended||state.settling||h.blocking||h.casting>0;
    guard.disabled=paused||ended||state.settling||h.swing>0||h.dodge>0||h.casting>0;
    guard.setAttribute('aria-pressed',String(!!h.blocking));guard.textContent=h.blocking?'Staff guard (F held)':'Hold to block (F)';
    $('[data-dodge]').disabled=paused||ended||state.settling||!!h.dodgeCooldown;
    $('[data-dodge]').textContent=h.dodgeCooldown?`Dodge: ${h.dodgeCooldown.toFixed(1)}s`:'Dodge ready (Space)';
    $('[data-objective]').textContent=kind==='ambush'?state.settling?'The last raider is fleeing. Watch the trail; the evidence remains here.':`Survive the ambush / ${state.fallen} of 2 raiders defeated. The last survivor will flee.`:state.chiefDefeated?'The chief has fallen. Break the remaining attacking line.':'Hold with the rangers and defeat the South Oremindi chief. Use the terrace to protect the archers.';
    $('[data-forces]').textContent=kind==='highground'?`${state.allies.filter(a=>a.hp>0).length} rangers standing · ${state.guards.filter(g=>g.hp>0&&!g.escaped).length} orcs fighting · ${Math.max(0,Math.ceil(240-state.time))}s remaining`:`${Math.max(0,Math.ceil(180-state.time))}s remaining`;
    $('[data-feedback]').textContent=encounterFeedback(state)?.text??(watching?(rehearsal?'Computer rehearsal':'Computer playing')+' / move or strike to take control.':'Face the target, read its weapon, then take the recovery opening.');
  }
  function draw(dt){
    const h=state.hero,speed=dt?Math.min(h.combat.moveSpeed,distance(h,lastHero)/dt):0;lastHero={...h};
    position.set(h.x,world.heightAt(h.x,h.z),h.z);actor.group.position.copy(position);actor.group.rotation.set(0,h.heading,0);actor.setArmed(true);actor.setWeapon('oak-staff');
    actor.animate(elapsed,state.settling||ended?0:speed,true,encounterHeroPose(state.settling||ended?{...h,swing:0,dodge:0,hurt:0,blocking:false}:h,fall('hero',h.hp)));
    state.guards.forEach((u,i)=>enemies[i].update(u,elapsed,world.heightAt(u.x,u.z),fall('enemy-'+i,u.hp)));
    state.allies.forEach((u,i)=>{allies[i].update(u,elapsed,world.heightAt(u.x,u.z),fall('ally-'+i,u.hp));rings[i].visible=u.hp>0&&!u.departed;rings[i].position.set(u.x,world.heightAt(u.x,u.z)+.05,u.z);});
    warnings.draw(state.settling||ended?state.guards.map(g=>({...g,phase:'approach',open:false})):state.guards,(x,z)=>world.heightAt(x,z));
    target.draw(state.settling?{...state,outcome:true}:state,(x,z)=>world.heightAt(x,z));
    const live=new Set();for(const p of state.archeryProjectiles??[]){live.add(p.id);let mesh=arrows.get(p.id);if(!mesh){mesh=new THREE.Mesh(arrowGeo,arrowMat);arrows.set(p.id,mesh);root.add(mesh);}mesh.position.set(p.x,p.y,p.z);mesh.quaternion.setFromUnitVectors(up,direction.set(p.dx,p.dy,p.dz));}
    for(const [id,mesh]of arrows)if(!live.has(id)){mesh.removeFromParent();arrows.delete(id);}
    focus.update(state,dt,paused||ended||state.settling);paint();
  }
  function result(){shown=true;const won=state.outcome.result==='victory',report=oremindiEncounterReport(state,{rehearsal});show(report.title,report.text,'ENCOUNTER REPORT');
    if(!won&&onRetry)button('Retry at full health',onRetry);
    button(rehearsal?'Return from rehearsal':'Continue to exploration',onContinue).focus();
  }
  show(names[kind],kind==='ambush'?'Three orc raiders are closing on the investigation site. Defeat two; the last will break and flee. You must collect the proof separately after the fight.\n\nUse your Stillroom training: click or X strikes, hold F to block, Space dodges, and Q casts Fireball. T locks or unlocks an opponent; E chooses the next. Back away from broad axe cleaves; sidestep the narrower chop, then counter in the green recovery opening.':
    'Four North Ibenwood rangers hold this terrace against eight orcs: raiders, armored warriors and the South Oremindi chief. The archers need room and a clear line; the swordsmen defend the upper approach. Uphill attackers move more slowly, and elevated arrows can clear a frontal shield.\n\nUse click / X to strike, hold F to block, Space to dodge, and Q for Fireball. T locks or unlocks an opponent; E chooses the next. Defeat the veteran chief and break the formation; remaining orcs may flee when their leader and comrades fall.');
  button(watching?rehearsal?'Watch the rehearsal':'Watch the encounter':'Enter the encounter',begin).focus();button('Leave before the encounter',onWithdraw);draw(0);
  return {isOremindi:true,kind,snapshot:()=>({...model.snapshot(),started,paused,reviewing:shown,rehearsal,watching}),start:begin,pause,withdraw,
    reviewing:()=>shown,paused:()=>paused,settleResult(){},cameraTarget:focus.cameraTarget,manualCamera:focus.manual,focusId:focus.id,
    spellTargets:model.spellTargets,fireballHit:(id,damage)=>!paused&&!ended&&model.fireballHit(id,damage),canCast:()=>!paused&&!ended&&model.canCast(),
    beginCast(){if(paused||ended||!model.beginCast())return false;watching=false;return true;},
    spellPaused:()=>paused||ended||model.snapshot().settling,musicState:()=>({id:'oremindi-'+kind,name:names[kind]}),
    attack(){if(!paused&&!ended)clickAttack=true;},
    keydown(e){
      if(paused&&['Space','Enter'].includes(e.code)&&e.target?.closest?.('button'))return false;
      if(e.code==='Tab'){if(paused){e.preventDefault();if(!e.repeat){const buttons=[...actions.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);buttons[(index+(e.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();}return true;}return false;}
      if(!paused&&!ended&&focus.keydown(e))return true;
      if(e.code==='KeyH'){e.preventDefault();if(!e.repeat&&!ended){if(paused&&started)begin();else pause();}return true;}
      if(e.code==='Escape'){e.preventDefault();if(!e.repeat){if(ended){if(shown)onContinue();}else if(paused&&started)begin();else pause();}return true;}
      if(e.code==='Enter'&&!e.target?.closest?.('button')){e.preventDefault();if(!e.repeat){if(shown)onContinue();else if(paused)begin();}return true;}
      if(['Space','Enter'].includes(e.code)&&e.target?.closest?.('button'))return false;
      if(e.code==='Space'){e.preventDefault();if(!e.repeat&&!paused&&!ended){keys.add('Space');watching=false;}return true;}
      return false;
    },
    tick(dt,active=true){if(disposed||!active||paused&&!ended)return;if(ended){if(!shown){elapsed+=dt;draw(dt);beat-=dt;if(beat<=0)result();}return;}
      if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyX','KeyF','Space'].some(k=>keys.has(k))||clickAttack||clickDodge)watching=false;
      let input;if(!watching){
        const {forward:f,side:s}=getMovementInput(keys),a=yaw();
        input={x:-Math.sin(a)*f+Math.cos(a)*s,z:-Math.cos(a)*f-Math.sin(a)*s,focusId:focus.id(),attack:keys.has('KeyX')||clickAttack,block:keys.has('KeyF'),dodge:keys.has('Space')||clickDodge};
      }
      state=watching?model.autoplayTick(dt,navigation):model.tick(dt,input);clickAttack=clickDodge=false;elapsed+=dt;draw(dt);if(state.outcome)finish();
    },
    dispose(){if(disposed)return;disposed=true;controlsAbort.abort();focus.dispose();panel.remove();warnings.dispose();target.dispose();for(const a of [...enemies,...allies])a.dispose();ringGeo.dispose();ringMat.dispose();arrowGeo.dispose();arrowMat.dispose();root.removeFromParent();keys.clear();actor.setArmed(false);actor.setWeapon('oak-staff');},
  };
}
