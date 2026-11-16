// Small pixel sketches of the ideas behind four, drawn like four's own screen:
// 16 grey levels through the same warm palette, four's own pixel font for the
// labels, 15 frames a second, crisp pixels. Each sketch labels what it shows,
// so it explains itself without the text under it. A sketch is a function of
// time only: it loops forever, and a reader who prefers less motion gets one
// still frame.
//
//   <canvas data-sketch="grains"></canvas>  then  startSketches()
import FONT from "./font.json";

const W = 200;
const H = 72;
const DARK = [7, 7, 8];
const LIT = [246, 236, 214];
const PAL = new Uint32Array(16);
for (let l = 0; l < 16; l++) {
  const t = Math.pow(l / 15, 1.25);
  const c = DARK.map((d, i) => Math.round(d + (LIT[i] - d) * t));
  PAL[l] = (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
}
const font = FONT as Record<string, string[]>;
const glyph = (ch: string) => font[ch] ?? font[ch.toUpperCase()] ?? font[" "];

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
    const v = Math.min(15, Math.max(0, Math.round(l)));
    if (v > this.buf[i]) this.buf[i] = v;
  }
  put(x: number, y: number, l: number) {
    // overwrite, even with a darker level (for words cut out of a lit box)
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < W && y < H) this.buf[y * W + x] = l;
  }
  line(x0: number, y0: number, x1: number, y1: number, l: number) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, l);
  }
  dots(x0: number, y0: number, x1: number, y1: number, l: number) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i += 2) this.set(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, l);
  }
  rect(x: number, y: number, w: number, h: number, l: number, fill = false) {
    for (let i = 0; i < w; i++)
      for (let j = 0; j < h; j++) if (fill || i === 0 || j === 0 || i === w - 1 || j === h - 1) this.set(x + i, y + j, l);
  }
  curve(f: (x: number) => number, l: number, x0 = 0, x1 = W - 1) {
    let py = f(x0);
    for (let x = Math.ceil(x0) + 1; x <= x1; x++) {
      const y = f(x);
      this.line(x - 1, py, x, y, l);
      py = y;
    }
  }
  /** four's pixel font, 5 rows tall; `cut` writes the level even if darker */
  text(x: number, y: number, s: string, l: number, cut = false) {
    for (const ch of s) {
      const g = glyph(ch);
      g.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) if (row[i] === "1") (cut ? this.put(x + i, y + j, l) : this.set(x + i, y + j, l));
      });
      x += g[0].length + 1;
    }
    return x;
  }
}
const textW = (s: string) => [...s].reduce((w, ch) => w + glyph(ch)[0].length + 1, -1);

const rnd = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const hann = (u: number) => (u <= 0 || u >= 1 ? 0 : 0.5 - 0.5 * Math.cos(2 * Math.PI * u));
const take = (x: number) => Math.sin(x * 0.11 + 0.6) * 0.6 + Math.sin(x * 0.27) * 0.3 + Math.sin(x * 0.61) * 0.1;

type Sketch = (p: Pix, t: number) => void;

