# Agent Task Prompts

> Each prompt below is **self-contained** — copy-paste it to a sub-agent and it has everything needed to complete the task. Prompts reference shared interfaces so modules connect cleanly.

---

## Shared Context (included in every prompt)

Every agent prompt should be prefixed with this block:

```
PROJECT CONTEXT:
You are building one module of a browser-based interactive time series lecture app.
- Location: e:\SEM3\TS_5306\lab3\
- Tech: Vanilla HTML/CSS/JS, ES modules, HTML5 Canvas 2D, no build tools
- All JS files use `export` and are imported via `<script type="module">`
- Color palette:
    Page bg: #2a2a30 | Card bg: #38383f | Card border: #50505a
    Primary text: #e0ddd8 | Secondary text: #9e9b95 | Narration text: #d4cfc8
    Canvas bg: #2f2f36 | Axes: #5a5a64
    MA(1): #6b9bc3 | AR(1): #d4816b | Trend: #7aaa6e
    Walk: #b85c5c | Differenced: #6b82b8 | Bound: #9b7cb8
    CTA/gold: #c8a96e
- Fonts: Inter (body), JetBrains Mono (formulas/code)
```

---

## Task 1: `js/math.js` — Data Analysis Engine

**File**: `e:\SEM3\TS_5306\lab3\js\math.js`

**Objective**: Port all R simulation and statistical computation logic from the lecture PDF into a single JS module. This is the mathematical foundation — no UI, no DOM, no Canvas.

**Exports** (every function below must be exported):

```js
// --- Seeded PRNG ---
export class SeededRNG {
  constructor(seed)          // Initialize with integer seed
  next()                     // Returns float in [0, 1)
  nextNormal(mean, sd)       // Returns normally-distributed value (Box-Muller)
  rnorm(n, mean = 0, sd = 1) // Returns array of n normal values
}

// --- Simulation ---
export function simulateMA1(n, theta, sigma, rng)
// Returns Float64Array of length n.
// Implements: X_t = ε_t + θ·ε_{t-1}, where ε_t ~ N(0, σ²)
// The rng parameter is a SeededRNG instance.
// Generate n+1 innovations internally using rng.rnorm(n+1, 0, sigma),
// then compute the MA(1) recursion, returning the last n values.

export function simulateAR1(n, alpha, sigma, rng)
// Returns Float64Array of length n.
// Implements: Y_t = α·Y_{t-1} + w_t, where w_t ~ N(0, σ²)
// Start from Y_0 = 0. Generate n innovations using rng.rnorm(n, 0, sigma).

export function simulateWhiteNoise(n, sigma, rng)
// Returns Float64Array of n values from N(0, σ²).

export function simulateTrendPlusNoise(n, intercept, slope, thetaNoise, sigma, rng)
// Returns { y: Float64Array, trend: Float64Array, noise: Float64Array }
// y[t] = intercept + slope*(t+1) + X_t, where X_t is MA(1) with thetaNoise.

export function simulateRandomWalk(n, drift, sigma, rng)
// Returns { walk: Float64Array, increments: Float64Array }
// increments[t] = drift + w_t; walk[t] = cumsum(increments)[t]

// --- Statistics ---
export function computeACF(series, lagMax)
// Returns Float64Array of length lagMax+1 (index 0 = lag 0 = 1.0).
// Formula: r_k = (1/n) Σ (x_t - x̄)(x_{t+k} - x̄) / γ̂₀
// Must subtract sample mean before computing.

export function computePACF(series, lagMax)
// Returns Float64Array of length lagMax (index 0 = lag 1).
// Use Durbin-Levinson algorithm:
//   φ₁₁ = r₁
//   φ_{k,k} = (r_k - Σ_{j=1}^{k-1} φ_{k-1,j}·r_{k-j}) / (1 - Σ_{j=1}^{k-1} φ_{k-1,j}·r_j)
//   φ_{k,j} = φ_{k-1,j} - φ_{k,k}·φ_{k-1,k-j}  for j=1,...,k-1

export function diff(series)
// Returns Float64Array of length series.length - 1.
// diff[i] = series[i+1] - series[i]

export function cumsum(series)
// Returns Float64Array of length series.length.
// cumsum[i] = series[0] + series[1] + ... + series[i]

// --- Theoretical formulas ---
export function theoreticalMA1ACF(theta, lagMax)
// Returns array of length lagMax+1.
// rho_0 = 1, rho_1 = theta/(1+theta^2), rho_k = 0 for k >= 2.

export function theoreticalAR1ACF(alpha, lagMax)
// Returns array of length lagMax+1.
// rho_k = alpha^k for k >= 0.

export function ma1Variance(theta, sigma)
// Returns (1 + theta^2) * sigma^2

export function ar1Variance(alpha, sigma)
// Returns sigma^2 / (1 - alpha^2)

export function ma1Rho1(theta)
// Returns theta / (1 + theta^2)

// --- Confidence bands ---
export function acfConfidenceBand(n, confidence = 0.95)
// Returns ± z / √n where z is the normal quantile.
// For 95%: ± 1.96 / √n
```

**Seeded PRNG specification**:
- Use the **Mulberry32** algorithm (simple, fast, deterministic):
  ```
  next(): a = (seed += 0x6D2B79F5) | 0;
          t = Math.imul(a ^ (a >>> 15), 1 | a);
          t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  ```
