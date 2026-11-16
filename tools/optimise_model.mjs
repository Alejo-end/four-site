// Turns the FreeCAD GLB of the handheld case into the web model and its parts list.
//
//   node optimise_model.mjs <in.glb> <out.glb> <parts.json> <geometry.json> [debug.glb]
//
// Run by the private build script (tools/private, git ignored) from tools/work/npm, where the
// pinned glTF-Transform packages are. DEVICE_NAME_RE holds the words no name in the GLB may contain.
const nameRe = process.env.DEVICE_NAME_RE ? new RegExp(process.env.DEVICE_NAME_RE, 'i') : null;
// The CLI cannot simplify one subtree only, so this script uses the CLI's own library calls.
//
// What it does, in order:
//  1. Joins each top-level part into one mesh per material. OCCT writes one primitive per CAD face.
//     The KiCad board subtree (260 parts) collapses into three named groups: the PCB, the CM4
//     module and the components.
//  2. Simplifies the board only. A part under 3.5 mm (resistors, capacitors, small transistors)
//     becomes one box per solid piece; the rest is simplified to an absolute error limit (0.1 mm).
//     The case parts keep every triangle.
//  3. Puts each part's origin at the centre of its bounding box (a knob spins on its axis), and the
//     scene origin at the centre of the shell's bounding box.
//  4. Gives OLED_panel UVs: (0,0) to (1,1) covers the viewing window in the top face.
//  5. Names the root node "case" and the scene "scene": nothing in the file names the device.
//  6. Quantizes (KHR_mesh_quantization) and compresses (EXT_meshopt_compression). Each named node
//     keeps a plain transform: the mesh hangs under it in an unnamed child that takes the
//     dequantization matrix.
//  7. Writes parts.json: name, triangles and bounding box in mm for every top-level part.
import fs from 'node:fs';
import { NodeIO, PropertyType } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, weldPrimitive, joinPrimitives, transformPrimitive, compactPrimitive, quantize, reorder } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';

const [IN, OUT, PARTS, GEOMETRY, DEBUG] = process.argv.slice(2);
if (!IN || !OUT || !PARTS || !GEOMETRY) throw new Error('usage: optimise_model.mjs in.glb out.glb parts.json geometry.json [debug.glb]');

// Settings
const BOARD = /^board-/;                    // the KiCad board's top-level node, "board-s90 1" at stage s90 (not Board_screw_*)
const BOARD_GROUPS = [                      // first match wins; the names are the KiCad names
  ['s90_PCB', (n) => /_PCB$/.test(n)],
  ['CM4_module', (n) => /^CM4_module/.test(n)],
  ['Components', () => true],
];
const BOARD_ERROR = Number(process.env.BOARD_ERROR_MM || 0.1) / 1000;   // metres: how far the simplified board may stray from the CAD surface
const SMALL_PART = 3.5e-3;                  // metres: a board part this small (0402 to 1206, SOT-23 and the like) becomes boxes,
                                            // one per solid piece and colour (body, each termination, each lead)
const POSITION_BITS = 14;                   // 14 bits over each part's own box: 7 um on the 120 mm shell
const NORMAL_BITS = 10;
const SCREEN = 'OLED_panel';
const GROUP = [                             // parts.json groups, by node name
  ['shell', /^(Shell)$/],
  ['bottom', /^Bottom_plate$/],
  ['battery_thermal', /^(Battery|Battery_foam|Thermal_pad|Heat_sheet|Heat_sheet_film)$/],
  ['board', BOARD],
  ['screen', /^(Screen_|OLED_panel)/],
  ['controls', /^(Knob_|Pointer_|Cap_|TRS_slider)/],
  ['lid', /^Clear_lid$/],
  ['mics', /^Mic_/],
  ['fasteners', /^(Foot_|Board_screw_|CM4_spacer_|CM4_screw_)/],
];

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(IN);
const root = doc.getRoot();
const G = JSON.parse(fs.readFileSync(GEOMETRY, 'utf8'));

