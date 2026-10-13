const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const port = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'apps/web/dist');
const apiTarget = 'http://localhost:4000';

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api')) {
    const apiUrl = new URL(req.url, apiTarget);
    const options = {
      hostname: apiUrl.hostname,
      port: apiUrl.port,
      path: apiUrl.pathname + apiUrl.search,
      method: req.method,
      headers: req.headers
    };
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });
    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err);
      res.writeHead(502);
      res.end('Bad Gateway');
    });
    req.pipe(proxyReq, { end: true });
  } else {
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
  }
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