- **Box-Muller** for normal: generate two uniform U1,U2, return `sqrt(-2*ln(U1)) * cos(2π*U2) * sd + mean`. Cache the second value for the next call.

**Reference values from the PDF for validation** (write a test at the bottom of the file, guarded by `if (import.meta.url ...)` or as comments):

| Exercise | Parameters | Expected output |
|----------|-----------|-----------------|
| Formula MA(1) | θ = −0.6, σ = 1 | γ₀ = 1.36, ρ₁ = −0.4412 |
| Formula AR(1) | α = 0.8, σ = 1 | γ₀ = 2.7778, ρ₁ = 0.8, ρ₂ = 0.64, ρ₃ = 0.512 |
| Ex1 | θ = −0.6, σ = 1, n = 400, mean = 10 | series mean ≈ 10, sample ρ₁ ≈ −0.37 |
| Ex2 | α = 0.8, σ = 1, n = 400 | sample ρ₁ ≈ 0.82, ρ₂ ≈ 0.67, ρ₃ ≈ 0.56 |
| Ex3 | intercept = 2, slope = 0.5, θ = 0.5, n = 160 | mean(diff) ≈ 0.5 |
| Ex4 | drift = 0.3, σ = 1, n = 300 | mean(diff) ≈ 0.3 |
| Ex5 | MA(1) θ = 0.9 → ρ₁ ≈ 0.4972; AR(1) α = 0.5 → ρ₁ = 0.5 |

**Acceptance criteria**:
- [x] All exported functions work in a browser `<script type="module">` context
- [x] SeededRNG with same seed produces identical sequences across calls
- [x] `computeACF` at lag 0 always returns exactly 1.0
- [x] `computePACF` produces values in [−1, 1]
- [x] Theoretical formula functions match the PDF's printed values exactly
- [x] `diff(series).length === series.length - 1`
- [x] No DOM access, no `document`, no `window` (pure math)

---

## Task 2: `css/style.css` — Design System

**File**: `e:\SEM3\TS_5306\lab3\css\style.css`

**Objective**: Create the complete CSS design system — layout, colors, typography, cards, orb, navigation, animations. No JavaScript. This file must make the raw HTML skeleton look finished.

**Specifications**:

### Reset & Base
```css
/* Box-sizing, margin reset, font smoothing */
/* Import Inter and JetBrains Mono from Google Fonts via @import */
/* Root variables for all colors from the palette */
```

### Layout (CSS Grid)
```
┌─────────────────────────────────────────────┐
│  .header-bar  (mute icon right-aligned)     │
├──────────────────────┬──────────────────────┤
│                      │                      │
│  .narration-panel    │  .canvas-zone        │
│  (left, ~35% width)  │  (right, ~65% width) │
│                      │  (holds 1-4 canvases)│
│                      │                      │
├──────────────────────┴──────────────────────┤
│  .nav-bar  (scene dots, back/next buttons)  │
└─────────────────────────────────────────────┘
```
- Full viewport height (`100vh`), no scrolling on main layout
- `.canvas-zone` uses CSS grid internally for 1-col, 2-col, or 2×3 sub-layouts (scenes need different arrangements)
- Responsive: on screens < 768px, stack narration above canvas

### Cards
- `.card` — bg `#38383f`, border `1px solid #50505a`, border-radius `12px`, padding `20px 24px`, `box-shadow: 0 2px 12px rgba(0,0,0,0.3)`
- `.card--insight` — slight left border accent in current scene color (use CSS variable `--accent`)
- `.card--takeaway` — gold left border (`#c8a96e`), slightly brighter bg

### Narration Panel
- `.narration-panel` — card-style container on the left
- `.narration-text` — font-size `1.05rem`, line-height `1.7`, color `#d4cfc8`
- `.narration-formula` — JetBrains Mono, slightly larger, color `#e0ddd8`
- `.narration-text.entering` — opacity transition from 0→1 over 400ms ease-out

### Canvas containers
- `.canvas-wrapper` — bg `#2f2f36`, border-radius `8px`, padding `8px`, holds a `<canvas>` at 100% width
- `.canvas-wrapper__title` — small label above canvas, secondary text color

### Orb (Avatar)
```css
.orb-container { position: fixed; bottom: 80px; right: 32px; z-index: 100; }
.orb {
  width: 60px; height: 60px; border-radius: 50%;
  background: radial-gradient(circle at 40% 40%, #c8a96e, #c8a96e88, transparent);
  box-shadow: 0 0 20px #c8a96e55, 0 0 40px #c8a96e22;
  animation: orb-float 3s ease-in-out infinite;
}
.orb--speaking { animation: orb-float 3s ease-in-out infinite, orb-pulse 0.8s ease-in-out infinite; }
.orb--thinking { opacity: 0.6; filter: hue-rotate(15deg); }
```
- `@keyframes orb-float` — translateY(0 → -8px → 0)
- `@keyframes orb-pulse` — box-shadow spread 20px → 35px → 20px, brightness 1 → 1.2 → 1

### Navigation Bar
- `.nav-bar` — fixed bottom, full width, bg `#2a2a30e0`, backdrop-filter blur, height `56px`, flex centered
- `.nav-dot` — 10px circles: empty = `#50505a` border, filled = `#9e9b95` solid, current = `#c8a96e` with glow
- `.nav-btn` — ghost button, gold border on hover, `Continue →` uses gold bg on active beat

