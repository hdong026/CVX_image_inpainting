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
| POST `/api/jobs` | JSON `image`, `mask`, `mode`, `iterations`, `paused` |
| POST `/api/jobs/{id}/control` | JSON `action`: pause/resume/step/cancel |
| GET `/api/jobs/{id}?after=-1` | Status and subsequent iterates |
| WS `/api/jobs/{id}/stream?after=-1` | Stream status and iterates |

Job images and masks are same-size PNG data URLs. White mask pixels are missing; black pixels are known. Mode: `rgb`/`gray`; iterations: 10–4000. `step` advances ten iterations before pausing.

At most two active jobs and eight job records are retained. Images and solver states stay in memory. The default binding is 127.0.0.1, intended for local classroom use rather than public multi-user hosting.

Experiment schema 1 has an `images` array with `name`, `image`, `mask`, `mode`, `iterations`, `frames`, `frame`. Each frame contains a PNG and `iteration`, `tv`, `lower_bound`, `relative_gap`, `missing_mse`, `known_error`. Restore does not invoke the solver. Version 1.1 reads version 1.0 experiments.
