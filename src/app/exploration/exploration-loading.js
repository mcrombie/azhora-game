// Both choices use the same regional builders. Full waits for every registered
// region; Fast waits for the starting region and leaves distant work queued.
export async function prepareExplorationRegions(loading,initialRegion,{loadingMode='fast',onProgress=()=>{},label='Preparing the world',schedule=setInterval,cancel=clearInterval}={}){
  const full=loadingMode==='full',jobs=loading.state().jobs;
  const regions=full?[...new Set([initialRegion,...jobs.flatMap(job=>job.regions)])]:[initialRegion];
  const relevant=new Set(jobs.filter(job=>full||job.regions.includes(initialRegion)).map(job=>job.id));
  // Shared terrain/scenery may belong to another region but still block this
  // arrival. Include that real work in progress without changing build order.
  const byId=new Map(jobs.map(job=>[job.id,job]));
  for(const id of relevant)for(const dependency of byId.get(id)?.dependencies??[])if(byId.has(dependency))relevant.add(dependency);
  let last=-1;
  const report=()=>{
    const ready=loading.state().jobs.filter(job=>relevant.has(job.id)&&job.status==='ready').length;
    const percent=relevant.size?Math.floor(ready/relevant.size*100):100;
    if(percent!==last){last=percent;onProgress(`${label} · ${percent}%`);}
  };
  if(full)loading.preloadAll();
  report();const timer=schedule(report,500);
  try{await Promise.all(regions.map(id=>loading.ensureRegion(id)));report();}
  finally{cancel(timer);loading.stop();}
}
