import * as THREE from '../vendor/three.module.min.js';

const WHATSAPP = '34605862660'; // +34 605 86 26 60
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const isMobile = () => innerWidth <= 980;
const lerp = THREE.MathUtils.lerp;

document.documentElement.classList.add('js');

/* ------------------------------------------------------------------ */
/*  Pantalla de carga                                                  */
/* ------------------------------------------------------------------ */

const loader = document.getElementById('loader');
const loaderBar = document.getElementById('loaderBar');
let loadPct = 20;
loaderBar.style.width = `${loadPct}%`;
const loaderTick = setInterval(() => {
  loadPct = Math.min(90, loadPct + Math.random() * 18);
  loaderBar.style.width = `${loadPct}%`;
}, 120);
function hideLoader() {
  clearInterval(loaderTick);
  loaderBar.style.width = '100%';
  setTimeout(() => {
    loader.classList.add('done');
    document.querySelectorAll('.hero .reveal').forEach((el) => el.classList.add('in'));
  }, 250);
}

/* ------------------------------------------------------------------ */
/*  Interfaz                                                           */
/* ------------------------------------------------------------------ */

document.getElementById('year').textContent = new Date().getFullYear();

// Titular letra a letra, con degradado repartido entre las letras
(function splitHeadline() {
  const h1 = document.querySelector('.split');
  if (!h1) return;
  let i = 0;
  const gradStops = [new THREE.Color('#7c5cff'), new THREE.Color('#00e5ff'), new THREE.Color('#b8ffe9')];
  const wrap = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        for (const word of child.textContent.split(/(\s+)/)) {
          if (!word) continue;
          if (/^\s+$/.test(word)) { frag.append(' '); continue; }
          const w = document.createElement('span');
          w.className = 'word';
          w.setAttribute('aria-hidden', 'true');
          for (const ch of word) {
            const s = document.createElement('span');
            s.className = 'ch';
            s.textContent = ch;
            s.style.setProperty('--i', i++);
            w.append(s);
          }
          frag.append(w);
        }
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
        wrap(child);
      }
    }
  };
  wrap(h1);
  const gradChars = h1.querySelectorAll('.grad .ch');
  const c = new THREE.Color();
  gradChars.forEach((el, n) => {
    const t = n / Math.max(1, gradChars.length - 1);
    if (t < 0.6) c.copy(gradStops[0]).lerp(gradStops[1], t / 0.6);
    else c.copy(gradStops[1]).lerp(gradStops[2], (t - 0.6) / 0.4);
    el.style.setProperty('--c', `#${c.getHexString()}`);
  });
})();

// Barra de navegación + barra de progreso
const nav = document.getElementById('nav');
const progress = document.getElementById('progress');
const onScrollUI = () => {
  nav.classList.toggle('scrolled', scrollY > 30);
  const max = document.documentElement.scrollHeight - innerHeight;
  progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
};
addEventListener('scroll', onScrollUI, { passive: true });
onScrollUI();

const burger = document.getElementById('burger');
const navLinks = document.getElementById('navLinks');
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
  if (!el.closest('.hero')) io.observe(el); // el hero aparece al quitar la pantalla de carga
});

// Contadores
const countIO = new IntersectionObserver((entries) => {
  for (const en of entries) {
    if (!en.isIntersecting) continue;
    countIO.unobserve(en.target);
    const el = en.target;
    const end = +el.dataset.count;
    if (reducedMotion || end === 0) continue;
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / 1400);
      el.textContent = Math.round(end * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  }
}, { threshold: 0.6 });
document.querySelectorAll('[data-count]').forEach((el) => countIO.observe(el));

