import {TRAINING_LESSONS,trainingLesson} from './training-model.js';

export function createTrainingView({select,pause,exit,retry,next,attack,cast,dodge,focus}){
  const root=document.createElement('section');root.id='tower-training';root.setAttribute('aria-label','Taleth combat training');
  root.innerHTML='<header class="training-header"><span class="eyebrow">THE WIZARD TOWER</span><h1>The Stillroom</h1><p id="training-status">Time stands still outside this room</p></header><div class="training-toolbar"><button id="training-pause">Lessons / Pause (Esc)</button><button id="training-return">Return to the tower</button></div><aside class="training-panel"><span class="eyebrow">TALETH / COMBAT TRAINING</span><h2 id="training-title">A moment outside time</h2><p id="training-coach" role="status"></p><p id="training-progress"></p><div id="training-vitals"></div><div class="training-actions"><button id="training-staff">Staff / X</button><button id="training-fireball">Fireball / Q</button><button id="training-dodge">Dodge / Space</button><button id="training-focus">Lock target / T</button><button id="training-retry" hidden>Retry lesson / R</button><button id="training-next" hidden></button></div></aside><aside id="training-lessons"><h2>Train with Taleth</h2><p>Choose any lesson. Repeat it whenever you wish.</p><div class="training-lesson-list"></div><button id="training-resume">Explore the Stillroom</button></aside><div id="training-controls">WASD move · X / click strike · Q fireball · T lock target · Space dodge · Right-drag look · Scroll zoom</div><div id="training-portal" hidden>F / Return through the tower door</div>';
  document.body.append(root);const $=id=>root.querySelector('#training-'+id);
  for(const [index,lesson]of TRAINING_LESSONS.entries()){
    const button=document.createElement('button');button.dataset.trainingLesson=lesson.id;
    const title=document.createElement('strong'),description=document.createElement('small');title.textContent=`${index+1}. ${lesson.title}`;description.textContent=lesson.description;button.append(title,description);button.onclick=()=>select(lesson.id);root.querySelector('.training-lesson-list').append(button);
  }
  for(const [id,fn]of Object.entries({pause,return:exit,retry,next,staff:attack,fireball:cast,dodge,focus,resume:pause}))$(id).onclick=fn;
  let lastCoach='';
  return {draw(state){
    const definition=trainingLesson(state.lesson),running=state.phase==='running';
    $('lessons').hidden=!state.paused;
    $('title').textContent=state.phase==='complete'?'Lesson complete':state.phase==='retry'?'Try again safely':definition?.title??'A moment outside time';
    if(state.coach!==lastCoach){$('coach').textContent=state.coach;lastCoach=state.coach;}
    $('status').textContent=state.paused?'Training paused · World time is frozen':'World time is frozen · Practice at your own pace';
    $('progress').textContent=state.lesson==='staff'?`Staff strikes: ${Math.min(2,state.stats.staffHits)} / 2`:state.lesson==='fireball'?`Fireball hits: ${Math.min(1,state.stats.fireballHits)} / 1`:state.lesson==='counter'?`Dodge counters: ${Math.min(1,state.stats.dodgeCounters)} / 1`:state.lesson==='practice'?'Practice opponent · No campaign consequences':'';
    $('vitals').textContent=running?`Health ${state.hero.hp} / ${state.hero.maxHp??100} · Mana ${Math.floor(state.sorcery.mana)} / 100`:'';
    for(const id of ['staff','fireball','dodge','focus']){$(id).hidden=!running;$(id).disabled=state.paused;}
    $('fireball').disabled=state.paused||!['fireball','practice'].includes(state.lesson)||state.sorcery.mana<20||state.sorcery.cooldown>0;
    $('focus').textContent=state.focusId===null?'Lock target / T':'Unlock target / T';
    $('retry').hidden=!['complete','retry'].includes(state.phase);
    $('retry').textContent=state.phase==='complete'?'Repeat lesson / R':'Retry lesson / R';
    $('next').hidden=state.phase!=='complete'||!state.next;$('next').textContent=state.next?'Next: '+trainingLesson(state.next).title:'';
    $('resume').textContent=running?'Resume lesson':'Explore the Stillroom';
    $('pause').textContent=state.paused?'Resume (Esc)':'Lessons / Pause (Esc)';
    $('portal').hidden=(!state.nearPortal&&!state.nearTaleth)||state.paused;
    $('portal').textContent=state.nearPortal?'F / Return through the tower door':'F / Choose a lesson with Taleth';
    $('controls').hidden=state.paused;
  },focusLesson(){root.querySelector('[data-training-lesson]')?.focus();},focusNext(backwards=false){
    const buttons=[...root.querySelectorAll('button')].filter(button=>!button.disabled&&button.getClientRects().length);
    const index=buttons.indexOf(document.activeElement),next=index<0?(backwards?buttons.length-1:0):(index+(backwards?-1:1)+buttons.length)%buttons.length;
    buttons[next]?.focus();
  },dispose(){root.remove();}};
}
