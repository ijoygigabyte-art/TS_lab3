
# The Story of Stationarity: From Random Shocks to AR and MA Processes

Time-series analysis begins with a deceptively simple question:

**When we observe a value today, how much of what happened yesterday, or several periods ago, is still present in what we see now?**

A time series is not just a collection of numbers. It is a sequence in which observations arrive in time, and that time ordering can create dependence. Sometimes observations behave almost like independent random shocks. Sometimes yesterday's value continues to influence today's value. Sometimes the current observation remembers the shock from the previous period. And sometimes a trend or accumulated history makes the entire series behave differently from a stable process.

The Lecture 6 lab explores these ideas through simulation in R. Rather than treating the formulas as isolated pieces of mathematics, the lab uses a practical workflow:

**write the model → simulate the process → plot the series → inspect the ACF/PACF → compare the observed pattern with theoretical behavior.**

That habit is the central theme of the entire exercise. The graphs are not decoration. They are evidence about the structure of the process.

---

# 1. Start with Randomness: White Noise

Before understanding dependence, we need to understand the simplest possible source of randomness: **white noise**.

Imagine that at every point in time, a completely new random shock arrives. Today's shock does not remember yesterday's shock, and tomorrow's shock will not remember today's shock.

In R, the lab creates these shocks with:

```r
n <- 400
sigma <- 1

white_noise <- rnorm(
  n = n,
  mean = 0,
  sd = sigma
)
```

The `rnorm()` function generates independent normally distributed random values. The result is a sequence of random innovations.

A useful way to think about an innovation is:

> **An innovation is a fresh shock entering the system at a particular point in time.**

The sequence may jump upward, downward, and back again. It will not look like a perfectly flat line. Randomness does not mean flatness.

Instead, what matters is what the sequence **does not** show.

White noise should not have a persistent trend. It should not have a systematic repeating pattern. One observation should not contain useful information about another observation simply because they are close together in time.

This gives us our baseline.

If white noise is essentially memoryless, then its autocorrelation should be close to zero at nonzero lags.

---

# 2. How Do We See Memory? ACF and PACF

Once we have a time series, we need tools for asking whether observations are related across time.

Two of the most important tools are:

* **ACF: Autocorrelation Function**
* **PACF: Partial Autocorrelation Function**

In R:

```r
acf(x, lag.max = 15)
pacf(x, lag.max = 15)
```

The ACF asks, roughly:

> How strongly is the series related to itself at different time lags?

For example:

* lag 1 compares observations one period apart;
* lag 2 compares observations two periods apart;
* lag 3 compares observations three periods apart.

The PACF goes one step further. It looks at the relationship at a particular lag after accounting for relationships at earlier lags.

This distinction becomes extremely useful when comparing AR and MA models.

There is one important warning.

A simulated finite sample will never reproduce the theoretical correlations perfectly.

Even when the theoretical autocorrelation is exactly zero, a sample ACF can show a small positive or negative bar. That is sampling noise.

Therefore:

**A theoretical ACF describes the population pattern. A sample ACF is an estimate of that pattern.**

This distinction prevents us from overinterpreting every little spike in an ACF or PACF plot.

---

# 3. Two Symbols That Tell Different Stories: Gamma and Rho

Before moving into MA and AR models, the lab separates two quantities that are easy to confuse:

* `γₖ` — autocovariance at lag `k`
* `ρₖ` — autocorrelation at lag `k`

The autocovariance measures dependence in the original units of the series.

The autocorrelation standardizes that dependence:

```text
ρₖ = γₖ / γ₀
```

Here, `γ₀` is the variance.

This distinction matters because a number such as:

```text
γ₀ = 2.7778
```

is a variance, not an ACF bar.

By contrast:

```text
ρ₁ = 0.8
```

is a theoretical lag-1 autocorrelation and corresponds to the expected height of the lag-1 ACF.

With that distinction established, we can now meet the first major character in the story.

---

# 4. The MA(1): A Process That Remembers One Shock

Consider the moving-average process:

```text
Xₜ = εₜ + θεₜ₋₁
```

The current observation is constructed from:

1. today's innovation `εₜ`, and
2. yesterday's innovation `εₜ₋₁`.

This is an **MA(1)** process because the current value depends on the current shock and one previous shock.

The key idea is short memory.

Today's value can remember yesterday's shock.

But it does not directly remember the shock from two periods ago, three periods ago, or ten periods ago.

The theoretical results make that explicit:

