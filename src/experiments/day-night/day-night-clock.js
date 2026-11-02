// Presentation-only experiment. Campaign days, saves and actor schedules do not
// read this clock. The established timing is one world minute per real second.
export const DAY_NIGHT_SECONDS=24*60;
export const DAY_NIGHT_DEMO_SPEED=24;
export const NIGHT_LIGHT_FLOOR=Object.freeze({sun:.45,hemisphere:.95});
const TAU=Math.PI*2;
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
const smooth=(lo,hi,v)=>{const t=clamp((v-lo)/(hi-lo),0,1);return t*t*(3-2*t);};
export const wrapHour=hour=>Number.isFinite(hour)?((hour%24)+24)%24:9;

export function daylightWords(hour){
  const h=wrapHour(hour);
  if(h<4.5)return 'the small hours';
  if(h<5.5)return 'before dawn';
  if(h<7)return 'first light';
  if(h<11)return 'morning';
  if(h<14)return 'midday';
  if(h<17.5)return 'afternoon';
  if(h<19.5)return 'dusk';
  return 'night';
}

function direction(hour,tilt,out){
  const a=(hour-6)/24*TAU,y=Math.sin(a),z=y*tilt,n=Math.hypot(Math.cos(a),y,z);
  out.x=Math.cos(a)/n;out.y=y/n;out.z=z/n;return out;
}

// Optional reusable output avoids creating vectors or arrays in the frame loop.
export function daylightSample(hour,out={sun:{},sova:{},vel:{}}){
  const h=wrapHour(hour);out.hour=h;out.words=daylightWords(h);
  direction(h,.35,out.sun);direction(h+12,.28,out.sova);direction(h+15,-.55,out.vel);
  out.daylight=smooth(-.12,.3,out.sun.y);
  // Keep an afterglow after the sun itself drops below the horizon. Without it
  // the held dusk view at 18:30 was already almost indistinguishable from night.
  out.twilight=(1-smooth(.02,.42,Math.abs(out.sun.y)))*smooth(-.33,.04,out.sun.y);
  out.stars=1-smooth(-.3,.04,out.sun.y);
  out.sunIntensity=NIGHT_LIGHT_FLOOR.sun+(2.1-NIGHT_LIGHT_FLOOR.sun)*out.daylight;
  out.hemisphereIntensity=NIGHT_LIGHT_FLOOR.hemisphere+(1.65-NIGHT_LIGHT_FLOOR.hemisphere)*out.daylight;
  return out;
}

export function createDayNightClock({hour=9}={}){
  let current=wrapHour(hour),enabled=false,running=false,speed=1;
  return {
    get hour(){return current;},
    get enabled(){return enabled;},
    setEnabled(value){enabled=!!value;},
    setHour(value){if(Number.isFinite(value))current=wrapHour(value);},
    setRunning(value){running=!!value;},
    setSpeed(value){if(value===1||value===DAY_NIGHT_DEMO_SPEED)speed=value;},
    update(dt,{active=true,exterior=true}={}){
      if(enabled&&running&&active&&exterior&&Number.isFinite(dt)&&dt>0)current=wrapHour(current+dt*speed/60);
      return current;
    },
    state(){return {enabled,running,speed,hour:current,words:daylightWords(current),cycleSeconds:DAY_NIGHT_SECONDS/speed};},
  };
}
