# KeyNot: Keynote for iCloud Parity and UI Transplant Specification

**Status:** implementation plan and verified audit  
**Audit date:** 2026-10-19  
**Target:** the KeyNot Vue 3 editor in this repository  
**Reference product:** Keynote for iCloud in authenticated Google Chrome, supplemented by the Apple Keynote for iCloud user guide  
**Native reference:** the supplied macOS Keynote screenshot is a secondary visual reference, not the web parity contract

## 1. Outcome and boundaries

KeyNot should reproduce the working model of Keynote for iCloud: a compact document toolbar, contextual inspectors, complete object editing, presentation playback, document management, and honest Keynote interchange. Existing KeyNot capabilities that exceed the web reference remain first-class features: offline-first local projects, AI deck generation, explicit cross-slide object matching, action-build authoring, LaTeX, custom vector drawing, and a compatibility report.

“Parity” is measured as observable behavior, not as visual resemblance alone. A control is complete only when it:

1. appears in the correct selection context;
2. has the same enabled/disabled rules;
3. mutates a persistent model rather than component-local state;
4. renders identically in the editor and player;
5. participates in undo/redo and project persistence;
6. imports and exports with an explicit fidelity result where the format supports it;
7. is keyboard and screen-reader operable.

This plan does not copy Apple JavaScript, private assets, internal class names, or source CSS. It transplants the observed information architecture, interaction semantics, dimensions, and computed design values into KeyNot’s own Vue components and design tokens.

### Explicit exclusions

- Apple Account, iCloud Drive, Box, and Apple-specific identity infrastructure;
- platform-only services such as Continuity Camera and native media browsers;
- paid or promotional product surfaces;
- native macOS menu-bar integration;
- exact implementation of effects that cannot be reproduced safely and consistently in browsers; these require a documented approximation;
- claims of “100% Keynote compatibility” without Apple-open validation evidence.

## 2. Evidence and confidence rules

Every matrix entry must use one of these evidence labels:

| Label | Meaning |
|---|---|
| `LIVE` | Observed directly in the authenticated Keynote for iCloud editor on 2026-10-19. |
| `APPLE` | Described in Apple’s current Keynote for iCloud user guide. |
| `CODE` | Verified in this repository’s source or running local editor. |
| `RUN` | Verified with an actual local runtime or archive experiment. |
| `INFERRED` | A proposed implementation derived from the evidence; not a statement about Apple internals. |

Raw evidence lives in [`doc/parity-evidence`](parity-evidence/README.md). The screenshots and computed values are reference measurements, not assets to ship.

## 3. Critical audit findings

### 3.1 The current `.key` compatibility result is not an Apple round trip

`src/utils/keynoteImporter.ts` decodes Snappy-framed IWA streams and can reconstruct a subset of slides. That is useful groundwork. The current exporter does not yet write edited scene values back to Apple-native protobuf records:

- when a source `.key` exists, `buildKeynoteArchiveBlob()` retains its IWA entries and adds `Metadata/slate-model.json`;
- when no source exists, it creates minimal `Document.iwa` and `Slide.iwa` payloads plus the private sidecar;
- the verification script reimports the private sidecar, so it proves KeyNot-to-KeyNot restoration rather than Apple Keynote compatibility.

The real fixture experiment changed an element position, exported it, and compared all native IWA entries. All **27 of 27** IWA entries were byte-identical after the edit. After removing `Metadata/slate-model.json` from a newly synthesized export, the importer found zero native objects and produced one fallback slide. This is `RUN` evidence that current “92% export round-trip” and similar claims are not valid Apple compatibility metrics.

Required product correction:

- rename the current route to **KeyNot project data embedded in a `.key` container** until native writing is implemented;
- replace fixed scores with measurements tied to individual objects and features;
- never label a feature preserved because the source bytes were retained while the user’s edit was only written to private metadata;
- validate exported files by opening them in Apple Keynote for iCloud or native Keynote and comparing the Apple-rendered result.

### 3.2 Several current inspector controls are visual facsimiles

The table inspector demonstrates the difference between appearance and behavior:

- Title and Caption are component-local `ref()` values and are not part of `PPTTableElement`;
- Table Font Size buttons only show a toast using a hard-coded starting size;
- Gridlines reduce all choices to one outer `outline` property;
- header and footer counts collapse to booleans;
- the Cell alignment controls change only local `textAttrs` state;
- cell fill is applied to every cell rather than the selected cell range;
- there is no Data tab or typed cell model;
- Fit operations use fixed arithmetic instead of measured content.

These controls must not be counted as parity until their model, canvas, persistence, undo, and export paths are connected.

### 3.3 Magic Move is ahead in one area and incomplete in another

