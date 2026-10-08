import {REAPER_SPOT} from '../../content/regions/minora-frontier/limbo-chamber.js';
import {writeHud} from './hud-write.js';

const choices=[
  ['menu','Main menu','Save your place here. Continue returns to limbo.'],
  ['retry','Retry this battle','Rewind this fight. Keep the preceding interception, if any.'],
  ['before','Before I agreed to fight','Rewind to the decision, with the option to walk away.'],
  ['tower',"Return to Taleth’s tower",'Return alive to Minora. Keep the battle outcome.'],
  ['ghost','Become a ghost','Invisible to soldiers; pass through objects. Cannot fight or ride.'],
  ['undead','Become undead','Return in a pale, physical body. Keep the battle outcome.'],
];
export function createAfterlifeHost({saved,position,mode,setMode,capture,enter,restore,returnToWorld,save,mainMenu,onChange,notice}){
  let state=structuredClone(saved??{version:1,form:'living',inLimbo:false}),before=null,busy=false,rewindForm=null;
  const root=document.createElement('section');root.id='afterlife';root.hidden=true;
  root.innerHTML='<aside id="afterlife-heading"><span class="eyebrow">BETWEEN DEPARTURES</span><h2>A room outside the hours</h2><p>Your battle is over. Speak with the Grim Reaper.</p></aside><button id="reaper-talk">F / Talk to the Grim Reaper</button><button id="reaper-return">Return to the Reaper</button><section id="reaper-dialog" class="veil" role="dialog" aria-modal="true" aria-labelledby="reaper-name" hidden><div class="reaper-card"><span class="eyebrow">THE ROOM BETWEEN DEPARTURES</span><h2 id="reaper-name">The Grim Reaper</h2><p id="reaper-report"></p><div id="reaper-choices"></div><button id="reaper-close">Let me think</button><p id="reaper-error" role="status"></p></div></section>';
  document.body.append(root);const $=id=>root.querySelector('#'+id),dialog=$('reaper-dialog');
  const buttons=choices.map(([id,label,detail])=>{const b=document.createElement('button');b.dataset.afterlife=id;const title=document.createElement('strong'),small=document.createElement('small');title.textContent=label;small.textContent=detail;b.append(title,small);b.onclick=()=>choose(id);$('reaper-choices').append(b);return b;});
  function update(){
    writeHud(root,'hidden',!state.inLimbo&&state.form==='living');
    document.body.classList.toggle('afterlife-active',!root.hidden);
    writeHud($('afterlife-heading'),'hidden',!state.inLimbo||!['limbo','reaper'].includes(mode()));
    writeHud($('reaper-talk'),'hidden',!state.inLimbo||mode()!=='limbo'||Math.hypot(position.x-REAPER_SPOT.x,position.z-REAPER_SPOT.z)>4);
    writeHud($('reaper-return'),'hidden',state.inLimbo||state.form==='living'||mode()!=='playing');
    writeHud($('reaper-return'),'textContent',`${state.form==='ghost'?'Ghost':'Undead'} / Return to the Reaper`);
  }
  function talk(){if(!state.inLimbo||busy)return;setMode('reaper');dialog.hidden=false;$('reaper-report').textContent=state.death.report;$('reaper-error').textContent='';buttons[1].focus();update();}
  async function choose(id){
    if(!state.inLimbo||busy||!choices.some(c=>c[0]===id))return false;
    busy=true;for(const b of [...buttons,$('reaper-close')])b.disabled=true;
    try{
      if(id==='menu'){const result=save();if(!result.ok)throw Error(result.reason??'Could not save. You are still here.');mainMenu();return true;}
      const d=state.death;
      if(id==='retry'||id==='before'){
        // Restore exactly the attempt's checkpoint, never a stack of failed tries.
        rewindForm=d.previousForm;
        await restore(structuredClone(d.before),id==='retry'?d.side:null,d.previousForm);
        state={version:1,form:d.previousForm,inLimbo:false,...(d.previousForm==='undead'?{death:d}:{})};
      }else{
        const form=id==='tower'?'living':id;
        await returnToWorld(id,d.fallen,form);
        state={...state,form,inLimbo:false};
      }
      dialog.hidden=true;onChange();update();return true;
    }catch(error){$('reaper-error').textContent=error.message;notice(error.message);return false;}
    finally{busy=false;rewindForm=null;for(const b of [...buttons,$('reaper-close')])b.disabled=false;}
  }
  $('reaper-talk').onclick=talk;$('reaper-close').onclick=()=>{dialog.hidden=true;setMode('limbo');update();};
  $('reaper-return').onclick=async()=>{if(busy)return;busy=true;try{await enter();state.inLimbo=true;onChange();update();}catch(e){notice(e.message);}finally{busy=false;}};
  return {
    beforeFight(){before={checkpoint:capture(),form:rewindForm??state.form};},
    async died({pending,side,field,report}){
      if(!before)throw Error('The pre-battle checkpoint is missing.');
      state={version:1,form:before.form,inLimbo:true,death:{battleId:pending.battleId,stage:pending.rally?'rally':'intercept',side,previousForm:before.form,
        fallen:{x:field.hero.x,y:position.y,z:field.hero.z},before:before.checkpoint,report}};
      await enter();onChange();update();
    },
    snapshot:()=>structuredClone(state),get inLimbo(){return state.inLimbo;},get form(){return state.form;},
    restore(data){state=structuredClone(data??{version:1,form:'living',inLimbo:false});dialog.hidden=true;before=null;update();},
    talk,choose,update,
    keydown(event){
      if(dialog.hidden)return false;
      if(event.code==='Escape'){event.preventDefault();if(!busy)$('reaper-close').click();}
      if(event.code==='Tab'){event.preventDefault();const all=[...buttons,$('reaper-close')].filter(b=>!b.disabled);const i=all.indexOf(document.activeElement);all[(i+(event.shiftKey?-1:1)+all.length)%all.length]?.focus();}
      return true;
    },
    dispose(){root.remove();document.body.classList.remove('afterlife-active');}
  };
}
