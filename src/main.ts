import "@fontsource-variable/hanken-grotesk";
import "./style.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "./four-screen";
import "./four-device"; // side effects: the custom elements register on import
import { FourScreen } from "./four-screen";
import type { FourDevice } from "./four-device";
import { PAGES } from "./pages";
import { pixelize } from "./pixelfont";

gsap.registerPlugin(ScrollTrigger);

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const desktop = matchMedia("(min-width: 960px)");
if (reduce) document.documentElement.classList.add("reduce");

// ---- the guide, built from the page list -------------------------------
const pagesEl = document.querySelector<HTMLElement>("#pages")!;
for (const p of PAGES) {
  const a = document.createElement("article");
  a.className = "page";
  a.id = p.id;
  a.dataset.clips = p.clips.join(" ");
  const keys = p.keys
    .map(
      (k) => `<div class="k" role="listitem"><span class="key">${k.key}</span><span class="word" data-px>${k.word}</span><span class="says">${k.says}</span></div>`,
    )
    .join("");
  a.innerHTML = `
    <h2><span data-px>${p.name}</span></h2>
    <p class="does">${p.does}</p>
    <div class="footer" role="list" aria-label="Keys and encoders on ${p.name}">${keys}</div>
    ${p.shift ? `<p class="shift">${p.shift}</p>` : ""}
    <p class="picture">${p.picture}</p>`;
  pagesEl.appendChild(a);
}
// a focus button for the desktop layout, where the 2D screen is hidden
const intro = document.querySelector(".guide-intro")!;
const deskFocus = document.createElement("button");
deskFocus.type = "button";
deskFocus.className = "focus-btn focus-desk";
deskFocus.textContent = "Focus on the screen";
intro.appendChild(deskFocus);
pixelize();

// ---- the screen and the case ---------------------------------------------
const screen = document.querySelector<FourScreen>("#screen")!;
const device = document.querySelector<FourDevice>("four-device")!;
device.addEventListener("nowebgl", () => document.documentElement.classList.add("no-webgl"));
device.screen = screen.canvas;
screen.addEventListener("frame", () => device.screenChanged());

// ---- smooth scroll -------------------------------------------------------
if (!reduce) {
  const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

// ---- the stage: explode, assemble, turn, power on ------------------------
let powered = false;
function power(on: boolean) {
  if (on === powered) return;
  powered = on;
  if (on) {
    screen.setClip("intro").then(() => screen.play());
  }
}
screen.addEventListener("ended", () => {
  // after the opening, the stage shows a take being recorded
  if (powered && !activePage) screen.setClip("take").then(() => screen.play());
});

if (reduce) {
  device.progress = 1;
  power(true);
} else {
  ScrollTrigger.create({
    trigger: "#stage",
    start: "top top",
    end: "bottom bottom",
    onUpdate: (st) => {
      device.progress = st.progress;
      power(st.progress > 0.8);
    },
  });
  // the words of the stage, placed on the same 0..1 as the case
  const tl = gsap.timeline({ scrollTrigger: { trigger: "#stage", start: "top top", end: "bottom bottom", scrub: true } });
  tl.to(".hero-copy", { autoAlpha: 0, y: -24, duration: 0.07, ease: "power1.in" }, 0.03)
    .fromTo(".note-device", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.06 }, 0.6)
    .to(".note-device", { autoAlpha: 0, y: -24, duration: 0.06 }, 0.75)
    .fromTo(".note-on", { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.05 }, 0.84)
    .to(".note-on", { autoAlpha: 0, duration: 0.04 }, 0.95)
    .set({}, {}, 1);
}

// ---- the guide: the case moves aside (desktop) or gives way (phone) ------
ScrollTrigger.create({
  trigger: "#guide",
  start: "top bottom",
  end: "top 20%",
  onUpdate: (st) => {
    if (desktop.matches) {
      device.shift = st.progress;
      device.style.opacity = "1";
    } else {
      device.shift = 0;
      device.style.opacity = String(1 - st.progress);
    }
  },
});
// past the guide, the case fades for the install section
ScrollTrigger.create({
  trigger: "#outro",
  start: "top 80%",
  end: "top 30%",
  onUpdate: (st) => {
    if (desktop.matches) device.style.opacity = String(1 - st.progress * 0.75);
  },
});

// the page in the middle of the view sets the clip
let activePage: HTMLElement | null = null;
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target as HTMLElement;
      if (el === activePage) continue;
      activePage?.removeAttribute("aria-current");
      activePage = el;
      el.setAttribute("aria-current", "true");
      const clips = el.dataset.clips!.split(" ");
      screen.setPlaylist(clips)?.then(() => screen.play());
      focusScreen.setPlaylist(clips);
    }
  },
  { rootMargin: "-45% 0px -50% 0px" },
);
document.querySelectorAll(".page").forEach((el) => io.observe(el));

// ---- focus mode: the screen alone ----------------------------------------
const dialog = document.querySelector<HTMLDialogElement>("#focus")!;
const focusScreen = document.querySelector<FourScreen>("#focus-screen")!;
document.querySelectorAll(".focus-btn").forEach((b) =>
  b.addEventListener("click", async () => {
    const clip = screen.clipId ?? "take";
    const page = activePage?.dataset.clips?.split(" ");
    await (page ? focusScreen.setPlaylist(page) : focusScreen.setClip(clip));
    focusScreen.play();
    dialog.showModal();
    if (document.fullscreenEnabled && !document.fullscreenElement) dialog.requestFullscreen?.().catch(() => {});
  }),
);
const closeFocus = () => {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  dialog.close();
};
dialog.querySelector(".close")!.addEventListener("click", closeFocus);
dialog.addEventListener("cancel", closeFocus);

// ---- install line --------------------------------------------------------
const copy = document.querySelector<HTMLButtonElement>("#copy")!;
copy.addEventListener("click", async () => {
  const line = document.querySelector("#install-line")!.textContent!.trim();
  try {
    await navigator.clipboard.writeText(line);
    copy.textContent = "Copied";
  } catch {
    getSelection()?.selectAllChildren(document.querySelector("#install-line")!);
    copy.textContent = "Selected";
  }
  setTimeout(() => (copy.textContent = "Copy"), 1800);
});

// load every clip once the case is in, so a page change shows its frames at once
device.ready.then(() => {
  const ids = ["intro", "take", ...PAGES.flatMap((p) => p.clips)];
  const idle = (window as any).requestIdleCallback ?? ((f: () => void) => setTimeout(f, 300));
  idle(() => FourScreen.preload([...new Set(ids)]).catch(() => {}));
});
desktop.addEventListener("change", () => ScrollTrigger.refresh());
