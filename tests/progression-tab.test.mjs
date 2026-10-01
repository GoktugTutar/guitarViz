import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProgressionTab } from '../progression-tab.js';
import { PROGRESSIONS } from '../progressions.js';
import { CHORDS, TUNINGS, mod12 } from '../music.js';

test('the complete G major pop progression contains four simultaneous chord voicings in TAB order',()=>{
 const tab=buildProgressionTab(7,'major','pop');
 assert.deepEqual(tab.bars.map(b=>b.symbol),['G','D','Em','C']);
 assert.deepEqual(tab.bars.map(b=>b.position.frets),[[3,0,0,0,2,3],[2,3,2,0,null,null],[0,0,0,2,2,0],[0,1,0,2,3,null]]);
 assert.ok(tab.bars.every(b=>b.beats===4));
});
test('each progression occurrence retains its own chosen CAGED voicing',()=>{
 const initial=buildProgressionTab(9,'minor','descent');
 const firstVII=initial.bars[1].positions.find(p=>p.shape==='E');
 const secondVII=initial.bars[3].positions.find(p=>p.shape==='C');
 const tab=buildProgressionTab(9,'minor','descent','standard',{1:firstVII.id,3:secondVII.id});
 assert.equal(tab.bars[1].position.id,firstVII.id);assert.equal(tab.bars[3].position.id,secondVII.id);
 assert.notDeepEqual(tab.bars[1].position.frets,tab.bars[3].position.frets);
 assert.deepEqual(tab.bars[0].position.frets,initial.bars[0].position.frets);
});
test('every bar of every preset in every key and tuning contains its complete chord',()=>{
 for(const tuning of Object.keys(TUNINGS))for(const mode of ['major','minor'])for(const preset of PROGRESSIONS[mode])for(let root=0;root<12;root++){
  const tab=buildProgressionTab(root,mode,preset.id,tuning);
  assert.equal(tab.bars.length,preset.steps.length);
  for(const bar of tab.bars){
   assert.deepEqual([...new Set(bar.position.notes.map(n=>mod12(n.midi-bar.root)))].sort((a,b)=>a-b),CHORDS[bar.chord].intervals);
   for(const note of bar.position.notes)assert.equal(note.midi,TUNINGS[tuning].notes[note.stringIndex]+bar.position.frets[note.stringIndex]);
  }
 }
});
test('flat keys and harmonic minor keep correctly spelled note names in the full TAB',()=>{
 const flat=buildProgressionTab(5,'major','pop').bars[3];
 assert.equal(flat.symbol,'B♭');assert.deepEqual(flat.chordNotes,['B♭','D','F']);
 assert.ok(flat.position.notes.filter(n=>n.pitchClass===10).every(n=>n.note==='B♭'));
 const minor=buildProgressionTab(9,'minor','harmonic');assert.deepEqual(minor.bars.map(b=>b.symbol),['Am','Dm','E']);
 assert.deepEqual(minor.bars[2].chordNotes,['E','G♯','B']);
});
test('position IDs from a different tuning safely fall back to a valid current position',()=>{
 const old=buildProgressionTab(7,'major','pop');
 const drop=buildProgressionTab(7,'major','pop','dropD',{0:old.bars[0].position.id});
 assert.ok(drop.bars.every(b=>b.position.frets[5]===null));
 assert.throws(()=>buildProgressionTab(7,'major','pop','missing'),RangeError);
});
