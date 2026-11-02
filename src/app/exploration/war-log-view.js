import {warLogEntries} from './war-log.js';
import {isElapsedWorldWar} from './world-war.js';
import {adventureTimeLabel} from '../../experiments/day-night/opening-time-label.js';

export function createWarLogView({state,scenario,known,getMode,setMode}){
  const button=(id,parent)=>{const b=document.createElement('button');b.id=id;b.textContent='War log';b.onclick=open;parent.append(b);return b;};
  const hud=button('war-log-open',document.getElementById('world-war-report'));
  const map=button('war-log-map-open',document.getElementById('world-war-controls'));
  const root=document.createElement('section');root.id='campaign-war-log';root.hidden=true;
  root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','war-log-title');
  root.innerHTML='<div class="tower-dialog-card"><header><span class="eyebrow">LIZEEMI WAR / EVENTS AND CONSEQUENCES</span><h2 id="war-log-title">Your war journal</h2><p>Recorded events, newest first. Time waits while you read.</p><label><input id="war-log-personal" type="checkbox"> Only my actions and their outcomes</label></header><div id="war-log-entries" tabindex="0" aria-label="Recorded war events"></div><footer><button id="war-log-close">Return (Esc)</button></footer></div>';
  document.body.append(root);
  const $=id=>root.querySelector('#'+id);let previousFocus,returnMode='playing',entries=[];
  function paint(){
    const list=$('war-log-entries');list.replaceChildren();
    const displayed=entries.filter(e=>!$('war-log-personal').checked||e.personal);
    for(const e of displayed){
      const article=document.createElement('article'),date=document.createElement('small'),title=document.createElement('h3'),detail=document.createElement('p');
      article.dataset.event=String(e.id);date.textContent=(isElapsedWorldWar(scenario.id)?adventureTimeLabel(e.elapsedSeconds):'Day '+e.day)+(e.personal?' · Your impact':'');
      title.textContent=e.title;detail.textContent=e.detail;article.append(date,title,detail);list.append(article);
    }
    if(!displayed.length){const p=document.createElement('p');p.textContent='No personal interventions recorded yet. Battles you join and their consequences will appear here.';list.append(p);}
    list.scrollTop=0;
  }
  function open(){
    if(!root.hidden||!['playing','map','tower'].includes(getMode()))return false;
    previousFocus=document.activeElement;returnMode=getMode();entries=warLogEntries(state(),scenario,known);
    setMode('briefing');root.hidden=false;paint();$('war-log-close').focus();return true;
  }
  function close(){root.hidden=true;setMode(returnMode);if(previousFocus?.isConnected)previousFocus.focus();}
  $('war-log-close').onclick=close;$('war-log-personal').onchange=paint;
  return {open,reset(){root.hidden=true;entries=[];},keydown(e){
    if(root.hidden)return false;
    if(e.code==='Escape'){e.preventDefault();close();}
    else if(e.code==='Tab'){
      e.preventDefault();const items=[$('war-log-personal'),$('war-log-entries'),$('war-log-close')],i=items.indexOf(document.activeElement);
      items[(i+(e.shiftKey?-1:1)+items.length)%items.length].focus();
    }else if(!['Space','Enter','ArrowUp','ArrowDown','PageUp','PageDown','Home','End'].includes(e.code))e.preventDefault();
    return true;
  },dispose(){root.remove();hud.remove();map.remove();}};
}
