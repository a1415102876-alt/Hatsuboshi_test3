"use strict";
// 零依赖 NCM -> mp3/flac 解密工具（仅用 Node 内置 crypto）。
// 用法: node convert-ncm.cjs "<目录>" [--delete]
//   不带 --delete: 只转换 + 抽封面，保留 ncm（演练）。
//   带 --delete:   转换成功后删除对应 ncm。
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CORE_KEY = Buffer.from("687A4852416D736F356B496E62617857", "hex"); // hzHRAmso5kInbaxW
const META_KEY = Buffer.from("2331346C6A6B5F215C5D2630553C2728", "hex"); // #14ljk_!\]&0U<'(

function aesEcbDecryptNoPad(key, data) {
  const d = crypto.createDecipheriv("aes-128-ecb", key, null);
  d.setAutoPadding(false);
  return Buffer.concat([d.update(data), d.final()]);
}

function pkcs7Strip(buf) {
  const pad = buf[buf.length - 1];
  if (pad > 0 && pad <= 16) return buf.subarray(0, buf.length - pad);
  return buf;
}

function buildKeyBox(key) {
  const box = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) box[i] = i;
  let lastByte = 0;
  let keyOffset = 0;
  for (let i = 0; i < 256; i++) {
    const swap = box[i];
    const c = (swap + lastByte + key[keyOffset]) & 0xff;
    keyOffset = (keyOffset + 1) % key.length;
    box[i] = box[c];
    box[c] = swap;
    lastByte = c;
  }
  return box;
}

function imageExt(buf) {
  if (!buf || buf.length < 4) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return ".jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return ".png";
  return ".jpg";
}

function decodeNcm(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.subarray(0, 8).toString("binary") !== "CTENFDAM") {
    throw new Error("不是有效的 NCM 文件");
  }
  let off = 10; // 8 magic + 2 gap

  const keyLen = buf.readUInt32LE(off);
  off += 4;
  const keyData = Buffer.from(buf.subarray(off, off + keyLen));
  off += keyLen;
  for (let i = 0; i < keyData.length; i++) keyData[i] ^= 0x64;
  let deKey = pkcs7Strip(aesEcbDecryptNoPad(CORE_KEY, keyData)).subarray(17); // 去掉 "neteasecloudmusic"
  const box = buildKeyBox(deKey);

  const metaLen = buf.readUInt32LE(off);
  off += 4;
  let meta = null;
  if (metaLen > 0) {
    const metaData = Buffer.from(buf.subarray(off, off + metaLen));
    off += metaLen;
    for (let i = 0; i < metaData.length; i++) metaData[i] ^= 0x63;
    try {
      const b64 = metaData.subarray(22).toString("ascii"); // 去掉 "163 key(Don't modify):"
      const dec = Buffer.from(b64, "base64");
      let json = pkcs7Strip(aesEcbDecryptNoPad(META_KEY, dec)).toString("utf8");
      json = json.replace(/^music:/, "");
      meta = JSON.parse(json);
    } catch (e) {
      meta = null;
    }
  } else {
    off += 0;
  }

  off += 4; // crc32
  off += 5; // gap
  const imgLen = buf.readUInt32LE(off);
  off += 4;
  const imgData = imgLen > 0 ? Buffer.from(buf.subarray(off, off + imgLen)) : null;
  off += imgLen;

  const audioEnc = buf.subarray(off);
  const out = Buffer.alloc(audioEnc.length);
  for (let i = 0; i < audioEnc.length; i++) {
    const j = (i + 1) & 0xff;
    out[i] = audioEnc[i] ^ box[(box[j] + box[(box[j] + j) & 0xff]) & 0xff];
  }

  const format = (meta && meta.format) || "mp3";
  return { audio: out, format, image: imgData };
}

function main() {
  const dir = process.argv[2];
  const doDelete = process.argv.includes("--delete");
  if (!dir) {
    console.error("用法: node convert-ncm.cjs \"<目录>\" [--delete]");
    process.exit(1);
  }
  const coversDir = path.join(dir, "covers");

  const entries = fs.readdirSync(dir).filter((n) => n.toLowerCase().endsWith(".ncm"));
  let converted = 0;
  let skipped = 0;
  let deleted = 0;
  let failed = 0;

  for (const name of entries) {
    const base = name.slice(0, -4);
    const ncmPath = path.join(dir, name);
    const mp3Path = path.join(dir, base + ".mp3");
    const flacPath = path.join(dir, base + ".flac");
    const alreadyMp3 = fs.existsSync(mp3Path);
    const alreadyFlac = fs.existsSync(flacPath);

    try {
      let outPath;
      if (alreadyMp3 || alreadyFlac) {
        skipped++;
        outPath = alreadyFlac ? flacPath : mp3Path;
        // 已有音频但封面可能缺，补抽封面
        ensureCover(ncmPath, base, coversDir);
      } else {
        const { audio, format, image } = decodeNcm(ncmPath);
        outPath = path.join(dir, base + "." + format);
        fs.writeFileSync(outPath, audio);
        if (image) {
          fs.mkdirSync(coversDir, { recursive: true });
          fs.writeFileSync(path.join(coversDir, base + imageExt(image)), image);
        }
        converted++;
        console.log("转换: " + base + "." + format + "  (" + (audio.length / 1048576).toFixed(1) + " MB)");
      }

      if (doDelete) {
        const st = fs.statSync(outPath);
        if (st.size > 102400) {
          fs.unlinkSync(ncmPath);
          deleted++;
        } else {
          console.warn("跳过删除(输出过小): " + name);
        }
      }
    } catch (e) {
      failed++;
      console.error("失败: " + name + " -> " + e.message);
    }
  }

  console.log("\n==== 完成 ====");
  console.log("新转换: " + converted + " | 已存在跳过: " + skipped + " | 删除 ncm: " + deleted + " | 失败: " + failed);
}

function ensureCover(ncmPath, base, coversDir) {
  const jpg = path.join(coversDir, base + ".jpg");
  const png = path.join(coversDir, base + ".png");
  if (fs.existsSync(jpg) || fs.existsSync(png)) return;
  try {
    const { image } = decodeNcm(ncmPath);
    if (image) {
      fs.mkdirSync(coversDir, { recursive: true });
      fs.writeFileSync(path.join(coversDir, base + imageExt(image)), image);
    }
  } catch (e) {
    /* 忽略封面抽取失败 */
  }
}

main();
