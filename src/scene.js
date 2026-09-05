import * as T from "three";
import { createCar } from "./car.js";
import { DASH_DURATION } from "./physics.js";
export function createScene(container) {
  const scene = new T.Scene();
  scene.background = new T.Color("#080e1c");
  scene.fog = new T.FogExp2("#080e1c", 0.009);
  const renderer = new T.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);
  const camera = new T.PerspectiveCamera(
    53,
    innerWidth / innerHeight,
    0.1,
    250,
  );
  scene.add(new T.HemisphereLight(0x9acaff, 0x243625, 2.2));
  const sun = new T.DirectionalLight(0xd0edff, 2.8);
  sun.position.set(-15, 35, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -45,
    right: 45,
    top: 50,
    bottom: -50,
    far: 120,
  });
  sun.shadow.normalBias = 0.04;
  scene.add(sun);
  const mat = (color, extra = {}) =>
    new T.MeshStandardMaterial({ color, roughness: 0.65, ...extra });
  const turf = mat("#19404b"),
    dark = mat("#111d2d"),
    cyan = mat("#38cfff", { emissive: "#16baff", emissiveIntensity: 2 }),
    orange = mat("#ff945c", { emissive: "#ff732b", emissiveIntensity: 2 }),
    white = mat("#aecac8", { emissive: "#aecac8", emissiveIntensity: 0.15 });
  function box(w, h, d, m, x = 0, y = 0, z = 0, parent = scene) {
    const o = new T.Mesh(new T.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z);
    o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  box(47, 1, 75, dark, 0, -0.65);
  box(42, 0.2, 64, turf, 0, -0.1);
  for (let z = -28; z <= 28; z += 8)
    box(42, 0.012, 4, mat("#1d4750"), 0, 0.012, z);
  function line(points, color = 0x81aeb2) {
    const o = new T.Line(
      new T.BufferGeometry().setFromPoints(
        points.map((p) => new T.Vector3(...p)),
      ),
      new T.LineBasicMaterial({ color, transparent: true, opacity: 0.65 }),
    );
    scene.add(o);
    return o;
  }
  line([
    [-20, 0.03, -31],
    [-20, 0.03, 31],
    [20, 0.03, 31],
    [20, 0.03, -31],
    [-20, 0.03, -31],
  ]);
  line([
    [-21, 0.04, 0],
    [21, 0.04, 0],
  ]);
  const circle = [];
  for (let i = 0; i <= 100; i++)
    circle.push([
      Math.sin((i / 100) * Math.PI * 2) * 7,
      0.04,
      Math.cos((i / 100) * Math.PI * 2) * 7,
    ]);
  line(circle);
  for (const sign of [-1, 1]) {
    const m = sign === 1 ? cyan : orange;
    line([
      [-11, 0.04, sign * 31],
      [-11, 0.04, sign * 23],
      [11, 0.04, sign * 23],
      [11, 0.04, sign * 31],
    ]);
    box(
      14,
      0.035,
      7,
      mat(sign === 1 ? "#205867" : "#614840"),
      0,
      0.025,
      sign * 28.5,
    );
    for (const x of [-7, 7]) box(0.25, 6, 0.25, m, x, 3, sign * 32);
    box(14, 0.25, 0.25, m, 0, 6, sign * 32);
    box(14, 0.18, 4, m, 0, 0.08, sign * 34);
    const netmat = new T.LineBasicMaterial({
      color: sign === 1 ? 0x43c6ff : 0xff9a69,
      transparent: true,
      opacity: 0.24,
    });
    const pts = [];
    for (let x = -7; x <= 7; x++) {
      pts.push(new T.Vector3(x, 0, sign * 36), new T.Vector3(x, 6, sign * 36));
      pts.push(new T.Vector3(x, 6, sign * 32), new T.Vector3(x, 6, sign * 36));
    }
    for (let y = 0; y <= 6; y++)
      pts.push(new T.Vector3(-7, y, sign * 36), new T.Vector3(7, y, sign * 36));
    for (const x of [-7, 7])
      for (let y = 0; y <= 6; y++)
        pts.push(
          new T.Vector3(x, y, sign * 32),
          new T.Vector3(x, y, sign * 36),
        );
    scene.add(
      new T.LineSegments(new T.BufferGeometry().setFromPoints(pts), netmat),
    );
    for (const x of [-14, 14]) {
      box(14, 1.6, 0.6, dark, x, 0.8, sign * 32);
      box(14, 0.08, 0.65, m, x, 1.65, sign * 32);
    }
    const light = new T.PointLight(sign === 1 ? 0x25c9ff : 0xff7836, 95, 23, 2);
    light.position.set(0, 4, sign * 30);
    scene.add(light);
  }
  for (const x of [-21.4, 21.4]) {
    box(0.7, 1.6, 65, dark, x, 0.8);
    box(0.75, 0.09, 65, cyan, x, 1.65);
    const glass = mat("#77baff", {
      transparent: true,
      opacity: 0.065,
      depthWrite: false,
    });
    box(0.15, 5, 65, glass, x, 4);
    for (let z = -32; z <= 32; z += 8) box(0.12, 4, 0.12, dark, x, 3.7, z);
  }
  // Grandstands and an original procedural skyline keep the arena self-contained.
  for(const sx of [-1,1])for(const sz of [-1,1]){
    for(let i=0;i<12;i++){
      const a=i/12*Math.PI/2,b=(i+1)/12*Math.PI/2;
      const ax=sx*(17+Math.cos(a)*4),az=sz*(28+Math.sin(a)*4);
      const bx=sx*(17+Math.cos(b)*4),bz=sz*(28+Math.sin(b)*4);
      const length=Math.hypot(bx-ax,bz-az),angle=Math.atan2(bx-ax,bz-az);
      const wall=box(.45,1.6,length+.03,dark,(ax+bx)/2,.8,(az+bz)/2);wall.rotation.y=angle;
      const rail=box(.48,.08,length+.03,cyan,(ax+bx)/2,1.64,(az+bz)/2);rail.rotation.y=angle;
    }
  }
  for (const side of [-1, 1])
    for (let row = 0; row < 4; row++) {
      box(
        4,
        1,
        76,
        mat(row % 2 ? "#172839" : "#101b2c"),
        side * (25 + row * 3),
        row * 1.5 - 0.1,
      );
      for (let z = -35; z <= 35; z += 2)
        box(
          0.4,
          0.12,
          0.65,
          mat((z + row) % 3 ? "#416073" : "#829da5"),
          side * (25 + row * 3),
          row * 1.5 + 0.48,
          z,
        );
    }
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * Math.PI * 2,
      r = 72 + (i % 4) * 6,
      h = 5 + ((i * 13) % 23);
    box(5, h, 6, mat("#111e30"), Math.sin(a) * r, h / 2 - 2, Math.cos(a) * r);
    for (let j = 2; j < h; j += 3)
      box(
        5.03,
        0.16,
        6.03,
        mat("#375065", { emissive: "#294157", emissiveIntensity: 0.4 }),
        Math.sin(a) * r,
        j - 2,
        Math.cos(a) * r,
      );
  }
  for (const x of [-28, 28])
    for (const z of [-28, 28]) {
      box(0.35, 19, 0.35, dark, x, 9, z);
      box(5, 0.4, 1, white, x, 18.5, z);
    }
  const starPositions = [];
  for (let i = 0; i < 180; i++) {
    const a = i * 2.3999;
    starPositions.push(
      Math.cos(a) * 110,
      25 + ((i * 17) % 80),
      Math.sin(a) * 110,
    );
  }
  const stars = new T.Points(
    new T.BufferGeometry().setAttribute(
      "position",
      new T.Float32BufferAttribute(starPositions, 3),
    ),
    new T.PointsMaterial({ color: 0x89b2d2, size: 0.16 }),
  );
  scene.add(stars);
  const carMeshes = new Map();
  function carMesh(c) {
    if (carMeshes.has(c.id)) return carMeshes.get(c.id);
    const model = createCar(c.team === 0 ? "#2796cf" : "#ed732e");
    model.interior.visible = false;
    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 256;
    labelCanvas.height = 64;
    const ctx = labelCanvas.getContext("2d");
    ctx.fillStyle = c.team === 0 ? "#123d5ce6" : "#5c3012e6";
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = c.team === 0 ? "#58d7ff" : "#ffad70";
    ctx.fillRect(0, 58, 256, 6);
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.fillText(
      c.human
        ? "VOC\u00ca"
        : `${c.team === 0 ? "ALIADO" : "RIVAL"} ${c.slot + 1}`,
      128,
      40,
    );
    const texture = new T.CanvasTexture(labelCanvas);
    texture.colorSpace = T.SRGBColorSpace;
    const label = new T.Sprite(
      new T.SpriteMaterial({ map: texture, depthWrite: false }),
    );
    label.scale.set(2.7, 0.68, 1);
    scene.add(label);
    model.label = label;
    scene.add(model.group);
    carMeshes.set(c.id, model);
    return model;
  }
  const ball = new T.Mesh(
    new T.SphereGeometry(1.3, 32, 24),
    mat("#f1f1da", { roughness: 0.4, metalness: 0.15 }),
  );
  ball.castShadow = true;
  scene.add(ball);
  // Curved pentagonal panels make the physical spin legible from the chase camera.
  const panelMaterial = mat("#203342", { roughness: 0.6 });
  const ico = new T.IcosahedronGeometry(1, 0).getAttribute("position");
  const used = new Set();
  for (let i = 0; i < ico.count; i++) {
    const normal = new T.Vector3().fromBufferAttribute(ico, i).normalize();
    const key = normal
      .toArray()
      .map((n) => n.toFixed(3))
      .join(",");
    if (used.has(key)) continue;
    used.add(key);
    const tangent = new T.Vector3(0, 1, 0).cross(normal).normalize();
    if (tangent.lengthSq() < 0.01) tangent.set(1, 0, 0);
    const bitangent = new T.Vector3().crossVectors(normal, tangent);
    const vertices = [...normal.clone().multiplyScalar(1.306).toArray()],
      indices = [];
    for (let j = 0; j < 5; j++) {
      const angle = (j * Math.PI * 2) / 5;
      const point = normal
        .clone()
        .addScaledVector(tangent, Math.cos(angle) * 0.31)
        .addScaledVector(bitangent, Math.sin(angle) * 0.31)
        .normalize()
        .multiplyScalar(1.306);
      vertices.push(...point.toArray());
    }
    for (let j = 0; j < 5; j++) indices.push(0, j + 1, ((j + 1) % 5) + 1);
    const geometry = new T.BufferGeometry();
    geometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(vertices, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    ball.add(new T.Mesh(geometry, panelMaterial));
  }
  const ring = new T.Mesh(
    new T.RingGeometry(1.5, 1.62, 40),
    new T.MeshBasicMaterial({
      color: 0xc8ff86,
      transparent: true,
      opacity: 0.6,
      side: T.DoubleSide,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
  const marker = new T.Mesh(
    new T.ConeGeometry(0.4, 0.65, 3),
    new T.MeshBasicMaterial({ color: 0xbfff64 }),
  );
  marker.rotation.z = Math.PI;
  scene.add(marker);
  const particles = [];
  const particleGeo = new T.BoxGeometry(0.18, 0.18, 0.18);
  const particleMats = [cyan, orange, white];
  function burst(x, y, z, color = 0, count = 30) {
    for (let i = 0; i < count; i++) {
      const p = new T.Mesh(particleGeo, particleMats[color]);
      p.position.set(x, y, z);
      scene.add(p);
      particles.push({
        p,
        v: new T.Vector3(
          (Math.random() - 0.5) * 16,
          Math.random() * 14,
          (Math.random() - 0.5) * 16,
        ),
        life: 0.6 + Math.random(),
      });
    }
  }
  function resize() {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize);
  resize();
  const desired = new T.Vector3(),
    target = new T.Vector3();
  const flipAxis = new T.Vector3(),
    flipRotation = new T.Quaternion();
  let previousMode = "";
  return {
    renderer,
    scene,
    camera,
    burst,
    render(state, dt, t) {
      for (const mesh of carMeshes.values()) {
        mesh.group.visible = false;
        mesh.label.visible = false;
      }
      for (const c of state.cars) {
        const mesh = carMesh(c);
        mesh.group.visible = true;
        mesh.label.visible = state.phase !== "menu";
        mesh.label.position.set(c.x, c.y + 3.1, c.z);
        const flip = c.dashTime > 0 ? 1 - c.dashTime / DASH_DURATION : 0;
        mesh.group.position.set(c.x, c.y + Math.sin(flip * Math.PI) * 0.8, c.z);
        mesh.group.rotation.set(
          0,
          -c.angle,
          c.dashTime > 0
            ? 0
            : -(c.vx * Math.cos(c.angle) + c.vz * Math.sin(c.angle)) * 0.013,
          "YXZ",
        );
        if (c.dashTime > 0) {
          flipAxis.set(-c.dashForward, 0, -c.dashSide);
          mesh.group.quaternion.multiply(
            flipRotation.setFromAxisAngle(flipAxis, flip * Math.PI * 2),
          );
        }
        mesh.flame.visible = !!c.turbo || c.dashTime > 0;
        mesh.flame.scale.y = 0.8 + Math.random() * 0.5;
        const speed = c.vx * Math.sin(c.angle) - c.vz * Math.cos(c.angle);

        const moving = state.phase === "playing";
        for (const w of mesh.wheels) {
          if (moving) w.spin.rotation.x -= (speed * dt) / 0.46;
          w.pivot.rotation.y = w.front ? -(c.steer || 0) * 0.38 : 0;
        }
        mesh.steering.rotation.z = -(c.steer || 0) * 0.65;
      }
      ball.position.set(state.ball.x, state.ball.y, state.ball.z);
      ball.quaternion.set(
        state.ball.qx,
        state.ball.qy,
        state.ball.qz,
        state.ball.qw,
      );
      ring.position.set(state.ball.x, 0.055, state.ball.z);
      ring.scale.setScalar(1 + state.ball.y * 0.035);
      marker.position.set(
        state.player.x,
        state.player.y + 3.1 + Math.sin(t * 3) * 0.12,
        state.player.z,
      );
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        p.v.y -= 18 * dt;
        p.p.position.addScaledVector(p.v, dt);
        p.p.rotation.x += dt * 5;
        if (p.life <= 0) {
          scene.remove(p.p);
          particles.splice(i, 1);
        }
      }
      const menu = state.phase === "menu";
      const mode = menu ? "menu" : state.cameraMode;
      const c = state.player;
      const fx = Math.sin(c.angle),
        fz = -Math.cos(c.angle);

      marker.visible = menu;
      scene.fog.density = menu ? 0.009 : 0.003;
      let fov = 53;
      if (menu) {
        desired.set(47 + Math.sin(t * 0.08) * 5, 43, 53);
        target.set(0, 0, -1);
      } else {
        let directionX = fx,
          directionZ = fz;
        if (state.cameraMode === "ball") {
          const dx = state.ball.x - c.x,
            dz = state.ball.z - c.z;
          const distance = Math.hypot(dx, dz);
          if (distance > 1) {
            directionX = dx / distance;
            directionZ = dz / distance;
          }
        }
        // A wider, elevated chase view leaves room to line up the next touch.
        desired.set(c.x - directionX * 10, c.y + 5.4, c.z - directionZ * 10);
        target.set(c.x + directionX * 5, c.y + 1.2, c.z + directionZ * 5);
        if (state.cameraMode === "ball")
          target.y += Math.min(3, state.ball.y * 0.25);
        // Keep the camera inside the boards, lifting it when the car backs into a wall.
        const x = T.MathUtils.clamp(desired.x, -20, 20),
          z = T.MathUtils.clamp(desired.z, -31, 31);
        desired.y += Math.min(
          3,
          Math.hypot(desired.x - x, desired.z - z) * 0.45,
        );
        desired.x = x;
        desired.z = z;
        fov = camera.aspect < 1 ? 80 : 72;
      }
      if (previousMode !== mode) camera.position.copy(desired);
      else camera.position.lerp(desired, 1 - Math.exp(-dt * 8));
      camera.fov += (fov - camera.fov) * (1 - Math.exp(-dt * 7));
      camera.updateProjectionMatrix();
      camera.lookAt(target);
      previousMode = mode;
      renderer.render(scene, camera);
    },
  };
}
