"""Local REST/WebSocket server. Images and jobs are held in memory only."""
import asyncio
import base64
import binascii
import io
import math
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from .solver import TVSolver

ROOT = Path(__file__).resolve().parent
MAX_UPLOAD = 20 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 24_000_000


def png_url(array):
    pixels = np.rint(np.clip(array, 0, 1) * 255).astype(np.uint8)
    if pixels.ndim == 3 and pixels.shape[-1] == 1:
        pixels = pixels[..., 0]
    buf = io.BytesIO()
    Image.fromarray(pixels).save(buf, format='PNG')
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode('ascii')


def decode_image(raw, max_side=None):
    try:
        with Image.open(io.BytesIO(raw)) as opened:
            if opened.format not in ('PNG', 'JPEG', 'WEBP'):
                raise ValueError('Use a PNG, JPEG or WebP image.')
            if opened.width * opened.height > Image.MAX_IMAGE_PIXELS:
                raise ValueError('Image exceeds 24 megapixels.')
            image = ImageOps.exif_transpose(opened).convert('RGBA')
            # Transparency has an explicit white background.
            bg = Image.new('RGBA', image.size, 'white')
            bg.alpha_composite(image)
            image = bg.convert('RGB')
            if max_side:
                image.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
            if min(image.size) < 8 or max(image.size) > 512:
                raise ValueError('Working images must be 8–512 px.')
            return np.asarray(image, dtype=np.float64) / 255
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ValueError('Could not read image. Use a valid PNG, JPEG or WebP.') from exc


def decode_url(data):
    if not data.startswith('data:image/png;base64,') or len(data) > 4_000_000:
        raise ValueError('Invalid image format or size.')
    try:
        return base64.b64decode(data.split(',', 1)[1], validate=True)
    except (ValueError, binascii.Error) as exc:
        raise ValueError('Invalid image encoding.') from exc


class JobInput(BaseModel):
    image: str = Field(max_length=4_000_000)
    mask: str = Field(max_length=4_000_000)
    iterations: int = Field(default=1000, ge=10, le=4000)
    mode: Literal['rgb', 'gray'] = 'rgb'
    paused: bool = False
    tv_norm: Literal['l1', 'l2'] = 'l2'


class Control(BaseModel):
    action: Literal['pause', 'resume', 'step', 'cancel']


class Job:
    def __init__(self, truth, known, iterations, paused=False, tv_norm="l2"):
        self.id = uuid.uuid4().hex
        self.created = time.monotonic()
        self.truth = truth
        self.solver = TVSolver(np.where(known[..., None], truth, 0), known, tv_norm)
        self.iterations = iterations
        self.paused = paused
        self.budget = 0
        self.cancelled = False
        self.status = 'queued'
        self.error = None
        self.frames = []
        self.condition = threading.Condition(threading.RLock())
        self.interval = max(10, math.ceil(iterations / 100))
        self.publish()

    def publish(self):
        with self.condition:
            if self.frames and self.frames[-1]['iteration'] == self.solver.iteration:
                return
            metrics = self.solver.metrics()
            # Evaluation belongs here, outside the optimization algorithm.
            metrics['missing_mse'] = float(np.mean((self.solver.u[~self.solver.known]
                                                   - self.truth[~self.solver.known]) ** 2))
            self.frames.append(dict(index=len(self.frames), image=png_url(self.solver.u), **metrics))

    def run(self):
        try:
            while self.solver.iteration < self.iterations:
                with self.condition:
                    while self.paused and self.budget == 0 and not self.cancelled:
                        self.publish()
                        self.status = 'paused'
                        self.condition.wait(timeout=.5)
                    if self.cancelled:
                        break
                    self.status = 'running'
                    if self.budget:
                        self.budget -= 1
                self.solver.step()
                k = self.solver.iteration
                if k % 10 == 0 and self.solver.metrics()['relative_gap'] <= .001:
                    break
                if (k in (1, 2, 5, 10, 20, 50, 100) or k % self.interval == 0
                        or k == self.iterations or (self.paused and self.budget == 0)):
                    self.publish()
            self.publish()
            with self.condition:
                self.status = 'cancelled' if self.cancelled else 'complete'
        except Exception:
            with self.condition:
                self.status = 'error'
                self.error = 'Solver interrupted. Restart or use a lower resolution.'

    def control(self, action):
        with self.condition:
            if self.status in ('complete', 'cancelled', 'error'):
                return
            if action == 'cancel':
                self.cancelled = True
            elif action == 'pause':
                self.paused, self.budget = True, 0
            elif action == 'resume':
                self.paused, self.budget = False, 0
            elif action == 'step':
                self.paused, self.budget = True, 10
            self.condition.notify_all()

    def packet(self, after=-1):
        with self.condition:
            return dict(id=self.id, status=self.status, error=self.error,
                        iterations=self.iterations, frames=self.frames[after + 1:])


jobs = {}
jobs_lock = threading.Lock()
pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix='tv-pdhg')


