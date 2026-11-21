/**
 * Cesta: la lista de la compra de la familia, dentro de esta hoja de cálculo.
 *
 * - Pestaña Config: los correos de Gmail que pueden entrar.
 * - El resto de pestañas son los datos (se pueden editar a mano).
 * - La app se abre desde la URL de "Implementar > Aplicación web".
 *
 * Otra familia: Archivo > Hacer una copia, cambia los correos de Config e implementa su copia.
 * Pasos completos en LEEME.md.
 */

const TABS = {
  Config: ['correo', 'nombre'],
  Categorias: ['id', 'nombre', 'color', 'orden'],
  Productos: ['id', 'nombre', 'categoria', 'super', 'orden', 'activo'],
  Personas: ['id', 'nombre', 'color', 'orden', 'activo'],
  Supers: ['id', 'nombre', 'color', 'logo', 'orden', 'activo'],
  Lista: ['productoId', 'cantidad', 'personaId', 'superId', 'comprado', 'actualizado', 'por'],
  Historial: ['fecha', 'productoId', 'producto', 'cantidad', 'persona', 'super', 'por']
};

const SEED_CATS = [['c1', 'Fruta y verdura', '#4E9A2A'], ['c2', 'Frescos', '#C94848'], ['c3', 'Despensa', '#C48A1C'], ['c4', 'Higiene', '#3D6FC2'], ['c5', 'Limpieza', '#1A8C93']];
const SEED_PRODUCTS = {
  c1: ['Peras', 'Kiwis', 'Manzanas', 'Plátanos', 'Mandarinas', 'Uvas', 'Patatas', 'Pimiento', 'Calabacín', 'Puerro', 'Cebolla', 'Ajos'],
  c2: ['Leche', 'Yogures', 'Gelatinas', 'Queso', 'Jamón tapas', 'Jamón serrano', 'Jamón York', 'Solomillo', 'Hígado', 'Carne', 'Pollo', 'Pescado'],
  c3: ['Magdalenas', 'Tomate frito', 'Sopa', 'Fideos', 'Espirales', 'Pan tostado', 'Nesquik', 'Café', 'Agua', 'Cervezas', 'Arroz', 'Legumbres'],
  c4: ['Desodorante', 'Compresas', 'Papel higiénico', 'Jabón de manos'],
  c5: ['Det. baño', 'Fairy', 'Oxiaction', 'Det. lavadora', 'Suavizante', 'Vinagre', 'KH7', 'Rollo cocina', 'Servilletas']
};

/* ---------------- la app ---------------- */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Cesta')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .addMetaTag('mobile-web-app-capable', 'yes')
    .addMetaTag('apple-mobile-web-app-capable', 'yes');
}

// La página llama a esto con google.script.run.api(acción, datos)
function api(action, p) {
  let user;
  try { user = currentUser(); } catch (e) {
    const m = String(e.message || e);
    if (m.indexOf('NOAUTH') < 0 && /permis|access|acceso|autoriz/i.test(m)) throw new Error('NOAUTH: No tienes acceso a la hoja de esta familia. Pide que añadan tu Gmail en Config y usen el menú Cesta › Dar acceso.');
    throw e;
  }
  switch (action) {
    case 'load': return { state: loadState(user) };
    case 'ops': return { state: applyOps(user, (p && p.ops) || []) };
  }
  throw new Error('Acción desconocida');
}

function normEmail(x) { return String(x || '').replace(/mailto:/i, '').replace(/[\s\u00a0\u200b-\u200d\ufeff<>]/g, '').toLowerCase(); }
// Todos los correos escritos en Config (en cualquier celda, también si se borró la cabecera)
function configEmails(ss) {
  const out = [];
  tab(ss, 'Config').getDataRange().getValues().forEach(r => r.forEach(c => { const e = normEmail(c); if (/^[^@]+@[^@]+\.[^@]+$/.test(e)) out.push(e); }));
  return out;
}
function currentUser() {
  const email = normEmail(Session.getActiveUser().getEmail());
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const allowed = configEmails(ss);
  const owner = normEmail(ss.getOwner() ? ss.getOwner().getEmail() : '');
  if (!email) throw new Error('NOAUTH: Google no le dice a Cesta con qué cuenta has entrado. Quien gestiona la hoja debe revisar en Implementar › Gestionar implementaciones que «Ejecutar como» sea «Usuario que accede a la aplicación web».');
  if (email !== owner && allowed.indexOf(email) < 0) throw new Error('NOAUTH: Has entrado como ' + email + ' y ese correo no está en la pestaña Config. Si tienes otra cuenta de Google en el móvil, abre la app con la cuenta correcta (o en una ventana de incógnito).');
  const row = read(tab(ss, 'Config')).find(r => normEmail(r.correo) === email);
  return { email: email, nombre: (row && row.nombre) || email.split('@')[0] };
}

