# The Dividing and the rest of Minora: lines for review

Build 5 of the Farmlands of the Lizeem (docs/lizeem-farmlands-design.md 5.5 and 6.2), built 6 October 2026 under the
user's "keep building everything". Every line below is copied from the code (`src/dividing.js`, `src/taleth.js`,
`src/lizeem-minora-people.js`), so this page is what the game says. Nothing here is approved yet: the looks, the
lines and the numbers all want the user's word.

## The Dividing

**When.** Taleth's topic "The Dividing" shows locked from the start of the game with this reason:

> Not until all four countries down the river are restored. The Dividing waits for the whole river.

It opens when Taleth's charge is taken and all four countries are restored (the Caricas arc and the Nethereum, Nesdor
and Ovesos arcs all at `done`). The hub then carries a card for it ("The Farmlands of the Lizeem: the Dividing") and
marks Taleth. From that day a trestle with four bowls of water stands on the west side of the forecourt, clear of the
start and of Taleth's stand, and it stays there afterwards.

**First asked.** Taleth teaches fork stew (both recipes) and says:

> All four. Caricas, Nethereum, Nesdor and Ovesos, each brought back its own way and each carried up this hill. Then we hold the Dividing, here, whatever the prince thinks of crowds.
>
> It wants four bowls of river water and a pot of fork stew, and the stew is yours: a sheaf of bridge rye, one of flood oats, one of wheat from either bank, and a weir fish, at a lit fire. Three grains and a fish, the Old Island way. The rest of the city mocks it, with its mouth full.
>
> Bring it here. I will have the trestle out and the bowls on it, and Seshat and Nepri will come up the hill, because neither of them can bear to miss a thing being measured.

**Asked again, with no stew in the satchel:**

> The bowls are out and the trestle is up. The stew is yours: bridge rye, flood oats, floodwheat or hard wheat, and a weir fish, at a lit fire. I can wait. I have had a great deal of practice.

**Fork stew.** Cooked at any lit fire: one bridge rye, one flood oats, one weir fish, and one floodwheat
(`fork-stew`) or one hard wheat (`fork-stew-oveth`). The kitchen's recipes take one list of goods, so the two
wheats are two recipes making the same stew. It restores 60 health, the one food over the larder's 50
(`tests/foods.test.js` allows it by name). Item text:

> Restores up to 60 health. Minora’s own dish: rye from Caricas, oats from Nethereum, wheat from Nesdor or Ovesos and a fish from the Nethrani weirs, simmered thick. Every district of the city makes it differently and defends its way with irrational passion.

