(() => {
'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
const EXAMPLE = `SESIÓN JUEVES: CACOs (39 min total)
1. Calentamiento (10 min):
5 min de caminata a ritmo vivo para subir pulsaciones.
5 min de movilidad articular dinámica.
2. Bloque Principal (24 min):
Vas a realizar 8 bloques continuos de la siguiente secuencia:
1 minuto de trote suave: El esfuerzo debe ser de un 4-5 sobre 10
2 minutos de caminata activa: Caminar a ritmo rápido.
3. Vuelta a la calma (5 min):
5 min caminando muy suave.`;
const uid = () => Math.random().toString(36).slice(2, 10);
const ICON = {
  paste: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v3H8z"/><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"/><path d="M8 12h8M8 16h5"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4.2" height="15" rx="1"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1"/></svg>',
  voiceOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  voiceOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>'
};

/* ---------- ajustes ---------- */
const DEFAULTS = { voice: true, voiceURI: '', rate: 1, prewarn: 10, beeps: true, detail: 'full', paceRun: 420, paceWalk: 600, gps: true, theme: '', duck: true };
let S = Object.assign({}, DEFAULTS, store.get('rc.settings', {}));
const saveS = () => store.set('rc.settings', S);
if (S.theme) document.documentElement.setAttribute('data-theme', S.theme);

/* ---------- formato ---------- */
const pad = n => String(n).padStart(2, '0');
function fmt(sec) { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`; }
function fmtLong(sec) { sec = Math.round(sec); const m = Math.floor(sec / 60), s = sec % 60; if (m >= 60) return `${Math.floor(m / 60)} h ${pad(m % 60)} min`; return s ? `${m} min ${s} s` : `${m} min`; }
function sayDur(sec) { sec = Math.round(sec); const m = Math.floor(sec / 60), s = sec % 60; const p = []; if (m) p.push(m === 1 ? 'un minuto' : `${m} minutos`); if (s) p.push(`${s} segundos`); return p.join(' y ') || '0 segundos'; }
function sayDist(m) { return m >= 1000 ? `${(m / 1000).toString().replace('.', ' coma ')} kilómetros` : `${m} metros`; }
const sayRpe = r => r.replace(/[.,]/, ' coma ').replace('-', ' a ');
const rpeMax = r => { const n = String(r || '').match(/\d+(?:[.,]\d)?/g); return n ? Math.max(...n.map(x => parseFloat(x.replace(',', '.')))) : null; };
function tclass(it) {
  if (it.type === 'walk') return 't-walk';
  if (it.type === 'mobility') return 't-mobility';
  if (it.type === 'rest') return 't-rest';
  const n = rpeMax(it.rpe);
  if (n === null) return 't-run';
  return n >= 8 ? 't-run-hard' : n >= 6 ? 't-run' : 't-run-easy';
}
const TYPE_NAME = { run: 'Trote', walk: 'Caminata', mobility: 'Movilidad', rest: 'Descanso' };
function parseAmount(str) {
  const s = String(str).trim().toLowerCase().replace(',', '.');
  let m;
  if ((m = s.match(/^(\d+(?:\.\d+)?)\s*km$/))) return { dist: Math.round(parseFloat(m[1]) * 1000) };
  if ((m = s.match(/^(\d+)\s*m(?:etros?)?$/))) return { dist: +m[1] };
  if ((m = s.match(/^(\d+):(\d{1,2})$/))) return { dur: +m[1] * 60 + +m[2] };
  if ((m = s.match(/^(\d+)\s*s(?:eg(?:undos)?)?$/))) return { dur: +m[1] };
  if ((m = s.match(/^(\d+(?:\.\d+)?)\s*(?:min(?:utos)?|')?$/))) return { dur: Math.round(parseFloat(m[1]) * 60) };
  return null;
}
const amountStr = it => it.dist ? (it.dist >= 1000 ? `${it.dist / 1000} km` : `${it.dist} m`) : fmt(it.dur || 0);
const paceStr = s => `${Math.floor(s / 60)}:${pad(s % 60)}`;

/* ---------- datos ---------- */
let workouts = store.get('rc.workouts', null);
function saveW() { store.set('rc.workouts', workouts); }
function fromParse(p) { return { id: uid(), title: p.title, date: p.date || Date.now(), declaredText: p.declaredText, sections: p.sections, warnings: p.warnings, source: p.source, seed: false }; }
if (!Array.isArray(workouts)) {
  try {
    const txt = document.getElementById('sample').textContent;
    workouts = RC.parse(txt, S).map(p => Object.assign(fromParse(p), { seed: true }));
  } catch (e) { workouts = []; }
  saveW();
}
const total = w => w.sections.reduce((a, s) => a + RC.secSeconds(s, S), 0);
function buildSteps(w) {
  const steps = [];
  w.sections.forEach(sec => sec.items.forEach(it => {
    if (it.kind === 'group') { for (let r = 1; r <= it.reps; r++) it.items.forEach((x, xi) => steps.push(mk(x, sec, { block: r, blocks: it.reps, first: xi === 0 }))); }
    else steps.push(mk(it, sec, null));
  }));
  return steps;
  function mk(x, sec, b) { return Object.assign({}, x, { dur: RC.itemSeconds(x, S), section: sec.kind, sectionName: sec.name, b }); }
}
function timeline(steps, cls = '') { return `<div class="tl ${cls}">${steps.map(s => `<i class="${tclass(s)}" style="flex:${Math.max(1, s.dur)}"></i>`).join('')}</div>`; }

/* ---------- vistas ---------- */
const view = $('#view'), dock = $('#dock');
let draft = null, draftIsNew = false;
function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, ms); }

function renderHome() {
  draft = null; dock.hidden = true;
  const act = store.get('rc.active', null);
  const resumable = act && Date.now() - act.at < 4 * 3600e3 && workouts.find(w => w.id === act.wid);
  const list = workouts.slice().sort((a, b) => (b.date || 0) - (a.date || 0));
  view.innerHTML = `
  <div class="topbar">
    <div class="brand"><h1>Ritmo CACO</h1><div class="mark"><i class="t-walk" style="width:26px;background:var(--c)"></i><i class="t-run" style="width:14px;background:var(--c)"></i><i class="t-walk" style="width:26px;background:var(--c)"></i><i class="t-run-hard" style="width:14px;background:var(--c)"></i></div></div>
    <div class="spacer"></div>
    <button class="iconbtn" data-act="settings" aria-label="Ajustes">${ICON.gear}</button>
  </div>
  <div class="stack">
    ${resumable ? `<div class="banner row"><div style="flex:1"><b>Entreno a medias</b><div>${esc(resumable.title)}</div></div><button class="btn primary" data-act="resume">Reanudar</button><button class="btn ghost" data-act="discard">Descartar</button></div>` : ''}
    <div class="ctas">
      <button class="cta2" data-act="manual"><span class="ic">${ICON.plus}</span><b>Crear</b><span>A mano, con ruedas de tiempo</span></button>
      <button class="cta2 dark" data-act="import"><span class="ic">${ICON.paste}</span><b>Pegar</b><span>El WhatsApp del entrenador</span></button>
    </div>
    <div class="row" style="margin-top:8px"><h2>Mis entrenamientos</h2><div class="spacer"></div><span class="muted num">${list.length}</span></div>
    <div class="legend">${legend()}</div>
    ${list.length ? '' : '<p class="muted">Todavía no hay entrenamientos. Crea o pega el primero arriba.</p>'}
    ${list.map(w => { const st = buildSteps(w); return `
      <article class="card wcard">
        <div class="t">${esc(w.title)}</div>
        <div class="meta num"><span>${new Date(w.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span><span>${fmtLong(total(w))}</span><span>${st.length} intervalos</span>${w.warnings && w.warnings.length ? `<span style="color:var(--warn-ink)">${w.warnings.length} aviso${w.warnings.length > 1 ? 's' : ''}</span>` : ''}</div>
        ${timeline(st)}
        <div class="actions"><button class="btn" data-act="edit" data-id="${w.id}">Revisar</button><button class="btn primary" data-act="start" data-id="${w.id}">${ICON.play} Empezar</button></div>
      </article>`; }).join('')}
  </div>`;
}
function legend() {
  return [['t-walk', 'Caminata'], ['t-run-easy', 'Trote suave (≤5)'], ['t-run', 'Trote medio (6-7)'], ['t-run-hard', 'Rápido (8+)'], ['t-mobility', 'Movilidad']]
    .map(([c, n]) => `<span class="${c}"><i></i>${n}</span>`).join('');
}

function renderImport() {
  dock.hidden = false;
  dock.innerHTML = `<div class="in"><button class="btn" data-act="home">Cancelar</button><button class="btn primary" data-act="convert">Convertir en intervalos</button></div>`;
  view.innerHTML = `
  <div class="topbar"><button class="iconbtn" data-act="home" aria-label="Volver">${ICON.back}</button><h2>Pegar entrenamiento</h2></div>
  <div class="stack">
    <p class="muted" style="margin:0">Mantén pulsado el mensaje en WhatsApp, Copiar, y pégalo aquí. Puedes pegar varios mensajes a la vez: cada sesión se guarda por separado.</p>
    <textarea id="paste" placeholder="SESIÓN JUEVES: CACOs&#10;1. Calentamiento (10 min):&#10;5 min de caminata a ritmo vivo…&#10;2. Bloque Principal (24 min):&#10;8 bloques continuos de:&#10;1 minuto de trote suave (4-5 sobre 10)&#10;2 minutos de caminata activa&#10;3. Vuelta a la calma (5 min)…"></textarea>
    <button class="btn ghost" data-act="example" style="align-self:flex-start">Probar con un ejemplo</button>
  </div>`;
}

function renderEditor() {
  const w = draft, steps = buildSteps(w), tot = total(w);
  dock.hidden = false;
  dock.innerHTML = `<div class="in"><button class="btn" data-act="save">Guardar</button><button class="btn primary" data-act="start-draft">${ICON.play} Empezar</button></div>`;
  view.innerHTML = `
  <div class="topbar"><button class="iconbtn" data-act="home" aria-label="Volver">${ICON.back}</button><span class="eyebrow">${draftIsNew ? 'Nuevo entrenamiento' : 'Revisar entrenamiento'}</span></div>
  <div class="stack">
    <input class="title-input" type="text" id="w-title" value="${esc(w.title)}" aria-label="Nombre">
    <div class="summary num" id="w-sum">${summaryHTML(w, steps, tot)}</div>
    <div id="w-tl">${timeline(steps, 'big')}</div>
    <div class="legend">${legend()}</div>
    ${w.warnings && w.warnings.length ? `<div class="banner"><b>Revisa esto</b><ul>${w.warnings.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    ${w.sections.map((sec, si) => `
      <section class="sec">
        <div class="sec-h"><h3>${esc(sec.name)}</h3>${sec.declared ? `<span class="decl">mensaje: ${fmtLong(sec.declared)}</span>` : ''}<span class="dur num" data-secdur="${si}">${fmt(RC.secSeconds(sec, S))}</span></div>
        ${sec.items.map((it, ii) => it.kind === 'group' ? groupHTML(it, `${si}/${ii}`) : ivHTML(it, `${si}/${ii}`)).join('')}
        <div class="addrow"><button class="btn" data-act="add-int" data-path="${si}">+ Intervalo</button>${sec.kind === 'main' ? `<button class="btn" data-act="add-grp" data-path="${si}">+ Bloque que se repite</button>` : ''}</div>
      </section>`).join('')}
    ${w.source ? `<details class="src"><summary>Mensaje original</summary><pre>${esc(w.source)}</pre></details>` : ''}
    ${draftIsNew ? '' : `<button class="btn ghost danger" data-act="delete" style="align-self:flex-start">Borrar entrenamiento</button>`}
  </div>`;
}
function summaryHTML(w, steps, tot) {
  return `<div><div class="lbl">Total</div><div class="big">${fmt(tot)}</div></div>
    <div><div class="lbl">Intervalos</div><div class="big">${steps.length}</div></div>
    ${w.declaredText ? `<div class="muted" style="padding-bottom:6px">El mensaje decía ${esc(w.declaredText)}</div>` : ''}`;
}
const RPE_OPTS = ['', '1', '2', '3', '4', '4-5', '5', '5-6', '6', '6-7', '7', '7-8', '8', '8-9', '9', '10'];
function ivHTML(it, path) {
  const est = it.dist ? `≈ ${fmt(RC.itemSeconds(it, S))} a tu ritmo` : '';
  return `<div class="iv ${tclass(it)}" data-path="${path}">
    <select data-f="type" aria-label="Tipo">${Object.entries(TYPE_NAME).map(([k, n]) => `<option value="${k}"${k === it.type ? ' selected' : ''}>${n}</option>`).join('')}</select>
    <input type="text" data-f="label" value="${esc(it.label)}" aria-label="Descripción">
    <button class="del" data-act="del" aria-label="Quitar">×</button>
    <div class="r2">
      <div class="field"><small>${it.dist ? 'Distancia' : 'Duración'}</small><button type="button" class="amt num" data-act="pick">${esc(amountStr(it))}</button><span class="hint" data-est>${est}</span></div>
      <label class="field"><small>Esfuerzo /10</small><select data-f="rpe" class="num">${RPE_OPTS.concat(it.rpe && !RPE_OPTS.includes(it.rpe) ? [it.rpe] : []).map(o => `<option value="${o}"${o === (it.rpe || '') ? ' selected' : ''}>${o ? o.replace('-', '–') + ' /10' : 'Sin indicar'}</option>`).join('')}</select></label>
    </div>
  </div>`;
}
function groupHTML(g, path) {
  const one = g.items.reduce((a, x) => a + RC.itemSeconds(x, S), 0);
  return `<div class="grp" data-path="${path}">
    <div class="grp-h"><span class="x">Repetir</span>
      <div class="stepper"><button data-act="reps-" aria-label="Menos">−</button><input type="number" data-f="reps" value="${g.reps}" min="1" max="99" aria-label="Repeticiones"><button data-act="reps+" aria-label="Más">+</button></div>
      <span class="muted num" data-grpinfo>veces · ${fmt(one)} cada uno = ${fmt(one * g.reps)}</span>
      <div class="spacer"></div><button class="del btn ghost" data-act="del" aria-label="Quitar bloque" style="min-height:40px;padding:6px 10px">×</button></div>
    ${g.items.map((x, xi) => ivHTML(x, `${path}/${xi}`)).join('')}
    <div class="addrow"><button class="btn" data-act="add-int" data-path="${path}">+ Intervalo en el bloque</button></div>
  </div>`;
}
function getByPath(path) {
  const p = String(path).split('/').map(Number);
  const sec = draft.sections[p[0]];
  if (p.length === 1) return { list: sec.items };
  if (p.length === 2) return { list: sec.items, i: p[1], item: sec.items[p[1]] };
  const g = sec.items[p[1]]; return { list: g.items, i: p[2], item: g.items[p[2]], group: g };
}
function refreshEditorStats() {
  const steps = buildSteps(draft);
  $('#w-sum').innerHTML = summaryHTML(draft, steps, total(draft));
  $('#w-tl').innerHTML = timeline(steps, 'big');
  draft.sections.forEach((s, si) => { const e = document.querySelector(`[data-secdur="${si}"]`); if (e) e.textContent = fmt(RC.secSeconds(s, S)); });
  document.querySelectorAll('.grp').forEach(el => { const g = getByPath(el.dataset.path).item; const one = g.items.reduce((a, x) => a + RC.itemSeconds(x, S), 0); const inf = el.querySelector('[data-grpinfo]'); if (inf) inf.textContent = `veces · ${fmt(one)} cada uno = ${fmt(one * g.reps)}`; });
}

/* ---------- eventos de la app ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act, id = b.dataset.id;
  const w = id && workouts.find(x => x.id === id);
  switch (act) {
    case 'home': renderHome(); scrollTo(0, 0); break;
    case 'manual': draft = newManual(); draftIsNew = true; renderEditor(); scrollTo(0, 0); break;
    case 'pick': openPicker(b.closest('[data-path]').dataset.path); break;
    case 'import': renderImport(); scrollTo(0, 0); setTimeout(() => $('#paste') && $('#paste').focus(), 50); break;
    case 'example': $('#paste').value = (workouts.find(x => x.source) || {}).source || EXAMPLE; break;
    case 'convert': {
      const txt = $('#paste').value.trim();
      if (!txt) { toast('Pega primero el mensaje del entrenador'); return; }
      const res = RC.parse(txt, S).map(fromParse);
      if (!res.length) { toast('No he encontrado intervalos en ese texto'); return; }
      if (res.length > 1) { res.forEach(r => workouts.push(r)); saveW(); renderHome(); toast(`${res.length} sesiones añadidas`); return; }
      draft = res[0]; draftIsNew = true; renderEditor(); scrollTo(0, 0); break;
    }
    case 'edit': draft = JSON.parse(JSON.stringify(w)); draftIsNew = false; renderEditor(); scrollTo(0, 0); break;
    case 'start': startRun(w); break;
    case 'save': saveDraft(); renderHome(); toast('Guardado'); break;
    case 'start-draft': { const sw = saveDraft(); startRun(sw); break; }
    case 'delete': askConfirm('¿Borrar este entrenamiento?', 'Borrar', () => { workouts = workouts.filter(x => x.id !== draft.id); saveW(); renderHome(); toast('Borrado'); }); break;
    case 'del': { const r = getByPath(b.closest('[data-path]').dataset.path); r.list.splice(r.i, 1); if (r.group && !r.group.items.length) { const pr = getByPath(b.closest('.grp').dataset.path); pr.list.splice(pr.i, 1); } renderEditor(); break; }
    case 'add-int': { const r = getByPath(b.dataset.path); const list = r.item && r.item.kind === 'group' ? r.item.items : r.list; const main = draft.sections[+b.dataset.path.split('/')[0]].kind === 'main'; list.push({ kind: 'int', type: main ? 'run' : 'walk', label: main ? 'Trote' : 'Caminata', dur: 60, rpe: '' }); renderEditor(); break; }
    case 'add-grp': getByPath(b.dataset.path).list.push({ kind: 'group', reps: 5, items: [{ kind: 'int', type: 'run', label: 'Trote', dur: 60, rpe: '6' }, { kind: 'int', type: 'walk', label: 'Caminata activa', dur: 60, rpe: '' }] }); renderEditor(); break;
    case 'reps-': case 'reps+': { const g = getByPath(b.closest('.grp').dataset.path).item; g.reps = Math.max(1, Math.min(99, g.reps + (act === 'reps+' ? 1 : -1))); b.parentNode.querySelector('input').value = g.reps; refreshEditorStats(); break; }
    case 'settings': renderSettings(); break;
    case 'close-sheet': $('#sheet').hidden = true; if (!draft) renderHome(); else renderEditor(); break;
    case 'resume': { const a = store.get('rc.active', null); const rw = a && workouts.find(x => x.id === a.wid); if (rw) startRun(rw, a); break; }
    case 'discard': store.del('rc.active'); renderHome(); break;
    case 'test-voice': primeAudio(); say('Trote rápido. Un minuto y 30 segundos. Esfuerzo 7 a 8 sobre 10. Bloque 3 de 10. Quedan 15 intervalos.', true); break;
    case 'theme': S.theme = b.dataset.v; saveS(); if (S.theme) document.documentElement.setAttribute('data-theme', S.theme); else document.documentElement.removeAttribute('data-theme'); renderSettings(); break;
    case 'detail': S.detail = b.dataset.v; saveS(); renderSettings(); break;
    case 'prewarn': S.prewarn = +b.dataset.v; saveS(); renderSettings(); break;
  }
});
document.addEventListener('input', e => {
  const el = e.target;
  if (el.id === 'w-title' && draft) { draft.title = el.value; return; }
  const f = el.dataset && el.dataset.f; if (!f || !draft) return;
  const holder = el.closest('[data-path]'); if (!holder) return;
  const r = getByPath(holder.dataset.path), it = r.item;
  if (f === 'label') it.label = el.value;
  else if (f === 'rpe') { it.rpe = el.value.trim().replace(/\s*(?:a|–)\s*/, '-'); holder.className = `iv ${tclass(it)}`; }
  else if (f === 'type') { it.type = el.value; holder.className = `iv ${tclass(it)}`; }
  else if (f === 'amount') { const a = parseAmount(el.value); el.style.borderColor = a ? '' : 'var(--run-hard)'; if (a) { delete it.dur; delete it.dist; Object.assign(it, a); const h = holder.querySelector('[data-est]'); if (h) h.textContent = it.dist ? `≈ ${fmt(RC.itemSeconds(it, S))} a tu ritmo` : ''; } }
  else if (f === 'reps') { const n = parseInt(el.value, 10); if (n > 0) it.reps = Math.min(99, n); }
  refreshEditorStats();
});
function saveDraft() {
  const d = JSON.parse(JSON.stringify(draft));
  const i = workouts.findIndex(x => x.id === d.id);
  if (i >= 0) workouts[i] = d; else workouts.push(d);
  saveW(); draftIsNew = false; return d;
}
function askConfirm(msg, okLabel, fn, cancelLabel = 'Cancelar') {
  const c = $('#confirm');
  c.innerHTML = `<div class="box"><h3>${esc(msg)}</h3><div class="row"><button class="btn" id="c-no">${esc(cancelLabel)}</button><button class="btn primary" id="c-ok">${esc(okLabel)}</button></div></div>`;
  c.hidden = false;
  $('#c-no').onclick = () => c.hidden = true;
  $('#c-ok').onclick = () => { c.hidden = true; fn(); };
}

