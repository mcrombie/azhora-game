import * as THREE from 'three';

import {SNERO_WINDOWS} from '../../content/regions/minora-frontier/snero-window-views.js';

// Independent full-world reference for comparing the prepared 3D window scenes.
const scenes=Object.fromEntries(SNERO_WINDOWS.map(v=>[v.id,{...v,name:v.place}]));
export function sneroWindowScene(id){
  const source=scenes[id];if(!source)return null;
  return {name:source.name,box:source.box,views:{overview:{eye:new THREE.Vector3(...source.eye),target:new THREE.Vector3(...source.target)}},
    async buildScene(scene){
      const {createWorldAsync}=await import('../../world.js');
      // Hidden offline windows do not reliably receive animation frames. Give
      // this isolated baker a timer scheduler; the game's scheduler is untouched.
      const request=window.requestAnimationFrame,cancel=window.cancelAnimationFrame;
      let world;
      try{
        window.requestAnimationFrame=callback=>setTimeout(()=>callback(performance.now()),0);
        window.cancelAnimationFrame=id=>clearTimeout(id);
        world=await createWorldAsync(scene,{loadingMode:'fast',initialRegion:source.region,enabledRegions:[source.region],regionalFineGround:true});
        await world.loading.ensureRegion(source.region);
        return {metrics:{region:source.region,source:'actual world',jobs:world.loading.state().completed}};
      }finally{
        world?.loading.stop();window.requestAnimationFrame=request;window.cancelAnimationFrame=cancel;
      }
    },
  };
}
