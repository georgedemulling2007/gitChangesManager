// Thin wrappers over the existing Node backend endpoints.

const parts = p => p.split(/[\\/]/);
// Trailing `n` path segments joined with '/'.
const suffix = (segs, n) => segs.slice(-n).join('/');

// For each file show the shortest trailing path suffix that is unique among all
// files — just the name when that's unambiguous, otherwise as much of the path
// as needed to tell duplicates apart.
function addDisplayNames(files) {
  const segLists = files.map(f => parts(f.path));
  files.forEach((f, i) => {
    const segs = segLists[i];
    let n = 1;
    while (n < segs.length) {
      const me = suffix(segs, n);
      const clash = segLists.some((other, j) => j !== i && suffix(other, n) === me);
      if (!clash) break;
      n++;
    }
    f.displayName = suffix(segs, n);
  });
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
