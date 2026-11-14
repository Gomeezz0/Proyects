(() => {
  const $ = (id) => document.getElementById(id);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Compra: pega aquí tu enlace de pago (Stripe, PayPal…) y el botón irá directo a él. */
  const PAYMENT_URL = '';
  const WHATSAPP = '34605862660';
  const ORDER_TEXT = 'Hola Gomeez, quiero comprar el programa de importaciones (1.800 €).';

  const num = new Intl.NumberFormat('es-ES', { useGrouping: 'always' });
  const eur0 = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' });
  const eur2 = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, useGrouping: 'always' });

  /* Barra superior y barra de compra flotante */
  const bar = $('bar'), dock = $('dock'), buy = $('comprar');
  const onScroll = () => {
    bar.classList.toggle('scrolled', window.scrollY > 30);
    const r = buy.getBoundingClientRect();
    const inBuy = r.top < window.innerHeight * 0.8 && r.bottom > 0;
    dock.classList.toggle('show', window.scrollY > window.innerHeight * 0.9 && !inBuy);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Contadores */
  const countUp = (el) => {
    const end = Number(el.dataset.count), pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    const show = (v) => { el.textContent = pre + num.format(Math.round(v)) + suf; };
    if (reduce) return show(end);
    const t0 = performance.now(), dur = 1400;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      show(end * (1 - Math.pow(1 - k, 4)));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /* Aparición al hacer scroll */
  const items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        entry.target.querySelectorAll('[data-count]').forEach(countUp);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add('in'));
  }

  /* Brillo que sigue al cursor en las tarjetas */
  document.querySelectorAll('.glow-card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  /* Globo con rutas */
  const canvas = $('globe');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const rad = Math.PI / 180;
    const vec = (lat, lon) => [Math.cos(lat * rad) * Math.sin(lon * rad), Math.sin(lat * rad), Math.cos(lat * rad) * Math.cos(lon * rad)];
    const dots = [];
    for (let i = 0; i < 1100; i++) {
      const y = 1 - (i / 1099) * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996323;
      dots.push([Math.cos(a) * r, y, Math.sin(a) * r]);
    }
    const dest = vec(39.5, -0.4);
    const routes = [[22.5, 114], [30, 121.5], [21, 105.8], [19, 72.8], [41, 29]].map(([la, lo], i) => {
      const a = vec(la, lo), dot = a[0] * dest[0] + a[1] * dest[1] + a[2] * dest[2], om = Math.acos(dot), pts = [];
      for (let s = 0; s <= 48; s++) {
        const u = s / 48, k1 = Math.sin((1 - u) * om) / Math.sin(om), k2 = Math.sin(u * om) / Math.sin(om);
        const lift = 1 + 0.22 * Math.sin(Math.PI * u) * Math.min(1, om);
        pts.push([(a[0] * k1 + dest[0] * k2) * lift, (a[1] * k1 + dest[1] * k2) * lift, (a[2] * k1 + dest[2] * k2) * lift]);
      }
      return { a, pts, off: i * 0.21, speed: 0.11 + i * 0.012 };
    });

    let W = 0, H = 0, R = 0, cx = 0, cy = 0, visible = true, raf = 0;
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2), b = canvas.getBoundingClientRect();
      W = b.width; H = b.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(W * 0.46, H * 0.62); cx = W / 2; cy = H * 0.56;
    };
    const tilt = 0.42, ct = Math.cos(tilt), st = Math.sin(tilt);
    const project = (p, ang) => {
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const x = p[0] * ca - p[2] * sa, z0 = p[0] * sa + p[2] * ca;
      const y = p[1] * ct - z0 * st, z = p[1] * st + z0 * ct;
      return [cx + x * R, cy - y * R, z];
    };
    const draw = (t) => {
      const ang = 57 * rad + Math.sin(t * 0.00022) * 0.5;
      ctx.clearRect(0, 0, W, H);
      const halo = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.25);
      halo.addColorStop(0, 'rgba(37,224,127,.16)'); halo.addColorStop(1, 'rgba(37,224,127,0)');
      ctx.fillStyle = halo; ctx.fillRect(0, 0, W, H);
      for (const d of dots) {
        const [x, y, z] = project(d, ang);
        if (z < -0.05) continue;
        ctx.fillStyle = `rgba(141,255,192,${0.12 + z * 0.5})`;
        ctx.fillRect(x, y, 1.6, 1.6);
      }
      ctx.lineCap = 'round';
      for (const r of routes) {
        const pp = r.pts.map((p) => project(p, ang));
        ctx.beginPath();
        let pen = false;
        for (const [x, y, z] of pp) {
          if (z < -0.15) { pen = false; continue; }
          pen ? ctx.lineTo(x, y) : ctx.moveTo(x, y); pen = true;
        }
        ctx.strokeStyle = 'rgba(37,224,127,.38)'; ctx.lineWidth = 1.2; ctx.stroke();
        const u = ((t * 0.001 * r.speed + r.off) % 1) * 48, i = Math.floor(u), f = u - i;
        const p0 = pp[i], p1 = pp[Math.min(i + 1, 48)];
        if (p0[2] > -0.15) {
          const x = p0[0] + (p1[0] - p0[0]) * f, y = p0[1] + (p1[1] - p0[1]) * f;
          ctx.shadowColor = '#25e07f'; ctx.shadowBlur = 16; ctx.fillStyle = '#d6ffe8';
          ctx.beginPath(); ctx.arc(x, y, 3, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
        }
        const [ax, ay, az] = project(r.a, ang);
        if (az > 0) { ctx.fillStyle = '#25e07f'; ctx.beginPath(); ctx.arc(ax, ay, 2.6, 0, 6.283); ctx.fill(); }
      }
      const [dx, dy, dz] = project(dest, ang);
      if (dz > 0) {
        const pulse = (t * 0.001) % 1.6 / 1.6;
        ctx.strokeStyle = `rgba(141,255,192,${1 - pulse})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(dx, dy, 5 + pulse * 20, 0, 6.283); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.shadowColor = '#25e07f'; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.arc(dx, dy, 4.5, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
      }
    };
    const loop = (t) => { if (visible) draw(t); raf = requestAnimationFrame(loop); };
    size();
    window.addEventListener('resize', () => { size(); if (reduce) draw(4000); });
    if (reduce) draw(4000);
    else {
      if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);
      raf = requestAnimationFrame(loop);
    }
  }

  /* Carrusel de módulos */
  const track = $('carTrack'), dotsBox = $('carDots');
  const cards = [...track.children];
  cards.forEach(() => dotsBox.appendChild(document.createElement('i')));
  const dotEls = [...dotsBox.children];
  const setActive = () => {
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = 0, bd = Infinity;
    cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
    cards.forEach((c, i) => c.classList.toggle('active', i === best));
    dotEls.forEach((d, i) => d.classList.toggle('on', i === best));
    return best;
  };
  const go = (dir) => {
    const i = Math.max(0, Math.min(cards.length - 1, setActive() + dir)), c = cards[i];
    track.scrollTo({ left: c.offsetLeft + c.offsetWidth / 2 - track.clientWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
  };
  $('carPrev').addEventListener('click', () => go(-1));
  $('carNext').addEventListener('click', () => go(1));
  track.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); });
  track.addEventListener('scroll', () => requestAnimationFrame(setActive), { passive: true });
  window.addEventListener('resize', setActive);
  setActive();

  /* Simulador */
  const signed = (v) => (v < 0 ? '−' : '') + eur0.format(Math.abs(v));
  const inputs = ['iCost', 'iUnits', 'iShip', 'iPrice', 'iFees'].map($);
  const calc = () => {
    const [cost, units, ship, price, fees] = inputs.map((i) => Number(i.value));
    const goods = cost * units, invest = goods + ship, revenue = price * units;
    const feeCost = revenue * (fees / 100), profit = revenue - feeCost - invest;
    const roi = invest > 0 ? (profit / invest) * 100 : 0;
    $('oCost').textContent = eur2.format(cost);
    $('oUnits').textContent = num.format(units);
    $('oShip').textContent = eur0.format(ship);
    $('oPrice').textContent = eur2.format(price);
    $('oFees').textContent = `${fees} %`;
    $('rGoods').textContent = eur0.format(goods);
    $('rShip').textContent = eur0.format(ship);
    $('rInvest').textContent = eur0.format(invest);
    $('rLanded').textContent = eur2.format(invest / units);
    $('rRevenue').textContent = eur0.format(revenue);
    $('rFees').textContent = signed(-feeCost);
    $('rProfit').textContent = signed(profit);
    $('rProfit').classList.toggle('neg', profit < 0);
    $('rRoi').textContent = `${num.format(Math.round(roi)).replace('-', '−')} %`;
    $('roiFill').style.width = `${Math.max(0, Math.min(100, roi / 3))}%`;
    inputs.forEach((i) => i.style.setProperty('--fill', `${((i.value - i.min) / (i.max - i.min)) * 100}%`));
  };
  inputs.forEach((i) => i.addEventListener('input', calc));
  $('calcForm').addEventListener('submit', (e) => e.preventDefault());
  calc();

  /* Cuestionario y botón de compra */
  const steps = [...document.querySelectorAll('.q-step')], done = $('qDone'), dashes = [...$('qDashes').children];
  const answers = [];
  const buyBtn = $('buyBtn');
  const setBuyLink = () => {
    if (PAYMENT_URL) { buyBtn.href = PAYMENT_URL; return; }
    const extra = answers.filter(Boolean).map((a) => `\n• ${a}`).join('');
    buyBtn.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(ORDER_TEXT + (extra ? `\n\nSobre mí:${extra}` : ''))}`;
  };
  const showStep = (n) => {
    steps.forEach((s, i) => { s.hidden = i !== n; });
    done.hidden = n < steps.length;
    dashes.forEach((d, i) => d.classList.toggle('on', i < Math.min(n + 1, steps.length)));
    $('qCount').textContent = n < steps.length ? `Paso ${n + 1} / ${steps.length}` : 'Completado';
  };
  steps.forEach((step, n) => {
    step.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      answers[n] = `${step.dataset.q}: ${b.lastChild.textContent.trim()}`;
      setBuyLink();
      showStep(n + 1);
    }));
  });
  $('qReset').addEventListener('click', () => { answers.length = 0; setBuyLink(); showStep(0); });
  if (PAYMENT_URL) $('buyNote').textContent = 'Pago seguro en la pasarela. Al completarlo recibes tu acceso.';
  setBuyLink();
  showStep(0);

  $('year').textContent = new Date().getFullYear();
})();
