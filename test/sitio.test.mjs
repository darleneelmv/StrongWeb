/* Prueba de punta a punta con el servidor local (misma lógica que en Netlify).
   Uso:  npm test */
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sg-'));
process.env.DATOS = dir;
process.env.VIDEO_MAX_MB = '12';
const { servidor } = await import('../dev/servidor.mjs');

const TROZO = 3 * 1024 * 1024;
let base;
let cookie = '';
const pedir = async (metodo, ruta, cuerpo, extra = {}) => {
  const r = await fetch(base + ruta, {
    method: metodo,
    headers: { ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...extra },
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
  const sc = r.headers.get('set-cookie');
  if (sc) cookie = sc.split(';')[0];
  let d = null;
  try { d = await r.json(); } catch (e) { /* nada */ }
  return { status: r.status, d };
};
/** Sube igual que el editor: por partes de 3 MB. */
async function subir(buf, tipo, extra = { 'X-Subir': '1' }) {
  const total = Math.max(1, Math.ceil(buf.length / TROZO));
  let nombre = '';
  let r;
  for (let i = 0; i < total; i++) {
    const q = new URLSearchParams({ parte: i, total, tam: buf.length });
    if (nombre) q.set('nombre', nombre);
    const res = await fetch(`${base}/api/editar/subir?${q}`, { method: 'POST', headers: { 'Content-Type': tipo, Cookie: cookie, ...extra }, body: buf.subarray(i * TROZO, (i + 1) * TROZO) });
    r = { status: res.status, d: await res.json() };
    if (r.status !== 200) return r;
    nombre = r.d.nombre;
  }
  return r;
}

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const video = (mb) => { const b = Buffer.alloc(Math.round(mb * 1024 * 1024)); Buffer.from([0, 0, 0, 24]).copy(b, 0); Buffer.from('ftypmp42').copy(b, 4); for (let i = 16; i < b.length; i++) b[i] = i % 251; return b; };

test.before(() => new Promise((ok) => servidor.listen(0, '127.0.0.1', () => { base = `http://127.0.0.1:${servidor.address().port}`; ok(); })));
test.after(() => { servidor.close(); fs.rmSync(dir, { recursive: true, force: true }); });

test('contenido inicial con los datos reales', async () => {
  const { status, d } = await pedir('GET', '/api/contenido');
  assert.equal(status, 200);
  assert.deepEqual(d.planes.map((p) => [p.nombre, p.precio]), [['Mes estudiantes', 350], ['Mes', 390], ['Quincena', 230], ['Semana', 150], ['Visita', 40]]);
  assert.match(d.sitio.horario, /Domingos: 7:00 a\.m\. a 3:00 p\.m\./);
  assert.equal(d.sitio.instagram, 'https://www.instagram.com/strong_gym_mich/');
  for (const r of ['/', '/productos', '/editar', '/semilla/gal1.jpg']) assert.equal((await fetch(base + r)).status, 200, r);
});

test('sin clave no se puede editar', async () => {
  assert.equal((await pedir('GET', '/api/editar')).status, 401);
  assert.equal((await pedir('POST', '/api/editar/productos', { nombre: 'X' })).status, 401);
  assert.equal((await pedir('POST', '/api/entrar', { clave: 'mala' })).status, 401);
});

test('la clave inicial funciona', async () => {
  assert.equal((await pedir('POST', '/api/entrar', { clave: 'Strong-s4wf-6630' })).status, 200);
  assert.equal((await pedir('GET', '/api/editar')).status, 200);
});

test('subir foto y agregar producto', async () => {
  assert.equal((await subir(PNG, 'image/png', {})).status, 403, 'sin X-Subir');
  assert.equal((await subir(Buffer.from('<script>alert(1)</script>'), 'image/png')).status, 400, 'archivo falso');
  const f = await subir(PNG, 'image/png');
  assert.equal(f.status, 200);
  const p = await pedir('POST', '/api/editar/productos', { nombre: 'Barra de proteína', categoria: 'Snacks', precio: '$35', imagen: f.d.url, destacado: true });
  assert.equal(p.status, 200);
  assert.equal(p.d.precio, 35);
  const img = await fetch(base + f.d.url);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/png');
  assert.deepEqual(Buffer.from(await img.arrayBuffer()), PNG);
  await pedir('PUT', `/api/editar/productos/${p.d.id}`, { visible: false });
  assert.ok(!(await pedir('GET', '/api/contenido')).d.productos.some((x) => x.id === p.d.id));
  assert.equal((await pedir('POST', '/api/editar/productos', { nombre: 'X', imagen: '/media/../../etc/passwd' })).status, 400);
});

test('video de 7 MB: se sube por partes y se puede adelantar', async () => {
  const v = video(7);
  const r = await subir(v, 'video/mp4');
  assert.equal(r.status, 200, JSON.stringify(r.d));
  const g = await pedir('POST', '/api/editar/videos', { titulo: 'Clase', archivo: r.d.url });
  assert.equal(g.status, 200);
  // Rango que cruza de una parte a otra: se responde hasta el final de la parte
  const a = await fetch(base + r.d.url, { headers: { Range: `bytes=${TROZO - 10}-${TROZO + 10}` } });
  assert.equal(a.status, 206);
  assert.equal(a.headers.get('content-range'), `bytes ${TROZO - 10}-${TROZO - 1}/${v.length}`);
  assert.deepEqual(Buffer.from(await a.arrayBuffer()), v.subarray(TROZO - 10, TROZO));
  const b = await fetch(base + r.d.url, { headers: { Range: `bytes=${TROZO * 2 + 5}-` } });
  assert.deepEqual(Buffer.from(await b.arrayBuffer()), v.subarray(TROZO * 2 + 5));
  const todo = await fetch(base + r.d.url);
  assert.equal(todo.status, 200);
  assert.deepEqual(Buffer.from(await todo.arrayBuffer()), v);
  assert.equal((await subir(video(13), 'video/mp4')).status, 413, 'más del máximo');
});

test('videos por enlace (Instagram) y validación', async () => {
  assert.equal((await pedir('POST', '/api/editar/videos', { titulo: 'Nada' })).status, 400);
  const ig = await pedir('POST', '/api/editar/videos', { titulo: 'Reel', url: 'instagram.com/reel/C1a2B3c4D5e/' });
  assert.equal(ig.d.url, 'https://instagram.com/reel/C1a2B3c4D5e/');
  assert.equal((await pedir('GET', '/api/contenido')).d.videos.length, 2);
});

test('ordenar, borrar y promociones vencidas', async () => {
  const todo = (await pedir('GET', '/api/editar')).d;
  const ids = todo.planes.map((x) => x.id).reverse();
  await pedir('PUT', '/api/editar/planes/orden', { ids });
  assert.deepEqual((await pedir('GET', '/api/editar')).d.planes.map((x) => x.id), ids);
  await pedir('DELETE', `/api/editar/planes/${ids[0]}`);
  assert.equal((await pedir('GET', '/api/editar')).d.planes.length, ids.length - 1);
  await pedir('POST', '/api/editar/promociones', { titulo: 'Vieja', vigente_hasta: '2020-01-01' });
  assert.ok(!(await pedir('GET', '/api/contenido')).d.promociones.some((p) => p.titulo === 'Vieja'));
});

test('información y cambio de clave', async () => {
  const s = await pedir('PUT', '/api/editar/sitio', { whatsapp: '443 123 4567', facebook: 'facebook.com/stronggym' });
  assert.equal(s.d.facebook, 'https://facebook.com/stronggym');
  assert.equal(s.d.instagram, 'https://www.instagram.com/strong_gym_mich/', 'no se borra lo que no se mandó');
  const vieja = cookie;
  assert.equal((await pedir('PUT', '/api/editar/clave', { actual: 'mala', nueva: 'nueva123' })).status, 400);
  assert.equal((await pedir('PUT', '/api/editar/clave', { actual: 'Strong-s4wf-6630', nueva: 'nueva123' })).status, 200);
  assert.equal((await fetch(`${base}/api/editar`, { headers: { Cookie: vieja } })).status, 401, 'sesión anterior cerrada');
  assert.equal((await pedir('GET', '/api/editar')).status, 200);
  cookie = '';
  assert.equal((await pedir('POST', '/api/entrar', { clave: 'Strong-s4wf-6630' })).status, 401, 'la clave inicial ya no sirve');
  assert.equal((await pedir('POST', '/api/entrar', { clave: 'nueva123' })).status, 200);
});

test('freno a intentos de adivinar la clave', async () => {
  cookie = '';
  for (let i = 0; i < 8; i++) await pedir('POST', '/api/entrar', { clave: `mala${i}` });
  assert.equal((await pedir('POST', '/api/entrar', { clave: 'nueva123' })).status, 429);
});
