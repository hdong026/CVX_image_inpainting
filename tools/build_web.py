"""Build a dependency-free browser edition into docs/ for GitHub Pages."""
from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[1]
out=root/'docs'
(out/'static').mkdir(parents=True,exist_ok=True)
(out/'assets').mkdir(exist_ok=True)
for name in ('app.js','style.css','browser-backend.js','solver-core.js','solver-worker.js','credits.html'):
    shutil.copy2(root/'app/static'/name,out/'static'/name)
for asset in (root/'app/assets').iterdir():
    if asset.suffix in ('.png','.jpg'):
        shutil.copy2(asset,out/'assets'/asset.name)
html=(root/'app/static/index.html').read_text()
html=html.replace('href="/"','href="./"').replace('="/static/','="./static/').replace('="/assets/','="./assets/')
html=html.replace('<script src="./static/app.js?v=1.6.2" defer></script>','<script src="./static/browser-backend.js?v=1.6.2" defer></script>\n  <script src="./static/app.js?v=1.6.2" defer></script>')
html=html.replace('Computation is local.','Images and computation stay in your browser.')
(out/'index.html').write_text(html)
(out/'.nojekyll').write_text('')
print('Built docs/ for GitHub Pages')
