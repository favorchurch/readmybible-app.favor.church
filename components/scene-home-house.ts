import { focalPoint, framing, memberArea, modelBuilder, type HomeModel } from "./scene-home-contract";

export const house: HomeModel = {
  name: "House", supported: true,
  footprint: { minX: -3.5, maxX: 3.8, minZ: -2.15, maxZ: 2.3 },
  memberArea, focalPoint: { ...focalPoint, y: 2 }, labelClearance: 2.8,
  framing: { ...framing, radius: 16.8 },
  create(three) {
    const { group, box, window, gable } = modelBuilder(three);
    box(-1,1.85,0,4.6,3.7,3.9,0xf1d5a1);
    gable(-1,3.7,0,5,1.65,4.3,0x955044);
    box(2.5,1.25,.3,2.2,2.5,3.3,0xdac097);
    gable(2.5,2.5,.3,2.6,.85,3.7,0x955044);
    box(2.5,1.12,1.98,1.8,2.1,.1,0x8a9588);
    for (let row=0;row<5;row++) box(2.5,.4+row*.36,2.04,1.8,.035,.02,0x5d736d);
    box(-.6,1.15,2,1,2.3,.12,0x526e66);
    window(-2.35,2.05,2,.95,1.15); window(.4,2.5,2,.65,.8);
    box(-.65,.2,2.1,2.1,.4,.4,0xb3976d);
    for (const x of [-1.6,.3]) box(x,1.35,2.18,.13,2.5,.13,0xf7e9c9);
    gable(-.65,2.65,2.05,2.4,.65,.5,0x955044);
    box(-2,4.6,-.8,.6,1.7,.6,0xb68e70);
    group.name = "House"; return group;
  },
};
