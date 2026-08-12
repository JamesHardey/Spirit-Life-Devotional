// Composites the transparent church-logo icons onto a solid white background,
// in place, so the PWA home-screen icon (not just the in-app header) shows
// cleanly regardless of the OS's own icon background.
//   node scripts/white-bg-icons.mjs
// Originals are preserved in .icon-originals/ (outside public/, not web-served).
import { readFileSync, writeFileSync } from "fs";
import { inflateSync, deflateSync } from "zlib";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.join(__dirname, "..", "public", "icons");
const ORIGINALS_DIR = path.join(__dirname, "..", ".icon-originals");

// ── PNG decode ────────────────────────────────────────────────────────────
function decodePNG(buf) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!buf.subarray(0, 8).equals(sig)) throw new Error("not a PNG");

  let off = 8;
  let width, height, bitDepth, colorType;
  const idatParts = [];

  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data.readUInt8(8);
      colorType = data.readUInt8(9);
    } else if (type === "IDAT") {
      idatParts.push(data);
    } else if (type === "IEND") {
      break;
    }
    off += 12 + len;
  }

  if (bitDepth !== 8) throw new Error(`unsupported bit depth ${bitDepth}`);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`unsupported color type ${colorType}`);

  const raw = inflateSync(Buffer.concat(idatParts));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);
  let prevRow = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    const filterType = raw[rowStart];
    const row = raw.subarray(rowStart + 1, rowStart + 1 + stride);
    const outRow = pixels.subarray(y * stride, (y + 1) * stride);

    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? outRow[x - channels] : 0;
      const b = prevRow[x];
      const c = x >= channels ? prevRow[x - channels] : 0;
      let pred;
      switch (filterType) {
        case 0: pred = 0; break;
        case 1: pred = a; break;
        case 2: pred = b; break;
        case 3: pred = Math.floor((a + b) / 2); break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          break;
        }
        default: throw new Error(`unsupported filter type ${filterType}`);
      }
      outRow[x] = (row[x] + pred) & 0xff;
    }
    prevRow = outRow;
  }

  return { width, height, channels, pixels };
}

// ── PNG encode (RGBA, 8-bit, filter 0) — same approach as generate-icons.mjs ──
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
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ── Composite onto white ─────────────────────────────────────────────────
function compositeOnWhite(decoded) {
  const { width, height, channels, pixels } = decoded;
  const out = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    let r, g, b, a;
    if (channels === 4) {
      r = pixels[i * 4]; g = pixels[i * 4 + 1]; b = pixels[i * 4 + 2]; a = pixels[i * 4 + 3];
    } else if (channels === 3) {
      r = pixels[i * 3]; g = pixels[i * 3 + 1]; b = pixels[i * 3 + 2]; a = 255;
    } else if (channels === 2) {
      r = g = b = pixels[i * 2]; a = pixels[i * 2 + 1];
    } else {
      r = g = b = pixels[i]; a = 255;
    }
    const alpha = a / 255;
    out[i * 4] = Math.round(r * alpha + 255 * (1 - alpha));
    out[i * 4 + 1] = Math.round(g * alpha + 255 * (1 - alpha));
    out[i * 4 + 2] = Math.round(b * alpha + 255 * (1 - alpha));
    out[i * 4 + 3] = 255; // fully opaque now — white is baked in
  }
  return out;
}

function process(name) {
  const file = path.join(ICONS_DIR, name);
  const original = path.join(ORIGINALS_DIR, name);
  const buf = readFileSync(original);
  const decoded = decodePNG(buf);
  const composited = compositeOnWhite(decoded);
  const png = encodePNG(decoded.width, decoded.height, composited);
  writeFileSync(file, png);
  console.log(`${name}: ${decoded.width}x${decoded.height}, ${decoded.channels}ch -> white-backed, ${png.length} bytes`);
}

process("icon-192.png");
process("icon-512.png");
process("icon-maskable-512.png");
console.log("\nDone. Originals kept in .icon-originals/.");
