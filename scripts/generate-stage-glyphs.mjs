/**
 * Generates `components/stage-glyph.tsx` -- flat SVG stand-ins for the six
 * 3D CSS `HomeModel` stages (app/styles/home3d.css).
 *
 * Every number below is lifted from that stylesheet, and every point is put
 * through the same orthographic projection as `StageMini`'s fixed camera
 * (`rotateX(-9deg) rotateY(-28deg)`), so the glyph is the same silhouette
 * the 3D model paints -- not a hand-drawn approximation that can drift when
 * a stage's --w/--h/--d changes. Re-run with:
 *
 *   node scripts/generate-stage-glyphs.mjs
 *
 * Output is committed; this script is the derivation record, not a build step.
 */
import { writeFileSync } from "node:fs";

// rotateY(-28deg) then rotateX(-9deg), orthographic (the mini's 850px
// perspective is negligible at glyph scale). CSS axes: x right, y DOWN,
// z toward viewer.
const RY = (-28 * Math.PI) / 180;
const RX = (-9 * Math.PI) / 180;
const cy = Math.cos(RY);
const sy = Math.sin(RY);
const cx = Math.cos(RX);
const sx = Math.sin(RX);

const r = (n) => Math.round(n * 10) / 10;

/** Model point -> screen point, as an "x,y" polygon pair. */
function p(x, y, z) {
  const X = x * cy + z * sy;
  const Z = -x * sy + z * cy;
  const Y = y * cx - Z * sx;
  return [r(X), r(Y)];
}

const poly = (...pts) => pts.map(([x, y]) => `${x},${y}`).join(" ");

/**
 * Depth sort key: larger = nearer the camera, so paint it later. This is the
 * camera-space Z after BOTH rotations -- getting the `y * sx` term's sign
 * wrong sinks every upper-storey window behind the wall it belongs to.
 */
function depth(pts) {
  let sum = 0;
  for (const [x, y, z] of pts) sum += (-x * sy + z * cy) * cx + y * sx;
  return sum / pts.length;
}

/** A filled, depth-keyed polygon in model space. */
function face(points, fill, extra = {}) {
  return {
    kind: "polygon",
    layer: LAYER.structure,
    depth: depth(points),
    fill,
    points: poly(...points.map(([x, y, z]) => p(x, y, z))),
    ...extra,
  };
}

/** A box: front (+z), right (+x) and top (-y) are the camera-facing faces. */
function box(w, h, d, { front, right, top }, { y0 = -h / 2 } = {}) {
  const y1 = y0 + h;
  const [xl, xr] = [-w / 2, w / 2];
  const [zb, zf] = [-d / 2, d / 2];
  const out = [];
  if (top) out.push(face([[xl, y0, zb], [xr, y0, zb], [xr, y0, zf], [xl, y0, zf]], top, OUTLINE));
  if (right) out.push(face([[xr, y0, zf], [xr, y0, zb], [xr, y1, zb], [xr, y1, zf]], right, OUTLINE));
  if (front) out.push(face([[xl, y0, zf], [xr, y0, zf], [xr, y1, zf], [xl, y1, zf]], front, OUTLINE));
  return out;
}

/**
 * A pitched roof: two planes meeting at a ridge, plus the front gable
 * triangle. `eaveY` is the wall top, `apexY` the ridge, `over` the eave
 * overhang past the wall depth.
 */
function pitchedRoof({ w, d, eaveY, apexY, over, planeRight, planeLeft, gableFront, gableBack, gableOver = 0 }) {
  const zb = -(d / 2 + over);
  const zf = d / 2 + over;
  const gz = d / 2 + gableOver;
  const xr = w / 2;
  return [
    face([[0, apexY, zb], [-xr, eaveY, zb], [-xr, eaveY, zf], [0, apexY, zf]], planeLeft, OUTLINE),
    face([[0, apexY, zb], [xr, eaveY, zb], [xr, eaveY, zf], [0, apexY, zf]], planeRight, OUTLINE),
    face([[0, apexY, -gz], [xr, eaveY, -gz], [-xr, eaveY, -gz]], gableBack, OUTLINE),
    face([[0, apexY, gz], [xr, eaveY, gz], [-xr, eaveY, gz]], gableFront, OUTLINE),
  ];
}

/**
 * A flat panel parallel to the front wall (a window, band, stripe, column).
 * Defaults to the OPENING layer -- see `LAYER` for why these are layered
 * rather than depth-sorted.
 */
function panel(x0, y0, x1, y1, z, fill, extra) {
  return face([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], fill, {
    layer: LAYER.opening,
    ...extra,
  });
}

const NAVY = "#26364a";

