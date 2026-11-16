// Loads public/model/case.glb the way the site does (three.js GLTFLoader with MeshoptDecoder) and
// checks it against public/model/parts.json. Exits non-zero on any failure.
//   node tools/check_model.mjs public/model/case.glb public/model/parts.json
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const [glbPath, partsPath] = process.argv.slice(2);
const buf = fs.readFileSync(glbPath);
const parts = JSON.parse(fs.readFileSync(partsPath, 'utf8'));
const fail = [];

// 1. Nothing in the JSON chunk may name the device.
const json = buf.subarray(20, 20 + buf.readUInt32LE(12)).toString();
// DEVICE_NAME_RE (set by the private build script) holds the words the GLB must not contain
const nameRe = process.env.DEVICE_NAME_RE ? new RegExp(process.env.DEVICE_NAME_RE, 'i') : null;
if (nameRe && nameRe.test(json)) fail.push('the GLB JSON names the device');

// 2. Every part is a direct child of the root, with the box parts.json gives (0.02 mm), its pivot at
//    the box centre, no rotation, scale 1, and the same triangle count.
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const gltf = await new Promise((res, rej) => loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '', res, rej));
const scene = gltf.scene;
scene.updateMatrixWorld(true);
const root = scene.children[0];
if (scene.children.length !== 1 || root.name !== 'case') fail.push(`expected one root node "case", found ${scene.children.map((c) => c.name)}`);
if (root.children.length !== parts.parts.length) fail.push(`root has ${root.children.length} children, parts.json lists ${parts.parts.length}`);
let worst = 0, triangles = 0;
for (const p of parts.parts) {
  const name = p.three_name || p.name;
  const o = root.getObjectByName(name);
  if (!o || o.parent !== root) { fail.push(`missing top-level node ${name}`); continue; }
  const b = new THREE.Box3().setFromObject(o, true);
  ['x', 'y', 'z'].forEach((k, i) => { worst = Math.max(worst, Math.abs(b.min[k] * 1000 - p.min[i]), Math.abs(b.max[k] * 1000 - p.max[i])); });
  const c = new THREE.Vector3();
  o.getWorldPosition(c);
  if (['x', 'y', 'z'].some((k, i) => Math.abs(c[k] * 1000 - p.center[i]) > 0.02)) fail.push(`${name}: pivot is not at the box centre`);
  if (!o.scale.equals(new THREE.Vector3(1, 1, 1)) || o.quaternion.w !== 1) fail.push(`${name}: rotation or scale on the named node`);
  let t = 0;
  o.traverse((m) => { if (m.isMesh) t += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3; });
  if (t !== p.triangles) fail.push(`${name}: ${t} triangles, parts.json says ${p.triangles}`);
  triangles += t;
}
if (worst > 0.02) fail.push(`a box differs from parts.json by ${worst.toFixed(3)} mm`);

// 3. OLED_panel's top face: UV (0,0) at the back left corner of the viewing window, (1,1) at the front right.
const oled = root.getObjectByName(parts.screen.node);
const vw = parts.screen.viewing_window;
let checked = 0;
oled?.traverse((m) => {
  if (!m.isMesh) return;
  const pos = m.geometry.attributes.position, uv = m.geometry.attributes.uv, nrm = m.geometry.attributes.normal;
  if (!uv) { fail.push('OLED_panel has no UVs'); return; }
  const v = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    n.fromBufferAttribute(nrm, i).transformDirection(m.matrixWorld);
    if (n.y < 0.99) continue;
    v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
    const u0 = (v.x * 1000 - vw.min[0]) / vw.size[0], v0 = (v.z * 1000 - vw.min[2]) / vw.size[1];
    if (Math.abs(uv.getX(i) - u0) > 0.002 || Math.abs(uv.getY(i) - v0) > 0.002) fail.push(`OLED UV at ${v.x}, ${v.z} is ${uv.getX(i)}, ${uv.getY(i)}, expected ${u0}, ${v0}`);
    checked++;
  }
});
if (!checked) fail.push('found no top face on OLED_panel');

console.log(`three.js: ${root.children.length} parts, ${triangles} triangles, boxes within ${worst.toFixed(4)} mm, ${checked} OLED top-face vertices checked`);
if (fail.length) { console.error(fail.join('\n')); process.exit(1); }
console.log('model check passed');
