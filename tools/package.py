"""Archive only distributable source files; exclude all user experiments."""
import hashlib
import json
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parents[1]
dist = root / 'dist'
dist.mkdir(exist_ok=True)
files = [p for folder in ('app', 'docs', 'tests', 'tools') for p in (root / folder).rglob('*')
         if p.is_file() and '__pycache__' not in p.parts and (p.suffix in ('.py', '.md', '.html', '.css', '.js', '.png', '.jpg') or p.name == '.nojekyll')]
files += [root / name for name in ('README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md', '.gitignore',
                                  'requirements.txt', 'requirements-dev.txt', 'launch.py', 'start.command', 'start.sh', 'start.bat')]
archive = dist / 'tv-inpainting-lab-v1.6.3.zip'
manifest = {}
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
    for path in sorted(files):
        name = path.relative_to(root).as_posix()
        bundle.write(path, 'tv-inpainting-lab/' + name)
        manifest[name] = hashlib.sha256(path.read_bytes()).hexdigest()
(dist / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix('.zip.sha256').write_text(f'{digest}  {archive.name}\n')
print(f'{archive}\n{len(files)} files; {archive.stat().st_size:,} bytes\nSHA256 {digest}')