```text
γ₀ = (1 + θ²)σ²
γ₁ = θσ²
γₖ = 0, for k ≥ 2
```

and therefore:

```text
ρ₁ = θ / (1 + θ²)
ρₖ = 0, for k ≥ 2
```

This produces the defining ACF pattern of an MA(1):

**a spike at lag 1 followed by a theoretical cutoff.**

This is one of the most important visual patterns in the lecture.

Think of it as a shock leaving one footprint.

At lag 1, we can still detect the shock.

At lag 2 and beyond, the theoretical autocorrelation has disappeared.

---

# 5. A Constant Changes the Level, Not the Dependence

The first exercise uses:

```text
Zₜ = 10 + εₜ − 0.6εₜ₋₁
```

The number `10` might look important, but it plays a very specific role.

It changes the **mean** of the process.

The moving-average structure remains the same.

If:

```text
Xₜ = εₜ − 0.6εₜ₋₁
```

then adding 10 gives:

```text
Zₜ = 10 + Xₜ
```

The series now fluctuates around 10 instead of around zero, but its autocovariance and autocorrelation structure is unchanged.

In R, the simulation makes this separation explicit:

```r
innov_ma1 <- rnorm(
  n = n,
  mean = 0,
  sd = sigma
)

ma1_random_part <- arima.sim(
  model = list(ma = -0.6),
  n = n,
  innov = innov_ma1
)

z_ma1 <- 10 + ma1_random_part
```

The innovations are generated first.

Then `arima.sim()` constructs the zero-mean MA component.

Finally, 10 is added.

This is a useful programming habit because each part of the mathematical model has a visible counterpart in the code.

---

# 6. What Should the MA(1) Plot Look Like?

The simulated series should fluctuate around the level 10.

It will not sit exactly at 10 because random shocks are constantly pushing it up and down.

The sample mean might therefore be something like:

```text
9.98
```

rather than exactly 10.

That is not a problem.

The theoretical mean is 10.

The sample mean is an estimate based on one random realization.

The more interesting object is the ACF.

For:

```text
θ = -0.6
```

the theoretical lag-1 autocorrelation is:

```text
ρ₁ = -0.6 / (1 + 0.6²)
    = -0.4411765
```

The theoretical variance is:

```text
γ₀ = (1 + 0.6²)(1)
    = 1.36
```

The sample lag-1 ACF will not necessarily be exactly `-0.4411765`. In the classroom simulation, it is approximately `-0.37`. That difference is expected because the sample is finite.

The important thing is the **shape**:

* lag 0 is always 1 and is not used for identifying the model;
* lag 1 is strongly negative;
* later lags should not show a sustained systematic pattern.

So the MA(1) announces itself with a **cutoff**.

---

# 7. The AR(1): Now the Process Remembers Its Own Past

The next process changes the story completely.

An AR(1) is:

```text
Yₜ = αYₜ₋₁ + wₜ
```

Instead of saying:

> today's value is built from today's and yesterday's shocks,

we now say:

> today's value depends directly on yesterday's value, plus a new shock.

That is what makes this an **autoregressive** process.

The previous observation becomes part of the mechanism generating the current observation.

For an AR(1), stationarity requires:

```text
|α| < 1
```

When that condition holds:

```text
γ₀ = σ² / (1 - α²)
```

and

```text
ρₖ = αᵏ
```

This means the ACF does not suddenly stop after one lag.

Instead, it gradually decays.

That is the fundamental contrast:

**MA(1): cutoff.**

**AR(1): gradual decay.**

---

# 8. AR(1) with α = 0.8

The exercise uses:

```text
Yₜ = 0.8Yₜ₋₁ + wₜ
```

The theoretical autocorrelations are:

```text
ρ₁ = 0.8
ρ₂ = 0.8² = 0.64
ρ₃ = 0.8³ = 0.512
```

The theoretical variance is:

```text
γ₀ = 1 / (1 - 0.8²)
    = 2.777778
```

So the expected ACF begins:

```text
lag 1 → 0.800
lag 2 → 0.640
lag 3 → 0.512
```

The correlation is still present at later lags, but it gradually weakens.

In R, this pattern can be generated compactly:

```r
alpha_2 <- 0.8

theoretical_rho_ar1 <- alpha_2^(1:3)
```

The expression `1:3` creates the sequence:

```text
1, 2, 3
```

and exponentiation applies the powers element by element:

```text
0.8¹
0.8²
0.8³
```

giving:

```text
0.8
0.64
0.512
```

