import { BEN, SPIDER, SPIDER_DEN } from '../src/spider-quest.js';
import { BEN_ROUTE } from '../src/ben-guide.js';

/** A real-frame regression for the den's visible actors and recovery choices.
 * Only the long walk to the den and the final low-health setup are shortened.
 * Never freeze rendering or directly step combat: those shortcuts hid the bug.
 */
export async function runBenFightDesktopChecks(h) {
  const checks=[];
  const check=(value,message)=>{if(!value)throw new Error(`Ben fight: ${message}`);checks.push(message);};
  const frames=async(n=2)=>{for(let i=0;i<n;i++)await new Promise(requestAnimationFrame);};
  const until=async(test,message,seconds=30)=>{
    const end=performance.now()+seconds*1000;
    while(!test()){
      if(performance.now()>end)throw new Error(`Ben fight: ${message}; ${JSON.stringify({mode:h.mode(),phase:h.combat.state.phase,quest:h.spiderQuest.state.stage,
        player:h.combat.state.player.hp,enemies:h.combat.state.enemies.map(e=>({id:e.id,hp:e.hp,action:e.action,x:e.x,z:e.z})),
        allies:h.combat.state.allies.map(e=>({id:e.id,hp:e.hp,action:e.action,x:e.x,z:e.z})),position:h.getPosition(),
        guide:h.spiderQuest.state.guide,ben:h.npcById.get(BEN.id)?.actor.group.position.toArray()})}`);
      await frames(1);
    }
  };
  const visible=node=>{let attached=false;for(let p=node;p;p=p.parent){if(!p.visible)return false;if(p===h.scene)attached=true;}return attached;};
  const meshBounds=group=>{
    const box=new h.THREE.Box3();let meshes=0;
    group?.updateWorldMatrix(true,true);
    group?.traverse(node=>{
      if(!node.isMesh||!visible(node)||node.userData?.groundShadow)return;
      node.geometry.computeBoundingBox();const one=node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld);
      box.union(one);meshes++;
    });
    return {box,meshes};
  };
  const onCamera=box=>{
    h.camera.updateMatrixWorld();
    const matrix=new h.THREE.Matrix4().multiplyMatrices(h.camera.projectionMatrix,h.camera.matrixWorldInverse);
    return new h.THREE.Frustum().setFromProjectionMatrix(matrix).intersectsBox(box);
  };
  const actorStats=id=>{
    const actor=h.combatView.actor(id),{box,meshes}=meshBounds(actor?.group);
    const point=actor?.group.position,ground=point?h.world.heightAt(point.x,point.z):0;
    return {actor,box,meshes,ground,above:box.max.y-ground,width:box.max.x-box.min.x,
      drawn:visible(actor?.group),onCamera:meshes>0&&onCamera(box)};
  };
  const choose=id=>{
    for(let i=0;i<25&&!document.querySelector(`[data-choice="${id}"]`);i++)h.nextSpeech();
    const button=document.querySelector(`[data-choice="${id}"]`);
    check(button&&!button.disabled,`The conversation offers ${id}`);button.click();
  };
  const releaseMovement=()=>{for(const key of ['KeyW','KeyS','KeyA','KeyD','KeyV','ShiftLeft'])h.release(key);};
  const fireballVisible=()=>{
    for(const projectile of h.combat.state.fireballs??[]){
      const group=h.combatView.fireball?.(projectile.id)??h.scene.getObjectByName(projectile.id);
      const {box,meshes}=meshBounds(group?.group??group);
      if(visible(group?.group??group)&&meshes&&box.max.y>h.world.heightAt(projectile.x,projectile.z)+.25&&onCamera(box))return projectile;
    }
    return null;
  };
  const beginAtDen=async()=>{
    h.warp(SPIDER_DEN.center);h.orientFightCamera();
    await until(()=>h.spiderQuest.state.stage==='fighting'&&h.combat.state.phase==='active','Proximity did not start the den encounter');
    await until(()=>h.combat.state.enemies.some(e=>e.id===SPIDER.id&&e.active),'The spider never entered the encounter');
    await frames(3);h.orientFightCamera();await frames(3);
  };

  await h.prepare();
  try {
    const ben=h.npcById.get(BEN.id);
    h.warp({x:ben.actor.group.position.x+1.4,z:ben.actor.group.position.z});h.conversation(ben);choose('ben-yes');
    check(h.spiderQuest.state.walking,'Accepting Ben starts his escort');
    const near=BEN_ROUTE.at(-1);
    ben.actor.group.position.set(near.x,h.world.heightAt(near.x,near.z),near.z);
    h.world.npcPositions[BEN.id]={...near};h.spiderQuest.rememberGuide({...near,waypoint:BEN_ROUTE.length-1,waiting:false});
    h.warp({x:near.x+20,z:near.z});await frames(5);
    check(h.spiderQuest.state.walking&&h.combat.state.phase!=='active','Ben waits for the player outside the den');
    check(h.save(),'The safe approach checkpoint saves');
    const safeCheckpoint=h.checkpointCopy();

    await beginAtDen();
    const friendly=h.combat.state.allies.find(e=>e.id===BEN.id),enemy=h.combat.state.enemies.find(e=>e.id===SPIDER.id);
    check(friendly?.kind==='sorcerer'&&friendly.model?.role==='sorcerer','Combat retains Ben’s sorcerer role');
    const benView=actorStats(BEN.id),spiderView=actorStats(SPIDER.id);
    check(benView.drawn&&benView.actor.group.name==='character-sorcerer'&&benView.meshes>5&&benView.onCamera,'Ben is visibly rendered as a sorcerer');
    check(!ben.actor.group.visible,'Ben has only his combat body, without a duplicate road figure');
    check(spiderView.drawn&&/spider/i.test(spiderView.actor.group.name)&&spiderView.meshes>5&&spiderView.above>.6&&spiderView.width>1.5&&spiderView.onCamera,
      'The giant spider has visible above-ground geometry inside the camera');
    check(!document.querySelector('#encounter-status')?.getClientRects().length,'The spider fight has no unrelated main-quest encounter banner');
    const hpBefore=enemy.hp;let projectileSeen=null;
    await until(()=>{projectileSeen=fireballVisible();return !!projectileSeen;},'Ben never produced a visibly rendered fireball',18);
    await until(()=>enemy.hp<hpBefore,'Ben’s fireball never damaged the spider',12);
    check(enemy.hp<hpBefore&&h.combat.state.player.action!=='attack','Ben’s visible fireball damages the spider while the player makes no attack');
    check(!document.getElementById('skill-intro')?.getClientRects().length,'Skill introductions do not cover the active spider fight');
    const visibleFight={benKind:friendly.kind,benModel:benView.actor.group.name,spiderModel:spiderView.actor.group.name,
      spiderMeshes:spiderView.meshes,spiderAboveGround:spiderView.above,spiderWidth:spiderView.width,
      projectileId:projectileSeen.id,spiderDamage:hpBefore-enemy.hp};
    await h.capture?.('ben-visible-fight');

    // Ordinary movement, rather than a direct phase change, must end the fight.
    h.setYaw(-Math.PI/2);h.press('ShiftLeft');h.press('KeyW');
    await until(()=>h.combat.state.phase!=='active'||h.mode()==='defeated','Walking toward the road never left the spider encounter',16);releaseMovement();
    check(h.mode()==='playing'&&h.combat.state.phase==='peaceful'&&h.spiderQuest.state.walking&&!h.spiderQuest.state.benDown,
      'Running back toward Nothom leaves the encounter with a living, available Ben');
    await frames(45);
    check(h.combat.state.phase==='peaceful'&&h.spiderQuest.state.walking,'Leaving the den does not immediately start another fight');
    check(visible(ben.actor.group)&&!visible(h.combatView.actor(BEN.id)?.group),'Retreat returns Ben to one visible road figure');

    // Re-enter with the same quest, then allow one real spider strike to cause
    // defeat. This keeps death coverage short without manufacturing a death event.
    const savedBeforeTesting=JSON.stringify(h.checkpointCopy());h.setTesting(true);
    const returnedBen=ben.actor.group.position,backDx=returnedBen.x-SPIDER_DEN.center.x,backDz=returnedBen.z-SPIDER_DEN.center.z,backGap=Math.hypot(backDx,backDz)||1;
    h.warp({x:returnedBen.x+backDx/backGap*2,z:returnedBen.z+backDz/backGap*2});
    await until(()=>{
      if(h.combat.state.phase==='active')return true;
      const target=ben.actor.group.position,p=h.getPosition(),dx=target.x-p.x,dz=target.z-p.z;
      h.setYaw(Math.atan2(-dx,-dz));
      if(Math.hypot(dx,dz)>3)h.press('KeyW');else h.release('KeyW');
      return false;
    },'Ben did not lead the traveler back to the den after retreat',35);
    releaseMovement();h.orientFightCamera();await frames(5);
    const attacker=h.combat.state.enemies.find(e=>e.id===SPIDER.id);
    const healthBeforeDefeat=h.combat.state.player.hp;
    h.combat.state.player.hp=1;h.warp({x:attacker.x+4,z:attacker.z});releaseMovement();
    await until(()=>h.mode()==='defeated','The spider never struck the low-health traveler',18);
    const recovery=document.getElementById('defeat-restore');
    check(recovery&&!recovery.disabled&&recovery.getClientRects().length,'Defeat offers a visible pre-fight restore, not only a rematch');
    check(!document.getElementById('defeat-saved')?.getClientRects().length,'A testing defeat does not offer the normal adventure as its checkpoint');
    check(!/goblin|woodland bell/i.test(document.getElementById('defeat').textContent),'Spider defeat uses its own recovery explanation');
    recovery.click();await frames(12);
    check(h.mode()==='playing'&&h.combat.state.phase==='peaceful'&&h.combat.state.player.hp>=healthBeforeDefeat,
      'Pre-fight restore returns the player alive to safety without restarting combat');
    check(h.spiderQuest.state.walking&&!h.spiderQuest.state.benDown&&visible(ben.actor.group),'Pre-fight restore keeps Ben alive and available');
    await frames(50);check(h.combat.state.phase==='peaceful','Restoring the checkpoint does not auto-trigger a rematch');
    check(h.isTesting()&&JSON.stringify(h.checkpointCopy())===savedBeforeTesting,'Testing recovery preserves testing mode and leaves the saved adventure unchanged');
    const before=h.getPosition();h.setYaw(-Math.PI/2);h.press('KeyW');await frames(25);h.release('KeyW');
    check(Math.hypot(h.getPosition().x-before.x,h.getPosition().z-before.z)>.25,'Movement works after leaving the defeat screen');
    const recoveryResult={mode:h.mode(),phase:h.combat.state.phase,hp:h.combat.state.player.hp,ben:h.spiderQuest.state.stage};

    // The secondary choice must also leave the fight, without loading a saved
    // adventure or trapping the player in the same encounter again.
    check(h.reloadCheckpoint(safeCheckpoint),'The safe approach reloads for the second recovery choice');await frames(3);h.setTesting(true);
    await beginAtDen();
    const secondAttacker=h.combat.state.enemies.find(e=>e.id===SPIDER.id);
    h.combat.state.player.hp=1;h.warp({x:secondAttacker.x+4,z:secondAttacker.z});releaseMovement();
    await until(()=>h.mode()==='defeated','The second encounter did not reach a real defeat',18);
    const safety=document.getElementById('retry');
    check(safety&&!safety.disabled&&safety.getClientRects().length&&/return to safety/i.test(safety.textContent),
      'Defeat also offers a visible Return to safety choice');
    safety.click();await frames(12);
    check(h.mode()==='playing'&&h.combat.state.phase==='peaceful'&&h.combat.state.player.hp>0,
      'Return to safety exits defeat alive without a rematch');
    await frames(45);check(h.combat.state.phase==='peaceful','Return to safety does not immediately retrigger the den');
    const safetyBefore=h.getPosition();h.setYaw(-Math.PI/2);h.press('KeyW');await frames(25);h.release('KeyW');
    check(Math.hypot(h.getPosition().x-safetyBefore.x,h.getPosition().z-safetyBefore.z)>.25,
      'The player can walk freely after Return to safety');
    const safetyResult={mode:h.mode(),phase:h.combat.state.phase,hp:h.combat.state.player.hp,ben:h.spiderQuest.state.stage};

    // Return to the original, living approach fixture for the representative
    // screenshot captured by the Electron caller; leave the renderer running.
    check(h.reloadCheckpoint(safeCheckpoint),'The original approach checkpoint still reloads');await frames(3);
    await beginAtDen();await until(()=>!!fireballVisible(),'The restored encounter lost Ben’s visible spell',18);
    check(!document.getElementById('skill-intro')?.getClientRects().length,'The final live fight remains unobscured by a skill introduction');
    check(h.frameErrors().count===0,'The rendered Ben encounter produced no frame errors');
    return {ok:true,checks,visibleFight,recovery:recoveryResult,safety:safetyResult,frameErrors:h.frameErrors().count};
  } finally {releaseMovement();}
}
