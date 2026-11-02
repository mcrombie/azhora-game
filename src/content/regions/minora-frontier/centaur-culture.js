/** The Reed Kin are one community, not a description of every centaur.
 * These local conversations do not award quests, invent player deeds, or
 * alter campaign diplomacy. Bane's Chapter 2 host owns political decisions. */
export const CENTAUR_CULTURE=Object.freeze({
  name:'The Reed Kin',
  home:'Yunethre',
  principles:Object.freeze([
    'A promise is spoken before witnesses, with its cost and limits named.',
    'The common cooking fire feeds guests before their business is heard.',
    'Kinship includes adoption, marriage, friendship and shared obligations.',
    'A hunt leaves breeding animals and enough forage for the next season.',
  ]),
  tensions:Object.freeze([
    'Old families sometimes expect privileges they call obligations.',
    'War leaders can make retaliation sound like keeping faith with the dead.',
    'The people who mend carts and feed the camp do not always get an equal hearing.',
  ]),
});

/** Bane's optional conversations add character, never a diplomatic command.
 * Chapter 2's host keeps its existing compact, journey and battle choices. */
export const BANE=Object.freeze({
  name:'Bane',title:'Speaker for the Reed Kin',
  introduction:'I am Bane, chosen to speak for the Reed Kin. These are households under my care, not merely archers to be counted.',
  topics:Object.freeze([
    Object.freeze({id:'bane-road',label:'What brought you to this camp?',text:
      'I carried salt and wool beside my mother\'s cart before anyone asked me to carry their grievances. I knew which crossings held after rain, and which innkeepers kept an honest measure. Once, when a ford rose, I brought three stranded households around the long ridge road. They remembered that when they needed a speaker.\n\nWe settled here because Laketown would trade with us and there was room for the households. Some mean to travel again. I have begun to enjoy knowing which hearth I will see at dusk. Do not tell Kesh I said that; she thinks I have forgotten how to take a new road.'}),
    Object.freeze({id:'bane-hearth',label:'What does speaking for the Reed Kin mean?',text:
      'It means a promise I make becomes work for somebody. Saera requires witnesses and asks whose food, whose labour and whose safety I have offered. She will correct me in front of a stranger. I dislike that. I also asked her to keep doing it.\n\nArven can tell you what our stores will bear. Delan knows which shelters will survive rain. Ilyra wants the work yards heard before we choose another fight. I have promised her a place at the next council, then postponed it twice because the knights seemed more urgent. She is right to keep asking. A speaker who only hears fighters soon mistakes an army for a people.'}),
    Object.freeze({id:'bane-pride',label:'Have your own choices made this conflict worse?',text:
      'Yes. After our travellers were driven from a watering place, I sent a party to seize a Celder grain wagon. I called it repayment. Its driver had harmed none of us, and his household depended on that share of grain. Saera made me hear him before I could call the matter settled. The repayment came from my stores. That did not return the days he spent afraid of us.\n\nI still hear a challenge whenever a captain calls me timid. Ilyra needs a wheel for the grain cart; I asked for another fighting cart first. There is pride in that decision as well as fear. Ask me to defend these households. Do not let me pretend that every blow I want to strike is for them.'}),
  ]),
});

