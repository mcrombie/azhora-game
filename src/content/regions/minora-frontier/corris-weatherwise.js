import * as THREE from 'three';

// Common raven, in world metres: about .62 m bill-to-tail and 1.17 m across
// fully extended wings. Cornell: allaboutbirds.org/guide/Common_Raven/id.
// His speech is magical; his anatomy and size are those of a living bird.
export function createCorrisWeatherwise(parent){
  const root=new THREE.Group();root.name='Corris Weatherwise / talking raven';parent.add(root);
  const body=new THREE.Group();root.add(body);
  const shapes={round:new THREE.IcosahedronGeometry(1,1),box:new THREE.BoxGeometry(1,1,1),beak:new THREE.ConeGeometry(1,1,5)};
  const materials=new Map();
  function part(shape,color,x,y,z,sx,sy,sz,holder=body){
    if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.66,flatShading:true}));
    const m=new THREE.Mesh(shapes[shape],materials.get(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);holder.add(m);return m;
  }
  part('round','#171e24',0,.20,-.015,.086,.115,.17);
  part('round','#242e37',0,.26,-.045,.077,.07,.14);
  part('round','#202830',0,.29,.085,.065,.088,.072);
  // Long central tail feathers give a raven its wedge, distinct from a crow.
  for(let i=-2;i<=2;i++){
    const feather=part('round',i%2?'#171c23':'#222b34',i*.022,.14,-.205+Math.abs(i)*.02,.022,.012,.13-Math.abs(i)*.012);
    feather.rotation.y=-i*.10;feather.rotation.x=-.12;
  }
  const head=new THREE.Group();head.position.set(0,.345,.125);body.add(head);
  part('round','#222b32',0,0,0,.057,.061,.069,head);
  const bill=part('beak','#202328',0,-.016,.096,.029,.118,.029,head);bill.rotation.x=Math.PI/2;
  const jaw=new THREE.Group();jaw.position.set(0,-.037,.045);head.add(jaw);
  const lower=part('beak','#161b20',0,0,.045,.019,.096,.012,jaw);lower.rotation.x=Math.PI/2;
  for(const side of [-1,1]){
    part('round','#05080a',side*.051,.012,.032,.01,.011,.011,head);
    part('round','#b9c5c7',side*.058,.016,.036,.0025,.0025,.0025,head);
    const shin=part('box','#303236',side*.033,.067,.005,.012,.1,.014);shin.rotation.x=-.25;
    for(const spread of [-1,0,1]){
      const toe=part('box','#24282c',side*.033+spread*.012,.012,.04,.008,.009,.063);toe.rotation.y=spread*.32;
    }
    part('box','#24282c',side*.033,.014,-.021,.008,.009,.043);
    for(let i=0;i<3;i++)part('round','#283137',side*(.017+i*.013),.278-i*.009,.13-i*.009,.013,.036,.017);
  }
  const wings=[-1,1].map(side=>{
    const pivot=new THREE.Group();pivot.name=side<0?'Raven left wing':'Raven right wing';pivot.position.set(side*.069,.255,-.025);body.add(pivot);
    part('round','#202a34',side*.17,0,0,.18,.023,.103,pivot);
    part('round','#141d27',side*.34,-.006,-.03,.12,.014,.085,pivot);
    for(let i=0;i<5;i++){
      const feather=part('round',i%2?'#202832':'#111b23',side*(.42-i*.023),-.009,-.038-i*.025,.093-i*.006,.008,.025,pivot);
      feather.rotation.y=side*(.1+i*.09);
    }
    return pivot;
  });
  function animate(time,{flying=false,talking=false}={}){
    body.position.y=Math.sin(time*2)*.0015;body.rotation.x=flying?.16:0;
    head.rotation.y=Math.sin(time*(talking?1.8:.8))*(talking?.1:.28);
    head.rotation.x=talking?Math.sin(time*4)*.04:.03*Math.sin(time*1.3);
    jaw.rotation.x=talking?Math.max(0,Math.sin(time*11))*.32:0;
    wings.forEach((w,i)=>{
      const side=i?1:-1;
      w.rotation.set(flying?0:-Math.PI/2,flying?0:side*1.5,flying?side*Math.sin(time*9)*.68:0,'YXZ');
      w.scale.set(flying?1:.53,1,1);
    });
  }
  animate(0);
  return {root,animate,
    dispose(){root.removeFromParent();Object.values(shapes).forEach(g=>g.dispose());materials.forEach(m=>m.dispose());},
  };
}
