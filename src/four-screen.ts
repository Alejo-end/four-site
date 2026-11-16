// <four-screen>: plays four's real screen, frame by frame.
//
// The frames come from four's own offscreen renderer (test/uisim/export_clips.lua
// in the four repo): one PNG sprite sheet per clip, 128 x 64 per frame, each
// pixel a grey level 0..15 stored as level * 17. The sheet is decoded once into
// levels, and every frame is painted through a warm OLED palette at 15 fps.
//
//   <four-screen clip="take"></four-screen>
//   el.setClip("voice_grain") / el.setPlaylist(["voice_play", "voice_grain"])
//   el.play() / el.pause() / el.canvas (a 128 x 64 canvas, for a 3D texture)
//   "frame" event after each painted frame

export type Clip = {
  id: string;
  page: string;
  file: string;
  frames: number;
  loop_start: number;
  caption?: string;
};
type ClipIndex = { fps: number; width: number; height: number; clips: Clip[] };

const W = 128;
const H = 64;
const DARK = [7, 7, 8];
const LIT = [246, 236, 214];

// 16 levels from the dark glass to the lit colour. A gamma a little above 1
// keeps the dim levels (the out-of-window wave, the dim words) dim, as on the OLED.
const PALETTE = new Uint32Array(16);
for (let l = 0; l < 16; l++) {
  const t = Math.pow(l / 15, 1.25);
  const c = DARK.map((d, i) => Math.round(d + (LIT[i] - d) * t));
  PALETTE[l] = (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]; // RGBA, little endian
}

const base = () => `${import.meta.env.BASE_URL}clips/`;
let indexPromise: Promise<ClipIndex> | null = null;
const levelCache = new Map<string, Promise<Uint8Array>>();

export function clipIndex(): Promise<ClipIndex> {
  indexPromise ??= fetch(`${base()}clips.json`).then((r) => {
    if (!r.ok) throw new Error(`clips.json: ${r.status}`);
    return r.json();
  });
  return indexPromise;
}

function loadLevels(clip: Clip): Promise<Uint8Array> {
  let p = levelCache.get(clip.id);
  if (!p) {
    p = new Promise<Uint8Array>((resolve, reject) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const g = c.getContext("2d", { willReadFrequently: true })!;
        g.drawImage(img, 0, 0);
        const px = g.getImageData(0, 0, c.width, c.height).data;
        const out = new Uint8Array(c.width * c.height);
        for (let i = 0, j = 0; j < out.length; i += 4, j++) out[j] = Math.min(15, Math.round(px[i] / 17));
        resolve(out);
      };
      img.onerror = () => reject(new Error(`clip ${clip.id}: ${clip.file}`));
      img.src = `${base()}${clip.file}`;
    });
    levelCache.set(clip.id, p);
  }
  return p;
}

// one ticker for every screen on the page
const screens = new Set<FourScreen>();
let ticking = false;
function tick(now: number) {
  for (const s of screens) s.step(now);
  if (screens.size) requestAnimationFrame(tick);
  else ticking = false;
}

