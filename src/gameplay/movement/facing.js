// Euler Y alone is not a heading after a rider is pitched/rolled: Three may
// represent the same facing with Y reflected and X/Z turned through pi.
export function horizontalHeading({x,y,z,w}){
  return Math.atan2(2*(x*z+w*y),1-2*(x*x+y*y));
}
