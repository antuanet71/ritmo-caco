/* Cesta: lista de la compra familiar. Frontend sin dependencias.
   Dentro de Google: la sirve el script de la hoja de la familia (backend/Code.gs) y habla con él con google.script.run.
   Fuera de Google (GitHub Pages) funciona en modo prueba, guardando solo en este móvil. */
(function () {
'use strict';

const GAS = !!(window.google && google.script && google.script.run);
const DEMO = !GAS;

/* ---------- utilidades ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LS = {
  get(k, d) { try { const v = localStorage.getItem('cesta.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('cesta.' + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem('cesta.' + k); } catch (e) {} }
};
const uid = p => p + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 6);
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
function ink(hex) {
  const n = parseInt(String(hex || '#000').slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 170 ? '#1b1b1b' : '#ffffff';
}
const initial = n => (String(n || '?').trim()[0] || '?').toUpperCase();
const clone = o => JSON.parse(JSON.stringify(o));

const BRANDS = {
  mercadona: { n: 'Mercadona', c: '#1E8E57' },
  lidl: { n: 'Lidl', c: '#0050AA' },
  aldi: { n: 'Aldi', c: '#1B3E8C' },
  alimerka: { n: 'Alimerka', c: '#E5A800' },
  froiz: { n: 'Froiz', c: '#E31E24' },
  gadis: { n: 'Gadis', c: '#3B1214' },
  elcorte: { n: 'El Corte Inglés', c: '#00843D' }
};
const LOGOS = window.CESTA_LOGOS || null;
const logoUrl = l => (l && BRANDS[l]) ? (LOGOS ? LOGOS[l] : 'logos/' + l + '.png') : '';
const PALETTE = ['#3B6FD8', '#D9467A', '#E08A1E', '#2E9E6A', '#7A5BD6', '#0E9AA7', '#C8372D', '#8A6B4E', '#6B7A75', '#D4A20B', '#1E8E57', '#0050AA'];

/* Catálogo inicial (de la lista de ejemplo). Igual que en backend/Code.gs */
const SEED_CATS = [['c1', 'Fruta y verdura', '#4E9A2A'], ['c2', 'Frescos', '#C94848'], ['c3', 'Despensa', '#C48A1C'], ['c4', 'Higiene', '#3D6FC2'], ['c5', 'Limpieza', '#1A8C93']];
const SEED_PRODUCTS = {
  c1: ['Peras', 'Kiwis', 'Manzanas', 'Plátanos', 'Mandarinas', 'Uvas', 'Patatas', 'Pimiento', 'Calabacín', 'Puerro', 'Cebolla', 'Ajos'],
  c2: ['Leche', 'Yogures', 'Gelatinas', 'Queso', 'Jamón tapas', 'Jamón serrano', 'Jamón York', 'Solomillo', 'Hígado', 'Carne', 'Pollo', 'Pescado'],
  c3: ['Magdalenas', 'Tomate frito', 'Sopa', 'Fideos', 'Espirales', 'Pan tostado', 'Nesquik', 'Café', 'Agua', 'Cervezas', 'Arroz', 'Legumbres'],
  c4: ['Desodorante', 'Compresas', 'Papel higiénico', 'Jabón de manos'],
  c5: ['Det. baño', 'Fairy', 'Oxiaction', 'Det. lavadora', 'Suavizante', 'Vinagre', 'KH7', 'Rollo cocina', 'Servilletas']
};
function newFamilyState(id, nombre, persona) {
  const productos = []; let n = 0;
  SEED_CATS.forEach(([cid]) => SEED_PRODUCTS[cid].forEach(name => { n++; productos.push({ id: 'p' + String(n).padStart(3, '0'), nombre: name, categoriaId: cid, superId: 's1', orden: n, activo: true }); }));
  return {
    id, nombre, codigo: 'CESTA-' + Math.random().toString(36).slice(2, 6).toUpperCase(), hojaUrl: '',
    categorias: SEED_CATS.map(([id, nombre, color], i) => ({ id, nombre, color, orden: i + 1 })),
    productos,
    personas: [{ id: 'pe1', nombre: persona || 'Yo', color: PALETTE[0], orden: 1, activo: true }],
    supers: [{ id: 's1', nombre: 'Mercadona', color: BRANDS.mercadona.c, logo: 'mercadona', orden: 1, activo: true },
             { id: 's2', nombre: 'Lidl', color: BRANDS.lidl.c, logo: 'lidl', orden: 2, activo: true }],
    lista: []
  };
}

/* ---------- cambios (el backend aplica los mismos) ---------- */
function applyOp(st, op, email) {
  const now = Date.now();
  const row = id => st.lista.find(r => r.productoId === id);
  switch (op.op) {
    case 'setItem': {
      let r = row(op.productoId);
      if (!r) { r = { productoId: op.productoId }; st.lista.push(r); }
      Object.assign(r, { cantidad: op.cantidad, personaId: op.personaId || '', superId: op.superId, comprado: '', actualizado: now, por: email });
      break;
    }
    case 'removeItem': st.lista = st.lista.filter(r => r.productoId !== op.productoId); break;
    case 'buy': { const r = row(op.productoId); if (r) Object.assign(r, { comprado: op.value ? now : '', actualizado: now, por: email }); break; }
    case 'addProduct': st.productos.push({ id: op.id, nombre: op.nombre, categoriaId: op.categoriaId, superId: op.superId, orden: st.productos.length + 1, activo: true }); break;
    case 'setProductSuper': { const p = st.productos.find(x => x.id === op.productoId); if (p) p.superId = op.superId; break; }
    case 'moveProduct': { const p = st.productos.find(x => x.id === op.productoId); if (p) p.categoriaId = op.categoriaId; break; }
    case 'addCategory': if (!st.categorias.some(c => c.id === op.id)) st.categorias.push({ id: op.id, nombre: op.nombre, color: op.color, orden: st.categorias.length + 1 }); break;
    case 'moveCategory': {
      const cs = st.categorias.slice().sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
      const i = cs.findIndex(c => c.id === op.id), j = i + op.dir;
      if (i >= 0 && j >= 0 && j < cs.length) { const t = cs[i]; cs[i] = cs[j]; cs[j] = t; }
      cs.forEach((c, k) => { c.orden = k + 1; });
      break;
    }
    case 'restoreProduct': { const p = st.productos.find(x => x.id === op.productoId); if (p) p.activo = true; break; }
    case 'removeProduct': { const p = st.productos.find(x => x.id === op.productoId); if (p) p.activo = false; st.lista = st.lista.filter(r => r.productoId !== op.productoId); break; }
    case 'upsertPersona': {
      const p = st.personas.find(x => x.id === op.id);
      if (p) Object.assign(p, { nombre: op.nombre, color: op.color, activo: true });
      else st.personas.push({ id: op.id, nombre: op.nombre, color: op.color, orden: st.personas.length + 1, activo: true });
      break;
    }
    case 'removePersona': {
      const p = st.personas.find(x => x.id === op.id); if (p) p.activo = false;
      st.lista.forEach(r => { if (r.personaId === op.id) r.personaId = ''; });
      break;
    }
    case 'upsertSuper': {
      const s = st.supers.find(x => x.id === op.id);
      if (s) Object.assign(s, { nombre: op.nombre, color: op.color, logo: op.logo || '', activo: true });
      else st.supers.push({ id: op.id, nombre: op.nombre, color: op.color, logo: op.logo || '', orden: st.supers.length + 1, activo: true });
      break;
    }
    case 'removeSuper': {
      const s = st.supers.find(x => x.id === op.id); if (s) s.activo = false;
      st.lista.forEach(r => { if (r.superId === op.id) r.superId = op.moveTo; });
      st.productos.forEach(p => { if (p.superId === op.id) p.superId = op.moveTo; });
      break;
    }
  }
}
function cleanState(f) {
  const st = clone(f), t0 = startOfToday();
  st.lista = st.lista.filter(r => !r.comprado || Number(r.comprado) >= t0);
  return st;
}

/* ---------- modo prueba (sin servidor) ---------- */
const Demo = {
  async call(action, p) {
    await new Promise(r => setTimeout(r, 80));
    let f = LS.get('demo', null);
    if (!f) { f = newFamilyState('fam', 'Casa (prueba)', 'Yo'); LS.set('demo', f); }
    if (action === 'load') return { state: Object.assign(cleanState(f), { user: { email: 'prueba', nombre: 'Tú' } }) };
    if (action === 'ops') { p.ops.forEach(o => applyOp(f, o, 'prueba')); LS.set('demo', f); return { state: Object.assign(cleanState(f), { user: { email: 'prueba', nombre: 'Tú' } }) }; }
    throw new Error('Acción desconocida');
  }
};

/* ---------- tamaño de letra (se guarda en este móvil) ---------- */
const SIZES = [1, 1.25, 1.5, 1.8];
function applySize(k) { document.documentElement.style.setProperty('--k', k); }
applySize(LS.get('k', 1.25));
function applyTheme(t) { if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme'); }
applyTheme(LS.get('theme', 'auto'));

/* ---------- estado ---------- */
const FAM = 'fam';
const S = {
  user: null, fam: LS.get('fam', null), pending: LS.get('pending', []), inflight: false, offline: false,
  view: 'catalog', pop: null, sheet: null, adding: null, toast: null, err: '', noauth: ''
};

function api(action, payload) {
  if (DEMO) return Demo.call(action, payload || {});
  return new Promise((resolve, reject) => {
    google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(err => {
        const m = String((err && err.message) || err || '');
        const e = new Error(m.replace(/^.*NOAUTH:\s*/, ''));
        if (/NOAUTH/.test(m)) e.code = 'noauth';
        else if (/network|red|NetworkError|conexi/i.test(m)) e.code = '';
        else e.code = 'error';
        reject(e);
      })
      .api(action, payload || {});
  });
}

/* ---------- arranque y sincronización ---------- */
function boot() { render(); refresh(); }
function pendingFor() { return S.pending; }
function adopt(state) {
  const st = state;
  if (st.user) S.user = st.user;
  S.pending.forEach(p => applyOp(st, p.op, S.user && S.user.email));
  S.fam = st; LS.set('fam', st);
}
async function refresh() {
  if (S.inflight) return;
  if (S.pending.length) return flush();
  try {
    const r = await api('load');
    S.offline = false; S.noauth = '';
    if (!S.inflight && !S.pending.length) { adopt(r.state); render(true); }
  } catch (e) {
    if (e.code === 'noauth') { S.noauth = e.message; S.fam = null; LS.del('fam'); render(); }
    else if (!e.code) { S.offline = true; render(true); }
    else { S.err = e.message; render(true); }
  }
}
function doOp(op) {
  if (!S.fam) return;
  applyOp(S.fam, op, S.user && S.user.email);
  S.pending.push({ famId: FAM, op });
  LS.set('pending', S.pending); LS.set('fam', S.fam);
  render(true);
  flushSoon();
}
let flushT = null;
function flushSoon() { clearTimeout(flushT); flushT = setTimeout(flush, 600); }
async function flush() {
  if (S.inflight) return;
  const batch = S.pending.slice();
  if (!batch.length) return;
  S.inflight = true; render(true);
  try {
    const r = await api('ops', { ops: batch.map(b => b.op) });
    S.pending = S.pending.filter(p => !batch.includes(p)); LS.set('pending', S.pending);
    S.offline = false; S.inflight = false;
    adopt(r.state);
  } catch (e) {
    S.inflight = false;
    if (e.code) { S.pending = S.pending.filter(p => !batch.includes(p)); LS.set('pending', S.pending); toast('No se ha podido guardar: ' + e.message); refresh(); }
    else { S.offline = true; setTimeout(flush, 8000); }
  }
  render(true);
  if (S.pending.length) flushSoon();
}
setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 15000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh(); });
window.addEventListener('online', () => flush());

/* ---------- datos derivados ---------- */
const F = () => S.fam;
const act = arr => (arr || []).filter(x => x.activo !== false).sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0));
const personas = () => act(F().personas);
const supers = () => act(F().supers);
const superById = id => F().supers.find(s => s.id === id && s.activo !== false) || supers()[0];
const personaById = id => id ? F().personas.find(p => p.id === id && p.activo !== false) : null;
const rowOf = pid => F().lista.find(r => r.productoId === pid);
const inList = pid => { const r = rowOf(pid); return r && !r.comprado ? r : null; };
const listCount = () => F() ? F().lista.filter(r => !r.comprado && F().productos.some(p => p.id === r.productoId && p.activo !== false)).length : 0;

