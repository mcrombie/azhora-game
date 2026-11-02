import * as THREE from 'three';
import {CANERD,CANERD_GARDEN} from '../../content/regions/canerd/canerd-world.js';
import {CANERD_RESIDENTS} from '../../content/regions/canerd/canerd-residents.js';
import {treeSpecies} from '../../world/life/tree-species.js';

const assert=(value,label)=>{if(!value)throw Error('Canerd: '+label);};
const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const press=code=>{for(const type of ['keydown','keyup'])document.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));};
const state=a=>a.testWorld.canerdState();
const point=(x,z)=>({x:CANERD.x+x,z:CANERD.z+z});
const player=a=>a.snapshot().position;
const household=a=>state(a).people??[];
const oak=a=>state(a).oak;
const closedEyes=face=>face.eyes.length===2&&face.eyes.every(eye=>!eye.irisVisible&&!eye.pupilVisible&&eye.socketScaleY<.04);
const openEyes=face=>face.eyes.length===2&&face.eyes.every(eye=>eye.irisVisible&&eye.pupilVisible&&eye.socketScaleY>.25);

function conversationHeroVisibility(a){
  const castle=a.testWorld.canerd.root,camera=new THREE.Vector3(...a.state().cameraPosition),hero=player(a);
  const panel=document.querySelector('#resident-dialog .tower-dialog-card').getBoundingClientRect();
  assert(a.state().heroVisible&&panel.width>0&&panel.height>0,'The traveler and conversation card are drawn');
  castle.updateWorldMatrix(true,true);a.testHero.group.updateWorldMatrix(true,true);
  const head=a.testHero.group.getObjectByName('Head');
  assert(head,'The traveler has an actual head to frame');
  const samples=[['torso',new THREE.Vector3(hero.x,hero.y+1.05,hero.z)],['head',head.localToWorld(new THREE.Vector3(0,.18,0))]];
  const visible=object=>{for(let owner=object;owner;owner=owner.parent)if(!owner.visible)return false;return true;};
  const rays=samples.map(([part,target])=>{
    const distance=camera.distanceTo(target),ray=new THREE.Raycaster(camera,target.clone().sub(camera).normalize(),0,distance-.12);
    const hit=ray.intersectObject(castle,true).find(result=>visible(result.object));
    assert(!hit,`The ${part} is blocked by ${hit?.object.name??'castle geometry'} ${hit?.distance.toFixed(2)} metres from the camera`);
    const projected=a.project(target),screen={x:(projected.x+1)*innerWidth/2,y:(1-projected.y)*innerHeight/2};
    assert(projected.z>-1&&projected.z<1&&screen.x>8&&screen.x<innerWidth-8&&screen.y>8&&screen.y<panel.top-8,
      `The ${part} stays on screen above the dialogue: ${JSON.stringify({screen,dialogueTop:panel.top})}`);
    return {part,point:target.toArray(),screen,distance,unobstructed:true};
  });
  return {camera:camera.toArray(),dialogueTop:panel.top,rays};
}

async function advance(a,seconds){
  for(let i=0;i<Math.ceil(seconds/.05);i++){
    a.step(.05,.05);
    if(i%20===19)await frames();
  }
}

async function until(a,predicate,label){
  const end=performance.now()+30000;
  while(!predicate()){
    assert(!state(a).error,'Household load failed: '+state(a).error);
    assert(performance.now()<end,label);a.step(.04,.04);await frames();
  }
}

async function capture(a){
  assert(!a.state().frameErrors.length,'No frame errors during castle review');
  window.dispatchEvent(new Event('blur'));await frames();
}

async function walk(a,goals){
  const legs=[];
  for(const goal of goals){
    const begin={...player(a)},length=Math.hypot(goal.x-begin.x,goal.z-begin.z);
    let steps=0,stalled=0,walked=0;
    try{
      while(Math.hypot(goal.x-player(a).x,goal.z-player(a).z)>.2){
        assert(++steps<Math.ceil(length/.1)*3+80,'Ordinary walking reaches '+JSON.stringify(goal));
        const before={...player(a)},dx=goal.x-before.x,dz=goal.z-before.z;
        a.look({yaw:Math.atan2(-dx,-dz),pitch:.24,distance:8});a.hold('KeyW',true);a.step(.04,.04);
        const after=player(a),moved=Math.hypot(after.x-before.x,after.z-before.z);
        walked+=moved;stalled=moved<.001?stalled+1:0;
        assert(stalled<12,'Gate, hall or stable path is blocked at '+JSON.stringify(after));
        const floor=a.testWorld.supportAt?.(after.x,after.z,{maxY:after.y,stepUp:.45,groundSlope:false})?.height??a.testWorld.heightAt(after.x,after.z);
        assert(Math.abs(after.y-floor)<.35,'The traveler stays on the visible castle floor');
        assert(a.testWorld.waterAt(after.x,after.z)<after.y-.1,'The castle route stays dry');
        if(steps%50===0){a.hold('KeyW',false);await frames();}
      }
    }finally{a.hold('KeyW',false);}
    legs.push({from:begin,to:{...player(a)},walked,steps});
  }
  return legs;
}

