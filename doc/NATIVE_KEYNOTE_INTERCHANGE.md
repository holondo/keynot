# Native Keynote interchange status

The exporter writes native IWA records and assets for supported edits. A private
model bridge preserves additional KeyNot state; native round-trip tests remove
that bridge before importing the result.

Supported paths include slide creation, duplication, order and skip flags;
text and vector creation; rich text and appearance edits; image insertion and
replacement; object copying, deletion and grouping; presenter notes; existing
table cell and chart data edits; native transitions and build ordering/timing.
The galleries retain native effect IDs. Browser playback approximates some
Apple effects and does not establish visual equivalence.

Unsupported edits are identified in the export report. Remaining gaps include
new native tables/charts/video/audio, full motion paths, image masks and filters,
advanced text layout, table dimensions and formatting, and exact Apple rendering.
Edited nested groups use the editor's flat grouping model.

## Verification

- `npm test`: type checking and focused regression suites, including 35 native
  interchange checks and 5 transition checks.
- `npm run build`: production compilation.
- `npm run test:ui`: deterministic browser interactions against the local app
  (requires the Vite server, default http://127.0.0.1:5173/).
- `node --experimental-strip-types scripts/create-native-keynote-showcase.ts`:
  regenerates the native showcase and its export report.
- `scripts/verify-keynote-native.py`: optional independent protobuf required-field
  validation; see its command-line help for descriptor input.

Generated decks and reports are under `doc/parity-evidence/`. Fixtures and the
native seed retain their KeynoteKit license notices. Schema and fixture checks
are not proof of opening or rendering in Apple Keynote. Apple-side validation
remains pending; no user file has been uploaded to iCloud by this work.
