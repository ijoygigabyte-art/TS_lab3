// ============================================================
// avatar.js — Orb Rendering & Animation
// Controls the floating orb's visual state
// ============================================================

export const avatar = {
  _orbEl: null,
  _state: 'idle',

  /**
   * Store reference to the .orb element.
   */
  init(orbEl) {
    this._orbEl = orbEl;
    this.setState('idle');
  },

  /**
   * Set the orb's visual state.
   * state: 'idle' | 'speaking' | 'thinking'
   */
  setState(state) {
    if (!this._orbEl) return;
    this._state = state;

    // Remove all state classes
    this._orbEl.classList.remove('orb--speaking', 'orb--thinking', 'orb--hidden');

    switch (state) {
      case 'speaking':
        this._orbEl.classList.add('orb--speaking');
        break;
      case 'thinking':
        this._orbEl.classList.add('orb--thinking');
        break;
      case 'idle':
      default:
        // Default .orb class handles idle float
        break;
    }
  },

  /**
   * Quick zip animation for scene transitions.
   * Returns a Promise that resolves when animation completes.
   */
  async transitionScene() {
    if (!this._orbEl) return;

    // Scale down, then back up
    const animation = this._orbEl.animate([
      { transform: 'translateY(0) scale(1)', opacity: 1 },
      { transform: 'translateY(10px) scale(0.3)', opacity: 0.3 },
      { transform: 'translateY(-5px) scale(1.1)', opacity: 1 },
      { transform: 'translateY(0) scale(1)', opacity: 1 }
    ], {
      duration: 400,
      easing: 'ease-in-out',
      fill: 'forwards'
    });

    return animation.finished;
  },

  /**
   * Trigger a single pulse (manual sync with speech).
   */
  pulse() {
    if (!this._orbEl) return;
    this._orbEl.animate([
      { boxShadow: '0 0 20px rgba(200,169,110,0.35), 0 0 40px rgba(200,169,110,0.15)' },
      { boxShadow: '0 0 35px rgba(200,169,110,0.6), 0 0 60px rgba(200,169,110,0.3)' },
      { boxShadow: '0 0 20px rgba(200,169,110,0.35), 0 0 40px rgba(200,169,110,0.15)' }
    ], {
      duration: 300,
      easing: 'ease-in-out'
    });
  },

  /**
   * Fade out the orb.
   */
  hide() {
    if (!this._orbEl) return;
    this._orbEl.classList.add('orb--hidden');
  },

  /**
   * Fade in the orb.
   */
  show() {
    if (!this._orbEl) return;
    this._orbEl.classList.remove('orb--hidden');
  }
};
