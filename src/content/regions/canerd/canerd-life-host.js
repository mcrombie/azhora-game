import {CANERD,CANERD_GARDEN} from './canerd-world.js';
import {localSight} from '../../../app/exploration/local-sight.js';

// The household constructs only when its castle is prepared and nearby. It is
// scenery life, independent of the campaign's population and diplomatic state.
export function createCanerdLifeHost(scene,world,{scenery=()=>world.canerd,load=()=>import('./canerd-people.js')}={}){
  let people=null,pending=null,disposed=false,error=null,speaking=null;
  const oak=()=>scenery()?.sacredOak;
  function oakTarget(point){
    const model=oak(),entry=CANERD_GARDEN.approach;
    if(!model||!world.readyAt(entry.x,entry.z)||Math.hypot(point.x-entry.x,point.z-entry.z)>2.5)return null;
    const y=world.renderedGroundHeight?.(entry.x,entry.z)??world.heightAt(entry.x,entry.z);
    if(Math.abs(point.y-y)>2||!localSight(world,{...point,y:point.y+1.5},{...entry,y:y+1.5}))return null;
    return {id:'canerd-sacred-oak',name:'The Sacred Oak',occupation:'Ancient English oak',place:'Canerd / The sacred garden',x:CANERD_GARDEN.oak.x-CANERD_GARDEN.oak.trunkRadius,y,z:entry.z};
  }
  return {
    update(time,dt,point){
      if(disposed||!point)return;
      if(!people&&!pending&&!error&&scenery()?.root&&world.readyAt(CANERD.x,CANERD.z)&&Math.hypot(point.x-CANERD.x,point.z-CANERD.z)<160){
        pending=load().then(module=>{if(!disposed)people=module.createCanerdPeople(scene,world);})
          .catch(reason=>{error=String(reason);console.error('Canerd household:',reason);});
      }
      people?.update(time,dt,point);
      if(Math.hypot(point.x-CANERD.x,point.z-CANERD.z)<170)oak()?.update(Math.max(0,Math.min(.1,dt)),{speaking:speaking==='canerd-sacred-oak'});
    },
    residentTarget(point){
      const tree=oakTarget(point),person=people?.target(point);
      return tree&&(!person||Math.hypot(tree.x-point.x,tree.z-point.z)<Math.hypot(person.x-point.x,person.z-point.z))?tree:person??tree??null;
    },
    residentPeople:()=>people?.people()??[],
    setResidentTalking(id,point){speaking=id;people?.setTalking(id,point);oak()?.setAwake(id==='canerd-sacred-oak');},
    state:()=>({loaded:!!people,pending:!!pending&&!people&&!error,error,...(people?.state()??{}),speaking,oak:oak()?.state()??null}),
    dispose(){disposed=true;people?.dispose();people=null;oak()?.setAwake(false);},
  };
}
