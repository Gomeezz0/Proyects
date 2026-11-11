import * as THREE from '../vendor/three.module.min.js';

const WHATSAPP = '34605862660'; // +34 605 86 26 60
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => innerWidth <= 860;

document.documentElement.classList.add('js');

/* ------------------------------------------------------------------ */
/*  Interfaz                                                           */
/* ------------------------------------------------------------------ */

document.getElementById('year').textContent = new Date().getFullYear();

// Barra de navegación
const nav = document.getElementById('nav');
const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');
const onScrollNav = () => nav.classList.toggle('scrolled', scrollY > 30);
addEventListener('scroll', onScrollNav, { passive: true });
onScrollNav();

const setMenu = (open) => {
  navLinks.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
};
burger.addEventListener('click', () => setMenu(!navLinks.classList.contains('open')));
navLinks.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

// Aparición al hacer scroll
const io = new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => {
  const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
  el.style.setProperty('--d', `${Math.min(siblings.indexOf(el), 6) * 0.08}s`);
  io.observe(el);
});

// Tarjetas con inclinación 3D
if (!reducedMotion && matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('.tilt').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--ry', `${(px - 0.5) * 12}deg`);
      el.style.setProperty('--rx', `${(0.5 - py) * 12}deg`);
      el.style.setProperty('--mx', `${px * 100}%`);
      el.style.setProperty('--my', `${py * 100}%`);
    });
    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });
  });
}