/* ---------- iconos ---------- */
const IC = {
  cat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="5" width="8" height="5" rx="1.2"/><rect x="13" y="5" width="8" height="5" rx="1.2"/><rect x="3" y="12" width="5" height="5" rx="1.2"/><rect x="10" y="12" width="11" height="5" rx="1.2"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2.5l2 11h10.5l2-8H7"/><circle cx="9.5" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/></svg>'
};
const logoImg = (s, cls) => logoUrl(s.logo) ? `<img class="${cls || 'lg'}" src="${logoUrl(s.logo)}" alt="">` : '';

/* ---------- vistas ---------- */
function vNoAuth() {
  return `<div class="hero">
    <div class="logo-wall">${['#4E9A2A', '#C94848', '#C48A1C', '#3D6FC2', '#1A8C93', '#1E8E57'].map((c, i) => `<span style="background:${c};width:${[54, 38, 70, 46, 30, 62][i]}px"></span>`).join('')}</div>
    <h1>Cesta</h1>
    <p class="err" style="font-size:15px">${esc(S.noauth)}</p>
    <p>Quien gestiona la hoja de tu familia tiene que escribir tu correo de Gmail en la pestaña <b>Config</b> y darte acceso. Luego vuelve a abrir esta página.</p>
    <button class="btn pri" data-act="retry">Probar otra vez</button>
  </div>`;
}
function syncDot() {
  const n = S.pending.length;
  if (S.offline) return '<span class="sync off" title="Sin conexión"></span>';
  if (n || S.inflight) return '<span class="sync wait" title="Guardando"></span>';
  return '<span class="sync" title="Guardado"></span>';
}
function brickCatalog(p) {
  const r = inList(p.id);
  const sel = S.pop && S.pop.type === 'item' && S.pop.id === p.id ? ' sel' : '';
  if (S.editCat) return `<span class="b kill" data-pid="${p.id}"><span class="grip">⠿</span>${esc(p.nombre)}<button class="pl x" data-kill="${p.id}" aria-label="Quitar ${esc(p.nombre)}">✕</button></span>`;
  if (!r) return `<button class="b${sel}" data-pid="${p.id}">${esc(p.nombre)}<span class="pl">+</span></button>`;
  const s = superById(r.superId) || { color: '#666' }, pe = personaById(r.personaId);
  return `<button class="b on${sel}" style="--s:${s.color};--t:${ink(s.color)}${pe ? ';--p:' + pe.color : ''}" data-pid="${p.id}">${pe ? '<span class="pd"></span>' : ''}${esc(p.nombre)}${Number(r.cantidad) > 1 ? `<span class="q">${r.cantidad}</span>` : ''}<span class="pl">+</span></button>`;
}
function vCatalog() {
  const f = F();
  let h = `<div class="top"><span class="fam-btn"><span class="fam-name">${esc(f.nombre)}</span>${DEMO ? '<span class="demo-tag">PRUEBA</span>' : ''}</span>${S.editCat ? '<button class="btn pri" data-act="editDone">Terminar</button>' : `<span class="count">${syncDot()}${listCount()} en la lista</span>`}</div>${S.editCat ? '<p class="hint" style="margin:0 0 12px">Arrastra un producto a otra categoría para moverlo. Toca ✕ para quitarlo. Ordena las categorías con ▲ ▼.</p>' : ''}<div class="frames">`;
  act(f.categorias.map(c => Object.assign({ activo: true }, c))).forEach(c => {
    const ps = act(f.productos).filter(p => p.categoriaId === c.id);
    h += `<div class="frame" data-cat="${c.id}" style="--c:${c.color}"><span class="frame-t">${esc(c.nombre)}${S.editCat ? `<button class="mv" data-act="catMove" data-id="${c.id}" data-v="-1" aria-label="Subir">▲</button><button class="mv" data-act="catMove" data-id="${c.id}" data-v="1" aria-label="Bajar">▼</button>` : ''}</span><div class="bricks">${ps.map(brickCatalog).join('')}${S.editCat ? '' : `<button class="b dash" data-act="newProduct" data-cat="${c.id}">Nuevo</button>`}</div></div>`;
  });
  if (S.editCat) h += `<button class="b dash" data-act="newCategory" style="align-self:flex-start;font-size:calc(15px*var(--k))">+ Nueva categoría</button>`;
  return h + '</div><div style="height:12px"></div>';
}
function vList() {
  const f = F(); const t0 = startOfToday();
  const rows = f.lista.filter(r => (!r.comprado || Number(r.comprado) >= t0) && f.productos.some(p => p.id === r.productoId && p.activo !== false));
  let h = `<div class="top"><span class="fam-name">Lista de la compra</span><span class="count">${syncDot()}${listCount()} por comprar</span></div><div class="frames">`;
  let any = false;
  supers().forEach(s => {
    const mine = rows.filter(r => (superById(r.superId) || {}).id === s.id)
      .sort((a, b) => (a.comprado ? 1 : 0) - (b.comprado ? 1 : 0));
    if (!mine.length) return; any = true;
    h += `<div class="frame" style="--c:${s.color}"><span class="frame-t">${logoImg(s, '')}${esc(s.nombre)}</span><div class="bricks">` +
      mine.map(r => {
        const p = f.productos.find(x => x.id === r.productoId), pe = personaById(r.personaId);
        return `<button class="b ${r.comprado ? 'done' : 'on'}" style="--s:${s.color};--t:${ink(s.color)}${pe ? ';--p:' + pe.color : ''}" data-buy="${r.productoId}">${pe ? '<span class="pd"></span>' : ''}${esc(p.nombre)}${Number(r.cantidad) > 1 ? `<span class="q">${r.cantidad}</span>` : ''}</button>`;
      }).join('') + `</div></div>`;
  });
  h += '</div>';
  h += any ? '<p class="hint">Toca lo que metes en el carro. Sale tachado y vuelve al catálogo.</p>' : '<div class="empty">La lista está vacía.<br>Toca productos en el catálogo.</div>';
  return h;
}
function vSettings() {
  const f = F();
  const sel = (k, id) => S.pop && S.pop.type === 'set' && S.pop.k === k && S.pop.id === id ? ' sel' : '';
  const ps = personas().map(p => `<button class="b on${sel('personas', p.id)}" style="--s:${p.color};--t:${ink(p.color)}" data-set="personas" data-id="${p.id}">${esc(p.nombre)}</button>`).join('');
  const ss = supers().map(s => `<button class="b on${sel('supers', s.id)}" style="--s:${s.color};--t:${ink(s.color)}" data-set="supers" data-id="${s.id}">${logoImg(s)}${esc(s.nombre)}</button>`).join('');
  const adder = (k, ph) => S.adding === k
    ? `<span class="b addb"><input id="new-${k}" type="text" placeholder="${ph}" enterkeyhint="done"><button class="okb" data-act="addOk" data-k="${k}">OK</button></span>`
    : `<button class="b dash" data-act="adding" data-k="${k}">+ Nuevo</button>`;
  let brandBricks = '';
  if (S.adding === 'supers') {
    const used = supers().map(s => s.logo);
    brandBricks = Object.keys(BRANDS).filter(k => !used.includes(k)).map(k => `<button class="b" data-act="addBrand" data-v="${k}"><img class="lg" src="logos/${k}.png" alt="">${BRANDS[k].n}</button>`).join('');
  }
  return `<div class="top"><span class="fam-name">Ajustes</span><span class="count">${syncDot()}${DEMO ? 'modo prueba' : esc(S.user && S.user.nombre)}</span></div><div class="frames">
    <div class="frame" style="--c:#7A5BD6"><span class="frame-t">Personas</span><div class="bricks">${ps}${adder('personas', 'Nombre')}</div></div>
    <div class="frame" style="--c:#1E8E57"><span class="frame-t">Supermercados</span><div class="bricks">${ss}${brandBricks}${adder('supers', 'Otro súper')}</div></div>
    <div class="frame" style="--c:#C94848"><span class="frame-t">Catálogo</span><div class="bricks"><button class="b" data-act="editCat">Organizar: mover, quitar y añadir categorías</button></div></div>
    <div class="frame" style="--c:#3D6FC2"><span class="frame-t">Aspecto</span><div class="bricks">${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([t, l]) => `<button class="b${LS.get('theme', 'auto') === t ? ' on' : ''}" style="--s:#3D6FC2" data-act="theme" data-v="${t}">${l}</button>`).join('')}</div></div>
    <div class="frame" style="--c:#C48A1C"><span class="frame-t">Tamaño</span><div class="bricks">${SIZES.map((k, i) => `<button class="b${Number(LS.get('k', 1.25)) === k ? ' on' : ''}" style="--s:#C48A1C;font-size:${Math.round(13 * k)}px;padding:${Math.round(6 * k)}px ${Math.round(10 * k)}px" data-act="size" data-v="${k}">${['A', 'A', 'A', 'A'][i]}</button>`).join('')}</div></div>
    <div class="frame" style="--c:var(--accent)"><span class="frame-t">Familia</span><div class="bricks">
      ${f.hojaUrl ? `<a class="b" href="${esc(f.hojaUrl)}" target="_blank" rel="noopener">Abrir la hoja de cálculo</a>` : '<span class="b">En modo prueba no hay hoja</span>'}
      </div></div>
  </div><p class="hint">Toca una persona o un súper para cambiar su color o quitarlo. Para que alguien más entre, añade su Gmail en la pestaña Config de la hoja.</p>`;
}
function vNav() {
  const n = listCount();
  return `<nav class="nav">${[['catalog', 'Catálogo', IC.cat], ['list', 'Lista', IC.cart], ['settings', 'Ajustes', IC.gear]]
    .map(([v, l, ic]) => `<button class="${S.view === v ? 'on' : ''}" data-act="view" data-v="${v}">${ic}${l}${v === 'list' && n ? `<span class="badge">${n}</span>` : ''}</button>`).join('')}</nav>`;
}
function vOverlay() {
  let h = '';
  const f = F();
  if (S.pop && S.pop.type === 'item' && f) {
    const r = inList(S.pop.id);
    if (r) h += `<div class="veil" data-act="closePop"></div><div class="pop" id="pop">
      <div class="pop-row">${personas().map(p => `<button class="pp ${r.personaId === p.id ? 'on' : ''}" style="--c:${p.color}" data-act="setP" data-v="${p.id}" title="${esc(p.nombre)}">${esc(initial(p.nombre))}</button>`).join('')}</div>
      <div class="pop-row">${supers().map(s => `<button class="ps ${(superById(r.superId) || {}).id === s.id ? 'on' : ''}" style="--c:${s.color}" data-act="setS" data-v="${s.id}" title="${esc(s.nombre)}">${logoUrl(s.logo) ? `<img src="${logoUrl(s.logo)}" alt="${esc(s.nombre)}">` : esc(initial(s.nombre))}</button>`).join('')}</div>
      <div class="pop-row"><button class="pq" data-act="dec">−</button><span class="pn">${r.cantidad}</span><button class="pq" data-act="inc">+</button><button class="pq del" data-act="removeItem" title="Quitar de la lista">✕</button></div>
    </div>`;
  } else if (S.pop && S.pop.type === 'set' && f) {
    const x = f[S.pop.k].find(y => y.id === S.pop.id);
    if (x) {
      const isP = S.pop.k === 'personas';
      const uses = f.lista.filter(r => !r.comprado && (isP ? r.personaId === x.id : r.superId === x.id)).length;
      const other = isP ? null : supers().find(s => s.id !== x.id);
      h += `<div class="veil" data-act="closePop"></div><div class="pop" id="pop">
        <div class="pop-row">${PALETTE.map(c => `<button class="pp ${c === x.color ? 'on' : ''}" style="--c:${c};width:calc(26px*var(--k));height:calc(26px*var(--k))" data-act="pickColor" data-v="${c}" aria-label="Color"></button>`).join('')}</div>
        <div class="pop-row">${S.pop.confirm
          ? `<span class="pmsg">¿Quitar ${esc(x.nombre)}?${uses ? `<br><span class="count">${uses} en la lista ${isP ? 'se quedan sin persona' : 'pasan a ' + esc(other ? other.nombre : '')}</span>` : ''}</span><button class="pq" data-act="closePop" style="font-size:13px">No</button><button class="pq red" data-act="delOk">Quitar</button>`
          : `<button class="pq" data-act="rename" style="font-size:13px">Renombrar</button><button class="pq del" data-act="del" style="margin-left:0">✕ Quitar</button>`}</div>
      </div>`;
    }
  }
  if (false) {  } else if (S.sheet && S.sheet.type === 'newProduct') {
    const c = f.categorias.find(x => x.id === S.sheet.cat) || {};
    h += `<div class="scrim" data-act="closeSheet"><div class="sheet" data-stop="1"><h3>Nuevo en ${esc(c.nombre)}</h3>
      <div class="row"><input class="in" id="newName" placeholder="Por ejemplo, Champú" enterkeyhint="done"><button class="btn pri" data-act="saveProduct">Añadir</button></div></div></div>`;
  } else if (S.sheet && S.sheet.type === 'newCategory') {
    h += `<div class="scrim" data-act="closeSheet"><div class="sheet" data-stop="1"><h3>Nueva categoría</h3>
      <div class="row"><input class="in" id="newCatName" placeholder="Por ejemplo, Congelados" enterkeyhint="done"><button class="btn pri" data-act="saveCategory">Añadir</button></div></div></div>`;
  } else if (S.sheet && S.sheet.type === 'rename') {
    h += `<div class="scrim" data-act="closeSheet"><div class="sheet" data-stop="1"><h3>Cambiar nombre</h3>
      <div class="row"><input class="in" id="renameIn" value="${esc(S.sheet.nombre)}" enterkeyhint="done"><button class="btn pri" data-act="saveRename">Guardar</button></div></div></div>`;
  }
  if (S.toast) h += `<div class="toast"><span>${esc(S.toast.t)}</span>${S.toast.undo ? '<button data-act="undo">Deshacer</button>' : ''}</div>`;
  return h;
}

