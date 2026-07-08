/* Math Weakness Hybrid AI Bridge Client v1.0
 * Browser client. Do not place OpenAI API keys here.
 * This client talks only to your Cloudflare Worker.
 */
class MathAIBridgeClient {
  constructor(options = {}) {
    this.workerBaseUrl = (options.workerBaseUrl || '').replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs || 120000;
  }
  setWorkerBaseUrl(url) { this.workerBaseUrl = (url || '').replace(/\/$/, ''); }
  hasWorker() { return Boolean(this.workerBaseUrl); }
  async health() {
    if (!this.hasWorker()) return { ok: false, error: 'workerBaseUrl is empty' };
    return this._jsonFetch('/health', { method: 'GET' });
  }
  async analyze(payload, files = []) {
    return this._sendHybridRequest('/api/math-diagnose/analyze', payload, files);
  }
  async generateVerification(payload) {
    return this._jsonFetch('/api/math-diagnose/generate-verification', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
  }
  async reviewVerification(payload, files = []) {
    return this._sendHybridRequest('/api/math-diagnose/review-verification', payload, files);
  }
  async finalReport(payload) {
    return this._jsonFetch('/api/math-diagnose/final-report', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
  }
  async _sendHybridRequest(path, payload, files) {
    if (!this.hasWorker()) throw new Error('Cloudflare Worker URL이 비어 있습니다.');
    const form = new FormData();
    form.append('payload', JSON.stringify(payload || {}));
    Array.from(files || []).forEach((file, idx) => form.append(`file_${idx + 1}`, file, file.name));
    return this._jsonFetch(path, { method: 'POST', body: form });
  }
  async _jsonFetch(path, init) {
    if (!this.hasWorker()) throw new Error('Cloudflare Worker URL이 비어 있습니다.');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.workerBaseUrl}${path}`, { ...init, signal: ctrl.signal });
      const text = await res.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; } catch { data = { ok: false, raw: text }; }
      if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
      return data;
    } finally {
      clearTimeout(timer);
    }
  }
}
window.MathAIBridgeClient = MathAIBridgeClient;
