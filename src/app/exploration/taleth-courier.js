import {createCorrisState} from './corris-state.js';
import {TALETH_VOICE_INTRO,talethMessageNext,talethMessageStamp,talethFollowAvailable} from './taleth-correspondence.js';
import {openingTimelineText} from '../../experiments/day-night/opening-presentation.js';
import {writeHud} from './hud-write.js';

// The old courier receipt schema and DOM IDs remain readable by existing saves
// and autoplay. Delivery is now a voice: no actor, landing or distance checks.
export function createTalethCourier({getMode,setMode,letters,opportunity=()=>null,clock=()=>null,onFollow=()=>{},saved,onDirty=()=>{},onTalk=()=>{}}){
  let receipts=createCorrisState(saved),returnMode='playing',previousFocus=null,conversation=false;
  const words=text=>openingTimelineText(text,clock());
  const button=(id,text,parent)=>{const b=document.createElement('button');b.id=id;b.textContent=text;parent.append(b);return b;};
  const controls=document.getElementById('world-war-controls'),extra=document.querySelector('.war-report-extra-actions');
  const archive=button('taleth-letters','Taleth / Messages',controls);
  const read=button('taleth-read-letter',"Review Taleth's message",extra);read.hidden=true;
  const next=button('world-war-next','',document.querySelector('.war-report-actions'));
  const mapNext=button('world-war-map-next','',controls);
  const other=button('world-war-alternative','',extra),mapOther=button('world-war-map-alternative','',controls);
  const nextDetail=document.createElement('p');nextDetail.id='world-war-next-detail';document.getElementById('world-war-report-clock').before(nextDetail);
  const notice=document.createElement('aside');notice.id='corris-arrival';notice.hidden=true;
  notice.innerHTML='<span role="status" id="corris-arrival-words"></span><button id="corris-call">Listen to Taleth (V)</button>';
  const dialog=document.createElement('section');dialog.id='taleth-letter-dialog';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','taleth-letter-title');
  dialog.innerHTML=`<div class="tower-dialog-card"><header><span class="eyebrow" id="corris-office">TALETH / TELEPATHIC MESSAGE</span><h2 id="taleth-letter-title">Taleth's voice</h2></header>
    <div class="taleth-letter-body"><p id="corris-summary"></p><p id="taleth-campaign-now"></p>
    <details id="corris-strategy"><summary>Explain your reasoning.</summary><p id="corris-live-strategy"></p><strong id="corris-report-date"></strong><p id="taleth-letter-words"></p><p id="taleth-letter-note"></p><small>This message records what we knew then. The next step above reflects the situation now.</small></details>
    <details id="corris-about"><summary>How can I hear you?</summary><p>${TALETH_VOICE_INTRO}</p><p>You can listen now or return to my messages later. Your surroundings wait while you read.</p></details>
    <details id="corris-reports"><summary>Earlier messages</summary><label>Message <select id="taleth-letter-select"></select></label></details></div>
    <div class="tower-dialog-actions"><button id="corris-understood">Understood</button><button id="taleth-letter-follow"></button><button id="taleth-letter-alternative" hidden></button><button id="taleth-letter-close">Listen later (Esc)</button></div></div>`;
  document.getElementById('world-war-report-more').before(notice);document.body.append(dialog);const $=id=>document.getElementById(id);
  const selected=()=>letters().find(l=>String(l.id)===$('taleth-letter-select').value);
  function paint(){
    const report=selected();
    $('taleth-letter-title').textContent=conversation?"Taleth's voice":'Taleth / Messages';
    $('corris-office').textContent=conversation?'TELEPATHIC MESSAGE':'CAMPAIGN RECORD / TALETH';
    $('corris-summary').textContent=report?words(`${conversation&&!receipts.snapshot().introduced?'Teresod, it is Taleth. Listen when you are ready. ':''}${report.summaryText??report.title}`):TALETH_VOICE_INTRO;
    $('taleth-letter-words').textContent=report?words(report.detail):"We must end this war swiftly, before greater troubles spend the people's strength.";
    $('taleth-letter-note').textContent=words(report?.note??'');
    $('corris-report-date').textContent=report?`Message / ${talethMessageStamp(report,clock())}`:'';
    $('corris-reports').hidden=!letters().length;
    $('corris-understood').hidden=!conversation;
    $('taleth-letter-close').textContent=conversation?'Listen later (Esc)':'Close messages (Esc)';
    paintOpportunity();dialog.querySelector('.taleth-letter-body').scrollTop=0;
  }
  function paintOpportunity(){
    const current=opportunity(),time=clock(),complete=!!time?.complete,available=talethFollowAvailable(current,time);
    for(const b of [next,mapNext,$('taleth-letter-follow')]){writeHud(b,'textContent',time?.fullCampaign&&current?.kind==='regroup'?'Wait for next front':words(current?.label??'Next opportunity'));writeHud(b,'disabled',!available);writeHud(b,'hidden',!available);b.title=words(current?.detail??'');}
    for(const b of [other,mapOther,$('taleth-letter-alternative')]){const alt=complete?null:current?.alternative;writeHud(b,'hidden',!alt);writeHud(b,'disabled',!alt);writeHud(b,'textContent',words(alt?.label??''));b.title=words(alt?.detail??'');}
    writeHud(nextDetail,'textContent',complete?talethMessageNext(current,clock()):current?words('Campaign now: '+current.detail+(current.tradeoff?' '+current.tradeoff:'')):'');
    writeHud($('taleth-campaign-now'),'textContent',talethMessageNext(current,clock()));
    writeHud($('corris-strategy'),'hidden',!selected()&&!current?.tradeoff);
    writeHud($('corris-live-strategy'),'hidden',complete||!current?.tradeoff);
    writeHud($('corris-live-strategy'),'textContent',current?.tradeoff?words('Current front: '+current.tradeoff):'');
  }
  function open(id,{talk=false}={}){
    if(!dialog.hidden||!['playing','tower','map'].includes(getMode()))return false;
    previousFocus=document.activeElement;returnMode=getMode()==='tower'?'playing':getMode();conversation=talk;
    setMode('briefing');onTalk(null);dialog.hidden=false;dialog.dataset.conversation=String(talk);notice.hidden=true;
    const select=$('taleth-letter-select');select.replaceChildren();
    for(const l of letters()){const o=document.createElement('option');o.value=l.id;o.textContent=`${talethMessageStamp(l,clock())} / ${l.title.replace('Taleth / ','')}`;select.append(o);}
    select.value=String(id??letters().at(-1)?.id??'');$('corris-strategy').open=false;$('corris-about').open=false;$('corris-reports').open=!talk;paint();
    $(talk?'corris-understood':'taleth-letter-close').focus();return true;
  }
  function acknowledge(){if(conversation){receipts.acknowledge(selected()?.id);onDirty();}}
  function close(){onTalk(null);dialog.hidden=true;setMode(returnMode);conversation=false;if(previousFocus?.isConnected)previousFocus.focus();}
  function interact(){const pending=receipts.pending(letters());return !!pending&&open(pending.id,{talk:true});}
  next.onclick=mapNext.onclick=()=>onFollow();other.onclick=mapOther.onclick=()=>onFollow(true);
  $('taleth-letter-follow').onclick=()=>{acknowledge();close();onFollow();};
  $('taleth-letter-alternative').onclick=()=>{acknowledge();close();onFollow(true);};
  $('corris-understood').onclick=()=>{acknowledge();close();};
  archive.onclick=()=>open();read.onclick=()=>open(Number(read.dataset.letter));
  $('taleth-letter-select').onchange=paint;$('taleth-letter-close').onclick=close;$('corris-call').onclick=interact;
  return {
    interact,people:()=>[],
    present(report){paintOpportunity();read.hidden=!report?.taleth;if(report?.taleth)read.dataset.letter=report.id;},
    // The quest updates directly. Messages remain optional, without a repeated
    // summons that looks like another required post-battle conversation.
    update(){writeHud(notice,'hidden',true);},
    keydown(e){
      if(dialog.hidden){if(e.code==='KeyV'&&!e.repeat&&['playing','tower','map'].includes(getMode())&&interact()){e.preventDefault();return true;}return false;}
      if(e.code==='Escape'){e.preventDefault();close();}
      else if(e.code==='Tab'){
        e.preventDefault();const items=[...dialog.querySelectorAll('button,select,summary')].filter(b=>!b.disabled&&b.getClientRects().length);
        const i=items.indexOf(document.activeElement);items[(i+(e.shiftKey?-1:1)+items.length)%items.length]?.focus();
      }else if(!['Enter','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
      return true;
    },
    reset(saved){onTalk(null);receipts=createCorrisState(saved);dialog.hidden=notice.hidden=true;conversation=false;},
    snapshot:()=>receipts.snapshot(),
    state:()=>({...receipts.snapshot(),telepathic:true,visible:false,landed:false,destination:null,people:[],delivery:receipts.pending(letters())?.id??null,archiveOpen:!dialog.hidden,conversation}),
    dispose(){for(const e of [archive,read,next,mapNext,other,mapOther,nextDetail,notice,dialog])e.remove();},
  };
}
