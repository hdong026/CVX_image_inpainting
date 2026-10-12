# Quick deployment

Current classroom edition: [open on GitHub Pages](https://hdong026.github.io/CVX_image_inpainting/). Version 1.4 includes customizable masks and five sample images. The repository itself is the deployment source.

## Recommended: static browser edition

The `docs/` folder is a complete website. The TV solver runs in a Web Worker on each visitor's device. No Python server, database, API key or build service is needed. User images are read locally and are not uploaded to the host.

### GitHub Pages — three steps

1. In your repository, open **Settings → Pages**.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Select **main** and **/docs**, then **Save**.

Wait for GitHub to show the published URL. For this repository, the project URL is `https://hdong026.github.io/CVX_image_inpainting/`. A fork uses its own owner and repository name.

The `.nojekyll` file serves these files directly. Relative asset and Worker paths also work under a project subpath. Subsequent pushes to `main` update the site.

Reference: [GitHub Pages publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

### Any static host

Publish the contents of `docs/` as the website root. Use HTTPS. No install or build command is needed because the generated website is committed. The host must serve `.js` as JavaScript and permit same-origin Web Workers (`worker-src 'self'` if you set a CSP).

### Update the browser edition

After changing `app/static/`, regenerate the published files:

```bash
python3 tools/build_web.py
git add app/static docs
git commit -m "Update browser demonstration"
git push
```

Only the maintainer needs Python for regeneration; visitors need only a current desktop browser. The builder uses the standard library and does not require `pip install`.

## Optional: Python reference edition

`requirements.txt` pins the Python dependencies. On Python 3.9–3.12:

```bash
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8765
```

Open `http://127.0.0.1:8765`. The Python service is retained for local numerical experiments. It is not the public multi-user deployment: it has shared in-memory job limits and no user authentication. Use the static browser edition for a class.

## Classroom checklist

- Open the published link on the classroom network before the session.
- Use 128 or 256 px on slower devices; 512 px takes longer.
- Export experiments before closing or refreshing. Each browser has its own temporary images and jobs.
- Browser and Python image resizing may differ slightly. The solver matches for the same prepared input, not necessarily for separately resized versions of a large original.
