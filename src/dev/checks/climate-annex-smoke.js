export async function checkClimateAnnex(h){
  const checks=[];const check=(v,name)=>{if(!v)throw new Error(name);checks.push(name);};
  check(h.state().entities===2,'Exactly two active NPCs');
  h.step(-.02);check(h.state().phase==='leaking','A stale initial animation timestamp cannot reverse the draft or break rendering');
  const walk=points=>h.walk(points.map(([x,z])=>({x,z})));
  h.reset();const start=h.state().position;
  document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW'}));for(let i=0;i<20;i++)h.step(.02);document.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW'}));
  check(h.state().position[2]<start[2]-.5,'W key moves the player through the real movement handler');
  document.dispatchEvent(new KeyboardEvent('keydown',{code:'Space'}));h.step(.1);document.dispatchEvent(new KeyboardEvent('keyup',{code:'Space'}));check(h.state().position[1]>1,'Space starts a jump');
  h.reset();await walk([[0,5],[0,1.5],[-3.8,1.5]]);h.interact();check(h.state().dialogue==='Goblin attendant','Attendant approached through entrance and spoken to');h.next();h.next();
  await walk([[-4,-1],[-6.1,-3.3]]);h.interact();check(h.state().dialogue==='Hot-climate emissary','Emissary reached and spoken to');h.next();h.next();
  await walk([[-4,-.5],[1,-.5],[1,-4.5],[5.8,-5.1]]);h.interact();check(h.state().dialogue==='A closer look','Frost recess inspected');h.next();
  await walk([[1,-4.5],[1,.5],[6.3,3.4]]);h.interact();check(h.state().dialogue==='A closer look','Humid chamber reached and inspected');h.next();
  await walk([[6.3,3.4],[3.4,3.4],[2,.5],[.2,-.8]]);check(h.state().near==='partition','Partition prompt can be reached');
  const visualBefore=h.state().visual;check(visualBefore.dripping>0&&visualBefore.draftLight>0&&visualBefore.frostCoverage<.1,'Open seam shows warm spill, dripping and a thawed patch');
  const before=h.state().partition;h.interact();check(h.state().phase==='moving','Normal interaction starts screen movement');for(let i=0;i<150;i++)h.step(.02);
  check(h.state().phase==='settled'&&h.state().partition>before+2,'Screen visibly changes position and resolves the incident');
  const visualAfter=h.state().visual;check(visualAfter.dripping===0&&visualAfter.draftLight===0&&visualAfter.frostCoverage>.99,'Sealed seam removes the warm spill and drips and restores the same frost patch');
  await walk([[-4,-.5],[-6.1,-3.3]]);h.interact();check(h.state().dialogue==='Hot-climate emissary','Emissary has a response after resolution');h.next();h.next();
  await walk([[-4,-.5],[1,-.5],[1,-4.5],[5.8,-5.1]]);h.interact();check(h.state().dialogue==='A closer look','Cold recess remains reachable after the screen closes');h.next();
  await walk([[1,-4.5],[1,.5],[6.3,3.4]]);h.interact();check(h.state().dialogue==='A closer look','Enclosed humid bay remains reachable after the screen closes');h.next();
  const positions=[];for(let i=0;i<80;i++){h.step(.05);positions.push(h.state().visual.stampHeight);}check(Math.max(...positions)-Math.min(...positions)>.18,'Attendant repeats a visible stamping motion');
  h.reset();await walk([[0,1.5],[-4.8,1.5],[-4.8,3]]);check(h.state().position[1]===1.32,'Raised clerk platform supports the player at its visible surface');
  h.reset();check(h.state().phase==='leaking','Reset restores unresolved conditions');h.reset();check(h.state().phase==='leaking','Repeated reset is safe');
  return {ok:true,checks};
}
