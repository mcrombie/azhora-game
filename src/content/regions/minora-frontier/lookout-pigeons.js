import {createCourierPigeon} from './courier-pigeon.js';
import {LOOKOUT} from '../../../app/exploration/tower-state.js';

// Three local birds, not a regional wildlife population. Only the active room
// advances their clock. Flights return to their own perch; no path searches.
export function createLookoutPigeons(parent){
  let clock=0,observing=null;
  const birds=[-8,-7,-6].map((x,i)=>{
    const model=createCourierPigeon(parent);model.root.scale.setScalar(.6);
    const perch={x,y:1.34,z:4.02};model.root.position.set(x,perch.y,perch.z);
    return {id:'guild-dove-'+i,model,perch,next:18+i*24,flight:null,feedingUntil:0};
  });
  const find=id=>birds.find(b=>b.id===id);
  function launch(b){if(!b||b.flight!==null||clock<b.feedingUntil||birds.some(v=>v.flight!==null))return false;b.flight=clock;return true;}
  function update(dt){
    clock+=Math.max(0,Math.min(dt??0,.1));
    for(const [i,b]of birds.entries()){
      if(b.id!==observing&&clock>=b.next&&b.flight===null&&clock>=b.feedingUntil)launch(b);
      const g=b.model.root,p=b.perch;
      if(b.flight!==null){
        // Keep the outward arc between the west pillars, above the parapet.
        const u=Math.min(1,(clock-b.flight)/10),angle=Math.PI*2*u;
        g.position.set(p.x-9*Math.sin(Math.PI*u)**2,p.y+4*Math.sin(Math.PI*u),p.z+2.2*Math.sin(angle));
        g.rotation.y=Math.atan2(9*Math.PI*Math.sin(angle),-4.4*Math.PI*Math.cos(angle));
        b.model.flap(clock,true);
        if(u===1){b.flight=null;b.next=clock+65+i*9;g.position.set(p.x,p.y,p.z);}
      }else{
        g.position.set(p.x,p.y+Math.sin(clock*2+i)*.006,p.z);g.rotation.y=.12*Math.sin(clock*.7+i);
        b.model.idle(clock+i*1.7,clock<b.feedingUntil);
      }
    }
  }
  update(0);
  return {update,observe:id=>{observing=id;},
    target(player){return birds.filter(b=>b.flight===null&&Math.abs(player.y-LOOKOUT.y)<2.5)
      .map(b=>({id:b.id,distance:Math.hypot(player.x-LOOKOUT.x-b.perch.x,player.z-LOOKOUT.z-b.perch.z)}))
      .filter(b=>b.distance<2.7).sort((a,b)=>a.distance-b.distance)[0]??null;},
    feed(id){const b=find(id);if(!b||b.flight!==null)return false;b.feedingUntil=clock+6;b.next=Math.max(b.next,clock+15);return true;},
    fly:id=>launch(find(id)),
    state:()=>birds.map(b=>({id:b.id,flying:b.flight!==null,feeding:clock<b.feedingUntil,position:b.model.root.position.toArray(),headYaw:b.model.head.rotation.y,headPitch:b.model.head.rotation.x})),
    dispose(){for(const b of birds)b.model.dispose();}
  };
}
