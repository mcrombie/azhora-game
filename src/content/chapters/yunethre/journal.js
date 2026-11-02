/** Read-only quest presentation. The chapter snapshot owns every completion;
 * the carried Chapter 1 record is never replayed, advanced or modified here. */
import {BATTLE_START,BATTLE_END} from './chapter.js';

const regionNames={isareos:'Isareos / Minora',nethereum:'Nethereum',ovesos:'Ovesos',caricas:'Caricas',nesdor:'Nesdor'};
const factionNames={west:'West Lizeem',east:'East Lizeem',minora:'Minora',centaurs:'the centaurs',celder:'Celder'};
const name=(names,id,fallback)=>names[id]??(typeof id==='string'&&id?id:fallback);
const side=id=>name(factionNames,id,'an unrecorded side');
const entry=(id,title,detail,status,extra={})=>({id,title,detail,status,...extra});
const target=(id,name)=>({id,name});
const clock=seconds=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;

function deadline(s){
 if(!s.briefed||s.returned)return null;
 if(s.aftermathVisited)return {status:s.battle.status,label:'Laketown’s decision recorded',text:'The diplomatic deadline is over. Carry the council’s decision toward Minora.',seconds:null};
 if(s.battle.status==='averted')return {status:'averted',label:'Peace secured',text:'Both sides agreed before the deadline. Return to Laketown now; there is no need to wait.',seconds:null};
 if(s.battle.status==='resolved')return {status:'resolved',label:'Battle concluded',text:`${s.battle.winner==='centaurs'?'The centaurs survived.':'Celder defeated the centaur camp.'} Laketown must still make its own decision.`,seconds:null};
 if(s.battle.status==='active')return {status:'active',label:'Battle underway',
  text:s.battle.joined?'Finish the encounter you joined before continuing the diplomatic assignment.':`The peace deadline has passed. The armies will settle the battle in ${clock(Math.max(0,Math.ceil(BATTLE_END-s.elapsed)))} of active time.`,
  seconds:s.battle.joined?null:Math.max(0,Math.ceil(BATTLE_END-s.elapsed))};
 if(!s.departed)return {status:'dormant',label:'Deadline has not begun',text:'You have 15 active minutes after leaving the tower to obtain both sides’ consent.',seconds:BATTLE_START};
 const seconds=Math.max(0,Math.ceil(BATTLE_START-s.elapsed));
 return {status:'running',label:`Peace deadline / ${clock(seconds)} remaining`,seconds,
  text:'Obtain both consents before Celder attacks. Conversations, the map and the tower pause the clock. Each arranged trip between the centaur camp and Canerd costs 90 active seconds while the battle is pending.'};
}

