import * as THREE from 'three';
import {createDayNightClock,daylightSample} from './day-night-clock.js';

const SKY_VERTEX=`varying vec3 direction; void main(){direction=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const SKY_FRAGMENT=`uniform vec3 horizon;uniform vec3 zenith;varying vec3 direction;
void main(){float height=smoothstep(-.12,.7,direction.y);gl_FragColor=vec4(mix(horizon,zenith,height),1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;
const DISC_VERTEX=`varying vec2 point;void main(){point=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const DISC_FRAGMENT=`uniform vec3 color;uniform float opacity;uniform float halo;uniform float moon;varying vec2 point;
void main(){float r=length(point);if(r>1.)discard;float a=(1.-smoothstep(mix(.94,.05,halo),1.,r))*opacity;
float surface=1.-moon*(.13*r+.07*sin(point.x*17.)*sin(point.y*23.));gl_FragColor=vec4(color*surface,a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`;

function disc(name,color,angularRadius,{halo=false,moon=false}={}){
  const material=new THREE.ShaderMaterial({uniforms:{color:{value:new THREE.Color(color)},opacity:{value:1},halo:{value:halo?1:0},moon:{value:moon?1:0}},vertexShader:DISC_VERTEX,fragmentShader:DISC_FRAGMENT,transparent:true,depthWrite:false,fog:false});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);mesh.name=name;mesh.userData.angularRadius=angularRadius;mesh.frustumCulled=false;mesh.renderOrder=-998;return mesh;
}

function starField(){
  const count=224,positions=new Float32Array(count*3);let seed=917;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<count;i++){const a=random()*Math.PI*2,y=.04+random()*.94,r=Math.sqrt(1-y*y);positions.set([Math.cos(a)*r,y,Math.sin(a)*r],i*3);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const stars=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xd6e4fc,size:1.8,sizeAttenuation:false,transparent:true,opacity:0,depthWrite:false,fog:false}));
  stars.name='Day/night stars';stars.frustumCulled=false;stars.renderOrder=-999;return stars;
}

/** A reversible exterior-only lighting preview: no added lights, world actors,
 * textures, simulation commands, save writes or shadow passes. The host calls
 * update(0, context) after changing a room, then once after its camera update. */
export function createDayNightExperiment({scene,camera,sun,hemisphere}){
  const clock=createDayNightClock(),sample=daylightSample(9),root=new THREE.Group();root.name='Day/night atmosphere experiment';root.visible=false;
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1,32,16),new THREE.ShaderMaterial({uniforms:{horizon:{value:new THREE.Color()},zenith:{value:new THREE.Color()}},vertexShader:SKY_VERTEX,fragmentShader:SKY_FRAGMENT,side:THREE.BackSide,depthWrite:false,depthTest:false,fog:false}));
  dome.name='Day/night sky';dome.frustumCulled=false;dome.renderOrder=-1000;
  const sunDisc=disc('Sun',0xffedb0,.012),sunHalo=disc('Sun halo',0xffdb85,.038,{halo:true});
  const sova=disc('Sova',0xffe5b5,.011,{moon:true}),vel=disc('Vel',0xbdcffa,.0052,{moon:true}),stars=starField();
  root.add(dome,stars,sunHalo,sunDisc,sova,vel);scene.add(root);
  const lightBaseline={color:sun.color.clone(),intensity:sun.intensity,position:sun.position.clone(),sky:hemisphere.color.clone(),ground:hemisphere.groundColor.clone(),hemisphereIntensity:hemisphere.intensity};
  let background=scene.background,fog=scene.fog,backgroundColor=background?.isColor?background.clone():null,fogColor=fog?.color?.clone()??null;
  let applied=false,exterior=true,active=false,disposed=false,lastBackground=background,lastFog=fog,environmentSunIntensity=sun.intensity;
  const sunDistance=Math.max(1,sun.position.distanceTo(sun.target.position)),scratch=new THREE.Color(),direction=new THREE.Vector3();
  const mix=(target,night,day,dawn=day)=>{target.setHex(night).lerp(scratch.setHex(day),sample.daylight);if(sample.twilight)target.lerp(scratch.setHex(dawn),sample.twilight*.72);};

  function captureEnvironment(){
    // Room changes replace these objects. Capture the new host baseline, rather
    // than restoring the previous exterior fog into the tower or limbo.
    if(scene.background!==lastBackground||scene.fog!==lastFog)environmentSunIntensity=sun.intensity;
    if(scene.background!==lastBackground){background=scene.background;backgroundColor=background?.isColor?background.clone():null;lastBackground=background;}
    if(scene.fog!==lastFog){fog=scene.fog;fogColor=fog?.color?.clone()??null;lastFog=fog;}
  }
  function restore(){
    if(!applied)return;
    sun.color.copy(lightBaseline.color);sun.intensity=environmentSunIntensity;sun.position.copy(lightBaseline.position);
    hemisphere.color.copy(lightBaseline.sky);hemisphere.groundColor.copy(lightBaseline.ground);hemisphere.intensity=lightBaseline.hemisphereIntensity;
    if(scene.background===background&&backgroundColor)scene.background.copy(backgroundColor);
    if(scene.fog===fog&&fogColor)scene.fog.color.copy(fogColor);
    applied=false;
  }
  function placeDisc(mesh,vector,radius,opacity){
    mesh.position.set(vector.x,vector.y,vector.z).multiplyScalar(radius);
    mesh.scale.setScalar(radius*mesh.userData.angularRadius);mesh.quaternion.copy(camera.quaternion);
    mesh.material.uniforms.opacity.value=opacity;mesh.visible=vector.y>-.04&&opacity>.005;
  }
  function apply(){
    if(disposed)return;
    captureEnvironment();const enabled=clock.enabled;
    root.visible=enabled&&exterior;
    if(!root.visible){restore();return;}
    daylightSample(clock.hour,sample);
    mix(dome.material.uniforms.horizon.value,0x253851,0xb6c8b0,0xd6a36e);
    mix(dome.material.uniforms.zenith.value,0x08142e,0x608cbe,0x586485);
    if(scene.background?.isColor)scene.background.copy(dome.material.uniforms.horizon.value);
    if(scene.fog)scene.fog.color.copy(dome.material.uniforms.horizon.value);
    mix(hemisphere.color,0x8fa6c6,0xf0f2d8,0xd2bac0);mix(hemisphere.groundColor,0x33445a,0x53644b,0x64554a);
    mix(sun.color,0x9fb9df,0xffe6ba,0xffae70);sun.intensity=sample.sunIntensity;hemisphere.intensity=sample.hemisphereIntensity;
    // Hand the existing light gradually between the sun and Sova. A hard switch
    // at the horizon would abruptly reverse the lighting on every building.
    const d=sample.daylight,m=1-d;
    direction.set(sample.sun.x*d+sample.sova.x*m,Math.max(.12,sample.sun.y*d+sample.sova.y*m),sample.sun.z*d+sample.sova.z*m).normalize();sun.position.copy(sun.target.position).addScaledVector(direction,sunDistance);
    root.position.copy(camera.position);const radius=Math.max(1,camera.far*.94);dome.scale.setScalar(radius);stars.scale.setScalar(radius*.98);
    stars.material.opacity=sample.stars*.82;stars.visible=sample.stars>.005;
    placeDisc(sunDisc,sample.sun,radius*.96,1);placeDisc(sunHalo,sample.sun,radius*.961,.3);
    placeDisc(sova,sample.sova,radius*.96,1-sample.daylight*.82);placeDisc(vel,sample.vel,radius*.96,1-sample.daylight*.92);
    applied=true;
  }
  return {
    setEnabled(value){if(disposed)return;captureEnvironment();clock.setEnabled(value);apply();},
    setHour(value){if(disposed)return;clock.setHour(value);daylightSample(clock.hour,sample);apply();},
    setRunning(value){if(!disposed)clock.setRunning(value);},
    setSpeed(value){if(!disposed)clock.setSpeed(value);},
    update(dt,context={}){if(disposed)return;exterior=context.exterior??exterior;active=context.active??active;if(Number.isFinite(context.hour))clock.setHour(context.hour);clock.update(dt,{active,exterior});apply();},
    state(){return {...clock.state(),label:sample.words,night:1-sample.daylight,exterior,active,visible:root.visible,disposed,sun:{...sample.sun},moons:[{name:'Sova',...sample.sova},{name:'Vel',...sample.vel}],visibleCelestials:{sun:root.visible&&sunDisc.visible,sova:root.visible&&sova.visible,vel:root.visible&&vel.visible,stars:root.visible&&stars.visible},sunIntensity:sun.intensity,hemisphereIntensity:hemisphere.intensity,lighting:{sun:sun.color.getHexString(),hemisphere:hemisphere.color.getHexString(),ground:hemisphere.groundColor.getHexString(),background:scene.background?.isColor?scene.background.getHexString():null,fog:scene.fog?.color.getHexString()??null},drawCalls:root.visible?root.children.filter(c=>c.visible).length:0,triangles:968,stars:224,extraLights:0,extraShadowPasses:0};},
    dispose(){if(disposed)return;captureEnvironment();restore();root.visible=false;scene.remove(root);for(const child of root.children){child.geometry.dispose();child.material.dispose();}disposed=true;clock.setEnabled(false);},
  };
}
