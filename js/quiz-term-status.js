/* Questionnaire terminal status pill (Danny t637u/t639u; t647u/t648u/t650u 13:32 AWST 24 Oct 2026). Display only: sends nothing.
   Pill renders a terminal line: text + block cursor, like the footer simmie$ line.
   Sequence (phi rules, base seconds, advanced at RatioPump.rate(), dial 0.75):
     cursor  : no word, cursor blinks 2x with the footer cursor (cblink PHI^0.5 = 1.272 s, same clock) -> 2.544 s
     status  : "status" green, pulses at PHI^2 = 2.618 s for 6 footer blinks, steady cursor after it -> 7.633 s
     cursor  : 2.544 s
     live    : "live" red, 7.633 s ... full cycle 16 blinks = 20.35 base s. Clock = footer cursor animation currentTime (t651u).
   html[data-term-phase]=cursor|status|live|quiet (pill); html[data-term-status]=status|live|quiet (footer simmie$ light, holds the
   last word through cursor phases) + 'termstatus:change'.
   Quiet: not actually live = navigator.onLine false OR the page's Rebella link check window.SIM_BEACON.state==='down' -> muted
   static "away", no cycling. Resumes on recovery. Reduced motion: static "status" + steady cursor.
   pilltick1 (Danny t347u 16 Nov 2026): hours:minutes on the minute (cached Intl.DateTimeFormat, setTimeout to the next minute,
   paused while hidden, resynced when visible). The phase machine waits on the footer cursor's next boundary, not a 100 ms poll. */
