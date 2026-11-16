// Small pixel sketches of the ideas behind four, drawn like four's own screen:
// 16 grey levels through the same warm palette, 15 frames a second, crisp
// pixels. Each sketch is a function of time only, so it loops forever and a
// reader who prefers less motion gets one still frame.
//
//   <canvas data-sketch="grains"></canvas>  then  startSketches()

const W = 160;
const H = 56;
const DARK = [7, 7, 8];
const LIT = [246, 236, 214];
const PAL = new Uint32Array(16);
for (let l = 0; l < 16; l++) {
  const t = Math.pow(l / 15, 1.25);
  const c = DARK.map((d, i) => Math.round(d + (LIT[i] - d) * t));
  PAL[l] = (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
}

class Pix {
  buf = new Uint8Array(W * H);
  clear() {
    this.buf.fill(0);
  }
  set(x: number, y: number, l: number) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = y * W + x;
    if (l > this.buf[i]) this.buf[i] = Math.min(15, Math.max(0, Math.round(l)));
  }
  line(x0: number, y0: number, x1: number, y1: number, l: number) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, l);
  }
  rect(x: number, y: number, w: number, h: number, l: number, fill = false) {
    for (let i = 0; i < w; i++)
      for (let j = 0; j < h; j++) if (fill || i === 0 || j === 0 || i === w - 1 || j === h - 1) this.set(x + i, y + j, l);
  }
  /** y(x) for x in 0..W, joined into a line */
  curve(f: (x: number) => number, l: number, x0 = 0, x1 = W - 1) {
    let py = f(x0);
    for (let x = x0 + 1; x <= x1; x++) {
      const y = f(x);
      this.line(x - 1, py, x, y, l);
      py = y;
    }
  }
}

// a repeatable random number for an integer seed
const rnd = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const hann = (u: number) => (u <= 0 || u >= 1 ? 0 : 0.5 - 0.5 * Math.cos(2 * Math.PI * u));
// a take-like wave: a few partials with a slow swell
const wave = (x: number, t = 0) =>
  Math.sin(x * 0.21 + t) * 0.55 + Math.sin(x * 0.53 + t * 1.7) * 0.25 + Math.sin(x * 1.31) * 0.12;

type Sketch = (p: Pix, t: number) => void;

