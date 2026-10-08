// GET /api/post?t=alerte&k=...&c=...&m=...  → image JPEG 1080×1080 du post, dans la DA tel_lement addict.
// Paramètres : t (alerte | piege | ecran | solution), k (kicker), p (pagination ex. 1/3), c (claim), m (mot surligné),
// s (phrase sous le claim), n1 / n2 (fausse notification, gabarit piege), items (liste séparée par |), f (texte bas droite).
const { renderJpeg } = require('../lib/render');

module.exports = async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const q = Object.fromEntries(url.searchParams.entries());
    for (const k of Object.keys(q)) q[k] = String(q[k]).slice(0, 400);
    const buf = await renderJpeg(q);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.statusCode = 200;
    res.end(Buffer.from(buf));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('erreur de rendu : ' + (e && e.message));
  }
};