function newManual() {
  const iv = (type, label, dur, rpe = '') => ({ kind: 'int', type, label, dur, rpe });
  return { id: uid(), title: 'Mi entrenamiento', date: Date.now(), declaredText: '', warnings: [], source: '', seed: false, sections: [
    { kind: 'warmup', name: 'Calentamiento', declared: null, items: [iv('walk', 'Caminata a buen ritmo', 300, '3'), iv('mobility', 'Movilidad articular', 300)] },
    { kind: 'main', name: 'Bloque principal', declared: null, items: [{ kind: 'group', reps: 6, items: [iv('run', 'Trote', 120, '6-7'), iv('walk', 'Caminata activa', 60, '4')] }] },
    { kind: 'cooldown', name: 'Vuelta a la calma', declared: null, items: [iv('walk', 'Caminata muy suave', 300, '2')] }] };
}
const MINS = Array.from({ length: 91 }, (_, i) => i), SECS = [0, 15, 30, 45];
const DISTS = [...Array.from({ length: 20 }, (_, i) => 50 + i * 50), ...Array.from({ length: 40 }, (_, i) => 1100 + i * 100), ...Array.from({ length: 32 }, (_, i) => 5500 + i * 500)];
const ITEM_H = 48;
function wheelHTML(id, values, label) {
  return `<div class="wcol"><div class="wheel" id="${id}" tabindex="0" aria-label="${label}">${values.map((v, i) => `<div class="wi" data-i="${i}">${v}</div>`).join('')}</div><div class="wlab">${label}</div></div>`;
}
function wheelIdx(el) { return Math.max(0, Math.min(el.children.length - 1, Math.round(el.scrollTop / ITEM_H))); }
function wheelSet(el, i, smooth) { el.scrollTo({ top: i * ITEM_H, behavior: smooth ? 'smooth' : 'auto' }); }
function openPicker(path) {
  const it = getByPath(path).item; let mode = it.dist ? 'dist' : 'time';
  const sh = $('#sheet');
  const draw = () => {
    sh.innerHTML = `<div class="panel" role="dialog" aria-label="Elegir ${mode === 'time' ? 'duración' : 'distancia'}">
      <div class="row"><h2>${esc(it.label || TYPE_NAME[it.type])}</h2><div class="spacer"></div><div class="seg"><button data-pm="time" aria-pressed="${mode === 'time'}">Tiempo</button><button data-pm="dist" aria-pressed="${mode === 'dist'}">Distancia</button></div></div>
      <div class="pk-prev num" id="pk-prev"></div>
      <div class="wheels">${mode === 'time' ? wheelHTML('wm', MINS.map(String), 'min') + '<div class="wsep">:</div>' + wheelHTML('ws', SECS.map(pad), 's') : wheelHTML('wd', DISTS.map(d => d >= 1000 ? (d / 1000).toString().replace('.', ',') + ' km' : d + ' m'), 'distancia')}</div>
      <div class="row"><button class="btn" id="pk-no" style="flex:1">Cancelar</button><button class="btn primary" id="pk-ok" style="flex:2">Aceptar</button></div>
    </div>`;
    sh.hidden = false;
    const prev = $('#pk-prev');
    const val = () => mode === 'time' ? { dur: MINS[wheelIdx($('#wm'))] * 60 + SECS[wheelIdx($('#ws'))] } : { dist: DISTS[wheelIdx($('#wd'))] };
    const upd = () => { const v = val(); prev.textContent = v.dist ? amountStr(v) : fmt(v.dur); };
    sh.querySelectorAll('.wheel').forEach(w => {
      w.addEventListener('scroll', upd, { passive: true });
      w.addEventListener('click', e => { const wi = e.target.closest('.wi'); if (wi) wheelSet(w, +wi.dataset.i, true); });
      w.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); wheelSet(w, wheelIdx(w) + (e.key === 'ArrowDown' ? 1 : -1), true); } });
    });
    requestAnimationFrame(() => {
      if (mode === 'time') { const d = it.dur || 60; let m = Math.floor(d / 60), si = Math.round((d % 60) / 15); if (si === 4) { m++; si = 0; } wheelSet($('#wm'), Math.min(90, m)); wheelSet($('#ws'), si); }
      else { const d = it.dist || 400; let bi = 0; DISTS.forEach((x, i) => { if (Math.abs(x - d) < Math.abs(DISTS[bi] - d)) bi = i; }); wheelSet($('#wd'), bi); }
      upd();
    });
    sh.querySelectorAll('[data-pm]').forEach(b => b.onclick = () => { mode = b.dataset.pm; draw(); });
    $('#pk-no').onclick = () => { sh.hidden = true; };
    $('#pk-ok').onclick = () => { const v = val(); if (v.dur === 0) { toast('Elige al menos 15 segundos'); return; } delete it.dur; delete it.dist; Object.assign(it, v); sh.hidden = true; renderEditor(); };
  };
  draw();
}

