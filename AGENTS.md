# Private manuscript reference

`reference-private/` contains confidential, unfinished author material for reading only.
After initial setup, do not edit, replace, rename, move, delete, or re-extract manuscript
snapshots without explicit author authorization. Consult relevant passages when requested;
access does not authorize importing the entire novel into the game. Distinguish source
facts, interpretations, and new inventions. Keep adaptations separate; never make the
novel conform to game mechanics, geography, or history. Keep reference material and
derivatives out of Git, HTTP serving, packages, and runtime dependencies. Report missing
material rather than inventing it. Detailed reading notes and quotations stay private.
Do not reproduce manuscript passages in public instructions.

# Source organization

Read `docs/architecture/README.md` for source responsibilities. Keep new files in
their feature's folder rather than returning to the flat `src` layout. The three
retained top-level JavaScript files are assembly/entry points; prefer feature-owned
implementation over expanding their inline subsystems.

Keep file moves separate from behavioral refactors. Update imports, asset paths,
dynamic readers, test sweeps and explicit server allowlists when moving modules.
Run `npm run check:layout` and relevant model/native checks. Source-wide tests must
scan recursively so moving modules cannot silently reduce coverage.

`src/simulation/` is reserved for a future independent campaign core. The authored
campaign and frontier experiment are not that core. Keep their status explicit.
Do not include `reference-private/` or its contents in indexes or backup tooling.
