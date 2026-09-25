// ============================================================
// audio.js — Hybrid Audio Engine
// Supports pre-recorded MP3s with Web Speech API fallback
// ============================================================

export const audio = {
  _audioCtx: null,
  _muted: false,
  _currentUtterance: null,
  _currentAudioElement: null,
  _speakResolve: null,

  init() {
    if (!this._audioCtx) {
      try {
        this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.warn('Web Audio API not available:', e);
      }
    }
    if (this._audioCtx && this._audioCtx.state === 'suspended') {
      this._audioCtx.resume();
    }
  },

  /**
   * Speak text aloud.
   * If audioId is provided, attempts to load audio/{audioId}.mp3.
   * Falls back to Web Speech API if it fails or audioId is omitted.
   */
  async speak(text, audioId = null) {
    if (this._muted) {
      await this._delay(Math.min(text.length * 35, 3000));
      return 'completed';
    }

    this.cancelSpeech();

    return new Promise(async (resolve) => {
      this._speakResolve = resolve;

      try {
        if (audioId) {
          const success = await this._playMP3(audioId);
          if (success) {
            if (this._speakResolve === resolve) {
              this._speakResolve = null;
              resolve('completed');
            }
            return;
          }
        }
        
        // Fallback: Generate high-quality audio on the fly via Gemini TTS
        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
          });
          
          if (this._speakResolve !== resolve) return;
          
          const data = await res.json();
          if (data.audioUrl) {
            try {
              if (this._audioCtx && this._audioCtx.state === 'suspended') {
                this._audioCtx.resume().catch(e => console.warn('resume failed', e));
              }
              
              const audioRes = await fetch(data.audioUrl);
              const arrayBuffer = await audioRes.arrayBuffer();
              const audioBuffer = await this._audioCtx.decodeAudioData(arrayBuffer);
              
              const source = this._audioCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.playbackRate.value = 1.05; // slightly faster
              source.connect(this._audioCtx.destination);
              
              source.onended = () => {
                this._currentAudioSource = null;
                if (this._speakResolve === resolve) {
                  this._speakResolve = null;
                  resolve('completed');
                }
              };
              
              this._currentAudioSource = source;
              source.start();
            } catch (e) {
              console.error('AudioContext decode failed:', e);
              this._playWebSpeech(text, resolve);
            }
          } else {
            this._playWebSpeech(text, resolve);
          }
        } catch (err) {
          if (this._speakResolve === resolve) {
            this._playWebSpeech(text, resolve);
          }
        }
      } catch (fatalErr) {
        console.error('Fatal error in speak():', fatalErr);
        if (this._speakResolve === resolve) {
          this._speakResolve = null;
          resolve('error');
        }
      }
    });
  },

  /**
   * Speak dynamically generated audio from a Data URL (base64)
   */
  async speakDynamic(audioUrl) {
    if (this._muted) return 'completed';
    this.cancelSpeech();

    return new Promise(async (resolve) => {
      this._speakResolve = resolve;
      
      try {
        if (this._audioCtx && this._audioCtx.state === 'suspended') {
          this._audioCtx.resume().catch(e => console.warn('resume failed', e));
        }
        
        const audioRes = await fetch(audioUrl);
        const arrayBuffer = await audioRes.arrayBuffer();
        const audioBuffer = await this._audioCtx.decodeAudioData(arrayBuffer);
        
        const source = this._audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = 1.15; // Cartoon Avatar Effect: Play 15% faster
        
        source.connect(this._audioCtx.destination);
        
        source.onended = () => {
          this._currentAudioSource = null;
          resolve('completed');
        };
        
        this._currentAudioSource = source;
        source.start();
      } catch (err) {
        console.error('Failed to play dynamic audio via AudioContext:', err);
        this._currentAudioSource = null;
        resolve('error');
      }
    });
  },

  _playMP3(audioId) {
    return new Promise(resolve => {
      const el = new Audio(`audio/${audioId}.wav`);
      
      // Cartoon Avatar Effect: Play 15% faster and pitch it up!
      el.playbackRate = 1.15;
      if ('preservesPitch' in el) {
        el.preservesPitch = false; 
      } else if ('mozPreservesPitch' in el) {
        el.mozPreservesPitch = false;
      }
      
      el.onended = () => {
        this._currentAudioElement = null;
        resolve(true);
      };

      el.onerror = () => {
        console.warn(`Could not load audio/${audioId}.mp3. Falling back to TTS.`);
        this._currentAudioElement = null;
        resolve(false);
      };

      el.play().then(() => {
        this._currentAudioElement = el;
      }).catch(err => {
        console.warn(`Autoplay blocked or file error for ${audioId}.mp3`, err);
        resolve(false);
      });
    });
  },

  _playWebSpeech(text, resolve) {
    if (!window.speechSynthesis) {
      resolve('completed');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    // Find the highest quality voice available
    const voices = speechSynthesis.getVoices();
    // Prefer Google, Microsoft, or premium OS voices over basic ones
    const premiumVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.includes('Google') || v.name.includes('Siri') || v.name.includes('Premium'))
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

    if (premiumVoice) utterance.voice = premiumVoice;
    
    // slightly more natural pacing, less cartoonish
    utterance.pitch = 1.0;
    utterance.rate = 1.05;
    utterance.volume = 0.9;

    let fallbackTimeout;

    utterance.onend = () => {
      clearTimeout(fallbackTimeout);
      this._currentUtterance = null;
      if (this._speakResolve) {
        const r = this._speakResolve;
        this._speakResolve = null;
        r('completed');
      }
    };

    utterance.onerror = () => {
      clearTimeout(fallbackTimeout);
      this._currentUtterance = null;
      if (this._speakResolve) {
        const r = this._speakResolve;
        this._speakResolve = null;
        r('error');
      }
    };

    this._currentUtterance = utterance;
    speechSynthesis.speak(utterance);
    
    // Fallback: Web Speech API sometimes randomly hangs on Windows/Chrome and never fires onend.
    // Force resolve it based on text length + a buffer.
    const maxDuration = (text.length * 75) + 3000;
    fallbackTimeout = setTimeout(() => {
      if (this._speakResolve) {
        console.warn('SpeechSynthesis onend failed to fire. Force resolving.');
        utterance.onend();
      }
    }, maxDuration);
  },

  cancelSpeech() {
    if (this._currentAudioElement) {
      this._currentAudioElement.pause();
      this._currentAudioElement.currentTime = 0;
      this._currentAudioElement = null;
    }
    if (this._currentAudioSource) {
      this._currentAudioSource.stop();
      this._currentAudioSource.disconnect();
      this._currentAudioSource = null;
    }
    if (window.speechSynthesis) {
      speechSynthesis.cancel();
    }
    if (this._speakResolve) {
      this._speakResolve('skipped');
      this._speakResolve = null;
    }
    this._currentUtterance = null;
  },

  playSFX(type) {
    if (this._muted || !this._audioCtx) return;
    if (this._audioCtx.state === 'suspended') this._audioCtx.resume();

    switch (type) {
      case 'click': this._playTone(800, 50, 0.15); break;
      case 'chime':
        this._playTone(523.25, 80, 0.12);
        setTimeout(() => this._playTone(659.25, 80, 0.12), 90);
        setTimeout(() => this._playTone(783.99, 80, 0.12), 180);
        break;
      case 'tick': this._playNoise(20, 0.08); break;
      case 'ding': this._playTone(1046.5, 300, 0.15); break;
      case 'chirp':
        this._playTone(783.99, 60, 0.12);
        setTimeout(() => this._playTone(1046.5, 60, 0.12), 70);
        break;
    }
  },

  toggleMute() {
    this._muted = !this._muted;
    if (this._muted) this.cancelSpeech();
    return this._muted;
  },

  get isMuted() { return this._muted; },

  _playTone(freq, durationMs, gain, type = 'sine') {
    if (!this._audioCtx) return;
    const ctx = this._audioCtx;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    gainNode.gain.setValueAtTime(gain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

    osc.connect(gainNode).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durationMs / 1000 + 0.05);
  },

  _playNoise(durationMs, gain) {
    if (!this._audioCtx) return;
    const ctx = this._audioCtx;
    const bufferSize = ctx.sampleRate * (durationMs / 1000);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(gain, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    source.connect(gainNode).connect(ctx.destination);
    source.start(ctx.currentTime);
    source.stop(ctx.currentTime + durationMs / 1000 + 0.05);
  },

  _delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
};