// --- small 4x4 helpers (column-major, as glTF) -------------------------------------------------
const mul = (a, b) => {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
};
const invert = (m) => {   // general inverse (gl-matrix's algorithm)
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
  const d = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);
  return [
    (a11 * b11 - a12 * b10 + a13 * b09) * d, (a02 * b10 - a01 * b11 - a03 * b09) * d, (a31 * b05 - a32 * b04 + a33 * b03) * d, (a22 * b04 - a21 * b05 - a23 * b03) * d,
    (a12 * b08 - a10 * b11 - a13 * b07) * d, (a00 * b11 - a02 * b08 + a03 * b07) * d, (a32 * b02 - a30 * b05 - a33 * b01) * d, (a20 * b05 - a22 * b02 + a23 * b01) * d,
    (a10 * b10 - a11 * b08 + a13 * b06) * d, (a01 * b08 - a00 * b10 - a03 * b06) * d, (a30 * b04 - a31 * b02 + a33 * b00) * d, (a21 * b02 - a20 * b04 - a23 * b00) * d,
    (a11 * b07 - a10 * b09 - a12 * b06) * d, (a00 * b09 - a01 * b07 + a02 * b06) * d, (a31 * b01 - a30 * b03 - a32 * b00) * d, (a20 * b03 - a21 * b01 + a22 * b00) * d,
  ];
};
const translation = (t) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, t[0], t[1], t[2], 1];
const isIdentity = (m) => m.every((v, i) => Math.abs(v - (i % 5 === 0 ? 1 : 0)) < 1e-12);
const plainTRS = (n) => {
  const r = n.getRotation(), s = n.getScale();
  return Math.abs(r[0]) + Math.abs(r[1]) + Math.abs(r[2]) < 1e-9 && Math.abs(r[3] - 1) < 1e-9 && s.every((v) => Math.abs(v - 1) < 1e-9);
};

const tris = (prims) => prims.reduce((a, p) => a + (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3, 0);
const meshTris = (node) => { let t = 0; node.traverse((n) => { if (n.getMesh()) t += tris(n.getMesh().listPrimitives()); }); return t; };
const box = (prims) => {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const p of prims) {
    const a = p.getAttribute('POSITION'), v = [0, 0, 0];
    for (let i = 0; i < a.getCount(); i++) { a.getElement(i, v); for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], v[k]); hi[k] = Math.max(hi[k], v[k]); } }
  }
  return { lo, hi, c: lo.map((l, k) => (l + hi[k]) / 2) };
};
const cloneDeep = (p) => {   // a primitive with its own copy of every accessor
  const c = doc.createPrimitive().setMode(p.getMode()).setMaterial(p.getMaterial());
  for (const sem of p.listSemantics()) c.setAttribute(sem, p.getAttribute(sem).clone().setArray(p.getAttribute(sem).getArray().slice()));
  if (p.getIndices()) c.setIndices(p.getIndices().clone().setArray(new Uint32Array(p.getIndices().getArray())));
  return c;
};

// --- 0. the input --------------------------------------------------------------------------------
const scene = root.getDefaultScene() || root.listScenes()[0];
if (root.listScenes().length !== 1 || scene.listChildren().length !== 1) throw new Error('expected one scene with one root node');
const wrap = scene.listChildren()[0];
if (!isIdentity(wrap.getMatrix())) throw new Error('the root node has a transform');
const parts = wrap.listChildren();
const inTris = meshTris(wrap);
console.log(`in: ${parts.length} top-level parts, ${inTris} triangles, ${root.listMeshes().length} meshes, ${root.listAccessors().length} accessors`);
for (const p of parts) if (!plainTRS(p)) throw new Error(`${p.getName()} has a rotation or a scale`);

await doc.transform(dedup({ propertyTypes: [PropertyType.MATERIAL] }));

