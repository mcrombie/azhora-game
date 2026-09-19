/**
 * Brandy Frank's painted boards (src/brandy.js): the animals the way they ought
 * to be, and the houses the way they ought to be, in every colour she makes.
 * Each painting draws itself on a 2D canvas; the yard (src/brandy-yard.js)
 * hangs them on posts. Six are plain boards; three are cut in the shape of a
 * house (`shape: 'house'`), the top of the canvas being the roof.
 * Pure canvas drawing: no three.
 */
export const RAINBOW = ['#ff3fa4', '#ff8c1a', '#ffe135', '#7ed321', '#1ec8d8', '#8e44ec'];
function sparkles(g, w, h, count, seed = 1) {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let k = 0; k < count; k++) {
    const x = rnd() * w, y = rnd() * h, r = 4 + rnd() * 7;
    g.fillStyle = k % 3 ? '#fff6a8' : '#ffffff';
    g.beginPath();
    for (let p = 0; p < 8; p++) { const a = p / 8 * Math.PI * 2, rr = p % 2 ? r * .4 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.fill();
  }
}
const heart = (g, x, y, s) => { g.beginPath(); g.moveTo(x, y + s * .35); g.bezierCurveTo(x - s, y - s * .35, x - s * .45, y - s, x, y - s * .45); g.bezierCurveTo(x + s * .45, y - s, x + s, y - s * .35, x, y + s * .35); g.fill(); };
const PAINTINGS = {
  leopard: (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, w, h); sky.addColorStop(0, '#ff3fa4'); sky.addColorStop(1, '#8e44ec'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    sparkles(g, w, h, 26, 7);
    const fur = g.createLinearGradient(w * .2, 0, w * .85, 0); RAINBOW.forEach((c, i) => fur.addColorStop(i / 5, c));
    g.fillStyle = fur;
    g.beginPath(); g.ellipse(w * .52, h * .6, w * .26, h * .17, -.08, 0, Math.PI * 2); g.fill();          // body
    g.beginPath(); g.arc(w * .26, h * .44, h * .15, 0, Math.PI * 2); g.fill();                           // head
    for (const [x, y] of [[w * .19, h * .3], [w * .31, h * .29]]) { g.beginPath(); g.moveTo(x - 12, y + 10); g.lineTo(x, y - 14); g.lineTo(x + 12, y + 10); g.fill(); }
    g.lineWidth = 16; g.strokeStyle = fur; g.beginPath(); g.moveTo(w * .76, h * .56); g.quadraticCurveTo(w * .95, h * .4, w * .88, h * .22); g.stroke();
    for (const [x, y] of [[w * .38, h * .78], [w * .46, h * .8], [w * .6, h * .8], [w * .68, h * .78]]) g.fillRect(x, y - 8, 14, 42);
    g.fillStyle = '#2a1030';
    for (let k = 0; k < 22; k++) { const a = k * 2.4, r = (k % 5) * .045 + .04; g.beginPath(); g.ellipse(w * (.52 + Math.cos(a) * r * 1.6), h * (.6 + Math.sin(a) * r * .9), 9, 6, a, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#ffffff'; for (const x of [w * .22, w * .3]) { g.beginPath(); g.arc(x, h * .42, 9, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#1a1a2e'; for (const x of [w * .22, w * .3]) { g.beginPath(); g.arc(x + 2, h * .43, 5, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#ff7fc4'; g.beginPath(); g.arc(w * .26, h * .5, 6, 0, Math.PI * 2); g.fill();
  },
  dolphin: (g, w, h) => {
    const sea = g.createLinearGradient(0, 0, 0, h); sea.addColorStop(0, '#6ad0ff'); sea.addColorStop(.6, '#b98cff'); sea.addColorStop(1, '#1ec8d8'); g.fillStyle = sea; g.fillRect(0, 0, w, h);
    RAINBOW.forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 12; g.beginPath(); g.arc(w * .5, h * 1.02, w * .44 - i * 12, Math.PI, 0); g.stroke(); });
    sparkles(g, w, h, 20, 3);
    g.fillStyle = '#ff5fb4';
    g.beginPath(); g.moveTo(w * .18, h * .7); g.quadraticCurveTo(w * .4, h * .12, w * .72, h * .34); g.quadraticCurveTo(w * .8, h * .38, w * .84, h * .32);
    g.lineTo(w * .82, h * .42); g.quadraticCurveTo(w * .5, h * .38, w * .26, h * .78); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(w * .45, h * .3); g.lineTo(w * .5, h * .16); g.lineTo(w * .56, h * .3); g.fill();
    g.beginPath(); g.moveTo(w * .2, h * .72); g.lineTo(w * .1, h * .8); g.lineTo(w * .24, h * .84); g.fill();
    g.fillStyle = '#1a1a2e'; g.beginPath(); g.arc(w * .74, h * .35, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.fillRect(w * .1, h * .88, w * .8, 6);
  },
  bear: (g, w, h) => {
    g.fillStyle = '#ff3fa4'; g.fillRect(0, 0, w, h);
    sparkles(g, w, h, 24, 11);
    RAINBOW.forEach((c, i) => { g.fillStyle = c; heart(g, w / 2, h * .62, h * (.62 - i * .055)); });
    g.fillStyle = '#ffffff'; heart(g, w / 2, h * .62, h * .3);
    const face = (x, y) => {
      g.fillStyle = '#f2ece0'; g.beginPath(); g.arc(x, y, h * .15, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2a1030'; for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * h * .12, y - h * .12, h * .055, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(x + s * h * .06, y - h * .01, h * .035, h * .045, s * .5, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#ffffff'; for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * h * .055, y - h * .02, 4, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#ffe135'; g.beginPath(); for (let p = 0; p < 10; p++) { const a = p / 10 * Math.PI * 2 - Math.PI / 2, r = p % 2 ? 6 : 14; g.lineTo(x + Math.cos(a) * r, y + h * .06 + Math.sin(a) * r); } g.fill();
    };
    face(w / 2, h * .5);
  },
};

/** A five-point star. */
function star(g, x, y, r, fill = '#fff6a8') { g.fillStyle = fill; g.beginPath(); for (let p = 0; p < 10; p++) { const a = p / 10 * Math.PI * 2 - Math.PI / 2, rr = p % 2 ? r * .45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); }
/** Big shining eyes, the Lisa Frank way: a dark eye, a blue ring, two white lights. */
function eyes(g, points, r) {
  for (const [x, y] of points) {
    g.fillStyle = '#1a1030'; g.beginPath(); g.ellipse(x, y, r, r * 1.15, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2f9bff'; g.beginPath(); g.ellipse(x, y + r * .3, r * .7, r * .6, 0, 0, Math.PI); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x - r * .35, y - r * .4, r * .32, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(x + r * .3, y + r * .15, r * .15, 0, Math.PI * 2); g.fill();
  }
}
function cloud(g, x, y, s, fill = '#ffffff') { g.fillStyle = fill; for (const [dx, dy, r] of [[-1, .1, .55], [-.35, -.25, .7], [.35, -.15, .65], [1, .1, .5], [0, .2, .6]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); g.fill(); } }
function skyGradient(g, w, h, stops) { const sky = g.createLinearGradient(0, 0, 0, h); stops.forEach((c, i) => sky.addColorStop(i / (stops.length - 1), c)); g.fillStyle = sky; g.fillRect(0, 0, w, h); }

const MORE = {
  unicorn: (g, w, h) => {
    skyGradient(g, w, h, ['#8e44ec', '#ff3fa4', '#ffb3e6']);
    sparkles(g, w, h, 22, 5); for (const [x, y, r] of [[.1, .15, 10], [.86, .2, 14], [.7, .1, 8]]) star(g, w * x, h * y, r);
    cloud(g, w * .28, h * .86, 46); cloud(g, w * .76, h * .9, 40);
    // The body, leaping: white, with a rainbow mane and tail.
    g.fillStyle = '#ffffff';
    g.beginPath(); g.ellipse(w * .5, h * .52, w * .2, h * .13, -.25, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(w * .62, h * .44); g.quadraticCurveTo(w * .7, h * .28, w * .74, h * .22); g.lineTo(w * .84, h * .26); g.quadraticCurveTo(w * .8, h * .34, w * .7, h * .5); g.fill();
    g.beginPath(); g.ellipse(w * .79, h * .25, w * .07, h * .06, .4, 0, Math.PI * 2); g.fill();
    g.lineWidth = 16; g.strokeStyle = '#ffffff'; g.lineCap = 'round';
    for (const [x0, y0, x1, y1] of [[.4, .6, .28, .78], [.45, .62, .38, .82], [.56, .58, .7, .74], [.6, .56, .76, .68]]) { g.beginPath(); g.moveTo(w * x0, h * y0); g.lineTo(w * x1, h * y1); g.stroke(); }
    g.fillStyle = '#ffe135'; g.beginPath(); g.moveTo(w * .8, h * .2); g.lineTo(w * .86, h * .02); g.lineTo(w * .84, h * .21); g.fill();
    RAINBOW.forEach((c, i) => {
      g.strokeStyle = c; g.lineWidth = 7;
      g.beginPath(); g.moveTo(w * (.72 - i * .012), h * (.2 + i * .03)); g.quadraticCurveTo(w * (.6 - i * .01), h * (.3 + i * .02), w * (.62 - i * .02), h * (.42 + i * .02)); g.stroke();
      g.beginPath(); g.moveTo(w * .31, h * (.5 + i * .02)); g.quadraticCurveTo(w * .16, h * (.42 + i * .03), w * .12, h * (.6 + i * .03)); g.stroke();
    });
    eyes(g, [[w * .8, h * .24]], 6);
    g.fillStyle = '#ff7fc4'; g.beginPath(); g.arc(w * .84, h * .29, 4, 0, Math.PI * 2); g.fill();
  },
  kittens: (g, w, h) => {
    skyGradient(g, w, h, ['#1ec8d8', '#7ed3ff', '#b98cff']);
    for (let k = 0; k < 9; k++) { g.fillStyle = RAINBOW[k % 6]; heart(g, w * ((k * .37) % 1), h * (.08 + (k % 4) * .12), 22); }
    sparkles(g, w, h, 16, 9);
    // The teacup, pink on a gold saucer.
    g.fillStyle = '#ffe135'; g.beginPath(); g.ellipse(w * .5, h * .9, w * .36, h * .06, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ff5fb4'; g.beginPath(); g.moveTo(w * .22, h * .58); g.quadraticCurveTo(w * .26, h * .9, w * .5, h * .9); g.quadraticCurveTo(w * .74, h * .9, w * .78, h * .58); g.fill();
    g.strokeStyle = '#ff5fb4'; g.lineWidth = 12; g.beginPath(); g.arc(w * .82, h * .7, h * .08, -Math.PI / 2, Math.PI / 2); g.stroke();
    for (let k = 0; k < 5; k++) { g.fillStyle = '#ffffff'; heart(g, w * (.3 + k * .1), h * .76, 12); }
    // Two kittens peeping over the rim: one pink and white, one grey.
    const kitten = (x, fur, inner) => {
      g.fillStyle = fur; g.beginPath(); g.arc(x, h * .5, h * .14, 0, Math.PI * 2); g.fill();
      for (const s of [-1, 1]) {
        g.fillStyle = fur; g.beginPath(); g.moveTo(x + s * h * .13, h * .44); g.lineTo(x + s * h * .15, h * .28); g.lineTo(x + s * h * .04, h * .38); g.fill();
        g.fillStyle = inner; g.beginPath(); g.moveTo(x + s * h * .12, h * .42); g.lineTo(x + s * h * .135, h * .32); g.lineTo(x + s * h * .07, h * .39); g.fill();
      }
      eyes(g, [[x - h * .055, h * .49], [x + h * .055, h * .49]], 8);
      g.fillStyle = '#ff7fc4'; g.beginPath(); g.moveTo(x - 5, h * .55); g.lineTo(x + 5, h * .55); g.lineTo(x, h * .57); g.fill();
    };
    kitten(w * .38, '#ffd1ea', '#ff7fc4'); kitten(w * .62, '#b8b8c8', '#ff9fd4');
    g.fillStyle = '#ffffff'; g.fillRect(w * .22, h * .57, w * .56, 8);
  },
  panda: (g, w, h) => {
    skyGradient(g, w, h, ['#7ed321', '#ffe135', '#ff8c1a']);
    sparkles(g, w, h, 18, 13); for (const [x, y] of [[.12, .18], [.88, .14], [.9, .6], [.08, .7]]) star(g, w * x, h * y, 14, '#ff3fa4');
    cloud(g, w * .5, h * .9, 70, '#ffffff');
    // A panda sitting on the cloud, holding a rainbow lollipop.
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(w * .5, h * .68, w * .17, h * .19, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1a1030'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(w * (.5 + s * .15), h * .66, w * .05, h * .1, s * .5, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(w * .5, h * .38, h * .16, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#1a1030';
    for (const s of [-1, 1]) { g.beginPath(); g.arc(w * .5 + s * h * .14, h * .25, h * .06, 0, Math.PI * 2); g.fill(); g.beginPath(); g.ellipse(w * .5 + s * h * .065, h * .37, h * .045, h * .06, s * .6, 0, Math.PI * 2); g.fill(); }
    eyes(g, [[w * .5 - h * .065, h * .37], [w * .5 + h * .065, h * .37]], 6);
    g.fillStyle = '#1a1030'; g.beginPath(); g.ellipse(w * .5, h * .44, 7, 5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ff7fc4'; for (const s of [-1, 1]) { g.beginPath(); g.arc(w * .5 + s * h * .1, h * .44, 6, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#ffffff'; g.fillRect(w * .66, h * .3, 5, h * .38);
    RAINBOW.forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 6; g.beginPath(); g.arc(w * .67, h * .24, 30 - i * 5, 0, Math.PI * 2); g.stroke(); });
  },
  cottage: (g, w, h) => {
    skyGradient(g, w, h, ['#6ad0ff', '#ffb3e6']);
    RAINBOW.forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 9; g.beginPath(); g.arc(w * .5, h * .95, w * .62 - i * 9, Math.PI, 0); g.stroke(); });
    sparkles(g, w, h, 18, 17);
    // The roof in stripes of every colour, from the eaves up.
    RAINBOW.forEach((c, i) => {
      const y0 = h * .38 * (1 - i / 6), y1 = h * .38 * (1 - (i + 1) / 6), x0 = w * .5 * (i / 6), x1 = w * .5 * ((i + 1) / 6);
      g.fillStyle = c; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(w - x1, y1); g.lineTo(w - x0, y0); g.fill();
    });
    g.fillStyle = '#ff5fb4'; g.fillRect(0, h * .38, w, h * .62);
    g.fillStyle = '#ff9fd4'; for (let y = 0; y < 6; y++) g.fillRect(0, h * (.44 + y * .09), w, 3);
    for (const x of [.24, .76]) { g.fillStyle = '#6ad0ff'; heart(g, w * x, h * .6, 40); g.fillStyle = '#ffffff'; g.fillRect(w * x - 2, h * .5, 4, h * .16); }
    g.fillStyle = '#1ec8d8'; g.beginPath(); g.moveTo(w * .4, h); g.lineTo(w * .4, h * .74); g.arc(w * .5, h * .74, w * .1, Math.PI, 0); g.lineTo(w * .6, h); g.fill();
    g.fillStyle = '#ffe135'; g.beginPath(); g.arc(w * .56, h * .86, 6, 0, Math.PI * 2); g.fill();
    for (let k = 0; k < 8; k++) { g.fillStyle = RAINBOW[k % 6]; g.beginPath(); g.arc(w * (.06 + k * .126), h * .96, 10, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffe135'; g.beginPath(); g.arc(w * (.06 + k * .126), h * .96, 4, 0, Math.PI * 2); g.fill(); }
    // A kitten in the window, obviously.
    g.fillStyle = '#ffd1ea'; g.beginPath(); g.arc(w * .76, h * .63, 14, 0, Math.PI * 2); g.fill(); eyes(g, [[w * .76 - 6, h * .62], [w * .76 + 6, h * .62]], 4);
  },
  bakery: (g, w, h) => {
    skyGradient(g, w, h, ['#ffe135', '#ffb3e6']);
    sparkles(g, w, h, 14, 21);
    // A roof of pink frosting dripping over the eaves, sprinkles, and a cherry on top.
    g.fillStyle = '#ff7fc4'; g.beginPath(); g.moveTo(0, h * .38); g.lineTo(w / 2, 0); g.lineTo(w, h * .38); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, h * .36);
    for (let k = 1; k <= 10; k++) { const x = w * k / 10; g.quadraticCurveTo(x - w * .05, h * (.46 + (k % 2) * .05), x, h * .38); }
    g.lineTo(w, h * .34); g.lineTo(0, h * .34); g.fill();
    for (let k = 0; k < 34; k++) {   // sprinkles, scattered evenly over the frosting (an R2 sequence), each at its own angle
      const fy = .1 + ((k * .5698) % 1) * .22, half = .5 * fy / .38 * .8, x = w * (.5 + (((k * .7549) % 1) - .5) * 2 * half), y = h * fy;
      g.save(); g.translate(x, y); g.rotate(k * 1.3); g.fillStyle = RAINBOW[k % 6]; g.fillRect(-5, -2, 10, 4); g.restore();
    }
    g.fillStyle = '#d4122e'; g.beginPath(); g.arc(w / 2, h * .05, 12, 0, Math.PI * 2); g.fill();
    // Walls of cake, a candy-cane doorway, gumdrop windows, and the sign.
    g.fillStyle = '#f5d3a0'; g.fillRect(0, h * .44, w, h * .56);
    g.fillStyle = '#ff9fd4'; g.fillRect(0, h * .66, w, h * .05); g.fillStyle = '#ffffff'; g.fillRect(0, h * .71, w, h * .02);
    for (const x of [.36, .64]) for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#ffffff' : '#ff3050'; g.fillRect(w * x - 6, h * (.74 + k * .033), 12, h * .033); }
    g.fillStyle = '#8e44ec'; g.fillRect(w * .4, h * .74, w * .2, h * .26);
    for (const [x, c] of [[.18, '#7ed321'], [.82, '#1ec8d8']]) { g.fillStyle = c; g.beginPath(); g.arc(w * x, h * .56, 26, Math.PI, 0); g.lineTo(w * x + 26, h * .62); g.lineTo(w * x - 26, h * .62); g.fill(); }
    g.fillStyle = '#8e44ec'; g.font = '600 28px Georgia, serif'; g.textAlign = 'center'; g.fillText('CAKES', w / 2, h * .62);
  },
  birdhouse: (g, w, h) => {
    skyGradient(g, w, h, ['#1ec8d8', '#7ed321']);
    sparkles(g, w, h, 16, 27);
    // A violet roof, shingled; a turquoise house; a round door, and a toucan with a rainbow beak peeping out.
    g.fillStyle = '#8e44ec'; g.beginPath(); g.moveTo(0, h * .38); g.lineTo(w / 2, 0); g.lineTo(w, h * .38); g.fill();
    g.strokeStyle = '#b98cff'; g.lineWidth = 4; for (let k = 1; k < 6; k++) { const y = h * .38 * k / 6, half = w / 2 * k / 6; g.beginPath(); g.moveTo(w / 2 - half, y); g.lineTo(w / 2 + half, y); g.stroke(); }
    g.fillStyle = '#1ec8d8'; g.fillRect(0, h * .38, w, h * .62);
    g.fillStyle = '#6ad0ff'; for (let k = 0; k < 7; k++) g.fillRect(w * (.06 + k * .145), h * .38, 4, h * .62);
    for (let k = 0; k < 6; k++) { g.fillStyle = ['#ff3fa4', '#ffe135', '#ffffff'][k % 3]; heart(g, w * (.12 + (k % 3) * .38), h * (.82 + Math.floor(k / 3) * .1), 16); }
    g.fillStyle = '#ffe135'; g.fillRect(w * .4, h * .8, w * .2, 8);
    g.fillStyle = '#1a1030'; g.beginPath(); g.arc(w / 2, h * .6, w * .16, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(w * .47, h * .6, w * .08, 0, Math.PI * 2); g.fill();
    eyes(g, [[w * .49, h * .57]], 7);
    RAINBOW.forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.moveTo(w * .53, h * (.575 + i * .012)); g.quadraticCurveTo(w * .72, h * (.58 + i * .014), w * .84, h * (.62 + i * .012)); g.lineTo(w * .53, h * (.59 + i * .012)); g.fill(); });
  },
};

/** Every board she has painted, in the order they hang; `shape` 'house' is cut like a house. */
export const BOARD_PAINTINGS = Object.freeze({
  leopard: Object.freeze({ title: 'A leopard, but rainbow', shape: 'board', draw: PAINTINGS.leopard }),
  bear: Object.freeze({ title: 'A little bear in a heart, with a star on its nose', shape: 'board', draw: PAINTINGS.bear }),
  dolphin: Object.freeze({ title: 'A pink dolphin jumping a rainbow', shape: 'board', draw: PAINTINGS.dolphin }),
  unicorn: Object.freeze({ title: 'A unicorn, because Drent hasn’t got one', shape: 'board', draw: MORE.unicorn }),
  kittens: Object.freeze({ title: 'Two kittens in a teacup', shape: 'board', draw: MORE.kittens }),
  panda: Object.freeze({ title: 'A panda with a lollipop, on a cloud', shape: 'board', draw: MORE.panda }),
  cottage: Object.freeze({ title: 'Tidehaven, the way it ought to be', shape: 'house', draw: MORE.cottage }),
  bakery: Object.freeze({ title: 'Lysa’s bakery, if it were made of cake', shape: 'house', draw: MORE.bakery }),
  birdhouse: Object.freeze({ title: 'A birdhouse for a bird that deserves one', shape: 'house', draw: MORE.birdhouse }),
});
export const BOARD_IDS = Object.freeze(Object.keys(BOARD_PAINTINGS));
/** Canvas sizes: a board is landscape; a house is portrait, its roof the top 38 per cent. */
export const BOARD_CANVAS = Object.freeze({ board: Object.freeze([384, 288]), house: Object.freeze([320, 384]) });
export const HOUSE_EAVES = .38;
/** The outline of a house-shaped board on a w by h canvas: a wall, and a pitched roof down to the eaves. */
export function housePath(g, w, h) { g.beginPath(); g.moveTo(0, h * HOUSE_EAVES); g.lineTo(w / 2, 0); g.lineTo(w, h * HOUSE_EAVES); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); }
