import * as THREE from '../vendor/three.module.min.js';

// ───────────────────────── Utilidades ─────────────────────────
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const SAVE_KEY = 'ultimo-fuego-save-v1';
const SEED = 1337;

function hash(ix, iz) {
  let h = Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + SEED;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  let fx = x - ix, fz = z - iz;
  fx = fx * fx * (3 - 2 * fx); fz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}
function fbm(x, z) {
  let v = 0, amp = 0.5, f = 1;
  for (let i = 0; i < 4; i++) { v += vnoise(x * f, z * f) * amp; amp *= 0.5; f *= 2; }
  return v / 0.9375;
}
let rngState = SEED;
function rng() { // determinista, para generar el mundo
  rngState = (Math.imul(rngState, 1664525) + 1013904223) >>> 0;
  return rngState / 4294967296;
}

// ───────────────────────── Terreno ─────────────────────────
const WORLD_R = 280, WATER_FLOOR = -1.2;
function terrainH(x, z) {
  const d = Math.hypot(x, z) / WORLD_R;
  const mask = smooth(1, 0.5, d);
  const n = fbm(x * 0.008 + 50, z * 0.008 + 50);
  return (n * n * 62 + 1.5) * mask - 3;
}

// ───────────────────────── Datos del juego ─────────────────────────
const ITEMS = {
  wood: 'Madera', stone: 'Piedra', fiber: 'Fibra', berries: 'Bayas', meat: 'Carne cruda',
  cooked: 'Carne asada', hide: 'Piel', bone: 'Hueso', ore: 'Mineral de hierro',
  ingot: 'Lingote de hierro', essence: 'Esencia', bandage: 'Venda',
};
const STATION_NAMES = { campfire: 'hoguera', workbench: 'banco de trabajo', furnace: 'horno' };

const RECIPES = [
  { name: 'Hacha de piedra', cost: { wood: 3, stone: 3, fiber: 2 }, can: () => T.axe < 1, make: () => { T.axe = 1; } },
  { name: 'Pico de piedra', cost: { wood: 3, stone: 3, fiber: 2 }, can: () => T.pick < 1, make: () => { T.pick = 1; } },
  { name: 'Lanza', cost: { wood: 5, stone: 2, fiber: 3 }, can: () => T.weapon < 1, make: () => { T.weapon = 1; } },
  { name: 'Antorcha', cost: { wood: 2, fiber: 2 }, can: () => !T.torch, make: () => { T.torch = true; } },
  { name: 'Venda', cost: { fiber: 5 }, give: { bandage: 1 } },
  { name: 'Carne asada', cost: { meat: 1 }, station: 'campfire', give: { cooked: 1 } },
  { name: 'Lingote de hierro', cost: { ore: 2, wood: 1 }, station: 'furnace', give: { ingot: 1 } },
  { name: 'Armadura de piel (-30% daño)', cost: { hide: 6, fiber: 8 }, station: 'workbench', can: () => T.armor < 1, make: () => { T.armor = 1; } },
  { name: 'Hacha de hierro', cost: { ingot: 3, wood: 3 }, station: 'workbench', can: () => T.axe < 2, make: () => { T.axe = 2; } },
  { name: 'Pico de hierro', cost: { ingot: 3, wood: 3 }, station: 'workbench', can: () => T.pick < 2, make: () => { T.pick = 2; } },
  { name: 'Espada de hierro', cost: { ingot: 5, wood: 2, hide: 1 }, station: 'workbench', can: () => T.weapon < 2, make: () => { T.weapon = 2; } },
  { name: 'Armadura de hierro (-55% daño)', cost: { ingot: 10, hide: 4 }, station: 'workbench', can: () => T.armor < 2, make: () => { T.armor = 2; } },
];

const PIECES = [
  { id: 'foundation', name: 'Cimiento', cost: { stone: 6 } },
  { id: 'wall', name: 'Pared', cost: { wood: 6 } },
  { id: 'doorway', name: 'Pared con puerta', cost: { wood: 5 } },
  { id: 'roof', name: 'Techo', cost: { wood: 4, fiber: 2 } },
  { id: 'campfire', name: 'Hoguera', cost: { stone: 5, wood: 5 } },
  { id: 'bed', name: 'Cama (punto de reaparición)', cost: { wood: 8, fiber: 12, hide: 2 } },
  { id: 'workbench', name: 'Banco de trabajo', cost: { wood: 15, stone: 5 } },
  { id: 'furnace', name: 'Horno', cost: { stone: 25 } },
  { id: 'beacon', name: 'Faro', cost: { ingot: 20, stone: 60, wood: 40, essence: 5 } },
];
const PIECE_BY_ID = Object.fromEntries(PIECES.map((p) => [p.id, p]));

const NODE_TYPES = {
  tree: { name: 'Árbol', hp: 12, r: 0.5, tool: 'axe', give: (p) => ({ wood: p }) },
  rock: { name: 'Roca', hp: 12, r: 1.0, tool: 'pick', give: (p) => ({ stone: p }) },
  bush: { name: 'Arbusto', hp: 3, r: 0, tool: null, give: () => ({ fiber: 2, berries: 1 }) },
  iron: { name: 'Veta de hierro', hp: 16, r: 1.0, tool: 'pick', needTool: true, give: (p) => ({ ore: Math.ceil(p / 2), stone: 1 }) },
};

const CREATURES = {
  deer: { name: 'Ciervo', hp: 30, speed: 7, dmg: 0, aggro: 14, xp: 15, color: 0xa9793f, drops: { meat: 2, hide: 1 } },
  jackal: { name: 'Chacal', hp: 40, speed: 5.2, dmg: 8, aggro: 16, xp: 25, color: 0x6b6258, drops: { meat: 1, hide: 1, bone: 1 } },
  specter: { name: 'Espectro', hp: 70, speed: 4.8, dmg: 14, aggro: 45, xp: 40, color: 0x241a3a, drops: { bone: 2, essence: 1 } },
};

const SLOTS = [
  { id: 'hands', name: 'Manos' }, { id: 'axe', name: 'Hacha' }, { id: 'pick', name: 'Pico' },
  { id: 'weapon', name: 'Arma' }, { id: 'torch', name: 'Antorcha' }, { id: 'hammer', name: 'Construir' },
];
const TIER_POWER = [1, 4, 8];

// ───────────────────────── Estado ─────────────────────────
let state = 'menu'; // menu | play | craft | pause | win
let inv = {}, T = {}, P = {}, world = {};
const pieces = [];
const creatures = [];
const keys = {};

