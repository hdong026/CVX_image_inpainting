# Image in-painting

An interactive demonstration of **L1 / L2 total variation in-painting** for a convex optimization lecture. Upload images, obscure pixel values, and follow the optimization iterates.

The interface follows the lecture notation: the original image is `x_orig`, and `K` is the set of indices corresponding to known pixel values. The browser edition computes iterates in a Web Worker; a Python reference implementation is included. No AI API, account or GPU is required.

## Open the website

**[Launch the live demo](https://hdong026.github.io/CVX_image_inpainting/?v=1.5.0)**

The browser edition needs **no installation, Python, account or API key**. Each visitor's browser runs the same TV / PDHG optimization independently. Selected images stay on their device.

## Hosting — GitHub Pages

1. Open the repository's **Settings → Pages**.
2. Select **Deploy from a branch**.
3. Select **main → /docs → Save**.

The complete static website is already in `docs/`; no build command or requirements installation is needed. GitHub will display the live link after publishing. See [deployment instructions](docs/DEPLOYMENT.md) for other static hosts.

## Optional local Python version

Python 3.9–3.12 (3.12 recommended). Double-click `start.command` on macOS or `start.bat` on Windows, or run:

```bash
python3 launch.py
```

The launcher creates an isolated environment and installs [requirements.txt](requirements.txt). For manual setup:

```bash
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8765
```

Open **http://127.0.0.1:8765**. Press **Ctrl+C** to stop. The local Python version is optional; website visitors do not need it.

## Demonstration

1. **Upload** images or click a permanent **Examples** thumbnail. The five photographs are joined by **Checkerboard**, **Shepp–Logan**, **Page**, **Horse**, and **Brick**.
2. Enter a **Random** missing percentage (whole number 0–99, default **70**) and click its **Apply** button. Or enter a custom **Text** watermark (1–3 lines, up to 120 characters) and click its **Apply** button. **Thin scratches** and the default **3 px** brush are also available. Changing a field does not alter an existing mask until **Apply** is clicked. Presets replace the mask; **Undo** restores it. Missing pixels appear black. **Erase** and **Clear** also edit the mask.
3. Choose **L2 TV** (the lecture model) or **L1 TV** beside the formula. Select **Solve**, or **+10 iterations** to advance and pause.
4. Use the timeline to compare iterates. Original, corrupted, in-painted and difference heatmap remain visible together.
5. Click the in-painted image to inspect the pixel differences in the TV objective.

**Relative gap** measures optimization accuracy: `(primal value − dual value) / max(1, primal value)`, displayed as a percentage for the selected iterate. At the end of a run, **Converged ≤ 0.1%** means the objective is near optimal; **Iteration limit** means the budget ended above this tolerance. The solver checks every 10 iterations and stops as soon as the relative gap is ≤ 0.1%; **Max iterations** is an upper limit. Recorded iterates remain available for replay. This is not a percentage of pixels repaired.

TV need not decrease at every iteration. MSE uses the original only for evaluation; the solver receives no original values at missing pixels. A small gap does not guarantee a visually accurate reconstruction of a large missing region.

The presets follow the [CVXPY TV in-painting example](https://www.cvxpy.org/examples/applications/tv_inpainting.html): scattered missing pixels and thin text strokes are easier to reconstruct than broad contiguous masks. **Random** uses a fixed seed and the requested approximate percentage of missing spatial pixels, and the same mask across RGB channels. The supplied photograph and random generator differ from the official example. The bottom-right pixel is kept known because it is absent from the displayed shared-interior TV sum.

## L1 / L2 comparison

Both buttons change the actual objective, dual projection and pixel inspector. **L2 TV** uses a joint Euclidean norm over directions/channels; **L1 TV** sums absolute gradient components (anisotropic TV). The norm is on the gradient, not on a data-fitting residual. Known pixels remain equality constraints. The page labels the solver **PDHG (Chambolle–Pock)**; the live site runs JavaScript, not CVXPY. CVXPY/CLARABEL is an independent development-test oracle only.

Slide 15's L2 objective, shared-interior difference convention and known-pixel constraints match. The app normalizes to [0,1] and adds a displayed box constraint. RGB groups all direction/channel components in one norm; grayscale is the most direct comparison with the slide formula. L1 is an additional model, not the original slide's L2 formulation.

Switching norms preserves the image and mask, clears the old run, and requires **Solve** again. Export a run before switching if you want to retain both histories. The same mask gives a fair comparison; primal values for different objectives are not directly comparable. Compare image errors and edges after each mode has sufficiently converged.

| Example | What to discuss |
| --- | --- |
| Checkerboard | Standard calibration pattern: horizontal/vertical edges and right-angle corners. Start here for L1. |
| Page | Printed text: thin strokes, gaps and nonuniform illumination. |
| Horse | Binary silhouette: flat regions with both straight and curved boundaries. |
| Shepp–Logan | Classic tomography phantom: piecewise-constant regions and ellipses; useful for seeing L1's directional bias. |
| Brick | Architectural material: rectilinear mortar lines plus fine texture. |

These are bundled [scikit-image test images](https://scikit-image.org/docs/0.24.x/api/skimage.data.html), not five guaranteed L1 wins. L1 favors axis-aligned edges and may distort curved/diagonal boundaries; both TV models can remove texture. See [credits and licenses](THIRD_PARTY_NOTICES.md).

## Save and restore

**Save** downloads an `.tvlab.json` containing working images, masks, settings and recorded iterates. **Open** adds them to the image library. Restore supports replay or a fresh solve, not resuming the previous solver state.

**Export PNG** saves the selected iterate; **CSV** saves the numerical history. Export before refreshing or closing the page. Uploaded images remain in local memory and are not saved automatically.

Limits: 16 images; PNG/JPEG/WebP; 20 MB and 24 megapixels per input; working long edge capped at 128/256/512 px; imported experiments up to 64 MB. In the browser edition, each visitor can run or pause up to two jobs independently. The default resolution cap is 512 px; smaller images are not enlarged. Resolution applies to the next upload or a sample thumbnail. For class, start with **Text** or **Thin scratches** and 1,000 iterations. Use 256 px on slower machines.

## Documentation

- [Quick deployment](docs/DEPLOYMENT.md)
- [Classroom demonstration](docs/CLASSROOM.md)
- [Formulation and algorithm](docs/MATH.md)
- [Archiving and offline installation](docs/ARCHIVING.md)
- [Development and API](docs/DEVELOPMENT.md)
- [Validation](docs/VALIDATION.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

Python + FastAPI + NumPy; native HTML/CSS/JavaScript Canvas. No Node.js build step. Code: MIT. Sample image credits and source-specific rights are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Original lecture slides and personal experiments are not distributed.

Sample thumbnails stay visible; click one to load it immediately. Selecting it again at the same resolution preserves its mask and iterates. Original, corrupted, in-painted, and difference images are always shown together. The heatmap is the mean absolute channel error against the original, computed from 8-bit display images, on a fixed 0–0.2 scale (brighter means larger error; values ≥0.2 saturate). It updates with the selected replay frame; CSV metrics use full precision.
