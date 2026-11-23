// three.js renderer for a hole: terrain, water, trees, flag, ball, lines, wind and camera.
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { OB_MARGIN, dist, heightAt, pathInfo, slopeAt, surfaceAt, windAt, type Hole, type ThemeName, type Vec } from "../lib/course";
import type { Vec3 } from "../lib/physics";
import { PALETTES, type Palette } from "./theme";

const T = (x: number, y: number, z: number) => new THREE.Vector3(x, z, -y);

export type CamMode = "flyover" | "aim" | "putt" | "follow" | "watch" | "celebrate";

export type TerrainMap = { canvas: HTMLCanvasElement; x0: number; x1: number; y0: number; y1: number };

function hashNoise(x: number, y: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function holeBounds(hole: Hole) {
  const xs = hole.path.map((p) => p.x);
  const pad = hole.corridorHalfWidth + OB_MARGIN + 15;
  return { x0: Math.min(...xs) - pad, x1: Math.max(...xs) + pad, y0: -55, y1: hole.length + 80 };
}

/** Paint the hole's surfaces into a canvas used as the terrain texture and the minimap. */
export function paintTerrain(hole: Hole, pal: Palette): TerrainMap {
  const { x0, x1, y0, y1 } = holeBounds(hole);
  const ppy = Math.min(2.6, 2048 / (x1 - x0), 4096 / (y1 - y0));
  const W = Math.ceil((x1 - x0) * ppy);
  const H = Math.ceil((y1 - y0) * ppy);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(W, H);
  const d = img.data;
  for (let py = 0; py < H; py++) {
    const y = y1 - (py + 0.5) / ppy;
    for (let px = 0; px < W; px++) {
      const x = x0 + (px + 0.5) / ppy;
      const p = { x, y };
      const s = surfaceAt(hole, p);
      let c: [number, number, number];
      let k = 0.95 + hashNoise(px, py) * 0.1;
      switch (s) {
        case "fairway":
        case "tee": {
          c = s === "tee" ? pal.tee : pal.fairway;
          const info = pathInfo(p, hole.path);
          k *= Math.floor(info.along / 11) % 2 === 0 ? 1.06 : 0.95;
          // Soft first cut at the edge.
          if (s === "fairway" && info.d > hole.fairwayHalfWidth - 1.2) k *= 0.93;
          break;
        }
        case "green": {
          c = pal.green;
          k *= Math.floor((x - hole.pin.x + 200) / 2.5) % 2 === 0 ? 1.04 : 0.97;
          break;
        }
        case "fringe":
          c = pal.fringe;
          break;
        case "bunker": {
          c = pal.sand;
          let edge = 0;
          for (const b of hole.bunkers) for (const ci of b) edge = Math.max(edge, ci.r - Math.hypot(x - ci.x, y - ci.y));
          if (edge < 0.45) k *= 0.82;
          k = 0.97 + hashNoise(px * 3, py * 7) * 0.06;
          break;
        }
        case "water":
          c = [40, 70, 60];
          break;
        case "woods":
        case "ob": {
          c = pal.woods;
          k *= 0.85 + hashNoise(px >> 1, py >> 1) * 0.25;
          break;
        }
        default: {
          c = pal.rough;
          const info = pathInfo(p, hole.path);
          // Rough gets darker toward the trees.
          k *= 1 - Math.max(0, Math.min(0.18, (info.d - hole.fairwayHalfWidth - 4) / 150));
        }
      }
      const i = (py * W + px) * 4;
      d[i] = Math.min(255, c[0] * k);
      d[i + 1] = Math.min(255, c[1] * k);
      d[i + 2] = Math.min(255, c[2] * k);
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return { canvas, x0, x1, y0, y1 };
}

export type AimView = {
  ball: Vec3;
  heading: number;
  target: Vec3;
  preview: Vec3[];
  laser: Vec3[] | null;
  putt: boolean;
};

export class GolfScene {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 4000);
  private holeGroup = new THREE.Group();
  private hole: Hole | null = null;
  private pal: Palette = PALETTES.parkland;
  private sun: THREE.DirectionalLight;
  private hemi: THREE.HemisphereLight;
  private sky: THREE.Mesh;
  private ball: THREE.Mesh;
  private ballShadow: THREE.Mesh;
  private trail: Line2;
  private trailMat: LineMaterial;
  private preview: Line2;
  private previewMat: LineMaterial;
  private laser: Line2;
  private laserMat: LineMaterial;
  private target: THREE.Group;
  private flagGroup = new THREE.Group();
  private flag!: THREE.Mesh;
  private flagBase!: Float32Array;
  private wind: THREE.LineSegments;
  private windData: { x: number; y: number; z: number; life: number }[] = [];
  private slopeDots: THREE.Points | null = null;
  private slopeData: { bx: number; by: number; bz: number; gx: number; gy: number; ux: number; uy: number; amt: number; phase: number }[] = [];
  private ballPos: Vec3 = { x: 0, y: 0, z: 0 };
  private aim: AimView | null = null;
  private mode: CamMode = "aim";
  private camPos = new THREE.Vector3(0, 10, 10);
  private camLook = new THREE.Vector3();
  private fly: { t: number; dur: number; p0: THREE.Vector3; p1: THREE.Vector3; l0: THREE.Vector3; done: () => void } | null = null;
  private celebrateT = 0;
  private followDir = new THREE.Vector3(0, 0, -1);
  private size = { w: 1, h: 1 };
  private time = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x445533, 1.1);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.6;
    this.scene.add(this.sun, this.sun.target);

    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } },
      vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = max(vP.y, 0.0); gl_FragColor = vec4(mix(bottom, top, pow(h, 0.55)), 1.0); }`,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), skyMat);
    this.scene.add(this.sky, this.holeGroup);

    this.ball = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 }));
    this.ball.castShadow = false;
    this.ballShadow = new THREE.Mesh(
      new THREE.CircleGeometry(1, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    this.ballShadow.rotation.x = -Math.PI / 2;
    this.scene.add(this.ball, this.ballShadow);

    this.trailMat = new LineMaterial({ color: 0xffffff, linewidth: 3, transparent: true, opacity: 0.75, depthWrite: false });
    this.trail = new Line2(new LineGeometry(), this.trailMat);
    this.previewMat = new LineMaterial({ color: 0xffffff, linewidth: 2.5, transparent: true, opacity: 0.85, dashed: true, dashSize: 1.6, gapSize: 1.2, depthWrite: false });
    this.preview = new Line2(new LineGeometry(), this.previewMat);
    this.laserMat = new LineMaterial({ color: 0xffc83d, linewidth: 4, transparent: true, opacity: 0.95, depthWrite: false });
    this.laser = new Line2(new LineGeometry(), this.laserMat);
    this.trail.visible = this.preview.visible = this.laser.visible = false;
    this.scene.add(this.trail, this.preview, this.laser);

    this.target = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthTest: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48), ringMat);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), ringMat);
    ring.rotation.x = dot.rotation.x = -Math.PI / 2;
    ring.renderOrder = dot.renderOrder = 10;
    this.target.add(ring, dot);
    this.scene.add(this.target);

    const N = 280;
    const wg = new THREE.BufferGeometry();
    wg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 6), 3));
    this.wind = new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32, depthWrite: false }));
    this.wind.frustumCulled = false;
    for (let i = 0; i < N; i++) this.windData.push({ x: 0, y: 0, z: 0, life: -1 });
    this.scene.add(this.wind);
  }

  resize(w: number, h: number) {
    this.size = { w, h };
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    for (const m of [this.trailMat, this.previewMat, this.laserMat]) m.resolution.set(w, h);
  }

  loadHole(hole: Hole, theme: ThemeName): TerrainMap {
    this.hole = hole;
    this.pal = PALETTES[theme];
    const pal = this.pal;
    // Clear the previous hole.
    this.holeGroup.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else if (mat) {
        const mm = mat as THREE.MeshStandardMaterial;
        mm.map?.dispose();
        mat.dispose();
      }
    });
    this.holeGroup.clear();
    this.clearSlopeDots();

    (this.sky.material as THREE.ShaderMaterial).uniforms.top.value.set(pal.skyTop);
    (this.sky.material as THREE.ShaderMaterial).uniforms.bottom.value.set(pal.skyBottom);
    this.scene.fog = new THREE.Fog(pal.fog, 260, 1100);
    this.hemi.color.set(pal.skyBottom);
    this.hemi.groundColor.setRGB(pal.woods[0] / 255, pal.woods[1] / 255, pal.woods[2] / 255);
    this.sun.color.set(pal.sun);

    const map = paintTerrain(hole, pal);
    const { x0, x1, y0, y1 } = map;
    const tex = new THREE.CanvasTexture(map.canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    tex.generateMipmaps = true;

    // Terrain mesh.
    const step = 1.5;
    const nx = Math.ceil((x1 - x0) / step) + 1;
    const ny = Math.ceil((y1 - y0) / step) + 1;
    const pos = new Float32Array(nx * ny * 3);
    const uv = new Float32Array(nx * ny * 2);
    let minH = Infinity;
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const x = Math.min(x1, x0 + i * step);
        const y = Math.min(y1, y0 + j * step);
        const h = heightAt(hole, x, y);
        minH = Math.min(minH, h);
        const k = j * nx + i;
        pos[k * 3] = x;
        pos[k * 3 + 1] = h;
        pos[k * 3 + 2] = -y;
        uv[k * 2] = (x - x0) / (x1 - x0);
        uv[k * 2 + 1] = (y - y0) / (y1 - y0);
      }
    const idx = new Uint32Array((nx - 1) * (ny - 1) * 6);
    let q = 0;
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        const a = j * nx + i;
        const b = a + 1;
        const c = a + nx;
        const d = c + 1;
        idx[q++] = a;
        idx[q++] = b;
        idx[q++] = c;
        idx[q++] = b;
        idx[q++] = d;
        idx[q++] = c;
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 }));
    terrain.receiveShadow = true;
    this.holeGroup.add(terrain);

    // Ground beyond the playing area.
    const skirtColor = new THREE.Color().setRGB(pal.woods[0] / 255, pal.woods[1] / 255, pal.woods[2] / 255, THREE.SRGBColorSpace).multiplyScalar(0.8);
    const skirt = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshLambertMaterial({ color: skirtColor }));
    skirt.rotation.x = -Math.PI / 2;
    skirt.position.set((x0 + x1) / 2, minH - 1.5, -(y0 + y1) / 2);
    this.holeGroup.add(skirt);

    // Water.
    const waterMat = new THREE.MeshPhongMaterial({ color: pal.water, shininess: 90, specular: 0x88bbdd, transparent: true, opacity: 0.9 });
    for (const w of hole.ponds)
      for (const c of w.circles) {
        const m = new THREE.Mesh(new THREE.CircleGeometry(c.r + 1.3, 40), waterMat);
        m.rotation.x = -Math.PI / 2;
        m.position.copy(T(c.x, c.y, w.level));
        m.receiveShadow = true;
        this.holeGroup.add(m);
      }

    // Trees.
    this.buildTrees(hole, pal);

    // Tee markers.
    const markerMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 });
    for (const sx of [-3.5, 3.5]) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), markerMat);
      m.position.copy(T(hole.tee.x + sx, hole.tee.y + 1, heightAt(hole, hole.tee.x + sx, hole.tee.y + 1) + 0.15));
      this.holeGroup.add(m);
    }

    // Cup and flag.
    const pz = heightAt(hole, hole.pin.x, hole.pin.y);
    const rim = new THREE.Mesh(new THREE.RingGeometry(0.11, 0.135, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    rim.rotation.x = -Math.PI / 2;
    rim.position.copy(T(hole.pin.x, hole.pin.y, pz + 0.025));
    this.holeGroup.add(rim);
    const cup = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), new THREE.MeshBasicMaterial({ color: 0x0b1008 }));
    cup.rotation.x = -Math.PI / 2;
    cup.position.copy(T(hole.pin.x, hole.pin.y, pz + 0.02));
    this.holeGroup.add(cup);
    this.flagGroup = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.6, 8), new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.3 }));
    pole.position.y = 1.3;
    pole.castShadow = true;
    const fg = new THREE.PlaneGeometry(1.0, 0.62, 12, 2);
    fg.translate(0.5, 2.25, 0);
    this.flagBase = Float32Array.from(fg.attributes.position.array as Float32Array);
    this.flag = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ color: 0xe11d48, side: THREE.DoubleSide, roughness: 0.6 }));
    this.flag.castShadow = true;
    this.flagGroup.add(pole, this.flag);
    this.flagGroup.position.copy(T(hole.pin.x, hole.pin.y, pz));
    this.holeGroup.add(this.flagGroup);

    // Sun and shadow camera sized to the hole.
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const half = Math.max(x1 - x0, y1 - y0) / 2 + 20;
    const center = T(cx, cy, 0);
    this.sun.position.copy(center).add(new THREE.Vector3(-0.55, 0.5, 0.45).normalize().multiplyScalar(600));
    this.sun.target.position.copy(center);
    const sc = this.sun.shadow.camera;
    sc.left = -half;
    sc.right = half;
    sc.top = half;
    sc.bottom = -half;
    sc.near = 100;
    sc.far = 1400;
    sc.updateProjectionMatrix();

    this.trail.visible = false;
    for (const p of this.windData) p.life = -1;
    return map;
  }

  private buildTrees(hole: Hole, pal: Palette) {
    const pines = hole.trees.filter((t) => t.kind === "pine");
    const oaks = hole.trees.filter((t) => t.kind === "oak");
    const trunkGeo = new THREE.CylinderGeometry(0.16, 0.3, 1, 6);
    trunkGeo.translate(0, 0.5, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: pal.trunk, roughness: 1 });
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, hole.trees.length);
    const coneGeo = new THREE.ConeGeometry(1, 1, 8);
    coneGeo.translate(0, 0.5, 0);
    const blobGeo = new THREE.IcosahedronGeometry(1, 1);
    const leafMat = new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true });
    const cones1 = new THREE.InstancedMesh(coneGeo, leafMat, Math.max(1, pines.length));
    const cones2 = new THREE.InstancedMesh(coneGeo, leafMat, Math.max(1, pines.length));
    const blobs = new THREE.InstancedMesh(blobGeo, leafMat, Math.max(1, oaks.length * 2));
    const m = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const col = new THREE.Color();
    let ti = 0;
    let pi = 0;
    let oi = 0;
    for (const t of hole.trees) {
      const g = heightAt(hole, t.x, t.y);
      const rnd = hashNoise(Math.round(t.x * 10), Math.round(t.y * 10));
      const trunkH = t.kind === "pine" ? t.h * 0.3 : t.h * 0.5;
      m.compose(T(t.x, t.y, g - 0.2), quat.identity(), new THREE.Vector3(1 + t.r * 0.08, trunkH, 1 + t.r * 0.08));
      trunks.setMatrixAt(ti++, m);
      if (t.kind === "pine") {
        col.set(pal.pine[Math.floor(rnd * pal.pine.length)]);
        m.compose(T(t.x, t.y, g + t.h * 0.15), quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd * 6), new THREE.Vector3(t.r, t.h * 0.6, t.r));
        cones1.setMatrixAt(pi, m);
        cones1.setColorAt(pi, col);
        m.compose(T(t.x, t.y, g + t.h * 0.45), quat, new THREE.Vector3(t.r * 0.72, t.h * 0.55, t.r * 0.72));
        cones2.setMatrixAt(pi, m);
        cones2.setColorAt(pi, col.clone().multiplyScalar(1.12));
        pi++;
      } else {
        col.set(pal.oak[Math.floor(rnd * pal.oak.length)]);
        m.compose(T(t.x, t.y, g + t.h * 0.62), quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd * 6), new THREE.Vector3(t.r, t.r * 0.85, t.r));
        blobs.setMatrixAt(oi, m);
        blobs.setColorAt(oi++, col);
        m.compose(
          T(t.x + (rnd - 0.5) * t.r * 0.8, t.y + (0.5 - rnd) * t.r * 0.6, g + t.h * 0.62 + t.r * 0.45),
          quat,
          new THREE.Vector3(t.r * 0.65, t.r * 0.6, t.r * 0.65),
        );
        blobs.setMatrixAt(oi, m);
        blobs.setColorAt(oi++, col.clone().multiplyScalar(1.15));
      }
    }
    cones1.count = cones2.count = pi;
    blobs.count = oi;
    trunks.count = ti;
    for (const im of [trunks, cones1, cones2, blobs]) {
      im.castShadow = true;
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      this.holeGroup.add(im);
    }
  }

  setBall(p: Vec3) {
    this.ballPos = p;
  }

  setAim(aim: AimView | null) {
    this.aim = aim;
    if (!aim) {
      this.preview.visible = false;
      this.laser.visible = false;
      this.target.visible = false;
      return;
    }
    const setLine = (line: Line2, pts: Vec3[] | null) => {
      if (!pts || pts.length < 2) {
        line.visible = false;
        return;
      }
      const arr: number[] = [];
      for (const p of pts) arr.push(p.x, p.z + 0.08, -p.y);
      const g = new LineGeometry();
      g.setPositions(arr);
      line.geometry.dispose();
      line.geometry = g;
      line.computeLineDistances();
      line.visible = true;
    };
    const hole = this.hole;
    setLine(this.preview, hole ? aim.preview.map((p) => ({ x: p.x, y: p.y, z: heightAt(hole, p.x, p.y) + 0.1 })) : aim.preview);
    this.flagGroup.visible = !aim.putt;
    setLine(this.laser, aim.laser);
    this.target.visible = !aim.putt;
    this.target.position.copy(T(aim.target.x, aim.target.y, aim.target.z + 0.06));
  }

  setTrail(pts: Vec3[]) {
    if (pts.length < 2) {
      this.trail.visible = false;
      return;
    }
    const arr: number[] = [];
    const stride = Math.max(1, Math.floor(pts.length / 400));
    for (let i = 0; i < pts.length; i += stride) arr.push(pts[i].x, pts[i].z + 0.05, -pts[i].y);
    const last = pts[pts.length - 1];
    arr.push(last.x, last.z + 0.05, -last.y);
    const g = new LineGeometry();
    g.setPositions(arr);
    this.trail.geometry.dispose();
    this.trail.geometry = g;
    this.trail.visible = true;
  }

  showSlopeDots(on: boolean) {
    if (!on) return this.clearSlopeDots();
    if (this.slopeDots || !this.hole) return;
    const hole = this.hole;
    const R = hole.greenRadius + 1.5;
    const sp = 0.8;
    this.slopeData = [];
    for (let x = -R; x <= R; x += sp)
      for (let y = -R; y <= R; y += sp) {
        if (x * x + y * y > R * R) continue;
        const bx = hole.pin.x + x;
        const by = hole.pin.y + y;
        const sl = slopeAt(hole, bx, by);
        const mag = Math.hypot(sl.x, sl.y) || 1e-6;
        this.slopeData.push({
          bx,
          by,
          bz: heightAt(hole, bx, by),
          gx: sl.x,
          gy: sl.y,
          ux: -sl.x / mag,
          uy: -sl.y / mag,
          amt: Math.min(1, mag / 0.03),
          phase: hashNoise(Math.round(bx * 7), Math.round(by * 7)),
        });
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(this.slopeData.length * 3), 3));
    this.slopeDots = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.55, depthWrite: false }));
    this.slopeDots.frustumCulled = false;
    this.scene.add(this.slopeDots);
  }

  private clearSlopeDots() {
    if (!this.slopeDots) return;
    this.scene.remove(this.slopeDots);
    this.slopeDots.geometry.dispose();
    (this.slopeDots.material as THREE.Material).dispose();
    this.slopeDots = null;
  }

  setMode(mode: CamMode) {
    if (mode === "celebrate") this.celebrateT = 0;
    if (mode === "follow" && this.aim) {
      const h = this.aim.heading;
      this.followDir.set(Math.sin(h), 0, -Math.cos(h));
    }
    this.mode = mode;
  }

  /** Swoop from behind the green down to the tee. */
  flyover(done: () => void) {
    if (!this.hole) return done();
    const hole = this.hole;
    const back = { x: hole.pin.x + (hole.pin.x - hole.tee.x) * 0.06, y: hole.pin.y + 45 };
    this.fly = {
      t: 0,
      dur: 3.6,
      p0: T(back.x, back.y, heightAt(hole, hole.pin.x, hole.pin.y) + 38),
      p1: T((hole.tee.x + hole.pin.x) / 2 + 30, hole.length * 0.5, hole.teeHeight + 75),
      l0: T(hole.pin.x, hole.pin.y - 30, heightAt(hole, hole.pin.x, hole.pin.y)),
      done,
    };
    this.mode = "flyover";
    this.camPos.copy(this.fly.p0);
    this.camLook.copy(T(hole.pin.x, hole.pin.y - 60, heightAt(hole, hole.pin.x, hole.pin.y - 60)));
  }

  skipFlyover() {
    if (this.fly) {
      const done = this.fly.done;
      this.fly = null;
      this.mode = "aim";
      this.snapCamera();
      done();
    }
  }

  private aimCamera(): { pos: THREE.Vector3; look: THREE.Vector3 } {
    const b = this.ballPos;
    const aim = this.aim;
    const h = aim?.heading ?? 0;
    const dir = new THREE.Vector3(Math.sin(h), 0, -Math.cos(h));
    const ball = T(b.x, b.y, b.z);
    if (aim?.putt) {
      const d = dist(b, aim.target);
      const back = 3 + Math.min(d, 20) * 0.25;
      const pos = ball.clone().addScaledVector(dir, -back).add(new THREE.Vector3(0, 1.3 + d * 0.08, 0));
      const look = ball.clone().addScaledVector(dir, Math.min(d, 25) * 0.7);
      look.y = (aim.target.z + b.z) / 2;
      return { pos, look };
    }
    const d = aim ? dist(b, aim.target) : 150;
    const back = 9 + Math.min(d, 260) * 0.03;
    const pos = ball.clone().addScaledVector(dir, -back).add(new THREE.Vector3(0, 3.5 + Math.min(d, 260) * 0.045, 0));
    const lookDist = Math.min(d * 0.55, 140);
    const lp = { x: b.x + Math.sin(h) * lookDist, y: b.y + Math.cos(h) * lookDist };
    const look = T(lp.x, lp.y, this.hole ? heightAt(this.hole, lp.x, lp.y) : b.z);
    return { pos, look };
  }

  snapCamera() {
    const { pos, look } = this.aimCamera();
    this.camPos.copy(pos);
    this.camLook.copy(look);
  }

  /** Current camera heading (radians from +y toward +x), for the wind compass. */
  cameraHeading(): number {
    const d = this.camLook.clone().sub(this.camPos);
    return Math.atan2(d.x, -d.z);
  }

  /** World point (yards) under a screen position, by marching along the view ray. */
  pick(sx: number, sy: number): Vec | null {
    if (!this.hole) return null;
    const ndc = new THREE.Vector2((sx / this.size.w) * 2 - 1, -(sy / this.size.h) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const o = ray.ray.origin;
    const d = ray.ray.direction;
    let prev = 0;
    for (let t = 1; t < 900; t += 1.5) {
      const p = o.clone().addScaledVector(d, t);
      if (p.y <= heightAt(this.hole, p.x, -p.z)) {
        // Refine.
        let lo = prev;
        let hi = t;
        for (let i = 0; i < 12; i++) {
          const mid = (lo + hi) / 2;
          const q = o.clone().addScaledVector(d, mid);
          if (q.y <= heightAt(this.hole, q.x, -q.z)) hi = mid;
          else lo = mid;
        }
        const q = o.clone().addScaledVector(d, hi);
        return { x: q.x, y: -q.z };
      }
      prev = t;
    }
    return null;
  }

  update(dt: number) {
    this.time += dt;
    const hole = this.hole;
    if (!hole) return;
    const b = this.ballPos;
    const ballV = T(b.x, b.y, b.z);

    // Camera.
    if (this.mode === "flyover" && this.fly) {
      const f = this.fly;
      f.t += dt;
      const k = Math.min(1, f.t / f.dur);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const end = this.aimCamera();
      const a = f.p0.clone().lerp(f.p1, e);
      const c = f.p1.clone().lerp(end.pos, e);
      this.camPos.copy(a.lerp(c, e));
      this.camLook.copy(f.l0.clone().lerp(end.look, e));
      if (k >= 1) {
        const done = f.done;
        this.fly = null;
        this.mode = "aim";
        done();
      }
    } else if (this.mode === "aim" || this.mode === "putt") {
      const { pos, look } = this.aimCamera();
      const s = 1 - Math.exp(-dt * 5);
      this.camPos.lerp(pos, s);
      this.camLook.lerp(look, s);
    } else if (this.mode === "follow") {
      const want = ballV.clone().addScaledVector(this.followDir, -16).add(new THREE.Vector3(0, 6, 0));
      const g = heightAt(hole, want.x, -want.z);
      want.y = Math.max(want.y, g + 2.5);
      this.camPos.lerp(want, 1 - Math.exp(-dt * 0.9));
      this.camLook.lerp(ballV, 1 - Math.exp(-dt * 7));
    } else if (this.mode === "watch") {
      this.camLook.lerp(ballV, 1 - Math.exp(-dt * 6));
    } else if (this.mode === "celebrate") {
      this.celebrateT += dt;
      const pz = heightAt(hole, hole.pin.x, hole.pin.y);
      const a = this.celebrateT * 0.5;
      const want = T(hole.pin.x + Math.sin(a) * 7, hole.pin.y + Math.cos(a) * 7, pz + 2.6);
      this.camPos.lerp(want, 1 - Math.exp(-dt * 2));
      this.camLook.lerp(T(hole.pin.x, hole.pin.y, pz + 0.4), 1 - Math.exp(-dt * 3));
    }
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    // Ball, sized so it stays visible at a distance.
    const camDist = this.camera.position.distanceTo(ballV);
    const r = Math.max(0.035, Math.min(1.4, camDist * 0.0055));
    this.ball.scale.setScalar(r);
    this.ball.position.copy(ballV).add(new THREE.Vector3(0, r * 0.9, 0));
    const g = heightAt(hole, b.x, b.y);
    const air = Math.max(0, b.z - g);
    this.ballShadow.position.copy(T(b.x, b.y, g + 0.04));
    this.ballShadow.scale.setScalar(r * (1 + air * 0.02));
    (this.ballShadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0.08, 0.38 - air * 0.01);

    // Target ring pulses and scales with distance.
    if (this.target.visible) {
      const td = this.camera.position.distanceTo(this.target.position);
      this.target.scale.setScalar(Math.max(1, td * 0.022) * (1 + Math.sin(this.time * 4) * 0.06));
    }

    // Flag: points downwind, waves, and grows when far away so it stays readable.
    const w = hole.wind;
    const wHead = Math.atan2(w.y, w.x);
    this.flagGroup.rotation.y = wHead;
    const fd = this.camera.position.distanceTo(this.flagGroup.position);
    this.flagGroup.scale.setScalar(Math.max(1, Math.min(6, fd / 45)));
    const wspd = Math.hypot(w.x, w.y);
    const fp = this.flag.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < fp.count; i++) {
      const x = this.flagBase[i * 3];
      fp.setZ(i, Math.sin(x * 5 - this.time * (4 + wspd * 0.5)) * 0.07 * x * (0.4 + Math.min(1, wspd / 12)));
    }
    fp.needsUpdate = true;

    // Wind streaks drift through the view, faster and denser in gust bands.
    this.updateWind(dt);

    // Green slope dots flow downhill.
    if (this.slopeDots) {
      const arr = this.slopeDots.geometry.attributes.position as THREE.BufferAttribute;
      this.slopeData.forEach((s, i) => {
        const f = ((this.time * 0.35 + s.phase) % 1) * 0.7 * s.amt;
        const x = s.bx + s.ux * f;
        const y = s.by + s.uy * f;
        arr.setXYZ(i, x, s.bz + s.gx * s.ux * f + s.gy * s.uy * f + 0.06, -y);
      });
      arr.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  }

  private updateWind(dt: number) {
    const hole = this.hole!;
    const arr = this.wind.geometry.attributes.position as THREE.BufferAttribute;
    const look = this.camLook;
    const cam = this.camPos;
    const fwd = { x: look.x - cam.x, y: -(look.z - cam.z) };
    const fl = Math.hypot(fwd.x, fwd.y) || 1;
    const show = Math.hypot(hole.wind.x, hole.wind.y) > 1 || hole.gusts.length > 0;
    this.wind.visible = show && this.mode !== "flyover";
    if (!this.wind.visible) return;
    const gustY = hole.gusts.map((g) => (g.y0 + g.y1) / 2);
    this.windData.forEach((p, i) => {
      if (p.life <= 0) {
        // Respawn ahead of the camera; a share of streaks go into gust bands.
        const ahead = 25 + Math.random() * 120;
        let x = cam.x + (fwd.x / fl) * ahead + (Math.random() - 0.5) * 90;
        let y = -cam.z + (fwd.y / fl) * ahead + (Math.random() - 0.5) * 40;
        if (gustY.length && Math.random() < 0.45) {
          const gy = hole.gusts[i % hole.gusts.length];
          y = gy.y0 + Math.random() * (gy.y1 - gy.y0);
          x = pathInfoX(hole, y) + (Math.random() - 0.5) * hole.corridorHalfWidth * 2;
        }
        p.x = x;
        p.y = y;
        p.z = heightAt(hole, x, y) + 1 + Math.random() * 14;
        p.life = 1.2 + Math.random() * 1.8;
      }
      const g = heightAt(hole, p.x, p.y);
      const wv = windAt(hole, p.x, p.y, p.z, g);
      const sp = Math.hypot(wv.x, wv.y);
      const vx = wv.x * 0.9;
      const vy = wv.y * 0.9;
      p.x += vx * dt;
      p.y += vy * dt;
      p.life -= dt;
      const len = 0.6 + sp * 0.22;
      const ux = sp > 0.01 ? wv.x / sp : 0;
      const uy = sp > 0.01 ? wv.y / sp : 0;
      arr.setXYZ(i * 2, p.x, p.z, -p.y);
      arr.setXYZ(i * 2 + 1, p.x - ux * len, p.z, -(p.y - uy * len));
    });
    arr.needsUpdate = true;
  }

  dispose() {
    this.renderer.dispose();
  }
}

function pathInfoX(hole: Hole, y: number): number {
  // Approximate centerline x at a given y.
  const p = hole.path;
  for (let i = 0; i < p.length - 1; i++)
    if (y >= p[i].y && y <= p[i + 1].y) {
      const t = (y - p[i].y) / (p[i + 1].y - p[i].y || 1);
      return p[i].x + (p[i + 1].x - p[i].x) * t;
    }
  return y < 0 ? p[0].x : p[p.length - 1].x;
}
