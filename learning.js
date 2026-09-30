import { NOTES, CHORDS, spelledNoteName } from './music.js?v=4';
import { PROGRESSIONS, getProgression, getDiatonicChords } from './progressions.js?v=4';
import { getChordPositions } from './chord-positions.js?v=4';
import { initTabEditor } from './tab-editor.js?v=4';

/** The learning tools share the original fretboard and audio renderer. */
export function initLearning(bridge) {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const rootOptions = NOTES.map((name, i) => `<option value="${i}"${i === 7 ? ' selected' : ''}>${name}</option>`).join('');
  const chordKeys = ['major','minor','7','maj7','m7','dim','sus2','sus4'];
  const state = { page:'explore', root:7, mode:'major', progression:PROGRESSIONS.major[0].id, step:0, customStep:null, finderRoot:7, chord:'major', view:'positions', position:0, bpm:80, loop:false };
  let playing = false, transportToken = 0, timer = null, currentBeat = 0;
  let currentProgression, availablePositions = [];

  $('#progressions-panel').innerHTML = `
    <div class="learning-heading"><div><span class="eyebrow">CONNECT THE CHORDS</span><h2>From one chord <em>to the next.</em></h2><p>Choose a key. See the progression, hear it and follow along on the fretboard.</p></div><span class="section-number">02 /</span></div>
    <div class="learning-fields"><label>KEY<select id="progression-root">${rootOptions}</select></label><label>MODE<select id="progression-mode"><option value="major">Major</option><option value="minor">Minor</option></select></label><label class="wide-field">CHORD PROGRESSION<select id="progression-select"></select></label></div>
    <p class="progression-description" id="progression-description"></p>
    <div class="progression-steps" id="progression-steps" role="group" aria-label="Progression chords"></div>
    <div class="transport"><button id="progression-play" class="primary-button transport-play" aria-label="Play progression">▶ Play progression</button><label class="tempo-label" for="progression-tempo">Tempo <output id="tempo-value">80 BPM</output><input id="progression-tempo" type="range" min="40" max="180" step="5" value="80"></label><label class="loop-label"><input id="progression-loop" type="checkbox"> Loop</label><div class="beat-meter" aria-hidden="true"><i></i><i></i><i></i><i></i></div><span class="bar-duration">4 beats per chord</span></div>
    <div class="progression-explanation"><span class="small-card-icon">⌁</span><div><h3 id="progression-role"></h3><p id="progression-explanation"></p><p class="chord-construction" id="chord-construction"></p></div></div>
    <details class="degree-details"><summary>How are the 7 chords in this key built?</summary><p>Start on any scale note and take every other note to build a triad: 1–3–5. As the starting note changes, so do the chord root and quality.</p><div class="diatonic-chords" id="diatonic-chords" role="group" aria-label="Diatonic chords in this key"></div><p id="roman-help">Uppercase Roman numerals mean major, lowercase mean minor, and ° means diminished. Minor-key degrees are numbered relative to the natural minor scale.</p></details>
    <div class="position-mini"><span id="progression-position-label"></span><label>Position<select id="progression-position" aria-label="Position of the selected progression chord"></select></label></div>
    <p id="progression-status" class="sr-only" role="status" aria-live="polite"></p>`;

  $('#chords-panel').innerHTML = `
    <div class="learning-heading"><div><span class="eyebrow">FIND CHORDS ON THE FRETBOARD</span><h2>One chord, <em>many places.</em></h2><p>Get to know the notes. Explore different ways to play them.</p></div><span class="section-number">03 /</span></div>
    <div class="learning-fields finder-fields"><label>ROOT NOTE<select id="finder-root">${rootOptions}</select></label><label>CHORD TYPE<select id="finder-chord">${chordKeys.map(key=>`<option value="${key}">${CHORDS[key].name}</option>`).join('')}</select></label><div class="finder-summary"><strong id="finder-name"></strong><span id="finder-notes"></span></div></div>
    <div class="finder-view-row"><div class="segmented" role="group" aria-label="Chord map view"><button data-finder-view="positions" class="active" aria-pressed="true">Playable positions</button><button data-finder-view="all" aria-pressed="false">All note locations</button></div><span id="position-count"></span></div>
    <div id="finder-positions"><div class="position-picker" id="position-picker" role="group" aria-label="Chord positions"></div><div class="position-summary"><button class="position-arrow" id="previous-position" aria-label="Previous chord position">←</button><div><strong id="position-name"></strong><span id="position-description"></span></div><button class="position-arrow" id="next-position" aria-label="Next chord position">→</button></div><div id="fingering-table" class="fingering-table"></div><p class="fingering-help">0 = open string · × = mute · Fingers: 1 index, 2 middle, 3 ring, 4 pinky. A finger spanning multiple strings forms a barre.</p></div>
    <p id="finder-all-help" class="all-notes-help" hidden>Every colored dot is a chord tone. These dots are possible note locations, not a single fingering. Choose “Playable positions” to find a shape to play.</p>`;

  const editor = initTabEditor({...bridge, stopOthers:stop});
  $$('.page-tabs [data-page]').forEach(button => {
    button.addEventListener('click',()=>setPage(button.dataset.page));
    button.addEventListener('keydown',event=>{
      const keys=['ArrowLeft','ArrowRight','Home','End']; if(!keys.includes(event.key))return;
      event.preventDefault(); const tabs=$$('.page-tabs [data-page]'); const index=tabs.indexOf(button);
      const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
      tabs[next].focus(); setPage(tabs[next].dataset.page);
    });
  });
  $('#progression-root').addEventListener('change',event=>changeProgression({root:Number(event.target.value)}));
  $('#progression-mode').addEventListener('change',event=>changeProgression({mode:event.target.value,progression:PROGRESSIONS[event.target.value][0].id}));
  $('#progression-select').addEventListener('change',event=>changeProgression({progression:event.target.value}));
  $('#progression-position').addEventListener('change',event=>{stop();state.position=Number(event.target.value);showProgressionChord();});
  $('#progression-tempo').addEventListener('input',event=>{stop();state.bpm=Number(event.target.value);$('#tempo-value').textContent=`${state.bpm} BPM`;});
  $('#progression-loop').addEventListener('change',event=>{state.loop=event.target.checked;});
  $('#progression-play').addEventListener('click',()=>playing?stop():start());
  $('#finder-root').addEventListener('change',event=>changeFinder({finderRoot:Number(event.target.value)}));
  $('#finder-chord').addEventListener('change',event=>changeFinder({chord:event.target.value}));
  $$('[data-finder-view]').forEach(button=>button.addEventListener('click',()=>changeFinder({view:button.dataset.finderView},false)));
  $('#previous-position').addEventListener('click',()=>choosePosition((state.position-1+availablePositions.length)%availablePositions.length));
  $('#next-position').addEventListener('click',()=>choosePosition((state.position+1)%availablePositions.length));
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  window.addEventListener('pagehide',stop);

  function setPage(page) {
    if(!['explore','progressions','chords','editor'].includes(page)||state.page===page)return;
    stop(); state.page=page;state.position=0;
    $$('.page-tabs [data-page]').forEach(button=>{const active=button.dataset.page===page;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
    $('#progressions-panel').hidden=page!=='progressions';$('#chords-panel').hidden=page!=='chords';
    $('#editor-panel').hidden=page!=='editor';editor.activate(page==='editor');
    bridge.setPage(page);
    if(page==='progressions')renderProgression(); else if(page==='chords')renderFinder();
  }
  function changeProgression(change){stop();Object.assign(state,change,{step:0,customStep:null,position:0});renderProgression();}
  function renderProgression(){
    currentProgression=getProgression(state.root,state.mode,state.progression);
    $('#progression-select').replaceChildren(...PROGRESSIONS[state.mode].map(def=>{const option=document.createElement('option');option.value=def.id;option.textContent=`${def.roman} · ${def.name}`;return option;}));
    $('#progression-select').value=state.progression;
    $('#progression-description').textContent=currentProgression.description;
    $('#progression-steps').replaceChildren(...currentProgression.steps.map((step,index)=>{
      const button=document.createElement('button');button.className='progression-step';button.dataset.step=index;
      button.innerHTML=`<span class="step-roman">${step.roman}</span><strong>${step.symbol}</strong><span class="step-role">${step.role}</span><span class="step-index">0${index+1}</span>`;
      button.setAttribute('aria-label',`Chord ${index+1}: ${step.symbol}, ${step.roman}, ${step.role}`);
      button.addEventListener('click',()=>{stop();state.step=index;state.customStep=null;state.position=0;showProgressionChord();});return button;
    }));
    $('#diatonic-chords').replaceChildren(...getDiatonicChords(state.root,state.mode).map(step=>{
      const button=document.createElement('button');button.innerHTML=`<span>${step.roman}</span><strong>${step.symbol}</strong>`;
      button.setAttribute('aria-label',`Show ${step.symbol}, degree ${step.roman}`);
      button.addEventListener('click',()=>{stop();state.customStep=step;state.position=0;showProgressionChord();});return button;
    }));
    showProgressionChord();
  }
  function selectedStep(){return state.customStep||currentProgression.steps[state.step];}
  function showProgressionChord(){
    const step=selectedStep(); availablePositions=getChordPositions(step.root,step.chord,bridge.getTuning(),24);
    state.position=Math.min(state.position,Math.max(0,availablePositions.length-1)); const position=availablePositions[state.position]||null;
    $$('#progression-steps button').forEach((button,index)=>{const active=!state.customStep&&index===state.step;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));button.classList.toggle('is-playing',active&&playing);});
    $('#progression-role').textContent=`${step.roman} · ${step.symbol} — ${step.role}`;
    $('#progression-explanation').textContent=step.explanation;
    const rootName=step.symbol.match(/^[A-G][♯♭]*/)[0];
    const notes=CHORDS[step.chord].intervals.map(interval=>spelledNoteName(step.root,interval,step.chord,'chord',rootName));
    $('#chord-construction').textContent=`${step.symbol} = ${notes.join(' + ')} · Degree ${step.degree} in ${currentProgression.keyName}`;
    $('#progression-position').replaceChildren(...availablePositions.map((p,i)=>{const option=document.createElement('option');option.value=i;option.textContent=p.label || p.name;return option;}));
    $('#progression-position').value=state.position;$('#progression-position').disabled=!position;
    $('#progression-position-label').textContent=position?`${position.isOpen?'Position with open strings':'Closed position'} · Frets ${position.firstFret}–${position.maxFret}`:'No verified position is available in this tuning.';
    $('#progression-status').textContent=`${step.symbol}: ${step.role}`;
    bridge.showChord({root:step.root,chord:step.chord,symbol:step.symbol,position,eyebrow:`${currentProgression.keyName.toUpperCase()} · ${step.roman}`,description:`${step.role} · ${position?(position.label || position.name):'All chord tones'}`});
  }
  function changeFinder(change,reset=true){stop();Object.assign(state,change);if(reset)state.position=0;renderFinder();}
  function choosePosition(index){if(!availablePositions.length)return;stop();state.position=index;renderFinder();}
  function renderFinder(){
    availablePositions=getChordPositions(state.finderRoot,state.chord,bridge.getTuning(),24);
    state.position=Math.min(state.position,Math.max(0,availablePositions.length-1)); const position=availablePositions[state.position]||null;
    const symbol=NOTES[state.finderRoot]+CHORDS[state.chord].symbol;
    $('#finder-name').textContent=symbol;
    $('#finder-notes').textContent=CHORDS[state.chord].intervals.map(interval=>spelledNoteName(state.finderRoot,interval,state.chord,'chord')).join(' · ');
    $$('[data-finder-view]').forEach(button=>{const active=button.dataset.finderView===state.view;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});
    $('#finder-positions').hidden=state.view!=='positions';$('#finder-all-help').hidden=state.view!=='all';
    $('#position-count').textContent=`${availablePositions.length} positions`;
    $('#position-picker').replaceChildren(...availablePositions.map((p,index)=>{const button=document.createElement('button');button.textContent=p.label || p.name;button.classList.toggle('active',index===state.position);button.setAttribute('aria-pressed',String(index===state.position));button.addEventListener('click',()=>choosePosition(index));return button;}));
    $('#position-name').textContent=position?(position.label || position.name):'No position found';
    $('#position-description').textContent=position?`${state.position+1} / ${availablePositions.length} · Frets ${position.firstFret}–${position.maxFret}${position.barres.length?' · Barre shape':''}`:'Explore all note locations in this tuning instead.';
    $('#previous-position').disabled=availablePositions.length<2;$('#next-position').disabled=availablePositions.length<2;
    const table=document.createElement('table');table.innerHTML='<caption>Fret and finger numbers, from high to low string</caption><thead><tr><th scope="col">String</th>'+[1,2,3,4,5,6].map(i=>`<th scope="col">${i}</th>`).join('')+'</tr></thead><tbody><tr><th scope="row">Frets</th>'+(position?position.frets.map(f=>`<td>${f===null?'×':f}</td>`).join(''):'<td colspan="6">—</td>')+'</tr><tr><th scope="row">Finger</th>'+(position?position.frets.map((f,i)=>`<td>${f===null?'×':f===0?'0':position.fingers?.[i]??'—'}</td>`).join(''):'<td colspan="6">—</td>')+'</tr></tbody>';
    $('#fingering-table').replaceChildren(table);
    bridge.showChord({root:state.finderRoot,chord:state.chord,symbol,position:state.view==='positions'?position:null,eyebrow:'CHORD FINDER',description:state.view==='positions'?(position?(position.label || position.name):'All chord tones'):'All chord tones · Each colored dot is an option'});
  }
  function updateTransport(){
    $('#progression-play').textContent=playing?'■ Stop':'▶ Play progression';$('#progression-play').setAttribute('aria-label',playing?'Stop progression':'Play progression');
    $$('.beat-meter i').forEach((dot,i)=>dot.classList.toggle('active',playing&&i===currentBeat));
    $$('#progression-steps button').forEach((button,index)=>button.classList.toggle('is-playing',playing&&!state.customStep&&index===state.step));
  }
  function stop(){transportToken++;clearTimeout(timer);timer=null;playing=false;editor.stop();bridge.stopAudio();updateTransport();}
  async function start(){
    stop();const token=transportToken;playing=true;updateTransport();
    if(!await bridge.prepareAudio()||token!==transportToken){if(token===transportToken){playing=false;updateTransport();}return;}
    state.step=0;state.customStep=null;state.position=0;currentBeat=0;
    const beatLength=60000/state.bpm;let deadline=performance.now();
    const tick=()=>{
      if(token!==transportToken)return;
      if(currentBeat===0){showProgressionChord();const position=availablePositions[state.position];if(position)bridge.strum(position.notes);}
      updateTransport();deadline+=beatLength;
      timer=setTimeout(()=>{
        if(token!==transportToken)return;
        currentBeat=(currentBeat+1)%4;
        if(currentBeat===0){state.step++;state.position=0;if(state.step>=currentProgression.steps.length){if(state.loop)state.step=0;else{state.step=currentProgression.steps.length-1;stop();return;}}}
        tick();
      },Math.max(0,deadline-performance.now()));
    };
    tick();
  }
  return {stop,setPage,getPage:()=>state.page,refresh(){stop();state.position=0;if(state.page==='progressions')renderProgression();else if(state.page==='chords')renderFinder();}};
}
