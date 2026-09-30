import { CHORDS, NOTES, TUNINGS, mod12 } from './music.js?v=4';

// Time is stored in sixteenth-note ticks: four ticks per quarter-note beat.
export const TICKS_PER_BAR = 16;
export const DURATIONS = Object.freeze([
  { ticks:16, label:'Whole', fraction:'1/1', beats:4 },
  { ticks:8, label:'Half', fraction:'1/2', beats:2 },
  { ticks:4, label:'Quarter', fraction:'1/4', beats:1 },
  { ticks:2, label:'Eighth', fraction:'1/8', beats:0.5 },
  { ticks:1, label:'Sixteenth', fraction:'1/16', beats:0.25 },
]);
export const EMPTY_SCORE = () => ({version:1, bars:4, bpm:80, tuning:'standard', events:[]});
export function tickLabel(tick) {
  return `Bar ${Math.floor(tick/16)+1}, beat ${Math.floor(tick%16/4)+1}${['',' e',' &',' a'][tick%4]}`;
}
export function chordNotes(frets, tuning) {
  return frets.flatMap((fret,stringIndex)=>fret===null?[]:[{stringIndex,fret,midi:TUNINGS[tuning].notes[stringIndex]+fret}]);
}
export function matchesChord(frets,root,chord,tuning) {
  const pitches=new Set(chordNotes(frets,tuning).map(n=>mod12(n.midi-root)));
  return pitches.size===CHORDS[chord].intervals.length && CHORDS[chord].intervals.every(n=>pitches.has(n));
}
export function eventName(event,tuning) {
  return event.kind==='rest'?'Rest':matchesChord(event.frets,event.root,event.chord,tuning)?NOTES[event.root]+CHORDS[event.chord].symbol:'Custom';
}
function validEvent(event,total) {
  return event && typeof event.id==='string' && /^[a-zA-Z0-9_-]{1,80}$/.test(event.id)
    && Number.isInteger(event.start) && event.start>=0
    && DURATIONS.some(d=>d.ticks===event.duration) && event.start+event.duration<=total
    && ['chord','rest'].includes(event.kind)
    && Number.isInteger(event.root) && event.root>=0 && event.root<12 && Object.hasOwn(CHORDS,event.chord)
    && Array.isArray(event.frets) && event.frets.length===6 && event.frets.every(f=>f===null||(Number.isInteger(f)&&f>=0&&f<=24))
    && (event.kind==='rest'||event.frets.some(f=>f!==null));
}
export function validateScore(value) {
  if(!value||value.version!==1||!Number.isInteger(value.bars)||value.bars<1||value.bars>8
    ||!Number.isInteger(value.bpm)||value.bpm<40||value.bpm>180||!Object.hasOwn(TUNINGS,value.tuning)
    ||!Array.isArray(value.events)||value.events.length>128) throw new Error('Invalid saved score.');
  const ids=new Set();let end=0;
  const events=[...value.events].sort((a,b)=>a.start-b.start).map(e=>{
    if(!validEvent(e,value.bars*16)||ids.has(e.id)||e.start<end)throw new Error('Invalid or overlapping TAB events.');
    ids.add(e.id);end=e.start+e.duration;
    return {id:e.id,start:e.start,duration:e.duration,kind:e.kind,root:e.root,chord:e.chord,frets:[...e.frets]};
  });
  return {version:1,bars:value.bars,bpm:value.bpm,tuning:value.tuning,events};
}
export function placeEvent(score,event,replaceId=null) {
  if(!validEvent(event,score.bars*16))throw new Error('This note extends past the end. Add a bar or choose a shorter duration.');
  const remaining=score.events.filter(e=>e.id!==replaceId);
  if(remaining.some(e=>event.start<e.start+e.duration&&e.start<event.start+event.duration))throw new Error('This space is occupied. Choose an empty slot, shorten the note, or select an existing chord to edit.');
  return validateScore({...score,events:[...remaining,event]});
}
export function resizeScore(score,bars) {
  if(score.events.some(e=>e.start+e.duration>bars*16))throw new Error('There are notes in the bars you want to remove. Move or delete those notes first.');
  return validateScore({...score,bars});
}
export function tabText(score) {
  const lines=['perde. TAB Editor',`4/4 | ${score.bpm} BPM | ${TUNINGS[score.tuning].name}`, 'Each column = one sixteenth note. ~ = sustain, r = rest, x = mute.',''];
  for(let bar=0;bar<score.bars;bar++){
    lines.push(`Bar ${bar+1}`);
    lines.push('Count |'+Array.from({length:16},(_,i)=>(i%4===0?String(i/4+1):['','e','&','a'][i%4]).padEnd(5)).join('')+'|');
    lines.push('Value |'+Array.from({length:16},(_,i)=>{const e=score.events.find(e=>e.start===bar*16+i);return (e?DURATIONS.find(d=>d.ticks===e.duration).fraction:'').padEnd(5);}).join('')+'|');
    TUNINGS[score.tuning].notes.forEach((midi,stringIndex)=>{
      const name=NOTES[mod12(midi)];
      const cells=Array.from({length:16},(_,i)=>{
        const tick=bar*16+i,e=score.events.find(e=>e.start<=tick&&tick<e.start+e.duration);
        const mark=!e?'-':e.kind==='rest'?'r':tick!==e.start?'~':e.frets[stringIndex]===null?'x':String(e.frets[stringIndex]);
        return mark.padStart(2,'-').padEnd(5,'-');
      });
      lines.push(`${String(stringIndex+1)+' '+(stringIndex===0?name.toLowerCase():name)}`.padEnd(6)+'|'+cells.join('')+'|');
    });
    lines.push('');
  }
  lines.push('Events:');
  score.events.forEach(e=>lines.push(`${tickLabel(e.start)} · ${eventName(e,score.tuning)} · ${DURATIONS.find(d=>d.ticks===e.duration).label} (${e.duration/4} beats)`));
  return lines.join('\n')+'\n';
}
