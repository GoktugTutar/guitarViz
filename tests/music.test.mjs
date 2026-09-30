import test from 'node:test';
import assert from 'node:assert/strict';
import { NOTES, TUNINGS, SCALES, CHORDS, mod12, noteName, intervalLabel, degreeLabel, spelledNoteName, buildFretboard, getChordVoicing } from '../music.js';

test('chromatic notes and wrapped intervals work below zero and above an octave', () => {
  assert.equal(NOTES.length, 12);
  assert.equal(mod12(-1), 11);
  assert.equal(noteName(64), 'E');
  assert.equal(noteName(58, 'Bb'), 'B♭');
  assert.equal(intervalLabel(-1), '7');
  assert.equal(intervalLabel(12), 'R');
  assert.equal(intervalLabel(15), '♭3');
});

test('TAB ordering, open strings and octave frets match standard tuning', () => {
  const board = buildFretboard({ root: 4, fretCount: 12 });
  assert.equal(board.length, 6 * 13);
  assert.deepEqual(board.filter(p => p.fret === 0).map(p => p.midi), [64, 59, 55, 50, 45, 40]);
  assert.deepEqual(board.filter(p => p.fret === 12).map(p => p.midi), [76, 71, 67, 62, 57, 52]);
  assert.equal(board.find(p => p.stringIndex === 0 && p.fret === 0).isRoot, true);
  assert.equal(board.find(p => p.stringIndex === 5 && p.fret === 0).isRoot, true);
});

test('C major and A natural minor contain precisely the white piano notes', () => {
  for (const [root, scale] of [[0, 'major'], [9, 'minor']]) {
    const board = buildFretboard({ root, scale, fretCount: 24 });
    const pitches = [...new Set(board.filter(p => p.active).map(p => p.pitchClass))].sort((a, b) => a - b);
    assert.deepEqual(pitches, [0, 2, 4, 5, 7, 9, 11]);
  }
});

test('all scale formulas produce the intended pitch classes in every key', () => {
  for (const [scale, { intervals }] of Object.entries(SCALES)) {
    assert.equal(new Set(intervals).size, intervals.length);
    for (let root = 0; root < 12; root++) {
      const board = buildFretboard({ root, scale, fretCount: 12 });
      const pitches = [...new Set(board.filter(p => p.active).map(p => p.pitchClass))].sort((a, b) => a - b);
      const expected = intervals.map(i => mod12(i + root)).sort((a, b) => a - b);
      assert.deepEqual(pitches, expected, `${NOTES[root]} ${scale}`);
    }
  }
});

test('layer mode includes chord tones outside the selected scale', () => {
  const board = buildFretboard({ root: 0, scale: 'major', chord: '7', mode: 'layer', fretCount: 12 });
  const flatSeventh = board.find(p => p.pitchClass === 10);
  assert.equal(flatSeventh.inScale, false);
  assert.equal(flatSeventh.inChord, true);
  assert.equal(flatSeventh.active, true);
  const chordOnly = buildFretboard({ root: 0, chord: 'major', mode: 'chord', fretCount: 12 });
  assert.deepEqual([...new Set(chordOnly.filter(p => p.active).map(p => p.pitchClass))].sort((a, b) => a - b), [0, 4, 7]);
});

test('alternate tuning changes the open-string MIDI and fret notes correctly', () => {
  const drop = buildFretboard({ tuning: 'dropD', fretCount: 2 });
  assert.equal(drop.find(p => p.stringIndex === 5 && p.fret === 0).midi, 38);
  assert.equal(drop.find(p => p.stringIndex === 5 && p.fret === 2).note, 'E');
  const half = buildFretboard({ tuning: 'halfStepDown', fretCount: 0 });
  assert.deepEqual(half.map(p => p.midi), [63, 58, 54, 49, 44, 39]);
});

test('common open C, D and A minor shapes retain conventional fret positions', () => {
  assert.deepEqual(getChordVoicing(0, 'major').frets, [0, 1, 0, 2, 3, null]);
  assert.deepEqual(getChordVoicing(2, 'major').frets, [2, 3, 2, 0, null, null]);
  assert.deepEqual(getChordVoicing(9, 'minor').frets, [0, 1, 2, 2, 0, null]);
  assert.equal(getChordVoicing(1, 'major', 'open'), null);
});

test('every E/A shape in every key plays all and only the requested chord tones', () => {
  for (let root = 0; root < 12; root++) {
    for (const [chord, { intervals }] of Object.entries(CHORDS)) {
      for (const shape of ['auto', 'E', 'A']) {
        for (const tuning of Object.keys(TUNINGS)) {
          const voicing = getChordVoicing(root, chord, shape, tuning);
          assert.ok(voicing);
          const actual = [...new Set(voicing.notes.map(p => mod12(p.midi - root)))].sort((a, b) => a - b);
          assert.deepEqual(actual, intervals, `${NOTES[root]} ${chord}, ${shape}, ${tuning}`);
          assert.equal(voicing.frets.length, 6);
          assert.ok(voicing.frets.every(fret => fret === null || Number.isInteger(fret) && fret >= 0));
          for (const note of voicing.notes) {
            assert.equal(note.midi, TUNINGS[tuning].notes[note.stringIndex] + note.fret);
          }
        }
      }
    }
  }
});

