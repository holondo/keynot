# KeyNot Glass Responsive UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Repository instructions prohibit subagents. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize the KeyNot editor with reusable glass surfaces, floating pill controls, and a touch-friendly responsive menu while preserving Keynote behavior and native `.key` compatibility.

**Architecture:** Add a small shared UI layer for glass surfaces, pill controls, floating rails, and responsive sheets. Keep the existing command registry and execution handlers as the single menu data source, selecting an anchored desktop renderer or nested mobile sheet renderer from the current breakpoint state. The editor shell coordinates narrow-screen overlays so menus, thumbnails, and inspector panels cannot conflict.

**Tech Stack:** Vue 3 Composition API, TypeScript, scoped SCSS, Pinia, existing icon components, Node source-regression scripts, Vite.

**Spec:** `docs/superpowers/specs/2026-10-19-keynote-glass-responsive-ui-design.md`

## Global Constraints

- Preserve all command IDs, execution handlers, slide models, persistence formats, export formats, locale behavior, and native IWA parsing/writing.
- Use the existing breakpoints: mobile below 768px, tablet from 768px through 1199px, and desktop at 1200px or above.
- Keep `?ui=desktop` and `?ui=mobile` deterministic overrides.
- Mobile touch targets must be at least 44 by 44 CSS pixels.
- Shared components and semantic tokens own repeated glass, blur, shadow, radius, and pill styles.
- Respect reduced motion and reduced transparency preferences.
- Validate UI through deterministic scripts and one final 480 by 270 screenshot; do not use interactive Computer Use unless scripts cannot reproduce a blocker.

## Review Focus

- A nested menu near the right viewport edge must remain visible instead of overflowing horizontally; Task 2 adds placement assertions.
- A mobile user must navigate into and back out of nested commands without hover; Task 2 adds hierarchy-state tests.
- Opening one narrow-screen overlay must close the previous overlay; Task 4 adds exclusive-state assertions.
- Dark mode and reduced-transparency environments must retain readable opaque fallbacks; Task 1 adds token and media-query checks.
- Keyboard users must escape a menu and recover focus on its trigger; Task 2 preserves and tests close/focus behavior.

---

### Task 1: Shared Glass and Pill Primitives

**Files:**
- Create: `src/assets/styles/glass-system.scss`
- Create: `src/components/ui/GlassSurface.vue`
- Create: `src/components/ui/PillButton.vue`
- Create: `src/components/ui/FloatingRail.vue`
- Modify: `src/assets/styles/global.scss`
- Modify: `scripts/test-dark-mode-and-buttons.ts`

**Interfaces:**
- Produces: `GlassSurface` with `variant: 'subtle' | 'regular' | 'elevated'` and `as?: string`.
- Produces: `PillButton` with `active?: boolean`, `selected?: boolean`, `iconOnly?: boolean`, `size?: 'compact' | 'regular' | 'touch'`, and native button attributes/events.
- Produces: `FloatingRail` with `scrollable?: boolean` and a default slot.
- Produces: semantic CSS tokens and `.glass-surface-*` mixins/classes used by later tasks.

- [ ] **Step 1: Add failing shared-system assertions**

Extend `scripts/test-dark-mode-and-buttons.ts` to assert that the three shared components exist, consume semantic glass tokens, include 44px touch sizing, and that `glass-system.scss` defines light/dark fallbacks plus reduced-motion and reduced-transparency handling.

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `node --experimental-strip-types scripts/test-dark-mode-and-buttons.ts`

Expected: FAIL because the shared files and tokens do not exist.

- [ ] **Step 3: Implement semantic tokens and primitives**

Define surface, border, blur, shadow, radius, control-height, focus-ring, motion, and z-index tokens. Implement the three components without editor-specific behavior; forward button attributes and emits from `PillButton`.

- [ ] **Step 4: Run the focused test and type checker**

Run: `node --experimental-strip-types scripts/test-dark-mode-and-buttons.ts && npm run type-check`

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

Commit message: `feat(ui): add reusable glass and pill primitives`

### Task 2: Responsive Command Menu