function render(keep) {
  const app = document.getElementById('app');
  const sc = app.querySelector('.screen'); const y = sc ? sc.scrollTop : 0;
  if (S.noauth) { app.innerHTML = vNoAuth(); }
  else if (!S.fam) { app.innerHTML = `<div class="hero"><h1>Cesta</h1><p>${S.offline ? 'Sin conexión. Lo intento de nuevo en unos segundos.' : 'Cargando la lista…'}</p>${S.err ? `<div class="err">${esc(S.err)}</div>` : ''}</div>`; }
  else {
    const body = S.view === 'list' ? vList() : S.view === 'settings' ? vSettings() : vCatalog();
    app.innerHTML = `<div class="screen">${body}</div>${vNav()}`;
    if (keep) app.querySelector('.screen').scrollTop = y;
  }
  renderOverlay();
}
function renderOverlay() {
  document.getElementById('overlay').innerHTML = S.fam || S.toast ? vOverlay() : '';
  placePop();
  if (S.adding) focusSoon('new-' + S.adding);
  if (S.sheet && S.sheet.type === 'newProduct') focusSoon('newName');
  if (S.sheet && S.sheet.type === 'rename') focusSoon('renameIn');
  if (S.sheet && S.sheet.type === 'newCategory') focusSoon('newCatName');
}
function focusSoon(id) { setTimeout(() => { const i = document.getElementById(id); if (i && document.activeElement !== i) i.focus(); }, 40); }
function placePop() {
  const pop = document.getElementById('pop'); if (!pop || !S.pop) return;
  const b = S.pop.type === 'item' ? document.querySelector(`.b[data-pid="${S.pop.id}"]`) : document.querySelector(`.b[data-set="${S.pop.k}"][data-id="${S.pop.id}"]`);
  if (!b) return;
  const br = b.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
  const x = Math.max(8, Math.min(br.left + br.width / 2 - pop.offsetWidth / 2, W - pop.offsetWidth - 8));
  let y = br.bottom + 6; if (y + pop.offsetHeight > H - 70) y = br.top - pop.offsetHeight - 6;
  pop.style.left = x + 'px'; pop.style.top = Math.max(8, y) + 'px';
}
let toastT = null;
function toast(t, undo) { S.toast = { t, undo }; clearTimeout(toastT); toastT = setTimeout(() => { S.toast = null; renderOverlay(); }, undo ? 4000 : 2600); renderOverlay(); }

