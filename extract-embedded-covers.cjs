"use strict";
// 从 mp3 的 ID3v2 APIC 帧抽取内嵌封面，存到 covers/。仅处理 covers 中尚无封面的曲目。
// 用法: node extract-embedded-covers.cjs
const fs = require("fs");
const path = require("path");

const PLAYLIST_DIR = path.join(__dirname, "assets", "PlayList");
const COVERS_DIR = path.join(PLAYLIST_DIR, "covers");

function synchsafe(n) {
  return ((n & 0x7f000000) >> 3) | ((n & 0x7f0000) >> 2) | ((n & 0x7f00) >> 1) | (n & 0x7f);
}

function imageExt(mime, data) {
  if (data && data.length > 3) {
    if (data[0] === 0x89 && data[1] === 0x50) return ".png";
    if (data[0] === 0xff && data[1] === 0xd8) return ".jpg";
    if (data[0] === 0x52 && data[1] === 0x49 && data[8] === 0x57) return ".webp";
  }
  const m = (mime || "").toLowerCase();
  if (m.includes("png")) return ".png";
  return ".jpg";
}

function parseApicFrame(d) {
  let p = 0;
  const enc = d[p++];
  let mimeEnd = p;
  while (mimeEnd < d.length && d[mimeEnd] !== 0) mimeEnd++;
  const mime = d.toString("ascii", p, mimeEnd);
  p = mimeEnd + 1;
  p++; // picture type
  if (enc === 1 || enc === 2) {
    while (p + 1 < d.length && !(d[p] === 0 && d[p + 1] === 0)) p += 2;
    p += 2;
  } else {
    while (p < d.length && d[p] !== 0) p++;
    p += 1;
  }
  return { mime, data: d.subarray(p) };
}

function extractApic(buf) {
  if (buf.toString("binary", 0, 3) !== "ID3") return null;
  const verMajor = buf[3];
  const flags = buf[5];
  const tagSize = synchsafe(buf.readUInt32BE(6));
  let pos = 10;
  const end = Math.min(10 + tagSize, buf.length);
  if (flags & 0x40) {
    const extSize = verMajor === 4 ? synchsafe(buf.readUInt32BE(pos)) : buf.readUInt32BE(pos);
    pos += verMajor === 4 ? extSize : extSize + 4;
  }
  while (pos + 10 <= end) {
    const id = buf.toString("binary", pos, pos + 4);
    if (id === "\u0000\u0000\u0000\u0000") break;
    const frameSize = verMajor === 4 ? synchsafe(buf.readUInt32BE(pos + 4)) : buf.readUInt32BE(pos + 4);
    const frameStart = pos + 10;
    if (frameSize <= 0 || frameStart + frameSize > buf.length) break;
    if (id === "APIC") return parseApicFrame(buf.subarray(frameStart, frameStart + frameSize));
    pos = frameStart + frameSize;
  }
  return null;
}

function hasCover(base) {
  return [".jpg", ".png", ".jpeg", ".webp"].some((e) => fs.existsSync(path.join(COVERS_DIR, base + e)));
}

function main() {
  fs.mkdirSync(COVERS_DIR, { recursive: true });
  const files = fs.readdirSync(PLAYLIST_DIR).filter((n) => /\.mp3$/i.test(n));
  let done = 0;
  let skipped = 0;
  let none = 0;
  for (const file of files) {
    const base = file.replace(/\.[^.]+$/, "");
    if (hasCover(base)) { skipped++; continue; }
    try {
      const buf = fs.readFileSync(path.join(PLAYLIST_DIR, file));
      const apic = extractApic(buf);
      if (apic && apic.data && apic.data.length > 1024) {
        const ext = imageExt(apic.mime, apic.data);
        fs.writeFileSync(path.join(COVERS_DIR, base + ext), apic.data);
        console.log("抽取封面: " + base + ext + "  (" + (apic.data.length / 1024).toFixed(0) + " KB)");
        done++;
      } else {
        console.log("无内嵌封面: " + base);
        none++;
      }
    } catch (e) {
      console.error("失败: " + file + " -> " + e.message);
    }
  }
  console.log("\n抽取 " + done + " | 已有跳过 " + skipped + " | 无封面 " + none);
}

main();