KeyNot already provides explicit continuity IDs, link/unlink controls, match analysis, and WAAPI playback. This is a useful advantage over the less explicit Keynote UI. Live Keynote for iCloud offers Magic Move with:

- duration;
- Fade Unmatched Objects;
- Match by Object, Word, or Character;
- acceleration;
- transition start on click or automatically.

KeyNot’s `SlideTransitionConfig.textMatchMode` stores object/word/character, but `src/utils/magicMove.ts` currently animates whole DOM nodes only. Transition start mode is not in `SlideTransitionConfig`. The UI must keep the match inspector while implementing the actual text granularity and start semantics.

### 3.4 The application shell is simplified in the wrong places

The running local editor is visually coherent but its top “File / Themes / AI Studio / Shortcuts” items are direct actions, not full desktop-style menus. Keynote for iCloud uses a compact icon toolbar and places document operations in the tools menu, while object settings live in a contextual right inspector. KeyNot should retain its branded header and AI entry point, but expose the full command set through real menus with keyboard shortcuts, disabled states, nested menus, and one shared command registry.

## 4. Live Keynote for iCloud shell contract

### 4.1 Document header

Observed `LIVE` structure:

- Back to presentations;
- editable document title;
- save activity near the title;
- account/help region;
- 28 px compact toolbar controls;
- View menu;
- zoom menu;
- Undo and Redo, including disabled state;
- Play;
- Table, Chart, Text, Shape/Line, Media;
- Comment;
- Collaborate;
- Tools;
- Format inspector toggle;
- Animate inspector toggle.

KeyNot mapping:

| Keynote surface | Current KeyNot source | Required action |
|---|---|---|
| Document title and save status | `src/views/Editor/EditorHeader/index.vue` | Keep, reduce visual competition, make status accessible. |
| View and zoom | `src/views/Editor/CanvasTool/index.vue` | Keep; back with command registry and complete submenu states. |
| Insert controls | `src/views/Editor/CanvasTool/index.vue` | Keep capability, align grouping and context behavior. |
| Format/Animate/Document modes | `src/views/Editor/Toolbar/index.vue` | Preserve modes; make tabs fully selection-driven. |
| Tools/download/version/password/preferences | partial export/menu actions | Add complete command surfaces. |
| AI Studio | KeyNot-specific | Keep as a separate visually distinct command. |

### 4.2 View submenu

Observed `LIVE` commands:

- Hide/Show Slide Navigator;
- Show Find & Replace;
- Show Presenter Notes;
- Hide/Show Comments.

KeyNot may add Light Table, Object List, and Rulers because they are useful existing features. Reference commands remain at the top; extensions go in a labeled KeyNot section.

### 4.3 Tools submenu

Observed `LIVE` commands:

- Download a Copy…;
- Print;
- Browse All Versions…;
- Go to My Presentations;
- Set Password…;
- Preferences….

Required KeyNot equivalents:

- Download a Copy: KeyNot project, PDF, PowerPoint, and Keynote status-aware export;
- Print: print/PDF layout with speaker-note options;
- Browse All Versions: persistent per-project version timeline and preview;
- All Presentations: existing local workspace;
- Set Password: encrypted KeyNot project export and/or local project lock, with a clear scope statement;
- Preferences: editing, guides, autosave, playback, accessibility, and default export preferences.

### 4.4 Download format dialog

Observed `LIVE` choices are Keynote, PDF, and PowerPoint. KeyNot should show:

- **KeyNot Project** — lossless native project format;
- **PowerPoint** — editable with a generated fidelity report;
- **PDF** — rendered output;
- **Keynote** — only labeled Apple-compatible for the subset validated by Apple; otherwise explicitly labeled experimental or embedded-project container.

## 5. Contextual inspector state machine

Inspector tabs must come from selection state, not ad hoc component checks.

```ts
export type InspectorSelection =
  | { kind: 'slide'; slideIds: string[] }
  | { kind: 'text'; elementIds: string[]; editingText: boolean }
  | { kind: 'shape'; elementIds: string[]; editingText: boolean }
  | { kind: 'image'; elementIds: string[] }
  | { kind: 'table'; elementId: string }
  | { kind: 'tableRange'; elementId: string; range: CellRange }
  | { kind: 'chart'; elementIds: string[] }
  | { kind: 'media'; elementIds: string[] }
  | { kind: 'line'; elementIds: string[] }
  | { kind: 'multi'; elementIds: string[]; commonCapabilities: CapabilityKey[] };

export interface InspectorTabDescriptor {
  id: string;
  label: string;
  component: Component;
  enabled: boolean;
  reasonDisabled?: string;
}
```

Required tab matrix:

