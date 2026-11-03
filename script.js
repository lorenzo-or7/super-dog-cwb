(function () {
  'use strict';

  var UNITS = [
    { id: 'vila-izabel', name: 'Vila Izabel', full: 'Água Verde / Vila Izabel', phone: '5541987926593', label: '(41) 98792-6593', address: 'R. Prof. Sebastião Paraná, 6', map: 'R. Prof. Sebastião Paraná, 6 - Vila Izabel, Curitiba - PR, 80320-070' },
    { id: 'capao-raso', name: 'Capão Raso', full: 'Capão Raso', phone: '5541998432534', label: '(41) 99843-2534', address: 'Av. Winston Churchill, 1988', map: 'Av. Winston Churchill, 1988 - Capão Raso, Curitiba - PR' },
    { id: 'novo-mundo', name: 'Novo Mundo', full: 'Novo Mundo', phone: '5541999970915', label: '(41) 99997-0915', address: 'R. São Francisco Ader, 34', map: 'R. São Francisco Ader, 34 - Novo Mundo, Curitiba - PR' }
  ];
  var OPEN = 18 * 60 + 30, CLOSE = 23 * 60 + 30;
  var DAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var money = function (v) { return 'R$ ' + v.toFixed(2).replace('.', ','); };
  var unitById = function (id) { return UNITS.filter(function (u) { return u.id === id; })[0] || null; };

  /* Tema */
  var root = document.documentElement;
  var themeMeta = $('meta[name="theme-color"]');
  var themeTimer;
  function paintTheme(t) {
    $$('[data-theme-set]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.themeSet === t)); });
    if (themeMeta) themeMeta.content = t === 'dark' ? '#1C1717' : '#FFC400';
  }
  $$('[data-theme-set]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.dataset.themeSet;
      if (!reduce.matches) {
        root.classList.add('theming');
        clearTimeout(themeTimer);
        themeTimer = setTimeout(function () { root.classList.remove('theming'); }, 420);
      }
      root.setAttribute('data-theme', t);
      store.set('superdog-tema', t);
      paintTheme(t);
    });
  });
  paintTheme(root.getAttribute('data-theme'));

  /* Aberto ou fechado, sempre no horário de Curitiba */
  var clockFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  var WEEK = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  function curitiba(date) {
    var p = {};
    clockFmt.formatToParts(date).forEach(function (x) { p[x.type] = x.value; });
    return { day: WEEK[p.weekday], mins: (+p.hour % 24) * 60 + (+p.minute) };
  }
  function span(m) {
    var h = Math.floor(m / 60), r = m % 60;
    if (!h) return r + ' min';
    return r ? h + 'h ' + r + 'min' : h + 'h';
  }
  function statusAt(date) {
    var c = curitiba(date), day = c.day, mins = c.mins;
    if (day !== 0 && mins >= OPEN && mins < CLOSE) {
      return { open: true, short: 'Aberto agora', long: 'Aberto agora. Fecha em ' + span(CLOSE - mins) + '.', chapa: 'A chapa está ligada', day: day };
    }
    if (day !== 0 && mins < OPEN) {
      return { open: false, short: 'Abre às 18:30', long: 'Fechado agora. Abre hoje às 18:30, daqui a ' + span(OPEN - mins) + '.', chapa: 'A chapa liga às 18:30', day: day };
    }
    if (day === 6) return { open: false, short: 'Abre segunda', long: 'Fechado agora. Abre segunda às 18:30.', chapa: 'A chapa volta segunda', day: day };
    if (day === 0) return { open: false, short: 'Abre segunda', long: 'Hoje a chapa descansa. Abre segunda às 18:30.', chapa: 'Hoje a chapa descansa', day: day };
    return { open: false, short: 'Abre amanhã', long: 'Fechado agora. Abre ' + DAY_NAMES[day + 1] + ' às 18:30.', chapa: 'A chapa volta amanhã', day: day };
  }
  function paintStatus() {
    var s = statusAt(new Date());
    $$('[data-status-text]').forEach(function (el) { el.textContent = s.short; });
    $$('[data-status-long]').forEach(function (el) { el.textContent = s.long; });
    $$('[data-chapa]').forEach(function (el) { el.textContent = s.chapa; });
    $$('.dot').forEach(function (el) { el.classList.toggle('is-open', s.open); });
    $$('#hours tr').forEach(function (tr) { tr.classList.toggle('today', +tr.dataset.day === s.day); });
  }
  paintStatus();
  setInterval(paintStatus, 30000);
  window.superDogStatus = statusAt;

  /* Comanda: estado declarado antes da unidade, que também pinta a comanda */
  var dialog = $('#comanda'), dock = $('#dock'), fab = $('#fab'), lines = $('#tab-lines'), send = $('#tab-send');

  /* Unidade escolhida */
  var unit = unitById(store.get('superdog-unidade'));
  var mapEl = $('#map'), mapLive = false;
  function mapSrc(u) { return 'https://www.google.com/maps?q=' + encodeURIComponent(u.map) + '&z=16&output=embed'; }
  function paintUnit() {
    $$('.unit').forEach(function (el) {
      var on = !!unit && el.dataset.unit === unit.id;
      el.classList.toggle('on', on);
      $('.unit-pick', el).setAttribute('aria-pressed', String(on));
    });
    $$('[data-order-label]').forEach(function (el) { el.textContent = unit ? 'Pedir em ' + unit.name : 'Pedir no WhatsApp'; });
    if (mapLive) mapEl.src = mapSrc(unit || UNITS[0]);
    paintTabUnits();
  }
  function chooseUnit(id, announce) {
    unit = unitById(id);
    store.set('superdog-unidade', id);
    paintUnit();
    if (announce) $('#live').textContent = 'Unidade ' + unit.name + ' selecionada.';
  }
  $$('.unit-pick').forEach(function (b) {
    b.addEventListener('click', function () { chooseUnit(b.closest('.unit').dataset.unit, true); });
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en, ob) {
      if (en[0].isIntersecting) { mapLive = true; mapEl.src = mapSrc(unit || UNITS[0]); ob.disconnect(); }
    }, { rootMargin: '600px' }).observe(mapEl);
  } else { mapLive = true; mapEl.src = mapSrc(unit || UNITS[0]); }

  /* Pedir: com unidade escolhida vai direto; sem ela, pergunta antes */
  function waUrl(u, text) { return 'https://wa.me/' + u.phone + '?text=' + encodeURIComponent(text); }
  var pick = $('#pick');
  var pickList = $('#pick-list');
  UNITS.forEach(function (u) {
    var a = document.createElement('a');
    a.className = 'pick-item';
    a.href = waUrl(u, 'Olá, Super Dog ' + u.name + '! Quero fazer um pedido.');
    a.target = '_blank';
    a.rel = 'noopener';
    a.innerHTML = '<span class="unit-name"></span><span class="unit-address"></span><span class="pick-phone"><svg aria-hidden="true"><use href="#i-wa"/></svg></span>';
    $('.unit-name', a).textContent = u.full;
    $('.unit-address', a).textContent = u.address;
    $('.pick-phone', a).appendChild(document.createTextNode(u.label));
    a.addEventListener('click', function () { chooseUnit(u.id); pick.close(); });
    pickList.appendChild(a);
  });
  $$('[data-order]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      if (unit) window.open(waUrl(unit, 'Olá, Super Dog ' + unit.name + '! Quero fazer um pedido.'), '_blank', 'noopener');
      else pick.showModal();
    });
  });
  $$('dialog').forEach(function (d) {
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
  });

  /* Comanda */
  var tab = {};
  try { tab = JSON.parse(sessionStorage.getItem('superdog-comanda')) || {}; } catch (e) { tab = {}; }
  var items = $$('.item');
  var prices = {};
  items.forEach(function (b) {
    prices[b.dataset.item] = +b.dataset.price;
    var add = document.createElement('span');
    add.className = 'item-add';
    add.setAttribute('aria-hidden', 'true');
    add.textContent = '+';
    b.appendChild(add);
    b.addEventListener('click', function () {
      tab[b.dataset.item] = (tab[b.dataset.item] || 0) + 1;
      b.classList.remove('bump');
      void b.offsetWidth;
      b.classList.add('bump');
      paintTab();
      $('#live').textContent = b.dataset.item + ' na comanda. Quantidade: ' + tab[b.dataset.item] + '.';
    });
  });
  function totals() {
    var n = 0, sum = 0;
    Object.keys(tab).forEach(function (k) { n += tab[k]; sum += tab[k] * (prices[k] || 0); });
    return { n: n, sum: sum };
  }
  function tabMessage() {
    var t = totals(), who = unit ? 'Super Dog ' + unit.name : 'Super Dog';
    var out = ['Olá, ' + who + '! Quero pedir:', ''];
    Object.keys(tab).forEach(function (k) { out.push(tab[k] + 'x ' + k + ' (' + money(tab[k] * prices[k]) + ')'); });
    var mode = $('input[name="tab-mode"]:checked');
    out.push('', 'Total dos lanches: ' + money(t.sum), 'Forma: ' + (mode ? mode.value : 'Entrega'));
    return out.join('\n');
  }
  function paintSend() {
    if (unit) { send.href = waUrl(unit, tabMessage()); send.removeAttribute('aria-disabled'); }
    else { send.href = '#unidades'; send.setAttribute('aria-disabled', 'true'); }
  }
  function paintTab() {
    var t = totals();
    try { sessionStorage.setItem('superdog-comanda', JSON.stringify(tab)); } catch (e) {}
    items.forEach(function (b) {
      var q = tab[b.dataset.item] || 0, price = money(prices[b.dataset.item]);
      b.classList.toggle('in-tab', q > 0);
      $('.item-add', b).textContent = q > 0 ? q + 'x' : '+';
      b.setAttribute('aria-label', 'Adicionar ' + b.dataset.item + ', ' + price + (q ? ', ' + q + ' na comanda' : ''));
    });
    dock.hidden = t.n === 0;
    fab.classList.toggle('is-hidden', t.n > 0);
    $('#dock-count').textContent = t.n === 1 ? '1 item' : t.n + ' itens';
    $('#dock-total').textContent = money(t.sum);
    $('#tab-total').textContent = money(t.sum);
    lines.textContent = '';
    Object.keys(tab).forEach(function (k) {
      var li = document.createElement('li');
      var name = document.createElement('span');
      name.className = 'tab-name';
      name.textContent = k;
      var step = document.createElement('span');
      step.className = 'tab-step';
      [['−', -1, 'Tirar um ' + k], [String(tab[k]), 0, ''], ['+', 1, 'Mais um ' + k]].forEach(function (c) {
        if (!c[1]) {
          var q = document.createElement('span');
          q.textContent = c[0];
          step.appendChild(q);
          return;
        }
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = c[0];
        b.setAttribute('aria-label', c[2]);
        b.addEventListener('click', function () {
          tab[k] += c[1];
          if (tab[k] <= 0) delete tab[k];
          paintTab();
          if (!totals().n) { dialog.close(); return; }
          var again = $$('button', lines).filter(function (x) { return x.getAttribute('aria-label') === c[2]; })[0];
          (again || $('.sheet-close button', dialog)).focus();
        });
        step.appendChild(b);
      });
      var price = document.createElement('span');
      price.className = 'tab-price';
      price.textContent = money(tab[k] * prices[k]);
      li.appendChild(name); li.appendChild(step); li.appendChild(price);
      lines.appendChild(li);
    });
    paintSend();
  }
  function paintTabUnits() {
    var box = $('#tab-units');
    if (!box.children.length) {
      UNITS.forEach(function (u) {
        var l = document.createElement('label');
        l.innerHTML = '<input type="radio" name="tab-unit"><span></span>';
        $('input', l).value = u.id;
        $('span', l).textContent = u.name;
        $('input', l).addEventListener('change', function () { chooseUnit(u.id, true); paintSend(); });
        box.appendChild(l);
      });
    }
    $$('input', box).forEach(function (i) { i.checked = !!unit && i.value === unit.id; });
  }
  dock.addEventListener('click', function () { dialog.showModal(); });
  $('#tab-clear').addEventListener('click', function () { tab = {}; paintTab(); dialog.close(); });
  $$('input[name="tab-mode"]').forEach(function (i) { i.addEventListener('change', paintSend); });
  send.addEventListener('click', function (e) {
    if (unit) return;
    e.preventDefault();
    var box = $('#tab-units');
    box.classList.remove('ask');
    void box.offsetWidth;
    box.classList.add('ask');
    $('input', box).focus();
    $('#live').textContent = 'Escolha a unidade antes de enviar.';
  });
  paintUnit();
  paintTab();

  /* Foto do cardápio acompanha a linha ou a categoria */
  var photos = $$('.menu-photo img');
  var showPhoto = function (name) {
    photos.forEach(function (p) { p.classList.toggle('on', p.dataset.photo === name); });
  };
  var tabs = $$('.menu-tabs a');
  var cats = $$('.cat');
  var currentCat = cats[0];
  items.forEach(function (b) {
    var cat = b.closest('.cat');
    var over = function () { showPhoto(b.dataset.photo || cat.dataset.catPhoto); };
    b.addEventListener('pointerenter', over);
    b.addEventListener('focus', over);
    b.addEventListener('pointerleave', function () { showPhoto(currentCat.dataset.catPhoto); });
  });
  if ('IntersectionObserver' in window) {
    var catIO = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        currentCat = e.target;
        showPhoto(currentCat.dataset.catPhoto);
        tabs.forEach(function (t) { t.classList.toggle('on', t.getAttribute('href') === '#' + currentCat.id); });
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    cats.forEach(function (c) { catIO.observe(c); });
  }

  /* Menu no celular */
  var menuBtn = $('.nav-menu'), links = $('#nav-links');
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? 'Fechar' : 'Menu';
    links.classList.toggle('open', open);
  }
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  $$('a', links).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
  });

  /* Vídeo: toca quando visível e pode ser pausado */
  var video = $('#video'), vBtn = $('#video-toggle'), userPaused = reduce.matches;
  function paintVideoBtn() {
    var playing = !userPaused;
    vBtn.textContent = playing ? 'Pausar' : 'Reproduzir';
    vBtn.setAttribute('aria-pressed', String(!playing));
  }
  paintVideoBtn();
  vBtn.addEventListener('click', function () {
    userPaused = !userPaused;
    if (userPaused) video.pause(); else video.play().catch(function () {});
    paintVideoBtn();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting && !userPaused) video.play().catch(function () {});
      else video.pause();
    }, { threshold: 0.15 }).observe(video);
  }

  /* Cartão fidelidade: os carimbos entram com a rolagem */
  var grid = $('.card-grid'), TOTAL = 15;
  for (var i = 0; i < TOTAL; i++) {
    var cell = document.createElement('span');
    cell.className = 'cell';
    cell.style.setProperty('--i', i);
    cell.innerHTML = i === TOTAL - 1 ? '<b class="stamp stamp-win">Ganhou</b>' : '<b class="stamp">S</b>';
    grid.appendChild(cell);
  }

  /* Entradas */
  var counted = $('[data-count]');
  function runCount() {
    if (reduce.matches || !counted) return;
    var target = +counted.dataset.count, t0 = performance.now();
    (function tick(t) {
      var k = Math.min(1, (t - t0) / 1300);
      counted.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }
  if ('IntersectionObserver' in window) {
    var parents = new Map();
    var io = new IntersectionObserver(function (en, ob) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        ob.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    $$('.r').forEach(function (el) {
      var p = el.closest('section') || document.body, n = parents.get(p) || 0;
      el.style.setProperty('--d', Math.min(n, 7) * 70 + 'ms');
      parents.set(p, n + 1);
      io.observe(el);
    });
    var once = function (el, fn, opts) {
      if (!el) return;
      new IntersectionObserver(function (en, ob) {
        if (en[0].isIntersecting) { fn(); ob.disconnect(); }
      }, opts || { threshold: 0.35 }).observe(el);
    };
    once($('.proof-numbers'), runCount);
    once($('#card'), function () { $('#card').classList.add('stamping'); });
  } else {
    $$('.r').forEach(function (el) { el.classList.add('in'); });
    $('#card').classList.add('stamping');
  }

  /* Movimento ligado à rolagem: só transform */
  var bandEl = $('.band'), bandTrack = $('.band-track'), menuLists = $('.menu-lists'), nav = $('#nav'), heroImg = $('[data-parallax]'), closingImg = $('.closing-object img');
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY, vh = window.innerHeight;
    nav.classList.toggle('scrolled', y > 8);
    fab.classList.toggle('show', y > vh * 0.6);
    var ml = menuLists.getBoundingClientRect();
    fab.classList.toggle('in-menu', ml.top < vh && ml.bottom > vh * 0.35);
    if (reduce.matches) return;
    if (y < vh * 1.2) heroImg.style.transform = 'translate3d(0,' + (y * -0.07).toFixed(1) + 'px,0) rotate(' + (y * 0.006).toFixed(2) + 'deg)';
    var b = bandEl.getBoundingClientRect();
    if (b.top < vh && b.bottom > 0) bandTrack.style.transform = 'translate3d(' + (-(y * 0.6) % (bandTrack.scrollWidth / 2)).toFixed(1) + 'px,0,0)';
    var r = closingImg.getBoundingClientRect();
    if (r.top < vh && r.bottom > 0) closingImg.style.transform = 'translate3d(0,' + (((r.top + r.height / 2) - vh / 2) * 0.05).toFixed(1) + 'px,0)';
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
  root.classList.add('ready');
})();
