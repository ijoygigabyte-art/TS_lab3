// ============================================================
// ai.js — Aggressive Pre-fetching Engine
// Prefetches ALL beats for an entire scene at once.
// ============================================================

export const AI = {
  _cache: new Map(),
  _loading: false,
  _loadProgress: { done: 0, total: 0 },

  /**
   * Prefetch ALL narration beats for an entire scene at once.
   * Returns a promise that resolves when at least the first beat is ready.
   */
  async prefetchScene(beats) {
    const narratedBeats = beats.filter(b => b.narration);
    this._loadProgress = { done: 0, total: narratedBeats.length };
    this._loading = true;

    // Fire ALL requests in parallel
    const promises = narratedBeats.map((beat, i) => {
      const prevContext = i > 0 ? narratedBeats[i - 1].narration : 'Start of scene';
      return this._fetchBeat(beat.narration, prevContext);
    });

    // Wait for at least the first 2 beats (or all if fewer)
    const minReady = Math.min(2, promises.length);
    await Promise.all(promises.slice(0, minReady));
    
    this._loading = false;
    
    // Let the rest resolve in the background
    Promise.all(promises).catch(() => {});
  },

  _fetchBeat(directive, previousContext) {
    if (this._cache.has(directive)) return this._cache.get(directive);

    const promise = fetch('/api/generate-beat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ directive, previousContext })
    })
    .then(res => {
      if (!res.ok) throw new Error(`API error ${res.status}`);
      return res.json();
    })
    .then(data => {
      this._loadProgress.done++;
      this._updateLoadingUI();
      return data;
    })
    .catch(err => {
      console.warn('AI fetch failed:', err.message);
      this._loadProgress.done++;
      this._updateLoadingUI();
      return null;
    });

    this._cache.set(directive, promise);
    return promise;
  },

  _updateLoadingUI() {
    const el = document.getElementById('preload-progress');
    if (el) {
      const pct = Math.round((this._loadProgress.done / this._loadProgress.total) * 100);
      el.style.width = pct + '%';
    }
  },

  /**
   * Get a beat (instant if pre-fetched, otherwise fetches now)
   */
  async getBeat(directive, previousContext = '') {
    if (!directive) return null;
    if (!this._cache.has(directive)) {
      this._fetchBeat(directive, previousContext);
    }
    return await this._cache.get(directive);
  },

  /**
   * Clear cache when switching scenes
   */
  clearCache() {
    this._cache.clear();
    this._loadProgress = { done: 0, total: 0 };
  }
};
