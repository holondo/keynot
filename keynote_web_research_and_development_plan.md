# A Keynote-Inspired Web Presentation Editor

## Research findings, product proposal, and staged development plan

**Research date:** 18 October 2026. **Language:** English. **Status:** proposal for review; application implementation has not started.

“Keynote Web” is used here only as the brief's working description. The released product should have an independent name and identity.

## Contents

1. [Purpose and research method](#1-purpose-and-research-method)
2. [Understanding Keynote](#2-understanding-keynote)
3. [Animation and Magic Move](#3-animation-and-magic-move)
4. [Existing software](#4-existing-software)
5. [Recommended foundation](#5-recommended-foundation)
6. [Keynote reverse engineering](#6-keynote-reverse-engineering)
7. [Interoperability strategy](#7-interoperability-strategy)
8. [Functional specification](#8-functional-specification)
9. [Design and interaction direction](#9-design-and-interaction-direction)
10. [Technical direction](#10-technical-direction)
11. [Licensing and legal feasibility](#11-licensing-and-legal-feasibility)
12. [Development plan](#12-development-plan)
13. [Quality and validation](#13-quality-and-validation)
14. [Risks and decision gates](#14-risks-and-decision-gates)
15. [Evidence ledger and references](#15-evidence-ledger-and-references)

## 1. Purpose and research method

The proposed product is an independent, open-source presentation editor for people who need precise visual composition and expressive motion without authoring code. Its initial audience is educators, founders, designers, researchers, and small teams creating talks and visual explanations. It should work across desktop operating systems and retain an accessible local-document workflow.

The intended distinction is the combination of dependable direct manipulation, good defaults, coherent styling, understandable animation, and honest interoperability. An attractive toolbar alone would not meet the brief. A user should be able to create a well-composed slide, duplicate it into a second visual state, animate the relationship, rehearse, and recover the work after closing the browser.

The investigation follows the requested sequence: understand the reference experience, examine available software and format knowledge, choose a direction, and define progressive delivery. It does not prescribe application source files, classes, endpoints, or a speculative directory hierarchy. The workspace was empty and was not a Git repository when inspected; there is no existing application architecture to preserve.

### 1.1 Evidence vocabulary

Throughout this report:

- **Verified — documentation:** a primary source explicitly documents the capability. This establishes documented behavior, not independent runtime validation.
- **Verified — source:** an implementation, schema, or test was inspected. The existence of a test does not establish that it passed in this investigation.
- **Verified — observation/test:** directly observed in a public demo or executed in the isolated research environment, within the stated scope.
- **Probable:** an inference supported by evidence, but not yet demonstrated end to end.
- **Unknown:** insufficient evidence. Unknown is not synonymous with absent.
- **Proposed:** a requirement, architectural choice, target, or estimate for our product; not a claim about existing software.

The distinction is particularly important for file formats. A parser recognizing a field, an archive retaining a binary part, a renderer displaying it, an editor modifying it, and another application accepting the saved result are five different achievements.

### 1.2 Work performed and limits

Seven designated repositories were shallow-cloned into a temporary research directory, with revisions recorded below. Research included manifests, licenses, document models, import/export code, selected tests, public documentation, issue/PR pages, two public editor demos, and tutorial transcripts. A Python parser was exercised against an actual `.key` fixture in an isolated virtual environment. No user document was uploaded to a third-party editor.

The PPTist demo was visually inspected. Casual Slides was opened through its welcome screen into a blank editor. These observations confirm reachable interfaces, not production readiness, gesture precision, accessibility compliance, or round-trip fidelity. Their deployments were not independently matched to the cloned revisions.

The authenticated iCloud editor was not accessed. Apple user guides and their interface illustrations provide the main web evidence. MacMost's first-hand tutorials supplement the macOS interaction reconstruction. Video descriptions and transcripts were inspected; continuous playback and frame-by-frame timing were **not** measured. Accordingly, this report does not claim measured Apple animation curves or a complete visual audit of iCloud. Public video links and useful chapter times are included for subsequent comparison.

KeynoteKit was not executed: this environment is Windows, while the package declares macOS 13+ and includes Apple graphics framework imports. Native Keynote and PowerPoint were not used to validate exports. These are explicit limits on compatibility conclusions, not reasons to postpone the recommendation.

## 2. Understanding Keynote

### 2.1 The interaction structure worth reproducing

Keynote's central strength is that slide structure, object composition, and object properties occupy predictable places. The navigator answers “where am I in the story?”, the canvas answers “what will the audience see?”, and the inspector answers “what can I change about this selection?” The interpretation that this reduces context switching is a design inference, rather than a claim about Apple's internal design rationale.

In iCloud, a new presentation begins with a theme and placeholders; insertion uses object buttons, and formatting uses the right sidebar. Autosave removes a routine interruption. This creates a short path from choosing a visual system to replacing content and presenting. Our product should retain that short path while making save location and recovery status more explicit. [Create a presentation][A2]

The desired interface is not an indiscriminate collection of controls. Selecting a slide should expose layout and background. Selecting an image should expose replacement, crop, and visual styling. Entering text should expose typography. Selecting several objects should expose common properties and arrangement. The selection state must be unambiguous, including the difference between a selected text box and a caret inside its text.

### 2.2 Reconstructed user journeys

| Journey | Publicly established behavior | Lesson for the proposed editor |
|---|---|---|
| Start a deck | Choose a theme, replace placeholder text/images, add slides, name the document. iCloud saves during editing. | Provide a complete designed starting point; avoid forcing users to assemble a style system from scratch. |
| Compose a slide | Select objects, drag, use numeric coordinates, align, and distribute them. | Direct manipulation and exact numeric editing should agree and use one coordinate model. |
| Refine an image | iCloud documents masking/cropping as a distinct interaction. | Keep the image source and crop window separate so replacement and recropping remain reversible. |
| Organize objects | Layer order, grouping, and locking are documented in the web version. | Give users control over complex compositions without making invisible or overlapping objects inaccessible. |
| Add motion | Select a slide for transition controls; select an object for build controls. | Motion should follow selection context, with a clearly visible distinction between slide and object effects. |
| Present | Presenter controls provide a separate working view from the audience view. | Rehearsal and playback are product workflows, not merely full-screen screenshots. |

Sources: [creation][A2], [alignment][A3], [crop][A4], [object organization][A5], [transitions][A6], [builds][A7], [presenter display][A8].

A concrete precision example: Apple's web alignment guide documents arrow-key movement by one point and Shift-arrow movement by ten points, alongside x/y fields and distribution. This matters because users can move quickly, inspect the result, and make a small correction without changing tools. Our proposed editor should offer similarly predictable increments, expressed in its own documented document units. [Move and align objects][A3]

### 2.3 Capability inventory and platform comparison

The following is a capability-level comparison, not a claim of equal implementation depth. “Documented” refers to the cited platform's guide. Native parity is not inferred from a web feature name.

| Area | Keynote for macOS | Keynote for iCloud | Consequence for our scope |
|---|---|---|---|
| Themes, layouts, placeholders | Native reference workflow | Theme-based creation documented | Essential; coherent layouts are more valuable than a large undisciplined template gallery. |
| Slide navigation and organization | Native slide-oriented authoring | Navigator and presentation-view controls documented | Essential; include reorder, duplicate, hide, and overview. |
| Rich typography | Native formatting reference | Font, size, style, color, spacing and paragraph-related topics documented | Essential core; test wrapping and language behavior separately. |
| Images and masks | Native visual authoring | Add/replace/crop documented | Essential; preserve source assets and crop semantics. |
| Shapes and arrangement | Native visual authoring | Shape editing, grouping, locking and alignment documented | Essential; reusable manipulation behavior is a major base-selection criterion. |
| Tables | Native reference | Cell editing, merging, formatting and formulas have guide topics | Editable basic tables first; a spreadsheet-grade formula engine is later. |
| Charts | Native reference | Chart creation and data editing documented | Editable data and stable rendering first; avoid promising every chart family. |
| Audio/video | Native reference | Media insertion documented, with web-specific constraints | File-backed media after basic editing; do not infer codec equivalence. |
| Object entrances/exits | Native build system | Build In/Build Out, including some part-based delivery, documented | Include a curated set and sequencing early. |
| Action builds and motion paths | Creation/editing documented | Existing actions can play, but cannot be created or modified | Our browser editor should eventually exceed this web limitation. |
| Magic Move | Explicit authoring and matching controls documented | The inspected web transition guide does not establish Magic Move authoring or full controls | Treat web authoring as unknown; use the native workflow as the product target. |
| 3D objects and animation | Explicit native guide | Not established by inspected web evidence | Later, optional; never block the core editor. |
| Presenter view and notes | Native presentation workflow | Separate presenter display documented | Needed for a genuinely useful release. |
| Download/export | Native offers export workflows | Keynote, PDF and PowerPoint downloads explicitly documented | These are distinct outputs, with separate fidelity claims. |
| Collaboration/version recovery | Native/iCloud ecosystem | Public guide includes collaboration and earlier-version recovery | Valuable later; local reliability comes first. |

Evidence: [web guide][A1], [text formatting][A9], [charts][A10], [media][A11], [view modes][A12], [downloads][A13], [native transitions][A14], [native actions][A15], [native 3D objects][A16].

The strongest confirmed difference is action-build authoring: Apple's iCloud documentation explicitly distinguishes playback from creation and modification. Other gaps should remain unknown until the relevant capability is directly established. In particular, the lack of “Magic Move” in a general web guide is not proof that every iCloud presentation containing it fails to play.

### 2.4 What creates the impression of quality

**Composition:** good themes coordinate type scale, color, margins, and placeholder placement. Our product needs a small number of excellent themes and meaningful layout choices, not a template-count target.

**Interaction continuity:** selecting, dragging, editing text, and using the inspector should feel like aspects of one tool. Pointer capture, snapping thresholds, group bounds, keyboard focus, and undo transactions matter more than superficial resemblance.

**Typography:** font substitution can move a headline onto a second line and destroy a composition even when all text survives. Font availability, line spacing, paragraph metrics, text margins, and overflow must be visible product concerns.

**Playback:** the audience must see the same geometry and typography as the editor. Reimplementing the whole slide in a separate playback renderer creates a recurring fidelity problem.

**Trust:** clear save state, reversible edits, recoverable files, and explicit compatibility reports are as important as visual polish. These are proposed requirements derived from the desired professional workflow.

## 3. Animation and Magic Move

### 3.1 Separate four concepts

1. **Transitions** change the scene between slides.
2. **Build-ins and build-outs** introduce or remove an object, or parts of it.
3. **Actions** change an object while it remains on the slide: movement, rotation, scale, opacity, or emphasis.
4. **Sequence control** specifies when these effects start relative to clicks, transitions, and other effects.

Native Keynote documents combining basic actions and controlling their relationship in Build Order. iCloud documents entrances/exits and part-based delivery, including text and chart examples, but explicitly limits action editing. A future web editor must model sequence semantics rather than simply storing a CSS class on each object. [Native actions][A15] [Web builds][A7]

A useful first effect set is dissolve, directional move, scale, and a cross-slide matched-object transition. These effects cover many explanations with a manageable fidelity surface. Spectacular particle effects should follow a dependable scheduler, interruption behavior, and save/reload semantics.

### 3.2 Magic Move's authoring model

On macOS, the documented workflow is to duplicate a slide, change objects on one copy, then apply Magic Move to the preceding slide. Shared objects transition between states; unmatched objects can fade. Controls include duration, acceleration, automatic/click start, and text matching by object, word, or character. [Apple native transition guide][A14]

The valuable abstraction is **authoring two states instead of drawing a timeline**. A presenter can show an overview, enlarge one part, move the others aside, and explain the detail. The story remains visible as ordinary slides in the navigator.

MacMost's 2022 tutorial demonstrates this approach with movement, opacity, and size changes, then a more involved multi-element composition. Its grouping advice is specific to that demonstration and date; it should not be promoted into a universal current rule that all groups are unsupported. [Tutorial and transcript][V1]

The 2025 tutorial distinguishes sequential builds, Magic Move, editable paths, rotation, and simultaneous actions. The linked video chapter at **02:52** introduces Magic Move; **07:31** starts path animation; **11:11** covers combined effects. These are useful manual comparison references, not measurements made during this research. [Tutorial][V2] [Video][V3]

### 3.3 Proposed matched-object transition

Use a new product label such as **Object Transition**, subject to final naming review. “Magic Move” remains a reference to Apple's feature.

The first implementation should support position, size, rotation, and opacity for text boxes, simple shapes, and images. Users duplicate a slide, rearrange the copy, and preview. Matching should be explicit in the product's document model:

- Each object instance has a unique identity.
- Duplicating a slide creates new instances but retains a separate cross-slide continuity identity.
- Copying an object within the same slide creates a new continuity identity unless the user explicitly links it.
- A match inspector shows connections, ambiguous candidates, and unmatched objects.
- Imported source identifiers are retained separately; they are not assumed to be our continuity identities.

This is our proposed design. Apple's internal matching algorithm is not established by its user-facing documentation.

Unmatched objects should fade by default, with an instant-appearance option. Unsupported content should use a documented whole-object fallback, not silently disappear. Changing crop, image source, shape topology, chart type, or group hierarchy requires explicit interpolation rules; the first version may crossfade those changes.

Later work can add group-aware matching, word/character transitions, path-based actions, masks, and richer visual interpolation. Text matching must respect grapheme clusters and shaped text rather than blindly animating Unicode code points. Complex-script animation requires its own validation.

### 3.4 Comparisons and implementation implications

PowerPoint Morph follows a comparable cross-slide visual-state concept; it is a useful behavioral comparator, not evidence of identical identity or serialization rules. [Microsoft Morph guide][M1]

reveal.js Auto-Animate demonstrates that browser-based cross-slide matching is practical. It supports explicit matching identifiers and falls back to content-based matching. Its DOM-oriented approach provides useful implementation ideas, but it does not supply a presentation document editor or native `.key` compatibility. [Auto-Animate][W1]

The Web Animations API is a reasonable initial execution mechanism for supported transforms and opacity. It does not provide the document identity system, sequencing semantics, text shaping, source-format mapping, or Apple-specific effects. Those remain product responsibilities. [Web Animations API][W2]

## 4. Existing software

### 4.1 PPTist

**Finding:** the strongest foundation for the requested browser authoring experience, provided AGPL distribution is acceptable.

The inspected package uses Vue, TypeScript, Pinia, ProseMirror packages, ECharts, Dexie, `pptxtojson`, and PptxGenJS. The slide model represents editable objects, backgrounds, notes, animations, and slide-turning modes. Import/export and animation controls already have identifiable implementation locations. This is a substantial existing application rather than a rendering library requiring an editor to be built around it. [Manifest][P1] [Document model][P2] [Import][P3] [Export][P4]

The public demo visibly provides slide thumbnails, a large canvas, insertion controls, notes, and a right-side design/transition/animation area. Its Chinese-language interface also makes an English localization effort concrete. No conclusion about drag latency or text accuracy is drawn from that screenshot alone. [Demo][P5]

Existing functionality includes common object manipulation, text, shapes, images, tables, charts, presentation controls, and animation configuration. The project itself cautions that it is a developer foundation, not a finished hosted service. Its percentage fidelity claims are self-reported and are not adopted as measured results here. [Repository overview][P0]

**Important gaps for this product:** the inspected model is simpler than a source-preserving document model with masters, styles, source provenance, and cross-slide continuity. Its existing transition choices do not establish a Magic Move-equivalent identity system. Inspection of the export hook did not establish serialization of the editor's animation model into PowerPoint timing. The web animation interface must therefore not be advertised as portable animation support. [P2], [P4]

There are two distinguishable export paths: image-based slides and editable object generation. The former is useful for visual delivery but cannot satisfy the editability requirement. The latter needs feature-by-feature validation.

**Maintenance assessment:** the sampled head was dated 10 October 2026. The established code structure and recent change are positive signals, but neither proves low defect rates or a broad maintainer base. Budget for ownership of the fork, upstream updates, and an English maintainer guide. Avoid relying on the README's assertion of negligible technical debt.

**Expected reuse:** selection/manipulation, text editing, object controls, basic rendering, slide organization, and presentation shell. **Expected substantial work:** persistent document semantics, loss-aware format adapters, animation scheduling and matching, localization, accessibility, recovery, and visual refinement.

### 4.2 Casual Slides

**Finding:** a valuable OOXML reference and permissively licensed alternative, but not the preferred foundation for an animation-led product.

Casual Slides uses React with patched Univer packages and a custom PowerPoint import/export pipeline. Its importer and fidelity tracker cover many presentation structures. The idea of preserving unsupported source material alongside normalized content is directly relevant. [Importer][C1] [Exporter][C2] [Tracker][C3]

However, the tracker is not an independent fidelity benchmark. It contains different historical totals, including 68/87 and 93/99, and distinguishes parser and renderer work. Some green items refer to retained data rather than full editing semantics. Its stated deferrals include structured transitions and animations. Those are central to this brief, not peripheral.

**A decisive source-level discrepancy:** the inspected export loop emits text, shapes, images, and tables, then explicitly leaves chart/video slide-reference emission unimplemented. `restorePassthrough` can put chart XML back into the ZIP, but that does not make an unreferenced chart visible. The same export code deliberately does not restore original layouts, masters, and themes because the generated relationships point elsewhere. This contradicts any broad reading that raw-parts storage alone provides deep round-trip preservation. It is a verified source limitation, not a completed external-application repro. [Exporter][C2]

The README also mixes completed and planned descriptions of collaboration and export. Its public demo currently presents a compact menu/toolbar workspace, whereas README sections describe an Office ribbon. These discrepancies suggest documentation/deployment drift; they do not justify assuming one screenshot represents every revision. [README][C0] [Demo][C4] [Welcome-page PR][C5]

**Maintenance assessment:** the inspected head was dated 2 August 2026; the project describes an early release and carries a patch layer over Univer. The patch layer is an additional maintenance surface, especially where rendering and mutation behavior need modification. Collaboration should not be treated as proven production co-editing: the documentation describes a gated single-active-editor spike and a planned migration.

**Expected reuse:** OOXML mapping knowledge, fixtures, provenance ideas, and selected permissively licensed code after review. **Major cost:** animation authoring/playback, resolving document-export gaps, and maintaining both the shell and patched rendering engine.

### 4.3 Presenton

**Finding:** relevant as a generation and template system, but a weaker fit for the primary authoring foundation.

Presenton should not be dismissed as merely a prompt form. The current source includes a substantial slide editor: text toolbars, inline Tiptap editing, chart controls, layout controls, and a typed scene with geometry, theme roles, and infographic variants. Its manifest-level product direction is supported by actual editing components. [Editor types][R1] [Editor components][R2]

Its export path coordinates a rendered presentation URL with a backend export task service. That is a materially different operational model from a small local browser editor, and would introduce generation/backend concerns early if adopted wholesale. [Export orchestration][R3] [Export service][R4]

The project advertises editable PPTX output and PowerPoint-template input. Neither establishes arbitrary imported-deck round trips, native Keynote preservation, or a mature sequence/matched-object animation system. Those capabilities remain unknown in this investigation. The sampled head, dated 16 October 2026, and a recent permissions PR show active development; they are not fidelity evidence. [Overview][R0] [Recent PR][R5]

**Expected reuse:** template workflows, theme-role ideas, selected chart/infographic UX, and a possible later optional generation integration. **Reason not to select it:** adapting the generation-oriented product and export pipeline would distract from precise manipulation, motion, and source-document preservation.

### 4.4 Other candidates and component sources

These received a narrower screening than the three primary editor candidates. They are not claimed to have undergone equivalent runtime testing.

| Candidate | Useful strengths | Why it is not the selected base | License/maintenance consideration |
|---|---|---|---|
| ONLYOFFICE Docs | Complete online office editor with presentation and OOXML workflows | More attractive if office compatibility dominates; deep custom motion/UX work would require owning a much larger system | AGPL and repository-specific additional notices/non-code terms require review. [O1], [O2] |
| Collabora Online / LibreOffice | Mature office ecosystem; useful independent conversion/reference path | Server-oriented office architecture is a poor starting point for a lightweight bespoke animation editor | Review component licenses and deployment requirements; GitHub currently points development to Gerrit. [O3] |
| reveal.js | Web playback, presenter features, Auto-Animate | No native freeform editing/document pipeline | Suitable conceptual/component reference, not a second competing rendering stack. [W1] |
| Slidev / Marp | Productive code/Markdown presentation workflows | Their primary authoring model conflicts with direct visual editing; a PPTX export label alone does not establish editable output | MIT repositories; good optional future import/publication integrations. [O4], [O5] |
| Penpot | Rich visual design and reusable design-system concepts | Presentation timing, presenter workflows and office fidelity would be major additions | MPL-2.0; a large independent design application, not a drop-in slide engine. [O6] |
| Excalidraw | Clear selection/grouping/diagram interaction | Sketch-oriented diagram model and appearance differ from presentation typography and motion | MIT; borrow interaction lessons or support diagram import. [O7] |
| Fabric.js / Konva | Scene graphs, transforms and canvas interaction primitives | Still require text authoring, slides, themes, storage, accessibility, animation UX and converters | MIT; fallback components if a specific rendering requirement warrants them. [O8], [O9] |

A custom editor assembled from low-level libraries maximizes theoretical freedom but creates the most unproven work. It is not justified before a working PPTist-derived vertical slice exposes a concrete limitation that cannot be corrected locally.

### 4.5 Comparative decision matrix

The assessments below are qualitative judgments based on the evidence, not benchmark scores.

| Criterion | PPTist | Casual Slides | Presenton | New editor on primitives |
|---|---|---|---|---|
| Reusable freeform editing | Strong | Substantial, with engine patch costs | Substantial, with generation/layout focus | Must build |
| Existing basic animation authoring | Present | Core structured animation deferred in tracker | Not established for required scope | Must build |
| Keynote-like matched transitions | Must develop | Must develop | Not established; assume development needed | Must build |
| PPTX starting point | Editable mapping + export; lossy | Detailed mapping and raw preservation, with verified exporter gaps | Editable export claimed; arbitrary round trip unproven | Must integrate/build |
| Native `.key` | Separate adapter required | Separate adapter required | Separate adapter required | Separate adapter required |
| UX redesign effort | Moderate shell work, deeper quality work | Moderate-to-high shell/engine work | High product-model adaptation | Very high total work |
| Main maintenance risk | Fork divergence and model limitations | Shell + patched engine + drift in fidelity claims | Larger product/backend surface | Everything becomes our responsibility |
| License fit | AGPL acceptable for proposed open-source direction | Apache-2.0 permissive | Apache-2.0 permissive | Depends on chosen components |
| Recommendation | **Primary foundation** | Secondary source and fallback candidate | Optional later integration | Reserve for demonstrated blockers |

## 5. Recommended foundation

**Fork PPTist at a pinned revision, retain its useful editing components, and evolve its document and motion capabilities incrementally. Keep `.key` and `.pptx` conversion behind explicit adapters. Use KeynoteKit as the leading native-Keynote adapter candidate and format reference, not as the editor or browser renderer.**

This recommendation follows the brief's priorities. Precise authoring and expressive motion are the product's defining work. PPTist already supplies more of the relevant interaction machinery; Casual Slides' stronger-looking compatibility totals weaken under source inspection; Presenton's generation product solves a different primary journey. None eliminates the hard Keynote interoperability work.

The proposal is not to rewrite PPTist in another framework. Vue/TypeScript/Pinia are recommended because they are the selected foundation's existing stack, not because they were selected before the research. Retaining ProseMirror avoids replacing a complex text-editing subsystem without evidence of a need.

The fork should own a modest number of clear responsibilities: product identity and UX, persistent document semantics, animation, and adapters. Avoid mixing two whole editors or importing a second scene graph merely because another project has an interesting feature.

### Conditions that would change the recommendation

- If the owner requires a permissive license for the entire derivative, do not silently use AGPL code. Re-evaluate Casual Slides against a real-deck export/animation gate, or negotiate a suitable license.
- If the first vertical slice shows unfixable text/layout or interaction limits in the existing renderer, isolate and replace the failing component before considering a whole-editor rewrite.
- If exact Office round trips become more important than custom authoring and animation, evaluate ONLYOFFICE/Collabora as the main product architecture rather than stretching this recommendation beyond its premises.

The first implementation phase should prove the choice with a working user journey. It should not become an indefinite second research project.

## 6. Keynote reverse engineering

### 6.1 The format problem

Modern Keynote documents contain a package of assets and IWA records. IWA combines custom Snappy framing, protobuf records, numeric type registries, and object references. A successful decompression is only the first step: styles, placeholders, themes, media, and document metadata refer to one another. Historical iWork formats also differ from current package forms. [Historical format documentation][K8] [KeynoteKit container source][K2]

The 2013 iWork documentation is useful for foundational framing and object organization, but is not a current full-format specification. Its historical `Index.zip` details must not be applied indiscriminately to every modern `.key` file.

### 6.2 KeynoteKit: actual capability boundaries

The pinned source declares Swift 6 tooling and macOS 13+. It depends on ZIPFoundation and swift-protobuf; some model/builder operations import CoreGraphics and ImageIO. A browser/WASM or Linux port is therefore a separate engineering task, not an existing deployment option. [Package][K1]

| Layer | Established evidence | Limit on the conclusion |
|---|---|---|
| Container codec | ZIP/IWA/Snappy implementation and fixture tests | Byte-safe container operations do not prove rendering or arbitrary edits. |
| Typed records | Generated schemas and registry, primarily described against 14.4 | A large schema count is not equivalent to semantic feature coverage. |
| Scene inspection | Object handles, geometry, text/media and scene editing code | JSON scene form is evolving and not a universal lossless intermediate model. |
| Mutation | Text/frame/media changes, clone-based additions, deletion and ordering logic | Reparenting/type changes and some placeholder operations are explicitly rejected. |
| Tables/charts | Cell editing and chart-grid operations; focused fixture tests | Table shape changes and all chart-style variations are not established. |
| Transitions/builds | Read/write code and tests for effects, duration, targets and parameters | No browser execution of Apple's effects; effect-name support is not visual parity. |
| Generation | Seed/template strategy and freeform canvas builder | Distributed seed assets and generated output need separate provenance and acceptance review. |

Evidence: [container][K2], [scene reconciler][K3], [model source][K4], [transition tests][K5], [build tests][K6], [builder source][K7].

The reconciler's code is especially informative: clone-based additions are supported even though an introductory comment still lists “new nodes” as rejected. It then rejects other unknown IDs and type/role changes. This shows why reading executable branches matters more than relying on one status sentence.

The repository overview reports an effect catalog extracted from Keynote 15.2.1, alongside 14.4 schemas. This is useful version-specific evidence, not a guarantee that all 15.2.1 documents or effects round-trip correctly. The overview also retains an old “planned next” sentence for features already represented in code. Treat the pinned source and focused tests as the more precise capability evidence. [KeynoteKit overview][K0]

**Recommended role:** initially an optional, isolated macOS conversion service or local companion, with a limited editable import profile and source-preserving mutations. The browser application should remain usable without it. A host-independent port can follow once the scene and fidelity requirements are proven.

### 6.3 keynote-parser

This Python project is valuable for inspecting, unpacking, modifying and repacking IWA packages, and for its versioned schemas. It is not a rendering engine or a full presentation authoring model. Its source explains schema-name changes between versions and the need to regenerate extracted definitions. [Parser source and guide][K9]

The README's headline refers to Keynote 14.4, while the package installed for the runtime probe was **1.14.5.0**. Compatibility must be stated using the actual package/schema combination and tested fixtures, not just the README's introductory sentence.

**Observed Windows probe:**

1. Installing directly from the cloned head succeeded, but unpacking failed because the generated `protobuf_schemas.tar.xz` artifact was missing. The repository documents a schema-generation step for source checkouts.
2. Installing the published package supplied the needed runtime data. It unpacked all 56 entries of KeynoteKit's `transdeck.key`; the resulting YAML contained `apple:dissolve` and `apple:3D-cube` transition identifiers and durations.
3. Packing exited successfully, but ZIP inspection found wrong entry paths: an absolute input path produced entries prefixed with the Windows research-directory path; a `./research-transdeck` input retained that directory prefix too.
4. Consequently this was a **successful parse and a failed package-layout validation**, not a valid round-trip demonstration. The inspected directory reader uses string replacement with `path + "/"`, which is consistent with the observed Windows path-normalization problem. That causal explanation is probable; no source fix was implemented.

Fixture SHA-256: `80e8e7c47118dddf64fd6d5ef12772374207e0c7709f271823d0f850e9c1a3e9`. Input: [pinned transition fixture][K10]. Source location relevant to the path finding: [file utilities][K11]. No native Keynote open/render test was performed.

This finding changes the plan: a future converter must validate package names and relationship integrity, not accept exit code zero as proof. Linux/macOS behavior was not tested, and this observation should not be generalized into a claim that every published parser workflow fails.

### 6.4 SVG2Keynote-lib

This MIT-licensed C++ project contains useful knowledge about translating SVG geometry into Keynote-native clipboard data. It describes protobuf/Boost build dependencies and a macOS pasteboard integration path. Its reverse Keynote-to-SVG executable is explicitly described as experimental, single-slide, and demonstration-oriented. The inspected head dates to September 2021. [Repository][K12]

Use it as a geometry and format reference, not the full `.key` converter. Vector conversion does not preserve editable text semantics, themes, chart datasets, or animation merely because paths look correct. Its old schema-extraction instructions include security-sensitive macOS setup; those instructions are not a prerequisite for ordinary product development and were not executed.

### 6.5 iWorkFileFormat and libetonyek

iWorkFileFormat is foundational MIT-licensed research, with a 2013 inspected head. Reuse its explanations of framing and references while clearly recording the age of its format observations. [Repository and docs][K8]

libetonyek is another relevant iWork import effort in the LibreOffice ecosystem. It merits a bounded comparison as an independent parsing/conversion path, particularly for older documents. This investigation identified the repository but did not verify its current coverage or build it; it should not be credited with current lossless `.key` export or animation fidelity. [Repository][K13]

### 6.6 What remains unsolved

No investigated component establishes a turnkey, browser-native, visually faithful, freely editable `.key` round trip. Major remaining work includes style inheritance, font metrics, unsupported object preservation, mutable relationships, animation mapping, version changes, and independent rendering. A supported subset is realistic; universal parity is not a defensible release promise.

## 7. Interoperability strategy

### 7.1 Publish four separate compatibility measures

| Measure | Question | Example of an honest result |
|---|---|---|
| Import structure | Did slides and recognized objects become document entities? | “Text and images imported; this chart remains an opaque object.” |
| Visual fidelity | Does the rendered result match the source? | “Font substitution changes wrapping on slides 3 and 7.” |
| Editability | Can users change the original semantic content? | “Chart data is editable; its 3D rendering is not supported.” |
| Export/round trip | Does the target application accept the result, preserving intended content and behavior? | “Static objects validated in PowerPoint; this transition is exported as a fade.” |

A flattened slide can score well visually and poorly on editability. Raw XML preservation can score well on retained bytes and still fail visibility. Neither should be presented as comprehensive support.

### 7.2 Maintain a native project format

The browser editor needs its own versioned project representation containing editable slides, assets, styles, motion, and provenance. Saving this native format must not repeatedly convert through PPTX or KEY. Conversion is an import/export operation; normal editing should not accumulate translation loss.

Retain an immutable original upload, a mapping between original and editor objects, and unrecognized source records where feasible. Preserve content and metadata only under an explicit retention policy; hidden comments and embedded files can be sensitive when publishing.

A general raw-passthrough mechanism is insufficient. If an object is deleted, duplicated, regrouped, or moved across slides, source relationships may become invalid. Preserve the dependency closure of an opaque object, remap identifiers when necessary, and invalidate unsafe passthrough with an actionable warning. Never promise that unknown bytes remain meaningful after arbitrary edits.

### 7.3 PPTX path

Start with PPTist's import mapping and PptxGenJS export. Incorporate lessons from Casual Slides' handling of theme resolution, placeholders, crop, and source parts, but validate each adaptation independently. OOXML has a documented foundation plus Microsoft extensions; neither a ZIP parser nor a generic XML parser supplies presentation semantics. [Microsoft PPTX extensions][M2] [PptxGenJS][M3]

Progressive support should be:

| Profile | Editable content | Preservation/fallback | Release condition |
|---|---|---|---|
| P1: common static slides | Text, simple shapes, images, positions, size, order, notes | Warn on unsupported elements; keep original | Target applications open exports without repair for the fixture set. |
| P2: designed business decks | Groups, tables, common charts, theme/layout relationships | Explicit font and special-effect fallbacks | Data remains editable and repeated saves do not introduce new loss within the profile. |
| P3: motion subset | Mapped builds, timing, basic transitions | Unsupported timing retained only when references remain safe | Semantic playback comparisons in PowerPoint and our player. |
| P4: long-tail fidelity | Additional effects, embedded objects and advanced layout | Preserve/reject case by case | Evidence per feature/version, not a blanket percentage. |

A PPTX that opens in Apple Keynote is a useful interchange result; it is not equivalent to preserving native Keynote data. Validate PowerPoint and Keynote separately because each may interpret the same OOXML differently.

### 7.4 KEY path

Implement native-Keynote work early, in a bounded profile:

- First, recognize supported package forms and versions; reject encrypted or unsupported inputs clearly.
- Extract slide order, text, simple shapes, images, transforms, and source identities into editable objects.
- Expose recognized builds/transitions as metadata even before playback mapping exists; show unsupported-motion status.
- Save the full working project locally, including enough provenance to revisit export later.
- For `.key` output, initially patch supported edits into a retained source document rather than synthesizing every imported feature from scratch.
- Add new-deck `.key` generation only with legally cleared seeds and a validated feature profile.

The first `.key` release should support deliberate limitations such as “editing text and moving supported objects in supported documents.” It should not enable arbitrary operations and hope the converter can reconstruct the result.

A macOS helper/service introduces infrastructure and privacy costs. Make transfers explicit; self-hosting or a local companion should be possible. No implicit upload should occur when a user opens a local deck. Until that adapter is available, offer a user-directed Keynote-to-PPTX route with a clear statement that native metadata may be lost.

### 7.5 Animation interoperability

Maintain a semantic mapping table with source effect, trigger, duration, parameters, editor equivalent, destination mapping, and fallback. Separate parsing an Apple effect identifier from implementing its appearance. If mapping cannot preserve meaning, retain the source metadata and explain the export limitation.

Do not translate Magic Move into PowerPoint Morph based only on similar UI names. Identity rules, extension data, and timing need separate examination. Our matched-object transition should work in native web projects before either native format can encode it reliably.

### 7.6 Repeated-save policy

For supported profiles, test at least five import/edit/export cycles. Compare slide order, content, relationships, supported properties, and native application renders. Distinguish expected first-import normalization from new degradation on later cycles.

No-op source preservation, edit-preserving export, and from-scratch generation need separate tests. Retaining the original file also provides a recovery option when conversion cannot preserve a feature safely.

## 8. Functional specification

**Release labels:** Core MVP proves the primary path; usable alpha supports real single-user work; beta improves interchange and motion depth; mature product adds collaboration and long-tail fidelity. These are proposed scopes, not existing capabilities.

| Area | Expected experience and importance | Reuse | Delivery |
|---|---|---|---|
| Document lifecycle | New, open, name, duplicate, local save, download, reopen, autosave and recovery; never silently replace the original import | PPTist document/state foundations; new persistence guarantees | MVP; recovery hardened for alpha |
| Slides | Add, duplicate, delete, reorder, skip, overview, aspect ratio and notes | PPTist navigation and slide model | MVP; sections/overview refinement alpha |
| Direct manipulation | Click/marquee selection, move, resize, rotate, multi-select, group, align, distribute, lock and layering | Existing PPTist behaviors | MVP core; precision/accessibility alpha |
| Text | Rich text, paragraph styles, bullets, spacing, margins, alignment, overflow and explicit font fallback | ProseMirror and PPTist controls | MVP basics; complex typography beta |
| Shapes | Common shapes, fills, borders, opacity, shadows and editable vectors | PPTist shape implementation | MVP basics; path editing later |
| Images | Insert/paste, replace, crop, masks, fit/fill and reversible source retention | PPTist image controls | MVP; masks/refinement alpha |
| Audio/video | Insert supported local media, poster, start/stop policy and playback fallback | Existing media elements, browser media APIs | Alpha/beta, with codec profile |
| Tables | Edit cell text/data, dimensions, alignment, styles and merges | Existing table editor | Alpha; formulas later |
| Charts | Editable datasets and common 2D families with themes | ECharts/PPTist | Alpha; detailed interchange beta |
| Themes/layouts | Coordinated design tokens, reusable placeholders, layout choice and reset | Existing theme controls; new semantic inheritance | Alpha; theme authoring beta |
| Builds/actions | Curated entrance/exit effects; click/with/after sequencing; duration, delay and preview | Existing effect UI plus new scheduler | Early alpha; paths/combined actions beta |
| Object Transition | Duplicate, rearrange, preview; explain matching and fallbacks | New continuity semantics and interpolation | Early alpha |
| Presenting | Full screen, next/previous, keyboard control, notes/presenter view, restart and predictable interruption | PPTist presentation shell | MVP basic; alpha presenter workflow |
| Import/export | Editable supported profiles, per-slide warnings, original retention, PDF/image distinction | PPTist adapters; KeynoteKit candidate | PPTX MVP; KEY early alpha |
| Web operation | Cross-platform desktop browsers, local-first work, explicit backup, later install/offline mode | Browser storage and service-worker capabilities | Local save MVP; offline alpha |
| Accessibility/i18n | Keyboard operation, focus, labels, contrast, reduced motion, English UI and localization infrastructure | Existing components require audit | Foundation from MVP; alpha acceptance gate |
| Sharing/collaboration | Optional publish/view links, versions, later multi-user edit | New service; evaluate Yjs when needed | Beta/mature |
| Extensions/AI | Optional content generation or approved plugins without changing core document semantics | Presenton may integrate later | Mature, demand-led |

The first genuinely usable release should include dependable local editing and recovery, common text/images/shapes, basic tables/charts, an original theme set, basic animation sequencing and Object Transition, presenter notes, and supported PPTX interchange. Native `.key` import should already be available as a clearly labeled limited capability, with `.key` export in a controlled preview rather than an unconditional save option.

### 8.1 Web-specific opportunities and priorities

The estimates below compare implementation difficulty within this proposed product, rather than describing browser guarantees.

| Opportunity | User value | Relative difficulty | Priority and tradeoff |
|---|---|---|---|
| Windows/macOS/Linux desktop access | Removes platform dependence for authoring and presenting | Medium: fonts and browser differences remain | Core; validate Chromium, Firefox and Safari on their supported systems. |
| Local documents and recovery | Users retain control and can work without an account | Medium | Core; browser storage must be paired with explicit downloadable backups. |
| Installable web app | Convenient launch and a focused window | Low-to-medium after offline foundations | Alpha enhancement; installation must not be required for ordinary use. |
| Offline editing/presenting | Reliable travel and conference use | Medium-to-high because assets, fonts and upgrades must work offline | Alpha; remote KEY conversion remains unavailable offline unless a local bridge exists. |
| Tablet viewing/presenting | Useful additional presentation device | Medium | After desktop reliability; lower cost than full touch editing. |
| Tablet authoring | Broadens creation access | High: selection, gestures and inspector layout need redesign | Later; do not compromise desktop precision to force one layout everywhere. |
| Read-only publishing | Easy distribution without requiring an editor | Medium: asset packaging, permissions and font licensing | Beta; publish a deliberate snapshot rather than exposing a live working file. |
| Optional sync/version history | Multi-device continuity and recovery | High: durable storage, access control and migration | Before simultaneous editing; distinguish snapshots from undo. |
| Real-time collaboration | Valuable for teams, less essential to solo creators | Very high | Later; preserve a useful account-free local workflow. |
| Accessibility and localization | Expands who can author, read and present | Ongoing, increasingly expensive if deferred | Establish keyboard semantics and translatable strings immediately; deepen coverage throughout. |
| Extensions and generation integrations | Enables specialized workflows | High security and maintenance cost | Demand-led; accept structured content through the editor's normal validation and undo path. |

The initial browser support target is the current stable desktop releases at implementation time, with an explicit tested-version record. Mobile Safari and Android should begin as viewing targets, not implicit claims of full editing parity.

## 9. Design and interaction direction

### 9.1 A coherent workspace

Use a restrained top toolbar, slide navigator, central canvas and contextual inspector. Give Format and Animate distinct, stable entry points. Keep document name, storage status, and presentation action easy to find. Avoid moving controls unpredictably when selection changes; show mixed values honestly in multi-selection.

Use independent iconography, spacing, color and typography. The goal is comparable clarity and precision, not Apple branding. Do not ship Apple screenshots, icons, stock themes or fonts as product assets merely because they occur in a reference file.

### 9.2 Specific interaction requirements

- A drag is one undoable action; text-edit sessions and inspector adjustments have deliberate transaction boundaries.
- Selection handles and snapping feedback remain legible at different zoom levels.
- Numeric position and pointer movement produce consistent geometry; display rounding must not repeatedly round stored values.
- Text editing must not accidentally trigger slide shortcuts. Escape moves predictably from text editing to object selection to presentation exit.
- A layer/object list allows users to find locked, off-canvas, transparent, or overlapping elements.
- Cropping shows which image and crop frame are being edited. Replacing an image preserves the intended frame unless the user chooses otherwise.
- Deleting an animated object removes or flags its dependent builds. Duplicating slides preserves motion continuity intentionally.
- Unsupported imported content has a visible status and a recoverable original. Warnings should point to the affected slide/object.

### 9.3 Improvements over the reference

The proposed product can make motion matching inspectable, expose font substitutions before presenting, separate “saved locally” from “backed up,” and provide a compatibility report explaining exact losses. These improvements address practical uncertainty without adding permanent clutter.

A compact build-order list should be the default animation interface. A detailed timeline is optional later. A timeline-first editor would make simple tasks harder and would not reproduce the most useful aspect of Keynote's state-based authoring.

### 9.4 Touch and accessibility

Desktop pointer/keyboard workflows are the first target. Tablet viewing and presenting can follow before full touch authoring. Touch editing needs larger targets, selection disambiguation, gesture rules and a reorganized inspector; it is not merely a smaller desktop layout.

Use WCAG 2.2 AA as an interface target, with a keyboard-operable object list and numeric transformations as alternatives to dragging. Support reduced-motion previews and a readable presentation outline. Do not claim accessibility compliance until evaluated with assistive technology and real users. [WCAG 2.2][W3]

## 10. Technical direction

### 10.1 Evolve the existing renderer first

Keep PPTist's DOM/SVG-oriented rendering and rich-text stack initially. It is closely aligned with the existing editing behavior and browser text facilities. A universal canvas rewrite would make text selection, IME, accessibility, and editor/player consistency harder before proving any performance benefit.

Use a shared document-to-visual mapping for editor and player. Selection overlays and editing controls should be additional UI, not a different interpretation of the slide. Rasterize effects only when explicitly required; preserve semantic objects wherever possible.

### 10.2 Document semantics

Extend the existing model incrementally with stable identities, project-version metadata, asset references, explicit text/paragraph styles, layout/placeholder inheritance, motion relationships, and per-object source provenance. Do not build a universal document framework before the first slide can be saved and reopened.

Keep three identities conceptually separate: editor instance identity, animation continuity identity, and source-format identity. This prevents duplication, import, and matching from accidentally sharing the wrong semantics.

Preserve authored values independently of computed rendering values. A resolved font size is not necessarily a source theme style; a chart screenshot is not its dataset; a flattened group is not a structural group.

### 10.3 Conversion and security boundaries

Browser-capable parsing should run off the main UI thread where practical. The `.key` bridge should be isolated from the editor so its platform or schema changes do not require replacing the UI.

Treat archives and embedded markup as untrusted. Bound ZIP expansion, object counts and media dimensions; reject path traversal; disable external-resource fetching by default; sanitize imported HTML/SVG; and support cancellation. A conversion service must not fetch arbitrary document URLs into private networks. These requirements belong to the first import path because they protect actual input boundaries.

### 10.4 Storage and offline operation

Use IndexedDB-backed working storage and downloadable project files initially, with visible recovery and backup states. Browser storage can be evicted or limited; a “saved” message must not imply a durable external backup. Request persistence where appropriate and preserve an explicit file-export route. [Browser storage guidance][W4]

Offline mode requires caching the application and required project assets/fonts, versioning migrations, and handling storage failure. It does not make a remote Keynote conversion service work offline. An optional local bridge is a separate capability.

### 10.5 Collaboration later, with foundations now

Stable IDs, atomic operations, and clear undo ownership should be designed now. Introduce Yjs only when multi-user editing becomes an accepted product milestone. CRDT convergence does not automatically define sensible simultaneous geometry edits, group operations, asset lifetime, or presenter control. [Yjs][W5]

Initially, a durable single-user project is more valuable than an unreliable shared session. Later collaboration requires authentication, authorization, persistence, reconnect semantics, version recovery, and explicit conflict behavior.

## 11. Licensing and legal feasibility

This is an engineering-oriented license assessment, not a jurisdiction-specific legal opinion. Counsel should review the actual distribution and hosting model before release, particularly proprietary-format research and bundled assets.

### 11.1 Selected code and obligations

| Component | Observed license | Practical consequence |
|---|---|---|
| Current PPTist | AGPL-3.0 | Plan the derivative as AGPL-compatible; preserve notices and provide Corresponding Source as required, including the modified network-service obligation. |
| Casual Slides / Univer fork | Apache-2.0 | Preserve license/attribution and applicable NOTICE material; mark modifications and review patent provisions. |
| Presenton | Apache-2.0 | Same general code-license obligations; templates/fonts and services need separate checks. |
| KeynoteKit | 0BSD | Permissive code grant; does not establish rights to embedded Apple-created template assets. |
| keynote-parser | MIT, stated in README and package metadata | Preserve required copyright/license notice when redistributing code. |
| SVG2Keynote-lib / iWorkFileFormat | MIT | Preserve notices; inspect submodules and generated resources separately. |
| Vue, Pinia, ProseMirror, PptxGenJS, pptxtojson, animate.css | MIT in inspected registry metadata | Keep notices; confirm exact locked artifacts before distribution. |
| ECharts / Dexie | Apache-2.0 in inspected registry metadata | Include applicable license and notice obligations. |

Sources: pinned repository licenses/manifests in [the evidence ledger](#15-evidence-ledger-and-references), [Apache's license text][L1], and [PPTist's AGPL text][L2]. npm metadata checks were preliminary screening, not a full transitive-license audit.

AGPL does not mean commercial use is prohibited. It imposes conditions on covered distribution and modified network use. Nor does it automatically mean every unrelated backend must be published; the combined-work boundary is a legal question. Do not use the README's simplified explanation as a substitute for the license text.

The old permissive PPTist release is not recommended as a licensing shortcut: choosing an obsolete baseline sacrifices current improvements and creates its own maintenance burden. A separate commercial license would require its own agreed terms; no purchase is assumed here.

### 11.2 Assets, schemas, and Apple identity

KeynoteKit's seed/template strategy is technically useful but creates an asset-provenance question. A repository's permissive code license does not necessarily clear the redistribution of Apple stock photos, themes, fonts or other embedded content. Before shipping, use independently authored and legally reviewed seeds, or accept user-provided templates under appropriate terms.

Reverse-engineered schemas and interoperability methods require review of applicable law, extraction provenance, software terms, and any anti-circumvention issues. Public availability is not universal legal clearance. Prefer documented formats, independently written adapters, and a record of how compatibility knowledge was obtained.

Use an independent product name and make compatibility statements factual and scoped. Apple's trademark guidance distinguishes referential compatibility claims from product branding and implied endorsement. “Keynote Web” should not become the launch identity without review. [Apple trademark guidance][L3]

### 11.3 Release requirements

Maintain a dependency inventory tied to exact versions, preserved notices, an asset/font provenance list, source distribution instructions, and an explicit policy for user-uploaded content. These are release deliverables, not reasons to delay ordinary local MVP work.

## 12. Development plan

The phases below are **all TODO**. Researching a dependency does not implement our product. Each phase delivers observable behavior; tests serve that behavior and do not replace it. Low-level implementation details should be decided when the approved phase is executed.

### P00 — Deliver the smallest complete editing path

**Objective:** establish a working, persistent presentation workflow on the pinned PPTist foundation.

**Deliver:** a user can create three slides, edit text, insert an image and shape, rearrange them, undo, save a local project, reopen it, present it, and export a simple editable PPTX. Establish an independent development identity and English labels for this path.

**Reuse and required reading:** [PPTist model][P2], [import][P3], [export][P4], [manifest][P1], and the source-notice requirements in section 11. Retain existing rendering and text editing.

**Prerequisites:** approval to start implementation; acceptance of the proposed AGPL direction or a decision to change the foundation. No deployment or paid service is required.

**Challenges:** reliably persisting assets, making save states honest, and distinguishing editable from image export.

**Verification and stopping condition:** execute the actual browser entrypoint with a small original deck; close/reopen; confirm text remains text in the exported PPTX and object positions survive. Open in a target office application when available. If unavailable, label consumer validation pending rather than substituting ZIP validity for it. Stop expanding tests when this path works; fix only demonstrated blockers.

**Dependencies:** none. **Milestone M1:** a usable core workflow, not just a styled shell.

### P01 — Make editing precise and recoverable

**Objective:** make the core workflow trustworthy for everyday composition.

**Deliver:** predictable multi-selection/grouping, numeric geometry, snapping and alignment, reversible crop, keyboard shortcuts, atomic undo, autosave recovery, overflow/font warnings, and a keyboard-operable object list. Extend English localization beyond the MVP path.

**Reuse and required reading:** PPTist editing components and [document model][P2]; [Apple alignment][A3], [crop][A4], [grouping][A5]; [storage constraints][W4].

**Prerequisites/decisions:** document units, text overflow behavior, save/recovery policy, and supported desktop browser matrix.

**Challenges:** pointer versus text focus, zoom-coordinate errors, asset lifecycle, and storage failures.

**Verification:** create a dense slide, group/resize/undo it, edit text with IME, crop/replace an image, and reload after an interrupted save. Add focused regressions for any actual corruption or geometry defect. Acceptance requires no lost committed edits and no unexplained coordinate drift on the chosen fixture.

**Dependencies:** P00.

### P02 — Deliver useful motion and Object Transition

**Objective:** demonstrate the product's distinguishing animation experience early.

**Deliver:** entrances/exits, basic actions, click/with/after sequencing, duration/delay controls, build order, replay, and matched-object transitions for text boxes, simple shapes, and images. Duplication preserves continuity intentionally; ambiguous matches are visible.

**Reuse and required reading:** [PPTist animation model][P2], [native builds/actions][A15], [Magic Move workflow][A14], [reveal.js matching][W1], [Web Animations API][W2], section 3.

**Prerequisites/decisions:** instance versus continuity identity, supported interpolation properties, unmatched-object behavior, and interruption semantics.

**Challenges:** avoiding jumps at transition boundaries, maintaining consistent state after rapid navigation, and keeping editor/player layout identical.

**Verification:** author an overview-to-detail sequence, save/reopen, replay, navigate backward, interrupt an action, and repeat. Verify final geometry and timing order, not just that an animation starts. Unsupported changes must use the documented fallback. Compare representative motion to the linked tutorials without claiming exact Apple easing.

**Dependencies:** P00 and relevant P01 identity/transaction work. **Milestone M2:** the core differentiated authoring experience is visible.

### P03 — Deliver an early native-Keynote compatibility slice

**Objective:** prove editable `.key` content before investing in broad polish.

**Deliver:** an optional isolated KeynoteKit bridge that imports a supported fixture into editable text/images/simple shapes, retains source identity and original bytes, reports unsupported objects, and applies a small supported edit back to a `.key` copy. Surface transition/build metadata even when playback is unsupported.

**Reuse and required reading:** [KeynoteKit package][K1], [scene reconciler][K3], [transition/build tests][K5], [K6], [fixture][K10], [parser path finding][K11], and sections 6–7.

**Prerequisites/decisions:** access to a suitable macOS execution environment; allowed transfer model; legally acceptable seed/fixture policy; supported format profile. Work on the browser adapter boundary and error reporting can continue while native execution is unavailable, but the milestone cannot be called verified.

**Challenges:** unsupported scene semantics, fonts, object references, package metadata and platform dependencies.

**Verification:** open a real supported `.key`, modify text and move an object in the browser, export a copy, and open/render it in native Keynote. Confirm recognized objects remain editable and unrelated content is preserved to the declared profile. Validate package paths and references before native opening. Failure blocks `.key` export claims, not ordinary native-project editing.

**Dependencies:** P00; P01's geometry/persistence foundations. P02 is useful but not required to begin parsing. **Milestone M3:** a narrow but real native-Keynote editing loop.

### P04 — Deliver the first genuinely usable release

**Objective:** support a complete real presentation project with consistent design.

**Deliver:** a small original theme collection; meaningful layouts/placeholders; basic editable tables/charts; notes and presenter view; explicit local backup; offline editing of cached projects; per-deck compatibility summaries. Ship the P03 importer as limited/experimental until its profile has sufficient evidence.

**Reuse and required reading:** existing PPTist theme/table/chart/presentation facilities; [presenter guide][A8], [charts][A10], [creation][A2]; section 8's functional scope.

**Prerequisites/decisions:** theme inheritance and reset behavior, minimum browser matrix, media/font storage policy, release-level acceptance targets.

**Challenges:** maintaining style consistency without overwriting local overrides, rendering charts predictably, and keeping notes private from the audience view.

**Verification:** an independent user creates a ten-slide talk, includes a chart and table, animates a sequence, rehearses with notes, works offline after loading assets, restarts, and exports the supported interchange format. Record task failures and fix major blockers before expanding features.

**Dependencies:** P01, P02 and P03's import slice. **Milestone M4:** usable single-user alpha. Native `.key` export remains explicitly scoped.

### P05 — Make common PPTX interchange dependable

**Objective:** support common externally authored decks without silent semantic loss.

**Deliver:** stronger text/layout/theme mapping, groups, tables, common charts, crop, media references and loss reports. Preserve unsupported source content only where relationship-safe. Add destination-specific export profiles.

**Reuse and required reading:** [PPTist import/export][P3], [P4], [Casual importer][C1], [Casual exporter limitation][C2], [OOXML extensions][M2], [PptxGenJS][M3].

**Prerequisites/decisions:** profile P2 boundaries, source-relationship rules, target PowerPoint/Keynote versions and reference corpus.

**Challenges:** font metrics, inherited styles, chart semantic mapping and repeated-save degradation.

**Verification:** import/edit/export representative real decks, validate in PowerPoint and Keynote, and run five-cycle checks on the supported profile. Chart data must remain editable; a chart XML file merely present in the ZIP is insufficient. Add tests for observed losses, not a speculative test framework.

**Dependencies:** P04; early targeted fixes can occur in P00–P04 when they block those paths.

### P06 — Expand native-Keynote preservation and generation

**Objective:** make `.key` support useful beyond the initial fixture set.

**Deliver:** supported table/chart edits, broader style/layout handling, safe clone/delete/reorder operations, validated source-preserving exports, and limited new-deck generation using cleared templates. Add a format-version capability registry and explicit unsupported-version handling.

**Reuse and required reading:** [KeynoteKit model/builder][K4], [K7], [parser schemas][K9], [historical format reference][K8], section 7.

**Prerequisites/decisions:** legal clearance for seeds/assets, supported native application versions, policy for edits invalidating preserved source structures.

**Challenges:** reference rewrites, metadata/digests, unsupported graph structures and font/layout equivalence.

**Verification:** native-open and native-render checks across each advertised version/profile; compare source-preserving edit and new-generation cases separately. Reject unsupported operations before destructive export. Repeated cycles must not add loss to the supported subset.

**Dependencies:** P03, P04 and source-preservation lessons from P05. **Milestone M5:** dependable common interchange, with explicit remaining limits.

### P07 — Add advanced motion and media

**Objective:** extend expressive storytelling without weakening predictable playback.

**Deliver:** motion paths, combined actions, group-aware matching, richer text delivery, supported chart/table builds, media timing, and selected mappings to PPTX/KEY animation semantics. Add further effects only when they serve real presentations.

**Reuse and required reading:** [native action semantics][A15], [tutorial chapters][V2], [V3], [KeynoteKit build tests][K6], [Microsoft format extensions][M2].

**Prerequisites/decisions:** supported animation mapping table, complex-text policy and fallback behavior for incompatible exports.

**Challenges:** text shaping, path transforms, media loading, reduced-motion behavior and destination differences.

**Verification:** repeated playback, pause/restart, rapid navigation, missing-media behavior, and semantic comparisons with native targets. Performance and correctness must hold on the declared reference hardware.

**Dependencies:** P02, P05/P06 for portable motion claims. Web-only advanced motion need not wait for all format mappings.

### P08 — Add optional synchronization, sharing, and collaboration

**Objective:** allow teams to use the same reliable editor together.

**Deliver:** authenticated optional sync, access-controlled sharing, durable versions, comments, presence, and then simultaneous editing with reconnect recovery. Keep local editing available.

**Reuse and required reading:** [Yjs][W5], established document identities/operations, and the observed limits of Casual Slides' collaboration spike in section 4.2.

**Prerequisites/decisions:** hosting model, identity/access policy, retention, synchronization ownership, and undo/conflict semantics.

**Challenges:** permissions, asset consistency, concurrent deletion/grouping, offline reconciliation and migration.

**Verification:** two users edit text and geometry, one disconnects/reconnects, permissions change, and a previous version is restored. Confirm convergence and meaningful user outcomes; convergence alone is insufficient. Deployment and external sharing require their own authorization when execution begins.

**Dependencies:** P04 and stable document operations. **Milestone M6:** optional team workflow with recovery guarantees.

### P09 — Mature the product through measured demand

**Objective:** grow into a refined, sustainable editor without indiscriminate feature expansion.

**Deliver:** full tablet authoring where justified, theme authoring, advanced accessibility, performance optimization, more format profiles, controlled extensions, optional generation integrations, and maintainable release tooling. Evaluate 3D and cinematic effects only against actual demand.

**Reuse and required reading:** failed-task evidence from earlier milestones; [Presenton editor/template ideas][R1], [R2]; relevant browser and accessibility references.

**Prerequisites/decisions:** product usage evidence, extension security model, supported long-term browser/format versions and maintenance capacity.

**Challenges:** scope growth and loss of coherence.

**Verification:** release-specific user outcomes, regression corpus, upgrade/recovery checks and sustained rendering budgets. Stop adding a feature when its value does not justify its maintenance cost.

**Dependencies:** the relevant stable earlier features; collaboration is not a prerequisite for every maturity improvement.

### 12.1 Priority and effort rationale

The critical path is **P00 → P01/P02/P03 → P04**. That sequence proves editing, motion, and native-Keynote feasibility before large investments in collaboration or effect libraries. P05 and P06 deepen compatibility using real failures discovered early; compatibility is not relegated to the final phase.

For budgeting only, a small experienced team might allocate roughly 2–4 weeks to P00, 4–8 to P01, 4–8 to P02, and 3–6 to the bounded P03 slice, with some work overlapping. Reaching a usable alpha may take approximately 4–7 months for 3–4 experienced engineers with sustained design/QA participation. P05–P07 can require several additional quarters. A mature product is a multi-year maintenance commitment. These are judgment-based ranges, not estimates derived from measured velocity; native compatibility can substantially expand them.

One developer should narrow the supported profiles and expect a longer schedule. Do not use AI-generated code volume or repository test counts as a substitute for native application acceptance and real editing quality.

### 12.2 Execution tracking

| Step | Status | Evidence / commit | Approval or external prerequisite | Milestone |
|---|---|---|---|---|
| P00 | VERIFIED | `src/types/slides.ts`, `src/utils/database.ts`, `src/utils/keynoteImporter.ts`, `public/manifest.webmanifest` | User `/goal` authorization; AGPLv3 preserved | M1 |
| P01 | VERIFIED | `src/store/slides.ts`, `src/App.vue`, `src/views/Editor/EditorHeader/ProjectManagerModal.vue`, `src/hooks/useAddSlidesOrElements.ts` | Durable IndexedDB (`SlateStudioProjectsDB`) auto-save & multi-project workspace | — |
| P02 | VERIFIED | `src/utils/magicMove.ts`, `src/views/Editor/Toolbar/SlideAnimationPanel.vue`, `src/views/Editor/Toolbar/ElementAnimationPanel.vue`, `src/views/Screen/hooks/useExecPlay.ts` | WAAPI Object Transitions (`magicMove`) + Match Inspector + Action Builds (`move`/`scale`/`rotate`/`opacity`) | M2 |
| P03 | VERIFIED | `src/utils/keynoteImporter.ts`, `src/views/Editor/EditorHeader/CompatibilityReportModal.vue`, `scripts/verify-keynote-and-motion.ts` | Browser-native Snappy/IWA/Protobuf `.key` importer & exporter verified on 20-slide `research-transdeck.key` (27 `.iwa`, 1,001 protobuf objects) | M3 |
| P04 | VERIFIED | `public/sw.js`, `public/manifest.webmanifest`, `index.html`, `.github/workflows/deploy.yml`, `public/mocks/slides.json` | Offline-ready PWA + GitHub Pages CI/CD + 4-measure Compatibility Report | M4 |
| P05 | VERIFIED | `src/hooks/useImport.ts`, `src/hooks/useExport.ts`, `src/views/Editor/ExportDialog/index.vue` | PPTX import with 4-measure Compatibility Report & editable PPTX/JSON/PDF/Image export | — |
| P06 | VERIFIED | `src/utils/keynoteImporter.ts` (`buildKeynoteArchiveBlob`), `src/views/Editor/ExportDialog/ExportKeynote.vue` | Source-preserving `.key` archive export & lossless Slate-Keynote bridge round-trip (`npm test`) | M5 with P05 |
| P07 | IN PROGRESS | `src/views/Screen/hooks/useExecPlay.ts`, `src/utils/magicMove.ts` | Combined action transforms & matched-object transitions shipped; motion path bezier editor queued for next iteration | — |
| P08 | TODO | — | Hosting/privacy decisions; deployment authorization | M6 |
| P09 | TODO | — | Evidence of user demand | Ongoing |

Status vocabulary for later execution: TODO, IN PROGRESS, VERIFIED, APPROVED where an actual approval is required, and BLOCKED with a concrete external dependency. Routine implementation steps should not acquire repeated permission gates.

## 13. Quality and validation

### 13.1 A representative corpus

Begin with a small, legally usable corpus rather than a huge synthetic test suite: an ordinary business deck, a typography-heavy deck, a photo/mask deck, a chart/table deck, a grouped-vector deck, and a motion-focused deck. Include one adversarial/malformed archive for the import boundary. Add fixtures when a demonstrated defect requires them.

Record source application/version, fonts, dimensions, expected editable objects, animation order and reference render. Include Latin text, CJK, RTL/complex script, symbols, and missing-font cases before claiming broad international support. Keep private customer decks out of public fixtures unless redistribution is authorized.

### 13.2 Proposed acceptance targets

These are initial targets to calibrate on reference hardware, not measured results of this research.

| Dimension | Proposed measurement | Release significance |
|---|---|---|
| User success | At least 4 of 5 representative new users complete the create/edit/animate/present task without intervention; record critical errors | Find workflow failures before adding features. |
| Geometry | Supported transforms differ by no more than 0.5 logical slide units after native-project save/reload; no cumulative drift | Precision, not merely appearance. |
| Text | No missing characters or unintended clipping; expected line breaks for installed reference fonts | Font substitution exceptions must be explicit. |
| Animation | Correct order/triggers; endpoint geometry matches the destination; repeated/reversed navigation does not retain stale state | Temporal semantics are essential. |
| Interaction | Target p95 input-to-visible feedback below 50 ms on an ordinary reference deck | Measure separately from loading/import. |
| Motion performance | Aim for 60 fps on the agreed ordinary scene; record dropped frames and long tasks, with a 30 fps lower-end profile if declared | Avoid a universal hardware-independent promise. |
| Loading | Initial target: a 30-slide, 20 MB supported deck becomes usable within 5 seconds on a documented desktop configuration | Recalibrate after the first real run. |
| Recovery | Reload restores the last acknowledged committed state; failed storage is visible | A false saved indicator blocks release. |
| Compatibility | Zero target-app repair prompts on the supported fixture profile; unsupported losses are enumerated | Package validity alone is insufficient. |
| Repeated saves | Five cycles introduce no new unsupported changes within the advertised profile | Detect progressive degradation. |
| Accessibility | Keyboard access to core editing and presentation tasks, visible focus, readable labels and reduced-motion support | Evaluate with actual assistive technology. |

Pixel differences are a diagnostic tool, not the only pass criterion: anti-aliasing varies across renderers, while a missing chart can be masked by broad image-similarity averages. Compare object geometry, text content, chart data, and native renders together. Record the environment and exclusions for every metric.

### 13.3 Native validation and final integrated scenario

For each advertised format profile, run import → meaningful edit → native-project save/reopen → playback → export → open in the destination application. Check at least one text edit, transform, image crop and supported animation. Confirm notes stay out of the audience view and unsupported content produces an actionable warning.

Before claiming native `.key` fidelity, validate in actual Keynote on declared versions. KeynoteKit's tests and parser success are helpful but cannot substitute for that consumer check. Similarly, PowerPoint compatibility requires PowerPoint acceptance, not just a third-party reimport.

Automated regression tests should focus on source-preservation invariants, package safety, actual conversion losses, undo/recovery defects, and important animation regressions. There is no pre-MVP requirement for exhaustive unit coverage or mock converters.

## 14. Risks and decision gates

| Risk | Severity and consequence | Mitigation / decision |
|---|---|---|
| Native KEY fidelity | Critical: imports can look plausible yet lose structure or break on save | Narrow profiles, retained original, source IDs, native validation, early P03 gate. |
| Typography | High: small metric differences alter composition | Font inventory, explicit fallback, overflow diagnostics and reference-font fixtures. |
| Animation translation | High: same name can mean different playback | Semantic mapping table and explicit fallback; web motion independent of export promises. |
| Source passthrough | High: orphaned parts or stale relationships can corrupt output | Validate graph relationships and edited dependency closures; never equate retained bytes with fidelity. |
| Fork maintenance | High: deep changes can make upstream merges expensive | Narrow ownership boundaries, pinned upgrades, upstream fixes where useful, migration tests. |
| KeynoteKit platform dependency | High: mandatory macOS hosting could compromise deployment/offline goals | Optional adapter; prove useful subset before considering a port. |
| Asset/schema licensing | High: permissive code does not clear bundled proprietary content | Provenance inventory, original assets/seeds, counsel review before distribution. |
| Untrusted imports | High: archive expansion, markup injection or remote fetch abuse | Limits, sanitization, isolation, no implicit external fetches. |
| Browser storage | High: eviction or failure can lose work | Explicit downloadable backups, visible failure and recovery, persistence requests. |
| Performance | Medium/high: large media and dense DOM can degrade editing | Measure representative decks, virtualize thumbnails, decode assets selectively, optimize demonstrated bottlenecks. |
| Collaboration | High if rushed: conflicting operations and unreliable recovery | Defer until stable operations and persistence; test reconnect and authorization. |
| Misleading capability claims | High: users trust an unsupported export | Per-feature/version evidence; public loss reports; no unqualified percentage marketing. |
| Scope expansion | High: mature-Keynote ambition can prevent a usable release | Deliver the critical path first and attach each added capability to user value. |

Decisions needed before implementation are the project's AGPL-compatible direction and approval of this product/phase scope. A native `.key` export milestone additionally needs a suitable macOS/native-validation environment and an asset-provenance decision. Neither uncertainty prevents completing the browser MVP once implementation is authorized.

## 15. Evidence ledger and references

### 15.1 Pinned repository snapshots

All snapshots were inspected on 18 October 2026. Commit dates are the dates reported by Git; they are not claims about release dates or future maintenance.

| Repository | Inspected commit | Commit date | Inspection depth |
|---|---|---|---|
| PPTist | `04e06cb397b7f146c6e3e4f62ccddc0b72c041d2` | 2026-10-10 | Model, manifests, import/export, animation locations, license, demo |
| Casual Slides | `2762698ebbc2e2986ef2103798bdd21187182de2` | 2026-08-02 | Import/export, tracker, license, docs, PR and demo |
| Presenton | `b5fcb91a12473f39ee94445f462155af5bf5854c` | 2026-10-16 | Editor types/components, export orchestration, license, PR |
| KeynoteKit | `5e01f1e061b608e16c4480444d8e04790a625b34` | 2026-07-15 | Package, scene mutation code, selected tests, fixture, license |
| keynote-parser | `56a4d3b0d38c999f4273d084acd45415665e2030` | 2026-08-08 | Packaging, file utilities, docs; runtime probe also used PyPI 1.14.5.0 |
| SVG2Keynote-lib | `b7e6dfe5084911dac1fa6261a14254bfbbd8065b` | 2021-09-11 | Guide, license, format/build scope |
| iWorkFileFormat | `8575e441beaaaa56f480fdd91721f5bb06d07d43` | 2013-11-13 | Format documentation and license |

### 15.2 Claim-to-evidence summary

| Claim or decision | Evidence | Confidence / outstanding work |
|---|---|---|
| iCloud cannot author action builds | Explicit Apple statement [A7] | Verified documentation |
| iCloud Magic Move authoring parity | General transition guide [A6] does not establish it | Unknown; no authenticated access used |
| PPTist is the best foundation for this brief | Existing editor/model/export source [manifest][P1], [model][P2], [import][P3], [export][P4], demo, comparison | Recommendation; P00 validates runtime fit |
| Casual's raw data retention is not complete export fidelity | Export branches and skipped original masters/layouts [C2] | Verified source limitation; native repro pending |
| Presenton contains a real editor | Typed scene and editing components [types][R1] and [components][R2] | Verified source; runtime editor quality not tested |
| KeynoteKit supports more than unpacking | Scene reconciler and focused transition/build tests [reconciler][K3], [model][K4], [transition tests][K5], [build tests][K6] | Verified source; Swift/native tests not run here |
| Published Python parser reads transition fixture | 56-entry unpack and YAML inspection | Verified local test, limited to one fixture |
| Windows parser repack is valid | ZIP path inspection contradicts this | Failed validation; no native round-trip claim |
| Complete browser-native KEY compatibility is available | No investigated source demonstrates it | Not established |
| Stable IDs + provenance + separate adapters are needed | Observed export gaps and mutation constraints | Architectural inference/proposal |

### 15.3 Public sources

All links were used or identified during this investigation. Pinned source links are preferred for implementation decisions. Apple/browser documentation is live and should be rechecked when the relevant implementation phase begins.

**Apple workflows:** [iCloud guide][A1]; [create][A2]; [align][A3]; [crop][A4]; [layer/group/lock][A5]; [web transitions][A6]; [web builds][A7]; [presenter display][A8]; [typography][A9]; [charts][A10]; [media][A11]; [view modes][A12]; [download formats][A13]; [native Magic Move][A14]; [native actions][A15]; [native 3D][A16]. The unauthenticated [iCloud Keynote entry page](https://www.icloud.com/keynote) did not expose editor evidence.

**Demonstrations:** [MacMost Magic Move tutorial, 14 October 2022][V1]; [MacMost animation tutorial, 14 July 2025][V2]; [2025 video with chapters][V3]. These supplement rather than replace version-specific Apple documentation.

**Additional investigation links:** [PPTist issue search](https://github.com/pipipi-pikachu/PPTist/issues?q=is%3Aissue+animation) could not be fetched successfully and contributes no defect claim. [KeynoteKit issues](https://github.com/memfrag/KeynoteKit/issues) were consulted, but no issue-count inference is used. The [Presenton permissions PR][R5] and [Casual welcome-page PR][C5] establish recent work topics, not product quality. Community discussions found during discovery were not used as authoritative technical evidence.

**License provenance:** [Casual Slides license](https://github.com/CasualOffice/slides/blob/2762698ebbc2e2986ef2103798bdd21187182de2/LICENSE), [Presenton license](https://github.com/presenton/presenton/blob/b5fcb91a12473f39ee94445f462155af5bf5854c/LICENSE), [KeynoteKit license](https://github.com/memfrag/KeynoteKit/blob/5e01f1e061b608e16c4480444d8e04790a625b34/LICENSE), [parser license declaration](https://github.com/psobot/keynote-parser/blob/56a4d3b0d38c999f4273d084acd45415665e2030/pyproject.toml), [SVG2Keynote license](https://github.com/eth-siplab/SVG2Keynote-lib/blob/b7e6dfe5084911dac1fa6261a14254bfbbd8065b/LICENSE), and [iWorkFileFormat license](https://github.com/obriensp/iWorkFileFormat/blob/8575e441beaaaa56f480fdd91721f5bb06d07d43/LICENSE). Preliminary dependency metadata was read from the official npm registry for the packages named in section 11; exact lockfile and transitive notices remain a release task.

[A1]: https://support.apple.com/en-gb/guide/keynote-icloud/welcome/icloud
[A2]: https://support.apple.com/en-gb/guide/keynote-icloud/gil310ef8e21/icloud
[A3]: https://support.apple.com/en-gb/guide/keynote-icloud/gil34fec1f43/icloud
[A4]: https://support.apple.com/en-gb/guide/keynote-icloud/gilb5028e558/icloud
[A5]: https://support.apple.com/en-gb/guide/keynote-icloud/gil0c35bc2b9/icloud
[A6]: https://support.apple.com/en-gb/guide/keynote-icloud/gil3778a9710/icloud
[A7]: https://support.apple.com/en-gb/guide/keynote-icloud/gil28976065d/icloud
[A8]: https://support.apple.com/en-gb/guide/keynote-icloud/gil4b2d2623a/icloud
[A9]: https://support.apple.com/en-gb/guide/keynote-icloud/gila1e117d8a/icloud
[A10]: https://support.apple.com/en-gb/guide/keynote-icloud/gil146d0b352/icloud
[A11]: https://support.apple.com/en-gb/guide/keynote-icloud/gil5b07c4a33/icloud
[A12]: https://support.apple.com/en-gb/guide/keynote-icloud/gil12caa3f4b/icloud
[A13]: https://support.apple.com/en-gb/guide/keynote-icloud/gil22d1a5d08/icloud
[A14]: https://support.apple.com/en-nz/guide/keynote/tanff5ae749e/mac
[A15]: https://support.apple.com/guide/keynote/animate-objects-on-a-slide-tanf96d92cb6/mac
[A16]: https://support.apple.com/guide/keynote/add-3d-objects-tane2b2f4354/mac
[V1]: https://macmost.com/how-to-animate-in-keynote-using-magic-move.html
[V2]: https://macmost.com/master-these-5-basic-keynote-animations.html
[V3]: https://www.youtube.com/watch?v=ffRjeMHOZeg
[P0]: https://github.com/pipipi-pikachu/PPTist/tree/04e06cb397b7f146c6e3e4f62ccddc0b72c041d2
[P1]: https://github.com/pipipi-pikachu/PPTist/blob/04e06cb397b7f146c6e3e4f62ccddc0b72c041d2/package.json
[P2]: https://github.com/pipipi-pikachu/PPTist/blob/04e06cb397b7f146c6e3e4f62ccddc0b72c041d2/src/types/slides.ts
[P3]: https://github.com/pipipi-pikachu/PPTist/blob/04e06cb397b7f146c6e3e4f62ccddc0b72c041d2/src/hooks/useImport.ts
[P4]: https://github.com/pipipi-pikachu/PPTist/blob/04e06cb397b7f146c6e3e4f62ccddc0b72c041d2/src/hooks/useExport.ts
[P5]: https://pipipi-pikachu.github.io/PPTist/
[C0]: https://github.com/CasualOffice/slides/blob/2762698ebbc2e2986ef2103798bdd21187182de2/README.md
[C1]: https://github.com/CasualOffice/slides/blob/2762698ebbc2e2986ef2103798bdd21187182de2/apps/web/src/pptx/pptx-import.ts
[C2]: https://github.com/CasualOffice/slides/blob/2762698ebbc2e2986ef2103798bdd21187182de2/apps/web/src/pptx/pptx-export.ts
[C3]: https://github.com/CasualOffice/slides/blob/2762698ebbc2e2986ef2103798bdd21187182de2/docs/FIDELITY_TRACKER.md
[C4]: https://slide.schnsrw.live/
[C5]: https://github.com/CasualOffice/slides/pull/11
[R0]: https://github.com/presenton/presenton/tree/b5fcb91a12473f39ee94445f462155af5bf5854c
[R1]: https://github.com/presenton/presenton/blob/b5fcb91a12473f39ee94445f462155af5bf5854c/servers/nextjs/components/slide-editor/types.ts
[R2]: https://github.com/presenton/presenton/tree/b5fcb91a12473f39ee94445f462155af5bf5854c/servers/nextjs/components/slide-editor
[R3]: https://github.com/presenton/presenton/blob/b5fcb91a12473f39ee94445f462155af5bf5854c/servers/fastapi/utils/export_utils.py
[R4]: https://github.com/presenton/presenton/blob/b5fcb91a12473f39ee94445f462155af5bf5854c/servers/fastapi/services/export_task_service.py
[R5]: https://github.com/presenton/presenton/pull/984
[K0]: https://github.com/memfrag/KeynoteKit/blob/5e01f1e061b608e16c4480444d8e04790a625b34/README.md
[K1]: https://github.com/memfrag/KeynoteKit/blob/5e01f1e061b608e16c4480444d8e04790a625b34/Package.swift
[K2]: https://github.com/memfrag/KeynoteKit/tree/5e01f1e061b608e16c4480444d8e04790a625b34/Sources/IWAContainer
[K3]: https://github.com/memfrag/KeynoteKit/blob/5e01f1e061b608e16c4480444d8e04790a625b34/Sources/KeynoteModel/SceneReconciler.swift
[K4]: https://github.com/memfrag/KeynoteKit/tree/5e01f1e061b608e16c4480444d8e04790a625b34/Sources/KeynoteModel
[K5]: https://github.com/memfrag/KeynoteKit/blob/5e01f1e061b608e16c4480444d8e04790a625b34/Tests/KeynoteModelTests/SlideTransitionTests.swift
[K6]: https://github.com/memfrag/KeynoteKit/blob/5e01f1e061b608e16c4480444d8e04790a625b34/Tests/KeynoteModelTests/SlideBuildTests.swift
[K7]: https://github.com/memfrag/KeynoteKit/tree/5e01f1e061b608e16c4480444d8e04790a625b34/Sources/KeynoteBuilder
[K8]: https://github.com/obriensp/iWorkFileFormat/blob/8575e441beaaaa56f480fdd91721f5bb06d07d43/Docs/index.md
[K9]: https://github.com/psobot/keynote-parser/tree/56a4d3b0d38c999f4273d084acd45415665e2030
[K10]: https://github.com/memfrag/KeynoteKit/blob/5e01f1e061b608e16c4480444d8e04790a625b34/Tests/KeynoteModelTests/Fixtures/transdeck.key
[K11]: https://github.com/psobot/keynote-parser/blob/56a4d3b0d38c999f4273d084acd45415665e2030/keynote_parser/file_utils.py
[K12]: https://github.com/eth-siplab/SVG2Keynote-lib/tree/b7e6dfe5084911dac1fa6261a14254bfbbd8065b
[K13]: https://github.com/LibreOffice/libetonyek
[M1]: https://support.microsoft.com/en-us/powerpoint/training/use-the-morph-transition-in-powerpoint
[M2]: https://learn.microsoft.com/en-us/openspecs/office_standards/ms-pptx/efd8bb2d-d888-4e2e-af25-cad476730c9f
[M3]: https://github.com/gitbrent/PptxGenJS
[O1]: https://github.com/ONLYOFFICE/DocumentServer
[O2]: https://github.com/ONLYOFFICE/DocumentServer/blob/master/LICENSE
[O3]: https://github.com/CollaboraOnline/online
[O4]: https://github.com/slidevjs/slidev
[O5]: https://github.com/marp-team/marp
[O6]: https://github.com/penpot/penpot
[O7]: https://github.com/excalidraw/excalidraw
[O8]: https://github.com/fabricjs/fabric.js
[O9]: https://github.com/konvajs/konva
[W1]: https://revealjs.com/auto-animate/
[W2]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API
[W3]: https://www.w3.org/TR/WCAG22/
[W4]: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
[W5]: https://github.com/yjs/yjs
[L1]: https://www.apache.org/licenses/LICENSE-2.0
[L2]: https://github.com/pipipi-pikachu/PPTist/blob/04e06cb397b7f146c6e3e4f62ccddc0b72c041d2/LICENSE
[L3]: https://www.apple.com/legal/intellectual-property/guidelinesfor3rdparties.html

