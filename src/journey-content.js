// These are local districts and people invented for the playable road out of Drent into Luscia.
// The large-scale geography remains the authored World Builder geography.
export const JOURNEY_NPCS = [
  {id:'meadow-courier',name:'Corvan',role:'Ambroni army quartermaster',modelRole:'legion-officer',color:0x832d2b},
  {id:'crossing-keeper',name:'Hollis',role:'Crossing keeper',modelRole:'bridge-keeper',color:0x6b8c83},
  {id:'ridge-keeper',name:'Sava',role:'Keeper of the rise',modelRole:'rise-custodian',color:0x697589},
  {id:'relay-clerk',name:'Iven',role:'Imperial relay clerk',modelRole:'legion-soldier',color:0x8f3b30},
];

export const SITE_ACTIONS = {
  'cart-parcel-1':'collect-cart-parcel-1', 'cart-parcel-2':'collect-cart-parcel-2', 'cart-parcel-3':'collect-cart-parcel-3',
  'bridge-repair':'repair-bridge', 'beacon-west':'restore-beacon-west', 'beacon-east':'restore-beacon-east', 'beacon-north':'restore-beacon-north',
};

export function journeyConversation(npc,context) {
  const {journey,inventory,openDialogue,closeDialogue,act,teachFishing,provideBridgeWood}=context;
  const state=journey.state, view=journey.view();
  const done=id=>state.completedRegions.includes(id);
  const choice=(id,label)=>({id,label,action:()=>{closeDialogue();act(id);}});
  const back={id:'leave-road-neighbor',label:'Back to the road.',action:closeDialogue};
  const returnToNeighbor=()=>journeyConversation(npc,context);
  const tangent=(id,label,lines)=>({id,label,action:()=>openDialogue(npc,lines,null,'Back to our conversation',{onComplete:returnToNeighbor})});
  const flavor={
    'meadow-courier':[
      tangent('nessa-caravans','What travels through these fields?',[
        'Before the army came through, it was seed for one farm, wool from another, a pot sent back because a courier borrowed it. Now every manifest says campaign stores. Much the same cart, but rather more signatures.',
        'I like the hour before the mill starts. The grass is silver and nobody has asked which side a sack of grain belongs to. By breakfast the requisitions arrive. I keep the loads moving; command decides where they go.'
      ]),
    ],
    'crossing-keeper':[
      tangent('hollis-river','Do you mend this bridge often?',[
        'Often enough that I know which plank complains before the rain. You listen to the river and you listen to the timber. Both will tell you what is wrong if you let them finish.',
        'People leave a sound branch here when they cross. One brings wood, another tightens a knot. Some of those hands belong to people your army calls rebels. Ask around before deciding that makes them strangers.'
      ]),
      {id:'hollis-fishing',label:inventory.has('fishing-rod')?'Where is a good place to fish?':'Could you teach me to fish?',action:()=>{
        const hasRod=inventory.has('fishing-rod'),canBorrow=!hasRod&&typeof teachFishing==='function';
        openDialogue(npc,[
          'There is a marked fishing bank east of the bridge. Stand on the dry patch with a rod and press F to cast. Wait until the float dips and the prompt says a bite, then press F again to reel. Too early, and all you catch is my sympathy.',
          `${hasRod?'You already have a good enough rod. Patience matters more than polish.':canBorrow?'I keep a spare rod for travelers. You are welcome to borrow it for the road.':'Bran at Willowmere Pond, back in Tidehaven’s wood, can lend you a rod.'} The catch goes into your satchel raw. Bring it to a fire ring nearby: a tinderbox and two sticks light the fire, then Cook turns a raw fish into a meal. Eat it from I when you need health.`
        ],null,canBorrow?'Borrow a spare rod':'Back to our conversation',{onComplete:()=>{
          if(canBorrow&&!inventory.has('fishing-rod')){
            const result=teachFishing();
            if(result?.ok===false||!inventory.has('fishing-rod')){
              openDialogue(npc,[result?.reason||'The spare rod is not ready just yet. Speak to me again in a moment.'],null,'Back to our conversation',{onComplete:returnToNeighbor});
              return;
            }
          }
          returnToNeighbor();
        }});
      }},
    ],
    'ridge-keeper':[
      tangent('sava-presences','What do people do at the shrines?',[
        'Some come with a prayer, some with a bucket. Here I sweep the step, keep drinking water clean, and set the road stones straight. Every valley of Luscia keeps its shrines a little differently; I can only tell you how we tend this small place.',
        'Sit beneath the open sky if you need a quiet minute. Fill an empty vessel, leave the step fit for the next pair of feet. There are older shrines and longer stories inland. You do not have to learn them all before you can be useful here.'
      ]),
    ],
    'relay-clerk':[
      tangent('iven-messages','How do the messages find their way?',[
        'A clear hand, a dry wrap, and a name someone recognizes. I copy warnings so one lost letter does not take the news with it. The originals stay with their bearers. A report is more useful when its witness reaches the other end.',
        'This is the army’s relay on the Luscia side of the Caloss. The road runs north-east from this square past the field at the Lauvel to the crossing, and south-west to the Moros, but a place name tells you little about who should rule it. Our forms have one box for loyal and one for rebel. The people I meet seldom fit so neatly.'
      ]),
    ],
  };
  if(npc.id==='crossing-keeper'&&state.bridgeAccepted&&!state.bridgeRepaired&&inventory.count('forest-stick')<3){
    flavor['crossing-keeper'].push({id:'hollis-repair-wood',label:'I need sound wood for the repair.',action:()=>{
      openDialogue(npc,[
        'Then use the marked repair timber from my camp. Take enough to make three sound branches in your pack, and bring them straight to the damaged side of the bridge. Better to ask than leave the next traveler with a loose plank.'
      ],null,'Take the repair timber',{onComplete:()=>{
        const current=journey.state;
        if(current.bridgeAccepted&&!current.bridgeRepaired&&inventory.count('forest-stick')<3){
          const result=typeof provideBridgeWood==='function'?provideBridgeWood():{ok:false};
          if(result?.ok===false||inventory.count('forest-stick')<3){
            openDialogue(npc,[result?.reason||'I could not put the repair timber in your pack. Ask me again when you are ready.'],null,'Back to our conversation',{onComplete:returnToNeighbor});
            return;
          }
        }
        returnToNeighbor();
      }});
    }});
  }
  const tell=(lines,choices)=>openDialogue(npc,lines,null,'Back to the road',{choices:[...choices,...(context.extraChoices?.(npc)||[]),...(flavor[npc.id]||[]),back]});
  if(npc.id==='meadow-courier') {
    if(done(2))return tell(['Your first field assignment is recorded. Hollis keeps the Caloss crossing beyond the old mill; the army needs that supply road made sound. Then follow the markers to our relay on the rise, across the river. Stay alert: command expects resistance from the rebels as well as goblins.'],[]);
    if(!state.started)return tell(['You came up from Tidehaven? Before carrying anyone else’s troubles, finish your business with Lakota and Eren. This road will still be here.'],[]);
    if(view.stage==='meet-courier'||!state.courierAccepted)return tell([
      'the letter of introduction? Let me copy it into the field register. Keep the original. I am Corvan, quartermaster of the Ambroni army. You are the mercenary we hired from across the sea in the Ambroni Empire’s name; this report brings you onto the army’s field detail.',
      'Our orders are to secure this road for the campaign against the rebels in the south. Goblin raids spilling out of Pueth have made supply work dangerous too. Before we can move, I need three parcels recovered from this broken cart.',
      'The parcels spilled east of the main road, around the broken field walls. Look for crossed ties around each bundle. Mind the goblin raiders among them; you can withdraw and catch your breath before trying again.'
    ],[choice('meet-courier','Report for field service · recover the supplies')]);
    if(state.parcels.length<3)return tell([`You have found ${state.parcels.length} of the three parcels. Look east of the main road, among the broken field walls and beside the cart track. F lifts a parcel. Your journal follows what remains; the gold marker points to the nearest one.`],[]);
    return tell(['Three parcels, accounted for. Your first army assignment is complete. Take two cooked fish as provisions. Next, help Hollis put the Caloss crossing in order, then restore the route markers up Threefold Rise and report to Iven at our relay. Command needs a road into Luscia it can hold against the rebels.'],[choice('return-courier','Return the parcels · take provisions')]);
  }
  if(npc.id==='crossing-keeper') {
    if(!done(2))return tell(['The crossing needs work, but there is no hurry. An army quartermaster called Corvan has a broken cart back on Sunmeadow Plain. Give him a hand first; everyone on this road relies on the next traveler.'],[]);
    if(done(3))return tell(['Those lashings will hold for an army cart, and for the families trying to stay out of its way. Save your spare wood for a fire; the air gets cool on the rise. Sava can tell you why the people here keep feeding the rebels, whatever the imperial notices say.'],[]);
    if(!state.bridgeAccepted)return tell([
      'Corvan sent you to clear the army’s route? I am Hollis. I will take the help. This is the Caloss; Drent ends on this bank and Luscia begins on the other. Families use the bridge too, especially with goblins pressing down out of Pueth. Its eastern walkway still holds, but the damaged side needs three sound branches.',
      'There is driftwood along this bank. Gather it with F. Bring three sticks to the bridge’s repair point and press F to lash them into place. I have the cord and tools. Your tinderbox is for cooking; it is not needed for this job.'
    ],[choice('meet-crossing-keeper','I’ll help mend the crossing.')]);
    if(!state.bridgeRepaired)return tell([`Three branches will brace the planks. You carry ${inventory.count('forest-stick')} sticks. Driftwood lies along the bank; gather enough, then use the repair point at the bridge. Keep a few spares if you want to cook afterward.`],[]);
    return tell([
      'A straight brace and tight cord. Take four spare branches. Your army has its crossing, but you have helped the people on both banks as well.',
      'A quiet word: most households here shelter or feed the people the Empire calls rebels. They are our neighbors. Goblins take from us out of the north; the army takes grain and calls it protection. Speak with Sava on the rise before you decide whose side these families are on.'
    ],[choice('return-crossing-keeper','Tell Hollis the bridge is repaired')]);
  }
  if(npc.id==='ridge-keeper') {
    if(!done(3))return tell(['The river below shapes every journey up here. Ask Hollis what needs doing at Reedwater Crossing before you climb farther. We keep the road together, one small repair at a time.'],[]);
    if(done(4))return tell(['The markers stand again. You are still in imperial service, but now you know whom those orders call rebels: Luscia’s own people, most of them, who wanted a republic and lost a battle for it. What you do with that knowledge is a longer road.'],[]);
    if(!state.ridgeAccepted)return tell([
      'I am Sava. Hollis was right to send you. You stand on the Luscia side of the Caloss now. Ten days ago the army met a rebel army at the Lauvel crossing and broke it. Those rebels were farmers, drovers and market families from every valley of Luscia. Most of the population supports what they wanted: a republic in place of the emperor.',
      'We are caught between goblin raids pressing down from the north and an empire that is losing its grip and squeezing harder as it slips. Your contract calls this a campaign against rebels. For the people living here, it is a fight for their own government and homes.',
      'Your route assignment can still help them. Rain loosened three waymarkers: western shelf, eastern bend, northern rise. Press F to straighten each reflective stone; no fuel is needed. Families escaping the fighting need those directions as much as soldiers do.',
      'Then carry the letter of introduction on to Iven. He keeps the army’s relay post on the square at Lumber Town, down the road past the field at the Lauvel. Tell him what you have heard here; he copies reports for the army, and let this one include the people’s account.'
    ],[choice('meet-ridge-keeper','I’ll restore the three waymarkers.')]);
    return tell([`${state.beacons.length} of three waymarkers restored. Follow the small stone paths off the main road. Then take the letter of introduction to Iven. You can serve the people on this road even while you begin to question the Empire that hired you.`],[]);
  }
  if(npc.id==='relay-clerk') {
    if(journey.view().complete)return tell(['I have recorded both the goblin danger and what the people told you. Your Ambroni service continues; this report does not settle the war or release your contract. Keep the original. Stay in the square a moment: the next orders out of the Moros concern the field at the Lauvel, and they concern you.'],[]);
    if(!state.ridgeAccepted||state.beacons.length<3)return tell(['I keep the road’s messages moving. Speak with Sava at the foot of the rise and put the three waymarkers in order first. A runner is no use if the next traveler cannot find the path.'],[]);
    return tell([
      'Corvan’s mercenary. The supplies are recovered and the army’s route is sound. I will copy the letter’s warning about the goblins into your field report. You keep the original.',
      'Sava told you who the rebels are? Our forms call them insurgents. They are the households of Luscia and the valleys beyond, and most people stand behind the republic they declared. I write for the Ambroni Empire, but I cannot make that truth disappear by choosing a different word.',
      'I will record what you witnessed. You are still serving the army that hired you; the next assignment will come later. For now, ask yourself what protecting these people means when imperial orders and their own government stand on opposite sides.'
    ],[choice('deliver-report','Submit the report · include the people’s account')]);
  }
}
