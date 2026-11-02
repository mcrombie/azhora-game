/** Shared physical fishing places. The skiff actor owns motion; the waterfront
 * owns the landing. Neither produces campaign food or changes the lake. */
import {YUNETHRE_TOWN as T,YUNETHRE_LAKE} from './yunethre-world.js';

const freeze=Object.freeze;
const point=(dx,dz)=>freeze({x:T.x+dx,z:T.z+dz});
const berth=freeze({...point(-80,14),yaw:-Math.PI/2});
export const LAKETOWN_FISHING=freeze({
 id:'laketown-tarn-fishing',surface:YUNETHRE_LAKE.surface,deckY:YUNETHRE_LAKE.surface+.8,
 berth,
 route:freeze([berth,point(-94,14),point(-109,4)]),
 // The fisherman stays aboard and passes baskets toward this edge of the pier.
 unload:point(-80,10.9),
 hut:freeze({...point(-66.5,25.5),w:7.4,d:7,yaw:Math.PI}),
 apron:freeze({...point(-67.5,25),w:12,d:13}),
 gangway:freeze({a:point(-72,9),b:point(-72,21),width:3.4}),
});
