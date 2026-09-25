// ============================================================
// scene4.js — Random Walk with Drift (Exercise 4)
// ============================================================

import {
  SeededRNG, simulateRandomWalk, computeACF, diff, mean
} from '../math.js';
import {
  autoSizeCanvas, clearCanvas, drawAxes, drawTimeSeries,
  animateTimeSeries, drawBarChart, animateBarChart,
  drawHorizontalLine, drawConfidenceBands, drawLabel
} from '../canvas.js';

const N = 300;
const DRIFT = 0.3;
const SIGMA = 1;
const SEED = 404;

export const scene4 = {
  id: 'scene4',
  title: 'Random Walk with Drift',

  _canvases: [],
  _cancelFns: [],
  _isDiffed: false,
  _diffBtn: null,
  _data: null,

  beats: [
    {
      narration: "Okay, let's talk about the elephant in the room: Non-stationarity. So far, all our models have hovered around a stable center line. But what if the data doesn't care about a center line? This is the Random Walk, the most famous non-stationary model. Stock market prices often look exactly like this.",
      audioId: 's4_b0',
      action: null,
    },
    {
      narration: "Notice how it wanders off and never seems to come back to the center? It has zero gravity. It's completely untethered. Because it's constantly wandering away into new territory, its average value changes over time. You cannot reliably predict a timeline that doesn't have a stable anchor.",
      audioId: 's4_b1',
      action: null,
    },
    {
      narration: "If you try to run an ACF on a wandering series, look at what happens. The bars stay agonizingly high and refuse to drop into the blue zone. It looks like an infinite amount of memory! This is a massive red flag. When you see an ACF that refuses to die, it means your data is non-stationary and cannot be modeled as is.",
      audioId: 's4_b2',
      action: null,
    },
    {
      narration: "So how do we fix a wandering series? We use a brilliant trick called Differencing. Instead of looking at the actual total values (like the stock price), we subtract yesterday's price from today's price. We look purely at the *steps* between the points, rather than the points themselves.",
      audioId: 's4_b3',
      action: null,
    },
    {
      narration: "And just like that, the wandering path transforms back into beautiful, tame white noise! By focusing on the daily change instead of the total price, we removed the wandering trend. We've anchored the data back to a flat center line of zero, making it fully predictable again.",
      audioId: 's4_b4',
      action: null,
    },
    {
      narration: "The ultimate rule of thumb: If your ACF refuses to die down, your data is wandering out of control. Take the difference, find the daily change, and bring it back down to earth before you build your model.",
      audioId: 's4_b5',
      action: null,
    }
  ],

  setup(canvasZone) {
    canvasZone.innerHTML = '';
    canvasZone.className = 'canvas-zone';
    this._isDiffed = false;

    // Generate data
    const rng = new SeededRNG(SEED);
    const result = simulateRandomWalk(N, DRIFT, SIGMA, rng);
    const diffWalk = diff(result.walk);
    this._data = {
      walk: result.walk,
      increments: result.increments,
      diffWalk: diffWalk,
      acfBefore: computeACF(result.walk, 15),
      acfAfter: computeACF(diffWalk, 15),
      diffMean: mean(diffWalk)
    };

    // Canvas 1: Walk / Differenced
    const wrap1 = document.createElement('div');
    wrap1.className = 'canvas-wrapper';
    wrap1.innerHTML = '<div class="canvas-wrapper__title" id="series-title-4">Random Walk with Drift</div>';
    const c1 = document.createElement('canvas');
    wrap1.appendChild(c1);
    canvasZone.appendChild(wrap1);

    // Canvas 2: ACF
    const wrap2 = document.createElement('div');
    wrap2.className = 'canvas-wrapper';
    wrap2.innerHTML = '<div class="canvas-wrapper__title" id="acf-title-4">Sample ACF</div>';
    const c2 = document.createElement('canvas');
    wrap2.appendChild(c2);
    canvasZone.appendChild(wrap2);

    // No manual diff button needed; we auto-difference in beat 3 action

    this._canvases = [c1, c2];
    this._cancelFns = [];
    this._bindActions();
  },

  _drawSeries(animated = false) {
    const c1 = this._canvases[0];
    const { ctx, width, height } = autoSizeCanvas(c1);
    clearCanvas(ctx, width, height);

    const data = this._isDiffed ? this._data.diffWalk : this._data.walk;
    const color = this._isDiffed ? '#6b82b8' : '#b85c5c';

    const title = document.getElementById('series-title-4');
    if (title) title.textContent = this._isDiffed ? 'First Differences' : 'Random Walk with Drift';

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
      drawHorizontalLine(ctx, DRIFT, transform, {
        color: 'rgba(0,0,0,0.15)', dash: [4, 4], label: `drift = ${DRIFT}`
      });
    }

    if (animated) {
      return new Promise(resolve => {
        const cancel = animateTimeSeries(ctx, data, transform, {
          color, lineWidth: 1.5, duration: 3000
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
    const n = this._isDiffed ? this._data.diffWalk.length : this._data.walk.length;
    const color = this._isDiffed ? '#6b82b8' : '#b85c5c';

    const title = document.getElementById('acf-title-4');
    if (title) title.textContent = this._isDiffed ? 'ACF After Differencing' : 'ACF Before Differencing';

    const transform = drawAxes(ctx, {
      x: 0, y: 0, width, height,
      xLabel: 'Lag', yLabel: 'ACF',
      xMin: -0.5, xMax: 15.5, yMin: -0.5, yMax: 1.1
    });

    drawHorizontalLine(ctx, 0, transform, { color: 'rgba(0,0,0,0.3)', dash: [3, 3] });
    drawConfidenceBands(ctx, n, transform);

    if (animated) {
      return new Promise(resolve => {
        const cancel = animateBarChart(ctx, Array.from(acf), transform, {
          color, barWidth: 0.4, duration: 800
        }, resolve);
        this._cancelFns.push(cancel);
      });
    } else {
      drawBarChart(ctx, Array.from(acf), transform, { color, barWidth: 0.4 });
    }
  },

  _bindActions() {
    const self = this;
    this.beats[1].action = () => self._drawSeries(true);
    this.beats[2].action = () => self._drawACF(true);
    this.beats[3].action = () => {
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
