# Development and API

Native HTML/CSS/JavaScript Canvas frontend, without a build step or CDN. FastAPI serves the files and runs a NumPy PDHG solver.

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python -m unittest discover -s tests -v
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8765
```

On Windows, replace `.venv/bin/python` with `.venv\Scripts\python.exe`. API documentation is at `/docs`.

| Endpoint | Purpose |
| --- | --- |
| GET `/api/health` | Version and health |
| GET `/api/example` | Prepared example |
| POST `/api/prepare` | Multipart `file`, `max_side` (128/256/512); returns PNG data URL |
| POST `/api/jobs` | JSON `image`, `mask`, `mode`, `tv_norm`, `iterations`, `paused` |
| POST `/api/jobs/{id}/control` | JSON `action`: pause/resume/step/cancel |
| GET `/api/jobs/{id}?after=-1` | Status and subsequent iterates |
| WS `/api/jobs/{id}/stream?after=-1` | Stream status and iterates |

Job images and masks are same-size PNG data URLs. White mask pixels are missing; black pixels are known. Mode: `rgb`/`gray`; TV norm: `l1`/`l2` (default `l2`); iterations: 10–4000. `step` advances up to ten iterations before pausing or converging. Both schedulers check relative gap ≤ 0.001 every ten iterations; they publish the final frame and complete immediately on convergence.

At most two active jobs and eight job records are retained. Images and solver states stay in memory. The default binding is 127.0.0.1, intended for local classroom use rather than public multi-user hosting.

Experiment schema 1 has an `images` array with `name`, `image`, `mask`, `mode`, `tv_norm`, `iterations`, `frames`, `frame`. Each frame contains a PNG and `iteration`, `tv`, `lower_bound`, `relative_gap`, `missing_mse`, `known_error`. Restore does not invoke the solver. Older schema-1 files without `tv_norm` are restored as L2. The library accepts up to 16 images. CSV headers use `primal_value` and `dual_value`; JSON keeps `tv` and `lower_bound` for compatibility.

## Browser edition

Run `python3 tools/build_web.py` to regenerate `docs/`. `browser-backend.js` handles image preparation locally and starts `solver-worker.js`; `solver-core.js` implements the same float64 PDHG updates as Python. The worker retains original values solely for MSE evaluation and the core discards values at missing pixels. Each visitor has independent jobs. No backend calls are made by the published website. Node.js is optional for cross-language parity tests; set `TV_LAB_NODE` to its executable path.

Version 1.6.1 adds optional `exampleGroup` (`l1`/`l2`) to saved items for example recommendations. It is a teaching recommendation independent of `tv_norm`. Missing groups are treated as uploaded/shared images. The last imported item selects the active mode.

Version 1.6.2 saves optional `exampleKey` as `name:resolution:norm` to restore bundled examples without duplicate sidebar entries. Older files remain accessible as compact text entries.
