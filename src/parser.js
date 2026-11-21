/* Parser de mensajes del entrenador -> estructura de intervalos (reglas, sin API) */
const RC = (() => {
  const strip = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const cleanLine = l => l.replace(/\\(.)/g, '$1')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/ /g, ' ').trim();
  const isBullet = l => /^\s*[•●▪◦*]/.test(l);
  const stripBullet = l => l.replace(/^[\s•●▪◦*\-–—]+/, '').replace(/^\d+\s*[.)](?!\d)\s*/, '').replace(/^[\s•\-–—]+/, '').trim();

  const QRE = /(\d{1,2}):(\d{2})\s*(?:min(?:uto)?s?(?![a-zñ])|')?|(\d+(?:[.,]\d+)?)\s*(?:minutos?|mins?|')(?![a-zñáéíóú])(?:\s*(?:y\s*)?(\d+)\s*(?:segundos?|segs?|s|")(?![a-zñ]))?|(\d+)\s*(?:segundos?|segs?|")(?![a-zñ])|(\d+(?:[.,]\d+)?)\s*(km|kil[oó]metros?|metros?|mts?|m)(?![a-zñáéíóú])/gi;
  function findQty(text) {
    const out = []; QRE.lastIndex = 0; let m;
    while ((m = QRE.exec(text))) {
      const q = { i: m.index, end: m.index + m[0].length };
      if (m[1] !== undefined) q.dur = (+m[1]) * 60 + (+m[2]);
      else if (m[3] !== undefined) q.dur = Math.round(parseFloat(m[3].replace(',', '.')) * 60) + (m[4] ? +m[4] : 0);
      else if (m[5] !== undefined) q.dur = +m[5];
      else { const v = parseFloat(m[6].replace(',', '.')); q.dist = /^k/i.test(m[7]) ? Math.round(v * 1000) : Math.round(v); }
      out.push(q);
    }
    return out;
  }
  function rpeOf(s) {
    let m = s.match(/(\d+(?:[.,]\d)?)(?:\s*(?:-|–|a)\s*(\d+))?\s*(?:sobre|\/)\s*10/i);
    if (m) return m[2] ? m[1] + '-' + m[2] : m[1];
    m = s.match(/rpe\s*(\d+(?:\s*-\s*\d+)?)/i);
    return m ? m[1].replace(/\s/g, '') : '';
  }
  const TYPE_RE = [['mobility', /movilidad|estiramiento|articular/], ['run', /trot|carrera|corr(?:er|iendo|e\b)|rodaje/], ['walk', /camin|andar|andando|paseo/]];
  const DEFAULT_LABEL = { run: 'Trote', walk: 'Caminata', mobility: 'Movilidad' };
  function typeOf(seg, fallback) {
    const s = strip(seg); let best = null;
    for (const [t, re] of TYPE_RE) { const m = s.match(re); if (m && (best === null || m.index < best.i)) best = { t, i: m.index }; }
    return best || { t: fallback, i: -1 };
  }
  function labelFrom(seg, idx, type) {
    if (idx < 0) return DEFAULT_LABEL[type];
    let t = seg.slice(idx);
    const stop = t.search(/[:.(,;!]|\s(?:para|hasta|durante|que|con|sin|pero|y\s+\d)\s|\s\d/i);
    if (stop > 0) t = t.slice(0, stop);
    t = t.trim().split(/\s+/).slice(0, 5).join(' ').replace(/\s+(de|a|y|el|la|en)$/i, '');
    if (t.length < 3) return DEFAULT_LABEL[type];
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function makeInterval(seg, q, fallback) {
    const ty = typeOf(seg, fallback);
    const it = { kind: 'int', type: ty.t, label: labelFrom(seg, ty.i, ty.t), rpe: rpeOf(seg) };
    if (q.dist) it.dist = q.dist; else it.dur = q.dur;
    return it;
  }
  function intervalsFromText(text, fallback) {
    const res = [];
    let ci = -1;
    for (const clause of text.split(/\s*\+\s*|;\s+|\.\s+/)) {
      if (!clause.trim()) continue;
      ci++;
      let qs = findQty(clause);
      // una frase secundaria sin tipo de ejercicio es un comentario ("Aumentamos a 2 minutos")
      if (ci > 0 && qs.length && typeOf(clause, fallback).i < 0) qs = [];
      if (!qs.length) { const last = res[res.length - 1]; if (last && !last.rpe) last.rpe = rpeOf(clause); continue; }
      qs.forEach((q, k) => {
        const seg = clause.slice(k === 0 ? 0 : q.i, k + 1 < qs.length ? qs[k + 1].i : clause.length);
        if (k > 0 && typeOf(seg, fallback).i < 0) { const last = res[res.length - 1]; if (last && !last.rpe) last.rpe = rpeOf(seg); return; }
        res.push(makeInterval(seg, q, fallback));
      });
    }
    return res;
  }
  const SECT = { warmup: 'Calentamiento', main: 'Bloque principal', cooldown: 'Vuelta a la calma' };
  const FALLBACK = { warmup: 'walk', main: 'run', cooldown: 'walk' };
  function sectionOf(t) {
    const s = strip(t).slice(0, 40);
    if (/^calentamiento/.test(s)) return 'warmup';
    if (/^(bloque|parte)\s+principal/.test(s)) return 'main';
    if (/^(vuelta a la calma|enfriamiento)/.test(s)) return 'cooldown';
    return null;
  }
  const REPS_RE = /(?:de\s+)?(\d+)(?:\s*(?:a|-|o)\s*(\d+))?\s+(?:bloques|series|rondas|repeticiones|veces)\b/i;

  function itemSeconds(it, S) {
    if (it.kind === 'group') return it.reps * it.items.reduce((a, x) => a + itemSeconds(x, S), 0);
    if (it.dist) return Math.round(it.dist / 1000 * (it.type === 'run' ? S.paceRun : S.paceWalk));
    return it.dur || 0;
  }
  const secSeconds = (sec, S) => sec.items.reduce((a, x) => a + itemSeconds(x, S), 0);
  const hasDist = it => it.kind === 'group' ? it.items.some(hasDist) : !!it.dist;

  function niceTitle(t) {
    t = t.replace(/^\[[^\]]*\]\s*/, '').replace(/sesi[óo]n\s*/i, '').replace(/\((?:aprox\.?\s*)?[\d\s-]+min[^)]*\)/i, '')
      .replace(/^[\s:·\-–]+|[\s:·\-–]+$/g, '').replace(/\s{2,}/g, ' ');
    t = t.split(' ').map(w => (w.length > 1 && w === w.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(w)) ? w.toLowerCase() : w).join(' ');
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
  }
  function parseDate(l) {
    const m = l.match(/^\s*\[(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!m) return null;
    let y = +m[3]; if (y < 100) y += 2000;
    return new Date(y, +m[1] - 1, +m[2]).getTime();
  }
  const fmtMin = s => { s = Math.round(s); const m = Math.floor(s / 60), r = s % 60; return r ? `${m}:${String(r).padStart(2, '0')} min` : `${m} min`; };

  function parseSession(lines, S) {
    const w = { title: '', date: null, declared: null, declaredText: '', sections: [], warnings: [], source: lines.join('\n').trim() };
    let sec = null, group = null;
    const closeGroup = () => {
      if (!group) return;
      if (group.items.length) sec.items.push(group);
      else w.warnings.push(`Había ${group.reps} bloques pero no encontré qué hacer en cada uno. Añádelo a mano.`);
      group = null;
    };
    for (const raw0 of lines) {
      const raw = raw0.replace(/\\(.)/g, '$1');
      let line = cleanLine(raw);
      if (!line) continue;
      if (w.date === null) { const d = parseDate(line); if (d) w.date = d; }
      const body = stripBullet(line);
      const kind = sectionOf(body);
      if (kind) {
        if (sec) { closeGroup(); w.sections.push(sec); }
        sec = { kind, name: SECT[kind], items: [], declared: null };
        const p = body.match(/\(([^)]*)\)/);
        if (p) { const q = findQty(p[1]).find(x => x.dur); if (q) sec.declared = q.dur; }
        const from = p ? body.indexOf(p[0]) + p[0].length : 0;
        const ci = body.indexOf(':', from);
        sec.rest = ci >= 0 ? body.slice(ci + 1).trim() : '';
        if (sec.rest) line = sec.rest; else continue;
      } else if (!sec) {
        if (!w.title && /sesi[óo]n\b/i.test(line)) w.title = niceTitle(line);
        const t = line.match(/(\d+)(?:\s*-\s*(\d+))?\s*min/i);
        if (t && /total|aprox|\(/i.test(line)) { w.declared = +t[1] * 60; w.declaredText = t[2] ? `${t[1]}-${t[2]} min` : `${t[1]} min`; }
        continue;
      }
      const text = sec.rest === line ? line : stripBullet(line);
      const reps = sec.kind === 'main' ? text.match(REPS_RE) : null;
      if (reps) {
        closeGroup();
        group = { kind: 'group', reps: +reps[1], items: [], declared: null };
        if (reps[2]) w.warnings.push(`El entrenador dice de ${reps[1]} a ${reps[2]} bloques. He puesto ${reps[1]}; súbelo en el editor si te ves bien.`);
        const before = findQty(text.slice(0, reps.index)).find(q => q.dur);
        if (before) group.declared = before.dur;
        const after = text.slice(reps.index + reps[0].length);
        intervalsFromText(after, FALLBACK.main).forEach(x => group.items.push(x));
        continue;
      }
      const ivs = intervalsFromText(text, FALLBACK[sec.kind]);
      if (!ivs.length) continue;
      if (group && isBullet(raw) && group.items.length) closeGroup();
      for (const iv of ivs) {
        if (group) {
          group.items.push(iv);
          if (group.declared && itemSeconds(group, S) >= group.declared - 1) closeGroup();
        } else sec.items.push(iv);
      }
    }
    if (sec) { closeGroup(); w.sections.push(sec); }
    // secciones sin intervalos pero con duración declarada
    for (const s of w.sections) {
      if (!s.items.length && s.declared) {
        const ty = typeOf(s.rest || '', FALLBACK[s.kind]);
        let label = s.rest ? labelFrom(s.rest, ty.i, ty.t) : '';
        if (!s.rest || ty.i < 0) label = s.kind === 'cooldown' ? 'Caminata muy suave' : DEFAULT_LABEL[ty.t];
        s.items.push({ kind: 'int', type: ty.t, label, rpe: rpeOf(s.rest || ''), dur: s.declared });
      }
      delete s.rest;
    }
    // comprobaciones
    let anyDist = false;
    for (const s of w.sections) {
      const calc = secSeconds(s, S), d = s.items.some(hasDist);
      anyDist = anyDist || d;
      if (s.declared && !d && Math.abs(calc - s.declared) > 30) {
        const g = s.items.find(x => x.kind === 'group');
        const how = g ? ` (${g.reps} × ${fmtMin(itemSeconds({ ...g, reps: 1 }, S))})` : '';
        w.warnings.push(`${s.name}: el mensaje dice ${fmtMin(s.declared)}, pero los intervalos suman ${fmtMin(calc)}${how}. He respetado los intervalos.`);
      }
    }
    if (anyDist) w.warnings.push('Hay intervalos por distancia. Los convierto a tiempo estimado con tus ritmos (ajustes). Si tu móvil lo permite, puedes activar el GPS para medir los metros de verdad.');
    const total = w.sections.reduce((a, s) => a + secSeconds(s, S), 0);
    if (w.declared && !anyDist && Math.abs(total - w.declared) > 60) w.warnings.push(`El total del mensaje es ${w.declaredText}, pero la sesión suma ${fmtMin(total)}.`);
    if (!w.sections.length || !total) w.warnings.unshift('No he reconocido bien el formato. Revisa los intervalos o añádelos a mano.');
    if (!w.title) w.title = 'Sesión';
    return w;
  }

  function parse(text, S) {
    const lines = text.replace(/\r/g, '').split('\n');
    const chunks = []; let cur = [];
    const hasSection = arr => arr.some(l => sectionOf(stripBullet(cleanLine(l))));
    for (const l of lines) {
      const startsNew = /^\s*\\?\[\d{1,2}\/\d{1,2}\/\d{2,4}/.test(l) || (/^[^a-zA-Z0-9]*sesi[óo]n\b/i.test(cleanLine(l)) && hasSection(cur));
      if (startsNew && cur.some(x => x.trim())) { chunks.push(cur); cur = []; }
      cur.push(l);
    }
    if (cur.some(x => x.trim())) chunks.push(cur);
    let sessions = chunks.map(c => parseSession(c, S));
    // sin cabeceras de sección: tratar todo como bloque principal
    sessions = sessions.map((w, i) => {
      if (w.sections.length) return w;
      const alt = parseSession(['Bloque principal:', ...chunks[i]], S);
      alt.title = w.title || 'Sesión';
      return alt;
    }).filter(w => w.sections.some(s => s.items.length) || sessions.length === 1);
    return sessions;
  }
  return { parse, itemSeconds, secSeconds, findQty, rpeOf, typeOf, labelFrom };
})();
if (typeof module !== 'undefined') module.exports = RC;
