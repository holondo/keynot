# KeyNot Glass Responsive UI Design

## Objective

Modernize the KeyNot editor while preserving the interaction model and visual hierarchy of Apple Keynote. The implementation will use reusable visual primitives, semantic design tokens, floating glass surfaces, responsive menus, and touch-friendly drawers. Existing dark mode, localization, editor commands, keyboard navigation, and native `.key` compatibility must continue to work.

## Product Principles

1. Preserve Keynote familiarity: document title, menus, presentation controls, creation tools, canvas, slide navigator, and inspector remain recognizable and occupy familiar regions.
2. Modernize the surface treatment: controls use floating capsules, restrained translucency, layered blur, subtle borders, and softer shadows.
3. Keep content primary: glass surfaces must maintain readable contrast and must not obscure the slide canvas.
4. Use shared primitives: repeated visual and behavioral patterns must come from reusable components or shared mixins rather than copied component-specific CSS.
5. Adapt interaction, not only dimensions: desktop cascading menus become a touch-oriented sheet flow on narrow touch screens.
6. Preserve accessibility: keyboard navigation, focus indication, reduced motion, touch target size, escape handling, and semantic menu roles remain supported.

## Responsive Model

The existing viewport tiers remain the source of truth:

- Mobile: widths below 768px.
- Tablet: widths from 768px through 1199px.
- Desktop: widths of 1200px or more.

The URL overrides `?ui=desktop` and `?ui=mobile` remain available for deterministic verification. Touch capability influences the menu presentation but does not replace viewport-based layout decisions.

### Desktop

- The application header and creation toolbar render as separate floating glass rails.
- Root menus retain compact Keynote-style labels and open anchored popovers.
- Nested commands open lateral submenus with viewport-aware placement.
- The slide navigator and inspector remain docked.

### Tablet

- The header keeps primary document and playback actions visible.
- Less frequent controls may move into an overflow pill.
- The inspector becomes a right-side glass drawer.
- Root menus use an anchored popover when sufficient space exists and a sheet when the menu would overflow.

### Mobile

- A compact top rail exposes document identity, play, add, and a menu trigger.
- The creation toolbar becomes a horizontally scrollable floating pill rail with snap behavior.
- Application menus open in a bottom sheet.
- Selecting a command with children pushes a submenu view into the same sheet. A back control returns to its parent.
- Shortcuts are hidden in touch sheets, while checked and disabled states remain visible.
- Thumbnails and the inspector open as mutually exclusive glass drawers over the canvas.

## Visual System

### Semantic Tokens

Shared tokens will be defined for:

- Glass surface colors at subtle, regular, and elevated strengths.
- Border and inner-highlight colors.
- Blur strengths.
- Small, medium, and large shadows.
- Pill, panel, sheet, and control radii.
- Compact, regular, and touch control heights.
- Layering levels for rails, popovers, drawers, sheets, scrims, and modals.
- Motion duration and easing.

Light and dark themes provide their own values. Components consume semantic tokens and do not duplicate literal glass colors, shadows, or blur values.

### Surface Rules

- Floating rails use moderate transparency and blur.
- Menus and sheets use a more opaque elevated surface for legibility.
- Active controls use the existing accent color.
- Hover and pressed states change both fill and border without moving layout.
- `backdrop-filter` receives an opaque fallback for unsupported environments.
- Reduced-transparency and reduced-motion media queries disable expensive effects where requested by the operating system.

## Reusable Components

### `GlassSurface`

A layout-neutral surface wrapper with variants `subtle`, `regular`, and `elevated`. It owns background, border, blur, shadow, and fallback behavior.

### `PillButton`

A shared button for icon-only, text, and icon-plus-text controls. It supports active, selected, disabled, compact, and touch sizes. Existing toolbar actions retain their current handlers and tooltips.

### `FloatingRail`

A horizontal capsule group for the header and creation toolbar. It handles gaps, overflow, scrolling, edge fades, and safe-area padding.

