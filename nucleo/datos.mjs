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
  horario: T(400), telefono: T(30), whatsapp: T(30), email: T(80), direccion: T(200),
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
  const prod = (categoria, nombre, descripcion, precio, etiqueta = '', destacado = false) => fila({
    nombre, categoria, precio, precio_antes: null, descripcion, imagen: '', etiqueta, color: '', destacado,
  });
  return {
    sitio: {
      nombre: 'Strong Gym', ciudad: 'Puruándiro',
      eslogan: 'Pesas, cardio y barra de proteína en Puruándiro. Abrimos los 7 días de la semana.',
      descripcion: 'Un gym con ambiente de comunidad para que alcances tus metas, empieces de cero o vengas de años entrenando.',
      hero_titulo: 'STRONG GYM', hero_script: 'tu cuerpo, tu fuerza', hero_imagen: '',
      aviso: '',
      marquesina: 'Tu cuerpo, Tu fuerza, Disciplina, Cardio, Proteína, Comunidad, Sin excusas',
      ventajas: 'Pesas y peso libre: Máquinas, mancuernas y racks para entrenar todo el cuerpo.\nCardio: Caminadoras, bicicletas y elípticas.\nAsesoría en piso: Te enseñamos a usar los aparatos y armar tu rutina.\nBarra de proteína: Malteadas y suplementos para antes o después de entrenar.',
      productos_titulo: 'Nuestros productos',
      productos_texto: 'Malteadas, suplementos y accesorios. Pregunta en recepción o pídelos por WhatsApp.',
      horario: 'Lunes a viernes: 6:00 a.m. a 10:00 p.m.\nSábados: 7:00 a.m. a 5:00 p.m.\nDomingos: 7:00 a.m. a 3:00 p.m.',
      telefono: '', whatsapp: '', email: '',
      direccion: 'Ana María Gallaga 255, Los Presidentes\n58502 Puruándiro, Mich.',
      maps_url: 'https://www.google.com/maps/search/?api=1&query=Strong+Gym+Ana+Mar%C3%ADa+Gallaga+255+Puru%C3%A1ndiro',
      facebook: '', instagram: 'https://www.instagram.com/strong_gym_mich/', tiktok: '',
      precio_visita: null, google_calificacion: '4.6', google_opiniones: '50',
    },
    productos: [
      mal('Chocolate Power', 'Chocolate intenso con plátano y crema de cacahuate. 30 g de proteína.', 65, '#5a3220', 'Más pedida', true),
      mal('Fresa Strong', 'Fresa natural con avena: dulce, fresca y llenadora. 25 g de proteína.', 60, '#d6334f'),
      mal('Mango Tropical', 'Mango con un toque de coco y yogur griego. 25 g de proteína.', 60, '#f29a1f', 'Nueva', true),
      mal('Moras Recovery', 'Mora azul, frambuesa y avena para recuperarte después de pierna. 27 g de proteína.', 65, '#3a3fa8'),
      mal('Cookies & Cream', 'Vainilla con galleta triturada. Tu antojo, con 28 g de proteína.', 70, '#2a2f3a'),
      mal('Café Pre-entreno', 'Espresso con proteína de vainilla y canela para arrancar con energía.', 60, '#8a5a3c', 'Antes de entrenar'),
      prod('Suplementos', 'Proteína whey 2 lb', 'Proteína de suero de leche. Pregunta por los sabores disponibles.', 750, '', true),
      prod('Suplementos', 'Creatina monohidratada', 'Para fuerza y rendimiento. Presentación de 300 g.', 450),
      prod('Suplementos', 'Pre-entreno', 'Energía y enfoque para tus entrenamientos más pesados.', 520),
      prod('Bebidas', 'Agua natural 1 L', 'Bien fría, en recepción.', 15),
      prod('Bebidas', 'Bebida isotónica', 'Recupera electrolitos después de entrenar.', 25),
      prod('Accesorios', 'Shaker Strong Gym', 'Vaso mezclador con el logo del gym.', 120, 'Edición gym', true),
      prod('Accesorios', 'Guantes de entrenamiento', 'Protegen tus manos y mejoran el agarre.', 180),
      prod('Ropa', 'Playera Strong Gym', 'Playera deportiva con el logo. Tallas CH a XG.', 250),
    ],
    fotos: [
      fila({ imagen: '/semilla/gal1.jpg', titulo: 'Área de pesas' }),
      fila({ imagen: '/semilla/gal2.jpg', titulo: 'Zona de cardio' }),
      fila({ imagen: '/semilla/gal3.jpg', titulo: 'Peso libre' }),
      fila({ imagen: '/semilla/gal4.jpg', titulo: 'Funcional' }),
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
