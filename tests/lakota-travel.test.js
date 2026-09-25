import test from 'node:test';
import assert from 'node:assert/strict';
import {createLakota,lakotaTravelChoice} from '../src/lakota.js';
import {createCompanions,COMPANION_IDS,ASKS} from '../src/companions.js';
import {birdWatcherConversation,BIRD_WATCHER} from '../src/birding.js';

function fixture(){
  const npc={id:'merc-lakota',name:'Lakota'},companions=createCompanions(),dialogs=[];
  const current={trained:true,where:'road',has:{birded:true},phase:'walking',restriction:null};
  let changed=0,closed=0,returned=0;
  const params={npc,companions,context:()=>current,openDialogue:(person,lines,event,label,options)=>dialogs.push({person,lines,label,...options}),
    closeDialogue:()=>closed++,back:()=>returned++,onChange:()=>changed++};
  return {npc,companions,current,dialogs,params,choice:()=>lakotaTravelChoice(params),changed:()=>changed,closed:()=>closed,returned:()=>returned};
}

test('Lakota has an explicit invitation before and after his personal introduction',()=>{
  const f=fixture(),lakota=createLakota();
  const context={birding:{met:false,hasSeen:()=>false},lakota,openDialogue:f.params.openDialogue,closeDialogue:f.params.closeDialogue,act(){},
    travelChoice:f.choice(),mercenaryChoices:[{id:'merc-style',label:'How do you fight?',action(){}},{id:'merc-trade',label:'Trade?',action(){}}]};
  for(const known of [false,true]){
    if(known)lakota.know();
    birdWatcherConversation(BIRD_WATCHER,context);
    assert.equal(f.dialogs.at(-1).choices[0].id,'merc-ask');
    assert.match(f.dialogs.at(-1).choices[0].label,/Join me/);
    assert.equal(f.dialogs.at(-1).choices.filter(choice=>choice.id==='merc-ask').length,1);
  }
});

test('an eligible invitation joins Lakota once and switches to sending him ahead',()=>{
  const f=fixture();f.choice().action();
  assert.equal(f.companions.walksWith(f.npc.id),true);assert.equal(f.changed(),1);
  assert.match(f.dialogs.at(-1).lines[0],/I will come/);
  f.dialogs.at(-1).onComplete();assert.equal(f.closed(),1);
  const send=f.choice();assert.equal(send.id,'merc-send-on');send.action();
  assert.equal(f.companions.walksWith(f.npc.id),false);assert.equal(f.changed(),2);
  assert.equal(f.choice().id,'merc-ask');
});

test('before training the invitation remains visible and explains the combat lesson requirement',()=>{
  const f=fixture();f.current.trained=false;
  assert.equal(f.choice().id,'merc-ask');f.choice().action();
  assert.match(f.dialogs.at(-1).lines.join(' '),/Finish Officer Glun's training/);
  assert.equal(f.companions.walksWith(f.npc.id),false);assert.equal(f.changed(),0);
  f.dialogs.at(-1).onComplete();assert.equal(f.returned(),1);
});

test('a birding prerequisite explains Jean and the observation key instead of hiding recruitment',()=>{
  const f=fixture();f.current.has.birded=false;
  const invite=f.choice();assert.equal(invite.id,'merc-ask');invite.action();
  assert.match(f.dialogs.at(-1).lines.join(' '),/Jean/);assert.match(f.dialogs.at(-1).lines.join(' '),/press B/);
  assert.equal(f.companions.walksWith(f.npc.id),false);
  f.current.has.birded=true;invite.action();assert.equal(f.companions.walksWith(f.npc.id),true,'eligibility is reread at click time');
});

test('story and location restrictions stay intact and have visible explanations',()=>{
  const f=fixture(),invite=f.choice();f.current.restriction='We are marching under orders. Ask me after the line is released.';
  invite.action();assert.match(f.dialogs.at(-1).lines.join(' '),/marching under orders/);assert.equal(f.companions.walksWith(f.npc.id),false);
  f.current.restriction=null;f.current.where=null;f.current.phase='mustered';invite.action();
  assert.match(f.dialogs.at(-1).lines.join(' '),/reported to the muster/);assert.equal(f.companions.walksWith(f.npc.id),false);
  f.current.where='landing';f.current.phase='landing';invite.action();
  assert.match(f.dialogs.at(-1).lines.join(' '),/get onto the road/);assert.equal(f.companions.walksWith(f.npc.id),false);
});

test('the invitation preserves the game\'s uncapped company and does not replace other companion rules',()=>{
  const f=fixture();
  for(const id of COMPANION_IDS.filter(id=>id!=='merc-lakota')){
    const ask=ASKS[id];assert.equal(f.companions.ask(id,{where:ask.where,has:{charted:true,birded:true,edge:true}}).ok,true);
  }
  f.choice().action();assert.equal(f.companions.walksWith('merc-lakota'),true);
  assert.equal(f.companions.walking.length,COMPANION_IDS.length);
  assert.equal(lakotaTravelChoice({...f.params,npc:{id:'merc-word'}}),null);
});
