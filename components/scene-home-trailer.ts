import { focalPoint, framing, memberArea, modelBuilder, type HomeModel } from "./scene-home-contract";

export const trailer: HomeModel = {
  name: "Trailer", supported: true,
  footprint: { minX: -3.5, maxX: 4.1, minZ: -1.61, maxZ: 1.85 },
  memberArea, focalPoint, labelClearance: 2.8, framing,
  create(three) {
    const { group, mesh, box, window } = modelBuilder(three);
    // A rounded side profile extruded across the cabin's depth.
    const shape = new three.Shape();
    shape.moveTo(-2.7,.65); shape.lineTo(2.6,.65);
    shape.quadraticCurveTo(3.15,.65,3.15,1.2); shape.lineTo(3.15,2.8);
    shape.quadraticCurveTo(3.15,3.5,2.45,3.5); shape.lineTo(-2.45,3.5);
    shape.quadraticCurveTo(-3.15,3.5,-3.15,2.8); shape.lineTo(-3.15,1.2);
    shape.quadraticCurveTo(-3.15,.65,-2.7,.65);
    const body = mesh(new three.ExtrudeGeometry(shape,{depth:2.8,bevelEnabled:false}),0xe8d7af);
    body.position.z = -1.4; group.add(body);
    for (const side of [-1,1]) {
      box(0,1.4,side * 1.42,6.1,.35,.04,0x4f8d87);
      for (const x of [-1.65,1.65]) {
        const tire = mesh(new three.CylinderGeometry(.58,.58,.3,16),0x293132);
        tire.rotation.x = Math.PI / 2; tire.position.set(x,.58,side * 1.45); group.add(tire);
        const hub = mesh(new three.CylinderGeometry(.28,.28,.32,12),0xb9b5a6);
        hub.rotation.x = Math.PI / 2; hub.position.copy(tire.position); group.add(hub);
      }
    }
    window(-1.65,2.55,1.45,1.3,.8);
    box(.75,1.8,1.44,1,2.1,.12,0x725744);
    window(.75,2.35,1.52,.65,.65);
    box(.75,.4,1.6,1.3,.2,.5,0xa99c80);
    box(3.45,.55,0,1.3,.16,.18,0x777c76);
    box(3.95,.3,0,.12,.6,.12,0x777c76);
    box(-3.25,1.15,0,.3,.35,2.7,0xb8b5a6);
    group.name = "Trailer";
    return group;
  },
};
