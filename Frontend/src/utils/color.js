// ---------- Color helpers ----------
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h;
  if (d === 0) h = 0;
  else if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = Math.round((h * 60 + 360) % 360);
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

// New: HSL helpers. Used for building the background and tuning the accent,
// because lightness is much easier to control there than by scaling RGB channels.
export function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return [h, s, l];
}

export function hslToRgb([h, s, l]) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb;
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return rgb.map((v) => Math.round(clamp((v + m) * 255, 0, 255)));
}

// WCAG relative luminance
export function luminance([r, g, b]) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

export function contrastRatio(rgb1, rgb2) {
  const L1 = luminance(rgb1) + 0.05;
  const L2 = luminance(rgb2) + 0.05;
  return L1 > L2 ? L1 / L2 : L2 / L1;
}

export const toHex = ([r, g, b]) =>
  '#' +
  [r, g, b]
    .map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0'))
    .join('');

// sRGB -> CIE Lab (D65). Distances in Lab match what the eye sees much better
// than distances in RGB, which is what makes clusters feel "right".
function rgbToLab([r, g, b]) {
  const lin = (v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const R = lin(r), G = lin(g), B = lin(b);
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

const labDist2 = (a, b) => {
  const dl = a[0] - b[0], da = a[1] - b[1], db = a[2] - b[2];
  return dl * dl + da * da + db * db;
};

// ---------- Image sampling ----------
// Uses an offscreen canvas, so no hidden <canvas> element is needed in the DOM.
export function samplePixels(img, maxSide = 220) {
  const { naturalWidth: w, naturalHeight: h } = img;
  if (!w || !h) return [];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const scale = Math.min(1, maxSide / Math.max(w, h));
  canvas.width = Math.max(1, Math.floor(w * scale));
  canvas.height = Math.max(1, Math.floor(h * scale));
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  // Throws a SecurityError if the image is cross-origin without CORS.
  // extractTheme catches that and falls back to DEFAULT_THEME.
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const filtered = [];
  const all = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue; // skip mostly transparent
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const px = [r, g, b];
    all.push(px);
    const avg = (r + g + b) / 3;
    if (avg > 250 || avg < 5) continue; // skip near-white / near-black
    filtered.push(px);
  }
  // Covers that are almost entirely white or black would otherwise come back
  // empty and silently fall to the default theme. Use everything instead.
  return filtered.length >= 50 ? filtered : all;
}

// ---------- Palette clustering ----------
// Same name and return shape as before: [{ rgb: [r,g,b], count }], biggest first.
// Changes: deterministic (no Math.random), clusters in Lab, works on a
// weighted color histogram (faster), and merges near-duplicate clusters.
export function kMeans(pixels, k = 5, maxIter = 12) {
  if (!pixels || pixels.length === 0) return [];

  // 1. Histogram into 5-bit-per-channel bins.
  const binMap = new Map();
  for (let i = 0; i < pixels.length; i++) {
    const [r, g, b] = pixels[i];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let bin = binMap.get(key);
    if (!bin) { bin = { sr: 0, sg: 0, sb: 0, n: 0 }; binMap.set(key, bin); }
    bin.sr += r; bin.sg += g; bin.sb += b; bin.n++;
  }
  const bins = [];
  for (const bin of binMap.values()) {
    const rgb = [bin.sr / bin.n, bin.sg / bin.n, bin.sb / bin.n];
    bins.push({ rgb, lab: rgbToLab(rgb), n: bin.n, sr: bin.sr, sg: bin.sg, sb: bin.sb });
  }
  // Sort so ties break the same way every run.
  bins.sort((a, b) => b.n - a.n);

  const kk = Math.min(k, bins.length);

  // 2. Deterministic farthest-point seeding, weighted by bin size.
  const centroids = [bins[0].lab.slice()];
  const minD = bins.map((b) => labDist2(b.lab, centroids[0]));
  while (centroids.length < kk) {
    let bestIdx = 0, bestScore = -1;
    for (let i = 0; i < bins.length; i++) {
      const score = minD[i] * bins[i].n;
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
    if (bestScore <= 0) break;
    const c = bins[bestIdx].lab.slice();
    centroids.push(c);
    for (let i = 0; i < bins.length; i++) {
      const d = labDist2(bins[i].lab, c);
      if (d < minD[i]) minD[i] = d;
    }
  }

  // 3. Weighted k-means in Lab.
  const assign = new Array(bins.length).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    for (let i = 0; i < bins.length; i++) {
      let best = 0, bestD = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const d = labDist2(bins[i].lab, centroids[c]);
        if (d < bestD) { bestD = d; best = c; }
      }
      if (assign[i] !== best) { assign[i] = best; changed = true; }
    }
    if (!changed && iter > 0) break;

    const sums = centroids.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < bins.length; i++) {
      const s = sums[assign[i]], b = bins[i];
      s[0] += b.lab[0] * b.n; s[1] += b.lab[1] * b.n; s[2] += b.lab[2] * b.n; s[3] += b.n;
    }
    for (let c = 0; c < centroids.length; c++) {
      if (sums[c][3] === 0) continue;
      centroids[c] = [sums[c][0] / sums[c][3], sums[c][1] / sums[c][3], sums[c][2] / sums[c][3]];
    }
  }

  // 4. Final colors = mean RGB of each cluster's real pixels.
  let clusters = centroids.map(() => ({ sr: 0, sg: 0, sb: 0, count: 0 }));
  for (let i = 0; i < bins.length; i++) {
    const c = clusters[assign[i]];
    c.sr += bins[i].sr; c.sg += bins[i].sg; c.sb += bins[i].sb; c.count += bins[i].n;
  }
  clusters = clusters
    .filter((c) => c.count > 0)
    .map((c) => ({ rgb: [c.sr / c.count, c.sg / c.count, c.sb / c.count], count: c.count }));

  // 5. Merge clusters that are visually near-identical (three similar browns).
  let merged = true;
  while (merged && clusters.length > 1) {
    merged = false;
    outer: for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        if (labDist2(rgbToLab(clusters[i].rgb), rgbToLab(clusters[j].rgb)) < 100) {
          const a = clusters[i], b = clusters[j], n = a.count + b.count;
          clusters[i] = {
            rgb: [0, 1, 2].map((ch) => (a.rgb[ch] * a.count + b.rgb[ch] * b.count) / n),
            count: n,
          };
          clusters.splice(j, 1);
          merged = true;
          break outer;
        }
      }
    }
  }

  return clusters
    .map((c) => ({ rgb: c.rgb.map((v) => Math.round(v)), count: c.count }))
    .sort((a, b) => b.count - a.count);
}

