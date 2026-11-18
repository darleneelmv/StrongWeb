/* =====================================================================
   Contenido de la página (productos, fotos, videos, promos, planes...).
   Se guarda como un JSON en el almacén (Netlify Blobs en internet,
   carpeta "datos-locales" al probar en la computadora).
   ===================================================================== */
export class ErrorApi extends Error { constructor(status, mensaje) { super(mensaje); this.status = status; } }
export const err = (status, mensaje) => { throw new ErrorApi(status, mensaje); };

const ZONA = 'America/Mexico_City';
export const hoy = () => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date());
export const ahora = () => new Date().toISOString();
export const nuevoId = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, '0')).join('');

export const RE_MEDIA = /^\/media\/[a-z0-9-]{6,40}\.(webp|jpg|png|gif|mp4|webm|mov)$/;
const RE_SEMILLA = /^\/semilla\/[a-z0-9-]{1,40}\.jpg$/;

// ---------------------------------------------------------------------
//  Campos de cada sección
// ---------------------------------------------------------------------
const T = (max, obligatorio = false) => ({ tipo: 'texto', max, obligatorio });
const N = { tipo: 'numero' };
const B = (def = false) => ({ tipo: 'bool', def });
const M = (obligatorio = false) => ({ tipo: 'media', obligatorio });
const VISIBLE = B(true);

export const ESQUEMAS = {
  productos: {
    nombre: T(80, true), categoria: T(40), precio: N, precio_antes: N, descripcion: T(700),
    imagen: M(), etiqueta: T(30), color: { tipo: 'color' }, destacado: B(), visible: VISIBLE,
  },
  fotos: { imagen: M(true), titulo: T(80), visible: VISIBLE },
  videos: { titulo: T(100), descripcion: T(400), url: { tipo: 'url' }, archivo: M(), portada: M(), visible: VISIBLE },
  promociones: { titulo: T(100, true), texto: T(700), imagen: M(), vigente_hasta: { tipo: 'fecha' }, visible: VISIBLE },
  planes: { nombre: T(60, true), precio: N, duracion: T(40), descripcion: T(300), destacado: B(), visible: VISIBLE },
};
const NOMBRES = { productos: 'producto', fotos: 'foto', videos: 'video', promociones: 'promoción', planes: 'plan' };

const CAMPOS_SITIO = {
  nombre: T(60), ciudad: T(60), eslogan: T(140), descripcion: T(600),
  hero_titulo: T(30), hero_script: T(60), hero_imagen: M(), aviso: T(160),
  marquesina: T(300), ventajas: T(1200),
  productos_titulo: T(60), productos_texto: T(300),
  horario: T(400), telefono: T(30), whatsapp: T(30), contactos: T(400), email: T(80), direccion: T(200),
  maps_url: { tipo: 'url' }, facebook: { tipo: 'url' }, instagram: { tipo: 'url' }, tiktok: { tipo: 'url' },
  precio_visita: N, google_calificacion: T(4), google_opiniones: T(10),
};

async function limpiarValor(def, v, campo, existeMedia) {
  const vacio = v === undefined || v === null || String(v).trim() === '';
  switch (def.tipo) {
    case 'texto':
      if (vacio) { if (def.obligatorio) err(400, `Falta llenar: ${campo}.`); return ''; }
      return String(v).replace(/\r\n/g, '\n').trim().slice(0, def.max);
    case 'numero': {
      if (vacio) return null;
      const n = Number(String(v).replace(/[$,\s]/g, ''));
      if (!Number.isFinite(n) || n < 0 || n > 1e7) err(400, `El ${campo} no es un número válido.`);
      return Math.round(n * 100) / 100;
    }
    case 'bool': return v === undefined ? def.def : v === true || v === 1 || v === '1' || v === 'true';
    case 'color': return /^#[0-9a-f]{6}$/i.test(String(v || '')) ? String(v).toLowerCase() : '';
    case 'fecha': return /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '';
    case 'url': {
      if (vacio) return '';
      let u = String(v).trim();
      if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
      try { const x = new URL(u); if (!/^https?:$/.test(x.protocol)) throw new Error(); return x.href.slice(0, 500); }
      catch (e) { return err(400, `La dirección de ${campo} no es válida.`); }
    }
    case 'media': {
      if (vacio) { if (def.obligatorio) err(400, 'Falta subir la imagen.'); return ''; }
      const s = String(v);
      if (RE_SEMILLA.test(s)) return s;
      if (!RE_MEDIA.test(s)) err(400, 'El archivo no es válido. Súbelo de nuevo.');
      if (!(await existeMedia(s.slice(7)))) err(400, 'El archivo ya no existe. Súbelo de nuevo.');
      return s;
    }
    default: return '';
  }
}

