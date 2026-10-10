import {NYLON_COLOSSUS as C} from './nylon-city.js';

const BRONZE='#897044',PATINA='#50796b',LIGHT='#aa905a',DARK='#344e46',GOLD='#c5aa64';
const TAU=Math.PI*2;

/** One static, faceted bronze sculpture, facing seaward. Local Y=0 is the
 * actual top of both sea-tower plinths, not the tops of their former roofs. */
export function buildNylonColossus(b,push){
  // Elliptical rings give the limbs a sculpted silhouette instead of box beams.
  // Matching height-bounded solids leave the entire shipping passage open below.
  function loft(id,rings,tints=[BRONZE,PATINA,BRONZE,LIGHT],sides=10){
    const at=(r,i)=>[r[0]+Math.sin(i*TAU/sides)*r[3],r[1],r[2]+Math.cos(i*TAU/sides)*r[4]];
    for(let j=1;j<rings.length;j++){
      const a=rings[j-1],c=rings[j];
      for(let i=0;i<sides;i++)b.quad(tints[i%tints.length],at(a,i),at(a,i+1),at(c,i+1),at(c,i));
      const minX=Math.min(a[0]-a[3],c[0]-c[3]),maxX=Math.max(a[0]+a[3],c[0]+c[3]);
      const minZ=Math.min(a[2]-a[4],c[2]-c[4]),maxZ=Math.max(a[2]+a[4],c[2]+c[4]);
      push({id:`${C.id}-${id}-${j}`,kind:'monument',x:C.x+(minX+maxX)/2,z:C.z+(minZ+maxZ)/2,
        hx:(maxX-minX)/2,hz:(maxZ-minZ)/2,minY:C.baseY+Math.min(a[1],c[1]),maxY:C.baseY+Math.max(a[1],c[1])});
    }
    const first=rings[0],last=rings.at(-1);
    for(let i=0;i<sides;i++){
      b.triangle(BRONZE,first.slice(0,3),at(first,i+1),at(first,i));
      b.triangle(BRONZE,last.slice(0,3),at(last,i),at(last,i+1));
    }
  }
  b.frame(C.x,C.baseY,C.z,0,()=>{
    for(const [i,foot] of C.feet.entries()){
      const x=foot.x-C.x,z=foot.z-C.z,side=i===0?-1:1;
      loft(`foot-${i}`,[[x,0,z+1.2,3.3,4.8],[x,1,z+1.2,3.4,4.8],[x,2.6,z+.6,2.6,3.7],[x,4,z,2.1,2.2]]);
      loft(`leg-${i}`,[[x,2.3,z,2.1,2.1],[side*15,10,0,2.8,2.7],[side*11,19,.3,2.6,2.7],
        [side*8,26,0,3.7,3.5],[side*4.5,35,0,4.2,3.8]]);
      // Cast sandal straps, patinated kneecaps and bronze shin ridges.
      for(const y of [3.5,5])b.cylinder(GOLD,x,y,z,2.18,.38);
      b.beam(LIGHT,[side*15,10,2.5],[side*11,19,2.9],.32);
      b.rock(PATINA,side*11,19,2.65,2,1.8,.8);
      for(const dx of [-1.9,-.9,.1,1.1,2.1])b.box(DARK,x+dx,1.25,z+5.82,.12,.5,.05);
    }
    loft('body',[[0,31,0,7.3,4],[0,37,0,6.4,3.7],[0,41,0,5.8,3.5],
      [0,47,0,8.1,4.3],[0,50,0,8.5,3.9],[0,52,0,5.8,3],[0,53,0,2.3,2.3]]);
    // A short draped mantle and fluted tunic, kept above the open-legged span.
    for(let i=0;i<12;i++){
      const a=i*TAU/12,c=(i+1)*TAU/12;
      b.sheet(i%2?PATINA:BRONZE,[Math.sin(a)*6.4,37,Math.cos(a)*3.8],
        [Math.sin(c)*6.4,37,Math.cos(c)*3.8],[Math.sin(c)*8,30,Math.cos(c)*4.6],
        [Math.sin(a)*8,30+(i%2)*.8,Math.cos(a)*4.6]);
      b.beam(LIGHT,[Math.sin(a)*6.6,36.8,Math.cos(a)*3.9],[Math.sin(c)*6.6,36.8,Math.cos(c)*3.9],.4);
    }
    b.sheet(PATINA,[-8,50,-1.8],[7.5,50,-2.2],[6,34,-5.2],[-8.8,37,-5]);
    for(const x of [-6,-3,0,3,6])b.beam('#668b78',[x,49,-3],[x-1,36,-5.05],.3);
    // Shoulder clasp and a diagonally draped edge, rather than armor plates.
    b.rock(GOLD,-6.5,49.5,3.3,1.1,1.1,.5);
    b.beam(LIGHT,[-6.5,49.4,3.6],[4.8,39,3.5],.65,.28);
    for(const side of [-1,1])b.rock(BRONZE,side*4.2,47,3.4,3.8,2.5,1.4);
    loft('neck',[[0,51.7,0,2.2,2.2],[0,57.3,0,2.3,2.2]]);
    loft('head',[[0,56.6,.4,2,2],[0,58.5,.3,3.1,2.7],[0,62,.1,3.8,3.1],
      [0,65,0,3.6,3],[0,67,0,2.5,2.2],[0,67.8,0,.8,.8]],[BRONZE,LIGHT,BRONZE,PATINA],12);
    for(const side of [-1,1]){
      b.rock(BRONZE,side*3.65,61.2,0,.7,1.3,1);
      b.box(DARK,side*1.4,62.2,2.99,1.5,.4,.22);
      b.beam(LIGHT,[side*.55,62.9,3.05],[side*2.3,62.8,2.9],.35,.4);
    }
    b.triangle(LIGHT,[-.5,62.5,3],[0,60.7,4.3],[.5,62.5,3]);
    b.triangle(BRONZE,[-.5,62.5,3],[-.55,60.6,3],[0,60.7,4.3]);
    b.triangle(PATINA,[.5,62.5,3],[0,60.7,4.3],[.55,60.6,3]);
    b.box(DARK,0,59.6,2.97,1.75,.2,.16);
    b.beam(LIGHT,[-1,59.3,2.98],[1,59.3,2.98],.16);
    // Radiant diadem. These are tapered cast spikes, not a second roof.
    b.cylinder(GOLD,0,64.5,0,3.75,.55);
    for(let i=0;i<7;i++){
      const a=i*Math.PI/6,dx=Math.cos(a),dy=Math.sin(a),u=[dx*3.5,65+dy*2.2,0],v=[dx*7,65+dy*7,0];
      b.triangle(GOLD,[u[0]-.38*dy,u[1]+.38*dx,.5],v,[u[0]+.38*dy,u[1]-.38*dx,.5]);
      b.triangle(BRONZE,[u[0]+.38*dy,u[1]-.38*dx,-.5],v,[u[0]-.38*dy,u[1]+.38*dx,-.5]);
      b.sheet(LIGHT,[u[0]-.38*dy,u[1]+.38*dx,.5],[u[0]-.38*dy,u[1]+.38*dx,-.5],v,v);
    }
    // Raised beacon arm; the other hand carries a rolled civic charter.
    loft('beacon-arm',[[8,47,0,3.1,3],[13,54,0,2.7,2.6],[15.5,58,.2,2.2,2.2],[17,66,0,1.8,1.8],[17,68,0,2.1,2]]);
    loft('charter-arm',[[-10,35,2.5,1.9,2],[-14,40,1,2.4,2.4],[-11,47,0,3,2.8],[-8,50,0,3.2,3]]);
    b.cylinder(LIGHT,-10,30,3.4,1.45,13);b.cylinder(GOLD,-10,29.8,3.4,1.75,.5);b.cylinder(GOLD,-10,42.8,3.4,1.75,.5);
    b.box(PATINA,-10,36,4.83,1.7,8,.14);
    for(const y of [34,35,36,37,38])b.box(GOLD,-10,y,4.94,1.1,.15,.07);
    b.cylinder(BRONZE,17,65,0,.8,8);b.cylinder(GOLD,17,71,0,2.6,1.1);
    b.cone(GOLD,17,72,0,3.5,2.2);
    b.rock('#daac4e',17,76,0,2.2,3.4,2.2);b.cone('#f0cd78',17,76,0,1.8,5);
    b.rock('#f5de9c',17,76.5,.6,1.1,2.5,1.1);
  });
}
