/* Переход между страницами: песок сметается справа налево.
   Подключается на каждой странице: <script src="sand.js" defer></script> */
(()=>{
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const root=document.documentElement;
  const rnd=(a,b)=>a+Math.random()*(b-a);
  const cols=['#e6c273','#c99b49','#f4dc98','#a8782c'];
  let busy=false;

  function sprite(n,stops){
    const o=document.createElement('canvas');o.width=o.height=n;
    const g=o.getContext('2d'),r=n/2,gr=g.createRadialGradient(r,r,0,r,r,r);
    stops.forEach(s=>gr.addColorStop(s[0],s[1]));g.fillStyle=gr;g.fillRect(0,0,n,n);return o;
  }
  const brush=sprite(128,[[0,'rgba(0,0,0,1)'],[.5,'rgba(0,0,0,.7)'],[1,'rgba(0,0,0,0)']]);
  const puffS=sprite(128,[[0,'rgba(230,190,105,.9)'],[.5,'rgba(210,160,70,.4)'],[1,'rgba(190,140,55,0)']]);

  // текстура песка
  function texture(w,h){
    const c=document.createElement('canvas');c.width=w;c.height=h;
    const g=c.getContext('2d');
    const gr=g.createRadialGradient(w/2,h*.45,0,w/2,h*.45,Math.hypot(w,h)*.6);
    gr.addColorStop(0,'#a97d36');gr.addColorStop(.6,'#7d5a24');gr.addColorStop(1,'#3b280e');
    g.fillStyle=gr;g.fillRect(0,0,w,h);
    for(let i=0;i<46;i++){
      const y0=rnd(-20,h+20),amp=rnd(6,26),f=rnd(.002,.006),ph=rnd(0,6.28);
      g.beginPath();
      for(let X=0;X<=w;X+=14){
        const Y=y0+Math.sin(X*f+ph)*amp+Math.sin(X*f*2.3+ph*1.7)*amp*.35;
        X?g.lineTo(X,Y):g.moveTo(X,Y);
      }
      g.lineWidth=rnd(1.5,5);g.strokeStyle='rgba(255,226,150,'+rnd(.05,.12)+')';g.stroke();
      g.save();g.translate(0,3.5);g.strokeStyle='rgba(40,24,6,'+rnd(.08,.16)+')';g.stroke();g.restore();
    }
    const t=document.createElement('canvas');t.width=t.height=192;
    const tg=t.getContext('2d'),id=tg.createImageData(192,192);
    for(let i=0;i<id.data.length;i+=4){
      const light=Math.random()<.5;
      id.data[i]=light?255:30;id.data[i+1]=light?232:18;id.data[i+2]=light?170:4;
      id.data[i+3]=Math.random()*(light?55:75);
    }
    tg.putImageData(id,0,0);
    g.fillStyle=g.createPattern(t,'repeat');g.fillRect(0,0,w,h);
    for(let i=0;i<7000;i++){
      g.fillStyle=Math.random()<.6?'rgba(255,232,170,'+rnd(.2,.55)+')':'rgba(30,18,4,'+rnd(.2,.5)+')';
      g.fillRect(rnd(0,w),rnd(0,h),rnd(1,2.2),rnd(1,2.2));
    }
    return c;
  }

  function layer(id,z){
    const c=document.createElement('canvas');c.id=id;
    c.width=innerWidth;c.height=innerHeight;
    c.style.cssText='position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:'+z;
    root.appendChild(c);return c;
  }
  const grain=(x,y)=>({k:0,x,y,vx:-rnd(3,10),vy:rnd(-1.2,1.2),s:rnd(1,3.4),l:0,m:rnd(30,75),c:cols[Math.random()*4|0],a:.95});
  const puff=(x,y)=>({k:1,x,y,vx:-rnd(1,3),vy:rnd(-.5,.5),r:rnd(40,80),l:0,m:rnd(50,80)});
  function step(fg,ps,w,h){
    fg.clearRect(0,0,w,h);
    if(ps.length>1500)ps.splice(0,ps.length-1500);
    for(let i=ps.length-1;i>=0;i--){
      const p=ps[i];p.l++;const t=p.l/p.m;
      if(t>=1){ps[i]=ps[ps.length-1];ps.pop();continue}
      p.x+=p.vx;p.y+=p.vy;p.vx*=.985;
      if(p.k===1){
        const r=p.r*(1+t);fg.globalAlpha=(1-t)*.2;
        fg.drawImage(puffS,p.x-r,p.y-r,r*2,r*2);
      }else{
        p.vy+=.02;fg.globalAlpha=(1-t)*p.a;fg.fillStyle=p.c;fg.fillRect(p.x,p.y,p.s,p.s);
      }
    }
    fg.globalAlpha=1;
  }
  const front=(cw,sz,e)=>cw+sz-(cw+2*sz)*e;
  const wob=(y,now)=>Math.sin(y*.012+now*.004)*45+Math.sin(y*.031-now*.003)*22;

  // ---- приход на страницу: песок сметается справа налево ----
  function reveal(){
    const cw=innerWidth,ch=innerHeight,sz=110,T=1500;
    const cover=layer('sandCover',2147483000),fxc=layer('sandFx',2147483001);
    const cx=cover.getContext('2d'),fg=fxc.getContext('2d');
    cx.drawImage(texture(cw,ch),0,0);
    root.classList.remove('sandin');
    window.__sandRevealing=true;
    root.style.overflow='hidden';
    const ps=[];let t0=0;
    function frame(now){
      if(!t0)t0=now;
      const u=Math.min(1,(now-t0)/T),e=u<.5?2*u*u:1-Math.pow(-2*u+2,2)/2;
      const fp=front(cw,sz,e),N=Math.ceil(ch/28)+1;
      cx.globalCompositeOperation='destination-out';
      for(let i=0;i<N;i++){
        const y=i*ch/(N-1),xx=fp+wob(y,now);
        cx.drawImage(brush,xx-sz,y-sz,sz*2,sz*2);
        if(u<1&&xx>-20&&xx<cw+20){
          if(Math.random()<.45)ps.push(grain(xx,y));
          if(Math.random()<.025)ps.push(puff(xx,y));
        }
      }
      cx.globalCompositeOperation='source-over';
      if(u>=1)cx.clearRect(0,0,cw,ch);
      step(fg,ps,cw,ch);
      if(u>=1&&ps.length<6){
        cover.remove();fxc.remove();root.style.overflow='';
        window.__sandRevealing=false;window.dispatchEvent(new Event('sandrevealed'));return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ---- уход со страницы: песок наносит справа налево и закрывает экран ----
  function leave(url){
    if(busy)return;busy=true;
    const cw=innerWidth,ch=innerHeight,sz=110,T=1100;
    const cover=layer('sandCover',2147483000),fxc=layer('sandFx',2147483001);
    const cx=cover.getContext('2d'),fg=fxc.getContext('2d');
    const tex=texture(cw,ch);
    const mk=document.createElement('canvas');mk.width=cw;mk.height=ch;
    const mg=mk.getContext('2d');
    root.style.overflow='hidden';
    const ps=[];let t0=0;
    function frame(now){
      if(!t0)t0=now;
      const u=Math.min(1,(now-t0)/T),e=u*u*(3-2*u);
      const fp=front(cw,sz,e),N=Math.ceil(ch/28)+1;
      for(let i=0;i<N;i++){
        const y=i*ch/(N-1),xx=fp+wob(y,now);
        mg.drawImage(brush,xx-sz,y-sz,sz*2,sz*2);
        if(u<1&&xx>-20&&xx<cw+20){
          if(Math.random()<.45)ps.push(grain(xx-rnd(0,60),y));
          if(Math.random()<.02)ps.push(puff(xx-rnd(0,40),y));
        }
      }
      cx.clearRect(0,0,cw,ch);
      cx.drawImage(tex,0,0);
      if(u<1){cx.globalCompositeOperation='destination-in';cx.drawImage(mk,0,0);cx.globalCompositeOperation='source-over'}
      step(fg,ps,cw,ch);
      if(u>=1){
        try{sessionStorage.setItem('sandIn','1')}catch(e){}
        location.href=url;return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  const norm=p=>p.replace(/index\.html$/,'').replace(/\/$/,'');
  document.addEventListener('click',e=>{
    if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    const a=e.target.closest&&e.target.closest('a[href]');
    if(!a||a.target||a.hasAttribute('download'))return;
    const u=new URL(a.href,location.href);
    if(u.origin!==location.origin||norm(u.pathname)===norm(location.pathname))return;
    e.preventDefault();leave(u.href);
  });

  // возврат кнопкой «назад»: убрать застрявший песок
  addEventListener('pageshow',e=>{
    if(e.persisted){
      document.querySelectorAll('#sandCover,#sandFx').forEach(n=>n.remove());
      root.style.overflow='';busy=false;
    }
  });

  if(root.classList.contains('sandin'))reveal();
})();


/* ---- заголовки страниц: заголовок виден сразу, золотой контур обводит буквы и гаснет, потом блик ---- */
(()=>{
  const root=document.documentElement;
  const h1s=[...document.querySelectorAll('.page-head h1')];
  if(!h1s.length)return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const NS='http://www.w3.org/2000/svg';
  const st=document.createElement('style');
  st.textContent=`
.page-head h1.sv{line-height:0}
.page-head h1 svg.hs{display:block;margin:0 auto;max-width:100%;height:auto;overflow:visible}
.page-head h1 svg.hs text{font-family:"Onest","Segoe UI",system-ui,-apple-system,Arial,sans-serif;font-size:100px;font-weight:800;letter-spacing:-1.5px;stroke:#ffd65a;stroke-width:2;stroke-linejoin:round;stroke-dasharray:800;stroke-dashoffset:800;stroke-opacity:1}
.page-head h1.go svg.hs text{animation:hstrace 1.5s ease-out forwards,hsfade .8s ease 1.5s forwards}
.page-head h1.go svg.hs{animation:hsglow 3.2s ease both}
@keyframes hstrace{to{stroke-dashoffset:0}}
@keyframes hsfade{to{stroke-opacity:0}}
@keyframes hsglow{0%{filter:drop-shadow(0 0 0 rgba(255,205,70,0))}45%{filter:drop-shadow(0 0 12px rgba(255,205,70,.9))}100%{filter:drop-shadow(0 0 7px rgba(255,200,60,.4))}}`;
  document.head.appendChild(st);

  function make(h1,idx){
    const txt=(h1.textContent||'').trim().toUpperCase();
    let svg,tx,vbW=1,started=false,built=false;
    function layout(){
      tx.setAttribute('x','0');tx.setAttribute('y','0');
      const bb=tx.getBBox(),pad=14;
      vbW=bb.width+pad*2;
      svg.setAttribute('viewBox','0 0 '+vbW+' '+(bb.height+pad*2));
      tx.setAttribute('x',pad-bb.x);tx.setAttribute('y',pad-bb.y);
      const a=svg.querySelector('#hsAnim'+idx);if(a)a.setAttribute('to',String(vbW+80));
      size();
    }
    function size(){
      if(!svg)return;
      const fs=parseFloat(getComputedStyle(h1).fontSize)||60;
      svg.style.width=(vbW*fs/100)+'px';
    }
    function build(){
      if(built)return;built=true;
      svg=document.createElementNS(NS,'svg');
      svg.setAttribute('class','hs');svg.setAttribute('aria-hidden','true');
      svg.setAttribute('viewBox','0 0 2400 200');
      svg.innerHTML='<defs><linearGradient id="hsShine'+idx+'" gradientUnits="userSpaceOnUse" gradientTransform="translate(-420 0)" x1="0" y1="0" x2="320" y2="0">'
        +'<stop offset="0" stop-color="#f3efe9"/><stop offset=".38" stop-color="#f3efe9"/>'
        +'<stop offset=".5" stop-color="#fff4b8"/><stop offset=".57" stop-color="#ffd447"/>'
        +'<stop offset=".7" stop-color="#f3efe9"/><stop offset="1" stop-color="#f3efe9"/>'
        +'<animateTransform id="hsAnim'+idx+'" attributeName="gradientTransform" type="translate" from="-420 0" to="1000 0" dur="1.9s" begin="indefinite" fill="freeze"/>'
        +'</linearGradient></defs>';
      tx=document.createElementNS(NS,'text');
      tx.textContent=txt;tx.style.fill='url(#hsShine'+idx+')';
      svg.appendChild(tx);
      h1.setAttribute('aria-label',h1.textContent.trim());
      h1.textContent='';h1.classList.add('sv');h1.appendChild(svg);
      layout();
    }
    const shine=()=>{try{svg.querySelector('#hsAnim'+idx).beginElement()}catch(e){}};
    function start(){
      if(started||!built)return;started=true;
      h1.classList.add('go');
      setTimeout(shine,1300);setInterval(shine,11000);
    }
    function begin(){
      if(idx>0){
        // следующие заголовки запускаются, когда до них долистали
        if('IntersectionObserver' in window){
          const io=new IntersectionObserver(es=>{if(es[0].isIntersecting){io.disconnect();start()}},{threshold:.6});
          io.observe(h1);
        }else start();
      }else if(window.__sandRevealing){
        addEventListener('sandrevealed',start,{once:true});
        setTimeout(start,4800);
      }else setTimeout(start,100);
    }
    return {build,begin,layout:()=>{if(built)layout()},size};
  }
  const insts=h1s.map(make);
  addEventListener('resize',()=>insts.forEach(i=>i.size()));
  const fontOk=()=>!document.fonts||!document.fonts.check||document.fonts.check('800 100px Onest','АБВ');
  const run=()=>insts.forEach(i=>{i.build();i.begin()});
  // пока шрифт грузится, остаётся обычный заголовок: он виден сразу и ничем не скрыт
  if(fontOk())run();
  else{
    let done=false;
    const go=()=>{if(done)return;done=true;run()};
    document.fonts.load('800 100px Onest','АБВ').then(go,go);
    setTimeout(go,1200);
  }
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>insts.forEach(i=>i.layout()));
})();

/* ---- свой курсор: золотая точка и песчаный ореол, при наведении на ссылки расширяется ---- */
(()=>{
  const root=document.documentElement;
  const st=document.createElement('style');
  st.textContent=`
html.cc,html.cc *{cursor:none!important}
#cur{position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;filter:hue-rotate(var(--hue,0deg))}
#cur i{position:absolute;left:0;top:0;border-radius:50%;pointer-events:none;will-change:transform}
#cur .dot{width:8px;height:8px;margin:-4px 0 0 -4px;background:#ffd45a;box-shadow:0 0 10px 2px rgba(255,205,70,.85);transition:width .25s,height .25s,margin .25s,opacity .25s}
#cur .ring{width:38px;height:38px;margin:-19px 0 0 -19px;border:1px solid rgba(242,194,48,.6);background:radial-gradient(circle,rgba(242,194,48,.12),rgba(242,194,48,0) 70%);transition:width .3s,height .3s,margin .3s,border-color .3s,background .3s,opacity .3s}
#cur.hov .ring{width:62px;height:62px;margin:-31px 0 0 -31px;border-color:rgba(255,214,90,.95);background:radial-gradient(circle,rgba(242,194,48,.28),rgba(242,194,48,.04) 70%)}
#cur.hov .dot{width:5px;height:5px;margin:-2.5px 0 0 -2.5px}
#cur.down .ring{width:26px;height:26px;margin:-13px 0 0 -13px}
#cur.hide i{opacity:0}`;
  document.head.appendChild(st);
  const cur=document.createElement('div');
  cur.id='cur';cur.className='hide';
  cur.innerHTML='<i class="ring"></i><i class="dot"></i>';
  root.appendChild(cur);
  const ring=cur.children[0],dot=cur.children[1];
  let x=-100,y=-100,seen=false;
  function place(){
    const m='translate3d('+x+'px,'+y+'px,0)';
    ring.style.transform=m;dot.style.transform=m;
  }
  addEventListener('pointermove',e=>{
    if(e.pointerType==='touch')return;
    x=e.clientX;y=e.clientY;
    if(!seen){seen=true;cur.classList.remove('hide');root.classList.add('cc')}
    place();                      // сразу, без отставания
    const t=e.target;
    cur.classList.toggle('hov',!!(t&&t.closest&&t.closest('a,button,[role=button],#intro')));
  },{passive:true});
  addEventListener('mousedown',()=>cur.classList.add('down'));
  addEventListener('mouseup',()=>cur.classList.remove('down'));
  document.addEventListener('mouseleave',()=>cur.classList.add('hide'));
  document.addEventListener('mouseenter',()=>{if(seen)cur.classList.remove('hide')});
})();