/* ---------- acciones ---------- */
function addOne(p) {
  const r = inList(p.id);
  if (r) doOp({ op: 'setItem', productoId: p.id, cantidad: Number(r.cantidad) + 1, personaId: r.personaId, superId: r.superId });
  else {
    const s = superById(p.superId);
    doOp({ op: 'setItem', productoId: p.id, cantidad: 1, personaId: '', superId: s ? s.id : '' });
  }
}
function openItemPop(p) { if (!inList(p.id)) addOne(p); S.pop = { type: 'item', id: p.id }; render(true); }
function itemOp(changes) {
  const r = inList(S.pop.id); if (!r) return;
  doOp(Object.assign({ op: 'setItem', productoId: r.productoId, cantidad: Number(r.cantidad), personaId: r.personaId, superId: r.superId }, changes));
}

const app = document.getElementById('app');
let lp = null, lpFired = false, tapT = null, tapId = null;
document.addEventListener('pointerdown', e => {
  lpFired = false;
  const b = e.target.closest('.b[data-pid]'); if (!b || S.editCat) return;
  b.classList.add('press');
  lp = setTimeout(() => {
    lpFired = true; b.classList.remove('press');
    const p = F().productos.find(x => x.id === b.dataset.pid); if (!p) return;
    clearTimeout(tapT); tapT = null;
    openItemPop(p);
    try { navigator.vibrate && navigator.vibrate(15); } catch (_) {}
  }, 450);
});
const cancelLp = () => { clearTimeout(lp); document.querySelectorAll('.b.press').forEach(x => x.classList.remove('press')); };
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => document.addEventListener(t, cancelLp));
document.addEventListener('scroll', cancelLp, true);
document.addEventListener('contextmenu', e => { if (e.target.closest('.b')) e.preventDefault(); });

