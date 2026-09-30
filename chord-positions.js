import { CHORDS, OPEN_VOICINGS, TUNINGS, degreeLabel, mod12, noteName, spelledNoteName } from './music.js?v=2';

// Every array follows TAB: high e, B, G, D, A, low E. These are explicit
// fingerings, not arbitrary collections of chord tones found on the neck.
const OPEN = [
  ...Object.entries(OPEN_VOICINGS).map(([key, position]) => {
    const [root, chord] = key.split(':');
    return { root: Number(root), chord, ...position };
  }),
  { root: 2, chord: '7', shape: 'D', frets: [2, 1, 2, 0, null, null], fingers: [3, 1, 2, 0, null, null] },
  { root: 4, chord: '7', shape: 'E', frets: [0, 0, 1, 0, 2, 0], fingers: [0, 0, 1, 0, 2, 0] },
  { root: 7, chord: '7', shape: 'G', frets: [1, 0, 0, 0, 2, 3], fingers: [1, 0, 0, 0, 2, 3] },
  { root: 9, chord: '7', shape: 'A', frets: [0, 2, 0, 2, 0, null], fingers: [0, 3, 0, 2, 0, null] },
  { root: 0, chord: 'maj7', shape: 'C', frets: [0, 0, 0, 2, 3, null], fingers: [0, 0, 0, 2, 3, null] },
  { root: 2, chord: 'maj7', shape: 'D', frets: [2, 2, 2, 0, null, null], fingers: [1, 1, 1, 0, null, null] },
  { root: 4, chord: 'maj7', shape: 'E', frets: [0, 0, 1, 1, 2, 0], fingers: [0, 0, 1, 1, 2, 0] },
  { root: 7, chord: 'maj7', shape: 'G', frets: [2, 0, 0, 0, 2, 3], fingers: [1, 0, 0, 0, 2, 3] },
  { root: 9, chord: 'maj7', shape: 'A', frets: [0, 2, 1, 2, 0, null], fingers: [0, 3, 1, 2, 0, null] },
  { root: 2, chord: 'm7', shape: 'D', frets: [1, 1, 2, 0, null, null], fingers: [1, 1, 2, 0, null, null] },
  { root: 4, chord: 'm7', shape: 'E', frets: [0, 0, 0, 0, 2, 0], fingers: [0, 0, 0, 0, 2, 0] },
  { root: 9, chord: 'm7', shape: 'A', frets: [0, 1, 0, 2, 0, null], fingers: [0, 1, 0, 2, 0, null] },
  { root: 4, chord: 'dim', shape: 'E', frets: [null, null, 0, 2, 1, 0], fingers: [null, null, 0, 2, 1, 0] },
  { root: 9, chord: 'dim', shape: 'A', frets: [null, 1, 2, 1, 0, null], fingers: [null, 1, 2, 1, 0, null] },
  { root: 0, chord: 'sus2', shape: 'C', frets: [3, 1, 0, 0, 3, null], fingers: [4, 1, 0, 0, 3, null] },
  { root: 2, chord: 'sus2', shape: 'D', frets: [0, 3, 2, 0, null, null], fingers: [0, 3, 2, 0, null, null] },
  { root: 4, chord: 'sus2', shape: 'E', frets: [0, 0, 4, 4, 2, 0], fingers: [0, 0, 4, 3, 1, 0] },
  { root: 7, chord: 'sus2', shape: 'G', frets: [3, 3, 0, 0, 0, 3], fingers: [4, 3, 0, 0, 0, 2] },
  { root: 9, chord: 'sus2', shape: 'A', frets: [0, 0, 2, 2, 0, null], fingers: [0, 0, 3, 2, 0, null] },
  { root: 0, chord: 'sus4', shape: 'C', frets: [1, 1, 0, 3, 3, null], fingers: [1, 1, 0, 4, 3, null] },
  { root: 2, chord: 'sus4', shape: 'D', frets: [3, 3, 2, 0, null, null], fingers: [4, 3, 2, 0, null, null] },
  { root: 4, chord: 'sus4', shape: 'E', frets: [0, 0, 2, 2, 2, 0], fingers: [0, 0, 3, 2, 1, 0] },
  { root: 7, chord: 'sus4', shape: 'G', frets: [3, 1, 0, 0, 3, 3], fingers: [4, 1, 0, 0, 3, 2] },
  { root: 9, chord: 'sus4', shape: 'A', frets: [0, 3, 2, 2, 0, null], fingers: [0, 4, 3, 2, 0, null] },
];