// Tarjetas con inclinación 3D
if (!reducedMotion && finePointer) {
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

// Cursor personalizado y botones magnéticos
if (finePointer && !reducedMotion) {
  const cursor = document.getElementById('cursor');
  const pos = { x: innerWidth / 2, y: innerHeight / 2 }, cur = { ...pos };
  addEventListener('pointermove', (e) => {
    pos.x = e.clientX; pos.y = e.clientY;
    cursor.classList.add('on');
    cursor.classList.toggle('hover', !!e.target.closest('a, button, summary, input, select, textarea, .ring-stage'));
  }, { passive: true });
  addEventListener('pointerdown', () => cursor.classList.add('down'));
  addEventListener('pointerup', () => cursor.classList.remove('down'));
  document.addEventListener('pointerleave', () => cursor.classList.remove('on'));
  const loop = () => {
    cur.x = lerp(cur.x, pos.x, 0.22);
    cur.y = lerp(cur.y, pos.y, 0.22);
    cursor.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`;
    requestAnimationFrame(loop);
  };
  loop();

  document.querySelectorAll('.magnetic').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${dx * 0.25}px, ${dy * 0.35}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

// El botón flotante saluda una vez cuando el usuario lleva un rato
const fab = document.querySelector('.fab');
setTimeout(() => {
  fab.classList.add('peek');
  setTimeout(() => fab.classList.remove('peek'), 4000);
}, 9000);

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
/*  Carrusel 3D de ideas                                               */
/* ------------------------------------------------------------------ */

(function initRing() {
  const stage = document.getElementById('ringStage');
  const ring = document.getElementById('ring');
  const cards = [...ring.children];
  const count = document.getElementById('ringCount');
  const N = cards.length;
  const STEP = 360 / N;
  let radius = 0;
  let angle = 0, target = 0, vel = 0;
  let dragging = false, moved = 0, lastX = 0, lastT = 0, idleAt = 0;

  const layout = () => {
    const w = cards[0].offsetWidth;
    radius = Math.round((w / 2) / Math.tan(Math.PI / N) + 40);
    cards.forEach((c, i) => { c.dataset.base = String(i * STEP); });
  };
  addEventListener('resize', layout);
  layout();

  const go = (dir) => { target = Math.round(target / STEP) * STEP - dir * STEP; idleAt = performance.now(); };

  document.getElementById('ringPrev').addEventListener('click', () => go(-1));
  document.getElementById('ringNext').addEventListener('click', () => go(1));
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  });
  stage.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { // solo gestos horizontales: no secuestramos el scroll
      e.preventDefault();
      target -= e.deltaX * 0.25;
      idleAt = performance.now();
    }
  }, { passive: false });

  stage.addEventListener('pointerdown', (e) => {
    dragging = true; moved = 0; lastX = e.clientX; lastT = performance.now(); vel = 0;
    stage.classList.add('grabbing');
  });
  addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    moved += Math.abs(dx);
    if (moved > 6 && !stage.hasPointerCapture?.(e.pointerId)) {
      try { stage.setPointerCapture(e.pointerId); } catch { /* sin captura */ }
    }
    target += dx * 0.32;
    vel = (dx * 0.32) / Math.max(1, now - lastT) * 16;
    lastX = e.clientX; lastT = now;
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('grabbing');
    target += vel * 12; // inercia
    target = Math.round(target / STEP) * STEP; // encaja en la tarjeta más cercana
    idleAt = performance.now();
  };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);
  // Si se ha arrastrado, que no se abra el enlace
  ring.addEventListener('click', (e) => { if (moved > 6) { e.preventDefault(); moved = 0; } }, true);
  ring.addEventListener('dragstart', (e) => e.preventDefault());

  let visible = false;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(stage);

  let last = performance.now(), shown = -1;
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (visible) {
      if (!dragging && !reducedMotion && now - idleAt > 4500) {
        // giro automático: avanza una tarjeta cada pocos segundos
        target = Math.round(target / STEP) * STEP - STEP;
        idleAt = now - 4500 + 3200;
      }
      angle = dragging ? target : lerp(angle, target, 1 - Math.exp(-dt * 7));
      ring.style.transform = `translateZ(${-radius}px) rotateY(${angle}deg)`;
      cards.forEach((c) => {
        const a = (+c.dataset.base + angle) * Math.PI / 180;
        const facing = Math.cos(a); // 1 = de frente
        c.style.transform = `rotateY(${c.dataset.base}deg) translateZ(${radius}px)`;
        c.style.filter = `brightness(${0.45 + 0.55 * Math.max(0, facing)})`;
        c.style.pointerEvents = facing > 0.7 ? 'auto' : 'none';
        c.tabIndex = facing > 0.9 ? 0 : -1;
      });
      const idx = ((Math.round(-angle / STEP) % N) + N) % N;
      if (idx !== shown) { shown = idx; count.textContent = `${idx + 1} / ${N}`; }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();

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
  hero:      { d: { x: 0.5, y: 0.0, s: 1.05 },   m: { x: 0, y: 0.42, s: 0.85 }, amp: 1.0 },
  servicios: { d: { x: 0.74, y: 0.3, s: 0.8 },   m: { x: 0.5, y: 0.2, s: 0.8 },  amp: 0.7 },
  ideas:     { d: { x: 0, y: -0.05, s: 1.25 },  m: { x: 0, y: -0.05, s: 1.0 }, amp: 0.6, dim: 0.45 },
  lab:       { d: { x: 0.42, y: 0.0, s: 1.4 },   m: { x: 0, y: 0.42, s: 0.9 },  amp: 1.0 },
  proceso:   { d: { x: 0.72, y: 0.32, s: 0.8 },   m: { x: -0.5, y: 0, s: 0.8 },  amp: 0.8 },
  planes:    { d: { x: 0.8, y: 0.2, s: 0.9 },    m: { x: 0.5, y: -0.2, s: 0.8 }, amp: 0.7 },
  faq:       { d: { x: 0.72, y: -0.1, s: 1.1 },  m: { x: 0.55, y: 0.5, s: 0.7 }, amp: 0.9 },
  contacto:  { d: { x: -0.1, y: 0.55, s: 0.8 },  m: { x: 0, y: 0.6, s: 0.7 },   amp: 1.1 },
  footer:    { d: { x: 0, y: -0.05, s: 0.75 },  m: { x: 0, y: 0.1, s: 0.6 },   amp: 1.2 },
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

// El vértice se desplaza con ruido y, además, se hincha bajo el cursor (uHit).
const VERT = /* glsl */`
uniform float uTime, uAmp, uFreq, uPulse, uHitAmt;
uniform vec3 uHit;
varying vec3 vNormal, vViewPos;
varying float vDisp, vHit;
${NOISE_GLSL}
float field(vec3 p){
  float n = snoise(p * uFreq + vec3(0.0, 0.0, uTime * 0.35));
  n += 0.35 * snoise(p * uFreq * 2.3 - vec3(uTime * 0.2));
  vec3 d = p - uHit;
  float h = exp(-dot(d, d) * 3.2) * uHitAmt;
  n += h * (0.9 + 0.5 * sin(uTime * 6.0 - length(d) * 12.0));
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
  vec3 dh = position - uHit;
  vHit = exp(-dot(dh, dh) * 3.2) * uHitAmt;
  vDisp = d0;
  vNormal = normalize(normalMatrix * dn);
  vec4 mv = modelViewMatrix * vec4(p0, 1.0);
  vViewPos = mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */`
uniform vec3 uA, uB, uC;
uniform float uFlat, uPulse, uHolo, uTime, uDim;
varying vec3 vNormal, vViewPos;
varying float vDisp, vHit;
void main(){
  vec3 n = normalize(vNormal);
  if (uFlat > 0.5) n = normalize(cross(dFdx(vViewPos), dFdy(vViewPos)));
  vec3 v = normalize(-vViewPos);
  vec3 l = normalize(vec3(0.5, 0.8, 0.7));
  float diff = max(dot(n, l), 0.0);
  float ndv = max(dot(n, v), 0.0);
  float fres = pow(1.0 - ndv, 2.4);
  float spec = pow(max(dot(n, normalize(l + v)), 0.0), 60.0);
  vec3 base = mix(uA, uB, smoothstep(-0.7, 0.8, vDisp + n.y * 0.35));
  vec3 col = base * (0.16 + 0.84 * diff);
  col += uC * fres * (1.1 + uPulse);
  col += vec3(1.0) * spec * 0.8;

  // Iridiscencia tipo película fina
  vec3 irid = 0.5 + 0.5 * cos(6.2832 * (vec3(0.0, 0.33, 0.67) + ndv * 1.4 + vDisp * 0.6 + uTime * 0.05));
  vec3 holo = mix(irid * (0.35 + 0.65 * diff), vec3(1.0), spec) + irid * fres * 1.2;
  col = mix(col, holo, uHolo);

  col += uC * vHit * 0.55; // brillo donde está el cursor
  col *= uDim;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,.45)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function initScene() {
  const canvas = document.getElementById('scene');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    canvas.remove(); // se queda el fondo CSS de respaldo
    hideLoader();
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
    uHolo: { value: 0 },
    uDim: { value: 1 },
    uHit: { value: new THREE.Vector3(0, 0, 10) },
    uHitAmt: { value: 0 },
    uA: { value: new THREE.Color(PALETTES[0][0]) },
    uB: { value: new THREE.Color(PALETTES[0][1]) },
    uC: { value: new THREE.Color(PALETTES[0][2]) },
  };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG });
  const mesh = new THREE.Mesh(shape.geo, material);

  const group = new THREE.Group();
  group.add(mesh);
  scene.add(group);

  /* Halo de luz detrás de la pieza */
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color: PALETTES[0][1], transparent: true, opacity: 0.32,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  halo.scale.setScalar(5.5);
  halo.position.z = -1.2;
  group.add(halo);

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

  /* Satélites que orbitan la pieza */
  const satGeo = new THREE.OctahedronGeometry(0.07, 0);
  const satMat = new THREE.MeshBasicMaterial({ color: PALETTES[0][2] });
  const sats = Array.from({ length: 7 }, (_, i) => {
    const m = new THREE.Mesh(satGeo, satMat);
    m.userData = { r: 1.9 + (i % 3) * 0.28, sp: 0.25 + (i % 4) * 0.08, ph: i * 0.9, tilt: (i % 2 ? 1 : -1) * (0.3 + i * 0.07) };
    group.add(m);
    return m;
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
    mouse: new THREE.Vector2(), smooth: new THREE.Vector2(), hasMouse: false,
    target: SCENES.hero, x: 0, y: 0, s: 0.001, sceneAmp: 1, dim: 1,
    energy: 0.45, pulse: 0, spin: 0, swap: 1, pendingShape: null,
    holo: 0, holoTarget: 0,
    palette: PALETTES[0].map((c) => new THREE.Color(c)),
    halfW: 1, halfH: 1, scrollVel: 0, lastScroll: scrollY,
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
    // al llegar al final, siempre la última escena (el pie es más bajo que la pantalla)
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 40) best = sections[sections.length - 1];
    state.target = SCENES[best.dataset.scene] || SCENES.hero;
  };
  addEventListener('scroll', pickScene, { passive: true });
  pickScene();

  /* Interacción */
  addEventListener('pointermove', (e) => {
    state.mouse.set((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
    state.hasMouse = e.pointerType === 'mouse';
    if (e.buttons === 1 && e.pointerType === 'mouse' && !e.target.closest('.ring-stage, input')) state.spin += e.movementX * 0.0006;
  }, { passive: true });
  addEventListener('pointerdown', (e) => {
    if (e.target.closest('a, button, input, select, textarea, label, summary, .ring-stage')) return;
    state.pulse = 1;
    // en táctil, el toque también "toca" la pieza
    state.mouse.set((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
    state.touchHit = 1.2;
  }, { passive: true });

  /* Controles del laboratorio */
  const activate = (container, btn) => {
    container.querySelectorAll('button').forEach((b) => {
      const on = b === btn;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  };
  const setShape = (key) => {
    if (geometries[key] === shape && !state.pendingShape) return;
    state.pendingShape = geometries[key];
  };
  const setMat = (key) => {
    material.wireframe = key === 'wire';
    state.holoTarget = key === 'holo' ? 1 : 0;
    state.pulse = 0.5;
  };
  const setPalette = (i) => {
    const pal = PALETTES[i];
    state.palette = pal.map((c) => new THREE.Color(c));
    paintStars(pal);
    state.pulse = 0.6;
  };
  const shapeBtns = document.getElementById('shapeBtns');
  const matBtns = document.getElementById('matBtns');
  const paletteBtns = document.getElementById('paletteBtns');
  const energy = document.getElementById('energy');

  shapeBtns.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    activate(shapeBtns, btn);
    setShape(btn.dataset.shape);
  });
  matBtns.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    activate(matBtns, btn);
    setMat(btn.dataset.mat);
  });
  paletteBtns.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    activate(paletteBtns, btn);
    setPalette(+btn.dataset.palette);
  });
  energy.addEventListener('input', () => { state.energy = energy.value / 100; });

  // Sorpréndeme: combinación aleatoria distinta de la actual
  const pick = (container) => {
    const btns = [...container.querySelectorAll('button')].filter((b) => !b.classList.contains('active'));
    return btns[Math.floor(Math.random() * btns.length)];
  };
  document.getElementById('shuffle').addEventListener('click', () => {
    const s = pick(shapeBtns), m = pick(matBtns), p = pick(paletteBtns);
    activate(shapeBtns, s); setShape(s.dataset.shape);
    activate(matBtns, m); setMat(m.dataset.mat);
    activate(paletteBtns, p); setPalette(+p.dataset.palette);
    energy.value = String(30 + Math.round(Math.random() * 60));
    state.energy = energy.value / 100;
    state.pulse = 1;
  });

  // El botón "Quiero algo así" incluye la combinación elegida
  document.getElementById('labCta').addEventListener('click', (e) => {
    const name = (c) => c.querySelector('.active')?.textContent.trim() || c.querySelector('.active')?.getAttribute('aria-label');
    const text = `Hola, he probado el laboratorio 3D (forma ${name(shapeBtns)}, material ${name(matBtns)}, color ${name(paletteBtns)}) y quiero algo así para mi marca.`;
    e.currentTarget.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
  });

  /* Rayo del cursor → punto de contacto con la pieza (esfera envolvente, cálculo analítico) */
  const raycaster = new THREE.Raycaster();
  const localRay = new THREE.Ray();
  const inv = new THREE.Matrix4();
  const hitSphere = new THREE.Sphere(new THREE.Vector3(), 1.15);
  const hitPoint = new THREE.Vector3();

  /* Bucle */
  const clock = new THREE.Clock();
  const speed = reducedMotion ? 0.15 : 1;
  let firstFrame = true;

  const frame = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const k = 1 - Math.exp(-dt * 3.2); // suavizado independiente de los fps
    const e = 0.35 + state.energy * 1.45;

    // Velocidad de scroll: acelera la animación y "estira" el campo de estrellas
    const sv = (scrollY - state.lastScroll) / Math.max(dt, 0.001);
    state.lastScroll = scrollY;
    state.scrollVel = lerp(state.scrollVel, THREE.MathUtils.clamp(sv, -4000, 4000), 1 - Math.exp(-dt * 6));
    const sBoost = Math.min(1, Math.abs(state.scrollVel) / 2500);

    uniforms.uTime.value += dt * speed * (0.5 + state.energy * 1.4 + sBoost * 1.5);

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
    state.dim = lerp(state.dim, state.target.dim ?? 1, k);
    state.holo = lerp(state.holo, state.holoTarget, k * 1.5);
    state.smooth.lerp(state.mouse, k * 1.4);
    state.pulse = Math.max(0, state.pulse - dt * 1.6);
    state.spin *= Math.exp(-dt * 2.5);

    uniforms.uAmp.value = lerp(uniforms.uAmp.value, shape.amp * e * state.sceneAmp, k);
    uniforms.uPulse.value = state.pulse * state.pulse;
    uniforms.uHolo.value = state.holo;
    uniforms.uDim.value = state.dim;
    uniforms.uA.value.lerp(state.palette[0], k);
    uniforms.uB.value.lerp(state.palette[1], k);
    uniforms.uC.value.lerp(state.palette[2], k);
    ringMat.color.lerp(state.palette[1], k);
    satMat.color.lerp(state.palette[2], k);
    halo.material.color.lerp(state.palette[1], k);
    halo.material.opacity = (0.26 + state.pulse * 0.3 + uniforms.uHitAmt.value * 0.12) * state.dim;
    lineMat.opacity = 0.1 * state.dim;
    ringMat.opacity = 0.55 * state.dim;

    group.position.set(state.x + state.smooth.x * 0.12, state.y + state.smooth.y * 0.12, 0);
    group.scale.setScalar(state.s);
    mesh.scale.setScalar(swapEase * (1 + state.pulse * 0.06));
    mesh.rotation.y += dt * speed * 0.18 * e + state.spin + state.scrollVel * 0.0000035;
    mesh.rotation.x = lerp(mesh.rotation.x, -state.smooth.y * 0.5, k);
    mesh.rotation.z = lerp(mesh.rotation.z, -state.smooth.x * 0.25, k);

    cage.rotation.y -= dt * speed * 0.07;
    cage.rotation.x += dt * speed * 0.04;
    rings[0].rotation.z += dt * speed * 0.25;
    rings[1].rotation.z -= dt * speed * 0.18;
    group.rotation.x = state.smooth.y * -0.12;
    group.rotation.y = state.smooth.x * 0.18;

    const tm = uniforms.uTime.value;
    for (const s of sats) {
      const u = s.userData;
      const a = tm * u.sp * 1.6 + u.ph;
      s.position.set(Math.cos(a) * u.r, Math.sin(a) * u.r * Math.sin(u.tilt), Math.sin(a) * u.r * Math.cos(u.tilt));
      s.rotation.x += dt * 1.5; s.rotation.y += dt;
      s.scale.setScalar(swapEase * state.dim);
    }

    stars.rotation.y += dt * speed * 0.012;
    stars.rotation.x = lerp(stars.rotation.x, state.smooth.y * 0.05 + scrollY * 0.00012, k);
    stars.position.x = -state.smooth.x * 0.25;
    stars.position.z = lerp(stars.position.z, sBoost * 1.6, k * 2);

    // Punto donde el cursor toca la pieza
    group.updateMatrixWorld();
    let target = 0;
    if ((state.hasMouse || state.touchHit > 0) && state.swap > 0.9) {
      raycaster.setFromCamera(state.mouse, camera);
      inv.copy(mesh.matrixWorld).invert();
      localRay.copy(raycaster.ray).applyMatrix4(inv);
      if (localRay.intersectSphere(hitSphere, hitPoint)) {
        uniforms.uHit.value.lerp(hitPoint, 1 - Math.exp(-dt * 14));
        target = state.target === SCENES.ideas ? 0 : 1;
      }
    }
    state.touchHit = Math.max(0, (state.touchHit || 0) - dt);
    uniforms.uHitAmt.value = lerp(uniforms.uHitAmt.value, target, 1 - Math.exp(-dt * (target ? 6 : 2.5)));
    document.body.classList.toggle('over-piece', target > 0);

    renderer.render(scene, camera);
    if (firstFrame) { firstFrame = false; hideLoader(); }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

try {
  initScene();
} catch (err) {
  console.error(err);
  hideLoader();
}
