/* Math Weakness Hybrid AI Bridge Client v1.2
 * Browser client. Do not place OpenAI API keys here.
 * This client talks only to your Cloudflare Worker.
 */
class MathAIBridgeClient {
  constructor(options = {}) {
    this.storageKey = options.storageKey || 'mathDiagnosisWorkerUrl';
    this.legacyStorageKeys = options.legacyStorageKeys || ['mweWorkerUrl', 'mathWeaknessWorkerUrl'];
    // 1차 진단은 이미지·PDF 판독 + adaptive thinking이 붙는 비스트리밍 호출이라
    // 2분으로는 부족하다. Worker 쪽 effort/max_tokens를 낮춰도 여유가 필요하다.
    this.timeoutMs = options.timeoutMs || 300000;
    this.workerBaseUrl = this._normalizeBaseUrl(options.workerBaseUrl || this._loadSavedWorkerUrl() || '');
  }

  setWorkerBaseUrl(url, { save = true } = {}) {
    this.workerBaseUrl = this._normalizeBaseUrl(url || '');
    if (save) this.saveWorkerBaseUrl();
    return this.workerBaseUrl;
  }

  getWorkerBaseUrl() { return this.workerBaseUrl; }

  saveWorkerBaseUrl() {
    try {
      if (this.workerBaseUrl) {
        localStorage.setItem(this.storageKey, this.workerBaseUrl);
        this.legacyStorageKeys.forEach((key) => localStorage.setItem(key, this.workerBaseUrl));
      } else {
        localStorage.removeItem(this.storageKey);
        this.legacyStorageKeys.forEach((key) => localStorage.removeItem(key));
      }
    } catch (_) {}
    return this.workerBaseUrl;
  }

  clearWorkerBaseUrl() {
    this.workerBaseUrl = '';
    try {
      localStorage.removeItem(this.storageKey);
      this.legacyStorageKeys.forEach((key) => localStorage.removeItem(key));
    } catch (_) {}
  }

  hasWorker() { return Boolean(this.workerBaseUrl); }

  async health() {
    if (!this.hasWorker()) return { ok: false, error: 'workerBaseUrl is empty' };
    return this._jsonFetch('/health', { method: 'GET' });
  }

  async config() {
    if (!this.hasWorker()) return { ok: false, error: 'workerBaseUrl is empty' };
    return this._jsonFetch('/config', { method: 'GET' });
  }

  async analyze(payload, files = []) {
    return this._sendHybridRequest('/api/math-diagnose/analyze', payload, files);
  }

  async generateVerification(payload) {
    return this._jsonFetch('/api/math-diagnose/generate-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  async reviewVerification(payload, files = []) {
    return this._sendHybridRequest('/api/math-diagnose/review-verification', payload, files);
  }

  async finalReport(payload) {
    return this._jsonFetch('/api/math-diagnose/final-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  async _sendHybridRequest(path, payload, files) {
    if (!this.hasWorker()) throw new Error('Cloudflare Worker URL이 비어 있습니다. 먼저 Worker URL을 입력하고 저장하세요.');
    const form = new FormData();
    form.append('payload', JSON.stringify(payload || {}));
    Array.from(files || []).forEach((file, idx) => form.append(`file_${idx + 1}`, file, file.name));
    return this._jsonFetch(path, { method: 'POST', body: form });
  }

  async _jsonFetch(path, init = {}) {
    if (!this.hasWorker()) throw new Error('Cloudflare Worker URL이 비어 있습니다.');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const url = `${this.workerBaseUrl}${path}`;
      const res = await fetch(url, {
        ...init,
        signal: ctrl.signal,
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'math-weakness-engine-hybrid-ui',
          ...(init?.headers || {})
        }
      });
      const text = await res.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; } catch { data = { ok: false, raw: text }; }
      if (!res.ok) {
        const msg = data.error || data.message || data.raw || `HTTP ${res.status}`;
        throw new Error(`[Worker ${res.status}] ${msg}`);
      }
      return data;
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('Worker 응답 시간이 초과되었습니다. 파일 크기나 Worker 설정을 확인하세요.');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  _loadSavedWorkerUrl() {
    try {
      const primary = localStorage.getItem(this.storageKey);
      if (primary) return primary;
      for (const key of this.legacyStorageKeys) {
        const found = localStorage.getItem(key);
        if (found) return found;
      }
    } catch (_) {}
    return '';
  }

  _normalizeBaseUrl(url) {
    const v = String(url || '').trim().replace(/\/+$/, '');
    if (!v) return '';
    if (!/^https?:\/\//i.test(v)) return `https://${v}`.replace(/\/+$/, '');
    return v;
  }
}
window.MathAIBridgeClient = MathAIBridgeClient;
