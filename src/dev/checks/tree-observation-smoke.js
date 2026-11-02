import {prepareWarExterior} from './tower-smoke.js';
import {treeSpecies} from '../../world/life/tree-species.js';
import {createTreeLifeList} from '../../app/exploration/tree-life-list.js';

const assert=(value,label)=>{if(!value)throw Error(label);};
const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const press=code=>document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true,cancelable:true}));

export async function observeTrees(a){
  window.dispatchEvent(new Event('focus'));
  if(a.tower)await prepareWarExterior(a);
  a.war?.pause();a.step(0);
  const world=a.testWorld,registry=world.treeRegistry,start=a.snapshot().position;
  assert(registry&&a.birding,'The active world exposes live trees and the nature journal');
  const candidates=registry.trees.filter(t=>treeSpecies(t.species)&&registry.standing(t.id)&&world.readyAt(t.x,t.z))
    .sort((x,y)=>Math.hypot(x.x-start.x,x.z-start.z)-Math.hypot(y.x-start.x,y.z-start.z));
  let tree=null,approach=null;
  for(const candidate of candidates.slice(0,120)){
    for(let i=0;i<12;i++){
      const angle=i*Math.PI/6,r=(candidate.radius??.4)+1.7,x=candidate.x+Math.sin(angle)*r,z=candidate.z+Math.cos(angle)*r;
      const probe=a.groundProbe(x,z),p={x,y:probe.height,z};
      if(probe.clear&&probe.water<probe.height-.1&&world.treeTarget(p)?.id===candidate.id){
        await a.visit(p);a.step(0);
        // Town conversation prompts keep their ordinary F priority. Choose a
        // clear observation approach rather than bypassing those interactions.
        if(a.birding.state().target?.id===candidate.id){tree=candidate;approach=p;break;}
      }
    }
    if(tree)break;
  }
  assert(tree,'A real, visible, grounded tree can be approached without walking through scenery');
  a.step(0);await frames();
  assert(a.birding.state().target?.id===tree.id,'The ordinary F prompt identifies the visible tree at the player');
  const birds=a.birding.state().species,beforeClock=a.war?.clock().elapsedSeconds;
  press('KeyF');await frames();
  assert(a.birding.state().open&&a.birding.state().category==='trees','F opens the Trees observation card');
  const entry=treeSpecies(tree.species),dialog=document.getElementById('birding-dialog');
  assert(a.birding.state().treeSpecies.includes(entry.id),'The actual species enters the tree life list');
  assert(dialog.textContent.includes(entry.name)&&dialog.textContent.includes(entry.identification),'The card shows this species and its identifying features');
  if(entry.scientificName)assert(dialog.textContent.includes(entry.scientificName),'The card includes the botanical name');
  for(let i=0;i<10;i++)a.step(.04);
  if(a.war)assert(a.war.clock().elapsedSeconds===beforeClock,'Reading tree notes leaves campaign time held');
  const storage=window.azhoraExplorationStorage??window.localStorage;
  assert(createTreeLifeList(storage).species().includes(entry.id),'A fresh journal model reads the durable desktop observation');
  document.getElementById('nature-life-birds').click();
  assert(a.birding.state().category==='birds'&&JSON.stringify(a.birding.state().species)===JSON.stringify(birds),'Bird observations remain intact in their own tab');
  document.getElementById('nature-life-trees').click();
  press('Escape');a.step(0);press('KeyJ');await frames();
  assert(a.birding.state().open&&dialog.textContent.includes(entry.name),'J reopens the nature journal with the recorded tree');
  press('Escape');a.step(0);

  // Use the live registry lifecycle: a felled slot is still stored, but its
  // stump must not remain a prompt. Restore it for the next native check.
  if(tree.harvestable!==false){
    registry.set(tree.id,false);a.step(0);
    try{assert(a.birding.state().target?.id!==tree.id,'A felled tree immediately leaves the observation prompt');}
    finally{registry.set(tree.id,true);a.step(0);}
    assert(a.birding.state().target?.id===tree.id,'Restoring the same tree restores its target without a duplicate');
  }else assert(!registry.fell(tree.id)&&a.birding.state().target?.id===tree.id,'Protected scenery remains observable without allowing felling');
  assert(a.birding.state().treeSpecies.filter(id=>id===entry.id).length===1,'Repeated discovery remains one species record');
  assert(!a.state().frameErrors.length,'Observation, journal tabs and tree restoration render without errors');
  press('KeyJ');await frames();
  window.dispatchEvent(new Event('blur'));await frames();
  return {checks:['Real tree approach and F observation','Scientific name and identifying features','Durable notes preserve bird records','Birds/Trees tabs and J shortcut',tree.harvestable!==false?'Felled/restored instance target':'Protected tree observation'],tree:{id:tree.id,species:tree.species},approach,observed:a.birding.state().treeSpecies,render:a.renderStats()};
}
