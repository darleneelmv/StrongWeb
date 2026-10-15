/* Función de Netlify: atiende /api/* y /media/* */
import { atender } from '../../nucleo/app.mjs';
import { almacenNetlify } from '../../nucleo/almacen-netlify.mjs';

export default async (req, context) => atender(req, {
  ip: context.ip,
  almacen: almacenNetlify(),
  entorno: {
    CLAVE_EDITAR: process.env.CLAVE_EDITAR || '',
    VIDEO_MAX_MB: process.env.VIDEO_MAX_MB || 80,
    COOKIE_SEGURA: true,
  },
});

export const config = {
  path: ['/api/*', '/media/*'],
};