const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export class FourScreen extends HTMLElement {
  static observedAttributes = ["clip"];
  readonly canvas: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private img: ImageData;
  private px: Uint32Array;
  private clip: Clip | null = null;
  private levels: Uint8Array | null = null;
  private frame = -1;
  private acc = 0;
  private last = 0;
  private fps = 15;
  private playing = true;
  private playlist: string[] = [];
  private listPos = 0;
  private loops = 0;
  private want = 0; // the newest clip request wins
  private advancing = false; // a playlist is loading its next clip
  loopsPerClip = 2;

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `
      <style>
        :host { display: block; position: relative; aspect-ratio: 2 / 1; background: rgb(${DARK}); overflow: hidden; contain: content; }
        canvas { display: block; width: 100%; height: 100%; image-rendering: pixelated; image-rendering: crisp-edges; }
        .grid { position: absolute; inset: 0; pointer-events: none; opacity: 0; transition: opacity .3s;
          background-image: linear-gradient(to right, rgb(0 0 0 / .45) 0 1px, transparent 1px),
                            linear-gradient(to bottom, rgb(0 0 0 / .45) 0 1px, transparent 1px);
          background-size: calc(100% / ${W}) calc(100% / ${H}); }
        :host([data-fine]) .grid { opacity: 1; }
      </style>
      <canvas width="${W}" height="${H}" part="canvas"></canvas><div class="grid"></div>`;
    this.canvas = root.querySelector("canvas")!;
    this.g = this.canvas.getContext("2d")!;
    this.img = this.g.createImageData(W, H);
    this.px = new Uint32Array(this.img.data.buffer);
    this.px.fill(PALETTE[0]);
    this.g.putImageData(this.img, 0, 0);
    // show the pixel gaps only when a pixel is big enough to have them
    new ResizeObserver(([e]) => {
      this.toggleAttribute("data-fine", e.contentRect.width / W >= 4);
    }).observe(this);
    if (reduceMotion()) this.playing = false;
    this.addEventListener("click", () => (this.playing ? this.pause() : this.play()));
  }

  connectedCallback() {
    screens.add(this);
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(tick);
    }
    const id = this.getAttribute("clip");
    if (id && !this.clip) this.setClip(id);
  }
  disconnectedCallback() {
    screens.delete(this);
  }
  attributeChangedCallback(_n: string, old: string | null, v: string | null) {
    if (v && v !== old && this.isConnected) this.setClip(v);
  }

  get clipId() {
    return this.clip?.id ?? null;
  }

  /** Play one clip: its intro once, then its loop. */
  async setClip(id: string, keepList = false) {
    if (!keepList) this.playlist = [];
    const ticket = ++this.want;
    const index = await clipIndex();
    const clip = index.clips.find((c) => c.id === id);
    if (!clip) throw new Error(`no clip ${id}`);
    const levels = await loadLevels(clip);
    if (ticket !== this.want) return;
    this.fps = index.fps;
    this.clip = clip;
    this.levels = levels;
    this.frame = -1;
    this.acc = 0;
    this.loops = 0;
    this.paint(reduceMotion() ? Math.min(clip.loop_start, clip.frames - 1) : 0);
  }

  /** Play several clips in turn, each for loopsPerClip loops. */
  setPlaylist(ids: string[]) {
    if (ids.length === 1) return this.setClip(ids[0]);
    this.playlist = ids;
    this.listPos = 0;
    return this.setClip(ids[0], true);
  }

  /** Load clips ahead of time, so a section change shows its first frame at once. */
  static preload(ids: string[]) {
    return clipIndex().then((index) =>
      Promise.all(ids.map((id) => index.clips.find((c) => c.id === id)).filter(Boolean).map((c) => loadLevels(c!))),
    );
  }

  play() {
    this.playing = true;
    this.last = 0;
  }
  pause() {
    this.playing = false;
  }

  step(now: number) {
    if (!this.clip || !this.levels) return;
    if (!this.playing) {
      this.last = now;
      return;
    }
    if (!this.last) this.last = now;
    this.acc += (now - this.last) / 1000;
    this.last = now;
    const dt = 1 / this.fps;
    if (this.acc < dt) return;
    const n = Math.min(4, Math.floor(this.acc / dt));
    this.acc -= n * dt;
    let f = this.frame;
    const { frames, loop_start } = this.clip;
    for (let i = 0; i < n; i++) {
      f++;
      if (f >= frames) {
        this.loops++;
        if (this.playlist.length > 1 && this.loops >= this.loopsPerClip) {
          // hold the last frame until the next clip is in: one request, not one each frame
          if (!this.advancing) {
            this.advancing = true;
            this.listPos = (this.listPos + 1) % this.playlist.length;
            this.setClip(this.playlist[this.listPos], true).finally(() => (this.advancing = false));
          }
          return;
        }
        f = loop_start < frames ? loop_start : frames - 1;
        if (loop_start >= frames) {
          this.playing = false; // a clip with no loop holds its last frame
          this.dispatchEvent(new Event("ended"));
        }
      }
    }
    this.paint(f);
  }

  private paint(f: number) {
    if (f === this.frame || !this.levels) return;
    this.frame = f;
    const o = f * W * H;
    const lv = this.levels;
    const px = this.px;
    for (let i = 0; i < W * H; i++) px[i] = PALETTE[lv[o + i]];
    this.g.putImageData(this.img, 0, 0);
    this.dispatchEvent(new Event("frame"));
  }
}

customElements.define("four-screen", FourScreen);