This is a small piece of R syntax, but it expresses the mathematical structure very naturally.

---

# 9. ACF Versus PACF: The AR(1) Signature

Now comes one of the most important model-identification ideas in the lab.

For an AR(1):

**The ACF tails off.**

**The PACF cuts off after lag 1.**

Why?

The ACF sees the total correlation carried through the autoregressive chain.

If today's observation depends on yesterday's observation, and yesterday depends on the day before yesterday, then relationships can persist across many lags.

The PACF asks a more controlled question:

> After accounting for the earlier relationship, is there still a direct relationship at this lag?

For an AR(1), the important direct relationship occurs at lag 1.

Therefore the PACF has a prominent lag-1 spike and then cuts off theoretically.

This gives us another major pattern to remember:

```text
MA(1):
ACF  → cuts off
PACF → tails off

AR(1):
ACF  → tails off
PACF → cuts off
```

The exact sample plots will wiggle because they come from finite random data, but the theoretical patterns provide the model-identification guide.

---

# 10. The Trouble with Trends

So far, the processes have been stationary when their required conditions are satisfied.

But now the story takes a turn.

Suppose a series contains a deterministic linear trend:

```text
Yₜ = 2 + 0.5t + Xₜ
```

where:

```text
Xₜ = εₜ + 0.5εₜ₋₁
```

The random component `Xₜ` is stationary MA(1) noise.

But the complete series is not stationary because its mean changes with time.

At time 1, the deterministic component is:

```text
2 + 0.5(1) = 2.5
```

At time 2:

```text
2 + 0.5(2) = 3.0
```

At time 100:

```text
2 + 0.5(100) = 52
```

The center of the process is moving.

That violates the stable-level intuition we associate with stationarity.

---

# 11. Why a Trend Can Fool the ACF

Plot the trending series and something interesting happens.

The ACF may begin very high and decay slowly.

That can look surprisingly similar to the ACF of a persistent AR process.

But the underlying reason is completely different.

In the trending series, observations far apart in time can look similar because they are all being pushed upward by the same deterministic trend.

The apparent persistence does not necessarily mean the underlying random process is an AR model.

This is why blindly reading an ACF can be dangerous.

If the time plot clearly shows a trend, we should deal with the nonstationarity before using ACF/PACF patterns to identify AR or MA order.

---

# 12. Differencing: Removing the Trend

This is where `diff()` enters the story.

In R:

```r
diff_y_trend <- diff(y_trend)
```

The `diff()` function subtracts consecutive observations:

```text
Y₂ - Y₁
Y₃ - Y₂
Y₄ - Y₃
...
```

This produces one fewer observation because the first value has no previous observation available for subtraction.

For the model:

```text
Yₜ = 2 + 0.5t + Xₜ
```

the deterministic part behaves beautifully under differencing.

The difference of the trend is:

```text
(2 + 0.5t) - (2 + 0.5(t-1))
```

which leaves:

```text
0.5
```

So the upward trend disappears and becomes a constant mean increment of 0.5.

In the simulation, the sample mean of the differences is approximately:

```text
0.50178
```

which is close to the theoretical value of 0.5.

Differencing has transformed the problem.

Instead of asking:

> Why does this series keep rising?

we can now ask:

> What stochastic structure remains after removing the systematic movement?

---

# 13. Differencing Also Changes the MA Structure

There is a subtle but important consequence.

The original random component is:

```text
Xₜ = εₜ + 0.5εₜ₋₁
```

When we difference the series, the random component becomes:

```text
Xₜ - Xₜ₋₁
```

which expands to:

```text
εₜ - 0.5εₜ₋₁ - 0.5εₜ₋₂
```

This has dependence extending through two lags.

Therefore, the differenced series behaves like a stationary **MA(2)-type process around mean 0.5**.

That predicts an ACF that should show its systematic structure through approximately lag 2 and then lose that pattern.

This is a beautiful example of why transformations matter.

Differencing does not simply "make the graph look flatter."

It changes the stochastic representation of the series.

---

# 14. The Random Walk: A Process That Accumulates Everything

The next exercise introduces a different kind of nonstationarity.

Consider:

```text
Yₜ = Yₜ₋₁ + 0.3 + wₜ
```

This is a **random walk with drift**.

The key idea is accumulation.

At every time step, the process receives:

```text
0.3 + wₜ
```

and adds that increment to everything accumulated previously.

In R, this is naturally represented using:

