// Deliberately ephemeral. No checkpoint format, faction state, rewards or atlas IDs.
export const ANNEX_SITES = Object.freeze([
  {id:'attendant',name:'Speak with the attendant',x:-3.8,z:3.1},
  {id:'emissary',name:'Speak with the hot-climate emissary',x:-6.1,z:-5.4},
  {id:'partition',name:'Slide the insulating partition into place',x:.2,z:-1.3},
  {id:'heat',name:'Inspect the heated alcove',x:-8.5,z:-2.2},
  {id:'frost',name:'Inspect the frost recess',x:5.8,z:-6.8},
  {id:'humidity',name:'Inspect the runoff channel',x:6.3,z:2.8},
  {id:'exit',name:'Leave the annex',x:0,z:14},
]);
export function createAnnexState(){
  let phase='leaking',progress=0;
  return {
    get phase(){return phase;},get progress(){return progress;},
    move(){if(phase!=='leaking')return false;phase='moving';return true;},
    tick(dt){if(phase==='moving'){progress=Math.min(1,progress+Math.max(0,dt)/2.4);if(progress===1)phase='settled';}},
    reset(){phase='leaking';progress=0;},
    nearest(p,clear=()=>true){return ANNEX_SITES.filter(s=>!(s.id==='partition'&&phase!=='leaking')&&Math.hypot(p.x-s.x,p.z-s.z)<2.5&&clear(p,s)).sort((a,b)=>Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(p.x-b.x,p.z-b.z))[0]??null;},
    view(){return {phase,progress};},
  };
}
