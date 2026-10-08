const assert=(v,m)=>{if(!v)throw Error(m);};
const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const press=code=>{document.dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true,cancelable:true}));document.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));};
export async function checkFocus(a){
 window.dispatchEvent(new Event('focus'));document.querySelector('[data-combat-exercise="squad"]').click();
 for(let i=0;i<50&&a.state().mode!=='skirmish';i++)await frame();
 const fight=()=>a.practice.state().encounter;
 assert(fight(),'Squad practice starts');a.look({yaw:0,pitch:.36,distance:10});press('KeyT');a.step(1/60);
 let s=fight(),id=s.presentation.focus.id;assert(id!==null&&s.hero.focusId===id,'T locks a real opponent');
 assert(document.getElementById('combat-focus-toggle').getAttribute('aria-pressed')==='true','Focus toggle exposes its state');
 a.hold('KeyD',true);for(let i=0;i<30;i++)a.step(1/60);a.hold('KeyD',false);s=fight();
 const g=s.guards.find(g=>g.id===id),expected=Math.atan2(g.x-s.hero.x,g.z-s.hero.z);
 assert(Math.abs(Math.atan2(Math.sin(s.hero.heading-expected),Math.cos(s.hero.heading-expected)))<.08,'Strafing keeps Teresod facing his selected opponent');
 const screen=p=>a.project({x:p.x,y:a.testWorld.heightAt(p.x,p.z)+1,z:p.z});
 for(const p of [s.hero,g]){const q=screen(p);assert(Math.abs(q.x)<.85&&Math.abs(q.y)<.85&&q.z<1,'Hero and focused enemy stay comfortably in camera frame');}
 press('KeyE');a.step(1/60);assert(fight().presentation.focus.id!==id&&fight().presentation.focus.id!==null,'E cycles to another visible opponent');
 const visited=new Set([id,fight().presentation.focus.id]);press('KeyE');a.step(1/60);visited.add(fight().presentation.focus.id);assert(visited.size===3,'Cycling reaches all three opponents without bouncing between two');
 const locked=fight().presentation.focus.id;a.look({yaw:a.state().camera.yaw+.65});for(let i=0;i<15;i++)a.step(1/60);
 assert(fight().presentation.focus.id===locked&&fight().presentation.focus.manual,'Manual look temporarily overrides the camera without losing focus');
 const manualYaw=a.state().camera.yaw;for(let i=0;i<20;i++)a.step(1/60);assert(a.state().camera.yaw===manualYaw,'Automatic follow does not fight a recent manual look');
 press('KeyT');a.step(1/60);assert(fight().hero.focusId===null,'T releases focus');
 press('KeyT');a.step(1/60);const clock=fight().time;press('KeyH');press('KeyE');for(let i=0;i<30;i++)a.step(1/60);assert(fight().time===clock,'Help still freezes combat with a target locked');press('Escape');
 document.getElementById('world-skirmish-retry').click();assert(fight().presentation.focus.id===null,'Retry resets focus without leaking the old target UI');
 assert(document.querySelectorAll('#combat-focus').length===1,'A single focus UI exists after retry');
 press('KeyT');for(let i=0;i<8;i++)a.step(1/60);window.dispatchEvent(new Event('blur'));await frame();
 assert(!a.state().frameErrors.length,'No targeting or camera renderer errors');
 return {checks:['T locks; E cycles; T releases','Strafing faces chosen opponent','Both fighters stay in camera frame','Manual look overrides camera without dropping target','Help freezes targeting and combat','Retry resets focus and disposes previous UI','No renderer errors'],focus:fight().presentation.focus};
}