/* ---------- ajustes ---------- */
function voices() { try { return speechSynthesis.getVoices().filter(v => /^es/i.test(v.lang)); } catch (e) { return []; } }
function renderSettings() {
  const sh = $('#sheet'); const vs = voices();
  const gpsAvail = 'geolocation' in navigator;
  sh.innerHTML = `<div class="panel" role="dialog" aria-label="Ajustes">
    <div class="row"><h2>Ajustes</h2><div class="spacer"></div><button class="btn" data-act="close-sheet">Hecho</button></div>
    <div class="set"><label for="s-voice">Avisos por voz<small>Por los auriculares, en español</small></label><input class="switch" type="checkbox" id="s-voice" ${S.voice ? 'checked' : ''}></div>
    <div class="set"><label for="s-vsel">Voz</label><select id="s-vsel" style="max-width:55%"><option value="">Automática (español)</option>${vs.map(v => `<option value="${esc(v.voiceURI)}"${v.voiceURI === S.voiceURI ? ' selected' : ''}>${esc(v.name)} · ${esc(v.lang)}</option>`).join('')}</select></div>
    <div class="set"><label for="s-rate">Velocidad de la voz<small class="num" id="s-rate-v">${S.rate.toFixed(1)}×</small></label><input type="range" id="s-rate" min="0.7" max="1.4" step="0.1" value="${S.rate}" style="width:45%"></div>
    <div class="set"><label>Qué dice al empezar<small>${S.detail === 'full' ? 'Tipo, duración, esfuerzo, bloque y cuántos quedan' : 'Tipo, duración y esfuerzo'}</small></label><div class="seg"><button data-act="detail" data-v="full" aria-pressed="${S.detail === 'full'}">Todo</button><button data-act="detail" data-v="short" aria-pressed="${S.detail === 'short'}">Breve</button></div></div>
    <div class="set"><label>Aviso del siguiente<small>Segundos antes de acabar</small></label><div class="seg">${[5, 10, 15, 20].map(n => `<button data-act="prewarn" data-v="${n}" aria-pressed="${S.prewarn === n}">${n}</button>`).join('')}</div></div>
    <div class="set"><label for="s-duck">Bajar la música en los avisos<small>Prueba: en Chrome para Android suele bajar Spotify o YouTube Music mientras habla</small></label><input class="switch" type="checkbox" id="s-duck" ${S.duck ? 'checked' : ''}></div>
    <div class="set"><label for="s-beeps">Pitidos 3-2-1<small>Antes de cada cambio</small></label><input class="switch" type="checkbox" id="s-beeps" ${S.beeps ? 'checked' : ''}></div>
    <button class="btn" data-act="test-voice">${ICON.voiceOn} Probar la voz</button>
    <h2 style="margin-top:6px">Series por distancia</h2>
    <div class="set"><label for="s-gps">Medir con GPS<small>${gpsAvail ? 'Si el GPS no responde, usa el tiempo estimado' : 'Este navegador no ofrece GPS: se usa el tiempo estimado'}</small></label><input class="switch" type="checkbox" id="s-gps" ${S.gps ? 'checked' : ''}></div>
    <div class="set"><label for="s-prun">Tu ritmo de trote<small>min/km, para estimar el tiempo</small></label><input type="text" id="s-prun" value="${paceStr(S.paceRun)}" style="width:90px;text-align:center" inputmode="numeric"></div>
    <div class="set"><label for="s-pwalk">Tu ritmo caminando<small>min/km</small></label><input type="text" id="s-pwalk" value="${paceStr(S.paceWalk)}" style="width:90px;text-align:center" inputmode="numeric"></div>
    <div class="set"><label>Tema</label><div class="seg"><button data-act="theme" data-v="" aria-pressed="${!S.theme}">Auto</button><button data-act="theme" data-v="light" aria-pressed="${S.theme === 'light'}">Claro</button><button data-act="theme" data-v="dark" aria-pressed="${S.theme === 'dark'}">Oscuro</button></div></div>
    <div class="info">
      <h3>Con el móvil bloqueado</h3>
      <p>Al empezar, la app mantiene la pantalla encendida y reproduce un audio silencioso para que el navegador no la duerma. Lo más fiable es dejar la pantalla encendida con el candado de la pantalla de carrera: la pone en negro y no hace caso a toques en el bolsillo.</p>
      <p><b>Android (Chrome):</b> si bloqueas el móvil, los pitidos siguen y la voz suele seguir, pero algunos móviles con ahorro de batería agresivo pausan la página. Quita el ahorro de batería a Chrome. Si un aviso se pierde, al volver la app se pone al día con el tiempo real.</p>
      <p><b>iPhone (Safari):</b> con la pantalla bloqueada iOS suele parar la voz. Usa el candado de la app.</p>
      <p>El botón de pausa de los auriculares pausa y reanuda el entreno.</p>
    </div>
  </div>`;
  sh.hidden = false;
  const on = (id, ev, fn) => { const el = document.getElementById(id); if (el) el.addEventListener(ev, fn); };
  on('s-voice', 'change', e => { S.voice = e.target.checked; saveS(); });
  on('s-duck', 'change', e => { S.duck = e.target.checked; saveS(); });
  on('s-beeps', 'change', e => { S.beeps = e.target.checked; saveS(); });
  on('s-gps', 'change', e => { S.gps = e.target.checked; saveS(); });
  on('s-vsel', 'change', e => { S.voiceURI = e.target.value; saveS(); });
  on('s-rate', 'input', e => { S.rate = +e.target.value; $('#s-rate-v').textContent = S.rate.toFixed(1) + '×'; saveS(); });
  const pace = (id, key) => on(id, 'change', e => { const m = e.target.value.match(/^(\d{1,2})(?::(\d{1,2}))?$/); if (m) { S[key] = +m[1] * 60 + (+m[2] || 0); saveS(); } e.target.value = paceStr(S[key]); });
  pace('s-prun', 'paceRun'); pace('s-pwalk', 'paceWalk');
}
$('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') { e.target.hidden = true; if (!draft) renderHome(); else renderEditor(); } });
try { speechSynthesis.onvoiceschanged = () => { if (!$('#sheet').hidden) renderSettings(); }; } catch (e) {}