function nextObjective(s){
 if(s.returned)return {id:'complete',title:'Chapter 2 complete',purpose:'You have received the warning on the road back to Minora.',
  action:'Open the geopolitical map to review the changed situation. The Chapter 3 continuation is not playable yet.',destination:null};
 if(!s.briefed)return {id:'assignment',title:'Receive Taleth’s assignment',purpose:'Learn what the League needs from the country beyond the Lizeemi War.',
  action:'Approach Taleth at the Sky Lookout, press F, and accept the diplomatic assignment.',destination:target('taleth','Taleth / Sky Lookout')};
 if(!s.departed)return {id:'departure',title:'Leave Minora for Yunethre',purpose:'Ask Laketown whether it will join the Lizeemi League.',
  action:'Use the lookout door to descend to the guild chamber, then leave through the southern tower door. Head west out of Minora and follow the road northwest to Laketown.',destination:target('tower','Tower door / Minora')};
 if(s.aftermathVisited)return {id:'return',title:'Return toward Minora',purpose:s.laketown==='league'?'Laketown’s accession is settled. Carry its decision back to Taleth.':s.laketown==='celder'?'Laketown is under Celder. Return with the result of your campaign.':'Laketown will remain outside the League. Carry its decision back to Taleth.',
  action:'Follow the road southeast toward Minora. Stop at the marked approach outside the Muster Gate, press F, and choose to return with Laketown’s decision.',destination:target('departure','Minora / Muster Gate approach')};
 if(s.battle.status==='active')return {id:'battle',title:s.battle.joined?'Finish the battle you joined':'Choose whether to join the battle',
  purpose:'The deadline for a two-sided peace agreement has passed. Laketown will decide after the battle.',
  action:s.battle.joined?'Finish your encounter, then return to Laketown. If you have left the encounter, follow the battlefield marker south of Bane’s Camp and press F to resume your joined battle.':'Follow the battlefield marker to the meadow south of Bane’s Camp. Press F at its approach to defend the centaurs or fight for Celder. You may also stay neutral and let active world time resolve it.',destination:target('battle','Battlefield / South of Bane’s Camp')};
 if(s.battle.status==='resolved'&&s.battle.joined==='celder'&&s.battle.winner==='celder'&&s.laketown!=='celder')
  return {id:'capture',title:'Laketown’s conquest remains unresolved',purpose:'Winning for Celder does not by itself transfer ownership of Laketown or grant an alliance.',
   action:'The field victory did not capture Laketown. Return to Rowan and accept its independence to continue the chapter; a separate conquest is not yet playable.',destination:target('town','Laketown / Council representative')};
 if(s.battle.status==='resolved'&&s.battle.winner==='centaurs'&&!s.centaurProtection&&!s.elfHostile&&s.battle.joined!=='celder')
  return {id:'protection',title:'Decide whether to protect the surviving centaurs',purpose:'Laketown requires protection for its centaur neighbors before it can join the League.',
   action:'Speak to the centaur representative in the camp east of Laketown and choose “Pledge protection”. Celder will become hostile. You may instead return to Laketown and accept its independence.',destination:target('centaurs','Centaur camp / East of Laketown')};
 if(['averted','resolved'].includes(s.battle.status)){
  const blocked=s.elfHostile||s.battle.joined==='celder';
  return {id:'town-decision',title:blocked?'Record Laketown’s independence':'Return for Laketown’s decision',
   purpose:s.elfHostile?'Hostility toward the elves prevents Laketown from joining your League.':s.battle.joined==='celder'?'Your campaign against the centaurs has closed the peaceful accession route.':s.battle.status==='averted'?'The compact protects the centaurs and averts the battle. Laketown can decide immediately.':'The battle has ended. Regional ownership changes only after the council’s decision.',
   action:blocked?'Return to the council representative in Laketown, press F, and accept that the town will remain independent.':'Return to the council representative in Laketown and press F. Choose “Welcome Laketown into the League”, or accept that it will remain independent.',destination:target('town','Laketown / Council representative')};
 }
 // Consent, rather than a visit flag, decides the next negotiation. In
 // particular, going to Celder first must lead back to the centaurs.
 if(!s.visits.town&&!s.compact.centaurs&&!s.compact.celder)return {id:'town-terms',title:'Hear Laketown’s terms',
  purpose:'The council must decide whether joining the League is compatible with its ties to elves and centaurs.',
  action:'Follow the road into Laketown. Approach the council representative on the common and press F. Then seek consent from both the centaurs and Celder.',destination:target('town','Laketown / Council representative')};
 if(!s.compact.centaurs)return {id:'centaur-consent',title:s.compact.celder?'Bring Celder’s agreement to the centaurs':'Secure the centaurs’ consent',
  purpose:s.compact.celder?'Celder has already agreed. The compact still needs the centaurs’ consent.':'Meeting the speaker is not an agreement. The centaurs must explicitly accept the safe-passage compact.',
  action:(s.compact.celder?'If you are at Canerd, use the envoy’s “Return to the centaur camp” option. ':'')+'At the camp east of Laketown, speak with the centaur representative (F) and choose “Agree to carry the safe-passage compact”.',
  destination:target('centaurs','Centaur camp / East of Laketown')};
 return {id:'celder-consent',title:'Secure Celder’s consent',purpose:'The centaurs have agreed. Their promise alone does not stop the attack.',
  action:'Ask the centaur speaker for “Travel to Canerd”. Walk through Canerd’s gate to the envoy, press F, and choose “Secure Celder’s consent / Avert the battle”. Reading the military offer does not accept it.',destination:target('celder','Canerd / Celder envoy')};
}

