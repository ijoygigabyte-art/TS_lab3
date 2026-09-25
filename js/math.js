// ============================================================
// math.js — Data Analysis Engine
// Seeded PRNG, time series simulation, ACF/PACF, utilities
// ============================================================

// --- Seeded PRNG (Mulberry32) ---
export class SeededRNG {
  constructor(seed) {
    this._seed = seed | 0;
    this._cachedNormal = null;
    this._hasCached = false;
  }

  next() {
    let a = (this._seed += 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextNormal(mean = 0, sd = 1) {
    // Box-Muller transform — cache second value
    if (this._hasCached) {
      this._hasCached = false;
      return this._cachedNormal * sd + mean;
    }
    let u1, u2;
    do { u1 = this.next(); } while (u1 === 0); // avoid log(0)
    u2 = this.next();
    const mag = Math.sqrt(-2.0 * Math.log(u1));
    const z0 = mag * Math.cos(2.0 * Math.PI * u2);
    const z1 = mag * Math.sin(2.0 * Math.PI * u2);
    this._cachedNormal = z1;
    this._hasCached = true;
    return z0 * sd + mean;
  }

  rnorm(n, mean = 0, sd = 1) {
    const result = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      result[i] = this.nextNormal(mean, sd);
    }
    return result;
  }
}

// --- Simulation ---

/**
 * Simulate an MA(1) process: X_t = ε_t + θ·ε_{t-1}
 * Returns Float64Array of length n (zero-mean).
 */
export function simulateMA1(n, theta, sigma, rng) {
  const innovations = rng.rnorm(n + 1, 0, sigma);
  const result = new Float64Array(n);
  for (let t = 0; t < n; t++) {
    result[t] = innovations[t + 1] + theta * innovations[t];
  }
  return result;
}

/**
 * Simulate an AR(1) process: Y_t = α·Y_{t-1} + w_t
 * Starts from Y_0 = 0. Returns Float64Array of length n.
 */
export function simulateAR1(n, alpha, sigma, rng) {
  const innovations = rng.rnorm(n, 0, sigma);
  const result = new Float64Array(n);
  result[0] = innovations[0]; // Y_0 implicitly 0, so Y_1 = w_1
  for (let t = 1; t < n; t++) {
    result[t] = alpha * result[t - 1] + innovations[t];
  }
  return result;
}

/**
 * Generate white noise: n independent N(0, σ²) values.
 */
export function simulateWhiteNoise(n, sigma, rng) {
  return rng.rnorm(n, 0, sigma);
}

/**
 * Simulate Y_t = intercept + slope*(t+1) + X_t, where X_t is MA(1) with thetaNoise.
 * Returns { y, trend, noise } each as Float64Array of length n.
 */
export function simulateTrendPlusNoise(n, intercept, slope, thetaNoise, sigma, rng) {
  const noise = simulateMA1(n, thetaNoise, sigma, rng);
  const trend = new Float64Array(n);
  const y = new Float64Array(n);
  for (let t = 0; t < n; t++) {
    trend[t] = intercept + slope * (t + 1);
    y[t] = trend[t] + noise[t];
  }
  return { y, trend, noise };
}

/**
 * Simulate a random walk with drift: Y_t = Y_{t-1} + drift + w_t
 * Implemented via cumulative sums.
 * Returns { walk, increments } each as Float64Array.
 */
export function simulateRandomWalk(n, drift, sigma, rng) {
  const wt = rng.rnorm(n, 0, sigma);
  const increments = new Float64Array(n);
  const walk = new Float64Array(n);
  for (let t = 0; t < n; t++) {
    increments[t] = drift + wt[t];
  }
  walk[0] = increments[0];
  for (let t = 1; t < n; t++) {
    walk[t] = walk[t - 1] + increments[t];
  }
  return { walk, increments };
}

// --- Statistics ---

/**
 * Sample autocorrelation function.
 * Returns Float64Array of length lagMax+1 (index 0 = lag 0 = 1.0).
 */
export function computeACF(series, lagMax) {
  const n = series.length;
  const result = new Float64Array(lagMax + 1);

  // Sample mean
  let mean = 0;
  for (let i = 0; i < n; i++) mean += series[i];
  mean /= n;

  // γ̂₀ (variance)
  let gamma0 = 0;
  for (let i = 0; i < n; i++) {
    const d = series[i] - mean;
    gamma0 += d * d;
  }
  gamma0 /= n;

  if (gamma0 === 0) {
    result[0] = 1;
    return result; // constant series — all correlations 0 except lag 0
  }

  result[0] = 1.0;
  for (let k = 1; k <= lagMax; k++) {
    let gammaK = 0;
    for (let i = 0; i < n - k; i++) {
      gammaK += (series[i] - mean) * (series[i + k] - mean);
    }
    gammaK /= n;
    result[k] = gammaK / gamma0;
  }
  return result;
}

/**
 * Sample partial autocorrelation function (Durbin-Levinson algorithm).
 * Returns Float64Array of length lagMax (index 0 = lag 1).
 */
export function computePACF(series, lagMax) {
  const acfVals = computeACF(series, lagMax);
  const result = new Float64Array(lagMax);

  // r[k] = acfVals[k] for convenience
  const r = acfVals;

  // Durbin-Levinson recursion
  // phi[k][j] — we only need current and previous row
  let phiPrev = new Float64Array(lagMax + 1);
  let phiCurr = new Float64Array(lagMax + 1);

  // k = 1
  phiCurr[1] = r[1];
  result[0] = r[1];

  for (let k = 2; k <= lagMax; k++) {
    // Swap
    [phiPrev, phiCurr] = [phiCurr, new Float64Array(lagMax + 1)];

    // Numerator: r[k] - sum_{j=1}^{k-1} phi_{k-1,j} * r[k-j]
    let num = r[k];
    for (let j = 1; j < k; j++) {
      num -= phiPrev[j] * r[k - j];
    }

    // Denominator: 1 - sum_{j=1}^{k-1} phi_{k-1,j} * r[j]
    let den = 1;
    for (let j = 1; j < k; j++) {
      den -= phiPrev[j] * r[j];
    }

    phiCurr[k] = den === 0 ? 0 : num / den;
    result[k - 1] = phiCurr[k];

    // Update phi_{k,j} for j = 1, ..., k-1
    for (let j = 1; j < k; j++) {
      phiCurr[j] = phiPrev[j] - phiCurr[k] * phiPrev[k - j];
    }
  }
  return result;
}

/**
 * First differences: diff[i] = series[i+1] - series[i]
 */
export function diff(series) {
  const n = series.length;
  const result = new Float64Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    result[i] = series[i + 1] - series[i];
  }
  return result;
}

