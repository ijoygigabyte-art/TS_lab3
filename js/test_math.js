// Quick validation of math.js against PDF reference values
import {
  SeededRNG, simulateMA1, simulateAR1, simulateWhiteNoise,
  simulateTrendPlusNoise, simulateRandomWalk,
  computeACF, computePACF, diff, cumsum,
  theoreticalMA1ACF, theoreticalAR1ACF,
  ma1Variance, ar1Variance, ma1Rho1,
  acfConfidenceBand, mean
} from './math.js';

console.log('=== VALIDATION: math.js vs PDF reference values ===\n');

// --- Theoretical formulas ---
console.log('--- Theoretical Formulas ---');

// MA(1) θ = -0.6, σ = 1
const theta_f = -0.6;
const gamma0_ma1 = ma1Variance(theta_f, 1);
const rho1_ma1 = ma1Rho1(theta_f);
console.log(`MA(1) θ=-0.6: γ₀ = ${gamma0_ma1.toFixed(4)} (expect 1.3600)`);
console.log(`MA(1) θ=-0.6: ρ₁ = ${rho1_ma1.toFixed(7)} (expect -0.4411765)`);

// AR(1) α = 0.8, σ = 1
const alpha_f = 0.8;
const gamma0_ar1 = ar1Variance(alpha_f, 1);
const ar1_acf = theoreticalAR1ACF(alpha_f, 5);
console.log(`AR(1) α=0.8:  γ₀ = ${gamma0_ar1.toFixed(6)} (expect 2.777778)`);
console.log(`AR(1) α=0.8:  ρ₁=${ar1_acf[1]}, ρ₂=${ar1_acf[2]}, ρ₃=${ar1_acf[3].toFixed(3)} (expect 0.8, 0.64, 0.512)`);

// Exercise 5: MA(1) θ=0.9 vs AR(1) α=0.5
const rho1_ex5_ma = ma1Rho1(0.9);
console.log(`Ex5 MA(1) θ=0.9: ρ₁ = ${rho1_ex5_ma.toFixed(7)} (expect 0.4972376)`);
console.log(`Ex5 AR(1) α=0.5: ρ₁ = 0.5 (trivially correct)\n`);

// --- Seeded RNG reproducibility ---
console.log('--- Seeded RNG Reproducibility ---');
const rng1 = new SeededRNG(42);
const vals1 = [rng1.next(), rng1.next(), rng1.next()];
const rng2 = new SeededRNG(42);
const vals2 = [rng2.next(), rng2.next(), rng2.next()];
const match = vals1.every((v, i) => v === vals2[i]);
console.log(`Same seed produces same sequence: ${match ? 'PASS ✓' : 'FAIL ✗'}`);
console.log(`Sample values: ${vals1.map(v => v.toFixed(6)).join(', ')}\n`);

// --- Simulation shape checks ---
console.log('--- Simulation Shape Checks ---');
const rng = new SeededRNG(101);
const ma1_series = simulateMA1(400, -0.6, 1, rng);
console.log(`MA(1) length: ${ma1_series.length} (expect 400)`);
console.log(`MA(1) + const mean: ${(mean(ma1_series) + 10).toFixed(4)} (expect ≈ 10)`);

const rng3 = new SeededRNG(101);
const ma1_acf = computeACF(simulateMA1(400, -0.6, 1, rng3), 15);
console.log(`MA(1) sample ρ₁: ${ma1_acf[1].toFixed(4)} (expect ≈ -0.37 to -0.44)`);
console.log(`MA(1) ACF[0]: ${ma1_acf[0]} (expect exactly 1.0)`);

const rng4 = new SeededRNG(202);
const ar1_series = simulateAR1(400, 0.8, 1, rng4);
const ar1_sample_acf = computeACF(ar1_series, 3);
console.log(`AR(1) sample ρ₁=${ar1_sample_acf[1].toFixed(4)}, ρ₂=${ar1_sample_acf[2].toFixed(4)}, ρ₃=${ar1_sample_acf[3].toFixed(4)}`);
console.log(`  (expect ≈ 0.8, 0.64, 0.51 — sample will vary)\n`);

// --- PACF check ---
console.log('--- PACF Check ---');
const ar1_pacf = computePACF(ar1_series, 5);
console.log(`AR(1) PACF lag1: ${ar1_pacf[0].toFixed(4)} (expect large, near α=0.8)`);
console.log(`AR(1) PACF lag2: ${ar1_pacf[1].toFixed(4)} (expect small, near 0)`);
console.log(`AR(1) PACF lag3: ${ar1_pacf[2].toFixed(4)} (expect small, near 0)\n`);

// --- diff / cumsum ---
console.log('--- diff() and cumsum() ---');
const testArr = new Float64Array([1, 3, 6, 10, 15]);
const d = diff(testArr);
console.log(`diff([1,3,6,10,15]) = [${Array.from(d).join(',')}] (expect [2,3,4,5])`);
console.log(`diff length: ${d.length} (expect 4)`);
const cs = cumsum(new Float64Array([1, 2, 3, 4, 5]));
console.log(`cumsum([1,2,3,4,5]) = [${Array.from(cs).join(',')}] (expect [1,3,6,10,15])\n`);

// --- Exercise 3: trend ---
console.log('--- Exercise 3: Trend + Noise ---');
const rng5 = new SeededRNG(303);
const ex3 = simulateTrendPlusNoise(160, 2, 0.5, 0.5, 1, rng5);
const diffY = diff(ex3.y);
console.log(`Ex3 diff mean: ${mean(diffY).toFixed(4)} (expect ≈ 0.5)\n`);

// --- Exercise 4: random walk ---
console.log('--- Exercise 4: Random Walk ---');
const rng6 = new SeededRNG(404);
const ex4 = simulateRandomWalk(300, 0.3, 1, rng6);
const diffWalk = diff(ex4.walk);
console.log(`Ex4 diff mean: ${mean(diffWalk).toFixed(4)} (expect ≈ 0.3)`);

// --- Confidence band ---
console.log(`\nACF 95% band for n=400: ±${acfConfidenceBand(400).toFixed(4)} (expect ±0.098)`);

console.log('\n=== VALIDATION COMPLETE ===');
