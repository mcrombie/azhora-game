/** Timings stay separate from saved game state and are available to native tests. */
export function createStartup({now=()=>performance.now(),onProgress=()=>{}}={}){
  const record={started:now(),stages:[],cache:'unavailable',ready:null};
  let previous=record.started;
  return {record,
    stage(name){const at=now();record.stages.push({name,at,previousMs:at-previous});previous=at;onProgress(name);},
    ready(){record.ready=now();record.totalMs=record.ready-record.started;},
  };
}
// Two frames let the loading message actually paint before the next work batch.
// A timer fallback also works in a hidden/minimized browser or desktop window.
export function yieldStartup(){
  return new Promise(resolve=>{let settled=false;const finish=()=>{if(!settled){settled=true;clearTimeout(timer);resolve();}};
    const timer=setTimeout(finish,32);
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>requestAnimationFrame(finish));
  });
}
export function terrainCacheMatches(entry,xs,zs){
  if(!entry||entry.xs?.length!==xs.length||entry.zs?.length!==zs.length)return false;
  if(!xs.every((v,i)=>v===entry.xs[i])||!zs.every((v,i)=>v===entry.zs[i]))return false;
  const count=xs.length*zs.length*3;
  return ['positions','colors','normals'].every(name=>entry[name] instanceof Float32Array&&entry[name].length===count);
}
