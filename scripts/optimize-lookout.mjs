// Offline only. Screen-error-limited simplification of the actual source meshes.
import {MeshoptSimplifier as S,MeshoptEncoder as E} from 'meshoptimizer';
import {LOOKOUT} from '../src/app/exploration/tower-state.js';
export async function simplifyLookout(source){
  await Promise.all([S.ready,E.ready]);
  const usage=new Map();for(const m of source.meshes){if(!usage.has(m.geometry))usage.set(m.geometry,[]);usage.get(m.geometry).push(m);}
  let before=0,after=0,changed=0;
  const geometries=source.geometries.map((g,id)=>{
    const uses=usage.get(id);if(!uses||uses.some(m=>m.instances)||g.groups.length>1)return g;
    const count=g.attributes.position.array.length/3;
    if(count<100)return g;
    let tolerance=Infinity;
    for(const m of uses){const [x,y,z,r]=m.sphere;const distance=Math.max(20,Math.hypot(x-LOOKOUT.x,y-LOOKOUT.y,z-LOOKOUT.z)-r-20);
      const a=m.matrix,scale=Math.max(Math.hypot(a[0],a[1],a[2]),Math.hypot(a[4],a[5],a[6]),Math.hypot(a[8],a[9],a[10]));
      tolerance=Math.min(tolerance,distance*.35/869/scale);
    }
    const keys=Object.keys(g.attributes),attrs={},remap=new Uint32Array(count),unique=new Map();let n=0;
    // Weld identical attributes. Include colour/normal seams in the key.
    for(const key of keys)attrs[key]=[];
    for(let i=0;i<count;i++){
      const values=[];for(const key of keys){const a=g.attributes[key];for(let j=0;j<a.itemSize;j++)values.push(a.array[i*a.itemSize+j]);}
      const key=values.join(',');let v=unique.get(key);
      if(v===undefined){v=n++;unique.set(key,v);for(const k of keys){const a=g.attributes[k];for(let j=0;j<a.itemSize;j++)attrs[k].push(a.array[i*a.itemSize+j]);}}
      remap[i]=v;
    }
    const indices=g.index?Uint32Array.from(g.index.array,i=>remap[i]):remap;
    const positions=new Float32Array(attrs.position),detail=[];
    const detailKeys=['color','normal'].filter(k=>attrs[k]);const weights=detailKeys.flatMap(k=>k==='color'?[2,2,2]:[.3,.3,.3]);
    for(let i=0;i<n;i++)for(const k of detailKeys)detail.push(...attrs[k].slice(i*3,i*3+3));
    const flags=['ErrorAbsolute','LockBorder','Permissive'];
    const [reduced,error]=S.simplifyWithAttributes(indices,positions,3,new Float32Array(detail),weights.length,weights,null,Math.floor(indices.length*.12/3)*3,tolerance,flags);
    before+=indices.length/3;after+=reduced.length/3;if(reduced.length<indices.length)changed++;
    const [order,size]=E.reorderMesh(reduced,true,true),attributes={};
    for(const k of keys){const old=g.attributes[k],a=new Float32Array(size*old.itemSize);for(let i=0;i<n;i++)if(order[i]!==0xffffffff)for(let j=0;j<old.itemSize;j++)a[order[i]*old.itemSize+j]=attrs[k][i*old.itemSize+j];attributes[k]={...old,array:a};}
    return {...g,attributes,index:{array:reduced,itemSize:1,normalized:false},groups:[],simplificationError:error};
  });
  console.log('Actual mesh simplification: '+JSON.stringify({before,after,changed}));
  return {...source,geometries,optimization:{...source.optimization,maxMeshErrorPixels:.35,simplifiedMeshes:changed,uniqueTrianglesBefore:before,uniqueTrianglesAfter:after}};
}
