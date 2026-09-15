import { focalPoint, framing, memberArea, modelBuilder, type HomeModel } from "./scene-home-contract";

export const cabin: HomeModel = {
  name: "Cabin", supported: true,
  footprint: { minX: -3, maxX: 3, minZ: -2.2, maxZ: 2.5 },
  memberArea, focalPoint, labelClearance: 2.8, framing,
  create(three) {
    const { group, mesh, box, window, gable } = modelBuilder(three);
    box(0,.2,0,5.7,.4,4.1,0x76624b);
    for (let row = 0; row < 9; row++) {
      const y = .58 + row * .31;
      for (const z of [-1.8,1.8]) {
        const log = mesh(new three.CylinderGeometry(.19,.19,5.7,10),row % 2 ? 0x855238 : 0x986343);
        log.rotation.z = Math.PI / 2; log.position.set(0,y,z); group.add(log);
      }
      for (const x of [-2.55,2.55]) {
        const log = mesh(new three.CylinderGeometry(.19,.19,4.1,10),0x986343);
        log.rotation.x = Math.PI / 2; log.position.set(x,y,0); group.add(log);
      }
    }
    gable(0,3.2,0,6,1.65,4.4,0x344c48);
    box(0,1.5,1.99,1.1,2.3,.15,0x49382a);
    window(-1.65,2,2,.8,.9); window(1.65,2,2,.8,.9);
    box(0,.25,2.1,3.5,.5,.8,0x9a7954);
    for (const x of [-1.55,1.55]) box(x,1.3,2.35,.12,2.1,.12,0x9a7954);
    box(0,2.5,2.2,3.6,.16,.6,0x4f6557);
    box(1.65,4.2,-.9,.65,2.1,.65,0x918775);
    box(1.65,5.28,-.9,.85,.18,.85,0x615f55);
    group.name = "Cabin"; return group;
  },
};