const SKETCHES: Record<string, Sketch> = {
  // grains: a dim take, and short grains around a moving head, each one a Hann
  // window lifting off the wave; its stereo partner hangs below it
  grains(p, t) {
    const mid = 30;
    const w = (x: number) => mid + (Math.sin(x * 0.07 + 0.6) * 0.6 + Math.sin(x * 0.17) * 0.3) * 13;
    p.curve(w, 3);
    const head = 20 + ((t * 18) % 120);
    p.line(head, 3, head, 54, 6);
    const frame = Math.floor(t * 15);
    for (let k = 0; k < 22; k++) {
      const born = frame - k;
      const life = 7 + Math.floor(rnd(born) * 8);
      if (k >= life) continue;
      const a = hann(k / life);
      const len = 6 + Math.floor(rnd(born * 7.7) * 8);
      const x0 = head + (rnd(born * 3.1) - 0.5) * 56 - len / 2;
      for (let i = 0; i <= len; i++) {
        const x = x0 + i;
        const env = hann(i / len);
        p.set(x, w(x) - 2 - env * 9 * a, 5 + a * 10);
        p.set(x, w(x) + 2 + env * 5 * a, 3 + a * 6);
      }
    }
  },
  // wsola: the take above; below, overlapping Hann windows that find the matching place
  wsola(p, t) {
    p.curve((x) => 13 + wave(x * 1.2) * 8, 4);
    const hop = 24;
    const shift = (t * 14) % hop;
    for (let g = -1; g < 8; g++) {
      const x0 = g * hop - shift;
      const len = hop * 2;
      const search = Math.sin(t * 3 + g) * 3; // the match search, a few samples either way
      const lit = g === 3;
      p.curve((x) => 52 - hann((x - x0) / len) * 22, lit ? 13 : 5, Math.max(0, Math.floor(x0)), Math.min(W - 1, Math.floor(x0 + len)));
      if (lit) {
        p.line(x0 + search + hop, 24, x0 + search + hop, 30, 15);
        p.line(x0 + hop - 4, 27, x0 + hop + 4, 27, 8);
      }
    }
  },
  // pv: a spectrum whose peaks carry their phase; the bins around each peak follow it
  pv(p, t) {
    const peaks = [14, 31, 47, 64, 82, 101, 123, 141];
    for (let b = 0; b < 52; b++) {
      const x = 4 + b * 3;
      let m = 0.05;
      for (const [i, pk] of peaks.entries()) m += Math.exp(-Math.pow((x - pk) / 3.2, 2)) * (0.9 - i * 0.09) * (0.75 + 0.25 * Math.sin(t * 1.3 + i));
      const h = Math.min(40, m * 40);
      const peak = peaks.some((pk) => Math.abs(x - pk) < 2);
      p.line(x, 50, x, 50 - h, peak ? 14 : 5);
    }
    // the phase of each peak turns, and its neighbours turn with it
    peaks.forEach((pk, i) => {
      const a = t * (1.5 + i * 0.4);
      p.set(pk + Math.cos(a) * 2.5, 5 + Math.sin(a) * 2.5, 15);
      p.set(pk, 5, 6);
    });
  },
  // sinc: the samples as stems, and a windowed sinc gliding between them
  sinc(p, t) {
    const base = 40;
    const frac = (t * 0.6) % 1;
    for (let k = -8; k <= 8; k++) {
      const x = 80 + (k - frac) * 9;
      const y = base - Math.sin(k * 0.9 + 1) * 10;
      p.line(x, base, x, y, 4);
      p.set(x, y, 8);
    }
    const kaiser = (u: number) => (Math.abs(u) > 8 ? 0 : 0.42 + 0.5 * Math.cos((Math.PI * u) / 8) + 0.08 * Math.cos((2 * Math.PI * u) / 8));
    p.curve((x) => {
      const u = (x - 80) / 9;
      const s = u === 0 ? 1 : Math.sin(Math.PI * u) / (Math.PI * u);
      return 22 - s * kaiser(u) * 18;
    }, 14, 8, 152);
    for (let k = -8; k <= 8; k++) p.set(80 + k * 9, 22, 9);
  },
  // bbd: buckets pass their charge along on each clock tick; a slower clock, a coarser step
  bbd(p, t) {
    const n = 16;
    const rate = 4 + 3 * Math.sin(t * 0.5); // ticks a second: the TIME knob
    const tick = Math.floor(t * rate * 2);
    for (let i = 0; i < n; i++) {
      const charge = 0.5 + 0.45 * Math.sin((tick - i) * 0.55);
      const x = 6 + i * 9;
      p.rect(x, 14, 7, 26, 4);
      const h = Math.round(charge * 24);
      p.rect(x + 1, 39 - h, 5, h, 9 + Math.round(charge * 5), true);
    }
    // the clock: two phases
    for (let i = 0; i < n; i++) p.set(9 + i * 9, 46 + ((tick + i) % 2) * 3, 12);
    p.line(6, 8, 6 + ((tick % 16) / 16) * 144, 8, 7);
  },
  // room: eight delay lines; a pulse that reaches the end of one feeds them all, a little weaker
  room(p, t) {
    const lens = [131, 113, 97, 149, 89, 139, 103, 121];
    const period = 6;
    const age = t % period; // a new clap every few seconds
    for (let i = 0; i < 8; i++) {
      const y = 6 + i * 6;
      p.line(4, y, 4 + lens[i], y, 3);
      for (let r = 0; r < 12; r++) {
        const speed = 140;
        const d = age * speed - r * lens[i] * 0.95;
        if (d < 0) continue;
        const x = 4 + (d % lens[i]);
        const amp = Math.pow(0.78, r) * (1 - age / period);
        if (amp < 0.05) continue;
        p.line(x - 2, y, x + 1, y, 3 + amp * 12);
      }
    }
  },
  // ladder: a four-pole low-pass with a singing resonance, its cutoff sweeping
  ladder(p, t) {
    for (const g of [32, 80, 128]) for (let y = 4; y < 54; y += 3) p.set(g, y, 3);
    const fc = 64 + 40 * Math.sin(t * 0.7);
    const Q = 1.2 + 3.2 * (0.5 + 0.5 * Math.sin(t * 0.43));
    p.curve((x) => {
      const r = Math.pow(2, (x - fc) / 22); // the x axis in octaves
      const two = 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(r / Q, 2));
      const db = 20 * Math.log10(two) - (r > 1 ? 12 * Math.log2(r) : 0);
      return Math.min(53, Math.max(3, 24 - db * 1.2));
    }, 14);
  },
  // colour: a clean wave, the same through tanh, and crushed into stairs
  colour(p, t) {
    const drive = 1.5 + 3.5 * (0.5 + 0.5 * Math.sin(t * 0.8));
    const f = (x: number) => Math.sin(x * 0.09);
    p.curve((x) => 16 - f(x) * 11, 4, 0, 78);
    p.curve((x) => 16 - (Math.tanh(drive * f(x)) / Math.tanh(drive)) * 11, 14, 0, 78);
    const steps = 2 + Math.floor((0.5 + 0.5 * Math.sin(t * 0.6)) * 6);
    const hold = 4 + Math.floor((0.5 + 0.5 * Math.cos(t * 0.6)) * 6);
    p.curve((x) => 42 - f(x) * 11, 4, 82, 159);
    p.curve((x) => {
      const xs = Math.floor(x / hold) * hold;
      return 42 - (Math.round(f(xs) * steps) / steps) * 11;
    }, 14, 82, 159);
  },
  // lanes: four tracks, each a row of small synths that exist only while heard
  lanes(p, t) {
    const names = ["VOICE", "FILTER", "COLOUR", "FX 1", "FX 2"];
    for (let tr = 0; tr < 4; tr++) {
      const y = 5 + tr * 12;
      for (let s = 0; s < names.length; s++) {
        const x = 6 + s * 30;
        const on = s < 2 || Math.sin(t * 0.7 + tr * 1.9 + s * 2.3) > 0.2;
        if (on) p.rect(x, y, 24, 8, 13, true);
        else p.rect(x, y, 24, 8, 3);
        if (s < names.length - 1) p.line(x + 24, y + 4, x + 29, y + 4, on ? 7 : 3);
      }
    }
  },
};

