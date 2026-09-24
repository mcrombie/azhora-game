/** Glue for shared opportunities, physical handover, and the Imperial recall.
 * Story owns persistence; this adapter only acts on people within reach. */
export function createLivingStoryHost({ story, inventory, npcById, combat, position,
  openDialogue, closeDialogue, toast = () => {}, save = () => {}, refresh = () => {}, stopInput = () => {}, route, riding,
  onMuster = () => {}, onRefusal = () => {}, onBridge = () => {}, onTransport = () => {},
  onTrust = () => {}, getMode = () => 'playing' } = {}) {
  const model = () => typeof story === 'function' ? story() : story;
  const pilot = () => typeof route === 'function' ? route() : route;
  let offered = null, handoverAsked = null;
  const name = id => id === 'player' ? 'you' : npcById.get(id)?.name ?? model().actor(id)?.name ?? id;
  const near = id => {const at=npcById.get(id)?.actor?.group?.position,p=position();return !!at&&Math.hypot(at.x-p.x,at.z-p.z)<3.4;};
  const changed = () => {inventory.refresh?.();refresh();save();};
  function reportPlayer() {
    const s=model(),result=s.reportNothom('player');
    if(!result.ok)return result;
    const reservation=s.snapshot().horses.find(h=>h.owner==='player');
    if(reservation&&!reservation.claimed&&!riding.owned&&!inventory.has('horse-token'))inventory.add('horse-token',1);
    changed();
    return result;
  }
  function horseNote() {
    const s=model();return s.horseFor('player')
      ? `One of the four remounts is reserved in your name. ${s.availableHorses()} remain for later arrivals.`
      : 'All four remounts have been allocated. You can still report to the muster and march on foot.';
  }
  function satchelNote() {
    const s=model(),q=s.satchel();
    if(q.status==='delivered')return `The courier's rolls were returned by ${name(q.completedBy)}. This assignment is finished.`;
    if(q.assignee==='player') {
      const remain=Math.max(0,Math.ceil(q.deadlineAt-s.clock()));
      const due=s.calendarAt(q.deadlineAt);
      return `Due ${due.label}, ${due.time} · ${Math.floor(remain/60)}m ${remain%60}s remaining. Menus pause the deadline.`;
    }
    if(q.handover?.from==='player')return `${name(q.handover.to)} has been sent to collect the satchel. You may still deliver it to Iven before handing it over.`;
    return q.assignee?`Iven assigned the satchel to ${name(q.assignee)}. You may continue to the muster.`:'';
  }
  function askRecall(id) {
    const s=model(),npc=npcById.get(id);
    if(!npc||!near(id)||getMode()!=='playing'||combat.state.phase==='active')return false;
    if(s.recall().status==='seeking'&&!s.recallArrived(id))return false;
    // Esc closes the dialogue but must not strand the persistent offer. The mode gate
    // above prevents duplicate windows while one is actually open.
    if(s.recall().status!=='offered'||s.recall().courier!==id)return false;
    offered=id;stopInput();
    const valid=()=>model()===s&&s.recall().courier===id&&s.recall().status==='offered'&&near(id)
      &&s.player().allegiance==='empire'&&!s.player().imperialRefused&&s.actor(id)?.alive;
    openDialogue(npc,["The surviving Imperial recruits are at the Moros muster. We are preparing to march against the Republic. Are you still coming? I can carry you back on my horse.",
      'If you refuse, your Imperial campaign ends permanently. You can still explore and seek Republican recruitment through the living, free operative in Nothom.'],null,'Choose',{noWayfinding:true,choices:[
      {id:'recall-yes',label:'Yes. Take me to the muster.',action(){closeDialogue();offered=null;if(valid()&&s.answerRecall(true)){if(riding.mounted)riding.dismount();pilot()?.setCourier({id,mode:'passenger'});changed();}}},
      {id:'recall-no',label:'No. Permanently refuse the Imperial campaign.',action(){
        if(!valid()){closeDialogue();offered=null;return;}
        openDialogue(npc,['This ends your Imperial service for this save. You will not receive another summons. Republican recruitment remains possible if its Nothom contact is alive and free.'],null,'Confirm',{noWayfinding:true,choices:[
          {id:'recall-confirm-no',label:'I understand. I refuse Imperial service.',action(){closeDialogue();offered=null;if(valid()&&s.answerRecall(false)){pilot()?.setCourier({id,mode:'return'});onTrust(-15);onRefusal();changed();}}},
          {id:'recall-reconsider',label:'Let me reconsider.',action(){closeDialogue();offered=null;askRecall(id);}},
        ]});}},
    ]});return true;
  }
  function askHandover(id) {
    const s=model(),q=s.satchel(),npc=npcById.get(id);
    if(!npc||!near(id)||getMode()!=='playing'||combat.state.phase==='active'||q.handover?.to!==id
      ||q.handover.from!=='player'||q.handover.status==='hostile'||!inventory.has('courier-satchel'))return false;
    handoverAsked=id;stopInput();
    openDialogue(npc,["Iven's deadline has passed. He has reassigned the rolls to me. Hand over the satchel and I will finish the delivery. Refuse, and I have orders to take it."],null,'Choose',{noWayfinding:true,choices:[
      {id:'satchel-handover-yes',label:'Hand over the courier’s satchel.',action(){closeDialogue();handoverAsked=null;
        if(model()===s&&near(id)&&inventory.has('courier-satchel')&&s.handoverSatchel(id,{near:true,accept:true}).ok){inventory.remove('courier-satchel',1);changed();}}},
      {id:'satchel-handover-no',label:'No. I am keeping it. [Fight]',action(){closeDialogue();handoverAsked=null;
        const current=s.satchel();
        if(model()!==s||!near(id)||!inventory.has('courier-satchel')||current.carrier!=='player'
          ||current.assignee!==id||current.handover?.to!==id||current.handover.status!=='seeking'||!s.actor(id)?.alive)return;
        const p=position(),at=npc.actor.group.position;
        const started=combat.startEncounter({id:`satchel-handover-${id}`,name:'The reassigned courier',center:{x:p.x,z:p.z},
          checkpoint:{x:p.x+6,z:p.z+6},retreatZ:p.z+24,
          enemies:[{id,npcId:id,name:npc.name,x:at.x,z:at.z,hp:100,currentHp:s.actor(id)?.health??100,kind:'soldier',
            model:{role:npc.modelRole??'mercenary',tunic:npc.color,skin:npc.skin,look:npc.look}}]});
        if(!started){toast('The courier cannot begin the confrontation here. Speak with them again.','COURIER HANDOVER');return;}
        s.handoverSatchel(id,{near:true,accept:false});changed();}},
    ]});return true;
  }
  function conversation(npc) {
    const s=model();
    if(s.recall().courier===npc.id&&['seeking','offered'].includes(s.recall().status))return askRecall(npc.id);
    if(s.satchel().handover?.to===npc.id)return askHandover(npc.id);
    if(npc.id==='crossing-keeper') {
      const b=s.bridge();
      if(b.status==='complete'&&b.completedBy!=='player') {
        openDialogue(npc,[`${name(b.completedBy)} gathered sound timber and helped me repair the bridge. The crossing is open. That job is done; Bowden in the Koopwood can teach you carpentry on another project.`],null,'Back to the road');return true;
      }
      if(b.owner&&b.owner!=='player') {
        openDialogue(npc,[`${name(b.owner)} is helping me with the bridge. You can wait for the repair or swim across. The main road does not depend on doing this job yourself.`],null,'Back to the road');return true;
      }
    }
    return false;
  }
  function routeEvent(event) {
    if(event.type==='courier-arrived')askRecall(event.id);
    if(event.type==='courier-returned') {
      if(model().recall().courier!==event.id)return;
      if(model().recall().status==='passenger'){model().arrivePlayerMuster('empire');onMuster('empire');changed();}
      if(model().courierReturned(event.id))changed();
      pilot()?.setCourier({id:event.id,mode:null});
    }
    if(event.type==='transport-needed')onTransport(event);
  }
  function frame() {
    const s=model(),recall=s.recall(),q=s.satchel();
    if(['seeking','offered','passenger'].includes(recall.status))pilot()?.setCourier({id:recall.courier,mode:recall.status==='passenger'?'passenger':'seek'});
    else if(['cancelled','refused','complete','unavailable'].includes(recall.status))pilot()?.setCourier({id:recall.courier,
      mode:recall.courier&&['refused','cancelled'].includes(recall.status)?'return':null});
    if(getMode()==='playing'&&combat.state.phase!=='active') {
      if(['seeking','offered'].includes(recall.status)&&near(recall.courier))askRecall(recall.courier);
      if(q.handover&&near(q.handover.to))askHandover(q.handover.to);
    }
    let dirty=false;
    for(const event of s.drainEvents()) {
      dirty=true;
      if(event.type==='bridge-completed')onBridge(event);
      if(event.type==='satchel-deadline-warning'&&event.assignee==='player')toast('Two active minutes remain. Iven will reassign the satchel job when its deadline expires.','COURIER DEADLINE');
      if(event.type==='satchel-reassigned'&&event.previous==='player')toast('Your courier assignment has expired. You can still deliver rolls you carry until the replacement collects them.','IVEN REASSIGNED THE JOB');
    }
    if(dirty)changed();
  }
  function restore(){offered=null;handoverAsked=null;}
  return {reportPlayer,horseNote,satchelNote,conversation,routeEvent,frame,restore};
}
