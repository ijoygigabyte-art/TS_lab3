// ============================================================
// narrator.js — Beat Sequencer & Text Controller
// Manages narration panel text, timing, and Continue button
// ============================================================

export const narrator = {
  _textEl: null,
  _continueBtn: null,
  _continueResolve: null,
  _sceneTitleEl: null,

  /**
   * Store references to DOM elements.
   */
  init(elements) {
    this._textEl = elements.textEl;
    this._continueBtn = elements.continueBtn;
    this._sceneTitleEl = elements.sceneTitleEl;

    // Continue button click handler
    this._continueBtn.addEventListener('click', () => {
      if (this._continueResolve) {
        this._continueResolve();
        this._continueResolve = null;
      }
    });
  },

  /**
   * Show a beat's narration, trigger speech, and wait for Continue.
   * Returns a Promise that resolves when user clicks Continue.
   */
  async showBeat(beat, audio, avatar) {
    // 1. Hide continue button
    this.hideContinue();

    // 2. Fade out current text
    if (this._textEl.textContent) {
      this._textEl.classList.add('fading');
      await this._delay(200);
    }

    // 3. Set new text (with simple markup support)
    this._textEl.innerHTML = this._formatText(beat.narration || '');
    this._textEl.classList.remove('fading');

    // 4. Trigger speech + set avatar to speaking
    if (beat.narration) {
      avatar.setState('speaking');
      await audio.speak(beat.narration, beat.audioId);
      avatar.setState('idle');
    }

    // 5. Run the beat's action (canvas animation, etc.)
    if (beat.action) {
      avatar.setState('thinking');
      await beat.action();
      avatar.setState('idle');
    }

    // 6. Show continue button and wait for click
    return this._waitForContinue();
  },

  /**
   * Show beat with action running concurrently with speech.
   * Used when narration accompanies an animation.
   */
  async showBeatParallel(beat, audio, avatar) {
    this.hideContinue();

    // Fade out current text
    if (this._textEl.textContent) {
      this._textEl.classList.add('fading');
      await this._delay(200);
    }

    // Set new text
    this._textEl.innerHTML = this._formatText(beat.narration || '');
    this._textEl.classList.remove('fading');

    // Run speech and action in parallel
    const promises = [];
    if (beat.narration) {
      avatar.setState('speaking');
      promises.push(audio.speak(beat.narration, beat.audioId).then(() => {
        avatar.setState('idle');
      }));
    }
    if (beat.action) {
      promises.push(beat.action());
    }

    await Promise.all(promises);

    return this._waitForContinue();
  },

  /**
   * Set the scene title above narration.
   */
  setSceneTitle(title) {
    if (this._sceneTitleEl) {
      this._sceneTitleEl.textContent = title;
    }
  },

  /**
   * Hide the continue button.
   */
  hideContinue() {
    if (this._continueBtn) {
      this._continueBtn.classList.remove('visible');
    }
  },

  /**
   * Show the continue button.
   */
  showContinue() {
    if (this._continueBtn) {
      this._continueBtn.classList.add('visible');
    }
  },

  /**
   * Display a formula in the narration panel.
   */
  showFormula(formulaText) {
    if (!this._textEl) return;
    const formulaEl = document.createElement('div');
    formulaEl.className = 'formula';
    formulaEl.style.fontFamily = 'var(--font-mono)';
    formulaEl.style.fontSize = '1.1rem';
    formulaEl.style.margin = '12px 0';
    formulaEl.style.color = 'var(--text-primary)';
    formulaEl.textContent = formulaText;
    this._textEl.appendChild(formulaEl);
  },

  /**
   * Clear all narration text and hide continue.
   */
  clear() {
    if (this._textEl) {
      this._textEl.innerHTML = '';
      this._textEl.classList.remove('fading');
    }
    this.hideContinue();
  },

  // --- Internal helpers ---

  _waitForContinue() {
    this.showContinue();
    return new Promise((resolve) => {
      this._continueResolve = resolve;
    });
  },

  /**
   * Simple markup: *text* → <em>, `code` → <code class="formula">
   */
  _formatText(text) {
    if (!text) return '';
    return text
      .replace(/`([^`]+)`/g, '<code class="formula">$1</code>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  },

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};