const SKETCHES: Record<string, Sketch> = {
  // GRAIN: grains are cut from the take around the head, each faded by a
  // window, and laid down overlapping on the output, which scrolls by
  grains(p, t) {
    p.text(2, 2, "TAKE", 6);
    const ty = 18;
    p.curve((x) => ty + take(x) * 9, 3, 22, W - 1);
    const head = 40 + ((t * 14) % 140);
    p.line(head, 6, head, 31, 8);
    p.text(Math.min(head + 3, W - 18), 6, "HEAD", 8);
    p.line(2, 36, W - 2, 36, 2);
    p.text(2, 40, "OUT", 6);
    const frame = Math.floor(t * 15);
    const oy = 58;
    for (let age = 0; age < 70; age++) {
      const born = frame - age;
      if (rnd(born * 1.7) > 0.45) continue; // not every frame starts a grain
      const len = 10 + Math.floor(rnd(born * 7.7) * 10);
      const src = head - age * (14 / 15) + (rnd(born * 3.1) - 0.5) * 30; // where it was cut, near the head then
      const outX = W - 6 - age * 2.6; // where it lands on the output
      if (outX + len < 22) continue;
      for (let i = 0; i <= len; i++) {
        const env = hann(i / len);
        const v = take(src - len / 2 + i) * 9 * env;
        p.set(outX - len / 2 + i, oy + v, 5 + env * 9);
      }
      if (age < 8) {
        // the slice being cut: its window lifts off the take
        for (let i = 0; i <= len; i++) {
          const x = src - len / 2 + i;
          p.set(x, ty + take(x) * 9, 15);
          p.set(x, ty - 11 + (1 - hann(i / len)) * 7, 9);
        }
        p.dots(src, ty + 2, outX, oy - 8, 4);
      }
    }
    p.text(W - textW("GRAINS") - 2, 40, "GRAINS", 9);
  },

  // WARP: the next grain is due at a planned place; it searches either side
  // and starts where its wave continues the last one, so the windows sum flat
  wsola(p, t) {
    p.text(2, 2, "IN", 6);
    const iy = 16;
    p.curve((x) => iy + take(x * 0.9) * 8, 4, 14, W - 1);
    const cycle = t % 3;
    const planned = 104;
    const best = 97;
    const scan = cycle < 1.6 ? planned - 14 + ((cycle / 1.6) * 28) : best;
    p.line(planned, 4, planned, 28, 6);
    p.text(planned + 3, 2, "DUE", 6);
    p.line(planned - 14, 30, planned + 14, 30, 6);
    p.line(planned - 14, 28, planned - 14, 32, 6);
    p.line(planned + 14, 28, planned + 14, 32, 6);
    p.text(planned - 10, 33, "SEARCH", 7);
    p.line(scan, 6, scan, 27, cycle < 1.6 ? 10 : 15);
    if (cycle >= 1.6) p.text(scan - 18, 22, "BEST", 15);
    // the output: windows at half overlap, the new one bright, their sum flat
    p.text(2, 44, "OUT", 6);
    const oy = 68;
    const len = 48;
    const shift = cycle >= 1.6 ? Math.min(1, (cycle - 1.6) / 1.4) * 24 : 0;
    for (let g = -1; g < 6; g++) {
      const x0 = 14 + g * 24 - shift;
      const lit = g === 4;
      p.curve((x) => oy - hann((x - x0) / len) * 18, lit ? 15 : 5, Math.max(14, Math.floor(x0)), Math.min(W - 1, Math.floor(x0 + len)));
    }
    p.dots(14, oy - 18, W - 2, oy - 18, 8);
    p.text(W - textW("SUM FLAT") - 2, 44, "SUM FLAT", 8);
  },

  // PV: a spectrum; each peak's phase turns, and the bins around it turn
  // with it, locked; the frames below run at any speed, and stop to freeze
  pv(p, t) {
    p.text(2, 2, "SPECTRUM", 6);
    const base = 46;
    const peaks = [26, 50, 74, 99, 125, 152, 178];
    for (let b = 0; b < 62; b++) {
      const x = 6 + b * 3;
      let m = 0.04;
      peaks.forEach((pk, i) => (m += Math.exp(-Math.pow((x - pk) / 3.4, 2)) * (0.95 - i * 0.1) * (0.8 + 0.2 * Math.sin(t * 1.1 + i))));
      const h = Math.min(30, m * 30);
      const peak = peaks.some((pk) => Math.abs(x - pk) < 2);
      p.line(x, base, x, base - h, peak ? 14 : 5);
    }
    // phase dials over the first three peaks: the peak and its two neighbours turn together
    [0, 1, 2].forEach((i) => {
      const pk = peaks[i];
      const a = t * (1.6 + i * 0.5);
      for (const dx of [-6, 0, 6]) {
        const cx = pk + dx;
        const cy = 12;
        for (let k = 0; k < 12; k++) p.set(cx + Math.cos((k / 12) * 6.283) * 2.5, cy + Math.sin((k / 12) * 6.283) * 2.5, 3);
        p.line(cx, cy, cx + Math.cos(a) * 2.5, cy + Math.sin(a) * 2.5, dx === 0 ? 15 : 9);
      }
    });
    p.text(104, 9, "LOCKED PHASES", 8);
    // frames: speed 1, slow, then a freeze
    const ph = t % 6;
    const speed = ph < 2 ? 1 : ph < 4 ? 0.35 : 0;
    p.text(2, 52, speed === 0 ? "FREEZE" : speed === 1 ? "SPEED 1" : "SLOW", speed === 0 ? 15 : 7);
    const off = (t * 8 * (ph < 2 ? 1 : ph < 4 ? 0.35 : 0)) % 12;
    const fx1 = W - textW("FRAMES") - 8;
    for (let f = 0; f < 14; f++) {
      const x = 40 + f * 12 - off;
      if (x < 40 || x + 10 > fx1) continue;
      p.rect(x, 54, 10, 14, f === 6 ? 14 : 5);
    }
    p.text(W - textW("FRAMES") - 2, 58, "FRAMES", 6);
  },

  // PLAY and pitch: a windowed sinc slides between the samples; its 16 taps
  // weigh the samples under it, and the sum is the output at that point
  sinc(p, t) {
    p.text(2, 64, "SAMPLES", 6);
    const base = 52;
    const sp = 10;
    const s = (k: number) => Math.sin(k * 0.62 + 0.4) * 0.8 + Math.sin(k * 0.21) * 0.2;
    const pos = 2 + ((t * 1.6) % 16); // the read head, in samples
    const kmin = 0;
    const kmax = 19;
    const kaiser = (u: number) => (Math.abs(u) > 8 ? 0 : 0.42 + 0.5 * Math.cos((Math.PI * u) / 8) + 0.08 * Math.cos((2 * Math.PI * u) / 8));
    const sinc = (u: number) => (Math.abs(u) < 1e-6 ? 1 : Math.sin(Math.PI * u) / (Math.PI * u));
    const X = (k: number) => 4 + k * sp;
    for (let k = kmin; k <= kmax; k++) {
      const y = base - s(k) * 10;
      const w = sinc(pos - k) * kaiser(pos - k);
      const under = Math.abs(pos - k) < 8;
      p.line(X(k), base, X(k), y, under ? 8 : 4);
      p.set(X(k), y, under ? 8 + Math.abs(w) * 7 : 5);
    }
    // the kernel over the head
    p.curve((x) => 24 - sinc(pos - (x - 4) / sp) * kaiser(pos - (x - 4) / sp) * 14, 12, Math.max(0, X(pos - 8)), Math.min(W - 1, X(pos + 8)));
    p.text(Math.min(W - 64, X(pos) + 6), 1, "KERNEL 16 TAPS", 12);
    // the output so far: the smooth curve the samples stand for
    const out = (u: number) => {
      let acc = 0;
      for (let k = Math.ceil(u - 8); k <= Math.floor(u + 8); k++) acc += s(k) * sinc(u - k) * kaiser(u - k);
      return acc;
    };
    for (let x = X(2); x <= X(pos); x++) p.set(x, base - out((x - 4) / sp) * 10, 13);
    const oy = base - out(pos) * 10;
    p.rect(X(pos) - 1, oy - 1, 3, 3, 15, true);
    p.text(Math.min(W - 14, X(pos) + 4), oy - 9, "OUT", 15);
  },

  // ECHO: buckets pass their charge one step on every clock tick; a slow
  // clock makes coarse steps, and so a darker echo
  bbd(p, t) {
    const slow = 0.5 + 0.5 * Math.sin(t * 0.45); // 0 fast .. 1 slow, the TIME knob
    const rate = 9 - slow * 6;
    const tick = Math.floor(t * rate);
    p.text(2, 2, "IN", 6);
    p.curve((x) => 18 + Math.sin((x + t * 30) * 0.25) * 6, 9, 2, 22);
    const n = 13;
    for (let i = 0; i < n; i++) {
      const charge = 0.5 + 0.45 * Math.sin((tick - i) * 0.8);
      const x = 28 + i * 11;
      p.rect(x, 8, 9, 26, 4);
      const h = Math.round(charge * 24);
      p.rect(x + 1, 33 - h, 7, h, 8 + Math.round(charge * 6), true);
    }
    p.text(28, 38, "BUCKETS", 6);
    // the clock, two phases
    p.text(2, 48, "CLOCK", 6);
    for (let i = 0; i < n; i++) p.line(31 + i * 11, 50 + ((tick + i) % 2) * 4, 35 + i * 11, 50 + ((tick + i) % 2) * 4, 12);
    p.text(W - textW(slow > 0.5 ? "SLOW DARK" : "FAST BRIGHT") - 2, 48, slow > 0.5 ? "SLOW DARK" : "FAST BRIGHT", 14);
    // the output: a staircase whose steps follow the clock
    p.text(2, 62, "OUT", 6);
    const stepW = 2 + slow * 7;
    p.curve((x) => {
      const xs = Math.floor((x + t * 30) / stepW) * stepW;
      return 64 + Math.sin(xs * 0.25) * 5;
    }, 13, 22, W - 2);
  },

  // REVERB: a clap enters eight delay lines of different lengths; every line
  // that ends feeds all of them through the mix, a little quieter each time
  room(p, t) {
    const lens = [96, 83, 71, 109, 64, 102, 77, 90];
    const period = 6;
    const age = t % period;
    p.text(2, 2, "CLAP", age < 0.5 ? 15 : 6);
    p.text(2, 64, "8 LINES", 6);
    const mixX = 140;
    p.rect(mixX, 8, 17, 50, 6);
    p.text(mixX + 2, 30, "MIX", 9);
    let energy = 0;
    for (let i = 0; i < 8; i++) {
      const y = 10 + i * 6;
      const x0 = mixX - lens[i];
      p.line(x0, y, mixX - 1, y, 3);
      p.dots(mixX + 17, y, mixX + 20, y, 3);
      for (let r = 0; r < 14; r++) {
        const d = age * 120 - r * lens[i] * 0.9;
        if (d < 0) continue;
        const x = x0 + (d % lens[i]);
        const amp = Math.pow(0.8, r) * Math.exp(-age * 0.45);
        if (amp < 0.04) continue;
        energy += amp;
        p.line(x - 3, y, x, y, 3 + amp * 12);
      }
    }
    // the tail: the sum of all lines over time
    p.text(162, 2, "TAIL", 6);
    const cols = 34;
    for (let c = 0; c < cols; c++) {
      const a = (c / cols) * period;
      if (a > age) break;
      const dens = Math.min(1, a * 0.9) * Math.exp(-a * 0.45);
      const h = Math.round(dens * 46 * (0.7 + 0.3 * rnd(c + Math.floor(t / period) * 50)));
      p.line(162 + c, 64, 162 + c, 64 - h, 6 + dens * 8);
    }
    void energy;
  },

  // FILTER: a ladder low-pass with a resonant peak at the cutoff, sweeping
  ladder(p, t) {
    const X0 = 8;
    const X1 = W - 4;
    const oct = (f: number) => X0 + ((Math.log2(f / 20) / Math.log2(20000 / 20)) * (X1 - X0));
    for (const [f, s] of [[100, "100"], [1000, "1K"], [10000, "10K"]] as const) {
      const x = oct(f);
      for (let y = 10; y < 60; y += 3) p.set(x, y, 3);
      p.text(x - textW(s) / 2, 64, s, 5);
    }
    const fc = 400 * Math.pow(2, 3.2 * Math.sin(t * 0.55));
    const Q = 1.2 + 4 * (0.5 + 0.5 * Math.sin(t * 0.37));
    const resp = (x: number) => {
      const f = 20 * Math.pow(1000, (x - X0) / (X1 - X0));
      const r = f / fc;
      const two = 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(r / Q, 2));
      const db = 20 * Math.log10(two) - (r > 1 ? 12 * Math.log2(r) : 0);
      return Math.min(60, Math.max(8, 30 - db * 1.4));
    };
    p.curve(resp, 14, X0, X1);
    const xc = oct(fc);
    p.line(xc, resp(xc) - 2, xc, 8, 8);
    p.text(Math.max(48, Math.min(xc + 3, W - 32)), 2, "CUTOFF", 12);
    p.text(2, 2, "RESO " + Q.toFixed(1), 7);
  },

  // COLOUR: drive bends the wave through a tanh curve; crush holds it in
  // steps of time and of level
  colour(p, t) {
    const drive = 1.2 + 4 * (0.5 + 0.5 * Math.sin(t * 0.8));
    const f = (x: number) => Math.sin(x * 0.085);
    p.text(2, 2, "DRIVE", 12);
    // the curve itself, a small square plot
    p.rect(2, 10, 22, 22, 4);
    p.curve((x) => 21 - (Math.tanh(drive * ((x - 13) / 10)) / Math.tanh(drive)) * 10, 14, 3, 23);
    p.curve((x) => 21 - f(x) * 10, 4, 28, 96);
    p.curve((x) => 21 - (Math.tanh(drive * f(x)) / Math.tanh(drive)) * 10, 14, 28, 96);
    p.text(2, 40, "CRUSH", 12);
    const steps = 2 + Math.floor((0.5 + 0.5 * Math.sin(t * 0.6)) * 5);
    const hold = 3 + Math.floor((0.5 + 0.5 * Math.cos(t * 0.6)) * 7);
    p.curve((x) => 58 - f(x) * 10, 4, 28, 196);
    p.curve((x) => {
      const xs = Math.floor(x / hold) * hold;
      return 58 - (Math.round(f(xs) * steps) / steps) * 10;
    }, 14, 28, 196);
    p.text(104, 2, "IN", 5);
    p.text(118, 2, "OUT", 14);
  },

  // LANES: each track is a row of small synths; only the lit ones run, and
  // the CPU meter follows them
  lanes(p, t) {
    const labels = ["V", "F", "C", "1", "2"];
    let on = 0;
    for (let tr = 0; tr < 4; tr++) {
      const y = 8 + tr * 15;
      p.text(2, y + 2, "T" + (tr + 1), 8);
      for (let s = 0; s < labels.length; s++) {
        const x = 18 + s * 28;
        const lit = s === 0 ? tr < 3 : s === 1 ? tr < 3 : tr < 3 && Math.sin(t * 0.6 + tr * 1.9 + s * 2.3) > 0.1;
        if (lit) {
          on++;
          p.rect(x, y, 22, 9, 13, true);
          p.text(x + 9, y + 2, labels[s], 0, true);
        } else {
          p.rect(x, y, 22, 9, 3);
          p.text(x + 9, y + 2, labels[s], 3);
        }
        if (s < labels.length - 1) p.line(x + 22, y + 4, x + 27, y + 4, lit ? 6 : 2);
      }
    }
    p.text(18, 1, "LIT = RUNNING", 6);
    // the meter
    p.text(166, 2, "CPU", 8);
    p.rect(168, 9, 12, 54, 5);
    const h = Math.round((on / 20) * 52);
    p.rect(169, 62 - h, 10, h, 12, true);
  },
};