### Button Styles
- `.btn-continue` — gold bg `#c8a96e`, dark text `#2a2a30`, rounded, appears with fade-in
- `.btn-toggle` — outlined, for "Apply diff()" etc.
- `.btn-mute` — icon-only, top-right, subtle

### Slider
- Custom range input: track color `#50505a`, thumb gold `#c8a96e`, filled portion uses `--accent`

### Transitions
- `.scene-enter` — fade-in 300ms
- `.scene-exit` — fade-out 200ms
- All interactive elements: `transition: all 0.2s ease`

**Acceptance criteria**:
- [x] Opening `index.html` with only the HTML skeleton shows a complete, polished layout
- [x] All CSS variables defined in `:root`
- [x] Orb animations run smoothly (GPU-composited: only transform/opacity)
- [x] No horizontal scroll at any viewport width
- [x] Fonts loaded from Google Fonts CDN

---

## Task 3: `index.html` + `js/main.js` — App Shell & Scene Router

**Files**:
- `e:\SEM3\TS_5306\lab3\index.html`
- `e:\SEM3\TS_5306\lab3\js\main.js`

**Objective**: Create the HTML skeleton and the scene lifecycle engine. `main.js` is the orchestrator — it does not contain scene-specific logic, only the framework.

### `index.html` Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Time Series Explorer — Stationarity, MA(1), AR(1) & Differencing</title>
  <meta name="description" content="Interactive lecture walkthrough of time series stationarity concepts">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header class="header-bar">
    <span class="header-title">Time Series Explorer</span>
    <button class="btn-mute" id="mute-toggle" aria-label="Toggle sound">🔊</button>
  </header>

  <main class="app-layout">
    <aside class="narration-panel" id="narration-panel">
      <div class="narration-text" id="narration-text"></div>
      <button class="btn-continue" id="btn-continue">Continue →</button>
    </aside>
    <section class="canvas-zone" id="canvas-zone">
      <!-- Scenes inject their canvases and controls here -->
    </section>
  </main>

  <div class="orb-container" id="orb-container">
    <div class="orb" id="orb"></div>
  </div>

  <nav class="nav-bar" id="nav-bar">
    <button class="nav-btn" id="btn-back">← Back</button>
    <div class="nav-dots" id="nav-dots"></div>
    <button class="nav-btn nav-btn--primary" id="btn-next">Continue →</button>
    <span class="nav-progress" id="nav-progress"></span>
  </nav>

  <script type="module" src="js/main.js"></script>
</body>
</html>
```

### `main.js` Scene Lifecycle

```js
// Import all scenes
import { scene0 } from './scenes/scene0.js';
import { scene1 } from './scenes/scene1.js';
// ... etc.
import { narrator } from './narrator.js';
import { avatar } from './avatar.js';
import { audio } from './audio.js';
```

**Scene interface** — every scene module must export an object with:
```js
{
  id: 'scene0',
  title: 'What Is White Noise?',
  beats: [
    {
      narration: "Text to display and speak",
      action: async (ctx) => { /* animate canvas, show elements */ },
      // ctx has: { canvasZone, narrator, avatar, audio, math }
    },
    // ...more beats
  ],
  setup: (canvasZone) => { /* create canvases, sliders, inject DOM */ },
  cleanup: () => { /* remove scene-specific DOM, cancel animations */ },
}
```

**main.js must implement**:
```js
export class App {
  constructor()
  scenes          // Array of scene objects
  currentScene    // Index
  currentBeat     // Index within scene

  async init()             // Set up nav, load first scene
  async goToScene(index)   // Cleanup current, setup new, start beat 0
  async advanceBeat()      // Run next beat's narration + action
  async goBack()           // Go to previous beat, or previous scene's last beat

  setupNavDots()           // Render dot indicators
  updateNavState()         // Update dots, progress text, button states
  bindKeyboard()           // Space/→ = advance, ← = back, R = replay, M = mute
}
```

**Navigation rules**:
- "Continue →" advances through beats, then to next scene
- "← Back" reverses through beats, then to previous scene
- Bottom dots are clickable to jump to any visited scene
- Progress text: "Scene 2 of 6 · Step 4 of 7"
- "Continue" button in narration panel and "Continue →" in nav bar are synced (both do the same thing)

**Acceptance criteria**:
- [x] Page loads with no errors in console
- [x] Scene 0 setup runs on load
- [x] Pressing → advances beats sequentially
- [x] Navigation dots update correctly
- [x] Scene transitions call `cleanup()` then `setup()`
- [x] Keyboard shortcuts all work (Space, arrows, R, M)

---

## Task 4: `js/canvas.js` — Canvas Drawing Helpers

**File**: `e:\SEM3\TS_5306\lab3\js\canvas.js`

**Objective**: Reusable Canvas 2D drawing functions for time-series plots, bar charts (ACF/PACF), axes, annotations, and animations. All functions take a `CanvasRenderingContext2D` and data — they do NOT create canvases or manage DOM.

**Exports**:

```js
// --- Canvas setup ---
export function initCanvas(canvas, width, height)
// Sets canvas dimensions (accounting for devicePixelRatio for sharp rendering).
// Returns { ctx, width, height, dpr }.

