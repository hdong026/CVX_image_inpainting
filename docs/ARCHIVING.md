# Archiving and distribution

## Program and experiment archives

- **Program ZIP:** source, bundled sample images with source-specific credits, launch scripts and documentation; excludes Python environments and personal experiments.
- **Experiment JSON:** exported with Save; includes working images, masks, settings and received iterates. Use it with the program for offline replay. It contains image data, so share accordingly.

Build the program archive from the project root:

```bash
python3 tools/package.py
```

This creates `dist/tv-inpainting-lab-v1.6.0.zip`, a SHA256 checksum and a per-file manifest. An explicit file list excludes `.venv`, personal `.tvlab.json` files and the original lecture PDF.

## Offline installation

The source ZIP needs Internet access for first installation. For an offline machine, prepare wheels on a machine with the same OS, CPU architecture and Python version:

```bash
python3 -m pip download -r requirements.txt -d wheelhouse
```

Transfer `wheelhouse` separately, install compatible Python, then run:

```bash
python3 launch.py --wheelhouse wheelhouse
```

An installed `.venv` works offline. Do not copy it across platforms. Requirements pin tested direct and transitive versions; each platform still needs compatible wheels.

## GitHub

Target repository: https://github.com/hdong026/CVX_image_inpainting

Download its ZIP or clone it, then follow README.md. The browser edition in docs/ works on GitHub Pages without a Python backend; see DEPLOYMENT.md. Before pushing updates, review `git diff --cached` and include only distributable project files. `.gitignore` excludes environments, archives and personal experiments.

## Troubleshooting

- **Unsupported Python:** install Python 3.9–3.12 and use its launch command.
- **Install failure:** check terminal output and connectivity. Linux may require `python3-venv`.
- **Port in use:** run `python3 launch.py --port 8766`.
- **Too many images:** save and remove some; the library holds 8.
- **Slow computation:** upload at 128 or 256 px. The resolution selector affects new uploads only.
- **Large experiment:** reduce images or recorded iterates before saving. Imports are limited to 64 MB.
