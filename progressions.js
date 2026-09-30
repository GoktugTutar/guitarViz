import { CHORDS, SCALES, mod12, spelledNoteName } from './music.js?v=3';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const QUALITIES = {
  major: ['major', 'minor', 'minor', 'major', 'major', 'minor', 'dim'],
  minor: ['minor', 'dim', 'major', 'minor', 'minor', 'major', 'major'],
};

export const PROGRESSION_HELP = 'Roman numerals show the scale degree a chord is built on. Uppercase means major, lowercase means minor, and ° means diminished. Minor-key degrees follow the natural minor scale: i · ii° · III · iv · v · VI · VII.';

function define(id, name, roman, description, steps) {
  return Object.freeze({
    id, name, roman, description,
    steps: Object.freeze(steps.map(([degree, chord]) => Object.freeze({ degree, chord }))),
  });
}

export const PROGRESSIONS = Object.freeze({
  major: Object.freeze([
    define('pop', 'Pop loop', 'I–V–vi–IV', 'Starting on the tonic, this loop moves from the dominant to the minor sixth-degree chord. IV leads back to I.', [[1, 'major'], [5, 'major'], [6, 'minor'], [4, 'major']]),
    define('jazz', 'ii–V–I resolution', 'ii–V–I', 'The ii chord prepares the dominant, and V resolves to I. This common jazz progression is shown here with triads.', [[2, 'minor'], [5, 'major'], [1, 'major']]),
    define('blues', 'Three essential chords', 'I–IV–V', 'Tonic, subdominant and dominant: the three chords behind many songs. V resolves to I when the loop repeats.', [[1, 'major'], [4, 'major'], [5, 'major']]),
    define('classic', 'Classic pop loop', 'I–vi–IV–V', 'Move from the major tonic to its relative minor, then return to I through IV and V.', [[1, 'major'], [6, 'minor'], [4, 'major'], [5, 'major']]),
  ]),
  minor: Object.freeze([
    define('cinematic', 'Minor pop loop', 'i–VI–III–VII', 'The minor tonic meets three major chords from the natural minor scale. III is the tonic chord of the relative major key.', [[1, 'minor'], [6, 'major'], [3, 'major'], [7, 'major']]),
    define('natural', 'Natural minor progression', 'i–iv–v', 'All three chords belong to the natural minor scale. Minor v lacks the strong leading-tone pull of major V.', [[1, 'minor'], [4, 'minor'], [5, 'minor']]),
    define('harmonic', 'Strong minor resolution', 'i–iv–V', 'Major V raises the seventh degree of natural minor by a semitone. This note from harmonic minor strengthens the return to i.', [[1, 'minor'], [4, 'minor'], [5, 'major']]),
    define('descent', 'Descending minor loop', 'i–VII–VI–VII', 'The bass roots descend through degrees 1, 7 and 6 of natural minor, then return to i through VII.', [[1, 'minor'], [7, 'major'], [6, 'major'], [7, 'major']]),
  ]),
});

const FUNCTIONS = {
  "major": [
    [
      "Tonic · home",
      "The tonal center: a sense of arrival, rest and resolution."
    ],
    [
      "Dominant preparation",
      "Its predominant function prepares a move to V."
    ],
    [
      "Tonic family",
      "Shares two notes with I and adds a softer minor color."
    ],
    [
      "Subdominant · departure",
      "Moves away from the tonic. It can lead to V or return directly to I."
    ],
    [
      "Dominant · tension",
      "Its leading tone lies a semitone below the tonic, creating a pull toward I."
    ],
    [
      "Relative minor",
      "The tonic chord of the relative minor key. It adds a minor color to a major progression."
    ],
    [
      "Leading-tone chord",
      "This diminished triad creates tension and tends to resolve to I."
    ]
  ],
  "minor": [
    [
      "Tonic · home",
      "The minor tonal center: a place to rest and return to."
    ],
    [
      "Dominant preparation",
      "This diminished chord can prepare the dominant region."
    ],
    [
      "Relative major",
      "The tonic chord of the relative major key adds a brighter color to a minor progression."
    ],
    [
      "Subdominant · departure",
      "Moves away from the minor tonic and can lead toward v or V."
    ],
    [
      "Minor dominant",
      "The v chord of natural minor. Without a raised leading tone, its return is gentler than that of major V."
    ],
    [
      "Sixth degree",
      "The major VI chord of natural minor shares two notes with the tonic chord."
    ],
    [
      "Seventh degree",
      "The major VII chord of natural minor has its root a whole step below the tonic."
    ]
  ]
};

function validate(root, mode) {
  if (!Number.isInteger(root)) throw new TypeError('Root note must be an integer.');
  if (!Object.hasOwn(PROGRESSIONS, mode)) throw new RangeError(`Unknown key mode: ${mode}`);
  return mod12(root);
}

function romanFor(degree, chord) {
  const roman = ROMAN[degree - 1];
  return chord === 'minor' ? roman.toLowerCase() : chord === 'dim' ? `${roman.toLowerCase()}°` : roman;
}

function resolveStep(root, mode, { degree, chord }) {
  const interval = SCALES[mode].intervals[degree - 1];
  const name = spelledNoteName(root, interval, mode);
  let [role, explanation] = FUNCTIONS[mode][degree - 1];
  if (mode === 'minor' && degree === 5 && chord === 'major') {
    const naturalSeventh = spelledNoteName(root, 10, 'minor');
    const raisedSeventh = spelledNoteName(root, 11, 'harmonicMinor');
    const tonic = spelledNoteName(root, 0, mode);
    role = 'Major dominant · strong resolution';
    explanation = `Raise the seventh degree of natural minor by a semitone: ${naturalSeventh} → ${raisedSeventh}. This is the major third of V and leads toward ${tonic}. The V chord therefore comes from harmonic minor.`;
  }
  return { root: mod12(root + interval), chord, symbol: `${name}${CHORDS[chord].symbol}`, roman: romanFor(degree, chord), degree, role, explanation };
}

/** Seven diatonic triads, numbered relative to the selected major/natural-minor scale. */
export function getDiatonicChords(root, mode = 'major') {
  root = validate(root, mode);
  return QUALITIES[mode].map((chord, index) => resolveStep(root, mode, { degree: index + 1, chord }));
}

/** Resolve a preset into correctly spelled chord symbols and guitar-ready pitch classes. */
export function getProgression(root, mode = 'major', id) {
  root = validate(root, mode);
  const definition = id === undefined ? PROGRESSIONS[mode][0] : PROGRESSIONS[mode].find(item => item.id === id);
  if (!definition) throw new RangeError(`Unknown progression: ${id}`);
  return {
    ...definition,
    keyName: `${spelledNoteName(root, 0, mode)} ${mode === 'major' ? 'major' : 'minor'}`,
    mode,
    steps: definition.steps.map(step => resolveStep(root, mode, step)),
  };
}
