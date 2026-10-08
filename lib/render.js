// tel_lement addict — générateur de posts Instagram (1080×1080, JPEG) dans la DA.
// Utilisé par /api/post. Aucun service externe : satori (HTML→SVG), resvg (SVG→pixels), jpeg-js (pixels→JPEG).
const fs = require('fs');
const path = require('path');
const satori = require('satori').default;
const { Resvg } = require('@resvg/resvg-js');
const jpeg = require('jpeg-js');

const C = {
  nuit: '#0e0e10', raised: '#1a1a1e', papier: '#f2efe8', muted: '#a3a09a', line: '#2e2e34',
  notif: '#ff4a1c', acide: '#d4ff3a', calme: '#2f6b57',
};

let FONTS;
function fonts() {
  if (FONTS) return FONTS;
  const dir = path.join(__dirname, '..', 'fonts');
  const f = (file, name, weight) => ({ name, weight, style: 'normal', data: fs.readFileSync(path.join(dir, file)) });
  FONTS = [
    f('Archivo-400.ttf', 'Archivo', 400), f('Archivo-700.ttf', 'Archivo', 700),
    f('Archivo-800.ttf', 'Archivo', 800), f('Archivo-900.ttf', 'Archivo', 900),
    f('IBMPlexMono-400.ttf', 'Plex', 400), f('IBMPlexMono-600.ttf', 'Plex', 600),
  ];
  return FONTS;
}

// petit constructeur d'éléments pour satori
function h(type, style, ...children) {
  const kids = children.flat().filter((c) => c !== null && c !== undefined && c !== false);
  return { type, props: { style: style || {}, children: kids.length === 1 ? kids[0] : kids } };
}

const PAD = 68;
const W = 1080;
const INNER = W - PAD * 2;

// Choisit la plus grande taille de claim qui tient dans la hauteur donnée.
function fitSize(text, maxH, sizes, width = INNER) {
  for (const s of sizes) {
    const perLine = Math.max(1, Math.floor(width / (s * 0.56)));
    const words = text.split(/\s+/);
    let lines = 1, cur = 0;
    for (const w of words) {
      const len = w.length + 1;
      if (cur + len > perLine && cur > 0) { lines++; cur = len; } else cur += len;
    }
    if (lines * s * 0.95 <= maxH) return s;
  }
  return sizes[sizes.length - 1];
}

