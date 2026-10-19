# Keynote for iCloud parity evidence

Captured on 2026-10-19 from the user-authorized, authenticated Chrome session and from the running local KeyNot editor.

| File | Source | Purpose |
|---|---|---|
| `keynote-magic-move.png` | Keynote for iCloud | Live Magic Move inspector: duration, unmatched-object fade, object/word/character matching, acceleration, and start mode. |
| `keynote-transitions.txt` | Keynote for iCloud accessibility tree | Transition gallery labels and enabled/disabled group entries. |
| `keynote-data-menu-styles.json` | Keynote for iCloud computed DOM styles | Visible toolbar, inspector tabs, inspector panel, and Data select dimensions and CSS values. |
| `keynote-ui-contract.json` | Normalized from live observations | Machine-readable toolbar, submenu, theme, inspector, table, transition, and design-token contract for implementation. |
| `current-table-inspector.png` | local KeyNot at `127.0.0.1:5173` | Current table inspector baseline. |

The JSON contains computed styles only. Apple’s generated class names are evidence selectors and must not be copied into the implementation. Use the semantic tokens in [`KEYNOTE_WEB_PARITY_AND_TRANSPLANT_SPEC.md`](../KEYNOTE_WEB_PARITY_AND_TRANSPLANT_SPEC.md).

## Runtime archive experiment

The experiment used `public/samples/research-transdeck.key`:

- imported 20 slides, 27 IWA files, and 1001 protobuf objects;
- changed the first element’s horizontal position by 137 units;
- exported through `buildKeynoteArchiveBlob()` with the retained source archive;
- compared every original and exported `.iwa` entry;
- result: 27 of 27 IWA files were byte-identical;
- `Metadata/slate-model.json` contained the KeyNot edits;
- a new synthesized export without that sidecar reimported as one fallback slide with zero native objects.

This evidence invalidates the current test’s interpretation of private-sidecar reimport as Apple Keynote round-trip compatibility. It does not invalidate source preservation or the usefulness of the KeyNot-native sidecar.

## Live surfaces captured in notes

- editor toolbar roles and accessible names;
- View submenu;
- Tools submenu;
- download choices;
- theme chooser categories and theme names;
- transition gallery;
- Magic Move inspector;
- table insertion presets;
- whole-table Table/Arrange tabs;
- cell-selected Table/Cell/Data/Arrange tabs;
- Cell controls;
- Data format submenu values;
- computed CSS values for toolbar buttons, inspector tabs/panel, and select control.

The disposable cloud document created for the audit is named **KeyNot Parity Audit 2026-10-19**. It contains a Basic White slide, a Magic Move setting, and one inserted table. It was kept so the observations can be reproduced without altering the user’s existing presentation.
