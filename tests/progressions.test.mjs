import test from 'node:test';
import assert from 'node:assert/strict';
import { CHORDS, SCALES, mod12 } from '../music.js';
import { PROGRESSIONS, PROGRESSION_HELP, getDiatonicChords, getProgression } from '../progressions.js';

test('G major pop progression resolves Roman degrees into G, D, Em and C', () => {
  const progression = getProgression(7, 'major', 'pop');
  assert.equal(progression.keyName, 'G majör');
  assert.equal(progression.roman, 'I–V–vi–IV');
  assert.deepEqual(progression.steps.map(step => step.symbol), ['G', 'D', 'Em', 'C']);
  assert.deepEqual(progression.steps.map(step => step.root), [7, 2, 4, 0]);
  assert.deepEqual(progression.steps.map(step => step.roman), ['I', 'V', 'vi', 'IV']);
});

test('A minor harmonic progression raises G to G sharp for the E major dominant', () => {
  const progression = getProgression(9, 'minor', 'harmonic');
  assert.deepEqual(progression.steps.map(step => step.symbol), ['Am', 'Dm', 'E']);
  assert.deepEqual(progression.steps.map(step => step.roman), ['i', 'iv', 'V']);
  assert.match(progression.steps[2].explanation, /G → G♯/);
  assert.match(progression.steps[2].explanation, /armonik minör/);
  assert.deepEqual(getProgression(9, 'minor', 'natural').steps.map(step => step.symbol), ['Am', 'Dm', 'Em']);
});

test('chord symbols retain scale-degree spelling, including flats and sharp roots', () => {
  assert.deepEqual(getDiatonicChords(5, 'major').map(step => step.symbol), ['F', 'Gm', 'Am', 'B♭', 'C', 'Dm', 'Edim']);
  assert.deepEqual(getDiatonicChords(0, 'minor').map(step => step.symbol), ['Cm', 'Ddim', 'E♭', 'Fm', 'Gm', 'A♭', 'B♭']);
  assert.deepEqual(getDiatonicChords(1, 'major').map(step => step.symbol), ['C♯', 'D♯m', 'E♯m', 'F♯', 'G♯', 'A♯m', 'B♯dim']);
});

test('all major and minor diatonic triads match thirds stacked within their parent scale', () => {
  for (const mode of ['major', 'minor']) {
    for (let root = 0; root < 12; root++) {
      const intervals = SCALES[mode].intervals;
      const chords = getDiatonicChords(root, mode);
      assert.equal(chords.length, 7);
      chords.forEach((step, index) => {
        assert.equal(step.degree, index + 1);
        assert.equal(step.root, mod12(root + intervals[index]));
        const stackedThirds = [0, 2, 4].map(offset => mod12(root + intervals[(index + offset) % 7])).sort((a, b) => a - b);
        const chordPitches = CHORDS[step.chord].intervals.map(interval => mod12(step.root + interval)).sort((a, b) => a - b);
        assert.deepEqual(chordPitches, stackedThirds, `${root} ${mode} degree ${index + 1}`);
        assert.ok(step.role && step.explanation);
      });
    }
  }
});

test('every preset resolves correctly in all keys; harmonic V alone raises the minor seventh', () => {
  const naturalPitches = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  for (const mode of ['major', 'minor']) {
    for (let root = 0; root < 12; root++) {
      for (const definition of PROGRESSIONS[mode]) {
        const progression = getProgression(root, mode, definition.id);
        assert.equal(progression.steps.map(step => step.roman).join('–'), definition.roman);
        for (const step of progression.steps) {
          const [, letter, accidentals] = /^([A-G])([♭♯]*)/.exec(step.symbol);
          const adjustment = [...accidentals].reduce((sum, accidental) => sum + (accidental === '♯' ? 1 : -1), 0);
          assert.equal(mod12(naturalPitches[letter] + adjustment), step.root, step.symbol);
          const parentPitches = SCALES[mode].intervals.map(interval => mod12(root + interval));
          const outside = CHORDS[step.chord].intervals.map(interval => mod12(step.root + interval)).filter(pitch => !parentPitches.includes(pitch));
          assert.deepEqual(outside, mode === 'minor' && definition.id === 'harmonic' && step.degree === 5 ? [mod12(root + 11)] : []);
        }
      }
    }
  }
});

test('minor Roman numbering and help consistently use natural-minor degree numbers', () => {
  assert.deepEqual(getDiatonicChords(9, 'minor').map(step => step.roman), ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']);
  assert.match(PROGRESSION_HELP, /Büyük harf majör, küçük harf minör/);
  assert.match(PROGRESSION_HELP, /doğal minör/);
});

test('invalid input is rejected and resolved data cannot mutate future results', () => {
  assert.throws(() => getProgression(0.5), TypeError);
  assert.throws(() => getDiatonicChords('G'), TypeError);
  assert.throws(() => getProgression(0, 'dorian'), RangeError);
  assert.throws(() => getDiatonicChords(0, '__proto__'), RangeError);
  assert.throws(() => getProgression(0, 'major', 'missing'), RangeError);
  assert.throws(() => getProgression(0, 'minor', 'pop'), RangeError);
  assert.equal(getProgression(19).keyName, 'G majör');
  const result = getProgression(7);
  result.steps[0].symbol = 'changed';
  result.steps.reverse();
  assert.deepEqual(getProgression(7).steps.map(step => step.symbol), ['G', 'D', 'Em', 'C']);
});
