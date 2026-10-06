import { IBENWOOD_BOUNDARY, ibenwoodTerritoryAt, boundaryDepth } from './ibenwood-boundary.js';
import { createIbenwoodDefense } from './ibenwood-defense.js';
import { createForestArrows } from '../../../gameplay/combat/forest-arrows.js';
import { forestLineClear } from '../../../gameplay/combat/forest-sightline.js';
import { createIbenwoodDefenseView, ELVEN_BOUNDARY_TEXT } from './ibenwood-defense-view.js';
import { canStand } from '../../../gameplay/movement/game-state.js';
import { meleeContacts } from '../../../gameplay/combat/melee-contact.js';

export const ELFLAND_ENCOUNTER='elfland-rangers';
export function createIbenwoodDefenseHost({scene,world,combat,skills,getBodies=()=>[],onOtherHit=()=>{},onChange=()=>{},toast=()=>{}}) {
  const standable=p=>canStand(p.x,p.z,world,.4)&&!(world.canSwimAt?.(p.x,p.z))&&Math.abs(world.heightAt(p.x+.4,p.z)-world.heightAt(p.x-.4,p.z))<.8&&Math.abs(world.heightAt(p.x,p.z+.4)-world.heightAt(p.x,p.z-.4))<.8;
  function stand(point,territorial=true){
    for(let ring=0;ring<=8;ring+=1)for(let n=0;n<(ring?24:1);n++){
      const a=n*Math.PI/12,p={x:point.x+Math.sin(a)*ring,z:point.z+Math.cos(a)*ring};
      if(standable(p)&&(territorial?ibenwoodTerritoryAt(p.x,p.z):boundaryDepth(p.x,p.z)<-4))return p;
    }
    return null;
  }
  const posts=IBENWOOD_BOUNDARY.rangerPosts.map(post=>{
    const p=stand(post);if(!p)return null;
    const patrol=post.patrol.map(point=>stand(point)??p);
    return {...post,...p,patrol};
  }).filter(Boolean);
  const markers=IBENWOOD_BOUNDARY.markers.map(m=>({...m,...(stand(m,false)??m),sign:true}));
  const view=createIbenwoodDefenseView({scene,world,markers});
  // Register after choosing every stand so the spatial index is rebuilt once.
  for(const m of markers){const p=m.boundary,y=world.heightAt(p.x,p.z);world.colliders.push({x:p.x,z:p.z,r:.55,minY:y,maxY:y+1.3,kind:'elven-boundary-stone'});}
  const initialSafe=IBENWOOD_BOUNDARY.approaches.map(a=>stand(a.outside,false)).find(Boolean)??IBENWOOD_BOUNDARY.approaches[0].outside;
  let clock=0,testingDisabled=false,announced=false,lastPosition=null,lastSafe=initialSafe;
  const arrows=createForestArrows({world,getBodies,onHit:(body,arrow)=>{
    if(body.id==='traveler')combat.npcProjectileHit(arrow.damage,{sourceId:arrow.owner,x:arrow.origin.x,z:arrow.origin.z,encounterId:ELFLAND_ENCOUNTER,impactId:arrow.id});
    else if(body.id.startsWith('ibenwood-ranger-'))damage(body.id,arrow.damage);
    else onOtherHit(body,arrow);
  }});
  const model=createIbenwoodDefense({posts,inside:ibenwoodTerritoryAt,groundAt:world.heightAt,
    canMove:(from,to)=>standable(to)&&Math.abs(world.heightAt(from.x,from.z)-world.heightAt(to.x,to.z))<.32,
    lineClear:(a,b)=>forestLineClear(world,a,b,{radius:0}),
    onShot:shot=>{
      const origin=view.bowOrigin(shot.rangerId);
      arrows.fire({...shot,origin:origin?{x:origin.x,y:origin.y,z:origin.z}:shot.origin});
    },onPractice:xp=>skills.gain('stealth',xp)});
  function bodies(){return model.state().actors.filter(a=>a.hp>0).map(a=>({...a,r:.4,minY:a.y,maxY:a.y+1.95,team:'enemy'}));}
  function damage(id,amount){const result=model.damage(id,amount);if(result.ok)onChange();return result;}
  const seenImpacts=new Set();
  function impact(event){
    if(event.source!=='player'||event.practice||event.bout||!['melee-impact','arrow-impact'].includes(event.type)||seenImpacts.has(event.id))return 0;
    const targets=bodies();let hits=[];
    if(event.type==='arrow-impact')hits=targets.filter(a=>a.id===event.targetId&&(!Number.isFinite(event.y)||(event.y>=a.minY&&event.y<=a.maxY)));
    else if(lastPosition)hits=meleeContacts(event,targets,null).filter(a=>Math.abs(a.y-lastPosition.y)<1.6&&forestLineClear(world,{...lastPosition,y:lastPosition.y+1},{x:a.x,y:a.y+1,z:a.z}));
    if(!hits.length)return 0;
    seenImpacts.add(event.id);if(seenImpacts.size>128)seenImpacts.delete(seenImpacts.values().next().value);
    for(const a of hits)damage(a.id,event.damage);return hits.length;
  }
  function frame(dt,input){
    lastPosition={...input.position};
    const disabled=input.disabled??testingDisabled;
    const state=model.update(dt,{...input,disabled});
    if(!input.paused&&!disabled){clock+=Math.min(.1,Math.max(0,dt));
      if(state.actors.length&&boundaryDepth(input.position.x,input.position.z)<-15&&standable(input.position))lastSafe={x:input.position.x,z:input.position.z};
      // Include the midpoint between markers, including their small terrain
      // adjustments, so a lateral approach also receives the visible warning.
      const close=state.actors.length&&markers.some(m=>Math.hypot(m.x-input.position.x,m.z-input.position.z)<23);
      if(close&&!announced){toast(ELVEN_BOUNDARY_TEXT,'CARVED BOUNDARY MARKER');announced=true;}
      if(!close)announced=false;
    }
    arrows.update(dt,{paused:input.paused||disabled});
    view.update(state,arrows.state(),clock,input.position);
    return state;
  }
  return {model,posts,markers,view,arrows,frame,bodies,damage,impact,
    snapshot:()=>model.snapshot(),state:()=>model.state(),get lastSafe(){return {...lastSafe};},
    get testingDisabled(){return testingDisabled;},setTestingDisabled(value){testingDisabled=!!value;arrows.clear();},
    restore(saved){arrows.clear();seenImpacts.clear();if(saved==null)model.reset({fresh:true});return model.restore(saved);},
    reset(options){arrows.clear();seenImpacts.clear();return model.reset(options);}};
}