| Selection | Format tabs | Animate tabs |
|---|---|---|
| Slide background | Slide | Transitions |
| Text | Style, Text, Arrange | Build In, Build Out |
| Shape | Style, Text, Arrange | Build In, Build Out |
| Image | Style, Image, Arrange | Build In, Build Out |
| Whole table | Table, Arrange | Build In, Build Out |
| Table cell/range | Table, Cell, Data, Arrange | Build In, Build Out |
| Chart | Chart, Axis/Series where applicable, Arrange | Build In, Build Out |
| Video/audio | Movie/Audio, Arrange | Build In, Build Out |
| Line | Style, Arrange | Build In, Build Out |
| Multiple objects | shared Style controls, Arrange | shared build or sequence controls |

The current `src/views/Editor/Toolbar/index.vue` is the integration point. Replace its element-type switch with a registry that accepts `InspectorSelection` and declares tabs, capabilities, and persistence paths.

## 6. UI transplant tokens

These values are `LIVE` computed-style observations at an 842 × 539 Keynote editor viewport. They should become stable KeyNot tokens rather than copied Apple class rules.

```scss
:root {
  --kn-font-ui: SFNSText, "Helvetica Neue", Inter, Arial, sans-serif;
  --kn-color-accent: rgb(0, 122, 255);
  --kn-color-text: rgba(0, 0, 0, 0.88);
  --kn-color-text-secondary: rgb(121, 121, 121);
  --kn-color-inspector-text: rgb(50, 50, 50);
  --kn-color-inspector-bg: rgb(250, 250, 250);
  --kn-color-control-bg: rgba(0, 0, 0, 0.04);
  --kn-color-hairline: rgba(0, 0, 0, 0.08);
  --kn-opacity-disabled: 0.30;

  --kn-toolbar-control-height: 28px;
  --kn-toolbar-radius: 8px;
  --kn-inspector-width: 270px;
  --kn-inspector-tab-height: 33px;
  --kn-inspector-control-height: 28px;
  --kn-inspector-control-radius: 8px;
  --kn-inspector-font-size: 12px;
  --kn-control-font-size: 13px;
  --kn-title-font-size: 12px;
}
```

Observed styling rules:

- toolbar icon buttons: height 28 px, horizontal padding 6 px, transparent background, 8 px radius, accent blue;
- zoom control: 28 px height, 1 px `rgba(0,0,0,.08)` border, 10 px horizontal padding, 8 px radius;
- disabled toolbar command: opacity `.30` while preserving dimensions;
- active format/animate toolbar button: accent-blue fill with white icon;
- right inspector: 270 px width in this viewport, `rgb(250,250,250)` background;
- inspector tabs: 33 px high, 12 px medium text; inactive `rgb(121,121,121)`, active `rgb(51,51,51)`;
- inspector selects: 28 px high, 8 px radius, `rgba(0,0,0,.04)` fill, 13 px text;
- separator logic uses whitespace and 1 px hairlines instead of nested card borders.

Implementation location:

- add semantic variables to `src/assets/styles/variable.scss` and the active theme files;
- use them in `EditorHeader`, `CanvasTool`, `Toolbar`, `Tabs`, `Select`, `Popover`, `NumberInput`, and `Button`;
- do not use scraped class names such as `sc-*`, `iw-*`, or `icloud-*`;
- preserve KeyNot dark mode by defining equivalent dark tokens.

## 7. Menu and submenu architecture

All commands should be registered once and rendered in the header menu, context menus, shortcut help, and command palette.

```ts
export interface EditorCommandContext {
  selection: InspectorSelection;
  slideIds: string[];
  canUndo: boolean;
  canRedo: boolean;
  isPresenting: boolean;
  isOffline: boolean;
}

export interface EditorCommand {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string[];
  group: 'file' | 'edit' | 'insert' | 'slide' | 'format' | 'arrange' | 'view' | 'play' | 'help' | 'keynot';
  submenu?: (context: EditorCommandContext) => EditorCommand[];
  checked?: (context: EditorCommandContext) => boolean;
  enabled: (context: EditorCommandContext) => boolean;
  execute: (context: EditorCommandContext) => void | Promise<void>;
}
```

### Menu contract

