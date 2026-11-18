/* Genera public/contenido.json con el contenido inicial, para publicar la página
   en un hosting sin servidor (GitHub Pages). Uso: npm run estatico */
import { writeFileSync } from 'node:fs';
import { contenidoInicial } from '../nucleo/datos.mjs';

const c = contenidoInicial();
const vis = (y) => y.visible !== false;
const sin = ({ visible, creado, id, ...r }) => r;
const publico = {
  sitio: c.sitio,
  productos: c.productos.filter(vis).map(sin),
  fotos: c.fotos.filter(vis).map(sin),
  videos: c.videos.filter(vis).map(sin),
  promociones: c.promociones.filter(vis).map(sin).map((p) => ({ ...p, vigente_hasta: '' })),
  planes: c.planes.filter(vis).map(sin),
  actualizado: c.actualizado,
};
writeFileSync(new URL('../public/contenido.json', import.meta.url), `${JSON.stringify(publico, null, 2)}\n`);
console.log('public/contenido.json listo');
