/**
 * Cesta: backend en Google Apps Script.
 *
 * Va pegado dentro de una hoja de cálculo llamada "Cesta · Registro"
 * (Extensiones > Apps Script). Esa hoja guarda las familias, quién entra en cada una
 * y las sesiones. Cada familia tiene además su propia hoja de cálculo, que este
 * script crea en tu Drive y comparte con los miembros de esa familia.
 *
 * Pasos completos en LEEME.md.
 */

// 1) Pega aquí tu ID de cliente OAuth (el mismo que en config.js)
const CLIENT_ID = 'PEGA_AQUI_TU_CLIENT_ID.apps.googleusercontent.com';

// Si quieres que solo ciertos correos puedan CREAR familias, ponlos aquí (vacío = cualquiera con Gmail).
const CREADORES_PERMITIDOS = [];

const SESSION_DAYS = 120;

const REG_TABS = {
  Familias: ['id', 'nombre', 'codigo', 'hojaId', 'creada', 'creadaPor'],
  Miembros: ['email', 'familiaId', 'alta'],
  Sesiones: ['token', 'email', 'nombre', 'expira']
};
const FAM_TABS = {
  Categorias: ['id', 'nombre', 'color', 'orden'],
  Productos: ['id', 'nombre', 'categoriaId', 'superId', 'orden', 'activo'],
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

/* ---------------- entrada HTTP ---------------- */
function doGet() {
  return ContentService.createTextOutput('Cesta funciona. Esta dirección es la que va en config.js (apiUrl).');
}
function doPost(e) {
  let out;
  try {
    const req = JSON.parse(e.postData.contents);
    out = handle(req);
  } catch (err) {
    out = { error: err.code || 'error', message: String(err.message || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
function fail(code, msg) { const e = new Error(msg || code); e.code = code; throw e; }

function handle(req) {
  if (req.action === 'login') return login(req.idToken);
  const user = sessionUser(req.session);
  switch (req.action) {
    case 'me': return { user: user, families: familiesOf(user.email) };
    case 'logout': return logout(req.session);
    case 'createFamily': return { family: createFamily(user, req.nombre, req.persona) };
    case 'joinFamily': return { family: joinFamily(user, req.codigo) };
    case 'load': return { state: loadFamily(user, req.familyId) };
    case 'ops': return { state: applyOps(user, req.familyId, req.ops || []) };
  }
  fail('bad', 'Acción desconocida');
}

/* ---------------- tablas ---------------- */
function reg() { return SpreadsheetApp.getActiveSpreadsheet(); }
function tab(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1000, headers.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
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
    sh.getRange(2, 1, rows.length, h.length).setNumberFormat('@');
    sh.getRange(2, 1, rows.length, h.length).setValues(rows.map(o => h.map(k => {
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

/* ---------------- sesión ---------------- */
function login(idToken) {
  if (!idToken) fail('auth', 'Falta el inicio de sesión de Google.');
  const r = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) fail('auth', 'Google no ha validado el inicio de sesión.');
  const t = JSON.parse(r.getContentText());
  if (t.aud !== CLIENT_ID) fail('auth', 'El ID de cliente no coincide. Revisa CLIENT_ID en Code.gs.');
  if (String(t.email_verified) !== 'true') fail('auth', 'Tu correo de Google no está verificado.');
  const email = String(t.email).toLowerCase();
  const nombre = t.given_name || t.name || email.split('@')[0];
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const expira = Date.now() + SESSION_DAYS * 864e5;
  tab(reg(), 'Sesiones', REG_TABS.Sesiones).appendRow([token, email, nombre, String(expira)]);
  CacheService.getScriptCache().put('s:' + token, JSON.stringify({ email: email, nombre: nombre, expira: expira }), 21600);
  return { session: token, user: { email: email, nombre: nombre } };
}
function sessionUser(token) {
  if (!token) fail('auth', 'Entra con tu cuenta de Google.');
  const cache = CacheService.getScriptCache();
  const c = cache.get('s:' + token);
  let s = c ? JSON.parse(c) : null;
  if (!s) {
    const row = read(tab(reg(), 'Sesiones', REG_TABS.Sesiones)).find(r => r.token === token);
    if (row) s = { email: row.email, nombre: row.nombre, expira: num(row.expira, 0) };
    if (s) cache.put('s:' + token, JSON.stringify(s), 21600);
  }
  if (!s || s.expira < Date.now()) fail('auth', 'Tu sesión ha caducado. Entra de nuevo.');
  return { email: s.email, nombre: s.nombre };
}
function logout(token) {
  const sh = tab(reg(), 'Sesiones', REG_TABS.Sesiones);
  const now = Date.now();
  write(sh, read(sh).filter(r => r.token !== token && num(r.expira, 0) > now));
  CacheService.getScriptCache().remove('s:' + token);
  return {};
}

/* ---------------- familias ---------------- */
function familiesOf(email) {
  const ids = read(tab(reg(), 'Miembros', REG_TABS.Miembros)).filter(m => String(m.email).toLowerCase() === email).map(m => m.familiaId);
  return read(tab(reg(), 'Familias', REG_TABS.Familias)).filter(f => ids.indexOf(f.id) >= 0).map(f => ({ id: f.id, nombre: f.nombre, codigo: f.codigo }));
}
function familyFor(user, familyId) {
  const isMember = read(tab(reg(), 'Miembros', REG_TABS.Miembros)).some(m => m.familiaId === familyId && String(m.email).toLowerCase() === user.email);
  if (!isMember) fail('forbidden', 'No perteneces a esta familia.');
  const f = read(tab(reg(), 'Familias', REG_TABS.Familias)).find(x => x.id === familyId);
  if (!f) fail('forbidden', 'Esta familia ya no existe.');
  return f;
}
function newCode() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const used = read(tab(reg(), 'Familias', REG_TABS.Familias)).map(f => f.codigo);
  let c;
  do { c = 'CESTA-'; for (let i = 0; i < 4; i++) c += abc[Math.floor(Math.random() * abc.length)]; } while (used.indexOf(c) >= 0);
  return c;
}
function shareSheet(hojaId, email) {
  try { DriveApp.getFileById(hojaId).addEditor(email); } catch (e) { /* p. ej. si ya es el propietario */ }
}
function createFamily(user, nombre, persona) {
  nombre = String(nombre || '').trim();
  if (!nombre) fail('bad', 'Ponle un nombre a la familia.');
  if (CREADORES_PERMITIDOS.length && CREADORES_PERMITIDOS.map(x => x.toLowerCase()).indexOf(user.email) < 0) fail('forbidden', 'Pide a quien gestiona Cesta que cree tu familia.');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const id = rid('f');
    const ss = SpreadsheetApp.create('Cesta · ' + nombre);
    Object.keys(FAM_TABS).forEach(k => tab(ss, k, FAM_TABS[k]));
    ss.getSheets().forEach(sh => { if (!FAM_TABS[sh.getName()]) ss.deleteSheet(sh); });
    write(ss.getSheetByName('Categorias'), SEED_CATS.map((c, i) => ({ id: c[0], nombre: c[1], color: c[2], orden: i + 1 })));
    const prods = []; let n = 0;
    SEED_CATS.forEach(c => SEED_PRODUCTS[c[0]].forEach(name => { n++; prods.push({ id: 'p' + ('00' + n).slice(-3), nombre: name, categoriaId: c[0], superId: 's1', orden: n, activo: true }); }));
    write(ss.getSheetByName('Productos'), prods);
    write(ss.getSheetByName('Personas'), [{ id: 'pe1', nombre: persona || user.nombre, color: '#3B6FD8', orden: 1, activo: true }]);
    write(ss.getSheetByName('Supers'), [
      { id: 's1', nombre: 'Mercadona', color: '#1E8E57', logo: 'mercadona', orden: 1, activo: true },
      { id: 's2', nombre: 'Lidl', color: '#0050AA', logo: 'lidl', orden: 2, activo: true }]);
    const codigo = newCode();
    tab(reg(), 'Familias', REG_TABS.Familias).appendRow([id, nombre, codigo, ss.getId(), new Date().toISOString(), user.email]);
    tab(reg(), 'Miembros', REG_TABS.Miembros).appendRow([user.email, id, new Date().toISOString()]);
    shareSheet(ss.getId(), user.email);
    return { id: id, nombre: nombre, codigo: codigo };
  } finally { lock.releaseLock(); }
}
function joinFamily(user, codigo) {
  codigo = String(codigo || '').trim().toUpperCase();
  if (codigo && codigo.indexOf('CESTA-') !== 0) codigo = 'CESTA-' + codigo;
  const f = read(tab(reg(), 'Familias', REG_TABS.Familias)).find(x => String(x.codigo).toUpperCase() === codigo);
  if (!f) fail('bad', 'No hay ninguna familia con ese código.');
  const ms = tab(reg(), 'Miembros', REG_TABS.Miembros);
  if (!read(ms).some(m => m.familiaId === f.id && String(m.email).toLowerCase() === user.email)) {
    ms.appendRow([user.email, f.id, new Date().toISOString()]);
    shareSheet(f.hojaId, user.email);
  }
  return { id: f.id, nombre: f.nombre, codigo: f.codigo };
}

/* ---------------- datos de una familia ---------------- */
function openFam(f) {
  const ss = SpreadsheetApp.openById(f.hojaId);
  const T = {};
  Object.keys(FAM_TABS).forEach(k => { T[k] = tab(ss, k, FAM_TABS[k]); });
  return { ss: ss, T: T };
}
function startOfToday() {
  const tz = Session.getScriptTimeZone();
  const d = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  return Utilities.parseDate(d + ' 00:00:00', tz, 'yyyy-MM-dd HH:mm:ss').getTime();
}
// Lee la familia, completa lo que se haya escrito a mano en la hoja (ids, nombres en vez de ids…)
function readState(f, o) {
  const st = {
    id: f.id, nombre: f.nombre, codigo: f.codigo, hojaUrl: o.ss.getUrl(),
    categorias: read(o.T.Categorias), productos: read(o.T.Productos), personas: read(o.T.Personas),
    supers: read(o.T.Supers), lista: read(o.T.Lista)
  };
  const dirty = {};
  const fixIds = (arr, p, k) => arr.forEach((x, i) => { if (!x.id) { x.id = rid(p); dirty[k] = true; } if (x.orden === '' || x.orden === undefined) { x.orden = i + 1; } });
  fixIds(st.categorias, 'c', 'Categorias'); fixIds(st.productos, 'p', 'Productos'); fixIds(st.personas, 'pe', 'Personas'); fixIds(st.supers, 's', 'Supers');
  const byName = (arr, v) => { const x = arr.find(a => a.id === v) || arr.find(a => String(a.nombre).toLowerCase() === String(v).toLowerCase()); return x ? x.id : ''; };
  st.categorias.forEach(c => { if (!c.color) { c.color = '#6B7A75'; dirty.Categorias = true; } });
  st.productos.forEach(p => {
    const c = byName(st.categorias, p.categoriaId); if (c !== p.categoriaId) { p.categoriaId = c || (st.categorias[0] || {}).id; dirty.Productos = true; }
    const s = byName(st.supers, p.superId); if (s !== p.superId) { p.superId = s || (st.supers[0] || {}).id; dirty.Productos = true; }
    p.activo = bool(p.activo);
  });
  st.personas.forEach(p => { p.activo = bool(p.activo); if (!p.color) { p.color = '#3B6FD8'; dirty.Personas = true; } });
  st.supers.forEach(s => { s.activo = bool(s.activo); if (!s.color) { s.color = '#6B7A75'; dirty.Supers = true; } });
  st.lista.forEach(r => { r.cantidad = num(r.cantidad, 1); r.comprado = r.comprado === '' ? '' : num(r.comprado, ''); r.actualizado = num(r.actualizado, 0); });
  // Lo comprado antes de hoy sale de la lista (ya está en Historial)
  const t0 = startOfToday();
  const before = st.lista.length;
  st.lista = st.lista.filter(r => r.comprado === '' || r.comprado >= t0);
  if (st.lista.length !== before) dirty.Lista = true;
  return { st: st, dirty: dirty };
}
function saveDirty(o, st, dirty) {
  const map = { Categorias: st.categorias, Productos: st.productos, Personas: st.personas, Supers: st.supers, Lista: st.lista };
  Object.keys(dirty).forEach(k => { if (map[k]) write(o.T[k], map[k]); });
}
function loadFamily(user, familyId) {
  const f = familyFor(user, familyId);
  const o = openFam(f);
  const r = readState(f, o);
  if (Object.keys(r.dirty).length) {
    const lock = LockService.getScriptLock(); lock.waitLock(20000);
    try { saveDirty(o, r.st, r.dirty); } finally { lock.releaseLock(); }
  }
  return r.st;
}

/* Mismos cambios que applyOp() en app.js */
function applyOps(user, familyId, ops) {
  const f = familyFor(user, familyId);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const o = openFam(f);
    const r = readState(f, o);
    const st = r.st, dirty = r.dirty, now = Date.now();
    const hist = [];
    const tz = Session.getScriptTimeZone();
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
            undoHistory(o.T.Historial, op.productoId);
          }
          Object.assign(x, { comprado: op.value ? now : '', actualizado: now, por: user.email });
          dirty.Lista = true; break;
        }
        case 'addProduct':
          if (!st.productos.some(p => p.id === op.id)) st.productos.push({ id: op.id, nombre: op.nombre, categoriaId: op.categoriaId, superId: op.superId, orden: st.productos.length + 1, activo: true });
          dirty.Productos = true; break;
        case 'setProductSuper': { const p = st.productos.find(x => x.id === op.productoId); if (p) { p.superId = op.superId; dirty.Productos = true; } break; }
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
    saveDirty(o, st, dirty);
    if (hist.length) {
      const sh = o.T.Historial, start = sh.getLastRow() + 1;
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

/* Ejecuta esto una vez desde el editor (botón Ejecutar) para dar permisos y crear las pestañas. */
function preparar() {
  Object.keys(REG_TABS).forEach(k => tab(reg(), k, REG_TABS[k]));
  DriveApp.getRootFolder();
  UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo', { muteHttpExceptions: true });
  Logger.log('Listo. Ahora: Implementar > Nueva implementación > Aplicación web.');
}
