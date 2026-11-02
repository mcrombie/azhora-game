import * as THREE from 'three';
import {weatherSample,weatherClimate} from './weather-model.js';
import {createWeatherView} from './weather-view.js';

export const WEATHER_PREVIEWS=Object.freeze([
  ['clear','Clear sky'],['partly-cloudy','Partly cloudy'],['cloudy','Cloudy'],['overcast','Overcast'],['rain','Rain'],
]);

// Weather follows existing saved time. It never advances the campaign or
// writes a checkpoint. restore() lets daylight establish its baseline first.
export function createWeatherHost({scene,camera,sun,hemisphere,world,position,context,viewFactory=createWeatherView}){
  const view=viewFactory({scene,camera,world}),scratch=new THREE.Color(),grey=new THREE.Color(),zenith=new THREE.Color();
  const nightSun=new THREE.Color(0xa8bdd4),nightSky=new THREE.Color(0x92a4b9);
  const daylightRoot=scene.getObjectByName('Day/night atmosphere experiment');
  const saved={background:new THREE.Color(),fog:new THREE.Color(),sun:new THREE.Color(),sky:new THREE.Color()};
  let applied=false,disposed=false,preview=null,time=0,initialized=false,lastContext={},sample=weatherSample(0);
  let climate=null,climateFrom=null,climateSince=8;
  let background=null,fog=null,sunIntensity=0,skyIntensity=0,near=0,far=0,density=0;
  const uniforms=[];
  function restore(){
    if(!applied)return;
    if(scene.background===background&&background?.isColor)background.copy(saved.background);
    if(scene.fog===fog&&fog){fog.color.copy(saved.fog);if(fog.isFog){fog.near=near;fog.far=far;}else if(fog.isFogExp2)fog.density=density;}
    sun.color.copy(saved.sun);sun.intensity=sunIntensity;
    hemisphere.color.copy(saved.sky);hemisphere.intensity=skyIntensity;
    for(const entry of uniforms){if(entry.value?.isColor)entry.uniform.value.copy(entry.value);else entry.uniform.value=entry.value;}
    uniforms.length=0;applied=false;
  }
  function tintUniform(uniform,color,amount){
    if(!uniform?.value?.isColor)return;
    uniforms.push({uniform,value:uniform.value.clone()});uniform.value.lerp(color?.isColor?color:scratch.setHex(color),amount);
  }
  function fadeUniform(uniform,amount){
    if(!uniform||!Number.isFinite(uniform.value))return;
    uniforms.push({uniform,value:uniform.value});uniform.value*=amount;
  }
  function apply(ctx){
    if(!ctx.exterior)return;
    background=scene.background;fog=scene.fog;
    if(background?.isColor)saved.background.copy(background);
    if(fog){saved.fog.copy(fog.color);near=fog.near;far=fog.far;density=fog.density;}
    saved.sun.copy(sun.color);sunIntensity=sun.intensity;saved.sky.copy(hemisphere.color);skyIntensity=hemisphere.intensity;
    const night=Math.max(0,Math.min(1,ctx.night??0)),cover=sample.cloudCover,wet=sample.rain;
    grey.setHex(0x96a6ae).lerp(scratch.setHex(0x253343),night);
    zenith.setHex(0x7c8e9d).lerp(scratch.setHex(0x152333),night);
    const amount=sample.overcast*.56+wet*.14;
    if(background?.isColor)background.lerp(grey,amount);
    if(fog){fog.color.lerp(grey,amount);const visibility=1-wet*.4-sample.overcast*.12;
      if(fog.isFog){fog.near=near*visibility;fog.far=far*visibility;}else if(fog.isFogExp2)fog.density=density/visibility;
    }
    sun.intensity=sunIntensity*(1-cover*.43-wet*.17);
    hemisphere.intensity=skyIntensity*(1-wet*.16-sample.overcast*.08);
    sun.color.lerp(scratch.setHex(0xe0e8eb).lerp(nightSun,night),sample.overcast*.7);
    hemisphere.color.lerp(scratch.setHex(0xc9d3d8).lerp(nightSky,night),sample.overcast*.34);
    // Compose with the existing sun, moons and stars, without extra lights or
    // shadow passes. Free exploration receives its sky from the cloud dome.
    if(daylightRoot?.visible){
      for(const mesh of daylightRoot.children){const u=mesh.material?.uniforms;
        tintUniform(u?.horizon,grey,amount);tintUniform(u?.zenith,zenith,amount);
        fadeUniform(u?.opacity,Math.max(.01,1-sample.overcast*.98-wet*.25));
        if(mesh.isPoints){const material=mesh.material;uniforms.push({uniform:{get value(){return material.opacity;},set value(v){material.opacity=v;}},value:material.opacity});material.opacity*=1-cover*.98;}
      }
    }
    applied=true;
  }
  function update(dt=0){
    if(disposed)return;
    restore();const ctx=context();lastContext=ctx;
    const seconds=Number.isFinite(ctx.time)?Math.max(0,ctx.time):time;
    // A paused frame still redraws the same weather, including when the camera
    // or room changes. The host never owns another advancing game clock.
    if(!initialized||ctx.active!==false){time=seconds;initialized=true;}
    const region=world.regionAt?.(position.x,position.z);
    const nextClimate=weatherClimate(region),target=weatherSample(time,{climate:nextClimate,override:preview});
    if(!preview&&climate&&nextClimate!==climate){climateFrom={...sample};climateSince=0;}
    climate=nextClimate;if(preview)climateFrom=null;
    sample=target;
    if(climateFrom){
      if(ctx.active!==false)climateSince+=Math.max(0,Math.min(.25,Number.isFinite(dt)?dt:0));
      const x=Math.min(1,climateSince/8),blend=x*x*(3-2*x);
      for(const key of ['cloudCover','rain','wind','windX','windZ','overcast'])sample[key]=climateFrom[key]+(target[key]-climateFrom[key])*blend;
      if(blend<.5){sample.kind=climateFrom.kind;sample.label=climateFrom.label;}
      sample.regionTransition=blend;if(x===1)climateFrom=null;
    }
    apply(ctx);
    view.update(dt,{sample,time,exterior:!!ctx.exterior,night:ctx.night??0,position,active:ctx.active!==false,sky:!ctx.dayNight});
  }
  return {
    update,restore,
    setPreview(kind){if(disposed||kind!==null&&!WEATHER_PREVIEWS.some(([id])=>id===kind))return false;preview=kind;update(0);return true;},
    audio(){const state=view.state();return {rain:sample.rain,wind:sample.wind,exterior:!!lastContext.exterior,sheltered:!!state.sheltered};},
    state(){return {time,preview,sample:{...sample},active:lastContext.active!==false,exterior:!!lastContext.exterior,view:view.state(),lighting:{sun:sun.intensity,hemisphere:hemisphere.intensity,fog:scene.fog?.color.getHexString()??null,far:scene.fog?.far??null},disposed};},
    dispose(){if(disposed)return;restore();view.dispose();disposed=true;},
  };
}

export function createWeatherControls(weather,parent=globalThis.document?.querySelector('#exploration-developer .developer-card')){
  if(!parent)return {dispose(){}};
  const section=document.createElement('section');section.id='developer-weather';
  const label=document.createElement('label');label.textContent='Weather ';label.htmlFor='weather-preview';
  const select=document.createElement('select');select.id='weather-preview';
  for(const [value,text]of [['','Natural weather'],...WEATHER_PREVIEWS]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}
  select.onchange=()=>weather.setPreview(select.value||null);label.append(select);section.append(label);
  const hint=document.createElement('p');hint.textContent='Preview the sky without changing campaign time. Choose Natural weather to resume the current conditions.';section.append(hint);
  select.addEventListener('keydown',event=>{if(['Space','Enter','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.code))event.stopPropagation();});
  parent.append(section);return {dispose(){section.remove();}};
}
