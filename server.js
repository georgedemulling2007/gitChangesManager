// Local-only Git Changes Manager — zero dependencies, Node built-ins only.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const STORE_FILE = path.join(__dirname, 'categories.json');
const ALLOWED_CATEGORIES = ['reviewed', 'needs-review', 'ignore', ''];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

// --- storage -----------------------------------------------------------------
// Shape: { [repo]: { categories: {path: category}, order: [path, ...] } }
function loadStore() {
  try {
    return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveStore(data) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2));
}

// Normalize a repo entry, tolerating the older flat {path: category} shape.
function repoEntry(store, repo) {
  const e = store[repo];
  if (!e) return { categories: {}, order: [] };
  if (e.categories || e.order) return { categories: e.categories || {}, order: e.order || [] };
  return { categories: e, order: [] };
}

// --- git status --------------------------------------------------------------
// Map a porcelain status code to a human label.
function statusLabel(index, work) {
  if (index === '?' && work === '?') return 'Untracked';
  if (index === 'R' || work === 'R') return 'Renamed';
  const c = index !== ' ' && index !== '?' ? index : work;
  return { A: 'Added', M: 'Modified', D: 'Deleted', C: 'Copied', U: 'Conflicted' }[c] || 'Changed';
}

// Parse NUL-separated `git status --porcelain=v1 -z` output.
function parseStatus(out) {
  const parts = out.split('\0');
  const files = [];
  for (let i = 0; i < parts.length; i++) {
    const entry = parts[i];
    if (!entry) continue;
    const index = entry[0];
    const work = entry[1];
    let file = entry.slice(3);
    // Rename/copy entries are followed by the original path in the next field.
    if (index === 'R' || index === 'C') i++;
    files.push({ path: file, indexStatus: index, worktreeStatus: work, label: statusLabel(index, work) });
  }
  return files;
}

function gitStatus(repo, cb) {
  execFile('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'],
    { cwd: repo, windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
    (err, stdout, stderr) => {
      if (err) {
        if (err.code === 'ENOENT') return cb({ status: 500, message: 'git not found on PATH. Install Git and ensure `git --version` works.' });
        const msg = /not a git repository/i.test(stderr) ? 'That path is not a Git repository.' : (stderr.trim() || err.message);
        return cb({ status: 400, message: msg });
      }
      cb(null, parseStatus(stdout));
    });
}

// --- helpers -----------------------------------------------------------------
function sendJSON(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function serveStatic(req, res) {
  let rel = req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]);
  const filePath = path.join(PUBLIC_DIR, path.normalize(rel));
  if (!filePath.startsWith(PUBLIC_DIR)) return sendJSON(res, 403, { error: 'Forbidden' });
  fs.readFile(filePath, (err, data) => {
    if (err) return sendJSON(res, 404, { error: 'Not found' });
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
}

// --- server ------------------------------------------------------------------
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname === '/api/status') {
    const repo = url.searchParams.get('repo');
    if (!repo) return sendJSON(res, 400, { error: 'Missing repo path.' });
    if (!fs.existsSync(repo)) return sendJSON(res, 400, { error: 'Path does not exist on this machine.' });
    gitStatus(repo, (e, files) => {
      if (e) return sendJSON(res, e.status, { error: e.message });
      const { categories, order } = repoEntry(loadStore(), repo);
      files.forEach(f => { f.category = categories[f.path] || ''; });
      // Sort by saved order; files with no saved order keep git order at the end.
      const rank = new Map(order.map((p, i) => [p, i]));
      files.sort((a, b) => (rank.has(a.path) ? rank.get(a.path) : Infinity) -
                           (rank.has(b.path) ? rank.get(b.path) : Infinity));
      sendJSON(res, 200, { repo, files });
    });
    return;
  }

  // Save the whole board at once: category per file + the global file order.
  if (req.method === 'POST' && url.pathname === '/api/board') {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      let parsed;
      try { parsed = JSON.parse(body); } catch { return sendJSON(res, 400, { error: 'Invalid JSON.' }); }
      const { repo, order } = parsed;
      if (!repo || !Array.isArray(order)) return sendJSON(res, 400, { error: 'repo and order[] are required.' });
      const categories = {};
      for (const item of order) {
        if (!item || typeof item.path !== 'string') return sendJSON(res, 400, { error: 'Invalid order item.' });
        if (!ALLOWED_CATEGORIES.includes(item.category)) return sendJSON(res, 400, { error: 'Invalid category.' });
        if (item.category) categories[item.path] = item.category;
      }
      const store = loadStore();
      store[repo] = { categories, order: order.map(i => i.path) };
      saveStore(store);
      sendJSON(res, 200, { ok: true });
    });
    return;
  }

  if (req.method === 'GET') return serveStatic(req, res);
  sendJSON(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => console.log(`Git Changes Manager running at http://localhost:${PORT}`));
