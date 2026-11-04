// Loading can outlast a single scenery job. Keep visible activity and elapsed
// time separate from job completion; neither promises an estimated finish time.
export function installLoadingFeedback(document){
  const screen=document.getElementById('loading-screen'),elapsed=document.getElementById('loading-elapsed');
  let timer=null,begun=0,failed=false;
  const update=()=>{elapsed.textContent=`${Math.floor((performance.now()-begun)/1000)} seconds elapsed`;};
  const sync=()=>{
    const active=!screen.hidden&&!screen.classList.contains('choosing-mode')&&!failed;
    if(active&&timer===null){begun=performance.now();update();timer=setInterval(update,1000);}
    if(!active&&timer!==null){clearInterval(timer);timer=null;}
    elapsed.hidden=!active;
    if(screen.classList.contains('loading-active')!==active)screen.classList.toggle('loading-active',active);
  };
  new MutationObserver(sync).observe(screen,{attributes:true,attributeFilter:['hidden','class']});
  sync();
  return {fail(){failed=true;sync();}};
}
