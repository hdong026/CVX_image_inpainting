'use strict';
importScripts('./solver-core.js');
let solver, truth, total, paused, budget=0, cancelled=false, pending=false, last=-1, index=0;
function publish(status) {
  let frame=null;
  if (last!==solver.iteration) {
    let mse=0,count=0;
    for(let k=0;k<truth.length;k++) if(!solver.known[Math.floor(k/solver.c)]) {mse+=(solver.u[k]-truth[k])**2;count++;}
    const rgba=new Uint8ClampedArray(solver.w*solver.h*4);
    for(let p=0;p<solver.w*solver.h;p++) {
      for(let c=0;c<3;c++) rgba[4*p+c]=255*solver.u[p*solver.c+(solver.c===1?0:c)];
      rgba[4*p+3]=255;
    }
    frame={index:index++,...solver.metrics(),missing_mse:mse/count,rgba};last=solver.iteration;
  }
  postMessage({status,frame},frame?[frame.rgba.buffer]:[]);
}
function schedule(){if(!pending){pending=true;setTimeout(tick,0);}}
function tick(){
  pending=false;
  try {
    if(cancelled){publish('cancelled');return;}
    if(solver.iteration>=total){publish('complete');return;}
    if(paused&&budget===0){publish('paused');return;}
    // Yield often so pause and stop commands remain responsive.
    const end=Math.min(total,solver.iteration+(paused?Math.min(4,budget):4));
    while(solver.iteration<end){
      solver.step();if(budget>0)budget--;
      const k=solver.iteration;
      if(k%10===0 && solver.metrics().relative_gap<=.001){publish('complete');return;}
      if([1,2,5,10,20,50,100].includes(k)||k%Math.max(10,Math.ceil(total/100))===0)publish('running');
    }
    schedule();
  }catch(e){postMessage({status:'error',error:e.message});}
}
onmessage=e=>{
  const m=e.data;
  if(m.type==='init'){
    truth=Float64Array.from(m.truth);solver=new TVSolver(truth,m.known,m.width,m.height,m.channels);
    total=m.iterations;paused=m.paused;publish(paused?'paused':'running');schedule();
  }else if(solver){
    if(m.action==='pause'){paused=true;budget=0;}
    if(m.action==='resume'){paused=false;budget=0;}
    if(m.action==='step'){paused=true;budget=10;}
    if(m.action==='cancel')cancelled=true;
    schedule();
  }
};