(function(){
  'use strict';
  var PHI=1.6180339887, B=Math.pow(PHI,0.5), P=Math.pow(PHI,2), MS=1e3;
  var SEQ=[['cursor',2*B],['status',6*B],['cursor',2*B],['live',6*B]], CYC=16*B; // t651u: every phase a whole number of footer blinks
  var root=document.documentElement, RM=window.matchMedia?matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
  function rate(){ try{ var r=window.RatioPump&&window.RatioPump.rate(); return r>0?r:1; }catch(e){ return 1; } }
  var w=document.querySelector('#tstat .ts-w'), txt, cur, tel, lat=null, telTxt='';
  if(w){ txt=document.createElement('span'); txt.className='ts-txt'; cur=document.createElement('i'); cur.className='ts-cur'; w.appendChild(txt); w.appendChild(cur);
    tel=document.createElement('span'); tel.className='ts-tel'; tel.innerHTML='<span></span>'; w.parentNode.appendChild(tel); }
  var idx=1, left=SEQ[1][1], phase=null, word='status', last=Date.now(), clockT=0, phaseT=0, nowFn=Date.now;
  var fmt=null; try{ fmt=new Intl.DateTimeFormat('en-AU',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Australia/Perth'}); }catch(e){}
  function now(){ return nowFn(); }
  function footAnim(){ var b=document.querySelector('.foot .tin .blk')||document.querySelector('.tin .blk'); if(!b||!b.getAnimations) return null;
    var l=b.getAnimations(); for(var i=0;i<l.length;i++) if(l[i].animationName==='cblink') return l[i]; return null; }
  function fdelay(){ var b=document.querySelector('.tin .blk'); return b?(parseFloat(getComputedStyle(b).animationDelay)||0):0; }
  function lock(){ var fa=footAnim(); if(!fa||!cur||!cur.getAnimations) return; var l=cur.getAnimations();
    for(var i=0;i<l.length;i++){ var a=l[i]; if(a.animationName!=='cblink') continue;
      if(a.playbackRate!==fa.playbackRate) a.playbackRate=fa.playbackRate;
      if(fa.currentTime!=null&&Math.abs((a.currentTime||0)-fa.currentTime)>5) a.currentTime=fa.currentTime; } }
  function isLive(){ if(navigator.onLine===false) return false; var b=window.SIM_BEACON; return !(b&&b.state==='down'); }
  function setVars(){ var r=rate(); root.style.setProperty('--ts-pulse',(P/r).toFixed(3)+'s'); root.style.setProperty('--ts-blink',(B/r).toFixed(3)+'s'); root.style.setProperty('--ts-xf',(Math.pow(PHI,0.25)/r).toFixed(3)+'s'); }
  function show(ph){
    if(ph===phase) return; phase=ph; root.setAttribute('data-term-phase',ph);
    if(txt){ txt.classList.remove('ts-go'); txt.textContent= ph==='status'?'status': ph==='live'?'live': ph==='quiet'?'away':''; void txt.offsetWidth; if(ph==='status'||ph==='live') txt.classList.add('ts-go'); }
    var st= ph==='cursor'?word:ph; if(ph==='status'||ph==='live') word=ph;
    try{ telemetry(); }catch(e){}
    if(root.getAttribute('data-term-status')!==st){ root.setAttribute('data-term-status',st);
      try{ document.dispatchEvent(new CustomEvent('termstatus:change',{detail:{state:st,phase:ph}})); }catch(e){} }
  }
  function armPhase(ms){ if(phaseT) clearTimeout(phaseT); phaseT=0; if(document.hidden) return; phaseT=setTimeout(function(){ phaseT=0; tick(); }, Math.max(16,ms)); }
  function tick(){
    var tNow=now(), dt=(tNow-last)/MS; last=tNow;
    if(!isLive()){ show('quiet'); if(phaseT){ clearTimeout(phaseT); phaseT=0; } return; }
    if(RM.matches){ show('status'); if(phaseT){ clearTimeout(phaseT); phaseT=0; } return; }
    if(phase==='quiet'){ idx=0; left=SEQ[0][1]; setVars(); show('cursor'); }
    lock(); var fa=footAnim();
    if(fa&&fa.currentTime!=null){ // shared clock: the footer cursor's own animation time (already pump-scaled, includes its delay)
      var t=fa.currentTime/MS-fdelay(); t=((t%CYC)+CYC)%CYC; var a=0,k;
      for(k=0;k<SEQ.length;k++){ if(t<a+SEQ[k][1]) break; a+=SEQ[k][1]; }
      if(k===SEQ.length) k=0; idx=k; show(SEQ[idx][0]);
      var rem=(a+SEQ[idx][1]-t)*MS, pr=fa.playbackRate||1; armPhase(pr>0?rem/pr:rem); return; }
    if(document.hidden||(document.body&&document.body.classList.contains('paused'))) return;
    left-=dt*rate();
    if(left<=0){ setVars(); idx=(idx+1)%SEQ.length; left=SEQ[idx][1]; }
    show(SEQ[idx][0]); armPhase(Math.min(left/rate()*MS, MS/PHI/PHI));     // phi: until the footer clock is in, retry every PHI^-2 s
  }
  // t654u telemetry: existing signals only, no new requests. Latency from the page's own Rebella check fetch (Resource Timing).
  try{ new PerformanceObserver(function(l){ l.getEntries().forEach(function(e){ if(/edgerequals\.github\.io\/rebella\/(\?|$)/.test(e.name)) { lat=Math.round(e.duration); telemetry(); } }); }).observe({type:'resource',buffered:true}); }catch(e){}
  function awst(){ try{ return (fmt?fmt.format(new Date(now())):new Date(now()).toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Australia/Perth'}))+' AWST'; }catch(e){ return ''; } }
  function telemetry(){ if(!tel) return; var b=window.SIM_BEACON, on=navigator.onLine!==false, lk=document.getElementById('vLink'), r;
    var bs=b&&b.state==='down'?'rebella down':b&&b.state==='live'?('rebella up'+(lat!=null?' '+lat+'ms':'')):'rebella checking';
    var ls='link '+(lk&&/OFF/i.test(lk.textContent)?'off':'ok');
    if(phase==='quiet') r=(b&&b.state==='down'?'link down':ls)+' \u00b7 '+(on?'online':'offline')+' :(';
    else r=bs+' \u00b7 '+ls+' \u00b7 '+(on?'online':'offline')+' \u00b7 '+awst()+' \u00b7 ';
    if(r===telTxt) return; telTxt=r; tel.firstChild.textContent= phase==='quiet'||RM.matches ? r : r+r; }
  function dueMin(){ return 6e4-(now()%6e4); }                            // unit: ms to the next minute (Perth has no DST)
  function armClock(){ if(clockT) clearTimeout(clockT); clockT=0; if(document.hidden) return; clockT=setTimeout(function(){ clockT=0; telemetry(); armClock(); }, dueMin()); }
  function vis(){ last=now(); if(document.hidden){ if(clockT){ clearTimeout(clockT); clockT=0; } if(phaseT){ clearTimeout(phaseT); phaseT=0; } return; } telemetry(); armClock(); tick(); }
  setVars(); show(isLive()?'status':'quiet'); armClock(); tick();
  document.addEventListener('ratiopump:change',function(){ setVars(); lock(); });
  document.addEventListener('visibilitychange',vis);
  window.addEventListener('online',tick); window.addEventListener('offline',tick);
  if(RM.addEventListener) RM.addEventListener('change',tick);
  if(window.LoadTiers&&LoadTiers.onRm) LoadTiers.onRm(tick);
  var be=document.getElementById('beacon');
  if(be&&window.MutationObserver) new MutationObserver(function(){ try{ telemetry(); tick(); }catch(e){} }).observe(be,{attributes:true,attributeFilter:['class']});
  var locked=0;
  function bindLock(){ var b=document.querySelector('.foot .tin .blk')||document.querySelector('.tin .blk'); if(!b||locked) return; locked=1; b.addEventListener('animationiteration',lock); }
  bindLock(); if(!locked) setTimeout(bindLock, MS/PHI/PHI);               // phi: wait PHI^-2 s for the footer cursor if it is not in yet
  window.TermStatus={ phase:function(){ return phase; }, state:function(){ return root.getAttribute('data-term-status'); }, live:isLive,
    info:function(){ var r=rate(); return {phase:phase, rate:r, seqBase:SEQ, cycleBase:2*(2*B+3*P), cycleEffective:2*(2*B+3*P)/r,
      clock:awst(), fmt:!!fmt, clockDue:clockT?dueMin():0, clockArmed:!!clockT, phaseArmed:!!phaseT, hidden:!!document.hidden}; },
    _now:function(f){ nowFn=f||Date.now; }, _telemetry:telemetry, _tick:tick, _armClock:armClock }; // tests only
})();
