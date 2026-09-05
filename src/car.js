import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// A compact GT coupe, modeled in meters. Forward is local -Z.
export function createCar(color) {
  const group = new T.Group();
  const paint = new T.MeshPhysicalMaterial({
    color,
    metalness: 0.65,
    roughness: 0.25,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
  });
  const rubber = new T.MeshStandardMaterial({
    color: "#101216",
    roughness: 0.93,
  });
  const carbon = new T.MeshStandardMaterial({
    color: "#18212a",
    roughness: 0.65,
    metalness: 0.25,
  });
  const alloy = new T.MeshStandardMaterial({
    color: "#cad2da",
    metalness: 0.85,
    roughness: 0.24,
  });
  const glass = new T.MeshPhysicalMaterial({
    color: "#294859",
    metalness: 0.45,
    roughness: 0.12,
    clearcoat: 1,
  });
  const led = new T.MeshBasicMaterial({ color: "#e0f7ff" });
  const red = new T.MeshBasicMaterial({ color: "#ff3b27" });
  function mesh(geometry, material, x = 0, y = 0, z = 0, parent = group) {
    const m = new T.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function box(
    w,
    h,
    d,
    material,
    x = 0,
    y = 0,
    z = 0,
    parent = group,
    r = 0.04,
  ) {
    return mesh(
      new RoundedBoxGeometry(w, h, d, 2, r),
      material,
      x,
      y,
      z,
      parent,
    );
  }
  // Cross sections define the sloping hood, shoulders and tapered bumpers.
  function shell(sections, material, parent = group) {
    const vertices = [],
      indices = [];
    for (const [z, width, bottom, top] of sections) {
      vertices.push(
        -width * 0.82,
        bottom,
        z,
        width * 0.82,
        bottom,
        z,
        width,
        bottom + 0.12,
        z,
        width,
        top - 0.08,
        z,
        width * 0.8,
        top,
        z,
        -width * 0.8,
        top,
        z,
        -width,
        top - 0.08,
        z,
        -width,
        bottom + 0.12,
        z,
      );
    }
    for (let j = 0; j < sections.length - 1; j++)
      for (let i = 0; i < 8; i++) {
        const a = j * 8 + i,
          b = j * 8 + ((i + 1) % 8),
          c = b + 8,
          d = a + 8;
        indices.push(a, b, c, a, c, d);
      }
    for (let i = 1; i < 7; i++) {
      indices.push(0, i + 1, i);
      const last = (sections.length - 1) * 8;
      indices.push(last, last + i, last + i + 1);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return mesh(geo, material, 0, 0, 0, parent);
  }
  shell(
    [
      [-1.95, 0.79, 0.35, 0.62],
      [-1.7, 0.95, 0.32, 0.79],
      [-1.05, 1.02, 0.34, 0.95],
      [0.35, 1, 0.35, 0.99],
      [1.25, 1.04, 0.36, 0.94],
      [1.87, 0.91, 0.38, 0.79],
    ],
    paint,
  );
  box(1.84, 0.12, 3.7, carbon, 0, 0.3, 0);
  box(1.15, 0.18, 0.12, rubber, 0, 0.51, -1.94);
  for (const x of [-0.67, 0.67]) {
    box(0.42, 0.14, 0.1, carbon, x, 0.7, -1.84);
    box(0.35, 0.035, 0.12, led, x, 0.75, -1.9);
    box(0.32, 0.03, 0.12, led, x, 0.68, -1.91);
    box(0.62, 0.07, 0.1, red, x * 0.85, 0.73, 1.88);
    box(0.45, 0.11, 0.25, carbon, x, 0.48, 1.85);
    const exhaust = mesh(
      new T.CylinderGeometry(0.07, 0.085, 0.25, 16),
      alloy,
      x,
      0.43,
      1.97,
    );
    exhaust.rotation.x = Math.PI / 2;
  }
  for (const x of [-0.33, 0.33])
    for (let i = 0; i < 4; i++)
      box(0.18, 0.02, 0.045, carbon, x, 0.914, -1.1 + i * 0.085);
  // Exterior canopy is hidden only from the driver's view, leaving the hood visible.
  const canopy = new T.Group();
  group.add(canopy);
  shell(
    [
      [-0.92, 0.79, 0.91, 0.99],
      [-0.32, 0.68, 1.01, 1.62],
      [0.58, 0.68, 1.01, 1.64],
      [1.12, 0.81, 0.94, 1.03],
    ],
    glass,
    canopy,
  );
  box(1.38, 0.075, 0.92, paint, 0, 1.645, 0.15, canopy);
  for (const side of [-1, 1]) {
    const pillar = box(
      0.065,
      0.82,
      0.065,
      paint,
      side * 0.72,
      1.29,
      -0.61,
      canopy,
    );
    pillar.rotation.x = 0.7;
    const rear = box(0.085, 0.77, 0.085, paint, side * 0.73, 1.3, 0.83, canopy);
    rear.rotation.x = -0.73;
    box(0.055, 0.56, 0.09, paint, side * 0.725, 1.29, 0.45, canopy);
    box(0.075, 0.1, 1.85, paint, side * 0.84, 0.98, 0.15, canopy);
    box(0.16, 0.035, 0.035, alloy, side * 1.008, 0.85, 0.48);
    box(0.24, 0.13, 0.32, paint, side * 1.04, 1.08, -0.54);
    box(0.18, 0.09, 0.018, glass, side * 1.05, 1.08, -0.37);
    box(0.07, 0.14, 2.5, carbon, side * 1.01, 0.36, 0);
  }
  // Rear wing, mounted on separate metal supports.
  for (const x of [-0.65, 0.65]) box(0.055, 0.32, 0.08, carbon, x, 1.06, 1.5);
  box(2.08, 0.095, 0.43, carbon, 0, 1.22, 1.53);
  for (const x of [-1.02, 1.02]) box(0.045, 0.22, 0.48, paint, x, 1.25, 1.53);
  const wheels = [];
  for (const x of [-1.01, 1.01])
    for (const z of [-1.2, 1.23]) {
      const pivot = new T.Group();
      pivot.position.set(x, 0.46, z);
      group.add(pivot);
      const spin = new T.Group();
      pivot.add(spin);
      const tire = mesh(
        new T.CylinderGeometry(0.46, 0.46, 0.32, 32),
        rubber,
        0,
        0,
        0,
        spin,
      );
      tire.rotation.z = Math.PI / 2;
      const outer = x > 0 ? 0.171 : -0.171;
      const disc = mesh(
        new T.CylinderGeometry(0.285, 0.285, 0.02, 24),
        carbon,
        outer,
        0,
        0,
        spin,
      );
      disc.rotation.z = Math.PI / 2;
      const rim = mesh(
        new T.TorusGeometry(0.32, 0.032, 8, 32),
        alloy,
        outer,
        0,
        0,
        spin,
      );
      rim.rotation.y = Math.PI / 2;
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        const spoke = box(0.028, 0.055, 0.56, alloy, outer, 0, 0, spin, 0.01);
        spoke.rotation.x = a;
      }
      const hub = mesh(
        new T.CylinderGeometry(0.1, 0.1, 0.05, 12),
        alloy,
        outer,
        0,
        0,
        spin,
      );
      hub.rotation.z = Math.PI / 2;
      // One draw call per tire rather than 24, keeping six-car matches light.
      const treads = new T.InstancedMesh(
        new T.BoxGeometry(0.325, 0.008, 0.022),
        rubber,
        24,
      );
      const transform = new T.Object3D();
      for (let i = 0; i < 24; i++) {
        const a = (i * Math.PI) / 12;
        transform.position.set(0, Math.cos(a) * 0.457, Math.sin(a) * 0.457);
        transform.rotation.set(a, 0, 0);
        transform.updateMatrix();
        treads.setMatrixAt(i, transform.matrix);
      }
      spin.add(treads);
      wheels.push({ pivot, spin, front: z < 0 });
    }
  const interior = new T.Group();
  group.add(interior);
  box(1.58, 0.2, 0.43, carbon, 0, 1.04, -0.52, interior, 0.07);
  box(0.49, 0.18, 0.06, rubber, -0.27, 1.14, -0.3, interior);
  const display = document.createElement("canvas");
  display.width = 512;
  display.height = 160;
  const displayContext = display.getContext("2d");
  const displayTexture = new T.CanvasTexture(display);
  displayTexture.colorSpace = T.SRGBColorSpace;
  mesh(
    new T.PlaneGeometry(0.4, 0.13),
    new T.MeshBasicMaterial({ map: displayTexture }),
    -0.27,
    1.145,
    -0.263,
    interior,
  );
  let previousSpeed = -1;
  function updateDisplay(speed) {
    const kmh = Math.round(Math.abs(speed) * 4);
    if (kmh === previousSpeed) return;
    previousSpeed = kmh;
    displayContext.fillStyle = "#06121b";
    displayContext.fillRect(0, 0, 512, 160);
    displayContext.fillStyle = "#7ae5f5";
    displayContext.font = "bold 90px monospace";
    displayContext.fillText(String(kmh).padStart(3, "0"), 20, 112);
    displayContext.font = "22px sans-serif";
    displayContext.fillText("KM/H", 245, 106);
    displayContext.fillText("NEON GT", 330, 40);
    displayContext.fillStyle = "#bfff64";
    displayContext.fillRect(20, 136, Math.min(470, (kmh / 184) * 470), 8);
    displayTexture.needsUpdate = true;
  }
  updateDisplay(0);
  const steering = new T.Group();
  steering.position.set(-0.29, 1.09, -0.1);
  steering.rotation.x = -0.18;
  interior.add(steering);
  mesh(new T.TorusGeometry(0.205, 0.027, 10, 32), rubber, 0, 0, 0, steering);
  for (const angle of [Math.PI / 2, -Math.PI / 2, Math.PI]) {
    const spoke = box(
      0.026,
      0.18,
      0.02,
      alloy,
      Math.sin(angle) * 0.08,
      Math.cos(angle) * 0.08,
      0,
      steering,
      0.007,
    );
    spoke.rotation.z = -angle;
  }
  box(0.095, 0.075, 0.04, carbon, 0, 0, 0.01, steering);
  const flame = mesh(
    new T.ConeGeometry(0.22, 1.5, 12),
    new T.MeshBasicMaterial({ color: "#8dedff" }),
    0,
    0.47,
    2.55,
  );
  flame.rotation.x = Math.PI / 2;
  flame.visible = false;
  return { group, canopy, interior, steering, updateDisplay, wheels, flame };
}