**Files:**
- Create: `src/components/ui/ResponsiveSheet.vue`
- Create: `src/views/Editor/EditorHeader/MobileCommandMenu.vue`
- Modify: `src/views/Editor/EditorHeader/KeynoteMenuBar.vue`
- Modify: `src/views/Editor/EditorHeader/MenuBranch.vue`
- Modify: `src/i18n/types.ts`
- Modify: `src/i18n/locales/en-US.ts`
- Modify: `src/i18n/locales/pt-BR.ts`
- Modify: `scripts/test-command-registry.ts`
- Modify: `scripts/test-responsive-layout.ts`

**Interfaces:**
- Consumes: `GlassSurface`, `PillButton`, and the existing `KEYNOTE_MENUS` registry.
- Produces: `ResponsiveSheet` with `visible`, `title`, `canGoBack`, and `close`/`back` emits.
- Produces: `MobileCommandMenu` with `visible`, disabled/checked command IDs, and `execute`/`close` emits.
- Preserves: `KeynoteMenuBar` public `execute` event and disabled/checked props.

- [ ] **Step 1: Add failing responsive-menu assertions**

Assert that both menu renderers import the same `KEYNOTE_MENUS`, mobile navigation stores a command path rather than copied menus, touch rows meet 44px, shortcuts are hidden in the sheet, desktop submenus expose a viewport-flip class/state, and escape restores trigger focus.

- [ ] **Step 2: Run menu and responsive tests and confirm failure**

Run: `node --experimental-strip-types scripts/test-command-registry.ts && node --experimental-strip-types scripts/test-responsive-layout.ts`

Expected: FAIL on missing sheet/mobile renderer and placement behavior.

- [ ] **Step 3: Implement `ResponsiveSheet`**

Use dialog semantics, a fixed scrim, bottom safe-area padding, a title/back/close header, focus return, escape handling, and a reduced-motion transition.

- [ ] **Step 4: Implement the mobile command hierarchy**

Resolve translated commands from `KEYNOTE_MENUS`, navigate with an ID path, preserve checked/disabled state, push child levels, pop on back, and close after command execution.

- [ ] **Step 5: Modernize desktop menu surfaces and placement**

Use shared elevated glass tokens and calculate or class-toggle leftward submenu placement when right-side space is insufficient. Preserve existing arrow-key behavior and roles.

- [ ] **Step 6: Run focused tests, i18n parity, and type checking**

Run: `node --experimental-strip-types scripts/test-command-registry.ts && node --experimental-strip-types scripts/test-responsive-layout.ts && node --experimental-strip-types scripts/test-i18n-parity.ts && npm run type-check`

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

Commit message: `feat(ui): add responsive command menu sheets`

### Task 3: Floating Header and Creation Rails

**Files:**
- Modify: `src/views/Editor/EditorHeader/index.vue`
- Modify: `src/views/Editor/EditorHeader/KeynoteMenuBar.vue`
- Modify: `src/views/Editor/CanvasTool/index.vue`
- Modify: `src/views/Editor/index.vue`
- Modify: `scripts/test-dark-mode-and-buttons.ts`
- Modify: `scripts/test-responsive-layout.ts`

**Interfaces:**
- Consumes: `FloatingRail`, `PillButton`, `KeynoteMenuBar`, and `MobileCommandMenu`.
- Preserves: all existing toolbar actions, tooltips, modals, command dispatch, and inspector group handlers.

- [ ] **Step 1: Add failing composition assertions**

Assert that header and creation toolbar consume shared rails/pills, mobile exposes a single menu trigger, toolbar overflow uses horizontal scrolling and snap behavior, and no local component duplicates glass background/blur/shadow declarations.

- [ ] **Step 2: Run focused UI tests and confirm failure**

Run: `node --experimental-strip-types scripts/test-dark-mode-and-buttons.ts && node --experimental-strip-types scripts/test-responsive-layout.ts`

Expected: FAIL on missing shared composition.

- [ ] **Step 3: Refactor the header into floating rail groups**

Group document identity, menus, playback, and document actions into reusable rails. Keep desktop menu labels and replace them with the menu pill plus primary actions on mobile.

- [ ] **Step 4: Refactor the creation toolbar into reusable controls**

