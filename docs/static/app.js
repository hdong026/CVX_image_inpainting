'use strict';
const $=id=>document.getElementById(id), items=[];
let selected=null, tool='brush', drawing=false, last=null, playback=null, renderToken=0;
const active=i=>i&&['queued','running','paused'].includes(i.status);
const current=()=>items.find(i=>i.id===selected);
const canvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
const loadImage=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Could not read image data.'));im.src=src;});
function notice(message){$('notice').hidden=false;$('notice').textContent=message;}
async function api(url,options){if(window.TVBrowser)return window.TVBrowser.request(url,options);const r=await fetch(url,options);const data=await r.json();if(!r.ok)throw Error(typeof data.detail==='string'?data.detail:'Invalid request.');return data;}
const post=(url,data)=>api(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
function guarded(fn){return async(...args)=>{try{await fn(...args);}catch(e){notice(e.message);}};}
function pixels(im){const c=canvas(im.width,im.height);c.getContext('2d').drawImage(im,0,0);return c.getContext('2d').getImageData(0,0,c.width,c.height);}
function sourcePixels(i){const p=new ImageData(new Uint8ClampedArray(i.pixels.data),i.width,i.height);if(i.mode==='gray')for(let n=0;n<p.data.length;n+=4){const g=Math.round(.2126*p.data[n]+.7152*p.data[n+1]+.0722*p.data[n+2]);p.data[n]=p.data[n+1]=p.data[n+2]=g;}return p;}
async function addImage(data){if(items.length>=8)throw Error('Maximum 8 images.');const im=await loadImage(data.image);if(Math.min(im.width,im.height)<8||Math.max(im.width,im.height)>512)throw Error('Working images must be 8–512 px.');const i={id:crypto.randomUUID(),name:data.name||'Image',width:im.width,height:im.height,original:data.image,pixels:pixels(im),mask:canvas(im.width,im.height),undo:[],mode:'rgb',iterations:1000,frames:[],frame:0,follow:true,status:'idle',job:null};items.push(i);selected=i.id;render();return i;}
function maskPixels(i){return i.mask.getContext('2d').getImageData(0,0,i.width,i.height);}
function maskURL(i){const p=maskPixels(i);for(let n=0;n<p.data.length;n+=4){const a=p.data[n+3]>127?255:0;p.data[n]=p.data[n+1]=p.data[n+2]=a;p.data[n+3]=255;}const c=canvas(i.width,i.height);c.getContext('2d').putImageData(p,0,0);return c.toDataURL();}
function invalidate(i){i.frames=[];i.frame=0;i.status='idle';i.job=null;i.resultPixels=null;stopPlayback();}
function stopPlayback(){clearInterval(playback);playback=null;$('playback').textContent='Play';}
function renderLibrary(){const box=$('image-list');box.replaceChildren();for(const i of items){const b=document.createElement('button');b.className='image-card'+(i.id===selected?' selected':'');b.setAttribute('aria-pressed',String(i.id===selected));const im=document.createElement('img');im.src=i.original;im.alt='';const span=document.createElement('span');span.textContent=i.name;b.append(im,span);b.onclick=()=>{stopPlayback();selected=i.id;render();};box.append(b);}for(const b of document.querySelectorAll('[data-example]'))b.setAttribute('aria-pressed',String(current()?.exampleKey?.split(':')[0]===b.dataset.example));$('image-count').textContent=`${items.length} / 8`;}
function renderEditor(){const i=current(),c=$('editor'),o=$('original');if(!i){o.getContext('2d').clearRect(0,0,o.width,o.height);c.getContext('2d').clearRect(0,0,c.width,c.height);return;}c.width=o.width=i.width;c.height=o.height=i.height;o.getContext('2d').putImageData(sourcePixels(i),0,0);const p=sourcePixels(i),m=maskPixels(i);let missing=0;for(let n=0;n<p.data.length;n+=4)if(m.data[n+3]>127){missing++;p.data[n]=p.data[n+1]=p.data[n+2]=0;}c.getContext('2d').putImageData(p,0,0);$('missing-count').textContent=`${(100*missing/(i.width*i.height)).toFixed(1)}% missing`;}
function renderControls(){const i=current(),busy=active(i),has=!!i?.frames.length;for(const id of ['run','step','remove-image','clear-mask','undo','mode','iterations','preset-random','preset-text','preset-scratches','random-percent','watermark-text'])$(id).disabled=!i||(busy&&!['step','remove-image'].includes(id));$('step').disabled=!i||(busy&&i.status!=='paused');$('pause').disabled=!busy;$('stop').disabled=!busy;$('pause').textContent=i?.status==='paused'?'Resume':'Pause';for(const id of ['download-result','download-csv','playback','timeline','latest'])$(id).disabled=!has;const labels={idle:'Ready',queued:'Queued',running:'Solving',paused:'Paused',complete:i?.frames.at(-1)?.relative_gap<=.001?'Converged ≤ 0.1%':'Iteration limit',cancelled:'Stopped',error:'Interrupted',restored:'Restored'};$('run-status').textContent=labels[i?.status]||'No image';$('timeline').max=Math.max(0,(i?.frames.length||1)-1);$('timeline').value=i?.frame||0;}
async function renderFrame(){const token=++renderToken,i=current(),f=i?.frames[i.frame];$('result-placeholder').hidden=!!f;for(const [id,key] of [['metric-k','iteration'],['metric-tv','tv'],['metric-mse','missing_mse'],['metric-gap','relative_gap']])$(id).textContent=f?(key==='iteration'?f[key]:key==='tv'?f[key].toFixed(2):key==='relative_gap'?(100*f[key]).toPrecision(3)+'%':f[key].toExponential(2)):'—';$('frame-label').textContent=f?`k = ${f.iteration} · ${i.frame+1}/${i.frames.length}`:'No iterates';const c=$('result'),heat=$('difference');if(!f){heat.getContext('2d').clearRect(0,0,heat.width,heat.height);i&&(i.resultPixels=null);c.getContext('2d').clearRect(0,0,c.width,c.height);$('pixel-values').replaceChildren();$('local-tv').textContent='‖(dᵥ, dₕ)‖₂';$('pixel-patch').getContext('2d').clearRect(0,0,180,180);return;}const im=await loadImage(f.image);if(token!==renderToken)return;i.resultPixels=pixels(im);c.width=i.width;c.height=i.height;const p=new ImageData(new Uint8ClampedArray(i.resultPixels.data),i.width,i.height),orig=sourcePixels(i);heat.width=i.width;heat.height=i.height;const hp=new ImageData(i.width,i.height);
// Fixed [0, 0.2] scale, shared by every image and replay frame.
const stops=[[0,0,0],[87,30,117],[221,81,58],[255,235,110]];
for(let n=0;n<p.data.length;n+=4){const error=(Math.abs(p.data[n]-orig.data[n])+Math.abs(p.data[n+1]-orig.data[n+1])+Math.abs(p.data[n+2]-orig.data[n+2]))/(3*255),t=Math.min(1,error/.2)*3,j=Math.min(2,Math.floor(t)),f=t-j;for(let k=0;k<3;k++)hp.data[n+k]=stops[j][k]*(1-f)+stops[j+1][k]*f;hp.data[n+3]=255;}
heat.getContext('2d').putImageData(hp,0,0);c.getContext('2d').putImageData(p,0,0);inspect(i,i.inspectX??Math.floor(i.width/2),i.inspectY??Math.floor(i.height/2));}
function render(){renderLibrary();const i=current();$('image-name').textContent=i?.name||'Upload an image';$('image-dimensions').textContent=i?`${i.width} × ${i.height} px`:'';if(i){$('mode').value=i.mode;$('iterations').value=i.iterations;}renderEditor();renderControls();renderFrame().catch(e=>notice(e.message));chart();}
function point(c,e){const r=c.getBoundingClientRect(),scale=Math.min(r.width/c.width,r.height/c.height),w=c.width*scale,h=c.height*scale;return{x:Math.max(0,Math.min(c.width-1,(e.clientX-r.left-(r.width-w)/2)/scale)),y:Math.max(0,Math.min(c.height-1,(e.clientY-r.top-(r.height-h)/2)/scale))};}
function stroke(p){const i=current(),ctx=i.mask.getContext('2d');ctx.globalCompositeOperation=tool==='brush'?'source-over':'destination-out';ctx.strokeStyle='white';ctx.fillStyle='white';ctx.lineWidth=+$('brush-size').value;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.beginPath();ctx.arc(p.x,p.y,ctx.lineWidth/2,0,Math.PI*2);ctx.fill();last=p;renderEditor();}
$('editor').onpointerdown=e=>{const i=current();if(!i||active(i))return;e.preventDefault();i.undo.push(maskPixels(i));if(i.undo.length>12)i.undo.shift();invalidate(i);drawing=true;last=point($('editor'),e);$('editor').setPointerCapture(e.pointerId);stroke(last);renderControls();renderFrame();chart();};
$('editor').onpointermove=e=>{if(drawing)stroke(point($('editor'),e));};
for(const event of ['pointerup','pointercancel'])$('editor').addEventListener(event,()=>{drawing=false;});
$('result').onclick=e=>{const i=current();if(i?.resultPixels){document.querySelector('.pixel-details').open=true;const p=point($('result'),e);inspect(i,p.x,p.y);}};
function inspect(i,x,y){x=Math.max(0,Math.min(i.width-2,Math.floor(x)));y=Math.max(0,Math.min(i.height-2,Math.floor(y)));i.inspectX=x;i.inspectY=y;const p=i.resultPixels,at=(xx,yy,c)=>p.data[4*(yy*i.width+xx)+c]/255,colors=['#d77740','#467cad','#246b58'];$('pixel-position').textContent=`i = ${y+1}, j = ${x+1}`;const ctx=$('pixel-patch').getContext('2d');ctx.clearRect(0,0,180,180);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=Math.max(0,Math.min(i.width-1,x+dx)),yy=Math.max(0,Math.min(i.height-1,y+dy));ctx.fillStyle=`rgb(${[0,1,2].map(c=>at(xx,yy,c)*255).join(',')})`;ctx.fillRect((dx+1)*60,(dy+1)*60,60,60);}[[1,1],[1,2],[2,1]].forEach(([a,b],n)=>{ctx.strokeStyle=colors[n];ctx.lineWidth=4;ctx.strokeRect(a*60+2,b*60+2,56,56);});let total=0;$('pixel-values').replaceChildren();for(let c=0;c<(i.mode==='gray'?1:3);c++){const v=at(x,y,c),down=at(x,y+1,c),right=at(x+1,y,c);total+=(down-v)**2+(right-v)**2;const row=document.createElement('tr');for(const value of [i.mode==='gray'?'Gray':['R','G','B'][c],v,down,right,down-v,right-v]){const td=document.createElement('td');td.textContent=typeof value==='number'?value.toFixed(4):value;row.append(td);}$('pixel-values').append(row);}$('local-tv').textContent=`‖(dᵥ, dₕ)‖₂ = ${Math.sqrt(total).toFixed(6)}`;}
function chart(){const i=current(),frames=i?.frames||[],svg=$('chart');svg.replaceChildren();svg.setAttribute('viewBox','0 0 900 158');if(!frames.length)return;const values=frames.flatMap(f=>[f.tv,f.lower_bound]),low=Math.min(...values),high=Math.max(...values),range=high-low||1,maxk=Math.max(1,frames.at(-1).iteration),sx=k=>55+820*k/maxk,sy=v=>127-105*(v-low)/range;const el=(tag,attrs,text)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [a,v]of Object.entries(attrs))n.setAttribute(a,v);if(text)n.textContent=text;svg.append(n);return n;};for(let n=0;n<3;n++){const v=low+range*n/2,y=sy(v);el('line',{x1:55,x2:875,y1:y,y2:y,stroke:'#e5e9e5'});el('text',{x:48,y:y+4,'text-anchor':'end',fill:'#77827c','font-size':11},v.toFixed(1));}for(const [key,color]of [['tv','#246b58'],['lower_bound','#d77740']])el('polyline',{points:frames.map(f=>`${sx(f.iteration)},${sy(f[key])}`).join(' '),fill:'none',stroke:color,'stroke-width':2});const f=frames[i.frame];el('line',{x1:sx(f.iteration),x2:sx(f.iteration),y1:18,y2:130,stroke:'#79847d','stroke-dasharray':'3 4'});el('text',{x:55,y:149,fill:'#77827c','font-size':11},'0');el('text',{x:875,y:149,'text-anchor':'end',fill:'#77827c','font-size':11},`${maxk} iterations`);}
function acceptPacket(i,p){for(const f of p.frames||[])if(f.index===i.frames.length)i.frames.push(f);i.status=p.status;if(i.follow)i.frame=Math.max(0,i.frames.length-1);if(p.error)notice(p.error);if(current()===i){renderControls();renderFrame();chart();}}
function connect(i,retry=0){if(window.TVBrowser){const id=i.job;i.socket=window.TVBrowser.subscribe(id,p=>{if(i.job===id)acceptPacket(i,p);});return;}const job=i.job,ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/api/jobs/${job}/stream?after=${i.frames.length-1}`);i.socket=ws;ws.onmessage=e=>{if(i.job===job)acceptPacket(i,JSON.parse(e.data));};ws.onclose=()=>{if(i.job===job&&active(i)){if(retry<3)setTimeout(()=>connect(i,retry+1),500);else{i.status='error';notice('Connection lost. Save the received iterates or start again.');post(`/api/jobs/${job}/control`,{action:'cancel'}).catch(()=>{});renderControls();}}};}
async function start(paused=false){const i=current();if(!i)return;const data=await post('/api/jobs',{image:i.original,mask:maskURL(i),mode:i.mode,iterations:i.iterations,paused});invalidate(i);i.job=data.id;i.status='queued';i.follow=true;connect(i);render();if(paused)await post(`/api/jobs/${i.job}/control`,{action:'step'});}
async function control(action){const i=current();if(i?.job)await post(`/api/jobs/${i.job}/control`,{action});}
$('run').onclick=guarded(()=>start());$('pause').onclick=guarded(()=>control(current()?.status==='paused'?'resume':'pause'));$('stop').onclick=guarded(()=>control('cancel'));$('step').onclick=guarded(()=>active(current())?control('step'):start(true));
for(const name of ['brush','erase'])$(name+'-tool').onclick=()=>{tool=name;for(const n of ['brush','erase'])$(n+'-tool').setAttribute('aria-pressed',String(n===name));};
$('brush-size').oninput=()=>{$('brush-value').textContent=$('brush-size').value+' px';};

function applyPreset(kind){
  const i=current();if(!i||active(i))return;
  const percent=$('random-percent').valueAsNumber, text=$('watermark-text').value.trim();
  if(kind==='random'&&(!Number.isInteger(percent)||percent<0||percent>99)){notice('Enter a whole-number percentage from 0 to 99.');$('random-percent').focus();return;}
  if(kind==='text'&&(!text||text.length>120||text.split(/\n/).length>3)){notice('Enter 1–3 lines of text, up to 120 characters.');$('watermark-text').focus();return;}
  $('notice').hidden=true;
  i.undo.push(maskPixels(i));if(i.undo.length>12)i.undo.shift();
  const ctx=i.mask.getContext('2d'),w=i.width,h=i.height;
  ctx.save();ctx.globalCompositeOperation='source-over';ctx.clearRect(0,0,w,h);ctx.fillStyle='white';ctx.strokeStyle='white';
  if(kind==='random'){
    // Fixed seed: reapplying the preset gives the same spatial mask.
    let seed=1;const p=ctx.createImageData(w,h);
    for(let n=0;n<w*h;n++){seed=(Math.imul(1664525,seed)+1013904223)>>>0;if(seed/4294967296<percent/100){p.data.set([255,255,255,255],4*n);}}
    ctx.putImageData(p,0,0);
  }else if(kind==='text'){
    ctx.textAlign='center';ctx.textBaseline='middle';
    const lines=text.split(/\n/);
    let size=Math.min(w*.065,h*.14);ctx.font=`${size}px sans-serif`;
    const scale=Math.min(1,w*.86/Math.max(...lines.map(t=>ctx.measureText(t).width)));
    ctx.font=`${size*scale}px sans-serif`;
    lines.forEach((t,n)=>ctx.fillText(t,w/2,h*(.5+(n-(lines.length-1)/2)*.20)));
  }else{
    ctx.lineWidth=Math.max(1,Math.round(w/256));ctx.lineCap='round';
    for(const [x1,y1,x2,y2] of [[.12,.26,.85,.61],[.16,.69,.81,.33],[.35,.14,.61,.83]]){
      ctx.beginPath();ctx.moveTo(w*x1,h*y1);ctx.lineTo(w*x2,h*y2);ctx.stroke();
    }
  }
  // Match the binary mask consumed by both solvers; keep the unconstrained corner known.
  const p=ctx.getImageData(0,0,w,h);let count=0;
  for(let n=0;n<w*h;n++){const a=p.data[n*4+3]>127?255:0;p.data.set([255,255,255,a],n*4);if(a)count++;}
  if(!count&&kind!=='random')p.data.set([255,255,255,255],4*(Math.floor(h/2)*w+Math.floor(w/2)));
  p.data[4*(w*h-1)+3]=0;ctx.putImageData(p,0,0);ctx.restore();
  invalidate(i);render();
}
for(const kind of ['random','text','scratches'])$('preset-'+kind).onclick=()=>applyPreset(kind);

$('undo').onclick=()=>{const i=current();if(i?.undo.length){i.mask.getContext('2d').putImageData(i.undo.pop(),0,0);invalidate(i);render();}};
$('clear-mask').onclick=()=>{const i=current();if(i){i.undo.push(maskPixels(i));i.mask.getContext('2d').clearRect(0,0,i.width,i.height);invalidate(i);render();}};
for(const key of ['mode','iterations'])$(key).onchange=()=>{const i=current();if(i){i[key]=key==='iterations'?+$(key).value:$(key).value;invalidate(i);render();}};
$('remove-image').onclick=guarded(async()=>{const i=current();if(!i)return;if(active(i))await control('cancel');i.job=null;i.socket?.close();items.splice(items.indexOf(i),1);selected=items[0]?.id;render();});
$('upload-button').onclick=()=>$('file-input').click();$('file-input').onchange=guarded(async e=>{for(const file of e.target.files){if(file.size>20*1024*1024){notice(`${file.name} exceeds 20 MB.`);continue;}const form=new FormData();form.append('file',file);form.append('max_side',$('resolution').value);await addImage(await api('/api/prepare',{method:'POST',body:form}));}e.target.value='';});
let loadingExample=false;
async function chooseExample(name){
  if(loadingExample)return;
  const key=name+':'+$('resolution').value, existing=items.find(i=>i.exampleKey===key);
  stopPlayback();
  if(existing){selected=existing.id;render();return;}
  loadingExample=true;
  const buttons=[...document.querySelectorAll('[data-example]')];buttons.forEach(b=>b.disabled=true);
  try{const i=await addImage(await api('/api/example?max_side='+$('resolution').value+'&name='+name));i.exampleKey=key;render();}
  finally{loadingExample=false;buttons.forEach(b=>b.disabled=false);}
}
for(const b of document.querySelectorAll('[data-example]'))b.onclick=guarded(()=>chooseExample(b.dataset.example));
function selectFrame(n){const i=current();if(!i)return;i.follow=false;i.frame=n;renderControls();renderFrame();chart();}
$('timeline').oninput=()=>{stopPlayback();selectFrame(+$('timeline').value);};$('latest').onclick=()=>{const i=current();if(i){i.follow=true;i.frame=i.frames.length-1;renderControls();renderFrame();chart();}};
$('playback').onclick=()=>{if(playback){stopPlayback();return;}const i=current();if(!i?.frames.length)return;if(i.frame===i.frames.length-1)i.frame=0;$('playback').textContent='Pause replay';playback=setInterval(()=>{if(i.frame>=i.frames.length-1){stopPlayback();return;}selectFrame(i.frame+1);},180);};
function download(content,name,type){const a=document.createElement('a'),url=typeof content==='string'&&content.startsWith('data:')?content:URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;a.click();if(url.startsWith('blob:'))setTimeout(()=>URL.revokeObjectURL(url),3000);}
$('download-result').onclick=()=>{const i=current(),f=i?.frames[i.frame];if(f)download(f.image,`tv-result-k${f.iteration}.png`);};
$('download-csv').onclick=()=>{const i=current();if(!i?.frames.length)return;const cols=['iteration','tv','lower_bound','relative_gap','missing_mse','known_error'];download(cols.join(',')+'\n'+i.frames.map(f=>cols.map(k=>f[k]).join(',')).join('\n'),'tv-metrics.csv','text/csv');};
$('save-project').onclick=()=>{const data={schema_version:1,app_version:'1.5.0',created:new Date().toISOString(),images:items.map(i=>({name:i.name,image:i.original,mask:maskURL(i),mode:i.mode,iterations:i.iterations,frames:i.frames,frame:i.frame}))};download(JSON.stringify(data),'experiment.tvlab.json','application/json');notice('Experiment exported.');};
$('import-project').onclick=()=>$('project-input').click();
$('project-input').onchange=guarded(async e=>{const file=e.target.files[0];if(!file)return;if(file.size>64*1024*1024)throw Error('Experiment exceeds 64 MB.');const data=JSON.parse(await file.text());if(data.schema_version!==1||!Array.isArray(data.images)||!data.images.length||data.images.length>8)throw Error('Unsupported experiment file.');if(items.length+data.images.length>8)throw Error('Maximum 8 images. Save and remove some images before importing.');const prepared=[];for(const obj of data.images){const valid=s=>typeof s==='string'&&s.startsWith('data:image/png;base64,')&&s.length<=4000000;if(!valid(obj.image)||!valid(obj.mask)||!['rgb','gray'].includes(obj.mode)||![200,1000,4000].includes(obj.iterations)||!Array.isArray(obj.frames)||obj.frames.length>500)throw Error('Invalid experiment data.');const im=await loadImage(obj.image),mask=await loadImage(obj.mask);if(Math.min(im.width,im.height)<8||Math.max(im.width,im.height)>512||im.width!==mask.width||im.height!==mask.height)throw Error('Invalid image dimensions.');for(const f of obj.frames){if(!valid(f.image)||!['iteration','tv','lower_bound','relative_gap','missing_mse','known_error'].every(k=>typeof f[k]==='number'&&Number.isFinite(f[k])))throw Error('Invalid iterate data.');const fi=await loadImage(f.image);if(fi.width!==im.width||fi.height!==im.height)throw Error('Iterate dimensions do not match.');}prepared.push({obj,mask});}for(const {obj,mask} of prepared){const i=await addImage(obj);i.mode=obj.mode;i.iterations=obj.iterations;const p=pixels(mask);for(let n=0;n<p.data.length;n+=4){const a=p.data[n]>127?255:0;p.data[n]=p.data[n+1]=p.data[n+2]=255;p.data[n+3]=a;}i.mask.getContext('2d').putImageData(p,0,0);i.frames=obj.frames;i.frame=Math.max(0,Math.min(i.frames.length-1,Number.isInteger(obj.frame)?obj.frame:0));i.status=i.frames.length?'restored':'idle';}render();e.target.value='';notice('Experiment restored.');});
window.addEventListener('beforeunload',e=>{if(items.some(i=>i.frames.length||i.undo.length)){e.preventDefault();e.returnValue='';}});
guarded(()=>chooseExample('chelsea'))();
