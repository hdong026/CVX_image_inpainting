# Classroom demonstration

## Image in-painting: five minutes

1. **Known and missing pixels.** Enter your own **Text** watermark and click **Apply**, or choose **Thin scratches**. Identify K and its complement; missing pixels are black. Only missing pixels are free to change. Presets replace the mask and can be undone.
2. **Convex formulation.** Point to the TV objective and equality constraints. Mention the normalized intensity bounds used by this implementation.
3. **Pixel differences.** Advance by 10 iterations and click the result. Connect the center, lower and right-hand pixels to the finite differences. For RGB, the norm also combines channels.
4. **Iterates and convergence.** Advance a few more times, then resume. Compare k=0, k=10, k=100 and the final iterate. Relate the objective to the dual bound and **Relative gap**; individual objective values need not be monotone. **Converged ≤ 0.1%** is the early-stopping objective-accuracy tolerance, checked every 10 iterations. **Iteration limit** does not assert convergence.
5. **Reconstruction and limitations.** Compare the in-painted image, original and error. Try **Random** at **70%**, then a broad drawn mask. Scattered missing pixels often retain nearby information, while a large missing region loses structure. A near-optimal TV objective can still produce an inaccurate image.

Save an experiment beforehand to replay without waiting for computation during class. Start with the example, a narrow mask and 1,000 iterations. The resolution cap defaults to 512 px and applies to new uploads/examples; use 256 or 128 px on slower machines. The drawing brush defaults to 3 px. Keep masks away from the outer boundary when illustrating the interior TV formula. Random masks use a fixed seed, the requested missing percentage (default 70%), with the bottom-right pixel retained; reapplying at the same dimensions reproduces the mask.

The main view contains the formulation, images and convergence plot. Pixel differences and operating notes are collapsed until needed.

Use the permanent **Examples** thumbnails to compare Chelsea, Lena, Astronaut, Camera and Coffee. Text accepts 1–3 lines and 120 characters; its font size fits the image automatically. Changing preset inputs leaves the mask unchanged until Apply. Save archives the resulting mask and images; these global preset input fields reset to their defaults on a fresh page.

Click any permanent sample thumbnail to display it. Compare the four panels throughout the run and replay: original, corrupted, in-painted and absolute-error heatmap. The heatmap uses a fixed 0–0.2 intensity-error scale, so colors remain comparable across iterates.

## Comparing gradient norms

Start with Checkerboard in Grayscale at 128 or 256 px. Apply Thin scratches, solve in L2, inspect corners, and export the result/CSV. Switch to L1 and solve with the unchanged mask. Compare corners and the heatmap once both gaps are small. Next try Page (fine text), Horse (silhouette), Shepp–Logan (curved boundaries), and Brick (straight lines plus texture). These are established scikit-image examples across several image types, not a claim that L1 is best on each.

The two curves are **Primal value** and **Dual value**. Their gap bounds optimization error for the chosen model. Different norms define different objective scales; compare reconstruction errors and visual structure across modes, not their raw primal values.
