import { NOTES, TUNINGS, SCALES, CHORDS, mod12, noteName, intervalLabel, buildFretboard, getChordVoicing, spelledNoteName, degreeLabel } from './music.js?v=2';
import { initLearning } from './learning.js?v=2';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const defaults = { root: 7, mode: 'scale', scale: 'major', chord: 'major', display: 'notes', tuning: 'standard', fretCount: 12, target: 0, sound: true, shape: 'all' };
function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem('perde-settings') || '{}');
    return { root: Number.isInteger(saved.root) && saved.root >= 0 && saved.root < 12 ? saved.root : 7,
      mode: ['scale','chord','layer'].includes(saved.mode) ? saved.mode : 'scale',
      scale: Object.hasOwn(SCALES, saved.scale) ? saved.scale : 'major',
      chord: Object.hasOwn(CHORDS, saved.chord) ? saved.chord : 'major',
      display: ['notes','intervals','tab'].includes(saved.display) ? saved.display : 'notes',
      tuning: Object.hasOwn(TUNINGS, saved.tuning) ? saved.tuning : 'standard',
      fretCount: [12,15,24].includes(saved.fretCount) ? saved.fretCount : 12,
      target: saved.target === null || (Number.isInteger(saved.target) && saved.target >= 0 && saved.target < 12) ? saved.target : 0,
      sound: typeof saved.sound === 'boolean' ? saved.sound : true,
      shape: ['all','auto','E','A'].includes(saved.shape) ? saved.shape : 'all' };
  } catch { return {...defaults}; }
}
let state = restore();
let learning, activePage = 'explore', explorerState = null, toolInfo = null;
let positions = [], voicing = null, audioContext, toastTimer, sequenceToken = 0, playing = false;
const activeSources = new Set();
const solfege = ['Do','Do diyez','Re','Re diyez','Mi','Fa','Fa diyez','Sol','Sol diyez','La','La diyez','Si'];
const soundIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/></svg>`;
const muteIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4zM16 9l6 6M22 9l-6 6"/></svg>`;
const playIcon = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m5 3 8 5-8 5z" fill="currentColor"/></svg>`;
const stopIcon = `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor"/></svg>`;
const shortNames = { major:'Majör',minor:'Minör',majorPentatonic:'Majör pent.',minorPentatonic:'Minör pent.',blues:'Blues',dorian:'Doryen',mixolydian:'Miksolidyen',harmonicMinor:'Armonik minör' };
const chordOrder = ['major','minor','7','maj7','m7','dim','sus2','sus4'];

