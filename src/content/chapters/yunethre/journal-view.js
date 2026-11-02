import {createTowerQuestView} from '../../../app/exploration/tower-quest-view.js';
import {writeHud} from '../../../app/exploration/hud-write.js';

const STATUS = Object.freeze({completed:'Completed',current:'In progress',pending:'Not yet completed',failed:'Failed',skipped:'Not taken',information:'World history'});
const SYMBOL = Object.freeze({completed:'\u2713',current:'\u25c6',pending:'\u25cb',failed:'\u00d7',skipped:'\u2014',information:'\u00b7'});
const PROVENANCE = Object.freeze({played:'Your recorded journey.',unattended:'Background history: the world moved on without your intervention. These are not completed hero quests.',unrecorded:'No personal quest record was carried from this chapter.'});

function element(tag,className,text){
  const node=document.createElement(tag);if(className)node.className=className;
  if(text!==undefined)node.textContent=text;return node;
}
function statusOf(entry){return Object.hasOwn(STATUS,entry.status)?entry.status:'information';}
function taskRow(entry,{compact=false}={}){
  const status=statusOf(entry),row=element('li','yunethre-journal-entry');row.dataset.status=status;row.dataset.quest=entry.id;
  const symbol=element('span','yunethre-quest-symbol',SYMBOL[status]);symbol.setAttribute('aria-hidden','true');
  const words=element('div','yunethre-entry-words'),title=element('strong','',entry.title);
  const state=element('span',compact?'yunethre-sr-only':'yunethre-entry-status',STATUS[status]);
  words.append(title,state);
  if(entry.detail&&(!compact||status==='current'))words.append(element('p','yunethre-entry-detail',entry.detail));
  row.append(symbol,words);return row;
}

/** Chapter-owned content with the shared world/tower directional marker. */
export function createYunethreQuestView({position,mode,quest,projection,onOpenJournal=()=>{},autoplayHint='P · Autoplay'}){
  let nodes=null,signature='',stepsSignature='';
  const view=createTowerQuestView({position,mode,quest,renderCard(card,current){
    const journal=projection(),active=journal.active;
    if(!nodes){
      card.className='yunethre-quest-card';card.setAttribute('aria-label','Current main quest');
      const label=element('small','yunethre-quest-eyebrow'),title=element('h3'),purpose=element('p','yunethre-quest-purpose');
      const steps=element('ol','yunethre-quest-checklist');steps.setAttribute('aria-label','Quest progress');
      const next=element('div','yunethre-quest-next'),action=element('p'),destination=element('p','yunethre-quest-destination');
      next.append(element('small','','Next'),action,destination);
      const deadline=element('p','yunethre-quest-deadline');deadline.setAttribute('role','timer');
      const footer=element('footer','yunethre-quest-footer'),button=element('button','yunethre-open-journal','Quest journal');
      button.type='button';button.setAttribute('aria-haspopup','dialog');button.append(element('kbd','','Shift+J'));button.onclick=()=>onOpenJournal();
      footer.append(button,element('small','yunethre-autoplay-hint',autoplayHint));
      card.replaceChildren(label,title,purpose,steps,next,deadline,footer);
      nodes={label,title,purpose,steps,action,destination,deadline};
    }
    // Keep frame-driven updates cheap and preserve focused controls and scroll.
    const distance=current.edgeMarker&&current.target?Math.round(Math.hypot(current.target.x-position.x,current.target.z-position.z)):null;
    const destination=current.markerLabel??active.destination?.name??current.title;
    const nextSignature=JSON.stringify([active,journal.complete,current.label,current.clock,journal.deadline,destination,distance]);
    if(signature===nextSignature)return;signature=nextSignature;
    writeHud(nodes.label,'textContent',current.label??'MAIN QUEST / CHAPTER 2');
    writeHud(nodes.title,'textContent',active.title);
    writeHud(nodes.purpose,'textContent',active.purpose);
    const nextStepsSignature=JSON.stringify(active.steps);
    if(stepsSignature!==nextStepsSignature){stepsSignature=nextStepsSignature;nodes.steps.replaceChildren(...active.steps.map(step=>taskRow(step,{compact:true})));}
    writeHud(nodes.action,'textContent',active.action);
    writeHud(nodes.destination,'textContent',journal.complete?'':distance===null?destination:`${destination} · ${distance} m direct`);
    writeHud(nodes.destination,'hidden',!!journal.complete);
    writeHud(nodes.deadline,'textContent',current.clock??journal.deadline?.text??'');
    writeHud(nodes.deadline,'hidden',!nodes.deadline.textContent);
    nodes.deadline.dataset.status=journal.deadline?.status??'waiting';
    nodes.deadline.dataset.urgent=String(journal.deadline?.status==='running'&&journal.deadline.seconds<=120&&journal.deadline.seconds>0);
  }});
  return view;
}

