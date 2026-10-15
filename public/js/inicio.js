/* =====================================================================
   Strong Gym · página de inicio (todo el contenido se cambia en /editar)
   ===================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, dinero, wa, urlOk, lista, I } = window.SG;
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tactil = matchMedia('(hover: none)').matches;
  const fecha = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const usuarioIg = (u) => { const m = String(u || '').match(/instagram\.com\/([\w.]+)/i); return m ? m[1] : ''; };
  const letras = (t, desde = 0) => [...t].map((l, i) => (l === ' ' ? ' ' : `<span class="letra" style="--i:${i + desde}">${esc(l)}</span>`)).join('');
  const tituloAnimado = (t) => String(t).trim().split(/\s+/).map((w) => `<span class="pal-giro"><span>${esc(w)}</span></span>`).join(' ');

  function render(d) {
    const s = d.sitio || {};
    const ws = s.whatsapp;
    const nombre = s.nombre || 'Strong Gym';
    const hor = window.SG.horario(s.horario);
    const sec = [];

    // ---------- Portada ----------
    const palabras = String(s.hero_titulo || nombre).trim().split(/\s+/).slice(0, 3);
    let k = 0;
    $('#hero-titulo').innerHTML = palabras.map((p) => { const h = `<span class="linea">${letras(p, k)}</span>`; k += p.length; return h; }).join('');
    $('#hero-titulo').setAttribute('aria-label', palabras.join(' '));
    $('#hero-script').textContent = s.hero_script || '';
    $('#hero-script').hidden = !s.hero_script;
    $('#hero-eslogan').textContent = s.eslogan || '';
    const insignias = [];
    if (hor.estado) insignias.push(`<a class="pastilla ${hor.estado.abierto ? 'abierto' : 'cerrado'}" href="#contacto"><i class="punto"></i>${esc(hor.estado.texto)}</a>`);
    const cal = parseFloat(String(s.google_calificacion || '').replace(',', '.'));
    if (cal > 0 && cal <= 5) {
      const estrellas = Array.from({ length: 5 }, (_, i) => `<i style="--llena:${Math.max(0, Math.min(1, cal - i)) * 100}%"></i>`).join('');
      const tag = urlOk(s.maps_url) ? 'a' : 'span';
      insignias.push(`<${tag} class="pastilla" ${tag === 'a' ? `href="${esc(s.maps_url)}" target="_blank" rel="noopener"` : ''}><b>${esc(cal.toFixed(1))}</b><span class="estrellas" aria-label="${esc(cal)} de 5 estrellas">${estrellas}</span><small>en Google${s.google_opiniones ? ` · ${esc(s.google_opiniones)} opiniones` : ''}</small></${tag}>`);
    }
    $('#hero-insignias').innerHTML = insignias.join('');
    const fondo = s.hero_imagen || ((d.fotos || [])[0] || {}).imagen;
    if (fondo) $('#hero-fondo').innerHTML = `<img src="${esc(fondo)}" alt="" fetchpriority="high">`;
    if (!(d.productos || []).length) $('.hero-acciones a[href="/productos"]').remove();
    if (!(d.planes || []).length) $('.hero-acciones a[href="#planes"]').remove();
    if (ws) $('.hero-acciones').insertAdjacentHTML('beforeend', `<a class="boton boton-wa" href="${esc(wa(ws, `Hola, quiero información sobre ${nombre}.`))}" target="_blank" rel="noopener">${I.wa} WhatsApp</a>`);

    // Malteadas flotando en la portada
    const colores = (d.productos || []).filter((p) => /malteada/i.test(p.categoria || '') && /^#[0-9a-f]{6}$/i.test(p.color || '')).map((p) => p.color);
    const pal = colores.length ? colores : ['#5a3220', '#d6334f', '#f29a1f', '#3a3fa8'];
    const POS = [
      ['78%', '22%', 'clamp(90px, 12vw, 200px)', 30, '-10deg', '6s', '.3s'],
      ['92%', '58%', 'clamp(70px, 9vw, 150px)', 18, '12deg', '7s', '.5s'],
      ['64%', '66%', 'clamp(56px, 7vw, 120px)', 10, '-6deg', '5.5s', '.7s'],
    ];
    $('#hero-vasos').innerHTML = POS.map(([x, y, w, prof, r, t, del], i) => `<div class="vaso-flota" style="--x:${x};--y:${y};--w:${w};--prof:${prof};--r:${r};--t:${t};--d:${del}"><div>${window.SG.vasoSVG(pal[i % pal.length], { id: `h${i}` })}</div></div>`).join('')
      + Array.from({ length: 18 }, (_, i) => `<i class="chispa" style="--x:${(i * 53) % 100}%;--y:${40 + ((i * 37) % 60)}%;--t:${3 + (i % 4) * 2}px;--dur:${7 + (i % 6)}s;--d:${-(i * 1.1)}s;--c:${i % 3 ? 'rgba(255,255,255,.55)' : '#ff3341'}"></i>`).join('');

    // ---------- Cintas ----------
    const cinta = lista(s.marquesina);
    if (cinta.length) {
      let reps = cinta;
      while (reps.length < 10) reps = reps.concat(cinta);
      const pista = reps.map((p) => `<span>${esc(p)}${I.estrella}</span>`).join('');
      sec.push(`<div class="cintas" id="cintas" aria-label="${esc(cinta.join(', '))}">
        <div class="cinta"><div class="cinta-pista" aria-hidden="true">${pista}${pista}</div></div>
        <div class="cinta cinta-2"><div class="cinta-pista" aria-hidden="true">${pista}${pista}</div></div></div>`);
    }

    // ---------- Números ----------
    const nums = [];
    if (cal > 0) nums.push([cal.toFixed(1), '★', 'en Google']);
    if (Number(s.google_opiniones)) nums.push([String(Number(s.google_opiniones)), '+', 'opiniones']);
    const diasAbiertos = new Set(hor.filas.filter((f) => f.horas).flatMap((f) => f.dias)).size;
    if (diasAbiertos) nums.push([String(diasAbiertos), '', diasAbiertos === 7 ? 'días a la semana' : 'días abiertos']);
    const primera = hor.filas.filter((f) => f.horas).map((f) => f.horas.abre.min).sort((a, b) => a - b)[0];
    if (primera !== undefined) nums.push([String(Math.floor(primera / 60) % 12 || 12), primera < 720 ? ' AM' : ' PM', 'abrimos desde']);
    if (nums.length) {
      sec.push(`<section class="numeros"><div class="envoltura numeros-fila">${nums.map(([n, suf, t], i) => `<div class="numero rev" style="--i:${i}">
        <b><span data-contar="${esc(n)}">${esc(n)}</span>${esc(suf)}</b><small>${esc(t)}</small></div>`).join('')}</div></section>`);
    }

    // ---------- Lo que encuentras ----------
    const ventajas = String(s.ventajas || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
      const i = l.indexOf(':');
      return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : [l, ''];
    });
    if (ventajas.length || s.descripcion) {
      sec.push(`<section class="seccion" id="nosotros"><div class="envoltura">
        <div class="cab-sec"><div><span class="etiqueta rev">Bienvenido</span><h2 class="titulo rev-pal">${tituloAnimado('Lo que encuentras')}</h2></div>
          ${s.descripcion ? `<p class="subtitulo rev" style="--i:2">${esc(s.descripcion)}</p>` : ''}</div>
        ${ventajas.length ? `<div class="ventajas">${ventajas.map(([t, x], i) => `<article class="ventaja rev" style="--i:${i}">
          <span class="ventaja-icono">${window.SG.iconoVentaja(t, i)}</span><h3>${esc(t)}</h3>${x ? `<p>${esc(x)}</p>` : ''}</article>`).join('')}</div>` : ''}
      </div></section>`);
    }

    // ---------- Productos destacados ----------
    const prods = d.productos || [];
    if (prods.length) {
      let dest = prods.filter((p) => p.destacado);
      if (!dest.length) dest = prods;
      dest = dest.slice(0, 8);
      sec.push(`<section class="seccion" id="productos" style="background:var(--crema-2)"><div class="envoltura">
        <div class="cab-sec"><div><span class="etiqueta rev">Tienda del gym</span><h2 class="titulo rev-pal">${tituloAnimado(s.productos_titulo || 'Productos')}</h2>
          ${s.productos_texto ? `<p class="subtitulo rev" style="--i:2">${esc(s.productos_texto)}</p>` : ''}</div>
          <a class="boton boton-oscuro rev" href="/productos">Ver todos (${prods.length}) →</a></div>
        <div class="productos">${dest.map((p, i) => window.SG.tarjetaProducto(p, i, s)).join('')}</div>
      </div></section>`);
    }

    // ---------- Videos (siempre hay apartado) ----------
    const videos = d.videos || [];
    const ig = urlOk(s.instagram);
    const igUser = usuarioIg(s.instagram);
    const tarjetaIg = ig ? `<a class="ig-tarjeta rev" href="${esc(ig)}" target="_blank" rel="noopener">
        <span class="ig-logo">${I.ig}</span><span><small>Más videos en Instagram</small><b>@${esc(igUser || 'instagram')}</b></span><span class="ig-flecha">→</span></a>` : '';
    if (videos.length) {
      const varios = videos.length > 1;
      sec.push(`<section class="seccion oscuro" id="videos"><div class="envoltura">
        <div class="cab-sec"><div><span class="etiqueta rev">Míralo en acción</span><h2 class="titulo rev-pal">${tituloAnimado('Videos')}</h2></div>${tarjetaIg}</div>
        <div class="videos-rejilla ${varios ? '' : 'solo'}">
          <div class="rev"><div id="video-principal">${window.SG.marcoVideo(videos[0])}</div>
            <div class="video-info" id="video-info">${videos[0].titulo ? `<h3>${esc(videos[0].titulo)}</h3>` : ''}${videos[0].descripcion ? `<p>${esc(videos[0].descripcion)}</p>` : ''}</div></div>
          ${varios ? `<div class="videos-lista">${videos.map((v, i) => {
            const x = window.SG.infoVideo(v);
            return `<button type="button" data-video="${i}" aria-current="${i === 0}"><span class="videos-mini">${x.portada ? `<img src="${esc(x.portada)}" alt="" loading="lazy">` : I.play}</span><span><b>${esc(v.titulo || `Video ${i + 1}`)}</b><small>${esc(x.red)}</small></span></button>`;
          }).join('')}</div>` : ''}
        </div>
      </div></section>`);
    } else {
      sec.push(`<section class="seccion oscuro" id="videos"><div class="envoltura">
        <div class="video-vacio rev">
          <div class="video-vacio-play">${I.play}</div>
          <div><span class="etiqueta">Míralo en acción</span><h2 class="titulo">Videos del gym</h2>
            <p class="subtitulo">Muy pronto verás aquí los entrenamientos, las clases y el ambiente de ${esc(nombre)}.${ig ? ' Mientras, síguenos en Instagram.' : ''}</p>
            ${ig ? `<a class="boton boton-ig" href="${esc(ig)}" target="_blank" rel="noopener">${I.ig} @${esc(igUser || 'instagram')}</a>` : ''}</div>
        </div></div></section>`);
    }

    // ---------- Galería ----------
    const fotos = d.fotos || [];
    if (fotos.length) {
      const LIM = 12;
      sec.push(`<section class="seccion" id="galeria"><div class="envoltura">
        <div class="cab-sec"><div><span class="etiqueta rev">Así se ve</span><h2 class="titulo rev-pal">${tituloAnimado('El gym')}</h2></div>
          <p class="subtitulo rev" style="--i:2">Ven a conocernos: la primera visita es para que veas todo lo que tenemos.</p></div>
        <div class="galeria">${fotos.map((f, i) => `<button type="button" class="foto rev" data-foto="${i}" ${i >= LIM ? 'hidden' : ''} style="--i:${i % 4}" aria-label="Ver foto${f.titulo ? `: ${esc(f.titulo)}` : ''}">
          <img src="${esc(f.imagen)}" alt="${esc(f.titulo || '')}" loading="lazy">${f.titulo ? `<span>${esc(f.titulo)}</span>` : ''}</button>`).join('')}</div>
        ${fotos.length > LIM ? `<p class="galeria-mas"><button type="button" class="boton boton-oscuro" id="mas-fotos">Ver las ${fotos.length} fotos</button></p>` : ''}
      </div></section>`);
    }

    // ---------- Planes (como el cartel del gym) ----------
    const planes = d.planes || [];
    if (planes.length) {
      const dest = planes.filter((p) => p.destacado);
      const resto = planes.filter((p) => !p.destacado);
      const precio = (p) => (p.precio !== null && p.precio !== '' && p.precio !== undefined ? `<span class="pl-precio">$<span data-contar="${esc(p.precio)}">${esc(Number(p.precio).toLocaleString('es-MX'))}</span></span>` : '');
      sec.push(`<section class="seccion planes-sec" id="planes"><div class="envoltura">
        <div class="cab-sec"><div><span class="etiqueta rev">Tu cuerpo, tu fuerza</span><h2 class="titulo rev-pal">${tituloAnimado('Precios de membresías')}</h2></div>
          <p class="subtitulo rev" style="--i:2">Sin letras chiquitas. Inscríbete directamente en recepción.</p></div>
        <div class="planes-cartel">
          ${dest.map((p, i) => `<article class="plan-estrella rev" style="--i:${i}">
            <span class="plan-escudo">${I.escudo}</span>
            <div><h3>${esc(p.nombre)}</h3>${p.descripcion ? `<p>${esc(p.descripcion)}</p>` : ''}</div>
            ${precio(p)}</article>`).join('')}
          ${resto.length ? `<ul class="planes-lista">${resto.map((p, i) => `<li class="rev" style="--i:${i}">
            <span class="plan-icono">${/visita|^d[ií]a\b/i.test(p.nombre) || /^1 d[ií]a$/i.test(p.duracion || '') ? I.correr : I.calendario}</span>
            <span class="plan-nombre"><b>${esc(p.nombre)}</b>${p.duracion || p.descripcion ? `<small>${esc([p.duracion, p.descripcion].filter(Boolean).join(' · '))}</small>` : ''}</span>
            ${precio(p)}</li>`).join('')}</ul>` : ''}
        </div>
        <div class="planes-nota rev">${Number(s.precio_visita) ? `<span>¿Solo un día? La visita cuesta <b>${esc(dinero(s.precio_visita))}</b>.</span>` : ''}
          ${ws ? `<a class="boton boton-rojo" href="${esc(wa(ws, `Hola, quiero inscribirme en ${nombre}.`))}" target="_blank" rel="noopener">${I.wa} Quiero inscribirme</a>` : `<a class="boton boton-rojo" href="#contacto">${I.pin} Visítanos e inscríbete</a>`}</div>
      </div></section>`);
    }

    // ---------- Promociones ----------
    const promos = d.promociones || [];
    if (promos.length) {
      sec.push(`<section class="seccion" id="promociones" style="background:var(--crema-2)"><div class="envoltura">
        <div class="cab-sec"><div><span class="etiqueta rev">Aprovecha</span><h2 class="titulo rev-pal">${tituloAnimado('Promociones')}</h2></div></div>
        <div class="promos">${promos.map((p, i) => `<article class="promo rev" style="--i:${i % 3}">
          ${p.imagen ? `<div class="promo-img"><img src="${esc(p.imagen)}" alt="" loading="lazy"></div>` : ''}
          <div class="promo-cuerpo"><h3>${esc(p.titulo)}</h3>${p.texto ? `<p>${esc(p.texto)}</p>` : ''}
            <div class="promo-pie"><span>${p.vigente_hasta ? `Válida hasta el ${esc(fecha(p.vigente_hasta))}` : 'Por tiempo limitado'}</span>
            ${ws ? `<a href="${esc(wa(ws, `Hola, me interesa la promoción "${p.titulo}".`))}" target="_blank" rel="noopener">Preguntar →</a>` : ''}</div></div>
        </article>`).join('')}</div>
      </div></section>`);
    }

    // ---------- Llamado con stickers ----------
    const stickers = ['Tu cuerpo', 'Tu fuerza', primera !== undefined ? `Abrimos ${nums[nums.length - 1][0]}${nums[nums.length - 1][1]}` : 'Sin excusas', 'Barra de proteína'];
    const POS_ST = [['6%', '18%', '-8deg'], ['80%', '14%', '7deg'], ['10%', '78%', '5deg'], ['76%', '80%', '-6deg']];
    sec.push(`<section class="llamado" id="llamado">
      ${stickers.map((t, i) => `<span class="sticker" style="--x:${POS_ST[i][0]};--y:${POS_ST[i][1]};--r:${POS_ST[i][2]}">${esc(t)}</span>`).join('')}
      <div class="envoltura">
        <h2 class="llamado-titulo">${letras('La fuerza no es un hábito.')}</h2><p class="rev" style="--i:3">es un estilo de vida</p>
        <div class="hero-acciones rev" style="--i:4">
          ${ws ? `<a class="boton boton-blanco" href="${esc(wa(ws, `Hola, quiero inscribirme en ${nombre}.`))}" target="_blank" rel="noopener">${I.wa} Inscríbete por WhatsApp</a>` : ''}
          ${urlOk(s.maps_url) ? `<a class="boton ${ws ? 'boton-borde' : 'boton-blanco'}" href="${esc(s.maps_url)}" target="_blank" rel="noopener">${I.pin} Cómo llegar</a>` : ''}
          ${ig ? `<a class="boton boton-borde" href="${esc(ig)}" target="_blank" rel="noopener">${I.ig} Instagram</a>` : ''}
        </div></div></section>`);

    // ---------- Contacto ----------
    const contacto = window.SG.contactos(s);
    sec.push(`<section class="seccion oscuro" id="contacto"><div class="envoltura">
      <div class="cab-sec"><div><span class="etiqueta rev">Te esperamos</span><h2 class="titulo rev-pal">${tituloAnimado('Visítanos')}</h2></div>
        ${hor.estado ? `<span class="pastilla ${hor.estado.abierto ? 'abierto' : 'cerrado'} rev"><i class="punto"></i>${esc(hor.estado.texto)}</span>` : ''}</div>
      <div class="contacto">
        <article class="caja rev"><h3>${I.reloj} Horario</h3>
          ${hor.filas.length ? `<dl class="horario">${hor.filas.map((f) => `<div class="${f.hoy ? 'hoy' : ''}"><dt>${esc(f.etq)}</dt><dd>${esc(f.val)}</dd></div>`).join('')}</dl>` : '<p>Pregunta por el horario en recepción.</p>'}
        </article>
        <article class="caja rev" style="--i:1"><h3>${I.pin} Ubicación</h3>
          <p class="direccion">${esc(s.direccion || '')}</p>
          ${urlOk(s.maps_url) ? `<a class="boton boton-rojo" href="${esc(s.maps_url)}" target="_blank" rel="noopener">Abrir en Google Maps</a>` : ''}
        </article>
        <article class="caja rev" style="--i:2"><h3>${I.msg} Contacto</h3>
          ${contacto.length ? `<ul class="lista-contacto">${contacto.map(([h, ic, t]) => `<li><a href="${esc(h)}" ${/^https?:/.test(h) ? 'target="_blank" rel="noopener"' : ''}>${ic}${esc(t)}</a></li>`).join('')}</ul>` : '<p>Pregúntanos en recepción.</p>'}
        </article>
      </div>
    </div></section>`);

    $('#secciones').innerHTML = sec.join('');
  }

  // =====================================================================
  //  Movimiento
  // =====================================================================
  function animar(d) {
    const hero = $('.hero');
    const barra = $('#progreso');

    // Galería
    const fotos = d.fotos || [];
    $$('[data-foto]').forEach((b) => b.addEventListener('click', () => window.SG.abrirFotos(fotos, Number(b.dataset.foto))));
    const mas = $('#mas-fotos');
    if (mas) mas.addEventListener('click', () => { $$('.galeria .foto[hidden]').forEach((f) => { f.hidden = false; f.classList.add('visto'); }); mas.remove(); });

    // Videos
    const videos = d.videos || [];
    const principal = $('#video-principal');
    if (principal) {
      principal.addEventListener('click', (e) => {
        if (!e.target.closest('[data-reproducir]')) return;
        principal.innerHTML = window.SG.marcoVideo(videos[Number(principal.dataset.i || 0)], true);
      });
      $$('[data-video]').forEach((b) => b.addEventListener('click', () => {
        const i = Number(b.dataset.video);
        const v = videos[i];
        principal.dataset.i = i;
        principal.innerHTML = window.SG.marcoVideo(v, true);
        $('#video-info').innerHTML = `${v.titulo ? `<h3>${esc(v.titulo)}</h3>` : ''}${v.descripcion ? `<p>${esc(v.descripcion)}</p>` : ''}`;
        $$('[data-video]').forEach((x) => x.setAttribute('aria-current', String(x === b)));
        if (innerWidth < 860) principal.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }));
    }

    // Menú: sección visible
    const enlaces = $$('#nav a[href^="/#"]');
    const ioNav = new IntersectionObserver((ents) => ents.forEach((e) => {
      if (e.isIntersecting) enlaces.forEach((a) => a.classList.toggle('activo', a.getAttribute('href') === `/#${e.target.id}`));
    }), { rootMargin: '-45% 0px -50% 0px' });
    enlaces.forEach((a) => { const el = document.getElementById(a.getAttribute('href').slice(2)); if (el) ioNav.observe(el); });

    // Números que cuentan al aparecer
    const ioNum = new IntersectionObserver((ents) => ents.forEach((e) => {
      if (!e.isIntersecting) return;
      ioNum.unobserve(e.target);
      const final = Number(e.target.dataset.contar);
      if (!Number.isFinite(final) || reducido) return;
      const dec = String(e.target.dataset.contar).includes('.') ? 1 : 0;
      const t0 = performance.now();
      const paso = (t) => {
        const p = Math.min(1, (t - t0) / 1300);
        const v = final * (1 - Math.pow(1 - p, 3));
        e.target.textContent = dec ? v.toFixed(1) : Math.round(v).toLocaleString('es-MX');
        if (p < 1) requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
    }), { threshold: 0.6 });
    $$('[data-contar]').forEach((el) => ioNum.observe(el));

    // Títulos y llamado
    const ioTit = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visto'); ioTit.unobserve(e.target); } }), { threshold: 0.3 });
    $$('.rev-pal, .llamado-titulo').forEach((el) => ioTit.observe(el));

    // Portada: el mouse mueve las malteadas
    if (!tactil && !reducido) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        hero.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        hero.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
      // Tarjetas de producto que se inclinan
      document.addEventListener('pointermove', (e) => {
        const c = e.target.closest && e.target.closest('.prod');
        if (!c) return;
        const r = c.getBoundingClientRect();
        c.style.setProperty('--rx', `${(((e.clientY - r.top) / r.height) - 0.5) * -8}deg`);
        c.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width) - 0.5) * 10}deg`);
        c.style.setProperty('--bx', `${((e.clientX - r.left) / r.width) * 100}%`);
      });
      document.addEventListener('pointerout', (e) => {
        const c = e.target.closest && e.target.closest('.prod');
        if (c && !c.contains(e.relatedTarget)) { c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); }
      });
    }

    // Stickers que se arrastran
    $$('.sticker').forEach((st) => {
      let ox = 0, oy = 0, sx = 0, sy = 0, id = null;
      st.addEventListener('pointerdown', (e) => { id = e.pointerId; st.setPointerCapture(id); st.classList.add('arrastrando'); sx = e.clientX - ox; sy = e.clientY - oy; });
      st.addEventListener('pointermove', (e) => { if (e.pointerId !== id) return; ox = e.clientX - sx; oy = e.clientY - sy; st.style.translate = `${ox}px ${oy}px`; });
      const soltar = () => { id = null; st.classList.remove('arrastrando'); };
      st.addEventListener('pointerup', soltar);
      st.addEventListener('pointercancel', soltar);
    });

    // Scroll: barra de avance, portada y cintas que aceleran
    let velocidad = 0;
    let ultimoY = scrollY;
    let pendiente = false;
    const alBajar = () => {
      pendiente = false;
      const y = scrollY;
      velocidad = velocidad * 0.8 + (y - ultimoY) * 0.2;
      ultimoY = y;
      const alto = document.documentElement.scrollHeight - innerHeight;
      if (barra) barra.style.transform = `scaleX(${alto > 0 ? Math.min(1, y / alto) : 0})`;
      if (y < innerHeight * 1.2) hero.style.setProperty('--scroll', y.toFixed(1));
    };
    addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(alBajar); } }, { passive: true });
    alBajar();

    const bandas = $$('.cinta-pista');
    if (bandas.length && !reducido) {
      bandas.forEach((b) => { b.style.animation = 'none'; });
      const estado = bandas.map((b, k) => ({ b, x: 0, dir: k % 2 ? 1 : -1, ancho: 0 }));
      let visible = true;
      new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe($('#cintas'));
      let antes = performance.now();
      const paso = (ahora) => {
        const dt = Math.min(0.05, (ahora - antes) / 1000);
        antes = ahora;
        if (visible) {
          const extra = Math.min(700, Math.abs(velocidad) * 20);
          estado.forEach((s) => {
            s.ancho = s.ancho || s.b.scrollWidth / 2;
            if (!s.ancho) return;
            if (s.dir > 0 && s.x === 0) s.x = -s.ancho;
            s.x += s.dir * (60 + extra) * dt;
            if (s.x <= -s.ancho) s.x += s.ancho;
            if (s.x > 0) s.x -= s.ancho;
            s.b.style.transform = `translate3d(${s.x.toFixed(1)}px,0,0)`;
          });
        }
        velocidad *= 0.94;
        requestAnimationFrame(paso);
      };
      requestAnimationFrame(paso);
      addEventListener('resize', () => estado.forEach((s) => { s.ancho = 0; }));
    }
  }

  window.SG.cargar().then((d) => {
    render(d);
    window.SG.armarMarco(d, 'inicio');
    animar(d);
    window.SG.revelar();
    requestAnimationFrame(() => document.body.classList.add('listo'));
    if (location.hash.length > 1) {
      const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (el) setTimeout(() => el.scrollIntoView(), 30);
    }
  });
})();
