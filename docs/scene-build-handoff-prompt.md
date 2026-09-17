# Agent handoff prompt: complete the 3D home blueprint and explore reward progression

You are continuing Read My Bible in `/Users/rico/Git/readmybible-app.favor.church`.

## Your assignment

Complete the remaining work in [the scene blueprint](scene-blueprint.md), using the existing Tent template as the foundation. Include a distinct product discovery round for rewards, scene access, daily member appearances, and the linear home progression. **The gamification ideas below are preferences to explore, not approved mechanics. Do not choose or implement their rules without Rico's decision.**

This prompt authorizes the technical continuation described below after confirming the tent direction is accepted. It does not authorize deployment, changing production data, closing issue #101 as fully complete without evidence, or silently deciding unresolved product behavior.

## Read first and establish current state

1. Read the repo's `AGENTS.md`, its referenced instructions, and `docs/scene-blueprint.md`. Follow the graph-first workflow and current documentation requirements.
2. Check the worktree and current implementation. Earlier changes may be uncommitted or have advanced since this handoff. Preserve unrelated work; do not reset the workspace or rebuild completed work.
3. Read [issue #101](https://github.com/favorchurch/readmybible-app.favor.church/issues/101) for the original interaction criteria. Later user directions in this prompt override its initial scope where they differ.
4. Inspect the reference image at `/Users/rico/Downloads/Read My Bible App Redesign Mockup.png` if available. The blueprint's temporary screenshot paths and localhost server may no longer exist; capture fresh evidence when necessary.
5. Establish whether Rico has accepted the current tent's visual direction. If acceptance is not recorded, present the actual tent in portrait and landscape for a short review before multiplying it across five more homes. Continue independent code/context inspection while awaiting that decision.

## Existing direction to preserve

- Classic remains the default and the original immersive view remains available. The new 3D experience is an alternative.
- Tent and Campfire currently exist as alternate presentations only for the Tent stage. Higher stages retain Classic until their new versions are ready.
- Faces must remain visible and recognizable, with names above people. Preserve roster identity, saved avatar customization, member selection, and read-state semantics.
- Use the established forest clearing, warm fire, home-behind-gathering composition, and unobtrusive controls as the visual starting point.
- Preserve fixed camera elevation/pitch, bounded horizontal navigation, person-priority dragging, ground-plane placement, keyboard support, and modal usability.
- The implementation is a procedural 3D interpretation of the mockup. Do not claim illustration-level fidelity or complete avatar parity without inspecting the results.
- Use pnpm and the existing lockfile. Keep the renderer lazy-loaded.

## Round 1 — Validate and finish the reusable Tent foundation

Use the blueprint's remaining checks to identify actual gaps. Prioritize those that would multiply across the other homes: framing, model grounding, labels, member positioning, camera bounds, drag exclusions, disposal, and performance.

Check small, normal, and large groups, including an empty scene. Inspect both allowed camera extremes, portrait and landscape. Confirm names and faces remain usable and profile taps are not mistaken for drags. Check customization variants rather than treating matching shirt/skin colors as complete identity parity.

Keep improvements bounded and show observable before/after evidence. Get Rico's visual acceptance of the foundation if it is still outstanding.

## Round 2 — Gamification and rewards discovery: discuss before deciding

Rico wants a dedicated round to make the experience more rewarding, with deliberate anticipation and meaningful unlocks. Explore these examples:

- Tease the availability of the new 3D scene while it is locked, potentially showing an empty scene without people.
- Unlock the scene when the first person reads.
- Add people to the scene when they have read the day's text, or use another participation mechanic that feels better.
- Make unlocks in the linear home progression understandable, motivating, and available at the appropriate point in the reading journey.

**None of those examples is a finalized rule.** Do not interpret “or something” as permission to select a rule. Do not invent thresholds, reset behavior, eligibility rules, reward currencies, or persistence requirements. Do not reinterpret “reads” as opening the reader, finishing a scroll, or checking in without agreement.

### Investigate the existing product before proposing changes

Inspect the current reading/check-in source of truth, daily date/timezone handling, plan phases, group completion calculation, coins, Rewards screen, and linear roadmap/home stages. Explain which existing concepts can support the proposed experience and where a change would introduce a new product rule.

Treat these as separate decisions:

1. **Access to the alternate 3D scene.** What unlocks it, for whom, and for how long?
2. **A person's appearance in the gathering.** Which participation signal controls presence, and does it reset?
3. **Home stage progression.** What advances or unlocks the next home, and how is that communicated?
4. **Reward feedback.** How do anticipation, arrival, milestones, coins, and the existing Rewards screen relate without duplicating or contradicting each other?

### Bring Rico a concrete, reviewable proposal

Present two or three coherent options, with a recommendation clearly marked as a proposal. Use concise flows or state tables and sample UI copy. Show what a person sees before eligibility, at the unlock moment, later that day, and on the following day. Connect the proposal to both the scene and the linear progression/Rewards surfaces.

Resolve the important ambiguities in one or two short question rounds:

- Does “first person reads” mean anyone in the group or the current viewer? First-ever, first of the plan, or first today?
- Which existing event proves completion? How do catch-up reading and late check-ins behave?
- Is scene access permanent once earned, daily, or tied to a stage/plan? Does switching groups change it?
- Do people disappear at daily rollover, remain as subdued figures, stay permanently after their first contribution, or follow another approved rule?
- What can non-readers see or interact with? Can they still use Classic and view the roster/profile information?
- What does the locked teaser reveal, and what action helps someone unlock it? How are loading, unavailable data, and truly locked states distinguished?
- How should stage unlocks relate to current completion percentages, coins, and the linear roadmap? Avoid changing the existing formulas merely to support a visual effect.
- What happens during pre-launch, active reading, grace/catch-up, and the completed plan? What about solo users, groups with zero readers, new members, or a member changing groups?
- Which feedback should celebrate participation without making absent members feel publicly penalized?

Do not overwhelm Rico with speculative questions. Group decisions, explain their practical consequences, and ask only what the available product evidence cannot settle.

### Decision gate

Write a short proposal with an **Unresolved** section. Get explicit decisions on the mechanics before implementation. Time passing or a general “continue the 3D work” is not approval of an unlock rule.

While decisions are pending, continue independent model work only if the tent direction is accepted and the work does not hard-code the pending rules. Do not filter the roster, hide Classic, change reward math, add persistence, or gate scene entry as an assumed default.

After decisions are made, record the approved state transitions, source-of-truth fields/events, boundaries, and testable examples. Implement the agreed behavior as a shared eligibility/progression model consumed by the relevant UI; keep business rules out of mesh/rendering code. Derive state from existing authoritative data where possible and justify any new persistence.

## Round 3 — Build the remaining homes from the accepted template

Follow the blueprint's rollout plan. Extract a small home-model contract returning the grounded group and the footprint/framing information the shared renderer needs. Avoid a growing block of stage-specific conditions throughout camera, dragging, and labels.

Build and enable one new stage at a time:

- Trailer: rounded body, wheels on both sides, hitch, windows and door.
- Cabin: log construction, roof, porch, windows, chimney.
- House: main volume, garage, porch, roof sections.
- Condo: readable floor structure, entrance, balconies/windows, roof parapet.
- Mansion: main section and wings, entrance, roofs, landscaping.

Implementation order may follow the blueprint, but do not reorder the actual product's progression. Preserve its current stage order unless Rico explicitly changes it.

For every stage, set a real footprint and safe member-placement area. Validate tall/wide models in portrait without enabling pitch drift. Both alternate presentations must work without affecting Classic. Reuse the accepted avatars, forest, fire, controls, and interaction code.

## Round 4 — Implement approved rewards and verify the complete journey

Only implement the gamification mechanics approved in Round 2. Verify the full journey from the real reading completion signal through derived state to scene access, member appearance, reward feedback, and roadmap availability.

Test approved transition rules directly, including repeated events, reloads, daily boundaries, group switching, and delayed/error states. Match validation to the chosen persistence model; do not simulate success by changing visual state only.

Use browser verification for:

- Classic and each alternate view; scene switching, closing, and reopening.
- All enabled home stages with empty, 2-, 11-, and 30-member cases.
- Mouse, native browser touch input, wheel/trackpad-equivalent input, keyboard selection/movement.
- Fixed camera pitch/elevation, useful horizontal extents, person drag priority, valid ground placement, tap-versus-drag and pointer cancellation.
- Portrait and landscape; names, faces, labels, controls, and progress visibility.
- Approved locked/teaser/unlock/arrival/progression states and reduced-motion equivalents.
- Resource cleanup, unavailable WebGL, and reasonable low-end performance.

Run appropriate tests, TypeScript, lint, and the production build. Distinguish browser touch emulation from physical-device testing. Do not describe untested combinations as verified.

## Usage discipline

Rico explicitly wants restrained usage. Start with targeted graph inspection and reuse the existing assets and modules. Avoid redundant full-file reads, repeated full test runs after unchanged code, or rebuilding working parts. Use small, bounded cheaper subagents only when independent work justifies them and credits are available; do not launch a broad agent fleet or retry a depleted workspace. Keep shared-file ownership clear.

Do not add image generation, model downloads, new services, or architectural migrations merely because they are available. Surface a specific benefit and cost before proposing a substantial expansion.

## Handoff and completion evidence

Maintain `docs/scene-blueprint.md` with the final architecture, coordinate conventions, model contract, approved mechanics, design rationale, observed tradeoffs, and precise verification results. Document concise decision summaries and practical editing guidance that another agent can follow—not private internal reasoning transcripts.

Deliver:

1. Working, verified remaining home scenes, retaining Classic.
2. A recorded gamification proposal and Rico's decisions; implemented rewards/unlocks only where approved.
3. Tests and screenshots covering the actual delivered behavior, with known limitations stated.
4. Updated blueprint and a short handoff identifying any pending product decisions or unfinished checks.

Do not deploy or mark the entire issue complete merely because the rendering works. Report the concrete local/branch state and the remaining release step.
