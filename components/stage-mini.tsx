import { HomeModel } from "@/components/home-model";
import { homeStages } from "@/components/rotatable-home";
import type { Stage } from "@/lib/game";

/**
 * A generous bounding diameter for the widest stage (Mansion, ~260px wide
 * plus its pediment/columns) at the fixed isometric angle, so one scale
 * factor -- computed from `size` -- fits every stage without clipping.
 * Smaller stages render correspondingly smaller within the same box, which
 * is correct: it's what makes the six-item list read as growth.
 */
const REFERENCE_DIAMETER = 300;

/**
 * A static, decorative miniature of the real 3D CSS home (see
 * `components/home-model.tsx`) at the hero's default isometric angle --
 * D9's retraction (2026-09-04): flat SVG glyphs are out, the preview must
 * be "more accurate" to what the hero actually shows. Not interactive: no
 * drag, no rotation, no focus stop. `size` has a 32px floor below which the
 * model's detail collapses into noise (verify visually before going lower).
 */
export function StageMini({ name, size = 40, className }: { name: Stage; size?: number; className?: string }) {
  const stageClassName = homeStages.find((s) => s.name === name)?.className ?? "tent";
  // scale3d, not scale: the 2-arg `scale()` shorthand leaves Z untouched, so
  // every translateZ() inside HomeModel would stay at full (unscaled) depth
  // against a shrunk X/Y footprint -- wildly exaggerated foreshortening
  // under the unscaled 850px perspective, not a smaller version of the same
  // shape.
  const scale = size / REFERENCE_DIAMETER;

  return (
    <div className={`stage-mini ${className ?? ""}`} style={{ width: size, height: size }} aria-hidden="true">
      <div className="stage-mini-turntable" style={{ transform: `rotateX(-9deg) rotateY(-28deg) scale3d(${scale}, ${scale}, ${scale})` }}>
        <HomeModel stageClassName={stageClassName} />
      </div>
    </div>
  );
}
