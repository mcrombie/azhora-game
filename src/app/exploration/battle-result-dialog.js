// The result owns input until an explicit choice. Native modal behavior also
// makes the canvas and combat controls inert to pointer and keyboard navigation.
export function createBattleResultDialog(panel,result){
  const dialog=document.createElement('dialog');dialog.id='battle-result-dialog';
  dialog.setAttribute('aria-labelledby','world-skirmish-result-title');
  dialog.setAttribute('aria-describedby','battle-result-paused');
  const paused=document.createElement('p');paused.id='battle-result-paused';paused.className='eyebrow';paused.textContent='BATTLE REPORT / GAME PAUSED';
  dialog.append(paused);document.body.append(dialog);
  const retry=document.getElementById('world-skirmish-retry'),actions=document.getElementById('world-skirmish-result-actions');
  const resultHome=document.createComment('battle result'),retryHome=document.createComment('practice retry');
  result.before(resultHome);retry.before(retryHome);
  const primary=()=>document.getElementById('world-skirmish-continue');
  function keydown(event){
    if(!dialog.open)return;
    event.stopImmediatePropagation();
    const key=event.key||event.code;
    if(['r','R','KeyR'].includes(key)&&!retry.hidden){event.preventDefault();if(!event.repeat)retry.click();}
    else if(key==='Escape'){event.preventDefault();primary().focus();}
    else if(event.repeat)event.preventDefault();
    else if(['Enter',' ','Space'].includes(key)){event.preventDefault();(event.target.closest?.('button')??primary()).click();}
    else if(key!=='Tab')event.preventDefault();
  }
  document.addEventListener('keydown',keydown,true);
  dialog.addEventListener('cancel',event=>{event.preventDefault();primary().focus();});
  return {
    open(){panel.hidden=true;result.hidden=false;dialog.append(result);actions.append(retry);dialog.showModal();primary().focus();},
    dispose(){if(dialog.open)dialog.close();result.hidden=true;resultHome.replaceWith(result);retryHome.replaceWith(retry);document.removeEventListener('keydown',keydown,true);dialog.remove();}
  };
}