function resetState() {
  inv = {};
  T = { axe: 0, pick: 0, weapon: 0, torch: false, armor: 0 };
  P = {
    x: 0, y: 0, z: 0, vy: 0, yaw: 0, pitch: 0, onGround: false,
    hp: 100, maxHp: 100, st: 100, maxSt: 100, hunger: 100, thirst: 100,
    xp: 0, level: 1, slot: 0, swing: 0, spawn: null, kills: 0,
  };
  world = { time: 0.3, day: 1, played: 0, won: false, buildIdx: 0 };
}

// ───────────────────────── Escena ─────────────────────────
const renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ec5e8);
scene.fog = new THREE.Fog(0x8ec5e8, 60, 330);
const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 700);
camera.rotation.order = 'YXZ';
scene.add(camera);

const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x4a4030, 1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d0, 2);
scene.add(sun);
const torchLight = new THREE.PointLight(0xffa64a, 0, 26, 1.4);
torchLight.position.set(0.3, -0.1, -0.4);
camera.add(torchLight);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// Terreno
{
  const size = 640, seg = 200;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color(), sand = new THREE.Color(0xd9c58a), grass = new THREE.Color(0x5d8a3a),
    dark = new THREE.Color(0x3f6a2c), rock = new THREE.Color(0x77706a), sea = new THREE.Color(0x6a6048);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = terrainH(x, z);
    pos.setY(i, h);
    if (h < 0) c.copy(sea); else if (h < 1.2) c.copy(sand);
    else if (h < 14) c.copy(grass).lerp(dark, vnoise(x * 0.05, z * 0.05));
    else c.copy(dark).lerp(rock, smooth(14, 22, h));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  scene.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true })));
  const water = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000),
    new THREE.MeshLambertMaterial({ color: 0x2f7fa8, transparent: true, opacity: 0.78 }));
  water.rotation.x = -Math.PI / 2;
  scene.add(water);
}

// ───────────────────────── Recursos (instanciados) ─────────────────────────
const nodes = [];
const nodeGrid = new Map();
const CELL = 8;
const gridKey = (cx, cz) => cx * 4096 + cz;
const dummy = new THREE.Object3D();

function genNodes(type, count, minH, maxH, sMin, sMax) {
  let made = 0, tries = 0;
  while (made < count && tries++ < count * 40) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * WORLD_R * 0.9;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, h = terrainH(x, z);
    if (h < minH || h > maxH) continue;
    const n = { type, x, z, y: h - 0.1, s: sMin + rng() * (sMax - sMin), rot: rng() * 6.28, hp: NODE_TYPES[type].hp, alive: true, respawn: 0, idx: made++ };
    nodes.push(n);
    const k = gridKey(Math.floor(x / CELL), Math.floor(z / CELL));
    if (!nodeGrid.has(k)) nodeGrid.set(k, []);
    nodeGrid.get(k).push(n);
  }
  return made;
}
const nodeCounts = {
  tree: genNodes('tree', 900, 1.5, 20, 0.8, 1.5),
  rock: genNodes('rock', 380, 0.6, 40, 0.7, 1.4),
  bush: genNodes('bush', 320, 1.2, 16, 0.8, 1.3),
  iron: genNodes('iron', 130, 12, 60, 0.9, 1.3),
};
function inst(geo, color, count, flat) {
  const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color, flatShading: !!flat }), count);
  m.frustumCulled = false;
  scene.add(m);
  return m;
}
const nodeMeshes = {
  tree: [
    inst(new THREE.CylinderGeometry(0.22, 0.38, 4, 6).translate(0, 2, 0), 0x6b4a2b, nodeCounts.tree),
    inst(new THREE.ConeGeometry(2.1, 5.5, 7).translate(0, 6, 0), 0x2f6b34, nodeCounts.tree, true),
  ],
  rock: [inst(new THREE.DodecahedronGeometry(1).translate(0, 0.45, 0), 0x8a8782, nodeCounts.rock, true)],
  bush: [inst(new THREE.IcosahedronGeometry(0.8).translate(0, 0.5, 0), 0x4d8f3a, nodeCounts.bush, true)],
  iron: [inst(new THREE.DodecahedronGeometry(1).translate(0, 0.45, 0), 0xa5582e, nodeCounts.iron, true)],
};
function showNode(n, vis) {
  const s = vis ? n.s : 0;
  dummy.position.set(n.x, n.y, n.z); dummy.rotation.set(0, n.rot, 0); dummy.scale.set(s, s, s);
  dummy.updateMatrix();
  for (const m of nodeMeshes[n.type]) { m.setMatrixAt(n.idx, dummy.matrix); m.instanceMatrix.needsUpdate = true; }
}
nodes.forEach((n) => showNode(n, true));

function forNodesNear(x, z, rad, fn) {
  const x0 = Math.floor((x - rad) / CELL), x1 = Math.floor((x + rad) / CELL);
  const z0 = Math.floor((z - rad) / CELL), z1 = Math.floor((z + rad) / CELL);
  for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
    const list = nodeGrid.get(gridKey(cx, cz));
    if (list) for (const n of list) if (n.alive) fn(n);
  }
}

// ───────────────────────── Construcción ─────────────────────────
const GRID = 3;
const M = {
  stone: new THREE.MeshLambertMaterial({ color: 0x8d8a84 }),
  wood: new THREE.MeshLambertMaterial({ color: 0x8a6238 }),
  thatch: new THREE.MeshLambertMaterial({ color: 0xb59a52 }),
  fire: new THREE.MeshBasicMaterial({ color: 0xffa030 }),
  cloth: new THREE.MeshLambertMaterial({ color: 0xb7b0a0 }),
  glow: new THREE.MeshBasicMaterial({ color: 0xfff1b0 }),
};
const box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; };