| Menu | Commands required for parity | KeyNot extensions |
|---|---|---|
| File | New, Open/Import, Rename, Duplicate, Version History, Download a Copy, Print, Password, Workspace | Compatibility report, offline backup |
| Edit | Undo, Redo, Cut, Copy, Paste, Duplicate, Delete, Select All, Find/Replace, spelling commands | AI rewrite actions |
| Insert | Slide, Table styles, Chart families, Text, Shape/Line library, Image/Video/Audio, Equation, Comment, Link | Symbols, custom SVG path, image library |
| Slide | New/Duplicate/Delete, layouts, skip/unskip, group/ungroup, notes, slide number, transition | structure tags |
| Format | selection-specific style, copy/paste style, font/text, table/chart/image/media | accessibility inspector |
| Arrange | order, align, distribute, group, ungroup, lock, unlock, rotate, flip, numeric position/size | explicit continuity link |
| View | navigator, find, presenter notes, comments, zoom | light table, object list, rulers, gridlines |
| Play | from current, from beginning, presenter display, rehearsal/self-play | audience window, pen, laser, timer |
| Help | shortcuts, user guide, compatibility terminology | diagnostics and recovery |

### Menu behavior

- support pointer, Enter/Space, Arrow keys, Home/End, Escape, and type-ahead;
- nested menus open on pointer intent and Right Arrow, with Left Arrow returning;
- disabled items remain discoverable and expose the reason;
- checkable items use `menuitemcheckbox`; mutually exclusive options use `menuitemradio`;
- show platform-specific shortcuts;
- keep the menu open for harmless toggles where this improves repeated comparison;
- execute all mutations through the same command and history transaction APIs.

## 8. Complete table parity contract

### 8.1 Observed table tabs and submenus

Whole-table selection (`LIVE`): **Table, Arrange**.  
Cell selection (`LIVE`): **Table, Cell, Data, Arrange**.

Table insertion presets observed:

- table with row and column headers;
- table with column headers;
- plain table;
- table with headers and footer.

Table tab observed controls:

- style gallery (six visible styles in the sampled theme);
- 0–5 header columns;
- 0–5 header rows;
- 0–5 footer rows;
- title toggle and title text;
- caption toggle;
- row and column counts;
- table-wide font decrease/increase;
- independent gridline groups;
- alternating row color and color well;
- row height and Fit;
- column width and Fit.

Cell tab observed controls:

- font family, typeface, and size;
- bold, italic, underline, additional text options, color;
- character style;
- horizontal alignment including decimal/text-number alignment;
- vertical alignment;
- wrap text;
- fill;
- border target matrix (outline, inside, all, left, center, right, top, middle, bottom);
- border style, color, and width.

Data submenu observed:

- Automatic;
- Number;
- Currency;
- Percentage;
- Fraction;
- Scientific;
- Text;
- Date and Time.

The Apple guide additionally establishes formulas, functions, decimals, sorting, and typed-value behavior as part of the web table model.

### 8.2 Required model

Extend `src/types/slides.ts` rather than keeping inspector-only state:

```ts
export type CellDataFormat =
  | { kind: 'automatic' }
  | { kind: 'number'; decimals: number; thousandsSeparator: boolean; negativeStyle: string }
  | { kind: 'currency'; currencyCode: string; decimals: number; accounting: boolean }
  | { kind: 'percentage'; decimals: number }
  | { kind: 'fraction'; accuracy: string }
  | { kind: 'scientific'; decimals: number }
  | { kind: 'text' }
  | { kind: 'dateTime'; dateStyle: string; timeStyle?: string };

export interface CellRange {
  startRow: number;
  startColumn: number;
  endRow: number;
  endColumn: number;
}

export interface TableCell {
  id: string;
  rawValue: string | number | boolean | null;
  formula?: string;
  displayValue: string;
  dataFormat: CellDataFormat;
  colspan: number;
  rowspan: number;
  style: TableCellStyle;
}

export interface PPTTableElement extends PPTBaseElement {
  type: 'table';
  data: TableCell[][];
  title?: { visible: boolean; text: string };
  caption?: { visible: boolean; text: string };
  headerRows: number;
  headerColumns: number;
  footerRows: number;
  alternatingRowStyle?: TableCellStyle;
  borderModel: TableBorderModel;
  colWidths: number[];
  rowHeights: number[];
  defaultCellStyle: TableCellStyle;
}
```

### 8.3 Required selection and mutations

Add `tableSelection` to `src/store/main.ts` or a dedicated table editor store. It must represent active cell, rectangular range, row/column selection, and whole table. Implement range-aware mutations:

- `setCellStyle(range, patch)`;
- `setCellDataFormat(range, format)`;
- `setTableHeaderCounts()`;
- `setTableTitle()` / `setTableCaption()`;
- `setTableBorders(range, target, style)`;
- `insertRows()` / `deleteRows()` / `moveRows()`;
- `insertColumns()` / `deleteColumns()` / `moveColumns()`;
- `mergeCells()` / `unmergeCells()`;
- `fitRowsToContent()` / `fitColumnsToContent()` based on actual layout measurement;
- `setFormula()` and deterministic recalculation.

