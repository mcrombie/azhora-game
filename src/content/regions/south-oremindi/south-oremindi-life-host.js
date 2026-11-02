/** Keep all mountain animal rigs out of the lookout/start menu. */
export function createSouthOremindiLifeHost(scene,world,{load=()=>import('./south-oremindi-life.js')}={}){
 let life=null,pending=null,error=null,disposed=false;
 return {update(time,dt,point){
  if(disposed||!point)return;
  if(!life&&!pending&&!error&&dt>0&&world.regionAt(point.x,point.z)?.id===37&&world.loading.isReady(37)){
   pending=load().then(module=>{if(!disposed)life=module.createSouthOremindiLife(scene,world);}).catch(reason=>{error=String(reason);console.error('South Oremindi wildlife:',reason);});
  }
  life?.update(time,dt,point);
 },state:()=>({loaded:!!life,pending:!!pending&&!life&&!error,error,...(life?.state()??{})}),
 dispose(){disposed=true;life?.dispose();life=null;}};
}
