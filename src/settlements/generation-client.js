/** Authenticated jobs. Facts are durable before this client is called. No AWS credentials here. */
export function createGenerationClient({ archive, baseUrl, getToken = () => '', fetcher = globalThis.fetch, now = () => Date.now() } = {}) {
  let active = false, nextAttempt = 0;
  const configured = typeof baseUrl === 'string' && /^https:\/\/[a-z0-9.-]+(?:\/[a-z0-9_-]+)*\/?$/i.test(baseUrl);
  async function request(path, init = {}) {
    const token = await getToken(); if (!token) throw new Error('Sign in to generate settlement chronicles.');
    const response = await fetcher(baseUrl.replace(/\/$/, '') + path, { ...init, headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Chronicle service returned ${response.status}.`);
    return response.json();
  }
  async function pump(worldId) {
    if (!configured || active || now() < nextAttempt || !await getToken()) return;
    active = true;
    try {
      const rows = await archive.list(worldId);
      // Budget-paused work is retried slowly; unknown billed invocations require operator reconciliation.
      const row = rows.find(r => ['queued', 'working'].includes(r.status)) ?? rows.find(r => r.status === 'pending') ?? rows.find(r => r.status === 'budget');
      if (!row) return;
      const stored = await archive.get(row.id);
      const result = ['pending', 'budget'].includes(row.status)
        ? await request('/v1/chronicles', { method: 'POST', body: JSON.stringify({ entry: stored.entry }) })
        : await request(`/v1/chronicles/${encodeURIComponent(stored.generation.jobId)}`);
      await archive.update(row.id, result);
      nextAttempt = now() + (result.status === 'budget' ? 60000 : 2500);
      return result.status !== row.status ? row.id : null;
    } catch { nextAttempt = now() + 30000; }
    finally { active = false; }
  }
  async function refresh(id) {
    const row = await archive.get(id);
    if (!row?.generation.jobId || !['ready', 'unknown', 'failed'].includes(row.generation.status) || (row.generation.status === 'ready' && (row.generation.imageExpiresAt ?? 0) > now() + 30000)) return row;
    try { await archive.update(id, await request('/v1/chronicles/' + encodeURIComponent(row.generation.jobId))); return archive.get(id); }
    catch { return row; }
  }
  return { pump, refresh, configured };
}