/**
 * Paint layers. A window sits a couple of units proud of a wall that is two
 * hundred units wide, so comparing polygon centroids puts half of them behind
 * the wall they belong to -- the classic painter's-algorithm failure on
 * near-coplanar geometry. Structure is depth-sorted against itself; everything
 * stuck to the facade is ordered by what it is instead.
 */
const LAYER = { structure: 0, texture: 1, opening: 2, projecting: 3 };
/**
 * The CSS model draws 1.5-2px borders on every face. Those are in screen px,
 * so they stay hairline-thin as the model scales down -- which is exactly what
 * `non-scaling-stroke` reproduces, and what a stroke measured in viewBox units
 * would not (it would vanish at 26px and go heavy at 96px).
 */
const OUTLINE = { stroke: "#172943", sw: 0.6, fixed: true };
const DETAIL = { stroke: NAVY, sw: 0.5, fixed: true };
const TEXTURE = { layer: LAYER.texture };
const PROJECTING = { layer: LAYER.projecting };

// --- Stage geometry, all values from app/styles/home3d.css -----------------

function tent() {
  // .home3d-model.tent { --w:150; --h:100; --d:108 } + .tent-detail
  const w = 150, h = 100, d = 108;
  const [xl, xr] = [-w / 2, w / 2];
  const [yTop, yBot] = [-h / 2, h / 2];
  const [zb, zf] = [-d / 2, d / 2];
  const parts = [
    // .tent-slope-left / -right (the two canvas planes)
    face([[0, yTop, zb], [xl, yBot, zb], [xl, yBot, zf], [0, yTop, zf]], "#b9604c", OUTLINE),
    face([[0, yTop, zb], [xr, yBot, zb], [xr, yBot, zf], [0, yTop, zf]], "#dc825e", OUTLINE),
    // .tent-gable-back / -front
    face([[0, yTop, zb], [xr, yBot, zb], [xl, yBot, zb]], "#b85f4d", OUTLINE),
    face([[0, yTop, zf], [xr, yBot, zf], [xl, yBot, zf]], "#d77858", OUTLINE),
    // .tent-flap (48x62, top:38px from the model top), and its lit interior
    face([[0, yTop + 38, zf + 2], [24, yBot, zf + 2], [-24, yBot, zf + 2]], NAVY, PROJECTING),
    face([[0, yTop + 46, zf + 3], [17, yBot, zf + 3], [-17, yBot, zf + 3]], "#edb55c", PROJECTING),
  ];
  return parts;
}

function trailer() {
  // .home3d-model.trailer { --w:192; --h:82; --d:80 } + .trailer-detail
  const w = 192, h = 82, d = 80;
  const yTop = -h / 2;
  const zf = d / 2;
  const parts = [
    ...box(w, h, d, { front: "#ded1ab", right: "#efe1ba", top: "#b8b59e" }),
    // .trailer-stripe-near (top:45px from the model top)
    panel(-94, yTop + 45, 94, yTop + 58, zf + 2, "#d16f56", TEXTURE),
    // .window-left / .window-right / .door3d
    panel(-80, yTop + 27, -34, yTop + 58, zf + 3, "#f6dda0", DETAIL),
    panel(19, yTop + 27, 57, yTop + 58, zf + 3, "#f6dda0", DETAIL),
    panel(63, yTop + 20, 97, yTop + 82, zf + 3, "#a8b4ab", DETAIL),
    // .trailer-hitch
    panel(96, yTop + 70, 138, yTop + 79, 8, NAVY, PROJECTING),
  ];
  // .trailer .wheel -- near pair only; the far pair is hidden by the body
  for (const cxw of [-52.5, 52.5]) {
    const [px, py] = p(cxw, h / 2 + 10, 43);
    parts.push({ kind: "circle", layer: LAYER.projecting, depth: 0, cx: px, cy: py, rr: 17.5, fill: NAVY, stroke: "#d6cdb8", sw: 7 });
  }
  return parts;
}

function cabin() {
  // .home3d-model.cabin3d { --w:154; --h:108; --d:112 } + .cabin-detail
  const w = 154, h = 108, d = 112;
  const yTop = -h / 2;
  const zf = d / 2;
  const parts = [
    ...box(w, h, d, { front: "#b96b46", right: "#cc7950", top: null }),
    // repeating-linear-gradient(0deg,#b96b46 0 15px,#8b4f38 15px 18px)
    ...[0, 1, 2, 3, 4, 5].map((i) => panel(-77, yTop + 15 + i * 18, 77, yTop + 18 + i * 18, zf + 0.5, "#8b4f38", TEXTURE)),
    ...pitchedRoof({
      w, d, eaveY: yTop, apexY: yTop - 54, over: 12,
      planeRight: "#293b56", planeLeft: "#354b67",
      gableFront: "#a75e41", gableBack: "#704235", gableOver: 1,
    }),
    // .window-left / .window-right / .door3d
    panel(-64, yTop + 27, -37, yTop + 58, zf + 2, "#f6dda0", DETAIL),
    panel(37, yTop + 27, 64, yTop + 58, zf + 2, "#f6dda0", DETAIL),
    panel(-17, yTop + 53, 17, yTop + 108, zf + 2, "#e4a94e", DETAIL),
  ];
  return parts;
}

