// <four-device>: the case in 3D, driven by one number.
//
//   device.progress = 0..1   0 exploded, then it assembles, turns its screen to
//                            you, and the screen powers on near the end
//   device.shift = 0..1      slides the case to the left half (desktop guide)
//   device.screen = canvas   the live screen texture (a <four-screen> canvas)
//
// The model is the case's CAD assembly (public/model/case.glb, metres, Y up,
// screen on +Y, ports on -Z). Top-level nodes are grouped by name, and each
// group flies along the case's own up axis.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

type Group = "bottom" | "batt" | "board" | "screen" | "shell" | "caps" | "lid";

// which group a top-level node belongs to (after the earlier viewers of the case)
function groupOf(name: string): Group {
  if (/^Clear_lid/i.test(name)) return "lid";
  if (/^(Bottom_plate|Foot_)/i.test(name)) return "bottom";
  if (/^(Battery|Heat_sheet|Thermal_pad)/i.test(name)) return "batt";
  if (/^(OLED|Screen_(pcb|connector|flex|screw))/i.test(name)) return "screen";
  if (/^(Shell|Screen_window|TRS_slider)/i.test(name)) return "shell";
  if (/^(Knob_|Pointer_|Cap_)/i.test(name)) return "caps";
  return "board";
}

// how far each group sits from home when exploded (mm along the case's up axis),
// and the window of the assembly (0..1) in which it lands
const LIFT: Record<Group, number> = { bottom: -78, batt: -40, board: 0, screen: 46, shell: 92, caps: 150, lid: 0 };
const LAND: Record<Group, [number, number]> = {
  bottom: [0.0, 0.42],
  batt: [0.08, 0.5],
  board: [0.0, 0.1],
  screen: [0.3, 0.68],
  shell: [0.45, 0.85],
  caps: [0.62, 1.0],
  lid: [0, 1],
};

const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const span = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);
// lands with a short, soft settle
const land = (t: number) => {
  const e = easeInOut(t);
  return e + Math.sin(Math.PI * t) * 0.025 * (1 - t);
};

// phases of the whole progress
const P_ASM: [number, number] = [0.06, 0.58];
const P_TURN: [number, number] = [0.5, 0.82];
const P_ON: [number, number] = [0.8, 0.92];

type Part = { obj: THREE.Object3D; group: Group; home: THREE.Vector3; homeQ: THREE.Quaternion; jitter: THREE.Euler; lift: number /* mm */ };

export class FourDevice extends HTMLElement {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(28, 1, 1, 5000);
  private pivot = new THREE.Group(); // turns the whole case
  private model = new THREE.Group(); // the case, in mm
  private parts: Part[] = [];
  private screenMat: THREE.MeshBasicMaterial | null = null;
  private glowMat: THREE.MeshBasicMaterial | null = null;
  private tex: THREE.CanvasTexture | null = null;
  private upPerMm = new THREE.Vector3(0, 0.001, 0); // the case's up axis, in the parts' frame
  private key!: THREE.DirectionalLight;
  private axes = { R: new THREE.Vector3(1, 0, 0), B: new THREE.Vector3(0, 0, -1), U: new THREE.Vector3(0, 1, 0) };
  private rExploded = 160;
  private rAssembled = 75;
  private _progress = 0;
  private _shift = 0;
  private shiftNow = 0;
  private pointer = new THREE.Vector2();
  private pointerNow = new THREE.Vector2();
  private visible = true;
  private dirty = true;
  private t0 = performance.now();
  private qHero = new THREE.Quaternion();
  private qFace = new THREE.Quaternion();
  ready: Promise<void>;
  private resolveReady!: () => void;

  constructor() {
    super();
    this.ready = new Promise((r) => (this.resolveReady = r));
  }

  set progress(v: number) {
    const p = clamp(v);
    if (p !== this._progress) {
      this._progress = p;
      this.dirty = true;
    }
  }
  get progress() {
    return this._progress;
  }
  set shift(v: number) {
    this._shift = clamp(v);
    this.dirty = true;
  }

  /** The live screen: a canvas that changes (four-screen's canvas). */
  set screen(canvas: HTMLCanvasElement) {
    this.tex?.dispose();
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    t.anisotropy = 4;
    this.tex = t;
    if (this.screenMat) {
      this.screenMat.map = t;
      this.screenMat.needsUpdate = true;
    }
  }
  /** Call after the screen canvas painted a new frame. */
  screenChanged() {
    if (this.tex) this.tex.needsUpdate = true;
    if (this._progress > P_ON[0]) this.dirty = true;
  }

