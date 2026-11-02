import {COMBAT_LESSONS} from '../../../gameplay/combat/combat-tutorial.js';
import {COMBAT_TRIALS,configuredTrial} from '../../../gameplay/combat/combat-trials.js';

export const ARRIVAL_KEY='azhora-stillroom-arrival-v1';
export const REQUIRED_TRIALS=Object.freeze(['bramble-goblin','wolf','bandit','militiaman']);
export const ARRIVAL_TRIALS=Object.freeze([...REQUIRED_TRIALS.map(id=>COMBAT_TRIALS.find(t=>t.id===id)),...COMBAT_TRIALS.filter(t=>!REQUIRED_TRIALS.includes(t.id))]);
export const configuredArrivalTrial=(round,weapon)=>configuredTrial(COMBAT_TRIALS.findIndex(t=>t.id===ARRIVAL_TRIALS[round].id),weapon);
export const nextArrivalRound=s=>{const index=ARRIVAL_TRIALS.findIndex(t=>!s.wins.includes(t.id));return index<0?ARRIVAL_TRIALS.length:index;};
const LEGACY_TRIALS=['bramble-goblin','wolf','bandit','militiaman','orc-raider','ambron-soldier','orc-warrior','veteran-ambron-soldier','veteran-orc-warrior','ogre-bruiser','elven-duelist','dwarven-shieldwarden','rogue-battlemage','regenerating-troll','undead-knight'];
function validLegacyArrival(s){
  return !!s&&[1,2].includes(s.version)&&typeof s.introduced==='boolean'&&typeof s.skipped==='boolean'
    &&typeof s.approved==='boolean'&&typeof s.departed==='boolean'&&Array.isArray(s.wins)
    &&s.wins.length<=COMBAT_TRIALS.length&&new Set(s.wins).size===s.wins.length&&s.wins.every((id,i)=>s.version===1?id===LEGACY_TRIALS[i]:ARRIVAL_TRIALS.some(t=>t.id===id))
    &&s.wins.slice(0,4).every((id,i)=>id===REQUIRED_TRIALS[i])
    &&(!s.wins.length||s.introduced)&&(!s.skipped||s.introduced&&s.approved)
    &&(!s.approved||s.introduced&&(s.skipped||REQUIRED_TRIALS.every(id=>s.wins.includes(id))))&&(!s.departed||s.approved);
}
const lessonIds=COMBAT_LESSONS.map(l=>l.id);
export function validArrival(s){
  if(s?.version!==3)return validLegacyArrival(s);
  const bools=['introduced','skipped','approved','departed','legacyApproval'];
  const ids=(list,allowed)=>Array.isArray(list)&&new Set(list).size===list.length&&list.every(id=>allowed.includes(id));
  return bools.every(k=>typeof s[k]==='boolean')&&ids(s.wins,COMBAT_TRIALS.map(t=>t.id))
    &&ids(s.lessons,lessonIds)&&s.lessons.every((id,i)=>id===lessonIds[i])
    &&Number.isInteger(s.uguthWins)&&s.uguthWins>=0&&s.uguthWins<=1000000
    &&(!(s.wins.length||s.lessons.length||s.uguthWins)||s.introduced)
    &&(!s.approved||s.introduced&&(s.skipped||s.legacyApproval||s.lessons.length===lessonIds.length))
    &&(!(s.skipped||s.legacyApproval||s.departed)||s.approved);
}
export const nextTutorialLesson=s=>s.lessons?.length??0;
// Legacy approvals keep the door open. New challenge victories never grant
// tutorial credit; incomplete legacy runs begin the instructional curriculum.
export function createArrivalProgress(saved=null){
  if(saved&&!validArrival(saved))throw Error('The Stillroom checkpoint is incompatible.');
  const s=saved?{...saved,version:3,wins:[...saved.wins],lessons:[...(saved.lessons??[])],uguthWins:saved.uguthWins??0,legacyApproval:saved.version<3? saved.approved: saved.legacyApproval}
    :{version:3,introduced:false,wins:[],lessons:[],uguthWins:0,legacyApproval:false,skipped:false,approved:false,departed:false};
  return {
    snapshot:()=>({...s,wins:[...s.wins],lessons:[...s.lessons]}),
    introduce(){s.introduced=true;},
    record(round,outcome){const trial=ARRIVAL_TRIALS[round];if(!s.introduced||outcome!=='success'||!trial||s.wins.includes(trial.id))return false;s.wins.push(trial.id);return true;},
    recordChallenge(id,outcome){if(!s.introduced||outcome!=='success'||!COMBAT_TRIALS.some(t=>t.id===id)||s.wins.includes(id))return false;s.wins.push(id);return true;},
    recordLesson(id,outcome,demonstrated){if(!s.introduced||outcome!=='success'||!demonstrated||id!==lessonIds[s.lessons.length])return false;s.lessons.push(id);if(s.lessons.length===lessonIds.length)s.approved=true;return true;},
    recordUguth(outcome){if(!s.introduced||outcome!=='success')return false;s.uguthWins=Math.min(1000000,s.uguthWins+1);return true;},
    approve(){if(!s.introduced||s.lessons.length!==lessonIds.length)return false;s.approved=true;return true;},
    skip(){if(!s.introduced)return false;s.skipped=true;s.approved=true;return true;},
    depart(){if(!s.approved)return false;s.departed=true;return true;},
  };
}
export const PRACTICE_KEY='azhora-stillroom-practice-v1';
export function returnPracticeProgress(saved){
  if(validArrival(saved)&&saved.approved)return saved;
  const progress=createArrivalProgress();progress.introduce();progress.skip();progress.depart();return progress.snapshot();
}
export function arrivalStore(storage,key=ARRIVAL_KEY){
  return {
    read(){try{const data=JSON.parse(storage.getItem(key));return validArrival(data)?data:null;}catch{return null;}},
    save(data){try{if(!validArrival(data))return false;storage.setItem(key,JSON.stringify(data));return true;}catch{return false;}},
    clear(){storage.setItem(key,'null');},
  };
}
