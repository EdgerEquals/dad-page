/* LIVE (Danny 12:39 AWST 24 Oct; was the questionnaire-held preview): Dad's DJ pill (Danny 24 Oct 2026 11:06 AWST), the music-note button in the pinned header.
   ON/OFF + PANEL GESTURES (Danny 13:44 AWST 27 Oct, Claude chat: 'the button at the very top ... is supposed to be on and off button and then if I hold
   that button and drag it to the left or if I'm on a PC ... double click it ... when I let go it snapped back but the panel opens and then I don't want
   it on and off switch on that panel'):
   - tap / click / Enter / Space = Ed's DJ on or off. The button presses the engine's own switch (#dj-play, now hidden in the panel), so start, stop,
     'tap to resume' after a reload and the sound-switch master all behave exactly as the panel switch did. A tap before the engine has landed
     still counts (the AudioContext is made inside that touch and the switch is pressed as soon as the engine is there).
   - hold and drag left: the button follows the finger, lights up once it is one golden button-width (PHI x its width) out, and springs back on
     release; let go past that line and the pop-up opens (or closes, if it was open). A shorter drag is nothing at all, not a tap.
   - mouse: double-click opens / closes the pop-up; a single click waits PHI^-1 s to see if a second click is coming, then switches on / off
     (a slower double-click takes the first click's on / off back). The mouse can drag left too.
   - keyboard: Left arrow (or Down) on the button opens / closes the pop-up.
   The pop-up still closes on the X, Esc, or a tap/click outside; closing only hides it, so music keeps playing. The small mix and MIDI-export
   buttons beside it (js/dad-autodj-quiz.js) do not close it. The DJ booth tile (js/home-windows.js) opens it through DadDJPanel.open(). */
