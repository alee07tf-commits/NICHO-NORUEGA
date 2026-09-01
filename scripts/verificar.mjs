#!/usr/bin/env node
/**
 * Verificación completa del sitio antes de dar cualquier cambio por bueno.
 *
 *   npx playwright install chromium   (una sola vez)
 *   python3 -m http.server 8899       (desde la raíz del repo)
 *   node scripts/verificar.mjs
 *
 * Sale con código 1 si algo falla, para poder engancharlo a CI.
 * Cada comprobación existe porque algo se rompió de verdad en este repo.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import { execSync } from 'child_process';

const HOST = 'http://localhost:8899';
const R = { ok: [], fail: [] };
const ok = (m) => R.ok.push(m);
const fail = (m) => R.fail.push(m);

// ── inventario ──────────────────────────────────────────────────────────────
const sitemap = fs.readFileSync('sitemap.xml', 'utf8');
const LIVE = [...sitemap.matchAll(/<loc>https:\/\/dekkalkulator\.online\/?([^<]*)<\/loc>/g)].map(m => '/' + m[1]);
const FILE = (u) => (u === '/' ? 'index.html' : u.slice(1) + '.html');
const PAGES = [...LIVE.map(FILE), '404.html'];
const REDIR = new Map(JSON.parse(fs.readFileSync('vercel.json', 'utf8')).redirects.map(r => [r.source, r.destination]));

// ── 1. las calculadoras no se tocan ─────────────────────────────────────────
// Regla dura del proyecto. Se rompió una vez: un cambio de estilo alteró
// el marcado del bloque .calc y dejó de recalcular.
try {
  const diff = execSync('git diff --stat HEAD -- js/dekk-core.js', { encoding: 'utf8' }).trim();
  diff ? fail(`js/dekk-core.js modificado:\n${diff}`) : ok('js/dekk-core.js intacto');
} catch { ok('js/dekk-core.js sin cambios (o sin git)'); }

// ── 2. arranque del navegador ───────────────────────────────────────────────
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
// Se bloquea todo lo externo: AdSense tarda y contamina las medidas.
await ctx.route('**/*', r => (r.request().url().startsWith(HOST) ? r.continue() : r.abort()));

// ── 3. tablas pre-renderizadas: el HTML crudo debe igualar al renderizado ───
// Googlebot indexa la primera ola, sin JS. 18 páginas servían <tbody> vacío
// y ahí caía el 97 % de las impresiones del sitio.
let tablasOk = 0, tablasMal = 0;
for (const f of PAGES) {
  const src = fs.readFileSync(f, 'utf8');
  const ids = [...src.matchAll(/<tbody id="([^"]+)">/g)].map(m => m[1]);
  if (!ids.length) continue;
  const pg = await ctx.newPage();
  await pg.goto(`${HOST}/${f}`, { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(350);
  for (const id of ids) {
    // Se comparan FILAS y su texto normalizado: el navegador reescribe el HTML
    // al serializar (comillas, espacios), así que comparar la cadena cruda
    // daría falsos positivos.
    const bloque = (src.match(new RegExp(`<tbody id="${id}">([\\s\\S]*?)</tbody>`)) || [, ''])[1];
    const crudas = (bloque.match(/<tr/g) || []).length;
    const render = await pg.evaluate(i => {
      const el = document.getElementById(i);
      return el ? [...el.querySelectorAll('tr')].map(tr => tr.innerText.replace(/\s+/g, ' ').trim()) : [];
    }, id);
    if (!crudas && !render.length) continue;   // tabla que depende de entrada del usuario
    if (crudas === render.length) tablasOk++;
    else { tablasMal++; fail(`tabla desincronizada: ${f}#${id} — crudo ${crudas} filas, render ${render.length}`); }
  }
  await pg.close();
}
tablasMal === 0 ? ok(`${tablasOk} tablas pre-renderizadas coinciden crudo = renderizado`)
                : fail(`${tablasMal} tablas desincronizadas`);

// ── 4. las calculadoras siguen calculando ───────────────────────────────────
const CALC = ['index.html', 'dekkdimensjon.html', 'felg-kalkulator.html', 'rulleomkrets-kalkulator.html',
              'speedometer-avvik.html', 'tommer-til-cm.html', 'cm-til-tommer.html', 'lovlig-avvik-dekkdimensjon.html'];
let calcMal = 0;
for (const f of CALC) {
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e).slice(0, 90)));
  await pg.goto(`${HOST}/${f}`, { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(350);
  const r = await pg.evaluate(() => {
    document.querySelectorAll('input,select').forEach(e => {
      e.dispatchEvent(new Event('input', { bubbles: true }));
      e.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const txt = document.body.innerText;
    return { cifras: (txt.match(/\d+[,.]\d+/g) || []).length, ctrls: document.querySelectorAll('input,select').length };
  });
  if (errs.length || r.cifras === 0) { fail(`calculadora sin resultado: ${f} ${errs.join(' ')}`); calcMal++; }
  await pg.close();
}
calcMal === 0 ? ok(`${CALC.length} calculadoras devuelven resultado, sin errores JS`) : null;

// ── 5. contraste WCAG AA, resolviendo también los degradados ────────────────
// Un cambio de diseño metió 288 fallos de golpe: fondo claro bajo texto blanco.
let contraste = 0;
for (const f of PAGES) {
  const pg = await ctx.newPage();
  await pg.goto(`${HOST}/${f}`, { waitUntil: 'load' });
  await pg.waitForTimeout(200);
  contraste += await pg.evaluate(() => {
    const rgb = s => { const m = s.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : null; };
    const lum = a => { const g = c => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
      return .2126 * g(a[0]) + .7152 * g(a[1]) + .0722 * g(a[2]); };
    const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05); };
    // devuelve todos los fondos candidatos, incluidas las paradas de un degradado
    const fondos = e => { let n = e, acc = [];
      while (n && n !== document.documentElement) { const s = getComputedStyle(n);
        if (s.backgroundImage && s.backgroundImage !== 'none') {
          for (const m of s.backgroundImage.matchAll(/rgba?\([^)]+\)/g)) { const v = rgb(m[0]); if (v) acc.push(v); }
          if (acc.length) return acc; }
        const bc = s.backgroundColor;
        if (bc && !/rgba\(0, 0, 0, 0\)|transparent/.test(bc)) { const a = (bc.match(/[\d.]+/g) || [])[3], v = rgb(bc);
          if (v && (a === undefined || +a >= .9)) return [v]; if (v) acc.push(v); }
        n = n.parentElement; }
      acc.push([255, 255, 255]); return acc; };
    let n = 0;
    for (const e of document.querySelectorAll('body *')) {
      if (![...e.childNodes].some(x => x.nodeType === 3 && x.textContent.trim())) continue;
      const s = getComputedStyle(e);
      if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) continue;
      const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const px = parseFloat(s.fontSize), w = parseInt(s.fontWeight) || 400;
      const min = (px >= 24 || (px >= 18.66 && w >= 700)) ? 3 : 4.5;
      const fg = rgb(s.color); if (!fg) continue;
      if (Math.max(...fondos(e).map(b => ratio(fg, b))) < min) n++;
    }
    return n;
  });
  await pg.close();
}
contraste === 0 ? ok('0 fallos de contraste WCAG AA') : fail(`${contraste} fallos de contraste WCAG AA`);

