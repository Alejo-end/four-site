// Reads four's pixel font (lib/mfont.lua in the four repo) and writes
// src/font.json: { glyph: ["0110", ...] }, 5 rows each, '1' = lit.
// usage: FOUR_DIR=../mangler node tools/font.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const four = process.env.FOUR_DIR || "../mangler";
const src = readFileSync(join(four, "lib/mfont.lua"), "utf8");
const table = src.slice(src.indexOf("local FONT = {"), src.indexOf("\n}\n", src.indexOf("local FONT = {")));
const font = {};
const re = /(?:^|\n)\s*(?:([A-Z])|\["(.)"\])\s*=\s*\{([^}]*)\}/g;
for (const m of table.matchAll(re)) {
  const ch = m[1] ?? m[2];
  font[ch] = [...m[3].matchAll(/"([01]+)"/g)].map((r) => r[1]);
}
if (!font.A || !font[" "] || !font["0"]) throw new Error("font table not found");
writeFileSync("src/font.json", JSON.stringify(font));
console.log(`src/font.json: ${Object.keys(font).length} glyphs`);
