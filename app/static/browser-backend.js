/* Browser-only transport. User images never leave this browser. */
(function () {
  'use strict';
  const jobs=new Map();
  const scriptURL=document.currentScript.src;
  const workerURL=new URL('./solver-worker.js?v=1.6.3',scriptURL);
  const examples={chelsea:['chelsea.png','Chelsea'],lena:['lena.jpg','Lena'],astronaut:['astronaut.png','Astronaut'],camera:['camera.png','Camera'],coffee:['coffee.png','Coffee'],checkerboard:['checkerboard.png','Checkerboard'],phantom:['phantom.png','Shepp–Logan'],page:['page.png','Page'],horse:['horse.png','Horse'],brick:['brick.png','Brick']};
  const image=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Could not read image.'));im.src=src;});
  function context(width,height){const c=document.createElement('canvas');c.width=width;c.height=height;return c.getContext('2d',{willReadFrequently:true});}
  function pixels(im){const ctx=context(im.width,im.height);ctx.fillStyle='#fff';ctx.fillRect(0,0,im.width,im.height);ctx.drawImage(im,0,0);return ctx.getImageData(0,0,im.width,im.height).data;}
  async function prepare(file,maxSide,name){
    if(file.size>20*1024*1024)throw Error('Maximum 20 MB per image.');
    if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Use a PNG, JPEG or WebP image.');
    const url=URL.createObjectURL(file);
    try{
      const im=await image(url);
      if(im.width*im.height>24000000)throw Error('Image exceeds 24 megapixels.');
      const scale=Math.min(1,maxSide/Math.max(im.width,im.height));
      const w=Math.round(im.width*scale),h=Math.round(im.height*scale);
      if(Math.min(w,h)<8)throw Error('Working images must be at least 8 px.');
      const ctx=context(w,h);ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(im,0,0,w,h);
      return {name,width:w,height:h,image:ctx.canvas.toDataURL('image/png')};
    }finally{URL.revokeObjectURL(url);}
  }
  function send(job,packet){if(job.listener)job.listener(packet);else job.buffer.push(packet);}
  async function request(url,options={}){
    if(url.split('?')[0]==='/api/example'){
      const maxSide=+(new URL(url,location.href).searchParams.get('max_side')||256);
      if(![128,256,512].includes(maxSide))throw Error('Resolution must be 128, 256 or 512.');
      const name=new URL(url,location.href).searchParams.get('name')||'chelsea';
      if(!Object.hasOwn(examples,name))throw Error('Unknown example.');
      const [file,label]=examples[name];
      const r=await fetch(new URL('../assets/'+file,scriptURL));if(!r.ok)throw Error('Example image unavailable.');
      return prepare(await r.blob(),maxSide,label);
    }
    if(url==='/api/prepare')return prepare(options.body.get('file'),+options.body.get('max_side'),options.body.get('file').name);
    const body=JSON.parse(options.body||'{}');
    if(url==='/api/jobs'){
      body.tv_norm ??= 'l2';
      if(!['l1','l2'].includes(body.tv_norm))throw Error('TV norm must be l1 or l2.');
      if([...jobs.values()].filter(j=>!j.done).length>=2)throw Error('Two jobs are active. Complete or stop one first.');
      const im=await image(body.image),mask=await image(body.mask);
      if(im.width!==mask.width||im.height!==mask.height)throw Error('Mask and image dimensions must match.');
      const raw=pixels(im),mp=pixels(mask),known=new Uint8Array(im.width*im.height);
      const channels=body.mode==='gray'?1:3,truth=new Float64Array(known.length*channels);let missing=0;
      for(let p=0;p<known.length;p++){
        known[p]=mp[p*4]<=127?1:0;if(!known[p])missing++;
        if(channels===1)truth[p]=(.2126*raw[p*4]+.7152*raw[p*4+1]+.0722*raw[p*4+2])/255;
        else for(let c=0;c<3;c++)truth[p*3+c]=raw[p*4+c]/255;
      }
      if(!missing)throw Error('Mark some missing pixels first.');
      if(missing===known.length)throw Error('Keep some known pixels.');
      for(const [id,j]of jobs)if(j.done)jobs.delete(id);
      const id=crypto.randomUUID(),worker=new Worker(workerURL),job={worker,done:false,buffer:[],listener:null};jobs.set(id,job);
      worker.onmessage=e=>{
        const {status,error,frame}=e.data;
        let frames=[];
        if(frame){const ctx=context(im.width,im.height);ctx.putImageData(new ImageData(frame.rgba,im.width,im.height),0,0);delete frame.rgba;frames=[{...frame,image:ctx.canvas.toDataURL('image/png')}];}
        if(['complete','cancelled','error'].includes(status)){job.done=true;worker.terminate();}
        send(job,{id,status,error,iterations:body.iterations,frames});
      };
      worker.onerror=()=>{job.done=true;worker.terminate();send(job,{status:'error',error:'Browser solver failed. Try a lower resolution.',frames:[]});};
      worker.postMessage({type:'init',truth,known,width:im.width,height:im.height,channels,tv_norm:body.tv_norm,iterations:body.iterations,paused:body.paused},[truth.buffer,known.buffer]);
      return {id,iterations:body.iterations};
    }
    const match=url.match(/^\/api\/jobs\/([^/]+)\/control$/);
    if(match){const job=jobs.get(match[1]);if(!job)throw Error('Job expired. Start again.');if(!job.done)job.worker.postMessage({action:body.action});return {};}
    throw Error('Unsupported browser operation.');
  }
  function subscribe(id,listener){const job=jobs.get(id);if(!job)throw Error('Job not found.');job.listener=listener;for(const packet of job.buffer)listener(packet);job.buffer=[];return {close(){job.listener=null;}};}
  window.TVBrowser={request,subscribe};
})();
