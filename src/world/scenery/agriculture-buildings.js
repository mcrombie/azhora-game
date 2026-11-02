// Static details for the food world's existing lots. These pieces are emitted
// into the shared scenery batch; they add no actors, housing or economic assets.
const common={wall:0xd3c8aa,trim:0xe4d8b7,stone:0xa59c85,timber:0x654f39,wood:0x826342,
  roof:0x758079,shutter:0x638579,dark:0x34463e,glass:0x91aaa1,metal:0x434b43,gold:0xc4a266};
const palettes={
  caricas:common,
  nethereum:{...common,wall:0xc7b891,roof:0x8a7955,shutter:0x88784e,wood:0x84683f},
  ovesos:{...common,wall:0xd7c6a4,roof:0x9b8057,shutter:0x5d8177,wood:0x88643f},
  nesdor:{...common,wall:0xcec6ac,roof:0x677b7e,shutter:0x6c8890,wood:0x765d44},
  isareos:{...common,wall:0xd6cfb1,roof:0x7c8063,shutter:0x7e8766,wood:0x806b4d},
};
const variation=id=>Array.from(String(id??'')).reduce((v,c)=>(v*31+c.charCodeAt(0))>>>0,0);
const face=(b,c,x,y,z,w,h)=>b.quad(c,[x-w/2,y,z],[x+w/2,y,z],[x+w/2,y+h,z],[x-w/2,y+h,z]);

function window(b,p,x,y,{wide=false,shutters=true}={}){
  const w=wide?1.22:.94,h=wide?1.35:1.1;
  // Recessed glass and hardware only need their outward face. The projecting
  // sill gives the window depth without five invisible faces for every pane.
  face(b,p.trim,x,y-.12,.035,w+.25,h+.25);
  face(b,p.dark,x,y,.045,w,h);
  face(b,p.glass,x,y+.07,.052,w-.16,h-.14);
  face(b,p.trim,x,y,.065,.065,h);
  face(b,p.trim,x,y+h*.53,.065,w,.07);
  b.block(p.stone,x,y-.18,.08,w+.4,.14,.24);
  if(shutters)for(const s of [-1,1]){
    const sx=x+s*(w/2+.28);
    face(b,p.shutter,sx,y-.01,.06,.37,h+.03);
    for(const rise of [.17,h-.21])face(b,p.timber,sx,y+rise,.069,.33,.055);
  }
}

function door(b,p,width,bottom,height,{double=false}={}){
  face(b,p.dark,0,bottom,.035,width+.12,height+.08);
  const count=double?8:5;
  for(let n=0;n<count;n++)face(b,n%2?p.wood:p.timber,(n-(count-1)/2)*width/count,bottom+.035,.065,width/count-.025,height-.045);
  for(const s of [-1,1])b.block(p.trim,s*(width/2+.12),bottom,.085,.18,height+.18,.15);
  b.block(p.trim,0,bottom+height+.02,.085,width+.42,.16,.15);
  for(const rise of [.42,height-.38])face(b,p.metal,0,bottom+rise,.075,width,.075);
  if(double)for(const side of [-1,1]){
    b.beam(p.wood,[side*.05,bottom+.35,.09],[side*(width/2-.13),bottom+height-.35,.09],.09);
    face(b,p.metal,side*.15,bottom+height*.48,.1,.07,.2);
  }
  else face(b,p.gold,width*.3,bottom+height*.5,.09,.07,.17);
  b.block(p.stone,0,bottom-.17,.085,width+.3,.18,.26);
}

function vent(b,p,x,y,width=1.3,height=.8){
  face(b,p.trim,x,y-.09,.035,width+.2,height+.2);
  face(b,p.dark,x,y,.045,width,height);
  for(let n=0;n<4;n++)face(b,p.wood,x,y+.08+n*(height-.12)/4,.065,width,.08);
}

