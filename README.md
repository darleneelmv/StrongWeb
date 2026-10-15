# Strong Gym Puruándiro · página para Netlify

Página de publicidad del gym con:

- **Inicio**: portada animada, "Abierto ahora" en vivo según el horario, calificación de Google, productos destacados, **videos**, **fotos del gym**, **precios de membresías**, promociones, ubicación e Instagram.
- **Productos** (`/productos`): todos los productos por categoría, con buscador.
- **Editar** (`/editar`): para recepción. Cambia productos, fotos, videos, promociones, precios, horario y textos desde la computadora o el celular.

## 🔑 Clave para editar

```
Strong-s4wf-6630
```

Entra a `https://TU-PAGINA.netlify.app/editar`, escribe la clave y **cámbiala** en la pestaña **Clave**.
(Si quieres otra clave desde el inicio, en Netlify ve a *Project configuration → Environment variables* y crea `CLAVE_EDITAR` con la clave que quieras.)

---

## Subir a Netlify (paso a paso)

> ⚠️ **No uses "arrastrar y soltar" (Netlify Drop)**: así solo sube la parte visible y **/editar no funcionaría**. Usa GitHub (gratis), es una sola vez.

### 1. Subir la carpeta a GitHub
1. Crea una cuenta en <https://github.com> (si no tienes).
2. Botón **+** (arriba a la derecha) → **New repository** → nombre `strong-gym` → **Private** → **Create repository**.
3. En la página del repositorio nuevo: **uploading an existing file**.
4. Abre la carpeta `strong-gym-netlify` en tu computadora, **selecciona todo lo que hay adentro** (no la carpeta, su contenido: `public`, `netlify`, `nucleo`, `netlify.toml`, `package.json`, etc.) y arrástralo a GitHub.
5. Abajo, **Commit changes**.

### 2. Conectar con Netlify
1. Entra a <https://app.netlify.com> (puedes entrar con tu cuenta de GitHub).
2. **Add new project → Import an existing project → GitHub** → autoriza → elige `strong-gym`.
3. No cambies nada (todo viene en `netlify.toml`) → **Deploy**.
4. En 1–2 minutos te da tu dirección, tipo `https://strong-gym-xxxx.netlify.app`. Puedes cambiar el nombre en *Project configuration → Change project name* o conectar tu dominio en *Domain management*.

### 3. Primeros cambios en /editar
- **Información** → WhatsApp (activa los botones de "Pedir" y "Escríbenos"), teléfono, Facebook.
- **Fotos del gym** → sube fotos reales y borra las de ejemplo.
- **Productos** → los suplementos, bebidas, accesorios y ropa son **de ejemplo**: ajusta nombres, precios y fotos.
- **Videos** → sube un video o pega el enlace de un reel.

Cada vez que cambies algo en GitHub, Netlify vuelve a publicar solo. Lo que cambia recepción en /editar **no se pierde** al volver a publicar.

---

## Videos
- **Subir archivo**: MP4 o MOV de hasta 80 MB (unos 2–3 minutos en calidad normal desde el celular). Se sube por partes, así que funciona aunque el internet no sea muy rápido.
- **Enlace**: reel o publicación de **Instagram**, video de **YouTube**, **Facebook** o **TikTok**. Para videos largos es lo mejor: cargan rápido y no ocupan espacio.
- El tamaño máximo se cambia con la variable `VIDEO_MAX_MB` en Netlify.

## Dónde se guarda lo que cambia recepción
En **Netlify Blobs**, el almacenamiento que trae Netlify (no hay que configurar nada). Se guarda también una copia por día de los últimos 14 días. Las fotos se achican solas antes de subir para que la página cargue rápido.

## Probar en tu computadora (opcional)
Necesitas Node.js 22 o más nuevo:
```
node dev/servidor.mjs
```
Abre <http://localhost:8888> y <http://localhost:8888/editar>. Guarda todo en la carpeta `datos-locales` (eso no se sube a Netlify).

## Para el programador
```
netlify.toml              publicación, rutas y cabeceras de seguridad
netlify/functions/api.mjs función de Netlify: /api/* y /media/*
nucleo/app.mjs            API (contenido, subidas por partes de 3 MB, videos por rangos)
nucleo/datos.mjs          esquema, validación, contenido inicial, respaldos
nucleo/acceso.mjs         clave única (scrypt), cookie firmada, freno a intentos
nucleo/almacen-netlify.mjs   Netlify Blobs
dev/                      servidor local con almacén en carpeta
public/                   la página (index, productos, editar)
test/                     npm test (pruebas de punta a punta con el servidor local)
```
Netlify limita cada petición a ~4.5 MB, por eso fotos y videos se suben en partes de 3 MB y los videos se entregan por rangos (permite adelantar el video).

Desarrollado por CodeDMF.
