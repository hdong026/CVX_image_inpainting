# Classroom demonstration

## Image in-painting: five minutes

1. **Known and missing pixels.** Draw a thin mask. Identify K and its complement. Only missing pixels are free to change.
2. **Convex formulation.** Point to the TV objective and equality constraints. Mention the normalized intensity bounds used by this implementation.
3. **Pixel differences.** Advance by 10 iterations and click the result. Connect the center, lower and right-hand pixels to the finite differences. For RGB, the norm also combines channels.
4. **Iterates and convergence.** Advance a few more times, then resume. Compare k=0, k=10, k=100 and the final iterate. Relate the objective to the dual bound; individual objective values need not be monotone.
5. **Reconstruction and limitations.** Compare the in-painted image, original and error. Repeat with a wider mask to illustrate the limits of the smoothness prior.

Save an experiment beforehand to replay without waiting for computation during class. Start with 256 px, a narrow mask and 1,000 iterations. Use 128 px on slower machines. Keep masks away from the outer boundary when illustrating the interior TV formula.

The main view contains the formulation, images and convergence plot. Pixel differences and operating notes are collapsed until needed.
