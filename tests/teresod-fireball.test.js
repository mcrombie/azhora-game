import test from 'node:test';
import assert from 'node:assert/strict';
import {createTeresodSorcery,validSorcerySave} from '../src/app/exploration/teresod-fireball.js';
import {createLizeemEncounter} from '../src/gameplay/combat/lizeem-encounter.js';
import {FIREBALL_BASE as F} from '../src/gameplay/magic/fireball-spec.js';
const origin={x:0,y:1,z:0},dir={x:0,y:0,z:1};
test('spell consumes mana, cannot spam or overspend, and recovers after a real active delay',()=>{
 const s=createTeresodSorcery();for(let i=0;i<5;i++){assert(s.cast(origin,dir).ok);assert(!s.cast(origin,dir).ok);for(let n=0;n<12;n++)s.tick(.1);}
 assert.equal(s.state().mana,0);assert(!s.cast(origin,dir).ok);s.tick(10);assert.equal(s.state().mana,0,'Invalid time jumps cannot refill mana');
 for(let i=0;i<30;i++)s.tick(.1);assert(s.state().mana>0&&s.state().mana<2);
});
test('projectile travels before impact, deals the shared base damage, and can kill encounter opponents',()=>{
 const s=createTeresodSorcery(),fight=createLizeemEncounter({heroStart:{x:0,z:0},guardStarts:[{x:0,z:8}]});
 const context={targets:fight.snapshot().guards.map(g=>({...g,y:1})),hit:fight.fireballHit};
 assert(s.cast(origin,dir).ok);assert.equal(fight.snapshot().guards[0].hp,50);s.tick(.1,context);assert.equal(fight.snapshot().guards[0].hp,50);
 for(let i=0;i<10;i++)s.tick(.1,context);assert.equal(fight.snapshot().guards[0].hp,50-F.damage);
 s.tick(.1);assert(s.cast(origin,dir).ok);for(let i=0;i<12;i++)s.tick(.1,context);
 assert.equal(fight.snapshot().guards[0].hp,0);fight.tick(.01);assert.equal(fight.snapshot().outcome,'success');
});
test('solid obstruction stops fireball before the target and never applies damage through it',()=>{
 const s=createTeresodSorcery();let hits=0;s.cast(origin,dir);
 for(let i=0;i<20;i++)s.tick(.1,{blocked:p=>p.z>3,targets:[{id:1,x:0,y:1,z:8,hp:50}],hit:()=>hits++});
 assert.equal(hits,0);assert.equal(s.state().shots.length,0);
});
test('mana persists, legacy saves start full and malformed mana is rejected',()=>{
 const s=createTeresodSorcery();s.cast(origin,dir);assert.equal(createTeresodSorcery(s.snapshot()).state().mana,80);
 assert.equal(createTeresodSorcery().state().mana,100);assert(validSorcerySave(undefined));
 for(const mana of [-1,101,NaN,'100'])assert(!validSorcerySave({...s.snapshot(),mana}));
});
