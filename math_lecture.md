# Time Series Mathematics: A Deep Dive

This document provides a comprehensive, mathematical explanation of the core concepts demonstrated in the Time Series Explorer app. By understanding the mechanics beneath the formulas, you'll be well-equipped to rewrite the app's storylines in your own words.

---

## 1. The Foundation: Stationarity and White Noise

To model how data points in a sequence relate to each other over time, we first need a baseline. In time series analysis, that baseline is **Weak Stationarity**. A time series $Y_t$ is weakly stationary if:
1.  **Constant Mean**: $E[Y_t] = \mu$ (The mean doesn't change over time).
2.  **Constant Variance**: $Var(Y_t) = \sigma^2$ (The spread of the data doesn't grow or shrink).
3.  **Time-Invariant Autocovariance**: The covariance between $Y_t$ and $Y_{t-k}$ depends *only* on the distance between them (the lag $k$), not on the actual time $t$.

### White Noise ($w_t$)
White noise is the simplest stationary process and the fundamental building block of all our models. Think of it as a series of completely independent, random shocks.
*   **Equation**: $w_t \sim \mathcal{N}(0, \sigma^2)$
*   **Mean**: $E[w_t] = 0$
*   **Variance**: $Var(w_t) = \sigma^2$
*   **Covariance**: $Cov(w_t, w_{t-k}) = 0$ for all $k \neq 0$.

Because every shock is completely independent of the past, white noise has absolutely **no memory**.

---

## 2. Measuring Memory: ACF and PACF

How do we quantify "memory" in a time series? We use correlation.

### Autocovariance ($\gamma_k$)
The autocovariance at lag $k$ measures how the series at time $t$ covaries with itself at time $t-k$:
$$ \gamma_k = Cov(Y_t, Y_{t-k}) = E[(Y_t - \mu)(Y_{t-k} - \mu)] $$
Note that $\gamma_0 = Cov(Y_t, Y_t) = Var(Y_t)$.

### Autocorrelation Function (ACF, $\rho_k$)
Autocovariance is heavily dependent on the scale of your data. We standardize it by dividing by the variance ($\gamma_0$) to get the Autocorrelation Function, which always falls between -1 and 1.
$$ \rho_k = \frac{\gamma_k}{\gamma_0} $$
*   $\rho_0$ is always 1 (a variable is perfectly correlated with itself).
*   For white noise, $\rho_k = 0$ for all $k \neq 0$.

### Partial Autocorrelation Function (PACF)
The ACF measures the *total* correlation between $Y_t$ and $Y_{t-k}$. However, if $Y_t$ influences $Y_{t+1}$, and $Y_{t+1}$ influences $Y_{t+2}$, then $Y_t$ and $Y_{t+2}$ will be correlated just by passing through $Y_{t+1}$. 
The **PACF** measures the correlation between $Y_t$ and $Y_{t-k}$ *after removing the linear influence of the time steps in between*.

---

## 3. Moving Average Model of Order 1: MA(1)

Instead of just pure white noise, what if today's value depends on today's random shock *and* yesterday's random shock?

*   **Equation**: $Y_t = \mu + w_t + \theta w_{t-1}$
    *   $\mu$ is the constant mean.
    *   $w_t$ is today's white noise shock.
    *   $\theta$ (theta) is the weight given to yesterday's shock ($w_{t-1}$).

### Why the ACF "Cuts Off"
Let's look at the covariance mathematically.
*   **Variance (Lag 0)**: 
    $$ \gamma_0 = Var(w_t + \theta w_{t-1}) = Var(w_t) + \theta^2 Var(w_{t-1}) = \sigma^2 + \theta^2\sigma^2 = \sigma^2(1 + \theta^2) $$
*   **Covariance at Lag 1**: 
    $$ \gamma_1 = Cov(w_t + \theta w_{t-1}, w_{t-1} + \theta w_{t-2}) $$
    Because white noise shocks are independent, the only overlapping term is $w_{t-1}$.
    $$ \gamma_1 = Cov(\theta w_{t-1}, w_{t-1}) = \theta Var(w_{t-1}) = \theta\sigma^2 $$
*   **Covariance at Lag 2+**:
    $$ \gamma_2 = Cov(w_t + \theta w_{t-1}, w_{t-2} + \theta w_{t-3}) = 0 $$
    There are absolutely no overlapping $w$ terms.

### The ACF Formula and the $\pm 0.5$ Limit
By dividing $\gamma_1$ by $\gamma_0$, we get the theoretical lag-1 autocorrelation for an MA(1):
$$ \rho_1 = \frac{\theta\sigma^2}{\sigma^2(1 + \theta^2)} = \frac{\theta}{1 + \theta^2} $$
*(For $k > 1$, $\rho_k = 0$. This is the famous MA(1) "cutoff" signature).*

**The Bound:** By applying calculus (taking the derivative of $\frac{\theta}{1 + \theta^2}$ with respect to $\theta$ and setting it to zero), we find the maximum occurs at $\theta = 1$ and the minimum at $\theta = -1$.
*   If $\theta = 1$: $\rho_1 = \frac{1}{1 + 1^2} = 0.5$
*   If $\theta = -1$: $\rho_1 = \frac{-1}{1 + (-1)^2} = -0.5$

*Storyline insight: This is why an MA(1) can never have a lag-1 correlation stronger than 0.5. It's mathematically capped by the denominator.*

---

## 4. Autoregressive Model of Order 1: AR(1)

Instead of relying on past unobservable *shocks* (like MA), what if today's value relies directly on yesterday's *actual value*?

*   **Equation**: $Y_t = \alpha Y_{t-1} + w_t$
    *   $\alpha$ (alpha) is the autoregressive coefficient.

### Infinite Memory (Stationarity Condition)
If we expand the equation by substituting $Y_{t-1}$:
$$ Y_t = \alpha(\alpha Y_{t-2} + w_{t-1}) + w_t = \dots = w_t + \alpha w_{t-1} + \alpha^2 w_{t-2} + \alpha^3 w_{t-3} + \dots $$
An AR(1) is actually an infinite Moving Average! Because it relies on the past infinitely, we must ensure $|\alpha| < 1$. If $\alpha \geq 1$, the series will explode to infinity (it becomes non-stationary).

### The ACF "Decays"
*   **Variance (Lag 0)**: $\gamma_0 = \frac{\sigma^2}{1 - \alpha^2}$
*   **Lag 1**: $\rho_1 = \alpha$
*   **Lag 2**: $\rho_2 = \alpha^2$
*   **Lag $k$**: $\rho_k = \alpha^k$

Because $|\alpha| < 1$, multiplying it by itself makes it smaller. Thus, the ACF decays exponentially towards zero. It never abruptly cuts off.

### Why the PACF "Cuts Off"
Remember that the PACF isolates the direct effect of $Y_{t-k}$ on $Y_t$. 
By definition, in $Y_t = \alpha Y_{t-1} + w_t$, the *only* thing directly influencing $Y_t$ is $Y_{t-1}$. Once you know $Y_{t-1}$, knowing $Y_{t-2}$ gives you no extra information about $Y_t$.
Therefore, the PACF for an AR(1) has a massive spike at Lag 1 (equal to $\alpha$), and is exactly 0 for all lags $k \geq 2$.

---

## 5. Trends, Random Walks, and Differencing

If a series is not stationary, its mean or variance changes over time. The ACF becomes useless for diagnosing AR or MA components because the non-stationarity dominates the math.

### Deterministic Trend
*   **Equation**: $Y_t = \beta_0 + \beta_1 t + X_t$ (where $X_t$ is stationary noise).
The values naturally increase over time. The ACF will show massive, slow-decaying correlations. Why? Because $Y_1$ is small and $Y_{100}$ is big. $Y_{99}$ and $Y_{100}$ are both "big" relative to the overall mean, so they look highly correlated, but this is just an artifact of the trend, not true statistical memory.

### Stochastic Trend (Random Walk with Drift)
*   **Equation**: $Y_t = Y_{t-1} + c + w_t$
Notice this is just an AR(1) model where $\alpha = 1$. As established earlier, $\alpha = 1$ violates stationarity. The variance of a random walk grows with time ($Var(Y_t) = t\sigma^2$), so it wanders unpredictably. The ACF behaves exactly like the deterministic trend: very slow, spurious decay.

### The Solution: First Differencing ($\Delta$)
Differencing means looking at the *change* between steps rather than the absolute values.
$$ \Delta Y_t = Y_t - Y_{t-1} $$

**Applying it to a Trend:**
If $Y_t = \beta_0 + \beta_1 t + X_t$, then:
$$ \Delta Y_t = (\beta_0 + \beta_1 t + X_t) - (\beta_0 + \beta_1(t-1) + X_{t-1}) $$
$$ \Delta Y_t = \beta_1 + (X_t - X_{t-1}) $$
The time variable $t$ is gone! The trend is removed, and we are left with a constant mean ($\beta_1$) and a stationary noise process.

**Applying it to a Random Walk:**
If $Y_t = Y_{t-1} + c + w_t$, then:
$$ Y_t - Y_{t-1} = c + w_t $$
$$ \Delta Y_t = c + w_t $$
We recover perfectly stationary white noise around a constant mean (the drift, $c$).

*Storyline insight: Differencing is the great equalizer. It strips away the non-stationary "illusion" (the trend or the walk) and exposes the true underlying stationary engine (the MA, AR, or white noise).*