function pieceMesh(type) {
  const g = new THREE.Group();
  if (type === 'foundation') g.add(box(3, 3, 3, M.stone, 0, -1.5, 0));
  else if (type === 'wall') g.add(box(3, 3, 0.25, M.wood, 0, 1.5, 0));
  else if (type === 'doorway') g.add(box(0.9, 3, 0.25, M.wood, -1.05, 1.5, 0), box(0.9, 3, 0.25, M.wood, 1.05, 1.5, 0), box(1.2, 0.8, 0.25, M.wood, 0, 2.6, 0));
  else if (type === 'roof') g.add(box(3.1, 0.25, 3.1, M.thatch, 0, 0.125, 0));
  else if (type === 'campfire') {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.25, 8), M.stone); ring.position.y = 0.12;
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1, 6), M.fire); fl.position.y = 0.7;
    const l = new THREE.PointLight(0xff8a30, 30, 22, 1.5); l.position.y = 1.2;
    g.add(ring, fl, l);
  } else if (type === 'bed') g.add(box(1.2, 0.3, 2.2, M.wood, 0, 0.15, 0), box(1.1, 0.15, 2.1, M.cloth, 0, 0.37, 0));
  else if (type === 'workbench') g.add(box(1.8, 0.15, 0.9, M.wood, 0, 0.9, 0), box(1.6, 0.85, 0.7, M.wood, 0, 0.42, 0));
  else if (type === 'furnace') g.add(box(1.3, 1.6, 1.3, M.stone, 0, 0.8, 0), box(0.5, 0.4, 0.1, M.fire, 0, 0.5, 0.66));
  else if (type === 'beacon') {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.2, 9, 8), M.stone); tower.position.y = 4.5;
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), M.glow); lamp.position.y = 9.8;
    const l = new THREE.PointLight(0xfff0b0, 400, 150, 1.6); l.position.y = 10;
    g.add(tower, lamp, l);
  }
  return g;
}

// Cajas de colisión [minx, maxx, minz, maxz, y0, y1]
function pieceBoxes(p) {
  const { x, y, z } = p, t = 0.15;
  const seg = (a, b) => p.rot ? [x - t, x + t, z + a, z + b, y, y + 3] : [x + a, x + b, z - t, z + t, y, y + 3];
  switch (p.type) {
    case 'foundation': return [[x - 1.5, x + 1.5, z - 1.5, z + 1.5, y - 3, y]];
    case 'wall': return [seg(-1.5, 1.5)];
    case 'doorway': return [seg(-1.5, -0.6), seg(0.6, 1.5)];
    case 'workbench': case 'furnace': return [[x - 0.7, x + 0.7, z - 0.6, z + 0.6, y, y + 1.2]];
    case 'beacon': return [[x - 1, x + 1, z - 1, z + 1, y, y + 9]];
    default: return [];
  }
}
function pieceFloor(p) { // superficie pisable
  if (p.type === 'foundation') return p.y;
  if (p.type === 'roof') return p.y + 0.25;
  return null;
}

function addPiece(rec) {
  const p = { ...rec };
  p.mesh = pieceMesh(p.type);
  p.mesh.position.set(p.x, p.y, p.z);
  p.mesh.rotation.y = p.rot ? Math.PI / 2 : 0;
  p.boxes = pieceBoxes(p);
  p.floor = pieceFloor(p);
  scene.add(p.mesh);
  pieces.push(p);
  return p;
}
function removePiece(p) {
  scene.remove(p.mesh);
  pieces.splice(pieces.indexOf(p), 1);
  if (P.spawn && p.type === 'bed' && Math.hypot(P.spawn.x - p.x, P.spawn.z - p.z) < 0.1) P.spawn = null;
}
const hasPiece = (type) => pieces.some((p) => p.type === type);
const stationNear = (type) => pieces.some((p) => p.type === type && Math.hypot(p.x - P.x, p.z - P.z) < 6);

function groundAt(x, z, py) {
  let g = Math.max(terrainH(x, z), WATER_FLOOR);
  for (const p of pieces) {
    if (p.floor === null) continue;
    if (Math.abs(x - p.x) <= 1.5 && Math.abs(z - p.z) <= 1.5 && py >= p.floor - 0.7 && p.floor > g) g = p.floor;
  }
  return g;
}
function resolveBox(o, r, b) {
  const cx = clamp(o.x, b[0], b[1]), cz = clamp(o.z, b[2], b[3]);
  const dx = o.x - cx, dz = o.z - cz, d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return;
  if (d2 > 1e-8) { const d = Math.sqrt(d2); o.x = cx + dx / d * r; o.z = cz + dz / d * r; return; }
  const l = o.x - b[0], rr = b[1] - o.x, t = o.z - b[2], bt = b[3] - o.z, m = Math.min(l, rr, t, bt);
  if (m === l) o.x = b[0] - r; else if (m === rr) o.x = b[1] + r; else if (m === t) o.z = b[2] - r; else o.z = b[3] + r;
}
function collide(o, r, withNodes) {
  for (const p of pieces) for (const b of p.boxes) {
    if (o.y < b[5] - 0.7 && o.y + 1.7 > b[4]) resolveBox(o, r, b);
  }
  if (withNodes) forNodesNear(o.x, o.z, 3, (n) => {
    const nr = NODE_TYPES[n.type].r * n.s;
    if (!nr) return;
    const dx = o.x - n.x, dz = o.z - n.z, d = Math.hypot(dx, dz), min = nr + r;
    if (d < min && d > 1e-4) { o.x = n.x + dx / d * min; o.z = n.z + dz / d * min; }
  });
}

// ───────────────────────── Inventario ─────────────────────────
const count = (id) => inv[id] || 0;
const canAfford = (cost) => Object.entries(cost).every(([k, v]) => count(k) >= v);
function pay(cost) { for (const [k, v] of Object.entries(cost)) inv[k] = count(k) - v; }
function give(items, silent) {
  for (const [k, v] of Object.entries(items)) {
    if (!v) continue;
    inv[k] = count(k) + v;
    if (!silent) toast(`+${v} ${ITEMS[k]}`);
  }
}
const costText = (cost) => Object.entries(cost).map(([k, v]) => `${v} ${ITEMS[k]} (${count(k)})`).join(' · ');

function addXp(n) {
  P.xp += n;
  while (P.xp >= P.level * 60) {
    P.xp -= P.level * 60; P.level++;
    P.maxHp += 10; P.maxSt += 5; P.hp = P.maxHp;
    toast(`¡Nivel ${P.level}! Vida y energía máximas aumentadas`);
    beep(660, 0.25, 'triangle');
  }
}

// ───────────────────────── Audio ─────────────────────────
let actx = null;
function beep(freq, dur = 0.08, type = 'square', vol = 0.06) {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.connect(g).connect(actx.destination);
    o.start(); o.stop(actx.currentTime + dur);
  } catch { /* sin audio */ }
}

