import * as THREE from 'three';

const patterns=new Map();
// A fan keeps every original block-edge vertex. Its neighbours can therefore
// retain fine triangles without cracks, including at terrain tile boundaries.
// Validate both source vertices and every crossing of a fan edge with a source
// grid/diagonal edge: these are all extrema of the two piecewise-linear surfaces.
function pattern(width,depth){
  const key=width+','+depth;if(patterns.has(key))return patterns.get(key);
  const cx=Math.floor(width/2),cz=Math.floor(depth/2),at=(x,z)=>z*(width+1)+x;
  const centre=at(cx,cz),boundary=[];
  for(let x=0;x<width;x++)boundary.push([x,0]);
  for(let z=0;z<depth;z++)boundary.push([width,z]);
  for(let x=width;x>0;x--)boundary.push([x,depth]);
  for(let z=depth;z>0;z--)boundary.push([0,z]);
  const tests=[];
  const difference=(a,b)=>{
    const terms=new Map();for(const [id,w]of a)terms.set(id,(terms.get(id)??0)+w);for(const [id,w]of b)terms.set(id,(terms.get(id)??0)-w);
    const termsArray=[...terms].filter(([,w])=>Math.abs(w)>1e-9);
    if(termsArray.length)tests.push({terms:termsArray,centreWeight:b.find(([id])=>id===centre)?.[1]??0});
  };
  const surface=(x,z)=>{
    const i=Math.min(width-1,Math.floor(x)),j=Math.min(depth-1,Math.floor(z)),u=x-i,v=z-j;
    return u+v<=1?[[at(i,j),1-u-v],[at(i+1,j),u],[at(i,j+1),v]]:[[at(i+1,j+1),u+v-1],[at(i,j+1),1-u],[at(i+1,j),1-v]];
  };
  for(let z=1;z<depth;z++)for(let x=1;x<width;x++){
    const dx=x-cx,dz=z-cz;if(!dx&&!dz)continue;
    const tx=dx>0?(width-cx)/dx:dx<0?-cx/dx:Infinity,tz=dz>0?(depth-cz)/dz:dz<0?-cz/dz:Infinity,t=Math.min(tx,tz);
    const bx=cx+dx*t,bz=cz+dz*t;
    let a,b,u;
    if(tx<=tz){const j=Math.min(depth-1,Math.floor(bz)),i=Math.round(bx);a=at(i,j);b=at(i,j+1);u=bz-j;}
    else{const i=Math.min(width-1,Math.floor(bx)),j=Math.round(bz);a=at(i,j);b=at(i+1,j);u=bx-i;}
    difference([[at(x,z),1]],[[centre,1-1/t],[a,(1-u)/t],[b,u/t]]);
  }
  for(const [x,z]of boundary){
    const dx=x-cx,dz=z-cz,edge=at(x,z),cuts=new Set();
    for(let n=0;n<=width;n++)if(dx)cuts.add((n-cx)/dx);
    for(let n=0;n<=depth;n++)if(dz)cuts.add((n-cz)/dz);
    for(let n=0;n<=width+depth;n++)if(dx+dz)cuts.add((n-cx-cz)/(dx+dz));
    for(const t of cuts)if(t>0&&t<1)difference(surface(cx+dx*t,cz+dz*t),[[centre,1-t],[edge,t]]);
  }
  const result={tests,boundary:boundary.map(([x,z])=>at(x,z)),centre};patterns.set(key,result);return result;
}

export function createLookoutTerrainGeometry(geometry,width,depth,{maxError=.2,blockSize=8}={}){
  const positions=geometry.attributes.position,lodPositions=positions.clone(),indices=[];let reducedBlocks=0,largestError=0;
  function block(x,z,w,d){
    if(w<3||d<3){fine(x,z,w,d);return;}
    const p=pattern(w,d),convert=id=>(z+Math.floor(id/(w+1)))*(width+1)+x+id%(w+1);
    let error=0,lower=0;const errors=[];
    for(const {terms,centreWeight}of p.tests){
      let delta=0;for(const [id,weight]of terms)delta+=positions.getY(convert(id))*weight;
      errors.push([delta,centreWeight]);
      if(delta<0&&centreWeight>1e-9)lower=Math.max(lower,-delta/centreWeight);
      if(lower>maxError)break;
    }
    if(lower>maxError)error=lower;
    else{error=lower;for(const [delta,weight]of errors)error=Math.max(error,delta+lower*weight);}
    if(error<=maxError){
      largestError=Math.max(largestError,error);reducedBlocks++;
      // Lower only the interior fan vertex, never its unchanged border. The
      // coarse surface therefore cannot bury original field/road overlays.
      lodPositions.setY(convert(p.centre),positions.getY(convert(p.centre))-lower);
      for(let i=0;i<p.boundary.length;i++)indices.push(convert(p.centre),convert(p.boundary[(i+1)%p.boundary.length]),convert(p.boundary[i]));
    }else if(w>=6&&d>=6){const a=Math.floor(w/2),b=Math.floor(d/2);block(x,z,a,b);block(x+a,z,w-a,b);block(x,z+b,a,d-b);block(x+a,z+b,w-a,d-b);}
    else fine(x,z,w,d);
  }
  function fine(x,z,w,d){for(let j=z;j<z+d;j++)for(let i=x;i<x+w;i++){const k=j*(width+1)+i;indices.push(k,k+width+1,k+1,k+1,k+width+1,k+width+2);}}
  for(let z=0;z<depth;z+=blockSize)for(let x=0;x<width;x+=blockSize)block(x,z,Math.min(blockSize,width-x),Math.min(blockSize,depth-z));
  const lod=new THREE.BufferGeometry();
  for(const [name,attribute]of Object.entries(geometry.attributes))lod.setAttribute(name,attribute);
  lod.setAttribute('position',lodPositions);
  lod.setIndex(indices);lod.boundingSphere=geometry.boundingSphere?.clone()??null;lod.boundingBox=geometry.boundingBox?.clone()??null;
  if(lod.boundingSphere)lod.boundingSphere.radius+=largestError;
  if(lod.boundingBox)lod.boundingBox.min.y-=largestError;
  return {geometry:lod,triangles:indices.length/3,sourceTriangles:geometry.index.count/3,reducedBlocks,maxError:largestError};
}

export function createLookoutTerrainDetail(root){
  const entries=[];let ready=false,active=false,buildMs=0;
  function prepare(){
    if(ready)return;const begin=performance.now();ready=true;
    root.traverse(mesh=>{const grid=mesh.userData.reviewedTerrainGrid;if(!grid)return;
      const source=mesh.geometry,result=createLookoutTerrainGeometry(source,grid.width,grid.depth);entries.push({mesh,source,...result});
    });buildMs=performance.now()-begin;
  }
  function setActive(value){if(value)prepare();active=!!value;for(const e of entries)e.mesh.geometry=active?e.geometry:e.source;}
  return {setActive,state:()=>({ready,active,buildMs,tiles:entries.length,sourceTriangles:entries.reduce((n,e)=>n+e.sourceTriangles,0),triangles:entries.reduce((n,e)=>n+e.triangles,0),maxError:Math.max(0,...entries.map(e=>e.maxError))}),
    dispose(){setActive(false);for(const e of entries)e.geometry.dispose();},
  };
}