### `ResponsiveSheet`

A reusable bottom-sheet shell with title, optional back action, close action, focus containment, escape handling, scrim, and safe-area padding.

### `ResponsiveCommandMenu`

One command renderer consumes the existing command registry and chooses between desktop popovers and the mobile sheet interface. Command execution, translation, disabled state, checked state, and nested structure come from the same data source in both modes.

## Menu Behavior

The command registry remains the only definition of menu structure. Desktop and mobile renderers must not maintain separate command lists.

Desktop behavior:

- Click or keyboard activation opens a root menu.
- Hovering another root label switches the open menu.
- Arrow keys navigate roots and visible commands.
- Nested menus open on hover, focus, or right arrow.
- Popovers flip horizontally when there is insufficient viewport space.
- Escape closes the active layer and returns focus to its trigger.

Mobile behavior:

- Tapping the menu pill opens the root menu list in a bottom sheet.
- Tapping a root menu shows its commands.
- Commands with children push a child level into the sheet.
- Back returns one level; close dismisses the entire sheet.
- Executing a command closes the sheet.
- Opening the menu closes inspector and thumbnail drawers.

## Editor Shell

The editor shell owns which overlay is active. It will replace independent boolean combinations with one overlay state so menus, thumbnails, and inspector cannot overlap unpredictably on narrow screens.

The canvas remains mounted while overlays open, preventing selection and editing state loss. Scrims block canvas interaction while a drawer or sheet is active. Desktop docked panels do not use the overlay state.

## Accessibility

- Touch targets are at least 44 by 44 CSS pixels on mobile.
- Icon-only controls have localized accessible labels.
- Focus rings use a high-contrast semantic token.
- Desktop menus retain menu and menuitem semantics.
- The mobile command sheet uses dialog semantics and announces navigation-level titles.
- Focus returns to the triggering control when an overlay closes.
- Motion respects `prefers-reduced-motion`.
- Transparency respects `prefers-reduced-transparency` where supported.

## Compatibility Constraints

This project changes UI composition and styling only. It must not alter:

- The command identifiers or command execution handlers.
- Slide, element, transition, table, or animation data models.
- IndexedDB persistence formats.
- Native IWA parsing or writing.
- Keynote, PowerPoint, PDF, image, or project export formats.
- Existing locale detection and persistence.

## Implementation Boundaries

Expected new files:

- Shared glass and pill visual components under `src/components/ui/`.
- A reusable responsive sheet under `src/components/ui/`.
- Shared glass-system styles under `src/assets/styles/`.
- Responsive menu orchestration under `src/views/Editor/EditorHeader/`.

Expected modified areas:

- Global semantic tokens.
- Editor header and canvas toolbar composition.
- Menu bar and submenu rendering.
- Editor overlay state and responsive drawers.
- Focused UI regression scripts.

Large editor-domain components and native Keynote code remain outside this refactor.

## Verification

The implementation is complete when:

1. Shared tests confirm glass tokens and primitives are used by header, toolbar, menus, and responsive overlays.
2. Menu tests confirm the same command registry powers desktop and mobile renderers, including nested, checked, and disabled commands.
3. Responsive tests confirm desktop popovers and mobile sheet navigation at boundary widths.
4. Keyboard and escape behavior remain covered by focused checks.
5. English and Portuguese dictionary parity passes.
6. The full existing test command passes, including native `.key` import/export and IWA table-cell round trips.
7. The production build passes.
8. One scripted 480 by 270 screenshot verifies the final narrow desktop layout without overflow.

## Acceptance Criteria

- The editor retains a recognizable Keynote hierarchy with a more modern glass and pill treatment.
- Repeated surface and control styling is implemented through shared tokens and components.
- Desktop menus remain efficient for mouse and keyboard use.
- Mobile menus are usable without hover and support nested navigation.
- Mobile drawers and menus do not cover each other or render behind the canvas.
- Dark and light modes remain readable.
- No native Keynote compatibility regression is introduced.
