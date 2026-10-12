# Formulation and algorithm

## Image in-painting

The supplied lecture, *introduction*, slide 15, describes guessing pixel values in obscured or corrupted parts of an image. A grayscale image is an m × n matrix; a color image is an m × n × 3 array. Let x_orig be the original image and K the indices of known pixel values.

The lecture's ℓ₂ total variation in-painting formulation is:

```math
\begin{aligned}
\min_x\quad &\mathrm{TV}(x)=\sum_{i=1}^{m-1}\sum_{j=1}^{n-1}
\left\|\begin{bmatrix}x_{i+1,j}-x_{ij}\\x_{i,j+1}-x_{ij}\end{bmatrix}\right\|_2\\
\text{s.t.}\quad &x_{ij}=x^{\mathrm{orig}}_{ij},\quad(i,j)\in K.
\end{aligned}
```

This implementation normalizes intensities to [0,1] and explicitly adds 0 ≤ x ≤ 1. RGB uses one joint Euclidean norm over both directions and all three channels, rather than three independent TV penalties.

Forward differences use the shared interior, exactly as in the displayed sums. With this boundary convention, the bottom-right pixel does not occur in the objective. If missing, its initial zero is retained. Prefer interior masks for the demonstration.

## Iterates

Let D be the forward-difference operator, D* its exact adjoint, and C the set satisfying the known-pixel and box constraints. The primal–dual hybrid gradient (PDHG) updates are:

```math
\begin{aligned}
p^{k+1}&=\Pi_{\{\|p_{ij}\|_2\le1\}}(p^k+\sigma D\bar x^k),\\
x^{k+1}&=\Pi_C(x^k-\tau D^*p^{k+1}),\\
\bar x^{k+1}&=2x^{k+1}-x^k.
\end{aligned}
```

The implementation uses τ=σ=0.30. Since ‖D‖²≤8, τσ‖D‖²≤0.72<1. Missing pixels start at zero. Projection onto C restores known pixels exactly at every iteration.

`TVSolver` discards all input values at missing indices. The original missing values are used only by the outer evaluation code to compute MSE.

## Objective and dual bound

The objective need not decrease at every iteration. With q=D*p, a dual lower bound is:

```math
L(p)=\sum_{(i,j)\in K,c}q_{ijc}x^{\mathrm{orig}}_{ijc}
+\sum_{(i,j)\notin K,c}\min(q_{ijc},0).
```

The interface and CSV include `relative_gap = max(0, TV - lower_bound) / max(1, TV)`. The interface displays this as a percentage for the selected iterate. Floating-point errors may affect the bound. Every 10 iterations, the solver checks this quantity and stops when it is at most 0.001 (“Converged ≤ 0.1%”). The chosen maximum remains a hard cap; “Iteration limit” means it ended above the tolerance. These are numerical objective-accuracy indicators, not exact optimality certificates or image-quality scores. The timeline records early and subsequently sampled iterates, not every iteration.

## Pixel differences

The table shows xᵢⱼ, xᵢ₊₁,ⱼ and xᵢ,ⱼ₊₁. Their vertical and horizontal differences contribute `sqrt(sum_c(d_v,c² + d_h,c²))`.

Table values come from the displayed 8-bit PNG, divided by 255. The objective and CSV use double precision. Indices start at 1. The inspector always describes the in-painted iterate, even in Original or Error comparison mode.

The error image displays `min(255, 5 * abs(result - original))` per channel. Grayscale uses the same luminance conversion for both images. The constraint residual is the maximum absolute error at known pixels.

## Limitations

TV favors smoothness. Thin scratches and small missing regions are useful demonstrations; large masks may lose texture, blur edges or produce staircase effects. The method does not infer object semantics. All metrics refer to the resized working image.

References: [CVXPY TV in-painting example](https://www.cvxpy.org/examples/applications/tv_inpainting.html), [Chambolle–Pock algorithm](https://doi.org/10.1007/s10851-010-0251-1).
