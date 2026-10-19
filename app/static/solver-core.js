/* L1/L2 TV / PDHG. Same shared-interior differences as app/solver.py. */
(function (root) {
  'use strict';
  class TVSolver {
    constructor(observed, known, width, height, channels, tvNorm = 'l2') {
      if (!['l1', 'l2'].includes(tvNorm)) throw Error('TV norm must be l1 or l2.');
      this.tvNorm = tvNorm;
      this.w = width; this.h = height; this.c = channels;
      this.known = Uint8Array.from(known);
      const size = width * height * channels;
      if (observed.length !== size || known.length !== width * height) throw Error('Image and mask dimensions do not match.');
      this.observed = new Float64Array(size);
      for (let k = 0; k < size; k++) this.observed[k] = known[Math.floor(k / channels)] ? observed[k] : 0;
      this.u = this.observed.slice(); this.bar = this.u.slice();
      this.pv = new Float64Array(size); this.ph = new Float64Array(size);
      this.q = new Float64Array(size); this.iteration = 0;
    }
    adjoint() {
      const {w, h, c, q, pv, ph} = this;
      q.fill(0);
      for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
        const k = (y * w + x) * c;
        for (let z = 0; z < c; z++) {
          q[k + w*c + z] += pv[k+z]; q[k+c+z] += ph[k+z];
          q[k+z] -= pv[k+z] + ph[k+z];
        }
      }
      return q;
    }
    step(count = 1) {
      const {w, h, c, u, bar, pv, ph, known, observed} = this;
      for (let n = 0; n < count; n++) {
        for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) {
          const k = (y*w+x)*c; let norm = 0;
          for (let z = 0; z < c; z++) {
            pv[k+z] += .30 * (bar[k+w*c+z] - bar[k+z]);
            ph[k+z] += .30 * (bar[k+c+z] - bar[k+z]);
            norm += pv[k+z]**2 + ph[k+z]**2;
          }
          const scale = Math.max(1, Math.sqrt(norm));
          for (let z = 0; z < c; z++) {
            if (this.tvNorm === 'l1') {
              pv[k+z] = Math.max(-1, Math.min(1, pv[k+z]));
              ph[k+z] = Math.max(-1, Math.min(1, ph[k+z]));
            } else { pv[k+z] /= scale; ph[k+z] /= scale; }
          }
        }
        const q = this.adjoint();
        for (let k = 0; k < u.length; k++) {
          const next = known[Math.floor(k/c)] ? observed[k] : Math.max(0, Math.min(1, u[k] - .30*q[k]));
          bar[k] = 2*next-u[k]; u[k] = next;
        }
        this.iteration++;
      }
    }
    metrics() {
      const {w,h,c,u,known,observed} = this;
      let tv=0, lower=0, residual=0;
      for (let y=0;y<h-1;y++) for (let x=0;x<w-1;x++) {
        const k=(y*w+x)*c; let norm=0;
        for (let z=0;z<c;z++) {
          const dv=u[k+w*c+z]-u[k+z], dh=u[k+c+z]-u[k+z];
          norm+=this.tvNorm==='l1'?Math.abs(dv)+Math.abs(dh):dv*dv+dh*dh;
        }
        tv+=this.tvNorm==='l1'?norm:Math.sqrt(norm);
      }
      const q=this.adjoint();
      for (let k=0;k<u.length;k++) {
        if (known[Math.floor(k/c)]) {lower+=q[k]*observed[k];residual=Math.max(residual,Math.abs(u[k]-observed[k]));}
        else lower+=Math.min(q[k],0);
      }
      return {iteration:this.iteration,tv,lower_bound:lower,relative_gap:Math.max(0,tv-lower)/Math.max(1,tv),known_error:residual};
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = TVSolver;
  else root.TVSolver = TVSolver;
})(typeof self !== 'undefined' ? self : globalThis);
