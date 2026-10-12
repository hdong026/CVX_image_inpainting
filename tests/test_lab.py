import time
import unittest
import numpy as np
from fastapi.testclient import TestClient
from app.solver import gradient, adjoint, TVSolver
from app.main import app, png_url

class SolverTests(unittest.TestCase):
    def test_adjoint(self):
        rng=np.random.default_rng(7);u=rng.random((9,12,3));p=rng.normal(size=gradient(u).shape)
        self.assertAlmostEqual(float(np.sum(gradient(u)*p)),float(np.sum(u*adjoint(p,u.shape))),places=12)
    def test_reconstruction_and_no_leak(self):
        for c in (1,3):
            truth=np.full((20,24,c),.7);known=np.ones((20,24),bool);known[5:15,10:12]=False
            other=truth.copy();other[~known]=.1
            a,b=TVSolver(truth,known),TVSolver(other,known);a.step(500);b.step(500)
            np.testing.assert_array_equal(a.u,b.u);np.testing.assert_array_equal(a.u[known],truth[known])
            self.assertLess(np.mean((a.u[~known]-truth[~known])**2),1e-5)
            self.assertTrue((a.u>=0).all() and (a.u<=1).all())
            m=a.metrics();self.assertGreaterEqual(m['tv']+1e-10,m['lower_bound']);self.assertLess(m['relative_gap'],.01)
    def test_boundary(self):
        known=np.ones((8,8),bool);known[-1,-1]=False
        s=TVSolver(np.ones((8,8,1)),known);s.step(20);self.assertEqual(s.u[-1,-1,0],0)

class APITests(unittest.TestCase):
    def check_example_gallery(self, client):
        for name in ('chelsea', 'lena', 'astronaut', 'camera', 'coffee'):
            response = client.get('/api/example', params={'name': name, 'max_side': 128})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(max(response.json()['width'], response.json()['height']), 128)
            self.assertTrue(response.json()['image'].startswith('data:image/png;base64,'))
        self.assertEqual(client.get('/api/example', params={'name': '../main.py'}).status_code, 422)
        self.assertEqual(client.get('/api/example', params={'max_side': 999}).status_code, 422)

    def test_upload_and_step(self):
        import base64
        with TestClient(app) as client:
            self.check_example_gallery(client)
            self.assertEqual(client.get('/api/health').status_code,200)
            raw=base64.b64decode(png_url(np.full((16,20,3),.7)).split(',')[1])
            r=client.post('/api/prepare',files={'file':('test.png',raw,'image/png')},data={'max_side':128})
            self.assertEqual(r.status_code,200)
            mask=np.zeros((16,20,3));body={'image':r.json()['image'],'mask':png_url(mask),'iterations':100,'paused':True}
            self.assertEqual(client.post('/api/jobs',json=body).status_code,422)
            mask[4:12,9:11]=1;body['mask']=png_url(mask)
            r=client.post('/api/jobs',json=body);self.assertEqual(r.status_code,200);job=r.json()['id']
            def until(test):
                deadline=time.monotonic()+5
                while time.monotonic()<deadline:
                    state=client.get('/api/jobs/'+job).json()
                    if test(state):return state
                    time.sleep(.02)
                self.fail('timeout')
            s=until(lambda s:s['status']=='paused');self.assertEqual(s['frames'][-1]['iteration'],0)
            client.post(f'/api/jobs/{job}/control',json={'action':'step'})
            until(lambda s:s['status']=='paused' and s['frames'][-1]['iteration']==10)
            client.post(f'/api/jobs/{job}/control',json={'action':'resume'})
            with client.websocket_connect(f'/api/jobs/{job}/stream') as ws:
                while ws.receive_json()['status']!='complete':pass
            s=until(lambda s:s['status']=='complete')
            self.assertEqual(s['frames'][-1]['iteration'],100)
            self.assertTrue(all(f['known_error']==0 for f in s['frames']))
            self.assertLess(s['frames'][-1]['missing_mse'],s['frames'][0]['missing_mse'])
