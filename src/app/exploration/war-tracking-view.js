import {trackingBearing} from './war-tracking.js';
import {writeHud} from './hud-write.js';

export function createWarTrackingView(onStop,onRoute,onCouncil=()=>{}){
  const root=document.createElement('aside');root.id='world-war-track';root.hidden=true;root.setAttribute('aria-label','Tracked army or battle');
  const arrow=document.createElement('span');arrow.className='war-track-arrow';arrow.textContent='\u2191';arrow.setAttribute('aria-hidden','true');
  const body=document.createElement('div'),title=document.createElement('strong'),distance=document.createElement('span'),detail=document.createElement('p');body.className='war-track-body';distance.className='war-track-distance';
  const stop=document.createElement('button');stop.textContent='Stop';stop.setAttribute('aria-label','Stop tracking');stop.onclick=onStop;
  const route=document.createElement('button');route.textContent='Track the nearby army';route.onclick=onRoute;
  const visits=document.createElement('details');visits.className='war-council-destinations';const summary=document.createElement('summary');summary.textContent='Other council visits / optional';visits.append(summary);
  for(const [id,name] of [['council','Taleth'],['mayor','Mayor'],['temple','High Priest']]){const b=document.createElement('button');b.textContent=name;b.dataset.councilDestination=id;b.onclick=()=>onCouncil(id);visits.append(b);}
  body.append(title,distance,detail,route,visits);root.append(arrow,stop,body);document.getElementById('world-war-report-more').before(root);
  const write=(element,text)=>{if(element.textContent!==text)element.textContent=text;};
  return {update(model,position,yaw,visible){
    // A mounted horse's "ready for the road" card repeats the live objective.
    // Keep this row for an actual destination, with one direction and distance.
    writeHud(root,'hidden',!model||!visible||!model.location);if(root.hidden)return;
    writeHud(route,'hidden',true);writeHud(visits,'hidden',!model.council);writeHud(stop,'hidden',false);
    write(title,model.label);write(detail,model.detail);
    writeHud(detail,'hidden',!model.council);root.title=model.detail;
    const bearing=trackingBearing(position,model.location,yaw);writeHud(arrow,'hidden',!bearing);
    write(distance,bearing?`${bearing.distance>=1000?(bearing.distance/1000).toFixed(1)+' km':Math.round(bearing.distance)+' m'} away`:'');
    if(bearing)arrow.style.transform=`rotate(${bearing.angle}rad)`;
  },dispose(){root.remove();}};
}
