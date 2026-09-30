import test from 'node:test';
import assert from 'node:assert/strict';
import { DURATIONS, EMPTY_SCORE, placeEvent, resizeScore, validateScore, matchesChord, eventName, chordNotes, tabText } from '../tab-score.js';
const chord=(id,start,duration=4)=>({id,start,duration,kind:'chord',root:7,chord:'major',frets:[3,0,0,0,2,3]});

test('whole through sixteenth notes occupy the correct amount of a 4/4 bar',()=>{
  assert.deepEqual(DURATIONS.map(d=>[d.fraction,d.ticks,d.beats]),[['1/1',16,4],['1/2',8,2],['1/4',4,1],['1/8',2,0.5],['1/16',1,0.25]]);
  let score={...EMPTY_SCORE(),bars:1};
  for(let tick=0;tick<16;tick++)score=placeEvent(score,chord('n'+tick,tick,1));
  assert.equal(score.events.length,16);
  assert.throws(()=>placeEvent(score,chord('past',16,1)),/past the end/);
});
test('editing can move or lengthen a chord while overlaps are rejected without losing notes',()=>{
  let score=placeEvent(EMPTY_SCORE(),chord('a',0));score=placeEvent(score,chord('b',8));
  assert.throws(()=>placeEvent(score,chord('a',6,4),'a'),/occupied/);
  assert.deepEqual(score.events.map(e=>e.start),[0,8]);
  score=placeEvent(score,chord('a',0,8),'a');assert.equal(score.events[0].duration,8);
  score=placeEvent(score,chord('a',16,16),'a');assert.deepEqual(score.events.map(e=>e.start),[8,16]);
});
test('a chord may sustain across a bar line and occupied bars cannot be removed',()=>{
  const score=placeEvent({...EMPTY_SCORE(),bars:2},chord('tie',14,4));
  assert.equal(score.events[0].start+score.events[0].duration,18);
  assert.throws(()=>resizeScore(score,1),/notes in the bars/);
  assert.equal(resizeScore(score,3).bars,3);
  assert.throws(()=>placeEvent(score,chord('long',31,2)),/past the end/);
});
test('saved scores are validated, copied and rejected when unsafe or corrupt',()=>{
  const original=placeEvent(EMPTY_SCORE(),chord('a',0));
  const restored=validateScore(JSON.parse(JSON.stringify(original)));restored.events[0].frets[0]=24;
  assert.equal(original.events[0].frets[0],3);
  for(const bad of [{...original,bpm:0},{...original,bars:99},{...original,tuning:'unknown'},{...original,events:[chord('a',0),chord('a',8)]},{...original,events:[{...chord('a',0),frets:[99,0,0,0,2,3]}]},{...original,events:[{...chord('a',0),frets:Array(6).fill(null)}]}])assert.throws(()=>validateScore(bad));
});
test('arbitrary fret positions retain their pitches and never acquire a misleading chord name',()=>{
  const e=chord('g',0);assert.ok(matchesChord(e.frets,7,'major','standard'));assert.equal(eventName(e,'standard'),'G');
  e.frets[0]=4;assert.equal(eventName(e,'standard'),'Custom');
  assert.deepEqual(chordNotes([12,null,null,null,null,0],'standard').map(n=>n.midi),[76,40]);
  assert.equal(eventName({...e,kind:'rest'},'standard'),'Rest');
});
test('text TAB exports six strings, sixteenth counts, rhythm values, rests and sustained notes',()=>{
  let score=placeEvent({...EMPTY_SCORE(),bars:2},chord('a',14));score=placeEvent(score,{...chord('r',20,1),kind:'rest'});
  const text=tabText(score);assert.match(text,/4\/4 \| 80 BPM/);assert.match(text,/Bar 2/);assert.match(text,/beat 4 & · G · Quarter/);assert.match(text,/beat 2 · Rest · Sixteenth/);
  assert.equal(text.split('\n').filter(l=>/^[1-6] /.test(l)).length,12);
  const second=text.split('Bar 2\n')[1];assert.match(second,/--?~/);assert.match(text,/Value \|.*1\/16/);
});
