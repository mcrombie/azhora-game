// Match authored hexes to the same visited polygons used by the ordinary map.
export const cellKey=cell=>[0,1].map(axis=>(cell.reduce((sum,p)=>sum+p[axis],0)/cell.length).toFixed(1)).join(',');
export function discoveredCells(cells,knownKeys,reveal=false){return reveal?cells:cells.filter(cell=>knownKeys.has(cellKey(cell)));}
