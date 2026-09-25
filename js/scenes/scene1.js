// ============================================================
// scene1.js — MA(1) Process (Exercise 1)
// ============================================================

import {
  SeededRNG, simulateMA1, computeACF, acfConfidenceBand,
  ma1Rho1, ma1Variance
} from '../math.js';
import {
  autoSizeCanvas, clearCanvas, drawAxes, drawTimeSeries,
  animateTimeSeries, drawBarChart, animateBarChart,
  drawHorizontalLine, drawConfidenceBands, drawArrow,
  drawLabel, drawHighlightRegion
} from '../canvas.js';

const N = 400;
const SIGMA = 1;
const SEED = 101;
const CONSTANT = 10;

export const scene1 = {
  id: 'scene1',
  title: 'The MA(1) Process',

  _canvases: [],
  _cancelFns: [],
  _sliderContainer: null,
  _currentTheta: -0.6,

  beats: [
    {
      narration: "Welcome to the next chapter. Say hello to the Moving Average model, or MA(1) for short. In White Noise, every day was completely independent. But in an MA(1) model, we introduce a tiny bit of memory. Instead of just today's random shock, we mathematically mix in a fraction of yesterday's shock, too. The '1' in MA(1) means we only look exactly one step into the past.",
      audioId: 's1_b0',
      action: null,
    },
    {
      narration: "Notice how every single point on this new graph is influenced by the point directly before it. It has exactly one step of memory connecting it to the past, creating a slightly smoother, more connected line than pure White Noise.",
      audioId: 's1_b1',
      action: null,
    },
    {
      narration: "Now, let's see how our pattern-detector, the ACF, reacts to this. Watch what happens as it calculates the correlations. Boom! Do you see that massive spike at lag 1? That spike is the mathematical proof that yesterday's data is directly affecting today's data.",
      audioId: 's1_b2',
      action: null,
    },
    {
      narration: "But look closely at what happens immediately after lag 1. At lag 2, lag 3, and beyond, the bars drop straight back into the blue zone. The memory totally vanishes after a single day. That sudden, sharp cutoff is the ultimate signature of an MA(1) model. It remembers exactly one day, and nothing more.",
      audioId: 's1_b3',
      action: null,
    },
    {
      narration: "Keep in mind, real-world data won't look exactly like a perfect math formula. It's just a single, random timeline bouncing around. The ACF bars might wiggle a little bit inside the blue bands, but as long as they stay inside, we consider the correlation to be zero.",
      audioId: 's1_b4',
      action: null,
    },
    {
      narration: "Go ahead and grab that slider! This slider controls a parameter called 'Theta', which dictates how strongly yesterday's shock affects today. Mess with it and watch how that lag 1 spike reacts. If you make it negative, you can actually flip the correlation upside down!",
      audioId: 's1_b5',
      action: null,
    },
    {
      narration: "So remember the story here: an MA(1) model gives you exactly one big ACF spike at the first lag, followed by total silence. It's the hallmark of short-term memory.",
      audioId: 's1_b6',
      action: null,
    }
  ],

  setup(canvasZone) {
    canvasZone.innerHTML = '';
    canvasZone.className = 'canvas-zone';
    this._currentTheta = -0.6;

    // Canvas 1: MA(1) series
    const wrap1 = document.createElement('div');
    wrap1.className = 'canvas-wrapper';
    wrap1.innerHTML = '<div class="canvas-wrapper__title">MA(1) Series</div>';
    const c1 = document.createElement('canvas');
    wrap1.appendChild(c1);
    canvasZone.appendChild(wrap1);

    // Canvas 2: Sample ACF
    const wrap2 = document.createElement('div');
    wrap2.className = 'canvas-wrapper';
    wrap2.innerHTML = '<div class="canvas-wrapper__title">Sample ACF</div>';
    const c2 = document.createElement('canvas');
    wrap2.appendChild(c2);
    canvasZone.appendChild(wrap2);

    // Slider (hidden initially)
    const sliderDiv = document.createElement('div');
    sliderDiv.className = 'slider-container';
    sliderDiv.id = 'slider-theta';
    sliderDiv.innerHTML = `
      <div class="slider-label">
        <span class="slider-label__name">θ (theta)</span>
        <span class="slider-label__value" id="theta-display">θ = -0.60 → ρ₁ = -0.4412</span>
      </div>
      <input type="range" id="theta-slider" min="-0.95" max="0.95" step="0.05" value="-0.6">
    `;
    canvasZone.appendChild(sliderDiv);

    this._canvases = [c1, c2];
    this._sliderContainer = sliderDiv;
    this._cancelFns = [];

    // Slider event
    const slider = sliderDiv.querySelector('#theta-slider');
    const display = sliderDiv.querySelector('#theta-display');
    slider.addEventListener('input', () => {
      this._currentTheta = parseFloat(slider.value);
      const rho1 = ma1Rho1(this._currentTheta);
      display.textContent = `θ = ${this._currentTheta.toFixed(2)} → ρ₁ = ${rho1.toFixed(4)}`;
      this._redrawAll();
    });

    this._bindActions();
  },

  _generateData(theta) {
    const rng = new SeededRNG(SEED);
    const raw = simulateMA1(N, theta, SIGMA, rng);
    const series = new Float64Array(N);
    for (let i = 0; i < N; i++) series[i] = CONSTANT + raw[i];
    const acf = computeACF(series, 15);
    return { series, acf };
  },

  _drawSeries(animated = false) {
    const c1 = this._canvases[0];
    const { ctx, width, height } = autoSizeCanvas(c1);
    clearCanvas(ctx, width, height);

    const { series } = this._generateData(this._currentTheta);

    let yMin = Infinity, yMax = -Infinity;
    for (let i = 0; i < series.length; i++) {
      if (series[i] < yMin) yMin = series[i];
      if (series[i] > yMax) yMax = series[i];
    }
    const pad = (yMax - yMin) * 0.1;
    yMin -= pad; yMax += pad;

    const transform = drawAxes(ctx, {
      x: 0, y: 0, width, height,
      xLabel: 'Time index', yLabel: 'Z(t)',
      xMin: 0, xMax: series.length, yMin, yMax
    });

    drawHorizontalLine(ctx, CONSTANT, transform, {
      color: 'rgba(0,0,0,0.15)', dash: [4, 4], label: 'mean = 10'
    });

    if (animated) {
      return new Promise(resolve => {
        const cancel = animateTimeSeries(ctx, series, transform, {
          color: '#4f87b8', lineWidth: 1.5, duration: 2000
        }, resolve);
        this._cancelFns.push(cancel);
      });
    } else {
      drawTimeSeries(ctx, series, transform, { color: '#4f87b8', lineWidth: 1.5 });
    }
  },

  _drawACF(animated = false) {
    const c2 = this._canvases[1];
    const { ctx, width, height } = autoSizeCanvas(c2);
    clearCanvas(ctx, width, height);

    const { series, acf } = this._generateData(this._currentTheta);

    const transform = drawAxes(ctx, {
      x: 0, y: 0, width, height,
      xLabel: 'Lag', yLabel: 'ACF',
      xMin: -0.5, xMax: 15.5, yMin: -0.7, yMax: 1.1
    });

    drawHorizontalLine(ctx, 0, transform, { color: 'rgba(0,0,0,0.3)', dash: [3, 3] });
    drawConfidenceBands(ctx, series.length, transform);

    if (animated) {
      return new Promise(resolve => {
        const cancel = animateBarChart(ctx, Array.from(acf), transform, {
          color: '#4f87b8', barWidth: 0.4, duration: 800
        }, () => {
          // Arrow to lag-1 bar
          const lag1X = transform.toCanvasX(1);
          const lag1Y = transform.toCanvasY(acf[1]);
          drawArrow(ctx, lag1X + 30, lag1Y - 20, lag1X + 2, lag1Y, { color: '#c86b2e' });
          drawLabel(ctx, 'lag 1 spike', lag1X + 34, lag1Y - 22, {
            color: '#c86b2e', font: '11px Inter, sans-serif'
          });
          resolve();
        });
        this._cancelFns.push(cancel);
      });
    } else {
      drawBarChart(ctx, Array.from(acf), transform, {
        color: '#4f87b8', barWidth: 0.4
      });
    }
  },

  _redrawAll() {
    this._drawSeries(false);
    this._drawACF(false);
  },

  _bindActions() {
    const self = this;

    // Beat 1 (index 1): animate series
    this.beats[1].action = () => self._drawSeries(true);

    // Beat 2 (index 2): animate ACF
    this.beats[2].action = () => self._drawACF(true);

    // Beat 3 (index 3): highlight lags >= 2
    this.beats[3].action = () => {
      const c2 = self._canvases[1];
      const ctx = c2.getContext('2d');
      const { width, height } = c2.getBoundingClientRect();
      // We just redraw ACF to get the transform, then overlay
      // This is already drawn, so we just add a highlight
      // Approximate: highlight right portion of chart
      // We'll add a semi-transparent overlay
    };

    // Beat 4 (index 4): insight card — no canvas action needed

    // Beat 5 (index 5): show slider
    this.beats[5].action = () => {
      if (self._sliderContainer) {
        self._sliderContainer.classList.add('visible');
      }
    };
  },

  cleanup() {
    this._cancelFns.forEach(fn => fn && fn());
    this._cancelFns = [];
    this._canvases = [];
    if (this._sliderContainer) {
      this._sliderContainer.classList.remove('visible');
    }
    this._sliderContainer = null;
  }
};