// ───────────────────────── HUD ─────────────────────────
function toast(text) {
  const d = document.createElement('div');
  d.textContent = text;
  $('log').prepend(d);
  while ($('log').children.length > 7) $('log').lastChild.remove();
  setTimeout(() => d.remove(), 3500);
}
function slotAvailable(i) {
  const id = SLOTS[i].id;
  if (id === 'axe') return T.axe > 0;
  if (id === 'pick') return T.pick > 0;
  if (id === 'weapon') return T.weapon > 0;
  if (id === 'torch') return T.torch;
  return true;
}
function slotName(i) {
  const id = SLOTS[i].id;
  if (id === 'axe') return ['Hacha', 'Hacha piedra', 'Hacha hierro'][T.axe];
  if (id === 'pick') return ['Pico', 'Pico piedra', 'Pico hierro'][T.pick];
  if (id === 'weapon') return ['Arma', 'Lanza', 'Espada'][T.weapon];
  return SLOTS[i].name;
}
function drawHotbar() {
  $('hotbar').innerHTML = SLOTS.map((s, i) =>
    `<div class="slot${i === P.slot ? ' sel' : ''}${slotAvailable(i) ? '' : ' off'}"><b>${i + 1}</b>${slotName(i)}</div>`).join('');
  updateViewModel();
}
function objective() {
  if (!T.axe || !T.pick) return 'Recoge madera, piedra y fibra con clic y fabrica hacha y pico [TAB]';
  if (!hasPiece('campfire')) return 'Construye una hoguera [6] y asa carne para comer';
  if (!hasPiece('bed')) return 'Levanta un refugio con paredes y coloca una cama';
  if (!hasPiece('workbench')) return 'Construye un banco de trabajo';
  if (!hasPiece('furnace')) return 'Construye un horno';
  if (T.pick < 2) return 'Extrae hierro en las montañas, fúndelo y forja herramientas';
  if (!world.won) return `Caza espectros de noche (esencia ${count('essence')}/5) y construye el Faro`;
  return 'El faro está encendido. Sobrevive cuanto quieras.';
}
let hudTimer = 0, promptText = '';
function drawHud() {
  $('b-hp').style.width = (P.hp / P.maxHp * 100) + '%';
  $('b-st').style.width = (P.st / P.maxSt * 100) + '%';
  $('b-hu').style.width = P.hunger + '%';
  $('b-th').style.width = P.thirst + '%';
  $('lvl').textContent = `Nivel ${P.level} · XP ${P.xp}/${P.level * 60}`;
  const hh = Math.floor(world.time * 24), mm = Math.floor((world.time * 24 % 1) * 60);
  $('clock').textContent = `Día ${world.day} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  $('objective').textContent = objective();
  $('prompt').textContent = promptText;
  if (SLOTS[P.slot].id === 'hammer') {
    const pc = PIECES[world.buildIdx];
    $('buildinfo').textContent = `${pc.name} — ${costText(pc.cost)}  ·  Rueda/R: cambiar · Clic: colocar · X: demoler`;
  } else $('buildinfo').textContent = '';
}

function drawCraft() {
  const entries = Object.entries(inv).filter(([, v]) => v > 0);
  $('inv').innerHTML = entries.length ? entries.map(([k, v]) => `<div>${ITEMS[k]} × ${v}</div>`).join('') : '<div class="dim">Vacío</div>';
  const wrap = $('recipes');
  wrap.innerHTML = '';
  RECIPES.forEach((r) => {
    if (r.can && !r.can()) return;
    const b = document.createElement('button');
    const okStation = !r.station || stationNear(r.station);
    b.disabled = !canAfford(r.cost) || !okStation;
    b.innerHTML = `${r.name}<small>${costText(r.cost)}${r.station ? ` · requiere ${STATION_NAMES[r.station]} cerca` : ''}</small>`;
    b.onclick = () => {
      pay(r.cost);
      if (r.give) give(r.give, true);
      if (r.make) r.make();
      addXp(5); beep(520, 0.1, 'triangle');
      drawCraft(); drawHotbar();
    };
    wrap.appendChild(b);
  });
}

// ───────────────────────── Modelo en mano ─────────────────────────
const viewModel = new THREE.Group();
viewModel.position.set(0.35, -0.32, -0.6);
camera.add(viewModel);
function updateViewModel() {
  viewModel.clear();
  const id = SLOTS[P.slot].id;
  const handle = (len) => box(0.05, len, 0.05, M.wood, 0, len / 2 - 0.2, 0);
  const metal = (tier) => new THREE.MeshLambertMaterial({ color: tier > 1 ? 0xc9ced6 : 0x8d8a84 });
  if (id === 'axe') viewModel.add(handle(0.7), box(0.3, 0.2, 0.06, metal(T.axe), 0.12, 0.42, 0));
  else if (id === 'pick') viewModel.add(handle(0.7), box(0.5, 0.08, 0.08, metal(T.pick), 0, 0.46, 0));
  else if (id === 'weapon') {
    if (T.weapon > 1) viewModel.add(handle(0.25), box(0.07, 0.8, 0.03, metal(2), 0, 0.42, 0));
    else viewModel.add(handle(1.2), box(0.08, 0.2, 0.08, metal(1), 0, 1.05, 0));
  } else if (id === 'torch') viewModel.add(handle(0.5), box(0.1, 0.14, 0.1, M.fire, 0, 0.36, 0));
  else if (id === 'hammer') viewModel.add(handle(0.5), box(0.26, 0.14, 0.14, M.stone, 0, 0.3, 0));
}

// ───────────────────────── Criaturas ─────────────────────────
function creatureMesh(type) {
  const c = CREATURES[type], g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: c.color });
  g.userData.legs = [];
  if (type === 'specter') {
    mat.emissive = new THREE.Color(0x2a1560);
    g.add(box(0.7, 1.9, 0.45, mat, 0, 1.05, 0), box(0.5, 0.5, 0.5, mat, 0, 2.3, 0));
    const eye = new THREE.MeshBasicMaterial({ color: 0xb8f0ff });
    g.add(box(0.1, 0.08, 0.05, eye, -0.12, 2.35, 0.26), box(0.1, 0.08, 0.05, eye, 0.12, 2.35, 0.26));
  } else {
    const leg = type === 'deer' ? 0.85 : 0.5;
    g.add(box(0.5, 0.5, 1.2, mat, 0, leg + 0.25, 0), box(0.32, 0.34, 0.45, mat, 0, leg + 0.6, 0.75));
    for (const [lx, lz] of [[-0.18, 0.45], [0.18, 0.45], [-0.18, -0.45], [0.18, -0.45]]) {
      const l = box(0.12, leg, 0.12, mat, lx, leg / 2, lz);
      g.add(l); g.userData.legs.push(l);
    }
  }
  return g;
}
function spawnCreature(type, x, z) {
  const c = CREATURES[type];
  const e = { type, x, z, y: terrainH(x, z), hp: c.hp, dir: Math.random() * 6.28, t: 0, cd: 0, flash: 0, mesh: creatureMesh(type) };
  scene.add(e.mesh);
  creatures.push(e);
  return e;
}
function removeCreature(e) {
  scene.remove(e.mesh);
  const i = creatures.indexOf(e);
  if (i >= 0) creatures.splice(i, 1);
}
const isNight = () => world.time < 0.23 || world.time > 0.77;

let spawnTimer = 0;
function updateCreatures(dt) {
  spawnTimer -= dt;
  if (spawnTimer <= 0 && creatures.length < 14) {
    spawnTimer = 2;
    const a = Math.random() * 6.28, d = 45 + Math.random() * 40;
    const x = P.x + Math.cos(a) * d, z = P.z + Math.sin(a) * d, h = terrainH(x, z);
    if (h > 0.8 && h < 34) {
      const r = Math.random();
      let type;
      if (isNight()) type = r < 0.5 ? 'specter' : r < 0.85 ? 'jackal' : 'deer';
      else type = (r < 0.55 || world.played < 90) ? 'deer' : 'jackal';
      spawnCreature(type, x, z);
    }
  }
  for (let i = creatures.length - 1; i >= 0; i--) {
    const e = creatures[i], c = CREATURES[e.type];
    const dx = P.x - e.x, dz = P.z - e.z, d = Math.hypot(dx, dz);
    if (d > 140 || (e.type === 'specter' && !isNight())) { removeCreature(e); continue; }
    e.t -= dt; e.cd -= dt;
    let speed = 0;
    if (d < c.aggro) {
      if (c.dmg) {
        e.dir = Math.atan2(dx, dz);
        if (d > 1.7) speed = c.speed;
        else if (e.cd <= 0) { e.cd = 1.1; hurtPlayer(c.dmg, c.name); }
      } else { e.dir = Math.atan2(-dx, -dz); speed = c.speed; }
    } else {
      if (e.t <= 0) { e.t = 2 + Math.random() * 4; e.dir = Math.random() * 6.28; e.idle = Math.random() < 0.35; }
      speed = e.idle ? 0 : 1.4;
    }
    if (speed) {
      const ox = e.x, oz = e.z;
      e.x += Math.sin(e.dir) * speed * dt; e.z += Math.cos(e.dir) * speed * dt;
      collide(e, 0.5, false);
      if (terrainH(e.x, e.z) < -0.5) { e.x = ox; e.z = oz; e.t = 0; }
    }
    e.y = groundAt(e.x, e.z, e.y + 0.5);
    e.mesh.position.set(e.x, e.y, e.z);
    e.mesh.rotation.y = e.dir;
    e.flash = Math.max(0, e.flash - dt);
    const s = 1 + e.flash * 1.5;
    e.mesh.scale.set(s, s, s);
    const sw = speed ? Math.sin(performance.now() * 0.012 * (speed > 3 ? 1.6 : 1)) * 0.6 : 0;
    e.mesh.userData.legs.forEach((l, k) => { l.rotation.x = k % 3 === 0 ? sw : -sw; });
  }
}

// ───────────────────────── Jugador ─────────────────────────
function findSpawn() {
  for (let r = 0; r < WORLD_R; r += 4) for (let a = 0; a < 6.28; a += 0.3) {
    const x = Math.cos(a) * r, z = Math.sin(a) * r, h = terrainH(x, z);
    if (h > 1.5 && h < 5) return { x, z };
  }
  return { x: 0, z: 0 };
}
const START = findSpawn();

function hurtPlayer(dmg, source) {
  if (state !== 'play' && state !== 'craft') return;
  const red = [1, 0.7, 0.45][T.armor];
  P.hp -= dmg * red;
  $('hurt').style.opacity = 1;
  setTimeout(() => { $('hurt').style.opacity = 0; }, 150);
  beep(110, 0.15, 'sawtooth', 0.08);
  if (P.hp <= 0) die(source);
}
function die(source) {
  toast(`Has muerto (${source}). Pierdes parte de tus materiales.`);
  for (const k of Object.keys(inv)) inv[k] = Math.ceil(inv[k] * 0.7);
  const s = P.spawn || START;
  P.x = s.x; P.z = s.z; P.y = groundAt(s.x, s.z, 100) + 0.1; P.vy = 0;
  P.hp = P.maxHp * 0.6; P.hunger = Math.max(P.hunger, 50); P.thirst = Math.max(P.thirst, 50); P.st = P.maxSt;
  for (const e of [...creatures]) if (Math.hypot(e.x - P.x, e.z - P.z) < 30 && CREATURES[e.type].dmg) removeCreature(e);
}

const fwd = new THREE.Vector3(), tmp = new THREE.Vector3();
function updatePlayer(dt) {
  let mx = 0, mz = 0;
  if (keys.KeyW) mz += 1; if (keys.KeyS) mz -= 1; if (keys.KeyA) mx -= 1; if (keys.KeyD) mx += 1;
  const moving = mx || mz;
  const inWater = terrainH(P.x, P.z) < -0.7 && P.y < -0.5;
  const sprint = moving && (keys.ShiftLeft || keys.ShiftRight) && P.st > 1 && !inWater;
  let speed = sprint ? 8.2 : 5;
  if (inWater) speed *= 0.5;
  if (sprint) P.st = Math.max(0, P.st - 14 * dt); else P.st = Math.min(P.maxSt, P.st + (moving ? 9 : 16) * dt);
  if (moving) {
    const l = Math.hypot(mx, mz), s = Math.sin(P.yaw), c = Math.cos(P.yaw);
    mx /= l; mz /= l;
    P.x += (-s * mz + c * mx) * speed * dt;
    P.z += (-c * mz - s * mx) * speed * dt;
  }
  collide(P, 0.4, true);
  const r = Math.hypot(P.x, P.z);
  if (r > WORLD_R + 15) { P.x *= (WORLD_R + 15) / r; P.z *= (WORLD_R + 15) / r; }

  if (keys.Space && P.onGround && P.st > 8) { P.vy = 6.5; P.onGround = false; P.st -= 8; }
  P.vy -= 18 * dt;
  P.y += P.vy * dt;
  const g = groundAt(P.x, P.z, P.y);
  if (P.y <= g) { P.y = g; P.vy = 0; P.onGround = true; } else if (P.y > g + 0.05) P.onGround = false;

  // Necesidades
  P.hunger = Math.max(0, P.hunger - 0.16 * dt * (sprint ? 1.6 : 1));
  P.thirst = Math.max(0, P.thirst - 0.24 * dt * (sprint ? 1.6 : 1));
  if (P.hunger <= 0 || P.thirst <= 0) { P.hp -= 2 * dt; if (P.hp <= 0) die(P.hunger <= 0 ? 'hambre' : 'sed'); }
  else if (P.hunger > 40 && P.thirst > 40) P.hp = Math.min(P.maxHp, P.hp + 0.6 * dt);

  P.swing = Math.max(0, P.swing - dt);
  const sw = P.swing > 0 ? Math.sin((P.swing / 0.42) * Math.PI) : 0;
  viewModel.rotation.set(-sw * 1.3, 0, -0.25 - sw * 0.3);
  const bob = moving && P.onGround ? Math.sin(performance.now() * (sprint ? 0.016 : 0.011)) * 0.045 : 0;
  camera.position.set(P.x, P.y + 1.65 + bob, P.z);
  camera.rotation.set(P.pitch, P.yaw, 0);
  torchLight.intensity = SLOTS[P.slot].id === 'torch' ? 40 : 0;
}

// ───────────────────────── Apuntado e interacción ─────────────────────────
function aimTarget(reach) {
  camera.getWorldDirection(fwd);
  const ex = P.x, ey = P.y + 1.65, ez = P.z;
  let best = null, bestD = reach;
  for (const e of creatures) {
    tmp.set(e.x - ex, e.y + 0.9 - ey, e.z - ez);
    const d = tmp.length();
    if (d < bestD + 0.6 && tmp.normalize().dot(fwd) > 0.72) { best = { kind: 'creature', e }; bestD = d - 0.6; }
  }
  if (best) return best;
  bestD = Math.min(reach, 3.4);
  forNodesNear(ex, ez, 5, (n) => {
    const rad = Math.max(NODE_TYPES[n.type].r, 0.6) * n.s;
    tmp.set(n.x - ex, n.y + 1.2 - ey, n.z - ez);
    const d = Math.max(0, Math.hypot(tmp.x, tmp.z) - rad);
    tmp.y *= 0.3;
    if (d < bestD && tmp.normalize().dot(fwd) > 0.6) { best = { kind: 'node', n }; bestD = d; }
  });
  return best;
}
function aimPoint(max) { // punto del suelo al que se mira
  camera.getWorldDirection(fwd);
  const o = camera.position;
  for (let t = 0.6; t <= max; t += 0.2) {
    const x = o.x + fwd.x * t, y = o.y + fwd.y * t, z = o.z + fwd.z * t;
    if (y <= groundAt(x, z, y + 0.7)) return { x, y, z };
  }
  const x = o.x + fwd.x * max, z = o.z + fwd.z * max;
  return { x, z, y: groundAt(x, z, P.y) };
}

function attack() {
  if (P.swing > 0) return;
  P.swing = 0.42;
  const id = SLOTS[P.slot].id;
  const reach = id === 'weapon' && T.weapon === 1 ? 4 : 3.1;
  const t = aimTarget(reach);
  if (!t) { beep(180, 0.04, 'sine', 0.03); return; }
  if (t.kind === 'creature') {
    const e = t.e, c = CREATURES[e.type];
    const dmg = id === 'weapon' ? [0, 20, 38][T.weapon] : id === 'axe' ? [0, 10, 16][T.axe] : id === 'pick' ? [0, 8, 13][T.pick] : 5;
    e.hp -= dmg; e.flash = 0.12;
    e.x -= Math.sin(e.dir) * 0.5; e.z -= Math.cos(e.dir) * 0.5;
    beep(240, 0.07, 'square');
    if (e.hp <= 0) { give(c.drops); addXp(c.xp); P.kills++; removeCreature(e); }
    return;
  }
  const n = t.n, nt = NODE_TYPES[n.type];
  const tier = nt.tool && id === nt.tool ? T[nt.tool] : 0;
  if (nt.needTool && !tier) { toast('Necesitas un pico para extraer hierro'); return; }
  const power = TIER_POWER[tier];
  n.hp -= power;
  give(nt.give(power)); addXp(1);
  beep(n.type === 'tree' ? 150 : n.type === 'bush' ? 420 : 300, 0.06, 'square');
  if (n.hp <= 0) { n.alive = false; n.respawn = 240; showNode(n, false); }
}

function buildSpot() {
  const type = PIECES[world.buildIdx].id;
  const a = aimPoint(7);
  const ci = Math.round(a.x / GRID), cj = Math.round(a.z / GRID), cx = ci * GRID, cz = cj * GRID;
  const found = (i, j) => pieces.find((p) => p.type === 'foundation' && Math.abs(p.x - i * GRID) < 0.1 && Math.abs(p.z - j * GRID) < 0.1);
  let s;
  if (type === 'foundation') {
    const nb = found(ci + 1, cj) || found(ci - 1, cj) || found(ci, cj + 1) || found(ci, cj - 1);
    s = { type, x: cx, z: cz, y: nb ? nb.y : terrainH(cx, cz) + 0.35, rot: 0 };
  } else if (type === 'wall' || type === 'doorway') {
    const lx = a.x - cx, lz = a.z - cz;
    let x = cx, z = cz, rot = 0, i2 = ci, j2 = cj;
    if (Math.abs(lx) > Math.abs(lz)) { x += Math.sign(lx) * 1.5; rot = 1; i2 += Math.sign(lx); }
    else { z += (Math.sign(lz) || 1) * 1.5; j2 += Math.sign(lz) || 1; }
    const f = found(ci, cj) || found(i2, j2);
    s = { type, x, z, rot, y: f ? f.y : terrainH(x, z) - 0.1 };
  } else if (type === 'roof') {
    const f = found(ci, cj);
    s = { type, x: cx, z: cz, rot: 0, y: (f ? f.y : terrainH(cx, cz)) + 3 };
  } else s = { type, x: a.x, z: a.z, rot: 0, y: groundAt(a.x, a.z, P.y + 0.5) };
  const snapped = !['campfire', 'bed', 'workbench', 'furnace', 'beacon'].includes(type);
  const group = (t) => (t === 'doorway' ? 'wall' : t);
  s.blocked = pieces.some((p) => (snapped ? group(p.type) === group(type) : true) &&
    Math.abs(p.x - s.x) < (snapped ? 0.1 : 1.2) && Math.abs(p.z - s.z) < (snapped ? 0.1 : 1.2) &&
    (snapped ? Math.abs(p.y - s.y) < 1 : !['foundation', 'roof'].includes(p.type)));
  if (terrainH(s.x, s.z) < -0.3) s.blocked = true;
  return s;
}
const ghostMat = new THREE.MeshBasicMaterial({ color: 0x66ff88, transparent: true, opacity: 0.4, depthWrite: false });
let ghost = null, ghostType = null;
function updateGhost() {
  const building = state === 'play' && SLOTS[P.slot].id === 'hammer';
  const type = PIECES[world.buildIdx].id;
  if (!building || ghostType !== type) {
    if (ghost) scene.remove(ghost);
    ghost = null; ghostType = null;
    if (!building) return;
    ghost = pieceMesh(type); ghostType = type;
    ghost.traverse((o) => { if (o.isMesh) o.material = ghostMat; else if (o.isLight) o.visible = false; });
    scene.add(ghost);
  }
  const s = buildSpot();
  ghost.position.set(s.x, s.y, s.z);
  ghost.rotation.y = s.rot ? Math.PI / 2 : 0;
  ghostMat.color.set(!s.blocked && canAfford(PIECES[world.buildIdx].cost) ? 0x66ff88 : 0xff5544);
}
function placePiece() {
  const pc = PIECES[world.buildIdx], s = buildSpot();
  if (s.blocked) { toast('No se puede colocar aquí'); return; }
  if (!canAfford(pc.cost)) { toast(`Faltan materiales: ${costText(pc.cost)}`); return; }
  pay(pc.cost);
  addPiece({ type: s.type, x: s.x, y: s.y, z: s.z, rot: s.rot });
  addXp(2); beep(200, 0.1, 'triangle');
  if (pc.id === 'bed') { P.spawn = { x: s.x, z: s.z }; toast('Punto de reaparición fijado'); }
  if (pc.id === 'beacon' && !world.won) win();
}
function demolish() {
  const a = aimPoint(6);
  let best = null, bd = 2.6;
  for (const p of pieces) { const d = Math.hypot(p.x - a.x, p.z - a.z); if (d < bd) { bd = d; best = p; } }
  if (!best) return;
  if (best.type === 'beacon') { toast('El faro no se puede demoler'); return; }
  removePiece(best);
  const refund = {};
  for (const [k, v] of Object.entries(PIECE_BY_ID[best.type].cost)) refund[k] = Math.floor(v / 2);
  give(refund);
}

function nearBed() { return pieces.find((p) => p.type === 'bed' && Math.hypot(p.x - P.x, p.z - P.z) < 3); }
const nearWater = () => terrainH(P.x, P.z) < 0.35;
function interact() {
  if (nearBed()) {
    P.spawn = { x: nearBed().x, z: nearBed().z };
    if (!isNight()) { toast('Solo puedes dormir de noche'); return; }
    if (creatures.some((e) => CREATURES[e.type].dmg && Math.hypot(e.x - P.x, e.z - P.z) < 18)) { toast('Hay enemigos cerca'); return; }
    if (world.time > 0.5) world.day++;
    world.time = 0.27; P.hunger = Math.max(5, P.hunger - 15); P.thirst = Math.max(5, P.thirst - 15); P.hp = P.maxHp;
    toast('Has dormido hasta el amanecer'); save();
  } else if (nearWater()) { P.thirst = Math.min(100, P.thirst + 30); beep(500, 0.1, 'sine'); }
}
function eat() {
  if (P.hunger > 95) { toast('No tienes hambre'); return; }
  if (count('cooked')) { inv.cooked--; P.hunger = Math.min(100, P.hunger + 35); toast('Comes carne asada'); }
  else if (count('berries')) { inv.berries--; P.hunger = Math.min(100, P.hunger + 6); P.thirst = Math.min(100, P.thirst + 3); }
  else if (count('meat')) { inv.meat--; P.hunger = Math.min(100, P.hunger + 12); P.hp -= 5; toast('La carne cruda te sienta mal'); }
  else { toast('No tienes comida'); return; }
  beep(380, 0.06, 'sine');
}
function useBandage() {
  if (!count('bandage')) { toast('No tienes vendas (fabrícalas con fibra)'); return; }
  if (P.hp >= P.maxHp) return;
  inv.bandage--; P.hp = Math.min(P.maxHp, P.hp + 35); toast('Usas una venda');
}

let promptTimer = 0;
function updatePrompt(dt) {
  promptTimer -= dt;
  if (promptTimer > 0) return;
  promptTimer = 0.12;
  promptText = '';
  if (SLOTS[P.slot].id === 'hammer') return;
  const t = aimTarget(4);
  if (t && t.kind === 'creature') promptText = `${CREATURES[t.e.type].name} — ${Math.max(0, Math.ceil(t.e.hp))}/${CREATURES[t.e.type].hp}`;
  else if (t) promptText = NODE_TYPES[t.n.type].name;
  else if (nearBed()) promptText = '[E] Dormir';
  else if (nearWater()) promptText = '[E] Beber';
}

// ───────────────────────── Ciclo día/noche ─────────────────────────
const DAY_LEN = 480;
const cDay = new THREE.Color(0x8ec5e8), cNight = new THREE.Color(0x070b18), cDusk = new THREE.Color(0xe08a55), cSky = new THREE.Color();
function updateSky(dt) {
  world.time += dt / DAY_LEN;
  if (world.time >= 1) { world.time -= 1; world.day++; }
  const a = (world.time - 0.25) * Math.PI * 2, s = Math.sin(a);
  const df = smooth(-0.12, 0.25, s), dusk = clamp(1 - Math.abs(s) / 0.3, 0, 1) * 0.55;
  cSky.copy(cNight).lerp(cDay, df).lerp(cDusk, dusk);
  scene.background.copy(cSky); scene.fog.color.copy(cSky);
  sun.position.set(Math.cos(a) * 100, Math.max(s, 0.05) * 100, 35);
  sun.intensity = df * 1.8;
  hemi.intensity = 0.22 + df * 1.1;
}
function updateNodes(dt) {
  for (const n of nodes) if (!n.alive) {
    n.respawn -= dt;
    if (n.respawn <= 0 && Math.hypot(n.x - P.x, n.z - P.z) > 25) { n.alive = true; n.hp = NODE_TYPES[n.type].hp; showNode(n, true); }
  }
}

// ───────────────────────── Guardado ─────────────────────────
function save() {
  if (state === 'menu') return;
  const data = {
    inv, T, world,
    P: { ...P, swing: 0 },
    pieces: pieces.map((p) => ({ type: p.type, x: p.x, y: p.y, z: p.z, rot: p.rot })),
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* almacenamiento no disponible */ }
}
function loadSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch { return null; }
}

function startGame(data) {
  [...pieces].forEach(removePiece);
  [...creatures].forEach(removeCreature);
  nodes.forEach((n) => { if (!n.alive) { n.alive = true; n.hp = NODE_TYPES[n.type].hp; showNode(n, true); } });
  resetState();
  if (data) {
    Object.assign(inv, data.inv); Object.assign(T, data.T); Object.assign(P, data.P); Object.assign(world, data.world);
    data.pieces.forEach(addPiece);
  } else {
    P.x = START.x; P.z = START.z; P.y = terrainH(START.x, START.z) + 0.2;
    toast('Despiertas en la orilla. Golpea árboles, rocas y arbustos para recolectar.');
  }
  $('menu').classList.add('hidden');
  $('hud').classList.remove('hidden');
  drawHotbar();
  setState('play');
}
function win() {
  world.won = true;
  $('win-text').textContent = `Encendiste el faro el día ${world.day}, con nivel ${P.level} y ${P.kills} criaturas abatidas. Un barco ha visto la luz: estás a salvo. Puedes seguir jugando en tu isla.`;
  setState('win');
  beep(523, 0.3, 'triangle'); setTimeout(() => beep(784, 0.5, 'triangle'), 250);
  save();
}

function setState(s) {
  state = s;
  $('craft').classList.toggle('hidden', s !== 'craft');
  $('pause').classList.toggle('hidden', s !== 'pause');
  $('win').classList.toggle('hidden', s !== 'win');
  if (s === 'play') { const p = renderer.domElement.requestPointerLock?.(); if (p && p.catch) p.catch(() => {}); }
  else if (document.pointerLockElement) document.exitPointerLock();
  if (s === 'craft') drawCraft();
  for (const k of Object.keys(keys)) keys[k] = false;
}

// ───────────────────────── Entrada ─────────────────────────
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && state === 'play') setState('pause');
});
document.addEventListener('mousemove', (e) => {
  if (state !== 'play' || !document.pointerLockElement) return;
  P.yaw -= e.movementX * 0.0022;
  P.pitch = clamp(P.pitch - e.movementY * 0.0022, -1.5, 1.5);
});
renderer.domElement.addEventListener('mousedown', (e) => {
  if (state !== 'play' || e.button !== 0) return;
  if (!document.pointerLockElement) { const p = renderer.domElement.requestPointerLock?.(); if (p && p.catch) p.catch(() => {}); }
  if (SLOTS[P.slot].id === 'hammer') placePiece(); else attack();
});
function cycleBuild(d) { world.buildIdx = (world.buildIdx + d + PIECES.length) % PIECES.length; }
window.addEventListener('wheel', (e) => {
  if (state === 'play' && SLOTS[P.slot].id === 'hammer') cycleBuild(e.deltaY > 0 ? 1 : -1);
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'Tab') e.preventDefault();
  if (e.repeat) return;
  if (state === 'craft') { if (e.code === 'Tab' || e.code === 'Escape') setState('play'); return; }
  if (state === 'pause') { if (e.code === 'Escape') setState('play'); return; }
  if (state !== 'play') return;
  keys[e.code] = true;
  if (e.code === 'Space') e.preventDefault();
  if (e.code.startsWith('Digit')) {
    const i = +e.code.slice(5) - 1;
    if (i >= 0 && i < SLOTS.length) {
      if (slotAvailable(i)) { P.slot = i; drawHotbar(); } else toast('Aún no has fabricado eso');
    }
  }
  else if (e.code === 'Tab') setState('craft');
  else if (e.code === 'Escape') setState('pause');
  else if (e.code === 'KeyE') interact();
  else if (e.code === 'KeyF') eat();
  else if (e.code === 'KeyV') useBandage();
  else if (e.code === 'KeyR' && SLOTS[P.slot].id === 'hammer') cycleBuild(1);
  else if (e.code === 'KeyX' && SLOTS[P.slot].id === 'hammer') demolish();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k of Object.keys(keys)) keys[k] = false; });
window.addEventListener('beforeunload', save);

$('m-new').onclick = () => {
  if (loadSave() && !confirm('Se sobrescribirá la partida guardada. ¿Continuar?')) return;
  startGame(null);
};
$('m-continue').onclick = () => startGame(loadSave());
$('p-resume').onclick = () => setState('play');
$('p-save').onclick = () => { save(); toast('Partida guardada'); setState('play'); };
$('p-menu').onclick = () => { save(); location.reload(); };
$('w-continue').onclick = () => setState('play');
if (loadSave()) $('m-continue').classList.remove('hidden');

// ───────────────────────── Bucle principal ─────────────────────────
resetState();
camera.position.set(START.x, terrainH(START.x, START.z) + 14, START.z + 30);
camera.lookAt(START.x, terrainH(START.x, START.z), START.z);

let last = performance.now(), saveTimer = 0, menuAngle = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (state === 'play') {
    world.played += dt;
    updatePlayer(dt);
    updateCreatures(dt);
    updateSky(dt);
    updateNodes(dt);
    updatePrompt(dt);
    saveTimer += dt;
    if (saveTimer > 30) { saveTimer = 0; save(); }
  } else if (state === 'menu') {
    menuAngle += dt * 0.08;
    camera.position.set(START.x + Math.sin(menuAngle) * 40, terrainH(START.x, START.z) + 16, START.z + Math.cos(menuAngle) * 40);
    camera.lookAt(START.x, terrainH(START.x, START.z) + 2, START.z);
  }
  updateGhost();
  hudTimer -= dt;
  if (hudTimer <= 0 && state !== 'menu') { hudTimer = 0.1; drawHud(); }
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

// Acceso para pruebas automáticas
window.__game = {
  get state() { return state; }, get P() { return P; }, get inv() { return inv; }, get T() { return T; },
  get world() { return world; }, pieces, creatures, nodes, give, attack, placePiece, spawnCreature, save, terrainH, setState,
};
