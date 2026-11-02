import {COMBAT_TRIALS} from '../../gameplay/combat/combat-trials.js';
import {driveWorldEncounter,clearCombatKeys} from './encounter-controls.js';
import {trialMusicTier} from '../../world/audio/stillroom-score.js';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const press=code=>{document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true,cancelable:true}));document.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));};

export async function check(a){
  const checks=[],assert=(v,m)=>{if(!v)throw Error(m);checks.push(m);};
  const fight=()=>a.practice.state().encounter;
  const music=()=>{a.soundtrack.refresh();return a.soundtrack.state();};
  window.dispatchEvent(new Event('focus'));a.soundtrack.unlock();a.soundtrack.setSettings({music:.42,nature:.65,muted:false});
  await wait(850);
  assert(music().cue==='stillroom'&&music().notes>0,'Real audio plays the mist theme during the opening briefing');
  assert(!a.war,'Standalone trials do not create or advance a campaign');
  assert(document.querySelector('#combat-testing-menu .sound-settings'),'Combat Testing includes the shared music preferences');
  async function select(round){
    a.practice.finish();document.getElementById('trial-start-opponent').value=COMBAT_TRIALS[round].id;
    document.querySelector('[data-combat-exercise="trials"]').click();
    const end=performance.now()+45000;
    while((a.state().mode!=='skirmish'||!fight())&&performance.now()<end)await wait(40);
    assert(fight()?.round===round&&fight().briefing,'Selected round '+(round+1)+' waits at its briefing');
    assert(music().cue==='stillroom','Round '+(round+1)+' briefing selects chamber ambience');
    document.getElementById('combat-trial-start').click();await wait(450);
    assert(music().cue==='duel'&&music().arrangement===COMBAT_TRIALS[round].musicTier,'Round '+(round+1)+' selects its duel arrangement');
  }
  for(let round=0;round<COMBAT_TRIALS.length;round++)await select(round);
  press('KeyH');await wait(1700);assert(music().cue===null&&music().voices===0,'Help fades and releases all score voices');
  const panel=document.querySelector('#world-skirmish-controls .sound-settings');panel.open=true;
  const slider=panel.querySelector('[data-audio="music"]');slider.value=31;slider.dispatchEvent(new Event('input'));slider.dispatchEvent(new Event('change'));
  assert(music().settings.music===.31&&document.querySelector('#combat-testing-menu [data-audio="music"]').value==='31','Help and menu music sliders agree');
  const arrow=new KeyboardEvent('keydown',{code:'ArrowRight',bubbles:true,cancelable:true});slider.dispatchEvent(arrow);
  assert(!arrow.defaultPrevented,'Help permits native keyboard volume adjustment');
  const time=fight().time;await wait(250);assert(fight().time===time,'Adjusting music leaves combat frozen');
  press('Escape');await wait(450);assert(music().cue==='duel','Closing Help resumes the duel score');
  window.dispatchEvent(new Event('blur'));await wait(100);assert(music().device==='suspended','Blur suspends the live audio device');
  window.dispatchEvent(new Event('focus'));await wait(450);assert(music().cue==='duel'&&music().device==='running','Focus restores the live duel score');
  await select(0);
  for(let step=0;step<5500&&!fight().outcome;step++){driveWorldEncounter(a,fight());a.step(1/60);}
  clearCombatKeys(a);assert(fight().outcome==='success','Normal combat input reaches a real victory');
  await wait(600);assert(music().cue==='trial-victory','Victory plays its own cadence');
  const victories=music().resultPhrases;
  await wait(5900);assert(music().cue==='stillroom'&&music().resultPhrases===victories,'Victory cadence plays once then returns to mist');
  a.practice.retry();assert(fight().briefing&&music().cue==='stillroom','Retry resets to quiet briefing');
  document.getElementById('combat-trial-start').click();await wait(450);assert(music().cue==='duel','Retry starts a new duel phrase');
  await select(1);
  for(let step=0;step<5500&&!fight().outcome;step++)a.step(1/60);
  assert(fight().outcome==='defeat','Inactive player reaches a real defeat');
  await wait(600);assert(music().cue==='trial-defeat','Defeat plays its gentler cadence');
  a.soundtrack.setSettings({muted:true});await wait(400);a.soundtrack.setSettings({muted:false});await wait(650);
  assert(music().cue==='stillroom'&&music().resultPhrases===victories+1,'Unmuting a result never replays its cadence');
  assert(music().calls===0,'No outdoor birdsong leaks into the Stillroom');
  assert(music().maxVoices<=40&&!music().error,'Live score stays within its voice budget without audio errors');
  a.practice.finish();await wait(1700);
  assert(music().cue===null&&music().voices===0&&music().groups===0,'Leaving trials releases all score voices and phrase groups');
  document.querySelector('[data-combat-exercise="lesson"]').click();
  const deadline=performance.now()+45000;
  while((a.state().mode!=='skirmish'||!fight())&&performance.now()<deadline)await wait(40);
  assert(fight()&&!fight().trial&&music().cue==='battle','Earlier guard exercises retain the campaign battle theme');
  a.practice.finish();await wait(1700);
  assert(!a.state().frameErrors.length,'No gameplay frame errors during music transitions');
  const preferences=document.querySelector('#combat-testing-menu .sound-settings');preferences.open=true;
  preferences.scrollIntoView({block:'end'});await wait(100);
  return {checks,state:music()};
}
