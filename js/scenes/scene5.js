// ============================================================
// scene5.js — MA(1) Bound & Finale (Exercise 5)
// ============================================================

import { ma1Rho1 } from '../math.js';
import {
  autoSizeCanvas, clearCanvas, drawAxes,
  drawCurve, animateCurve,
  drawHorizontalLine, drawDot, drawLabel
} from '../canvas.js';

export const scene5 = {
  id: 'scene5',
  title: 'Why MA(1) Has a Limit',

  _canvases: [],
  _cancelFns: [],
  _sliderContainer: null,
  _summaryCard: null,
  _transform: null,

  beats: [
    {
      narration: "Our final stop on this journey is Seasonality. What if the data has a heartbeat? Think about ice cream sales—they always peak in the summer and crash in the winter. That's a predictable pattern that repeats every single year. Let's see what that looks like.",
      audioId: 's5_b0',
      action: null,
    },
    {
      narration: null,
      action: null,
    },
    {
      narration: "You can see the rhythm in the time series clearly now. It rises and falls like clockwork. Even if we added a bunch of white noise on top of it, that underlying heartbeat would still be there, driving the data up and down on a strict schedule.",
      audioId: 's5_b1',
      action: null,
    },
    {
      narration: "Now look at the ACF. This is where the magic happens. Instead of dying off into the blue zone, we get these huge, repeating peaks that never seem to fade. It looks exactly like a heartbeat on a hospital monitor.",
      audioId: 's5_b2',
      action: null,
    },
    {
      narration: "Those peaks in the ACF happen at exact intervals. If this was monthly data, you would see a massive spike every 12 lags, because December always correlates with last December! The distance between those spikes tells you exactly how long the season is.",
      audioId: 's5_b3',
      action: null,
    },
    {
      narration: "This is the grand finale of time series analysis. By looking at the ACF, we can detect hidden rhythms, no matter how much random noise tries to hide them. Try playing with the frequency slider to speed up or slow down the heartbeat!",
      audioId: 's5_b4',
      action: null,
    },
    {
      narration: "And that concludes our journey into the secret language of data. From pure white noise, to short-term memory, to swinging pendulums, wandering paths, and seasonal heartbeats. You now have the tools to read the future. Keep exploring!",
      audioId: 's5_b5',
      action: null,
    }
  ],
  setup(canvasZone) {
    canvasZone.innerHTML = '';
    canvasZone.className = 'canvas-zone canvas-zone--grid-2';
    this._currentPeriod = 12;

    // Canvas 1: Seasonal Series
    const wrap1 = document.createElement('div');
    wrap1.className = 'canvas-wrapper';
    wrap1.innerHTML = '<div class="canvas-wrapper__title">Seasonal Time Series</div>';
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

    // Empty wrap 3 for grid alignment
    const wrap3 = document.createElement('div');
    wrap3.className = 'canvas-wrapper';
    canvasZone.appendChild(wrap3);

    // Slider
    const sliderDiv = document.createElement('div');
    sliderDiv.className = 'slider-container';
    sliderDiv.style.gridColumn = '1 / -1';
    sliderDiv.innerHTML = `
      <div class="slider-label">
        <span class="slider-label__name">Season Length (Period)</span>
        <span class="slider-label__value" id="period-display">12 months</span>
      </div>
      <input type="range" id="period-slider" min="4" max="24" step="1" value="12">
    `;
    canvasZone.appendChild(sliderDiv);
    this._sliderContainer = sliderDiv;

    // Summary card (hidden)
    const summary = document.createElement('div');
    summary.className = 'card summary-card hidden';
    summary.id = 'summary-card';
    summary.style.gridColumn = '1 / -1';
    summary.innerHTML = `
      <h2>Lecture Summary</h2>
      <ol>
        <li>MA(1): lag-1 ACF spike, then cutoff</li>
        <li>AR(1): ACF decays, PACF cuts off after lag 1</li>
        <li>Trend → difference first, then read ACF</li>
        <li>Random walk → white noise around drift after differencing</li>
        <li>Seasonality → repeating ACF spikes at exact season lengths</li>
      </ol>
      <button class="nav-btn nav-btn--primary" id="btn-restart" style="margin-top:20px;">↻ Restart Lecture</button>
    `;
    canvasZone.appendChild(summary);
    this._summaryCard = summary;

    this._canvases = [c1, c2];
    this._cancelFns = [];

    // Slider interaction
    const slider = sliderDiv.querySelector('#period-slider');
    const display = sliderDiv.querySelector('#period-display');
    slider.addEventListener('input', () => {
      this._currentPeriod = parseInt(slider.value);
      display.textContent = `${this._currentPeriod} months`;
      this._redrawAll();
    });

    this._bindActions();
  },

  _generateData() {
    const n = 200;
    const series = new Float32Array(n);
    // Deterministic sine wave + noise
    for (let i = 0; i < n; i++) {
      // 5 * sin(2pi * t / period) + random noise
      series[i] = 5 * Math.sin(2 * Math.PI * i / this._currentPeriod) + ((Math.random() * 4) - 2);
    }
    
    // Compute ACF up to 40 lags
    import('../math.js').then(math => {
        this.acf = math.computeACF(series, 40);
        this.series = series;
        if(this.redrawPending) {
           this._drawSeries(false);
           this._drawACF(false);
           this.redrawPending = false;
        }
    });
    
    // We compute inline for sync returning
    const acf = new Float32Array(41);
    let mean = 0;
    for(let i=0; i<n; i++) mean += series[i];
    mean /= n;
    
    let var0 = 0;
    for(let i=0; i<n; i++) var0 += (series[i]-mean)*(series[i]-mean);
    
    for (let lag = 0; lag <= 40; lag++) {
      let cov = 0;
      for (let i = 0; i < n - lag; i++) {
        cov += (series[i] - mean) * (series[i + lag] - mean);
      }
      acf[lag] = cov / var0;
    }
    
    return { series, acf };
  },

  _drawSeries(animated = false) {
    const { series } = this._generateData();
    const c1 = this._canvases[0];
    import('../canvas.js').then(canvas => {
      const { ctx, width, height } = canvas.autoSizeCanvas(c1);
      canvas.clearCanvas(ctx, width, height);

      const transform = canvas.drawAxes(ctx, {
        x: 0, y: 0, width, height,
        xLabel: 'Time', yLabel: 'Y(t)',
        xMin: 0, xMax: series.length, yMin: -10, yMax: 10
      });

      if (animated) {
        const cancel = canvas.animateTimeSeries(ctx, series, transform, {
          color: '#d95c41', lineWidth: 1.5, duration: 1500
        }, () => {});
        this._cancelFns.push(cancel);
      } else {
        canvas.drawTimeSeries(ctx, series, transform, { color: '#d95c41', lineWidth: 1.5 });
      }
    });
  },

  _drawACF(animated = false) {
    const { acf } = this._generateData();
    const c2 = this._canvases[1];
    import('../canvas.js').then(canvas => {
      const { ctx, width, height } = canvas.autoSizeCanvas(c2);
      canvas.clearCanvas(ctx, width, height);
      this._acfTransform = canvas.drawAxes(ctx, {
        x: 0, y: 0, width, height,
        xLabel: 'Lag', yLabel: 'ACF',
        xMin: 0.5, xMax: 40.5, yMin: -1.0, yMax: 1.1
      });

      canvas.drawHorizontalLine(ctx, 0, this._acfTransform, { color: 'rgba(0,0,0,0.3)', dash: [3, 3] });
      canvas.drawConfidenceBands(ctx, 200, this._acfTransform);

      if (animated) {
        const cancel = canvas.animateBarChart(ctx, Array.from(acf), this._acfTransform, {
          color: '#4f87b8', barWidth: 0.4, duration: 1500, startLag: 1
        }, () => {});
        this._cancelFns.push(cancel);
      } else {
        canvas.drawBarChart(ctx, Array.from(acf), this._acfTransform, {
          color: '#4f87b8', barWidth: 0.4, startLag: 1
        });
      }
    });
  },
  
  _annotatePeaks() {
      const c2 = this._canvases[1];
      const ctx = c2.getContext('2d');
      const t = this._acfTransform;
      if (!t) return;
      import('../canvas.js').then(canvas => {
          const lagX1 = t.toCanvasX(this._currentPeriod);
          canvas.drawArrow(ctx, lagX1, t.toCanvasY(0.9), lagX1, t.toCanvasY(0.6), { color: '#c86b2e' });
          canvas.drawLabel(ctx, \`Lag \${this._currentPeriod}\`, lagX1, t.toCanvasY(1.0), { color: '#c86b2e', font: '12px Inter' });
          
          const lagX2 = t.toCanvasX(this._currentPeriod * 2);
          if (lagX2 < t.toCanvasX(40)) {
              canvas.drawArrow(ctx, lagX2, t.toCanvasY(0.9), lagX2, t.toCanvasY(0.6), { color: '#c86b2e' });
              canvas.drawLabel(ctx, \`Lag \${this._currentPeriod * 2}\`, lagX2, t.toCanvasY(1.0), { color: '#c86b2e', font: '12px Inter' });
          }
      });
  },

  _redrawAll() {
    this._drawSeries(false);
    this._drawACF(false);
  },

  _bindActions() {
    const self = this;
    this.beats[2].action = () => self._drawSeries(true);
    this.beats[3].action = () => self._drawACF(true);
    this.beats[4].action = () => self._annotatePeaks();
    this.beats[5].action = () => {
      if (self._sliderContainer) self._sliderContainer.classList.add('visible');
    };
    this.beats[6].action = () => {
      if (self._summaryCard) self._summaryCard.classList.remove('hidden');
      setTimeout(() => {
          const restartBtn = document.getElementById('btn-restart');
          if (restartBtn) {
            restartBtn.addEventListener('click', () => {
              window.dispatchEvent(new CustomEvent('restart-lecture'));
            });
          }
      }, 100);
    };
  },

  cleanup() {
    this._cancelFns.forEach(fn => fn && fn());
    this._cancelFns = [];
    this._canvases = [];
    if(this._sliderContainer) this._sliderContainer.classList.remove('visible');
    if(this._summaryCard) this._summaryCard.classList.add('hidden');
    this._sliderContainer = null;
    this._summaryCard = null;
    this._acfTransform = null;
  }
};
