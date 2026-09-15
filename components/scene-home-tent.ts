import { focalPoint, framing, memberArea, modelBuilder, type HomeModel } from "./scene-home-contract";

export const tent: HomeModel = {
  name: "Tent", supported: true,
  footprint: { minX: -3.26, maxX: 3.26, minZ: -2.41, maxZ: 3 },
  memberArea, focalPoint, labelClearance: 2.8, framing,
  create(three) {
    const { group: home, mesh } = modelBuilder(three);
    const w = 4.25 * .72, d = 3.8 * .72;
    const geometry = new three.BufferGeometry();
    geometry.setAttribute("position", new three.Float32BufferAttribute([
      -w,-1.17,d, w,-1.17,d, 0,1.17,d,
      w,-1.17,-d, -w,-1.17,-d, 0,1.17,-d,
      -w,-1.17,-d, -w,-1.17,d, 0,1.17,d,
      -w,-1.17,-d, 0,1.17,d, 0,1.17,-d,
      0,1.17,-d, 0,1.17,d, w,-1.17,d,
      0,1.17,-d, w,-1.17,d, w,-1.17,-d,
    ], 3));
    geometry.computeVertexNormals();
    const roof = mesh(geometry, 0xca673b);
    roof.material.side = three.DoubleSide;
    roof.scale.y = 1.7; roof.position.y = 1.99; home.add(roof);
    const openingGeometry = new three.BufferGeometry();
    openingGeometry.setAttribute("position", new three.Float32BufferAttribute([-1.55,.04,2.75, 1.55,.04,2.75, 0,3.55,2.75], 3));
    openingGeometry.computeVertexNormals();
    home.add(mesh(openingGeometry, 0xffd084, 0xa64c15));
    const pole = mesh(new three.CylinderGeometry(.045,.045,4.05,8), 0x633821);
    pole.position.set(0,2,2.79); home.add(pole);
    for (const side of [-1,1]) {
      const rope = new three.BufferGeometry().setFromPoints([new three.Vector3(side * .12,3.8,2.76),new three.Vector3(side * 3.6,.04,3.35)]);
      home.add(new three.Line(rope, new three.LineBasicMaterial({ color: 0xb89d6d })));
      const stake = mesh(new three.CylinderGeometry(.04,.045,.35,6),0x523b2c);
      stake.position.set(side * 3.6,.13,3.35); stake.rotation.z = side * .35; home.add(stake);
    }
    const lamp = new three.PointLight(0xffb555,4,6,2); lamp.position.set(0,1.4,3); home.add(lamp);
    home.name = "Tent"; home.scale.setScalar(.88);
    return home;
  },
};
