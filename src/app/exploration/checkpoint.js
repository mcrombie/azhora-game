// A deliberately small format, independent of the legacy adventure checkpoint.
export const EXPLORATION_KEY = 'azhora-exploration-v1';
export const START = Object.freeze({x:-2414,z:63});
export function validateExploration(data) {
  const finite = n => Number.isFinite(n);
  return !!data && data.version === 1 && ['rollo','teresod'].includes(data.character)
    && data.position && ['x','y','z'].every(k=>finite(data.position[k])&&Math.abs(data.position[k])<100000)
    && data.camera && finite(data.camera.yaw) && Math.abs(data.camera.yaw)<1e9
    && finite(data.camera.pitch) && data.camera.pitch>=.05 && data.camera.pitch<=1.15
    && finite(data.camera.distance) && data.camera.distance>=3 && data.camera.distance<=22
    && finite(data.heading) && finite(data.elapsed) && data.elapsed>=0
    && Array.isArray(data.cells) && data.cells.length<=100000
    && data.cells.every(key=>typeof key==='string'&&/^-?\d{1,5},-?\d{1,5}$/.test(key));
}
export function explorationStore(storage) {
  return {
    read(){
      try {
        const raw=storage.getItem(EXPLORATION_KEY);
        if(!raw)return {ok:true,data:null};
        const data=JSON.parse(raw);
        return validateExploration(data)?{ok:true,data}:{ok:false,reason:'The exploration save is not compatible. It has been left untouched.'};
      } catch {return {ok:false,reason:'The exploration save could not be read. It has been left untouched.'};}
    },
    save(data){
      if(!validateExploration(data))return {ok:false,reason:'This position could not be saved.'};
      try {storage.setItem(EXPLORATION_KEY,JSON.stringify(data));return {ok:true};}
      catch {return {ok:false,reason:'Saving failed. Your previous save has been kept.'};}
    },
  };
}