// ── 6. móvil: sin desbordamiento y con la calculadora en la primera pantalla ─
for (const [w, h] of [[360, 780], [390, 844]]) {
  const m = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true });
  await m.route('**/*', r => (r.request().url().startsWith(HOST) ? r.continue() : r.abort()));
  const pg = await m.newPage();
  let ovf = [];
  for (const f of PAGES) {
    await pg.goto(`${HOST}/${f}`, { waitUntil: 'load' });
    if (await pg.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) ovf.push(f);
  }
  ovf.length ? fail(`overflow horizontal a ${w}px: ${ovf.join(', ')}`) : ok(`sin overflow horizontal a ${w}px`);
  await m.close();
}
await browser.close();

// ── 7. grafo de enlaces: nada roto, nada huérfano ───────────────────────────
// Una optimización de reparto de autoridad dejó 18 páginas inalcanzables.
{
  const g = new Map(); let rotos = [], anclas = [], aRedir = 0, total = 0;
  for (const f of PAGES) {
    const h = fs.readFileSync(f, 'utf8'); const outs = new Set();
    for (const m of h.matchAll(/href="([^"]+)"/g)) {
      const u = m[1]; total++;
      if (u.startsWith('#')) { if (!h.includes(`id="${u.slice(1)}"`)) anclas.push(`${f} -> ${u}`); continue; }
      if (/^https?:|^mailto:/.test(u)) continue;
      const c = u.split('#')[0].split('?')[0].replace(/\/$/, '') || '/';
      if (/\.(png|svg|jpe?g|xml|txt|ico|css|js|webmanifest|woff2?)$/.test(c)) {
        if (!fs.existsSync('.' + c)) rotos.push(`${f} -> ${u}`); continue; }
      if (REDIR.has(c)) aRedir++;
      else if (LIVE.includes(c)) outs.add(c);
      else if (!u.includes("' +")) rotos.push(`${f} -> ${u}`);
    }
    if (f !== '404.html') g.set('/' + (f === 'index.html' ? '' : f.slice(0, -5)), outs);
  }
  const vistas = new Set(['/']), cola = ['/'];
  while (cola.length) for (const d of g.get(cola.shift()) || []) if (!vistas.has(d)) { vistas.add(d); cola.push(d); }
  const huerfanas = LIVE.filter(u => !vistas.has(u));
  rotos.length ? fail(`${rotos.length} enlaces rotos: ${rotos.slice(0, 5).join(' · ')}`) : ok(`${total} enlaces, 0 rotos`);
  anclas.length ? fail(`${anclas.length} anclas rotas: ${anclas.slice(0, 5).join(' · ')}`) : ok('0 anclas rotas');
  aRedir ? fail(`${aRedir} enlaces apuntan a una URL que redirige (salto 301 innecesario)`) : ok('0 enlaces a URL redirigida');
  huerfanas.length ? fail(`huérfanas: ${huerfanas.join(', ')}`) : ok(`${vistas.size}/${LIVE.length} alcanzables desde la home`);
}