// --- 1. and 2. join, weld, simplify ------------------------------------------------------------------
function simplifyAbsolute(prim, error, permissive) {
  const idx = prim.getIndices().getArray();
  const pos = prim.getAttribute('POSITION').getArray();
  // Permissive lets the simplifier collapse across the hard edges of the CAD faces; without it most
  // vertices of a small CAD part are locked. It costs some shading accuracy at those edges, so the
  // PCB (a flat plate, where it would smear the holes) does without. Prune drops loose bits smaller than the error.
  const flags = ['ErrorAbsolute', 'Prune'].concat(permissive ? ['Permissive'] : []);
  const [out] = MeshoptSimplifier.simplify(idx instanceof Uint32Array ? idx : new Uint32Array(idx), pos, 3, 0, error, flags);
  prim.setIndices(prim.getIndices().setArray(out));
  compactPrimitive(prim);
  if (prim.getAttribute('POSITION').getCount() < 65535) prim.getIndices().setArray(new Uint16Array(prim.getIndices().getArray()));
}

// one primitive per material from a list of {prim, rel}
function joinByMaterial(items) {
  const byMat = new Map();
  for (const { prim, rel } of items) {
    const c = cloneDeep(prim);
    if (!isIdentity(rel)) transformPrimitive(c, rel);
    const k = c.getMaterial();
    if (!byMat.has(k)) byMat.set(k, []);
    byMat.get(k).push(c);
  }
  const out = [];
  for (const list of byMat.values()) {
    const j = list.length === 1 ? list[0] : joinPrimitives(list);
    if (j !== list[0]) list.forEach((p) => p.dispose());
    weldPrimitive(j);
    out.push(j);
  }
  return out;
}

// hang prims (in `node`'s frame) under `node`, with node's origin moved to their box centre
function attach(node, prims) {
  const { c } = box(prims);
  const shift = translation(c.map((v) => -v));
  prims.forEach((p) => transformPrimitive(p, shift));
  const t = node.getTranslation();
  node.setTranslation([t[0] + c[0], t[1] + c[1], t[2] + c[2]]);
  const mesh = doc.createMesh();
  prims.forEach((p) => mesh.addPrimitive(p));
  node.addChild(doc.createNode().setMesh(mesh));
}