  connectedCallback() {
    if (this.renderer) return;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    this.appendChild(canvas);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      this.classList.add("no-webgl");
      this.dispatchEvent(new Event("nowebgl"));
      return;
    }
    this.renderer = renderer;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.85;
    const key = (this.key = new THREE.DirectionalLight(0xfff4e6, 2.8));
    key.position.set(-180, 260, 220);
    const rim = new THREE.DirectionalLight(0xbfd2ff, 1.6);
    rim.position.set(240, 80, -260);
    const fill = new THREE.HemisphereLight(0x9aa3b5, 0x0a0a0c, 0.35);
    this.scene.add(key, rim, fill, this.pivot);
    this.pivot.add(this.model);
    this.model.scale.setScalar(1000); // metres to mm

    // until the model is in, face the default way (set from the parts in load)
    this.qFace.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
    this.qHero.copy(this.qFace);

    new ResizeObserver(() => this.resize()).observe(this);
    new IntersectionObserver(([e]) => (this.visible = e.isIntersecting)).observe(this);
    addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      this.pointer.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
    });
    this.load();
    const loop = () => {
      requestAnimationFrame(loop);
      if (this.visible) this.frame();
    };
    requestAnimationFrame(loop);
  }

  private async load() {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    const src =
      this.getAttribute("model") ??
      (import.meta.env.DEV ? new URLSearchParams(location.search).get("model") : null) ??
      `${import.meta.env.BASE_URL}model/case.glb`;
    const gltf = await loader.loadAsync(src);
    let root: THREE.Object3D = gltf.scene;
    // the named parts sit under one or more single-child wrappers
    while (root.children.length === 1 && root.children[0].children.length > 0) root = root.children[0];

    // centre the assembled case at the origin
    gltf.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    gltf.scene.position.sub(box.getCenter(new THREE.Vector3()));
    this.model.add(gltf.scene);

    // measure with the pivot at rest: then world = model frame in mm
    const savedQ = this.pivot.quaternion.clone();
    const savedP = this.pivot.position.clone();
    this.pivot.quaternion.identity();
    this.pivot.position.set(0, 0, 0);
    this.pivot.updateMatrixWorld(true); // the pivot's own matrix too, not only its children
    // a knob's pointer is its own node: hang it on the knob, so they fly as one
    for (const ptr of [...root.children].filter((c) => /^Pointer_/i.test(c.name))) {
      const knob = root.children.find((c) => c.name === ptr.name.replace(/^Pointer_/i, "Knob_"));
      if (knob) knob.attach(ptr);
    }
    const parts = [...root.children];
    const find = (re: RegExp) => parts.find((p) => re.test(p.name));
    const boxOf = (o?: THREE.Object3D) => (o ? new THREE.Box3().setFromObject(o) : null);
    const mid = (o?: THREE.Object3D) => boxOf(o)?.getCenter(new THREE.Vector3()) ?? null;

    // the case's own axes, read from its parts: R points from E2 to E3 (right),
    // B from E2 to E1 (the back, where the ports are), U = R x B (the screen side)
    const e1 = mid(find(/^Knob_E1/i)), e2 = mid(find(/^Knob_E2/i)), e3 = mid(find(/^Knob_E3/i));
    const snap = (v: THREE.Vector3) => {
      const a = [Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)];
      const i = a.indexOf(Math.max(...a));
      return new THREE.Vector3().setComponent(i, Math.sign(v.getComponent(i)));
    };
    let R = new THREE.Vector3(1, 0, 0), B = new THREE.Vector3(0, 0, -1);
    if (e1 && e2 && e3) {
      R = snap(e3.clone().sub(e2));
      B = snap(e1.clone().sub(e2));
    }
    const U = new THREE.Vector3().crossVectors(R, B);
    this.axes = { R, B, U };
    // facing: R to the right, B up, U toward the camera
    this.qFace.setFromRotationMatrix(new THREE.Matrix4().makeBasis(R, B, U).transpose());
    // the hero: tipped back so you look onto the top from the front, then turned
    const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.9);
    const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -0.55);
    this.qHero.copy(yaw).multiply(tilt).multiply(this.qFace);

    // 1 mm along U, expressed in the parts' parent frame
    const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(this.model.matrixWorld);
    this.upPerMm.copy(U).multiplyScalar(0.001).applyMatrix3(new THREE.Matrix3().setFromMatrix4(toRoot));

    let i = 0;
    for (const obj of parts) {
      const group = groupOf(obj.name);
      if (group === "lid") {
        obj.visible = false;
        continue;
      }
      this.material(obj);
      const seed = Math.sin(++i * 12.9898) * 43758.5453;
      const r = (k: number) => Math.sin(seed * k);
      const loose = group === "caps" || group === "batt" || group === "bottom" ? 1 : 0.35;
      this.parts.push({
        obj,
        group,
        home: obj.position.clone(),
        homeQ: obj.quaternion.clone(),
        jitter: new THREE.Euler(r(1.3) * 0.22 * loose, r(2.1) * 0.35 * loose, r(3.7) * 0.22 * loose),
        // parts of one group spread a little in height, so a group is not a slab
        lift: LIFT[group] + (group === "caps" ? r(4.3) * 14 : group === "board" ? 0 : r(5.9) * 6),
      });
    }
    this.addScreen(find(/^OLED/i) ?? find(/^Screen_window/i), find(/^Screen_window/i));

    const shell = boxOf(find(/^Shell/i)) ?? new THREE.Box3().setFromObject(root);
    const size = shell.getSize(new THREE.Vector3());
    this.rAssembled = Math.abs(size.dot(R)) / 2 + 8;
    this.rExploded = Math.max(this.rAssembled, (LIFT.caps - LIFT.bottom) / 2 + 34);
    this.pivot.quaternion.copy(savedQ);
    this.pivot.position.copy(savedP);
    this.resolveReady();
    this.dirty = true;
    this.dispatchEvent(new Event("load"));
  }

  // materials chosen by part, over the CAD's own colours
  private material(obj: THREE.Object3D) {
    const name = obj.name;
    const anod = new THREE.MeshPhysicalMaterial({ color: 0x25282d, metalness: 0.6, roughness: 0.52, clearcoat: 0.15, clearcoatRoughness: 0.6, envMapIntensity: 0.75 });
    const pick = (): THREE.Material | null => {
      if (/^(Shell|Bottom_plate)/i.test(name)) return anod;
      if (/^Screen_window/i.test(name))
        return new THREE.MeshPhysicalMaterial({ color: 0x0b0c0e, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.22, envMapIntensity: 1.6, depthWrite: false });
      if (/^OLED/i.test(name)) return new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.35, metalness: 0.2 });
      if (/^Knob_/i.test(name)) return new THREE.MeshPhysicalMaterial({ color: 0x18191c, metalness: 0.35, roughness: 0.38, clearcoat: 0.4 });
      if (/^Pointer_/i.test(name)) return new THREE.MeshStandardMaterial({ color: 0xece6d8, roughness: 0.5 });
      if (/^Cap_/i.test(name)) return new THREE.MeshPhysicalMaterial({ color: 0xe6e0d2, roughness: 0.55, sheen: 0.3 });
      if (/^Foot_/i.test(name)) return new THREE.MeshStandardMaterial({ color: 0x101012, roughness: 0.95 });
      return null;
    };
    const m = pick();
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      // a pointer hung on its knob keeps the pointer's light finish
      for (let a = o.parent; a && a !== obj; a = a.parent) {
        if (/^Pointer_/i.test(a.name)) {
          mesh.material = new THREE.MeshStandardMaterial({ color: 0xece6d8, roughness: 0.5 });
          return;
        }
      }
      if (m) mesh.material = m;
      else {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mm of mats) if ("envMapIntensity" in mm) (mm as THREE.MeshStandardMaterial).envMapIntensity = 0.9;
      }
    });
  }

  // a lit plane on the OLED, under the window glass, with a soft glow over it.
  // Called with the pivot at rest, so world coordinates are the model frame in mm.
  private addScreen(host?: THREE.Object3D, glass?: THREE.Object3D) {
    glass ??= host;
    if (!host || !glass) return;
    const { R, B, U } = this.axes;
    const gb = new THREE.Box3().setFromObject(glass);
    const hb = new THREE.Box3().setFromObject(host);
    const along = (b: THREE.Box3, v: THREE.Vector3) => Math.abs(b.getSize(new THREE.Vector3()).dot(v));
    const w = along(gb, R) * 0.94;
    const d = along(gb, B) * 0.92;
    // the top of the OLED along U, and the window's middle across it
    const ui = [U.x, U.y, U.z].findIndex((c) => c !== 0);
    const top = U.getComponent(ui) > 0 ? hb.max.getComponent(ui) : hb.min.getComponent(ui);
    const centre = gb.getCenter(new THREE.Vector3()).setComponent(ui, top + U.getComponent(ui) * 0.06);
    const basis = new THREE.Matrix4().makeBasis(R, B, U);
    // world (mm) to the host part's own frame
    host.updateMatrixWorld(true);
    const toHost = new THREE.Matrix4().copy(host.matrixWorld).invert();
    const place = (mesh: THREE.Mesh, lift: number) => {
      const m = basis.clone().setPosition(centre.clone().addScaledVector(U, lift));
      mesh.applyMatrix4(m.premultiply(toHost));
      host.add(mesh);
    };
    this.screenMat = new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false, map: this.tex });
    place(new THREE.Mesh(new THREE.PlaneGeometry(w, d), this.screenMat), 0);

    const g = document.createElement("canvas");
    g.width = 256;
    g.height = 128;
    const c = g.getContext("2d")!;
    const grad = c.createRadialGradient(128, 64, 10, 128, 64, 128);
    grad.addColorStop(0, "rgba(246,236,214,0.5)");
    grad.addColorStop(1, "rgba(246,236,214,0)");
    c.fillStyle = grad;
    c.fillRect(0, 0, 256, 128);
    this.glowMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(g), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    place(new THREE.Mesh(new THREE.PlaneGeometry(w * 1.6, d * 1.9), this.glowMat), 0.8);
  }

  private resize() {
    if (!this.renderer) return;
    const w = this.clientWidth || innerWidth;
    const h = this.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  private frame() {
    if (!this.renderer) return;
    const now = performance.now();
    const t = (now - this.t0) / 1000;
    const p = this._progress;
    const asm = span(p, ...P_ASM);
    const turn = easeInOut(span(p, ...P_TURN));
    const on = easeOut(span(p, ...P_ON));

    // parts: fly home in their windows, with a little tumble while apart
    for (const part of this.parts) {
      const k = land(span(asm, ...LAND[part.group]));
      const apart = 1 - k;
      part.obj.position.copy(part.home).addScaledVector(this.upPerMm, part.lift * apart);
      part.obj.quaternion
        .copy(part.homeQ)
        .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(part.jitter.x * apart, part.jitter.y * apart, part.jitter.z * apart)));
    }

    // the case: hero angle with a slow drift, turning to face you
    const idle = 1 - span(p, 0, 0.3);
    this.pointerNow.lerp(this.pointer, 0.05);
    const drift = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        Math.sin(t * 0.35) * 0.05 * idle + this.pointerNow.y * 0.06,
        Math.sin(t * 0.22) * 0.12 * idle + this.pointerNow.x * 0.1,
        0,
      ),
    );
    // in the guide the case leans a little, so it keeps its depth beside the text
    const lean = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.12 * this.shiftNow, 0.32 * this.shiftNow, 0));
    this.pivot.quaternion.copy(this.qHero).slerp(this.qFace, turn).premultiply(lean).premultiply(drift);
    this.pivot.position.y = Math.sin(t * 0.6) * 1.5 * idle;

    // camera distance: fit the exploded stack, then the assembled case
    const fit = THREE.MathUtils.lerp(this.rExploded, this.rAssembled, easeInOut(clamp(asm * 1.1)));
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const portrait = this.camera.aspect < 1;
    const room = portrait ? 1.16 : 1.25;
    // the case comes closer as its screen lights, and again beside the guide
    const closer = Math.max((portrait ? 0.04 : 0.2) * on * (1 - this.shiftNow), 0.22 * this.shiftNow);
    const dist = ((fit * room) / Math.sin(Math.min(vFov, hFov) / 2)) * (1 - closer);
    this.camera.position.set(0, 0, dist);
    this.camera.lookAt(0, 0, 0);

    // desktop guide: slide the case into the left half
    this.shiftNow += (this._shift - this.shiftNow) * 0.08;
    if (Math.abs(this._shift - this.shiftNow) > 0.0005) this.dirty = true;
    // in the hero the case makes room for the words: up on a phone, to the
    // right on a wide screen; it comes to the middle as it assembles
    const w = this.renderer.domElement.width;
    const h = this.renderer.domElement.height;
    const room2 = 1 - easeInOut(clamp(asm * 1.6));
    const offX = w * 0.24 * this.shiftNow - (portrait ? 0 : w * 0.13 * room2);
    const offY = portrait ? h * 0.13 * room2 : 0;
    if (Math.abs(offX) > 0.5 || Math.abs(offY) > 0.5) this.camera.setViewOffset(w, h, offX, offY, w, h);
    else this.camera.clearViewOffset();

    // facing you, the top face would mirror the room too brightly
    this.scene.environmentIntensity = 0.85 - 0.35 * turn;
    this.key.intensity = 2.8 - 1.2 * turn;

    // the screen powers on
    if (this.screenMat) {
      const c = on * 1.0;
      this.screenMat.color.setRGB(c, c, c);
    }
    if (this.glowMat) this.glowMat.opacity = on * 0.22;

    const moving = idle > 0 || this.pointerNow.distanceTo(this.pointer) > 0.0005 || this.dirty;
    if (!moving) return;
    this.dirty = false;
    this.renderer.render(this.scene, this.camera);
  }
}

customElements.define("four-device", FourDevice);