/* ---------- audio y voz ---------- */
let ac = null, keep = null;
function silentWav(secs = 2) {
  const sr = 8000, n = Math.round(sr * secs), buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, (Math.random() * 6 - 3) | 0, true);
  let bin = ''; const u8 = new Uint8Array(buf); for (let i = 0; i < u8.length; i += 8192) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
  return 'data:audio/wav;base64,' + btoa(bin);
}
function primeAudio() {
  try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) {}
  try { if (!keep) { keep = new Audio(silentWav()); keep.loop = true; keep.volume = 0.05; } keep.play().catch(() => {}); } catch (e) {}
  try { if (S.duck && !duckEl) { duck(); } } catch (e) {}
  try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (e) {}
}
function beep(kind) {
  if (!S.beeps || !ac) return;
  try {
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    const f = { tick: 740, go: 1046, end: 523 }[kind] || 740, d = kind === 'tick' ? 0.13 : 0.45;
    o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d + 0.05);
    if (kind === 'go') { const o2 = ac.createOscillator(), g2 = ac.createGain(); o2.frequency.value = 1318; g2.gain.setValueAtTime(0.0001, t + 0.16); g2.gain.exponentialRampToValueAtTime(0.4, t + 0.18); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.6); o2.connect(g2).connect(ac.destination); o2.start(t + 0.15); o2.stop(t + 0.65); }
  } catch (e) {}
}
let duckEl = null;
function duck() {
  if (!S.duck) return;
  try {
    if (!duckEl) {
      duckEl = new Audio(silentWav(4));
      duckEl.addEventListener('ended', () => { try { if (speechSynthesis.speaking) { duckEl.currentTime = 0; duckEl.play().catch(() => {}); } } catch (e) {} });
    }
    duckEl.currentTime = 0; duckEl.play().catch(() => {});
  } catch (e) {}
}
function say(text, interrupt) {
  if (!S.voice) return;
  if (!('speechSynthesis' in window)) { if (!say.warned) { say.warned = true; toast('Este navegador no tiene voz. Usa Chrome.', 6000); } return; }
  try {
    const go = () => {
      duck();
      const u = new SpeechSynthesisUtterance(text);
      const vs = voices(); const v = vs.find(x => x.voiceURI === S.voiceURI) || vs.find(x => /es[-_]ES/i.test(x.lang)) || vs[0];
      if (v) u.voice = v; u.lang = v ? v.lang : 'es-ES'; u.rate = S.rate; u.volume = 1;
      let started = false; u.onstart = () => { started = true; say.ok = true; };
      speechSynthesis.speak(u);
      if (!say.ok && !say.warned) setTimeout(() => { if (!started && !say.ok && !say.warned) { say.warned = true; toast(voices().length ? 'La voz no arranca. Sube el volumen o prueba en Chrome.' : 'Este navegador no tiene voz en español (Brave la bloquea). Usa Chrome o baja los escudos de Brave para esta web.', 7000); } }, 3000);
    };
    if (interrupt && (speechSynthesis.speaking || speechSynthesis.pending)) { speechSynthesis.cancel(); setTimeout(go, 80); } else go();
  } catch (e) {}
}