/** Build a detailed exterior in the original lot and roof envelope. */
export function agricultureHouse(b,heightAt,lot,{region='caricas'}={}){
  const {x,z,w,d,h:height,kind}=lot,p=palettes[region]??common,seed=variation(lot.id);
  const barn=kind==='barn'||kind==='stable'||kind==='warehouse',granary=kind==='granary',hall=kind==='hall',working=barn||granary;
  const base=granary?1.3:.55,rise=Math.min(w*.42,3.6),storeys=lot.storeys>1?2:1;
  const wall=working?(granary?0xb4a480:0xbca785):seed%3===0?0xdcd1b4:p.wall;
  const roof=granary?0x887b5b:barn?0x8f7953:seed%4===0?0x9a7c61:p.roof;
  b.frame(x,heightAt(x,z),z,0,()=>{
    b.block(p.stone,0,-.22,0,w+.5,.85,d+.5);
    if(granary){
      for(const xx of [-w*.36,w*.36])for(const zz of [-d*.37,d*.37]){
        b.block(p.stone,xx,.6,zz,.7,.75,.7);
        b.block(p.trim,xx,1.15,zz,.94,.14,.94);
      }
      b.block(p.timber,0,1.22,0,w+.12,.15,d+.12);
    }
    b.block(wall,0,base,0,w,height-base,d);
    b.roof(roof,0,height,0,w+1.1,d+1.2,rise,0,wall);
    for(const xx of [-w/2,w/2])for(const zz of [-d/2,d/2])b.block(p.timber,xx,base,zz,.22,height-base,.22);

    const faces=[{yaw:0,span:w,ox:0,oz:d/2},{yaw:Math.PI,span:w,ox:0,oz:-d/2},
      {yaw:Math.PI/2,span:d,ox:w/2,oz:0},{yaw:-Math.PI/2,span:d,ox:-w/2,oz:0}];
    for(const [index,f] of faces.entries())b.frame(f.ox,0,f.oz,f.yaw,()=>{
      const gable=index<2,front=index===0;
      b.block(p.trim,0,height-.22,.02,f.span+.15,.2,.16);
      b.block(p.stone,0,base,.025,f.span,.24,.14);
      if(storeys===2)b.block(p.timber,0,base+(height-base)*.49,.025,f.span,.17,.16);
      if(working){
        // Wide loading doors, haylofts and louvres distinguish production and
        // storage buildings from houses without adding another lot.
        if(gable)door(b,{...p,trim:p.timber},Math.min(w*.44,barn?3.6:2.4),base,Math.min(barn?3.2:2.55,height-base-.65),{double:true});
        else for(const xx of [-f.span*.27,f.span*.27])vent(b,p,xx,height-1.45,1.4,.78);
        if(gable&&height>6)vent(b,p,0,height-1.38,1.8,.75);
        for(const xx of [-f.span*.36,f.span*.36]){
          b.block(p.timber,xx,base,.04,.12,height-base,.12);
          if(!gable)b.beam(p.timber,[xx-.7,base+.3,.09],[xx+.7,base+1.85,.09],.1);
        }
      }else{
        const windowY=base+(hall?1.22:1.04),upper=Math.min(height-1.57,base+(height-base)*.55);
        for(const xx of [-f.span*.3,f.span*.3]){
          window(b,p,xx,windowY,{wide:hall});
          if(storeys===2)window(b,p,xx,upper,{wide:hall});
        }
        if(gable)door(b,p,hall?2:1.3,base,hall?2.9:2.32,{double:hall});
        if(front&&seed%3===0){
          // A narrow planted sill stays within the building collider.
          const xx=-f.span*.3;
          b.block(p.wood,xx,windowY-.44,.13,1.2,.28,.2);
          for(const dx of [-.37,0,.37])b.rock(0x668453,xx+dx,windowY-.11,.15,.22,.2,.1);
        }
      }
      if(gable){
        // Roof-end fittings sit on the actual projecting gable, not buried in
        // the facade beneath it. A single face per fitting keeps them cheap.
        const gz=.608;
        face(b,p.timber,0,height-.045,gz,w+.96,.12);
        face(b,p.timber,0,height,gz,.12,rise-.14);
        b.quad(p.timber,[-w/2-.52,height,gz],[-w/2-.32,height,gz],[0,height+rise-.16,gz],[0,height+rise,gz]);
        b.quad(p.timber,[0,height+rise,gz],[0,height+rise-.16,gz],[w/2+.32,height,gz],[w/2+.52,height,gz]);
        face(b,p.dark,0,height+.32,gz+.005,working?.87:.65,.65);
        for(let n=0;n<4;n++)face(b,p.wood,0,height+.36+n*.14,gz+.012,working?.94:.72,.065);
        if(hall){
          // A civic seal, pale lintels and larger paired doors identify the hall.
          const sy=height-1.08;
          face(b,p.trim,0,sy-.07,.06,.91,.91);
          face(b,p.shutter,0,sy,.068,.76,.76);
          b.quad(p.gold,[0,sy+.68,.075],[-.27,sy+.38,.075],[0,sy+.08,.075],[.27,sy+.38,.075]);
        }
      }
    });
    // Two broad courses give roofs texture from the street; no individual tiles.
    for(const side of [-1,1])for(const t of [.34,.69]){
      const xx=side*(w/2+.55)*t,yy=height+rise*(1-t)+.012;
      b.sheet(working?0x827553:0x788276,[xx,yy,-d/2-.59],[xx,yy,d/2+.59],
        [xx+side*.06,yy-.035,d/2+.59],[xx+side*.06,yy-.035,-d/2-.59]);
    }
    b.box(roof,0,height+rise-.05,0,.22,.1,d+1.12);
    if(!working){
      const cy=height+rise-.95,cx=w*.28,cz=d*.22;
      b.block(p.stone,cx,height-.5,cz,.76,cy-height+1.17,.84);
      b.block(p.trim,cx,cy+.6,cz,.96,.18,1.02);
      face(b,p.dark,cx,cy+.62,cz+.516,.43,.1);
    }
  });
}