@asynccontextmanager
async def lifespan(app):
    yield
    with jobs_lock:
        for job in jobs.values():
            job.control('cancel')
    pool.shutdown(wait=True)


app = FastAPI(title='TV Inpainting Lab', version='1.6.1', lifespan=lifespan)
app.mount('/assets', StaticFiles(directory=ROOT / 'assets'), name='assets')
app.mount('/static', StaticFiles(directory=ROOT / 'static'), name='static')


@app.get('/')
def index():
    return FileResponse(ROOT / 'static' / 'index.html')


@app.get('/api/health')
def health():
    return {'status': 'ok', 'version': '1.6.1', 'algorithm': 'PDHG / L1 or L2 TV'}


@app.get('/api/example')
def example(max_side: int = 256, name: str = 'chelsea'):
    if max_side not in (128, 256, 512):
        raise HTTPException(422, 'Resolution must be 128, 256 or 512.')
    examples = {'chelsea': ('chelsea.png', 'Chelsea'), 'lena': ('lena.jpg', 'Lena'),
                'astronaut': ('astronaut.png', 'Astronaut'), 'camera': ('camera.png', 'Camera'),
                'coffee': ('coffee.png', 'Coffee'),
                'checkerboard': ('checkerboard.png', 'Checkerboard'), 'phantom': ('phantom.png', 'Shepp–Logan'), 'page': ('page.png', 'Page'), 'horse': ('horse.png', 'Horse'), 'brick': ('brick.png', 'Brick')}
    if name not in examples:
        raise HTTPException(422, 'Unknown example.')
    filename, label = examples[name]
    image = decode_image((ROOT / 'assets' / filename).read_bytes(), max_side)
    return dict(name=label, width=image.shape[1], height=image.shape[0], image=png_url(image))


@app.post('/api/prepare')
async def prepare(file: UploadFile = File(...), max_side: int = Form(256)):
    if max_side not in (128, 256, 512):
        raise HTTPException(422, 'Resolution must be 128, 256 or 512.')
    raw = await file.read(MAX_UPLOAD + 1)
    await file.close()
    if len(raw) > MAX_UPLOAD:
        raise HTTPException(413, 'Maximum 20 MB per image.')
    try:
        image = await asyncio.to_thread(decode_image, raw, max_side)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    return dict(name=(file.filename or 'Untitled image')[:100], width=image.shape[1],
                height=image.shape[0], image=png_url(image))


@app.post('/api/jobs')
def start_job(body: JobInput):
    try:
        truth = decode_image(decode_url(body.image))
        mask = decode_image(decode_url(body.mask))[..., 0] > .5
        if mask.shape != truth.shape[:2]:
            raise ValueError('Mask and image dimensions must match.')
        if not mask.any():
            raise ValueError('Mark some missing pixels first.')
        if mask.all():
            raise ValueError('Keep some known pixels.')
        if body.mode == 'gray':
            truth = (truth @ np.array([.2126, .7152, .0722]))[..., None]
        with jobs_lock:
            active = [j for j in jobs.values() if j.status not in ('complete', 'cancelled', 'error')]
            if len(active) >= 2:
                raise HTTPException(429, 'Two jobs are active. Complete or stop one first.')
            finished = sorted((j for j in jobs.values() if j not in active), key=lambda j: j.created)
            while len(jobs) >= 8 and finished:
                del jobs[finished.pop(0).id]
            job = Job(truth, ~mask, body.iterations, body.paused, body.tv_norm)
            jobs[job.id] = job
            pool.submit(job.run)
        return {'id': job.id, 'iterations': job.iterations}
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


def get_job(job_id):
    with jobs_lock:
        if job_id not in jobs:
            raise HTTPException(404, 'Job expired. Start again.')
        return jobs[job_id]


@app.post('/api/jobs/{job_id}/control')
def control(job_id: str, body: Control):
    job = get_job(job_id)
    job.control(body.action)
    return {'status': job.status}


@app.get('/api/jobs/{job_id}')
def job_state(job_id: str, after: int = -1):
    return get_job(job_id).packet(max(-1, after))


@app.websocket('/api/jobs/{job_id}/stream')
async def stream(socket: WebSocket, job_id: str, after: int = -1):
    # Browsers must connect from this local application's origin.
    origin = socket.headers.get('origin', '')
    host = socket.headers.get('host', '')
    if origin and origin not in ('http://' + host, 'https://' + host):
        await socket.close(code=1008)
        return
    await socket.accept()
    try:
        job = get_job(job_id)
    except HTTPException:
        await socket.send_json({'status': 'error', 'error': 'Job not found. Start again.', 'frames': []})
        await socket.close()
        return
    after = max(-1, after)
    previous = None
    try:
        while True:
            packet = job.packet(after)
            if packet['frames'] or previous != packet['status']:
                await socket.send_json(packet)
                if packet['frames']:
                    after = packet['frames'][-1]['index']
                previous = packet['status']
            if packet['status'] in ('complete', 'cancelled', 'error'):
                await socket.close()
                break
            await asyncio.sleep(.15)
    except WebSocketDisconnect:
        pass