document.addEventListener('click', e => {
  const f = F();
  const kb = e.target.closest('[data-kill]');
  if (kb) {
    const p = f.productos.find(x => x.id === kb.dataset.kill); if (!p) return;
    doOp({ op: 'removeProduct', productoId: p.id }); toast(`${p.nombre} quitado del catálogo`, () => doOp({ op: 'restoreProduct', productoId: p.id }));
    return;
  }
  if (dragJustEnded) { dragJustEnded = false; return; }
  const pb = e.target.closest('.b[data-pid]');
  if (pb) {
    if (lpFired) { lpFired = false; return; }
    const p = f.productos.find(x => x.id === pb.dataset.pid); if (!p) return;
    if (S.editCat) return;
    if (tapT && tapId === p.id) { clearTimeout(tapT); tapT = null; openItemPop(p); return; }
    clearTimeout(tapT); tapId = p.id;
    tapT = setTimeout(() => { tapT = null; addOne(p); }, 260);
    return;
  }
  const bb = e.target.closest('.b[data-buy]');
  if (bb) {
    const r = rowOf(bb.dataset.buy); if (!r) return;
    const p = f.productos.find(x => x.id === r.productoId);
    const v = !r.comprado;
    doOp({ op: 'buy', productoId: r.productoId, value: v });
    if (v) toast(`${p.nombre} comprado`, () => doOp({ op: 'buy', productoId: r.productoId, value: false }));
    return;
  }
  const sb = e.target.closest('.b[data-set]');
  if (sb) { S.pop = { type: 'set', k: sb.dataset.set, id: sb.dataset.id }; S.adding = null; render(true); return; }

  const el = e.target.closest('[data-act]'); if (!el) return;
  if (el.classList.contains('scrim') && e.target.closest('[data-stop]')) return;
  const a = el.dataset.act, v = el.dataset.v;
  switch (a) {
    case 'theme': LS.set('theme', v); applyTheme(v); render(true); break;
    case 'catMove': doOp({ op: 'moveCategory', id: el.dataset.id, dir: Number(v) }); break;
    case 'newCategory': S.sheet = { type: 'newCategory' }; renderOverlay(); break;
    case 'saveCategory': {
      const nm = document.getElementById('newCatName').value.trim(); if (!nm) return;
      if (f.categorias.some(c => c.nombre.toLowerCase() === nm.toLowerCase())) { toast('Ya hay una categoría con ese nombre'); return; }
      const used = f.categorias.map(c => c.color), CC = ['#4E9A2A', '#C94848', '#C48A1C', '#3D6FC2', '#1A8C93', '#7A5BD6', '#D9467A', '#8A6B4E', '#E08A1E', '#0E9AA7'];
      doOp({ op: 'addCategory', id: uid('c'), nombre: nm[0].toUpperCase() + nm.slice(1), color: CC.find(c => !used.includes(c)) || CC[0] });
      S.sheet = null; renderOverlay(); toast(`Categoría ${nm} añadida. Arrastra productos a ella.`); break;
    }
    case 'editCat': S.editCat = true; S.view = 'catalog'; S.pop = null; render(); break;
    case 'editDone': S.editCat = false; render(true); break;
    case 'size': LS.set('k', Number(v)); applySize(Number(v)); render(true); break;
    case 'retry': S.noauth = ''; S.err = ''; render(); refresh(); break;
    case 'view': S.editCat = false; S.view = v; S.pop = null; S.adding = null; render(); break;
    case 'closeSheet': if (el.classList.contains('scrim') && e.target !== el) return; S.sheet = null; renderOverlay(); break;
    case 'closePop': S.pop = null; render(true); break;
    case 'setP': { const r = inList(S.pop.id); itemOp({ personaId: r && r.personaId === v ? '' : v }); break; }
    case 'setS': itemOp({ superId: v }); doOp({ op: 'setProductSuper', productoId: S.pop.id, superId: v }); break;
    case 'inc': { const r = inList(S.pop.id); itemOp({ cantidad: Number(r.cantidad) + 1 }); break; }
    case 'dec': { const r = inList(S.pop.id); if (Number(r.cantidad) > 1) itemOp({ cantidad: Number(r.cantidad) - 1 }); break; }
    case 'removeItem': doOp({ op: 'removeItem', productoId: S.pop.id }); S.pop = null; render(true); break;
    case 'newProduct': S.sheet = { type: 'newProduct', cat: el.dataset.cat }; renderOverlay(); break;
    case 'saveProduct': {
      const nm = document.getElementById('newName').value.trim(); if (!nm) return;
      const exists = f.productos.find(p => p.activo !== false && p.nombre.toLowerCase() === nm.toLowerCase());
      if (exists) { S.sheet = null; renderOverlay(); toast(`${exists.nombre} ya está en el catálogo`); return; }
      const id = uid('p'), s = supers()[0];
      doOp({ op: 'addProduct', id, nombre: nm[0].toUpperCase() + nm.slice(1), categoriaId: S.sheet.cat, superId: s ? s.id : '' });
      S.sheet = null; addOne(f.productos.find(p => p.id === id)); toast(`${nm} añadido al catálogo y a la lista`);
      break;
    }
    case 'pickColor': { const x = f[S.pop.k].find(y => y.id === S.pop.id); doOp(Object.assign({ op: S.pop.k === 'personas' ? 'upsertPersona' : 'upsertSuper' }, x, { color: v })); break; }
    case 'rename': { const x = f[S.pop.k].find(y => y.id === S.pop.id); S.sheet = { type: 'rename', k: S.pop.k, id: x.id, nombre: x.nombre }; S.pop = null; render(true); break; }
    case 'saveRename': {
      const nm = document.getElementById('renameIn').value.trim(); if (!nm) return;
      const x = f[S.sheet.k].find(y => y.id === S.sheet.id);
      doOp(Object.assign({ op: S.sheet.k === 'personas' ? 'upsertPersona' : 'upsertSuper' }, x, { nombre: nm })); S.sheet = null; renderOverlay(); break;
    }
    case 'del': {
      if (S.pop.k === 'supers' && supers().length < 2) { toast('Tiene que quedar al menos un súper'); return; }
      S.pop.confirm = true; renderOverlay(); break;
    }
    case 'delOk': {
      const k = S.pop.k, x = f[k].find(y => y.id === S.pop.id);
      if (k === 'personas') doOp({ op: 'removePersona', id: x.id });
      else doOp({ op: 'removeSuper', id: x.id, moveTo: supers().find(s => s.id !== x.id).id });
      S.pop = null; render(true); toast(`${x.nombre} quitado`); break;
    }
    case 'adding': S.adding = el.dataset.k; S.pop = null; render(true); break;
    case 'addOk': {
      const k = el.dataset.k, inp = document.getElementById('new-' + k), nm = inp.value.trim();
      S.adding = null;
      if (nm) {
        const used = act(f[k]).map(x => x.color), color = PALETTE.find(c => !used.includes(c)) || PALETTE[0];
        doOp(k === 'personas' ? { op: 'upsertPersona', id: uid('pe'), nombre: nm, color } : { op: 'upsertSuper', id: uid('s'), nombre: nm, color, logo: '' });
      } else render(true);
      break;
    }
    case 'addBrand': {
      const old = f.supers.find(s => s.logo === v && s.activo === false);
      doOp({ op: 'upsertSuper', id: old ? old.id : uid('s'), nombre: BRANDS[v].n, color: BRANDS[v].c, logo: v });
      S.adding = null; render(true); break;
    }
    case 'undo': if (S.toast && S.toast.undo) { const u = S.toast.undo; S.toast = null; u(); } break;
  }
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || !e.target.id) return;
  const id = e.target.id;
  const map = { newName: 'saveProduct', renameIn: 'saveRename', newCatName: 'saveCategory' };
  const act = map[id] || (id.startsWith('new-') ? 'addOk' : null);
  if (act) { const b = document.querySelector(`[data-act="${act}"]`); b && b.click(); }
});
window.addEventListener('resize', placePop);