/**
 * Cumulative sums: cumsum[i] = series[0] + ... + series[i]
 */
export function cumsum(series) {
  const n = series.length;
  const result = new Float64Array(n);
  result[0] = series[0];
  for (let i = 1; i < n; i++) {
    result[i] = result[i - 1] + series[i];
  }
  return result;
}

// --- Theoretical formulas ---

/**
 * Theoretical MA(1) ACF: ρ₀=1, ρ₁=θ/(1+θ²), ρₖ=0 for k≥2.
 */
export function theoreticalMA1ACF(theta, lagMax) {
  const result = new Float64Array(lagMax + 1);
  result[0] = 1;
  if (lagMax >= 1) {
    result[1] = theta / (1 + theta * theta);
  }
  // k >= 2 already 0
  return result;
}

/**
 * Theoretical AR(1) ACF: ρₖ = αᵏ.
 */
export function theoreticalAR1ACF(alpha, lagMax) {
  const result = new Float64Array(lagMax + 1);
  for (let k = 0; k <= lagMax; k++) {
    result[k] = Math.pow(alpha, k);
  }
  return result;
}

/**
 * MA(1) variance: γ₀ = (1 + θ²)σ²
 */
export function ma1Variance(theta, sigma) {
  return (1 + theta * theta) * sigma * sigma;
}

/**
 * AR(1) variance: γ₀ = σ² / (1 - α²)
 */
export function ar1Variance(alpha, sigma) {
  return (sigma * sigma) / (1 - alpha * alpha);
}

/**
 * MA(1) lag-1 autocorrelation: ρ₁ = θ / (1 + θ²)
 */
export function ma1Rho1(theta) {
  return theta / (1 + theta * theta);
}

// --- Confidence bands ---

/**
 * ACF confidence band: ±z / √n
 * For 95% confidence: ±1.96 / √n
 */
export function acfConfidenceBand(n, confidence = 0.95) {
  // z-value for common confidence levels
  const zMap = { 0.90: 1.645, 0.95: 1.96, 0.99: 2.576 };
  const z = zMap[confidence] || 1.96;
  return z / Math.sqrt(n);
}

// --- Utility: array statistics ---

export function mean(arr) {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s / arr.length;
}

export function variance(arr) {
  const m = mean(arr);
  let s = 0;
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i] - m;
    s += d * d;
  }
  return s / arr.length;
}
