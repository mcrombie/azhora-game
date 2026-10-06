/** Sylvia's gentle introduction to invasive plants. Later forest varieties can
 * share this vocabulary without making the Drent lesson dangerous. */
export const IVY_VARIETIES = Object.freeze({
  drent: Object.freeze({
    id: 'drent', name: 'Drent ivy', level: 1, clearSeconds: 2, hostile: false,
    description: 'A shallow-rooted creeper. Pull its runners by hand; it cannot attack.',
  }),
});

// All four stands are outside the cottage footprint, with the southern studio
// and Sylvia's narrow approach left open. Spreads describe the sprawling plant,
// rather than a solid obstacle: ivy never introduces invisible collision walls.
export const IVY_PATCHES = Object.freeze([
  { id: 'sylvia-ivy-west', name: 'Ivy beside the west wall', x: -509.15, z: 24.05,
    stand: { x: -510.6, z: 24.5 }, spreadX: .83, spreadZ: 1.35, stakeHeight: .9, yaw: .3 },
  { id: 'sylvia-ivy-north', name: 'Ivy behind the cottage', x: -505.7, z: 20.1,
    stand: { x: -505.7, z: 18.5 }, spreadX: 1.4, spreadZ: 1.05, stakeHeight: .75, yaw: -.2 },
  { id: 'sylvia-ivy-east', name: 'Ivy beside the east wall', x: -500.8, z: 24.3,
    stand: { x: -499.15, z: 24.3 }, spreadX: .84, spreadZ: 1.2, stakeHeight: 1.1, yaw: -.4 },
  { id: 'sylvia-ivy-woodland', name: 'Ivy at the woodland edge', x: -497.25, z: 27.6,
    stand: { x: -495.65, z: 28.1 }, spreadX: 1.25, spreadZ: 1.1, stakeHeight: .62, yaw: .6 },
].map(patch => Object.freeze({ ...patch, variety: 'drent', stand: Object.freeze(patch.stand) })));