All operations must run in one undo transaction per user command. Replace current toasts and local refs in `TableTab.vue` and `CellTab.vue` with these commands. Create `Format/DataTab.vue`.

## 9. Animation and transition parity

### 9.1 Transition gallery observed live

The observed Keynote for iCloud gallery contained:

- None;
- Magic Move;
- Clothesline, Confetti, Dissolve, Drop, Fade and Move, Fade Through Color, Grid, Iris, Move In, Push, Reveal, Switch;
- Blinds, Color Planes, Cube, Doorway, Fall, Flip, Flop, Mosaic, Pivot, Reflection, Revolving Door, Scale, Swap, Swoosh, Twirl, Twist;
- Object Cube, Object Flip, Object Pop, Object Push, Object Revolve, Object Zoom, Perspective;
- Shimmer, Sparkle, Swing.

Group labels such as “Appear & Move,” “Flip, Spin & Scale,” “Object Effects,” and “Text Effects” were disabled separators, not selectable effects.

### 9.2 Transition model

```ts
export interface SlideTransitionConfig {
  effect: TransitionEffectId;
  durationMs: number;
  acceleration: 'constant' | 'easeIn' | 'easeOut' | 'easeInOut';
  start: { mode: 'click' } | { mode: 'automatic'; delayMs: number };
  unmatchedBehavior: 'fade' | 'instant';
  textMatchMode: 'object' | 'word' | 'character';
}
```

Implement a transition registry with metadata:

```ts
interface TransitionDefinition {
  id: TransitionEffectId;
  label: string;
  category: string;
  engine: 'css' | 'waapi' | 'canvas' | 'webgl';
  supportsReducedMotion: boolean;
  supportedInExport: { key: Fidelity; pptx: Fidelity };
  preview(ctx: TransitionContext): AnimationHandle;
}
```

Ship effects in dependency order: correct Dissolve/Move/Push/Reveal/Scale first, Magic Move second, then object/text and 3D effects. Do not add thumbnails for an effect whose playback engine is absent.

### 9.3 Real word and character Magic Move

`textMatchMode` must alter rendering:

- Object: animate one element wrapper;
- Word: tokenize rendered text with locale-aware `Intl.Segmenter`, match stable word identities, animate individual word spans;
- Character: segment grapheme clusters, not UTF-16 code units, and animate matched clusters;
- preserve inline styles and accessibility text;
- respect reduced motion;
- fall back to whole-object dissolve for incompatible rich-text structures.

Keep KeyNot’s visible matched-pair inspector and manual link/unlink controls. They are a product advantage and a valuable debugging surface.

### 9.4 Builds

Keynote for iCloud supports Build In and Build Out, including part-by-part animation for text, tables, and charts. It can play native action builds but Apple documents that the web editor cannot create or edit them. KeyNot should keep action-build authoring as an explicit extension.

Extend `PPTAnimation` with sequence semantics and part selection:

```ts
interface PPTAnimation {
  id: string;
  elId: string;
  phase: 'in' | 'action' | 'out';
  effect: string;
  durationMs: number;
  start: 'onClick' | 'withPrevious' | 'afterPrevious';
  delayMs: number;
  delivery?: 'allAtOnce' | 'byBullet' | 'byWord' | 'byCharacter' | 'bySeries' | 'byCategory' | 'byElement';
  order: number;
  actionParams?: ActionAnimationParams;
}
```

## 10. Object and content parity backlog

### Text

Required: paragraph styles, font/typeface/size/color, bold/italic/underline/strike, capitalization, baseline, shadow, alignment, columns, line/paragraph/character spacing, bullets/numbering, tabs/indents, text direction, links, borders/rules, background, autofit/overflow, and spell-check integration.

Reuse `TextTab.vue`, ProseMirror commands, and shared floating text controls. Consolidate duplicate controls behind one text-format command service.

### Shapes and lines

Required: categorized gallery, editable control points, line endpoints, connectors, combine/break-apart, text inside shapes, style presets, fills, borders, shadows, reflection, opacity, order, alignment, grouping, lock, rotate, and flip.

Keep the custom SVG path editor and freeform polygon tools.

### Images and galleries

Required: replace, crop/mask, scale-to-fill/fit, reset mask, exposure/saturation/temperature/tint/sharpness/denoise where supported, instant alpha equivalent, border, shadow, reflection, opacity, description, image gallery, and background use.

The current Image tab has a strong starting surface. Each adjustment must affect the rendered bitmap, persist, undo, and export; a toast is not completion.

### Charts

Required: chart family/type, data editor, row/column series orientation, titles/legend/labels/gridlines, axis scale and format, series style, gap/overlap, reference lines where practical, interactive chart playback behavior, and typed number formats.

