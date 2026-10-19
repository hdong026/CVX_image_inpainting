# Validation

Tested on 2026-10-10: macOS ARM64, Python 3.9.6, pinned dependencies.

Four automated tests cover the difference/adjoint identity; grayscale and RGB reconstruction; exact known-pixel preservation; independence from hidden original values; pixel bounds and dual bound; the shared-interior boundary convention; upload validation; paused initialization; ten-iteration stepping; resume and WebSocket completion. All passed after the version 1.1 changes.

Version 1.0 browser checks covered masking, k=10 pause, k=1000 completion, image switching, PNG upload, JSON save/restore, timeline endpoints and the pixel table. Desktop (1280 px) and narrow (390 px) layouts were inspected. A clean environment successfully installed and served through launch.py.

Version 1.1 uses English throughout the interface, runtime messages, launch scripts and documentation. It follows the lecture's “Examples: image in-painting” terminology and x_orig/K notation. The full formulation precedes the images; notes and pixel inspection are collapsed until needed. Solver and experiment schema are unchanged.

Windows/Linux scripts are provided but have not been tested on those operating systems. The browser edition was subsequently deployed and checked in version 1.2.

Version 1.1 browser checks: English-only rendered text, mask creation, pause at k=10, resume to k=1000, pixel inspection, collapsed classroom view, and 1280/390 px layouts. No horizontal overflow was observed at 390 px.

## Version 1.2 browser solver

Five tests passed, including grayscale/RGB parity against the Python solver after 75 iterations (pixel tolerance 1e-12; metrics checked to 10 decimal places). Browser checks verified stepping to k=10, pausing/resuming, and independent RGB/grayscale images with no browser error logs.

## Version 1.3 classroom controls

All five automated tests passed again. Browser checks verified all three presets, mask replacement and Undo, disabled preset controls during a run, stepping to k=10, resuming to k=1000, and the selected-iterate gap updating when replaying k=0. With the 451 × 300 Chelsea example, thin scratches reached a relative gap of approximately 0.000738% at k=1000. Random 70% at k=200 showed approximately 4.95% and correctly reported “Iteration limit”. Presets retain the bottom-right pixel; the underlying TV solver and saved-experiment schema are unchanged.

## Version 1.4 custom masks and gallery (2026-10-12)

All five automated tests passed, now also checking all five example API responses, resolution limits and invalid example names. Browser checks covered the default 70% random mask, custom 35%, zero missing pixels, rejection of 100% without changing the mask, custom two-line text, all five bundled images, disabled inputs during a run, k=10 stepping and completion on Lena at k=1000. The Lena text example reached a relative gap of approximately 0.00229%. No browser error logs were observed. The generated `docs/` edition uses relative URLs for assets, image credits and its Web Worker so it can be hosted under a GitHub Pages repository subpath.

## Version 1.5

Six automated tests passed, including the actual browser worker scheduler stopping below its 1,000-iteration cap at relative gap ≤ 0.001, a separate iteration-budget case, and matching Python early-stop iteration. Direct thumbnail selection loaded Lena immediately. In the browser, Lena at 512 px with Thin scratches stopped at k=330 (gap 0.0988%); replay reached k=0 and switching to Camera and back preserved Lena's result. All four comparison panels remain present, and no browser error logs were observed. Versioned script and worker URLs prevent reuse of older solver assets after deployment.

## Version 1.6 (2026-10-19)

Eight automated tests passed. L1 and L2, in grayscale and RGB, were checked against independent CVXPY/CLARABEL optima: each primal value stayed above the optimum and each feasible dual value below it; final relative gaps were below 1e-4. JavaScript/Python 75-step iterates agree within 1e-12. Tests also cover hidden-value isolation, different L1/L2 penalties, all ten sample API responses, invalid norms and early stopping.

Browser checks: all five new thumbnails load; L1 stepping pauses at k=10; norm buttons are disabled during a run; the formula and pixel inspector switch with the solver. At 128 px on Checkerboard with Thin scratches, L1 stopped at k=60 (gap 0.0895%, missing MSE 0.00197); L2 on the unchanged mask stopped at k=40 (gap 0.0544%, missing MSE 0.00440). These are illustrative results, not a general ranking. Brick with random 70% in L1 correctly reached the 1,000-iteration cap with a 1.03% gap. Saving and importing the experiment preserved the L1 mode, mask and complete history. No browser error logs were observed during these checks.

## Version 1.6.1 (2026-10-19)

The eight numerical/API regression tests still pass. Browser checks verified five visible L2 examples on initial load, five visible L1 examples after switching the enlarged header tabs, automatic selection of Checkerboard in L1, and restoration of the previous L2 photograph. A solved L1 Checkerboard run (k=60) retained its mask and results after switching to L2 and back. The solver and objective definitions are unchanged.
