// Thin wrappers over the existing Node backend endpoints.

const parts = p => p.split(/[\\/]/);
const basename = p => parts(p).pop();
// "folder/file" — last folder + file name; just the file if there is no folder.
const withParent = p => parts(p).slice(-2).join('/');

// Show only the file name, unless another file shares it; then prefix its folder.
function addDisplayNames(files) {
  const counts = {};
  files.forEach(f => { const b = basename(f.path); counts[b] = (counts[b] || 0) + 1; });
  files.forEach(f => { f.displayName = counts[basename(f.path)] > 1 ? withParent(f.path) : basename(f.path); });
  return files;
}

export async function fetchStatus(repo) {
  const res = await fetch('/api/status?repo=' + encodeURIComponent(repo));
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load repository.');
  addDisplayNames(data.files);
  return data;
}

export async function setCategory(repo, path, category) {
  const res = await fetch('/api/category', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo, path, category }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to save category.');
  }
}