**The feast** ("Serve the fork stew and hold the Dividing"). The stew leaves the satchel, Farming gains
1,000 experience (first pass, as each arc's end pays), and the scene plays.

Taleth pours:

> Water from above the fork, drawn at dawn before the barges stirred it. This is the part of the Dividing that is almost embarrassingly literal, which is why Minora has never once left it out.
>
> He pours into the first bowl. “Caricas, over the White Bridge, which rests its ground in turn and asks the fox.”
>
> Into the second. “Nethereum, over the Pilgrims’ Bridge, which drowns its meadow on purpose and keeps its names in the water.”
>
> Into the third. “Nesdor, beyond Caricas, which plants by how high a strip stands above the river, and will tell you so.”
>
> Into the fourth. “Ovesos, beyond Nethereum, which shares its water out by turns and argues about it for eleven years at a time.”
>
> Four bowls, one water. The river did not submit to Minora. It agreed to be divided. Every year somebody has to say so out loud, and this year it is an old man on a step.

Seshat (in her own voice when the host can stand her up; otherwise told in Taleth's box as "Seshat lays the Measure
open on the trestle"):

> Four leaves, sixteen lines, every one of them sealed. I have checked them twice. I will check them again tonight, because that is the job.

Nepri (likewise, "Nepri, at the end of the trestle"):

> There is a column in my book that has said “requisitioned” for a year. Tonight I am writing “shared” in it, and the garrison may read it if they like.

The stew, and Taleth's close:

> You set the pot on the trestle beside the bowls: rye from Caricas, oats from Nethereum, wheat from the bank you chose, and a fish from the Nethrani weirs.
>
> Taleth eats standing, as the Old Island does. “Three grains and a fish. Every district in the city makes this and every district is sure the others are wrong. That is the whole of Minora in one pot.”
>
> “The Measure is walked, and the valley is alive on both banks. The Guild writes you in its ledger as a Walker of the Measure. It is not a rank. It is better than a rank: nobody can take it off you by outliving you.”
>
> “I had more to ask of you. I find I have not written it yet. Come back when I have.”

**The journal** (entered through the hub as the Dividing's arc): title "Walker of the Measure".

> You walked the Measure of the River down both banks of the Lizeem and brought the four countries back to work. On the Guild forecourt Taleth poured river water into four bowls and named Caricas, Nethereum, Nesdor and Ovesos; Seshat read the leaves and Nepri wrote “shared” in his book; you served the fork stew. The Guild has written you in its ledger as a Walker of the Measure.

**Afterwards.** The topic becomes "About the Dividing":

> The bowls are still on the trestle. Nobody has had the heart to empty them, and the water has not gone anywhere, which the Bowl-Keepers will tell you is the point.
>
> Walker of the Measure. Seshat has written it in gold, which she says she reserves for Prize. I did not argue.

He greets Rollo with:

> Rollo. Walker of the Measure, and still you climb the hill to ask me things. What else?

and the two later charges ("A second charge · locked" and "A third charge · locked") stay locked with the reason:

> After the Dividing: not yet written.

## The people

Placed and talking; every look is the design's in the figure kit's words, and nobody wears a hat.

### Manawydan, the Nethrani factor

Stands at the Nethrani stall in the market corner by the Temple Way. Buys east-bank (20 a day). Sells smoked-fish at 4, meadow-hay at 2, hides at 2.

> Manawydan. I keep the Nethrani stall: smoked fish, hay and hides out, and whatever grows on the east bank back in. The fish trade is my commission. The rest is my own business.
>
> Minora’s merchants have twice asked the council to move my stall. It is still here. So am I. They are, I am told, still asking.
>
> We lost a meadow in a bad year, and half the houses beside it. You write the names down, and then you plant. There is no third thing to do.

*Ask about the Flood Council.*

> The Flood Council decides by consensus. Consensus is not unanimity. It means everybody has said what they will not live with, and what is left is the decision.
>
> Nethereum is in rising, as you will have heard. It rises the Nethrani way: slowly, by council, and then all at once.

*At the trade:* “East-bank goods, for home. Smoked fish, hay and hides, from home.” / “Enough for today. The cart for the Pilgrims’ Bridge goes in the morning.” / “Nothing from the east bank. Then you are buying, or you are talking.”

### Njord, the Nesdor carter

Stands at the Nesdor stall in the market corner. Buys flour, dish (12 a day). Sells nothing. Carries the `nesdor-way` board.

> Njord. I drive a cart on the Nesdor Way, from here to the Moros and back, and I carry what the route towns want brought.
>
> Flour and dishes I buy, for the Way. It is a long road and nobody on it wants to cook.
>
> I charge for knowing the road. Everybody who drives it knows it. I am the one who says so.

*Ask about the Way.*

> Minora to the Moros, by the Nesdor Way: over the White Bridge, through Caricas, across the Flats and past the Army’s Line where the rope is down.
>
> The route towns post what they want on the board at the end of the Way, and I carry the same paper here. Fill it here or fill it there: it is the same order and the same copper.
>
> Forseti writes the paper and I carry it. Between us we know everything on the Way that has a price.

*At the trade:* “Flour and cooked food for the Way. And the Way board’s orders, the same paper Forseti pins up at the far end.” / “The cart is loaded. It goes at first light.” / “Flour or a dish. Something a man on the Way can eat without stopping.”

### Adapa, the Ovesian factor

Stands at the Ovesian stall in the market corner. Buys bridge-rye, rye, flood-oats, weir-fish, meadow-hay (20 a day). Sells hard-wheat-flour at 3, cloth at 8, hard-wheat-seed at 2.

> Adapa, factor for Ovesos in the capital. I sell flour, cloth and seed, and I buy rye, oats, fish and hay, all of which Ovesos could grow if it were given its water.
>
> I am eleven years into the Middle Reach proceeding. My submissions run to four hundred pages. The other side’s run to three hundred and ninety, which is how I know I am winning.
>
> My submissions carry the genealogy of every right in question. Some say that is excessive. Those people have never lost a right to a man whose grandfather was better documented.

*Ask about the Middle Reach proceeding.*

> It concerns the turns of water on the middle of the Ovesos canal, and who was owed them in my grandfather’s grandfather’s time. I have been at it eleven years.
>
> The Water Council hears it every spring and adjourns it every spring. Adjourned is not lost. I explain that to my principals every spring.
>
> If you go down to Velsorten, Nisaba keeps the register. Tell her Adapa sends his respects. She will know exactly how many.

*At the trade:* “Rye, oats, fish and hay, which Ovesos would grow itself if it had the water. Flour, cloth and seed, which it does.” / “That is my commission filled for the day. I shall write to say so.” / “Rye, oats, fish or hay. You have none of the four, and I have a submission to finish.”

### Hapi, barge master

Stands at the lane on the river side of the River storehouse (-2337, 209.6), between its south wall and the city wall, facing east toward the Isa Gate. Buys sealed Fine or Prize goods only, a lot of 10 of each of the river’s 26 goods a day, each its own lot, at twice the home price and with no second lot (since the integration of 6 October 2026). Sells nothing.

> Hapi. The barge below the storehouse is mine, and so is the one behind it when my cousin is sober.
>
> A house here, rooms in Nylon and cousins in three branch towns. A boat family is a family that is always partly somewhere else.
>
> The river is rising in the hills. The Flood Office will post it in three days. I knew three days ago, because my knee told me.

*Ask about the barge.*

> Flat-bottomed, twelve oars and a sail when the wind is honest. Down to Nylon on the current, and back up on the oars and on my cousins’ patience.
>
> One lot of each good a day, Fine and sealed, and nothing else. Nylon will pay for the best of the valley. It will not pay for the rest, and it says so at length.

*At the trade:* “One lot of each good a day, sealed, for Nylon. Nylon pays for the best of the valley and complains about the rest.” / “The barge has her lot of that. Bring me something else, or bring it tomorrow.” / “Sealed, or it does not go aboard. Nylon has measurers too, and they are not friends of ours.”

*Ask for news from the river* (a line for each country restored, and one for the Dividing once held; with none, the last):

> Caricas is sending rye over the White Bridge again, sealed. The garrison counts it at one end and Consus at the other, and they nearly agree.
>
> They say Haethom drowned its meadow and drew it off at the shine this year. The hay coming down the Isa smells like it.
>
> The Way is moving again. Njord says so, which is the same as the Way saying so, only louder.
>
> Velsorten has its turns of water back, and its mill. Adapa has begun a new submission about it. I have not seen the end of it, and nor will he.
>
> And the Dividing was held on the Guild forecourt, with four bowls and a pot of stew. Nylon will not believe it. I am taking a bowl down to show them.
>
> Nothing moves on the river that the garrison has not already counted. That is the news, and there is not much of it.

### Amalthea, cheese-maker of the Isareos hills

Stands at her stand at the hamlet on the Isareos shoulder (-2621.5, 20.4), behind its counter, 230 m north-west of the Muster Gate. Buys meadow-hay (12 a day). Sells ewe-cheese at 4.

> Amalthea. My family grazes cattle and sheep up here, on grass that never dries out, and makes the cheese the bridge workers eat with their rye.
>
> Hay I buy, because the flock eats more of it this close to the walls. Cheese I sell, to anybody who comes up the track, the army included.
>
> I take the cheese down through the camp on market days. The soldiers count the wheels on the cart. I have never yet seen one of them count the cheeses.

*Ask about the summer camp.*

> We took the flock up to the high grass every year, with hurdles and a cheese hut. The centaurs came through in the spring and took the hurdles, the hut and eleven ewes. The hut I can build again.
>
> This year we stay where we can see the walls. The army is closer than I would like, and the centaurs are further. You choose your neighbours by what they take.

*At the trade:* “Hay I buy, for the ewes, this close to the walls. Cheese I sell.” / “The rick will hold no more today.” / “Hay, or nothing. The ewes are particular and so am I.”

*Ask how the bridge workers eat it* (only while neither Vertumnus nor she has taught the rye loaf):

> Two of bridge rye, an onion worked through the dough, and a wedge of my cheese melted over the top at the fire. The bridge workers eat it standing up, which is how a bridge worker eats.
>
> Vertumnus will tell you the loaf is Carican, because the rye is. The cheese is mine. Ask him which half he would rather go without.

## Amalthea's hamlet

`src/isareos-hamlet.js` and `src/isareos-hamlet-scenery.js`. On the open grass top of the shoulder between the
heads of the west and middle becks, centred on (-2628, 21), 228 m north-west of the Muster Gate: 121 m from the corner
of Wilhelm's camp and 131 m from its nearest tent, 145 m from the end of the centaurs' raid route, 72 m from the
nearest water. Isareos grows its thorn in the hollows and nothing on the tops, so the top has no thorn and no trees on it; only the grass tufts come off when the wiring reserves it.
One drystone house with a thatch-and-turf roof (door south to the yard), a byre down the west side of the yard (its
wide door east), the cheese press under an open lean-to on the east side, her stand (an awning on four posts with a
counter of cheeses on its south side), a hay rick, a stone trough and a stack of turves for the fire, since the hills
grow grass and not wood. Each building stands on a footing that takes up the fall of the top, so the ground is not
changed. Two draws.

The camp sits across the road out of the Muster Gate, so the track (160 m, 3 m wide) starts where the Muster road ends
inside it, by Wilhelm, goes out of the camp's west side between its two rows of tents, wades the middle beck below its
head and runs along the shoulder to the yard. The ground south of the camp, toward the Isa, is broken by natural banks
two to seven metres high; this way has none (no five metres of it rises more than 1.5 m, apart from the beck's banks).

## The props on the forecourt

`src/dividing-scenery.js`: a trestle (2.6 by 0.9 m) at (-2420.5, 59.5) on the west side of the forecourt, four
stone bowls of water on it from west to east (Caricas, Nethereum, Nesdor, Ovesos) and the jug they were poured from.
It stands 6 m from the start, 10 m from Taleth and more than 3 m off the way between them, a metre and more clear of
the tower and of everything the city builds. Hidden, and its collider out of the world's list, until the host shows it.
Places are kept for Seshat and Nepri on the tower side of it, facing the forecourt, for a host that walks them up.

## What the code could not do, and what it would need

- **Hapi's terms** (settled at integration, 6 October 2026). The design's barge pays twice the home price for one
  Fine sealed lot of each good a day. `src/merchants.js` now lets a buyer with a `rate` keep a finite appetite, takes
  `fineOnly` (Fine or Prize units only) and `secondLot: false` (no second lot at six-tenths), and Hapi is registered
  with all three from `HAPI_TERMS`: sealed Fine or Prize only, a lot of 10 of each good a day, at twice the home price.
- **Seed-saving** at Farming 20 is listed "to come": `src/farming.js` has no hook for the next sowing's grade (the
  fox's regard, `markRegarded`, is the nearest thing, and is the fox's).
- **Njord's orders** needed nothing new: the market reads a buyer's board by id, so he names Forseti's `nesdor-way`
  board and shows the same three orders; one filled at his stall is filled at Forseti's door.
