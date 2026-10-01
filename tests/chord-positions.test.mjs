import test from 'node:test';
import assert from 'node:assert/strict';
import { CHORDS, OPEN_VOICINGS, TUNINGS, degreeLabel, mod12, spelledNoteName } from '../music.js';
import { getChordPositions } from '../chord-positions.js';

test('all roots and chord types have distinct playable alternatives in each supported tuning', () => {
  for (const tuning of Object.keys(TUNINGS)) {
    for (let root = 0; root < 12; root++) {
      for (const [chord, definition] of Object.entries(CHORDS)) {
        const positions = getChordPositions(root, chord, tuning);
        const context = `${root} ${chord} ${tuning}`;
        assert.ok(positions.length >= 2, context);
        assert.deepEqual([...new Set(positions.map(position=>position.shape))].sort(), ['A','C','D','E','G'], `every family must be available: ${context}`);
        assert.equal(new Set(positions.map(position => position.id)).size, positions.length, context);
        assert.equal(new Set(positions.map(position => JSON.stringify(position.frets))).size, positions.length, context);
        for (const position of positions) {
          assert.equal(position.frets.length, 6, context);
          assert.equal(position.fingers.length, 6, context);
          assert.equal(position.notes.length, position.frets.filter(fret => fret !== null).length, context);
          const intervals = [...new Set(position.notes.map(note => mod12(note.midi - root)))].sort((a, b) => a - b);
          assert.deepEqual(intervals, definition.intervals, context);
          assert.equal(position.isOpen, position.frets.includes(0), context);
          const played = position.frets.filter(fret => fret !== null);
          assert.equal(position.maxFret, Math.max(...played), context);
          assert.equal(position.firstFret, position.isOpen ? 1 : Math.min(...played), context);
          assert.ok(position.maxFret <= 24, context);
          assert.ok(position.notes.some(note=>note.stringIndex+1===position.rootString && note.fret===position.rootFret && note.isRoot), `root label must name a sounding root: ${context}`);
          for (const note of position.notes) {
            assert.equal(note.fret, position.frets[note.stringIndex], context);
            assert.equal(note.midi, TUNINGS[tuning].notes[note.stringIndex] + note.fret, context);
            assert.equal(note.pitchClass, mod12(note.midi), context);
            const distance = mod12(note.midi - root);
            assert.equal(note.note, spelledNoteName(root, distance, chord, 'chord'), context);
            assert.equal(note.interval, degreeLabel(distance, chord, 'chord'), context);
          }
        }
      }
    }
  }
});

test('Gmaj7 spans the complete E-D-C-A-G cycle with the specified roots and fret ranges', () => {
  const positions=getChordPositions(7,'maj7');
  const cycle=positions.filter(p=>!p.isOpen).slice(0,5);
  assert.deepEqual(cycle.map(p=>p.shape),['E','D','C','A','G']);
  assert.deepEqual(cycle.map(p=>[p.firstFret,p.maxFret,p.rootString,p.rootFret]),[
    [3,5,6,3],[5,7,4,5],[7,10,5,10],[10,12,5,10],[12,15,6,15],
  ]);
  // Independent TAB examples below run low E to high e.
  assert.deepEqual(cycle.map(p=>[...p.frets].reverse()),[
    [3,5,4,4,3,3], [null,null,5,7,7,7], [null,10,9,7,7,7],
    [null,10,12,11,12,10], [15,14,12,12,12,14],
  ]);
  for(const position of cycle)assert.deepEqual([...new Set(position.notes.map(n=>n.note))].sort(),['B','D','F♯','G']);
  assert.deepEqual(positions[0].frets,[2,0,0,0,2,3]);
  assert.deepEqual(cycle[2].barres,[{fret:7,fromString:0,toString:2,finger:1}]);
});

test('C-family dominant seventh keeps its fifth; G-family major seventh uses separate outer fingers', () => {
  const c7=getChordPositions(0,'7').find(p=>p.shape==='C');
  assert.deepEqual([...c7.frets].reverse(),[null,3,2,3,null,3]);
  assert.deepEqual([...new Set(c7.notes.map(n=>n.note))].sort(),['B♭','C','E','G']);
  const gmaj7=getChordPositions(7,'maj7').find(p=>p.shape==='G'&&!p.isOpen);
  assert.deepEqual(gmaj7.fingers,[2,1,1,1,3,4]);
  assert.deepEqual(gmaj7.barres,[{fret:12,fromString:1,toString:3,finger:1}]);
});

