import {campaignAssaultStyle,campaignAssaultBriefing} from './assault-briefing.js';

// The campaign briefing describes the committed squad; solo comparisons live
// in Combat Testing. Existing solo save histories continue unchanged.
export function createAssaultChoice(anchor){
  const root=document.createElement('p');root.id='assault-choice';root.hidden=true;anchor.after(root);
  let style='allied';
  return {show(pending,supported){
    root.hidden=!supported||!pending.rally||!pending.participation;
    style=campaignAssaultStyle(pending);root.textContent=campaignAssaultBriefing(pending);
  },style:()=>style};
}
