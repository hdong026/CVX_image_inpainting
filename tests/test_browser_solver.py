"""Check the browser's numerical core against the reference Python solver."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import unittest
import numpy as np
from app.solver import TVSolver

NODE=os.environ.get('TV_LAB_NODE') or shutil.which('node')
ROOT=Path(__file__).resolve().parents[1]

@unittest.skipUnless(NODE,'Node is optional; set TV_LAB_NODE for browser-core parity checks')
class BrowserParityTests(unittest.TestCase):
    def test_gray_and_rgb_iterates(self):
        for channels in (1,3):
            rng=np.random.default_rng(72)
            original=rng.random((12,16,channels))
            known=np.ones((12,16),bool);known[3:9,5:8]=False;known[-1,-1]=False
            solver=TVSolver(original,known);solver.step(75)
            payload={'observed':original.ravel().tolist(),'known':known.ravel().astype(int).tolist(),'w':16,'h':12,'c':channels}
            code="const fs=require('fs'),S=require('./app/static/solver-core.js'),d=JSON.parse(fs.readFileSync(0,'utf8'));const s=new S(d.observed,d.known,d.w,d.h,d.c);s.step(75);process.stdout.write(JSON.stringify({u:Array.from(s.u),metrics:s.metrics()}));"
            r=subprocess.run([NODE,'-e',code],cwd=ROOT,input=json.dumps(payload),text=True,capture_output=True,check=True)
            result=json.loads(r.stdout)
            np.testing.assert_allclose(result['u'],solver.u.ravel(),rtol=0,atol=1e-12)
            for name,value in solver.metrics().items():self.assertAlmostEqual(result['metrics'][name],value,places=10)