ECharts can remain the renderer, but the model must preserve presentation semantics separately from renderer options.

### Media

Required: image, video, audio, web media when policy permits, trim/poster/volume/loop/start behavior, description, replace, and playback in presentation mode. Object URLs must be replaced with persisted Blob records; otherwise soundtrack/media disappear after reload.

### Slides and themes

Required: theme chooser categories, layouts/placeholders, add/duplicate/delete, reorder, group/ungroup, skip/unskip, automatic advance, background, slide number, notes, sections/groups, canvas sizes, and master-layout semantics.

The live theme chooser exposed Basic, Minimal, Bold, Editorial, Portfolio, Craft, and Textured categories. KeyNot needs a data-driven theme catalog rather than a flat template popover.

## 11. Document, collaboration, and playback

### Persistence and versions

`App.vue` autosaves slides, theme, viewport, compatibility report, and the raw source archive to IndexedDB. `author`, `soundtrack`, `loopPresentation`, and other future document fields are not in `LocalProjectRecord`, so they do not currently form a complete durable document.

Create a versioned `PresentationDocument` root schema and migrate existing records. Add durable version checkpoints with preview and restore; the current snapshot store is a 20-entry editing history and is not equivalent to “Browse All Versions.”

### Comments

The current comments panel supports local notes and replies. Keynote parity requires anchors to text ranges, objects, cells, and slides; author identity/color; edit/delete/resolve; visibility toggle; and export policy. Real-time collaboration requires a later provider-neutral collaboration layer. Local comments remain fully functional offline.

### Presenter and audience experience

Keep KeyNot’s presenter controls, separate audience window, pen, laser, timer, speaker notes, and thumbnails. Add:

- current/next slide layouts;
- elapsed and remaining timers;
- editable notes in presenter mode;
- build preview/status;
- keyboard shortcut overlay;
- self-playing and links-only modes connected to the document model;
- robust multi-window synchronization with BroadcastChannel;
- reduced-motion and screen-reader announcements.

## 12. Honest compatibility architecture

### 12.1 Separate four different promises

For each format, report independently:

1. **Parsed structure:** which source objects were understood;
2. **Editable conversion:** which understood objects became native KeyNot objects;
3. **Visual fidelity:** rendered comparison against the source application;
4. **Export interoperability:** whether edits survive opening and re-exporting in the target application.

No single weighted percentage should hide unsupported features.

### 12.2 Object-level provenance

```ts
interface InterchangeProvenance {
  sourceFormat: 'key' | 'pptx' | 'keynot';
  sourceObjectId?: string;
  sourceArchivePath?: string;
  sourceType?: string;
  importedFields: string[];
  preservedRawFields: string[];
  approximatedFields: string[];
  unsupportedFields: string[];
  dirtyFields: string[];
}
```

Attach provenance to slides and elements. Dirty-field tracking allows a native writer to patch only understood edits while retaining unknown bytes.

### 12.3 `.key` writing strategy

The browser can parse ZIP, Snappy framing, and protobuf wire fields, but a trustworthy writer needs a schema-aware object catalog and reference graph:

1. index every IWA object and reference;
2. map source objects to KeyNot elements without inventing fidelity;
3. preserve unknown fields and record ordering;
4. patch supported scalar/style/text/geometry fields in place;
5. allocate collision-free object IDs for additions;
6. update every reference graph and required metadata archive;
7. reopen in Apple Keynote and compare;
8. reopen the Apple-saved result in KeyNot and check edit survival.

Until steps 1–8 pass for a feature, export it as unsupported or approximate. A macOS conversion service based on Keynote automation or KeynoteKit can be an optional high-fidelity path; it must not be described as a pure browser guarantee.

### 12.4 Compatibility fixtures

Build a sanitized corpus with one deck per feature family and several mixed real-world decks. For every fixture store:

- source deck and legal provenance;
- Apple-rendered reference images;
- expected object inventory;
- expected editable fields;
- known unsupported features;
- imported KeyNot screenshots;
- Apple-open result of exported deck;
- pixel/structural diffs and human review status.

## 13. Implementation sequence

### P00 — Correct claims and establish measurable baselines

**Status:** COMPLETE (native geometry slice; unsupported fields reported honestly)

**Required reading:** `src/utils/keynoteImporter.ts`, `scripts/verify-keynote-and-motion.ts`, `src/views/Editor/EditorHeader/CompatibilityReportModal.vue`, this audit.

**Target files:** compatibility types/report UI, Keynote exporter labels, verification scripts, fixture metadata.

**Deliverable:** remove fixed compatibility scores and private-sidecar round-trip claims. Show per-feature evidence and unsupported states. Add an Apple-open/manual-validation slot to every export report.