/* ---------- arrastrar productos entre categorías (modo Organizar) ---------- */
let drag = null, dragJustEnded = false, scrollT = null;
document.addEventListener('pointerdown', e => {
  if (!S.editCat || e.target.closest('[data-kill]')) return;
  const b = e.target.closest('.b.kill[data-pid]'); if (!b) return;
  drag = { pid: b.dataset.pid, el: b, x0: e.clientX, y0: e.clientY, started: false, id: e.pointerId };
});
document.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  if (!drag.started) {
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8) return;
    drag.started = true;
    const r = drag.el.getBoundingClientRect();
    drag.dx = drag.x0 - r.left; drag.dy = drag.y0 - r.top;
    drag.ghost = drag.el.cloneNode(true); drag.ghost.classList.add('ghost');
    document.body.appendChild(drag.ghost); drag.el.classList.add('dragging');
  }
  e.preventDefault();
  drag.ghost.style.left = (e.clientX - drag.dx) + 'px'; drag.ghost.style.top = (e.clientY - drag.dy) + 'px';
  document.querySelectorAll('.frame.drop').forEach(x => x.classList.remove('drop'));
  const fr = document.elementFromPoint(e.clientX, e.clientY); const frame = fr && fr.closest('.frame[data-cat]');
  if (frame) frame.classList.add('drop');
  const sc = document.querySelector('.screen'); clearInterval(scrollT);
  if (sc) { const H = window.innerHeight; const v = e.clientY < 90 ? -12 : e.clientY > H - 110 ? 12 : 0; if (v) scrollT = setInterval(() => { sc.scrollTop += v; }, 16); }
}, { passive: false });
function endDrag(e) {
  if (!drag || (e && e.pointerId !== drag.id)) return;
  clearInterval(scrollT);
  const d = drag; drag = null;
  if (!d.started) return;
  dragJustEnded = true; setTimeout(() => { dragJustEnded = false; }, 300);
  d.ghost.remove(); d.el.classList.remove('dragging');
  document.querySelectorAll('.frame.drop').forEach(x => x.classList.remove('drop'));
  const fr = e && document.elementFromPoint(e.clientX, e.clientY); const frame = fr && fr.closest('.frame[data-cat]');
  const p = F().productos.find(x => x.id === d.pid);
  if (frame && p && frame.dataset.cat !== p.categoriaId) {
    const c = F().categorias.find(x => x.id === frame.dataset.cat);
    doOp({ op: 'moveProduct', productoId: p.id, categoriaId: frame.dataset.cat });
    toast(`${p.nombre} → ${c ? c.nombre : ''}`);
  }
}
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);

if (DEMO && 'serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
boot();
})();
