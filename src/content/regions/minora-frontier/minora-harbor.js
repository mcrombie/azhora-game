// The White Bridge's south parapet opens onto a sloping timber gangway.
// These same dimensions drive the visible planks, walking surface and rails.
export const MINORA_HARBOR={x:-2232,z:162,y:17.2,width:10,length:12,
  ramp:{x:-2232,start:140,end:156,width:5,top:21.3,bottom:17.2},
  opening:{start:-2235.5,end:-2228.5},
  keeper:{x:-2234,z:161},arrival:{x:-2232,z:158},boat:{x:-2224,z:162,yaw:0}};

export function minoraHarborHeight(x,z){
  const h=MINORA_HARBOR,r=h.ramp;
  if(Math.abs(x-r.x)<=r.width/2&&z>=r.start&&z<=r.end)return r.top+(r.bottom-r.top)*(z-r.start)/(r.end-r.start);
  if(Math.abs(x-h.x)<=h.width/2&&Math.abs(z-h.z)<=h.length/2)return h.y;
  return null;
}

// Side is in world coordinates (south is +1 on an x-axis bridge).
export function minoraBridgeRailRuns(bridge,side){
  const start=bridge.start+(bridge.railInsetStart??0),end=bridge.end;
  if(bridge.id!=='menora-lizeem-bridge'||side!==1)return [[start,end]];
  return [[start,MINORA_HARBOR.opening.start],[MINORA_HARBOR.opening.end,end]];
}
