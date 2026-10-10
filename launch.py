"""Create an isolated environment, install dependencies, then serve locally."""
import argparse
import hashlib
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
import urllib.request
import venv
import webbrowser


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--no-browser', action='store_true')
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--wheelhouse', type=Path)
    args = parser.parse_args()
    if not (3, 9) <= sys.version_info[:2] <= (3, 12):
        raise SystemExit('Install Python 3.9–3.12 (3.12 recommended), then run again.')
    root = Path(__file__).resolve().parent
    env = root / '.venv'
    python = env / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
    if not python.exists():
        print('Creating the project Python environment…', flush=True)
        venv.EnvBuilder(with_pip=True).create(env)
    requirements = root / 'requirements.txt'
    digest = hashlib.sha256(requirements.read_bytes()).hexdigest()
    marker = env / '.requirements-sha256'
    if not marker.exists() or marker.read_text() != digest:
        command = [str(python), '-m', 'pip', 'install', '-r', str(requirements)]
        if args.wheelhouse:
            command += ['--no-index', '--find-links', str(args.wheelhouse.resolve())]
        subprocess.run(command, check=True)
        marker.write_text(digest)
    port = args.port
    with socket.socket() as sock:
        try:
            sock.bind(('127.0.0.1', port))
        except OSError:
            raise SystemExit(f'Port {port} is in use. Run python launch.py --port {port + 1}')
    url = f'http://127.0.0.1:{port}'
    print(f'Open {url}. Press Ctrl+C here to stop.', flush=True)
    process = subprocess.Popen([str(python), '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', str(port)], cwd=root)
    try:
        for _ in range(100):
            if process.poll() is not None:
                raise SystemExit('Server failed to start. See the output above.')
            try:
                with urllib.request.urlopen(url + '/api/health', timeout=.5):
                    if not args.no_browser:
                        webbrowser.open(url)
                    break
            except OSError:
                time.sleep(.1)
        process.wait()
    except KeyboardInterrupt:
        pass
    finally:
        if process.poll() is None:
            process.terminate()
        process.wait()


if __name__ == '__main__':
    main()
