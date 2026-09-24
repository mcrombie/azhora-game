import {LUSCIA_OPERATIVE_ID,LUSCIA_SOLDIER_ID,validateLusciaCivilWarSnapshot} from './luscia-civil-war.js';

/** Native UI checks in a dedicated testing save. prepare stages a completed road
 * report; all subsequent assignment/recruitment choices use live dialogue buttons. */
export async function runRepublicDesktopChecks(h){
  let checks=0;
  const assert=(ok,message)=>{checks++;if(!ok)throw new Error(`Luscia Republic desktop: ${message}`);};
  const get=name=>h[`get${name}`]?.()??h[name[0].toLowerCase()+name.slice(1)];
  const healthy=()=>assert(!h.readState().frameErrors?.count,'the renderer reported a frame error');
  const choose=id=>{
    let button;
    for(let page=0;page<9;page++){
      button=document.querySelector(`#dialogue-choices button[data-choice="${id}"]`);
      if(button)break;h.nextSpeech();
    }
    assert(button&&!button.disabled,`missing real dialogue choice ${id}`);button.click();
  };
  const open=async id=>{
    h.closeDialogue();const npc=h.npcById.get(id),p=npc?.actor?.group?.position;
    assert(p&&npc.role,`${id} has no actual NPC actor or dialogue role`);
    h.player.group.position.set(p.x+1.8,p.y,p.z+1.8);
    await h.frames(2);h.conversation(npc);
  };
  const fresh=async()=>{
    h.closeDialogue();await h.prepare();await h.frames(3);healthy();
    assert(get('Luscia').state.started,'fixture did not reach Iven after the road report');
    assert(get('Republic').state().soldier==='unmet','fixture reused a previous Republican encounter');
    assert(!h.inventory.has('courier-satchel'),'fixture retained a previous physical satchel');
  };
  const save=async()=>{
    const stored=await h.saveRead();
    assert(stored?.ok,`native checkpoint rejected: ${stored?.reason??'no result'}`);
    assert(validateLusciaCivilWarSnapshot(stored.data?.lusciaCivilWar,{allowMissing:false}),'native checkpoint omitted the Republican branch');
    return stored.data;
  };

  await fresh();
  await open('relay-clerk');choose('accept-lauvel-search');
  assert(get('Story').satchel().assignee==='player','Iven did not assign the unique job to the player');
  const remaining=get('Story').satchel().deadlineAt-get('Story').clock();
  assert(remaining>599&&remaining<=600,'Iven did not set the ten-minute deadline');
  await open(LUSCIA_SOLDIER_ID);choose('luscia-listen-republican');
  assert(h.inventory.count('courier-satchel')===1&&get('Story').satchel().carrier==='player','Davin did not transfer exactly one physical satchel');
  assert(get('Republic').state().introduced&&get('Republic').state().path===null,'listening silently committed a faction');
  assert(get('Campaign').view().side!=='coalition','a provisional promise switched the main campaign');
  const carried=await save();
  assert(carried.livingStory.satchel.carrier==='player','saved ledger lost physical ownership');
  const copper=h.inventory.count('copper-piece');
  await open('relay-clerk');choose('return-courier-satchel');
  assert(!h.inventory.has('courier-satchel')&&get('Story').satchel().completedBy==='player','delivery left another copy in the inventory');
  assert(h.inventory.count('copper-piece')===copper+20,'recovery pay was not issued exactly once');
  assert(get('Republic').state().path===null&&!get('Republic').state().betrayed,'ordinary delivery reported the Republican network');
  const horseClaims=JSON.stringify(get('Story').snapshot().horses);
  await open(LUSCIA_OPERATIVE_ID);choose('luscia-join-republic');await h.frames(3);
  assert(get('Campaign').view().side==='coalition'&&get('Campaign').view().entryOrigin==='luscia','Hara did not start the Republican main campaign');
  assert(get('Border').view().objectiveId==='solis-captain','Republican gold objective does not point to Captain Arlen Voss');
  assert(!get('Border').snapshot().ordered,'Republican recruitment invented Imperial orders');
  assert(!get('Republic').view().complete,'recruitment prematurely completed the local silver quest');
  assert(JSON.stringify(get('Story').snapshot().horses)===horseClaims,'Republican recruitment changed remount ownership');
  const joined=await save();
  assert(joined.campaign.entryOrigin==='luscia'&&joined.border.entryOrigin==='luscia','checkpoint did not preserve the converged Republican campaign');
  healthy();

  // Consequence fixture: killing the relay soldier closes his introduction,
  // but an actual Mind Read of the living operative can still open recruitment.
  await fresh();get('Republic').npcKilled(LUSCIA_SOLDIER_ID);
  await open(LUSCIA_OPERATIVE_ID);
  for(let page=0;page<5;page++)h.nextSpeech();
  assert(!document.querySelector('#dialogue-choices button[data-choice="luscia-join-republic"]'),'an uninformed traveler recruited through ordinary small talk');
  h.closeDialogue();
  assert(get('Republic').mindRead({targetId:LUSCIA_OPERATIVE_ID}),'Mind Read did not discover the living Nothom operative');
  await open(LUSCIA_OPERATIVE_ID);choose('luscia-join-republic');
  assert(get('Campaign').view().side==='coalition','prior violence permanently blocked the Mind Read entry route');
  assert(get('Story').satchel().carrier!=='player'&&!h.inventory.has('courier-satchel'),'Mind Read fabricated a satchel pickup');
  assert(get('Story').satchel().status!=='delivered','Mind Read silently finished the unique courier job');
  const secondChance=await save();healthy();

  await fresh();get('Republic').npcKilled(LUSCIA_OPERATIVE_ID);
  assert(!get('Republic').mindRead({targetId:LUSCIA_OPERATIVE_ID}),'a dead operative still offered Republican recruitment');
  healthy();h.closeDialogue();h.setMode?.('pause');
  return {ok:true,checks,frameErrors:h.readState().frameErrors,
    carried:carried.livingStory.satchel,joined:{campaign:joined.campaign,border:joined.border,local:joined.lusciaCivilWar},
    secondChance:secondChance.lusciaCivilWar,
    note:'Native dialogue, physical item, faction fork and checkpoint checks; combat and road simulation run separately.'};
}