// --- Axes ---
export function drawAxes(ctx, config)
// config: { x, y, width, height, xLabel, yLabel, xMin, xMax, yMin, yMax,
//           gridColor = '#5a5a64', labelColor = '#9e9b95', tickCount = 5 }
// Draws x and y axes with labels, tick marks, and optional grid lines.
// Returns a `transform` object: { toCanvasX(val), toCanvasY(val) }
// so callers can convert data coordinates to pixel coordinates.

// --- Time series line ---
export function drawTimeSeries(ctx, data, transform, config)
// config: { color, lineWidth = 1.5, opacity = 1 }
// Draws data as a connected line using transform.toCanvasX/Y.

export function animateTimeSeries(ctx, fullData, transform, config, onComplete)
// Draws the series point-by-point over time.
// config: { color, lineWidth, duration = 2000 (ms), pointsPerFrame = 5 }
// Calls onComplete() when finished.
// Returns a cancel() function to abort the animation.

// --- Bar chart (ACF/PACF) ---
export function drawBarChart(ctx, values, transform, config)
// config: { color, barWidth = 0.6, startLag = 0 }
// Draws vertical bars from 0 line to each value. Bar at index i is at x = startLag + i.

export function animateBarChart(ctx, values, transform, config, onComplete)
// Bars grow from 0 to full height over duration.
// config: { color, barWidth, duration = 800 }
// Returns cancel().

// --- Reference lines ---
export function drawHorizontalLine(ctx, y, transform, config)
// config: { color = '#5a5a64', lineWidth = 1, dash = [5,5], label = '' }

export function drawConfidenceBands(ctx, n, transform, config)
// Draws ±1.96/√n dashed horizontal lines (blue bands like R's acf plot).
// config: { color = '#6b9bc388', lineWidth = 1, dash = [4,4] }

// --- Annotations ---
export function drawArrow(ctx, fromX, fromY, toX, toY, config)
// config: { color = '#c8a96e', lineWidth = 1.5, headSize = 8 }
// Draws a line with arrowhead from (fromX,fromY) to (toX,toY) in canvas pixels.

export function drawLabel(ctx, text, x, y, config)
// config: { color = '#e0ddd8', font = '13px Inter', align = 'left', baseline = 'bottom' }

export function drawHighlightRegion(ctx, x1, x2, transform, config)
// Semi-transparent rectangle from x1 to x2 across full height.
// config: { color = '#c8a96e22' }

// --- Curve drawing (for Exercise 5) ---
export function drawCurve(ctx, fn, xMin, xMax, transform, config)
// Evaluates fn(x) at many points and draws a smooth line.
// config: { color, lineWidth = 2, steps = 200 }

export function animateCurve(ctx, fn, xMin, xMax, transform, config, onComplete)
// Curve draws itself left to right over duration.
// Returns cancel().

// --- Utility ---
export function clearCanvas(ctx, width, height, bgColor = '#2f2f36')
// Fills entire canvas with background color.
```

**Important details**:
- All pixel math must account for `devicePixelRatio` (set in `initCanvas`)
- `transform` object is the key bridge between data space and canvas pixels
- Animation functions use `requestAnimationFrame` and return a `cancel()` function
- Colors default to the project palette but are always overridable

**Acceptance criteria**:
- [x] `drawAxes` produces labeled axes with correct tick values for any data range
- [x] `drawTimeSeries` renders a clean anti-aliased line
- [x] `animateTimeSeries` draws data incrementally over the specified duration
- [x] `drawBarChart` bars are centered on integer lag positions
- [x] `drawConfidenceBands` uses ±1.96/√n
- [x] `drawArrow` renders a visible arrowhead
- [x] All animation functions are cancellable without errors
- [x] No DOM access — only `ctx` operations

---

## Task 5: `js/narrator.js` — Beat Sequencer & Text Controller

**File**: `e:\SEM3\TS_5306\lab3\js\narrator.js`

**Objective**: Manages the narration panel — displaying text beat-by-beat with fade transitions, showing/hiding the "Continue" button, and coordinating with audio for voice timing.

**Exports**:

```js
export const narrator = {
  init(elements)
  // elements: { textEl, continueBtn }
  // Stores references. Sets up continue button click handler.

  async showBeat(beat, audio, avatar)
  // 1. Fade out current text (200ms)
  // 2. Set new text content (supports HTML for formulas: <span class="formula">...</span>)
  // 3. Fade in new text (400ms)
  // 4. Trigger audio.speak(beat.narration) — returns a Promise
  // 5. Set avatar to 'speaking' state
  // 6. Wait for speech to finish (or be interrupted)
  // 7. Set avatar to 'idle'
  // 8. Show "Continue" button with fade-in
  // 9. Return a Promise that resolves when user clicks Continue

  hideContinue()
  // Hides the continue button immediately.

  showFormula(latex)
  // Displays a formula string in the narration panel below current text.
  // Use JetBrains Mono font class.

  clear()
  // Clears narration text and hides continue button.

  onContinue(callback)
  // Register a callback for when continue is clicked.
  // The callback should be set by main.js to call advanceBeat().
}
```

**Text rendering rules**:
- Narration text is plain strings from beat definitions
- Formulas wrapped in backticks in the source get rendered with `.formula` class
- Support simple markup: `*emphasis*` → `<em>`, formulas between `` ` `` → `<code class="formula">`
- Text transitions: opacity 0→1 with CSS class `.entering` (400ms ease-out)

