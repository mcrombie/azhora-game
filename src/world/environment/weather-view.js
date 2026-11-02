import * as THREE from 'three';

const clamp=(value,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(value)?value:0));
const CLOUD_VERTEX=`varying vec3 direction;
void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const CLOUD_FRAGMENT=`
uniform float time;uniform float cover;uniform float overcast;uniform float fullSky;
uniform vec2 worldOrigin;uniform vec3 horizon;uniform vec3 zenith;uniform vec3 lightCloud;uniform vec3 darkCloud;
varying vec3 direction;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float cloudNoise(vec2 p){float n=0.,a=.54;for(int i=0;i<4;i++){n+=a*noise(p);p=p*2.03+vec2(7.1,2.7);a*=.47;}return n;}
void main(){
  vec3 d=normalize(direction);
  // Intersect a high horizontal layer in world space: clouds drift on their
  // own and remain anchored to the landscape as the traveler walks.
  vec2 p=(worldOrigin+d.xz*(480./max(.12,d.y)))*.0032+vec2(time*.0031,time*.0014);
  float n=cloudNoise(p+vec2(cloudNoise(p*.48),cloudNoise(p*.48+19.))*1.7);
  float threshold=mix(.90,.17,cover);
  float shape=smoothstep(threshold-.11,threshold+.13,n);
  float density=mix(shape*.94,.96,overcast*.86);
  float horizonFade=smoothstep(.015,.16,d.y);
  float alpha=density*horizonFade*smoothstep(.005,.055,cover);
  vec3 cloud=mix(darkCloud,lightCloud,smoothstep(.22,.72,n));
  vec3 sky=mix(horizon,zenith,smoothstep(-.08,.78,d.y));
  gl_FragColor=vec4(mix(sky,cloud,alpha),mix(alpha,1.,fullSky));
  if(fullSky<.5)gl_FragColor.rgb=cloud;
  if(gl_FragColor.a<.002)discard;
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const RAIN_VERTEX=`
uniform float time;uniform float intensity;uniform vec2 wind;
attribute float tip;attribute float seed;attribute float floorHeight;
varying float visibility;varying float height;varying float cutoff;
void main(){vec3 p=position;float streakLength=.40+seed*.30;
 p.y=mod(position.y-time*(12.+seed*4.),24.)-4.+tip*streakLength;
 p.xz-=wind*tip*.8;
 visibility=smoothstep(seed-.035,seed+.035,intensity);height=p.y;cutoff=floorHeight;
 gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;
const RAIN_FRAGMENT=`uniform vec3 color;uniform float opacity;
varying float visibility;varying float height;varying float cutoff;
void main(){if(height<cutoff||visibility<.01)discard;gl_FragColor=vec4(color,opacity*visibility);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const EXCLUDED=/terrain|ground patch|water|ocean|river surface|day\/night|weather|lookout landscape|rigid character batch/i;
const ACTORS=/^character-|^horse-|^goblin-|^wolf-|^dog-|^cat-|^quest-marker|human household|resident people|civilian people|live wildlife/i;
const ROOF_ENVELOPE=/roof|ceiling|hall|house|keep|stable|household range|barn|temple|shed|inn\b/i;

/** Two bounded draws, no textures, lights, shadow maps or environment mutation.
 * The host owns weather time and the lighting/fog blend. Hidden rooms and held
 * updates perform no shelter, terrain, mesh or particle work. */
export function createWeatherView({scene,camera,world={},maxRain=512}) {
  const count=Math.max(64,Math.min(768,Math.floor(maxRain)||512));
  const root=new THREE.Group();root.name='Living weather';root.userData.weather=true;root.visible=false;scene.add(root);
  const cloudUniforms={time:{value:0},cover:{value:0},overcast:{value:0},fullSky:{value:0},worldOrigin:{value:new THREE.Vector2()},
    horizon:{value:new THREE.Color()},zenith:{value:new THREE.Color()},lightCloud:{value:new THREE.Color()},darkCloud:{value:new THREE.Color()}};
  const cloudMaterial=new THREE.ShaderMaterial({uniforms:cloudUniforms,vertexShader:CLOUD_VERTEX,fragmentShader:CLOUD_FRAGMENT,
    side:THREE.BackSide,transparent:true,depthTest:true,depthWrite:false,fog:false});
  const clouds=new THREE.Mesh(new THREE.SphereGeometry(1,32,16),cloudMaterial);
  clouds.name='Procedural weather clouds';clouds.renderOrder=-997;clouds.frustumCulled=false;clouds.visible=false;root.add(clouds);
  const positions=new Float32Array(count*6),tips=new Float32Array(count*2),seeds=new Float32Array(count*2),floors=new Float32Array(count*2);
  let seedValue=0x619fa31;
  const random=()=>{seedValue=(Math.imul(seedValue,1664525)+1013904223)>>>0;return seedValue/4294967296;};
  for(let i=0;i<count;i++) {
    const angle=random()*Math.PI*2,radius=Math.sqrt(random())*23,x=Math.cos(angle)*radius,z=Math.sin(angle)*radius,y=random()*24,s=random();
    for(let end=0;end<2;end++){positions.set([x,y,z],i*6+end*3);tips[i*2+end]=end;seeds[i*2+end]=s;floors[i*2+end]=-4;}
  }
  const rainGeometry=new THREE.BufferGeometry();
  for(const [name,array,size] of [['position',positions,3],['tip',tips,1],['seed',seeds,1],['floorHeight',floors,1]])
    rainGeometry.setAttribute(name,new THREE.BufferAttribute(array,size));
  rainGeometry.attributes.floorHeight.setUsage(THREE.DynamicDrawUsage);
  const rainUniforms={time:{value:0},intensity:{value:0},wind:{value:new THREE.Vector2()},color:{value:new THREE.Color()},opacity:{value:.43}};
  const rainMaterial=new THREE.ShaderMaterial({uniforms:rainUniforms,vertexShader:RAIN_VERTEX,fragmentShader:RAIN_FRAGMENT,
    transparent:true,depthTest:true,depthWrite:false,fog:false});
  const rain=new THREE.LineSegments(rainGeometry,rainMaterial);rain.name='Local weather rain';rain.frustumCulled=false;rain.visible=false;root.add(rain);
  const sphere=new THREE.Sphere(),box=new THREE.Box3(),raycaster=new THREE.Raycaster(),up=new THREE.Vector3(0,1,0),origin=new THREE.Vector3();
  const candidates=[],colliders=[],seen=new Set(),scratch=new THREE.Color(),wetNightLight=new THREE.Color(0x424e60),wetNightDark=new THREE.Color(0x202c3c),anchor=new THREE.Vector3(Infinity,Infinity,Infinity);
  let disposed=false,sheltered=false,animationTime=0,shelterAge=Infinity,shelterQueries=0,floorSamples=0;
  let currentRain=0,currentCover=0,currentNight=0,fullSky=false,hasFrame=false;
  function heightAt(x,z,fallback) {
    floorSamples++;
    const y=(world.renderedGroundHeight??world.heightAt)?.call(world,x,z);
    return Number.isFinite(y)?y:fallback;
  }
  function covers(c,x,z,margin=0) {
    return c.r!==undefined?(x-c.x)**2+(z-c.z)**2<=(c.r+margin)**2:
      Math.abs(x-c.x)<=c.hx+margin&&Math.abs(z-c.z)<=c.hz+margin;
  }
  function gather(point) {
    candidates.length=0;
    // Cached broad phase: never raycast whole terrain, forests, actors or sky.
    // Merged nearby buildings retain their real roof triangles for the one
    // upward shelter ray, including roofs without movement colliders.
    const visit=node=>{
      if(!node.visible||node.userData?.weather||node.userData?.creature||node.userData?.blankSlate||ACTORS.test(node.name)||/Day\/night/.test(node.name))return;
      if(node.isMesh&&!node.isInstancedMesh&&!node.isSkinnedMesh&&!node.userData.liveTree&&node.geometry?.attributes.position&&!EXCLUDED.test(node.name)) {
        const material=Array.isArray(node.material)?node.material[0]:node.material;
        if(material&&!material.transparent&&material.visible!==false) {
          const geometry=node.geometry;if(!geometry.boundingSphere)geometry.computeBoundingSphere();
          sphere.copy(geometry.boundingSphere).applyMatrix4(node.matrixWorld);
          if(Math.hypot(sphere.center.x-point.x,sphere.center.z-point.z)<sphere.radius+35) {
            if(!geometry.boundingBox)geometry.computeBoundingBox();box.copy(geometry.boundingBox).applyMatrix4(node.matrixWorld);
            const dx=Math.max(box.min.x-point.x,0,point.x-box.max.x),dz=Math.max(box.min.z-point.z,0,point.z-box.max.z);
            if(dx*dx+dz*dz<35*35&&box.max.y>point.y+2.5&&box.min.y<point.y+80&&
              box.max.x-box.min.x>.8&&box.max.z-box.min.z>.8)
              candidates.push({mesh:node,box:box.clone(),distance:dx*dx+dz*dz,roof:ROOF_ENVELOPE.test(node.name)});
          }
        }
      }
      for(const child of node.children)visit(child);
    };
    visit(scene);candidates.sort((a,b)=>a.distance-b.distance);if(candidates.length>64)candidates.length=64;
  }
  function refreshShelter(point) {
    shelterQueries++;shelterAge=0;anchor.set((point.x+camera.position.x)/2,point.y,(point.z+camera.position.z)/2);
    // New streamed scenery can arrive before its first renderer frame. This
    // once-per-second transform refresh also covers that first shelter query.
    scene.updateMatrixWorld();gather(point);origin.set(point.x,point.y+1.8,point.z);raycaster.set(origin,up);raycaster.near=.5;raycaster.far=80;
    sheltered=false;
    for(const entry of candidates) {
      const b=entry.box;if(point.x<b.min.x||point.x>b.max.x||point.z<b.min.z||point.z>b.max.z)continue;
      entry.mesh.updateWorldMatrix(true,false);
      // Roofs are commonly authored front-side only. Inspect their actual
      // triangles from below without changing the material used to render.
      const materials=Array.isArray(entry.mesh.material)?entry.mesh.material:[entry.mesh.material],sides=materials.map(material=>material.side);
      let covered=false;
      try{for(const material of materials)material.side=THREE.DoubleSide;covered=raycaster.intersectObject(entry.mesh,false).some(hit=>hit.distance>.5);}
      finally{materials.forEach((material,index)=>{material.side=sides[index];});}
      if(covered){sheltered=true;break;}
    }
    colliders.length=0;seen.clear();
    for(const c of world.nearColliders?.(anchor.x,anchor.z,25)??[]) {
      if(seen.has(c)||!Number.isFinite(c.maxY)||/water|boundary/i.test(c.kind??''))continue;
      seen.add(c);colliders.push(c);
      if(c.minY>point.y+2.1&&covers(c,point.x,point.z))sheltered=true;
    }
    rain.position.copy(anchor);
    if(sheltered)return;
    for(let i=0;i<count;i++) {
      const x=anchor.x+positions[i*6],z=anchor.z+positions[i*6+2];
      let floor=heightAt(x,z,point.y)+.14;
      for(const c of colliders)if(c.maxY>floor&&covers(c,x,z,.12))floor=c.maxY+.14;
      // Conservative roof envelopes keep visible neighboring buildings dry;
      // the actual triangle ray above decides whether the traveler is indoors.
      for(const entry of candidates)if(entry.roof&&x>=entry.box.min.x&&x<=entry.box.max.x&&z>=entry.box.min.z&&z<=entry.box.max.z)
        floor=Math.max(floor,entry.box.max.y+.14);
      floors[i*2]=floors[i*2+1]=floor-anchor.y;
    }
    rainGeometry.attributes.floorHeight.needsUpdate=true;
  }
  function colours(night,covered,raining) {
    const blend=(target,day,dark)=>target.setHex(day).lerp(scratch.setHex(dark),night);
    blend(cloudUniforms.horizon.value,0xb9d0dd,0x26364c);blend(cloudUniforms.zenith.value,0x5d94c4,0x0b1730);
    blend(cloudUniforms.lightCloud.value,0xf1f0e8,0x657080);blend(cloudUniforms.darkCloud.value,0xa8b6c1,0x273344);
    scratch.setHex(0x9daab3).lerp(wetNightLight,night);
    cloudUniforms.lightCloud.value.lerp(scratch,covered*.55+raining*.20);
    scratch.setHex(0x697987).lerp(wetNightDark,night);
    cloudUniforms.darkCloud.value.lerp(scratch,raining*.55);
    blend(rainUniforms.color.value,0xb6d1de,0x718ba9);rainUniforms.opacity.value=.43-night*.10;
  }
  return {
    root,clouds,rain,
    update(dt,{sample={},time=0,exterior=true,night=0,position=camera.position,active=true,sky=false}={}) {
      if(disposed)return;
      root.visible=!!exterior;
      if(!exterior){shelterAge=Infinity;return;}
      // The saved clock seeds a fresh view. Thereafter active bounded frame
      // time animates weather even while a battle holds campaign time still.
      if(!hasFrame)animationTime=Number.isFinite(time)?Math.max(0,time):0;
      else if(active)animationTime+=clamp(dt,0,.1);
      hasFrame=true;
      currentCover=clamp(sample.cloudCover);currentNight=clamp(night);fullSky=!!sky;
      const previousRain=currentRain;currentRain=clamp(sample.rain);
      clouds.position.copy(camera.position);clouds.scale.setScalar(Math.max(1,(camera.far??1200)*.88));
      clouds.visible=fullSky||currentCover>.005;
      cloudUniforms.time.value=animationTime;cloudUniforms.cover.value=currentCover;cloudUniforms.overcast.value=clamp(sample.overcast);
      cloudUniforms.fullSky.value=fullSky?1:0;cloudUniforms.worldOrigin.value.set(camera.position.x,camera.position.z);
      colours(currentNight,clamp(sample.overcast),currentRain);
      rainUniforms.time.value=animationTime;rainUniforms.intensity.value=currentRain;
      rainUniforms.wind.value.set(clamp(sample.windX,-1,1),clamp(sample.windZ,-1,1));
      if(currentRain>.005&&active) {
        shelterAge+=clamp(dt,0,.25);
        const moved=Math.hypot((position.x+camera.position.x)/2-anchor.x,(position.z+camera.position.z)/2-anchor.z)>5||Math.abs(position.y-anchor.y)>2;
        if(shelterAge>=1||moved||previousRain<=.005)refreshShelter(position);
      }else if(currentRain<=.005)sheltered=false;
      rain.visible=currentRain>.005&&!sheltered&&Number.isFinite(anchor.x);
    },
    state(){return {disposed,visible:root.visible,cloudVisible:root.visible&&clouds.visible,rainVisible:root.visible&&rain.visible,
      sheltered,animationTime,rainTime:rainUniforms.time.value,drawCalls:root.visible?Number(clouds.visible)+Number(rain.visible):0,
      rainCount:root.visible&&rain.visible?Math.round(count*currentRain):0,rainCapacity:count,triangles:960,
      extraLights:0,extraShadowPasses:0,shelterQueries,shelterCandidates:candidates.length,floorSamples,
      sky:fullSky,cloudCover:currentCover,rain:currentRain,night:currentNight};},
    dispose(){if(disposed)return;disposed=true;root.visible=false;root.removeFromParent();clouds.geometry.dispose();cloudMaterial.dispose();rainGeometry.dispose();rainMaterial.dispose();candidates.length=0;colliders.length=0;},
  };
}