```r
walk_increments <- drift + rnorm(
  n = n_walk,
  mean = 0,
  sd = sigma
)

y_random_walk <- cumsum(walk_increments)
```

The `cumsum()` function creates cumulative sums.

If the increments are:

```text
increment 1
increment 2
increment 3
...
```

then the random walk becomes:

```text
increment 1

increment 1 + increment 2

increment 1 + increment 2 + increment 3

...
```

Every new observation carries the accumulated history of previous shocks.

That accumulated history is the defining feature of the random walk.

---

# 15. Why the Random Walk Is Nonstationary

A random walk does not simply fluctuate around one fixed level.

Because each new shock is added to the previous level, the process can wander increasingly far from where it started.

With positive drift:

```text
drift = 0.3
```

there is also a systematic upward component.

The series can temporarily move downward, but its increments have an expected value of 0.3.

The resulting path therefore tends to move upward over time in the simulation.

The ACF of the raw random walk is also deceptive.

It can remain extremely high across many lags.

But that does not mean we have discovered an extremely persistent stationary AR process.

The series is nonstationary.

Therefore, ordinary stationary AR/PACF order-identification rules should not be applied directly to the raw random walk.

---

# 16. Difference the Random Walk

Now perform:

```r
diff_y_random_walk <- diff(y_random_walk)
```

Something almost magical happens.

Remember how the random walk was constructed:

```text
Yₜ = cumulative sum of increments
```

When we subtract consecutive cumulative values, the old accumulated history cancels.

What remains is the new increment.

Conceptually:

```text
Yₜ - Yₜ₋₁ = 0.3 + wₜ
```

So the first difference is simply:

```text
0.3 + wₜ
```

That is white noise around a nonzero mean of 0.3.

The simulation confirms this idea: the sample mean of the differenced series is approximately 0.318, close to the theoretical drift of 0.3.

The transformation has taken us from a nonstationary accumulated process to a stationary sequence of innovations around a constant drift.

---

# 17. What Happens to the ACF After Differencing?

Before differencing, the random walk has a highly persistent ACF.

After differencing, the story changes dramatically.

The differenced series should have:

* lag 0 equal to 1;
* most other ACF values near zero;
* no sustained pattern across lags.

That is what we expect from white noise around a nonzero mean.

The PACF should also lack a sustained structure.

In other words:

**the first difference removes the accumulated dependence.**

This is one of the most important practical lessons of the lab:

> When a time series is nonstationary because of a trend or random walk structure, differencing can reveal the stationary stochastic behavior underneath.

---

# 18. A Small but Important Detail: ACF Removes the Mean

There is another subtle point hidden inside the R behavior.

The differenced random walk fluctuates around:

```text
0.3
```

rather than around zero.

Yet `acf()` and `pacf()` can still be used to investigate serial dependence.

Why?

Because these functions remove the sample mean by default when calculating the correlations.

So the fact that the differenced process has a nonzero mean does not prevent us from examining its dependence structure.

This is an implementation detail worth remembering because it connects the mathematical definition of correlation to what the R functions actually calculate.

---

# 19. The Final Comparison: How Large Can an MA(1) Lag-1 Correlation Be?

The final exercise asks a surprisingly interesting question.

For an MA(1):

```text
ρ₁ = θ / (1 + θ²)
```

For an AR(1):

```text
ρ₁ = α
```

These formulas look similar in spirit, but they behave very differently.

Consider:

```text
θ = 0.9
```

For the MA(1):

```text
ρ₁ = 0.9 / (1 + 0.9²)
    ≈ 0.4972
```

Now consider:

```text
α = 0.5
```

For the AR(1):

```text
ρ₁ = 0.5
```

The two values are extremely close, but they are not identical. The AR(1) produces a lag-1 autocorrelation of exactly 0.5, while the MA(1) with θ = 0.9 produces approximately 0.4972.

---

# 20. Why an MA(1) Cannot Reach 0.6

Now we can ask a deeper question:

**Could any MA(1) ever have a lag-1 autocorrelation of 0.6?**

The answer follows from the shape of:

```text
ρ₁ = θ / (1 + θ²)
```

When this expression is evaluated across possible values of `θ`, its maximum positive value occurs at:

```text
θ = 1
```

and the maximum is:

```text
ρ₁ = 0.5
```

Similarly, the minimum is:

```text
-0.5
```

at:

```text
θ = -1
```

Therefore, an MA(1) cannot have a theoretical lag-1 autocorrelation outside the interval:

```text
[-0.5, 0.5]
```