Replace repeated local pill/button surface styling with shared components. On narrow screens enable horizontal scroll, snap points, edge padding, and hidden scrollbars without removing any creation command.

- [ ] **Step 5: Adjust editor spacing around floating rails**

Use shared size tokens for header/toolbar heights and safe-area offsets. Keep the canvas content area stable and avoid overlays consuming layout space.

- [ ] **Step 6: Run focused tests and type checking**

Run: `node --experimental-strip-types scripts/test-dark-mode-and-buttons.ts && node --experimental-strip-types scripts/test-responsive-layout.ts && npm run type-check`

Expected: PASS.

- [ ] **Step 7: Commit Task 3**

Commit message: `feat(ui): modernize editor with floating glass rails`

### Task 4: Exclusive Responsive Drawers

**Files:**
- Modify: `src/views/Editor/index.vue`
- Modify: `src/views/Editor/Thumbnails/index.vue`
- Modify: `src/views/Editor/Toolbar/index.vue`
- Modify: `scripts/test-responsive-layout.ts`

**Interfaces:**
- Consumes: shared glass tokens and `PillButton`.
- Produces: editor overlay state `type EditorOverlay = 'none' | 'menu' | 'thumbnails' | 'inspector'` with `openOverlay(type)` and `closeOverlay()`.

- [ ] **Step 1: Add failing exclusive-overlay assertions**

Assert the editor uses one overlay state, drawers derive visibility from it, opening a drawer replaces the previous overlay, the shared scrim closes the active overlay, and breakpoint changes reset overlay state.

- [ ] **Step 2: Run responsive tests and confirm failure**

Run: `node --experimental-strip-types scripts/test-responsive-layout.ts`

Expected: FAIL because independent booleans still control overlays.

- [ ] **Step 3: Implement exclusive overlay state**

Replace `inspectorOpen` and `thumbnailsOpen` combinations with the typed overlay state. Coordinate mobile menu visibility through the same state or an emitted shell event without moving the canvas component.

- [ ] **Step 4: Apply shared drawer surfaces and motion**

Use elevated glass tokens, safe areas, shared shadows, and reduced-motion behavior. Ensure drawer z-index is below the responsive sheet and above the canvas/scrim.

- [ ] **Step 5: Run responsive tests and type checking**

Run: `node --experimental-strip-types scripts/test-responsive-layout.ts && npm run type-check`

Expected: PASS.

- [ ] **Step 6: Commit Task 4**

Commit message: `feat(ui): coordinate responsive editor drawers`

### Task 5: End-to-End Verification and Evidence

**Files:**
- Modify: `doc/parity-evidence/keynot-ui-responsive-check.png`
- Modify only if verification exposes a defect: files owned by Tasks 1 through 4.

**Interfaces:**
- Consumes: completed visual primitives, menus, rails, and overlay state.
- Produces: verified build and one final low-resolution evidence image.

- [ ] **Step 1: Run the complete test suite**

Run: `npm test`

Expected: PASS, including command, inspector, table/motion, i18n, responsive, and native IWA round-trip checks.

- [ ] **Step 2: Run the production build separately**

Run: `npm run build`

Expected: PASS. The existing large-chunk warning is acceptable; compilation errors are not.

- [ ] **Step 3: Capture one deterministic low-resolution screenshot**

Run: `powershell -ExecutionPolicy Bypass -File scripts/capture-ui-lowres.ps1 -Url "http://127.0.0.1:5173/?ui=desktop&locale=en-US" -Output "doc/parity-evidence/keynot-ui-responsive-check.png" -Width 480 -Height 270 -DelayMs 1800`

Expected: a 480 by 270 PNG showing the narrow responsive editor without clipping or stacked overlays.

- [ ] **Step 4: Inspect the final screenshot once**

Confirm the slide remains primary, rails fit the viewport, floating drawer controls are reachable, and no menu or panel renders behind the canvas.

- [ ] **Step 5: Run repository hygiene checks**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; all intended new source and test files are tracked.

- [ ] **Step 6: Commit final verification fixes and evidence**

Commit message: `test(ui): verify responsive glass editor`
