import {finishBuild} from '../../../world/loading/build-steps.js';
import * as THREE from 'three';
import {createLeagueStandards} from '../../../world/scenery/league-standards.js';
import {createSceneryBuilder} from '../../../world/scenery/scenery-builder.js';
import {CARICAS_TOWN,CARICAS_BUILDINGS,CARICAS_ROADS} from './caricas-settlement.js';
import {caricasPaving} from './caricas-paving.js';
import {CARICAS_PALETTE,caricasFacade,caricasCourtDetail,caricasMarketStall} from './caricas-town-detail.js';
/** Local sandstone and limewash, worked timber and red occupation standards. */
export function createCaricasSettlement(...args){return finishBuild(createCaricasSettlementSteps(...args));}

export function* createCaricasSettlementSteps({parent,heightAt,colliders,terrainSurface}){
  const root=new THREE.Group();root.name='Caricas occupied market town';parent.add(root);
  const kit=createSceneryBuilder('Caricas buildings and grain court'),earth=createSceneryBuilder('Caricas lanes');
  const C=CARICAS_PALETTE;
  for(const [i,b] of CARICAS_BUILDINGS.entries()){
    yield;
    const y=heightAt(b.x,b.z);kit.block(C.stone,b.x,y-.4,b.z,b.w+.5,.65,b.d+.5);
    kit.block(['#ded4b7','#c7c7b1','#d0c1a0'][i%3],b.x,y,b.z,b.w,b.h,b.d);
    kit.roof(i%3===0?'#a27359':C.roof,b.x,y+b.h,b.z,b.w+1,b.d+1,2.1,0,C.wall);
    // Four corner posts, rather than full-depth timber slabs just inside the
    // plaster: those nearly coplanar walls striped badly from the lookout.
    for(const sx of [-1,1])for(const sz of [-1,1])kit.block(C.timber,b.x+sx*(b.w/2-.06),y,b.z+sz*(b.d/2-.06),.26,b.h,.26);
    kit.block(C.timber,b.x,y+b.h*.48,b.z,b.w+.08,.2,b.d+.08);
    for(const side of [-1,1])for(const u of [-.28,.28]){
      const z=b.z+side*(b.d/2+.025),x=b.x+b.w*u;
      for(const v of [1.3,b.h-2.05]){kit.block(C.timber,x,y+v-.07,z,1.45,1.7,.14);kit.block('#8fa7a2',x,y+v,z+side*.09,1.12,1.42,.045);
        kit.block(C.trim,x,y+v,z+side*.12,.09,1.42,.07);kit.block(C.trim,x,y+v+.68,z+side*.12,1.12,.09,.07);}}
    const toward=b.x<CARICAS_TOWN.x?1:-1,dx=b.x+toward*(b.w/2+.03);
    kit.block(C.timber,dx,y,b.z,.16,2.7,1.9);kit.block(C.dark,dx+toward*.1,y+.1,b.z,.04,2.5,1.58);
    caricasFacade(kit,b,y,i);
    colliders.push({x:b.x,z:b.z,hx:b.w/2,hz:b.d/2,minY:y-.5,maxY:y+b.h+2.2,kind:'building',id:b.id});
  }
  yield* caricasPaving(earth,heightAt,terrainSurface);
  yield* caricasCourtDetail({parent:root,kit,earth,heightAt,colliders});
  for(const [i,[x,z]] of [[-2100,271],[-2084,271]].entries()){yield;caricasMarketStall(kit,x,heightAt(x,z),z,i);}
  // Unnamed civic noticeboard records the deferred civil-war thread without starting a quest.
  {const x=-2080,z=258,y=heightAt(x,z);for(const s of [-1,1])kit.block(C.timber,x+s*.75,y,z,.16,2.2,.16);
    kit.block(C.timber,x,y+.85,z,1.85,1.2,.14);for(let n=0;n<3;n++)kit.block('#d6cb9e',x-.56+n*.54,y+1.02,z+.085,.43,.65,.025);}
  for(let i=0;i<9;i++){const x=-2108+(i%3)*1.6,z=242+Math.floor(i/3)*1.6,y=heightAt(x,z);kit.cylinder('#99856a',x,y,z,.57,1.15);
    for(const h of [.16,.88])kit.cylinder(C.metal,x,y+h,z,.58,.075);}
  yield* kit.finishSteps(root);yield* earth.finishSteps(root,{castShadow:false});
  const standards=createLeagueStandards(root,heightAt,[[-2099,230],[-2080,242],[-2104,250]],{cloth:C.red,timber:C.timber,gold:C.gold});
  return {root,standards,metrics:{buildings:CARICAS_BUILDINGS.length,roads:CARICAS_ROADS.length,marketStalls:2,standards:3},
    mapFeatures:CARICAS_BUILDINGS.map(b=>({...b,kind:'building'}))};
}