**Coordination with audio/avatar**:
- `showBeat` calls `audio.speak()` which returns a Promise resolving when speech ends
- While speaking, avatar is in `'speaking'` state
- If user clicks "Continue" during speech, call `audio.cancelSpeech()`, then resolve immediately
- The returned Promise from `showBeat` resolves with `'completed'` (speech finished) or `'skipped'` (user interrupted)

**Acceptance criteria**:
- [x] Text fades smoothly between beats (no flash of empty content)
- [x] Continue button only appears after speech completes (or when muted, after a short delay)
- [x] Clicking Continue during speech interrupts it and advances
- [x] `clear()` leaves the panel visually empty
- [x] Formulas render in monospace font

---

## Task 6: `js/avatar.js` — Orb Rendering & Animation

**File**: `e:\SEM3\TS_5306\lab3\js\avatar.js`

**Objective**: Control the floating orb's visual state — idle bobbing, speaking pulse, thinking mode, and scene transitions. Pure DOM/CSS manipulation.

**Exports**:

```js
export const avatar = {
  init(orbEl)
  // Store reference to the .orb element.

  setState(state)
  // state: 'idle' | 'speaking' | 'thinking'
  // 'idle': class .orb (default float animation)
  // 'speaking': class .orb--speaking (adds pulse animation)
  // 'thinking': class .orb--thinking (dims, slow rotate ring)
  // Removes other state classes before adding new one.

  transitionScene()
  // Quick animation: scale(1) → scale(0.3) → translate → scale(1)
  // Duration: ~400ms total. Use CSS transition or JS animation.
  // Returns a Promise that resolves when transition completes.

  pulse()
  // Trigger a single pulse (for manual sync with speech events).
  // Briefly increase box-shadow spread, then return to current state.

  hide()
  // Fade out the orb (for intro before it appears).

  show()
  // Fade in the orb.
}
```

**Visual states detail**:
- **idle**: `animation: orb-float 3s ease-in-out infinite` — gentle up-down bob of 8px
- **speaking**: idle float continues + `animation: orb-pulse 0.8s ease-in-out infinite` — glow expands/contracts. Core brightens via filter brightness.
- **thinking**: opacity 0.6, box-shadow reduced, optional slow ring rotation (a pseudo-element ring spinning around the orb, `border: 1px solid #c8a96e44`, rotating 360° over 4s)

**Implementation notes**:
- All animations should be CSS-based for performance (GPU compositing)
- State changes just swap CSS classes — the animations are defined in `style.css`
- `transitionScene()` should use the Web Animations API (`orbEl.animate(...)`) for the zip effect

**Acceptance criteria**:
- [x] Orb bobs smoothly at 60fps when idle
- [x] Speaking pulse is visually distinct from idle
- [x] State transitions are instant (no lingering animations from previous state)
- [x] `transitionScene()` returns a Promise that resolves at the right time
- [x] No layout shifts when orb changes state

---

## Task 7: `js/audio.js` — Voice & Sound Effects

**File**: `e:\SEM3\TS_5306\lab3\js\audio.js`

**Objective**: Cartoon voice narration via Web Speech API and programmatic sound effects via Web Audio API. Mute control.

**Exports**:

```js
export const audio = {
  init()
  // Create AudioContext (lazy — on first user interaction to satisfy autoplay policy).
  // Check SpeechSynthesis availability.

  async speak(text)
  // Create SpeechSynthesisUtterance with cartoon settings:
  //   pitch: 1.5, rate: 1.1, voice: first en-US voice available
  // Start speaking. Returns a Promise that resolves when speech ends.
  // If muted, resolve immediately (but wait 1500ms to simulate timing for beat pacing).

  cancelSpeech()
  // window.speechSynthesis.cancel(). Immediately stops speaking.

  playSFX(type)
  // type: 'click' | 'chime' | 'tick' | 'ding' | 'chirp'
  // All sounds generated programmatically:
  //   click: sine 800Hz, gain 0.15, duration 50ms, fast decay
  //   chime: three notes C5(523Hz) → E5(659Hz) → G5(784Hz), 80ms each, sine, gain 0.12
  //   tick:  noise burst, gain 0.08, 20ms
  //   ding:  sine 1046Hz, gain 0.15, duration 300ms, slow exponential decay
  //   chirp: two notes G5(784Hz) → C6(1047Hz), 60ms each, sine, gain 0.12
  // If muted, do nothing.

  toggleMute()
  // Flip muted state. If currently speaking, cancel speech.
  // Returns new mute state (boolean).

  get isMuted()
  // Returns current mute state.

  setMuted(val)
  // Explicitly set mute state.
}
```

**Sound generation pattern** (for each SFX):
```js
function playTone(freq, duration, gain, type = 'sine') {
  if (this.isMuted) return;
  const ctx = this._audioCtx;
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gainNode.gain.setValueAtTime(gain, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
  osc.connect(gainNode).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration / 1000);
}
```

