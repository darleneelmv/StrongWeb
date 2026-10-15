/* Almacén en una carpeta (solo para probar en la computadora). */
import fs from 'node:fs';
import path from 'node:path';

export function almacenArchivos(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const ruta = (k) => path.join(dir, encodeURIComponent(k));
  const leer = (k) => { try { return fs.readFileSync(ruta(k)); } catch (e) { return null; } };
  const escribir = (k, datos, metadata) => {
    fs.writeFileSync(`${ruta(k)}.tmp`, datos);
    fs.renameSync(`${ruta(k)}.tmp`, ruta(k));
    if (metadata) fs.writeFileSync(`${ruta(k)}.meta`, JSON.stringify(metadata)); else fs.rmSync(`${ruta(k)}.meta`, { force: true });
  };
  return {
    json: async (k) => { const b = leer(k); return b ? JSON.parse(b.toString('utf8')) : null; },
    guardarJSON: async (k, v, metadata) => escribir(k, JSON.stringify(v), metadata),
    bytes: async (k) => { const b = leer(k); return b ? new Uint8Array(b) : null; },
    guardarBytes: async (k, u8, metadata) => escribir(k, Buffer.from(u8), metadata),
    meta: async (k) => {
      if (!fs.existsSync(ruta(k))) return null;
      try { return JSON.parse(fs.readFileSync(`${ruta(k)}.meta`, 'utf8')); } catch (e) { return {}; }
    },
    borrar: async (k) => { fs.rmSync(ruta(k), { force: true }); fs.rmSync(`${ruta(k)}.meta`, { force: true }); },
    listar: async (prefijo) => fs.readdirSync(dir).filter((f) => !/\.(meta|tmp)$/.test(f)).map(decodeURIComponent).filter((k) => k.startsWith(prefijo)),
  };
}
