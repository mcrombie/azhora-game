import {parseCells,inside} from './campaign-map-geometry.js';

// An optional presentation boundary. It neither edits atlas geography nor
// changes discovery/save data, and it is independent of political ownership.
export function createAtlasScope(names,paths){
  if(!names?.length)return null;
  const cells=names.flatMap(name=>parseCells(paths.get(name)??''));
  if(!cells.length)throw Error('No atlas cells found for this scenario.');
  const bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};
  for(const cell of cells)for(const [x,y] of cell){bounds.minX=Math.min(bounds.minX,x);bounds.maxX=Math.max(bounds.maxX,x);bounds.minY=Math.min(bounds.minY,y);bounds.maxY=Math.max(bounds.maxY,y);}
  return {names:[...names],bounds,path:cells.map(cell=>'M'+cell.map(p=>p.join(',')).join('L')+'Z').join(''),
    contains:p=>cells.some(cell=>inside([p.x,p.y],cell))};
}
export function scopeMinimumZoom(scope,width,height,fitScale){
  if(!scope||!fitScale)return 1;const b=scope.bounds;
  return Math.max(1,Math.min(width/(b.maxX-b.minX+48),height/(b.maxY-b.minY+48))/fitScale);
}
export function clampScopeOffset(scope,{width,height,scale,x,y}){
  const b=scope.bounds;
  const clamp=(value,size,min,max)=>{min-=24;max+=24;return (max-min)*scale<=size?(size-(min+max)*scale)/2:Math.max(size-max*scale,Math.min(-min*scale,value));};
  return {x:clamp(x,width,b.minX,b.maxX),y:clamp(y,height,b.minY,b.maxY)};
}