/* ---------------- menú dentro de la hoja ---------------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Cesta')
    .addItem('Preparar la hoja', 'preparar')
    .addItem('Dar acceso a los correos de Config', 'darAcceso')
    .addToUi();
}
function preparar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureTabs(ss);
  const me = Session.getActiveUser().getEmail();
  const cfg = tab(ss, 'Config');
  if (cfg.getLastRow() < 2 && me) cfg.appendRow([me, me.split('@')[0]]);
  SpreadsheetApp.getActive().toast('Hoja preparada. Escribe los correos de la familia en Config y usa «Dar acceso».', 'Cesta', 8);
}
function darAcceso() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const emails = configEmails(ss);
  const have = ss.getEditors().map(u => u.getEmail().toLowerCase());
  const nuevos = emails.filter(e => have.indexOf(e) < 0);
  nuevos.forEach(e => { try { ss.addEditor(e); } catch (err) { /* correo no válido */ } });
  SpreadsheetApp.getActive().toast(nuevos.length ? 'Acceso dado a: ' + nuevos.join(', ') : 'Todos los correos ya tenían acceso.', 'Cesta', 8);
}

/* ---------------- tablas ---------------- */
function tab(ss, name) {
  const headers = TABS[name];
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1000, headers.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
function ensureTabs(ss) {
  const isNew = !ss.getSheetByName('Productos');
  Object.keys(TABS).forEach(k => tab(ss, k));
  if (isNew) {
    write(tab(ss, 'Categorias'), SEED_CATS.map((c, i) => ({ id: c[0], nombre: c[1], color: c[2], orden: i + 1 })));
    const prods = []; let n = 0;
    SEED_CATS.forEach(c => SEED_PRODUCTS[c[0]].forEach(name => { n++; prods.push({ id: 'p' + ('00' + n).slice(-3), nombre: name, categoria: c[1], super: 'Mercadona', orden: n, activo: true }); }));
    write(tab(ss, 'Productos'), prods);
    productDropdowns(ss);
    write(tab(ss, 'Personas'), [{ id: 'pe1', nombre: 'Yo', color: '#3B6FD8', orden: 1, activo: true }]);
    write(tab(ss, 'Supers'), [
      { id: 's1', nombre: 'Mercadona', color: '#1E8E57', logo: 'mercadona', orden: 1, activo: true },
      { id: 's2', nombre: 'Lidl', color: '#0050AA', logo: 'lidl', orden: 2, activo: true }]);
    ss.getSheets().forEach(sh => { if (!TABS[sh.getName()] && ss.getSheets().length > 1) { try { ss.deleteSheet(sh); } catch (e) {} } });
  }
}
function headersOf(sh) { return sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].map(String); }
function read(sh) {
  const v = sh.getDataRange().getValues();
  const h = (v.shift() || []).map(String);
  return v.filter(r => r.some(c => c !== '' && c !== null)).map(r => {
    const o = {};
    h.forEach((k, i) => { let x = r[i]; if (x instanceof Date) x = x.getTime(); o[k] = x; });
    return o;
  });
}
function write(sh, rows) {
  const h = headersOf(sh);
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, h.length).clearContent();
  if (rows.length) {
    const rg = sh.getRange(2, 1, rows.length, h.length);
    rg.setNumberFormat('@');
    rg.setValues(rows.map(o => h.map(k => {
      const x = o[k];
      if (x === undefined || x === null) return '';
      if (typeof x === 'boolean') return x ? 'TRUE' : 'FALSE';
      return String(x);
    })));
  }
}
function bool(x) { if (x === '' || x === undefined || x === null) return true; return !(x === false || /^(false|no|0|n)$/i.test(String(x).trim())); }
function num(x, d) { const n = Number(x); return isNaN(n) ? d : n; }
function rid(p) { return p + Utilities.getUuid().replace(/-/g, '').slice(0, 8); }
function startOfToday() {
  const tz = Session.getScriptTimeZone();
  const d = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  return Utilities.parseDate(d + ' 00:00:00', tz, 'yyyy-MM-dd HH:mm:ss').getTime();
}

