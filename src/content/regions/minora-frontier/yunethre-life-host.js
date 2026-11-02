// Exploration loads only the local cast when Yunethre is actually visited.
// Keep the animal rigs out of the lookout and combat-practice startup path.
import {laketownShoreAccess} from './laketown-access.js';
export function createYunethreLifeHost(scene, world, {load = () => import('./yunethre-life.js')} = {}) {
  let life = null, pending = null, disposed = false, error = null, campActive = true;
  return {
    update(time, dt, point) {
      if (disposed || !point) return;
      if (!life && !pending && !error && (world.regionAt(point.x, point.z)?.id === 38 || laketownShoreAccess(point.x,point.z)) && world.loading.isReady(38)) {
        pending = load().then(module => {
          if (!disposed) {life = module.createYunethreLife(scene, world); life.setCampActive(campActive);}
        }).catch(reason => { error = String(reason); console.error('Yunethre wildlife:', reason); });
      }
      life?.update(time, dt, point);
    },
    state: () => ({loaded: !!life, pending: !!pending && !life && !error, error, ...(life?.state() ?? {})}),
    setCampActive(value) {campActive = !!value; life?.setCampActive(campActive);},
    residentTarget: point => life?.residentTarget(point) ?? null,
    residentPeople: () => life?.residentPeople() ?? [],
    setResidentTalking: (id, point) => life?.setResidentTalking(id, point),
    dispose() { disposed = true; life?.dispose(); life = null; },
  };
}
