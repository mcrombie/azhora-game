// Destinations are in the actual regional world's coordinates. The window plane
// sits at each viewpoint; the visitor's eye moves relative to it, at 1:1 scale.
export const SNERO_WINDOW_SIZE=Object.freeze({width:3.45,height:4.8,sill:1.05});
export const SNERO_WINDOWS=Object.freeze([
  {id:'cold-stones',place:'Cold Stones',wall:'north',x:-8,z:-12,yaw:0,region:108,
    box:[700,-7100,1550,2400],eye:[1570,210,-5830],target:[1600,50,-6210]},
  {id:'azhor-stones',place:'Azhor Stones',wall:'south',x:-8,z:12,yaw:Math.PI,region:110,
    box:[-350,2250,1150,1400],eye:[80,160,3010],target:[350,20,2810]},
  {id:'drent',place:'Drent',wall:'east',x:13,z:-7.5,yaw:-Math.PI/2,region:1,
    box:[-700,-300,1000,1000],eye:[-180,80,100],target:[-20,10,20]},
  {id:'west-oremindi',place:'West Oremindi Mountains',wall:'west',x:-13,z:2.4,yaw:Math.PI/2,region:56,
    box:[-3850,-1650,800,1000],eye:[-3860,480,-700],target:[-3480,230,-1200]},
].map(v=>Object.freeze({...v,url:new URL(`../../../../assets/tower-windows/${v.id}/landscape.json`,import.meta.url).href})));
