import {createWorldWar} from '../exploration/world-war.js';
import {FOOD_DEMO_SCENARIO} from './scenario.js';
import {createFoodDemoPlayer,NESDOR_DEMO_STEPS} from './demo-plan.js';

export function createFoodWorldDemo({war,capture,restore,prepare,showFields,showMap,canStart,notice}){
  const section=document.createElement('section');section.id='developer-food-demo';
  section.innerHTML='<h2>Food economy demonstration</h2><button id="food-demo-start">Nesdor shortage and recovery</button><p class="developer-hint">Temporary exercise: normal trade, a failed harvest, shortages, restoration and recovery. Campaign days run at 20×; map explanations pause for reading. Army movements are held. Return restores your current session, including unsaved progress.</p>';
  document.getElementById('developer-autoplay').before(section);
  const panel=document.createElement('aside');panel.id='food-demo-player';panel.hidden=true;
  panel.style.cssText='position:fixed;right:24px;bottom:24px;width:min(380px,calc(100vw - 48px));max-height:45vh;overflow:auto;z-index:400;background:#203f35;color:#eee8cf;border:1px solid #c8b579;border-radius:5px;padding:16px;box-shadow:0 5px 24px #0005;font:13px/1.5 system-ui';
  panel.innerHTML='<small>TEMPORARY FOOD EXERCISE · 20× campaign</small><h2 id="food-demo-title"></h2><p id="food-demo-text"></p><p id="food-demo-progress" role="status"></p><div style="display:flex;gap:8px;flex-wrap:wrap"><button id="food-demo-pause">Pause</button><button id="food-demo-next">Next stage</button><button id="food-demo-return">Return to my game</button></div>';
  document.body.append(panel);
  const style=document.createElement('style');style.textContent='body.food-demo-active #world-war-report,body.food-demo-active #world-war-track,body.food-demo-active #war-world-pointer,body.food-demo-active #campaign-panel-toggle,body.food-demo-active #exploration-minimap,body.food-demo-active #exploration-help,body.food-demo-active #exploration-hud nav{display:none!important}#food-demo-player h2{font:22px/1.2 Georgia;margin:12px 0}#food-demo-player button{font-size:12px;padding:8px 10px}';document.head.append(style);
  const $=id=>document.getElementById(id);
  let active=false,busy=false,original=null,player=null,painted='',caption='';
  const heldControls=['world-war-run','world-war-step','world-war-speed','save-exploration','load-exploration','close-map'];
  function paint(){if(!player)return;const s=player.state(),day=war.state().campaign.day,stamp=JSON.stringify([s,day]);
    for(const id of heldControls)$(id).disabled=true;
    if(stamp===painted)return;painted=stamp;
    $('food-demo-progress').textContent=s.complete?'Review complete. Your original game is ready to return to.':`Day ${day}${s.arrived?' / Reading pause':` → ${s.targetDay}`}${s.paused?' / Paused':''}`;$('food-demo-pause').textContent=s.paused?'Resume':'Pause';$('food-demo-pause').disabled=s.complete;$('food-demo-next').disabled=s.complete;}
  function start(){
    if(active)return false;const reason=canStart();if(reason){notice(reason);return false;}
    original=capture();caption=$('world-demo-caption').textContent;painted='';active=true;panel.hidden=false;document.body.classList.add('food-demo-active');
    try{
      war.pause();prepare();
      const fresh=createWorldWar(null,FOOD_DEMO_SCENARIO);fresh.setSpeed(20);
      war.restore(fresh.checkpoint());war.pause();
      player=createFoodDemoPlayer({day:()=>war.state().campaign.day,advance:()=>war.advance(1),action:war.foodAction,
        present(step,index){$('food-demo-title').textContent=`${index+1}/${NESDOR_DEMO_STEPS.length} · ${step.title}`;$('food-demo-text').textContent=step.text;if(step.view==='fields')showFields(step.region);else showMap(step.region);}});
      player.next();paint();return true;
    }catch(error){notice('Food demonstration could not start: '+error.message);void stop();return false;}
  }
  async function stop(){
    if(!active||busy)return;busy=true;war.pause();
    try{await restore(original);active=false;panel.hidden=true;player=null;original=null;document.body.classList.remove('food-demo-active');
      for(const id of heldControls)$(id).disabled=false;
      $('world-demo-caption').textContent=caption;$('food-world-report').open=false;war.refresh();}
    catch(error){notice('Could not restore your session: '+error.message+'. Use Return to my game to try again.');}
    finally{busy=false;}
  }
  function next(){if(!active||busy)return;try{player.next();paint();}catch(e){notice(e.message);void stop();}}
  $('food-demo-start').onclick=start;$('food-demo-return').onclick=stop;
  $('food-demo-next').onclick=next;$('food-demo-pause').onclick=()=>{player.toggle();paint();};
  // Keep the exercise read-only: map navigation and its report remain available.
  // Escape returns safely; no movement, saving, combat or time controls leak in.
  function input(event){
    if(!active)return;
    const target=event.target,control=target?.closest?.('button,input,select,summary,a');
    if(event.type==='keydown'){
      if(event.code==='Escape'){event.preventDefault();event.stopImmediatePropagation();void stop();return;}
      if(['Tab','Enter','Space','ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(event.code)){
        if(target?.closest?.('#food-demo-player,#food-world-report')||event.code==='Tab'){event.stopImmediatePropagation();return;}
        if(target?.closest?.('#map-screen')&&!target.closest('#world-war-controls')&&target.id!=='close-map')return;
      }
      event.preventDefault();event.stopImmediatePropagation();return;
    }
    if(control&&!control.closest('#food-demo-player,#food-world-report')&&(!control.closest('#map-screen')||control.closest('#world-war-controls')||control.id==='close-map')){event.preventDefault();event.stopImmediatePropagation();}
  }
  for(const type of ['keydown','pointerdown','click','change'])window.addEventListener(type,input,true);
  return {start,stop,next,tick(dt,focused){if(active&&!busy&&focused){try{player?.tick(dt);paint();}catch(error){notice(error.message);void stop();}}},
    state:()=>({active,busy,...player?.state()}),
    dispose(){for(const type of ['keydown','pointerdown','click','change'])window.removeEventListener(type,input,true);panel.remove();section.remove();style.remove();document.body.classList.remove('food-demo-active');}};
}
