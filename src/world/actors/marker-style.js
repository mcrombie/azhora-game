// Marker appearance only. Character geometry must not import quest state or rules.
const style = (kind, shape, scale, colour, emissive, ring, ringEmissive, what) =>
  Object.freeze({ kind, shape, scale, colour, emissive, ring, ringEmissive, what });

export const MARKER_STYLE = Object.freeze({
  main: style('main', 'diamond', 1, 0xf3c46a, 0xc17f24, 0xffeac1, 0xe5be70,
    'The road the game is about: the next thing that moves the story on.'),
  plot: style('plot', 'diamond', 1, 0xe7e3d1, 0x8e97a4, 0xf6f3e6, 0xa9b0ba,
    'A story of its own, with its own beginning and its own end.'),
  deed: style('deed', 'diamond', 1, 0xc87a3c, 0x8a4a18, 0xe6a163, 0xa65e22,
    'A small good deed: it changes the world and does not move the plot.'),
  skill: style('skill', 'book', 1, 0x9ed079, 0x46813a, 0xd6ecb8, 0x6aa456,
    'Somebody who will teach you something, or an errand that pays a skill.'),
  magic: style('magic', 'book-sparkle', 1, 0xbd8cf0, 0x7440a9, 0xf2ddff, 0xb87be2,
    'A magic teacher whose quest can earn a new spell, or an earned lesson still available.'),
  'skill-locked': style('skill-locked', 'book-lock', 1, 0x879986, 0x334236, 0xb1bcaa, 0x526450,
    'A teacher whose lesson requires more experience in another skill.'),
});

