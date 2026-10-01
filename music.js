import { CAGED_SHAPES, SHAPE_ROOTS, getBarres } from './caged-shapes.js?v=6';

/** Guitar theory helpers. String index 0 is the high E string, as in TAB. */
export const NOTES = Object.freeze(['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']);
const FLAT_NOTES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];
const INTERVALS = ['R', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7'];

export const TUNINGS = Object.freeze({
  standard: { name: 'Standard', notes: [64, 59, 55, 50, 45, 40] },
  dropD: { name: 'Drop D', notes: [64, 59, 55, 50, 45, 38] },
  halfStepDown: { name: 'Half step down', notes: [63, 58, 54, 49, 44, 39] },
});

export const SCALES = Object.freeze({
  major: {
    name: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11], formula: '1 · 2 · 3 · 4 · 5 · 6 · 7',
    description: 'Bright and balanced. A foundation for melody, harmony and other scales.',
  },
  minor: {
    name: 'Natural minor', intervals: [0, 2, 3, 5, 7, 8, 10], formula: '1 · 2 · ♭3 · 4 · 5 · ♭6 · ♭7',
    description: 'A darker, expressive color. A foundation for minor melodies.',
  },
  majorPentatonic: {
    name: 'Major pentatonic', intervals: [0, 2, 4, 7, 9], formula: '1 · 2 · 3 · 5 · 6',
    description: 'Five notes for open, flowing melodies. Useful for pop, country and improvisation.',
  },
  minorPentatonic: {
    name: 'Minor pentatonic', intervals: [0, 3, 5, 7, 10], formula: '1 · ♭3 · 4 · 5 · ♭7',
    description: 'The five-note foundation of many blues and rock solos. A useful starting point for exploring the fretboard.',
  },
  blues: {
    name: 'Blues', intervals: [0, 3, 5, 6, 7, 10], formula: '1 · ♭3 · 4 · ♭5 · 5 · ♭7',
    description: 'An added blue note gives the minor pentatonic scale extra tension and character.',
  },
  dorian: {
    name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10], formula: '1 · 2 · ♭3 · 4 · 5 · 6 · ♭7',
    description: 'A minor sound brightened by a natural sixth. Often heard in funk, jazz and modal improvisation.',
  },
  mixolydian: {
    name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10], formula: '1 · 2 · 3 · 4 · 5 · 6 · ♭7',
    description: 'A major sound with a minor seventh. A natural match for dominant seventh chords.',
  },
  harmonicMinor: {
    name: 'Harmonic minor', intervals: [0, 2, 3, 5, 7, 8, 11], formula: '1 · 2 · ♭3 · 4 · 5 · ♭6 · 7',
    description: 'A raised seventh adds a strong pull toward the root of the minor scale.',
  },
});

export const CHORDS = Object.freeze({
  major: { name: 'Major', intervals: [0, 4, 7], symbol: '' },
  minor: { name: 'Minor', intervals: [0, 3, 7], symbol: 'm' },
  '7': { name: 'Dominant 7', intervals: [0, 4, 7, 10], symbol: '7' },
  maj7: { name: 'Major 7', intervals: [0, 4, 7, 11], symbol: 'maj7' },
  m7: { name: 'Minor 7', intervals: [0, 3, 7, 10], symbol: 'm7' },
  dim: { name: 'Diminished', intervals: [0, 3, 6], symbol: 'dim' },
  sus2: { name: 'Sus 2', intervals: [0, 2, 7], symbol: 'sus2' },
  sus4: { name: 'Sus 4', intervals: [0, 5, 7], symbol: 'sus4' },
});

// Degree spellings preserve the letter of each scale/chord tone. Pentatonic
// degrees skip letters; the blues note and diminished fifth use ♭5, not ♯4.
const SCALE_DEGREES = {
  major: ['R', '2', '3', '4', '5', '6', '7'],
  minor: ['R', '2', '♭3', '4', '5', '♭6', '♭7'],
  majorPentatonic: ['R', '2', '3', '5', '6'],
  minorPentatonic: ['R', '♭3', '4', '5', '♭7'],
  blues: ['R', '♭3', '4', '♭5', '5', '♭7'],
  dorian: ['R', '2', '♭3', '4', '5', '6', '♭7'],
  mixolydian: ['R', '2', '3', '4', '5', '6', '♭7'],
  harmonicMinor: ['R', '2', '♭3', '4', '5', '♭6', '7'],
};
const CHORD_DEGREES = {
  major: ['R', '3', '5'], minor: ['R', '♭3', '5'],
  '7': ['R', '3', '5', '♭7'], maj7: ['R', '3', '5', '7'], m7: ['R', '♭3', '5', '♭7'],
  dim: ['R', '♭3', '♭5'], sus2: ['R', '2', '5'], sus4: ['R', '4', '5'],
};
const NOTE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const NATURAL_PITCHES = [0, 2, 4, 5, 7, 9, 11];

