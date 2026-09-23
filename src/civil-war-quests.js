/**
 * The silver regional quest series. This is a content registry, not a province
 * conquest table: resolving one of these quests never changes campaign control.
 * Only `premise` is suitable for an undiscovered quest's journal entry. The
 * route descriptions below are author-facing plans, including hidden solutions.
 */
export const CIVIL_WAR_SERIES = Object.freeze({
  id: 'ambroni-civil-war', title: 'Ambroni Civil War', grade: 'plot',
});

const entry = (id, region, title, premise, republican, monarchist, mediation, extra = {}) => Object.freeze({
  id, region, title, status: 'planned', premise,
  routes: Object.freeze({ republican, monarchist, mediation }),
  ...extra,
});

export const CIVIL_WAR_REGIONS = Object.freeze([
  entry('civil-war-vastos', 'Vastos', 'The Common Water',
    'A scattered herd and a damaged watering place have brought the seasonal camp to a halt. Help the herders put the crossing back into use.',
    'Post a witnessed route-right notice: seasonal access is protected by the local assembly, with public consent required for future requisitions.',
    'Accept a limited levy: the local royal officer provides crossing protection under a recorded ceiling on cattle and supply demands.',
    'Recover the old watering covenant, hear the herder, and learn both delegates\' needs; secure a concession from each before settling a jointly witnessed camp compact.',
    { status: 'playable', reward: Object.freeze({ item: 'salt-beef', count: 2 }) }),
  entry('civil-war-meneth', 'Meneth', 'The Junction Ledger',
    'Conflicting freight seals have stopped the valley relays. Carters need one account of which loads have already paid.',
    'Have elected relay witnesses replace competing toll seals with a published valley freight ledger.',
    'Restore a royal transit warrant that funds the relay keepers in exchange for a fixed passage due.',
    'Compare the old relay tallies and persuade both collectors to honor a transferable receipt, with the valley keepers auditing it.'),
  entry('civil-war-caricas', 'Caricas', 'The Uncut Bank',
    'A proposed military timber cut would strip the wooded Carica bank. The river keepers need the marked boundary checked.',
    'Place the riverside woodland under a local petition and civilian cutting permit.',
    'Obtain a protected-bank order while supplying the royal timber claim from an agreed upland stand.',
    'Trace the flood marks with the fox keepers, then trade a ban on bank cutting for a measured delivery from managed woodland.'),
  entry('civil-war-moros', 'Moros Plain', 'The Weight of Grain',
    'Two provisioning agents have counted the same granary twice. The threshers want their household reserve measured before the wagons leave.',
    'Establish an open granary count and let the growers\' delegates authorize surplus purchases.',
    'Validate an army supply warrant after striking duplicate demands and recording a household reserve.',
    'Recover the independent scales record and secure a shared purchase schedule that leaves seed and winter grain beyond either requisition.'),
  entry('civil-war-nesdor', 'Nesdor', 'Where the Ferry Waits',
    'Families and pack trains are stranded where the shallow tributaries meet. Rival passes leave the ferry keeper unable to carry either queue.',
    'Give a travelers\' committee authority to issue a single civilian ferry pass.',
    'Reopen the crossing under a royal safe-conduct with a stated civilian passage hour.',
    'Find the flood-season landing agreement, then exchange recognition of both passes for an independently witnessed civilian priority queue.'),
  entry('civil-war-luscia', 'Luscia', 'Names at the Lauvel',
    'After the battle, names on a detention roll no longer match the people missing from the Lauvel households.',
    'Put civilian testimony before a local hearing and release those held only for their households\' politics.',
    'Require an officer to correct the muster and detention rolls and answer for men held without an order.',
    'Match burial witnesses with the surviving rolls; secure supervised releases and a shared missing-person register without demanding either side recant its dead.'),
  entry('civil-war-peblos', 'Peblos', 'The Pilot Lights',
    'Unlit approach beacons have left food boats waiting outside the bars. Pilots disagree over whose signal they can safely answer.',
    'Place the beacon watch under the island pilots\' elected harbor council.',
    'Restore naval protection of the lights under a warrant that pays local pilots and respects their channel knowledge.',
    'Find the old rescue signal book and win reciprocal recognition of a neutral rescue light in return for inspected civilian cargoes.'),
  entry('civil-war-pueth', 'Pueth', 'A Winter of Tallies',
    'Timber obligations and recruiting lists have fallen on the same northern households just before the fishing crews depart.',
    'Let the timber and fishing households publish their own seasonal service limits.',
    'Negotiate a royal supply contract that substitutes delivered timber for a fixed portion of winter military service.',
    'Reconstruct earlier paid deliveries and persuade both collectors to cancel duplicate obligations against a witnessed winter labor calendar.'),
  entry('civil-war-feradom', 'Feradom', 'The Pass Lord\'s Bond',
    'A guarded pass has closed over a disputed hostage bond. The waiting caravans cannot outlast the first snow.',
    'Replace the personal bond with a pass charter witnessed by the neighboring communities.',
    'Confirm the local lord\'s limited pass authority in return for the hostage\'s release and a fixed toll.',
    'Trace the original guarantors and exchange the hostage bond for reciprocal guarantees held by the pass communities.'),
  entry('civil-war-amod', 'Amod', 'The Terrace Measure',
    'A garrison supply demand has reached the water court during the last irrigation turn. The terraces cannot spare an unmeasured diversion.',
    'Have the water court publicly limit military withdrawals under the Terrace Compact.',
    'Record the royal claim as a measured supply allotment subordinate to existing terrace turns.',
    'Recover the older channel measurements and secure labor to repair a leaking branch in exchange for a strictly seasonal garrison share.'),
  entry('civil-war-east-lotharn', 'East Lotharn Mountains', 'The Bell Between Valleys',
    'Two valley watches answer different alarm bells. A blocked pass has exposed the cost of that disagreement.',
    'Form a valley watch council that chooses its own alarm keepers and patrol obligations.',
    'Recognize a royal pass captain whose watch orders must preserve each valley\'s home guard.',
    'Follow the older signal chain and persuade both watches to share an emergency bell while keeping separate command of their own patrols.'),
  entry('civil-war-west-lotharn', 'West Lotharn Mountains', 'The Shelter Roll',
    'Refugees from the mountain fighting have filled a pass shelter. Competing escorts disagree over who may leave and what supplies travel with them.',
    'Put the shelter roll and voluntary departures under elected refugee and valley witnesses.',
    'Obtain a protected evacuation warrant with a named officer accountable for food and safe passage.',
    'Establish the shelter\'s old refuge terms, then exchange an inspected supply inventory for unarmed civilian passage accepted by both escorts.'),
  entry('civil-war-drent', 'Drent', 'The Harbor Account',
    'River-mouth households dispute an emergency harbor due. A missing account leaves the coastal boats waiting for clearance.',
    'Open the harbor accounts to household delegates and require their consent for the emergency due.',
    'Secure a corrected warrant from the Lord Protector with a published end date for the due.',
    'Reconcile the river and harbor copies, then exchange a short, audited collection period for cancellation of duplicate charges.'),
  entry('civil-war-elagos', 'Elagos', 'The Narrows Petition',
    'At Ambron, a petition about lake ferries has stalled between the new constitutional offices and the old royal clerks.',
    'Have the constitutional assembly hear the ferry households and publish a binding answer.',
    'Obtain a royal household guarantee of service and retain the clerks under a named accountable steward.',
    'Recover the ferry charter and obtain a jointly registered ruling that gives petitioners an appeal while retaining experienced lake clerks.'),
]);

/** Accept the short lore name without creating a second quest for the Moros. */
export function civilWarRegion(name) {
  if (typeof name !== 'string') return null;
  const key = name.trim().toLowerCase().replace(/\s+/g, ' ');
  const canonical = key === 'moros' ? 'moros plain' : key;
  return CIVIL_WAR_REGIONS.find(item => item.region.toLowerCase() === canonical || item.id === canonical) ?? null;
}
