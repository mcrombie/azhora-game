import { SPELLS, SPELL_IDS, FOCUS_WEAPONS, castWith, focusAt, spellXp, readingXp } from './sorcery.js';
import { meleeLineClear } from './melee-contact.js';
import { TESTIMONY, MURDERER, MURDERER_READING } from './murder-quest.js';

export const MAGIC_VERSION = 1;
const CAST_RECOVERY = .32;
const finite = point => point && Number.isFinite(point.x) && Number.isFinite(point.z);
const alive = actor => finite(actor) && !actor.dead && actor.active !== false && actor.action !== 'dead'
  && !(Number.isFinite(actor.hp) && actor.hp <= 0);
const gap = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);

/** Thoughts are authored flavour, never extra testimony or a substitute for Troy's case. */
export function thoughtOf(npc) {
  if (!npc?.id) return null;
  if (npc.id === MURDERER) return MURDERER_READING;
  if (TESTIMONY[npc.id]) return TESTIMONY[npc.id].reading;
  if (typeof npc.thought === 'string' && npc.thought.trim()) return npc.thought;
  if (npc.id === 'ben-sorcerer') return 'The thorns, the spider, and the relief of having somebody beside him. He is trying not to show the last part.';
  if (npc.id === 'liz-beekeeper') return 'The cat is the first thing she checks when she opens the door, and the last before she shuts it.';
  if (npc.id === 'bee-keeper') return 'He is still going over the three accounts, fitting each small truth against the others.';
  if (/guard|soldier|officer/i.test(`${npc.role ?? ''} ${npc.kind ?? ''}`)) return 'The end of the watch. Dry boots, a warm meal, and a quiet road until then.';
  return `${npc.name ?? 'This person'} is thinking of home and the work still waiting there. Nothing clearer rises to the surface.`;
}

export function validateMagicSnapshot(data) {
  return !!data && data.version === MAGIC_VERSION && Array.isArray(data.learned)
    && data.learned.every(id => SPELL_IDS.includes(id)) && new Set(data.learned).size === data.learned.length
    && (data.selected === null || data.learned.includes(data.selected))
    && Number.isFinite(data.focus) && data.focus >= 0 && data.focus <= 200
    && Array.isArray(data.read) && data.read.every(id => typeof id === 'string' && id.length > 0)
    && new Set(data.read).size === data.read.length;
}

/** Small spell runtime shared by the game and tests. Only learned spells are castable:
 * level one in a school does not mean its teacher has already shown the spell.
 * `damageWorld` applies one external NPC contact and returns actual {damage,hp,maxHp,dead}.
 */
