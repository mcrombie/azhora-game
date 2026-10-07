import {trackingBearing} from './war-tracking.js';

export function createWarTrackingView(onStop){
  const root=document.createElement('aside');root.id='world-war-track';root.hidden=true;root.setAttribute('aria-label','Tracked army or battle');
  const arrow=document.createElement('span');arrow.className='war-track-arrow';arrow.textContent='\u2191';arrow.setAttribute('aria-hidden','true');
  const body=document.createElement('div'),title=document.createElement('strong'),distance=document.createElement('span'),detail=document.createElement('p');
  const stop=document.createElement('button');stop.textContent='Stop';stop.setAttribute('aria-label','Stop tracking');stop.onclick=onStop;
  body.append(title,distance,detail);root.append(arrow,body,stop);document.body.append(root);
  const write=(element,text)=>{if(element.textContent!==text)element.textContent=text;};
  return {update(model,position,yaw,visible){
    root.hidden=!model||!visible;if(root.hidden)return;
    write(title,model.label);write(detail,model.detail);
    const bearing=trackingBearing(position,model.location,yaw);arrow.hidden=!bearing;
    write(distance,bearing?` / ${bearing.distance>=1000?(bearing.distance/1000).toFixed(1)+' km':Math.round(bearing.distance)+' m'} ${model.via?'to waypoint':'direct'}`:'');
    if(bearing)arrow.style.transform=`rotate(${bearing.angle}rad)`;
  },dispose(){root.remove();}};
}
