// Scenario-local progress. Older war saves already began outdoors and must not
// be forced through an introduction or have their campaign reset.
export const TOWER = Object.freeze({x:-2414,y:21.3,z:42});
export const TOWER_SPAWN = Object.freeze({x:TOWER.x,y:TOWER.y,z:TOWER.z+7});
export const TOWER_EXIT = Object.freeze({x:TOWER.x,z:59});
export const TOWER_DOOR = Object.freeze({x:TOWER.x,z:TOWER.z+12});
export const TALETH_SPOT = Object.freeze({x:TOWER.x-1,z:TOWER.z-2});
export const LOOKOUT = Object.freeze({x:TOWER.x,y:TOWER.y+134,z:TOWER.z});
export const LOOKOUT_SPAWN = Object.freeze({...LOOKOUT,z:LOOKOUT.z+5});
export const LOOKOUT_DOOR = Object.freeze({...LOOKOUT,z:LOOKOUT.z+7});
export const LOOKOUT_TALETH = Object.freeze({...LOOKOUT,x:LOOKOUT.x+7,z:LOOKOUT.z+7});
export function validTowerState(state){
  return !!state&&state.version===1&&['tower','lookout','temple','mayor','world'].includes(state.location)
    &&typeof state.briefed==='boolean'&&typeof state.running==='boolean'
    &&(state.concluded===undefined||typeof state.concluded==='boolean')&&(!state.concluded||state.briefed)
    &&(state.briefed||state.location==='tower'&&!state.running);
}
export function createTowerState(saved){
  if(saved?.tower&&!validTowerState(saved.tower))throw Error('The tower checkpoint is incompatible.');
  let state=saved?.tower?{...saved.tower}:{version:1,location:saved?'world':'tower',briefed:!!saved,running:false};
  return {
    snapshot:running=>({...state,running:running??state.running}),
    get inside(){return state.location!=='world';},get room(){return state.location==='world'?null:state.location;},get briefed(){return state.briefed;},
    begin(){if(state.briefed)return false;state.briefed=true;state.running=true;return true;},
    enter(room='tower'){if(!['tower','lookout','temple','mayor'].includes(room)||!state.briefed&&room!=='tower')return false;state.location=room;return true;},
    conclude(){if(state.location!=='lookout'||state.concluded)return false;state.concluded=true;return true;},
    leave(){if(!state.briefed)return false;state.location='world';return true;},
  };
}