const words=Object.freeze;
export const CENTAUR_CAMP_CAST=Object.freeze([
  Object.freeze({id:'centaur-saera',key:'saera',name:'Saera',gender:'female',occupation:'Elder and promise-keeper',
    appearance:Object.freeze({variant:2,cloth:0x536b75,trim:0xd0b382,dress:'mantle',scale:1.03,tool:'cord'}),
    action:'Counting witness knots',words:words({
      hello:'You may warm yourself at our fire before you explain yourself. I am Saera. I keep the promises people would rather remember differently.',
      work:'These cords name the witnesses to a debt, a marriage, an adopted child, a winter of shared grain. The knot is a reminder; people still have to tell the truth. I am checking an obligation my own brother failed to keep.',
      customs:'Here, honour is bringing the promised meal when nobody is watching. At a gathering we name what we can offer and what we cannot. A grand oath with no means behind it is a burden laid on someone else.',
      war:'Bane speaks for those afraid of Celder. He does not speak with every voice in this camp. I want the families safe, and I will oppose a raid that makes another family pay for a ruler\'s cruelty.',
      dissent:'We say every hearth may speak. Then an elder like me interrupts a young courier and calls it guidance. Kesh has been reminding me of that. A custom is only fair when you let it inconvenience you.',
      news:'Arven tends the common meal. Speak to the people working before you decide that this is only an army camp. Bane hears petitions near the central fire.',
      future:'A peace worth keeping must name who can use the roads, who returns what was taken, and who listens when the first promise is broken.',
    })}),
  Object.freeze({id:'centaur-varek',key:'varek',name:'Varek',gender:'male',occupation:'Hunter and track reader',
    appearance:Object.freeze({variant:0,cloth:0x5d7247,trim:0xb8b799,dress:'hunter',scale:.98,tool:'bow'}),
    action:'Checking a hunting bow',words:words({
      hello:'Come around the bow, not across it. The string is loose, but a habit should be safe even when it does not have to be.',
      work:'I read tracks, find water on the dry routes, and hunt for the common pot. We take fewer animals when the young are nursing. Hunger tempts good hunters to forget what next spring will need.',
      customs:'After a kill we lay aside meat for households that could not join the hunt. Delan uses the hide and sinew; Arven uses bones for broth. The thanks matter less if we leave useful food to rot.',
      war:'My cousin was turned back at Celder with a wounded leg and no water. I understand Bane\'s anger. I would ride against the men who did it. Saera asks how I will know them when fear makes every face look alike.',
      dissent:'I argued that the best hunters should get the first choice of meat. Arven asked whether the sick should learn to hunt before supper. I did not enjoy being corrected in front of everyone. He was right.',
      news:'The fresh tracks at the meadow edge are deer. Please leave their path open. A frightened animal can run straight through the work yards.',
      future:'I want a road where a traveller can ask for water without first explaining their ancestry. I do not yet trust a signature to give us that.',
    })}),
  Object.freeze({id:'centaur-delan',key:'delan',name:'Delan',gender:'male',occupation:'Hideworker and harness mender',
    appearance:Object.freeze({variant:1,cloth:0x925c43,trim:0xc4b38d,dress:'apron',scale:1,tool:'awl'}),
    action:'Stitching a leather strap',words:words({
      hello:'Keep your sleeve out of the dye. I have already made that mistake for both of us.',
      work:'Tent covers, carrying straps, waterproof wraps, split boots for our two-legged neighbours. A little patch now saves a whole hide later. I am remaking a strap someone tried to mend with a battle boast.',
      customs:'My niece is an elf. When her parents died, she joined our hearth; nobody asked her to grow hooves. Kin are the people who accept a duty to one another. That is the saying. Some households are kinder at saying it than living it.',
      war:'Celder would keep my niece outside its human ranks, and it would keep me out too. I will defend her. But when Bane asks for straps for a raid, I ask where the raiders intend to stop.',
      dissent:'My older kin expect their repairs before a stranger\'s because we share a name. The stranger still needs a sound tent before rain. My work board is in order of need, though my aunt keeps moving her marker.',
      news:'The frames dry hides where smoke can reach them. Give them room. The little scraps beside my bench are for patches, not rubbish.',
      future:'If there is peace, I want orders for tents and fishing gear. People notice a fine weapon long before they notice a roof that never leaked.',
    })}),
  Object.freeze({id:'centaur-arven',key:'arven',name:'Arven',gender:'male',occupation:'Cook and keeper of stores',
    appearance:Object.freeze({variant:2,cloth:0x987344,trim:0xd9c6a5,dress:'cook',scale:1.04,tool:'ladle'}),
    action:'Tending the common meal',words:words({
      hello:'There is broth. Say if you cannot eat something before I fill your bowl. Being a guest should not require being polite through an illness.',
      work:'I count grain, dry fruit, trade for salt and keep the common pot going. Laketown\'s fish help us stretch the stores. The camp is fed by work and exchange, not by how loudly somebody praises a hunt.',
      customs:'The first bowl is for a guest or someone who needs help. The cook eats with everyone else. We say no hearth should go cold alone, so a family with fuel shares it before a family without fuel has to beg.',
      war:'The fighters ask how many days they can march. I ask who carries food home if they do not return. I want Bane to hear the answer before he gives another speech.',
      dissent:'My nephew took grain to his own hearth without asking. He called it caring for kin. I made him return it and help serve the households he had shorted. It would have been easier to hide what he did.',
      news:'Do not step between the pot and the water jars. There is room by the serving board. Ilyra has been mending the grain cart; thank her if supper arrived on time.',
      future:'A safer road means fish and salt can reach us regularly. I would welcome the dull problem of having too many full jars.',
    })}),
  Object.freeze({id:'centaur-ilyra',key:'ilyra',name:'Ilyra',gender:'female',occupation:'Wheelwright and cart repairer',
    appearance:Object.freeze({variant:0,cloth:0x527b76,trim:0xd3be91,dress:'worker',scale:.96,tool:'mallet'}),
    action:'Fitting a wooden wheel joint',words:words({
      hello:'That wedge is holding the wheel still. Please leave it where it is; it has better manners than the axle.',
      work:'I build and mend the carts that carry our shelters and stores. This spoke is local ash, the rim was traded from a dwarf, and the iron band has been repaired twice. Moving well takes many people\'s knowledge.',
      customs:'A travelling hearth takes its neighbours into account: a broad turning space, a shared repair yard, a clear path for those carrying water. We stop in familiar places, and some of us stay. There is no shame in putting down a sound sill.',
      war:'Bane wants another cart ready for the fighters. The common grain cart needs that same wheel. He says protection comes first; I say feeding the people is part of protection.',
      dissent:'People praise the freedom of travelling until a wheel breaks. Then they remember the craft work. I am asking for a place in the council, not another compliment about useful hands.',
      news:'Keep the lane through the work yards clear. Kesh uses it to carry messages, and Arven uses it to fetch water. Both believe their errand is the urgent one.',
      future:'I might build a permanent workshop by Laketown. My sister prefers the open road. We can remain kin without making the same home.',
    })}),
  Object.freeze({id:'centaur-kesh',key:'kesh',name:'Kesh',gender:'female',occupation:'Courier and route learner',
    appearance:Object.freeze({variant:1,cloth:0x71618a,trim:0xd4bc91,dress:'courier',scale:.93,tool:'tablet'}),
    action:'Checking a route tablet',words:words({
      hello:'If you are waiting for a message, tell me who sent it. Everyone starts with the words “the important one”.',
      work:'I carry words between hearths and mark safe water and crossings. Saera teaches me the old routes; I add what has changed. A story about a ford is useful only if the ford is still there.',
      customs:'Before a long journey someone repeats the route back to the traveller. It catches mistakes and tells the hearth where to look if they are late. Remembering together is not the same as forbidding new paths.',
      war:'I have friends in Laketown and have met decent people on Celder\'s road. That does not make its exclusions harmless. I want an agreement people can test, not a choice between pretending nothing is wrong and burning everything.',
      dissent:'Saera is my aunt. She trusts me to carry promises across the country, then tells me I am too young to question them at the fire. She has started letting me finish. I am trying not to turn every sentence into a victory.',
      news:'Bane is near the main fire. The cooks and craftspeople will tell you things his guards do not hear. Ask them what a peace would have to change.',
      future:'If the roads open, I want to visit Laketown as a neighbour with an afternoon to spare. Couriers see a surprising number of places without ever getting to know one.',
    })}),
]);

