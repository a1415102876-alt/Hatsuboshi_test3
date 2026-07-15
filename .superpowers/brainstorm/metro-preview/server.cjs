const http = require('http');
const fs = require('fs');
const path = require('path');
const root = process.env.PREVIEW_ROOT;
const port = Number(process.env.PREVIEW_PORT || 49326);
const host = '127.0.0.1';
const server = http.createServer((req, res) => {
  const file = path.join(root, 'index.html');
  res.writeHead(200, {'content-type':'text/html; charset=utf-8'});
  res.end(fs.readFileSync(file));
});
server.listen(port, host, () => console.log(`preview:http://localhost:${port}`));