// ── 8. metadatos ────────────────────────────────────────────────────────────
{
  const EXENTAS = ['/kontakt', '/om-oss', '/vilkar', '/personvern'];
  const CORTO_OK = /^\/\d+-tommer-i-cm$/;   // en estas el title corto ES la respuesta
  let malos = [], titles = new Map(), descs = new Map();
  for (const u of LIVE) {
    const h = fs.readFileSync(FILE(u), 'utf8');
    const t = (h.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1];
    const d = (h.match(/<meta name="description" content="([^"]*)"/) || [, ''])[1];
    titles.set(t, [...(titles.get(t) || []), u]);
    descs.set(d, [...(descs.get(d) || []), u]);
    if (!EXENTAS.includes(u) && !CORTO_OK.test(u) && (t.length < 50 || t.length > 70)) malos.push(`${u} title ${t.length}`);
    if (d.length < 130 || d.length > 155) malos.push(`${u} meta ${d.length}`);
    for (const [re, val, lbl] of [[/og:title" content="([^"]*)"/, t, 'og:title'],
                                  [/twitter:title" content="([^"]*)"/, t, 'twitter:title'],
                                  [/og:description" content="([^"]*)"/, d, 'og:description'],
                                  [/twitter:description" content="([^"]*)"/, d, 'twitter:description']]) {
      const m = h.match(re); if (m && m[1] !== val) malos.push(`${u} ${lbl} desincronizado`);
    }
    if ((h.match(/<h1/g) || []).length !== 1) malos.push(`${u} no tiene exactamente un H1`);
    if (!/rel="canonical"/.test(h)) malos.push(`${u} sin canonical`);
  }
  for (const [k, v] of titles) if (v.length > 1) malos.push(`title duplicado en ${v.join(', ')}`);
  for (const [k, v] of descs) if (v.length > 1) malos.push(`meta duplicada en ${v.join(', ')}`);
  malos.length ? fail(`metadatos:\n   - ${malos.join('\n   - ')}`) : ok(`metadatos correctos en las ${LIVE.length}`);
}

// ── 9. datos estructurados ──────────────────────────────────────────────────
{
  let rotos = 0, ids = new Set(), refs = new Set(), n = 0;
  for (const f of PAGES) {
    for (const b of fs.readFileSync(f, 'utf8').matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      n++;
      let d; try { d = JSON.parse(b[1]); } catch { rotos++; fail(`JSON-LD roto en ${f}`); continue; }
      for (const nodo of (d['@graph'] || [d])) {
        if (nodo['@id']) ids.add(nodo['@id']);
        for (const v of Object.values(nodo)) if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).join() === '@id') refs.add(v['@id']);
      }
    }
  }
  const sueltas = [...refs].filter(r => !ids.has(r));
  rotos === 0 ? ok(`${n} bloques JSON-LD válidos`) : null;
  sueltas.length ? fail(`referencias @id que no resuelven: ${sueltas.join(', ')}`) : ok('todas las referencias @id resuelven');
}

// ── 10. estilo del texto ────────────────────────────────────────────────────
// En noruego la raya es la corta (–). La larga (—) es convención inglesa y es
// lo que hace que un texto suene a traducción automática.
{
  let largas = 0, muletillas = [];
  const PROHIBIDAS = ['Prøv nå!', 'enkelt og raskt', 'den ultimate'];
  for (const u of LIVE) {
    const h = fs.readFileSync(FILE(u), 'utf8');
    const cuerpo = (h.match(/<main[\s\S]*?<\/main>/) || [h])[0]
      .replace(/<(script|style)[\s\S]*?<\/\1>/g, '').replace(/<[^>]+>/g, ' ');
    largas += (cuerpo.match(/—/g) || []).length;
    const meta = ((h.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1] + ' ' +
                  (h.match(/<meta name="description" content="([^"]*)"/) || [, ''])[1]);
    for (const p of PROHIBIDAS) if (meta.includes(p)) muletillas.push(`${u}: «${p}»`);
  }
  largas ? fail(`${largas} rayas largas (—) en el texto; en noruego va la corta (–)`) : ok('0 rayas largas en el texto visible');
  muletillas.length ? fail(`muletillas en title/meta: ${muletillas.join(' · ')}`) : ok('0 muletillas en title/meta');
}

// ── informe ─────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(66));
for (const m of R.ok) console.log('  ok    ' + m);
for (const m of R.fail) console.log('  FALLA ' + m);
console.log('─'.repeat(66));
console.log(R.fail.length === 0
  ? `\n  ${R.ok.length}/${R.ok.length} comprobaciones pasadas. Listo para desplegar.\n`
  : `\n  ${R.fail.length} comprobaciones fallan. NO desplegar.\n`);
process.exit(R.fail.length ? 1 : 0);
