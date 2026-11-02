// The visible timber deck and foot placement use the same triangles. Banks
// slope across each bridge as well as along it, so flat planks did not match
// the old analytic walking ramps near their ends.
export function createFarmlandDeck({x,z,width,length,yaw,heightAt}){
  const columns=Math.ceil(width/1.5),rows=Math.ceil(length/.6),points=[];
  const c=Math.cos(yaw),s=Math.sin(yaw);
  for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
    const u=(i/columns-.5)*width,v=(j/rows-.5)*length,px=x+c*u+s*v,pz=z-s*u+c*v;
    points.push([px,heightAt(px,pz),pz]);
  }
  return {points,columns,rows,heightAt(px,pz){
    const u=(px-x)*c-(pz-z)*s,v=(px-x)*s+(pz-z)*c;
    if(Math.abs(u)>width/2+1e-7||Math.abs(v)>length/2+1e-7)return null;
    const gx=Math.max(0,Math.min(columns,(u/width+.5)*columns)),gz=Math.max(0,Math.min(rows,(v/length+.5)*rows));
    const i=Math.min(columns-1,Math.floor(gx)),j=Math.min(rows-1,Math.floor(gz)),a=gx-i,b=gz-j,k=j*(columns+1)+i;
    const h0=points[k][1],h1=points[k+1][1],h2=points[k+columns+1][1],h3=points[k+columns+2][1];
    return a+b<=1?h0+(h1-h0)*a+(h2-h0)*b:h3+(h2-h3)*(1-a)+(h1-h3)*(1-b);
  }};
}

export function buildFarmlandDecks(builder,decks){
  const lower=p=>[p[0],p[1]-.16,p[2]];
  for(const {points:p,columns,rows} of decks)for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
    const k=j*(columns+1)+i,a=p[k],b=p[k+1],c=p[k+columns+1],d=p[k+columns+2];
    builder.quad(j%2?0x9c865c:0x958057,b,a,c,d);
    for(const [from,to,edge] of [[a,b,j===0],[b,d,i===columns-1],[d,c,j===rows-1],[c,a,i===0]]){
      if(edge)builder.sheet(0x796648,from,to,lower(to),lower(from));
    }
  }
}