const TOPICS=Object.freeze([
  Object.freeze({id:'customs',label:'What does your hearth ask of you?'}),
  Object.freeze({id:'dissent',label:'Do people here always agree?'}),
]);
export function centaurCampTopics(id){return CENTAUR_CAMP_CAST.some(p=>p.id===id)?TOPICS:null;}
export function centaurCampWords(id,topic,chapter=null){
  const person=CENTAUR_CAMP_CAST.find(p=>p.id===id);if(!person)return null;
  if(topic==='memory')return 'I can tell you what I have seen here. Speak with Bane and Councillor Rowan about the agreements you have made.';
  if(topic==='war'&&chapter?.chapter==='yunethre'&&chapter.battle?.status==='averted'){
    const after={saera:'The battle has been averted. Now the promises need witnesses, clear terms and people willing to keep listening.',
      varek:'There will be no battle today. I am relieved. I still want to know who helps the next traveller refused water.',
      delan:'Peace means I can finish the tent covers before another heap of broken straps arrives. It does not make the old distrust disappear.',
      arven:'A meal is easier to plan when people expect to come home. There is broth for visitors from either side, if they come in peace.',
      ilyra:'Now I can put the sound wheel on the grain cart. Remember this moment when someone says the work yards have nothing to do with peace.',
      kesh:'We have an agreement to carry. I want to hear it read at every hearth, including the parts our own people may dislike.'};
    return after[person.key];
  }
  return person.words[topic]??person.words.hello;
}
