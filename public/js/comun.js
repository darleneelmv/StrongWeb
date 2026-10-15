/* =====================================================================
   Strong Gym · piezas compartidas por la página de inicio y la de
   productos (cabecera, pie, WhatsApp, tarjetas, galería, videos).
   ===================================================================== */
(function (raiz) {
  'use strict';
  const SG = (raiz.SG = raiz.SG || {});
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dinero = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
  const digitos = (t) => String(t || '').replace(/\D/g, '');
  const urlOk = (u) => (u && /^https?:\/\//i.test(u) ? u : null);
  const lista = (t) => String(t || '').split(',').map((x) => x.trim()).filter(Boolean);
  function wa(num, texto) {
    const d = digitos(num);
    if (!d) return null;
    return `https://wa.me/${d.length === 10 ? `52${d}` : d}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
  }
  Object.assign(SG, { $, $$, esc, dinero, digitos, urlOk, lista, wa });

  // ---------- Íconos ----------
  SG.I = {
    wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9s-.5-.1-.7.1-.8.9-.9 1.1-.3.2-.6.1a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.6-2c-.2-.3 0-.5.1-.6l.4-.5.3-.5v-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.1 1.1 0 0 0-.8.4 3.4 3.4 0 0 0-1 2.5 5.9 5.9 0 0 0 1.2 3.1 13.4 13.4 0 0 0 5.2 4.6c.7.3 1.3.5 1.7.6a4.2 4.2 0 0 0 1.9.1 3.2 3.2 0 0 0 2.1-1.5 2.6 2.6 0 0 0 .2-1.5c-.1-.1-.3-.2-.6-.3zM12 21.8a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4a9.8 9.8 0 1 1 8.3 4.6zm0-21.6A11.8 11.8 0 0 0 1.9 17.9L.2 24l6.3-1.6A11.8 11.8 0 1 0 12 .2z"/></svg>',
    tel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
    fb: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8.5V6.6c0-.9.6-1.1 1-1.1h2.6V1.6L14 1.6c-4 0-4.9 3-4.9 4.9v2H6.8v4h2.4V22H14v-9.5h3.2l.4-4H14z"/></svg>',
    ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
    tt: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.8 5.8 0 1 0 5 5.7V9.1a7.4 7.4 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.3-1.6z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    reloj: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    msg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/></svg>',
    estrella: '<svg viewBox="0 0 40 40" aria-hidden="true"><path fill="currentColor" d="M20 0l4.2 13.4L38 9.8l-9.6 10.2L38 30.2l-13.8-3.6L20 40l-4.2-13.4L2 30.2l9.6-10.2L2 9.8l13.8 3.6z"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L7.5 3.64A1 1 0 0 0 6 4.5z"/></svg>',
    lupa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    // Ilustraciones para productos sin foto y para "lo que encuentras"
    pesa: '<svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true"><rect x="13" y="21" width="22" height="6" rx="2"/><rect x="7" y="11" width="7" height="26" rx="2.5"/><rect x="34" y="11" width="7" height="26" rx="2.5"/><rect x="2" y="16" width="5" height="16" rx="2"/><rect x="41" y="16" width="5" height="16" rx="2"/></svg>',
    corazon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>',
    persona: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="2.5"/><path d="M5 10h14M12 10v5m0 0-3 6m3-6 3 6"/></svg>',
    vaso: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8h12l-1.5 13h-9zM5 8a7 3 0 0 1 14 0M14 8l2-6"/></svg>',
    bote: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" aria-hidden="true"><rect x="12" y="4" width="24" height="7" rx="2"/><path d="M10 15a4 4 0 0 1 4-4h20a4 4 0 0 1 4 4v25a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4z"/><path d="M10 22h28v14H10z" fill="currentColor" fill-opacity=".25"/></svg>',
    botella: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" aria-hidden="true"><path d="M19 3h10v6l4 6v26a4 4 0 0 1-4 4H19a4 4 0 0 1-4-4V15l4-6z"/><path d="M15 22h18v12H15z" fill="currentColor" fill-opacity=".25"/></svg>',
    playera: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" aria-hidden="true"><path d="M17 5c1 3 4 5 7 5s6-2 7-5l11 5-4 9-5-2v26H15V17l-5 2-4-9z"/></svg>',
    escudo: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 3 6 9v13c0 11 7.6 20.4 18 23 10.4-2.6 18-12 18-23V9z" fill="currentColor"/><circle cx="24" cy="19" r="5" fill="#fff"/><path d="M15 33c1.5-5 5-7 9-7s7.5 2 9 7" fill="#fff"/><path d="m24 29 1.6 3.2 3.4.4-2.5 2.3.7 3.4-3.2-1.7-3.2 1.7.7-3.4-2.5-2.3 3.4-.4z" fill="currentColor" stroke="#fff" stroke-width="1"/></svg>',
    calendario: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M7.5 14h.01M12 14h.01M16.5 14h.01M7.5 17.5h.01M12 17.5h.01" stroke-width="2.6"/></svg>',
    correr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="15" cy="4" r="2"/><path d="m7 21 3-6 3 2v5M5 12l3-3 4-1 3 4 3 1M10 15l2-5"/></svg>',
    bolsa: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" aria-hidden="true"><path d="M8 15h32l-3 28H11z"/><path d="M17 19v-7a7 7 0 0 1 14 0v7"/></svg>',
  };
  const I = SG.I;
  SG.iconoVentaja = (titulo, i) => {
    const t = String(titulo).toLowerCase();
    if (/cardio|correr|bici|caminadora/.test(t)) return I.corazon;
    if (/asesor|entrenador|coach|clase|rutina/.test(t)) return I.persona;
    if (/prote|malteada|barra|suplement|bebida/.test(t)) return I.vaso;
    if (/pesa|fuerza|peso|m[aá]quina/.test(t)) return I.pesa;
    return [I.pesa, I.corazon, I.persona, I.vaso][i % 4];
  };
  function iconoProducto(cat) {
    const t = String(cat || '').toLowerCase();
    if (/suplement|prote|creatina/.test(t)) return I.bote;
    if (/bebida|agua/.test(t)) return I.botella;
    if (/ropa|playera|gorra/.test(t)) return I.playera;
    if (/accesori|pesa/.test(t)) return I.pesa;
    return I.bolsa;
  }

  // ---------- Datos ----------
  SG.cargar = async function cargar() {
    try {
      const r = await fetch('/api/contenido', { credentials: 'same-origin' });
      if (!r.ok) throw new Error();
      return await r.json();
    } catch (e) {
      return { sitio: {}, productos: [], fotos: [], videos: [], promociones: [], planes: [] };
    }
  };

  // ---------- Cabecera, menú, pie y WhatsApp ----------
  SG.armarMarco = function armarMarco(d, pagina) {
    const s = d.sitio || {};
    const nombre = s.nombre || 'Strong Gym';
    const ciudad = s.ciudad || '';
    $$('[data-nombre]').forEach((el) => { el.textContent = nombre; });
    $$('[data-ciudad]').forEach((el) => { el.textContent = ciudad; });

    // Quita del menú las secciones que están vacías
    const hay = {
      videos: (d.videos || []).length, galeria: (d.fotos || []).length, planes: (d.planes || []).length,
      promociones: (d.promociones || []).length, productos: (d.productos || []).length,
    };
    $$('[data-si]').forEach((a) => { if (!hay[a.dataset.si]) a.remove(); });

    const aviso = $('#aviso');
    if (aviso && s.aviso) { aviso.textContent = s.aviso; aviso.hidden = false; }

    const ws = s.whatsapp;
    const hola = `Hola, quiero información sobre ${nombre}.`;
    $$('[data-wa]').forEach((a) => {
      if (!ws) { a.remove(); return; }
      a.href = wa(ws, a.dataset.wa || hola);
      a.target = '_blank'; a.rel = 'noopener';
    });
    if (ws) {
      const b = document.createElement('a');
      b.className = 'wa-flota';
      b.href = wa(ws, hola);
      b.target = '_blank'; b.rel = 'noopener';
      b.setAttribute('aria-label', 'Escríbenos por WhatsApp');
      b.innerHTML = I.wa;
      document.body.appendChild(b);
    }

    // Menú en celular
    const bMenu = $('#btn-menu');
    const menu = $('#menu-movil');
    menu.innerHTML = $('#nav').innerHTML + (ws ? `<a class="boton boton-wa" href="${esc(wa(ws, hola))}" target="_blank" rel="noopener">${I.wa} Escríbenos</a>` : '');
    const alternar = (abrir) => {
      bMenu.setAttribute('aria-expanded', String(abrir));
      bMenu.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú');
      menu.hidden = !abrir;
      document.body.classList.toggle('bloqueado', abrir);
    };
    bMenu.addEventListener('click', () => alternar(menu.hidden));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) alternar(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) alternar(false); });

    // Pie
    const redes = SG.contactos(s).filter(([h]) => /^https?:/.test(h) && !/wa\.me/.test(h));
    $('#pie').innerHTML = `<div class="pie-fila">
      <span class="pie-marca"><img src="/img/logo.jpg" alt="" width="40" height="40">${esc(nombre)}</span>
      ${redes.length ? `<div class="pie-redes">${redes.map(([h, ic, t]) => `<a href="${esc(h)}" target="_blank" rel="noopener" aria-label="${esc(t)}">${ic}</a>`).join('')}</div>` : ''}
      <span>© ${new Date().getFullYear()} ${esc(nombre)}${ciudad ? ` ${esc(ciudad)}` : ''}</span>
    </div>`;
    if (pagina === 'productos') $$('#nav a, #menu-movil a').forEach((a) => { if (a.getAttribute('href') === '/productos') a.classList.add('actual'); });
  };

  SG.contactos = (s) => [
    s.whatsapp && [wa(s.whatsapp, `Hola, quiero información sobre ${s.nombre || 'Strong Gym'}.`), I.wa, `WhatsApp ${s.whatsapp}`],
    s.telefono && [`tel:${digitos(s.telefono)}`, I.tel, `Llamar al ${s.telefono}`],
    s.email && [`mailto:${s.email}`, I.mail, s.email],
    urlOk(s.facebook) && [s.facebook, I.fb, 'Facebook'],
    urlOk(s.instagram) && [s.instagram, I.ig, 'Instagram'],
    urlOk(s.tiktok) && [s.tiktok, I.tt, 'TikTok'],
  ].filter(Boolean);

  // ---------- Tarjeta de producto ----------
  SG.tarjetaProducto = function tarjetaProducto(p, i, s) {
    const color = /^#[0-9a-f]{6}$/i.test(p.color || '') ? p.color : '';
    const esMalteada = /malteada|batido|licuado|shake/i.test(p.categoria || '') || (color && !p.imagen);
    let img;
    if (p.imagen) img = `<button type="button" class="prod-img" data-ampliar="${esc(p.imagen)}" data-titulo="${esc(p.nombre)}" aria-label="Ver foto de ${esc(p.nombre)}"><img src="${esc(p.imagen)}" alt="${esc(p.nombre)}" loading="lazy"></button>`;
    else if (esMalteada && SG.vasoSVG) img = `<div class="prod-img sin-foto" style="--c:${esc(color || '#143B7A')}">${SG.vasoSVG(color || '#D3121F', { id: `p${i}` })}</div>`;
    else img = `<div class="prod-img sin-foto" style="--c:${esc(color || '#143B7A')}"><span class="prod-icono">${iconoProducto(p.categoria)}</span></div>`;
    const antes = Number(p.precio_antes) > Number(p.precio) ? `<s>Antes ${esc(dinero(p.precio_antes))}</s>` : '';
    const precio = p.precio !== null && p.precio !== undefined && p.precio !== '' ? `<p class="precio">${antes}${esc(dinero(p.precio))}<small>MXN</small></p>` : '<p class="precio" style="font-size:1.1rem">Pregunta precio</p>';
    const pedir = s && s.whatsapp ? `<a class="prod-pedir" href="${esc(wa(s.whatsapp, `Hola, me interesa: ${p.nombre}${p.precio ? ` (${dinero(p.precio)})` : ''}.`))}" target="_blank" rel="noopener" aria-label="Pedir ${esc(p.nombre)} por WhatsApp">${I.wa}</a>` : '';
    return `<article class="prod rev" style="--i:${i % 4}">
      ${p.etiqueta ? `<span class="prod-tag">${esc(p.etiqueta)}</span>` : ''}
      ${img}
      <div class="prod-cuerpo">
        ${p.categoria ? `<span class="prod-cat">${esc(p.categoria)}</span>` : ''}
        <h3>${esc(p.nombre)}</h3>
        ${p.descripcion ? `<p>${esc(p.descripcion)}</p>` : ''}
        <div class="prod-pie">${precio}${pedir}</div>
      </div>
    </article>`;
  };

  // ---------- Ver fotos en grande ----------
  let lbFotos = [];
  let lbI = 0;
  function lightbox() {
    let lb = $('#lightbox');
    if (lb) return lb;
    lb = document.createElement('div');
    lb.id = 'lightbox'; lb.className = 'lightbox'; lb.hidden = true;
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Foto');
    lb.innerHTML = '<button class="lb-cerrar" type="button" aria-label="Cerrar">×</button><button class="lb-ant" type="button" aria-label="Anterior">‹</button><figure><img alt=""><figcaption></figcaption></figure><button class="lb-sig" type="button" aria-label="Siguiente">›</button>';
    document.body.appendChild(lb);
    const cerrar = () => { lb.hidden = true; document.body.classList.remove('bloqueado'); };
    const mover = (n) => { lbI = (lbI + n + lbFotos.length) % lbFotos.length; mostrar(); };
    lb.addEventListener('click', (e) => {
      if (e.target === lb || e.target.closest('.lb-cerrar')) cerrar();
      else if (e.target.closest('.lb-ant')) mover(-1);
      else if (e.target.closest('.lb-sig')) mover(1);
    });
    addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'Escape') cerrar();
      if (e.key === 'ArrowLeft') mover(-1);
      if (e.key === 'ArrowRight') mover(1);
    });
    let x0 = null;
    lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) mover(dx < 0 ? 1 : -1); x0 = null; });
    return lb;
  }
  function mostrar() {
    const lb = lightbox();
    const f = lbFotos[lbI];
    $('img', lb).src = f.imagen; $('img', lb).alt = f.titulo || '';
    $('figcaption', lb).textContent = f.titulo || '';
    $$('.lb-ant, .lb-sig', lb).forEach((b) => { b.hidden = lbFotos.length < 2; });
  }
  SG.abrirFotos = function abrirFotos(fotos, i) {
    lbFotos = fotos; lbI = i;
    const lb = lightbox();
    mostrar();
    lb.hidden = false;
    document.body.classList.add('bloqueado');
    $('.lb-cerrar', lb).focus();
  };
  // Cualquier imagen de producto se puede ampliar
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ampliar]');
    if (b) SG.abrirFotos([{ imagen: b.dataset.ampliar, titulo: b.dataset.titulo }], 0);
  });

  // ---------- Videos ----------
  SG.infoVideo = function infoVideo(v) {
    if (v.archivo) return { tipo: 'archivo', src: v.archivo, portada: v.portada, red: 'Video' };
    const u = String(v.url || '');
    let m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i);
    if (m) return { tipo: 'youtube', id: m[1], vertical: /shorts\//i.test(u), portada: v.portada || `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`, red: 'YouTube' };
    m = u.match(/instagram\.com\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([\w-]+)/i);
    if (m) return { tipo: 'instagram', src: `https://www.instagram.com/${m[1] === 'p' ? 'p' : 'reel'}/${m[2]}/embed/`, vertical: true, portada: v.portada, red: 'Instagram' };
    m = u.match(/tiktok\.com\/.*\/video\/(\d+)/i);
    if (m) return { tipo: 'tiktok', src: `https://www.tiktok.com/embed/v2/${m[1]}`, vertical: true, portada: v.portada, red: 'TikTok' };
    if (/facebook\.com|fb\.watch/i.test(u)) return { tipo: 'facebook', src: u, vertical: /\/reel\//i.test(u), portada: v.portada, red: 'Facebook' };
    return { tipo: 'enlace', src: u, portada: v.portada, red: 'Enlace' };
  };
  SG.marcoVideo = function marcoVideo(v, auto) {
    const x = SG.infoVideo(v);
    const tit = esc(v.titulo || 'Video');
    if (x.tipo === 'archivo') {
      return `<div class="video-marco"><video src="${esc(x.src)}" controls playsinline preload="metadata" ${x.portada ? `poster="${esc(x.portada)}"` : ''} ${auto ? 'autoplay' : ''}></video></div>`;
    }
    if (x.tipo === 'youtube') {
      if (auto) return `<div class="video-marco ${x.vertical ? 'vertical' : ''}"><iframe src="https://www.youtube-nocookie.com/embed/${x.id}?autoplay=1&rel=0&playsinline=1" title="${tit}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
      return `<div class="video-marco ${x.vertical ? 'vertical' : ''}"><button type="button" class="video-portada" data-reproducir aria-label="Reproducir ${tit}"><img src="${esc(x.portada)}" alt="" loading="lazy"><span class="video-play">${I.play}</span></button></div>`;
    }
    if (x.tipo === 'instagram' || x.tipo === 'tiktok') {
      return `<div class="video-marco vertical red-${x.tipo}"><iframe src="${esc(x.src)}" title="${tit}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy" scrolling="no"></iframe></div>`;
    }
    if (x.tipo === 'facebook') {
      return `<div class="video-marco ${x.vertical ? 'vertical' : ''}"><iframe src="https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(x.src)}&show_text=false" title="${tit}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy"></iframe></div>`;
    }
    return `<div class="video-marco"><a class="video-portada" href="${esc(x.src)}" target="_blank" rel="noopener" aria-label="Ver ${tit}">${x.portada ? `<img src="${esc(x.portada)}" alt="">` : ''}<span class="video-play">${I.play}</span></a></div>`;
  };

  // ---------- Horario: "Hoy" y "Abierto ahora" ----------
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const normal = (t) => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const DIAS_N = DIAS.map(normal);
  function ahoraMx() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
      .formatToParts(new Date()).map((x) => [x.type, x.value]));
    return { dia: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), min: Number(p.hour) * 60 + Number(p.minute) };
  }
  function diasDe(etq) {
    const t = normal(etq);
    const r = t.match(/(lunes|martes|miercoles|jueves|viernes|sabado|domingo)s?\s+a\s+(lunes|martes|miercoles|jueves|viernes|sabado|domingo)/);
    if (r) {
      const [a, b] = [DIAS_N.indexOf(r[1]), DIAS_N.indexOf(r[2])];
      const out = [];
      for (let i = a; ; i = (i + 1) % 7) { out.push(i); if (i === b) break; }
      return out;
    }
    if (/diario|todos los dias/.test(t)) return [0, 1, 2, 3, 4, 5, 6];
    return DIAS_N.map((d, i) => (t.includes(d) ? i : -1)).filter((i) => i >= 0);
  }
  function horas(txt) {
    const t = normal(txt);
    if (/cerrado/.test(t)) return null;
    const re = /(\d{1,2})(?::(\d{2}))?\s*(a\.?\s*m\.?|p\.?\s*m\.?|hrs?|h\b)?/g;
    const v = [];
    let m;
    while ((m = re.exec(t)) && v.length < 2) {
      let h = Number(m[1]) % 24;
      const mer = (m[3] || '').replace(/[\s.]/g, '');
      if (mer === 'pm' && h < 12) h += 12;
      if (mer === 'am' && h === 12) h = 0;
      v.push({ min: h * 60 + Number(m[2] || 0), texto: m[0].trim(), mer: !!mer.match(/am|pm/) });
    }
    if (v.length < 2) return null;
    if (!v[1].mer && v[1].min <= v[0].min) v[1].min += 12 * 60;
    return { abre: v[0], cierra: v[1] };
  }
  SG.horario = function horario(texto) {
    const filas = String(texto || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const i = l.indexOf(':');
      const etq = i > 0 ? l.slice(0, i).trim() : l;
      const val = i > 0 ? l.slice(i + 1).trim() : '';
      return { etq, val, dias: diasDe(etq), horas: horas(val) };
    });
    const { dia, min } = ahoraMx();
    const de = (d) => filas.find((f) => f.dias.includes(d));
    const hoyF = de(dia);
    let estado = null;
    if (filas.some((f) => f.horas)) {
      const bonito = (x) => x.texto.replace(/:00/, '').replace(/\s*a\.?\s*m\.?/i, ' a.m.').replace(/\s*p\.?\s*m\.?/i, ' p.m.');
      if (hoyF && hoyF.horas && min >= hoyF.horas.abre.min && min < hoyF.horas.cierra.min) {
        estado = { abierto: true, texto: `Abierto ahora · cierra a las ${bonito(hoyF.horas.cierra)}` };
      } else if (hoyF && hoyF.horas && min < hoyF.horas.abre.min) {
        estado = { abierto: false, texto: `Cerrado · hoy abre a las ${bonito(hoyF.horas.abre)}` };
      } else {
        for (let k = 1; k <= 7; k++) {
          const f = de((dia + k) % 7);
          if (f && f.horas) { estado = { abierto: false, texto: `Cerrado · abre ${k === 1 ? 'mañana' : `el ${DIAS[(dia + k) % 7]}`} a las ${bonito(f.horas.abre)}` }; break; }
        }
      }
    }
    return { filas: filas.map((f) => ({ ...f, hoy: f.dias.includes(dia) })), estado };
  };

  // ---------- Aparecer al bajar ----------
  SG.revelar = function revelar() {
    if (!('IntersectionObserver' in raiz)) { $$('.rev').forEach((el) => el.classList.add('visto')); return; }
    const io = new IntersectionObserver((ents) => ents.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.rev:not(.visto)').forEach((el) => io.observe(el));
  };
})(window);