test('fingers, open strings, muted strings and barres describe physically coherent shapes', () => {
  for (const tuning of Object.keys(TUNINGS)) {
    for (let root = 0; root < 12; root++) {
      for (const chord of Object.keys(CHORDS)) {
        for (const position of getChordPositions(root, chord, tuning)) {
          const context = position.id;
          for (const [i, fret] of position.frets.entries()) {
            if (fret === null) assert.equal(position.fingers[i], null, context);
            else if (fret === 0) assert.equal(position.fingers[i], 0, context);
            else {
              assert.ok(Number.isInteger(fret) && fret > 0, context);
              assert.ok(Number.isInteger(position.fingers[i]) && position.fingers[i] >= 1 && position.fingers[i] <= 4, context);
            }
          }
          const pressed = position.frets.filter(fret => fret > 0);
          assert.ok(Math.max(...pressed) - Math.min(...pressed) <= 4, context);
          for (let finger = 1; finger <= 4; finger++) {
            const strings = position.fingers.flatMap((value, i) => value === finger ? [i] : []);
            const fingerFrets = new Set(strings.map(i => position.frets[i]));
            assert.ok(fingerFrets.size <= 1, `one finger cannot hold two frets: ${context}`);
            const barre = position.barres.find(value => value.finger === finger);
            if (strings.length <= 1) {
              assert.equal(barre, undefined, context);
              continue;
            }
            assert.ok(barre, `repeated finger must have a barre: ${context}`);
            assert.equal(barre.fromString, strings[0], context);
            assert.equal(barre.toString, strings.at(-1), context);
            assert.equal(barre.fret, position.frets[strings[0]], context);
            for (let i = barre.fromString; i <= barre.toString; i++) {
              assert.ok(position.frets[i] !== null && position.frets[i] >= barre.fret, `barre cannot cover an open/lower/muted string: ${context}`);
            }
          }
        }
      }
    }
  }
});

test('familiar open C, D, E, G, A, Am, Dm and Em fingerings are preserved', () => {
  for (const [key, expected] of Object.entries(OPEN_VOICINGS)) {
    const [root, chord] = key.split(':');
    const position = getChordPositions(Number(root), chord)[0];
    assert.deepEqual(position.frets, expected.frets, key);
    assert.deepEqual(position.fingers, expected.fingers, key);
    assert.equal(position.isOpen, true, key);
  }
});

test('known seventh and suspended open positions contain the complete requested chord', () => {
  for (const [root, chord, frets] of [
    [2, '7', [2, 1, 2, 0, null, null]],
    [0, 'maj7', [0, 0, 0, 2, 3, null]],
    [2, 'm7', [1, 1, 2, 0, null, null]],
    [9, 'sus2', [0, 0, 2, 2, 0, null]],
    [2, 'sus4', [3, 3, 2, 0, null, null]],
  ]) assert.deepEqual(getChordPositions(root, chord)[0].frets, frets);
});

test('diminished shapes show only the actual short barres and keep muted strings clear', () => {
  const edimShape = getChordPositions(5, 'dim').find(position => position.shape === 'E');
  assert.deepEqual(edimShape.frets, [null, null, 1, 3, 2, 1]);
  assert.deepEqual(edimShape.barres, [{ fret: 1, fromString: 2, toString: 5, finger: 1 }]);
  const adimShape = getChordPositions(10, 'dim').find(position => position.shape === 'A');
  assert.deepEqual(adimShape.frets, [null, 2, 3, 2, 1, null]);
  assert.deepEqual(adimShape.barres, [{ fret: 2, fromString: 1, toString: 3, finger: 2 }]);
});

test('closed positions repeat one octave higher when they fit the neck', () => {
  const positions = getChordPositions(5, 'major');
  const low = positions.find(position => position.shape === 'E' && position.firstFret === 1);
  const octave = positions.find(position => position.shape === 'E' && position.firstFret === 13);
  assert.deepEqual(octave.frets, low.frets.map(fret => fret === null ? null : fret + 12));
  assert.deepEqual(octave.fingers, low.fingers);
  for (const limit of [0, 3, 12, 15, 24]) {
    for (const chord of Object.keys(CHORDS)) {
      assert.ok(getChordPositions(0, chord, 'standard', limit).every(position => position.maxFret <= limit));
    }
  }
});

test('alternate tunings preserve physical fingerings and never require an invented bass stretch', () => {
  const halfStepE = getChordPositions(4, 'major', 'halfStepDown')[0];
  assert.deepEqual(halfStepE.frets, [1, 1, 2, 3, 3, 1]);
  assert.deepEqual(halfStepE.notes.map(note => note.midi), [64, 59, 56, 52, 47, 40]);
  const halfStepEb = getChordPositions(3, 'major', 'halfStepDown')[0];
  assert.deepEqual(halfStepEb.frets, OPEN_VOICINGS['4:major'].frets);
  assert.equal(halfStepEb.isOpen, true);
  for (const position of getChordPositions(5, 'major', 'dropD')) {
    assert.equal(position.frets[5], null);
    assert.equal(position.fingers[5], null);
    assert.ok(position.barres.every(barre => barre.toString < 5));
  }
});

test('invalid inputs fail clearly and calls return independent arrays', () => {
  assert.throws(() => getChordPositions(0.5), TypeError);
  assert.throws(() => getChordPositions(0, 'mystery'), RangeError);
  assert.throws(() => getChordPositions(0, 'major', 'unknown'), RangeError);
  assert.throws(() => getChordPositions(0, 'major', 'standard', -1), RangeError);
  assert.throws(() => getChordPositions(0, 'major', 'standard', 24.5), RangeError);
  const position = getChordPositions(0)[0];
  position.frets[0] = 99;
  position.fingers[1] = 99;
  assert.deepEqual(getChordPositions(0)[0].frets, [0, 1, 0, 2, 3, null]);
  assert.deepEqual(getChordPositions(0)[0].fingers, [0, 1, 0, 2, 3, null]);
});
