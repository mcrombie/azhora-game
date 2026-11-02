import {createBirdLifeList} from './bird-life-list.js';
import {createTreeLifeList} from './tree-life-list.js';
import {TOWER_BIRDS} from '../../content/regions/minora-frontier/tower-bird-roster.js';
import {TREE_SPECIES_BY_ID} from '../../world/life/tree-species.js';
import {writeHud} from './hud-write.js';

export function createBirdingHost({world,position,mode,setMode,storage,treeAvailable=()=>true}){
  const life=createBirdLifeList(storage),trees=createTreeLifeList(storage),prompt=document.createElement('button'),journal=document.createElement('button'),dialog=document.createElement('dialog');
  prompt.id='bird-observe';prompt.hidden=true;journal.id='bird-life-list';journal.textContent='Nature life list · J';
  dialog.id='birding-dialog';dialog.className='arrival-dialog';dialog.setAttribute('aria-label','Nature observations');
  const heading=document.createElement('h2'),copy=document.createElement('p'),list=document.createElement('ul'),closeButton=document.createElement('button');closeButton.textContent='Return to exploring';
  const tabs=document.createElement('div'),buttons={};tabs.className='nature-life-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Observation categories');
  list.id='nature-life-entries';list.setAttribute('role','tabpanel');
  for(const [id,name] of [['birds','Birds'],['trees','Trees']]){
    const button=document.createElement('button');button.id='nature-life-'+id;button.textContent=name;button.dataset.category=id;
    button.setAttribute('role','tab');button.setAttribute('aria-controls',list.id);button.onclick=()=>{category=id;render();};
    tabs.append(button);buttons[id]=button;
  }
  dialog.append(heading,copy,tabs,list,closeButton);document.body.append(prompt,journal,dialog);
  let opened=false,category='birds',observation=null,result=null;
  function target(){
    if(mode()!=='playing')return null;
    const bird=world.towerBirdTarget?.(position);
    return bird?{...bird,category:'birds'}:treeAvailable()?world.treeTarget?.(position)??null:null;
  }
  function render(){
    const selected=observation?.category===category?observation:null;
    heading.textContent=selected?selected.name:'Your nature life list';
    const added=result?.added?'Added to your life list.':'Already on your life list.';
    if(selected&&result&&!result.ok)copy.textContent=result.reason;
    else if(selected?.category==='trees'){
      const entry=TREE_SPECIES_BY_ID[selected.species];
      const names=[...new Set([selected.localName,...(entry.localNames??[])].filter(name=>name&&name!==entry.name))];
      copy.textContent=[entry.scientificName,entry.identification,entry.habitat,names.length?'Local names: '+names.join(', ')+'.':null,added].filter(Boolean).join(' ');
    }else if(selected?.species==='barn-owl')copy.textContent='A pale, heart-shaped face, dark eyes and warm golden wings. Taleth’s barn owl watches you quietly, then turns to inspect its room. '+added;
    else copy.textContent=selected?added:'Birds and trees you have taken the time to observe. Your field notes stay with you as you explore.';
    list.replaceChildren();
    for(const id of (category==='birds'?life:trees).species()){
      const entry=category==='birds'?TOWER_BIRDS.find(b=>b.species===id):TREE_SPECIES_BY_ID[id],item=document.createElement('li');
      item.textContent=entry.name;
      if(category==='trees'){
        const detail=document.createElement('small');detail.textContent=[entry.scientificName,entry.identification,entry.localNames?.length?'Local names: '+entry.localNames.join(', '):null].filter(Boolean).join(' · ');item.append(detail);
      }
      list.append(item);
    }
    if(!list.children.length){const item=document.createElement('li');item.textContent=`No ${category} observed yet. Approach ${category==='trees'?'a tree':'a tower bird'} and press F or click Observe.`;list.append(item);}
    for(const [id,button] of Object.entries(buttons)){button.setAttribute('aria-selected',String(id===category));button.tabIndex=id===category?0:-1;}
    list.setAttribute('aria-labelledby',buttons[category].id);
  }
  function show(subject=null){
    if(mode()!=='playing')return false;
    observation=subject;if(subject)category=subject.category;
    result=subject?(category==='trees'?trees:life).observe(subject.species):null;render();
    opened=true;setMode('briefing');dialog.showModal();closeButton.focus();update();return true;
  }
  function close(){if(!opened)return;opened=false;dialog.close();setMode('playing');update();}
  function interact(){const subject=target();return subject?show(subject):false;}
  function update(){const subject=target();writeHud(prompt,'hidden',!subject);if(subject)writeHud(prompt,'textContent','F / Observe '+subject.name);writeHud(journal,'hidden',mode()!=='playing');}
  prompt.onclick=interact;journal.onclick=()=>show();closeButton.onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  return {interact,update,state:()=>({species:life.species(),treeSpecies:trees.species(),category,open:opened,target:target()}),
    keydown(e){if(opened){if(e.code==='Escape'){e.preventDefault();close();}else if(['ArrowLeft','ArrowRight'].includes(e.code)&&Object.values(buttons).includes(document.activeElement)){e.preventDefault();category=category==='birds'?'trees':'birds';render();buttons[category].focus();}return true;}if(e.code==='KeyJ'&&!e.shiftKey&&mode()==='playing'&&!e.repeat){e.preventDefault();show();return true;}return false;},
    dispose(){dialog.remove();prompt.remove();journal.remove();},
  };
}
