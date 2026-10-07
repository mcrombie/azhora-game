export const isMoving=army=>army.status==='marching'||army.status==='retreating';
export const isAlive=army=>army.strength>0&&army.status!=='destroyed';
export const stationed=(state,region,owner)=>state.armies.filter(a=>isAlive(a)&&!isMoving(a)&&a.region===region&&(owner===undefined||a.owner===owner));
export const defendingStrength=(state,region)=>state.regions[region].garrison+stationed(state,region,state.regions[region].owner).reduce((n,a)=>n+a.strength,0);

// Allocate losses proportionally, then assign rounding remainders in stable order.
// Components are live objects with a strength field; a garrison can use an adapter.
export function inflictLosses(components,losses){
  const total=components.reduce((n,c)=>n+c.strength,0);
  if(!Number.isInteger(losses)||losses<0||losses>total)throw Error('Invalid force losses.');
  if(!total)return;
  const shares=components.map((c,index)=>{const exact=losses*c.strength/total;return {c,index,loss:Math.floor(exact),fraction:exact-Math.floor(exact)};});
  let remaining=losses-shares.reduce((n,s)=>n+s.loss,0);
  for(const share of [...shares].sort((a,b)=>b.fraction-a.fraction||a.index-b.index))if(remaining>0&&share.loss<share.c.strength){share.loss++;remaining--;}
  for(const share of shares)share.c.strength-=share.loss;
}
