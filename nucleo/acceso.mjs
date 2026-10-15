/* =====================================================================
   Acceso a /editar: una sola clave para recepción (sin usuarios).
   - Clave inicial: la de abajo (o la variable CLAVE_EDITAR en Netlify).
   - Cuando se cambia en /editar, se guarda cifrada en el almacén.
   ===================================================================== */
import crypto from 'node:crypto';
import { err } from './datos.mjs';

// Clave inicial "Strong-s4wf-6630" (solo se guarda cifrada aquí)
const CLAVE_INICIAL_HASH = '2gwZSGBBJh4QhDFAK5J2sQ==$ilhb3i5GBkMHeMrcl0XtgxQ2ybbwgNDGddMSG4ZG++Q=';
const COOKIE = 'sg_editar';
const DURACION = 30 * 24 * 3600e3;

const hashear = (pw, sal = crypto.randomBytes(16)) => `${sal.toString('base64')}$${crypto.scryptSync(String(pw), sal, 32).toString('base64')}`;
function coincide(pw, guardado) {
  const [sal, h] = String(guardado || '').split('$');
  if (!sal || !h) return false;
  const calc = crypto.scryptSync(String(pw), Buffer.from(sal, 'base64'), 32);
  const esperado = Buffer.from(h, 'base64');
  return esperado.length === calc.length && crypto.timingSafeEqual(esperado, calc);
}

export function crearAcceso(almacen, entorno = {}) {
  let cfg = null;
  async function config() {
    if (cfg) return cfg;
    cfg = (await almacen.json('config')) || {};
    if (!cfg.secreto) {
      cfg.secreto = crypto.randomBytes(32).toString('base64');
      await almacen.guardarJSON('config', cfg);
    }
    return cfg;
  }
  const claveValida = async (pw) => {
    const c = await config();
    if (c.hash) return coincide(pw, c.hash);
    if (entorno.CLAVE_EDITAR) return String(pw) === String(entorno.CLAVE_EDITAR);
    return coincide(pw, CLAVE_INICIAL_HASH);
  };
  const firma = (secreto, exp) => crypto.createHmac('sha256', secreto).update(String(exp)).digest('base64url');
  const segura = entorno.COOKIE_SEGURA ? '; Secure' : '';
  async function cookieNueva() {
    const c = await config();
    const exp = Date.now() + DURACION;
    return `${COOKIE}=${exp}.${firma(c.secreto, exp)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${DURACION / 1000}${segura}`;
  }

  return {
    cookieBorrar: () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${segura}`,

    async autorizado(req) {
      const m = String(req.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=(\\d+)\\.([\\w-]+)`));
      if (!m || Number(m[1]) < Date.now()) return false;
      const c = await config();
      const a = Buffer.from(m[2]);
      const b = Buffer.from(firma(c.secreto, m[1]));
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    },

    // Freno: 8 intentos fallidos cada 15 minutos por IP
    async entrar(clave, ip) {
      const llave = `intentos/${crypto.createHash('sha256').update(String(ip || 'x')).digest('hex').slice(0, 24)}`;
      const r = (await almacen.json(llave)) || { n: 0, desde: Date.now() };
      const vigente = Date.now() - r.desde < 15 * 60e3;
      if (vigente && r.n >= 8) err(429, 'Demasiados intentos. Espera 15 minutos e intenta de nuevo.');
      if (!(await claveValida(clave))) {
        await almacen.guardarJSON(llave, vigente ? { n: r.n + 1, desde: r.desde } : { n: 1, desde: Date.now() });
        err(401, 'Clave incorrecta.');
      }
      if (r.n) await almacen.borrar(llave);
      return cookieNueva();
    },

    async cambiarClave(actual, nueva) {
      if (!(await claveValida(actual))) err(400, 'La clave actual no es correcta.');
      if (String(nueva || '').length < 6) err(400, 'La clave nueva debe tener al menos 6 caracteres.');
      // Secreto nuevo: se cierran las sesiones abiertas en otros aparatos
      cfg = { hash: hashear(nueva), secreto: crypto.randomBytes(32).toString('base64') };
      await almacen.guardarJSON('config', cfg);
      return cookieNueva();
    },
  };
}
