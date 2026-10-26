/* LIVE (Danny 12:39 AWST 24 Oct; was the questionnaire-held preview): Dad's DJ pill (Danny 24 Oct 2026 11:06 AWST). Toggles the Dad's DJ pop-up under the pinned header.
   Opens/closes on the pill; closes on the X, Esc, or a tap/click outside. Closing only hides the panel, so music keeps playing.
   Pill label 'DJ' (Danny 14:10 AWST 26 Oct); the small mix and MIDI-export buttons beside it (js/dad-autodj-quiz.js) do not close the pop-up.
   aria-expanded on the pill; focus moves into the panel on open and back to the pill on close (X / Esc). */
(function(){
  var pill=document.getElementById('dj-pill'),pop=document.getElementById('qh-djpop');if(!pill||!pop)return;
  var x=pop.querySelector('.djp-x'),play=document.getElementById('dj-play');
  function isOpen(){return !pop.hidden;}
  function open(){pop.hidden=false;pill.setAttribute('aria-expanded','true');if(play&&!play.disabled)play.focus({preventScroll:true});else if(x)x.focus({preventScroll:true});}
  function close(refocus){if(!isOpen())return;pop.hidden=true;pill.setAttribute('aria-expanded','false');if(refocus)pill.focus({preventScroll:true});}
  pill.addEventListener('click',function(){isOpen()?close(false):open();});
  if(x)x.addEventListener('click',function(){close(true);});
  document.addEventListener('keydown',function(e){if((e.key==='Escape'||e.key==='Esc')&&isOpen()){e.preventDefault();close(pop.contains(document.activeElement)||document.activeElement===pill);}});
  document.addEventListener('pointerdown',function(e){if(!isOpen())return;var t=e.target,panel=pop.querySelector('.dad-dj');
    var mx=document.getElementById('dj-mix'),xp=document.getElementById('dj-exp');if(pill.contains(t)||(mx&&mx.contains(t))||(xp&&xp.contains(t))||(panel&&panel.contains(t)))return;close(false);},true);
  // the pill's little light mirrors the DJ play state, so you can see the music is on while the pop-up is closed
  // continuity (Danny 13:47 AWST 26 Oct): before the DJ engine has loaded (tier 2), a DJ that was on is shown on at once, waiting for a tap
  function early(){var R=window.RhythmContinuity,st=R&&R.peek('dj');return !window.DadAutoDJ&&!!(st&&st.on);}
  function sync(){var wait=early()||!!(play&&play.classList.contains('is-resuming')),on=wait||!!(play&&play.getAttribute('aria-pressed')==='true');
    pill.classList.toggle('is-playing',on);pill.classList.toggle('is-resuming',wait);
    pill.setAttribute('aria-label',wait?'DJ (on, tap anywhere to resume the sound)':on?'DJ (music on)':'DJ');}
  if(play)new MutationObserver(sync).observe(play,{attributes:true,attributeFilter:['aria-pressed','class']});sync();
})();