function chapterTwoEntries(s,active){
 const open=s.battle.status==='pending',settled=['resolved','averted'].includes(s.battle.status);
 const status=(done,id)=>done?'completed':active.id===id?'current':'pending';
 const consent=(key,label)=>{const id=key==='centaurs'?'centaur-consent':'celder-consent';return entry(id,key==='centaurs'?'Centaur safe-passage agreement':'Celder safe-passage agreement',s.compact[key]
  ?`${key==='centaurs'?'The centaurs’':'Celder’s'} consent is recorded.${s.battle.status==='averted'?' The two-sided compact is binding.':open?' The other party must also agree before the deadline.':' This one consent did not stop the battle.'}`
  :open?(s.visits[key]?`You have met ${label.toLowerCase()}, but have not recorded their consent. Choose the explicit agreement option.`:`Speak with ${key==='celder'?'the envoy in Canerd':'the speaker east of Laketown'} and explicitly ask for consent.`)
   :'No consent was recorded before the battle. That diplomatic window is now closed.',
  s.compact[key]?'completed':open?status(false,id):'skipped');};
 const entries=[
  entry('assignment','Accept Taleth’s diplomatic assignment',s.briefed?'Taleth asked you to approach Laketown and seek a peaceful settlement with its neighbors.':'Speak with Taleth at the Sky Lookout and accept his assignment.',status(s.briefed,'assignment')),
  entry('departure','Leave Minora for Yunethre',s.departed?'You left the tower; the fifteen-minute diplomatic deadline began.':'Use the lookout and tower doors to reach Minora, then take the western road northwest.',status(s.departed,'departure')),
  entry('town-terms','Hear Laketown’s terms',s.visits.town?'You spoke with the council. Laketown values its elven ties and requires protection for surviving centaurs.':s.aftermathVisited?'No council meeting was recorded before the town’s fate was settled.':'Meet the council representative on Laketown’s common.',s.visits.town?'completed':s.aftermathVisited?'skipped':status(false,'town-terms')),
  entry('centaur-meeting','Meet the centaur representative',s.visits.centaurs?'You heard the centaurs’ position at their camp.':s.battle.winner==='celder'?'The camp was defeated before a meeting was recorded.':s.aftermathVisited?'No meeting was recorded before Laketown’s decision.':'The centaur camp lies east of Laketown.',s.visits.centaurs?'completed':s.battle.winner==='celder'||s.aftermathVisited?'skipped':'pending'),
  consent('centaurs','Centaurs'),
  entry('celder-meeting','Meet the Celder envoy',s.visits.celder?'You heard the envoy’s position in Canerd. A conversation alone does not record agreement.':'The centaur representative can arrange passage to Canerd. Meet the envoy beyond the gate.',s.visits.celder?'completed':settled?'skipped':'pending'),
  consent('celder','Celder'),
  entry('peace','Avert the Celder–centaur battle',s.battle.status==='averted'?'Both parties consented before the deadline. The battle was averted and the centaurs gained protection; this is not a military alliance with Celder.':open?'Both consents are required before the deadline. You may choose to remain neutral instead.':'The deadline passed without both consents. The peace objective was not achieved.',s.battle.status==='averted'?'completed':open?'pending':'failed'),
 ];
 if(['active','resolved'].includes(s.battle.status))entries.push(entry('battle','The Celder–centaur battle',s.battle.status==='active'
  ?(s.battle.joined?`You joined ${side(s.battle.joined)}. Your encounter still needs a result.`:'The armies are fighting. You may join at the battlefield marker or stay neutral and let active world time resolve the battle. No hero participation is recorded yet.')
  :`${s.battle.winner==='centaurs'?'The centaurs held their ground.':'Celder defeated the centaur camp.'} ${s.battle.joined?`You fought for ${side(s.battle.joined)}.`:'The armies settled the battle without you joining.'} Laketown was not automatically annexed.`,
  s.battle.status==='active'?'current':s.battle.joined?(s.battle.winner===s.battle.joined?'completed':'failed'):'information'));
 if(s.battle.status==='resolved'&&s.battle.winner==='centaurs')entries.push(entry('protection','Choose whether to protect the survivors',
  s.centaurProtection?'The surviving centaurs have your protection. Celder regards the commitment as hostile.':s.aftermathVisited?'No protection pledge was recorded; Laketown’s decision has already been made.':s.battle.joined==='celder'?'You fought against the centaurs; the protection agreement is unavailable.':'A protection pledge permits accession but makes Celder hostile. Accepting Laketown’s independence is also possible.',
  s.centaurProtection?'completed':s.aftermathVisited||s.battle.joined==='celder'?'skipped':status(false,'protection')));
 if(s.battle.joined==='celder'&&s.battle.winner==='celder')entries.push(entry('capture','Take Laketown for Celder',
  s.laketown==='celder'?'The separate conquest was recorded. Celder controls Laketown and is your military ally.':s.aftermathVisited?'You accepted Laketown’s independence. The town was not conquered, and Celder is not your military ally.':'A victory in the field does not capture the town. The separate conquest encounter is not playable in this build. Accept Laketown’s independence at the council to continue.',s.laketown==='celder'?'completed':s.aftermathVisited?'skipped':'pending'));
 entries.push(entry('town-decision','Record Laketown’s decision',s.aftermathVisited
  ?(s.laketown==='league'?'The council agreed to join the Lizeemi League.':s.laketown==='celder'?'Laketown came under Celder through the separate conquest.':'The council’s independence was accepted; Laketown remains outside the League.')
  :s.elfHostile?'Hostility toward the elves blocks accession. After the conflict settles, accept the council’s independence to continue.':s.battle.joined==='celder'?'Fighting against the centaurs closed the peaceful accession route. Return to the council after the battle and accept Laketown’s independence to continue.':'After peace or battle, return to the council. Membership is a separate decision, not a reward applied automatically.',status(s.aftermathVisited,'town-decision')));
 if(s.elfHostile)entries.push(entry('elven-relations','Elven relations block accession','Your current hostility toward the elves prevents Laketown from joining the League.','information'));
 entries.push(entry('return','Take Laketown’s decision toward Minora',s.returned?'You reached the road back toward Minora. A messenger interrupted your return.':'After recording the council’s decision, follow the road to the marked approach outside Minora’s Muster Gate and press F.',status(s.returned,'return')));
 // Neither the coup nor the tower refuge belongs in an unrevealed quest list.
 if(s.returned)entries.push(entry('news','Receive the messenger’s warning','The Blood Prince has seized Minora. The Wizards’ Tower has moved to a refuge in South Oremindi. Review the changed political map; the next chapter is not playable yet.','completed'));
 return entries;
}