export function createMagic({ skills, inventory, weapons, combat, position, world,
  getBodies = () => [], damageWorld = () => null, getCastOrigin = () => null, onEvent = () => {} } = {}) {
  const learned = new Set(), read = new Set();
  let selected = null, focus = 60, pending = null, recovery = null, sequence = 0;
  const projectiles = [], swarms = [];
  const emit = (type, value = {}) => onEvent({ type, ...value });
  const caster = () => typeof position === 'function' ? position() : position;
  const maxLevel = () => Math.max(1, ...[...learned].map(id => skills.level(SPELLS[id].school)));
  const capacity = () => focusAt(maxLevel());
  const stop = () => { pending = recovery = null; projectiles.length = 0; swarms.length = 0; };

  function learn(id, { equip = true, announce = true, grantWand = false } = {}) {
    if (!SPELLS[id]) return { ok: false, reason: 'There is no such spell.' };
    const first = !learned.has(id);
    learned.add(id); selected ??= id;
    skills.learn(SPELLS[id].school);
    let focusWeapon = Object.keys(FOCUS_WEAPONS).find(weaponId => weapons.status(weaponId)?.usable);
    let granted = false;
    // A teacher may supply a first wand, but revisiting a lesson must not repair
    // an existing one or create another reward after the spell was learned.
    if (first && (grantWand || !focusWeapon) && !inventory.has('wand')) {
      granted = inventory.add('wand');
      if (granted) weapons.setCondition('wand', 24);
      focusWeapon ??= weapons.status('wand')?.usable ? 'wand' : null;
    }
    if (first && equip && focusWeapon) weapons.equip(focusWeapon);
    if (first && learned.size === 1) focus = capacity().focus;
    const result = { ok: true, first, id, school: SPELLS[id].school, granted, focusWeapon };
    if (first && announce) emit('spell-learned', result);
    return result;
  }

  function bodies() {
    // Once a fight ends, surviving NPCs return to their moving world models.
    // The retained result roster must not reserve an old, invisible copy of them.
    const fighting = ['active','practice'].includes(combat.state.phase);
    const internal = fighting ? [ ...(combat.state.enemies ?? []).map(actor => ({...actor, team:'enemy', managed:true})),
      ...(combat.state.allies ?? []).map(actor => ({...actor, team:'ally', managed:true})) ] : [];
    const reserved = new Set(internal.flatMap(actor => [actor.id,actor.npcId]).filter(Boolean));
    const seen = new Set();
    return [...internal, ...getBodies().filter(actor => !reserved.has(actor.id) && !reserved.has(actor.npcId)).map(actor=>({...actor,managed:false}))]
      .filter(actor => {
        const id = actor.npcId ?? actor.id;
        if (!id || id === 'traveler' || seen.has(id) || !alive(actor)) return false;
        seen.add(id); return true;
      });
  }

  function hit(target, profile, origin, yaw) {
    const event = { id: `spell-hit-${++sequence}`, spellId: profile.id, school: profile.school,
      source: 'player', sourceId: 'traveler', targetId: target.id, targetNpcId: target.npcId,
      x: target.x, z: target.z, origin: {x:origin.x,z:origin.z}, yaw, damage: profile.damage };
    let result = target.managed ? combat.spellHit(target.id, profile.damage, { yaw, spellId: profile.id }) : {handled:false};
    const managed = !!result.handled;
    if (!managed) result = damageWorld(target, profile.damage, event) ?? {damage:0};
    const dealt = Math.max(0, result.damage ?? 0), killed = !!(result.killed || result.dead);
    if (dealt > 0) skills.gain(profile.school, spellXp(dealt, { killing:killed }));
    emit('spell-impact', { ...event, managed, damage:dealt, hp:result.hp, maxHp:result.maxHp, killed,
      team:target.team, spared:result.spared });
  }

  /** Shared by the cast action and its controls, so the button tells the truth
   * after learning, changing equipment, or spending the last of the focus. */
  function readiness(id = selected) {
    const weapon = weapons.profile();
    const cost = SPELLS[id] ? castWith(id, {level:skills.level(SPELLS[id].school),weapon:'wand'}).cost : 0;
    const result = (ok,code,reason='') => ({ok,code,reason,cost,weaponId:weapon.id});
    if (!learned.has(id)) return result(false,'unlearned','Ask its teacher to show you this spell first.');
    if (!finite(caster()) || combat.state.player.hp <= 0) return result(false,'unavailable','You cannot cast now.');
    if (pending) return result(false,'casting','Gathering focus…');
    if (['attack','hurt','dodge','dead'].includes(combat.state.player.action)) return result(false,'busy','Finish your current action first.');
    if (!FOCUS_WEAPONS[weapon.id]) return result(false,'equipment','Equip your wand or oak staff in the satchel first.');
    if (!weapon.usable) return result(false,'broken','Your casting weapon is broken. Equip a usable wand or oak staff.');
    if (focus < cost) return result(false,'focus','Not enough focus. It returns outside combat.');
    return result(true,'ready');
  }

  function cast(id = selected, { target = null, yaw = caster()?.yaw ?? 0 } = {}) {
    const ready = readiness(id);
    if (!ready.ok) return ready;
    const profile = castWith(id, {level:skills.level(SPELLS[id].school),weapon:ready.weaponId});
    const from = {...caster()};
    if (profile.spoken) {
      const candidates = bodies();
      const person = target ? candidates.find(body => body.id === target.id || body.npcId === target.id) :
        candidates.filter(body => gap(body,from) <= profile.range && meleeLineClear(from,body,world)).sort((a,b) => gap(a,from)-gap(b,from))[0];
      if (!person || gap(person,from)>profile.range || !meleeLineClear(from,person,world)) return {ok:false,reason:'Stand within four paces of someone you can see.'};
      const thought = thoughtOf({...person,...target});
      if (!thought) return {ok:false,reason:'No clear thought reaches you.'};
      focus -= profile.cost; selected = id;
      const key = person.npcId ?? person.id, first = !read.has(key);
      read.add(key); if (first) skills.gain('mind',readingXp({learned:true}));
      const result = {ok:true,id,targetId:key,name:target?.name??person.name??'A passing thought',text:thought,first};
      emit('mind-read',result); return result;
    }
    focus -= profile.cost; selected = id;
    recovery = null;
    pending = {profile,weaponId:ready.weaponId,remaining:profile.cast,yaw:Number.isFinite(yaw)?yaw:0};
    emit('spell-cast',{id,school:profile.school,cast:profile.cast});
    return {ok:true,id};
  }

  // The same normalized gesture drives the visible hand and the release sample.
  // Its halfway point is the wrist flick; the rest is a short follow-through.
  function pose() {
    const cast = pending ?? recovery;
    if (!cast) return null;
    return {id:cast.profile.id,weaponId:cast.weaponId,yaw:cast.yaw,
      progress:pending ? .5 * Math.min(1,Math.max(0,1-pending.remaining/pending.profile.cast))
        : .5 + .5 * Math.min(1,Math.max(0,1-recovery.remaining/CAST_RECOVERY))};
  }

  function release(cast) {
    const at = caster(), id = `magic-${++sequence}`;
    const tip = getCastOrigin({id:cast.profile.id,weaponId:cast.weaponId,yaw:cast.yaw,progress:.5});
    const origin = finite(tip) && Number.isFinite(tip.y) ? {x:tip.x,y:tip.y,z:tip.z}
      : {x:at.x,y:(at.y??world?.heightAt?.(at.x,at.z)??0)+1.2,z:at.z};
    // A hand reaching through a wall must not launch a spell on its other side.
    if (!meleeLineClear(at,origin,world)) { emit('spell-stopped',{id,...origin}); return; }
    if (cast.profile.swarm) swarms.push({id,...origin,profile:cast.profile,left:cast.profile.stay,tick:0});
    else projectiles.push({id,...origin,yaw:cast.yaw,flown:0,profile:cast.profile,origin:{...origin}});
    emit('spell-released',{id,spellId:cast.profile.id,origin:{...origin}});
  }

  function step(dt) {
    if (combat.state.player.hp <= 0) { stop(); return; }
    if (!pending && combat.state.phase !== 'active') focus = Math.min(capacity().focus,focus+capacity().regain*dt);
    const interrupted = ['attack','hurt','dodge','dead'].includes(combat.state.player.action);
    const focusWeapon = weapons.profile();
    if (recovery) {
      recovery.remaining -= dt;
      if (recovery.remaining<=0 || interrupted || focusWeapon.id!==recovery.weaponId || !focusWeapon.usable) recovery=null;
    }
    if (pending) {
      if (interrupted || focusWeapon.id!==pending.weaponId || !focusWeapon.usable) { pending=null; emit('spell-interrupted'); }
      else { pending.remaining-=dt; if(pending.remaining<=0){const ready=pending;pending=null;
        recovery={...ready,remaining:CAST_RECOVERY};release(ready);} }
    }
    const roster = projectiles.length || swarms.length ? bodies() : [];
    for (let index=projectiles.length-1;index>=0;index--) {
      const ball=projectiles[index],before={x:ball.x,z:ball.z};
      const travel=Math.min(ball.profile.speed*dt,ball.profile.range-ball.flown);
      ball.x+=Math.sin(ball.yaw)*travel;ball.z+=Math.cos(ball.yaw)*travel;ball.flown+=travel;
      if(!meleeLineClear(before,ball,world)) {projectiles.splice(index,1);emit('spell-stopped',{id:ball.id,x:ball.x,z:ball.z});continue;}
      const target=roster.find(body=>gap(body,ball)<=ball.profile.radius+(body.r??.36));
      if(target) {hit(target,ball.profile,ball.origin,ball.yaw);projectiles.splice(index,1);}
      else if(ball.flown>=ball.profile.range) projectiles.splice(index,1);
    }
    for(let index=swarms.length-1;index>=0;index--) {
      const swarm=swarms[index];swarm.left-=dt;swarm.tick-=dt;
      if(swarm.left<=0) {swarms.splice(index,1);continue;}
      const target=roster.filter(body=>body.team==='enemy' && body.kind!=='dummy' && gap(body,caster())<=swarm.profile.range
        && meleeLineClear(swarm,body,world)).sort((a,b)=>gap(a,swarm)-gap(b,swarm))[0];
      if(!target)continue;
      const distance=gap(target,swarm),move=Math.min(distance,swarm.profile.speed*dt);
      if(distance>0){swarm.x+=(target.x-swarm.x)*move/distance;swarm.z+=(target.z-swarm.z)*move/distance;}
      swarm.y=(world?.heightAt?.(swarm.x,swarm.z)??caster().y??0)+1.1;
      if(gap(target,swarm)<=swarm.profile.radius && swarm.tick<=0) {
        swarm.tick=swarm.profile.sting;hit(target,swarm.profile,swarm,Math.atan2(target.x-swarm.x,target.z-swarm.z));
      }
    }
  }

  function update(dt) {
    if(!Number.isFinite(dt)||dt<=0)return;
    let remaining=Math.min(dt,10);
    while(remaining>1e-9){const part=Math.min(remaining,1/120);remaining-=part;step(part);}
  }
  function restore(data) {
    if(!validateMagicSnapshot(data))return false;
    learned.clear();data.learned.forEach(id=>learned.add(id));read.clear();data.read.forEach(id=>read.add(id));
    selected=data.selected??[...learned][0]??null;focus=Math.min(data.focus,capacity().focus);stop();return true;
  }
  function select(id) {if(!learned.has(id))return false;selected=id;return true;}
  function cycle() {const ids=[...learned];if(ids.length)selected=ids[(ids.indexOf(selected)+1)%ids.length];return selected;}
  return {learn,cast,readiness,update,select,cycle,restore,stop,pose,known:id=>learned.has(id),
    snapshot:()=>({version:MAGIC_VERSION,learned:[...learned],selected,focus,read:[...read]}),
    view:()=>({learned:[...learned],selected,focus,maxFocus:capacity().focus,casting:pending?.profile.id??null,readiness:readiness(),
      remaining:pending?.remaining??0,projectiles:projectiles.map(ball=>({...ball})),swarms:swarms.map(swarm=>({...swarm}))})};
}
