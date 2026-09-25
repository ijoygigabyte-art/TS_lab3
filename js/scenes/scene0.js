// ============================================================
// scene0.js — Intro & White Noise
// Charts animate FROM THE FIRST BEAT so the screen is never empty.
// ============================================================

import { SeededRNG, simulateWhiteNoise, computeACF, acfConfidenceBand } from '../math.js';
import {
  autoSizeCanvas, clearCanvas, drawAxes, drawTimeSeries,
  animateTimeSeries, drawBarChart, animateBarChart,
  drawHorizontalLine, drawConfidenceBands, drawArrow, drawLabel
} from '../canvas.js';

export const scene0 = {
  id: 'scene0',
  title: 'What Is White Noise?',

  _data: null,
  _acf: null,
  _canvases: [],
  _cancelFns: [],

  beats: [
    {
      narration: "Welcome to our journey into the secret language of data. Before we start analyzing anything, let's understand what we're looking at. Imagine you have a massive spreadsheet recording daily sales for a store, or maybe the daily closing price of a stock over an entire year. That sequence of data points, ordered by time, is called a Time Series. The ultimate question in time series analysis is: can we predict what happens tomorrow by looking at the past?",
      audioId: 's0_b0',
      action: null, 
    },
    {
      narration: "To predict the future, we have to find out if there's an actual, hidden pattern in our historical data, or if it's all just random chaos. So, let's start with the absolute baseline of pure chaos. In statistics, we call this 'White Noise'. Think of it like static on an old television set.",
      audioId: 's0_b1',
      action: null, 
    },
    {
      narration: "See all those jagged spikes on the screen? Every single point you see is a totally random, independent shock. In a White Noise series, today's value has absolutely zero memory of what happened yesterday. If the stock went up yesterday, it tells you literally nothing about what it will do today. The data points are completely untethered from one another.",
      audioId: 's0_b2',
      action: null, 
    },
    {
      narration: "It's easy to look at a jagged line and guess that it's random, but how do we prove it mathematically? We use a powerful technology called the ACF, which stands for Autocorrelation Function. You can think of the ACF as a pattern-detector. It checks to see if today's value is correlated—or connected—to yesterday's value, or the value from two days ago.",
      audioId: 's0_b3',
      action: null,
    },
    {
      narration: "Check out the new ACF chart that just appeared below. The horizontal axis represents the 'lag'—meaning how many days back we are looking. Notice how all those vertical bars are squished tightly inside the blue confidence bands? That is the math literally telling us that the correlation is basically zero at every single lag. There are no echoes of the past here. It's just pure, unpredictable noise.",
      audioId: 's0_b4',
      action: null,
    },
  ],

  setup(canvasZone) {
    const rng = new SeededRNG(42);
    this._data = simulateWhiteNoise(400, 1, rng);
    this._acf = computeACF(this._data, 15);

    canvasZone.innerHTML = '';
    canvasZone.className = 'canvas-zone';

    // Canvas 1: Time series
    const wrap1 = document.createElement('div');
    wrap1.className = 'canvas-wrapper';
    wrap1.innerHTML = '<div class="canvas-wrapper__title">White Noise Series</div>';
    const c1 = document.createElement('canvas');
    wrap1.appendChild(c1);
    canvasZone.appendChild(wrap1);

    // Canvas 2: ACF
    const wrap2 = document.createElement('div');
    wrap2.className = 'canvas-wrapper';
    wrap2.innerHTML = '<div class="canvas-wrapper__title">Sample ACF</div>';
    const c2 = document.createElement('canvas');
    wrap2.appendChild(c2);
    canvasZone.appendChild(wrap2);

    this._canvases = [c1, c2];
    this._cancelFns = [];

    this._bindActions();
  },

  _bindActions() {
    const self = this;

    // Beat 0: Draw empty axes to represent "data" coming in
    this.beats[0].action = () => {
      return new Promise((resolve) => {
        const c1 = self._canvases[0];
        const { ctx, width, height } = autoSizeCanvas(c1);
        clearCanvas(ctx, width, height);

        const data = self._data;
        const yMin = -4, yMax = 4;
        drawAxes(ctx, {
          x: 0, y: 0, width, height,
          xLabel: 'Time index', yLabel: 'Sales / Price / Value',
          xMin: 0, xMax: data.length, yMin, yMax,
          showGrid: false
        });
        resolve();
      });
    };

    // Beat 1: ANIMATE the white noise chart
    this.beats[1].action = () => {
      return new Promise((resolve) => {
        const c1 = self._canvases[0];
        const { ctx, width, height } = autoSizeCanvas(c1);

        const data = self._data;
        const yMin = -4, yMax = 4;
        const transform = drawAxes(ctx, {
          x: 0, y: 0, width, height,
          xLabel: 'Time index', yLabel: 'Value',
          xMin: 0, xMax: data.length, yMin, yMax,
          showGrid: false
        });

        drawHorizontalLine(ctx, 0, transform, { color: 'rgba(0,0,0,0.15)', dash: [4, 4] });

        const cancel = animateTimeSeries(ctx, data, transform, {
          color: '#3d3b38', lineWidth: 1.5, duration: 2000
        }, resolve);
        self._cancelFns.push(cancel);
      });
    };

    // Beat 2: Highlight random points with colored circles to show independence
    this.beats[2].action = () => {
      return new Promise((resolve) => {
        const c1 = self._canvases[0];
        const { ctx, width, height } = autoSizeCanvas(c1);
        
        const data = self._data;
        const yMin = -4, yMax = 4;
        const transform = drawAxes(ctx, {
          x: 0, y: 0, width, height,
          xLabel: 'Time index', yLabel: 'Value',
          xMin: 0, xMax: data.length, yMin, yMax,
          showGrid: false
        });

        drawHorizontalLine(ctx, 0, transform, { color: 'rgba(0,0,0,0.15)', dash: [4, 4] });
        drawTimeSeries(ctx, data, transform, { color: '#3d3b38', lineWidth: 1.5 });

        // Highlight 8 random points with glowing dots
        const highlights = [25, 78, 130, 190, 240, 290, 330, 370];
        const colors = ['#5ea1ff', '#ff7b5e', '#5eff9e', '#ff5e8e', '#f0c674', '#5ea1ff', '#ff7b5e', '#5eff9e'];
        let i = 0;

        const interval = setInterval(() => {
          if (i >= highlights.length) {
            clearInterval(interval);
            resolve();
            return;
          }
          const idx = highlights[i];
          const cx = transform.toCanvasX(idx);
          const cy = transform.toCanvasY(data[idx]);

          ctx.shadowColor = colors[i];
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.fillStyle = colors[i];
          ctx.fill();
          ctx.shadowBlur = 0;

          i++;
        }, 150);
      });
    };

    // Beat 3: Draw empty ACF grid and bands
    this.beats[3].action = () => {
      return new Promise((resolve) => {
        const c2 = self._canvases[1];
        const { ctx, width, height } = autoSizeCanvas(c2);
        clearCanvas(ctx, width, height);

        const transform = drawAxes(ctx, {
          x: 0, y: 0, width, height,
          xLabel: 'Lag', yLabel: 'ACF Pattern Match',
          xMin: -0.5, xMax: 15.5, yMin: -0.5, yMax: 1.1,
          tickCount: 5
        });

        drawHorizontalLine(ctx, 0, transform, { color: 'rgba(0,0,0,0.3)', dash: [3, 3] });
        drawConfidenceBands(ctx, self._data.length, transform);
        resolve();
      });
    };

    // Beat 4: Animate the ACF bars and show arrows
    this.beats[4].action = () => {
      return new Promise((resolve) => {
        const c2 = self._canvases[1];
        const { ctx, width, height } = autoSizeCanvas(c2);
        
        const acfData = self._acf;
        const transform = drawAxes(ctx, {
          x: 0, y: 0, width, height,
          xLabel: 'Lag', yLabel: 'ACF Pattern Match',
          xMin: -0.5, xMax: 15.5, yMin: -0.5, yMax: 1.1,
          tickCount: 5
        });

        drawHorizontalLine(ctx, 0, transform, { color: 'rgba(0,0,0,0.3)', dash: [3, 3] });
        drawConfidenceBands(ctx, self._data.length, transform);

        const cancel = animateBarChart(ctx, Array.from(acfData), transform, {
          color: '#3d3b38', barWidth: 0.4, duration: 800, startLag: 0
        }, () => {
          // Add arrows after animation finishes
          const bandVal = acfConfidenceBand(self._data.length);
          const arrowX = transform.toCanvasX(10);
          const arrowFromY = transform.toCanvasY(bandVal + 0.2);
          const arrowToY = transform.toCanvasY(bandVal);
          drawArrow(ctx, arrowX, arrowFromY, arrowX, arrowToY, { color: '#c86b2e' });
          drawLabel(ctx, 'all bars inside bands → no correlation', arrowX + 8, arrowFromY - 2, {
            color: '#c86b2e', font: '12px Inter, sans-serif'
          });
          resolve();
        });
        self._cancelFns.push(cancel);
      });
    };
  },

  cleanup() {
    this._cancelFns.forEach(fn => fn && fn());
    this._cancelFns = [];
    this._canvases = [];
  }
};
