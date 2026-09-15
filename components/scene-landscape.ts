import * as THREE from 'three';

/** A deterministic clearing: rebuilding a view never shuffles the scenery. */
export function addLandscape(scene: THREE.Scene, night: boolean, sunset: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, night ? '#10273e' : sunset ? '#263c58' : '#6c9eb5');
    gradient.addColorStop(.65, night ? '#344961' : sunset ? '#b67b6b' : '#acc3be');
    gradient.addColorStop(1, night ? '#607069' : sunset ? '#e0aa78' : '#d7d7b5');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 8, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    scene.background = texture;
  }

  for (let layer = 0; layer < 3; layer++) {
    const points: number[] = [];
    const step = 4;
    for (let i = 0; i < 16; i++) {
      const x = -32 + i * step;
      const next = x + step;
      const y = 5 + Math.sin(i * 2.1 + layer) * 1.6 + layer * .7;
      const nextY = 5 + Math.sin((i + 1) * 2.1 + layer) * 1.6 + layer * .7;
      points.push(x, -.5, 0, next, -.5, 0, next, nextY, 0, x, -.5, 0, next, nextY, 0, x, y, 0);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const mountain = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: [0x566777, 0x354e60, 0x233f49][layer], side: THREE.DoubleSide, fog: false }));
    mountain.position.set(0, 0, -27 + layer * 4);
    scene.add(mountain);
  }

  const patch = new THREE.Mesh(new THREE.CircleGeometry(7.2, 64), new THREE.MeshStandardMaterial({ color: night ? 0x596046 : 0x86845b, roughness: 1 }));
  patch.rotation.x = -Math.PI / 2;
  patch.scale.y = .72;
  patch.position.set(0, .009, .6);
  patch.receiveShadow = true;
  scene.add(patch);

  const random = (index: number) => {
    const value = Math.sin(index * 127.1 + 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  const transform = new THREE.Object3D();
  const grass = new THREE.InstancedMesh(new THREE.ConeGeometry(.035, .24, 3), new THREE.MeshStandardMaterial({ color: 0x6c8050, roughness: 1 }), 900);
  for (let i = 0; i < 900; i++) {
    const angle = random(i) * Math.PI * 2;
    const radius = 5 + random(i + 901) * 10;
    transform.position.set(Math.cos(angle) * radius, .08, Math.sin(angle) * radius * .75);
    transform.rotation.set(random(i + 30) * .4, angle, random(i + 65) * .3);
    transform.scale.setScalar(.7 + random(i + 60) * 1.6);
    transform.updateMatrix();
    grass.setMatrixAt(i, transform.matrix);
    grass.setColorAt(i, new THREE.Color().setHSL(.18 + random(i + 2) * .08, .25, .22 + random(i + 3) * .15));
  }
  grass.receiveShadow = true;
  scene.add(grass);

  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x777769, roughness: 1, flatShading: true }), 32);
  for (let i = 0; i < 32; i++) {
    const angle = random(i + 500) * Math.PI * 2;
    const radius = 6.5 + random(i + 700) * 7;
    transform.position.set(Math.cos(angle) * radius, .12, Math.sin(angle) * radius * .8);
    transform.rotation.set(.2, angle, .4);
    const size = .2 + random(i + 300) * .5;
    transform.scale.set(size, size * .55, size * .8);
    transform.updateMatrix();
    rocks.setMatrixAt(i, transform.matrix);
  }
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  scene.add(rocks);

  if (night || sunset) {
    const stars = new Float32Array(100 * 3);
    for (let i = 0; i < 100; i++) {
      stars[i * 3] = (random(i + 1000) - .5) * 70;
      stars[i * 3 + 1] = 8 + random(i + 2000) * 17;
      stars[i * 3 + 2] = -35;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(stars, 3));
    scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xffe1b1, size: .065, transparent: true, opacity: night ? .8 : .4, fog: false })));
  }
}