function activeSteps(s,active,entries){
 let ids;
 if(['assignment','departure'].includes(active.id))ids=['assignment','departure','town-terms'];
 else if(active.id==='town-terms')ids=['town-terms','centaur-consent','celder-consent'];
 else if(active.id.endsWith('-consent'))ids=['centaur-consent','celder-consent','peace','town-decision'];
 else if(active.id==='battle')ids=['peace','battle','town-decision'];
 else if(active.id==='protection')ids=['battle','protection','town-decision'];
 else if(active.id==='town-decision')ids=[s.battle.status==='averted'?'peace':'battle',...(s.centaurProtection&&s.battle.status==='resolved'?['protection']:[]),'town-decision','return'];
 else if(active.id==='capture')ids=['battle','capture','town-decision','return'];
 else ids=['town-decision','return',...(s.returned?['news']:[])];
 return ids.map(id=>entries.find(e=>e.id===id)).filter(Boolean).map(e=>({...e}));
}

function priorHeroEntries(history,checkpoint){
 const commands=history?.commands??checkpoint?.simulation?.commands??[],events=history?.events??[];
 const used=new Set(),results=[];
 for(let i=0;i<commands.length;i++){
  const c=commands[i];if(c?.type!=='hero-result')continue;
  const battle=history?.engagements?.find(b=>String(c.id)===String(b.id)||String(c.id).startsWith(String(b.id)+':'));
  const eventIndex=events.findIndex((e,k)=>!used.has(k)&&['hero-result','rally-result','roadside-result'].includes(e.type)&&e.day===c.day&&e.faction===c.faction&&e.outcome===c.outcome&&(e.reason??null)===(c.reason??null)&&(!battle||e.battleId===battle.id));
  if(eventIndex>=0)used.add(eventIndex);
  const e=events[eventIndex],place=name(regionNames,e?.region??battle?.region,'an unrecorded location');
  const kind=e?.objective?.type==='duel'||c.reason==='champion-yielded'?'Champion duel':e?.type==='rally-result'||c.reason==='rally-secured'||String(c.id).endsWith(':rally')?'Rally assault':e?.type==='roadside-result'?'Roadside interception':e?.objective?'Reinforcement interception':'Battlefield encounter';
  const declined=c.reason==='declined',outcome=declined?'You declined to participate.':c.outcome==='success'?`Your ${kind.toLowerCase()} succeeded${c.faction?' for '+side(c.faction):''}.`:c.outcome==='defeat'?`You were defeated${c.faction?' while helping '+side(c.faction):''}.`:`You withdrew${c.faction?' after helping '+side(c.faction):''}.`;
  const removed=e?.objective?.removed??e?.objective?.blocked??(e?.type==='rally-result'?e.removed:undefined);
  const impact=Number.isFinite(removed)?` ${removed} enemy ${e?.type==='rally-result'?'army':'reinforcement'} strength was removed.`:'';
  results.push(entry(`chapter-one-encounter-${i}`,`${kind} at ${place}`,outcome+impact+(c.outcome==='success'?' This records your encounter, not a claim that you won the whole regional battle.':''),
   declined||c.outcome==='withdraw'?'skipped':c.outcome==='success'?'completed':'failed',Number.isFinite(c.day)?{day:c.day}:{}));
 }
 return results;
}

