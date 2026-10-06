import * as THREE from 'three';
import {BALDRO_KINGDOMS} from './baldro-world.js';
import {createBaldroState,DWARF_INTRODUCTION,DWARF_FORGE_STEPS} from './baldro-state.js';
import {createDwarf} from '../../../world/actors/dwarf-model.js';
import {buildBaldroInterior,createBaldroInteriorWalk,BALDRO_INTERIOR_ROOMS,BALDRO_INTERIOR_STOPS} from './baldro-interiors.js';
import {canStand} from '../../../gameplay/movement/game-state.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const DWARF_BODY_RADIUS=.48,TRAVELER_BODY_RADIUS=.34;
const history=[
  'Two kingdoms remain in the confederation. Each keeps its own crown, its own gate and its own laws. The mountains between us are a shared responsibility.',
  'Once there were many more dwarf cities. Humans destroyed some; goblins overran others. The empty districts here once held far more families and trades.',
  'Our greatest ancient capital was in the western Oremindi. After years of siege the humans brought the sea into the mountain. The king and everyone inside were lost. Its old name is kept in the deep archives.',
];
const localLines={
  hearth:['There is room by the hearth. These homes are lived in, even with so many doors farther in shut. We bake, mend and argue here like anybody else.'],
  smith:['The forge works every day. The western and eastern kingdoms trade tools, grain and stone, but neither takes orders from the other.'],
  archivist:[...history,'These lamps stand for the two cities that remain. The unlit seats remember the cities lost to humans and goblins. The drowned capital of the Oremindi was the greatest of them.'],
  neighbor:['My family lives in this district. Past the shored passage are homes that have been empty longer than I have been alive. We keep the road to them clear.'],
};