/** An ordinary modal view; the host owns pausing/resuming and the J hotkey. */
export function createYunethreJournalView({projection,onOpen=()=>{},onClose=()=>{}}){
  const dialog=element('dialog','yunethre-journal');dialog.id='yunethre-journal';
  dialog.setAttribute('aria-labelledby','yunethre-journal-title');dialog.setAttribute('aria-describedby','yunethre-journal-intro');
  const heading=element('header','yunethre-journal-heading'),headingWords=element('div');
  headingWords.append(element('small','eyebrow','TERESOD / QUEST JOURNAL'));
  const title=element('h2','','The journey so far');title.id='yunethre-journal-title';headingWords.append(title);
  const closeButton=element('button','yunethre-journal-close','Close');closeButton.type='button';closeButton.setAttribute('aria-label','Close quest journal');closeButton.append(element('kbd','','Esc'));
  heading.append(headingWords,closeButton);
  const intro=element('p','yunethre-journal-intro');intro.id='yunethre-journal-intro';
  const tabs=element('nav','yunethre-journal-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Chapters');
  const panel=element('section','yunethre-journal-panel');panel.id='yunethre-journal-panel';panel.setAttribute('role','tabpanel');panel.tabIndex=0;
  const foot=element('footer','yunethre-journal-foot','The world is paused while you read. Shift+J or Esc closes the quest journal. J opens your nature life list while exploring.');
  dialog.append(heading,intro,tabs,panel,foot);document.body.append(dialog);
  let opened=false,disposed=false,selected=projection().activeChapter??'chapter-two',lastSignature='',previousFocus=null;

  function render(force=false){
    if(!opened||disposed)return;
    const journal=projection(),chapters=journal.chapters;
    if(!chapters.some(c=>c.id===selected))selected=chapters.at(-1)?.id??'';
    const signature=JSON.stringify([journal,selected]);if(!force&&signature===lastSignature)return;lastSignature=signature;
    writeHud(intro,'textContent',journal.summary);
    const priorTab=globalThis.document.activeElement?.dataset?.chapter;
    tabs.replaceChildren(...chapters.map(chapter=>{
      const tab=element('button','',chapter.title);tab.type='button';tab.dataset.chapter=chapter.id;tab.id=`yunethre-journal-tab-${chapter.id}`;
      tab.setAttribute('role','tab');tab.setAttribute('aria-controls',panel.id);tab.setAttribute('aria-selected',String(chapter.id===selected));tab.tabIndex=chapter.id===selected?0:-1;
      tab.onclick=()=>select(chapter.id,true);return tab;
    }));
    const chapter=chapters.find(c=>c.id===selected);panel.replaceChildren();panel.scrollTop=0;
    if(chapter){
      panel.setAttribute('aria-labelledby',`yunethre-journal-tab-${chapter.id}`);
      const chapterHeader=element('header','yunethre-chapter-heading');
      chapterHeader.append(element('h3','',chapter.title),element('p','',chapter.summary));
      if(chapter.provenance)chapterHeader.append(element('p','yunethre-journal-provenance',PROVENANCE[chapter.provenance]??chapter.provenance));
      panel.append(chapterHeader);
      if(chapter.id===(journal.activeChapter??'chapter-two')){
        const current=element('section','yunethre-journal-task');
        current.append(element('small','',journal.complete?'Assignment complete':'Current task'),element('h4','',journal.active.title),element('p','',journal.active.action));
        if(journal.deadline&&!journal.complete){
          const clock=element('div','yunethre-journal-clock');
          clock.append(element('strong','',journal.deadline.label),element('p','',journal.deadline.text));current.append(clock);
        }
        panel.append(current);
        if(journal.inventory?.length){
          const inventory=element('section','yunethre-journal-section');inventory.append(element('h4','','Quest inventory'));
          const items=element('ul');for(const item of journal.inventory)items.append(element('li','',`${item.quantity} × ${item.name}`));inventory.append(items);panel.append(inventory);
        }
      }
      const groups=[
        ['Completed quests',entry=>entry.status==='completed'],
        ['Current objectives',entry=>entry.status==='current'||entry.status==='pending'],
        ['Other outcomes',entry=>entry.status==='failed'||entry.status==='skipped'],
        ['World history',entry=>statusOf(entry)==='information'],
      ];
      for(const [label,accept]of groups){
        const entries=chapter.entries.filter(accept);if(!entries.length)continue;
        const section=element('section','yunethre-journal-section');
        section.append(element('h4','',`${label} · ${entries.length}`));
        const list=element('ol','yunethre-journal-entries');list.append(...entries.map(entry=>taskRow(entry)));section.append(list);panel.append(section);
      }
      if(!chapter.entries.length)panel.append(element('p','yunethre-journal-empty','No recorded quests in this chapter yet.'));
    }
    if(priorTab)tabs.querySelector(`[data-chapter="${selected}"]`)?.focus();
  }
  function select(id,focus=false){
    selected=id;render(true);if(focus)tabs.querySelector(`[data-chapter="${selected}"]`)?.focus();
  }
  function finishClose(){
    if(!opened)return;opened=false;lastSignature='';
    const restoreFocus=previousFocus;previousFocus=null;
    if(!disposed){onClose();restoreFocus?.focus?.();}
  }
  function close(){
    if(!opened)return false;
    if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute?.('open');
    finishClose();return true;
  }
  function open(chapterId){
    if(disposed)return false;
    if(chapterId)selected=chapterId;
    if(opened){render(true);return true;}
    const focus=document.activeElement;if(onOpen()===false)return false;
    previousFocus=focus;opened=true;render(true);
    if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
    closeButton.focus?.();return true;
  }
  closeButton.onclick=close;
  dialog.oncancel=event=>{event.preventDefault();close();};
  // Native close events are queued: a rapid reopen must not close the new view.
  dialog.onclose=()=>{if(!dialog.open)finishClose();};
  // Native dialog supplies a focus trap; arrow navigation follows the tabs pattern.
  tabs.onkeydown=event=>{
    const chapters=projection().chapters,at=chapters.findIndex(c=>c.id===selected);let next=at;
    if(event.key==='ArrowRight')next=(at+1)%chapters.length;
    else if(event.key==='ArrowLeft')next=(at-1+chapters.length)%chapters.length;
    else if(event.key==='Home')next=0;
    else if(event.key==='End')next=chapters.length-1;
    else return;
    event.preventDefault();event.stopPropagation?.();if(chapters[next])select(chapters[next].id,true);
  };
  return {open,close,toggle(){return opened?close():open();},update:render,isOpen:()=>opened,
    dispose(){if(disposed)return;disposed=true;if(opened)close();dialog.remove();previousFocus=null;}};
}