**Web Speech API notes**:
- Some browsers (Chrome) require a user gesture before `SpeechSynthesis.speak()` works. Initialize on first "Continue" click.
- `SpeechSynthesisUtterance.onend` fires when speech finishes — use it to resolve the Promise.
- `SpeechSynthesisUtterance.onerror` should also resolve (don't leave hanging Promises).
- Chrome has a bug where speech pauses after ~15 seconds. Workaround: chunk long text into sentences and speak them sequentially.

**Acceptance criteria**:
- [x] Voice sounds noticeably pitched up / cartoon-like
- [x] `speak()` returns a Promise that reliably resolves on completion
- [x] `cancelSpeech()` stops voice immediately, resolves the pending speak Promise
- [x] All 5 SFX types produce distinct, short, pleasant sounds
- [x] Mute toggle stops all audio; unmute resumes capability
- [x] No errors if AudioContext is not yet initialized
- [x] No autoplay policy violations (AudioContext created on user interaction)

---

## Task 8: `js/scenes/scene0.js` — Intro & White Noise

**File**: `e:\SEM3\TS_5306\lab3\js\scenes\scene0.js`

**Objective**: The opening scene. Title card, then white noise animation with ACF, teaching what the baseline looks like.

**Dependencies**: `math.js`, `canvas.js`

**Export**:
```js
export const scene0 = {
  id: 'scene0',
  title: 'What Is White Noise?',
  beats: [ /* 6 beats defined below */ ],
  setup(canvasZone) { /* create 2 canvases: series + ACF */ },
  cleanup() { /* remove canvases, cancel animations */ },
}
```

**Beat definitions**:

| # | narration | action |
|---|-----------|--------|
| 1 | *"Stationarity, MA(1), AR(1) & Differencing"* | Show title text centered on canvas, fade in. No series yet. |
| 2 | *"Every model in this lecture starts with the same ingredient: white noise — a sequence of independent random shocks."* | Title fades out. |
| 3 | (no narration — visual only) | `animateTimeSeries` draws 400-point white noise series (gray `#9e9b95`, σ=1). Horizontal reference line at y=0 dashed. |
| 4 | *"It has no trend, no pattern, no memory. Each value is a fresh draw."* | Series is already drawn; no new canvas action. |
| 5 | *"Its ACF confirms this — no significant correlation at any lag."* | Second canvas: `animateBarChart` for ACF (15 lags). Draw confidence bands. Add arrow annotation pointing to bands with label "all bars inside bands". |
| 6 | *"Now let's see what happens when we add memory."* | No canvas action — this is the transition beat. |

**Setup creates**:
- Canvas 1: "White Noise Series" (full width of canvas zone)
- Canvas 2: "Sample ACF" (full width, half height, below canvas 1)
- Use `math.simulateWhiteNoise(400, 1, new SeededRNG(42))` for data
- Pre-compute ACF with `math.computeACF(data, 15)`

**Acceptance criteria**:
- [x] Title appears centered and clean on beat 1
- [x] White noise draws point-by-point on beat 3
- [x] ACF bars grow upward on beat 5
- [x] Confidence bands visible as dashed lines
- [x] Arrow annotation appears pointing to ACF bars
- [x] `cleanup()` removes all created DOM elements

---

## Task 9: `js/scenes/scene1.js` — MA(1) Process

**File**: `e:\SEM3\TS_5306\lab3\js\scenes\scene1.js`

**Dependencies**: `math.js`, `canvas.js`

**Parameters**: θ = −0.6, σ = 1, n = 400, constant = 10

**Export**: `scene1` object following the scene interface.

**Beat definitions**:

| # | narration | action |
|---|-----------|--------|
| 1 | *"An MA(1) process combines the current shock with the previous one:"* | Show formula `Z_t = 10 + ε_t + θε_{t-1}` in narration panel using formula styling. |
| 2 | *"Each point depends on today's shock and yesterday's. That's it — one step of memory."* | Animate MA(1) series (steel blue `#6b9bc3`) on canvas 1. Horizontal dashed line at y=10. |
| 3 | *"Look at the ACF. There's a clear spike at lag 1..."* | Animate ACF bar chart on canvas 2. Draw confidence bands. Arrow annotation to lag-1 bar. |
| 4 | *"...and nothing after. The memory runs out after one step. This cutoff is the MA(1) signature."* | Subtle highlight/dim on lags ≥ 2 (semi-transparent overlay). |
| 5 | *"The sample won't match the formula exactly — it's one random realization."* | Show insight card in narration panel: `ρ₁ theoretical = −0.4412` vs `ρ₁ sample = [computed value]`. |
| 6 | *"Move θ to see how the ACF spike changes. Can you make it positive?"* | Show slider for θ ∈ [−0.95, 0.95] below canvases. On slider change: regenerate series & ACF, redraw both canvases instantly. Play 'tick' SFX on change. |
| 7 | *"MA(1): ACF has one spike at lag 1, then cuts off."* | Takeaway styling on narration. Play 'ding' SFX. |

**Setup creates**:
- Canvas 1: "MA(1) Series" (series plot, y range adapts to data)
- Canvas 2: "Sample ACF" (bar chart, y range [−1, 1])
- Slider element (hidden until beat 6)
- Data generated with `SeededRNG(101)`

**Slider behavior**:
- Range input: min=−0.95, max=0.95, step=0.05, initial=−0.6
- On input: `simulateMA1(400, newTheta, 1, new SeededRNG(101))`, add constant 10, recompute ACF, clear and redraw both canvases (no animation — instant)
- Display current θ value and computed ρ₁ = θ/(1+θ²) next to slider

**Acceptance criteria**:
- [x] Series oscillates around 10 with MA(1) character
- [x] ACF shows clear negative lag-1 bar for θ = −0.6
- [x] Slider regenerates data and redraws smoothly
- [x] Insight card shows correct theoretical vs sample values
- [x] Arrow annotation clearly points to lag-1 bar

---

## Task 10: `js/scenes/scene2.js` — AR(1) Process

**File**: `e:\SEM3\TS_5306\lab3\js\scenes\scene2.js`

**Dependencies**: `math.js`, `canvas.js`

**Parameters**: α = 0.8, σ = 1, n = 400

**Export**: `scene2` object following the scene interface.

**Beat definitions**:

| # | narration | action |
|---|-----------|--------|
| 1 | *"Now instead of mixing shocks, let's make each value depend on the previous value itself:"* | Show formula `Y_t = αY_{t-1} + w_t` in narration. |
| 2 | *"See how it wanders — high values tend to stay high, low stays low. That's persistence."* | Animate AR(1) series (coral `#d4816b`) on canvas 1. |
| 3 | *"The ACF doesn't cut off like MA(1). It decays — slowly fading bars."* | Animate ACF on canvas 2. Arrow annotations along the decaying bars (3 arrows at lags 1, 5, 10 showing decay). Draw confidence bands. |
| 4 | *"The PACF tells a different story: one big spike at lag 1, then nothing. That's how we know the order is 1."* | Animate PACF on canvas 3. Arrow to lag-1 PACF bar. Draw confidence bands. |
| 5 | (no narration) | Show side-by-side comparison card: "ACF: decays → AR signature" | "PACF: cuts off → order = 1" |
| 6 | *"Try α near 0 — the series looks more like white noise. Try 0.95 — watch it become sluggish."* | Show slider for α ∈ (−0.99, 0.99). On change: regenerate all three plots. |
| 7 | *"AR(1): ACF decays geometrically; PACF cuts off after lag 1."* | Takeaway. Play 'ding'. |

**Setup creates**:
- Canvas 1: "AR(1) Series" (top, full width)
- Canvas 2: "Sample ACF" (bottom-left, half width)
- Canvas 3: "Sample PACF" (bottom-right, half width)
- Slider (hidden until beat 6)
- Data generated with `SeededRNG(202)`

**Acceptance criteria**:
- [x] Series shows clear persistence (wandering, not white-noise-like)
- [x] ACF shows decaying bars, PACF shows single spike at lag 1
- [x] 3-canvas layout renders cleanly without overlap
- [x] Slider updates all 3 canvases simultaneously
- [x] α near 0 → series and ACF look white-noise-like
- [x] α = 0.95 → very sluggish, persistent series

---

## Task 11: `js/scenes/scene3.js` — Trend + Differencing

**File**: `e:\SEM3\TS_5306\lab3\js\scenes\scene3.js`

**Dependencies**: `math.js`, `canvas.js`

**Parameters**: intercept = 2, slope = 0.5, θ_noise = 0.5, σ = 1, n = 160

**Export**: `scene3` object following the scene interface.

**Beat definitions**:

| # | narration | action |
|---|-----------|--------|
| 1 | *"Real data often has a trend. What happens to the ACF then?"* | No canvas action yet. |
| 2 | (no narration) | Animate trending series (green `#7aaa6e`) on canvas 1. Clearly trending upward. |
| 3 | *"The ACF looks like a strong AR process — high bars decaying slowly. But that's misleading. The trend creates fake persistence."* | Show ACF on canvas 2. Animate bars. Draw warning annotation label: "⚠ Misleading!" near the high bars. |
| 4 | *"The fix: take first differences. Subtract each value from the next."* | No new drawing. |
| 5 | *"Press the button to apply differencing."* | Show "Apply diff()" button. On click: canvas 1 cross-fades from original to differenced series (green line fades, new line in same green draws in). Canvas 2 cross-fades ACF before→after. Play 'chime' SFX. Dashed line at 0.5 on differenced series (theoretical mean diff). |
| 6 | *"The trend vanishes. The differenced ACF shows the true MA structure of the noise."* | Annotation on new ACF: point to lags 1-2 where structure remains. |
| 7 | *"Difference first, then read ACF — if the time plot has a trend."* | Takeaway. Play 'ding'. |

**Setup creates**:
- Canvas 1: "Series" (can show original or differenced)
- Canvas 2: "Sample ACF" (can show before or after)
- Toggle button (hidden until beat 5)
- Pre-compute both original and differenced data + ACFs
- Use `SeededRNG(303)`

**Cross-fade implementation**:
- Render "before" state fully. On button click, animate opacity of old frame out (200ms) while drawing new frame in (300ms). This can be done with two overlaid canvases or by clearing and redrawing with a timed sequence.

**Acceptance criteria**:
- [x] Original series clearly trends upward
- [x] Original ACF has high slowly-decaying bars
- [x] After diff(), series fluctuates around 0.5 with no trend
- [x] After diff(), ACF shows MA-type cutoff
- [x] Button toggles between before/after states
- [x] Cross-fade transition is smooth

---

## Task 12: `js/scenes/scene4.js` — Random Walk with Drift

**File**: `e:\SEM3\TS_5306\lab3\js\scenes\scene4.js`

**Dependencies**: `math.js`, `canvas.js`

**Parameters**: drift = 0.3, σ = 1, n = 300

**Export**: `scene4` object following the scene interface.

**Beat definitions**:

| # | narration | action |
|---|-----------|--------|
| 1 | *"A random walk looks like a trend, but there's a key difference: the trend here is stochastic, not deterministic."* | Show formula `Y_t = Y_{t-1} + 0.3 + w_t`. |
| 2 | *"Watch how each step builds on all the ones before it."* | Animate random walk (brick `#b85c5c`) using a cumulative-sum style animation — each new point visibly "stacks". Slower animation than usual (3s). |
| 3 | *"Same misleading ACF as the trend case."* | Show ACF canvas. High, slowly decaying bars. |
| 4 | *"After differencing, we recover the increments — just white noise scattered around the drift of 0.3."* | Cross-fade: walk → differenced (slate blue `#6b82b8`). ACF before → after. Dashed line at drift=0.3 on differenced series. |
| 5 | *"The sample mean of the differences is close to 0.3 — confirming the drift."* | Show computed `mean(diff)` value in an insight card. |
| 6 | *"Random walk + differencing → white noise around the drift."* | Takeaway. Play 'ding'. |

**Setup creates**:
- Canvas 1: "Random Walk" / "First Differences" (toggleable like scene3)
- Canvas 2: "Sample ACF" (before/after)
- Pre-compute walk, increments, ACFs
- Use `SeededRNG(404)`

**Cumulative animation detail**:
- Instead of drawing points left-to-right uniformly, emphasize the "stacking" by drawing each increment as a visible vertical step before connecting to the next point. Brief pause (50ms) between steps for the first 30 points, then speed up.

**Acceptance criteria**:
- [x] Random walk clearly trends upward with visible stochastic character
- [x] Cumulative-sum animation feels like "building" the walk
- [x] After differencing, series looks like white noise around 0.3
- [x] After differencing, ACF has no significant bars
- [x] Mean of differences shown and ≈ 0.3

---

## Task 13: `js/scenes/scene5.js` — MA(1) Bound & Finale

**File**: `e:\SEM3\TS_5306\lab3\js\scenes\scene5.js`

**Dependencies**: `math.js`, `canvas.js`

**Export**: `scene5` object following the scene interface.

**Beat definitions**:

| # | narration | action |
|---|-----------|--------|
| 1 | *"Here's a surprising fact: no matter what θ you choose, an MA(1) can never have a lag-1 autocorrelation larger than 0.5."* | No canvas yet. |
| 2 | (no narration) | Animate the curve `ρ₁ = θ/(1+θ²)` drawing itself left-to-right over θ ∈ [−2, 2] (purple `#9b7cb8`). Dashed horizontal lines at ±0.5. Canvas uses `drawCurve` / `animateCurve`. |
| 3 | *"The maximum is 0.5 at θ = 1. The minimum is −0.5 at θ = −1."* | Annotate the peak (θ=1, ρ₁=0.5) and trough (θ=−1, ρ₁=−0.5) with dots and labels. |
| 4 | *"The AR(1) just barely wins. Its lag-1 ACF equals α directly — no denominator capping it."* | Show comparison card: `MA(1) θ=0.9 → ρ₁ ≈ 0.497` vs `AR(1) α=0.5 → ρ₁ = 0.500`. Highlight the winner. |
| 5 | *"Drag θ along the curve to see how ρ₁ changes."* | Show slider for θ ∈ [−2, 2]. A dot moves along the curve showing current (θ, ρ₁). Display ρ₁ value. Play 'tick' on change. |
| 6 | *"MA(1) lag-1 ACF is bounded by ±0.5. AR(1) has no such limit, as long as |α| < 1."* | Takeaway. Play 'ding'. |
| 7 | (Finale) *"That's the complete lecture. Here's what we covered:"* | Replace canvas with summary card showing all 5 takeaways. Show "Restart Lecture" button. Play 'chime'. |

**Finale summary card content**:
```
1. MA(1): lag-1 ACF spike, then cutoff
2. AR(1): ACF decays, PACF cuts off after lag 1
3. Trend → difference first, then read ACF
4. Random walk → white noise around drift after differencing
5. Sample ACF ≈ theory, not exactly equal
```

**Setup creates**:
- Canvas 1: "ρ₁ as θ changes" (main plot, large)
- Slider for θ (hidden until beat 5)
- Summary card element (hidden until beat 7)
- "Restart Lecture" button calls `app.goToScene(0)`
- Use `SeededRNG(505)` (only needed if any random data is generated)

**Slider behavior**:
- Range: −2 to 2, step 0.05
- On change: move a dot along the pre-drawn curve to position (θ, ρ₁(θ))
- Display: "θ = X.XX → ρ₁ = Y.YYYY"
- Do NOT redraw the curve — just move the dot marker

**Acceptance criteria**:
- [x] Curve draws smoothly left-to-right
- [x] Peak and trough annotations are clearly visible
- [x] Comparison card highlights AR(1) as the winner
- [x] Slider dot tracks along the curve (not floating off it)
- [x] Summary card lists all 5 conclusions
- [x] "Restart Lecture" returns to scene 0