const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function startSketches(root: ParentNode = document) {
  type Item = { c: HTMLCanvasElement; g: CanvasRenderingContext2D; img: ImageData; px: Uint32Array; f: Sketch; on: boolean; drawn: boolean };
  const items: Item[] = [];
  const pix = new Pix();
  const paint = (it: Item, t: number) => {
    pix.clear();
    it.f(pix, t);
    for (let i = 0; i < W * H; i++) it.px[i] = PAL[pix.buf[i]];
    it.g.putImageData(it.img, 0, 0);
    it.drawn = true;
  };
  root.querySelectorAll<HTMLCanvasElement>("canvas[data-sketch]").forEach((c) => {
    const f = SKETCHES[c.dataset.sketch!];
    if (!f) return;
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    const img = g.createImageData(W, H);
    const item: Item = { c, g, img, px: new Uint32Array(img.data.buffer), f, on: false, drawn: false };
    items.push(item);
    // nothing is drawn until a sketch comes near the view
    new IntersectionObserver(
      ([e]) => {
        item.on = e.isIntersecting;
        if (item.on && !item.drawn) paint(item, 2.4);
      },
      { rootMargin: "200px" },
    ).observe(c);
  });
  if (reduce()) return; // each sketch keeps the still frame it got when it came near
  let last = 0;
  const loop = (now: number) => {
    requestAnimationFrame(loop);
    if (now - last < 1000 / 15) return;
    last = now;
    const t = now / 1000;
    for (const it of items) if (it.on) paint(it, t);
  };
  requestAnimationFrame(loop);
}