**Minimum proof:** changing a real imported object no longer reports native export preservation unless the corresponding IWA value changed and Apple rendered the change.

### P01 — Create the command registry and complete menus

**Status:** IN PROGRESS (typed 9-menu registry, nested menu UI, and core command wiring implemented)

**Required reading:** `EditorHeader/index.vue`, `CanvasTool/index.vue`, global hotkeys, context-menu directives.

**Target files:** new `src/commands/*`, menu components, header/canvas toolbar, shortcut documentation.

**Deliverable:** File/Edit/Insert/Slide/Format/Arrange/View/Play/Help menus and submenus backed by one typed command registry, including enabled/checked state and shortcuts. Keep AI Studio in the KeyNot extension group.

**Minimum proof:** the same command invoked from a menu, shortcut, or context menu produces one history entry and the same result.

### P02 — Make inspector selection-driven

**Status:** TODO

**Required reading:** `Toolbar/index.vue`, `store/main.ts`, canvas selection hooks.

**Target files:** inspector registry, typed selection state, toolbar tabs, accessibility focus handling.

**Deliverable:** exact contextual tab matrix, including Table/Cell/Data/Arrange on a cell selection.

**Minimum proof:** switching among slide, table, cell, text, image, chart, and multiselect reveals only valid tabs without losing selection.

### P03 — Finish the table critical path

**Status:** TODO

**Required reading:** `types/slides.ts`, `TableElementOperate.vue`, `TableTab.vue`, `CellTab.vue`, PPTX import/export table paths.

**Target files:** table model/migration, table selection, Table/Cell/Data tabs, renderer, commands, import/export adapters.

**Deliverable:** persisted headers/footers/title/caption, range formatting, borders, typed data formats, formulas, merge/unmerge, sorting, and measured Fit.

**Minimum proof:** edit a representative table, reload the project, undo/redo the edits, present it, and round-trip supported properties through PPTX without silent changes.

### P04 — Complete transition and build semantics

**Status:** TODO

**Required reading:** `magicMove.ts`, `SlideAnimationPanel.vue`, `ElementAnimationPanel.vue`, `useExecPlay.ts`, animation config.

**Target files:** transition registry/engines, animation model migration, inspector galleries, player.

**Deliverable:** priority transitions, real word/character Magic Move, transition start/acceleration, build sequencing and delivery by object parts. Preserve action-build authoring.

**Minimum proof:** a two-slide deck demonstrates object/word/character modes and auto/click starts in both editor preview and presenter mode.

### P05 — Complete object inspectors

**Status:** TODO

**Required reading:** all existing Format tabs and object renderers.

**Target files:** Text/Image/Style/Chart/Media/Arrange tabs, shared format commands, renderers.

**Deliverable:** remove local-only controls and toasts; every visible control persists, renders, undoes, and exports according to its declared support.

**Minimum proof:** one mixed-object slide survives reload and player rendering with every changed property intact.

### P06 — Introduce the durable document and version model

**Status:** TODO

**Required reading:** `App.vue`, `store/slides.ts`, `utils/database.ts`, project manager, snapshot store.

**Target files:** versioned document schema, migrations, IndexedDB records, version timeline UI.

**Deliverable:** persist all document fields, media blobs, comments, playback settings, and version checkpoints; provide preview and restore.

**Minimum proof:** close/reopen the app offline and restore an earlier mixed-media version without missing assets or settings.

### P07 — Build a validated interchange pipeline

**Status:** TODO

**Required reading:** import/export hooks, Keynote importer, PPTX adapters, provenance contracts.

**Target files:** format adapters, IWA catalog/writer, object-level reports, fixture harness.

**Deliverable:** field-level import/export fidelity with source provenance and Apple/PowerPoint consumer validation. Keep an optional macOS bridge for features a safe browser writer cannot support.

**Minimum proof:** the reference consumer opens the export, renders supported edits correctly, saves it again, and KeyNot reimports those edits.

### P08 — Collaboration and accessibility

**Status:** TODO

**Required reading:** comments, project persistence, selection and command models.

**Target files:** collaboration provider boundary, anchored comment model, ARIA/menu focus logic, conflict UI.

**Deliverable:** local-first comments and optional real-time collaboration with accessible menus, inspectors, canvas selection, and presentation controls.

**Minimum proof:** two sessions concurrently edit a safe fixture without losing changes; keyboard-only use covers the critical authoring flow.

### P09 — Visual and behavioral parity gate

**Status:** TODO

**Required reading:** evidence folder, component library, fixture corpus.

**Target files:** visual fixtures, focused end-to-end flows, design tokens, performance instrumentation.

