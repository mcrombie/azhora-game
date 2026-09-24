/** A neutral quest-focus choice. This never creates an NPC or moves the camera. */
export function createQuestChoice({mount=document.body,onOpen=()=>{},onClose=()=>{}}={}) {
  const doc=mount.ownerDocument??document;
  const make=(tag,className,text)=>{const node=doc.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;};
  const overlay=make('div','quest-focus-overlay');overlay.id='quest-choice-overlay';overlay.hidden=true;
  const panel=make('section','quest-focus-panel');panel.id='quest-choice-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
  panel.setAttribute('aria-labelledby','quest-choice-title');panel.setAttribute('aria-describedby','quest-choice-description');
  const closeButton=make('button','quest-focus-close','×');closeButton.type='button';closeButton.setAttribute('aria-label','Close without changing quest focus');
  const eyebrow=make('p','quest-focus-eyebrow','CHOOSE YOUR FOCUS');
  const title=make('h2','quest-focus-title');title.id='quest-choice-title';
  const description=make('p','quest-focus-description');description.id='quest-choice-description';
  const choices=make('div','quest-focus-options');
  const hint=make('p','quest-focus-hint','Switch at any time in Objectives or J → Journey. Esc closes this choice.');
  panel.append(closeButton,eyebrow,title,description,choices,hint);overlay.append(panel);mount.append(overlay);
  let opened=false,returnFocus=null;
  function close(){
    if(!opened)return false;opened=false;overlay.hidden=true;choices.replaceChildren();onClose();
    if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});returnFocus=null;return true;
  }
  function open(model){
    if(!model||!Array.isArray(model.choices)||!model.choices.length)return false;
    if(!opened)returnFocus=doc.activeElement;
    title.textContent=model.title??'The road ahead';description.textContent=model.description??'';choices.replaceChildren();
    for(const choice of model.choices){
      const button=make('button','quest-focus-option');button.type='button';button.dataset.choice=choice.id;button.dataset.grade=choice.grade??'main';
      const icon=make('span','quest-focus-icon','◆');icon.setAttribute('aria-hidden','true');
      const body=make('span','quest-focus-option-copy');
      body.append(make('span','quest-focus-tier',choice.grade==='plot'?'SILVER · OPTIONAL QUEST':'GOLD · MAIN QUEST'),
        make('strong','quest-focus-option-title',choice.label),make('span','quest-focus-option-detail',choice.detail));
      const arrow=make('span','quest-focus-arrow','→');arrow.setAttribute('aria-hidden','true');button.append(icon,body,arrow);
      button.addEventListener('click',()=>{close();choice.action?.();});choices.append(button);
    }
    const wasOpen=opened;opened=true;overlay.hidden=false;if(!wasOpen)onOpen();
    choices.querySelector('button')?.focus({preventScroll:true});return true;
  }
  function keydown(event){
    if(!opened)return;
    // Capture keeps the game from interpreting a modal keystroke as movement, a map,
    // or an attack. Enter and Space retain their native focused-button behavior.
    event.stopImmediatePropagation();
    if(event.code==='Escape'||event.key==='Escape'){event.preventDefault();close();return;}
    if(event.code==='Tab'||event.key==='Tab'){
      const buttons=[...panel.querySelectorAll('button:not(:disabled)')],first=buttons[0],last=buttons.at(-1);
      if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first.focus();}
    }
  }
  closeButton.addEventListener('click',close);overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
  doc.addEventListener('keydown',keydown,true);
  return {open,close,isOpen:()=>opened,destroy(){close();doc.removeEventListener('keydown',keydown,true);overlay.remove();}};
}
