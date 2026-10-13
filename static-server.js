const http = require('http');
const fs = require('fs');
const path = require('path');
const port = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'apps/web/dist');
const server = http.createServer((req, res) => {
  let filePath = path.join(distPath, req.url === '/' ? 'index.html' : req.url);
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(distPath, 'index.html');
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading file');
      }
      const ext = path.extname(filePath);
      const contentType = ext === '.html' ? 'text/html' : ext === '.css' ? 'text/css' : ext === '.js' ? 'application/javascript' : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
});
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
