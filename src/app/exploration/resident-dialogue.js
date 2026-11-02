import {RESIDENT_CONVERSATIONS} from '../../content/regions/minora-frontier/resident-conversations.js';
import {CORRIDOR_CONVERSATIONS} from '../../content/regions/minora-frontier/corridor-conversations.js';
import {LIZEEM_RESIDENTS} from '../../content/regions/minora-frontier/lizeem-residents.js';
import {residentPeaceWords,hasSettlement} from './league-settlement.js';
import {postwarPlans,postwarMemory} from './postwar-conversations.js';
import {residentNews} from './resident-news.js';
import {MINORA_CIVIC_CONVERSATIONS,minoraCivicWords} from '../../content/regions/minora-frontier/minora-civic-residents.js';
import {laketownResidentWords} from '../../content/regions/minora-frontier/laketown-residents.js';
import {canerdResidentWords,canerdResidentTopics} from '../../content/regions/canerd/canerd-dialogue.js';
import {centaurCampWords,centaurCampTopics} from '../../content/regions/minora-frontier/centaur-culture.js';
export {canerdResidentTopics};
export const residentTopics=id=>canerdResidentTopics(id)??centaurCampTopics(id);
export const residentThreat=(def,state)=>state?.engagements?.some(b=>b.status==='active'&&b.region===def.region)??false;
export function residentWords(id,topic,state,civicContext=null,natureContext={}){
  const canerd=canerdResidentWords(id,topic,natureContext);if(canerd)return canerd;
  const camp=centaurCampWords(id,topic,natureContext.chapter);if(camp)return camp;
  const local=laketownResidentWords(id,topic);if(local)return local;
  const def=LIZEEM_RESIDENTS.find(d=>d.id===id),words=MINORA_CIVIC_CONVERSATIONS[id]??CORRIDOR_CONVERSATIONS[id]??RESIDENT_CONVERSATIONS[id];
  if(!def||!words)return null;
  const civic=minoraCivicWords(id,topic,civicContext);if(civic)return civic;
  if(topic==='news')return residentNews(def,state);
  if(topic==='memory')return postwarMemory(id,state,def.side);
  if(topic==='future')return words.future??postwarPlans(id,state);
  if(topic==='hello'||topic==='war'){
    if(residentThreat(def,state))return def.guard?'Keep the approaches clear. The watch is protecting Minora’s civilians and public stores.':def.shelter?'There is fighting in the town. I am going inside; we can talk when it is safe.':'There is fighting nearby. I have stopped work for now. Keep clear of the marked battlefield unless you mean to join it.';
    const old=residentPeaceWords(id,state);if(old)return old;
    if(hasSettlement(state))return (def.side?(def.side===state.winner?'My side won, and I am relieved. ':'My side lost. I will not pretend that is easy. '):'I am glad the fighting is over. ')+
      'They are calling the united country the Lizeemi League. '+words.future;
  }
  return words[topic]??null;
}