/* ---------- motor del entrenamiento ---------- */
const R = { w: null, steps: [], idx: 0, t0: 0, paused: false, pe: 0, pre: false, beeped: -1, timer: null, wl: null, gpsOn: false, fixAt: 0, gd: 0, last: null, watch: null, done: false };
const runEl = $('#run');
const elapsed = () => R.paused ? R.pe : (Date.now() - R.t0) / 1000;
// GPS mode for a distance step; if no good fix in the last 12 s, the step advances by estimated time instead (never freezes)
const gpsStep = st => !!(st && st.dist && S.gps && R.gpsOn);
const gpsHealthy = () => Date.now() - R.fixAt < 12000;
const useGps = st => gpsStep(st) && gpsHealthy();
const distFrac = st => Math.min(1, gpsHealthy() ? R.gd / st.dist : Math.max(R.gd / st.dist, elapsed() / st.dur));
function startRun(w, resume) {
  primeAudio();
  R.w = w; R.steps = buildSteps(w);
  if (!R.steps.length) { toast('Este entrenamiento no tiene intervalos'); return; }
  R.idx = resume ? Math.min(resume.idx, R.steps.length - 1) : 0;
  R.paused = !!(resume && resume.paused); R.pe = resume ? resume.pe || 0 : 0;
  R.t0 = resume && !resume.paused ? resume.t0 : Date.now() - R.pe * 1000;
  R.pre = false; R.beeped = -1; R.done = false; R.gd = 0; R.last = null;
  runEl.classList.remove('done-screen');
  $('#r-tl').innerHTML = R.steps.map(s => `<i class="${tclass(s)}" style="flex:${Math.max(1, s.dur)};background:var(--c)"></i>`).join('');
  runEl.hidden = false; document.body.style.overflow = 'hidden';
  wake(); startGps(); mediaSession();
  beep('go'); announce(true); persist(); render();
  clearInterval(R.timer); R.timer = setInterval(tick, 200);
}
async function wake() { try { if ('wakeLock' in navigator && !R.wl) { R.wl = await navigator.wakeLock.request('screen'); R.wl.addEventListener('release', () => R.wl = null); } } catch (e) { R.wl = null; } }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !runEl.hidden && !R.done) { wake(); if (keep && keep.paused) keep.play().catch(() => {}); tick(); } });
function startGps() {
  R.gpsOn = false;
  if (!S.gps || !R.steps.some(s => s.dist) || !('geolocation' in navigator)) return;
  R.gpsOn = true;
  try {
    R.watch = navigator.geolocation.watchPosition(p => {
      const c = p.coords; if (c.accuracy > 50) return;
      R.fixAt = Date.now();
      if (R.last && !R.paused) { const d = hav(R.last, c); if (d > 1.5 && d < 120) R.gd += d; }
      R.last = { latitude: c.latitude, longitude: c.longitude };
    }, err => { if (err && err.code === 1 && R.gpsOn) { R.gpsOn = false; toast('Sin permiso de ubicación: uso el tiempo estimado', 4000); } }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  } catch (e) { R.gpsOn = false; }
}
function hav(a, b) { const r = Math.PI / 180, dLa = (b.latitude - a.latitude) * r, dLo = (b.longitude - a.longitude) * r; const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.latitude * r) * Math.cos(b.latitude * r) * Math.sin(dLo / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(x)); }
function stopGps() { try { if (R.watch != null) navigator.geolocation.clearWatch(R.watch); } catch (e) {} R.watch = null; }
function stepDone(st) { return gpsStep(st) ? distFrac(st) >= 1 : elapsed() >= st.dur; }
function tick() {
  if (runEl.hidden || R.done || !R.steps.length) return;
  let st = R.steps[R.idx], moved = false;
  while (!R.paused && stepDone(st)) {
    if (gpsStep(st)) { R.t0 = Date.now(); R.gd = 0; } else R.t0 += st.dur * 1000;
    R.idx++; moved = true; R.pre = false; R.beeped = -1;
    if (R.idx >= R.steps.length) { finish(); return; }
    st = R.steps[R.idx];
    if (Date.now() - R.t0 > 3600e3) { R.t0 = Date.now(); }
  }
  if (moved) { beep('go'); announce(); persist(); mediaSession(); }
  if (!R.paused) {
    if (useGps(st)) {
      const remM = st.dist - R.gd;
      if (!R.pre && remM <= 50 && st.dist > 150) { R.pre = true; prewarn(`En 50 metros`); }
    } else {
      const rem = gpsStep(st) ? st.dur * (1 - distFrac(st)) : st.dur - elapsed();
      if (!R.pre && rem <= S.prewarn && st.dur >= S.prewarn + 8) { R.pre = true; prewarn(`En ${S.prewarn} segundos`); }
      if (rem <= 3.05 && rem > 0) { const k = Math.ceil(rem); if (k !== R.beeped) { R.beeped = k; beep('tick'); } }
    }
  }
  render();
}
function stepSpoken(st, full) {
  const p = [st.label || TYPE_NAME[st.type]];
  p.push(useGps(st) ? sayDist(st.dist) : (st.dist ? `${sayDist(st.dist)}, unos ${sayDur(st.dur)}` : sayDur(st.dur)));
  if (st.rpe && full !== false) p.push(`Esfuerzo ${sayRpe(st.rpe)} sobre 10`);
  return p.join('. ');
}
function announce(first) {
  const st = R.steps[R.idx], prev = R.steps[R.idx - 1], left = R.steps.length - R.idx - 1;
  const p = [];
  if (first) p.push('Empezamos');
  if (!prev || prev.section !== st.section) p.push(st.sectionName);
  if (st.b && st.b.first && S.detail === 'full') p.push(st.b.block === st.b.blocks ? `Último bloque, ${st.b.block} de ${st.b.blocks}` : `Bloque ${st.b.block} de ${st.b.blocks}`);
  p.push(stepSpoken(st));
  if (S.detail === 'full') p.push(left === 0 ? 'Es el último intervalo' : left === 1 ? 'Queda 1 intervalo después de este' : `Quedan ${left} intervalos después de este`);
  say(p.join('. ') + '.', true);
}
function prewarn(when) {
  const st = R.steps[R.idx], nx = R.steps[R.idx + 1];
  if (!nx) { say(`${when}, terminas.`); return; }
  const sec = nx.section !== st.section ? `empieza ${nx.sectionName.toLowerCase()}: ` : (nx.b && nx.b.first && st.b ? `bloque ${nx.b.block}: ` : '');
  say(`${when}, ${sec}${stepSpoken(nx, false)}.`);
}
function finish() {
  R.done = true; clearInterval(R.timer); stopGps(); persist(true);
  beep('end'); setTimeout(() => beep('go'), 500);
  const tot = R.steps.reduce((a, s) => a + s.dur, 0);
  say(`Entrenamiento terminado. ${sayDur(tot)}. Buen trabajo.`, true);
  runEl.classList.add('done-screen'); runEl.classList.remove('paused');
  runEl.style.setProperty('--c', 'var(--walk)');
  $('#r-sec').textContent = R.w.title; $('#r-blk').textContent = '';
  $('#r-kind').textContent = '¡Hecho!'; $('#r-label').textContent = `${R.steps.length} intervalos completados`;
  $('#r-clock').textContent = fmt(tot); $('#r-rpe').hidden = true; $('#r-gps').hidden = true; $('#r-bar').style.width = '100%';
  $('#r-next').hidden = true; $('#r-pos').style.left = '100%'; $('#r-left').textContent = ''; $('#r-total').textContent = '';
  $('#r-play').innerHTML = ICON.play; $('#r-play').setAttribute('aria-label', 'Repetir');
  try { if (keep) keep.pause(); } catch (e) {}
  try { if (R.wl) R.wl.release(); } catch (e) {}
}
function closeRun() {
  clearInterval(R.timer); stopGps(); R.done = true;
  try { speechSynthesis.cancel(); } catch (e) {}
  try { if (keep) keep.pause(); } catch (e) {}
  try { if (R.wl) { R.wl.release(); R.wl = null; } } catch (e) {}
  runEl.hidden = true; $('#pocket').hidden = true; document.body.style.overflow = '';
  store.del('rc.active'); renderHome();
}
function persist(clear) {
  if (clear) { store.del('rc.active'); return; }
  store.set('rc.active', { wid: R.w.id, idx: R.idx, t0: R.t0, paused: R.paused, pe: R.paused ? R.pe : 0, at: Date.now() });
}
function togglePause() {
  if (R.done) { startRun(R.w); return; }
  if (R.paused) { R.paused = false; R.t0 = Date.now() - R.pe * 1000; primeAudio(); say('Seguimos', true); }
  else { R.pe = elapsed(); R.paused = true; say('Pausa', true); }
  persist(); render(); mediaSession();
}
function jump(d) {
  if (R.done) return;
  const e = elapsed();
  if (d < 0 && e > 5 && !useGps(R.steps[R.idx])) { /* reinicia el actual */ }
  else R.idx = Math.max(0, Math.min(R.steps.length - 1, R.idx + d));
  R.t0 = Date.now(); R.pe = 0; R.gd = 0; R.pre = false; R.beeped = -1;
  beep('go'); announce(); persist(); render(); mediaSession();
}
function render() {
  if (R.done) return;
  const st = R.steps[R.idx], nx = R.steps[R.idx + 1], e = elapsed();
  const gps = useGps(st), gstep = gpsStep(st);
  const frac = gstep ? distFrac(st) : Math.min(1, e / st.dur);
  const rem = gps ? Math.max(0, st.dist - R.gd) : Math.max(0, st.dur * (1 - frac));
  runEl.style.setProperty('--c', `var(--${tclass(st).slice(2).replace('mobility', 'mob')})`);
  runEl.classList.toggle('paused', R.paused);
  $('#r-sec').textContent = st.sectionName;
  $('#r-blk').textContent = st.b ? `Bloque ${st.b.block}/${st.b.blocks}` : '';
  $('#r-kind').textContent = TYPE_NAME[st.type];
  $('#r-label').textContent = st.label && st.label.toLowerCase() !== TYPE_NAME[st.type].toLowerCase() ? st.label : '';
  $('#r-clock').textContent = gps ? `${Math.round(rem)} m` : fmt(Math.ceil(rem));
  $('#r-gps').hidden = !st.dist; $('#r-gps').textContent = st.dist ? (gps ? `GPS · ${Math.round(R.gd)} de ${st.dist} m · ${fmt(e)}` : gstep ? `Buscando GPS… ${st.dist} m por tiempo estimado` : `${st.dist} m estimados a tu ritmo`) : '';
  const n = rpeMax(st.rpe);
  $('#r-rpe').hidden = !st.rpe;
  if (st.rpe) { $('#r-rpe-t').textContent = `Esfuerzo ${st.rpe.replace('-', '–')}/10`; $('#r-dots').innerHTML = Array.from({ length: 10 }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join(''); }
  $('#r-bar').style.width = (frac * 100).toFixed(1) + '%';
  $('#r-next').hidden = false;
  if (nx) { $('#r-nsw').style.setProperty('--nc', `var(--${tclass(nx).slice(2).replace('mobility', 'mob')})`); $('#r-nv').textContent = `${nx.label || TYPE_NAME[nx.type]} · ${nx.dist ? amountStr(nx) : fmt(nx.dur)}${nx.rpe ? ` · ${nx.rpe.replace('-', '–')}/10` : ''}`; }
  else { $('#r-nsw').style.setProperty('--nc', 'var(--walk)'); $('#r-nv').textContent = 'Fin del entrenamiento'; }
  const totalS = R.steps.reduce((a, s) => a + s.dur, 0);
  const doneS = R.steps.slice(0, R.idx).reduce((a, s) => a + s.dur, 0) + Math.min(st.dur, gstep ? frac * st.dur : e);
  $('#r-pos').style.left = (doneS / totalS * 100).toFixed(2) + '%';
  [...$('#r-tl').children].forEach((el, i) => el.classList.toggle('done', i < R.idx));
  const left = R.steps.length - R.idx - 1;
  $('#r-left').textContent = left ? `Quedan ${left} intervalos` : 'Último intervalo';
  $('#r-total').textContent = `${fmt(totalS - doneS)} restante`;
  $('#r-play').innerHTML = R.paused ? ICON.play : ICON.pause; $('#r-play').setAttribute('aria-label', R.paused ? 'Seguir' : 'Pausa');
  $('#r-voice').innerHTML = S.voice ? ICON.voiceOn : ICON.voiceOff;
  if (!$('#pocket').hidden) { $('#p-clock').textContent = $('#r-clock').textContent; $('#p-kind').textContent = `${TYPE_NAME[st.type]} · quedan ${left}`; }
}
function mediaSession() {
  if (!('mediaSession' in navigator)) return;
  try {
    const st = R.steps[R.idx];
    navigator.mediaSession.metadata = new MediaMetadata({ title: `${st.label || TYPE_NAME[st.type]} · ${st.dist ? amountStr(st) : fmt(st.dur)}`, artist: `${st.sectionName}${st.b ? ` · bloque ${st.b.block}/${st.b.blocks}` : ''}`, album: R.w.title });
    navigator.mediaSession.playbackState = R.paused ? 'paused' : 'playing';
    navigator.mediaSession.setActionHandler('play', () => { if (R.paused) togglePause(); });
    navigator.mediaSession.setActionHandler('pause', () => { if (!R.paused) togglePause(); });
    navigator.mediaSession.setActionHandler('nexttrack', () => jump(1));
    navigator.mediaSession.setActionHandler('previoustrack', () => jump(-1));
  } catch (e) {}
}
$('#r-play').onclick = togglePause;
$('#r-prev').onclick = () => jump(-1);
$('#r-next-btn').onclick = () => jump(1);
$('#r-voice').onclick = () => { S.voice = !S.voice; saveS(); if (!S.voice) try { speechSynthesis.cancel(); } catch (e) {} render(); toast(S.voice ? 'Voz activada' : 'Voz silenciada'); };
$('#r-stop').onclick = () => { if (R.done) { closeRun(); return; } askConfirm('¿Terminar el entrenamiento?', 'Terminar', closeRun, 'Seguir'); };
$('#r-lock').onclick = () => { $('#pocket').hidden = false; render(); };
(() => { // desbloqueo manteniendo pulsado
  const h = $('#p-hold'), ring = $('#p-ring'); let t0 = 0, raf = 0;
  const stop = () => { cancelAnimationFrame(raf); ring.style.setProperty('--p', '0%'); t0 = 0; };
  const loop = () => { const p = Math.min(1, (Date.now() - t0) / 1200); ring.style.setProperty('--p', (p * 100) + '%'); if (p >= 1) { stop(); $('#pocket').hidden = true; } else raf = requestAnimationFrame(loop); };
  h.addEventListener('pointerdown', e => { e.preventDefault(); t0 = Date.now(); loop(); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => h.addEventListener(ev, stop));
  $('#pocket').addEventListener('contextmenu', e => e.preventDefault());
})();

renderHome();
})();