async function limpiar(esquema, entrada, actual, existeMedia) {
  const r = {};
  for (const [campo, def] of Object.entries(esquema)) {
    const v = campo in entrada ? entrada[campo] : actual[campo];
    // Un archivo que no cambió no se vuelve a revisar
    if (def.tipo === 'media' && v && v === actual[campo]) { r[campo] = v; continue; }
    r[campo] = await limpiarValor(def, v, campo.replace(/_/g, ' '), existeMedia);
  }
  return r;
}

// ---------------------------------------------------------------------
//  Contenido con su almacén
// ---------------------------------------------------------------------
export function crearContenido(almacen) {
  const existeMedia = async (nombre) => !!(await almacen.meta(`media/${nombre}`));
  let c = null;

  async function leer() {
    if (c) return c;
    c = await almacen.json('contenido');
    if (!c) { c = contenidoInicial(); await almacen.guardarJSON('contenido', c); }
    for (const k of Object.keys(ESQUEMAS)) if (!Array.isArray(c[k])) c[k] = [];
    c.sitio = c.sitio || {};
    return c;
  }

  async function guardar() {
    c.actualizado = ahora();
    await almacen.guardarJSON('contenido', c);
    // Una copia por día (se guardan las últimas 14)
    try {
      await almacen.guardarJSON(`respaldos/${hoy()}`, c);
      const viejos = (await almacen.listar('respaldos/')).sort().reverse().slice(14);
      for (const k of viejos) await almacen.borrar(k);
    } catch (e) { console.error('Respaldo:', e.message); }
    await limpiarHuerfanos();
  }

  /** Una vez al día borra fotos y videos que ya no usa nada. */
  async function limpiarHuerfanos() {
    try {
      const marca = await almacen.json('limpieza');
      if (marca && marca.dia === hoy()) return;
      await almacen.guardarJSON('limpieza', { dia: hoy() });
      let usado = JSON.stringify(c);
      for (const k of await almacen.listar('respaldos/')) usado += JSON.stringify(await almacen.json(k));
      const limite = Date.now() - 24 * 3600e3;
      for (const k of await almacen.listar('media/')) {
        const nombre = k.slice(6);
        if (usado.includes(`/media/${nombre}`)) continue;
        const m = await almacen.meta(k);
        if (m && Date.parse(m.creado) > limite) continue;
        for (const p of await almacen.listar(`partes/${nombre}/`)) await almacen.borrar(p);
        await almacen.borrar(k);
      }
      // Subidas que se quedaron a medias
      for (const k of await almacen.listar('pendiente/')) {
        const m = await almacen.json(k);
        if (m && Date.parse(m.creado) > limite) continue;
        const nombre = k.slice(10);
        for (const p of await almacen.listar(`partes/${nombre}/`)) await almacen.borrar(p);
        await almacen.borrar(k);
      }
    } catch (e) { console.error('Limpieza:', e.message); }
  }

  async function publico() {
    const x = await leer();
    const h = hoy();
    const vis = (y) => y.visible !== false;
    const sin = ({ visible, creado, ...r }) => r;
    return {
      sitio: x.sitio,
      productos: x.productos.filter(vis).map(sin),
      fotos: x.fotos.filter(vis).map(sin),
      videos: x.videos.filter(vis).map(sin),
      promociones: x.promociones.filter((p) => vis(p) && (!p.vigente_hasta || p.vigente_hasta >= h)).map(sin),
      planes: x.planes.filter(vis).map(sin),
      actualizado: x.actualizado,
    };
  }

  async function lista(nombre) {
    if (!ESQUEMAS[nombre]) err(404, 'Sección no encontrada.');
    return (await leer())[nombre];
  }
  const validarExtra = (nombre, d) => {
    if (nombre === 'videos' && !d.url && !d.archivo) err(400, 'Pega el enlace del video (Instagram, YouTube, Facebook o TikTok) o sube el archivo.');
  };

  return {
    leer, publico,
    async crear(nombre, entrada) {
      const l = await lista(nombre);
      const d = await limpiar(ESQUEMAS[nombre], entrada || {}, {}, existeMedia);
      validarExtra(nombre, d);
      const fila = { id: nuevoId(), ...d, creado: ahora() };
      if (nombre === 'promociones' || nombre === 'videos') l.unshift(fila); else l.push(fila);
      await guardar();
      return fila;
    },
    async editar(nombre, id, entrada) {
      const l = await lista(nombre);
      const i = l.findIndex((y) => y.id === id);
      if (i < 0) err(404, `No se encontró ese ${NOMBRES[nombre]}.`);
      const d = await limpiar(ESQUEMAS[nombre], entrada || {}, l[i], existeMedia);
      validarExtra(nombre, d);
      l[i] = { ...l[i], ...d };
      await guardar();
      return l[i];
    },
    async borrar(nombre, id) {
      const l = await lista(nombre);
      const i = l.findIndex((y) => y.id === id);
      if (i < 0) err(404, `No se encontró ese ${NOMBRES[nombre]}.`);
      l.splice(i, 1);
      await guardar();
      return { ok: true };
    },
    async ordenar(nombre, ids) {
      const l = await lista(nombre);
      if (!Array.isArray(ids)) err(400, 'Orden no válido.');
      const pos = new Map(ids.map((y, i) => [y, i]));
      l.sort((a, b) => (pos.has(a.id) ? pos.get(a.id) : 1e9) - (pos.has(b.id) ? pos.get(b.id) : 1e9));
      await guardar();
      return { ok: true };
    },
    async editarSitio(entrada) {
      const x = await leer();
      const cambios = {};
      for (const [campo, def] of Object.entries(CAMPOS_SITIO)) {
        if (!(campo in (entrada || {}))) continue;
        cambios[campo] = def.tipo === 'media' && entrada[campo] && entrada[campo] === x.sitio[campo]
          ? entrada[campo] : await limpiarValor(def, entrada[campo], campo.replace(/_/g, ' '), existeMedia);
      }
      x.sitio = { ...x.sitio, ...cambios };
      await guardar();
      return x.sitio;
    },
  };
}