**Deliverable:** audited parity ledger for each user-visible command and inspector control, with intentional differences documented.

**Minimum proof:** reference tasks complete with equivalent outcomes and no misleading compatibility claim.

## 14. Milestones

| Milestone | Steps | Proves |
|---|---|---|
| M1 — Trustworthy editor shell | P00–P02 | Users can find commands and inspectors behave like the reference; reports are honest. |
| M2 — Core authoring parity | P03–P05 | Tables, objects, builds, and transitions work through model, canvas, player, undo, and persistence. |
| M3 — Durable documents | P06 | Projects, assets, settings, comments, and versions survive reload/offline use. |
| M4 — Interchange | P07 | Supported Keynote/PPTX edits survive the real target application, with measured gaps. |
| M5 — Product parity | P08–P09 | Collaboration, accessibility, performance, and the parity ledger meet release criteria. |

## 15. Acceptance ledger

Use this table as the denominator for “near 100%.” Add one row per command/control, not one row per screen.

| Surface | Total behaviors | Implemented | Runtime verified | Export verified | Intentional exclusion | Evidence |
|---|---:|---:|---:|---:|---:|---|
| Shell and menus | TBD after command registry | | | | | LIVE/CODE |
| Slides and themes | TBD | | | | | APPLE/CODE |
| Text | TBD | | | | | APPLE/CODE |
| Shapes and lines | TBD | | | | | APPLE/CODE |
| Images/media | TBD | | | | | APPLE/CODE |
| Tables | TBD | | | | | LIVE/APPLE/CODE |
| Charts | TBD | | | | | APPLE/CODE |
| Transitions/builds | 39 observed transition effects plus build behaviors | | | | | LIVE/APPLE/CODE |
| Presenter/playback | TBD | | | | | APPLE/CODE |
| Documents/versions | TBD | | | | | LIVE/APPLE/CODE |
| Comments/collaboration | TBD | | | | | APPLE/CODE |
| Keynote interchange | fixture-feature count | | | | | RUN |

The release percentage is `runtime-verified behaviors / applicable behaviors`. Import and export percentages are reported separately. An intentionally excluded Apple-specific behavior stays visible in the denominator report but is removed from the product-scope denominator with a reason.

## 16. Existing advantages to preserve

- offline-first IndexedDB workspace and PWA shell;
- AI deck creation and text assistance;
- explicit Object Transition pair inspection and manual continuity linking;
- action-build authoring in a web editor;
- LaTeX and custom SVG/freeform drawing;
- object list, rulers, light table, annotations, pen, laser, and timer;
- local project file as a lossless KeyNot format;
- compatibility report as a concept, once backed by real measurements;
- open, inspectable implementation that can expose why a feature was approximated.

These capabilities should appear as coherent KeyNot extensions in the same command and inspector system. They should not displace the familiar Keynote workflow.

## 17. Primary sources

- [Keynote User Guide for iCloud](https://support.apple.com/en-gb/guide/keynote-icloud/welcome/icloud)
- [Animate objects in Keynote for iCloud](https://support.apple.com/en-gb/guide/keynote-icloud/gil28976065d/icloud)
- [Add a slide transition in Keynote for iCloud](https://support.apple.com/en-gb/guide/keynote-icloud/gil3778a9710/icloud)
- [Add or change rows and columns](https://support.apple.com/en-gb/guide/keynote-icloud/gila327dd07c/icloud)
- [Format cells as currency, dates, and more](https://support.apple.com/en-gb/guide/keynote-icloud/gil8511bc48c/icloud)
- [Restore an earlier version](https://support.apple.com/en-gb/guide/keynote-icloud/gile9f2cb7ee/icloud)
- [Add or reply to comments](https://support.apple.com/en-gb/guide/keynote-icloud/gil02fe6679d/icloud)

## 18. Execution tracking

| Step | Status | Evidence / commit | Human approval | Notes |
|---|---|---|---|---|
| P00 | COMPLETE | Native-only geometry/text/transition re-import plus native image asset comparison | Not required | Text, geometry, images, and transitions are patched natively; unsupported fields remain Partial |
| P01 | IN PROGRESS | 9 menus / 73 unique commands; core actions share existing hooks | Not required | Remaining contextual Insert/Format/Arrange commands must be wired before COMPLETE |
| P02 | TODO | | Not required | M1 |
| P03 | TODO | | Not required | M2 |
| P04 | TODO | | Not required | M2 |
| P05 | TODO | | Not required | M2 |
| P06 | TODO | | Not required | M3 |
| P07 | TODO | | Apple/macOS validation environment may be needed | M4 |
| P08 | TODO | | Collaboration provider choice if enabled | M5 |
| P09 | TODO | | Product acceptance review | M5 |

