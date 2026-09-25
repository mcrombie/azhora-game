/** Sylvia's outdoor studio. Completed studies use the normal saved skill ledger;
 * unfinished brushwork is deliberately transient and never pays experience. */
export const VISUAL_ARTS_SKILL = 'visualarts';
export const SYLVIA = Object.freeze({ id:'sylvia', name:'Sylvia', role:'Painter of the Sunken Lane', modelRole:'shelter-keeper', color:0x87938a, x:-505, z:30.5, yaw:0 });
export const SYLVIA_STUDIO = Object.freeze({
  house:Object.freeze({x:-505,z:24,width:6,depth:4.8,height:2.8}),
  centre:Object.freeze({x:-503,z:28,r:10}),
  easel:Object.freeze({x:-504.8,z:31.35}),
  practice:Object.freeze({x:-500,z:32}),
  stand:Object.freeze({x:-500,z:30.95,yaw:0}),
});
export const ART_STUDIES = Object.freeze([
  Object.freeze({id:'drawing',name:'Draw the old oak',level:1,duration:6,xp:18,verb:'Drawing'}),
  Object.freeze({id:'painting',name:'Paint the woodland light',level:2,duration:8,xp:24,verb:'Painting'}),
  Object.freeze({id:'calligraphy',name:'Practice a calligraphic greeting',level:3,duration:8,xp:24,verb:'Lettering'}),
]);
export function createVisualArts({skills,onEvent=()=>{}}){
  let active=null;
  const taught=()=>skills.taught(VISUAL_ARTS_SKILL);
  const level=()=>skills.level(VISUAL_ARTS_SKILL);
  const list=()=>ART_STUDIES.map(study=>({...study,unlocked:level()>=study.level}));
  const pose=()=>active?{id:active.study.id,progress:Math.min(1,active.time/active.study.duration)}:null;
  const cancel=(reason='interrupted')=>{if(!active)return false;const id=active.study.id;active=null;onEvent({type:'art-cancelled',id,reason});return true;};
  function begin(id,{blocked=false,position=SYLVIA_STUDIO.stand}={}){
    const study=ART_STUDIES.find(s=>s.id===id);
    if(!study)return{ok:false,reason:'Choose a study at the easel.'};
    if(!taught())return{ok:false,reason:'Ask Sylvia to introduce you to Visual Arts first.'};
    if(active||blocked)return{ok:false,reason:'Stand still at the spare easel, out of combat.'};
    if(Math.hypot(position.x-SYLVIA_STUDIO.stand.x,position.z-SYLVIA_STUDIO.stand.z)>1.5)return{ok:false,reason:'Come closer to the spare easel.'};
    if(level()<study.level)return{ok:false,reason:`Reach Visual Arts level ${study.level} first.`};
    active={study,time:0};onEvent({type:'art-started',id});return{ok:true,...study};
  }
  function update(dt,{paused=false,blocked=false,position=SYLVIA_STUDIO.stand}={}){
    if(!active||paused)return null;
    if(blocked||Math.hypot(position.x-SYLVIA_STUDIO.stand.x,position.z-SYLVIA_STUDIO.stand.z)>1.5){cancel();return null;}
    if(!Number.isFinite(dt)||dt<=0)return null;
    active.time+=dt;if(active.time<active.study.duration)return null;
    const study=active.study;active=null;const gain=skills.gain(VISUAL_ARTS_SKILL,study.xp);
    const event={type:'art-completed',id:study.id,name:study.name,gained:gain.gained??0};onEvent(event);return event;
  }
  return{teach:()=>skills.learn(VISUAL_ARTS_SKILL),taught,level,list,begin,cancel,update,pose,
    view:()=>({taught:taught(),level:level(),xp:skills.xp(VISUAL_ARTS_SKILL),active:pose(),studies:list()})};
}

export function sylviaConversation(npc,{arts,openDialogue,closeDialogue,onChange=()=>{}}){
  if(npc?.id!==SYLVIA.id)return false;
  const back=()=>sylviaConversation(npc,{arts,openDialogue,closeDialogue,onChange});
  const choices=[];
  if(!arts.taught())choices.push({id:'sylvia-visual-arts',label:'Introduce me to Visual Arts',action:()=>openDialogue(npc,[
    'Of course, dear. Start by looking, not by worrying whether you are any good. That oak is not a green cloud: follow its trunk, find its heavy branches, and leave room for the light.',
    'Drawing, painting and calligraphy all belong to Visual Arts. Use the spare easel beside mine: press F and choose Draw the old oak. Take six quiet seconds to finish your study. Practice opens painting at level 2 and calligraphy at level 3.',
  ],null,'Try the spare easel',{noWayfinding:true,onComplete:()=>{arts.teach();onChange();}})});
  choices.push({id:'sylvia-studies',label:'Tell me about your work',action:()=>openDialogue(npc,[
    'I have painted this lane for years, and it has never given me the same morning twice. Today I am trying to catch the light through those leaves.',
    'My spare paper and brushes are yours to use. Finish a study to earn experience; walking away or fighting interrupts it. There is no hurry, and no such thing as wasting a sheet while you learn.',
  ],null,'Back to Sylvia',{onComplete:back})});
  choices.push({id:'sylvia-bye',label:'I will leave you to your painting.',action:closeDialogue});
  openDialogue(npc,[arts.taught()?'Hello again, dear. The spare easel is still yours. How is the world looking today?':'Oh, hello, dear. Mind the wet paint. I am Sylvia. Come and look, if you like; there is a spare easel, and I would be very happy to show you where to begin.'],null,'Back to the lane',{choices});
  return true;
}

export function artEaselConversation({arts,openDialogue,closeDialogue,start}){
  openDialogue({id:'sylvia-easel',name:'The spare easel',role:'Visual Arts practice'},[
    arts.taught()?'Paper, pigments and a well-used brush wait beside a view of the woods. Finish your study without moving to earn Visual Arts experience.':'Sylvia has set out a spare easel. Ask her for an introduction before starting your first study.',
  ],null,'Leave the easel',{noWayfinding:true,choices:[...arts.list().map(study=>({id:`art-study-${study.id}`,
    label:`${study.name} · ${study.duration}s · ${study.xp} XP${study.unlocked?'':` · level ${study.level}`}`,
    disabled:!arts.taught()||!study.unlocked,title:!arts.taught()?'Ask Sylvia for an introduction.':!study.unlocked?`Reach Visual Arts level ${study.level}.`:'Finish the study to earn experience.',
    action:()=>{closeDialogue();start(study.id);}})),{id:'art-easel-leave',label:'Back to the lane',action:closeDialogue}]});
}
