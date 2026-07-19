// Generates PWA icons (no image deps) — a flame mark on the SpiritLife purple.
//   node scripts/generate-icons.mjs
// Produces public/icons/icon-192.png, icon-512.png, icon-maskable-512.png
import { deflateSync } from "zlib";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "public", "icons");
mkdirSync(OUT, { recursive: true });

// ── colors ──
const BG_TOP = [59, 7, 100]; // #3b0764 purple-950
const BG_BOT = [15, 10, 30]; // #0F0A1E surface.dark
const FLAME_TIP = [253, 186, 116]; // #fdba74 flame-300
const FLAME_MID = [249, 115, 22]; // #f97316 flame-500
const FLAME_BOT = [234, 88, 12]; // #ea580c flame-600

const lerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

// Signed-ish flame test: union of a bulb circle and a tapering tip.
function flameColor(nx, ny) {
  // nx,ny in [-1,1], center origin. Flame occupies roughly y in [-0.6, 0.55].
  const bulbCx = 0,
    bulbCy = 0.2,
    bulbR = 0.36;
  const inBulb = (nx - bulbCx) ** 2 + (ny - bulbCy) ** 2 <= bulbR ** 2;

  // Tip: triangle narrowing from the bulb top to (0, -0.62), with a gentle curve.
  const tipTop = -0.62;
  let inTip = false;
  if (ny <= bulbCy && ny >= tipTop) {
    const t = (ny - tipTop) / (bulbCy - tipTop); // 0 at tip → 1 at bulb
    const halfWidth = 0.34 * Math.pow(t, 0.8);
    // slight S-curve sway
    const sway = 0.06 * Math.sin((1 - t) * Math.PI);
    inTip = Math.abs(nx - sway) <= halfWidth;
  }
  if (!inBulb && !inTip) return null;

  // vertical gradient across the flame
  const g = Math.min(1, Math.max(0, (ny - tipTop) / (bulbCy + 0.36 - tipTop)));
  if (g < 0.5) return lerp(FLAME_TIP, FLAME_MID, g / 0.5);
  return lerp(FLAME_MID, FLAME_BOT, (g - 0.5) / 0.5);
}

function render(size, { maskable = false } = {}) {
  const px = Buffer.alloc(size * size * 4);
  const pad = maskable ? 0.12 : 0.0; // safe-zone inset for maskable
  const radius = maskable ? 0 : size * 0.22; // rounded corners for "any"
  const scale = 1 - pad * 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // rounded-corner alpha (non-maskable only)
      let alpha = 255;
      if (radius > 0) {
        const rx = Math.min(x, size - 1 - x);
        const ry = Math.min(y, size - 1 - y);
        if (rx < radius && ry < radius) {
          const dx = radius - rx;
          const dy = radius - ry;
          if (dx * dx + dy * dy > radius * radius) alpha = 0;
        }
      }

      // background vertical gradient
      const bg = lerp(BG_TOP, BG_BOT, y / size);
      let [r, g, b] = bg;

      // flame in centered, padded coordinate space
      const nx = ((x / size) * 2 - 1) / scale;
      const ny = ((y / size) * 2 - 1) / scale;
      const fc = flameColor(nx, ny);
      if (fc) [r, g, b] = fc;

      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = alpha;
    }
  }
  return px;
}

// ── minimal PNG encoder (RGBA, 8-bit) ──
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // filter 0 per row
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function write(name, size, opts) {
  const rgba = render(size, opts);
  writeFileSync(path.join(OUT, name), encodePNG(size, rgba));
  console.log("wrote", name);
}

write("icon-192.png", 192, {});
write("icon-512.png", 512, {});
write("icon-maskable-512.png", 512, { maskable: true });
console.log("Done.");
