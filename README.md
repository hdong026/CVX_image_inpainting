# Image in-painting

An interactive demonstration of **ℓ₂ total variation in-painting** for a convex optimization lecture. Upload images, obscure pixel values, and follow the optimization iterates.

The interface follows the lecture notation: the original image is `x_orig`, and `K` is the set of indices corresponding to known pixel values. The browser edition computes iterates in a Web Worker; a Python reference implementation is included. No AI API, account or GPU is required.

## Open the website

**[Launch the live demo](https://cvx-image-inpainting-hdong026.silver-chick-5650.chatgpt.site)**

The browser edition needs **no installation, Python, account or API key**. Each visitor's browser runs the same TV / PDHG optimization independently. Selected images stay on their device.

## Deploy your own copy — GitHub Pages

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

1. **Upload** images, or use **Add example**.
2. Draw on the left image to mark missing pixels. **Erase**, **Undo**, and **Clear** edit the mask.
3. Select **Solve**, or **+10 iterations** to advance and pause.
4. Use the timeline to compare iterates. Switch between **In-painted**, **Original**, and **Error ×5**.
5. Click the in-painted image to inspect the pixel differences in the TV objective.

TV need not decrease at every iteration. MSE uses the original only for evaluation; the solver receives no original values at missing pixels.

## Save and restore

**Save** downloads an `.tvlab.json` containing working images, masks, settings and recorded iterates. **Open** adds them to the image library. Restore supports replay or a fresh solve, not resuming the previous solver state.

**Export PNG** saves the selected iterate; **CSV** saves the numerical history. Export before refreshing or closing the page. Uploaded images remain in local memory and are not saved automatically.

Limits: 8 images; PNG/JPEG/WebP; 20 MB and 24 megapixels per input; working long edge 128/256/512 px; imported experiments up to 64 MB. In the browser edition, each visitor can run or pause up to two jobs independently. For class, start with 256 px and 1,000 iterations.

## Documentation

- [Quick deployment](docs/DEPLOYMENT.md)
- [Classroom demonstration](docs/CLASSROOM.md)
- [Formulation and algorithm](docs/MATH.md)
- [Archiving and offline installation](docs/ARCHIVING.md)
- [Development and API](docs/DEVELOPMENT.md)
- [Validation](docs/VALIDATION.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

Python + FastAPI + NumPy; native HTML/CSS/JavaScript Canvas. No Node.js build step. Code: MIT. Example image: CC0. Original lecture slides and personal experiments are not distributed.
