// Scenario context supplied by the author. These are observations, not new
// simulated wars, diplomatic actions or playable-region unlocks.
export const LOOKOUT_TOUR = Object.freeze([
  {view:'southern-countries',title:'Telemonia, Ascarth and Eer',
    words:'Look south, from the terraces of Telemonia toward Ascarth and the river mouth in Eer. Telemonia keeps apart and remains neutral, while the Telemon rule the people of Legemum as slave masters. Farther along the coast, Ascarth and Eer were at war: the Ascarth army was besieging Nylon, the fortified city on the Eer bank. Our peace has not ended those neighboring troubles.',
    target:{x:-1700,y:38,z:1350},fov:62,bias:-.12},
  {view:'pyros',title:'The divided country of Pyros',
    words:'Turn southwest, toward Pyra and the country of Pyros. They are fighting a civil war of their own. We have quieted one stretch of the river, Teresod; we have not quieted the continent. Remember that when you consider where the League should spend its strength.',
    target:{x:-2940,y:40,z:1098},fov:48,bias:-.16},
  {view:'ibenwood',title:'Ibenwood and the paths to Elfland',
    words:'That great forest is Ibenwood. Elfland can be reached from within it, though you will not discover the passage merely by looking down from this tower. The elves are very wary of strangers. A road into their country is no assurance of a welcome.',
    target:{x:-3550,y:48,z:280},fov:62,bias:-.16},
  {view:'yunethre',title:'Yunethre and Laketown',
    words:'Northwest lies Yunethre, with Laketown beside the water. Its people may be interested in joining the Lizeemi League. Their friendship could strengthen the new League. It is a possibility to consider, not an agreement already made.',
    target:{x:-3020,y:27,z:-320},fov:50,bias:-.16},
  {view:'west-lotharn',title:'The West Lotharn Mountains',
    words:'Now look north, to the West Lotharn Mountains. Ambron supposedly claims that wild country, yet it appears to have left it without a garrison. There are rumors of outlaws and other troubles among the heights. A claim on a map is not the same as keeping watch over the land.',
    target:{x:-1980,y:265,z:-650},fov:58,bias:-.16,
    closing:'The Lizeemi War campaign is complete. These neighboring troubles remain for another chapter. Remember the lives spared, as well as the battles won.'},
].map(page=>Object.freeze({...page,target:Object.freeze(page.target)})));
