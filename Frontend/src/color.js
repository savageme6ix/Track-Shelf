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

// WCAG relative luminance
export function luminance([r, g, b]) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

export function contrastRatio(rgb1, rgb2) {
  const L1 = luminance(rgb1) + 0.05;
  const L2 = luminance(rgb2) + 0.05;
  return L1 > L2 ? L1 / L2 : L2 / L1;
}

export const toHex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

// ---------- Image sampling ----------
// Uses an offscreen canvas, so no hidden <canvas> element is needed in the DOM.
export function samplePixels(img, maxSide = 220) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const { naturalWidth: w, naturalHeight: h } = img;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  canvas.width = Math.max(1, Math.floor(w * scale));
  canvas.height = Math.max(1, Math.floor(h * scale));
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const pixels = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue; // skip mostly transparent
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const avg = (r + g + b) / 3;
    if (avg > 250 || avg < 5) continue; // skip near-white / near-black
    pixels.push([r, g, b]);
  }
  return pixels;
}

// ---------- Tiny k-means for palette ----------
export function kMeans(pixels, k = 5, maxIter = 12) {
  if (pixels.length === 0) return [];

  const centroids = [];
  const used = new Set();
  while (centroids.length < k && centroids.length < pixels.length) {
    const idx = Math.floor(Math.random() * pixels.length);
    if (used.has(idx)) continue;
    used.add(idx);
    centroids.push(pixels[idx].slice());
  }

  const assignments = new Array(pixels.length).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    // assign
    for (let i = 0; i < pixels.length; i++) {
      let best = 0, bestD = Infinity;
      const p = pixels[i];
      for (let c = 0; c < centroids.length; c++) {
        const cc = centroids[c];
        const dr = p[0] - cc[0], dg = p[1] - cc[1], db = p[2] - cc[2];
        const d = dr * dr + dg * dg + db * db;
        if (d < bestD) { bestD = d; best = c; }
      }
      assignments[i] = best;
    }
    // recompute
    const sums = centroids.map(() => [0, 0, 0]);
    const counts = centroids.map(() => 0);
    for (let i = 0; i < pixels.length; i++) {
      const c = assignments[i];
      const p = pixels[i];
      sums[c][0] += p[0]; sums[c][1] += p[1]; sums[c][2] += p[2];
      counts[c]++;
    }
    for (let c = 0; c < centroids.length; c++) {
      if (counts[c] === 0) continue;
      centroids[c][0] = Math.round(sums[c][0] / counts[c]);
      centroids[c][1] = Math.round(sums[c][1] / counts[c]);
      centroids[c][2] = Math.round(sums[c][2] / counts[c]);
    }
  }

  const counts = centroids.map(() => 0);
  for (let i = 0; i < assignments.length; i++) counts[assignments[i]]++;
  return centroids
    .map((rgb, i) => ({ rgb, count: counts[i] }))
    .sort((a, b) => b.count - a.count);
}

// ---------- Theme selection ----------
export const DEFAULT_THEME = {
  bg: [17, 19, 25],
  accent: [122, 162, 255],
  text: [255, 255, 255],
  palette: [],
};

export function chooseColors(palette) {
  if (!palette || palette.length === 0) return DEFAULT_THEME;

  // Dominant = most populous cluster, darkened for backgrounds
  const bg = palette[0].rgb.map((v) => Math.round(v * 0.65));

  // Accent = most saturated & bright of the top 4 clusters
  let accent = palette[0].rgb, bestScore = -1;
  for (let i = 0; i < Math.min(4, palette.length); i++) {
    const [, s, v] = rgbToHsv(...palette[i].rgb);
    const score = s * (0.6 + 0.4 * v);
    if (score > bestScore) { bestScore = score; accent = palette[i].rgb; }
  }

  // Text = white or black, whichever reads better on bg
  const white = [255, 255, 255];
  const black = [10, 10, 10];
  const text = contrastRatio(bg, white) >= 4.5 ? white : black;

  return { bg, accent, text, palette: palette.map((p) => p.rgb) };
}

export function extractTheme(img) {
  const pixels = samplePixels(img);
  const clusters = kMeans(pixels, 5, 10);
  return chooseColors(clusters);
}