const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function startSketches(root: ParentNode = document) {
  const items: { c: HTMLCanvasElement; g: CanvasRenderingContext2D; img: ImageData; px: Uint32Array; f: Sketch; on: boolean }[] = [];
  const pix = new Pix();
  root.querySelectorAll<HTMLCanvasElement>("canvas[data-sketch]").forEach((c) => {
    const f = SKETCHES[c.dataset.sketch!];
    if (!f) return;
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    const img = g.createImageData(W, H);
    const item = { c, g, img, px: new Uint32Array(img.data.buffer), f, on: false };
    items.push(item);
    new IntersectionObserver(([e]) => (item.on = e.isIntersecting), { rootMargin: "100px" }).observe(c);
  });
  const paint = (it: (typeof items)[number], t: number) => {
    pix.clear();
    it.f(pix, t);
    for (let i = 0; i < W * H; i++) it.px[i] = PAL[pix.buf[i]];
    it.g.putImageData(it.img, 0, 0);
  };
  if (reduce()) {
    items.forEach((it) => paint(it, 2.4));
    return;
  }
  let last = 0;
  const loop = (now: number) => {
    requestAnimationFrame(loop);
    if (now - last < 1000 / 15) return;
    last = now;
    const t = now / 1000;
    for (const it of items) if (it.on) paint(it, t);
  };
  items.forEach((it) => paint(it, 2.4));
  requestAnimationFrame(loop);
}