// ---------------------------------------------------------------------
//  Contenido de arranque (con los datos reales del gym)
// ---------------------------------------------------------------------
export function contenidoInicial() {
  const t = ahora();
  const fila = (o) => ({ id: nuevoId(), visible: true, creado: t, ...o });
  const finMes = (() => { const [y, m] = hoy().split('-').map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); })();
  const mal = (nombre, descripcion, precio, color, etiqueta = '', destacado = false) => fila({
    nombre, categoria: 'Malteadas', precio, precio_antes: null, descripcion, imagen: '', etiqueta, color, destacado,
  });
  const prod = (categoria, nombre, descripcion, precio, etiqueta = '', destacado = false, imagen = '') => fila({
    nombre, categoria, precio, precio_antes: null, descripcion, imagen, etiqueta, color: '', destacado,
  });
  return {
    sitio: {
      nombre: 'Strong Gym', ciudad: 'Puruándiro',
      eslogan: 'Pesas, cardio y malteadas premium con proteína de calidad en Puruándiro. Abrimos los 7 días de la semana.',
      descripcion: 'Un gym con ambiente de comunidad para que alcances tus metas, empieces de cero o vengas de años entrenando.',
      hero_titulo: 'STRONG GYM', hero_script: 'tu cuerpo, tu fuerza', hero_imagen: '/semilla/fachada.jpg',
      aviso: '',
      marquesina: 'Tu cuerpo, Tu fuerza, Disciplina, Malteadas premium, Proteína de calidad, Comunidad, Sin excusas',
      ventajas: 'Pesas y peso libre: Máquinas, mancuernas y racks para entrenar todo el cuerpo.\nCardio: Caminadoras, bicicletas y elípticas.\nAsesoría en piso: Te enseñamos a usar los aparatos y armar tu rutina.\nMalteadas premium: Con proteína de calidad, de $60 a $70. Elige tu sabor y tu mezcla.',
      productos_titulo: 'Nuestros productos',
      productos_texto: 'Malteadas premium, proteínas, creatinas, pre-entrenos y snacks. Pregunta en recepción o pídelos por WhatsApp.',
      horario: 'Lunes a viernes: 6:00 a.m. a 10:00 p.m.\nSábados: 7:00 a.m. a 5:00 p.m.\nDomingos: 7:00 a.m. a 3:00 p.m.',
      telefono: '', whatsapp: '', email: '',
      contactos: 'Daniel Pérez Tapia: 438 115 2010\nVíctor Manuel Chávez Ramos: 438 132 1545\nJuan Diego León González: 438 131 9259',
      direccion: 'Ana María Gallaga 255, Los Presidentes\n58502 Puruándiro, Mich.',
      maps_url: 'https://www.google.com/maps/search/?api=1&query=Strong+Gym+Ana+Mar%C3%ADa+Gallaga+255+Puru%C3%A1ndiro',
      facebook: '', instagram: 'https://www.instagram.com/strong_gym_mich/', tiktok: '',
      precio_visita: null, google_calificacion: '4.6', google_opiniones: '50',
    },
    productos: [
      mal('Fresa Real', 'Fresa congelada, hielo y nieve con la proteína que tú elijas. De $60 a $70 según tu mezcla.', 60, '#e0566f', 'Más pedida', true),
      mal('Chocolate Extremo', 'Chocolate con crema de cacahuate, hielo y nieve. De $60 a $70 según tu mezcla.', 60, '#5a3220', '', true),
      mal('Vainilla Tropical', 'Vainilla con plátano y frutos rojos, hielo y nieve. De $60 a $70 según tu mezcla.', 60, '#e9d3a3', '', true),
      mal('Arma tu malteada', 'Elige tu proteína (Carnivor, Isopure, BUM, Syntha-6, Dymatize o Muscle Milk) y agrégale fruta congelada, crema de cacahuate, hielo y nieve.', 60, '#c8102e', 'Tú eliges'),
      prod('Proteínas', 'Proteína en polvo', 'Syntha-6, Nitro-Tech, BUM, Isopure y otras marcas. Pregunta por sabores y presentaciones.', null, '', true, '/semilla/prod-proteina.jpg'),
      prod('Suplementos', 'Creatina', 'Creatina monohidratada de varias marcas, incluida BUM, para fuerza y rendimiento.', null, '', false, '/semilla/prod-creatina.jpg'),
      prod('Suplementos', 'Pre-entrenos', 'C4, Ghost, Fury y otras marcas para tener más energía en tus entrenamientos.', null, '', false, '/semilla/prod-preentreno.jpg'),
      prod('Suplementos', 'Colágeno y aminoácidos', 'Colágeno, carnitina, glutamina y Amino Energy para tu recuperación.', null, '', false, '/semilla/prod-colageno.jpg'),
      prod('Snacks', 'Snacks de proteína', 'Brownies Zero, galletas Soft Baked, barras de proteína y más para llevar.', null, '', false, '/semilla/prod-snacks.jpg'),
      prod('Bebidas', 'Agua y bebidas frías', 'En el refrigerador de recepción.', null),
    ],
    fotos: [
      fila({ imagen: '/semilla/fachada.jpg', titulo: 'Nuestra entrada en Ana María Gallaga 255' }),
      fila({ imagen: '/semilla/malteadas.jpg', titulo: 'Malteadas premium de $60 a $70' }),
      fila({ imagen: '/semilla/suplementos.jpg', titulo: 'Suplementos y snacks en recepción' }),
    ],
    videos: [],
    promociones: [
      fila({ titulo: 'Mes estudiante a $350', texto: 'Presenta tu credencial escolar vigente y entrena todo el mes por $350.', imagen: '/semilla/promo3.jpg', vigente_hasta: '' }),
      fila({ titulo: 'Trae a un amigo', texto: 'Entrenar acompañado es más fácil. Pregunta en recepción por la promoción para amigos.', imagen: '/semilla/promo2.jpg', vigente_hasta: '' }),
      fila({ titulo: 'Inscríbete este mes', texto: 'Ven a conocernos y empieza hoy. Pregunta por la promoción de inscripción.', imagen: '/semilla/promo1.jpg', vigente_hasta: finMes }),
    ],
    planes: [
      fila({ nombre: 'Mes estudiantes', precio: 350, duracion: '1 mes', descripcion: 'Con credencial escolar vigente.', destacado: true }),
      fila({ nombre: 'Mes', precio: 390, duracion: '1 mes', descripcion: 'Acceso libre todo el mes.', destacado: false }),
      fila({ nombre: 'Quincena', precio: 230, duracion: '15 días', descripcion: 'Acceso libre durante 15 días.', destacado: false }),
      fila({ nombre: 'Semana', precio: 150, duracion: '7 días', descripcion: 'Acceso libre durante 7 días.', destacado: false }),
      fila({ nombre: 'Visita', precio: 40, duracion: '1 día', descripcion: 'Entrena un día sin membresía.', destacado: false }),
    ],
    actualizado: t,
  };
}
