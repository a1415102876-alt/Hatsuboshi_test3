"use strict";
// 扫描 PlayList 目录，解析歌名/歌手、匹配封面，生成 playlist-data.js
// 用法: node generate-playlist.cjs
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PLAYLIST_DIR = path.join(ROOT, "assets", "PlayList");
const COVERS_DIR = path.join(PLAYLIST_DIR, "covers");
const OUT_FILE = path.join(ROOT, "playlist-data.js");

const LABEL = "初星学園";

function parseName(base) {
  const parts = base.split(" - ");
  let title = base;
  let artist = "";
  if (parts.length >= 2) {
    title = parts[parts.length - 1].trim();
    const left = parts.slice(0, -1).join(" - ");
    const names = left.split(",").map((s) => s.trim()).filter(Boolean);
    const singers = names.filter((n) => n !== LABEL);
    artist = (singers.length ? singers : names).join(" / ");
  }
  return { title, artist: artist || LABEL };
}

// 返回相对 R2 桶根的 key（桶里是同名 PlayList 文件夹）。播放器运行时拼 MUSIC_CDN。
function findCover(base) {
  for (const ext of [".jpg", ".png", ".jpeg", ".webp"]) {
    if (fs.existsSync(path.join(COVERS_DIR, base + ext))) {
      return "PlayList/covers/" + base + ext;
    }
  }
  return "";
}

function main() {
  const files = fs
    .readdirSync(PLAYLIST_DIR)
    .filter((n) => /\.(mp3|flac|m4a|ogg)$/i.test(n))
    .sort((a, b) => a.localeCompare(b, "ja"));

  const tracks = files.map((file) => {
    const base = file.replace(/\.[^.]+$/, "");
    const { title, artist } = parseName(base);
    return {
      title,
      artist,
      file: "PlayList/" + file,
      cover: findCover(base)
    };
  });

  const banner = "// 自动生成，请勿手改。重新生成: node generate-playlist.cjs\n";
  fs.writeFileSync(OUT_FILE, banner + "window.HATSU_TRACKS = " + JSON.stringify(tracks, null, 2) + ";\n", "utf8");
  console.log("生成 " + tracks.length + " 首 -> playlist-data.js");
  console.log("有封面: " + tracks.filter((t) => t.cover).length + " / " + tracks.length);

  patchAppJs(tracks);
}

// 把歌单以相对 R2 桶根的 key（PlayList/...）内嵌进 app.js 的标记块。
// 运行时由 MUSIC_CDN 拼成完整地址；不再走 ./assets，避免 st.html 把它重写成本地路径。
function patchAppJs(tracks) {
  const appPath = path.join(ROOT, "app.js");
  if (!fs.existsSync(appPath)) { console.log("未找到 app.js，跳过内嵌"); return; }
  const START = "// === HATSU_MUSIC_TRACKS_START ===";
  const END = "// === HATSU_MUSIC_TRACKS_END ===";
  let src = fs.readFileSync(appPath, "utf8");
  if (!src.includes(START) || !src.includes(END)) { console.log("app.js 缺少标记块，跳过内嵌"); return; }

  const lines = tracks.map((t) => {
    const file = t.file;
    const cover = t.cover || "";
    return "    { title: " + JSON.stringify(t.title) +
      ", artist: " + JSON.stringify(t.artist) +
      ", file: " + JSON.stringify(file) +
      ", cover: " + JSON.stringify(cover) + " }";
  }).join(",\n");

  const block = START + "\n  const phoneMusicTracks = [\n" + lines + "\n  ];\n  " + END;
  const re = new RegExp(START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\s\\S]*?" + END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  src = src.replace(re, block);
  fs.writeFileSync(appPath, src, "utf8");
  console.log("已内嵌歌单到 app.js（" + tracks.length + " 首）");
}

main();
