/* Almacén en Netlify Blobs (se usa cuando la página corre en Netlify). */
import { getStore } from '@netlify/blobs';

export function almacenNetlify() {
  // "strong": lo que guarda recepción se ve de inmediato en la página
  const s = getStore({ name: 'stronggym', consistency: 'strong' });
  const comoBuffer = (u8) => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
  return {
    json: (k) => s.get(k, { type: 'json' }),
    guardarJSON: (k, v, metadata) => s.setJSON(k, v, metadata ? { metadata } : undefined),
    bytes: async (k) => { const b = await s.get(k, { type: 'arrayBuffer' }); return b ? new Uint8Array(b) : null; },
    guardarBytes: (k, u8, metadata) => s.set(k, comoBuffer(u8), metadata ? { metadata } : undefined),
    meta: async (k) => { const r = await s.getMetadata(k); return r ? r.metadata || {} : null; },
    borrar: (k) => s.delete(k),
    listar: async (prefix) => (await s.list({ prefix })).blobs.map((b) => b.key),
  };
}
