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

    def test_worker_early_stop_and_budget(self):
        # Execute the actual worker scheduler, including its terminal frame.
        code = r"""
const fs=require('fs'),vm=require('vm'),S=require('./app/static/solver-core.js');
const results=[];
for(const limit of [20,1000]){
 const queue=[],packets=[],ctx={onmessage:null,TVSolver:S,importScripts(){},postMessage(p){packets.push(p)},setTimeout(f){queue.push(f)}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('./app/static/solver-worker.js','utf8'),ctx);
 const truth=Array(320).fill(.7),known=Array(320).fill(1);
 for(let y=4;y<12;y++)for(let x=9;x<11;x++)known[y*20+x]=0;
 ctx.onmessage({data:{type:'init',truth,known,width:20,height:16,channels:1,iterations:limit,paused:false}});
 while(queue.length)queue.shift()();
 const frames=packets.filter(p=>p.frame).map(p=>p.frame);
 results.push({status:packets.at(-1).status,last:frames.at(-1),iterations:frames.map(f=>f.iteration)});
}
process.stdout.write(JSON.stringify(results));
"""
        result=subprocess.run([NODE,'-e',code],cwd=ROOT,text=True,capture_output=True,check=True)
        capped,early=json.loads(result.stdout)
        self.assertEqual(capped['status'],'complete')
        self.assertEqual(capped['last']['iteration'],20)
        self.assertGreater(capped['last']['relative_gap'],.001)
        self.assertEqual(early['status'],'complete')
        self.assertLess(early['last']['iteration'],1000)
        self.assertLessEqual(early['last']['relative_gap'],.001)
        self.assertEqual(early['last']['known_error'],0)
        self.assertEqual(len(early['iterations']),len(set(early['iterations'])))
        from app.main import Job
        truth=np.full((16,20,1),.7);known=np.ones((16,20),bool);known[4:12,9:11]=False
        job=Job(truth,known,1000);job.run()
        self.assertEqual(job.status,'complete')
        self.assertEqual(job.frames[-1]['iteration'],early['last']['iteration'])
