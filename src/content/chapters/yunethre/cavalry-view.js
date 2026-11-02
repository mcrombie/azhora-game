import * as THREE from 'three';
import {createYunethreCavalry,YUNETHRE_CAVALRY,yunethreCavalryAutoplayInput} from '../../../gameplay/combat/yunethre-cavalry.js';
import {createYunethreCombatActor,createCavalryHorse,cavalryRiderPose,cavalryFootPose} from './cavalry-actors.js';
import {canStand,moveCharacter} from '../../../gameplay/movement/locomotion.js';
import {localSight} from '../../../app/exploration/local-sight.js';
import {RIDE} from '../../../gameplay/movement/riding.js';

const label=side=>side==='centaurs'?'Reed Kin':'Celder knights';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const reason={
  'opposing-formation-broken':'The opposing formation has broken.',
  'hero-defeated':'Teresod was overcome. Your side could not hold the field.',
  'hero-withdrew':'You withdrew. The opposing force held the field.',
  'battle-deadline':'The remaining fighting strength decided the field after three minutes.',
};
function lineGeometry(){return new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);}
function setLine(line,a,b,world,lift=.13){const p=line.geometry.attributes.position;p.setXYZ(0,a.x,world.heightAt(a.x,a.z)+lift,a.z);p.setXYZ(1,b.x,world.heightAt(b.x,b.z)+lift,b.z);p.needsUpdate=true;line.geometry.computeBoundingSphere();}

/** Temporary physical battle; campaign.js receives one result through onEnd.
 * The world, camera and actual hero are reused. No simulation is embedded here. */
