/* =====================================================================
   Probar la página en tu computadora (sin Netlify):
     node dev/servidor.mjs      →  http://localhost:8888
   Guarda todo en la carpeta "datos-locales". En Netlify esto no se usa.
   ===================================================================== */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { atender } from '../nucleo/app.mjs';
import { almacenArchivos } from './almacen-archivos.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLICO = path.join(RAIZ, 'public');
const almacen = almacenArchivos(path.resolve(RAIZ, process.env.DATOS || 'datos-locales'));
const entorno = { CLAVE_EDITAR: process.env.CLAVE_EDITAR || '', VIDEO_MAX_MB: process.env.VIDEO_MAX_MB || 80, COOKIE_SEGURA: false };

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon',
};
const PAGINAS = { '/': 'index.html', '/productos': 'productos.html', '/editar': 'editar.html' };

// Las mismas cabeceras que pone netlify.toml
const toml = fs.readFileSync(path.join(RAIZ, 'netlify.toml'), 'utf8');
const CSP = (toml.match(/Content-Security-Policy = "([^"]+)"/) || [])[1] || '';

export const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (CSP) res.setHeader('Content-Security-Policy', CSP);
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/media/')) {
    const cuerpo = req.method === 'GET' || req.method === 'HEAD' ? undefined : Readable.toWeb(req);
    const pedido = new Request(`http://localhost${req.url}`, { method: req.method, headers: req.headers, body: cuerpo, duplex: 'half' });
    const r = await atender(pedido, { ip: req.socket.remoteAddress, almacen, entorno });
    const h = {};
    r.headers.forEach((v, k) => { h[k] = v; });
    res.writeHead(r.status, h);
    if (!r.body) return res.end();
    return Readable.fromWeb(r.body).pipe(res);
  }
  const rel = PAGINAS[url.pathname.replace(/\/+$/, '') || '/'] || decodeURIComponent(url.pathname).replace(/^\/+/, '');
  let archivo = path.join(PUBLICO, rel);
  let status = 200;
  if (!archivo.startsWith(PUBLICO + path.sep) || !fs.existsSync(archivo) || !fs.statSync(archivo).isFile()) { archivo = path.join(PUBLICO, '404.html'); status = 404; }
  res.writeHead(status, { 'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(archivo).pipe(res);
});

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const puerto = Number(process.env.PORT || 8888);
  servidor.listen(puerto, () => {
    console.log(`\n  Strong Gym (prueba local)\n  Página:  http://localhost:${puerto}/\n  Editar:  http://localhost:${puerto}/editar   clave: Strong-s4wf-6630\n`);
  });
}