async function approachResident(a,id){
  const resident=household(a).find(p=>p.id===id);
  assert(resident?.visible,'The intended household member is drawn: '+id);
  for(const radius of [2.4,2.9,1.9,3.3])for(let i=0;i<16;i++){
    const angle=i*Math.PI/8,x=resident.x+Math.sin(angle)*radius,z=resident.z+Math.cos(angle)*radius;
    const probe=a.groundProbe(x,z),at={x,y:probe.height,z};
    if(!probe.clear||probe.water>=probe.height-.1||a.testWorld.residentTarget(at)?.id!==id)continue;
    await a.visit(at);a.step(0,0);
    if(a.testWorld.residentTarget(player(a))?.id===id){
      a.look({yaw:angle,pitch:.2,distance:6});return at;
    }
  }
  throw Error('Canerd: no clear conversation approach to '+id);
}

async function observeCastleTree(a){
  const trees=a.testWorld.treeRegistry?.trees.filter(tree=>treeSpecies(tree.species)&&Math.hypot(tree.x-CANERD.x,tree.z-CANERD.z)<65)??[];
  assert(trees.length,'The loaded castle has real registered trees to observe');
  for(const tree of trees)for(const extra of [1.5,2.3,3.1])for(let i=0;i<16;i++){
    const angle=i*Math.PI/8,radius=(tree.radius??.5)+extra,x=tree.x+Math.sin(angle)*radius,z=tree.z+Math.cos(angle)*radius;
    const probe=a.groundProbe(x,z),at={x,y:probe.height,z};
    if(!probe.clear||probe.water>=probe.height-.1||a.testWorld.residentTarget(at)||a.testWorld.treeTarget(at)?.id!==tree.id)continue;
    await a.visit(at);a.step(0,0);
    await until(a,()=>a.birding.state().target?.id===tree.id,'The ordinary Nature prompt finds the castle tree');
    press('KeyF');await frames();
    const species=treeSpecies(tree.species);
    assert(a.birding.state().open&&a.birding.state().treeSpecies.includes(species.id),'F records an actual castle tree before the wizard reads the journal');
    press('Escape');a.step(0,0);return {id:tree.id,species:species.id};
  }
  throw Error('Canerd: no clear ordinary observation approach to a castle tree');
}

export async function arrival(a){
  window.dispatchEvent(new Event('focus'));a.resume();
  assert(a.residentHost&&typeof a.testWorld.canerdState==='function','Explore exposes the ordinary castle conversation host');
  assert(!a.stable?.mounted,'The castle walking review begins on foot');
  await a.visit({...CANERD.gate,z:CANERD.gate.z+10});
  await until(a,()=>state(a).loaded&&household(a).length===6&&household(a).every(p=>p.visible),'All six local people finish their lazy build');
  assert(a.testWorld.canerd?.root,'The actual loaded castle scene is exposed');
  const legs=await walk(a,[point(0,24),CANERD.courtyard,point(-5,4),point(-5,-12),point(-5,4),point(0,4),point(19,4),point(19,-12),point(19,4),point(0,4),CANERD.courtyard]);
  a.look({yaw:Math.PI*.05,pitch:.34,distance:23});await capture(a);
  return {checks:['Lazy castle household loading','Ordinary gate, hall and stable walking','Dry supported route'],legs,people:household(a),render:a.renderStats()};
}

export async function sleepingOak(a){
  window.dispatchEvent(new Event('focus'));
  await a.visit(CANERD_GARDEN.approach);await advance(a,1.6);
  const face=oak(a);assert(face&&!face.awake&&face.open<.05&&closedEyes(face),'The sacred oak rests with its rendered eyes shut');
  assert(a.testWorld.residentTarget(player(a))?.id===CANERD_GARDEN.oak.id,'The oak is an ordinary F conversation target');
  assert(!document.getElementById('resident-interact').hidden,'The visible interaction prompt belongs to the oak');
  a.look({yaw:-Math.PI/2,pitch:.22,distance:7});await capture(a);
  return {checks:['Sleeping oak','Approachable garden path'],oak:face,render:a.renderStats()};
}

