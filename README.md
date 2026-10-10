# Image in-painting

An interactive demonstration of **ℓ₂ total variation in-painting** for a convex optimization lecture. Upload images, obscure pixel values, and follow the optimization iterates.

The interface follows the lecture notation: the original image is `x_orig`, and `K` is the set of indices corresponding to known pixel values. A local Python solver computes the iterates. No AI API, account or GPU is required.

## Quick start

1. Download and extract the project.
2. Install **Python 3.9–3.12** (3.12 recommended). On Windows, enable “Add Python to PATH”.
3. Start the app: **macOS:** double-click `start.command`; **Windows:** double-click `start.bat`; **Linux:** run `sh start.sh`.

Alternatively, open a terminal in this folder:

```bash
python3 launch.py
```

On Windows, use `py -3.12 launch.py`. On macOS, use `python3.12 launch.py` if your default Python is outside the supported range.

The first launch creates a project-local `.venv` and installs pinned dependencies. The browser opens **http://127.0.0.1:8765**. Subsequent launches work offline. Press **Ctrl+C** in the terminal to stop.

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

Limits: 8 images; PNG/JPEG/WebP; 20 MB and 24 megapixels per input; working long edge 128/256/512 px; imported experiments up to 64 MB. At most two jobs may be running or paused. For class, start with 256 px and 1,000 iterations.

## Documentation

- [Classroom demonstration](docs/CLASSROOM.md)
- [Formulation and algorithm](docs/MATH.md)
- [Archiving and offline installation](docs/ARCHIVING.md)
- [Development and API](docs/DEVELOPMENT.md)
- [Validation](docs/VALIDATION.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

Python + FastAPI + NumPy; native HTML/CSS/JavaScript Canvas. No Node.js build step. Code: MIT. Example image: CC0. Original lecture slides and personal experiments are not distributed.
