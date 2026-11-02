// Exercise the real Chapter 3 host with ordinary keyboard controls and the same
// projectile host as the Stillroom. The enclosing native review uses a test save.
const check=(ok,message)=>{if(!ok)throw Error(message);};
const key=(code,type='keydown')=>document.dispatchEvent(new KeyboardEvent(type,{code,bubbles:true,cancelable:true}));
const press=code=>{key(code);key(code,'keyup');};
let before=null;
export async function controls(api){
  check(api.sorcery,'Chapter 3 did not create the shared Fireball host');
  before={chapter:JSON.stringify(api.chapter.state()),spell:api.sorcery.snapshot()};
  check(await api.oremindiCombat.open({kind:'ambush',rehearsal:true}),'Combat rehearsal did not open');
  window.dispatchEvent(new Event('blur'));
  const c=api.oremindiCombat.controller(),tick=n=>{for(let i=0;i<n;i++){c.tick(1/60,true);api.sorcery.update(1/60);}};
  const mana=api.sorcery.snapshot().mana;press('KeyQ');check(api.sorcery.snapshot().mana===mana,'Briefing allowed a spell');
  c.start();const first=c.snapshot().guards[0],hero=c.snapshot().hero;
  const initialYaw=api.state().camera.yaw,dx=first.x-hero.x,dz=first.z-hero.z;
  check(-Math.sin(initialYaw)*dx-Math.cos(initialYaw)*dz>0,'The ambush camera started facing away from the orcs');
  api.look({yaw:Math.atan2(hero.x-first.x,hero.z-first.z),pitch:.4,distance:12});
  press('KeyT');check(c.focusId()===first.id,'T did not select the opponent in view');
  press('KeyE');check(c.focusId()!==first.id&&c.focusId()!==null,'E did not cycle opponents');
  press('KeyT');check(c.focusId()===null,'T did not unlock');press('KeyT');
  key('KeyF');tick(1);check(c.snapshot().hero.blocking,'F did not raise the staff guard');
  press('KeyQ');check(api.sorcery.snapshot().mana===mana,'Blocking allowed simultaneous casting');key('KeyF','keyup');tick(1);
  key('KeyX');tick(1);check(c.snapshot().hero.swing>0,'X did not swing the staff');key('KeyX','keyup');tick(34);
  key('KeyD');key('Space');tick(1);check(c.snapshot().hero.dodge>0,'Space did not dodge');
  key('Space','keyup');key('KeyD','keyup');tick(24);
  const total=s=>s.guards.reduce((n,g)=>n+g.hp,0),health=total(c.snapshot());
  press('KeyQ');check(api.sorcery.snapshot().mana===mana-20,'Q did not spend the standard 20 mana');
  check(c.snapshot().hero.casting>0,'Fireball did not lock out simultaneous melee');tick(60);
  check(total(c.snapshot())<health,'The physical Fireball did not damage a Chapter 3 orc');
  check(c.snapshot().hero.lastStrike?.kind==='fireball','The shared model did not report the spell hit');
  key('KeyW');const position=c.snapshot().hero;tick(1);key('KeyW','keyup');
  check(Math.hypot(c.snapshot().hero.x-position.x,c.snapshot().hero.z-position.z)>0,'W did not move the hero');
  press('KeyH');check(c.paused(),'H did not open combat help');
  const frozen=JSON.stringify(c.snapshot()),spell=JSON.stringify(api.sorcery.snapshot());tick(30);press('KeyQ');
  check(JSON.stringify(c.snapshot())===frozen&&JSON.stringify(api.sorcery.snapshot())===spell,'Combat or mana advanced during help');
  check(api.state().heroVisible,'Teresod disappeared during combat');
  check(!api.state().frameErrors.length,'Frame errors during manual controls');
  api.step(0,0);await new Promise(resolve=>setTimeout(resolve,120));
  return {controls:['X strike','F guard','Space dodge','Q Fireball','T lock/unlock','E next','W move','H pause'],
    mana:api.sorcery.snapshot().mana,damage:health-total(c.snapshot()),focus:c.focusId(),heroVisible:true};
}
export async function returnFromControls(api){
  const c=api.oremindiCombat.controller();c.withdraw();for(let i=0;i<90;i++)c.tick(1/60,true);
  check(c.reviewing()&&c.spellPaused(),'The result screen did not hold spells');
  const button=[...document.querySelectorAll('#oremindi-encounter button')].find(b=>b.textContent==='Return from rehearsal');
  check(button,'Rehearsal return button missing');button.click();
  const end=performance.now()+60000;while(api.oremindiCombat.controller()||api.state().mode!=='playing'){
    if(performance.now()>end)throw Error('Rehearsal did not return');await new Promise(resolve=>setTimeout(resolve,30));
  }
  check(JSON.stringify(api.chapter.state())===before.chapter,'A rehearsal changed the story');
  check(JSON.stringify(api.sorcery.snapshot())===JSON.stringify(before.spell),'A rehearsal changed campaign mana');
  check(api.sorcery.state().shots.length===0,'A rehearsal leaked projectiles into exploration');
  press('KeyQ');check(api.sorcery.snapshot().mana===before.spell.mana-20,'Field casting did not work after returning');
  check(api.save().ok,'Chapter 3 sorcery could not save');const saved=api.store.read().data;
  check(JSON.stringify(saved.sorcery)===JSON.stringify(api.sorcery.snapshot()),'Chapter 3 save omitted mana');
  await api.loadSaved();check(JSON.stringify(api.sorcery.snapshot())===JSON.stringify(saved.sorcery),'Reload did not restore spent mana');
  window.dispatchEvent(new Event('focus'));
  return {chapterUnchanged:true,manaRestored:true,projectilesCleared:true,manaSaved:saved.sorcery.mana,manaReloaded:api.sorcery.snapshot().mana};
}