/* ---------------- datos ---------------- */
// Lee todo y completa lo escrito a mano (ids que faltan, categoría o súper escritos por nombre…)
// En la hoja, Productos muestra la categoría y el súper por su nombre (con desplegable).
function migrateProductHeaders(ss) {
  const sh = tab(ss, 'Productos'), h = headersOf(sh);
  let changed = false;
  [['categoriaId', 'categoria'], ['superId', 'super']].forEach(([a, b]) => {
    const i = h.indexOf(a);
    if (i >= 0) { sh.getRange(1, i + 1).setValue(b); changed = true; }
  });
  if (changed) productDropdowns(ss);
  return changed;
}
function productDropdowns(ss) {
  const sh = tab(ss, 'Productos'), h = headersOf(sh);
  const set = (col, srcTab) => {
    const i = h.indexOf(col); if (i < 0) return;
    const rule = SpreadsheetApp.newDataValidation().requireValueInRange(tab(ss, srcTab).getRange('B2:B'), true).setAllowInvalid(true).build();
    sh.getRange(2, i + 1, 999, 1).setDataValidation(rule);
  };
  set('categoria', 'Categorias'); set('super', 'Supers');
}
function productsToSheet(st) {
  const nm = (arr, id) => (arr.find(x => x.id === id) || {}).nombre || '';
  return st.productos.map(p => Object.assign({}, p, { categoria: nm(st.categorias, p.categoriaId), super: nm(st.supers, p.superId) }));
}
function readState(ss, user) {
  const migrated = migrateProductHeaders(ss);
  const st = {
    id: 'fam', nombre: ss.getName().replace(/^Cesta\s*[·\-:]\s*/i, ''), hojaUrl: ss.getUrl(), user: user,
    categorias: read(tab(ss, 'Categorias')), productos: read(tab(ss, 'Productos')), personas: read(tab(ss, 'Personas')),
    supers: read(tab(ss, 'Supers')), lista: read(tab(ss, 'Lista'))
  };
  const dirty = {};
  if (migrated) dirty.Productos = true;
  st.productos.forEach(p => {
    if (p.categoria !== undefined) p.categoriaId = p.categoria;
    if (p.super !== undefined) p.superId = p.super;
    delete p.categoria; delete p.super;
  });
  const fixIds = (arr, p, k) => arr.forEach((x, i) => { if (!x.id) { x.id = rid(p); dirty[k] = true; } if (x.orden === '' || x.orden === undefined) x.orden = i + 1; });
  fixIds(st.categorias, 'c', 'Categorias'); fixIds(st.productos, 'p', 'Productos'); fixIds(st.personas, 'pe', 'Personas'); fixIds(st.supers, 's', 'Supers');
  const byName = (arr, v) => { const x = arr.find(a => a.id === v) || arr.find(a => String(a.nombre).toLowerCase() === String(v).toLowerCase()); return x ? x.id : ''; };
  st.categorias.forEach(c => { if (!c.color) { c.color = '#6B7A75'; dirty.Categorias = true; } });
  st.productos.forEach(p => {
    const nameOf = (arr, id) => (arr.find(a => a.id === id) || {}).nombre;
    const c = byName(st.categorias, p.categoriaId) || (st.categorias[0] || {}).id;
    if (nameOf(st.categorias, c) !== p.categoriaId) dirty.Productos = true;
    p.categoriaId = c;
    const s = byName(st.supers, p.superId) || (st.supers[0] || {}).id;
    if (nameOf(st.supers, s) !== p.superId) dirty.Productos = true;
    p.superId = s;
    p.activo = bool(p.activo);
  });
  st.personas.forEach(p => { p.activo = bool(p.activo); if (!p.color) { p.color = '#3B6FD8'; dirty.Personas = true; } });
  st.supers.forEach(s => { s.activo = bool(s.activo); if (!s.color) { s.color = '#6B7A75'; dirty.Supers = true; } });
  st.lista.forEach(r => { r.cantidad = num(r.cantidad, 1); r.comprado = r.comprado === '' ? '' : num(r.comprado, ''); r.actualizado = num(r.actualizado, 0); });
  // Lo comprado antes de hoy sale de la lista (ya está en Historial)
  const t0 = startOfToday(), before = st.lista.length;
  st.lista = st.lista.filter(r => r.comprado === '' || r.comprado >= t0);
  if (st.lista.length !== before) dirty.Lista = true;
  return { st: st, dirty: dirty };
}
function saveDirty(ss, st, dirty) {
  if (dirty.Categorias || dirty.Supers) dirty.Productos = true;
  const map = { Categorias: st.categorias, Productos: productsToSheet(st), Personas: st.personas, Supers: st.supers, Lista: st.lista };
  Object.keys(dirty).forEach(k => { if (map[k]) write(tab(ss, k), map[k]); });
}
function loadState(user) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName('Productos')) ensureTabs(ss);
  const r = readState(ss, user);
  if (Object.keys(r.dirty).length) {
    const lock = LockService.getDocumentLock(); lock.waitLock(20000);
    try { saveDirty(ss, r.st, r.dirty); } finally { lock.releaseLock(); }
  }
  return r.st;
}

