import {RESIDENT_CONVERSATIONS} from '../../content/regions/minora-frontier/resident-conversations.js';
import {CORRIDOR_CONVERSATIONS} from '../../content/regions/minora-frontier/corridor-conversations.js';
import {LIZEEM_RESIDENTS} from '../../content/regions/minora-frontier/lizeem-residents.js';
import {residentPeaceWords,hasSettlement} from './league-settlement.js';
import {postwarPlans,postwarMemory} from './postwar-conversations.js';
import {residentNews} from './resident-news.js';
export const residentThreat=(def,state)=>state?.engagements?.some(b=>b.status==='active'&&b.region===def.region)??false;
export function residentWords(id,topic,state){
  const def=LIZEEM_RESIDENTS.find(d=>d.id===id),words=CORRIDOR_CONVERSATIONS[id]??RESIDENT_CONVERSATIONS[id];
  if(!def||!words)return null;
  if(topic==='news')return residentNews(def,state);
  if(topic==='memory')return postwarMemory(id,state,def.side);
  if(topic==='future')return words.future??postwarPlans(id,state);
  if(topic==='hello'||topic==='war'){
    if(residentThreat(def,state))return def.shelter?'There is fighting in the town. I am going inside; we can talk when it is safe.':'There is fighting near Caricas. I have stopped work for now. Keep clear of the marked battlefield unless you mean to join it.';
    const old=residentPeaceWords(id,state);if(old)return old;
    if(hasSettlement(state))return (def.side?(def.side===state.winner?'My side won, and I am relieved. ':'My side lost. I will not pretend that is easy. '):'I am glad the fighting is over. ')+
      'They are calling the united country the Lizeemi League. '+words.future;
  }
  return words[topic]??null;
}
