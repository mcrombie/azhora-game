import * as THREE from 'three';
import {selectFireballTarget} from '../../gameplay/combat/combat-focus.js';
import {createTeresodSorcery} from './teresod-fireball.js';
import {writeHud} from './hud-write.js';
// A small scenario adapter: shares Ben's spell numbers and low-poly flame design,
// but owns no quest, experience, skill tree or adventure combat controller.
export function createFireballHost({scene,world,actor,position,yaw,mode,inside,canCast,combat,saved,onDirty,notice}){
  const spell=createTeresodSorcery(saved),panel=document.createElement('aside');panel.id='teresod-sorcery';
  panel.innerHTML='<button id="teresod-fireball">Fireball / Q</button><label>Mana <span></span><meter min="0" max="100" value="100"></meter></label><small>20 mana / recovers after 4 seconds</small>';document.body.append(panel);
  const button=panel.querySelector('button'),meter=panel.querySelector('meter'),label=panel.querySelector('span');
  const root=new THREE.Group();root.name='Teresod Fireball';scene.add(root);const shots=new Map(),sparks=new Map();
  const geometry=new THREE.IcosahedronGeometry(1,1),core=new THREE.MeshBasicMaterial({color:0xffed9a}),glow=new THREE.MeshBasicMaterial({color:0xfa6b22,transparent:true,opacity:.7,depthWrite:false});
  const releaseGlow=new THREE.Mesh(geometry,glow);releaseGlow.visible=false;root.add(releaseGlow);
  let gesture=0,lastRelease=null;
  function flame(){const g=new THREE.Group();for(let i=0;i<5;i++){const m=new THREE.Mesh(geometry,i===0?core:glow);m.scale.setScalar(i===0?.2:i===1?.37:.16-(i-2)*.035);if(i>1)m.position.z=-(i-1)*.24;g.add(m);}root.add(g);return g;}
  function blocked(p){
    if(!world.readyAt(p.x,p.z)||p.y<world.heightAt(p.x,p.z)+.1)return true;
    return world.nearColliders(p.x,p.z,.34).some(c=>{if(['river-water','pond-water'].includes(c.kind))return false;const bottom=c.minY??world.heightAt(c.x,c.z),top=c.maxY??bottom+2;return p.y>=bottom&&p.y<=top&&(c.r!==undefined?Math.hypot(p.x-c.x,p.z-c.z)<c.r+.2:Math.abs(p.x-c.x)<c.hx+.2&&Math.abs(p.z-c.z)<c.hz+.2);});
  }
  function clearLine(a,b){const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z)/.3);for(let i=1;i<n;i++){const t=i/n;if(blocked({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t}))return false;}return true;}
  function targets(){return (combat()?.spellTargets?.()??[]).map(t=>({...t,y:world.heightAt(t.x,t.z)+1}));}
  function cast(){
    if(!['playing','skirmish'].includes(mode())||inside()||!canCast()||combat()?.spellPaused?.())return false;
    const available=spell.state();if(available.mana<available.cost||available.cooldown>0)return false;
    const dir={x:-Math.sin(yaw()),y:0,z:-Math.cos(yaw())};
    // Sample the rendered, posed focus/hand, including every joint and parent transform.
    const lockedId=combat()?.focusId?.()??null,choices=targets();
    const aimed=selectFireballTarget({x:position.x,y:position.y+1.5,z:position.z},dir,choices,{lockedId,visible:clearLine});
    if(aimed){dir.x=aimed.x-position.x;dir.z=aimed.z-position.z;const length=Math.hypot(dir.x,dir.z);dir.x/=length;dir.z/=length;}
    actor.setSpellPose(.5,Math.atan2(dir.x,dir.z));
    const tip=actor.focusTip(),hand=tip??actor.handTip(),origin={x:hand.x,y:hand.y,z:hand.z};
    const target=aimed&&clearLine(origin,aimed)&&Math.hypot(aimed.x-origin.x,aimed.y-origin.y,aimed.z-origin.z)<=18?aimed:null;
    if(target){dir.x=target.x-origin.x;dir.y=target.y-origin.y;dir.z=target.z-origin.z;}
    const r=spell.cast(origin,dir);if(r.ok){gesture=.45;lastRelease={source:tip?'staff':'hand',targetId:target?.id??null,...origin};onDirty();}else{actor.setSpellPose(null);if(r.reason)notice(r.reason);}update(0);return r.ok;
  }
  button.onclick=cast;
  function draw(){const s=spell.state();for(const [collection,list]of [[shots,s.shots],[sparks,s.impacts]]){
    const ids=new Set(list.map(p=>p.id));for(const [id,g]of collection)if(!ids.has(id)){g.removeFromParent();collection.delete(id);}
    for(const p of list){let g=collection.get(p.id);if(!g){g=flame();collection.set(p.id,g);}g.position.set(p.x,p.y,p.z);g.lookAt(p.x+p.dx,p.y+p.dy,p.z+p.dz);
      // A new projectile has no trail behind its launch socket. Grow it only
      // through space the shot actually travelled, never back through the caster.
      for(let i=2;i<g.children.length;i++){const tail=(i-1)*.24;g.children[i].visible=collection===sparks||p.travel>tail+.16;}
      if(collection===sparks)g.scale.setScalar(1+p.age*4);g.children[0].rotation.x+=.2;}}
  }
  function update(dt){
    const visible=['playing','skirmish'].includes(mode())&&!inside(),s=spell.state();writeHud(panel,'hidden',!visible);root.visible=visible;
    if(!visible){if(inside()||['loading','limbo'].includes(mode())){spell.clear();gesture=0;actor.setSpellPose(null);}draw();return;}
    if(dt>0&&!combat()?.spellPaused?.()){const before=s.mana;spell.tick(Math.min(dt,.1),{blocked,targets:targets(),hit:(id,damage)=>combat()?.fireballHit(id,damage)});if(spell.state().mana!==before)onDirty();}
    if(gesture>0){if(!combat()?.spellPaused?.())gesture=Math.max(0,gesture-dt);actor.setSpellPose(gesture>0?.5+(1-gesture/.45)*.5:null);}
    releaseGlow.visible=gesture>.3;if(releaseGlow.visible){releaseGlow.position.copy(actor.focusTip()??actor.handTip());releaseGlow.scale.setScalar(.16+(gesture-.3)*.6);}
    const now=spell.state();writeHud(meter,'value',now.mana);writeHud(label,'textContent',`${Math.floor(now.mana)} / 100`);writeHud(button,'disabled',!canCast()||now.mana<20||now.cooldown>0||!!combat()?.spellPaused?.());draw();
  }
  return {cast,update,snapshot:spell.snapshot,state:()=>({...spell.state(),lastRelease}),restore:spell.restore,clear(){spell.clear();gesture=0;actor.setSpellPose(null);},dispose(){panel.remove();root.removeFromParent();geometry.dispose();core.dispose();glow.dispose();}};
}
