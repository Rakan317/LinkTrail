const http = require('http');
const fs = require('fs');
const path = require('path');

async function traceRedirects(url, maxSteps = 10) {
  const chain = [];
  let current = url;
  for (let i = 0; i < maxSteps; i++) {
    chain.push(current);
    const response = await fetch(current, { method: 'HEAD', redirect: 'manual' });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) break;
      current = new URL(location, current).href;
    } else {
      break;
    }
  }
  return chain;
}

function serveIndex(res) {
  fs.readFile(path.join(__dirname, 'public', 'index.html'), (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Server error');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  if (parsedUrl.pathname === '/api/trace') {
    const target = parsedUrl.searchParams.get('url');
    if (!target) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'url query parameter required' }));
      return;
    }
    try {
      const chain = await traceRedirects(target, 10);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ chain }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  } else if (parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html') {
    serveIndex(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
