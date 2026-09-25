// ============================================================
// scene2.js — AR(1) Process (Exercise 2)
// ============================================================

import {
  SeededRNG, simulateAR1, computeACF, computePACF
} from '../math.js';
import {
  autoSizeCanvas, clearCanvas, drawAxes, drawTimeSeries,
  animateTimeSeries, drawBarChart, animateBarChart,
  drawHorizontalLine, drawConfidenceBands, drawArrow, drawLabel
} from '../canvas.js';

const N = 400;
const SIGMA = 1;
const SEED = 202;

export const scene2 = {
  id: 'scene2',
  title: 'The AR(1) Process',

  _canvases: [],
  _cancelFns: [],
  _sliderContainer: null,
  _currentAlpha: 0.8,

  beats: [
    {
      narration: "Alright, let's level up. In the previous model, we only remembered the random shock from yesterday. But what if today's value is directly based on yesterday's actual total value? Welcome to the Autoregressive model, or AR(1).",
      audioId: 's2_b0',
      action: null,
    },
    {
      narration: "In an AR(1) model, the current value is explicitly dragged along by the previous one. If the stock was high yesterday, it's highly likely to be high today. This creates these long, swooping waves in the data, where high periods cluster together and low periods cluster together. It's no longer just bouncing wildly.",
      audioId: 's2_b1',
      action: null,
    },
    {
      narration: "Because today is connected to yesterday, and yesterday is connected to the day before, today is indirectly connected to the day before! Look at the ACF now. It doesn't just cut off after one step. It decays slowly over many lags, like an echo fading away in a grand canyon.",
      audioId: 's2_b2',
      action: null,
    },
    {
      narration: "But wait, this fading echo is a problem. The ACF shows a connection stretching across five or six days. But we know the math only looks one step back! How do we prove it's just a one-step memory? That's where our newest, most precise tool comes in: the PACF. Watch this.",
      audioId: 's2_b3',
      action: null,
    },
    {
      narration: "The PACF, or Partial Autocorrelation Function, uses clever math to strip away all those indirect echoes. And boom! We see exactly one clear spike at lag 1, and then absolutely nothing. The PACF cuts through the noise and echoes to find the true source of the memory.",
      audioId: 's2_b4',
      action: null,
    },
    {
      narration: "Try playing with the 'Phi' slider! Phi is the strength of the memory. See how a higher phi makes those ACF echoes last way longer, while the PACF stays stubbornly at one spike? You are literally controlling the momentum of the timeline.",
      audioId: 's2_b5',
      action: null,
    },
    {
      narration: "The ultimate takeaway: Autoregressive models have slowly fading ACF echoes, but sharp, clean PACF cutoffs. It's all about using the right tool to strip away the noise and find the root cause.",
      audioId: 's2_b6',
      action: null,
    }
  ],

  setup(canvasZone) {
    canvasZone.innerHTML = '';
    canvasZone.className = 'canvas-zone canvas-zone--grid-2';
    this._currentAlpha = 0.8;

    // Canvas 1: AR(1) series (full width top)
    const wrap1 = document.createElement('div');
    wrap1.className = 'canvas-wrapper';
    wrap1.innerHTML = '<div class="canvas-wrapper__title">AR(1) Series</div>';
    const c1 = document.createElement('canvas');
    wrap1.appendChild(c1);
    canvasZone.appendChild(wrap1);

    // Canvas 2: ACF (bottom-left)
    const wrap2 = document.createElement('div');
    wrap2.className = 'canvas-wrapper';
    wrap2.innerHTML = '<div class="canvas-wrapper__title">Sample ACF</div>';
    const c2 = document.createElement('canvas');
    wrap2.appendChild(c2);
    canvasZone.appendChild(wrap2);

    // Canvas 3: PACF (bottom-right)
    const wrap3 = document.createElement('div');
    wrap3.className = 'canvas-wrapper';
    wrap3.innerHTML = '<div class="canvas-wrapper__title">Sample PACF</div>';
    const c3 = document.createElement('canvas');
    wrap3.appendChild(c3);
    canvasZone.appendChild(wrap3);

    // Slider
    const sliderDiv = document.createElement('div');
    sliderDiv.className = 'slider-container';
    sliderDiv.style.gridColumn = '1 / -1';
    sliderDiv.innerHTML = `
      <div class="slider-label">
        <span class="slider-label__name">α (alpha)</span>
        <span class="slider-label__value" id="alpha-display">α = 0.80</span>
      </div>
      <input type="range" id="alpha-slider" min="-0.95" max="0.95" step="0.05" value="0.8">
    `;
    canvasZone.appendChild(sliderDiv);

    this._canvases = [c1, c2, c3];
    this._sliderContainer = sliderDiv;
    this._cancelFns = [];

    const slider = sliderDiv.querySelector('#alpha-slider');
    const display = sliderDiv.querySelector('#alpha-display');
    slider.addEventListener('input', () => {
      this._currentAlpha = parseFloat(slider.value);
      display.textContent = `α = ${this._currentAlpha.toFixed(2)}`;
      this._redrawAll();
    });

    this._bindActions();
  },

  _generateData(alpha) {
    const rng = new SeededRNG(SEED);
    const series = simulateAR1(N, alpha, SIGMA, rng);
    const acf = computeACF(series, 15);
    const pacf = computePACF(series, 15);
    return { series, acf, pacf };
  },

  _drawSeries(animated = false) {
    const c1 = this._canvases[0];
    const { ctx, width, height } = autoSizeCanvas(c1);
    clearCanvas(ctx, width, height);

    const { series } = this._generateData(this._currentAlpha);
    let yMin = Infinity, yMax = -Infinity;
    for (let i = 0; i < series.length; i++) {
      if (series[i] < yMin) yMin = series[i];
      if (series[i] > yMax) yMax = series[i];
    }
    const pad = (yMax - yMin) * 0.1 || 1;
    yMin -= pad; yMax += pad;

    const transform = drawAxes(ctx, {
      x: 0, y: 0, width, height,
      xLabel: 'Time index', yLabel: 'Y(t)',
      xMin: 0, xMax: series.length, yMin, yMax
    });

    if (animated) {
      return new Promise(resolve => {
        const cancel = animateTimeSeries(ctx, series, transform, {
          color: '#d95c41', lineWidth: 1.5, duration: 2000
        }, resolve);
        this._cancelFns.push(cancel);
      });
    } else {
      drawTimeSeries(ctx, series, transform, { color: '#d95c41', lineWidth: 1.5 });
    }
  },

  _drawACF(animated = false) {
    const c2 = this._canvases[1];
    const { ctx, width, height } = autoSizeCanvas(c2);
    clearCanvas(ctx, width, height);

    const { series, acf } = this._generateData(this._currentAlpha);
    const transform = drawAxes(ctx, {
      x: 0, y: 0, width, height,
      xLabel: 'Lag', yLabel: 'ACF',
      xMin: -0.5, xMax: 15.5, yMin: -0.5, yMax: 1.1
    });

    drawHorizontalLine(ctx, 0, transform, { color: 'rgba(0,0,0,0.3)', dash: [3, 3] });
    drawConfidenceBands(ctx, series.length, transform);

    if (animated) {
      return new Promise(resolve => {
        const cancel = animateBarChart(ctx, Array.from(acf), transform, {
          color: '#d95c41', barWidth: 0.4, duration: 800
        }, resolve);
        this._cancelFns.push(cancel);
      });
    } else {
      drawBarChart(ctx, Array.from(acf), transform, { color: '#d95c41', barWidth: 0.4 });
    }
  },

  _drawPACF(animated = false) {
    const c3 = this._canvases[2];
    const { ctx, width, height } = autoSizeCanvas(c3);
    clearCanvas(ctx, width, height);

    const { series, pacf } = this._generateData(this._currentAlpha);
    const transform = drawAxes(ctx, {
      x: 0, y: 0, width, height,
      xLabel: 'Lag', yLabel: 'PACF',
      xMin: 0.5, xMax: 15.5, yMin: -0.5, yMax: 1.1
    });

    drawHorizontalLine(ctx, 0, transform, { color: 'rgba(0,0,0,0.3)', dash: [3, 3] });
    drawConfidenceBands(ctx, series.length, transform);

    if (animated) {
      return new Promise(resolve => {
        const cancel = animateBarChart(ctx, Array.from(pacf), transform, {
          color: '#d95c41', barWidth: 0.4, duration: 800, startLag: 1
        }, () => {
          // Arrow to lag-1 bar
          const lag1X = transform.toCanvasX(1);
          const lag1Y = transform.toCanvasY(pacf[0]);
          drawArrow(ctx, lag1X + 30, lag1Y - 15, lag1X + 2, lag1Y, { color: '#c86b2e' });
          drawLabel(ctx, 'order = 1', lag1X + 34, lag1Y - 17, {
            color: '#c86b2e', font: '11px Inter, sans-serif'
          });
          resolve();
        });
        this._cancelFns.push(cancel);
      });
    } else {
      drawBarChart(ctx, Array.from(pacf), transform, {
        color: '#d95c41', barWidth: 0.4, startLag: 1
      });
    }
  },

  _redrawAll() {
    this._drawSeries(false);
    this._drawACF(false);
    this._drawPACF(false);
  },

  _bindActions() {
    const self = this;
    this.beats[1].action = () => self._drawSeries(true);
    this.beats[2].action = () => self._drawACF(true);
    this.beats[3].action = () => self._drawPACF(true);
    this.beats[5].action = () => {
      if (self._sliderContainer) self._sliderContainer.classList.add('visible');
    };
  },

  cleanup() {
    this._cancelFns.forEach(fn => fn && fn());
    this._cancelFns = [];
    this._canvases = [];
    if (this._sliderContainer) this._sliderContainer.classList.remove('visible');
    this._sliderContainer = null;
  }
};
