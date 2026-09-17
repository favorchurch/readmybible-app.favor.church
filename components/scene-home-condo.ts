import { focalPoint, framing, memberArea, modelBuilder, type HomeModel } from "./scene-home-contract";

export const condo: HomeModel = {
  name: "Condo", supported: true,
  footprint: { minX: -2.8, maxX: 2.8, minZ: -1.94, maxZ: 2.3 },
  memberArea, focalPoint: { ...focalPoint, y: 2.6 }, labelClearance: 2.8,
  framing: { ...framing, height: 8.6, radius: 17.8 },
  create(three) {
    const { group, box, window } = modelBuilder(three);
    box(0,3.15,0,5.2,6.3,3.6,0xd6b38a);
    for (let floor = 0; floor < 3; floor++) {
      const y = .6 + floor * 2;
      box(0,y-.48,0,5.5,.18,3.85,0xf2dfbf);
      for (const x of [-1.65,0,1.65]) {
        if (floor === 0 && x === 0) continue;
        window(x,y+.65,1.85,.85,1.1);
        if (floor > 0) {
          box(x,y-.03,2,.98,.12,.55,0xead5b6);
          box(x,y+.4,2.25,1.02,.055,.055,0x536b68);
          for (const dx of [-.46,0,.46]) box(x+dx,y+.19,2.25,.04,.48,.04,0x536b68);
        }
      }
      for (const x of [-2.63,2.63]) {
        const side = box(x,y+.65,0,.08,1.1,.85,0xffd38a,0x70451c);
        side.receiveShadow = true;
      }
    }
    box(0,1.1,1.85,1.15,2.2,.15,0x456c68);
    box(0,1.3,1.95,.75,1.4,.04,0xffd38a,0x70451c);
    box(0,2.3,2,1.6,.16,.6,0x536b68);
    for (const z of [-1.85,1.85]) box(0,6.55,z,5.6,.5,.16,0xf2dfbf);
    for (const x of [-2.72,2.72]) box(x,6.55,0,.16,.5,3.8,0xf2dfbf);
    box(0,6.3,0,5.4,.15,3.7,0x666b5e);
    group.name = "Condo"; return group;
  },
};
