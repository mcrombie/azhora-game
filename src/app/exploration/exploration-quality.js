/**
 * **How much a phone draws** (8 October 2026: the Lizeemi War Scenario on a phone). The exploration
 * host already caps the pixel ratio at 1.5 and draws no shadow map, unlike the adventure's full
 * graphics (src/main.js). A phone also gives up antialiasing and draws only as far as the fog lets
 * anything be seen (the open-air fog ends at 560 m), and it notes its frame times in the console once
 * a minute as a development aid. `?quality=full|phone` overrides the guess; scenery residency is unchanged.
 */
export const QUALITY=Object.freeze({
  full:Object.freeze({id:'full',pixelRatio:1.5,antialias:true,far:1800,frameLog:false}),
  phone:Object.freeze({id:'phone',pixelRatio:1.5,antialias:false,far:600,frameLog:true}),
});
/** `phone` is the phone layout (exploration-touch.js `phoneLayout`), `coarse` a touch screen of any size. */
export function explorationQuality({search='',phone=false,coarse=false}={}){
  return QUALITY[new URLSearchParams(search).get('quality')]??(phone||coarse?QUALITY.phone:QUALITY.full);
}
/** Frame times in, one console line a minute out: `EXPLORATION_FRAMES {"frames":..,"fps":..,"p50":..,"p95":..,"worst":..}`. */
export function createFrameLog({every=60000,log=message=>console.log(message)}={}){
  let spent=0,frames=[];
  return {tick(ms){
    if(!(ms>0))return null;frames.push(ms);spent+=ms;if(spent<every)return null;
    const sorted=[...frames].sort((a,b)=>a-b),at=q=>Math.round(sorted[Math.min(sorted.length-1,Math.floor(q*sorted.length))]*10)/10;
    const summary={frames:frames.length,fps:Math.round(frames.length/spent*10000)/10,p50:at(.5),p95:at(.95),worst:Math.round(sorted.at(-1))};
    log('EXPLORATION_FRAMES '+JSON.stringify(summary));frames=[];spent=0;return summary;
  }};
}
