// ============================================================
// main.js — Fast Cinematic Engine with AI Interruptions
// Default lecture plays instantly from memory. User can interrupt.
// ============================================================

import { narrator } from './narrator.js';
import { avatar } from './avatar.js';
import { audio } from './audio.js';

import { scene0 } from './scenes/scene0.js';
import { scene1 } from './scenes/scene1.js';
import { scene2 } from './scenes/scene2.js';
import { scene3 } from './scenes/scene3.js';
import { scene4 } from './scenes/scene4.js';
import { scene5 } from './scenes/scene5.js';

class App {
  constructor() {
    this.scenes = [scene0, scene1, scene2, scene3, scene4, scene5];
    this.currentScene = 0;
    this.currentBeat = 0;
    this.maxVisited = 0;
    this._playing = false;
    this._audioInitialized = false;
    this._interrupted = false; // Is the tutor answering a question right now?
  }

  async init() {
    this.canvasZone = document.getElementById('canvas-zone');
    this.narrationText = document.getElementById('narration-text');
    this.sceneTitleEl = document.getElementById('scene-title');
    this.muteBtn = document.getElementById('mute-toggle');
    this.orbEl = document.getElementById('orb');
    this.appLayout = document.getElementById('app-layout');
    this.btnPlayPause = document.getElementById('btn-play-pause');
    this._isPaused = true;
    
    // Interrupt bar elements
    this.interruptInput = document.getElementById('interrupt-input');
    this.btnAsk = document.getElementById('btn-ask');

    narrator.init({
      textEl: this.narrationText,
      continueBtn: document.createElement('button'), // dummy
      sceneTitleEl: this.sceneTitleEl
    });
    avatar.init(this.orbEl);

    // --- PLAY / PAUSE LOGIC ---
    this.btnPlayPause.addEventListener('click', (e) => {
      e.stopPropagation();
      this._ensureAudio();
      
      if (document.body.classList.contains('app-startup')) {
        // First start
        document.body.classList.remove('app-startup');
        this._isPaused = false;
        this.btnPlayPause.textContent = '⏸ Pause';
        setTimeout(() => {
          this.playCurrentBeat();
        }, 1200);
        return;
      }

      this._isPaused = !this._isPaused;
      if (this._isPaused) {
        this.btnPlayPause.textContent = '▶ Play';
        audio.cancelSpeech();
        if (this._autoAdvanceTimeout) clearTimeout(this._autoAdvanceTimeout);
      } else {
        this.btnPlayPause.textContent = '⏸ Pause';
        // Resume from where we left off
        if (this._interrupted) {
          this.resumeLecture();
        } else {
          this.playCurrentBeat();
        }
      }
    });

    // --- INTERRUPT LOGIC ---
    const handleInterrupt = async () => {
      const question = this.interruptInput.value.trim();
      if (!question) return;
      
      this._ensureAudio();
      this._interrupted = true;
      this.interruptInput.value = '';
      this.interruptInput.disabled = true;
      this.btnAsk.disabled = true;

      // Pause current action
      const scene = this.scenes[this.currentScene];
      const currentText = scene.beats[this.currentBeat]?.narration || scene.title;
      
      // Stop current audio immediately if playing
      audio.cancelSpeech(); 
      
      // UI indicates AI thinking
      this.narrationText.innerHTML = `<i>Thinking about: "${question}"...</i>`;
      avatar.setState('thinking');

      try {
        const res = await fetch('/api/ask-tutor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, currentContext: currentText })
        });
        const data = await res.json();
        
        if (data.text) {
          this.narrationText.innerHTML = `<span style="color:var(--accent)">[Answer]</span> ${data.text}`;
          avatar.setState('speaking');
          if (data.audioUrl) {
            await audio.speakDynamic(data.audioUrl);
          }
        }
      } catch (err) {
        this.narrationText.innerHTML = `<i>Sorry, my AI brain is overloaded right now! Let's get back to the lesson.</i>`;
      }

      avatar.setState('idle');
      this.interruptInput.disabled = false;
      this.btnAsk.disabled = false;
      
      // Add a subtle hint that user should click to resume
      this.narrationText.innerHTML += `<br><br><span style="font-size:0.8rem; opacity:0.6; font-family:var(--font-mono)">[ Click anywhere to resume lecture ]</span>`;
      
      // Wait a moment before allowing un-interrupting so they don't accidentally skip immediately
      setTimeout(() => {
        this._interrupted = false;
      }, 500);
    };

