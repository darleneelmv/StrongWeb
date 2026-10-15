/* =====================================================================
   API de la página. La misma función corre en Netlify y en la
   computadora (dev/servidor.mjs); solo cambia el almacén.
     GET  /api/contenido          contenido público
     POST /api/entrar | /api/salir
     /api/editar/...              cambios de recepción (piden la clave)
     GET  /media/<archivo>        fotos y videos subidos
   ===================================================================== */
import { ErrorApi, err, crearContenido, ESQUEMAS, nuevoId } from './datos.mjs';
import { crearAcceso } from './acceso.mjs';

// Los archivos se suben y se guardan en trozos de 3 MB
// (Netlify acepta como máximo ~4.5 MB por petición).
export const TROZO = 3 * 1024 * 1024;
const MAX_STREAM = 18 * 1024 * 1024;

const json = (status, obj, extra = {}) => new Response(JSON.stringify(obj), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
});
async function leerJson(req) {
  if (!/application\/json/.test(req.headers.get('content-type') || '')) err(415, 'Formato no admitido.');
  const t = await req.text();
  if (t.length > 256 * 1024) err(413, 'La información es demasiado grande.');
  if (!t) return {};
  try { return JSON.parse(t); } catch (e) { return err(400, 'Datos con formato incorrecto.'); }
}

// ---------------------------------------------------------------------
//  Subir archivos por partes
// ---------------------------------------------------------------------
const TIPOS = {
  'image/webp': ['.webp', 'imagen'], 'image/jpeg': ['.jpg', 'imagen'], 'image/png': ['.png', 'imagen'], 'image/gif': ['.gif', 'imagen'],
  'video/mp4': ['.mp4', 'video'], 'video/webm': ['.webm', 'video'], 'video/quicktime': ['.mov', 'video'],
};
const EXT_TIPO = Object.fromEntries(Object.entries(TIPOS).map(([t, [e]]) => [e, t]));
function firmaValida(ext, b) {
  const txt = (i, j) => String.fromCharCode(...b.slice(i, j));
  if (ext === '.jpg') return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (ext === '.png') return b[0] === 0x89 && txt(1, 4) === 'PNG';
  if (ext === '.webp') return txt(0, 4) === 'RIFF' && txt(8, 12) === 'WEBP';
  if (ext === '.gif') return txt(0, 4) === 'GIF8';
  if (ext === '.webm') return b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
  return txt(4, 8) === 'ftyp'; // mp4 / mov
}