export function openYunethreCavalry({scene,world,actor,position,keys,yaw,centre,side='centaurs',mounted=true,
  rehearsal=false,watch=false,onStart=()=>true,onEnd=()=>{},onContinue=()=>{},onWithdraw=()=>{}}){
  const radius=centre.radius??38;
  const clear=(x,z,r=.85)=>world.readyAt(x,z)&&world.regionAt(x,z).id===38&&canStand(x,z,world,r,world.heightAt(x,z))&&world.heightAt(x,z)>(world.waterAt?.(x,z)??-Infinity);
  const starts=(xs,z)=>xs.map(x=>({x:centre.x+x,z:centre.z+z}));
  const centaurStarts=starts([-12,-4,4,12],-14),knightStarts=starts([-10,0,10],18);
  const heroStart={x:centre.x,z:centre.z+(side==='centaurs'?-25:29)};
  if(![heroStart,...centaurStarts,...knightStarts].every(p=>clear(p.x,p.z)))throw Error('The cavalry meadow is not ready or a starting position is blocked.');
  function move(at,dx,dz){const point={x:at.x,y:world.heightAt(at.x,at.z),z:at.z};
    moveCharacter(point,dx,dz,world,at.bodyRadius??.8,{canTraverse:(x,z,nx,nz)=>distance({x:nx,z:nz},centre)<radius-1&&clear(nx,nz,at.bodyRadius??.8)&&Math.abs(world.heightAt(nx,nz)-world.heightAt(x,z))<.3});return point;}
  const model=createYunethreCavalry({side,origin:centre,heroStart,mounted,centaurStarts,knightStarts,radius:radius-1,move,canHit:(a,b)=>localSight(world,a,b,1.8)});
  let state=model.snapshot(),selected=null,ended=false,disposed=false,paused=true,started=false,watching=watch,
    requestedMount=mounted,clickAttack=false,clickDodge=false,cameraFollow=watch,elapsed=0,resultBeat=0,shown=false,feedbackId=0,feedbackUntil=0;
  const root=new THREE.Group();root.name='Yunethre / cavalry encounter';scene.add(root);
  const actors=state.units.map((u,i)=>{const a=createYunethreCombatActor(u.kind,i);root.add(a.group);return a;});
  const horse=createCavalryHorse();root.add(horse.group);
  const friend=new THREE.MeshBasicMaterial({color:0x76c6aa,transparent:true,opacity:.65,depthWrite:false,side:THREE.DoubleSide});
  const enemy=new THREE.MeshBasicMaterial({color:0xd98261,transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide});
  const ringGeo=new THREE.RingGeometry(.9,1.03,24),rings=state.units.map(u=>{const r=new THREE.Mesh(ringGeo,u.side===side?friend:enemy);r.rotation.x=-Math.PI/2;root.add(r);return r;});
  const targetMat=new THREE.MeshBasicMaterial({color:0xf9dda0,depthWrite:false,side:THREE.DoubleSide});
  const target=new THREE.Mesh(new THREE.RingGeometry(1.16,1.28,28),targetMat);target.rotation.x=-Math.PI/2;root.add(target);
  const traces=state.units.map(()=>{const line=new THREE.Line(lineGeometry(),new THREE.LineBasicMaterial({color:0xf09a6e,transparent:true,opacity:.8}));root.add(line);return line;});
  const arrowGeo=new THREE.CylinderGeometry(.018,.018,1.2,4);arrowGeo.rotateX(Math.PI/2);
  const arrowMat=new THREE.MeshStandardMaterial({color:0xd6bd8c,roughness:.85}),arrows=new Map();
  const panel=document.createElement('section');panel.id='yunethre-cavalry';panel.setAttribute('aria-label','Yunethre cavalry battle');
  panel.innerHTML=`<style>
    #yunethre-cavalry{position:fixed;inset:0;pointer-events:none;color:#f0e5c6;font:14px Georgia,serif;z-index:35}
    #yunethre-cavalry .cv-card{background:rgba(22,54,49,.96);border:1px solid #ad9e70;border-radius:5px;padding:18px;box-shadow:0 8px 25px #0003;pointer-events:auto}
    #yunethre-cavalry .cv-status{position:absolute;left:24px;top:24px;width:min(340px,calc(100vw - 84px))}
    #yunethre-cavalry h2{font-size:26px;margin:8px 0 12px;color:#f2d48d} #yunethre-cavalry p{line-height:1.55;margin:8px 0}
    #yunethre-cavalry small{font:11px sans-serif;letter-spacing:.13em} #yunethre-cavalry button{background:#284b43;color:#f0e5c6;border:1px solid #a49b77;border-radius:3px;padding:10px;margin:4px;cursor:pointer}
    #yunethre-cavalry button:focus-visible{outline:2px solid #f3d189;outline-offset:2px}
    #yunethre-cavalry .cv-modal{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(570px,calc(100vw - 70px));max-height:83vh;overflow:auto}
    #yunethre-cavalry .cv-help{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);width:max-content;max-width:85vw;text-align:center;padding:12px;font:12px/1.6 sans-serif}
    #yunethre-cavalry .cv-feedback{min-height:40px;color:#f5d38b} #yunethre-cavalry meter{width:100%;height:11px;accent-color:#bcd7ba} #yunethre-cavalry [hidden]{display:none!important}
    </style>
    <div class="cv-status cv-card"><small>${rehearsal?'COMBAT REHEARSAL':'CHAPTER 2'} / YUNETHRE</small><h2>The Reedwind field</h2><p data-readout></p><label>Health <meter data-health min="0" max="100"></meter></label><label>Stamina <meter data-stamina min="0" max="100"></meter></label><p data-target></p><p data-feedback class="cv-feedback" role="status"></p><button data-pause>Pause / tactics (Esc)</button></div>
    <div class="cv-help cv-card">WASD move · Shift canter/run · Hold R to draw, release to shoot · Click / F strike<br>Space sidestep / mounted surge · G mount/dismount when stopped · Tab choose target · Right-drag camera</div>
    <div class="cv-modal cv-card" role="dialog" aria-modal="true" aria-label="Cavalry briefing"><small data-kicker></small><h2 data-title></h2><p data-copy></p><div data-actions></div></div>`;
  document.body.append(panel);const $=s=>panel.querySelector(s),modal=$('.cv-modal'),actions=$('[data-actions]');
  function button(title,run){const b=document.createElement('button');b.textContent=title;b.onclick=run;actions.append(b);return b;}
  function show(title,text,kicker='THE REED KIN AND CELDER'){paused=true;keys.clear();modal.hidden=false;$('[data-title]').textContent=title;$('[data-copy]').textContent=text;$('[data-kicker]').textContent=kicker;actions.replaceChildren();}
  function begin(){if(!started&&onStart()===false)return;started=true;paused=false;modal.hidden=true;keys.clear();}
  function briefing(){show('Choose your pace before the charge',`You are fighting for ${label(side)}. Centaur archers need space to draw and turn; close inside their bow range to force a weaker spear attack. Celder lancers lower their weapons before a straight charge. Move across its path, then strike their exposed sides during recovery.\n\nHold R to draw a bow and release to shoot toward the gold target. Arrows travel through the world: lead moving targets by choosing when to release. A full draw is stronger; a fast canter is less accurate. Mounted Space is a burst of speed, not invulnerability. On foot, Space is a short timed sidestep.\n\nBreak the opposing formation or hold more fighting strength when the three-minute field timer ends.${rehearsal?' This rehearsal does not change the chapter.':''}`);
    button(watching?'Watch the rehearsal':'Enter the field',begin);button('Leave before the fighting',onWithdraw).dataset.cvCancel='true';}
  function pause(){if(state.outcome)return;show('Read the field','Drawn bows and lowered lances announce attacks. A charge cannot turn sharply once committed. Gold marks your current target. Green rings are allies; rust rings are opponents. Stop before mounting or dismounting.');button('Resume',begin);button('Withdraw from the field',()=>{state=model.withdraw();paused=false;modal.hidden=true;finish();});}
  $('[data-pause]').onclick=pause;
  const targets=()=>state.units.filter(u=>u.side!==side&&u.hp>0);
  function chooseNext(){const list=targets();selected=list.length?list[(list.findIndex(u=>u.id===selected)+1)%list.length].id:null;}
  function focused(){const list=targets();if(!list.some(u=>u.id===selected))selected=list.sort((a,b)=>distance(a,state.hero)-distance(b,state.hero))[0]?.id??null;return list.find(u=>u.id===selected);}
  function feedback(text){$('[data-feedback]').textContent=text;feedbackUntil=elapsed+3.5;}
  function paint(){const h=state.hero,foe=focused();$('[data-readout]').textContent=`${label(side)} · ${h.mounted?'Horseback':'On foot'} · ${Math.ceil(state.remaining)}s · ${h.arrows} arrows`;
    $('[data-health]').value=h.hp;$('[data-stamina]').value=h.stamina;
    $('[data-target]').textContent=foe?`${foe.kind==='centaur-archer'?'Centaur archer':'Celder lancer'} · ${Math.ceil(distance(h,foe))} m · ${Math.ceil(foe.hp)} health${h.aimBlocked?' · Turn toward your target':h.draw?` · Draw ${Math.round(h.draw/YUNETHRE_CAVALRY.hero.draw*100)}%`:''}`:'The field is settled.';
    for(const e of state.events.filter(e=>e.id>feedbackId)){
      feedbackId=e.id;
      if(e.type==='hit'&&e.target==='hero')feedback(`Hit for ${e.damage}: ${e.attack==='charge'?'you were in the committed charge lane. Move sideways before impact.':'the attack made contact. Watch the wind-up and keep room to evade.'}`);
      else if(e.type==='evaded'&&e.target==='hero')feedback('Clean sidestep — the attack passed through your evade window.');
      else if(e.type==='hit'&&e.source==='hero')feedback(`${e.damage} damage${e.opening?' · '+String(e.opening).replaceAll('-',' '):''}.`);
      else if(e.type==='down')feedback(`${e.side===side?'An ally':'An opponent'} has fallen.`);
      else if(e.type==='action-refused'&&e.source==='hero')feedback({
        'turn-to-target':'Turn your body toward the gold target before releasing the arrow.',
        'short-draw':'The bow was released too soon. Hold R a little longer.',
        tired:'Not enough stamina. Ease off to recover before dodging or drawing again.',
        cooldown:'You are still recovering from the last dodge. Make room before trying again.',
        'swing-committed':'Your strike is already committed. Dodge before starting the next attack.',
      }[e.reason]??'That action is not ready yet.');
    }
    if(elapsed>feedbackUntil)$('[data-feedback]').textContent=watching?'Computer rehearsal · take control with movement or attack.':'Watch the weapon, move across the attack, punish the recovery.';
  }
  function draw(dt){const h=state.hero;position.set(h.x,world.heightAt(h.x,h.z),h.z);actor.group.position.copy(position);actor.group.rotation.set(0,h.heading,0);
    actor.setWeapon(h.swing?'oak-staff':'hunting-bow');actor.setArmed(true);
    horse.group.visible=h.mounted;horse.group.position.copy(position);horse.group.rotation.y=h.heading;
    if(h.mounted){horse.animate(elapsed,h.speed,true);actor.group.position.y+=RIDE.seat.up;actor.group.position.x+=Math.sin(h.heading)*RIDE.seat.forward;actor.group.position.z+=Math.cos(h.heading)*RIDE.seat.forward;
      cavalryRiderPose(actor,elapsed,h.speed,{draw:h.draw/1.1,aim:Math.atan2(Math.sin(h.aimHeading-h.heading),Math.cos(h.aimHeading-h.heading)),swing:h.swing});
    }else cavalryFootPose(actor,elapsed,h.speed,{draw:h.draw/1.1,aim:Math.atan2(Math.sin(h.aimHeading-h.heading),Math.cos(h.aimHeading-h.heading)),swing:h.swing,dodge:h.dodge});
    state.units.forEach((u,i)=>{const y=world.heightAt(u.x,u.z);actors[i].update(u,elapsed,dt,y);rings[i].visible=u.hp>0;rings[i].position.set(u.x,y+.04,u.z);
      const t=u.telegraph;traces[i].visible=!!t&&u.hp>0;if(t)setLine(traces[i],t.from,t.to,world,t.kind==='charge'?.08:2.45);});
    const foe=focused();target.visible=!!foe;if(foe)target.position.set(foe.x,world.heightAt(foe.x,foe.z)+.07,foe.z);
    const live=new Set();for(const p of state.projectiles){live.add(p.id);let mesh=arrows.get(p.id);if(!mesh){mesh=new THREE.Mesh(arrowGeo,arrowMat);mesh.userData.lift=p.owner==='hero'&&!h.mounted?1.55:2.45;arrows.set(p.id,mesh);root.add(mesh);}mesh.position.set(p.x,world.heightAt(p.x,p.z)+mesh.userData.lift,p.z);mesh.rotation.y=Math.atan2(p.dx,p.dz);}
    for(const [id,mesh]of arrows)if(!live.has(id)){mesh.removeFromParent();arrows.delete(id);}paint();
  }
  function finish(){if(ended)return;ended=true;onEnd(state.outcome);resultBeat=1.25;}
  function result(){shown=true;show(state.outcome.result==='victory'?'Your side holds the field':state.outcome.result==='withdrawal'?'You left the field':'Your side lost the field',`${reason[state.outcome.reason]??'The encounter has ended.'} ${label(state.outcome.winner)} won. ${rehearsal?'This was a rehearsal. Your campaign has not changed.':state.outcome.winner==='centaurs'?side==='centaurs'?'The camp survives under your protection. Return to Rowan to discuss Laketown joining the League.':'The camp survives, but you fought against it. Return to Rowan to acknowledge Laketown\'s independence.':'The centaur camp has fallen. Laketown has not automatically changed hands; return to Rowan for the aftermath.'}`,'FIELD REPORT');button(rehearsal?'Return from rehearsal':'Continue to exploration',onContinue).focus();}
  function tick(dt,active=true){if(disposed||!active)return;if(ended){if(!shown){elapsed+=dt;draw(dt);resultBeat-=dt;if(resultBeat<=0)result();}return;}if(paused)return;
    const any=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyR'].some(k=>keys.has(k));if(any||clickAttack||clickDodge)watching=false;
    let input;if(watching){selected=targets().sort((a,b)=>distance(a,state.hero)-distance(b,state.hero))[0]?.id??null;input=yunethreCavalryAutoplayInput(state);}else{const forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown')),sideward=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft')),length=Math.max(1,Math.hypot(forward,sideward)),a=yaw(),t=focused();
      input={moveX:(-Math.sin(a)*forward+Math.cos(a)*sideward)/length,moveZ:(-Math.cos(a)*forward-Math.sin(a)*sideward)/length,aimX:t?.x??state.hero.x-Math.sin(a)*20,aimZ:t?.z??state.hero.z-Math.cos(a)*20,shoot:keys.has('KeyR'),melee:clickAttack,dodge:clickDodge,mounted:requestedMount,sprint:keys.has('ShiftLeft')||keys.has('ShiftRight')};}
    state=model.tick(dt,input);clickAttack=false;clickDodge=false;requestedMount=state.hero.mounted;elapsed+=dt;draw(dt);if(state.outcome)finish();
  }
  briefing();draw(0);
  return {isYunethre:true,tick,snapshot:()=>({...state,paused,started,reviewing:shown,rehearsal,watching}),
    attack(){if(!paused&&!ended)clickAttack=true;},manualCamera(){cameraFollow=false;},cameraTarget:()=>cameraFollow?focused():null,paused:()=>paused,
    reviewing:()=>shown,settleResult(){},musicState:()=>({id:'yunethre-cavalry',name:'The Reedwind field'}),
    keydown(e){if(e.code==='Tab'){e.preventDefault();if(!paused){watching=false;cameraFollow=true;chooseNext();}else{const b=[...actions.querySelectorAll('button')],i=b.indexOf(document.activeElement);b[(i+(e.shiftKey?-1:1)+b.length)%b.length]?.focus();}return true;}
      if(e.code==='Escape'){e.preventDefault();if(!e.repeat){if(ended){if(shown)onContinue();}else if(paused&&started)begin();else pause();}return true;}
      if(e.code==='Enter'){if(!e.target?.closest?.('button')){e.preventDefault();if(!e.repeat){if(shown)onContinue();else if(paused)begin();}}return true;}
      if(e.code==='Space'||e.code==='KeyF'||e.code==='KeyG'){e.preventDefault();if(!e.repeat&&!paused&&!ended){watching=false;if(e.code==='Space')clickDodge=true;else if(e.code==='KeyF')clickAttack=true;else if(state.hero.speed<.6)requestedMount=!state.hero.mounted;else feedback('Slow to a stop before mounting or dismounting.');}return true;}return false;},
    start:begin,pause,withdraw(){state=model.withdraw();paused=false;modal.hidden=true;finish();},
    dispose(){if(disposed)return;disposed=true;panel.remove();for(const a of actors)a.dispose();horse.dispose();root.removeFromParent();for(const r of traces){r.geometry.dispose();r.material.dispose();}ringGeo.dispose();friend.dispose();enemy.dispose();target.geometry.dispose();targetMat.dispose();arrowGeo.dispose();arrowMat.dispose();actor.setArmed(false);actor.setWeapon('oak-staff');actor.group.rotation.set(0,state.hero.heading,0);actor.group.position.copy(position);},
  };
}
