const fs = require('fs');
const path = require('path');
const dir = 'F:/SillyTavern/SillyTavern/data/default-user/chats';
const subdirs = fs.readdirSync(dir);
let latestFile = null;
let latestTime = 0;

for (const s of subdirs) {
  const subdirPath = path.join(dir, s);
  if (fs.statSync(subdirPath).isDirectory()) {
    const files = fs.readdirSync(subdirPath);
    for (const f of files) {
      if (f.endsWith('.jsonl')) {
        const filePath = path.join(subdirPath, f);
        const mtime = fs.statSync(filePath).mtimeMs;
        if (mtime > latestTime) {
          latestTime = mtime;
          latestFile = filePath;
        }
      }
    }
  }
}

console.log("Reading latest file:", latestFile);
const content = fs.readFileSync(latestFile, 'utf8').trim();
const lines = content.split('\n');
const lastLine = lines[lines.length - 1];
const data = JSON.parse(lastLine);
console.log("Message raw content (last 1000 chars):");
console.log(data.mes.slice(-1000));
