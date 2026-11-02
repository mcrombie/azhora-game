import {prepare,view as capture} from './caricas-polish-smoke.js';
export {prepare};
const views={
  minora:[{x:-2316,z:107},{yaw:0,pitch:.28,distance:16}],
  caricas:[{x:-2092,z:287},{yaw:0,pitch:.3,distance:12}],
  nethereum:[{x:-2289,z:340},{yaw:0,pitch:.28,distance:14}],
  nethereumWide:[{x:-2290,z:335},{yaw:.5,pitch:.52,distance:75}],
  nesdor:[{x:-1596,z:585},{yaw:.5,pitch:.27,distance:18}],
  nesdorInn:[{x:-1420,z:600},{yaw:0,pitch:.28,distance:19}],
  nesdorWide:[{x:-1595,z:585},{yaw:-.6,pitch:.56,distance:75}],
  ovesos:[{x:-1895,z:701},{yaw:-1.2,pitch:.28,distance:20}],
  ovesosWide:[{x:-1895,z:699},{yaw:.7,pitch:.52,distance:80}],
  isareos:[{x:-2627,z:24},{yaw:.4,pitch:.28,distance:17}],
};
export const view=(a,name)=>capture(a,...views[name]);
