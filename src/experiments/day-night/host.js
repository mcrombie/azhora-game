import {createDayNightExperiment} from './day-night-experiment.js';
import {createNightLanterns} from './lanterns.js';

/** Opt-in atmosphere preview, or a read-only follower of the opening's clock. */
export function createDayNightHost({scene,camera,sun,hemisphere,world,position,context,onExplore,linkedClock=null,beforeChange=()=>{},afterChange=()=>{}}){
  const sky=createDayNightExperiment({scene,camera,sun,hemisphere});
  sky.setRunning(false);
  const lanterns=createNightLanterns({scene,heightAt:(x,z)=>world.readyAt(x,z)?world.heightAt(x,z):NaN});
  const css=document.createElement('link');css.rel='stylesheet';css.href=new URL('./preview.css',import.meta.url).href;document.head.append(css);
  const section=document.createElement('section');section.id='developer-day-night';
  section.innerHTML='<h2>Day and night experiment</h2><p>Preview the sun, Sova and Vel over Minora and Caricas. Lighting only: battle dates and saved games keep their current timing.</p><button id="day-night-open">Open sky preview</button>';
  document.querySelector('#exploration-developer .developer-card').insertBefore(section,document.getElementById('developer-current'));
  const panel=document.createElement('aside');panel.id='day-night-preview';panel.hidden=true;panel.setAttribute('aria-label','Day and night lighting preview');
  panel.innerHTML='<div class="sky-preview-title"><strong id="day-night-period">Morning</strong><button id="day-night-off" aria-label="Turn off day and night preview">Close preview</button></div><div class="sky-preview-presets" aria-label="Preview time"><button data-sky-hour="6.5">Dawn</button><button data-sky-hour="12">Noon</button><button data-sky-hour="18.5">Dusk</button><button data-sky-hour="0">Night</button></div><div class="sky-preview-play"><button id="day-night-run">Run cycle</button><label>Cycle <select id="day-night-speed"><option value="1">24 minutes</option><option value="24">1-minute demo</option></select></label></div><small>Lighting preview · War clock unchanged</small>';
  document.body.append(panel);
  const $=id=>panel.querySelector('#'+id);
  const presets=[...panel.querySelectorAll('[data-sky-hour]')];
  let enabled=false,lastLabel='',lastVisibility=null,lastRun=null,lastEnabled=false,lastSelection='';
  function sync(current,ctx){
    const visible=!linkedClock&&current.enabled&&ctx.exterior&&['playing','developer'].includes(ctx.mode);
    if(visible!==lastVisibility){panel.hidden=!visible;lastVisibility=visible;}
    const label=current.label+(current.running?' · Cycling':' · Held');
    if(label!==lastLabel){$('day-night-period').textContent=label;lastLabel=label;}
    if(lastRun!==current.running){$('day-night-run').textContent=current.running?'Hold sky':'Run cycle';$('day-night-run').setAttribute('aria-pressed',String(current.running));lastRun=current.running;}
    if(lastEnabled!==current.enabled){section.querySelector('button').textContent=current.enabled?'Return to sky preview':'Open sky preview';lastEnabled=current.enabled;}
    const selection=current.running?'running':String(current.hour);
    if(selection!==lastSelection){
      for(const button of presets){
        const selected=!current.running&&Math.abs(current.hour-Number(button.dataset.skyHour))<.01;
        button.setAttribute('aria-pressed',String(selected));
      }
      lastSelection=selection;
    }
  }
  function update(dt=0){
    if(linkedClock&&!enabled){enabled=true;sky.setEnabled(true);}
    if(!enabled&&dt>0)return;
    const ctx=context();if(linkedClock)ctx.hour=linkedClock().hour;sky.update(dt,ctx);const current=sky.state();
    lanterns.update({enabled:current.enabled,night:current.night,exterior:ctx.exterior,position});
    if(current.enabled||lastEnabled||lastVisibility===null)sync(current,ctx);
  }
  const api={
    update,
    state:()=>({...sky.state(),lanterns:lanterns.state()}),
    setEnabled(value){if(linkedClock)return false;beforeChange();enabled=!!value;sky.setEnabled(enabled);update();afterChange();},
    setHour(value){if(linkedClock)return false;beforeChange();sky.setHour(value);update();afterChange();},
    setRunning(value){if(linkedClock)return false;beforeChange();sky.setRunning(value);update();afterChange();},
    setSpeed(value){if(linkedClock)return false;beforeChange();sky.setSpeed(value);$('day-night-speed').value=String(sky.state().speed);update();afterChange();},
    dispose(){sky.dispose();lanterns.dispose();section.remove();panel.remove();css.remove();},
  };
  section.querySelector('button').onclick=()=>{api.setEnabled(true);onExplore();update();};
  $('day-night-off').onclick=()=>{api.setEnabled(false);document.getElementById('exploration-canvas').focus();};
  $('day-night-run').onclick=()=>api.setRunning(!sky.state().running);
  $('day-night-speed').onchange=event=>api.setSpeed(Number(event.target.value));
  for(const button of presets)button.onclick=()=>{api.setRunning(false);api.setHour(Number(button.dataset.skyHour));};
  // Native controls keep their activation/navigation keys; WASD and game menus
  // still work after choosing a preset, without needing an extra canvas click.
  for(const type of ['keydown','keyup'])panel.addEventListener(type,event=>{if(['Space','Enter','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown'].includes(event.code))event.stopPropagation();});
  section.hidden=!!linkedClock;update();return api;
}
