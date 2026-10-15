/* =====================================================================
   Strong Gym · página de productos (se agregan y cambian en /editar)
   ===================================================================== */
(function () {
  'use strict';
  const { $, $$, esc, wa, I } = window.SG;
  const quitarAcentos = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  window.SG.cargar().then((d) => {
    const s = d.sitio || {};
    const prods = d.productos || [];
    window.SG.armarMarco(d, 'productos');
    $('#p-titulo').textContent = s.productos_titulo || 'Productos';
    $('#p-texto').textContent = s.productos_texto || '';

    // Categorías en el orden en que aparecen
    const cats = [];
    prods.forEach((p) => { const c = p.categoria || 'Otros'; if (!cats.includes(c)) cats.push(c); });
    const params = new URLSearchParams(location.search);
    let cat = cats.includes(params.get('cat')) ? params.get('cat') : '';
    let texto = '';

    $('#chips').innerHTML = [['', 'Todos', prods.length], ...cats.map((c) => [c, c, prods.filter((p) => (p.categoria || 'Otros') === c).length])]
      .map(([v, t, n]) => `<button type="button" data-cat="${esc(v)}" aria-pressed="${v === cat}">${esc(t)}<small>${n}</small></button>`).join('');
    if (cats.length < 2) $('#chips').hidden = true;

    function dibujar() {
      const q = quitarAcentos(texto.trim());
      const pasa = (p) => (!cat || (p.categoria || 'Otros') === cat)
        && (!q || quitarAcentos(`${p.nombre} ${p.descripcion} ${p.categoria} ${p.etiqueta}`).includes(q));
      const vis = prods.filter(pasa);
      let html;
      if (!prods.length) html = '<p class="vacio">Muy pronto verás aquí nuestros productos.</p>';
      else if (!vis.length) html = `<p class="vacio">No encontramos “${esc(texto)}”. Prueba con otra palabra o pregúntanos en recepción.</p>`;
      else if (!cat && !q && cats.length > 1) {
        // Todos: agrupados por categoría
        html = cats.map((c) => {
          const g = vis.filter((p) => (p.categoria || 'Otros') === c);
          return `<div class="grupo-cat" id="cat-${esc(quitarAcentos(c).replace(/\W+/g, '-'))}"><h2>${esc(c)} <small>${g.length}</small></h2>
            <div class="productos">${g.map((p, i) => window.SG.tarjetaProducto(p, i, s)).join('')}</div></div>`;
        }).join('');
      } else html = `<div class="productos">${vis.map((p, i) => window.SG.tarjetaProducto(p, i, s)).join('')}</div>`;
      $('#lista').innerHTML = html;
      window.SG.revelar();
    }

    $('#chips').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      cat = b.dataset.cat;
      $$('#chips button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const u = new URL(location.href);
      if (cat) u.searchParams.set('cat', cat); else u.searchParams.delete('cat');
      history.replaceState(null, '', u);
      dibujar();
      const f = $('.filtros');
      if (f.getBoundingClientRect().top <= 70) scrollTo({ top: $('#lista').offsetTop - 150, behavior: 'smooth' });
    });
    $('#buscar').addEventListener('input', (e) => { texto = e.target.value; dibujar(); });

    $('#nota').innerHTML = `<div><h3>¿Cómo los compro?</h3><p>Pídelos en recepción antes o después de entrenar${s.whatsapp ? ', o apártalos por WhatsApp' : ''}. Precios en pesos mexicanos.</p></div>
      ${s.whatsapp ? `<a class="boton boton-wa" href="${esc(wa(s.whatsapp, 'Hola, quiero preguntar por un producto.'))}" target="_blank" rel="noopener">${I.wa} Preguntar</a>` : ''}`;
    dibujar();
  });
})();