    this.btnAsk.addEventListener('click', handleInterrupt);
    this.interruptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleInterrupt();
    });

    this.muteBtn.addEventListener('click', () => {
      this._ensureAudio();
      const muted = audio.toggleMute();
      this.muteBtn.textContent = muted ? '🔇' : '🔊';
    });

    this.bindKeyboard();

    // Start instantly on scene 0 (Waiting for user click to remove startup orb)
    const firstScene = this.scenes[0];
    firstScene.setup(this.canvasZone);
    this.currentScene = 0;
    this.currentBeat = 0;
    narrator.setSceneTitle(firstScene.title);
  }

  _ensureAudio() {
    if (!this._audioInitialized) {
      audio.init();
      this._audioInitialized = true;
    }
  }

  async goToScene(index) {
    if (index < 0 || index >= this.scenes.length) return;

    const oldScene = this.scenes[this.currentScene];
    if (oldScene.cleanup) oldScene.cleanup();

    this.canvasZone.classList.add('scene-exit');
    await this._delay(250);
    this.canvasZone.classList.remove('scene-exit');

    this.currentScene = index;
    this.currentBeat = 0;
    if (index > this.maxVisited) this.maxVisited = index;

    const newScene = this.scenes[index];
    newScene.setup(this.canvasZone);

    this.canvasZone.classList.add('scene-enter');
    setTimeout(() => this.canvasZone.classList.remove('scene-enter'), 300);

    avatar.transitionScene();
    this._ensureAudio();
    audio.playSFX('chime');

    narrator.clear();
    narrator.setSceneTitle(newScene.title);

    if (!this._isPaused) {
      this.playCurrentBeat();
    }
  }

  async advanceBeat() {
    // Stop any currently playing audio so the next beat can start fresh
    audio.cancelSpeech();

    const scene = this.scenes[this.currentScene];

    if (this.currentBeat < scene.beats.length - 1) {
      this.currentBeat++;
      if (this._isPaused) return;
      await this.playCurrentBeat();
    } else {
      if (this.currentScene < this.scenes.length - 1) {
        await this.goToScene(this.currentScene + 1);
      }
    }
  }

  async goBack() {
    audio.cancelSpeech();

    if (this.currentBeat > 0) {
      this.currentBeat--;
      const scene = this.scenes[this.currentScene];
      scene.cleanup();
      scene.setup(this.canvasZone);
      narrator.clear();

      for (let i = 0; i <= this.currentBeat; i++) {
        const beat = scene.beats[i];
        if (beat.narration) {
          this.narrationText.innerHTML = narrator._formatText(beat.narration);
        }
        if (beat.action && i < this.currentBeat) {
          await beat.action();
        }
      }
      await this.playCurrentBeat();
    } else if (this.currentScene > 0) {
      await this.goToScene(this.currentScene - 1);
    }
  }

  async playCurrentBeat() {
    this._playing = true;
    
    // Clear any pending auto-advance
    if (this._autoAdvanceTimeout) clearTimeout(this._autoAdvanceTimeout);
    
    // Generate a unique session ID for this playback instance
    this._currentPlaySession = (this._currentPlaySession || 0) + 1;
    const currentSession = this._currentPlaySession;

    const scene = this.scenes[this.currentScene];
    const beat = scene.beats[this.currentBeat];

    const zoomClass = this.currentBeat % 2 === 0 ? 'canvas-zoom-in' : 'canvas-zoom-out';
    this.canvasZone.classList.remove('canvas-zoom-in', 'canvas-zoom-out');
    void this.canvasZone.offsetWidth;
    this.canvasZone.classList.add(zoomClass);

    if (this.narrationText.textContent && beat.narration) {
      this.narrationText.classList.add('fading');
      await this._delay(150);
    }

    if (beat.narration) {
      this.narrationText.innerHTML = narrator._formatText(beat.narration);
      this.narrationText.classList.remove('fading');
    }

    const promises = [];

    // Play default fallback lecture from memory INSTANTLY
    if (beat.narration) {
      this._ensureAudio();
      avatar.setState('speaking');
      promises.push(
        audio.speak(beat.narration, beat.audioId).then(() => {
          if (!this._interrupted) avatar.setState('idle');
        })
      );
    }

    if (beat.action) {
      if (!beat.narration) avatar.setState('thinking');
      promises.push(
        Promise.resolve(beat.action()).then(() => {
          if (!beat.narration && !this._interrupted) avatar.setState('idle');
        })
      );
    }

    // Don't await the promises if we want it to be fully non-blocking,
    // but we await so we know when the beat "finishes" naturally.
    try {
      await Promise.all(promises);
    } catch (err) {
      console.warn("A beat promise rejected, forcing continuation:", err);
    }

    const isLastBeat = this.currentBeat === scene.beats.length - 1;
    const isLastScene = this.currentScene === this.scenes.length - 1;

    if (isLastBeat && !isLastScene && !this._interrupted) {
      audio.playSFX('ding');
    }

    // Auto-advance to the next beat like a video essay!
    if (!this._interrupted && !this._isPaused && this._currentPlaySession === currentSession) {
      this._autoAdvanceTimeout = setTimeout(() => {
        if (!this._interrupted && !this._isPaused && this._currentPlaySession === currentSession) {
          this.advanceBeat();
        }
      }, 500); // 500ms pause between thoughts
    }

    this._playing = false;
  }

  bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case ' ':
        case 'ArrowRight':
          e.preventDefault();
          this._ensureAudio();
          if (!this._interrupted) this.advanceBeat();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (!this._interrupted) this.goBack();
          break;
        case 'r':
        case 'R':
          this.goToScene(this.currentScene);
          break;
        case 'm':
        case 'M':
          this._ensureAudio();
          const muted = audio.toggleMute();
          this.muteBtn.textContent = muted ? '🔇' : '🔊';
          break;
      }
    });
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());