So:

```text
ρ₁ = 0.6
```

cannot occur for an MA(1).

The AR(1) behaves differently because:

```text
ρ₁ = α
```

and stationarity only requires:

```text
|α| < 1
```

Therefore, an AR(1) can have lag-1 autocorrelation greater than 0.5 while remaining stationary.

This gives us a mathematical way to distinguish the models even before looking at a graph.

---

# 21. The Big Picture: What the Five Exercises Are Really Teaching

At first glance, the five exercises look like separate R programming tasks.

They are not.

Together, they tell one continuous story about **memory in time-series data**.

### White noise

White noise has no systematic serial dependence.

Its ACF and PACF should mostly hover near zero after lag 0.

### MA(1)

An MA(1) remembers recent shocks.

Its theoretical ACF has:

```text
one important lag-1 value
then a cutoff
```

### AR(1)

An AR(1) remembers its own previous values.

Its ACF:

```text
decays gradually
```

while its PACF:

```text
cuts off after lag 1
```

### Deterministic trend

A trend can create apparent persistence and make the raw ACF misleading.

The series must be transformed before stationary AR/MA identification is trusted.

### Differencing

First differencing can remove a linear trend and reveal the stationary structure underneath.

### Random walk with drift

A random walk accumulates shocks, producing nonstationarity.

Its first difference recovers the increments:

```text
drift + white noise
```

### MA(1) versus AR(1)

The formulas themselves reveal important structural restrictions.

For an MA(1):

```text
ρ₁ = θ / (1 + θ²)
```

and therefore:

```text
|ρ₁| ≤ 0.5
```

For an AR(1):

```text
ρ₁ = α
```

with:

```text
|α| < 1
```

for stationarity.

---

# 22. The Most Important Visual Vocabulary

When looking at ACF and PACF plots, the lab encourages us to think in terms of two visual behaviors:

## Cutoff

A correlation pattern is present for a limited number of lags and then disappears theoretically.

The classic example is:

```text
MA(1) ACF
```

It has a meaningful lag-1 spike and then theoretical zeros.

For the differenced trend example, the resulting MA(2)-type process similarly has an ACF that should lose its systematic pattern after approximately lag 2.

## Tail-off

The correlation does not suddenly disappear.

Instead, it gradually decreases across lags.

The classic example is:

```text
AR(1) ACF
```

For `α = 0.8`, the theoretical values are:

```text
0.8
0.64
0.512
0.4096
0.32768
...
```

The process gradually forgets its past rather than abruptly cutting it off.

These two words — **cutoff** and **tail-off** — are therefore central to reading time-series diagnostics.

---

# 23. The Stationarity Lesson

Stationarity is not simply a technical condition hidden inside a formula.

It determines whether the usual ACF/PACF interpretation makes sense.

An MA(1) is stationary for every finite value of `θ`.

An AR(1) is stationary only when:

```text
|α| < 1
```

A deterministic trend creates a changing mean and therefore makes the original series nonstationary.

A random walk accumulates shocks and is also nonstationary.

The practical lesson is:

> **Check the behavior of the series before interpreting its ACF and PACF as evidence for an AR or MA order.**

A trending or random-walk series can produce strong-looking autocorrelation even though that persistence is caused by nonstationarity rather than by the stationary AR structure we might otherwise infer.

---

# 24. Theory and Simulation Must Meet in the Middle

One of the most useful ideas throughout the lab is that theory and simulation are not expected to match perfectly.

Suppose theory says:

```text
ρ₁ = -0.4412
```

and the simulated sample produces:

```text
ρ̂₁ = -0.3724
```

That does not mean the simulation failed.

Suppose theory says an AR(1) should have:

```text
ρ₁ = 0.8
ρ₂ = 0.64
ρ₃ = 0.512
```

while the sample produces:

```text
0.816
0.671
0.562
```

Again, that is not a contradiction.

The theoretical values describe the underlying model.

The sample values describe one random realization of that model.

The question is therefore not:

> "Does every sample bar equal the theoretical value?"

The better question is:

> "Does the overall observed pattern behave as the model predicts?"

That distinction is essential when reading simulated time-series data.

---

# 25. The R Code Is a Translation of the Mathematics

A major theme running through the notebook is that good R code should make the mathematical model visible.

For example:

```r
arima.sim(model = list(ma = -0.6))
```

communicates that the process contains an MA component with coefficient `-0.6`.

Similarly:

```r
arima.sim(model = list(ar = 0.8))
```

