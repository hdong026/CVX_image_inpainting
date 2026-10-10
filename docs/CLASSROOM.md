# Classroom demonstration

## Image in-painting: five minutes

1. **Known and missing pixels.** Choose **Text** or **Thin scratches**. Identify K and its complement; missing pixels are black. Only missing pixels are free to change. Presets replace the mask and can be undone.
2. **Convex formulation.** Point to the TV objective and equality constraints. Mention the normalized intensity bounds used by this implementation.
3. **Pixel differences.** Advance by 10 iterations and click the result. Connect the center, lower and right-hand pixels to the finite differences. For RGB, the norm also combines channels.
4. **Iterates and convergence.** Advance a few more times, then resume. Compare k=0, k=10, k=100 and the final iterate. Relate the objective to the dual bound and **Relative gap**; individual objective values need not be monotone. **Gap ≤ 0.1%** is an objective-accuracy tolerance. **Iteration limit** does not assert convergence.
5. **Reconstruction and limitations.** Compare the in-painted image, original and error. Try **Random 70%**, then a broad drawn mask. Scattered missing pixels often retain nearby information, while a large missing region loses structure. A near-optimal TV objective can still produce an inaccurate image.

Save an experiment beforehand to replay without waiting for computation during class. Start with the example, a narrow mask and 1,000 iterations. The resolution cap defaults to 512 px and applies to new uploads/examples; use 256 or 128 px on slower machines. The drawing brush defaults to 3 px. Keep masks away from the outer boundary when illustrating the interior TV formula. Random masks use a fixed seed, approximately 70% missing pixels, with the bottom-right pixel retained; reapplying at the same dimensions reproduces the mask.

The main view contains the formulation, images and convergence plot. Pixel differences and operating notes are collapsed until needed.
