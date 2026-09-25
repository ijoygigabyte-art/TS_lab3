// ============================================================
// scene3.js — Trend + Differencing (Exercise 3)
// ============================================================

import {
  SeededRNG, simulateTrendPlusNoise, computeACF, diff, mean
} from '../math.js';
import {
  autoSizeCanvas, clearCanvas, drawAxes, drawTimeSeries,
  animateTimeSeries, drawBarChart, animateBarChart,
  drawHorizontalLine, drawConfidenceBands, drawLabel
} from '../canvas.js';

const N = 160;
const SEED = 303;

export const scene3 = {
  id: 'scene3',
  title: 'What Happens with a Trend?',

  _canvases: [],
  _cancelFns: [],
  _diffBtn: null,
  _isDiffed: false,
  _data: null,

  beats: [
    {
      narration: "We've seen memory, but what about momentum? Sometimes data doesn't just hover around a center line. Sometimes it has a clear direction. We call this a 'Trend'. Think about the population of a growing city, or the total revenue of a booming tech company.",
      audioId: 's3_b0',
      action: null,
    },
    {
      narration: null,
      action: null,
    },
    {
      narration: "Notice how the data marches steadily upward over time? It has a clear trajectory. This is a classic example of non-stationary data, because the average value is constantly changing. But watch what happens when we try to look for patterns.",
      audioId: 's3_b1',
      action: null,
    },
    {
      narration: "When you run an ACF on a trend, the result is completely misleading. The ACF bars stay agonizingly high and refuse to drop into the blue zone, looking like infinite memory. This happens because high values are always followed by higher values. It completely masks any true underlying pattern.",
      audioId: 's3_b2',
      action: null,
    },
    {
      narration: "To fix this, we have to strip away the momentum. We do this using a technique called 'Differencing'. Instead of looking at the total value, we look purely at the change from yesterday to today.",
      audioId: 's3_b3',
      action: null,
    },
    {
      narration: "By subtracting the previous point, we transform the rising trend back into a flat, predictable series! The data is anchored back to a zero baseline, and the misleading ACF disappears, allowing us to see the true nature of the noise beneath the trend.",
      audioId: 's3_b4',
      action: null,
    },
    {
      narration: "Remember: if your data is marching up or down a mountain, you must take the difference to level the playing field before you can predict the future.",
      audioId: 's3_b5',
      action: null,
    }
  ],

  setup(canvasZone) {
    canvasZone.innerHTML = '';
    canvasZone.className = 'canvas-zone';
    this._isDiffed = false;

    // Generate data
    const rng = new SeededRNG(SEED);
    const result = simulateTrendPlusNoise(N, 2, 0.5, 0.5, 1, rng);
    const diffY = diff(result.y);
    this._data = {
      y: result.y,
      trend: result.trend,
      noise: result.noise,
      diffY: diffY,
      acfBefore: computeACF(result.y, 15),
      acfAfter: computeACF(diffY, 15),
      diffMean: mean(diffY)
    };

    // Canvas 1: Series
    const wrap1 = document.createElement('div');
    wrap1.className = 'canvas-wrapper';
    wrap1.innerHTML = '<div class="canvas-wrapper__title" id="series-title-3">Series: Y(t) = 2 + 0.5t + X(t)</div>';
    const c1 = document.createElement('canvas');
    wrap1.appendChild(c1);
    canvasZone.appendChild(wrap1);

    // Canvas 2: ACF
    const wrap2 = document.createElement('div');
    wrap2.className = 'canvas-wrapper';
    wrap2.innerHTML = '<div class="canvas-wrapper__title" id="acf-title-3">Sample ACF</div>';
    const c2 = document.createElement('canvas');
    wrap2.appendChild(c2);
    canvasZone.appendChild(wrap2);

    // No manual diff button needed; we auto-difference in beat 4/5 action

    this._canvases = [c1, c2];
    this._cancelFns = [];
    this._bindActions();
  },

  _drawSeries(animated = false) {
    const c1 = this._canvases[0];
    const { ctx, width, height } = autoSizeCanvas(c1);
    clearCanvas(ctx, width, height);

    const data = this._isDiffed ? this._data.diffY : this._data.y;
    const title = document.getElementById('series-title-3');
    if (title) title.textContent = this._isDiffed ? 'First-Differenced Series' : 'Series: Y(t) = 2 + 0.5t + X(t)';

    let yMin = Infinity, yMax = -Infinity;
    for (let i = 0; i < data.length; i++) {
      if (data[i] < yMin) yMin = data[i];
      if (data[i] > yMax) yMax = data[i];
    }
    const pad = (yMax - yMin) * 0.1 || 1;
    yMin -= pad; yMax += pad;

    const transform = drawAxes(ctx, {
      x: 0, y: 0, width, height,
      xLabel: this._isDiffed ? 'Time index after differencing' : 'Time index',
      yLabel: this._isDiffed ? 'Difference' : 'Y(t)',
      xMin: 0, xMax: data.length, yMin, yMax
    });

    if (this._isDiffed) {
      drawHorizontalLine(ctx, 0.5, transform, {
        color: 'rgba(0,0,0,0.15)', dash: [4, 4], label: 'mean ≈ 0.5'
      });
    }

    const color = '#4caf75';
    if (animated) {
      return new Promise(resolve => {
        const cancel = animateTimeSeries(ctx, data, transform, {
          color, lineWidth: 1.5, duration: 2000
        }, resolve);
        this._cancelFns.push(cancel);
      });
    } else {
      drawTimeSeries(ctx, data, transform, { color, lineWidth: 1.5 });
    }
  },

  _drawACF(animated = false) {
    const c2 = this._canvases[1];
    const { ctx, width, height } = autoSizeCanvas(c2);
    clearCanvas(ctx, width, height);

    const acf = this._isDiffed ? this._data.acfAfter : this._data.acfBefore;
    const n = this._isDiffed ? this._data.diffY.length : this._data.y.length;
    const title = document.getElementById('acf-title-3');
    if (title) title.textContent = this._isDiffed ? 'ACF After First Differencing' : 'ACF Before Differencing';

    const transform = drawAxes(ctx, {
      x: 0, y: 0, width, height,
      xLabel: 'Lag', yLabel: 'ACF',
      xMin: -0.5, xMax: 15.5, yMin: -0.5, yMax: 1.1
    });

    drawHorizontalLine(ctx, 0, transform, { color: 'rgba(0,0,0,0.3)', dash: [3, 3] });
    drawConfidenceBands(ctx, n, transform);

    if (!this._isDiffed) {
      // Warning annotation
      drawLabel(ctx, '⚠ Misleading!', transform.toCanvasX(8), transform.toCanvasY(0.8), {
        color: '#d95c41', font: 'bold 12px Inter, sans-serif'
      });
    }

    if (animated) {
      return new Promise(resolve => {
        const cancel = animateBarChart(ctx, Array.from(acf), transform, {
          color: '#4caf75', barWidth: 0.4, duration: 800
        }, resolve);
        this._cancelFns.push(cancel);
      });
    } else {
      drawBarChart(ctx, Array.from(acf), transform, { color: '#4caf75', barWidth: 0.4 });
    }
  },

  _bindActions() {
    const self = this;
    this.beats[1].action = () => self._drawSeries(true);
    this.beats[2].action = () => self._drawACF(true);
    this.beats[5].action = () => {
      self._isDiffed = true;
      self._drawSeries(false);
      self._drawACF(false);
    };
  },

  cleanup() {
    this._cancelFns.forEach(fn => fn && fn());
    this._cancelFns = [];
    this._canvases = [];
    this._diffBtn = null;
    this._data = null;
  }
};