// A tiny board part keeps its look as boxes: one box per connected solid piece and material, in the
// part's own frame (so a rotated part keeps its rotation). 12 triangles each, flat normals.
function boxPrim(lo, hi, material) {
  const P = [], N = [], I = [];
  const faces = [   // axis, sign
    [0, 1], [0, -1], [1, 1], [1, -1], [2, 1], [2, -1],
  ];
  for (const [ax, sg] of faces) {
    const u = (ax + 1) % 3, v = (ax + 2) % 3, base = P.length / 3;
    const corners = sg > 0 ? [[0, 0], [1, 0], [1, 1], [0, 1]] : [[0, 0], [0, 1], [1, 1], [1, 0]];
    for (const [a, b] of corners) {
      const q = [0, 0, 0];
      q[ax] = sg > 0 ? hi[ax] : lo[ax];
      q[u] = a ? hi[u] : lo[u];
      q[v] = b ? hi[v] : lo[v];
      P.push(...q);
      const n = [0, 0, 0]; n[ax] = sg; N.push(...n);
    }
    I.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const buf = root.listBuffers()[0];
  return doc.createPrimitive().setMaterial(material)
    .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(P)).setBuffer(buf))
    .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(N)).setBuffer(buf))
    .setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint16Array(I)).setBuffer(buf));
}
function boxSmallParts(part, items) {
  const byTop = new Map();
  for (const it of items) { if (!byTop.has(it.topNode)) byTop.set(it.topNode, []); byTop.get(it.topNode).push(it); }
  const out = [], partInv = invert(part.getWorldMatrix());
  let nParts = 0, nBoxes = 0, before = 0;
  for (const [top, list] of byTop) {
    // every vertex in the frame of the part's own node, grouped by material
    const topInv = invert(top.getWorldMatrix());
    const byMat = new Map(), lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const it of list) {
      const m = mul(topInv, it.node.getWorldMatrix()), a = it.prim.getAttribute('POSITION'), v = [0, 0, 0], pts = [];
      for (let i = 0; i < a.getCount(); i++) {
        a.getElement(i, v);
        const w = [0, 1, 2].map((k) => m[k] * v[0] + m[4 + k] * v[1] + m[8 + k] * v[2] + m[12 + k]);
        pts.push(w);
        for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], w[k]); hi[k] = Math.max(hi[k], w[k]); }
      }
      const mat = it.prim.getMaterial();
      if (!byMat.has(mat)) byMat.set(mat, []);
      byMat.get(mat).push({ pts, idx: it.prim.getIndices().getArray() });
    }
    if (Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) > SMALL_PART || top.getName().startsWith('CM4_module') || /_PCB$/.test(top.getName())) {
      out.push(...list);
      continue;
    }
    nParts++;
    before += tris(list.map((it) => it.prim));
    const rel = mul(partInv, top.getWorldMatrix());
    for (const [mat, faces] of byMat) {
      // weld by position (1 um grid), then join the triangles into connected pieces
      const key = new Map(), parent = [], pos = [];
      const id = (w) => {
        const k = w.map((x) => Math.round(x * 1e6)).join(',');
        if (!key.has(k)) { key.set(k, pos.length); parent.push(pos.length); pos.push(w); }
        return key.get(k);
      };
      const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
      for (const f of faces) {
        const ids = f.pts.map(id);
        for (let t = 0; t < f.idx.length; t += 3) {
          const a = find(ids[f.idx[t]]), b = find(ids[f.idx[t + 1]]), c = find(ids[f.idx[t + 2]]);
          parent[b] = a; parent[find(c)] = a;
        }
      }
      const pieces = new Map();
      pos.forEach((w, i) => {
        const r = find(i);
        if (!pieces.has(r)) pieces.set(r, [[Infinity, Infinity, Infinity], [-Infinity, -Infinity, -Infinity]]);
        const [l, h] = pieces.get(r);
        for (let k = 0; k < 3; k++) { l[k] = Math.min(l[k], w[k]); h[k] = Math.max(h[k], w[k]); }
      });
      for (const [l, h] of pieces.values()) {
        out.push({ prim: boxPrim(l, h, mat), rel, top: top.getName(), node: top, topNode: top });
        nBoxes++;
      }
    }
  }
  console.log(`  ${part.getName()}: ${nParts} parts under ${SMALL_PART * 1000} mm became ${nBoxes} boxes (${before} -> ${nBoxes * 12} triangles)`);
  return out;
}

const report = [];
for (const part of parts) {
  const name = part.getName();
  const before = meshTris(part);
  const inv = invert(part.getWorldMatrix());
  const items = [];   // {prim, rel, top, node, topNode}: rel maps the prim into the part's frame, top is the name of the part's child it hangs under
  part.traverse((n) => {
    if (!n.getMesh()) return;
    let top = n;
    while (top !== part && top.getParentNode() !== part) top = top.getParentNode();
    const rel = mul(inv, n.getWorldMatrix());
    for (const prim of n.getMesh().listPrimitives()) items.push({ prim, rel, top: top === part ? '' : top.getName(), node: n, topNode: top });
  });
  const oldKids = part.listChildren();
  part.setMesh(null);

  if (BOARD.test(name)) {
    // the board: three named groups, each simplified
    const boxed = boxSmallParts(part, items);
    const groups = BOARD_GROUPS.map(([g]) => [g, boxed.filter((it) => BOARD_GROUPS.find(([, t]) => t(it.top))[0] === g)]);
    const subs = [];
    for (const [g, list] of groups) {
      if (!list.length) continue;
      const prims = joinByMaterial(list);
      const t0 = tris(prims);
      prims.forEach((p) => simplifyAbsolute(p, BOARD_ERROR, g === 'Components'));
      console.log(`  ${name} / ${g}: ${list.length} primitives, ${t0} -> ${tris(prims)} triangles`);
      subs.push([g, prims]);
    }
    const all = subs.flatMap(([, p]) => p);
    const { c } = box(all);
    const t = part.getTranslation();
    part.setTranslation([t[0] + c[0], t[1] + c[1], t[2] + c[2]]);
    for (const [g, prims] of subs) {
      prims.forEach((p) => transformPrimitive(p, translation(c.map((v) => -v))));
      const sub = doc.createNode(g);
      part.addChild(sub);
      attach(sub, prims);
    }
  } else {
    if (items.some((it) => it.top !== '')) throw new Error(`${name} has child nodes; only the board is expected to`);
    attach(part, joinByMaterial(items));
  }
  // drop the old subtree (prune removes the old meshes). Only now: the steps above read world matrices through it.
  oldKids.forEach((k) => part.removeChild(k));
  const old = [];
  oldKids.forEach((k) => k.traverse((n) => old.push(n)));
  old.forEach((n) => n.dispose());
  report.push([name, before, meshTris(part)]);
}
await doc.transform(prune());

