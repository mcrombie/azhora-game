/** Real-renderer travel/return checks for nearby-only Fast mode. */
export async function runLocalStreamingChecks(h) {
  const checks=[], check=(yes,text)=>{if(!yes)throw new Error(text);checks.push(text);};
  const frames=async(n=5)=>{for(let i=0;i<n;i++)await new Promise(requestAnimationFrame);check(!h.errors().count,'No live frame errors');};
  const loader=h.world.loading, residency=h.world.sceneryResidency;
  check(loader?.state().policy==='nearby','Fast uses nearby-only construction');
  check(!!residency,'Fast manages scenery residency');
  const home=h.world.spawn;
  await h.goTo(home);await frames();
  await h.goTo(h.destination);await frames();
  check(loader.isReady(h.destinationRegion),'Remote region is complete before arrival');
  const tree=h.world.timberTrees.find(t=>t.species==='acor'&&h.world.regionAt(t.x,t.z).id===h.destinationRegion);
  check(!!tree,'Remote region exposes its live tree catalog');
  const before=residency.state(),gpuBefore=h.gpu();
  // Keep a permanent changed instance; normal woodcutting stumps can legitimately
  // regrow while a long travel test is loading its next destination.
  h.world.treeRegistry.set(tree.id,false);
  const descriptor=h.world.treeRegistry.get(tree.id);
  await h.goTo(home);await frames();
  const away=residency.state(),gpuAway=h.gpu();
  check(away.parked>0&&away.geometryDisposals>before.geometryDisposals,'Distant scenery releases graphics resources');
  check(h.world.treeRegistry.get(tree.id)===descriptor&&!h.world.treeRegistry.standing(tree.id),'Parked tree retains identity and changed state');
  check(loader.state().jobs.some(j=>j.status==='pending'),'Travel did not force construction of the entire world');
  await h.goTo(h.destination);await frames();
  const back=residency.state();
  check(back.restores>away.restores,'Returning restores parked scenery');
  check(h.world.treeRegistry.get(tree.id)===descriptor&&!h.world.treeRegistry.standing(tree.id),'Returning does not reset the changed tree');
  check(h.world.timberTrees.filter(t=>t.id===tree.id).length===1,'Returning does not duplicate trees');
  h.world.treeRegistry.set(tree.id,true);
  return {ok:true,checks,before,away,back,gpuBefore,gpuAway,gpuBack:h.gpu(),loading:loader.state(),errors:h.errors()};
}