function apartment() {
  // .home3d-model.apartment { --w:142; --h:176; --d:108 } + .apartment-detail
  const w = 142, h = 176, d = 108;
  const yTop = -h / 2;
  const zf = d / 2;
  const parts = [
    ...box(w, h, d, { front: "#aa98b5", right: "#b4a2bd", top: "#776d84" }),
    panel(-71, yTop, -54, yTop + h, zf + 0.5, "#9485a3", TEXTURE),
    panel(54, yTop, 71, yTop + h, zf + 0.5, "#887a97", TEXTURE),
    // .upper-windows (top:20px)
    panel(-58, yTop + 20, -35, yTop + 45, zf + 1, "#f6dda0", DETAIL),
    panel(-11.5, yTop + 20, 11.5, yTop + 45, zf + 1, "#f6dda0", DETAIL),
    panel(35, yTop + 20, 58, yTop + 45, zf + 1, "#f6dda0", DETAIL),
    // .apartment-detail span -- projecting balcony slabs at 39 / 78 / 117
    ...[39, 78, 117].map((t) => panel(-59, yTop + t, 59, yTop + t + 9, zf + 9, "#e4d7b9", { ...DETAIL, ...PROJECTING })),
    // .window3d (top:112) / .door3d
    panel(-58, yTop + 112, -31, yTop + 143, zf + 1, "#f6dda0", DETAIL),
    panel(31, yTop + 112, 58, yTop + 143, zf + 1, "#f6dda0", DETAIL),
    panel(-17, yTop + 121, 17, yTop + 176, zf + 1, "#e4a94e", DETAIL),
  ];
  return parts;
}

function house() {
  // .home3d-model.house3d { --w:188; --h:116; --d:120 } + .house-detail
  const w = 188, h = 116, d = 120;
  const yTop = -h / 2;
  const yBot = h / 2;
  const zf = d / 2;
  return [
    ...box(w, h, d, { front: "#d2ad70", right: "#e1bd80", top: null }),
    ...pitchedRoof({
      w, d, eaveY: yTop, apexY: yTop - 62, over: 13,
      planeRight: "#293b56", planeLeft: "#354b67",
      gableFront: "#d2ad70", gableBack: "#a57e55", gableOver: 2,
    }),
    // .house3d .garage (70x57, left:9px, bottom:0)
    panel(-85, yBot - 57, -15, yBot, zf + 2, "#e5d8b9", DETAIL),
    ...[0, 1, 2, 3].map((i) => panel(-85, yBot - 57 + 12 + i * 14, -15, yBot - 57 + 14 + i * 14, zf + 3, "#c1aa82", PROJECTING)),
    // .house3d .window-right / .door3d (left:71%) / .porch
    panel(67, yTop + 27, 94, yTop + 58, zf + 2, "#f6dda0", DETAIL),
    panel(16, yBot - 55, 50, yBot, zf + 2, "#e4a94e", DETAIL),
    panel(22, yBot - 10, 89, yBot, zf + 10, "#93634d", { ...DETAIL, ...PROJECTING }),
  ];
}

function mansion() {
  // .home3d-model.mansion { --w:260; --h:160; --d:144 } + .mansion-detail
  const w = 260, h = 160, d = 144;
  const yTop = -h / 2;
  const yBot = h / 2;
  const zf = d / 2;
  return [
    ...box(w, h, d, { front: "#e4d5ad", right: "#eadcaf", top: null }),
    panel(-130, yTop, -88, yTop + h, zf + 0.5, "#bdac83", TEXTURE),
    panel(88, yTop, 130, yTop + h, zf + 0.5, "#bdac83", TEXTURE),
    ...pitchedRoof({
      w, d, eaveY: yTop, apexY: yTop - 60, over: 13,
      planeRight: "#766985", planeLeft: "#655d7c",
      gableFront: "#d8c89d", gableBack: "#a99b7d", gableOver: 2,
    }),
    // .mansion .upper-windows (top:25) and .window3d (top:103)
    ...[[-99, -70], [-14.5, 14.5], [70, 99]].map(([x0, x1]) =>
      panel(x0, yTop + 25, x1, yTop + 54, zf + 1, "#f6dda0", DETAIL)),
    ...[[-101, -70], [70, 101]].map(([x0, x1]) =>
      panel(x0, yTop + 103, x1, yTop + 137, zf + 1, "#f6dda0", DETAIL)),
    // .mansion .balcony3d (150x34, top:19)
    panel(-75, yTop + 19, 75, yTop + 53, zf + 10, "none", { ...DETAIL, ...PROJECTING, sw: 0.9 }),
    // .mansion-detail:before -- the pediment (154x48, top:-42)
    face([[0, yTop - 42, zf + 6], [77, yTop + 6, zf + 6], [-77, yTop + 6, zf + 6]], "#e4d5ad", { stroke: "#8c7b64", sw: 0.5, fixed: true, ...PROJECTING }),
    // .mansion-detail span -- four columns (11x94, top:57)
    ...[-98, -46, 46, 98].map((x) => panel(x - 5.5, yTop + 57, x + 5.5, yTop + 151, zf + 9, "#fff0c9", { stroke: "#8c7b64", sw: 0.5, fixed: true, ...PROJECTING })),
    // .door3d (44x70) and .mansion-detail:after -- the steps
    panel(-22, yBot - 70, 22, yBot, zf + 1, "#e4a94e", DETAIL),
    face([[-49, yBot - 24, zf + 15], [49, yBot - 24, zf + 15], [61, yBot, zf + 15], [-61, yBot, zf + 15]], "#d3c298", { stroke: "#8c7b64", sw: 0.5, fixed: true, ...PROJECTING }),
  ];
}