// --- 3. scene origin at the centre of the shell's box -------------------------------------------------
const worldBox = (node) => {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  node.traverse((n) => {
    if (!n.getMesh()) return;
    const m = n.getWorldMatrix(), v = [0, 0, 0];
    for (const p of n.getMesh().listPrimitives()) {
      const a = p.getAttribute('POSITION');
      for (let i = 0; i < a.getCount(); i++) {
        a.getElement(i, v);
        for (let k = 0; k < 3; k++) {
          const w = m[k] * v[0] + m[4 + k] * v[1] + m[8 + k] * v[2] + m[12 + k];
          lo[k] = Math.min(lo[k], w); hi[k] = Math.max(hi[k], w);
        }
      }
    }
  });
  return { lo, hi, c: lo.map((l, k) => (l + hi[k]) / 2) };
};
const shell = parts.find((p) => p.getName() === 'Shell');
if (!shell) throw new Error('no Shell node');
const origin = worldBox(shell).c;
for (const p of parts) {
  const t = p.getTranslation();
  p.setTranslation([t[0] - origin[0], t[1] - origin[1], t[2] - origin[2]]);
}

// --- 4. UVs on the OLED panel: the viewing window of the top face is (0,0)..(1,1) -----------------------
// CAD to GLB (OCCT): x = x, y = height, z = geometry z - IN_D (geometry z grows towards the front). Metres.
const [wx0, wz0, ww, wd] = G.WINDOW;
const win = {   // in the scene frame, metres
  x0: wx0 / 1000 - origin[0], x1: (wx0 + ww) / 1000 - origin[0],
  zBack: (wz0 - G.IN_D) / 1000 - origin[2], zFront: (wz0 + wd - G.IN_D) / 1000 - origin[2],
};
const screen = parts.find((p) => p.getName() === SCREEN);
if (!screen) throw new Error(`no ${SCREEN} node`);
{
  const geo = screen.listChildren()[0];
  const m = geo.getWorldMatrix();
  for (const p of geo.getMesh().listPrimitives()) {
    const a = p.getAttribute('POSITION'), n = a.getCount(), uv = new Float32Array(n * 2), v = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      a.getElement(i, v);
      const x = m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12], z = m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14];
      // glTF puts v = 0 on the top row of a picture (three.js reads glTF textures with flipY = false).
      // The top of the screen picture is the back edge, away from the player.
      uv[i * 2] = (x - win.x0) / (win.x1 - win.x0);
      uv[i * 2 + 1] = (z - win.zBack) / (win.zFront - win.zBack);
    }
    p.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(uv).setBuffer(root.listBuffers()[0]));
  }
}

// --- 5. names ------------------------------------------------------------------------------------------
scene.setName('scene');   // not 'case': three.js would rename the root node to case_1
wrap.setName('case');
root.listMaterials().forEach((m, i) => m.setName(`mat_${i}`));
root.listMeshes().forEach((m) => m.setName(''));
root.getAsset().generator = 'glTF-Transform (four-site tools/optimise_model.mjs)';
const stray = [];
for (const prop of [...root.listNodes(), ...root.listMeshes(), ...root.listMaterials(), ...root.listScenes(), ...root.listAccessors(), ...root.listBuffers(), ...root.listTextures()]) {
  if (nameRe && (nameRe.test(prop.getName()) || nameRe.test(JSON.stringify(prop.getExtras())))) stray.push(prop.getName());
}
if (stray.length) throw new Error('names that still name the device: ' + stray.join(', '));