// Fingers for the closed (base fret > 0) version of each movable shape.
// A dim has no root-fret barre. Its middle finger makes a short barre one
// fret higher; E dim bars only strings 3–6, leaving the top two strings mute.
const MOVABLE = {
  E: {
    major: { frets: [0, 0, 1, 2, 2, 0], fingers: [1, 1, 2, 4, 3, 1] },
    minor: { frets: [0, 0, 0, 2, 2, 0], fingers: [1, 1, 1, 4, 3, 1] },
    '7': { frets: [0, 0, 1, 0, 2, 0], fingers: [1, 1, 2, 1, 3, 1] },
    maj7: { frets: [0, 0, 1, 1, 2, 0], fingers: [1, 1, 2, 2, 3, 1] },
    m7: { frets: [0, 0, 0, 0, 2, 0], fingers: [1, 1, 1, 1, 3, 1] },
    dim: { frets: [null, null, 0, 2, 1, 0], fingers: [null, null, 1, 3, 2, 1] },
    sus2: { frets: [0, 0, 4, 4, 2, 0], fingers: [1, 1, 4, 3, 2, 1] },
    sus4: { frets: [0, 0, 2, 2, 2, 0], fingers: [1, 1, 4, 3, 2, 1] },
  },
  A: {
    major: { frets: [0, 2, 2, 2, 0, null], fingers: [1, 4, 3, 2, 1, null] },
    minor: { frets: [0, 1, 2, 2, 0, null], fingers: [1, 2, 4, 3, 1, null] },
    '7': { frets: [0, 2, 0, 2, 0, null], fingers: [1, 4, 1, 3, 1, null] },
    maj7: { frets: [0, 2, 1, 2, 0, null], fingers: [1, 4, 2, 3, 1, null] },
    m7: { frets: [0, 1, 0, 2, 0, null], fingers: [1, 2, 1, 3, 1, null] },
    dim: { frets: [null, 1, 2, 1, 0, null], fingers: [null, 2, 3, 2, 1, null] },
    sus2: { frets: [0, 0, 2, 2, 0, null], fingers: [1, 1, 4, 3, 1, null] },
    sus4: { frets: [0, 3, 2, 2, 0, null], fingers: [1, 4, 3, 2, 1, null] },
  },
};

function getBarres(frets, fingers) {
  const barres = [];
  for (let finger = 1; finger <= 4; finger++) {
    const strings = fingers.flatMap((value, i) => value === finger ? [i] : []);
    if (strings.length < 2) continue;
    barres.push({ fret: frets[strings[0]], fromString: strings[0], toString: strings.at(-1), finger });
  }
  return barres;
}

/**
 * Playable positions, ordered open first and then from low to high frets.
 * Null means mute; 0 means an open string. Finger numbers are 1–4.
 * firstFret is the first numbered fret to display (the nut is separate).
 *
 * Half-step-down uses a standard-tuning shape one semitone higher, retaining
 * its physical fingering. Drop D uses the unchanged upper five strings and
 * mutes string 6, so no unverified bass-fret stretch is introduced.
 */
export function getChordPositions(root, chord = 'major', tuning = 'standard', maxFret = 24) {
  if (!Number.isInteger(root)) throw new TypeError('Kök nota bir tam sayı olmalı.');
  if (!Object.hasOwn(CHORDS, chord)) throw new RangeError(`Bilinmeyen akor: ${chord}`);
  if (!Object.hasOwn(TUNINGS, tuning)) throw new RangeError(`Bilinmeyen akort: ${tuning}`);
  if (!Number.isInteger(maxFret) || maxFret < 0 || maxFret > 36) {
    throw new RangeError('Perde sayısı 0–36 arasında bir tam sayı olmalı.');
  }
  root = mod12(root);
  const physicalRoot = mod12(root + (tuning === 'halfStepDown' ? 1 : 0));
  const candidates = OPEN.filter(position => position.root === physicalRoot && position.chord === chord);
  for (const shape of ['E', 'A']) {
    const template = MOVABLE[shape][chord];
    const lowestBase = mod12(physicalRoot - (shape === 'E' ? 4 : 9));
    for (let base = lowestBase || 12; base <= maxFret; base += 12) {
      candidates.push({ shape, frets: template.frets.map(fret => fret === null ? null : fret + base), fingers: template.fingers });
    }
  }
  const seen = new Set();
  const positions = [];
  for (const candidate of candidates) {
    const frets = [...candidate.frets];
    const fingers = [...candidate.fingers];
    if (tuning === 'dropD') {
      frets[5] = null;
      fingers[5] = null;
    }
    const played = frets.filter(fret => fret !== null);
    if (!played.length || played.some(fret => fret > maxFret)) continue;
    const key = frets.map(fret => fret === null ? 'x' : fret).join('-');
    if (seen.has(key)) continue;
    const notes = frets.flatMap((fret, stringIndex) => {
      if (fret === null) return [];
      const midi = TUNINGS[tuning].notes[stringIndex] + fret;
      const distance = mod12(midi - root);
      return [{
        stringIndex, fret, midi, pitchClass: mod12(midi),
        note: spelledNoteName(root, distance, chord, 'chord'),
        interval: degreeLabel(distance, chord, 'chord'), isRoot: distance === 0,
      }];
    });
    // A voicing must contain every chord tone, especially after muting the
    // Drop D bass. Never silently turn a selected seventh into a triad.
    const pitches = new Set(notes.map(note => mod12(note.midi - root)));
    const expected = CHORDS[chord].intervals;
    if (pitches.size !== expected.length || !expected.every(interval => pitches.has(interval))) continue;
    seen.add(key);
    const isOpen = played.includes(0);
    const firstFret = isOpen ? 1 : Math.min(...played);
    const name = `${noteName(root)}${CHORDS[chord].symbol}`;
    positions.push({
      id: `${tuning}:${root}:${chord}:${key}`,
      name, shape: candidate.shape,
      label: `${candidate.shape} şekli · ${isOpen ? 'Açık pozisyon' : `${firstFret}. perde`}${tuning === 'dropD' ? ' · 6. tel sessiz' : ''}`,
      frets, fingers, barres: getBarres(frets, fingers), notes, firstFret,
      maxFret: Math.max(...played), isOpen,
    });
  }
  return positions.sort((a, b) => Number(b.isOpen) - Number(a.isOpen) || a.firstFret - b.firstFret || a.maxFret - b.maxFret);
}
