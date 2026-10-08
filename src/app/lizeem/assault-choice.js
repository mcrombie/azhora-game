// A comparison choice within the existing briefing, not a second campaign mode.
export function createAssaultChoice(anchor){
  const root=document.createElement('label');root.id='assault-choice';root.hidden=true;
  const input=document.createElement('input');input.type='checkbox';input.id='assault-with-allies';
  const text=document.createElement('span');root.append(input,text);anchor.after(root);
  return {show(pending,supported){
    root.hidden=!supported||!pending.rally||!pending.participation;
    input.checked=pending.rally?.style==='allied';input.disabled=!!pending.rally?.style||!!pending.rally?.stopped;
    const alive=pending.rally?.allied?pending.rally.allied.totalAllies-pending.rally.allied.lost:3;
    text.textContent=`Fight with allies (experimental): ${alive} allied soldiers join you. Enemies remain determined by the interception. The last isolated enemy may retreat. Unchecked uses the original solo assault.`;
  },style:()=>input.checked?'allied':'solo'};
}