export function createBaldroHost({scene,world,player,openDialogue,closeDialogue,toast,save=()=>{},reward=()=>{},focus=()=>{},transition=()=>{},available=()=>true}){
  const state=createBaldroState(),holds=[],people=[],markers=[];let active=null,clock=0;
  const place=(actor,at)=>actor.group.position.set(at.x,at.y,at.z);
  for(const kingdom of BALDRO_KINGDOMS){
    // Routes, saved admission and resident positions exist without allocating
    // the hidden city's masonry, lights or character rigs at game startup.
    const group=new THREE.Group();group.name=`${kingdom.name} underground city`;group.visible=false;scene.add(group);
    const hold={kingdom,group,walk:createBaldroInteriorWalk(kingdom),rooms:BALDRO_INTERIOR_ROOMS,built:false};holds.push(hold);
    for(const i of [0,1]){
      const actor=createDwarf({city:kingdom.id,role:'guard',variant:i}),at={x:kingdom.gate.x+(i?5:-5),z:kingdom.gate.z+8};
      at.y=world.heightAt(at.x,at.z);place(actor,at);scene.add(actor.group);
      people.push({id:`${kingdom.id}-guard-${i}`,name:`${kingdom.name} gatekeeper`,role:'Dwarven gate guard',actor,hold,guard:true,home:at});
    }
    for(const stop of BALDRO_INTERIOR_STOPS){
      const actor={group:new THREE.Group(),animate:()=>{}},at=hold.walk.toWorld(stop);place(actor,at);actor.group.rotation.y=Math.PI*.6;
      actor.group.visible=false;actor.group.userData.creature='dwarf';
      hold.group.add(actor.group);people.push({...stop,id:`${kingdom.id}-${stop.id}`,stopId:stop.id,actor,hold,home:at});
    }
    for(const site of kingdom.taskSites){
      const marker=new THREE.Mesh(new THREE.OctahedronGeometry(.22),new THREE.MeshBasicMaterial({color:0xcab166}));
      marker.position.set(site.x,world.heightAt(site.x,site.z)+2.6,site.z);marker.visible=false;scene.add(marker);
      markers.push({mesh:marker,site,kingdom});
    }
  }
  const west=holds.find(hold=>hold.kingdom.id==='west-baldro'),gate=west.kingdom.gate;
  const targetNames={'west-baldro-guard-0':'West Hold gatekeeper','west-baldro-gate':'West Hold gate',
    'west-baldro-smith':'Hold artisan','west-forge-rivet':'Practice forge',
    ...Object.fromEntries(BALDRO_KINGDOMS.flatMap(k=>[[`${k.id}-exit`,`${k.name} mountain gate`],...k.taskSites.map(site=>[site.id,site.name])]))};
  const target=(id,kind,at)=>({id,kind,...at,name:targetNames[id]??'Next objective'});
  const outdoors=(x,z)=>({x,z,y:world.heightAt(x,z)});
  const exits=Object.fromEntries(holds.map(hold=>[hold.kingdom.id,target(`${hold.kingdom.id}-exit`,'exit',hold.walk.exit)]));
  const introTargets={
    guard:target('west-baldro-guard-0','guard',outdoors(gate.x-5,gate.z+9.8)),
    gate:target('west-baldro-gate','gate',outdoors(gate.x,gate.z+3.5)),
    smith:target('west-baldro-smith','person',west.walk.toWorld({x:29,z:3.4})),
    forge:target('west-forge-rivet','forge',west.walk.toWorld({x:26,z:5.8})),
    sites:west.kingdom.taskSites.map(site=>{
      const candidates=[[0,2.6],[2.6,0],[-2.6,0],[0,-2.6]].map(([x,z])=>outdoors(site.x+x,site.z+z));
      const at=candidates.find(p=>!world.bounds||canStand(p.x,p.z,world,TRAVELER_BODY_RADIUS,p.y))??candidates[0];
      return target(site.id,'site',at);
    }),
    indoorRoute:[{x:0,z:27},{x:0,z:0},{x:22,z:0},{x:22,z:4.8},{x:26,z:4.8}].map(p=>west.walk.toWorld(p)),
    exit:exits['west-baldro'],exits,
  };
  // Small practice equipment is materialized with West Hold and then reflects
  // the saved operation, including when a partly finished lesson is restored.
  let workpiece,rivetMaterial,rivet,hammer,steamMaterial,steam;
  function buildWorkpiece(){
    workpiece=new THREE.Group();workpiece.name='West Hold fitted repair rivet';
    const bench=west.walk.toWorld({x:26,z:8});workpiece.position.set(bench.x,bench.y+1.4,bench.z);west.group.add(workpiece);
    const steel=new THREE.MeshStandardMaterial({color:0x9ba9ad,roughness:.42,metalness:.55});
    rivetMaterial=new THREE.MeshStandardMaterial({color:0x8c999d,roughness:.45,metalness:.6,emissive:0x000000});
    for(const x of [-.23,.23]){const plate=new THREE.Mesh(new THREE.BoxGeometry(.48,.06,.42),steel);plate.position.set(x,.04,0);workpiece.add(plate);}
    rivet=new THREE.Mesh(new THREE.CylinderGeometry(.105,.075,.27,8),rivetMaterial);rivet.position.y=.2;workpiece.add(rivet);
    const trough=new THREE.Mesh(new THREE.BoxGeometry(.48,.15,.42),new THREE.MeshStandardMaterial({color:0x404c50,roughness:.7}));
    trough.position.set(.9,-.34,.12);workpiece.add(trough);
    const water=new THREE.Mesh(new THREE.BoxGeometry(.39,.015,.33),new THREE.MeshStandardMaterial({color:0x587e83,roughness:.2,metalness:.2}));
    water.position.set(.9,-.258,.12);workpiece.add(water);
    hammer=new THREE.Group();hammer.position.set(-.1,.14,.08);workpiece.add(hammer);
    const haft=new THREE.Mesh(new THREE.CylinderGeometry(.023,.027,.44,6),new THREE.MeshStandardMaterial({color:0x96724b,roughness:.8}));
    haft.position.set(-.34,0,0);haft.rotation.z=Math.PI/2;hammer.add(haft);
    const head=new THREE.Mesh(new THREE.BoxGeometry(.16,.13,.2),steel);head.position.set(-.1,0,0);hammer.add(head);
    steamMaterial=new THREE.MeshBasicMaterial({color:0xd4e0df,transparent:true,opacity:0,depthWrite:false});
    steam=Array.from({length:3},(_,i)=>{
      const puff=new THREE.Mesh(new THREE.SphereGeometry(.075+i*.013,6,4),steamMaterial);puff.position.set(.83+i*.07,-.1+i*.13,.12);workpiece.add(puff);return puff;
    });
  }
  let workAnimation=0,animatedOperation=0;
  const introMarker=new THREE.Mesh(new THREE.OctahedronGeometry(.21),new THREE.MeshBasicMaterial({color:0xd6e3ec}));
  introMarker.name='A Place at the Forge marker';introMarker.visible=false;scene.add(introMarker);
  function introductionView(){
    const view=state.introduction(),inside=active===west;
    let next=null;
    if(!view.complete){
      if(active&&active!==west)next=exits[active.kingdom.id];
      else if(view.stage==='unoffered')next=inside?introTargets.smith:introTargets.guard;
      else if(view.stage==='service')next=introTargets.sites.find(site=>state.view('west').remaining.includes(site.id));
      else if(view.stage==='report')next=introTargets.guard;
      else if(!inside)next=introTargets.gate;
      else next=view.stage==='forge'?introTargets.forge:introTargets.smith;
    }
    return {...view,target:next?{...next}:null,targetId:next?.id??null,currentCity:active?.kingdom.id??null,
      inside,repaired:state.view('west').count};
  }
  function refreshWorkpiece(){
    if(!workpiece)return;
    const view=state.introduction(),step=view.forgeStep;
    workpiece.visible=['forge','reward','complete'].includes(view.stage);
    workpiece.userData.forgeStep=step;workpiece.userData.forgeAction=view.forgeAction;
    rivet.scale.set(step>=2?1.3:1,step>=2?.27:1,step>=2?1.3:1);rivet.position.y=step>=2?.103:.2;
    rivetMaterial.color.setHex(step>0&&step<3?0xd16939:0x8c999d);
    rivetMaterial.emissive.setHex(step>0&&step<3?0x9a2109:0x000000);
    rivetMaterial.emissiveIntensity=step===1?.8:step===2?.4:0;
  }
  function animateWorkpiece(dt){
    if(!workpiece)return;
    workAnimation=Math.max(0,workAnimation-dt);
    const working=workAnimation>0&&animatedOperation===2;
    hammer.position.y=working?.23:.14;
    hammer.rotation.z=working?-.35-Math.abs(Math.sin((1.25-workAnimation)*Math.PI*5))*.9:0;
    steamMaterial.opacity=animatedOperation===3?workAnimation*.35:0;
    for(const [i,puff]of steam.entries())puff.position.y=-.1+i*.13+(1.25-workAnimation)*.3;
  }
  refreshWorkpiece();
  function prepareInterior(hold){
    if(hold.built)return;
    buildBaldroInterior(scene,hold.kingdom,{group:hold.group,walk:hold.walk});
    for(const person of people.filter(p=>!p.guard&&p.hold===hold)){
      const model=createDwarf({...person,city:hold.kingdom.id}),group=person.actor.group;
      // Keep the logical actor and its position object stable for collision,
      // dialogue and testing hooks; only attach its detailed rig on entry.
      group.name=model.group.name;Object.assign(group.userData,model.group.userData);group.add(model.group);
      Object.assign(person.actor,model,{group});
    }
    if(hold===west){buildWorkpiece();refreshWorkpiece();}
    hold.built=true;
  }
  function acceptIntroduction(){const result=state.acceptIntroduction();if(result.changed)focus(DWARF_INTRODUCTION.id);return result;}
  const exitPosition=hold=>{const g=hold.kingdom.gate,x=g.x,z=g.z+7;return {x,y:world.heightAt(x,z),z};};
  function leave({relocate=true}={}){
    if(!active)return false;
    const hold=active;active=null;hold.group.visible=false;
    if(relocate){transition();place(player,exitPosition(hold));}
    return true;
  }
  function enter(id){
    const hold=holds.find(h=>h.kingdom.id===id);if(!hold||!state.canEnter(id))return false;
    if(!available())return false;
    prepareInterior(hold);
    leave({relocate:false});transition();active=hold;hold.group.visible=true;place(player,hold.walk.spawn);
    if(hold===west&&state.enterIntroduction().changed)save();
    toast(`${hold.kingdom.name}: hearths and workshops below, the memorial hall up the ramp. The bronze door leads outside.`,'DWARFLAND');return true;
  }
  function nearby(){
    if(active){
      if(distance(player.group.position,active.walk.exit)<2.8)return {kind:'exit',hold:active,label:'Return to the mountain gate'};
      const intro=state.introduction();
      if(active===west&&['forge','reward','complete'].includes(intro.stage)&&distance(player.group.position,introTargets.forge)<1.75)
        return {kind:'forge',id:'west-forge-rivet',hold:west,label:DWARF_FORGE_STEPS[intro.forgeStep]?.label??'Examine the finished repair rivet'};
      const person=people.find(p=>!p.guard&&p.hold===active&&distance(p.actor.group.position,player.group.position)<2.6);
      return person?{kind:'person',person,label:`Speak with ${person.name.toLowerCase()}`}:null;
    }
    const pos=player.group.position;
    const guard=people.filter(p=>p.guard&&Math.abs(p.home.y-pos.y)<3).find(p=>distance(p.home,pos)<2.8);
    if(guard)return{kind:'guard',person:guard,hold:guard.hold,label:`Speak with ${guard.name.toLowerCase()}`};
    for(const hold of holds){const k=hold.kingdom;
      if(Math.abs(pos.y-world.heightAt(pos.x,pos.z))>3)continue;
      if(distance(pos,{x:k.gate.x,z:k.gate.z+2.5})<3.8)return{kind:'gate',hold,label:state.canEnter(k.id)?`Enter ${k.name}`:'Petition the guarded city gate'};
      for(const site of k.taskSites)if(distance(pos,site)<3.3){const view=state.view(k.id);
        return{kind:'site',hold,site,label:view.repaired.includes(site.id)?`${site.name} restored`:`Restore ${site.name.toLowerCase()}`};}
    }
    return null;
  }
  function guardConversation(hold,person){
    const id=hold.kingdom.id,view=state.view(id),lines=[view.detail];
    const choices=[];
    if(view.stage==='unoffered')choices.push({id:`${id}-accept`,label:'I will help maintain the approach.',action:()=>{state.accept(id);closeDialogue();save();toast('Follow the marked approach below this gate. Restore all three sites, then return to the gatekeeper.','EARNING ENTRY');}});
    if(view.stage==='report')choices.push({id:`${id}-report`,label:'The three sites are restored.',action:()=>{const result=state.report(id);if(result.reward)reward(result.reward);closeDialogue();save();toast(result.message||result.reason,'ENTRY EARNED');}});
    if(view.stage==='admitted')choices.push({id:`${id}-enter`,label:`Enter ${hold.kingdom.name}.`,action:()=>{closeDialogue();enter(id);}});
    if(hold===west&&state.introduction().stage==='unoffered'){
      lines.push('Our artisan will show a visitor one guarded method after the approach work is done. Earn passage, then ask for a place at the forge.');
      choices.push({id:'west-baldro-intro-accept',label:'I would like to earn a place at the forge.',action:()=>{
        const result=acceptIntroduction();closeDialogue();save();toast(result.message||state.introduction().detail,DWARF_INTRODUCTION.title);}});
    }
    choices.push({id:`${id}-history`,label:'Tell me about the confederation.',action:()=>openDialogue(person,history,null,'Back to the gate',{noWayfinding:true,onComplete:()=>guardConversation(hold,person)})});
    choices.push({id:`${id}-leave`,label:'Leave the gate.',action:closeDialogue});
    openDialogue(person,lines,null,'Back to the mountains',{choices,noWayfinding:true});
  }
  function artisanConversation(person){
    const intro=state.introduction(),choices=[],lines=[];
    if(['unoffered','enter','smith'].includes(intro.stage)){
      lines.push('You have earned your passage here. If you want to work beside us, start with a fitted repair rivet: a small joint that must hold without shaking loose.',
        'I will teach you this one method. The other techniques of Dwarven Smithing are earned through further lessons. Heat the rivet evenly, fit and peen it, then quench the finished joint.');
      choices.push({id:'west-baldro-lesson',label:'Show me the fitted repair rivet.',action:()=>{
        if(active!==west||!state.canEnter('west'))return;
        acceptIntroduction();const result=state.beginLesson();refreshWorkpiece();closeDialogue();if(result.changed)save();toast(result.message||result.reason,DWARF_INTRODUCTION.title);}});
    }else if(intro.stage==='forge')lines.push('The practice joint is on the southern workbench. Take each operation in order.',intro.detail);
    else if(intro.stage==='reward'){
      lines.push('Both heads sit close and the plates do not shift. Let me check the cooled joint before I call this your first lesson.');
      choices.push({id:'west-baldro-lesson-finish',label:'Here is the finished joint.',action:()=>{
        if(active!==west)return;
        const result=state.finishLesson();for(const earned of result.rewards??[])reward(earned);
        refreshWorkpiece();closeDialogue();if(result.changed)save();toast(result.message||result.reason,DWARF_INTRODUCTION.title);}});
    }else lines.push(intro.complete?'An even heat, a close fit, and a careful check after cooling. You have learned the fitted repair rivet. Other guarded methods will need their own lessons.':intro.detail);
    choices.push({id:'west-baldro-lesson-leave',label:'Return to the workshop.',action:closeDialogue});
    openDialogue(person,lines,null,'Back to the workshop',{choices,noWayfinding:true});
  }
  function interact(){
    const target=nearby();if(!target)return false;
    if(target.kind==='exit'){leave();return true;}
    if(target.kind==='person'){
      if(target.person.hold===west&&target.person.stopId==='smith')artisanConversation(target.person);
      else openDialogue(target.person,localLines[target.person.stopId],null,'Back to the hall',{noWayfinding:true});return true;}
    if(!available()){toast('Approach the gate on foot and at peace.','DWARFLAND');return true;}
    if(target.kind==='forge'){const result=state.workForge();if(result.changed){workAnimation=1.25;animatedOperation=result.forgeStep;}
      refreshWorkpiece();toast(result.message||result.reason,DWARF_INTRODUCTION.title);if(result.changed)save();return true;}
    if(target.kind==='guard'){guardConversation(target.hold,target.person);return true;}
    if(target.kind==='gate'){
      if(!enter(target.hold.kingdom.id))guardConversation(target.hold,people.find(p=>p.guard&&p.hold===target.hold));
      return true;
    }
    const result=state.repair(target.hold.kingdom.id,target.site.id);toast(result.message||result.reason||'This site is restored.','MOUNTAIN WORK');if(result.changed)save();return true;
  }
  const visiblePerson=person=>person.guard?!active&&distance(person.home,player.group.position)<130:person.hold===active;
  function bodies(){
    return people.filter(visiblePerson).map(person=>{
      const at=person.actor.group.position;
      return {id:person.id,r:DWARF_BODY_RADIUS,get x(){return at.x;},get z(){return at.z;},
        get minY(){return at.y;},get maxY(){return at.y+1.5;}};
    });
  }
  function move(position,dx,dz){
    if(!active)return;
    // Indoor floors own their movement instead of the surface body world. Keep
    // the same short collision steps here so neither a sprint nor a long test
    // move can tunnel through a resident; independent axes let a shoulder slide.
    const obstacles=bodies(),steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.18)),sx=dx/steps,sz=dz/steps;
    const attempt=(x,z)=>{
      const next={x:position.x,y:position.y,z:position.z};active.walk.move(next,x,z);
      for(const body of obstacles){
        if(next.y+.02>=body.maxY||next.y+1.8<=body.minY)continue;
        const gap=distance(next,body);
        if(gap<body.r+TRAVELER_BODY_RADIUS&&gap<=distance(position,body)+1e-7)return false;
      }
      position.x=next.x;position.y=next.y;position.z=next.z;return true;
    };
    for(let i=0;i<steps;i++)if(!attempt(sx,sz)){if(sx)attempt(sx,0);if(sz)attempt(0,sz);}
    return position;
  }
  return {model:state,holds,people,enter,leave,nearby,interact,bodies,move,introductionView,introTargets,
    resetIntroductionForTesting(){if(active===west)leave();state.resetIntroductionForTesting();workAnimation=0;refreshWorkpiece();return state.snapshot();},
    get active(){return !!active;},get current(){return active?.kingdom.id??null;},
    get safeEntrance(){return active?exitPosition(active):null;},
    floorAt:(x,z)=>active?.walk.floorAt(x,z)??null,
    camera:(pos,yaw,pitch)=>active?.walk.camera(pos,yaw,pitch),
    snapshot:()=>state.snapshot(),restore(data){const probe=createBaldroState();if(!probe.restore(data))return false;const floor=active?.walk.floorAt(player.group.position.x,player.group.position.z);leave({relocate:floor!=null&&Math.abs(player.group.position.y-floor)<8});const result=state.restore(data);refreshWorkpiece();return result;},
    frame(dt){clock+=dt;
      // Explicit portal ownership cannot survive a testing teleport or other carrier.
      if(active&&(active.walk.floorAt(player.group.position.x,player.group.position.z)===null||Math.abs(player.group.position.y-(active.walk.floorAt(player.group.position.x,player.group.position.z)??0))>8))leave({relocate:false});
      for(const person of people){
        const visible=visiblePerson(person);
        person.actor.group.visible=visible;if(visible)person.actor.animate(clock+person.home.x,0,true);
      }
      for(const {mesh,site,kingdom} of markers){const view=state.view(kingdom.id);
        world.baldro?.setTaskComplete(site.id,view.repaired.includes(site.id));
        mesh.visible=!active&&view.accepted&&!view.admitted&&!view.repaired.includes(site.id)&&distance(site,player.group.position)<150;
        if(mesh.visible){mesh.rotation.y=clock;mesh.position.y=world.heightAt(site.x,site.z)+2.6+Math.sin(clock*2)*.12;}
      }
      refreshWorkpiece();animateWorkpiece(dt);const intro=introductionView();
      introMarker.visible=!!active&&intro.active&&intro.target?.kind!=='site'&&!!intro.target&&distance(intro.target,player.group.position)<150;
      if(introMarker.visible){introMarker.position.set(intro.target.x,intro.target.y+2.4+Math.sin(clock*2)*.12,intro.target.z);introMarker.rotation.y=clock;}
    },
  };
}
