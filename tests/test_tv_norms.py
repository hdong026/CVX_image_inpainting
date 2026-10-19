"""Independent convex oracle and feasibility checks for both TV penalties."""
import unittest
import numpy as np
import cvxpy as cp
from app.solver import TVSolver, total_variation

class TVNormTests(unittest.TestCase):
    def test_against_cvxpy(self):
        for norm in ('l1', 'l2'):
            for channels in (1, 3):
                with self.subTest(norm=norm, channels=channels):
                    rng = np.random.default_rng(51)
                    truth = rng.random((6, 7, channels))
                    known = rng.random((6, 7)) > .45
                    known[-1, -1] = True
                    x = [cp.Variable((6, 7)) for _ in range(channels)]
                    local = [cp.hstack([v for a in x for v in
                             (a[i+1,j]-a[i,j], a[i,j+1]-a[i,j])])
                             for i in range(5) for j in range(6)]
                    objective = sum(cp.norm(g, 1 if norm == 'l1' else 2) for g in local)
                    constraints = [c for z, a in enumerate(x) for c in
                                   (a >= 0, a <= 1, a[known] == truth[..., z][known])]
                    problem = cp.Problem(cp.Minimize(objective), constraints)
                    optimum = problem.solve(solver='CLARABEL', tol_gap_abs=1e-9, tol_feas=1e-9)
                    self.assertEqual(problem.status, 'optimal')
                    s = TVSolver(truth, known, norm)
                    for _ in range(100):
                        s.step(50)
                        m = s.metrics()
                        self.assertLessEqual(m['lower_bound'], optimum + 1e-6)
                        self.assertGreaterEqual(m['tv'], optimum - 1e-6)
                        if m['relative_gap'] < 1e-5:
                            break
                    self.assertLess(m['relative_gap'], 1e-4)
                    self.assertLess(abs(m['tv']-optimum), 1e-3)
                    np.testing.assert_array_equal(s.u[known], truth[known])
                    self.assertTrue(np.isfinite(s.u).all())
                    if norm == 'l1':
                        self.assertLessEqual(np.abs(s.p).max(), 1+1e-12)
                    else:
                        self.assertLessEqual(np.linalg.norm(s.p, axis=(-2,-1)).max(), 1+1e-12)

    def test_penalties_differ_and_missing_truth_is_discarded(self):
        u = np.array([[0, 1], [1, 0]], float)[..., None]
        self.assertEqual(total_variation(u, 'l1'), 2)
        self.assertAlmostEqual(total_variation(u, 'l2'), np.sqrt(2))
        known = np.array([[True, False], [True, True]])
        altered = u.copy(); altered[~known] = .27
        for norm in ('l1', 'l2'):
            a, b = TVSolver(u, known, norm), TVSolver(altered, known, norm)
            a.step(100); b.step(100)
            np.testing.assert_array_equal(a.u, b.u)
        with self.assertRaises(ValueError): TVSolver(u, known, 'invalid')