test('F major E barre and B minor A barre place their roots correctly', () => {
  const f = getChordVoicing(5, 'major', 'E');
  assert.deepEqual(f.frets, [1, 1, 2, 3, 3, 1]);
  assert.deepEqual(f.barre, { fret: 1, fromString: 0, toString: 5 });
  const bm = getChordVoicing(11, 'minor', 'A');
  assert.deepEqual(bm.frets, [2, 3, 4, 4, 2, null]);
  assert.equal(bm.startFret, 2);
});

test('invalid keys, tunings and fret counts report errors', () => {
  assert.throws(() => buildFretboard({ scale: 'unknown' }), RangeError);
  assert.throws(() => buildFretboard({ tuning: [64] }), RangeError);
  assert.throws(() => buildFretboard({ fretCount: -1 }), RangeError);
  assert.throws(() => buildFretboard({ root: 0.5 }), TypeError);
  assert.throws(() => getChordVoicing(0, 'unknown'), RangeError);
});

test('scale spelling preserves diatonic letters in flat and sharp keys', () => {
  const spellScale = (root, scale) => SCALES[scale].intervals.map(interval => spelledNoteName(root, interval, scale));
  assert.deepEqual(spellScale(5, 'major'), ['F', 'G', 'A', 'B♭', 'C', 'D', 'E']);
  assert.deepEqual(spellScale(1, 'major'), ['C♯', 'D♯', 'E♯', 'F♯', 'G♯', 'A♯', 'B♯']);
  assert.deepEqual(spellScale(0, 'minor'), ['C', 'D', 'E♭', 'F', 'G', 'A♭', 'B♭']);
  assert.deepEqual(spellScale(0, 'minorPentatonic'), ['C', 'E♭', 'F', 'G', 'B♭']);
  assert.deepEqual(spellScale(1, 'majorPentatonic'), ['C♯', 'D♯', 'E♯', 'G♯', 'A♯']);
  assert.deepEqual(spellScale(3, 'major'), ['D♯', 'E♯', 'F♯♯', 'G♯', 'A♯', 'B♯', 'C♯♯']);
});

test('blues and diminished chords spell the diminished fifth consistently', () => {
  assert.equal(degreeLabel(6, 'blues'), '♭5');
  assert.equal(degreeLabel(18, 'dim', 'chord'), '♭5');
  assert.equal(degreeLabel(6, 'major'), '♯4');
  assert.deepEqual(SCALES.blues.intervals.map(interval => spelledNoteName(0, interval, 'blues')), ['C', 'E♭', 'F', 'G♭', 'G', 'B♭']);
  assert.deepEqual(CHORDS.dim.intervals.map(interval => spelledNoteName(0, interval, 'dim', 'chord')), ['C', 'E♭', 'G♭']);
});

test('enharmonic spelling preserves pitch across all roots, scales and chords', () => {
  const naturals = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  for (const [kind, definitions] of [['scale', SCALES], ['chord', CHORDS]]) {
    for (const [key, definition] of Object.entries(definitions)) {
      for (let root = 0; root < 12; root++) {
        for (const interval of definition.intervals) {
          const name = spelledNoteName(root, interval, key, kind);
          const accidental = [...name.slice(1)].reduce((sum, symbol) => sum + (symbol === '♯' ? 1 : -1), 0);
          assert.equal(mod12(naturals[name[0]] + accidental), mod12(root + interval), `${name}, ${NOTES[root]} ${key}`);
        }
      }
    }
  }
});

test('fretboard and voicing labels use their active musical context', () => {
  const fMajor = buildFretboard({ root: 5, fretCount: 12 });
  assert.equal(fMajor.find(p => p.pitchClass === 10 && p.active).note, 'B♭');
  const cSharp = buildFretboard({ root: 1, fretCount: 12 });
  assert.equal(cSharp.find(p => p.pitchClass === 5 && p.active).note, 'E♯');
  assert.equal(cSharp.find(p => p.pitchClass === 0 && p.active).note, 'B♯');
  const layer = buildFretboard({ root: 0, scale: 'major', chord: 'dim', mode: 'layer', fretCount: 12 });
  assert.equal(layer.find(p => p.pitchClass === 3).note, 'E♭');
  assert.equal(layer.find(p => p.pitchClass === 6).note, 'G♭');
  assert.equal(layer.find(p => p.pitchClass === 6).interval, '♭5');
  const diminished = getChordVoicing(0, 'dim');
  assert.deepEqual([...new Set(diminished.notes.map(p => p.note))].sort(), ['C', 'E♭', 'G♭']);
  assert.ok(diminished.notes.filter(p => p.pitchClass === 6).every(p => p.interval === '♭5'));
  assert.equal(noteName(10), 'A♯', 'generic chromatic spelling stays unchanged');
});
