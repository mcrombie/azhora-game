import {worldWarStore} from './war-checkpoint.js';

// No reference to browser or desktop storage: even automatic finale/death
// saves and manual F5 after taking control remain in this temporary session.
export function createRehearsalStore(){
  const values=new Map();return {...worldWarStore({getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}),rehearsal:true};
}
export function rehearsalSide(search){const side=new URLSearchParams(search).get('autoplay');return ['west','east'].includes(side)?side:null;}
