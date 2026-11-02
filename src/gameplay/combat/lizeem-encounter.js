import {combatLesson,teachingOpponent,createCombatLesson} from './combat-tutorial.js';
import {trialSolids,trialLineClear} from './expedition-tactics.js';
import {createTrialSpecials} from './trial-specials.js';
import {createTrialMechanics} from './trial-mechanics.js';
import {STAFF_GUARD,staffDefense,isEncounterGuarding} from './encounter-defense.js';
import {unitBody,physicalDamage,combatUnit} from './combat-units.js';
// Small, independent encounter model. No campaign mutation or legacy skill rules.
// The host reports one bounded outcome; strategic consequences belong to the
// campaign. Optional waypoints turn the guards into an interception objective.
import {commanderBody,updateCommanderMorale} from './commander-morale.js';
import {createAlliedAssault} from './allied-assault.js';
import {ENCOUNTER_BALANCE as B} from './encounter-balance.js';
import {aliveTarget,FOCUS_RANGE} from './combat-focus.js';
import {encounterAttack,ENCOUNTER_ATTACKS} from './encounter-attacks.js';
import {moveEncounterBody,escortScreen} from './encounter-space.js';
import {createEngagementPositions,createEncounterNavigation} from './encounter-positioning.js';
import {selectEncounterTarget,encounterClearStrike,encounterFacing as facing,ENCOUNTER_REACH} from './encounter-target.js';
import {ENCOUNTER_TIMING,ENCOUNTER_TEMPOS} from './encounter-timing.js';
import {trialOpponent} from './combat-trials.js';
import {playerCombatStats,combatStats,combatAttack} from './combat-stats.js';
export {ENCOUNTER_TIMING} from './encounter-timing.js';
export {isEncounterGuarding} from './encounter-defense.js';
export function createLizeemEncounter({heroStart={x:0,z:5},guardStarts=[{x:-3,z:-3},{x:3,z:-3},{x:0,z:-5}],move=null,canHit=()=>true,canOccupy=null,canTraverse=null,reinforcementRoute=null,rallyPoint=null,attackPattern=['thrust','sweep'],allyStarts=null,retreatRoute=null,duel=null,morale=null,fieldBattle=false,passive=false,tutorial=null,tempo='classic',opponent=null,opponentWeapon=null,unitType=null,heroAttributes={},opponentAttributes=null,timeLimit=opponent?Infinity:fieldBattle?180:duel||morale?120:90,heightAt,arrowHit}={}){
  const lesson=tutorial?combatLesson(tutorial):null;
  if(tutorial&&(!lesson||lesson.opponent!==opponent))throw Error('The lesson requires its teaching opponent.');
  passive=lesson?.passive??passive;
  const baseCreature=teachingOpponent(opponent?trialOpponent(opponent):null,lesson);
  const creature=baseCreature?.id==='militiaman'?{...baseCreature,...combatUnit('militiaman',opponentWeapon??'sword')}:baseCreature;
  if(opponent&&(!creature||guardStarts.length!==1||duel||reinforcementRoute||rallyPoint||allyStarts))throw Error('A combat trial needs one known opponent and no army objective.');
  if(creature)attackPattern=creature.pattern;
  if(!ENCOUNTER_TEMPOS.includes(tempo))throw Error('Choose a known encounter tempo.');
  if(!(timeLimit>0))throw Error('An encounter needs a positive time limit.');
  if(duel&&(guardStarts.length!==1||reinforcementRoute||rallyPoint||allyStarts))throw Error('A duel needs exactly one champion and no other objective.');
  if(duel)attackPattern=['thrust','sweep','overhead'];
  if(reinforcementRoute&&rallyPoint)throw Error('Choose one encounter objective.');
  if(!attackPattern.length||attackPattern.some(name=>!(creature?.attacks??ENCOUNTER_ATTACKS)[name]))throw Error('Choose a known encounter attack pattern.');
  if(allyStarts&&(!rallyPoint||reinforcementRoute||allyStarts.filter(a=>!a.commander).length>(fieldBattle?12:3)||allyStarts.filter(a=>a.commander).length>1))throw Error('Allies require a bounded rally assault.');
  if(fieldBattle&&(!rallyPoint||reinforcementRoute||!allyStarts||guardStarts.filter(a=>!a.commander).length>12||guardStarts.filter(a=>a.commander).length>1))throw Error('A field battle needs two bounded army formations.');
  if(opponentAttributes&&!creature)throw Error('Opponent attributes currently require a trial opponent.');
  const heroCombat=playerCombatStats(heroAttributes),T=heroCombat.timing;
  const baseStats=creature?combatStats({...creature.attributes,...(opponentAttributes??{})}):null;
  const creatureStats=baseStats?{...baseStats,maxHp:baseStats.maxHp*(creature.healthMultiplier??1)}:null;
  const creatureCombat=creature?Object.freeze({...creatureStats,attacks:Object.freeze(Object.fromEntries(Object.entries(creature.attacks).map(([id,attack])=>[id,combatAttack(attack,creatureStats)])))}):null;
  const state={time:0,tempo,outcome:null,hero:{...heroStart,combat:heroCombat,hp:heroCombat.maxHp,maxHp:heroCombat.maxHp,heading:creature?Math.atan2(guardStarts[0].x-heroStart.x,guardStarts[0].z-heroStart.z):Math.PI,cooldown:0,swing:0,swingTargetId:null,targetId:null,focusId:null,dodge:0,dodgeCooldown:0,dodgeStartedAt:null,dodgeObstruction:null,lastDodge:null,hurt:0,hitGrace:0,lastStrike:null,lastDefense:null,blocking:false,blockImpact:0,casting:0,guardBroken:0,slowed:false},
    guards:guardStarts.map(({x,z,role,commander},i)=>({id:i,x,z,hp:50,...commanderBody(duel??commander),role:duel||commander?'champion':reinforcementRoute?(role??(i===guardStarts.length-1?'runner':'escort')):'soldier',phase:'approach',timer:i*.3,heading:Math.atan2(heroStart.x-x,heroStart.z-z),waypoint:0,escaped:false,hurt:0,block:0,open:false,evadedAt:null,dodged:false,attack:attackPattern[i%attackPattern.length],attacks:0,contactResolved:false,hitThisAttack:false,speed:0})),
    skill:{staffBlocks:0,blocks:0,dodges:0,counters:0,dodgeCounters:0,counterTypes:{thrust:0,sweep:0}},
    objective:duel?{type:'duel',reason:null}:rallyPoint?{type:'rally',rally:{...rallyPoint},secured:0,required:T.victory,reason:null}:reinforcementRoute?{type:'intercept',rally:{...reinforcementRoute.at(-1)},reason:null}:null};
  if(morale)state.morale={baseAllies:65+(morale.allies??0),baseEnemies:65+(morale.enemies??0),allies:65,enemies:65,notice:''};
  for(const g of state.guards){g.tempo=tempo;const start=guardStarts[g.id];if(!g.commanderId&&!duel&&(start.unitType??unitType))Object.assign(g,unitBody(start.unitType??unitType,start.weapon));if(creature)Object.assign(g,{archetype:creature.id,weapon:creature.weapon,defense:creature.defense,armor:creature.armor,pattern:creature.pattern,engage:creature.engage,combat:creatureCombat,hp:creatureCombat.maxHp,maxHp:creatureCombat.maxHp,name:creature.name,guarding:creature.guarding,labelHeight:creature.labelHeight,bodyRadius:creature.bodyRadius,staggerResistant:creature.staggerResistant,recoveryOpening:creature.recoveryOpening,closeAttack:creature.closeAttack,closeRange:creature.closeRange,turnRate:creature.turnRate,sidestep:creature.sidestep,regeneration:creature.regeneration,restoration:creature.restoration,mechanic:creature.mechanic});}
  const updateLesson=tutorial?createCombatLesson(tutorial,state):null;updateLesson?.();
  const worldCanHit=canHit;canHit=(a,b)=>worldCanHit(a,b)&&trialLineClear(state,a,b);
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),clamp=n=>Math.max(-7,Math.min(7,n));
  let attackBuffer=0,contactPending=false,dodgeHeld=false,dodgeDirection={x:0,z:0},nextEnemyAttackAt=0;
  const bodies=()=>[state.hero,...state.guards,...(state.allies??[]),...trialSolids(state)];
  const navigate=createEncounterNavigation({canOccupy,canTraverse});
  const reserve=fieldBattle?createEngagementPositions({canOccupy:canOccupy??undefined,canTraverse:canTraverse??undefined}):null;
  const strikeClear=(a,b)=>canHit(a,b)&&encounterClearStrike(a,b,(state.allies??[]).filter(t=>t!==a),()=>true);
  function advance(actor,dx,dz,hero=false){
    const terrainMove=(a,x,z)=>move?move(a,x,z):{x:hero?clamp(a.x+x):a.x+x,z:hero?clamp(a.z+z):a.z+z};
    const next=moveEncounterBody(actor,dx,dz,bodies(),terrainMove);actor.x=next.x;actor.z=next.z;return next.obstruction;
  }
  function face(g,heading,dt){
    const delta=Math.atan2(Math.sin(heading-g.heading),Math.cos(heading-g.heading));
    g.heading+=g.turnRate?Math.max(-g.turnRate*dt,Math.min(g.turnRate*dt,delta)):delta;
  }
  function walk(g,target,dt,speed=g.combat?.moveSpeed??(duel?3.1:2.1)){
    const direction=navigate(g,target,bodies(),state.time,dt),stride=Math.min(distance(g,target),speed*dt),before={x:g.x,z:g.z};
    face(g,Math.atan2(direction.x,direction.z),dt);advance(g,(g.turnRate?Math.sin(g.heading):direction.x)*stride,(g.turnRate?Math.cos(g.heading):direction.z)*stride);g.speed=distance(g,before)/dt;
  }
  const squad=allyStarts?createAlliedAssault(state,{starts:allyStarts.map(p=>({...p,ranged:p.ranged?{...p.ranged}:undefined,unitType:p.unitType??unitType})),walk,retreatRoute,reserve,canOccupy,canTraverse,heightAt,arrowHit,canHit:(a,b)=>encounterClearStrike(a,b,bodies().filter(t=>t!==a),canHit)}):null;
  updateCommanderMorale(state);
  function receiveHit(g,attack,{source=g,reason=null}={}){
    const h=state.hero;if(h.hp<=0||h.dodge>0||h.hitGrace>0)return false;
    attack=tricks.attack(g,attack);
    const defense=staffDefense(h,source,attack,attack.damage??B.enemyDamage),damage=Math.min(h.hp,defense.damage);
    h.hp=Math.max(0,h.hp-damage);h.hurt=defense.blocked?0:T.hurt;h.hitGrace=B.hitGrace;
    if(attack.guardBreak&&h.blocking){h.guardBroken=attack.guardBreak;h.blocking=false;reason='guard-broken';}
    if(defense.blocked){h.blockImpact=T.hurt;state.skill.staffBlocks++;}
    reason=reason??(h.lastDodge?.kind==='cooldown'&&state.time-h.lastDodge.at<.5?'cooldown':
      h.dodgeObstruction&&state.time-h.dodgeStartedAt<.95?h.dodgeObstruction.kind+'-blocked':
      g.evadedAt!==null&&state.time-g.evadedAt<.95?(g.attack==='sweep'?'sweep-caught':'dodge-ended'):'no-dodge');
    h.lastDefense={at:state.time,kind:defense.blocked?'blocked':'hit',target:g.id,attack:g.attack,reason:h.blocking&&attack.style==='stomp'?'unblockable':reason,damage};
    if(attack.push){const dx=h.x-g.x,dz=h.z-g.z,d=Math.hypot(dx,dz)||1;advance(h,dx/d*attack.push,dz/d*attack.push,true);}
    return true;
  }
  const special=createTrialMechanics(state,{advance,canHit,receiveHit});
  const tricks=createTrialSpecials(state,{advance,canHit,receiveHit});
  function tick(dt,input={}){
    if(!Number.isFinite(dt)||dt<=0||dt>.1)throw Error('Encounter steps must be between 0 and 0.1 seconds.');
    if(state.outcome)return snapshot();
    const h=state.hero;state.time+=dt;
    const focused=state.guards.find(g=>g.id===input.focusId&&aliveTarget(g)&&distance(h,g)<=FOCUS_RANGE);h.focusId=focused?.id??null;
    for(const key of ['cooldown','swing','dodge','dodgeCooldown','hurt','hitGrace','blockImpact','casting','guardBroken'])h[key]=Math.max(0,h[key]-dt);
    attackBuffer=Math.max(0,attackBuffer-dt);
    tricks.tick(dt);
    for(const g of state.guards){g.hurt=Math.max(0,g.hurt-dt);g.block=Math.max(0,g.block-dt);}
    const x=Number.isFinite(input.x)?Math.max(-1,Math.min(1,input.x)):0,z=Number.isFinite(input.z)?Math.max(-1,Math.min(1,input.z)):0,len=Math.hypot(x,z);
    if(input.dodge&&!dodgeHeld&&h.dodgeCooldown>0)h.lastDodge={at:state.time,kind:'cooldown',readyIn:h.dodgeCooldown};
    if(input.dodge&&dodgeHeld&&h.dodgeCooldown===0&&h.lastDodge?.kind!=='release')h.lastDodge={at:state.time,kind:'release'};
    if(input.dodge&&!dodgeHeld&&h.dodgeCooldown===0&&!h.casting){
      h.dodge=T.dodge;h.dodgeCooldown=T.dodgeCooldown;h.swing=0;contactPending=false;attackBuffer=0;
      h.dodgeStartedAt=state.time;h.dodgeObstruction=null;h.lastDodge={at:state.time,kind:'started'};
      dodgeDirection=len?{x:x/len,z:z/len}:{x:-Math.sin(h.heading),z:-Math.cos(h.heading)};
      for(const g of state.guards){const a=encounterAttack(g);if(g.hp>0&&['windup','strike'].includes(g.phase)&&distance(g,h)<=a.reach+(a.lungeDistance??0)&&facing(g,h,a.halfAngle)&&canHit(g,h))g.evadedAt=state.time;}
    }
    dodgeHeld=!!input.dodge;
    h.blocking=!!input.block&&!h.guardBroken&&!h.swing&&!h.dodge&&!h.casting;
    if(input.block)attackBuffer=0;
    if(h.dodge>0){
      const obstruction=advance(h,dodgeDirection.x*9*dt,dodgeDirection.z*9*dt,true);
      if(obstruction&&!h.dodgeObstruction){h.dodgeObstruction=obstruction;h.lastDodge={at:state.time,kind:obstruction.kind+'-blocked'};}
    }
    else if(len){const speed=h.blocking?heroCombat.moveSpeed*STAFF_GUARD.moveScale:h.swing>0?heroCombat.swingMoveSpeed:heroCombat.moveSpeed;advance(h,x/Math.max(1,len)*speed*dt*(h.slowed?.45:1),z/Math.max(1,len)*speed*dt*(h.slowed?.45:1),true);if(!h.swing&&!focused)h.heading=Math.atan2(x,z);}
    if(focused&&!h.swing&&!h.dodge)h.heading=Math.atan2(focused.x-h.x,focused.z-h.z);
    if(input.attack&&!input.block&&!h.casting&&h.dodge===0&&h.cooldown<=T.buffer)attackBuffer=T.buffer;
    if(attackBuffer>0&&!h.casting&&!h.blocking&&h.cooldown===0&&h.dodge===0){
      attackBuffer=0;h.cooldown=T.attackCooldown;h.swing=T.swing;contactPending=true;
      // Movement or optional focus supplies facing. Keep the chosen strike and
      // heading committed through contact, even if focus changes mid-swing.
      h.swingTargetId=selectEncounterTarget(h,state.guards,strikeClear,h.focusId)?.id??null;
    }
    if(contactPending&&h.swing<=T.swing-T.contact){
      contactPending=false;
      const nearby=state.guards.filter(g=>g.hp>0&&!g.escaped&&distance(g,h)<=ENCOUNTER_REACH);
      const arc=nearby.filter(g=>facing(h,g,Math.PI/3));
      const target=state.guards.find(g=>g.id===h.swingTargetId),nearest=target&&arc.includes(target)&&encounterClearStrike(h,target,state.guards,strikeClear)?target:null;
      const miss=target?(!target.hp||target.escaped?'target-gone':distance(h,target)>ENCOUNTER_REACH?'out-of-range':!facing(h,target)?'off-angle':'blocked'):
        arc.some(g=>!encounterClearStrike(h,g,state.guards,strikeClear))?'blocked':arc.length?'no-target':nearby.length?'off-angle':'out-of-range';
      h.lastStrike={at:state.time,kind:nearest?'hit':miss,target:h.swingTargetId};
      if(tricks.staffObject(h,heroCombat.damage)){/* Aimed strike cleared silk or damaged a ward anchor. */}
      else if(nearest){
        const guarded=isEncounterGuarding(nearest)&&facing(nearest,h,Math.PI*.55);
        const hit=physicalDamage(heroCombat.damage,nearest,{guarded});hit.damage=tricks.damage(nearest,hit.damage);Object.assign(h.lastStrike,hit);
        if(guarded){nearest.block=T.hurt;state.skill.blocks++;}
        if(!hit.damage){h.lastStrike.kind=['veil','submerged'].includes(nearest.phase)?'incorporeal':'guarded';}else{
          const previousPhase=nearest.phase,restoring=nearest.phase==='restore',counter=nearest.open;
          if(counter){h.lastStrike.kind='counter';state.skill.counters++;if(nearest.dodged){state.skill.dodgeCounters++;state.skill.counterTypes[nearest.attack]=(state.skill.counterTypes[nearest.attack]??0)+1;}}
          const damage=Math.min(hit.damage,nearest.hp);h.lastStrike.damage=damage;
          if(squad)state.squad.damageByHero+=damage;
          nearest.hp=Math.max(0,nearest.hp-damage);nearest.hurt=T.hurt;
          squad?.heroHit(nearest);
          // A flank hit hurts, but cannot cancel an already committed attack.
          // Only a counter after a miss interrupts and consumes the opening.
          if(!nearest.hp){nearest.phase=duel?'yielded':'down';if(duel)nearest.yielded=true;nearest.open=false;}
          // Large creatures keep their recovery instead of being stunlocked.
          else if(!nearest.staggerResistant&&(counter||!guarded&&!['windup','strike'].includes(nearest.phase))){
            nearest.phase='stagger';nearest.timer=T.hurt;nearest.open=false;
          }
          special.hit(nearest,{restoring});tricks.hit(nearest,{previousPhase});
        }
      }
    }
    for(const g of state.guards){
      g.speed=0;if(g.hp===0||g.escaped)continue;
      // Training apparitions share real strike collision and spell damage but
      // hold their stance. Ordinary encounters retain their existing behavior.
      if(passive){g.open=true;g.phase='recover';g.timer=1;continue;}
      const victim=squad?squad.enemyTarget(g):h;if(!victim)continue;let d=distance(g,victim);const attack=encounterAttack(g);
      if(tricks.enemy(g,dt)||special.enemy(g,dt,attack))continue;
      if(g.phase==='turn'){squad.turn(g,victim,dt);continue;}
      const screen=escortScreen(g,h,state.guards);
      if(reinforcementRoute&&(g.role==='runner'||d>5&&!screen)&&['approach','march'].includes(g.phase)){
        g.phase='march';let target=reinforcementRoute[g.waypoint];
        if(distance(g,target)<=1.2){g.waypoint++;target=reinforcementRoute[g.waypoint];}
        if(!target){g.escaped=true;g.phase='escaped';continue;}
        walk(g,target,dt,g.role==='runner'?2.3:2.1);continue;
      }
      if(g.phase==='march')g.phase='approach';
      if(g.phase==='approach'){
        if(special.beginRestoration(g))continue;
        const engage=g.engage??1.9;
        const slot=reserve?.(g,victim,state.guards,bodies(),state.time);
        g.engagementRank=slot?.rank??0;
        if(slot?(slot.rank>0||distance(g,slot)>.4):d>engage+.01){
          const target=slot??(screen&&d>2.8?screen:{x:victim.x+(g.x-victim.x)/d*engage,z:victim.z+(g.z-victim.z)/d*engage});
          if(distance(g,target)>.001)walk(g,target,dt);
          if(slot&&distance(g,target)<.4)face(g,Math.atan2(victim.x-g.x,victim.z-g.z),dt);
        }
        else if(victim!==h||state.time>=nextEnemyAttackAt){
          face(g,Math.atan2(victim.x-g.x,victim.z-g.z),dt);
          if(g.turnRate&&!facing(g,victim,Math.PI/5))continue;
          const pattern=g.pattern??attackPattern;g.attack=g.closeAttack&&d<=g.closeRange&&g.attack!==g.closeAttack?g.closeAttack:pattern[(g.attacks+g.id)%pattern.length];if(g.attack!==g.closeAttack)g.attacks++;const chosen=encounterAttack(g);
          g.phase='windup';g.timer=chosen.windup;g.evadedAt=null;g.dodged=false;g.open=false;g.contactResolved=false;g.hitThisAttack=false;g.effectReleased=false;
          if(g.archetype)g.attackOrigin={x:g.x,z:g.z};tricks.begin(g,chosen);
          // Stagger the squad's commitments so warnings and counter windows can
          // be read. Other soldiers still approach, guard and threaten space.
          if(victim===h)nextEnemyAttackAt=state.time+chosen.windup+chosen.strike+(tempo==='matched'?ENCOUNTER_TIMING.attackCooldown-ENCOUNTER_TIMING.swing:B.commitmentGap);
        }
      }else{
        const before=g.timer;
        g.timer-=dt;
        if(g.phase==='strike'&&attack.lungeDistance){
          const duration=attack.lungeDuration??attack.contact;
          const portion=Math.max(0,Math.min(dt,duration-(attack.strike-before)))/duration;
          const beforeMove={x:g.x,z:g.z};advance(g,Math.sin(g.heading)*attack.lungeDistance*portion,Math.cos(g.heading)*attack.lungeDistance*portion);
          g.speed=distance(g,beforeMove)/dt;d=distance(g,victim);
        }
        if(g.phase==='strike'&&!g.contactResolved){
          const since=attack.strike-g.timer,previous=attack.strike-before,end=attack.contact+attack.active;
          // A sweep stays dangerous across its visible arc. Invulnerability can
          // cover part of it, but a sideways dodge must actually clear the blade.
          if(since>=attack.contact&&previous<=end){
            if(attack.projectile&&!g.effectReleased)special.launch(g,attack);
            if(!g.effectReleased){tricks.contact(g,attack);g.effectReleased=true;}
            const contact=!attack.noContact&&!attack.projectile&&victim.hp>0&&d<=attack.reach&&facing({...g,heading:g.heading+(attack.headingOffset??0)},victim,attack.halfAngle)&&(squad?encounterClearStrike(g,victim,bodies().filter(b=>b!==g),canHit):canHit(g,victim));
            if(victim!==h&&contact&&!g.hitThisAttack)g.hitThisAttack=squad.strike(g,victim);
            if(victim===h&&contact&&h.dodge===0&&!g.hitThisAttack){
              g.hitThisAttack=true;
              // Consume a connecting strike during brief post-hit protection.
              // It cannot hit again when protection ends or earn a false dodge.
              receiveHit(g,attack);
            }
          }
          if(since>=end){
            g.contactResolved=true;g.open=!attack.chain&&(!g.hitThisAttack||!!g.recoveryOpening);g.dodged=!g.hitThisAttack&&g.open&&g.evadedAt!==null&&state.time-g.evadedAt<=.95;
            if(g.dodged&&victim===h)state.skill.dodges++;
            if(g.open&&!g.hitThisAttack&&victim===h)h.lastDefense={at:state.time,kind:g.dodged?'dodged':'missed',target:g.id,attack:g.attack};
          }
        }
        if(g.timer<=0){
          if(g.phase==='windup'){g.phase='strike';g.timer=attack.strike;}
          else if(g.phase==='strike'&&attack.chain){
            g.attack=attack.chain;const next=encounterAttack(g);g.phase='windup';g.timer=next.windup;g.open=false;g.contactResolved=false;g.hitThisAttack=false;g.effectReleased=false;g.evadedAt=null;g.dodged=false;g.attackOrigin={x:g.x,z:g.z};tricks.begin(g,next);
          }
          else if(g.phase==='strike'){g.phase='recover';g.timer=attack.recovery;}
          else{g.phase='approach';g.open=false;tricks.finished(g);}
        }
      }
    }
    special.projectiles(dt);squad?.tick(dt);updateCommanderMorale(state);
    // The fight decides victory. This short beat lets the line break and allies
    // regroup; neither the hero's location nor an ally's path can delay it.
    if(rallyPoint){const o=state.objective;o.secured=state.guards.every(g=>!g.hp||g.routed)?Math.min(o.required,o.secured+dt):0;}
    updateLesson?.();
    if(h.hp===0||state.time>=timeLimit&&!(rallyPoint&&state.guards.every(g=>!g.hp||g.routed))){state.outcome='defeat';if(state.objective)state.objective.reason=h.hp===0?'driven-back':'time-expired';}
    else if(state.guards.every(g=>!g.hp||g.routed)&&(!rallyPoint||state.objective.secured>=state.objective.required)){state.outcome='success';if(state.objective)state.objective.reason=duel?'champion-yielded':rallyPoint?'rally-secured':'vanguard-broken';}
    else if(reinforcementRoute&&state.guards.every(g=>!g.hp||g.escaped)){state.outcome='defeat';state.objective.reason='runner-arrived';}
    if(state.outcome){state.projectiles=[];squad?.clearProjectiles();tricks.cleanup();}
    return snapshot();
  }
  const snapshot=()=>{
    state.hero.targetId=state.outcome?null:state.hero.swing>0?state.hero.swingTargetId:selectEncounterTarget(state.hero,state.guards,strikeClear,state.hero.focusId)?.id??null;
    return JSON.parse(JSON.stringify(state));
  };
  function fireballHit(id,damage){
    if(state.outcome||state.hero.hp<=0||!Number.isFinite(damage)||damage<=0)return false;
    if(tricks.hitObject(id,damage))return true;
    const g=state.guards.find(g=>g.id===id&&g.hp>0&&!g.escaped);if(!g)return false;
    damage=tricks.damage(g,damage);if(!damage){state.hero.lastStrike={at:state.time,kind:'incorporeal',target:id,damage:0};return false;}
    const previousPhase=g.phase,restoring=g.phase==='restore';
    const loss=Math.min(g.hp,damage);if(squad)state.squad.damageByHero+=loss;g.hp=Math.max(0,g.hp-damage);g.hurt=T.hurt;if(!g.hp){g.phase=duel?'yielded':'down';if(duel)g.yielded=true;}else if(!g.staggerResistant&&(!duel&&!g.commanderId||!['windup','strike'].includes(g.phase))){g.phase='stagger';g.timer=T.hurt;g.open=false;}
    special.hit(g,{fire:true,restoring});tricks.hit(g,{previousPhase});squad?.heroHit(g);
    state.hero.lastStrike={at:state.time,kind:'fireball',target:id,damage:loss};return true;
  }
  const canCast=()=>!state.outcome&&state.hero.hp>0&&!state.hero.swing&&!state.hero.dodge&&!state.hero.blocking&&!state.hero.casting;
  function beginCast(){if(!canCast())return false;state.hero.casting=.45;attackBuffer=0;return true;}
  return {tick,snapshot,fireballHit,canCast,beginCast,spellTargets:()=>[...state.guards,...tricks.targets()],aftermath:dt=>{if(state.outcome==='success')squad?.aftermath(Math.min(.1,dt));return snapshot();}};
}