function chapterOne(s,history,checkpoint){
 const source=s.premise?.source??'direct',winner=history?.winner??s.premise?.winner;
 const outcome=['west','east'].includes(winner)?`${side(winner)} won the Lizeemi War; the river country became the Lizeemi League.`:'The carried record does not establish the war’s outcome.';
 if(source==='direct')return {id:'chapter-one',title:'Chapter 1 / The Lizeemi War',provenance:'unrecorded',
  summary:'This older Chapter 2 start has no carried personal Chapter 1 record.',
  entries:[entry('chapter-one-premise','The opening situation',outcome+' Only this starting premise is known.','information'),entry('chapter-one-unrecorded','Personal quest history unavailable','No completed encounters, horse handoff or tower conversations can be established from this save.','information')]};
 if(source==='unattended')return {id:'chapter-one',title:'Chapter 1 / The Lizeemi War',provenance:'unattended',
  summary:'The war was simulated before this Chapter 2 start. Its result is world history, not a list of quests you completed.',
  entries:[entry('chapter-one-settlement','The Lizeemi War ended',outcome,'information'),entry('chapter-one-unattended','No played Chapter 1 quests','This start contains no played Chapter 1 quest history. The starting tower access and horse do not imply that you completed their earlier introductions.','information')]};
 const entries=[];
 if(checkpoint?.tower?.briefed)entries.push(entry('chapter-one-assignment','Prepare the Lizeemi campaign with Taleth','The carried Chapter 1 checkpoint records the tower briefing as completed.','completed'));
 if(['west','east'].includes(checkpoint?.campaignSide))entries.push(entry('chapter-one-allegiance','Choose your league',`You committed to ${side(checkpoint.campaignSide)} in the carried Chapter 1 campaign.`,'completed'));
 if(checkpoint?.riding?.owned)entries.push(entry('chapter-one-horse','Obtain your horse','The carried Chapter 1 checkpoint records an owned horse.'+(checkpoint.riding.taught?' Its riding introduction is also recorded.':''),'completed'));
 entries.push(...priorHeroEntries(history,checkpoint));
 entries.push(entry('chapter-one-settlement','The Lizeemi War ended',outcome,'completed'));
 if(checkpoint?.tower?.concluded)entries.push(entry('chapter-one-review','Review the war with Taleth','The carried checkpoint records Taleth’s concluding campaign review as completed.','completed'));
 if(!entries.some(e=>e.id.startsWith('chapter-one-encounter-')))entries.push(entry('chapter-one-no-encounters','No personal encounter results recorded','The carried record contains no hero-result commands. The war’s outcome alone does not establish that you fought or won any battle.','information'));
 if(!checkpoint)entries.push(entry('chapter-one-local-record','Local quest details unavailable','This campaign snapshot contains battle history but no tower or riding checkpoint. Those introductions are not marked completed.','information'));
 return {id:'chapter-one',title:'Chapter 1 / The Lizeemi War',provenance:'played',summary:'Recorded results carried from your completed Chapter 1 campaign.',entries};
}

/** history is the cached resident campaign snapshot; checkpoint is saved.history,
 * not the current Chapter 2 tower/riding state. No UI, rendering or replay needed. */
export function yunethreJournal(state,history=null,checkpoint=null){
 if(!state||state.chapter!=='yunethre')throw new TypeError('A Yunethre chapter snapshot is required.');
 const active=nextObjective(state),entries=chapterTwoEntries(state,active);
 active.steps=activeSteps(state,active,entries);
 const summary=state.returned?'Your diplomatic assignment is complete. Review the recorded decisions and the messenger’s news.':state.briefed?'Ask Laketown to join the Lizeemi League. Seek peace between Celder and the centaurs, then obtain the council’s decision.':'Speak with Taleth at the Sky Lookout to begin the next assignment.';
 return {title:'Chapter 2 / Yunethre',summary,complete:state.returned,active,deadline:deadline(state),
  chapters:[chapterOne(state,history,checkpoint),{id:'chapter-two',title:'Chapter 2 / Yunethre',summary,provenance:'played',entries}]};
}