/** The same counter footprint and height as the old stall, with woven striped
 * canvas, visible supports and produce trays instead of an untrimmed sheet. */
export function agricultureMarketStall(b,heightAt,x,z,{region='caricas',index=0}={}){
  const p=palettes[region]??common,y=heightAt(x,z),cloth=index%2?0xac7352:p.shutter;
  b.frame(x,y,z,0,()=>{
    for(const sx of [-1,1])for(const sz of [-1,1])b.block(p.timber,sx*1.88,0,sz*.93,.14,sz<0?2.76:2.53,.14);
    b.block(p.wood,0,.7,0,3.8,.25,1.8);
    for(const zz of [-.78,.78])b.block(p.timber,0,.98,zz,3.75,.2,.08);
    for(let i=0;i<6;i++){
      const x0=-1.98+i*.66,x1=x0+.66,c=i%2?cloth:p.trim;
      b.sheet(c,[x0,2.76,-1.15],[x1,2.76,-1.15],[x1,2.54,1.15],[x0,2.54,1.15]);
      b.sheet(c,[x0,2.54,1.15],[x1,2.54,1.15],[x1,2.34,1.15],[x0,2.34,1.15]);
    }
    for(const sx of [-1,1])b.beam(p.timber,[sx*1.89,2.76,-1.14],[sx*1.89,2.54,1.14],.1);
    for(let tray=0;tray<3;tray++){
      const xx=(tray-1)*1.16;
      b.block(p.timber,xx,.97,0,1.02,.14,1.35);
      for(const side of [-1,1])b.block(p.wood,xx+side*.49,1.08,0,.055,.12,1.3);
      for(let item=0;item<4;item++)b.rock([0xad6640,0x8b9e54,0xd2b46b][(tray+index)%3],xx+(item%2-.5)*.39,1.24,(Math.floor(item/2)-.5)*.57,.21,.2,.24);
    }
  });
}