async function subir(req, url, almacen, entorno) {
  if (req.headers.get('x-subir') !== '1') err(403, 'Envío no permitido.');
  const q = url.searchParams;
  const parte = Number(q.get('parte') || 0);
  const total = Number(q.get('total') || 1);
  const tam = Number(q.get('tam') || 0);
  const datos = new Uint8Array(await req.arrayBuffer());
  if (!Number.isInteger(parte) || !Number.isInteger(total) || parte < 0 || total < 1 || parte >= total || total > 200) err(400, 'Parte no válida.');
  if (datos.length > TROZO) err(413, 'La parte es demasiado grande.');

  let nombre = q.get('nombre') || '';
  let pend;
  if (parte === 0) {
    const tipo = String(req.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const def = TIPOS[tipo];
    if (!def) err(415, 'Tipo de archivo no admitido. Fotos: JPG, PNG o WebP. Videos: MP4, MOV o WebM.');
    const [ext, clase] = def;
    const maxMb = clase === 'video' ? entorno.VIDEO_MAX_MB : 8;
    if (!tam || tam > maxMb * 1024 * 1024) err(413, `El archivo pesa más de ${maxMb} MB.${clase === 'video' ? ' Para videos largos súbelo a Instagram o YouTube y pega el enlace.' : ''}`);
    if (Math.ceil(tam / TROZO) !== total) err(400, 'Partes no válidas.');
    if (!firmaValida(ext, datos)) err(400, 'El archivo está dañado o no es del tipo indicado.');
    nombre = `${Date.now().toString(36)}-${nuevoId()}${ext}`;
    pend = { tipo, tam, total, creado: new Date().toISOString() };
    await almacen.guardarJSON(`pendiente/${nombre}`, pend);
  } else {
    if (!/^[a-z0-9]+-[a-f0-9]{12}\.[a-z0-9]{3,4}$/.test(nombre)) err(400, 'Subida no válida.');
    pend = await almacen.json(`pendiente/${nombre}`);
    if (!pend || pend.total !== total) err(400, 'La subida expiró. Vuelve a intentarlo.');
  }
  const esperado = parte < total - 1 ? TROZO : pend.tam - TROZO * (total - 1);
  if (datos.length !== esperado) err(400, 'Se perdió parte del archivo. Vuelve a intentarlo.');
  await almacen.guardarBytes(`partes/${nombre}/${String(parte).padStart(3, '0')}`, datos);

  if (parte < total - 1) return { nombre, parte };
  const partes = await almacen.listar(`partes/${nombre}/`);
  if (partes.length !== total) err(400, 'Faltan partes del archivo. Vuelve a intentarlo.');
  await almacen.guardarJSON(`media/${nombre}`, { tipo: pend.tipo, tam: pend.tam, partes: total, creado: pend.creado }, { tipo: pend.tipo, tam: pend.tam, partes: total, creado: pend.creado });
  await almacen.borrar(`pendiente/${nombre}`);
  return { url: `/media/${nombre}`, tam: pend.tam };
}

// ---------------------------------------------------------------------
//  Entregar fotos y videos (los videos por rangos para poder adelantar)
// ---------------------------------------------------------------------
async function media(req, nombre, almacen) {
  if (!/^[a-z0-9]+-[a-f0-9]{12}\.(webp|jpg|png|gif|mp4|webm|mov)$/.test(nombre)) return new Response('No encontrado', { status: 404 });
  const m = await almacen.meta(`media/${nombre}`);
  if (!m) return new Response('No encontrado', { status: 404 });
  const tipo = m.tipo || EXT_TIPO[nombre.slice(nombre.lastIndexOf('.'))] || 'application/octet-stream';
  const parte = (i) => almacen.bytes(`partes/${nombre}/${String(i).padStart(3, '0')}`);
  const video = tipo.startsWith('video/');
  const base = video
    ? { 'Content-Type': tipo, 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=604800', 'Netlify-CDN-Cache-Control': 'no-store' }
    : { 'Content-Type': tipo, 'Cache-Control': 'public, max-age=31536000, immutable' };
  const cuerpo = (b) => (req.method === 'HEAD' ? null : b);

  if (m.partes === 1 && !video) return new Response(cuerpo(await parte(0)), { status: 200, headers: { ...base, 'Content-Length': String(m.tam) } });

  const r = String(req.headers.get('range') || '').match(/^bytes=(\d*)-(\d*)$/);
  if (video && r && (r[1] || r[2])) {
    let ini = r[1] ? Number(r[1]) : Math.max(0, m.tam - Number(r[2]));
    let fin = r[1] && r[2] ? Math.min(Number(r[2]), m.tam - 1) : m.tam - 1;
    if (ini >= m.tam || ini > fin) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${m.tam}` } });
    const i = Math.floor(ini / TROZO);
    fin = Math.min(fin, (i + 1) * TROZO - 1); // una parte por respuesta
    const datos = await parte(i);
    const trozo = datos.slice(ini - i * TROZO, fin - i * TROZO + 1);
    return new Response(cuerpo(trozo), { status: 206, headers: { ...base, 'Content-Range': `bytes ${ini}-${fin}/${m.tam}`, 'Content-Length': String(trozo.length) } });
  }
  if (m.tam <= MAX_STREAM) {
    if (req.method === 'HEAD') return new Response(null, { status: 200, headers: { ...base, 'Content-Length': String(m.tam) } });
    let i = 0;
    const stream = new ReadableStream({
      async pull(ctrl) {
        if (i >= m.partes) { ctrl.close(); return; }
        ctrl.enqueue(await parte(i++));
      },
    });
    return new Response(stream, { status: 200, headers: { ...base, 'Content-Length': String(m.tam) } });
  }
  // Video grande sin rango: se manda la primera parte; el navegador pide lo demás
  const datos = await parte(0);
  return new Response(cuerpo(datos), { status: 206, headers: { ...base, 'Content-Range': `bytes 0-${datos.length - 1}/${m.tam}`, 'Content-Length': String(datos.length) } });
}

// ---------------------------------------------------------------------
//  Entrada
// ---------------------------------------------------------------------
export async function atender(req, { ip = '', almacen, entorno = {} }) {
  const url = new URL(req.url);
  const camino = url.pathname;
  const m = req.method;
  const ent = { VIDEO_MAX_MB: Number(entorno.VIDEO_MAX_MB) || 80, ...entorno };
  try {
    if (camino.startsWith('/media/')) {
      if (m !== 'GET' && m !== 'HEAD') err(405, 'Método no permitido.');
      return await media(req, decodeURIComponent(camino.slice(7)), almacen);
    }
    const contenido = crearContenido(almacen);
    const acceso = crearAcceso(almacen, ent);

    if (camino === '/api/contenido' && (m === 'GET' || m === 'HEAD')) return json(200, await contenido.publico(), { 'Cache-Control': 'no-cache' });
    if (camino === '/api/salud') return json(200, { ok: true });
    if (camino === '/api/entrar' && m === 'POST') {
      const b = await leerJson(req);
      return json(200, { ok: true }, { 'Set-Cookie': await acceso.entrar(b.clave, ip) });
    }
    if (camino === '/api/salir' && m === 'POST') return json(200, { ok: true }, { 'Set-Cookie': acceso.cookieBorrar() });

    if (!camino.startsWith('/api/editar')) err(404, 'No encontrado.');
    if (!(await acceso.autorizado(req))) err(401, 'Tu sesión terminó. Vuelve a escribir la clave.');

    const partes = camino.split('/').filter(Boolean).slice(2); // api/editar/<col>/<id>
    if (!partes.length && m === 'GET') return json(200, { ...(await contenido.leer()), limites: { video_mb: ent.VIDEO_MAX_MB, trozo: TROZO } });
    if (partes[0] === 'subir' && m === 'POST') return json(200, await subir(req, url, almacen, ent));
    if (partes[0] === 'clave' && m === 'PUT') {
      const b = await leerJson(req);
      return json(200, { ok: true }, { 'Set-Cookie': await acceso.cambiarClave(b.actual, b.nueva) });
    }
    if (partes[0] === 'sitio' && m === 'PUT') return json(200, await contenido.editarSitio(await leerJson(req)));

    const [col, id] = partes;
    if (!ESQUEMAS[col]) err(404, 'Sección no encontrada.');
    if (m === 'POST' && !id) return json(200, await contenido.crear(col, await leerJson(req)));
    if (m === 'PUT' && id === 'orden') return json(200, await contenido.ordenar(col, (await leerJson(req)).ids));
    if (m === 'PUT' && id) return json(200, await contenido.editar(col, id, await leerJson(req)));
    if (m === 'DELETE' && id) return json(200, await contenido.borrar(col, id));
    return err(405, 'Acción no permitida.');
  } catch (e) {
    const status = e instanceof ErrorApi ? e.status : 500;
    if (status >= 500) console.error(e);
    return json(status, { error: status >= 500 ? 'Ocurrió un error en el servidor. Intenta de nuevo.' : e.message });
  }
}