// Claim : mots en flex-wrap, le(s) mot(s) de `mark` surlignés, underscore final.
function claim(text, mark, size, colors) {
  const words = text.split(/\s+/).filter(Boolean);
  const markWords = (mark || '').toLowerCase().split(/\s+/).filter(Boolean);
  // repère la séquence surlignée
  let start = -1;
  if (markWords.length) {
    const norm = (w) => w.toLowerCase().replace(/[.,!?;:…«»"]/g, '');
    for (let i = 0; i <= words.length - markWords.length; i++) {
      if (markWords.every((m, j) => norm(words[i + j]) === m.replace(/[.,!?;:…«»"]/g, ''))) { start = i; break; }
    }
  }
  // regroupe les mots surlignés en un seul bloc (un surlignage continu)
  const groups = [];
  words.forEach((w, i) => {
    const inMark = start >= 0 && i >= start && i < start + markWords.length;
    if (inMark && i > start) groups[groups.length - 1].text += ' ' + w;
    else groups.push({ text: w, mark: inMark });
  });
  const items = groups.map((g, i) => h('span', {
    fontSize: size, fontWeight: 900, letterSpacing: -0.045 * size, lineHeight: 0.95,
    color: g.mark ? colors.markFg : colors.fg,
    backgroundColor: g.mark ? colors.markBg : 'transparent',
    padding: g.mark ? `0 ${Math.round(size * 0.07)}px` : 0,
    marginRight: i === groups.length - 1 ? 0 : Math.round(size * 0.24),
    marginBottom: Math.round(size * 0.04),
  }, g.text));
  items.push(h('span', { width: Math.round(size * 0.42), height: Math.round(size * 0.12), backgroundColor: colors.us, marginLeft: Math.round(size * 0.05), marginBottom: Math.round(size * 0.12), alignSelf: 'flex-end' }));
  return h('div', { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', width: INNER }, items);
}

function kicker(left, right, color) {
  return h('div', { display: 'flex', justifyContent: 'space-between', width: INNER, fontFamily: 'Plex', fontSize: 28, letterSpacing: 1.7, textTransform: 'uppercase', color },
    h('span', {}, left || ''), h('span', {}, right || ''));
}

function footer(fg, us, bandBg, bandFg, right) {
  return h('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: INNER, borderTop: `4px solid ${fg}`, paddingTop: 22, marginTop: 40 },
    h('div', { display: 'flex', alignItems: 'flex-end', fontWeight: 900, fontSize: 36, letterSpacing: -1, color: fg },
      h('span', {}, 'tel'),
      h('span', { width: 18, height: 5, backgroundColor: us, margin: '0 1px 6px 2px' }),
      h('span', {}, 'lement'),
      h('span', { marginLeft: 8, backgroundColor: bandBg, color: bandFg, padding: '1px 4px 4px' }, 'addict')),
    h('span', { fontFamily: 'Plex', fontWeight: 600, fontSize: 28, color: fg }, right || '@tel_lement_addict'));
}

function frame(bg, fg, children) {
  return h('div', { width: W, height: W, display: 'flex', flexDirection: 'column', padding: PAD, backgroundColor: bg, color: fg, fontFamily: 'Archivo' }, children);
}

function sub(text, color, size = 36) {
  if (!text) return null;
  return h('div', { display: 'flex', marginTop: 32, fontSize: size, fontWeight: 700, lineHeight: 1.2, color, width: INNER - 120 }, text);
}

function notifCard(title, body) {
  return h('div', { display: 'flex', flexDirection: 'column', width: 720, marginTop: 44, backgroundColor: C.nuit, color: C.papier, borderRadius: 38, padding: '26px 32px 30px', transform: 'rotate(-3deg)', boxShadow: '0 18px 40px rgba(14,14,16,0.25)' },
    h('div', { display: 'flex', alignItems: 'center', fontFamily: 'Plex', fontSize: 22, letterSpacing: 1.3, color: C.muted, textTransform: 'uppercase' },
      h('span', { width: 14, height: 14, borderRadius: 7, backgroundColor: C.notif, marginRight: 12 }),
      h('span', {}, 'algorithme'), h('span', { marginLeft: 'auto' }, 'maintenant')),
    h('div', { display: 'flex', marginTop: 12, fontSize: 30, fontWeight: 700, lineHeight: 1.2 }, title || ''),
    body ? h('div', { display: 'flex', marginTop: 4, fontSize: 24, color: C.muted }, body) : null);
}

function list(items, numColor, textColor, lineColor, size = 34) {
  if (!items || !items.length) return null;
  return h('div', { display: 'flex', flexDirection: 'column', width: INNER, borderTop: `2px solid ${lineColor}` },
    items.map((it, i) => h('div', { display: 'flex', alignItems: 'flex-start', padding: '20px 0', borderBottom: `2px solid ${lineColor}` },
      h('span', { fontFamily: 'Plex', fontWeight: 600, fontSize: 26, color: numColor, width: 64, marginTop: 6 }, String(i + 1).padStart(2, '0')),
      h('span', { display: 'flex', fontSize: size, fontWeight: 800, letterSpacing: -0.6, lineHeight: 1.15, color: textColor, width: INNER - 64 }, it))));
}

// ---- gabarits ----
function build(p) {
  const t = p.t || 'alerte';
  const items = (p.items || '').split('|').map((s) => s.trim()).filter(Boolean);
  const right = p.f;
  if (t === 'alerte') { // rouge-notif : le constat
    const size = fitSize(p.c, 470, [140, 128, 116, 104, 96, 88, 80, 72]);
    return frame(C.notif, C.nuit, [
      kicker(p.k, p.p, C.nuit),
      h('div', { display: 'flex', flexGrow: 1 }),
      claim(p.c, p.m, size, { fg: C.nuit, markBg: C.acide, markFg: C.nuit, us: C.nuit }),
      sub(p.s, C.nuit),
      footer(C.nuit, C.nuit, C.acide, C.nuit, right),
    ]);
  }
  if (t === 'piege') { // jaune-acide : la voix de l'algorithme
    const size = fitSize(p.c, 380, [128, 116, 104, 96, 88, 80, 72]);
    return frame(C.acide, C.nuit, [
      kicker(p.k, p.p, C.nuit),
      p.n1 ? notifCard(p.n1, p.n2) : null,
      h('div', { display: 'flex', flexGrow: 1 }),
      claim(p.c, p.m, size, { fg: C.nuit, markBg: C.nuit, markFg: C.acide, us: C.notif }),
      footer(C.nuit, C.notif, C.nuit, C.acide, right),
    ]);
  }
  if (t === 'ecran') { // nuit : explication
    const size = fitSize(p.c, items.length ? 300 : 470, [132, 120, 108, 96, 88, 80, 72, 64]);
    return frame(C.nuit, C.papier, [
      kicker(p.k, p.p, C.muted),
      items.length ? h('div', { display: 'flex', marginTop: 48 }, list(items, C.acide, C.papier, C.line, 34)) : null,
      h('div', { display: 'flex', flexGrow: 1 }),
      claim(p.c, p.m, size, { fg: C.papier, markBg: C.acide, markFg: C.nuit, us: C.notif }),
      sub(p.s, C.muted, 32),
      footer(C.papier, C.notif, C.acide, C.nuit, right),
    ]);
  }
  // solution : vert hors-ligne
  const size = fitSize(p.c, items.length ? 300 : 470, [140, 128, 120, 110, 100, 92, 84, 76, 68]);
  return frame(C.calme, C.papier, [
    kicker(p.k, p.p, C.papier),
    h('div', { display: 'flex', marginTop: 44 }, claim(p.c, p.m, size, { fg: C.papier, markBg: C.acide, markFg: C.nuit, us: C.acide })),
    h('div', { display: 'flex', flexGrow: 1 }),
    list(items, C.acide, C.papier, 'rgba(242,239,232,0.35)', 34),
    sub(p.s, C.papier, 32),
    footer(C.papier, C.notif, C.acide, C.nuit, right),
  ]);
}

async function renderJpeg(params, quality = 90) {
  const p = { ...params };
  if (!p.c) p.c = 'ne laissez pas l\'algo scroller votre vie';
  const svg = await satori(build(p), { width: W, height: W, fonts: fonts() });
  const img = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render();
  const raw = { data: img.pixels, width: img.width, height: img.height };
  return jpeg.encode(raw, quality).data;
}

module.exports = { renderJpeg };
