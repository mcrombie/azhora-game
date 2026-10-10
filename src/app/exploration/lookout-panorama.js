import {LOOKOUT} from './tower-state.js';
import {LOOKOUT_TOUR} from '../../content/regions/minora-frontier/lookout-tour.js';
export {LOOKOUT_HORIZON} from '../../content/regions/minora-frontier/lookout-bounds.js';

// An eye at the open parapet, beyond the columns, with a gentle fixed pan.
// Keep the actual tower altitude and world bearings; never teleport the view
// to the distant city or move geography to make it fit.
export function lookoutCamera(view,time=0){
  const east=view==='east',sweep=Math.sin(Math.min(time,18)/18*Math.PI-.5)*.035;
  const page=LOOKOUT_TOUR.find(p=>p.view===view);
  if(page){
    const dx=page.target.x-LOOKOUT.x,dz=page.target.z-LOOKOUT.z,bearing=Math.atan2(dx,dz)+page.bias+sweep;
    // Stand just outside the parapet on the side facing the actual subject.
    const radius=10.8/Math.max(Math.abs(Math.sin(bearing)),Math.abs(Math.cos(bearing)));
    const eye={x:LOOKOUT.x+Math.sin(bearing)*radius,y:LOOKOUT.y+1.75,z:LOOKOUT.z+Math.cos(bearing)*radius};
    const distance=Math.hypot(dx,dz);
    return {eye,target:{x:eye.x+Math.sin(bearing)*distance,y:page.target.y,z:eye.z+Math.cos(bearing)*distance},fov:page.fov};
  }
  const bearing=(east?Math.PI/2+.015:.31)+sweep;
  const eye={x:LOOKOUT.x+(east?10.8:5),y:LOOKOUT.y+1.75,z:LOOKOUT.z+(east?5:10.8)};
  return {eye,target:{x:eye.x+Math.sin(bearing)*1900,y:east?27:-170,z:eye.z+Math.cos(bearing)*1900},fov:east?45:66};
}
