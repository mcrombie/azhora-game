# Integration, 5 October 2026: Ibenal, Henborth and the city of Mithala

The user asked Claude to integrate, merge and commit. This branch, `integrate-2026-10-05`, starts from Codex's corrected
review base `cde8649` (`codex/region-review-2026-10-04`, which carries the reviewed Celders, East Izol and corrected
Alezhor) and replays Claude's later deliveries onto it as narrow commits, in order:

| delivery | original | integrated |
| --- | --- | --- |
| South and North Ibenal (65, 66) | `30afeaf`, `7fb3ce1`, `452d7d9`, `ec6ec44` | `ee06881`, `954554e`, `7b5b768`, `60aedc9` |
| Henborth (67) | `9330c3e`, `b5ff29a`, `fbdc0b0` | `c5a4dac`, `c9a68f5`, `5245c5f` |
| The city of Mithala | `3bef366` … `9b690c1` (seven commits) | `e58a43a`, `0929921`, `6e0878b`, `de2aec2`, `912b966`, `85b6bd6`, `284b8bb` |

The raw Celder, East Izol and Alezhor commits on Claude's branches are **not** brought in: Codex's integrated versions are
the base. `main` is not moved by this branch; see "Main" below.

## Ports onto the corrected base

- **Ibenal river ground.** Codex replaced the separate refinement passes with one shared pass for the forest and its
  coastal outlets (`src/ibenwood-alezhor-ground.js`). The Ibenals' streams join it: `IBENWOOD_ALEZHOR_GROUND_REGIONS`
  gains 65 and 66, the coast index is `combinedRiverIndex(alezhorRiverIndex(), ibenalRiverIndex())`, and the Ibenals'
  scenery reads `forestRenderedGround`. The original branch's `ibenalRiverGround` pass and `nearRefinedRiver` are not
  restored. The refinement's height memo and `reach` parameter (`7fb3ce1`) carry over and serve the shared pass.
- **Henborth** is registered beside the ported Ibenals; **the city's** build step follows Codex's separated Mithala water
  and plain steps.

## Reviewed compositions preserved exactly (the user's choice)

Registering a neighbour changed three reviewed compositions. Each is now held to its reviewed identity, and the
newcomer adapts:

1. **Alezhor** (392 trees, 92 batches, 16,210 instances, hash `f54da8…`, as `docs/region-briefs/south-ibenal-environment.md`
   item 6 requires). Two causes: `regionAt` lends a built country's name across the shore fringe to unclaimed ground,
   and the Ibenals' layers changed the ground on that fringe. Alezhor's scatter now asks `alezhorScatterOwns`
   (`regionAtWithout` the Ibenals) and its legacy eligibility reads the ground `withoutIbenalLayers`. The Ibenals keep
   `outland`'s profile, so with their layers out their hexes are exactly the ground the fringe was planted on.
   `alezhor-bank-review` 3/3 and `alezhor-integration-review` 5/5.
2. **North Celder** (`tests/fixtures/celder-delivered-identities.json`). Same two causes from Henborth: its scatter asks
   `northCelderScatterOwns` (`regionAtWithout` Henborth), and `legacyCelderGroundHeight` is measured with Henborth's
   layer left out. The trees still stand on the live ground. `celder-routes-review` 6/6.
3. **The Mithala plain** (`tests/mithala-scenery-review.test.js`, hash `9ef91a92…`). The city's hex trade reordered the
   cells the plain's sapling pass walks from one seeded stream; that pass now walks East and North Mithala as they were
   (`cellsBeforeMithalaTrade`). The city then lifts what stands on its own ground and records each lifted instance's
   original matrix (`userData.liftedByMithalaCity`). The review restores them and gets the reviewed hash back; each lifted
   instance stood on the city's reserved ground. 1,551 instances are lifted; every other instance of the plain is the
   reviewed one.

**For review:** the preserved fringes mean Alezhor's border scatter still stands on a strip of South Ibenal's hexes, and
North Celder's (three trees and grass) on a strip of Henborth's, as they did before those countries existed. Thinning the
newcomers' own scatter on those strips, or retiring the fringe in a reviewed change, is left to the reviewer.

## Main

`main` (local and `origin/main`) is `a2e49c3`. The main checkout has Codex's mirror of `cde8649` and other work
uncommitted (86 modified, 155 new paths). Moving `main` under it would scramble that checkout, so this branch is not
fast-forwarded into `main` here. Once that working copy is committed or set aside by its owner, `main` fast-forwards to
`cde8649` and then to this branch with no conflicts. Nothing is pushed.
