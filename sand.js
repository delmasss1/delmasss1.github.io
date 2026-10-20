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
        window.dispatchEvent(new Event('sandrevealed'));return;
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
