// four's own pixel font (lib/mfont.lua, exported by tools/font.mjs), drawn as
// crisp SVG rects. Glyphs are 5 rows tall, 1 to 5 columns wide, and the
// advance is the width plus one column, as on the norns.
import FONT from "./font.json";

const font = FONT as Record<string, string[]>;
const glyph = (ch: string) => font[ch] ?? font[ch.toUpperCase()] ?? font[" "];

export function textWidth(s: string) {
  let w = 0;
  for (const ch of s) w += glyph(ch)[0].length + 1;
  return Math.max(0, w - 1);
}

/** An SVG of the text, one unit per font pixel. Size it with CSS height. */
export function pixelSVG(s: string): SVGSVGElement {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  const w = textWidth(s);
  svg.setAttribute("viewBox", `0 0 ${w} 5`);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.classList.add("px-svg");
  let d = "";
  let x = 0;
  for (const ch of s) {
    const g = glyph(ch);
    g.forEach((row, y) => {
      for (let i = 0; i < row.length; i++) if (row[i] === "1") d += `M${x + i} ${y}h1v1h-1z`;
    });
    x += g[0].length + 1;
  }
  const path = document.createElementNS(NS, "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "currentColor");
  svg.appendChild(path);
  return svg;
}

/** Turn every element with data-px into pixel type, keeping its text for readers. */
export function pixelize(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-px]").forEach((el) => {
    if (el.dataset.pxDone) return;
    const text = el.textContent?.trim() ?? "";
    el.dataset.pxDone = "1";
    el.textContent = "";
    const label = document.createElement("span");
    label.className = "sr-only";
    label.textContent = text;
    el.append(pixelSVG(text.toUpperCase()), label);
  });
}
