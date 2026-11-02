export function commanderOutcome(campaign,side,won=false){
  const p=campaign.snapshot().pending;
  if(p?.stage!=='rally'||!p.commanders)return null;
  return {commanders:Object.fromEntries(Object.entries(p.commanders).filter(([,c])=>c.status==='active').map(([f,c])=>[f,{id:c.id,hp:won&&f!==side?1:c.hp,outcome:won&&f!==side?'routed':'active'}]))};
}
