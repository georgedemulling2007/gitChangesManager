// Thin wrappers over the existing Node backend endpoints.

export async function fetchStatus(repo) {
  const res = await fetch('/api/status?repo=' + encodeURIComponent(repo));
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load repository.');
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