export async function talkingOak(a){
  window.dispatchEvent(new Event('focus'));
  const trees=a.birding.state().treeSpecies,before=a.snapshot().elapsed;
  press('KeyF');await advance(a,1.6);
  const face=oak(a),words=document.getElementById('resident-words').textContent;
  assert(a.residentHost.state().speaking===CANERD_GARDEN.oak.id&&a.state().mode==='briefing','F opens the oak conversation');
  assert(face.awake&&face.open>.95&&face.speaking&&openEyes(face),'The rendered oak opens its eyes and speaks');
  assert(words.trim(),'The oak has authored conversation text');
  assert(a.snapshot().elapsed===before,'Conversation holds the exploration clock');
  assert(JSON.stringify(a.birding.state().treeSpecies)===JSON.stringify(trees),'Talking does not invent a tree discovery');
  const heroVisibility=conversationHeroVisibility(a);
  await capture(a);return {checks:['F conversation','Eyes open and speaking','Unobstructed traveler above dialogue','Journal and exploration clock unchanged'],oak:face,words,heroVisibility,render:a.renderStats()};
}

export async function closedOak(a){
  window.dispatchEvent(new Event('focus'));press('Escape');await advance(a,2.1);
  const face=oak(a);
  assert(a.state().mode==='playing'&&a.residentHost.state().speaking===null,'Escape returns control to the traveler');
  assert(!face.awake&&face.open<.05&&!face.speaking&&closedEyes(face),'The oak closes its rendered eyes again after Goodbye');
  await capture(a);return {checks:['Goodbye closes the oak eyes','Exploration resumes'],oak:face,render:a.renderStats()};
}

export async function civilianLife(a){
  window.dispatchEvent(new Event('focus'));await a.visit(point(-3,20));a.step(0,0);
  const before=household(a),ids=before.map(p=>p.id).sort(),expected=CANERD_RESIDENTS.map(p=>p.id).sort();
  assert(JSON.stringify(ids)===JSON.stringify(expected)&&new Set(ids).size===6,'Exactly the six authored civilians are present');
  assert(before.every(p=>p.visible&&p.species==='human'&&p.faction==='celder'&&p.occupation),'The household consists of six visible human people with jobs');
  assert(before.every(p=>p.routeClear),'Every work routine fits the built garden and castle');
  await advance(a,25);
  const after=household(a),movement=after.map(p=>{
    const old=before.find(q=>q.id===p.id);
    assert(p.visible&&Math.abs(p.y-a.testWorld.renderedGroundHeight(p.x,p.z))<.08,'The working resident remains visibly grounded: '+p.id);
    assert(p.animationTime>old.animationTime+20,'Ordinary character animation continues: '+p.id);
    const walked=p.distanceWalked-old.distanceWalked;
    if(p.id!=='canerd-arbor-wizard')assert(walked>.5,'The job routine includes actual walking: '+p.id);
    return {id:p.id,occupation:p.occupation,walked,activity:p.activity,position:p.position};
  });
  a.look({yaw:.35,pitch:.4,distance:24});await capture(a);
  return {checks:['Six distinct human jobs','Five short working walks','Wizard idle/work animation','Grounded movement'],movement,render:a.renderStats()};
}

export async function wizardJournal(a){
  window.dispatchEvent(new Event('focus'));
  const observation=a.birding.state().treeSpecies.length?null:await observeCastleTree(a);
  const id='canerd-arbor-wizard';await approachResident(a,id);
  await until(a,()=>!document.getElementById('resident-interact').hidden,'The Arbor Wizard has an ordinary F prompt');
  const list=a.birding.state().treeSpecies,before=a.snapshot().elapsed;
  press('KeyF');
  assert(a.residentHost.state().speaking===id,'F reaches the Arbor Wizard');
  const button=document.querySelector('#resident-dialog [data-topic="lifelist"]');
  assert(button&&!button.hidden,'The wizard offers to discuss the existing tree life list');button.click();
  const words=document.getElementById('resident-words').textContent;
  if(!list.length)assert(/empty list/i.test(words),'The wizard recognizes an empty journal');
  else{
    assert(words.includes(String(list.length)),'Commentary uses the actual recorded species count');
    assert(list.some(key=>words.includes(treeSpecies(key).name)),'Commentary names a species actually observed');
  }
  const position=household(a).find(p=>p.id===id).position;
  await advance(a,1);
  assert(JSON.stringify(household(a).find(p=>p.id===id).position)===JSON.stringify(position),'The wizard stays still while speaking');
  assert(a.snapshot().elapsed===before&&JSON.stringify(a.birding.state().treeSpecies)===JSON.stringify(list),'Commentary changes neither clock nor life list');
  await capture(a);return {checks:['Wizard F conversation','Commentary matches actual life list','Read-only conversation'],observation,observed:list,words,render:a.renderStats()};
}
