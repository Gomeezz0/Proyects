(() => {
  const $ = (id) => document.getElementById(id);

  /* Nav */
  const nav = $('nav');
  const burger = $('burger');
  const links = $('navLinks');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const setMenu = (open) => {
    links.classList.toggle('open', open);
    nav.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  };
  burger.addEventListener('click', () => setMenu(!links.classList.contains('open')));
  links.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* Aparición al hacer scroll */
  const items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach((el) => io.observe(el));
  } else {
    items.forEach((el) => el.classList.add('in'));
  }

  /* Calculadora */
  const eur0 = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' });
  const eur2 = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, useGrouping: 'always' });
  const num = new Intl.NumberFormat('es-ES', { useGrouping: 'always' });
  const signed = (v) => (v < 0 ? '−' : '') + eur0.format(Math.abs(v));

  const inputs = ['iCost', 'iUnits', 'iShip', 'iPrice', 'iFees'].map($);
  const calc = () => {
    const [cost, units, ship, price, fees] = inputs.map((i) => Number(i.value));
    const goods = cost * units;
    const invest = goods + ship;
    const revenue = price * units;
    const feeCost = revenue * (fees / 100);
    const profit = revenue - feeCost - invest;
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

    inputs.forEach((i) => {
      const pct = ((i.value - i.min) / (i.max - i.min)) * 100;
      i.style.setProperty('--fill', `${pct}%`);
    });
  };
  inputs.forEach((i) => i.addEventListener('input', calc));
  $('calcForm').addEventListener('submit', (e) => e.preventDefault());
  calc();

  /* Compra: pega aquí tu enlace de pago (Stripe, PayPal…) y el botón irá directo a él. */
  const PAYMENT_URL = '';
  if (PAYMENT_URL) {
    $('buyBtn').href = PAYMENT_URL;
    $('buyNote').textContent = 'Pago seguro en la pasarela. Al completarlo recibes tu acceso.';
  }

  $('year').textContent = new Date().getFullYear();
})();