/* Mismos cambios que applyOp() en la app */
function applyOps(user, ops) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const lock = LockService.getDocumentLock(); lock.waitLock(20000);
  try {
    const r = readState(ss, user);
    const st = r.st, dirty = r.dirty, now = Date.now(), tz = Session.getScriptTimeZone();
    const hist = [];
    ops.forEach(op => {
      const row = id => st.lista.find(x => x.productoId === id);
      switch (op.op) {
        case 'setItem': {
          let x = row(op.productoId);
          if (!x) { x = { productoId: op.productoId }; st.lista.push(x); }
          Object.assign(x, { cantidad: num(op.cantidad, 1), personaId: op.personaId || '', superId: op.superId || '', comprado: '', actualizado: now, por: user.email });
          dirty.Lista = true; break;
        }
        case 'removeItem': st.lista = st.lista.filter(x => x.productoId !== op.productoId); dirty.Lista = true; break;
        case 'buy': {
          const x = row(op.productoId); if (!x) break;
          const p = st.productos.find(q => q.id === op.productoId) || {};
          if (op.value && !x.comprado) {
            hist.push([Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm'), op.productoId, p.nombre || '', x.cantidad,
              (st.personas.find(q => q.id === x.personaId) || {}).nombre || '', (st.supers.find(q => q.id === x.superId) || {}).nombre || '', user.email]);
          } else if (!op.value && x.comprado) {
            undoHistory(tab(ss, 'Historial'), op.productoId);
          }
          Object.assign(x, { comprado: op.value ? now : '', actualizado: now, por: user.email });
          dirty.Lista = true; break;
        }
        case 'addProduct':
          if (!st.productos.some(p => p.id === op.id)) st.productos.push({ id: op.id, nombre: op.nombre, categoriaId: op.categoriaId, superId: op.superId, orden: st.productos.length + 1, activo: true });
          dirty.Productos = true; break;
        case 'setProductSuper': { const p = st.productos.find(x => x.id === op.productoId); if (p) { p.superId = op.superId; dirty.Productos = true; } break; }
        case 'moveProduct': { const p = st.productos.find(x => x.id === op.productoId); if (p) { p.categoriaId = op.categoriaId; dirty.Productos = true; } break; }
        case 'addCategory':
          if (!st.categorias.some(c => c.id === op.id)) st.categorias.push({ id: op.id, nombre: op.nombre, color: op.color, orden: st.categorias.length + 1 });
          dirty.Categorias = true; break;
        case 'restoreProduct': { const p = st.productos.find(x => x.id === op.productoId); if (p) { p.activo = true; dirty.Productos = true; } break; }
        case 'removeProduct': { const p = st.productos.find(x => x.id === op.productoId); if (p) p.activo = false; st.lista = st.lista.filter(x => x.productoId !== op.productoId); dirty.Productos = dirty.Lista = true; break; }
        case 'upsertPersona': {
          const p = st.personas.find(x => x.id === op.id);
          if (p) Object.assign(p, { nombre: op.nombre, color: op.color, activo: true });
          else st.personas.push({ id: op.id, nombre: op.nombre, color: op.color, orden: st.personas.length + 1, activo: true });
          dirty.Personas = true; break;
        }
        case 'removePersona': {
          const p = st.personas.find(x => x.id === op.id); if (p) p.activo = false;
          st.lista.forEach(x => { if (x.personaId === op.id) x.personaId = ''; });
          dirty.Personas = dirty.Lista = true; break;
        }
        case 'upsertSuper': {
          const s = st.supers.find(x => x.id === op.id);
          if (s) Object.assign(s, { nombre: op.nombre, color: op.color, logo: op.logo || '', activo: true });
          else st.supers.push({ id: op.id, nombre: op.nombre, color: op.color, logo: op.logo || '', orden: st.supers.length + 1, activo: true });
          dirty.Supers = true; break;
        }
        case 'removeSuper': {
          const s = st.supers.find(x => x.id === op.id); if (s) s.activo = false;
          st.lista.forEach(x => { if (x.superId === op.id) x.superId = op.moveTo; });
          st.productos.forEach(p => { if (p.superId === op.id) p.superId = op.moveTo; });
          dirty.Supers = dirty.Lista = dirty.Productos = true; break;
        }
      }
    });
    saveDirty(ss, st, dirty);
    if (hist.length) {
      const sh = tab(ss, 'Historial'), start = sh.getLastRow() + 1;
      sh.getRange(start, 1, hist.length, hist[0].length).setNumberFormat('@').setValues(hist.map(r => r.map(String)));
    }
    return st;
  } finally { lock.releaseLock(); }
}
function undoHistory(sh, productoId) {
  const last = sh.getLastRow(); if (last < 2) return;
  const from = Math.max(2, last - 50);
  const vals = sh.getRange(from, 1, last - from + 1, 2).getValues();
  for (let i = vals.length - 1; i >= 0; i--) {
    if (String(vals[i][1]) === productoId) { sh.deleteRow(from + i); return; }
  }
}
