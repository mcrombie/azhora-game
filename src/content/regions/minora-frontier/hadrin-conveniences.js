// Small, deterministic workshop motions. Geometry is built once; the owning
// workshop supplies merged meshes, disposal, and visible-floor presentation time.
export function createHadrinConveniences({palette:p,staticParts:b,part,ring,solid}){
  const steel='#a5b5b8',iron='#46565d',brass=p.gold,wood=p.wood,cloth='#8cb6b7';
  // An ordinary suit on a repair stand: no actor AI and no combat equipment.
  b.frame(-8.2,0,-6.5,0,()=>{
    b.block(p.shade,0,0,0,2.5,.09,2.3);
    b.block(wood,0,.09,-.24,.14,2.7,.14);b.beam(wood,[-.7,2.15,-.24],[.7,2.15,-.24],.15);
    for(const side of [-1,1]){
      const x=side*.28;
      b.block(iron,x,.09,.18,.35,.18,.64);b.block(steel,x,.27,0,.27,.53,.31);
      b.rock(brass,x,.83,.16,.17,.17,.13);b.block(steel,x,.98,0,.30,.48,.36);
      b.rock(steel,side*.68,2.17,0,.29,.22,.30);
      b.block(iron,side*.71,1.64,0,.23,.43,.28);b.rock(brass,side*.72,1.57,.02,.14,.14,.14);
      b.block(steel,side*.73,1.16,.04,.24,.32,.30);b.block(iron,side*.73,1.02,.08,.22,.16,.26);
      for(let i=0;i<3;i++)b.block(steel,side*.26,1.25+i*.11,.06,.47,.10,.47);
    }
    b.rock(iron,0,1.89,0,.62,.49,.34);b.rock(steel,0,1.96,.20,.54,.43,.23);
    b.beam(brass,[0,1.57,.43],[0,2.25,.43],.045);
    b.cylinder(iron,0,2.35,0,.18,.20);b.rock(steel,0,2.73,0,.33,.37,.33);
    b.block(iron,0,2.72,.30,.42,.045,.04);b.block(brass,0,2.60,.32,.045,.27,.04);
    for(let i=-2;i<=2;i++)b.block(iron,i*.065,2.57,.305,.022,.07,.025);
    // One unfastened shoulder plate and an open tin make this a work in progress.
    b.rock(steel,-.85,.18,.73,.29,.09,.24);b.cylinder(brass,.82,.09,.72,.19,.12);
    b.cylinder('#ded4a6',.82,.212,.72,.15,.015);
  });
  solid(-8.2,0,-6.5,2.5,3.2,2.3);
  const polish=part('Armor: enchanted polishing cloth',[-8.2,1.93,-6.01],q=>{
    q.box(cloth,0,0,0,.36,.25,.07);q.box('#d0e2cf',0,.01,.04,.21,.16,.025);
    for(const x of [-.16,.16])q.box('#b2cbbe',x,-.04,0,.07,.19,.09);
  });

  // Two practical task lamps float at working height. Emissive materials
  // suggest light without adding point lights or shadow-map passes.
  const lamps=[[-8.4,3.8,2.5],[8.7,3.6,-3.3]].map((at,i)=>({at,lamp:part('Hovering workshop lamp '+(i+1),at,q=>{
    q.cylinder(iron,0,-.37,0,.32,.10);q.rock('#f3d99c',0,0,0,.21,.31,.21);
    ring(q,brass,0,-.27,0,.30,.035);ring(q,brass,0,.28,0,.30,.035);
    for(let j=0;j<4;j++){const a=j*Math.PI/2;q.beam(brass,[Math.cos(a)*.28,-.3,Math.sin(a)*.28],[Math.cos(a)*.28,.30,Math.sin(a)*.28],.035);}
    q.cone(iron,0,.30,0,.40,.19);ring(q,brass,0,.61,0,.12,.025,true);
  },undefined,{glow:true})}));

  // A low sorting bench fits between the central aisle and the golem pad.
  // Its generous solid footprint encloses the entire broom/tool motion.
  for(const x of [4.65,6.95])for(const z of [10.5,11.6])b.block(wood,x,0,z,.15,.86,.15);
  b.block(wood,5.8,.86,11.05,2.7,.15,1.4);b.block(brass,5.8,1.015,11.05,2.73,.025,1.43);
  b.block(p.cloth,5.8,1.043,10.76,2.50,.02,.74);
  for(const x of [5.15,6.5])b.block(brass,x,1.068,10.76,.035,.015,.73);
  b.block(wood,5.8,1.02,11.55,2.15,.22,.35);
  for(let i=0;i<5;i++){
    b.beam(brass,[5.02+i*.33,1.27,11.52],[5.22+i*.33,1.27,11.65],.045);
    b.rock(iron,5.02+i*.33,1.28,11.52,.10,.05,.08);
  }
  solid(5.8,0,10.7,2.7,3.2,2.1);
  const tools=part('Broom: tools being sorted',[5.8,1.08,10.76],q=>{
    q.beam(wood,[-.20,.05,-.25],[-.20,.05,.22],.06);q.box(steel,-.20,.09,-.20,.29,.14,.17);
    q.beam(iron,[.07,.04,-.22],[.27,.04,.23],.045);q.beam(iron,[.27,.04,-.22],[.07,.04,.23],.045);
    q.rock(brass,.17,.07,0,.06,.025,.06);
  });
  const broom=part('Broom: enthusiastic tool organizer',[5.2,1.08,10.76],q=>{
    q.beam(wood,[0,.45,0],[.20,2.02,0],.075);
    for(let j=-4;j<=4;j++)q.beam('#bca06d',[j*.065,.02,.025],[j*.028,.47,0],.047);
    q.box(brass,0,.43,0,.28,.08,.14);q.box(p.cloth,0,.52,0,.18,.08,.15);
  });

  // Useful mess: rejected staff fittings, a repaired kettle and a half-built
  // boot warmer. These join the existing static batch, not separate props.
  b.frame(9,.01,-4.9,0,()=>{
    b.block(wood,0,0,0,1.9,.46,.8);b.block(p.cloth,0,.47,0,1.8,.025,.72);
    for(const x of [-.5,.5]){b.cylinder(iron,x,.50,0,.25,.07);ring(b,brass,x,.58,0,.21,.03);}
    b.beam(brass,[-.6,.54,-.27],[.6,.54,-.27],.04);
  });solid(9,0,-4.9,1.9,.65,.8);
  b.cylinder(iron,-6.4,1.44,7.8,.24,.31);b.cone(brass,-6.4,1.75,7.8,.26,.10);
  ring(b,brass,-6.4,2.0,7.8,.22,.03,true);b.beam(iron,[-6.20,1.65,7.8],[-5.98,1.81,7.8],.09);
  b.frame(-8.9,0,10.9,.12,()=>{
    b.block(wood,0,0,0,2.8,.38,.8);
    for(let i=0;i<3;i++){
      b.beam(wood,[-1.1,.45+i*.09,-.16],[1.05,.45+i*.09,-.16],.07);
      b.rock(['#84b5a9','#b596bd','#dab26b'][i],1.10,.45+i*.09,-.16,.13,.10,.12);
    }
    b.block(p.trim,-.4,.40,.21,.6,.025,.28);b.block(iron,-.4,.43,.21,.35,.01,.018);
  });solid(-8.9,0,10.9,3,.85,1.1);

  let sortingTime=0,lastTime=null;
  return {
    update(time,{polishing=0,sorting=0}={}){
      const dt=lastTime===null?0:Math.max(0,Math.min(.1,time-lastTime));lastTime=time;sortingTime+=dt*(1+sorting*1.3);
      polish.position.x=-8.2+Math.sin(time*2.5)*(.24+polishing*.10);
      polish.position.y=1.93+Math.cos(time*2.5)*.22;polish.rotation.z=Math.sin(time*4)*.28;
      for(const [i,{at,lamp}] of lamps.entries()){lamp.position.y=at[1]+Math.sin(time*.8+i*2)*.13;lamp.rotation.z=Math.sin(time*.45+i)*.055;lamp.rotation.y=time*.12;}
      const phase=sortingTime*.65,slide=Math.sin(phase)*.65,side=Math.tanh(Math.cos(phase)*6);
      tools.position.x=5.8+slide;
      broom.position.x=tools.position.x-side*.58;broom.position.y=1.08+(1-Math.abs(side))*.54;
      broom.rotation.z=-side*.12;broom.rotation.y=Math.sin(phase)*.09;
    },
    state:()=>({polishingCloth:{x:polish.position.x,y:polish.position.y},hoveringLamps:lamps.map(({lamp})=>({y:lamp.position.y})),sorting:{broomX:broom.position.x,toolsX:tools.position.x}}),
  };
}