// --- 7. parts.json (before quantization: positions are still exact floats) ------------------------------
const mm = (a) => a.map((v) => Math.round(v * 1e5) / 100);   // metres to mm, 0.01 mm
const sanitize = (s) => s.replace(/\s/g, '_').replace(/[\[\].:\/]/g, '');   // three.js PropertyBinding.sanitizeNodeName
const entry = (n) => {
  const b = worldBox(n);
  const e = { name: n.getName() };
  if (sanitize(n.getName()) !== n.getName()) e.three_name = sanitize(n.getName());
  Object.assign(e, { triangles: meshTris(n), min: mm(b.lo), max: mm(b.hi), size: mm(b.hi.map((h, k) => h - b.lo[k])), center: mm(b.c) });
  return e;
};
const partsJson = {
  units: 'mm',
  frame: 'GLB scene frame (three.js world before any transform): +X to the right, +Y up out of the top face, +Z towards the front edge (the player). Origin at the centre of the Shell bounding box.',
  cad_origin_in_scene: mm(origin.map((v) => -v)),
  note: 'Each part node sits at its own box centre (center), with no rotation and scale 1; its mesh hangs in an unnamed child that holds the dequantization matrix. In three.js the named node is an Object3D: set materials on its mesh children.',
  screen: {
    node: SCREEN,
    face: '+Y',
    face_y: mm([worldBox(screen).hi[1]])[0],
    viewing_window: { min: mm([win.x0, worldBox(screen).hi[1], win.zBack]), max: mm([win.x1, worldBox(screen).hi[1], win.zFront]), size: mm([win.x1 - win.x0, win.zFront - win.zBack]) },
    uv: 'TEXCOORD_0: u 0 to 1 from the left edge to the right edge of the viewing window, v 0 at the back edge (top of the picture) to 1 at the front edge, as glTF expects; a three.js texture with flipY = false shows the picture upright. Outside the window (under the top face) the UVs run past 0..1.',
  },
  parts: parts.map((p) => {
    const e = entry(p);
    e.group = (GROUP.find(([, re]) => re.test(p.getName())) || ['other'])[0];
    const named = p.listChildren().filter((k) => k.getName());
    if (named.length) e.children = named.map(entry);
    return e;
  }),
};

if (DEBUG) {   // the same model without quantization or compression, for a quick render in Blender
  await io.write(DEBUG, doc);
}

// --- 6. quantize and compress -------------------------------------------------------------------------
await doc.transform(
  reorder({ encoder: MeshoptEncoder, target: 'size' }),
  quantize({ quantizePosition: POSITION_BITS, quantizeNormal: NORMAL_BITS, quantizeTexcoord: 12, quantizationVolume: 'mesh' }),
  dedup(),
  prune({ keepAttributes: true }),   // keep the OLED UVs: no texture uses them in the file
);
// quantize must not have moved any named node
for (const p of root.listNodes()) {
  if (p.getName() && !plainTRS(p)) throw new Error(`quantize changed the transform of ${p.getName()}`);
}
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
await io.write(OUT, doc);

// --- report ---------------------------------------------------------------------------------------------
const outTris = meshTris(wrap);
fs.writeFileSync(PARTS, JSON.stringify(partsJson, null, 1) + '\n');
console.log(`out: ${OUT} ${(fs.statSync(OUT).size / 1024).toFixed(0)} KiB, ${outTris} triangles (in ${inTris}), ${root.listMeshes().length} meshes, ${root.listMaterials().length} materials`);
for (const [n, a, b] of report) if (a !== b) console.log(`  ${n}: ${a} -> ${b} triangles`);
