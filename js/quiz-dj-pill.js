/* LIVE (Danny 12:39 AWST 24 Oct; was the questionnaire-held preview): Dad's DJ in the pinned header (Danny 24 Oct 2026 11:06 AWST).
   EDIT BUTTON (Danny 14:12 AWST 27 Oct, Claude chat: 'I don't like that I have to drag. Maybe I should just have it on and off button and then
   edit button next to it'; replaces onoff1's drag-left / double-click, which he avoids on touch):
   - the music-note button (#dj-pill) = Ed's DJ on or off, one tap / click / Enter / Space, at once. It presses the engine's own switch (#dj-play,
     hidden in the pop-up), so start, stop, 'tap to resume' after a reload and the sound-switch master behave exactly as the panel switch did.
     A tap before the engine has landed still counts: the AudioContext is made inside that touch and the switch is pressed once the engine is there.
   - the faders button beside it (#dj-edit) = Ed's desk open / closed: a page in the main content area (js/dj-desk.js, fetched on the
     first tap; Danny 18:21 AWST 27 Oct: 'Remember I want the panel to open as a page on the main content window'). The old pop-up stays
     hidden in the page only as the engine's switch (#dj-play) and readout.
   The pop-up still closes on the X, Esc, or a tap/click outside; closing only hides it, so music keeps playing. The small mix and MIDI-export
   buttons (js/dad-autodj-quiz.js) do not close it. The DJ booth tile (js/home-windows.js) opens it through DadDJPanel.open(). */
(function(){
  var pill=document.getElementById('dj-pill'),pop=document.getElementById('qh-djpop');if(!pill||!pop)return;
  var x=pop.querySelector('.djp-x'),play=document.getElementById('dj-play'),edit=document.getElementById('dj-edit');
  var PHI=(1+Math.sqrt(5))/2,MS=1e3;                                               // unit: ms per s
  // ---- the desk (fetched once, on the first open) ----
  var DESK='js/dj-desk.js?v=load1',dq=0,dw=[];
  function desk(cb){if(window.DjDesk){cb(window.DjDesk);return;}dw.push(cb);if(dq)return;dq=1;var s=document.createElement('script');s.src=DESK;s.async=true;
    s.onload=function(){var D=window.DjDesk;dw.splice(0).forEach(function(f){if(D)f(D);});};s.onerror=function(){dq=0;dw.length=0;};document.head.appendChild(s);}
  function isOpen(){return !!(window.DjDesk&&window.DjDesk.isOpen);}
  function open(){desk(function(D){D.open();});}
  function close(refocus){if(window.DjDesk)window.DjDesk.close(refocus);}
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
  pill.addEventListener('click',toggle);
  if(edit)edit.addEventListener('click',function(e){e.stopPropagation();flip();});
  if(x)x.addEventListener('click',function(){pop.hidden=true;});
  window.DadDJPanel={open:open,close:function(){close(false);},toggle:flip,get isOpen(){return isOpen();}};
  // the button mirrors the DJ play state, so you can see the music is on while the pop-up is closed
  // continuity (Danny 13:47 AWST 26 Oct): before the DJ engine has loaded (tier 2), a DJ that was on is shown on at once, waiting for a tap
  function early(){var R=window.RhythmContinuity,st=R&&R.peek('dj');return !window.DadAutoDJ&&!!(st&&st.on);}
  function sync(){var wait=early()||!!(play&&play.classList.contains('is-resuming')),on=!wait&&!!(play&&play.getAttribute('aria-pressed')==='true');   // djbtnfix: lit only when sound is heard, like the switch (soundfix3); waiting = the slow breathe
    pill.classList.toggle('is-playing',on);pill.classList.toggle('is-resuming',wait);pill.setAttribute('aria-pressed',on?'true':'false');
    pill.setAttribute('aria-label',wait?'Ed\'s DJ (waiting: tap to resume the sound)':on?'Ed\'s DJ (on: tap to turn off)':'Ed\'s DJ (off: tap to turn on)');}
  if(play)new MutationObserver(sync).observe(play,{attributes:true,attributeFilter:['aria-pressed','class']});sync();
  // music button (Danny 15:27 AWST 26 Oct): the glow keeps the DJ's beat (css/dj-buttons.css --djb-beat; drift = beat x PHI^4, as Bonnie's music-glow.js).
  // Re-read only at a drift-cycle boundary (the glow layer's own cycle, ::before), so the pulse never jumps mid-swell.
  function beat(){try{var t=window.DadAutoDJ&&DadAutoDJ.track;if(t&&t.bpm>0)document.documentElement.style.setProperty('--djb-beat',(60/t.bpm)+'s');}catch(e){}}   // unit: s per min
  pill.addEventListener('animationiteration',function(e){if(e.animationName==='djb-fade'&&e.pseudoElement==='::before')beat();});
  if(play)new MutationObserver(beat).observe(play,{attributes:true,attributeFilter:['aria-pressed']});
})();
