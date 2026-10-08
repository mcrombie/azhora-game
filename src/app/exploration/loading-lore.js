import {LIZEEM_PRELUDE} from '../../content/scenarios/lizeem-prelude.js';
import {MINORA_COUNCIL} from '../../content/regions/minora-frontier/minora-council.js';
export const WAR_LOADING_PASSAGES=[
  ...LIZEEM_PRELUDE.frames.filter(f=>[1,3,21,23].includes(f.day)).map(f=>({title:f.title,text:f.caption})),
  {title:'The Council of Three',text:`Taleth, Wizard Guild Master, governs Minora alongside Mayor ${MINORA_COUNCIL.mayor.name} and High Priest ${MINORA_COUNCIL.temple.name}. Three offices share one independent city.`},
  {title:'Divided loyalties',text:'The Mayor, an Ovesan, favors West Lizeem. The High Priest, from Nesdor, favors East. Taleth remains neutral, but does not forbid Teresod to intervene.'},
  {title:'The standard above the gate',text:'The highest central flag shows who leads Minora\u2019s council: the Guild star, the civic bridge, or the temple sun. Your intervention and the war\u2019s outcome can change its order.'},
  {title:'Between moments',text:'Taleth\u2019s tower stands between dimensions. The Chronoscope shows the thirty days before the war; the vision cannot rewrite events you have already lived.'},
];
export function installLoadingLore(mode){
  const screen=document.getElementById('loading-screen');if(mode!=='war')return;
  const box=document.createElement('aside');box.id='war-loading-lore';box.innerHTML='<span class="eyebrow">BEFORE THE LIZEEMI WAR</span><h2></h2><p></p><button type="button">Another account ></button>';
  screen.querySelector('.start-card').append(box);let index=0,timer=null;
  function paint(){const p=WAR_LOADING_PASSAGES[index%WAR_LOADING_PASSAGES.length];box.querySelector('h2').textContent=p.title;box.querySelector('p').textContent=p.text;}
  function next(){index++;paint();}box.querySelector('button').onclick=next;
  const observer=new MutationObserver(()=>{clearInterval(timer);timer=null;if(!screen.hidden){paint();timer=setInterval(next,9000);}});observer.observe(screen,{attributes:true,attributeFilter:['hidden']});
  paint();if(!screen.hidden)timer=setInterval(next,9000);
  window.addEventListener('pagehide',()=>{clearInterval(timer);observer.disconnect();},{once:true});
}
