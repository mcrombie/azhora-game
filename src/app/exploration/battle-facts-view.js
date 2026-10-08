export function renderBattleFacts(element,facts=[]){
  const signature=JSON.stringify(facts);if(element.dataset.facts===signature)return;
  element.dataset.facts=signature;element.hidden=!facts.length;element.replaceChildren();
  for(const [label,value] of facts){const term=document.createElement('dt'),detail=document.createElement('dd');term.textContent=label;detail.textContent=value;element.append(term,detail);}
}
