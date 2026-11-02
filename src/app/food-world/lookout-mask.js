import * as THREE from 'three';
import {hexOwnerAt,REGION_NAME_BY_ID} from '../../world/terrain/region-world.js';

const main=/void\s+main\s*\(\s*\)\s*\{/;
const vertexPrefix='varying vec2 vReviewedCountryside;\n';
const vertexBegin=`
  vec4 reviewedPosition=vec4(position,1.0);
  #ifdef USE_INSTANCING
  reviewedPosition=instanceMatrix*reviewedPosition;
  #endif
  vReviewedCountryside=(modelMatrix*reviewedPosition).xz;
`;
const fragmentPrefix=`varying vec2 vReviewedCountryside;
uniform sampler2D reviewedMask;
uniform vec4 reviewedBounds;
uniform float reviewedKeepInside;
uniform bool reviewedMaskEnabled;
`;
const fragmentBegin=`
  if(reviewedMaskEnabled){
    vec2 reviewedUv=(vReviewedCountryside-reviewedBounds.xy)/reviewedBounds.zw;
    bool reviewedInside=false;
    if(reviewedUv.x>=0.0&&reviewedUv.y>=0.0&&reviewedUv.x<1.0&&reviewedUv.y<1.0)
      reviewedInside=texture2D(reviewedMask,reviewedUv).r>0.5;
    if(reviewedInside!=(reviewedKeepInside>0.5))discard;
  }
`;
function patch(shader,uniforms){
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=vertexPrefix+shader.vertexShader.replace(main,match=>match+vertexBegin);
  shader.fragmentShader=fragmentPrefix+shader.fragmentShader.replace(main,match=>match+fragmentBegin);
}

// One static occupancy texture joins current farms to the cached actual far
// landscape. Both scenes use its exact complementary edge: no doubled farms,
// roofs or water, no new region simulation, and no per-frame spatial searches.
export function createLookoutCountrysideMask(regionIds,bounds,{resolution=1024}={}){
  const names=new Set(regionIds.map(id=>REGION_NAME_BY_ID[id]));
  const width=bounds.maxX-bounds.minX,depth=bounds.maxZ-bounds.minZ;
  const bytes=new Uint8Array(resolution*resolution);let prefix=new Uint32Array((resolution+1)**2);
  for(let z=0;z<resolution;z++)for(let x=0;x<resolution;x++){
    const inside=names.has(hexOwnerAt(bounds.minX+(x+.5)*width/resolution,bounds.minZ+(z+.5)*depth/resolution));
    bytes[z*resolution+x]=inside?255:0;
    const k=(z+1)*(resolution+1)+x+1;
    prefix[k]=Number(inside)+prefix[k-1]+prefix[k-resolution-1]-prefix[k-resolution-2];
  }
  const texture=new THREE.DataTexture(bytes,resolution,resolution,THREE.RedFormat);
  texture.minFilter=texture.magFilter=THREE.NearestFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
  const enabled={value:false},restores=[],hidden=[],materials=[];let active=false;
  const common={reviewedMask:{value:texture},reviewedBounds:{value:new THREE.Vector4(bounds.minX,bounds.minZ,width,depth)},reviewedMaskEnabled:enabled};
  const sample=(x,z)=>{
    const ix=Math.floor((x-bounds.minX)/width*resolution),iz=Math.floor((z-bounds.minZ)/depth*resolution);
    return ix>=0&&iz>=0&&ix<resolution&&iz<resolution&&bytes[iz*resolution+ix]!==0;
  };
  // Whole objects definitely in the other scene are also excluded from draw
  // submission. Only batches crossing the border need fragment clipping.
  function coverage(mesh){
    if(!prefix)return 'mixed';
    const sphere=(mesh.boundingSphere??mesh.geometry.boundingSphere)?.clone();
    if(!sphere)return 'mixed';
    sphere.applyMatrix4(mesh.matrixWorld);
    const x0=Math.floor((sphere.center.x-sphere.radius-bounds.minX)/width*resolution),x1=Math.ceil((sphere.center.x+sphere.radius-bounds.minX)/width*resolution);
    const z0=Math.floor((sphere.center.z-sphere.radius-bounds.minZ)/depth*resolution),z1=Math.ceil((sphere.center.z+sphere.radius-bounds.minZ)/depth*resolution);
    const crossesBounds=x0<0||z0<0||x1>=resolution||z1>=resolution;
    const a=Math.max(0,x0),b=Math.min(resolution,x1+1),c=Math.max(0,z0),d=Math.min(resolution,z1+1);
    if(a>=b||c>=d)return 'outside';
    const stride=resolution+1,count=prefix[d*stride+b]-prefix[c*stride+b]-prefix[d*stride+a]+prefix[c*stride+a];
    return count===0?'outside':!crossesBounds&&count===(b-a)*(d-c)?'inside':'mixed';
  }
  function apply(root,keepInside){
    const copies=new Map(),uniforms={...common,reviewedKeepInside:{value:keepInside?1:0}};
    root.updateMatrixWorld(true);
    root.traverse(mesh=>{
      if(!mesh.isMesh)return;
      if(!mesh.geometry.boundingSphere)mesh.geometry.computeBoundingSphere();
      if(mesh.isInstancedMesh&&!mesh.boundingSphere)mesh.computeBoundingSphere();
      const covered=coverage(mesh);
      if(covered!=='mixed'){
        if((covered==='inside')!==keepInside)hidden.push({mesh,visible:mesh.visible});
        return;
      }
      const original=mesh.material;
      const copy=material=>{
        if(copies.has(material))return copies.get(material);
        const clone=material.clone();
        if(clone.isShaderMaterial){clone.uniforms={...material.uniforms};patch(clone,uniforms);}
        else{
          const previous=material.onBeforeCompile;
          clone.onBeforeCompile=(shader,renderer)=>{previous.call(clone,shader,renderer);patch(shader,uniforms);};
          clone.customProgramCacheKey=()=>material.customProgramCacheKey()+'-reviewed-countryside-v1';
        }
        copies.set(material,clone);materials.push(clone);return clone;
      };
      mesh.material=Array.isArray(original)?original.map(copy):copy(original);
      restores.push(()=>{mesh.material=original;});
    });
    setActive(active);
  }
  function setActive(value){active=!!value;enabled.value=active;for(const h of hidden)h.mesh.visible=active?false:h.visible;}
  return {apply,setActive,contains:sample,seal(){prefix=null;},
    state:()=>({active,resolution,bytes:bytes.length,cpuBytes:bytes.length+(prefix?.byteLength??0),excludedDraws:hidden.length,materialVariants:materials.length}),
    dispose(){setActive(false);for(const restore of restores)restore();for(const material of materials)material.dispose();texture.dispose();},
  };
}
