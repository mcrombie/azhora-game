import {HEARTHFALL_KEY} from './checkpoint.js';

/** Integration seam for the replacement Hearthfall PR. No settlement engine is
 * installed yet. Keep experiment actors/UI under owned roots and dispose them.
 * tick receives active play only; paused menus must not advance the economy.
 * Request persistence through the host's save flow, never a campaign store. */
export function createHearthfallSession({saved=null,scene,world,player,onDirty}){
  let state=structuredClone(saved?.sandbox??{version:1,seed:980,settlements:null});
  return {
    tick(_dt,_elapsed){},
    save(exploration){return {version:1,format:HEARTHFALL_KEY,exploration,sandbox:structuredClone(state)};},
    restore(data){state=structuredClone(data.sandbox);},
    state:()=>structuredClone(state),
    dispose(){},
  };
}