(function(){
  var pill=document.getElementById('dj-pill'),pop=document.getElementById('qh-djpop');if(!pill||!pop)return;
  var x=pop.querySelector('.djp-x'),play=document.getElementById('dj-play'),html=document.documentElement;
  var PHI=(1+Math.sqrt(5))/2,MS=1e3;                                               // unit: ms per s
  function isOpen(){return !pop.hidden;}
  function open(){pop.hidden=false;pill.setAttribute('aria-expanded','true');if(x)x.focus({preventScroll:true});}
  function close(refocus){if(!isOpen())return;pop.hidden=true;pill.setAttribute('aria-expanded','false');if(refocus)pill.focus({preventScroll:true});}
  function flip(){isOpen()?close(false):open();}
  // ---- on / off: press the engine's switch ----
  var waitT=0;
  function toggle(){
    if(window.DadAutoDJ&&play){play.click();return;}
    var R=window.RhythmContinuity,st=R&&R.peek&&R.peek('dj');if(st&&st.on)return;   // was on: the inline catcher (index.html) already made the context in this touch and the engine resumes the saved track
    if(!window.__djAC)try{var A=window.AudioContext||window.webkitAudioContext;if(A){var c=new A();if(c.resume)c.resume();window.__djAC=c;}}catch(e){}   // unlocked inside the gesture, handed to the engine (soundfix3 path)
    if(waitT)return;var t0=Date.now();
    waitT=setInterval(function(){if(window.DadAutoDJ&&play){clearInterval(waitT);waitT=0;play.click();}else if(Date.now()-t0>Math.pow(PHI,5)*MS){clearInterval(waitT);waitT=0;}},Math.pow(PHI,-4)*MS);   // phi: look every PHI^-4 s for up to PHI^5 s
  }
  // ---- drag left to open ----
  var drag=null,dragged=false,lastType='',clrT=0;
  pill.addEventListener('pointerdown',function(e){lastType=e.pointerType||'';dragged=false;if(e.button>0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,on:false,d:0};});
  pill.addEventListener('pointermove',function(e){if(!drag||e.pointerId!==drag.id)return;
    var w=pill.offsetWidth||1,dx=e.clientX-drag.x,dy=e.clientY-drag.y,line=w*PHI;
    if(!drag.on){if(-dx<w/PHI/PHI)return;if(Math.abs(dy)>-dx){drag=null;return;}   // phi: PHI^-2 of a button before it counts as a drag; more down than left = not ours
      drag.on=true;dragged=true;if(e.pointerType!=='touch')try{pill.setPointerCapture(e.pointerId);}catch(er){}clearTimeout(clrT);html.setAttribute('data-djdrag','');pill.classList.add('is-dragging');}   // a finger is already held by the button (implicit capture); capturing it again drops and re-takes it
    var d=Math.max(0,-dx);drag.d=d;pill.style.translate=-(d<=line?d:line+(d-line)/PHI/PHI)+'px 0';   // phi: past the line it pulls at PHI^-2
    pill.classList.toggle('is-armed',d>=line);});
  function end(e,cancel){if(!drag||e.pointerId!==drag.id)return;var g=drag;drag=null;if(!g.on)return;
    pill.classList.remove('is-dragging','is-armed');pill.style.translate='';                  // springs back (css/dj-buttons.css)
    if(!cancel&&g.d>=(pill.offsetWidth||1)*PHI)flip();
    clrT=setTimeout(function(){html.removeAttribute('data-djdrag');},Math.pow(PHI,-1)*MS);}   // the touch's own touchend / click land first, then the page is back to normal
  pill.addEventListener('pointerup',function(e){end(e,false);});
  pill.addEventListener('pointercancel',function(e){end(e,true);});
  // ---- tap / click / double-click ----
  var clickT=0,clickAt=0;
  pill.addEventListener('click',function(e){
    if(dragged){dragged=false;e.preventDefault();return;}                          // a drag is not a tap
    if(e.detail>=2){if(clickT){clearTimeout(clickT);clickT=0;}else if(Date.now()-clickAt<MS)toggle();flip();return;}   // double-click: the pop-up; a first click that already switched is taken back
    if(e.detail===1&&lastType==='mouse'){clickT=setTimeout(function(){clickT=0;clickAt=Date.now();toggle();},Math.pow(PHI,-1)*MS);return;}   // phi: wait PHI^-1 s for a second click
    clickAt=Date.now();toggle();                                                    // touch, pen, keyboard: at once
  });
  pill.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'||e.key==='ArrowDown'){e.preventDefault();flip();}});
  if(x)x.addEventListener('click',function(){close(true);});
  document.addEventListener('keydown',function(e){if((e.key==='Escape'||e.key==='Esc')&&isOpen()){e.preventDefault();close(pop.contains(document.activeElement)||document.activeElement===pill);}});
  document.addEventListener('pointerdown',function(e){if(!isOpen())return;var t=e.target,panel=pop.querySelector('.dad-dj');
    var mx=document.getElementById('dj-mix'),xp=document.getElementById('dj-exp');if(pill.contains(t)||(mx&&mx.contains(t))||(xp&&xp.contains(t))||(panel&&panel.contains(t)))return;close(false);},true);
  window.DadDJPanel={open:open,close:function(){close(false);},toggle:flip,get isOpen(){return isOpen();}};
  // the button mirrors the DJ play state, so you can see the music is on while the pop-up is closed
  // continuity (Danny 13:47 AWST 26 Oct): before the DJ engine has loaded (tier 2), a DJ that was on is shown on at once, waiting for a tap
  function early(){var R=window.RhythmContinuity,st=R&&R.peek('dj');return !window.DadAutoDJ&&!!(st&&st.on);}
  function sync(){var wait=early()||!!(play&&play.classList.contains('is-resuming')),on=!wait&&!!(play&&play.getAttribute('aria-pressed')==='true');   // djbtnfix: lit only when sound is heard, like the switch (soundfix3); waiting = the slow breathe
    pill.classList.toggle('is-playing',on);pill.classList.toggle('is-resuming',wait);pill.setAttribute('aria-pressed',on?'true':'false');
    pill.setAttribute('aria-label',(wait?'Ed\'s DJ (waiting: tap to resume the sound)':on?'Ed\'s DJ (on: tap to turn off)':'Ed\'s DJ (off: tap to turn on)')+'; drag left, double-click or press Left for the panel');}
  if(play)new MutationObserver(sync).observe(play,{attributes:true,attributeFilter:['aria-pressed','class']});sync();
  // music button (Danny 15:27 AWST 26 Oct): the glow keeps the DJ's beat (css/dj-buttons.css --djb-beat; drift = beat x PHI^4, as Bonnie's music-glow.js).
  // Re-read only at a drift-cycle boundary, so the pulse never jumps mid-swell.
  function beat(){try{var t=window.DadAutoDJ&&DadAutoDJ.track;if(t&&t.bpm>0)document.documentElement.style.setProperty('--djb-beat',(60/t.bpm)+'s');}catch(e){}}   // unit: s per min
  pill.addEventListener('animationiteration',function(e){if(e.animationName==='djb-drift')beat();});
  if(play)new MutationObserver(beat).observe(play,{attributes:true,attributeFilter:['aria-pressed']});
})();