const STAGES = {
  Tent: tent(),
  Trailer: trailer(),
  Cabin: cabin(),
  Apartment: apartment(),
  House: house(),
  Mansion: mansion(),
};

// --- Emit -----------------------------------------------------------------

function render(parts) {
  // Painter's algorithm, stable within equal depth so the authoring order
  // above still decides ties (detail panels sit on the face they belong to).
  const sorted = parts.map((part, i) => ({ part, i }))
    .sort((a, b) =>
      a.part.layer - b.part.layer ||
      // Only structure is depth-sorted; within a facade layer the authoring
      // order above is the intended stacking and must be preserved.
      (a.part.layer === LAYER.structure ? a.part.depth - b.part.depth : 0) ||
      a.i - b.i)
    .map(({ part }) => part);
  return sorted.map((s) => {
    const stroke = s.stroke
      ? ` stroke="${s.stroke}" strokeWidth={${s.sw ?? 2}}${s.fixed ? ' vectorEffect="non-scaling-stroke"' : ""}`
      : "";
    if (s.kind === "circle") {
      return `<circle cx={${s.cx}} cy={${s.cy}} r={${s.rr}} fill="${s.fill}" stroke="${s.stroke}" strokeWidth={${s.sw}} />`;
    }
    return `<polygon points="${s.points}" fill="${s.fill}"${stroke} />`;
  }).join("\n      ");
}

const body = Object.entries(STAGES)
  .map(([name, parts]) => `  ${name}: (\n    <>\n      ${render(parts)}\n    </>\n  ),`)
  .join("\n");

const file = `/**
 * GENERATED by scripts/generate-stage-glyphs.mjs -- do not hand-edit.
 *
 * Flat SVG stand-ins for the six 3D CSS \`HomeModel\` stages, projected at
 * \`StageMini\`'s fixed camera so they read as the same buildings. These exist
 * for the places that need *many* stage icons at once -- the Leader
 * hierarchy's count charts and podiums -- where one ~19-node 3D CSS subtree
 * per group is what made the old "Other Connects" board expensive.
 *
 * \`StageMini\` (the real 3D model) is still the right component anywhere a
 * single, prominent home is shown: Today, Connect, Splash, growth sheet.
 * Editing a stage's geometry in app/styles/home3d.css means re-running the
 * generator, not patching the paths below.
 */
import { memo } from "react";

import type { Stage } from "@/lib/game";

/** Matches StageMini's REFERENCE_DIAMETER, so relative stage sizes agree. */
const VIEWBOX = 300;

/** Progression order, Tent -> Mansion. The one list callers should rank by. */
export const STAGE_ORDER: readonly Stage[] = [
  "Tent",
  "Trailer",
  "Cabin",
  "Apartment",
  "House",
  "Mansion",
];

const SHAPES: Record<Stage, React.ReactNode> = {
${body}
};

function StageGlyphBase({
  name,
  size = 24,
  title,
}: {
  name: Stage;
  size?: number;
  title?: string;
}) {
  return (
    <svg
      className="stage-glyph"
      width={size}
      height={size}
      viewBox={\`\${-VIEWBOX / 2} \${-VIEWBOX / 2} \${VIEWBOX} \${VIEWBOX}\`}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
      shapeRendering="geometricPrecision"
    >
      {SHAPES[name]}
    </svg>
  );
}

export const StageGlyph = memo(StageGlyphBase);
`;

writeFileSync(new URL("../components/stage-glyph.tsx", import.meta.url), file);
console.log("wrote components/stage-glyph.tsx");
