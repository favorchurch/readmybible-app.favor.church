# Immersive home scene blueprint

## Scope and product decisions

Issue: [#101](https://github.com/favorchurch/readmybible-app.favor.church/issues/101).
Reference: `/Users/rico/Downloads/Read My Bible App Redesign Mockup.png`.

The delivered scope includes a reusable model contract and six procedural homes, with visible avatar faces and names above people. Preserve the old immersive scene as an option.

- **Classic** is the default and uses the original CSS 3D scene.
- At the Tent stage, **Tent** and **Campfire** are alternate WebGL presentations in the same immersive sheet.
- Trailer, Cabin, Apartment, House, and Mansion now have enabled alternate models. Classic remains the default and remains available.
- Campfire keeps the tent in the background and uses darker lighting, a central fire, and additional log seating.
- First names are shown above people by default; full names remain in accessible labels and title attributes. People settings can hide names or people.
- This is a procedural, stylized 3D interpretation of the reference, not a pixel-identical illustration. Art direction still needs the user's visual acceptance.

## Design rationale

The reference's key relationships are a home behind a gathering, a warm fire in the foreground, forest layers around the clearing, and small controls at the edges. Those relationships matter more than recreating the device frame in the image.

Actual 3D geometry provides depth and ground-plane raycasting for rearranging people. A static background image would not support those interactions. Classic remains available because the new scene is an alternative, not a replacement.

The tent is an A-frame prism, rather than a cone: a ridge with depth makes it read as a pitched tent. Warm entrance light and rope stakes establish scale. Layered mountain silhouettes and a deterministic forest add depth without external model downloads.

People originally faced the fire, which hid the faces of foreground members. They now face the camera as it moves, prioritizing the user's request for identifiable faces. Their names are ordinary DOM text projected above their 3D positions, so text stays crisp and keyboard-accessible.

The collapsed progress summary protects the view of the gathering. Expanding it reveals the existing reading progress and reading actions. Three.js is lazy-loaded only when an alternate scene is selected.

## Ownership and files

| File | Responsibility |
| --- | --- |
| `components/full-home.tsx` | Classic/Tent/Campfire choice, sheet, member selection, people/name settings, progress, time, reset |
| `components/rotatable-home.tsx` + `components/home-model.tsx` | Original Classic renderer and all existing home stages |
| `components/immersive-home-scene.tsx` | New renderer lifecycle, tent/fire geometry, camera, raycasting, layout, projected name labels |
| `components/scene-person.ts` | Seated person geometry derived from saved avatar configuration |
| `components/scene-landscape.ts` | Sky, mountains, clearing, instanced grass/rocks, stars |
| `components/immersive-home-scene.module.css` | Canvas, projected labels, hint, fallback |
| `app/styles/full-home.css` | Shared controls and campsite-specific overlay layout |
| `tests/full-home-scene.test.tsx` | UI selection and prop forwarding, settings, selection, dismissal, progress |

## 3D editing guide

### Coordinate conventions

- World **Y is up**; ground is `y = 0`.
- X runs left/right. Positive Z points toward the initial camera; negative Z is the background.
- Models should be grounded at local `y = 0`. Apply scale to their parent group, not an arbitrary world Y offset.
- The tent group is at `(0, 0, -2.6)` in Tent mode. Campfire places it at `z = -4.8` and scales it by an additional `0.78`.
- The tent ridge is approximately 4 local units tall. Its parent scale is `0.88`. Roof front/back are near local `z = ±2.74`.
- The fire is centered at world `x = 0`; `z = 1.15` in Tent and `z = 0.5` in Campfire.
- Person head center is local `y = 2.08`; labels project from world `y = 2.8`. Default person group scale is `0.94`, smaller above 14 and 20 people.

### Safe editing sequence

1. Read the current graph first: `graft skeleton components/immersive-home-scene.tsx`, then the exact relevant span. Graph spans move as files change.
2. Identify whether the problem is model geometry, model placement, camera framing, or CSS overlays. Change one of those at a time.
3. For geometry, work in the model's local coordinates. Use a named parent group for placement/scale.
4. Check the front and both allowed camera extremes. A shape that looks correct head-on can have missing faces or wrong winding at an angle.
5. Check 390×844 portrait and 844×390 landscape. Do not solve portrait cropping by allowing vertical camera gestures.
6. Recheck the person raycast and ground exclusion after changing the tent footprint. Decorations must not acquire member IDs.
7. Save a screenshot before and after a material visual change; describe the observable difference. Do not treat a successful build as visual acceptance.

### Camera invariants

- Camera framing comes from each `HomeModel.framing`. Height, radius, pitch/look-at target and yaw bounds may differ by model; they are constants during interaction. The home remains grounded at world Y `0` and its world position never changes.
- Only yaw changes with pointer, wheel, or left/right keys; bounds are `-0.72..0.72` radians (about ±41°).
- Resizing changes projection/FOV and view offset, not model position or camera elevation. Taller models use their framing hint and camera pitch/look-at target; portrait fitting does not translate or rescale the home.
- No vertical panning, pitch gesture, inertia, or zoom gesture exists in the new renderer. Only yaw changes with pointer, wheel, or keyboard interaction.
- Diagnose with `data-camera-yaw`, `data-camera-y`, `data-camera-pitch`, and `data-dragging` on the scene root. The height attribute is evidence of position, not by itself proof of every projection property.

### Person interaction and identity

- The raycaster intersects person descendants. Every descendant receives `userData.memberId` from its roster member.
- A person drag captures that pointer and takes priority over camera drag. Wheel/key orbit is ignored during an active drag.
- Ground dragging uses a horizontal `THREE.Plane`. The initial hit offset is retained so grabbing a face does not teleport the feet to the pointer.
- Movement begins after a 4px threshold. A tap opens the same member profile; pointer cancellation must not open it.
- Placement is bounded to `x = ±7.2`, `z = -2.8..5.2`, excludes the fire radius, and has a home exclusion in Tent mode. Revisit these bounds for larger models; do not reuse them blindly.
- Positions are kept in a component-local map per Tent/Campfire mode. Switching those two modes restores each layout. Reset clears both maps. Returning to Classic or closing the sheet unmounts the new renderer and discards custom positions.
- No canonical member data or server persistence is written by scene dragging.
- Keyboard users can tab to a member and use arrow keys to move them; Shift increases the step. Enter opens the profile.
- Saved skin, shirt, hair color, face width, gender silhouette, glasses, and facial hair drive the geometry. Hair styles are approximations, not identical copies of the existing CSS Avatar. Review short/curly/wavy variants before calling avatar parity complete.

### Rendering and lifecycle

- Three.js and matching type definitions are installed through **pnpm**, which owns this repo's lockfile. Do not introduce a second lockfile.
- Three.js is loaded through a React lazy boundary in `FullHome`.
- ResizeObserver updates the canvas and projection; DPR is capped at 1.8.
- The scene uses shadowed lighting, instanced grass/rocks, and deterministic scenery.
- Cleanup removes listeners, disconnects the observer, cancels animation frames, and disposes scene geometry/materials, sky texture, and renderer.
- Time/people/roster/profile changes currently rebuild the scene. Names/selection do not. Preserve this distinction when refining; do not rebuild on pointer movement.
- Reduced motion disables fire movement and the hint animation, but the render loop still runs. An on-demand or throttled loop is a follow-up performance improvement.

## Verification checkpoint

Verified in Chromium with the existing 11-member Connect group:

- Desktop mouse person hit-testing and drag changed ground coordinates while yaw stayed `0.000`.
- Native CDP touch hit a person and moved it; camera yaw remained `0.000` and Y remained `7.4`.
- An empty-space vertical touch drag left yaw and height unchanged.
- Horizontal drag reached `-0.720`; a horizontal wheel gesture changed yaw to `-0.240` without changing height.
- Tent → Campfire → Tent restored the Tent positions; Reset restored yaw to zero.
- One immersive dialog remained open during drag and view switching.
- Tent screenshots were inspected in portrait and landscape; all 11 people fit the default portrait composition after centering the gathering.
- Final Classic/Tent selector check: Classic was selected on opening and the original viewport was present; selecting Tent mounted the new renderer with 11 visible name labels, within the same dialog.
- Production build and TypeScript check passed. The full existing test suite passed before the final Classic-default adjustment; the five focused scene tests passed again after that adjustment. Changed scene files passed ESLint before the final selector adjustment; rerun lint as part of any follow-up edit.

Local review: `http://localhost:3200/?test=1` → Connect → Open Home → Tent. Latest screenshots from this session are `/tmp/rmb-tent-template.png` (390×844) and `/tmp/rmb-tent-template-landscape.png` (844×390); these temporary files are not repository assets.

This is browser touch emulation, not physical iOS/Android hardware validation. Small/large group stress cases, repeated WebGL context loss, low-end GPU performance, and every avatar customization combination remain follow-up checks. Classic preserves its existing interaction behavior; this work does not claim to have fixed its old gesture implementation.

## Delivered scene contract and rewards

`components/scene-home-contract.ts` defines `HomeModel`: grounded local geometry, footprint, member area, focal point, label clearance and framing. `scene-home-registry.ts` maps the product order Tent → Trailer → Cabin → Apartment → House → Mansion. The shared renderer asks the registry for a model and contains no stage-specific geometry or half-width table. Placement validation clamps to the model member area, excludes the model footprint and fire clearance, and returns a grounded Y of `0`.

The approved rewards rule is option B in `docs/scene-rewards-proposal.md`: a positive current-group `GroupStats.checkinCount` opens the alternate gathering for everyone. Zero shows an empty teaser; missing data shows an unavailable message. Access survives reload and day rollover, evaluates the destination after a group switch, and does not alter stage thresholds, chapter coins, medal rewards or check-in persistence. Everyone remains visible after unlock with the existing read-today semantics.

Visual review covered Tent, Trailer, Cabin, Apartment, House and Mansion in portrait and landscape, Tent/Campfire presentations, 0/2/11/30-member fixtures, and all Day/Sunset/Night options. The matrix recorded 96 passing combinations for Tent and Trailer, with the same framing and bounds assertions applied to the remaining model review. Screenshots inspected include `/tmp/rmb-0-tent-portrait.png`, `/tmp/rmb-0-campfire-landscape.png`, `/tmp/rmb-1-tent-portrait.png`, `/tmp/rmb-mansion-portrait.png`, `/tmp/rmb-mansion-landscape-left.png`, and `/tmp/rmb-30-grid.png`. Browser touch input was emulated through Chromium; this is not physical-device testing. The placement probe sampled 47,628 positions across all models and presentations with zero violations. Existing suite: 372 tests across 39 files passed. Lint has zero errors and one pre-existing `no-img-element` warning.

## Pending checks handoff

- Run and record the final production build on the merged branch.
- Physical iOS/Android touch, low-end GPU performance, repeated context loss, and every avatar customization combination remain untested.
- The temporary `/scene-review` development fixture is removed before shipping.
- No product decisions remain for approved option B. Issue #101 remains open unless separately closed by its owner.

## Remaining-home rollout plan

Do not start this phase until the tent's visual direction is accepted.

1. **Extract a home-model contract.** Return a grounded group plus footprint bounds, focal point, label clearance, and recommended framing. Separate model geometry from the renderer; keep shared camera and drag rules in one place.
2. **Trailer.** Rounded body, wheels on both sides, hitch, windows/door, and a restrained accent stripe. Validate wheel contact and the wider footprint from both yaw extremes.
3. **Cabin.** Log courses, A-frame roof, porch, door/windows, chimney. Keep the fire and members clear of the porch.
4. **House.** Main volume, garage, porch, layered roof; define a larger exclusion area without reducing usable member placement to a thin strip.
5. **Apartment.** Floors, balconies/windows, entrance, roof parapet. Its taller framing uses a fixed camera pitch/look-at target while the grounded model stays at world Y `0`.
6. **Mansion.** Center plus wings, roof sections, entrance and landscaping. Check width in portrait and ensure edge members remain reachable.
7. **Enable one stage at a time** in `FullHome`, retaining Classic. Each stage needs mouse/touch/keyboard drag checks, 2/11/30-member layouts, all times, both new presentations, and screenshots at both orientations.

Before extending: consider a wider/asymmetric seating arrangement for large groups; improve grass/forest naturalness and varied tree silhouettes; add visible keyboard-movement guidance; inspect label overlap at camera extremes; test the fallback and light/texture disposal under repeated opens. Keep these as bounded tasks rather than rebuilding the entire scene at once.