// ---------- Theme selection ----------
export const DEFAULT_THEME = {
  bg: [17, 19, 25],
  accent: [122, 162, 255],
  text: [255, 255, 255],
  palette: [],
};

const MIN_ACCENT_CONTRAST = 4.5;

export function chooseColors(palette) {
  if (!palette || palette.length === 0) return DEFAULT_THEME;

  const total = palette.reduce((sum, p) => sum + p.count, 0) || 1;
  const share = (p) => p.count / total;
  const sat = (p) => rgbToHsv(...p.rgb)[1];

  // ----- Background -----
  // Base hue comes from the dominant cluster, unless that cluster is near-gray
  // (white/cream/gray backgrounds) and there's a clearly colored cluster with
  // real presence. Then we take the colored one so the theme isn't just gray.
  let base = palette[0];
  if (sat(base) < 0.12) {
    const colorful = palette.find((p) => share(p) >= 0.12 && sat(p) >= 0.3);
    if (colorful) base = colorful;
  }

  // Build the bg in HSL: keep hue, tame saturation, pin lightness to a dark band.
  // Scaling RGB channels (the old approach) turned bright covers into muddy
  // grays/browns. This keeps them recognisably the same color, just deep.
  const [bh, bs, bl] = rgbToHsl(base.rgb);
  const bgS = bs < 0.08 ? bs : clamp(bs, 0.25, 0.6);
  const bgL = 0.1 + clamp(bl, 0, 1) * 0.16; // 0.10 .. 0.26
  const bg = hslToRgb([bh, bgS, bgL]);

  // ----- Accent -----
  // Score = saturation x brightness x how much of the image the cluster covers.
  // Tiny specks (<2%) are ignored unless nothing else qualifies.
  let candidates = palette.slice(0, 5).filter((p) => share(p) >= 0.02);
  if (candidates.length === 0) candidates = palette.slice(0, 1);

  let accentSrc = candidates[0], bestScore = -1;
  for (const p of candidates) {
    const [, s, v] = rgbToHsv(...p.rgb);
    const presence = 0.6 + 0.4 * Math.min(1, share(p) / 0.25);
    const score = s * (0.55 + 0.45 * v) * presence;
    if (score > bestScore) { bestScore = score; accentSrc = p; }
  }

  // Normalise in HSL so accents are punchy but not neon or washed out,
  // then lift lightness until it's readable on the background.
  let [ah, as, al] = rgbToHsl(accentSrc.rgb);
  if (as >= 0.2) as = clamp(as, 0.4, 0.95); // keep truly neutral art neutral
  al = clamp(al, 0.5, 0.78);
  let accent = hslToRgb([ah, as, al]);
  while (contrastRatio(accent, bg) < MIN_ACCENT_CONTRAST && al < 0.92) {
    al += 0.03;
    accent = hslToRgb([ah, as, al]);
  }

  // ----- Text -----
  const white = [255, 255, 255];
  const black = [10, 10, 10];
  const text = contrastRatio(bg, white) >= 4.5 ? white : black;

  return { bg, accent, text, palette: palette.map((p) => p.rgb) };
}

export function extractTheme(img) {
  try {
    if (!img || !img.complete || !img.naturalWidth) return DEFAULT_THEME;
    const pixels = samplePixels(img);
    const clusters = kMeans(pixels, 5, 12);
    return chooseColors(clusters);
  } catch (err) {
    // Tainted canvas (no CORS) or any other failure: degrade gracefully.
    console.warn('extractTheme failed, using default theme:', err);
    return DEFAULT_THEME;
  }
}

// ---------- New convenience: theme straight from a URL ----------
// Loads with CORS enabled (needed for getImageData) and caches results,
// so re-rendering the same playlist doesn't recompute.
const themeCache = new Map();

export function extractThemeFromUrl(url) {
  if (!url) return Promise.resolve(DEFAULT_THEME);
  if (themeCache.has(url)) return Promise.resolve(themeCache.get(url));
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const theme = extractTheme(img);
      themeCache.set(url, theme);
      resolve(theme);
    };
    img.onerror = () => resolve(DEFAULT_THEME);
    img.src = url;
  });
}