import { NOTES, CHORDS, TUNINGS, mod12 } from './music.js?v=4';
import { getChordPositions } from './chord-positions.js?v=4';
import { DURATIONS, EMPTY_SCORE, tickLabel, chordNotes, matchesChord, eventName, validateScore, placeEvent, resizeScore, tabText } from './tab-score.js?v=4';

const STORAGE='perde-tab-score-v1';
export function initTabEditor(bridge) {
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const option=(text,value)=>{const el=document.createElement('option');el.textContent=text;el.value=value;return el;};
  let score=EMPTY_SCORE(), restoreError=false;
  try {const saved=localStorage.getItem(STORAGE);if(saved)score=validateScore(JSON.parse(saved));}catch{restoreError=true;}
  let root=7,chord='major',frets=[],duration=4,cursor=0,selected=null,positions=[],active=false;
  let playing=false,token=0,timer=null,loop=false;
  const undo=[],redo=[];
  $('#editor-panel').innerHTML=`
    <div class="learning-heading"><div><span class="eyebrow">WRITE YOUR OWN PART</span><h2>Your chords. <em>Your rhythm.</em></h2><p>Choose a voicing, choose its length, then place it anywhere in your TAB.</p></div><span class="section-number">04 /</span></div>
    <div class="editor-composer">
      <section class="editor-voicing" aria-labelledby="voicing-title"><h3 id="voicing-title"><span>01</span> Choose a chord & position</h3>
        <div class="learning-fields"><label>ROOT NOTE<select id="editor-root">${NOTES.map((n,i)=>`<option value="${i}">${n}</option>`).join('')}</select></label><label>CHORD TYPE<select id="editor-chord">${Object.entries(CHORDS).map(([key,d])=>`<option value="${key}">${d.name}</option>`).join('')}</select></label><label>TUNING<select id="editor-tuning">${Object.entries(TUNINGS).map(([key,d])=>`<option value="${key}">${d.name}</option>`).join('')}</select></label></div>
        <label class="editor-field editor-position-label">POSITION<select id="editor-position"></select></label>
        <div class="editor-frets" id="editor-frets" role="group" aria-label="Custom frets, high string to low string"></div>
        <p class="editor-caption">High string → low string · 0 = open · × = mute. Change any fret to make your own voicing.</p>
        <div class="editor-preview"><strong id="editor-chord-name"></strong><span id="editor-chord-notes"></span><button class="editor-button" id="editor-audition">♫ Preview</button></div><p id="editor-voicing-hint" class="editor-caption"></p>
      </section>
      <section class="editor-placement" aria-labelledby="rhythm-title"><h3 id="rhythm-title"><span>02</span> Choose the rhythm & location</h3>
        <div class="editor-durations" role="group" aria-label="Note duration">${DURATIONS.map(d=>`<button data-duration="${d.ticks}" aria-pressed="${d.ticks===4}"><strong>${d.fraction}</strong><span>${d.label}</span></button>`).join('')}</div>
        <p id="editor-duration-help" class="editor-caption"></p>
        <div class="learning-fields editor-location"><label>BAR<select id="editor-bar"></select></label><label>BEAT / SUBDIVISION<select id="editor-beat">${Array.from({length:16},(_,i)=>`<option value="${i}">${Math.floor(i/4)+1}${['',' e',' &',' a'][i%4]}</option>`).join('')}</select></label></div>
        <p class="editor-caption">4/4 time · Each beat has four slots: 1 e & a. Tap a slot below to choose a location, or tap a chord to edit it.</p>
        <div class="editor-actions"><button class="primary-button" id="editor-add">Place chord</button><button class="editor-button" id="editor-rest">Place rest</button><button class="editor-button" id="editor-deselect" hidden>Cancel edit</button></div>
        <div class="editor-selection" id="editor-selection">New chord</div>
      </section>
    </div>
    <div class="editor-score-heading"><div><span class="eyebrow">YOUR TAB</span><h3>Build it, beat by beat.</h3></div><span id="editor-save-state" class="editor-save-state" role="status"></span></div>
    <div class="editor-score-toolbar"><label class="editor-field">BARS<select id="editor-bars">${Array.from({length:8},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('')}</select></label><label class="editor-field">TEMPO · BPM<input id="editor-tempo" type="number" min="40" max="180" step="1" value="80"></label><button id="editor-play" class="primary-button">▶ Play TAB</button><label class="loop-label"><input id="editor-loop" type="checkbox"> Loop</label><span id="editor-playhead">4/4 · Sixteenth-note grid</span></div>
    <p class="editor-message" id="editor-message" role="status" aria-live="polite"></p>
    <div class="editor-score-scroll" id="editor-scroll" tabindex="0" role="region" aria-label="Scrollable guitar TAB editor"><div id="editor-score" class="editor-score"></div></div>
    <p class="editor-caption">Numbers on the same vertical line play together. Shaded width shows duration; ~ continues a chord. Empty slots are silent. Swipe sideways to see more bars.</p>
    <div class="editor-bottom-actions"><div><button class="editor-button" id="editor-undo">↶ Undo</button><button class="editor-button" id="editor-redo">↷ Redo</button><button class="editor-button" id="editor-delete" disabled>Delete selected</button><button class="editor-button" id="editor-clear">Clear TAB</button></div><button class="editor-button" id="editor-download">Download TAB ↓</button></div>`;

  function message(text){$('#editor-message').textContent=text;}
  function save(){try{localStorage.setItem(STORAGE,JSON.stringify(score));$('#editor-save-state').textContent='Saved in this browser';}catch{$('#editor-save-state').textContent='Saving unavailable · download your TAB to keep it';}}
  function commit(next){stop();undo.push(JSON.stringify(score));if(undo.length>40)undo.shift();redo.length=0;score=validateScore(next);save();}
  function rebuildPositions(){
    positions=getChordPositions(root,chord,score.tuning,24);
    $('#editor-position').replaceChildren(...positions.map((p,i)=>option(p.label,String(i))),option('Custom frets','custom'));
  }
  function loadPosition(){rebuildPositions();frets=[...positions[0].frets];$('#editor-position').value='0';renderDraft();}
  function renderDraft(){
    $('#editor-root').value=root;$('#editor-chord').value=chord;$('#editor-tuning').value=score.tuning;
    const found=positions.findIndex(p=>p.frets.every((f,i)=>f===frets[i]));$('#editor-position').value=found<0?'custom':String(found);
    $('#editor-frets').replaceChildren(...frets.map((f,i)=>{
      const label=document.createElement('label');const open=NOTES[mod12(TUNINGS[score.tuning].notes[i])];
      label.innerHTML=`<span>${i+1} · ${i===0?open.toLowerCase():open}</span><select aria-label="String ${i+1} fret" data-editor-string="${i}"><option value="x">×</option>${Array.from({length:25},(_,n)=>`<option value="${n}">${n}</option>`).join('')}</select>`;
      const select=label.querySelector('select');select.value=f===null?'x':String(f);select.addEventListener('change',()=>{stop();frets[i]=select.value==='x'?null:Number(select.value);updateVoicing();});return label;
    }));
    updateVoicing();renderPlacement();
  }
  function updateVoicing(){
    const exact=matchesChord(frets,root,chord,score.tuning), symbol=NOTES[root]+CHORDS[chord].symbol;
    const found=positions.findIndex(p=>p.frets.every((f,i)=>f===frets[i]));$('#editor-position').value=found<0?'custom':String(found);
    $('#editor-chord-name').textContent=exact?symbol:'Custom voicing';
    $('#editor-chord-notes').textContent=chordNotes(frets,score.tuning).map(n=>NOTES[mod12(n.midi)]).join(' · ')||'All strings muted';
    $('#editor-voicing-hint').textContent=exact?`${symbol} chord tones. Check that your custom fingering feels comfortable.`:`These frets do not contain exactly the notes of ${symbol}. They will be labeled “Custom”.`;
    $('#editor-add').disabled=!frets.some(f=>f!==null);$('#editor-audition').disabled=!frets.some(f=>f!==null);
  }
  function renderPlacement(){
    $('#editor-bar').replaceChildren(...Array.from({length:score.bars},(_,i)=>option(String(i+1),String(i))));
    $('#editor-bar').value=Math.floor(cursor/16);$('#editor-beat').value=cursor%16;
    $$('[data-duration]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.duration)===duration)));
    const d=DURATIONS.find(d=>d.ticks===duration);$('#editor-duration-help').textContent=`${d.label} note = ${d.beats} ${d.beats===1?'beat':'beats'} = ${duration} ${duration===1?'slot':'slots'}.`;
    $('#editor-add').textContent=selected?'Update chord':'Place chord';$('#editor-rest').textContent=selected?'Update rest':'Place rest';$('#editor-deselect').hidden=!selected;
    $('#editor-selection').textContent=`${selected?'Editing selected event':'New event'} · ${tickLabel(cursor)}`;
    $('#editor-delete').disabled=!selected;
    $$('.score-slot').forEach(el=>{const chosen=Number(el.dataset.tick)===cursor;el.classList.toggle('cursor',chosen);el.setAttribute('aria-pressed',String(chosen));});
    $$('.score-event').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.event===selected)));
  }
  function chooseTick(tick){stop();cursor=tick;selected=null;renderPlacement();message('');}
  function chooseEvent(event){stop();selected=event.id;cursor=event.start;root=event.root;chord=event.chord;frets=[...event.frets];duration=event.duration;rebuildPositions();renderDraft();message('Edit the chord, duration or location, then press Update.');}
  function renderScore(){
    const total=score.bars*16,container=$('#editor-score');container.style.setProperty('--ticks',total);container.replaceChildren();
    const labels=document.createElement('div');labels.className='score-string-labels';labels.innerHTML='<span>TAB</span>'+TUNINGS[score.tuning].notes.map((n,i)=>`<span>${i===0?NOTES[mod12(n)].toLowerCase():NOTES[mod12(n)]}</span>`).join('')+'<span>Value</span>';container.append(labels);
    const body=document.createElement('div');body.className='score-body';
    const bars=document.createElement('div');bars.className='score-bars';
    for(let i=0;i<score.bars;i++){const label=document.createElement('span');label.style.gridColumn=`${i*16+1} / span 16`;label.textContent=`BAR ${i+1}`;bars.append(label);}body.append(bars);
    const counts=document.createElement('div');counts.className='score-counts';
    const lanes=document.createElement('div');lanes.className='score-lanes';
    for(let tick=0;tick<total;tick++){
      const count=document.createElement('button');count.textContent=tick%4===0?String(Math.floor(tick%16/4)+1):['','e','&','a'][tick%4];count.title=tickLabel(tick);count.setAttribute('aria-label',`Place at ${tickLabel(tick)}`);count.addEventListener('click',()=>chooseTick(tick));counts.append(count);
      const slot=document.createElement('button');slot.className=`score-slot${tick%16===0?' bar-start':tick%4===0?' beat-start':''}`;slot.dataset.tick=tick;slot.style.gridColumn=String(tick+1);slot.setAttribute('aria-label',`Select ${tickLabel(tick)}`);slot.addEventListener('click',()=>chooseTick(tick));lanes.append(slot);
    }
    for(const e of score.events){
      const el=document.createElement('button');el.className=`score-event${e.kind==='rest'?' is-rest':''}`;el.dataset.event=e.id;el.style.gridColumn=`${e.start+1} / span ${e.duration}`;
      const d=DURATIONS.find(d=>d.ticks===e.duration),name=eventName(e,score.tuning);const label=`${name}, ${tickLabel(e.start)}, ${d.label} note${e.kind==='chord'?', frets high to low '+e.frets.map(f=>f===null?'mute':f).join(', '):''}`;el.title=label;el.setAttribute('aria-label',label);
      const heading=document.createElement('strong');heading.textContent=name;el.append(heading);
      for(let i=0;i<6;i++){const row=document.createElement('span');row.className='score-note';const note=document.createElement('b');note.textContent=e.kind==='rest'?(i===2?'r':'–'):e.frets[i]===null?'×':String(e.frets[i]);row.append(note);if(e.duration>1&&e.kind==='chord'){const sustain=document.createElement('i');sustain.textContent='~';row.append(sustain);}el.append(row);}
      const length=document.createElement('small');length.textContent=d.fraction;el.append(length);el.addEventListener('click',()=>chooseEvent(e));lanes.append(el);
    }
    body.append(counts,lanes);container.append(body);
    $('#editor-bars').value=score.bars;$('#editor-tempo').value=score.bpm;$('#editor-play').disabled=!score.events.length;$('#editor-clear').disabled=!score.events.length;$('#editor-undo').disabled=!undo.length;$('#editor-redo').disabled=!redo.length;
    renderPlacement();
  }
  function place(kind){
    const event={id:selected||`n${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`,start:cursor,duration,kind,root,chord,frets:[...frets]};
    try{const next=placeEvent(score,event,selected);commit(next);selected=null;cursor=Math.min(score.bars*16-1,event.start+duration);renderScore();message(`${eventName(event,score.tuning)} placed at ${tickLabel(event.start)}. Choose the next chord or slot.`);}catch(error){message(error.message);}
  }
  function changeHistory(from,to){if(!from.length)return;stop();to.push(JSON.stringify(score));score=validateScore(JSON.parse(from.pop()));selected=null;cursor=Math.min(cursor,score.bars*16-1);rebuildPositions();renderDraft();renderScore();save();message('');}
  function updateTransport(){
    $('#editor-play').textContent=playing?'■ Stop':'▶ Play TAB';$('#editor-play').setAttribute('aria-label',playing?'Stop TAB playback':'Play TAB');
  }
  function stop(){token++;clearTimeout(timer);timer=null;playing=false;bridge.stopAudio();$$('.score-slot.is-playing,.score-event.is-playing').forEach(el=>el.classList.remove('is-playing'));$('#editor-playhead').textContent='4/4 · Sixteenth-note grid';updateTransport();}
  async function start(){
    if(!active||!score.events.length)return;
    bridge.stopOthers();stop();playing=true;updateTransport();const request=token;
    if(!await bridge.prepareAudio()||request!==token){if(request===token)stop();return;}
    let tick=0;const ms=60000/score.bpm/4;let deadline=performance.now();
    function advance(){
      if(request!==token)return;
      if(tick>=score.bars*16){if(!loop){stop();return;}tick=0;bridge.stopAudio();}
      if(score.events.some(e=>e.start+e.duration===tick))bridge.stopAudio();
      const event=score.events.find(e=>e.start===tick);
      if(event){bridge.stopAudio();if(event.kind==='chord')bridge.playTimedChord(chordNotes(event.frets,score.tuning),event.duration*ms/1000);}
      $$('.score-slot').forEach(el=>el.classList.toggle('is-playing',Number(el.dataset.tick)===tick));
      $$('.score-event').forEach(el=>{const e=score.events.find(e=>e.id===el.dataset.event);el.classList.toggle('is-playing',e.start<=tick&&tick<e.start+e.duration);});
      $('#editor-playhead').textContent=tickLabel(tick);deadline+=ms;tick++;timer=setTimeout(advance,Math.max(0,deadline-performance.now()));
    }
    advance();
  }
  $('#editor-root').addEventListener('change',e=>{stop();root=Number(e.target.value);loadPosition();});
  $('#editor-chord').addEventListener('change',e=>{stop();chord=e.target.value;loadPosition();});
  $('#editor-tuning').addEventListener('change',e=>{commit({...score,tuning:e.target.value});rebuildPositions();renderDraft();renderScore();message('Tuning changed. Existing fret numbers stay in place; chord labels and pitches update. Undo restores the previous tuning.');});
  $('#editor-position').addEventListener('change',e=>{stop();if(e.target.value!=='custom'){frets=[...positions[Number(e.target.value)].frets];renderDraft();}else message('Use the six string controls to choose your frets.');});
  $$('[data-duration]').forEach(b=>b.addEventListener('click',()=>{stop();duration=Number(b.dataset.duration);renderPlacement();}));
  $('#editor-bar').addEventListener('change',e=>{stop();cursor=Number(e.target.value)*16+cursor%16;renderPlacement();});
  $('#editor-beat').addEventListener('change',e=>{stop();cursor=Math.floor(cursor/16)*16+Number(e.target.value);renderPlacement();});
  $('#editor-add').addEventListener('click',()=>place('chord'));$('#editor-rest').addEventListener('click',()=>place('rest'));
  $('#editor-deselect').addEventListener('click',()=>{selected=null;renderPlacement();message('');});
  $('#editor-delete').addEventListener('click',()=>{if(!selected)return;commit({...score,events:score.events.filter(e=>e.id!==selected)});selected=null;renderScore();message('Event deleted. Undo is available.');});
  $('#editor-clear').addEventListener('click',()=>{commit({...score,events:[]});selected=null;cursor=0;renderScore();message('TAB cleared. Undo restores it.');});
  $('#editor-undo').addEventListener('click',()=>changeHistory(undo,redo));$('#editor-redo').addEventListener('click',()=>changeHistory(redo,undo));
  $('#editor-bars').addEventListener('change',e=>{try{commit(resizeScore(score,Number(e.target.value)));cursor=Math.min(cursor,score.bars*16-1);renderScore();message('');}catch(error){e.target.value=score.bars;message(error.message);}});
  $('#editor-tempo').addEventListener('change',e=>{const bpm=Number(e.target.value);if(!Number.isInteger(bpm)||bpm<40||bpm>180){e.target.value=score.bpm;message('Choose a whole-number tempo from 40 to 180 BPM.');return;}commit({...score,bpm});renderScore();message('');});
  $('#editor-loop').addEventListener('change',e=>{loop=e.target.checked;});$('#editor-play').addEventListener('click',()=>playing?stop():start());
  $('#editor-audition').addEventListener('click',async()=>{bridge.stopOthers();stop();const request=token;if(await bridge.prepareAudio()&&request===token)bridge.playTimedChord(chordNotes(frets,score.tuning),1.4);});
  $('#editor-download').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([tabText(score)],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='perde-tab.txt';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);message('TAB downloaded with rhythm values and beat counts.');});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',stop);
  loadPosition();renderScore();$('#editor-save-state').textContent=restoreError?'Saved score could not be loaded':'Autosaves in this browser';
  if(restoreError)message('The saved score could not be loaded. A new empty score is open.');
  return {stop,activate(value){active=value;if(!value)stop();}};
}
