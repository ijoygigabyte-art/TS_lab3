
# The Tale of a Restless Signal

Every time series starts life the same way: as pure, unpredictable noise. Picture 400 independent shocks drawn from a normal distribution — `rnorm(n, mean, sd)` — jittering up and down around zero with no memory of what came before. This is white noise, the "primordial soup" of time series. Its ACF plot is almost insultingly boring: a spike of 1 at lag 0 (because everything is perfectly correlated with itself), and then... nothing. A few stray bars might poke past the dashed reference bands, but that's just sampling noise flirting with randomness, not a real pattern. The lesson buried in this quiet opening act: *don't expect zero to look like exactly zero* in a finite sample.

But white noise, left alone, is not very interesting. The real story begins when we give the noise a memory.

## Act One: The MA(1) — A Process With a Short Attention Span

Enter the moving-average process, MA(1):

$$
Z_t = 10 + \epsilon_t - 0.6\epsilon_{t-1}
$$

Here, today's value is built from today's shock *plus* an echo of yesterday's shock. That's it — no memory beyond one step back. This gives MA(1) its signature move: a sharp, dramatic spike in the ACF at lag 1, then a hard stop. In theory, $\rho_1 = \theta/(1+\theta^2)$ and everything after lag 2 is exactly zero. It's the process equivalent of someone who gossips about yesterday but has already forgotten last week.

Simulated in R via `arima.sim(model = list(ma = -0.6), n = 400, innov = innov_ma1)`, the negative coefficient makes that lag-1 bar swing *down* — a clean negative spike, just as the theory predicts (theoretical $\rho_1 = -0.44$, and the simulated sample landed close at around $-0.37$). Adding the constant 10 doesn't change any of this correlation structure — it just lifts the whole series up, like raising a trampoline without changing how it bounces.

## Act Two: The AR(1) — A Process That Never Forgets (Quite)

If MA(1) has a short attention span, AR(1) is its opposite: a process haunted by its entire past.

$$
Y_t = 0.8Y_{t-1} + w_t
$$

Each value depends on the value right before it, which depended on the one before *that*, and so on — memory cascading backward in a geometric decay. So instead of a clean cutoff, the AR(1) ACF *tails off*: $\rho_k = \alpha^k$, producing 0.8, 0.64, 0.512, 0.4096... a slow fade rather than a slammed door. The simulated series showed exactly this rhythm, decaying sample correlations tracking the theoretical curve closely.

Here's the plot twist that makes AR(1) satisfying to diagnose: the ACF tails off, but the **PACF cuts off** after lag 1. That single, isolated PACF spike is the process confessing "I only *directly* depend on yesterday — everything further back is just an inherited echo, not a direct influence." ACF and PACF, read together, become a detective's toolkit: tailing ACF + cutting PACF = AR; cutting ACF + tailing PACF = MA.

## Act Three: The Impostor — A Trend Disguised as Persistence

Now the story throws a curveball. What happens when a deterministic trend gets bolted onto a perfectly innocent stationary MA(1)?

$$
Y_t = 2 + 0.5t + X_t, \quad X_t = \epsilon_t + 0.5\epsilon_{t-1}
$$

The result is deceptive: the raw ACF looks like it's decaying slowly, almost AR-like, purely because distant points share a common upward march — not because they share real statistical dependence. This is a trap. A trend can *masquerade* as autocorrelation. The fix is `diff()`: subtracting each value from its predecessor. The moment differencing is applied, the trend vanishes, the mean settles near the expected drift (0.5), and the underlying MA(2)-type structure of the noise reveals itself in the differenced ACF. The moral: **always difference away a visible trend before trusting an ACF/PACF plot** — otherwise you're reading tea leaves brewed from a rising tide, not from genuine dependence.

## Act Four: The Random Walk — Nonstationary by Nature

The most dramatic character in this story is the random walk with drift:

$$
Y_t = Y_{t-1} + 0.3 + w_t
$$

Built with `cumsum()`, each value is the *entire accumulated history* of every past shock plus a steady drift. Unlike AR(1), whose memory fades geometrically, the random walk's memory *never* fades — correlations near 1 persist across enormous lag distances, and the PACF shows a towering lag-1 spike that looks tempting to call "AR(1)," but isn't, because the process is fundamentally nonstationary. The giveaway in the raw time plot: no fixed level, just a wandering, ever-drifting line.

The remedy, once again, is differencing. Take `diff()` of the random walk and the accumulated history cancels out, leaving just the raw increments — which behave like white noise scattered around the drift value (0.3). The ACF and PACF of the differenced series settle down into the same quiet, band-hugging pattern white noise always shows. A random walk isn't secretly an AR or MA process in disguise — it's an entirely different creature, and differencing is the only way to tame it into stationarity.

## The Climax: Why an MA(1) Can Never Reach 0.6

The final twist resolves a subtle but crucial misconception. Could an MA(1) ever produce a lag-1 autocorrelation of 0.6? The formula $\rho_1 = \theta/(1+\theta^2)$ is put to the test across the entire real line of $\theta$ values, and the resulting curve reveals a hard ceiling: the function peaks at exactly $\theta = 1$, topping out at $\rho_1 = 0.5$, and mirrors to a floor of $-0.5$ at $\theta = -1$. No matter how large you crank $\theta$, you can never squeeze past that 0.5 boundary — it's a mathematical wall, not a coincidence of one simulation.

An AR(1), by contrast, has no such ceiling on its lag-1 correlation — since $\rho_1 = \alpha$ directly, any $\alpha$ up to (but not including) 1 is achievable, including comfortably clearing 0.6. This asymmetry is the punchline of the whole lab: **MA(1) processes are structurally capped in how much lag-1 memory they can express; AR(1) processes are not.**

---

**The five conclusions this story is really telling:**

1. MA(1) → sharp ACF spike, then cutoff.
2. AR(1) → decaying ACF, cutoff PACF.
3. Trends fake persistence — difference them away first.
4. Random walks are nonstationary; their differences are white noise around the drift.
5. Every sample ACF/PACF is a noisy sketch of a clean theoretical shape — never a perfect match.

---