export function mod12(value) {
  return ((value % 12) + 12) % 12;
}

/** Flat spelling is available by passing a root such as 'B♭' or 'Bb'. */
export function noteName(value, root) {
  const names = typeof root === 'string' && /[b♭]/.test(root) ? FLAT_NOTES : NOTES;
  return names[mod12(value)];
}

export function intervalLabel(semitones) {
  return INTERVALS[mod12(semitones)];
}

/** Returns the degree spelling for this scale/chord, or the chromatic label. */
export function degreeLabel(semitones, definitionKey = 'major', kind = 'scale') {
  const collection = kind === 'chord' ? CHORDS : SCALES;
  const degrees = kind === 'chord' ? CHORD_DEGREES : SCALE_DEGREES;
  const definition = getDefinition(collection, definitionKey, kind === 'chord' ? 'chord' : 'scale');
  const degreeIndex = definition.intervals.indexOf(mod12(semitones));
  return degreeIndex === -1 ? intervalLabel(semitones) : degrees[definitionKey][degreeIndex];
}

/** Spells a pitch with the correct scale/chord letter, retaining sharp roots. */
export function spelledNoteName(root, interval, definitionKey = 'major', kind = 'scale', rootSpelling = NOTES[mod12(root)]) {
  assertRoot(root);
  const degree = degreeLabel(interval, definitionKey, kind);
  const degreeNumber = degree === 'R' ? 1 : Number(degree.replace(/[♭♯]/g, ''));
  const rootLetter = rootSpelling[0];
  const letterIndex = (NOTE_LETTERS.indexOf(rootLetter) + degreeNumber - 1) % 7;
  const pitch = mod12(root + interval);
  const accidental = mod12(pitch - NATURAL_PITCHES[letterIndex] + 6) - 6;
  return NOTE_LETTERS[letterIndex] + (accidental < 0 ? '♭'.repeat(-accidental) : '♯'.repeat(accidental));
}

function tuningNotes(tuning = 'standard') {
  const notes = Array.isArray(tuning) ? tuning : typeof tuning === 'object' ? tuning?.notes : TUNINGS[tuning]?.notes;
  if (!notes || notes.length !== 6 || !notes.every(Number.isInteger)) {
    throw new RangeError('Tuning must contain MIDI notes for six strings.');
  }
  return notes;
}

function assertRoot(root) {
  if (!Number.isInteger(root)) throw new TypeError('Root note must be an integer.');
}

function getDefinition(collection, key, label) {
  if (!Object.hasOwn(collection, key)) throw new RangeError(`Unknown ${label}: ${key}`);
  return collection[key];
}

export function buildFretboard({
  root = 0, scale = 'major', chord = 'major', mode = 'scale', tuning = 'standard', fretCount = 15, rootSpelling,
} = {}) {
  assertRoot(root);
  if (!Number.isInteger(fretCount) || fretCount < 0 || fretCount > 36) {
    throw new RangeError('Fret count must be an integer between 0 and 36.');
  }
  if (!['scale', 'chord', 'layer'].includes(mode)) throw new RangeError(`Unknown mode: ${mode}`);
  const scaleIntervals = getDefinition(SCALES, scale, 'scale').intervals;
  const chordIntervals = getDefinition(CHORDS, chord, 'chord').intervals;
  return tuningNotes(tuning).flatMap((openMidi, stringIndex) =>
    Array.from({ length: fretCount + 1 }, (_, fret) => {
      const midi = openMidi + fret;
      const pitchClass = mod12(midi);
      const distance = mod12(pitchClass - root);
      const inScale = scaleIntervals.includes(distance);
      const inChord = chordIntervals.includes(distance);
      const active = mode === 'scale' ? inScale : mode === 'chord' ? inChord : inScale || inChord;
      const scaleContext = (mode === 'scale' || mode === 'layer') && inScale;
      const contextKey = scaleContext ? scale : chord;
      const contextKind = scaleContext ? 'scale' : 'chord';
      return {
        stringIndex, fret, midi, pitchClass,
        note: active ? spelledNoteName(root, distance, contextKey, contextKind, rootSpelling) : noteName(midi),
        interval: active ? degreeLabel(distance, contextKey, contextKind) : intervalLabel(distance),
        isRoot: distance === 0, inScale, inChord, active,
      };
    }),
  );
}

