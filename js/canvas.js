// ============================================================
// canvas.js — Canvas Drawing Helpers
// Axes, lines, bars, annotations, animations
// ============================================================

/**
 * Initialize canvas with devicePixelRatio-aware sizing.
 */
export function initCanvas(canvas, width, height) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, width, height, dpr };
}

/**
 * Auto-size canvas to fill its parent container.
 */
export function autoSizeCanvas(canvas) {
  const parent = canvas.parentElement;
  const rect = parent.getBoundingClientRect();
  const w = rect.width - 24; // account for padding
  const h = rect.height - 40; // account for title + padding
  return initCanvas(canvas, Math.max(w, 100), Math.max(h, 60));
}

/**
 * Clear entire canvas with a background color.
 */
export function clearCanvas(ctx, width, height, bgColor = 'transparent') {
  ctx.clearRect(0, 0, width, height);
}

/**
 * Draw axes and return transform functions for data→canvas mapping.
 */
export function drawAxes(ctx, config) {
  const {
    x, y, width, height,
    xLabel = '', yLabel = '',
    xMin, xMax, yMin, yMax,
    gridColor = 'rgba(0, 0, 0, 0.1)',
    labelColor = '#7a756f',
    tickCount = 5,
    showGrid = false
  } = config;

  const margin = { top: 8, right: 12, bottom: 36, left: 50 };
  const plotX = x + margin.left;
  const plotY = y + margin.top;
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  // Transform functions: data → canvas pixels
  const toCanvasX = (val) => plotX + ((val - xMin) / (xMax - xMin)) * plotW;
  const toCanvasY = (val) => plotY + plotH - ((val - yMin) / (yMax - yMin)) * plotH;

  // Draw axes lines
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(plotX, plotY);
  ctx.lineTo(plotX, plotY + plotH);
  ctx.lineTo(plotX + plotW, plotY + plotH);
  ctx.stroke();

  // Tick marks and labels
  ctx.fillStyle = labelColor;
  ctx.font = '11px Inter, sans-serif';

  // X-axis ticks
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= tickCount; i++) {
    const val = xMin + (xMax - xMin) * (i / tickCount);
    const cx = toCanvasX(val);
    ctx.beginPath();
    ctx.moveTo(cx, plotY + plotH);
    ctx.lineTo(cx, plotY + plotH + 4);
    ctx.stroke();
    ctx.fillText(formatTick(val), cx, plotY + plotH + 6);

    if (showGrid && i > 0 && i < tickCount) {
      ctx.save();
      ctx.strokeStyle = gridColor + '44';
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(cx, plotY);
      ctx.lineTo(cx, plotY + plotH);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Y-axis ticks
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= tickCount; i++) {
    const val = yMin + (yMax - yMin) * (i / tickCount);
    const cy = toCanvasY(val);
    ctx.beginPath();
    ctx.moveTo(plotX - 4, cy);
    ctx.lineTo(plotX, cy);
    ctx.stroke();
    ctx.fillText(formatTick(val), plotX - 6, cy);

    if (showGrid && i > 0 && i < tickCount) {
      ctx.save();
      ctx.strokeStyle = gridColor + '44';
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(plotX, cy);
      ctx.lineTo(plotX + plotW, cy);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Axis labels
  ctx.fillStyle = labelColor;
  ctx.font = '12px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  if (xLabel) ctx.fillText(xLabel, plotX + plotW / 2, plotY + plotH + 22);

  if (yLabel) {
    ctx.save();
    ctx.translate(x + 14, plotY + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'bottom';
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();
  }

  return {
    toCanvasX,
    toCanvasY,
    plotX, plotY, plotW, plotH
  };
}

/**
 * Draw a time series as a connected line.
 */
export function drawTimeSeries(ctx, data, transform, config = {}) {
  const { color = '#3d3b38', lineWidth = 1.5, opacity = 1 } = config;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const cx = transform.toCanvasX(i);
    const cy = transform.toCanvasY(data[i]);
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Animate a time series drawing point-by-point.
 * Returns a cancel() function.
 */
export function animateTimeSeries(ctx, fullData, transform, config = {}, onComplete) {
  const {
    color = '#3d3b38', lineWidth = 1.5,
    duration = 2000, pointsPerFrame
  } = config;

  const totalPoints = fullData.length;
  const ptsPerFrame = pointsPerFrame || Math.max(1, Math.ceil(totalPoints / (duration / 16.67)));
  let drawn = 0;
  let cancelled = false;
  let rafId;

  function frame() {
    if (cancelled) return;
    const end = Math.min(drawn + ptsPerFrame, totalPoints);

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (drawn > 0) {
      ctx.moveTo(transform.toCanvasX(drawn - 1), transform.toCanvasY(fullData[drawn - 1]));
    } else {
      ctx.moveTo(transform.toCanvasX(0), transform.toCanvasY(fullData[0]));
    }

    for (let i = drawn; i < end; i++) {
      ctx.lineTo(transform.toCanvasX(i), transform.toCanvasY(fullData[i]));
    }
    ctx.stroke();

    drawn = end;
    if (drawn < totalPoints) {
      rafId = requestAnimationFrame(frame);
    } else if (onComplete) {
      onComplete();
    }
  }

  rafId = requestAnimationFrame(frame);
  return () => { cancelled = true; cancelAnimationFrame(rafId); };
}

/**
 * Draw a bar chart (for ACF/PACF).
 */
export function drawBarChart(ctx, values, transform, config = {}) {
  const { color = '#4f87b8', barWidth = 0.5, startLag = 0 } = config;

  ctx.fillStyle = color;
  const zeroY = transform.toCanvasY(0);

  for (let i = 0; i < values.length; i++) {
    const lag = startLag + i;
    const cx = transform.toCanvasX(lag);
    const cy = transform.toCanvasY(values[i]);
    const bw = Math.max(2, (transform.toCanvasX(lag + barWidth) - transform.toCanvasX(lag)));

    ctx.fillRect(cx - bw / 2, Math.min(cy, zeroY), bw, Math.abs(cy - zeroY));
  }
}

/**
 * Animate bars growing from zero to their full values.
 * Returns cancel().
 */
export function animateBarChart(ctx, values, transform, config = {}, onComplete) {
  const { color = '#4f87b8', barWidth = 0.5, duration = 800, startLag = 0, bgColor = 'transparent' } = config;
  const startTime = performance.now();
  let cancelled = false;
  let rafId;

  // We need to clear the bar area each frame, so store the plot bounds
  const plotArea = {
    x: transform.plotX,
    y: transform.plotY,
    w: transform.plotW,
    h: transform.plotH
  };

  function frame(now) {
    if (cancelled) return;
    const t = Math.min((now - startTime) / duration, 1);
    const eased = easeOutCubic(t);

    // Clear plot area for bars (preserve axes)
    // We'll redraw the zero line and bars
    const zeroY = transform.toCanvasY(0);

    // Draw bars at current progress
    ctx.fillStyle = color;
    for (let i = 0; i < values.length; i++) {
      const lag = startLag + i;
      const cx = transform.toCanvasX(lag);
      const targetCy = transform.toCanvasY(values[i] * eased);
      const bw = Math.max(2, (transform.toCanvasX(lag + barWidth) - transform.toCanvasX(lag)));

      ctx.fillRect(cx - bw / 2, Math.min(targetCy, zeroY), bw, Math.abs(targetCy - zeroY));
    }

    if (t < 1) {
      rafId = requestAnimationFrame(frame);
    } else if (onComplete) {
      onComplete();
    }
  }

  rafId = requestAnimationFrame(frame);
  return () => { cancelled = true; cancelAnimationFrame(rafId); };
}

/**
 * Draw a horizontal reference line.
 */
export function drawHorizontalLine(ctx, y, transform, config = {}) {
  const {
    color = 'rgba(0,0,0,0.2)', lineWidth = 1,
    dash = [5, 5], label = ''
  } = config;

  const cy = transform.toCanvasY(y);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(transform.plotX, cy);
  ctx.lineTo(transform.plotX + transform.plotW, cy);
  ctx.stroke();
  ctx.setLineDash([]);

  if (label) {
    ctx.fillStyle = color;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, transform.plotX + transform.plotW + 4, cy);
  }
  ctx.restore();
}

/**
 * Draw ACF-style confidence bands (±1.96/√n).
 */
export function drawConfidenceBands(ctx, n, transform, config = {}) {
  const { color = 'rgba(79, 135, 184, 0.4)', lineWidth = 1, dash = [4, 4] } = config;
  const band = 1.96 / Math.sqrt(n);
  drawHorizontalLine(ctx, band, transform, { color, lineWidth, dash });
  drawHorizontalLine(ctx, -band, transform, { color, lineWidth, dash });
}

/**
 * Draw an arrow from one point to another.
 */
export function drawArrow(ctx, fromX, fromY, toX, toY, config = {}) {
  const { color = '#d97736', lineWidth = 1.5, headSize = 8 } = config;

  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;

  // Line
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Arrowhead
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headSize * Math.cos(angle - Math.PI / 6),
    toY - headSize * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - headSize * Math.cos(angle + Math.PI / 6),
    toY - headSize * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Draw a text label at a position.
 */
export function drawLabel(ctx, text, x, y, config = {}) {
  const {
    color = '#3d3b38',
    font = '13px Inter, sans-serif',
    align = 'left',
    baseline = 'bottom'
  } = config;

  ctx.save();
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * Draw a semi-transparent highlight region between two x-values.
 */
export function drawHighlightRegion(ctx, x1, x2, transform, config = {}) {
  const { color = 'rgba(217, 119, 54, 0.15)' } = config;
  const cx1 = transform.toCanvasX(x1);
  const cx2 = transform.toCanvasX(x2);

  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(cx1, transform.plotY, cx2 - cx1, transform.plotH);
  ctx.restore();
}

/**
 * Draw a mathematical curve by evaluating fn(x) at many points.
 */
export function drawCurve(ctx, fn, xMin, xMax, transform, config = {}) {
  const { color = '#9b7cb8', lineWidth = 2, steps = 200 } = config;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = 'round';
  ctx.beginPath();

  for (let i = 0; i <= steps; i++) {
    const xVal = xMin + (xMax - xMin) * (i / steps);
    const yVal = fn(xVal);
    const cx = transform.toCanvasX(xVal);
    const cy = transform.toCanvasY(yVal);
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Animate a curve drawing itself left-to-right.
 * Returns cancel().
 */
export function animateCurve(ctx, fn, xMin, xMax, transform, config = {}, onComplete) {
  const { color = '#9b7cb8', lineWidth = 2, steps = 200, duration = 1500 } = config;
  const startTime = performance.now();
  let cancelled = false;
  let rafId;

  function frame(now) {
    if (cancelled) return;
    const t = Math.min((now - startTime) / duration, 1);
    const eased = easeOutCubic(t);
    const currentSteps = Math.floor(eased * steps);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.beginPath();

    for (let i = 0; i <= currentSteps; i++) {
      const xVal = xMin + (xMax - xMin) * (i / steps);
      const yVal = fn(xVal);
      const cx = transform.toCanvasX(xVal);
      const cy = transform.toCanvasY(yVal);
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.restore();

    if (t < 1) {
      rafId = requestAnimationFrame(frame);
    } else if (onComplete) {
      onComplete();
    }
  }

  rafId = requestAnimationFrame(frame);
  return () => { cancelled = true; cancelAnimationFrame(rafId); };
}

/**
 * Draw a filled dot at a position.
 */
export function drawDot(ctx, x, y, config = {}) {
  const { color = '#c8a96e', radius = 5 } = config;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// --- Internal helpers ---

function formatTick(val) {
  if (Number.isInteger(val)) return val.toString();
  if (Math.abs(val) >= 100) return val.toFixed(0);
  if (Math.abs(val) >= 1) return val.toFixed(1);
  return val.toFixed(2);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