function optionButton(label, property, value) {
  const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
  button.dataset[property] = value; button.addEventListener('click', () => update({[property]: property === 'root' ? Number(value) : value}));
  return button;
}
NOTES.forEach((label, index) => $('#root-options').append(optionButton(label, 'root', index)));
Object.entries(SCALES).forEach(([key, value]) => { const button = optionButton(shortNames[key], 'scale', key); button.title = value.name; $('#scale-options').append(button); });
chordOrder.forEach(key => $('#chord-options').append(optionButton(CHORDS[key].name, 'chord', key)));
$$('[data-mode]').forEach(button => button.addEventListener('click', () => update({mode:button.dataset.mode, target:0})));
$$('[data-display]').forEach(button => button.addEventListener('click', () => update({display:button.dataset.display})));
$('#tuning-select').addEventListener('change', event => update({tuning:event.target.value}));
$('#fret-select').addEventListener('change', event => update({fretCount:Number(event.target.value)}));
$('#shape-select').addEventListener('change', event => update({shape:event.target.value}));
$('#sound-button').addEventListener('click', () => { update({sound:!state.sound}); toast(state.sound ? 'Nota sesi açıldı' : 'Nota sesi kapatıldı'); });
$('#reset-button').addEventListener('click', () => { update({...defaults}); $('#board-scroll').scrollLeft = 0; toast('Klavye başlangıç ayarlarına döndü'); });
$('#help-button').addEventListener('click', () => $('#help-dialog').showModal());
for (const id of ['close-help','start-exploring']) $(`#${id}`).addEventListener('click', () => $('#help-dialog').close());
$('#help-dialog').addEventListener('click', event => { if (event.target === $('#help-dialog')) { const r = event.target.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.target.close(); } });
$('#play-button').addEventListener('click', () => { if (playing) { stopPlayback(); return; } learning?.stop(); playSelection(); });
$('#practice-button').addEventListener('click', () => { $('#tab-card').hidden = !$('#tab-card').hidden; renderTab(); $('#practice-button').innerHTML = `${$('#tab-card').hidden ? 'TAB dizisini göster' : 'TAB dizisini gizle'} <span>↗</span>`; if (!$('#tab-card').hidden) $('#tab-card').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth', block:'nearest'}); });
$('#close-tab').addEventListener('click', () => { $('#tab-card').hidden = true; $('#practice-button').innerHTML = 'TAB dizisini göster <span>↗</span>'; });
$$('[data-preset]').forEach(button => button.addEventListener('click', () => { update(button.dataset.preset === 'pentatonic' ? {root:9,mode:'scale',scale:'minorPentatonic',target:0,shape:'all'} : {root:7,mode:'layer',scale:'major',chord:'major',target:0,shape:'all'}); $('.fretboard-card').scrollIntoView({behavior:'smooth',block:'nearest'}); }));

function update(change) { learning?.stop(); stopPlayback(); Object.assign(state,change); if (activePage !== 'explore' && Object.hasOwn(change,'tuning')) { learning.refresh(); return; } render(); }
function setPressed(selector, property) { $$(selector).forEach(button => { const active = String(state[property]) === button.dataset[property]; button.classList.toggle('active',active); button.setAttribute('aria-pressed',String(active)); }); }
function selectionIntervals() { return state.mode === 'chord' ? CHORDS[state.chord].intervals : state.mode === 'layer' ? [...new Set([...SCALES[state.scale].intervals,...CHORDS[state.chord].intervals])].sort((a,b)=>a-b) : SCALES[state.scale].intervals; }
function labelFor(interval) { const chordOnly = state.mode === 'chord' || (state.mode === 'layer' && !SCALES[state.scale].intervals.includes(interval)); return degreeLabel(interval, chordOnly ? state.chord : state.scale, chordOnly ? 'chord' : 'scale'); }
function nameFor(interval) { const chordOnly = state.mode === 'chord' || (state.mode === 'layer' && !SCALES[state.scale].intervals.includes(interval)); return spelledNoteName(state.root,interval,chordOnly?state.chord:state.scale,chordOnly?'chord':'scale',state.rootSpelling); }
function render() {
  voicing = activePage !== 'explore' ? toolInfo?.position || null : state.mode !== 'scale' && state.shape !== 'all' ? getChordVoicing(state.root,state.chord,state.shape,state.tuning) : null;
  if (voicing && voicing.maxFret > state.fretCount) state.fretCount = voicing.maxFret <= 15 ? 15 : 24;
  positions = buildFretboard(state);
  if (voicing) positions = positions.map(position => { const inChord = voicing.frets[position.stringIndex] === position.fret; return {...position,inChord,active:state.mode === 'chord' ? inChord : position.inScale || inChord}; });
  try { if (activePage === 'explore') localStorage.setItem('perde-settings',JSON.stringify(state)); } catch { /* Private browsing can disable storage. */ }
  for (const property of ['root','mode','scale','chord','display']) setPressed(`[data-${property}]`, property);
  $('.controls').classList.toggle('layer-mode',state.mode === 'layer');
  $('#scale-section').hidden = state.mode === 'chord'; $('#chord-section').hidden = state.mode === 'scale';
  $('#scale-label').textContent = state.mode === 'layer' ? 'GAM KATMANI' : 'GAM TÜRÜ';
  $('#root-solfege').textContent = solfege[state.root];
  $('#tuning-select').value = state.tuning; $('#fret-select').value = state.fretCount; $('#shape-select').value = state.shape;
  $('#tuning-notes').textContent = [...TUNINGS[state.tuning].notes].reverse().map((midi,index) => index === 5 ? noteName(midi).toLowerCase() : noteName(midi)).join(' ');
  $('#sound-button').innerHTML = state.sound ? soundIcon : muteIcon;
  $('#sound-button').setAttribute('aria-label', state.sound ? 'Nota sesini kapat' : 'Nota sesini aç'); $('#sound-button').setAttribute('aria-pressed',String(state.sound)); $('#sound-button').title = state.sound ? 'Nota sesi açık' : 'Nota sesi kapalı';
  $('#selection-eyebrow').textContent = {scale:'GAM HARİTASI',chord:'AKOR HARİTASI',layer:'GAM + AKOR KATMANI'}[state.mode];
  const rootName = state.rootSpelling || NOTES[state.root], definition = state.mode === 'chord' ? CHORDS[state.chord] : SCALES[state.scale];
  $('#selection-title').innerHTML = `${rootName} <span>${definition.name}</span>${state.mode === 'layer' ? ` <span class="layer-chord">+ ${rootName}${CHORDS[state.chord].symbol}</span>` : ''}<span class="title-dot"></span>`;
  $('#selection-description').textContent = state.mode === 'chord' ? (voicing ? `${voicing.shape} şekli · ${voicing.notes.length} tel · × işaretli telleri çalma.` : 'Akoru oluşturan sesleri klavyenin her yerinde bul.') : state.mode === 'layer' ? 'İki renk, bir klavye. Ortak sesleri birlikte keşfet.' : definition.description;
  $('#sidebar-tip-text').textContent = state.mode === 'chord' ? 'Bir akor pozisyonu seç. TAB dizisinde sayıları aynı anda çalarak akoru duy.' : state.mode === 'layer' ? 'İki renkli notalar gam ve akorda ortaktır. Solonu bu notalara taşı.' : 'Sarı notalar kök notandır. Melodine buradan başlamayı dene.';
  $('#scale-legend').hidden = state.mode === 'chord'; $('#chord-legend').hidden = state.mode === 'scale'; $('#overlap-legend').hidden = state.mode !== 'layer';
  $('#board-count').textContent = `6 tel / ${state.fretCount} perde`;
  const intervals = selectionIntervals();
  if (state.target !== null && !intervals.includes(state.target)) state.target = 0;
  $('#target-options').replaceChildren(...intervals.map(interval => { const b = document.createElement('button'); b.textContent = labelFor(interval); b.classList.toggle('active',state.target === interval); b.setAttribute('aria-pressed',String(state.target === interval)); b.setAttribute('aria-label',`${labelFor(interval)} aralığını vurgula`); b.addEventListener('click',()=>update({target:state.target === interval ? null : interval})); return b; }));
  $('#finger-display').hidden = activePage === 'explore' || !voicing;
  if (toolInfo && activePage !== 'explore') {
    $('#selection-eyebrow').textContent = toolInfo.eyebrow;
    $('#selection-title').innerHTML = toolInfo.symbol + '<span class="title-dot"></span>';
    $('#selection-description').textContent = toolInfo.description;
  }
  renderBoard(); renderNotes(); renderTab(); renderPlayButton();
}

function positionedElement(className, left, top, text) { const element = document.createElement('div'); element.className = className; if (left !== null) element.style.left = left; if (top !== null) element.style.top = `${top}px`; if (text != null) element.textContent = text; return element; }
function fretX(fret) { return fret === 0 ? 'calc(var(--label-width) + var(--open-width) / 2)' : `calc(var(--label-width) + var(--open-width) + var(--fret-width) * ${fret - .5})`; }
function renderBoard() {
  const board = $('#fretboard'), scroll = $('#board-scroll').scrollLeft;
  board.replaceChildren(); board.classList.toggle('tab-view',state.display === 'tab'); board.style.setProperty('--frets', state.fretCount); board.style.minWidth = `${state.fretCount === 24 ? 1460 : state.fretCount === 15 ? 970 : window.innerWidth <= 600 ? 780 : 724}px`;
  board.append(positionedElement('fret-wood',null,null));
  for(let fret=0;fret<=state.fretCount;fret++) {
    const left = `calc(var(--label-width) + var(--open-width) + var(--fret-width) * ${fret})`;
    board.append(positionedElement(`fret-wire${fret === 0 ? ' nut':''}`,left,null));
    board.append(positionedElement('fret-number',fretX(fret),null,fret === 0 ? '0' : fret));
    if ([3,5,7,9,12,15,17,19,21,24].includes(fret)) {
      const double = fret%12 === 0;
      for(const y of double ? [100,192] : [146]) board.append(positionedElement('fret-inlay',fretX(fret),y));
      board.append(positionedElement('fret-bottom-number',fretX(fret),null,fret));
    }
  }
  TUNINGS[state.tuning].notes.forEach((midi,stringIndex) => {
    const top = 41+42*stringIndex;
    const muted = voicing && voicing.frets[stringIndex] === null && state.mode === 'chord';
    board.append(positionedElement(`string-label${muted?' muted':''}`,null,top,muted?'×':stringIndex===0?noteName(midi).toLowerCase():noteName(midi)));
    const line = positionedElement('string-line',null,top); line.style.height = `${1+stringIndex*.23}px`; board.append(line);
  });
  if (activePage !== 'explore' && voicing) {
    for (const barre of voicing.barres || []) {
      const top = 41 + 42 * Math.min(barre.fromString,barre.toString);
      const line = positionedElement('fret-barre',fretX(barre.fret),top);
      line.style.height = String(42 * Math.abs(barre.toString-barre.fromString))+'px';
      line.setAttribute('aria-hidden','true'); board.append(line);
    }
  }
  for(const position of positions) {
    const distance = mod12(position.pitchClass - state.root), button = document.createElement('button');
    const type = !position.active ? 'inactive' : position.isRoot ? 'root' : state.mode === 'chord' ? 'chord' : state.mode === 'layer' && position.inChord ? position.inScale ? 'overlap':'chord' : 'scale';
    button.className = `fret-note ${type}`;
    if (state.target !== null && state.target !== 0 && position.active) button.classList.add(distance === state.target ? 'target':'dimmed');
    button.style.left = fretX(position.fret); button.style.top = `${41+42*position.stringIndex}px`;
    button.textContent = state.display === 'tab' ? position.fret : state.display === 'intervals' ? position.interval : state.display === 'fingers' && position.active && voicing ? (position.fret === 0 ? '0' : voicing.fingers?.[position.stringIndex] ?? '—') : position.note;
    button.dataset.midi = position.midi; button.dataset.string = position.stringIndex; button.dataset.fret = position.fret;
    const label = `${position.stringIndex+1}. tel, ${position.fret === 0 ? 'açık tel' : `${position.fret}. perde`}: ${position.note}, ${position.interval === 'R' ? 'kök nota' : position.interval}`;
    button.setAttribute('aria-label',label); button.title = label;
    if (!position.active) button.tabIndex = -1;
    button.addEventListener('click', () => { learning?.stop(); stopPlayback(); if (state.sound) pluck(position.midi); highlight(position); toast(`${position.note} · ${position.stringIndex+1}. tel · ${position.fret === 0 ? 'Açık tel' : `${position.fret}. perde`} · ${position.interval === 'R' ? 'Kök nota' : position.interval}`); });
    board.append(button);
  }
  $('#board-scroll').scrollLeft = scroll;
}
function renderNotes() {
  const intervals = selectionIntervals();
  $('#notes-eyebrow').textContent = {scale:'GAMIN NOTALARI',chord:'AKORUN NOTALARI',layer:'KATMAN NOTALARI'}[state.mode];
  $('#note-count').textContent = `${intervals.length} nota`;
  $('#note-chips').replaceChildren(...intervals.map(interval => {
    const button = document.createElement('button'); button.className = `note-chip${interval===0?' root':''}${state.mode==='layer' && CHORDS[state.chord].intervals.includes(interval)?' in-chord':''}`;
    button.dataset.interval = interval; button.innerHTML = `<strong>${nameFor(interval)}</strong><span>${labelFor(interval)}</span>`;
    button.setAttribute('aria-label',`${nameFor(interval)}, ${labelFor(interval)} notasını dinle`);
    button.addEventListener('click', () => { learning?.stop(); stopPlayback(); const midi = 48+state.root+interval; if (state.sound) pluck(midi); highlight({midi,pitchClass:mod12(midi)}); toast(`${nameFor(interval)} · ${interval===0?'Kök nota':`${labelFor(interval)} aralığı`}`); });
    return button;
  }));
  $('#formula').textContent = intervals.map(interval=>interval===0?'1':labelFor(interval)).join(' — ');
  const steps = [...intervals.slice(1),12].map((next,i)=>next-intervals[i]);
  $('#formula-detail').textContent = state.mode === 'layer' ? 'Alt çizgisi pembe olanlar akorda da var.' : state.mode === 'chord' ? `${state.rootSpelling || NOTES[state.root]}${CHORDS[state.chord].symbol} · ${intervals.length} akor sesi` : steps.map(step=>step===2?'Tam':step===1?'Yarım':`${step/2} ses`).join(' · ');
  $('#practice-title').textContent = {scale:'Bir gam, pek çok olasılık.',chord:'Sesleri bir araya getir.',layer:'Melodinin içindeki akor.'}[state.mode];
  $('#practice-text').textContent = state.mode === 'scale' ? 'Bir kök nota bul. Sonraki notaları sırayla çal, ardından köke geri dön. Kulağın yolu hatırlasın.' : state.mode === 'chord' ? 'Akor pozisyonunu seç, parmaklarını yerleştir. × işaretli telleri sustur; 0 gördüğün telleri açık çal.' : 'Gamın içinde dolaşırken iki renkli ortak notalarda dur. Akor sesleri, melodinin dinlenme noktalarıdır.';
}
function makeScaleSequence() {
  const tuning = TUNINGS[state.tuning].notes;
  const start = tuning[5]+mod12(state.root-tuning[5]);
  const targets = [...SCALES[state.scale].intervals,12].map(interval=>start+interval);
  let previous = {fret:mod12(state.root-tuning[5]),stringIndex:5};
  return targets.map(midi => {
    const candidates = tuning.flatMap((open,index)=>midi-open>=0 && midi-open<=state.fretCount?[{midi,fret:midi-open,stringIndex:index,pitchClass:mod12(midi)}]:[]);
    candidates.sort((a,b)=>score(a)-score(b));
    function score(p) { return Math.abs(p.fret-previous.fret)*.6 + Math.abs(p.stringIndex-previous.stringIndex)*1.1 + Math.max(0,p.fret-7)*2 + (p.stringIndex>previous.stringIndex?10:0); }
    const chosen = candidates[0]; previous = chosen; return chosen;
  });
}
function selectedVoicing() { return voicing || getChordVoicing(state.root,state.chord,'auto',state.tuning); }
function renderTab() {
  if ($('#tab-card').hidden) return;
  const isChord = state.mode === 'chord', sequence = isChord ? selectedVoicing() : makeScaleSequence();
  $('#tab-title').textContent = `${state.rootSpelling || NOTES[state.root]} ${isChord?CHORDS[state.chord].name:SCALES[state.scale].name} · ${isChord?'akor pozisyonu':'bir oktav'}`;
  $('#tab-description').textContent = isChord ? `${sequence.shape} şekli. Sayıları aynı anda çal; 0 açık tel, × susturulan teldir.` : 'Soldan sağa oku. Sayılar basacağın perdeleri gösterir; 0 açık teldir.';
  $('#tab-output').textContent = TUNINGS[state.tuning].notes.map((midi,index)=>{
    const name = index === 0 ? noteName(midi).toLowerCase() : noteName(midi);
    const cells = isChord ? `--${String(sequence.frets[index] === null ? '×' : sequence.frets[index]).padStart(2,'-')}--` : sequence.map(note=>note.stringIndex===index?String(note.fret).padStart(2,'-')+'--':'----').join('');
    return `${name.padEnd(2,' ')}|${cells}|`;
  }).join('\n');
}
function toast(message) { clearTimeout(toastTimer); $('#note-toast').textContent = message; $('#note-toast').classList.add('visible'); toastTimer = setTimeout(()=>$('#note-toast').classList.remove('visible'),2400); }
function highlight(position) {
  const nodes = position.stringIndex === undefined ? $$(`.fret-note[data-midi="${position.midi}"]`) : $$(`.fret-note[data-string="${position.stringIndex}"][data-fret="${position.fret}"]`);
  const chip = $(`.note-chip[data-interval="${mod12(position.midi-state.root)}"]`); if (chip) nodes.push(chip);
  nodes.forEach(node=>node.classList.add('playing')); setTimeout(()=>nodes.forEach(node=>node.classList.remove('playing')),380);
}
async function getAudioContext() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) { toast('Bu tarayıcı ses çalmayı desteklemiyor.'); return null; }
  try { audioContext ||= new Audio(); if (audioContext.state === 'suspended') await audioContext.resume(); return audioContext; }
  catch { toast('Ses açılamadı. Bir notaya tekrar dokun.'); return null; }
}
async function pluck(midi, delay=0, volume=.62) {
  const token = sequenceToken, context = await getAudioContext(); if (!context || token !== sequenceToken) return;
  const rate = context.sampleRate, frequency = 440*2**((midi-69)/12), duration = 1.7;
  const length = Math.floor(rate*duration), period = Math.max(2,Math.round(rate/frequency));
  const buffer = context.createBuffer(1,length,rate), samples = buffer.getChannelData(0), ring = new Float32Array(period);
  for(let i=0;i<period;i++) ring[i]=(Math.random()*2-1)*.7;
  for(let i=0;i<length;i++) { const index=i%period; const next=(index+1)%period; const sample = ring[index]; ring[index]=.497*(sample+ring[next]); samples[i]=sample*Math.min(1,i/(rate*.004))*Math.min(1,(length-i)/(rate*.06)); }
  const source=context.createBufferSource(), gain=context.createGain(); source.buffer=buffer; gain.gain.value=volume; source.connect(gain); gain.connect(context.destination); activeSources.add(source); source.onended=()=>{activeSources.delete(source);source.disconnect();gain.disconnect();}; source.start(context.currentTime+delay);
}
function renderPlayButton() { $('#play-button').innerHTML = `${playing?stopIcon:playIcon}<span>${playing?'Durdur':state.mode==='chord'?'Akoru dinle':'Gamı dinle'}</span>`; $('#play-button').setAttribute('aria-label',playing?'Çalmayı durdur':state.mode==='chord'?'Seçili akoru dinle':'Seçili gamı dinle'); }
function stopPlayback() { sequenceToken++; playing=false; for(const source of activeSources){try{source.stop();}catch{}} activeSources.clear(); $$('.playing').forEach(node=>node.classList.remove('playing')); renderPlayButton(); }
async function playSelection() {
  if (playing) { stopPlayback(); return; }
  const requestToken = sequenceToken;
  const context = await getAudioContext(); if (!context || requestToken !== sequenceToken) return;
  stopPlayback(); const token = sequenceToken; playing=true; renderPlayButton();
  const isChord = state.mode==='chord', notes = isChord ? [...selectedVoicing().notes].reverse() : makeScaleSequence();
  for(const note of notes) { if (token !== sequenceToken) return; pluck(note.midi,0,isChord?.38:.62); highlight(note); await new Promise(resolve=>setTimeout(resolve,isChord?75:390)); }
  await new Promise(resolve=>setTimeout(resolve,isChord?1100:350));
  if (token === sequenceToken) { playing=false; renderPlayButton(); }
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPlayback();});
render();
learning = initLearning({
  setPage(page) {
    stopPlayback();
    if (activePage === 'explore') explorerState = {...state};
    activePage = page; toolInfo = null;
    $('.app-layout').classList.toggle('tool-mode',page !== 'explore');
    $('#explore-panel').setAttribute('role',page === 'explore'?'tabpanel':'region');
    $('#explore-panel').setAttribute('aria-labelledby','tab-'+page);
    $('#tab-card').hidden = true;
    $('#practice-button').innerHTML = 'TAB dizisini göster <span>↗</span>';
    if (page === 'explore') { state = {...explorerState}; render(); }
  },
  getTuning: () => state.tuning,
  stopAudio: stopPlayback,
  prepareAudio: getAudioContext,
  showChord(info) {
    stopPlayback(); toolInfo = info;
    const rootSpelling = info.symbol.match(/^[A-G][♯♭]*/)[0];
    Object.assign(state,{root:info.root,rootSpelling,chord:info.chord,mode:'chord',shape:'all',target:0});
    if (state.display === 'fingers' && !info.position) state.display = 'notes';
    render();
    const scroll = $('#board-scroll');
    const first = $('#fretboard .fret-note:not(.inactive)');
    if (info.position && first) scroll.scrollLeft = Math.max(0,first.offsetLeft-scroll.clientWidth/3);
  },
  strum(notes) {
    const token = sequenceToken;
    [...notes].reverse().forEach((note,index) => {
      pluck(note.midi,index*.035,.38);
      setTimeout(()=>{if(token===sequenceToken)highlight(note);},index*35);
    });
  },
});
