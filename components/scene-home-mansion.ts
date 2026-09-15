import { focalPoint, framing, memberArea, modelBuilder, type HomeModel } from "./scene-home-contract";

export const mansion: HomeModel = {
  name: "Mansion", supported: true,
  footprint: { minX: -4.9, maxX: 4.9, minZ: -2.1, maxZ: 2.3 },
  memberArea, focalPoint: { ...focalPoint, y: 2.4 }, labelClearance: 2.8,
  framing: { ...framing, height: 8.6, radius: 18.4, fov: 48 },
  create(three) {
    const { group, mesh, box, window, gable } = modelBuilder(three);
    box(0,2.3,0,4,4.6,3.8,0xeadcc0);
    gable(0,4.6,0,4.5,1.4,4.2,0x465969);
    for (const side of [-1,1]) {
      box(side*3.35,1.65,0,2.7,3.3,3.5,0xd6c8ae);
      gable(side*3.35,3.3,0,3.1,1,3.9,0x465969);
      for (const x of [side*2.65,side*4]) window(x,1.8,1.8,.75,1.3);
      window(side*1.15,3.4,1.95,.7,1);
      const column = mesh(new three.CylinderGeometry(.17,.2,2.6,12),0xf5e9cf);
      column.position.set(side*.95,1.6,2.1); group.add(column);
      box(side*3.6,.3,2.04,1.8,.6,.5,0x4a6950);
    }
    box(0,1.4,1.96,1.25,2.6,.12,0x614f3c);
    box(0,1.85,2.04,.9,1.25,.04,0xffd38a,0x70451c);
    box(0,.15,2.07,2.5,.3,.46,0xa8997e);
    gable(0,2.95,2,2.6,.7,.6,0xeadcc0);
    box(0,4.75,0,4.2,.14,4,0xbba988);
    group.name = "Mansion"; return group;
  },
};