/** Frets and fingers use the same high-to-low string order as the fretboard. */
export const OPEN_VOICINGS = Object.freeze({
  '0:major': { shape: 'C', frets: [0, 1, 0, 2, 3, null], fingers: [0, 1, 0, 2, 3, null] },
  '2:major': { shape: 'D', frets: [2, 3, 2, 0, null, null], fingers: [2, 3, 1, 0, null, null] },
  '4:major': { shape: 'E', frets: [0, 0, 1, 2, 2, 0], fingers: [0, 0, 1, 3, 2, 0] },
  '7:major': { shape: 'G', frets: [3, 0, 0, 0, 2, 3], fingers: [3, 0, 0, 0, 1, 2] },
  '9:major': { shape: 'A', frets: [0, 2, 2, 2, 0, null], fingers: [0, 3, 2, 1, 0, null] },
  '9:minor': { shape: 'A', frets: [0, 1, 2, 2, 0, null], fingers: [0, 1, 3, 2, 0, null] },
  '2:minor': { shape: 'D', frets: [1, 3, 2, 0, null, null], fingers: [1, 3, 2, 0, null, null] },
  '4:minor': { shape: 'E', frets: [0, 0, 0, 2, 2, 0], fingers: [0, 0, 0, 3, 2, 0] },
});

// Compatibility export: fret patterns and fingerings share one source of truth.
export const MOVABLE_SHAPES = Object.freeze(Object.fromEntries(Object.entries(CAGED_SHAPES).map(([shape,qualities])=>[shape,Object.freeze(Object.fromEntries(Object.entries(qualities).map(([key,value])=>[key,value.frets])))])));

/**
 * `auto` prefers a common open shape, then the lower E/A shape.
 * `open` returns null when there is no common open voicing for that chord.
 * Down-tunings compensate fret positions to retain the requested chord pitches.
 */
export function getChordVoicing(root, chord = 'major', shape = 'auto', tuning = 'standard') {
  assertRoot(root);
  root = mod12(root);
  const definition = getDefinition(CHORDS, chord, 'chord');
  const open = OPEN_VOICINGS[`${root}:${chord}`];
  let selectedShape;
  let originalFrets;
  let fingers = null;
  let baseFret = 0;
  let isOpen = false;
  if (shape === 'open' || (shape === 'auto' && open)) {
    if (!open) return null;
    selectedShape = open.shape;
    originalFrets = open.frets;
    fingers = [...open.fingers];
    isOpen = true;
  } else {
    selectedShape = shape === 'auto' ? (mod12(root - 4) <= mod12(root - 9) ? 'E' : 'A') : shape;
    if (!Object.hasOwn(MOVABLE_SHAPES, selectedShape)) throw new RangeError(`Unknown chord shape: ${shape}`);
    baseFret = mod12(root - SHAPE_ROOTS[selectedShape]);
    originalFrets = MOVABLE_SHAPES[selectedShape][chord].map(fret => fret === null ? null : fret + baseFret);
    fingers = CAGED_SHAPES[selectedShape][chord].fingers.map((finger,i)=>originalFrets[i]===0?0:finger);
    isOpen = originalFrets.includes(0);
  }
  const openNotes = tuningNotes(tuning);
  const standard = TUNINGS.standard.notes;
  const frets = originalFrets.map((fret, i) => fret === null ? null : fret + standard[i] - openNotes[i]);
  if (frets.some(fret => fret !== null && fret < 0)) return null;
  const standardTuning = openNotes.every((midi, i) => midi === standard[i]);
  if (!standardTuning) fingers = null;
  const notes = frets.flatMap((fret, stringIndex) => {
    if (fret === null) return [];
    const midi = openNotes[stringIndex] + fret;
    const pitchClass = mod12(midi);
    const distance = mod12(pitchClass - root);
    return [{
      stringIndex, fret, midi, pitchClass,
      note: spelledNoteName(root, distance, chord, 'chord'), interval: degreeLabel(distance, chord, 'chord'),
      isRoot: distance === 0,
    }];
  });
  const playedFrets = frets.filter(fret => fret !== null);
  const minimum = Math.min(...playedFrets);
  return {
    name: `${noteName(root)}${definition.symbol}`, shape: selectedShape, frets, fingers, notes,
    isOpen: isOpen && frets.includes(0),
    barres: fingers ? getBarres(frets,fingers) : [],
    barre: !isOpen && standardTuning ? (()=>{const b=getBarres(frets,fingers).find(b=>b.finger===1);return b?{fret:b.fret,fromString:b.fromString,toString:b.toString}:null;})() : null,
    startFret: minimum <= 1 ? 1 : minimum,
    maxFret: Math.max(...playedFrets),
  };
}