communicates that the process contains an AR component with coefficient `0.8`.

And:

```r
diff(series)
```

communicates that we are transforming the series into consecutive changes.

Meanwhile:

```r
cumsum(increments)
```

communicates that we are accumulating successive increments into a random walk.

The code is therefore not merely an implementation detail.

It is a computational representation of the stochastic model.

---

# 26. Reproducibility Matters

Because simulations use random numbers, two runs could otherwise produce different sequences.

That is why the lab begins with:

```r
set.seed(6)
```

A seed fixes the starting point of the random-number generator.

It does **not** remove randomness from the simulation.

Instead, it makes the random experiment reproducible.

If two students run the same code with the same seed, they can obtain the same simulated data and the same plots.

That is especially useful in a classroom because everyone can discuss the same realization while still understanding that the underlying process is stochastic.

---

# 27. A Mental Map for Reading Future Time Series

When encountering a new time series, the ideas from this lab can be turned into a mental checklist.

First, look at the **time plot**.

Ask:

```text
Does the series fluctuate around a stable level?
```

If yes, stationary behavior may be plausible.

If there is a clear trend or accumulated movement, be cautious.

Next, examine the **ACF**.

Ask:

```text
Does it cut off?
Does it tail off?
Does it remain extremely persistent?
```

Then examine the **PACF**.

Ask:

```text
Is there a clear cutoff?
Is there a gradual decay?
```

If the series is nonstationary, consider **differencing** before interpreting AR/MA patterns.

Then compare the observed patterns with the theoretical signatures.

The goal is not to memorize isolated plots.

The goal is to understand why the plots have those shapes.

---

# 28. The Complete Story in One Sequence

The entire lab can be remembered as a progression.

We begin with **white noise**:

```text
fresh shocks
↓
little or no serial dependence
```

Then we introduce an **MA(1)**:

```text
current shock + previous shock
↓
short memory
↓
ACF cutoff after lag 1
```

Then we introduce an **AR(1)**:

```text
current value depends on previous value
↓
persistent memory
↓
ACF tails off
↓
PACF cuts off after lag 1
```

Then we introduce a **deterministic trend**:

```text
stationary noise + changing mean
↓
nonstationary series
↓
raw ACF can look misleading
↓
difference the series
```

Then we introduce a **random walk with drift**:

```text
previous level + drift + new shock
↓
accumulated history
↓
nonstationarity
↓
first difference
↓
drift + white noise
```

Finally, we compare the mathematical limits of MA(1) and AR(1):

```text
MA(1): ρ₁ = θ / (1 + θ²)
       |ρ₁| ≤ 0.5

AR(1): ρ₁ = α
       |α| < 1 for stationarity
```

The result is a unified picture of how time-series models encode memory.

---

# 29. Final Takeaway

The deepest lesson of this lab is not any single R command.

It is the relationship between **model, simulation, transformation, and graphical evidence**.

A time series can look persistent for several different reasons.

It may genuinely contain autoregressive dependence.

It may remember recent shocks through a moving-average mechanism.

It may contain a deterministic trend.

It may be a random walk accumulating every shock that came before.

These situations can produce superficially similar graphs, especially in the ACF.

That is why the correct workflow matters:

**understand the model → simulate it → inspect the time plot → examine ACF/PACF → check stationarity → difference when necessary → compare the observed pattern with theory.**

The key signatures to carry forward are:

```text
White noise:
ACF/PACF ≈ zero after lag 0

MA(1):
ACF cuts off after lag 1
PACF tails off

AR(1):
ACF tails off
PACF cuts off after lag 1

Trend:
raw ACF can show misleading persistence
difference before AR/MA identification

Random walk with drift:
nonstationary in levels
first difference = drift + white noise

Finite samples:
sample ACF/PACF ≠ theoretical ACF/PACF exactly
```

In the end, stationarity is about having a stable statistical environment in which the dependence structure can be meaningfully interpreted. ACF and PACF provide the fingerprints of that dependence. MA models describe memory in shocks. AR models describe memory in previous values. Differencing removes certain forms of nonstationary movement and exposes the stochastic structure underneath.

And that is the real story of the lab:

**we start with random shocks, give those shocks memory, watch that memory appear in the ACF and PACF, encounter processes whose trends or accumulated histories break stationarity, and then use differencing to strip away the nonstationary layer and reveal what remains underneath.**

That is how simulation turns abstract time-series formulas into something we can actually see, test, and understand.
