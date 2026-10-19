# Repository agent rules

## No subagents

Do not spawn, invoke, or delegate work to subagents. Perform implementation,
research, testing, and review in the main agent.

## MVP-first implementation

Implement and exercise the smallest real end-to-end path before abstractions,
polish, or broad test coverage. Prefer real fixtures and real entrypoints. Add
focused regression coverage only after the core path works.

## Token-efficient UI verification

Do not use interactive Computer Use as the primary way to inspect, click
through, or verify this application.

When UI behavior must be checked:

1. Write a deterministic repository script or focused automated test that
   performs the interaction and asserts the expected DOM/model result.
2. Run that script against the local application. Prefer selectors and state
   assertions over visual interpretation.
3. If visual evidence is still useful, capture exactly one final screenshot at
   the lowest useful resolution. Use `scripts/capture-ui-lowres.ps1`, whose
   default viewport is 480x270. Crop or lower the resolution further when the
   target remains legible.
4. Use Computer Use only when browser automation cannot reproduce the state.
   If it is necessary, perform only the missing action and capture one
   low-resolution screenshot; do not take exploratory screenshot sequences.
5. Store durable evidence under `doc/parity-evidence/` and remove temporary
   screenshots or debug scripts before committing.

The interaction script is the verification source of truth. A screenshot is
supporting evidence and does not replace DOM, state, or round-trip assertions.