// Formulario → WhatsApp
document.getElementById('waForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(e.currentTarget);
  const nombre = (data.get('nombre') || '').toString().trim();
  const idea = (data.get('idea') || '').toString().trim();
  const lines = [
    nombre ? `Hola, soy ${nombre}.` : 'Hola.',
    `Me interesa: ${data.get('tipo')}.`,
  ];
  if (idea) lines.push(`Mi idea: ${idea}`);
  const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(lines.join('\n'))}`;
  window.open(url, '_blank', 'noopener');
});

/* ------------------------------------------------------------------ */
/*  Escena 3D                                                          */
/* ------------------------------------------------------------------ */

const PALETTES = [
  ['#3b1cff', '#00e5ff', '#c9b8ff'],
  ['#ff1f7a', '#ffb020', '#ffe3c2'],
  ['#008f6b', '#d4ff3a', '#c8fff0'],
  ['#1437ff', '#9fc4ff', '#ffffff'],
];

// Posición de la pieza según la sección visible.
// x / y son fracciones de media pantalla; s es la escala.
const SCENES = {
  hero:      { d: { x: 0.5, y: 0.0, s: 1.05 },  m: { x: 0, y: 0.42, s: 0.85 }, amp: 1.0 },
  servicios: { d: { x: -0.72, y: 0.1, s: 0.95 }, m: { x: 0.5, y: 0.2, s: 0.8 }, amp: 0.7 },
  lab:       { d: { x: 0.42, y: 0.0, s: 1.4 },   m: { x: 0, y: 0.42, s: 0.9 },  amp: 1.0 },
  proceso:   { d: { x: -0.7, y: -0.15, s: 1.0 }, m: { x: -0.5, y: 0, s: 0.8 },  amp: 0.8 },
  planes:    { d: { x: 0.8, y: 0.2, s: 0.9 },    m: { x: 0.5, y: -0.2, s: 0.8 }, amp: 0.7 },
  contacto:  { d: { x: -0.1, y: 0.55, s: 0.8 },  m: { x: 0, y: 0.6, s: 0.7 },   amp: 1.1 },
};

const NOISE_GLSL = /* glsl */`
vec4 permute(vec4 x){ return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
    i.y + vec4(0.0, i1.y, i2.y, 1.0)) +
    i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0 / 7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}`;

const VERT = /* glsl */`
uniform float uTime, uAmp, uFreq, uPulse;
varying vec3 vNormal, vViewPos;
varying float vDisp;
${NOISE_GLSL}
float field(vec3 p){
  float n = snoise(p * uFreq + vec3(0.0, 0.0, uTime * 0.35));
  n += 0.35 * snoise(p * uFreq * 2.3 - vec3(uTime * 0.2));
  return n;
}
void main(){
  float k = uAmp * (1.0 + uPulse * 1.6);
  vec3 n = normalize(normal);
  vec3 t = normalize(cross(n, abs(n.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
  vec3 b = cross(n, t);
  float e = 0.012;
  float d0 = field(position);
  vec3 p0 = position + n * d0 * k;
  vec3 p1 = position + t * e; p1 += n * field(p1) * k;
  vec3 p2 = position + b * e; p2 += n * field(p2) * k;
  vec3 dn = normalize(cross(p1 - p0, p2 - p0));
  vDisp = d0;
  vNormal = normalize(normalMatrix * dn);
  vec4 mv = modelViewMatrix * vec4(p0, 1.0);
  vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */`
uniform vec3 uA, uB, uC;
uniform float uFlat, uPulse;
varying vec3 vNormal, vViewPos;
varying float vDisp;
void main(){
  vec3 n = normalize(vNormal);
  if (uFlat > 0.5) n = normalize(cross(dFdx(vViewPos), dFdy(vViewPos)));
  vec3 v = normalize(-vViewPos);
  vec3 l = normalize(vec3(0.5, 0.8, 0.7));
  float diff = max(dot(n, l), 0.0);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 2.4);
  float spec = pow(max(dot(n, normalize(l + v)), 0.0), 60.0);
  vec3 base = mix(uA, uB, smoothstep(-0.7, 0.8, vDisp + n.y * 0.35));
  vec3 col = base * (0.16 + 0.84 * diff);
  col += uC * fres * (1.1 + uPulse);
  col += vec3(1.0) * spec * 0.8;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

function initScene() {
  const canvas = document.getElementById('scene');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    canvas.remove(); // se queda el fondo CSS de respaldo
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile() ? 1.5 : 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 5;

  /* Pieza principal */
  const lowPower = isMobile() || (navigator.hardwareConcurrency || 8) <= 4;
  const geometries = {
    blob: { geo: new THREE.IcosahedronGeometry(1, lowPower ? 28 : 48), flat: 0, amp: 0.32, freq: 1.15 },
    knot: { geo: new THREE.TorusKnotGeometry(0.68, 0.24, lowPower ? 220 : 360, lowPower ? 28 : 48), flat: 0, amp: 0.12, freq: 1.8 },
    crystal: { geo: new THREE.IcosahedronGeometry(1.05, 2), flat: 1, amp: 0.3, freq: 1.3 },
  };
  let shape = geometries.blob;

  const uniforms = {
    uTime: { value: 0 },
    uAmp: { value: shape.amp },
    uFreq: { value: shape.freq },
    uPulse: { value: 0 },
    uFlat: { value: 0 },
    uA: { value: new THREE.Color(PALETTES[0][0]) },
    uB: { value: new THREE.Color(PALETTES[0][1]) },
    uC: { value: new THREE.Color(PALETTES[0][2]) },
  };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG });
  const mesh = new THREE.Mesh(shape.geo, material);

  const group = new THREE.Group();
  group.add(mesh);
  scene.add(group);

  /* Jaula de alambre y anillos */
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 });
  const cage = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.75, 1)), lineMat);
  group.add(cage);

  const ringMat = new THREE.MeshBasicMaterial({ color: PALETTES[0][1], transparent: true, opacity: 0.55 });
  const rings = [2.05, 2.35].map((r, i) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006, 8, 160), ringMat);
    ring.rotation.set(Math.PI / 2 + (i ? 0.5 : -0.3), i ? 0.4 : -0.2, 0);
    group.add(ring);
    return ring;
  });

  /* Partículas */
  const COUNT = lowPower ? 1400 : 3200;
  const pos = new Float32Array(COUNT * 3);
  const col = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const r = 3 + Math.random() * 14;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    pos[i * 3 + 2] = r * Math.cos(ph) - 4;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    size: 0.035, vertexColors: true, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(stars);

  const paintStars = (pal) => {
    const a = new THREE.Color(pal[1]), b = new THREE.Color(pal[2]), c = new THREE.Color();
    for (let i = 0; i < COUNT; i++) {
      c.copy(a).lerp(b, (i * 0.618) % 1).multiplyScalar(0.35 + ((i * 0.37) % 1) * 0.65);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    starGeo.attributes.color.needsUpdate = true;
  };
  paintStars(PALETTES[0]);

  /* Estado */
  const state = {
    mouse: new THREE.Vector2(), smooth: new THREE.Vector2(),
    target: SCENES.hero, x: 0, y: 0, s: 0.001, sceneAmp: 1,
    energy: 0.45, pulse: 0, spin: 0, swap: 1, pendingShape: null,
    palette: PALETTES[0].map((c) => new THREE.Color(c)),
    halfW: 1, halfH: 1,
  };

  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    state.halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    state.halfW = state.halfH * camera.aspect;
  };
  addEventListener('resize', resize);
  resize();

  /* Sección activa */
  const sections = [...document.querySelectorAll('[data-scene]')];
  const pickScene = () => {
    const mid = innerHeight / 2;
    let best = sections[0], bestDist = Infinity;
    for (const s of sections) {
      const r = s.getBoundingClientRect();
      const d = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
      if (d < bestDist) { bestDist = d; best = s; }
    }
    state.target = SCENES[best.dataset.scene] || SCENES.hero;
  };
  addEventListener('scroll', pickScene, { passive: true });
  pickScene();

  /* Interacción */
  addEventListener('pointermove', (e) => {
    state.mouse.set((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
    if (e.buttons === 1 && e.pointerType === 'mouse') state.spin += e.movementX * 0.0006;
  }, { passive: true });
  addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button, input, select, textarea, label')) return;
    state.pulse = 1;
  }, { passive: true });

  /* Controles del laboratorio */
  const activate = (container, btn) => {
    container.querySelectorAll('button').forEach((b) => {
      const on = b === btn;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  };
  const shapeBtns = document.getElementById('shapeBtns');
  shapeBtns.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || geometries[btn.dataset.shape] === shape) return;
    activate(shapeBtns, btn);
    state.pendingShape = geometries[btn.dataset.shape];
  });
  const paletteBtns = document.getElementById('paletteBtns');
  paletteBtns.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    activate(paletteBtns, btn);
    const pal = PALETTES[+btn.dataset.palette];
    state.palette = pal.map((c) => new THREE.Color(c));
    paintStars(pal);
    state.pulse = 0.6;
  });
  const energy = document.getElementById('energy');
  energy.addEventListener('input', () => { state.energy = energy.value / 100; });

  /* Bucle */
  const clock = new THREE.Clock();
  const speed = reducedMotion ? 0.15 : 1;
  const lerp = THREE.MathUtils.lerp;

  const frame = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const k = 1 - Math.exp(-dt * 3.2); // suavizado independiente de los fps
    const e = 0.35 + state.energy * 1.45;

    uniforms.uTime.value += dt * speed * (0.5 + state.energy * 1.4);

    // Cambio de forma: encoger, sustituir, crecer
    if (state.pendingShape) {
      state.swap = Math.max(0, state.swap - dt * 5);
      if (state.swap === 0) {
        shape = state.pendingShape;
        state.pendingShape = null;
        mesh.geometry = shape.geo;
        uniforms.uFlat.value = shape.flat;
        uniforms.uFreq.value = shape.freq;
        state.pulse = 0.8;
      }
    } else {
      state.swap = Math.min(1, state.swap + dt * 3.5);
    }
    const swapEase = state.swap * state.swap * (3 - 2 * state.swap);

    const t = isMobile() ? state.target.m : state.target.d;
    state.x = lerp(state.x, t.x * state.halfW, k);
    state.y = lerp(state.y, t.y * state.halfH, k);
    state.s = lerp(state.s, t.s, k);
    state.sceneAmp = lerp(state.sceneAmp, state.target.amp, k);
    state.smooth.lerp(state.mouse, k * 1.4);
    state.pulse = Math.max(0, state.pulse - dt * 1.6);
    state.spin *= Math.exp(-dt * 2.5);

    uniforms.uAmp.value = lerp(uniforms.uAmp.value, shape.amp * e * state.sceneAmp, k);
    uniforms.uPulse.value = state.pulse * state.pulse;
    uniforms.uA.value.lerp(state.palette[0], k);
    uniforms.uB.value.lerp(state.palette[1], k);
    uniforms.uC.value.lerp(state.palette[2], k);
    ringMat.color.lerp(state.palette[1], k);

    group.position.set(state.x + state.smooth.x * 0.12, state.y + state.smooth.y * 0.12, 0);
    group.scale.setScalar(state.s);
    mesh.scale.setScalar(swapEase * (1 + state.pulse * 0.06));
    mesh.rotation.y += dt * speed * 0.18 * e + state.spin;
    mesh.rotation.x = lerp(mesh.rotation.x, -state.smooth.y * 0.5, k);
    mesh.rotation.z = lerp(mesh.rotation.z, -state.smooth.x * 0.25, k);

    cage.rotation.y -= dt * speed * 0.07;
    cage.rotation.x += dt * speed * 0.04;
    rings[0].rotation.z += dt * speed * 0.25;
    rings[1].rotation.z -= dt * speed * 0.18;
    group.rotation.x = state.smooth.y * -0.12;
    group.rotation.y = state.smooth.x * 0.18;

    stars.rotation.y += dt * speed * 0.012;
    stars.rotation.x = lerp(stars.rotation.x, state.smooth.y * 0.05 + scrollY * 0.00012, k);
    stars.position.x = -state.smooth.x * 0.25;

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

initScene();
