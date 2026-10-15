/* =====================================================================
   Strong Gym · editar la página (recepción)
   Productos, fotos del gym, videos, promociones, planes e información.
   ===================================================================== */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const dinero = (n) => (n === null || n === undefined || n === '' ? '' : `$${Number(n).toLocaleString('es-MX', { maximumFractionDigits: 2 })}`);

  let C = null; // todo el contenido
  let tab = 'productos';
  let subiendo = 0;

  // ---------------------------------------------------------------------
  //  Comunicación con el servidor
  // ---------------------------------------------------------------------
  async function api(metodo, ruta, cuerpo) {
    let r;
    try {
      r = await fetch(`/api${ruta}`, {
        method: metodo, credentials: 'same-origin',
        headers: cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {},
        body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      });
    } catch (e) { throw new Error('Sin conexión. Revisa el internet e intenta de nuevo.'); }
    let d = null;
    try { d = await r.json(); } catch (e) { /* nada */ }
    if (r.status === 401 && ruta !== '/entrar') { mostrarEntrar(); throw new Error((d && d.error) || 'Tu sesión terminó.'); }
    if (!r.ok) throw new Error((d && d.error) || 'No se pudo guardar. Intenta de nuevo.');
    return d;
  }
  async function recargar() { C = await api('GET', '/editar'); pintar(); }

  let tAviso;
  function aviso(texto, mal) {
    const a = $('#aviso');
    a.textContent = texto;
    a.classList.toggle('mal', !!mal);
    a.classList.add('ver');
    clearTimeout(tAviso);
    tAviso = setTimeout(() => a.classList.remove('ver'), mal ? 5000 : 2600);
  }

  // ---------------------------------------------------------------------
  //  Fotos: se achican en el navegador antes de subir (cargan rápido)
  // ---------------------------------------------------------------------
  async function prepararImagen(file, max) {
    if (file.type === 'image/gif') {
      if (file.size > 8 * 1024 * 1024) throw new Error('El GIF pesa más de 8 MB.');
      return file;
    }
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * k));
      const h = Math.max(1, Math.round(img.naturalHeight * k));
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d');
      const transparente = /png|webp/.test(file.type);
      if (!transparente) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
      ctx.drawImage(img, 0, 0, w, h);
      let blob = await new Promise((ok) => cv.toBlob(ok, 'image/webp', 0.86));
      if (!blob || blob.type !== 'image/webp') blob = await new Promise((ok) => cv.toBlob(ok, transparente ? 'image/png' : 'image/jpeg', 0.86));
      if (!blob) throw new Error();
      return blob;
    } catch (e) {
      throw new Error(`No se pudo abrir "${file.name}". Usa fotos JPG o PNG (las del iPhone en formato HEIC: mándatelas por WhatsApp y vuelve a intentar).`);
    } finally { URL.revokeObjectURL(url); }
  }

  function tipoVideo(file) {
    if (/^video\/(mp4|webm|quicktime)$/.test(file.type)) return file.type;
    if (/\.mp4$/i.test(file.name)) return 'video/mp4';
    if (/\.webm$/i.test(file.name)) return 'video/webm';
    if (/\.mov$/i.test(file.name)) return 'video/quicktime';
    return '';
  }

  // Se manda por partes de 3 MB (límite de Netlify por petición)
  function enviarParte(url, parte, tipo, alAvanzar) {
    return new Promise((ok, mal) => {
      const x = new XMLHttpRequest();
      x.open('POST', url);
      x.setRequestHeader('Content-Type', tipo);
      x.setRequestHeader('X-Subir', '1');
      x.upload.onprogress = (e) => { if (e.lengthComputable && alAvanzar) alAvanzar(e.loaded / e.total); };
      x.onload = () => {
        let d = null;
        try { d = JSON.parse(x.responseText); } catch (e) { /* nada */ }
        if (x.status === 401) { mostrarEntrar(); return mal(Object.assign(new Error('Tu sesión terminó.'), { final: true })); }
        if (x.status >= 200 && x.status < 300 && d) return ok(d);
        return mal(Object.assign(new Error((d && d.error) || 'No se pudo subir el archivo.'), { final: x.status >= 400 && x.status < 500 }));
      };
      x.onerror = () => mal(new Error('Se cortó la conexión mientras subía. Intenta de nuevo.'));
      x.send(parte);
    });
  }
  async function subirArchivo(blob, tipo, alAvanzar) {
    const TROZO = (C && C.limites && C.limites.trozo) || 3 * 1024 * 1024;
    const total = Math.max(1, Math.ceil(blob.size / TROZO));
    tipo = tipo || blob.type;
    let nombre = '';
    for (let i = 0; i < total; i++) {
      const parte = blob.slice(i * TROZO, Math.min(blob.size, (i + 1) * TROZO));
      const q = new URLSearchParams({ parte: i, total, tam: blob.size });
      if (nombre) q.set('nombre', nombre);
      let d;
      for (let intento = 0; ; intento++) {
        try {
          d = await enviarParte(`/api/editar/subir?${q}`, parte, tipo, (p) => alAvanzar && alAvanzar((i * TROZO + p * parte.size) / blob.size));
          break;
        } catch (e) {
          if (e.final || intento >= 2) throw e;
          await new Promise((r) => setTimeout(r, 1500 * (intento + 1)));
        }
      }
      if (d.url) { if (alAvanzar) alAvanzar(1); return d.url; }
      nombre = d.nombre;
    }
    throw new Error('No se pudo terminar de subir el archivo.');
  }

  // ---------------------------------------------------------------------
  //  Cómo se ve y se edita cada sección
  // ---------------------------------------------------------------------
  const CATEGORIAS = ['Malteadas', 'Suplementos', 'Bebidas', 'Snacks', 'Accesorios', 'Ropa'];
  const COLORES = ['#5a3220', '#d6334f', '#f29a1f', '#3a3fa8', '#2a2f3a', '#8a5a3c', '#1e8a44', '#0b2a5c', '#d3121f'];
  const ytId = (u) => { const m = String(u || '').match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i); return m ? m[1] : null; };

  const SECCIONES = {
    productos: {
      titulo: 'Productos', uno: 'producto', nuevo: 'Agregar producto',
      texto: 'Lo que vendes en el gym. Aparecen en la página "Productos"; los marcados con ★ salen también en el inicio.',
      campos: [
        { k: 'imagen', t: 'imagen', label: 'Foto del producto', max: 1200, ayuda: 'Cuadrada se ve mejor. Si no pones foto, se dibuja una ilustración.' },
        { k: 'nombre', t: 'texto', label: 'Nombre', req: true, max: 80 },
        { k: 'categoria', t: 'texto', label: 'Categoría', lista: 'categorias', ayuda: 'Ej. Malteadas, Suplementos, Bebidas, Accesorios, Ropa.' },
        { fila: [{ k: 'precio', t: 'numero', label: 'Precio (MXN)' }, { k: 'precio_antes', t: 'numero', label: 'Precio antes (opcional)', ayuda: 'Para mostrar una oferta tachada.' }] },
        { k: 'descripcion', t: 'area', label: 'Descripción', max: 700 },
        { k: 'etiqueta', t: 'texto', label: 'Etiqueta (opcional)', max: 30, ayuda: 'Sale en la esquina: Nueva, Oferta, Más pedida…' },
        { k: 'color', t: 'color', label: 'Color de fondo (si no tiene foto)' },
        { k: 'destacado', t: 'check', label: '★ Mostrar también en la página de inicio' },
        { k: 'visible', t: 'check', label: 'Visible en la página', def: true },
      ],
      resumen: (p) => [p.categoria, dinero(p.precio)].filter(Boolean).join(' · '),
      insignias: (p) => (p.destacado ? '<span class="insignia insignia-verde">★ Inicio</span>' : ''),
    },
    fotos: {
      titulo: 'Fotos del gym', uno: 'foto', nuevo: null,
      texto: 'Salen en la galería "El gym". La primera también es el fondo de la portada (si no eliges otra en Información).',
      campos: [
        { k: 'imagen', t: 'imagen', label: 'Foto', max: 1800, req: true },
        { k: 'titulo', t: 'texto', label: 'Texto sobre la foto (opcional)', max: 80, ayuda: 'Ej. Área de pesas, Zona de cardio.' },
        { k: 'visible', t: 'check', label: 'Visible en la página', def: true },
      ],
    },
    videos: {
      titulo: 'Videos', uno: 'video', nuevo: 'Agregar video',
      texto: 'Sube el video desde tu celular o computadora, o pega el enlace de un reel de Instagram, YouTube, Facebook o TikTok.',
      campos: [
        { k: 'titulo', t: 'texto', label: 'Título', max: 100 },
        { k: 'archivo', t: 'video', label: 'Subir video (MP4 o MOV)' },
        { k: 'url', t: 'url', label: 'O pega el enlace (Instagram, YouTube, Facebook o TikTok)', ayuda: 'En Instagram: abre el reel → ⋯ o avión de papel → Copiar enlace.' },
        { k: 'portada', t: 'imagen', label: 'Portada (opcional)', max: 1600, ancha: true, ayuda: 'La imagen que se ve antes de darle play.' },
        { k: 'descripcion', t: 'area', label: 'Descripción (opcional)', max: 400 },
        { k: 'visible', t: 'check', label: 'Visible en la página', def: true },
      ],
      resumen: (v) => (v.archivo ? 'Video subido' : v.url ? (ytId(v.url) ? 'YouTube' : /instagram\.com/i.test(v.url) ? 'Instagram' : /tiktok\.com/i.test(v.url) ? 'TikTok' : /facebook|fb\.watch/i.test(v.url) ? 'Facebook' : 'Enlace') : ''),
      mini: (v) => v.portada || (ytId(v.url) ? `https://i.ytimg.com/vi/${ytId(v.url)}/mqdefault.jpg` : ''),
    },
    promociones: {
      titulo: 'Promociones', uno: 'promoción', nuevo: 'Agregar promoción',
      texto: 'Si le pones fecha, se quita sola de la página cuando vence.',
      campos: [
        { k: 'imagen', t: 'imagen', label: 'Imagen (opcional)', max: 1400, ancha: true },
        { k: 'titulo', t: 'texto', label: 'Título', req: true, max: 100 },
        { k: 'texto', t: 'area', label: 'Detalle', max: 700 },
        { k: 'vigente_hasta', t: 'fecha', label: 'Válida hasta (opcional)' },
        { k: 'visible', t: 'check', label: 'Visible en la página', def: true },
      ],
      resumen: (p) => (p.vigente_hasta ? `Hasta ${p.vigente_hasta.split('-').reverse().join('/')}` : 'Sin fecha de fin'),
      insignias: (p) => {
        const h = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City' }).format(new Date());
        return p.vigente_hasta && p.vigente_hasta < h ? '<span class="insignia insignia-roja">Vencida</span>' : '';
      },
    },
    planes: {
      titulo: 'Planes', uno: 'plan', nuevo: 'Agregar plan',
      texto: 'Membresías y precios que se muestran en la página. El "resaltado" sale en rojo.',
      campos: [
        { k: 'nombre', t: 'texto', label: 'Nombre', req: true, max: 60 },
        { fila: [{ k: 'precio', t: 'numero', label: 'Precio (MXN)' }, { k: 'duracion', t: 'texto', label: 'Duración', max: 40, ayuda: 'Ej. 30 días, 1 mes.' }] },
        { k: 'descripcion', t: 'area', label: 'Descripción', max: 300 },
        { k: 'destacado', t: 'check', label: 'Resaltar este plan' },
        { k: 'visible', t: 'check', label: 'Visible en la página', def: true },
      ],
      resumen: (p) => [dinero(p.precio), p.duracion].filter(Boolean).join(' · '),
      insignias: (p) => (p.destacado ? '<span class="insignia insignia-roja">Resaltado</span>' : ''),
    },
  };

  // ---------------------------------------------------------------------
  //  Pintar la pestaña actual
  // ---------------------------------------------------------------------
  function pintar() {
    $$('#pestanas button').forEach((b) => b.setAttribute('aria-current', String(b.dataset.tab === tab)));
    if (tab === 'sitio') return pintarSitio();
    if (tab === 'clave') return pintarClave();
    if (tab === 'fotos') return pintarFotos();
    pintarLista(tab);
  }

  function miniatura(col, x, i) {
    const def = SECCIONES[col];
    const src = (def.mini && def.mini(x)) || x.imagen;
    if (src) return `<img src="${esc(src)}" alt="" loading="lazy">`;
    if (col === 'productos' && (x.color || /malteada/i.test(x.categoria || '')) && window.SG && window.SG.vasoSVG) {
      return `<span style="background:${esc(x.color || '#143B7A')};width:100%;height:100%;display:grid;place-items:center">${window.SG.vasoSVG(x.color || '#D3121F', { id: `m${i}` })}</span>`;
    }
    if (col === 'videos') return '▶';
    return esc(String(x.nombre || x.titulo || '?').trim().charAt(0).toUpperCase());
  }

  function botonesFila(x, i, total) {
    return `<div class="fila-acciones">
      <button class="btn-icono" type="button" data-acc="subir" data-id="${x.id}" ${i === 0 ? 'disabled' : ''} aria-label="Subir" title="Mover arriba">↑</button>
      <button class="btn-icono" type="button" data-acc="bajar" data-id="${x.id}" ${i === total - 1 ? 'disabled' : ''} aria-label="Bajar" title="Mover abajo">↓</button>
      <button class="btn btn-claro btn-chico" type="button" data-acc="ver" data-id="${x.id}">${x.visible === false ? 'Mostrar' : 'Ocultar'}</button>
      <button class="btn btn-oscuro btn-chico" type="button" data-acc="editar" data-id="${x.id}">Editar</button>
      <button class="btn btn-claro btn-chico btn-peligro" type="button" data-acc="borrar" data-id="${x.id}" aria-label="Eliminar">Eliminar</button>
    </div>`;
  }

  function pintarLista(col) {
    const def = SECCIONES[col];
    const items = C[col] || [];
    let cuerpo;
    if (!items.length) cuerpo = `<p class="vacio">Todavía no hay ${esc(def.titulo.toLowerCase())}. Usa el botón “${esc(def.nuevo)}”.</p>`;
    else {
      cuerpo = `<div class="filas">${items.map((x, i) => `<div class="fila ${x.visible === false ? 'oculto' : ''}">
        <div class="fila-mini">${miniatura(col, x, i)}</div>
        <div class="fila-texto"><b>${esc(x.nombre || x.titulo || 'Sin título')}${x.visible === false ? '<span class="insignia insignia-gris">Oculto</span>' : ''}${def.insignias ? def.insignias(x) : ''}</b>
          <small>${esc(def.resumen ? def.resumen(x) : '')}</small></div>
        ${botonesFila(x, i, items.length)}
      </div>`).join('')}</div>`;
    }
    $('#panel').innerHTML = `<div class="panel-cab"><div><h1>${esc(def.titulo)}</h1><p>${esc(def.texto)}</p></div>
      <div class="panel-acciones"><button class="btn btn-rojo" type="button" data-acc="nuevo">+ ${esc(def.nuevo)}</button></div></div>${cuerpo}`;
  }

  function pintarFotos() {
    const def = SECCIONES.fotos;
    const items = C.fotos || [];
    $('#panel').innerHTML = `<div class="panel-cab"><div><h1>${esc(def.titulo)}</h1><p>${esc(def.texto)}</p></div></div>
      <label class="zona-subir" id="zona-fotos">
        <input type="file" accept="image/*" multiple hidden id="fotos-input">
        <b>+ Subir fotos</b><span>Toca aquí para elegir una o varias fotos${matchMedia('(hover: hover)').matches ? ', o arrástralas a este recuadro' : ''}.</span>
      </label>
      <div class="progreso-lista" id="progreso-fotos"></div>
      ${items.length ? `<div class="fotos-rejilla">${items.map((x, i) => `<div class="foto-t ${x.visible === false ? 'oculto' : ''}">
        <img src="${esc(x.imagen)}" alt="" loading="lazy">
        <div class="foto-t-cuerpo"><b>${esc(x.titulo || 'Sin texto')}${x.visible === false ? '<span class="insignia insignia-gris">Oculta</span>' : ''}${i === 0 ? '<span class="insignia insignia-verde">Portada</span>' : ''}</b>
        <div class="fila-acciones">
          <button class="btn-icono" type="button" data-acc="subir" data-id="${x.id}" ${i === 0 ? 'disabled' : ''} aria-label="Mover antes" title="Mover antes">←</button>
          <button class="btn-icono" type="button" data-acc="bajar" data-id="${x.id}" ${i === items.length - 1 ? 'disabled' : ''} aria-label="Mover después" title="Mover después">→</button>
          <button class="btn btn-oscuro btn-chico" type="button" data-acc="editar" data-id="${x.id}">Editar</button>
          <button class="btn btn-claro btn-chico btn-peligro" type="button" data-acc="borrar" data-id="${x.id}">Eliminar</button>
        </div></div></div>`).join('')}</div>` : '<p class="vacio">Todavía no hay fotos del gym.</p>'}`;
    const input = $('#fotos-input');
    const zona = $('#zona-fotos');
    input.addEventListener('change', () => { subirFotos(Array.from(input.files)); input.value = ''; });
    zona.addEventListener('dragover', (e) => { e.preventDefault(); zona.classList.add('encima'); });
    zona.addEventListener('dragleave', () => zona.classList.remove('encima'));
    zona.addEventListener('drop', (e) => { e.preventDefault(); zona.classList.remove('encima'); subirFotos(Array.from(e.dataTransfer.files).filter((f) => /^image\//.test(f.type))); });
  }

  async function subirFotos(files) {
    if (!files.length) return;
    const caja = $('#progreso-fotos');
    let bien = 0;
    for (const f of files) {
      const linea = document.createElement('div');
      linea.innerHTML = `<small>${esc(f.name)}</small><div class="barra-progreso"><i></i></div>`;
      caja.appendChild(linea);
      const barra = $('i', linea);
      try {
        const blob = await prepararImagen(f, 1800);
        const url = await subirArchivo(blob, blob.type, (p) => { barra.style.width = `${Math.round(p * 100)}%`; });
        await api('POST', '/editar/fotos', { imagen: url, titulo: '', visible: true });
        bien++;
        linea.remove();
      } catch (e) {
        linea.innerHTML = `<p class="error">${esc(e.message)}</p>`;
      }
    }
    if (bien) { aviso(bien === 1 ? 'Foto agregada' : `${bien} fotos agregadas`); await recargar(); }
  }

  // ---------------------------------------------------------------------
  //  Formulario (agregar / editar)
  // ---------------------------------------------------------------------
  function htmlCampo(c, x) {
    if (c.fila) return `<div class="dos">${c.fila.map((s) => htmlCampo(s, x)).join('')}</div>`;
    const v = x[c.k] !== undefined && x[c.k] !== null ? x[c.k] : c.def !== undefined ? c.def : '';
    const req = c.req ? ' <em>*</em>' : '';
    const ayuda = c.ayuda ? `<small class="ayuda">${esc(c.ayuda)}</small>` : '';
    const id = `f-${c.k}`;
    switch (c.t) {
      case 'texto': case 'url': case 'fecha': case 'numero': {
        const tipo = { texto: 'text', url: 'url', fecha: 'date', numero: 'number' }[c.t];
        const extra = c.t === 'numero' ? ' inputmode="decimal" step="0.01" min="0"' : c.max ? ` maxlength="${c.max}"` : '';
        const lista = c.lista ? ` list="lista-${c.lista}"` : '';
        const datalist = c.lista === 'categorias'
          ? `<datalist id="lista-categorias">${[...new Set([...(C.productos || []).map((p) => p.categoria).filter(Boolean), ...CATEGORIAS])].map((k) => `<option value="${esc(k)}">`).join('')}</datalist>` : '';
        return `<label class="campo" for="${id}"><span>${esc(c.label)}${req}</span><input id="${id}" name="${c.k}" type="${tipo}" value="${esc(v)}"${extra}${lista}${c.req ? ' required' : ''} ${c.t === 'url' ? 'placeholder="https://…"' : ''}>${ayuda}${datalist}</label>`;
      }
      case 'area':
        return `<label class="campo" for="${id}"><span>${esc(c.label)}${req}</span><textarea id="${id}" name="${c.k}" maxlength="${c.max || 1000}" rows="${c.filas || 3}">${esc(v)}</textarea>${ayuda}</label>`;
      case 'check':
        return `<label class="check"><input type="checkbox" name="${c.k}" ${v === true ? 'checked' : ''}> ${esc(c.label)}</label>`;
      case 'color': {
        const usa = /^#[0-9a-f]{6}$/i.test(v);
        return `<div class="campo"><span>${esc(c.label)}</span><div class="color-fila">
          <label class="check"><input type="checkbox" name="${c.k}__usa" ${usa ? 'checked' : ''}> Usar color</label>
          <input type="color" name="${c.k}" value="${usa ? esc(v) : '#d3121f'}" aria-label="Color">
          <div class="muestras">${COLORES.map((k) => `<button type="button" data-color="${k}" style="background:${k}" aria-label="Color ${k}"></button>`).join('')}</div>
        </div><small class="ayuda">Para malteadas sin foto, se dibuja un vaso de este color.</small></div>`;
      }
      case 'imagen': case 'video': {
        const vista = !v ? (c.t === 'video' ? 'Sin video' : 'Sin foto')
          : c.t === 'video' ? `<video src="${esc(v)}" muted playsinline preload="metadata"></video>` : `<img src="${esc(v)}" alt="">`;
        return `<div class="campo"><span>${esc(c.label)}${req}</span>
          <div class="media ${c.ancha || c.t === 'video' ? 'ancha' : ''}" data-media="${c.k}" data-tipo="${c.t}" data-max="${c.max || 1600}">
            <div class="media-vista">${vista}</div>
            <div style="display:grid;gap:8px">
              <div class="media-botones">
                <label class="btn btn-claro btn-chico">${c.t === 'video' ? 'Elegir video' : v ? 'Cambiar foto' : 'Elegir foto'}<input type="file" accept="${c.t === 'video' ? 'video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm' : 'image/*'}" hidden></label>
                <button type="button" class="btn btn-claro btn-chico btn-peligro" data-quitar ${v ? '' : 'hidden'}>Quitar</button>
              </div>
              <div class="barra-progreso" hidden><i></i></div>
              ${ayuda}${c.t === 'video' ? `<small class="ayuda">Máximo ${esc((C.limites && C.limites.video_mb) || 80)} MB (unos 2–3 minutos en calidad normal). Videos largos: mejor como reel de Instagram.</small>` : ''}
            </div>
            <input type="hidden" name="${c.k}" value="${esc(v)}">
          </div></div>`;
      }
      default: return '';
    }
  }

  function activarMedia(raiz, errEl, btnEl) {
    $$('[data-media]', raiz).forEach((m) => {
      const input = $('input[type=file]', m);
      const oculto = $('input[type=hidden]', m);
      const vista = $('.media-vista', m);
      const quitar = $('[data-quitar]', m);
      const barra = $('.barra-progreso', m);
      const esVideo = m.dataset.tipo === 'video';
      input.addEventListener('change', async () => {
        const f = input.files[0];
        input.value = '';
        if (!f) return;
        errEl.textContent = '';
        const limite = ((C.limites && C.limites.video_mb) || 80) * 1024 * 1024;
        let conto = false;
        try {
          let blob = f;
          let tipo = '';
          if (esVideo) {
            tipo = tipoVideo(f);
            if (!tipo) throw new Error('Ese archivo no es un video MP4, MOV o WebM.');
            if (f.size > limite) throw new Error(`El video pesa ${Math.round(f.size / 1048576)} MB y el máximo es ${Math.round(limite / 1048576)} MB. Súbelo como reel a Instagram y pega aquí el enlace.`);
          } else {
            blob = await prepararImagen(f, Number(m.dataset.max) || 1600);
          }
          subiendo++; conto = true;
          btnEl.disabled = true;
          barra.hidden = false;
          $('i', barra).style.width = '0%';
          const url = await subirArchivo(blob, tipo, (p) => { $('i', barra).style.width = `${Math.round(p * 100)}%`; });
          oculto.value = url;
          vista.innerHTML = esVideo ? `<video src="${esc(url)}" muted playsinline preload="metadata"></video>` : `<img src="${esc(url)}" alt="">`;
          quitar.hidden = false;
        } catch (e) {
          errEl.textContent = e.message;
        } finally {
          if (barra.hidden === false) setTimeout(() => { barra.hidden = true; }, 400);
          if (conto) subiendo--;
          if (!subiendo) btnEl.disabled = false;
        }
      });
      quitar.addEventListener('click', () => {
        oculto.value = '';
        vista.textContent = esVideo ? 'Sin video' : 'Sin foto';
        quitar.hidden = true;
      });
    });
    $$('[data-color]', raiz).forEach((b) => b.addEventListener('click', () => {
      const fila = b.closest('.color-fila');
      $('input[type=color]', fila).value = b.dataset.color;
      $('input[type=checkbox]', fila).checked = true;
    }));
    $$('.color-fila input[type=color]', raiz).forEach((i) => i.addEventListener('input', () => { $('input[type=checkbox]', i.closest('.color-fila')).checked = true; }));
  }

  function leerCampos(raiz, campos) {
    const r = {};
    const plano = campos.flatMap((c) => c.fila || [c]);
    for (const c of plano) {
      const el = raiz.querySelector(`[name="${c.k}"]`);
      if (!el) continue;
      if (c.t === 'check') r[c.k] = el.checked;
      else if (c.t === 'color') r[c.k] = raiz.querySelector(`[name="${c.k}__usa"]`).checked ? el.value : '';
      else r[c.k] = el.value.trim();
    }
    return r;
  }

  let enDialogo = null; // { col, id }
  function abrirFormulario(col, x) {
    const def = SECCIONES[col];
    enDialogo = { col, id: x ? x.id : null };
    $('#dialogo-titulo').textContent = x ? `Editar ${def.uno}` : `Nuevo ${def.uno}`.replace('Nuevo promoción', 'Nueva promoción').replace('Nuevo foto', 'Nueva foto');
    $('#dialogo-cuerpo').innerHTML = def.campos.map((c) => htmlCampo(c, x || {})).join('');
    $('#error-dialogo').textContent = '';
    $('#guardar-dialogo').disabled = false;
    activarMedia($('#dialogo-cuerpo'), $('#error-dialogo'), $('#guardar-dialogo'));
    $('#dialogo').showModal();
    const primero = $('#dialogo-cuerpo input:not([type=hidden]):not([type=file]):not([type=checkbox]), #dialogo-cuerpo textarea');
    if (primero && matchMedia('(hover: hover)').matches) primero.focus();
  }

  $('#form-dialogo').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!enDialogo || subiendo) return;
    const { col, id } = enDialogo;
    const def = SECCIONES[col];
    const datos = leerCampos($('#dialogo-cuerpo'), def.campos);
    const falta = def.campos.flatMap((c) => c.fila || [c]).find((c) => c.req && !datos[c.k]);
    if (falta) { $('#error-dialogo').textContent = `Falta: ${falta.label.toLowerCase()}.`; return; }
    if (col === 'videos' && !datos.url && !datos.archivo) { $('#error-dialogo').textContent = 'Pega el enlace del video o sube el archivo.'; return; }
    const b = $('#guardar-dialogo');
    b.disabled = true;
    try {
      if (id) await api('PUT', `/editar/${col}/${id}`, datos);
      else await api('POST', `/editar/${col}`, datos);
      $('#dialogo').close();
      aviso('Guardado. Ya se ve en la página.');
      await recargar();
    } catch (err) {
      $('#error-dialogo').textContent = err.message;
    } finally { b.disabled = false; }
  });
  $$('[data-cerrar]').forEach((b) => b.addEventListener('click', () => $('#dialogo').close()));

  // ---------------------------------------------------------------------
  //  Acciones de las listas
  // ---------------------------------------------------------------------
  $('#panel').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-acc]');
    if (!b || !SECCIONES[tab]) return;
    const col = tab;
    const items = C[col] || [];
    const acc = b.dataset.acc;
    if (acc === 'nuevo') return abrirFormulario(col, null);
    const i = items.findIndex((x) => x.id === b.dataset.id);
    const x = items[i];
    if (!x) return;
    try {
      if (acc === 'editar') return abrirFormulario(col, x);
      b.disabled = true;
      if (acc === 'ver') {
        await api('PUT', `/editar/${col}/${x.id}`, { visible: x.visible === false });
        aviso(x.visible === false ? 'Ahora se muestra en la página' : 'Oculto: ya no se ve en la página');
      } else if (acc === 'subir' || acc === 'bajar') {
        const ids = items.map((y) => y.id);
        const j = acc === 'subir' ? i - 1 : i + 1;
        if (j < 0 || j >= ids.length) return;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        await api('PUT', `/editar/${col}/orden`, { ids });
      } else if (acc === 'borrar') {
        const nombre = x.nombre || x.titulo || `esta ${SECCIONES[col].uno}`;
        if (!confirm(`¿Eliminar “${nombre}”?\n\nSi solo quieres quitarlo un tiempo, mejor usa “Ocultar”.`)) { b.disabled = false; return; }
        await api('DELETE', `/editar/${col}/${x.id}`);
        aviso('Eliminado');
      }
      await recargar();
    } catch (err) { aviso(err.message, true); b.disabled = false; }
  });

  // ---------------------------------------------------------------------
  //  Información del gym
  // ---------------------------------------------------------------------
  const GRUPOS_SITIO = [
    ['Portada', 'Lo primero que se ve al abrir la página.', [
      { fila: [{ k: 'nombre', t: 'texto', label: 'Nombre del gym', max: 60 }, { k: 'ciudad', t: 'texto', label: 'Ciudad', max: 60 }] },
      { k: 'hero_titulo', t: 'texto', label: 'Título grande', max: 30, ayuda: 'De 1 a 3 palabras. Ej. STRONG GYM' },
      { k: 'hero_script', t: 'texto', label: 'Frase en letra de mano', max: 60 },
      { k: 'eslogan', t: 'texto', label: 'Frase debajo del título', max: 140 },
      { k: 'hero_imagen', t: 'imagen', label: 'Foto de fondo', max: 2000, ancha: true, ayuda: 'Horizontal. Si no eliges, se usa la primera foto del gym.' },
      { k: 'aviso', t: 'texto', label: 'Aviso arriba de todo (opcional)', max: 160, ayuda: 'Ej. "El lunes 16 abrimos de 8 a 14 h". Déjalo vacío para quitarlo.' },
    ]],
    ['Sobre el gym', '', [
      { k: 'descripcion', t: 'area', label: 'Descripción corta', max: 600 },
      { k: 'ventajas', t: 'area', label: 'Lo que encuentras', max: 1200, filas: 5, ayuda: 'Una por línea, con el formato  Título: explicación' },
      { k: 'marquesina', t: 'texto', label: 'Palabras de la cinta roja', max: 300, ayuda: 'Separadas por comas. Ej. Fuerza, Disciplina, Cardio' },
    ]],
    ['Página de productos', '', [
      { k: 'productos_titulo', t: 'texto', label: 'Título', max: 60 },
      { k: 'productos_texto', t: 'area', label: 'Texto', max: 300, filas: 2 },
    ]],
    ['Contacto y horario', '', [
      { fila: [{ k: 'whatsapp', t: 'texto', label: 'WhatsApp', max: 30, ayuda: '10 dígitos. Activa los botones de "Pedir" y "Escríbenos".' }, { k: 'telefono', t: 'texto', label: 'Teléfono', max: 30 }] },
      { k: 'email', t: 'texto', label: 'Correo', max: 80 },
      { k: 'direccion', t: 'area', label: 'Dirección', max: 200, filas: 2 },
      { k: 'maps_url', t: 'url', label: 'Enlace de Google Maps', ayuda: 'En Google Maps busca el gym → Compartir → Copiar enlace.' },
      { k: 'horario', t: 'area', label: 'Horario', max: 400, filas: 4, ayuda: 'Una línea por día o rango. Ej.  Lunes a viernes: 6:00 a 22:00' },
      { k: 'precio_visita', t: 'numero', label: 'Precio de la visita de un día (MXN)', ayuda: 'Déjalo vacío para no mostrarlo.' },
      { fila: [{ k: 'google_calificacion', t: 'texto', label: 'Calificación en Google', max: 4, ayuda: 'Ej. 4.6 (vacío = no se muestra).' }, { k: 'google_opiniones', t: 'texto', label: 'Número de opiniones', max: 10, ayuda: 'Ej. 50' }] },
    ]],
    ['Redes sociales', 'Pega el enlace de tu página. Los vacíos no se muestran.', [
      { k: 'facebook', t: 'url', label: 'Facebook' },
      { k: 'instagram', t: 'url', label: 'Instagram' },
      { k: 'tiktok', t: 'url', label: 'TikTok' },
    ]],
  ];

  function pintarSitio() {
    const s = C.sitio || {};
    $('#panel').innerHTML = `<div class="panel-cab"><div><h1>Información</h1><p>Textos, portada, contacto y redes de la página.</p></div></div>
      <form id="form-sitio" novalidate>
        ${GRUPOS_SITIO.map(([t, sub, campos]) => `<section class="grupo"><div><h2>${esc(t)}</h2>${sub ? `<p class="ayuda">${esc(sub)}</p>` : ''}</div>${campos.map((c) => htmlCampo(c, s)).join('')}</section>`).join('')}
        <p class="error" id="error-dialogo-sitio" role="alert"></p>
        <div class="guardar-fijo"><button class="btn btn-rojo" type="submit" id="guardar-sitio">Guardar cambios</button></div>
      </form>`;
    const f = $('#form-sitio');
    activarMedia(f, $('#error-dialogo-sitio'), $('#guardar-sitio'));
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (subiendo) return;
      const b = $('#guardar-sitio');
      b.disabled = true;
      $('#error-dialogo-sitio').textContent = '';
      try {
        C.sitio = await api('PUT', '/editar/sitio', leerCampos(f, GRUPOS_SITIO.flatMap((g) => g[2])));
        aviso('Guardado. Ya se ve en la página.');
      } catch (err) { $('#error-dialogo-sitio').textContent = err.message; aviso(err.message, true); }
      finally { b.disabled = false; }
    });
  }
  // ---------------------------------------------------------------------
  //  Clave
  // ---------------------------------------------------------------------
  function pintarClave() {
    $('#panel').innerHTML = `<div class="panel-cab"><div><h1>Clave</h1><p>La clave que se usa para entrar a editar la página. Al cambiarla, se cierra la sesión en los demás aparatos.</p></div></div>
      <form class="grupo" id="form-clave" style="max-width:460px">
        <label class="campo"><span>Clave actual</span><input type="password" name="actual" autocomplete="current-password" required></label>
        <label class="campo"><span>Clave nueva</span><input type="password" name="nueva" autocomplete="new-password" minlength="6" required><small class="ayuda">Mínimo 6 caracteres.</small></label>
        <label class="campo"><span>Repite la clave nueva</span><input type="password" name="repite" autocomplete="new-password" required></label>
        <p class="error" id="error-clave"></p>
        <button class="btn btn-rojo" type="submit">Cambiar clave</button>
      </form>`;
    $('#form-clave').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const err = $('#error-clave');
      err.textContent = '';
      if (f.nueva.value !== f.repite.value) { err.textContent = 'Las claves nuevas no son iguales.'; return; }
      try {
        await api('PUT', '/editar/clave', { actual: f.actual.value, nueva: f.nueva.value });
        f.reset();
        aviso('Clave cambiada');
      } catch (x) { err.textContent = x.message; }
    });
  }

  // ---------------------------------------------------------------------
  //  Entrar / salir / pestañas
  // ---------------------------------------------------------------------
  function mostrarEntrar() {
    $('#app').hidden = true;
    $('#entrar').hidden = false;
    if ($('#dialogo').open) $('#dialogo').close();
    setTimeout(() => $('#form-entrar input').focus(), 50);
  }
  async function mostrarApp() {
    $('#entrar').hidden = true;
    $('#app').hidden = false;
    pintar();
  }
  $('#form-entrar').addEventListener('submit', async (e) => {
    e.preventDefault();
    const b = $('button[type=submit]', e.target);
    b.disabled = true;
    $('#error-entrar').textContent = '';
    try {
      await api('POST', '/entrar', { clave: e.target.clave.value });
      e.target.reset();
      C = await api('GET', '/editar');
      mostrarApp();
    } catch (x) { $('#error-entrar').textContent = x.message; }
    finally { b.disabled = false; }
  });
  $('#salir').addEventListener('click', async () => {
    try { await api('POST', '/salir'); } catch (e) { /* nada */ }
    mostrarEntrar();
  });
  $('#pestanas').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    tab = b.dataset.tab;
    history.replaceState(null, '', `#${tab}`);
    pintar();
    scrollTo({ top: 0 });
  });
  addEventListener('beforeunload', (e) => { if (subiendo) { e.preventDefault(); e.returnValue = ''; } });

  (async function iniciar() {
    const h = location.hash.slice(1);
    if (SECCIONES[h] || h === 'sitio' || h === 'clave') tab = h;
    try {
      const r = await fetch('/api/editar', { credentials: 'same-origin' });
      if (r.status === 401) return mostrarEntrar();
      C = await r.json();
      mostrarApp();
    } catch (e) { mostrarEntrar(); }
  })();
})();
