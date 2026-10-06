import {yieldStartup} from './startup.js';

/** The launch preference is deliberately per-launch; Full always remains the default. */
export function chooseLoadingMode({document=globalThis.document,search=globalThis.location?.search??'',afterPaint=yieldStartup,now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout}={}){
  const panel=document?.getElementById('loading-choice'),full=document?.getElementById('loading-full'),fast=document?.getElementById('loading-fast');
  const countdown=document?.getElementById('loading-countdown'),status=document?.getElementById('loading-status'),loading=document?.getElementById('loading');
  const override=new URLSearchParams(search).get('load');
  if(!panel||!full||!fast)return Promise.resolve('full');
  return new Promise(resolve=>{
    let selected=false,timer=null,deadline=0,lastSeconds=-1;
    const finish=mode=>{
      if(selected)return;
      selected=true;
      if(timer!==null)cancel(timer);
      full.removeEventListener('click',chooseFull);fast.removeEventListener('click',chooseFast);
      document.removeEventListener('keydown',trapFocus,{capture:true});
      panel.hidden=true;loading?.classList.remove('choosing-mode');
      full.disabled=true;fast.disabled=true;
      if(status)status.textContent=mode==='fast'?'Preparing your starting region':'Preparing your adventure';
      resolve(mode);
    };
    const chooseFull=()=>finish('full'),chooseFast=()=>finish('fast');
    const trapFocus=event=>{
      if(event.key!=='Tab')return;
      event.preventDefault();
      const active=document.activeElement;
      if(active===full)fast.focus();else if(active===fast)full.focus();else (event.shiftKey?fast:full).focus();
    };
    const tick=()=>{
      if(selected)return;
      const remaining=deadline-now();
      if(remaining<=0){finish('full');return;}
      const seconds=Math.ceil(remaining/1000);
      if(seconds!==lastSeconds&&countdown){countdown.textContent=`Full mode starts automatically in ${seconds} ${seconds===1?'second':'seconds'}.`;lastSeconds=seconds;}
      timer=schedule(tick,Math.min(1000,remaining));
    };
    if(override==='full'||override==='fast'){finish(override);return;}
    panel.hidden=false;loading?.classList.add('choosing-mode');
    full.disabled=false;fast.disabled=false;
    if(status)status.textContent='Choose how to load Azhora';
    full.addEventListener('click',chooseFull);fast.addEventListener('click',chooseFast);
    document.addEventListener('keydown',trapFocus,{capture:true});
    full.focus({preventScroll:true});
    // Do not use up the player's choice time before the screen can be painted.
    const start=()=>{if(!selected){deadline=now()+10000;tick();}};
    Promise.resolve().then(afterPaint).then(start,start);
  });
}
