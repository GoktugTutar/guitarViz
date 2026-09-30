import { CHORDS, SCALES, mod12, spelledNoteName } from './music.js?v=2';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const QUALITIES = {
  major: ['major', 'minor', 'minor', 'major', 'major', 'minor', 'dim'],
  minor: ['minor', 'dim', 'major', 'minor', 'minor', 'major', 'major'],
};

export const PROGRESSION_HELP = 'Romen rakamı, akorun gamın kaçıncı notasından kurulduğunu gösterir. Büyük harf majör, küçük harf minör, ° ise eksiltilmiş akordur. Minörde dereceler doğal minör gama göredir: i · ii° · III · iv · v · VI · VII.';

function define(id, name, roman, description, steps) {
  return Object.freeze({
    id, name, roman, description,
    steps: Object.freeze(steps.map(([degree, chord]) => Object.freeze({ degree, chord }))),
  });
}

export const PROGRESSIONS = Object.freeze({
  major: Object.freeze([
    define('pop', 'Pop döngüsü', 'I–V–vi–IV', 'Tonikten başlayan bu döngü, dominanttan minör altıncı dereceye geçer. IV, yeniden I akoruna bağlanır.', [[1, 'major'], [5, 'major'], [6, 'minor'], [4, 'major']]),
    define('jazz', 'ii–V–I çözülmesi', 'ii–V–I', 'ii akoru dominantı hazırlar, V ise I akoruna çözülür. Cazda sık kullanılan bu yürüyüş burada üç sesli akorlarla gösterilir.', [[2, 'minor'], [5, 'major'], [1, 'major']]),
    define('blues', 'Üç temel akor', 'I–IV–V', 'Tonik, subdominant ve dominant: pek çok şarkının temel üç akoru. Döngü tekrarında V, I akoruna çözülür.', [[1, 'major'], [4, 'major'], [5, 'major']]),
    define('classic', 'Klasik pop döngüsü', 'I–vi–IV–V', 'Majör tonikten ilgili minör akora geçer; IV ve V üzerinden tekrar I akoruna döner.', [[1, 'major'], [6, 'minor'], [4, 'major'], [5, 'major']]),
  ]),
  minor: Object.freeze([
    define('cinematic', 'Minör pop döngüsü', 'i–VI–III–VII', 'Minör tonik, doğal minör gamın üç majör akoruyla renklenir. III akoru ilgili majörün tonik akorudur.', [[1, 'minor'], [6, 'major'], [3, 'major'], [7, 'major']]),
    define('natural', 'Doğal minör yürüyüş', 'i–iv–v', 'Üç akor da doğal minör gamın içindedir. Minör v, majör V kadar güçlü bir yeden gerilimi yaratmaz.', [[1, 'minor'], [4, 'minor'], [5, 'minor']]),
    define('harmonic', 'Güçlü minör çözülme', 'i–iv–V', 'Son akor majör V olur: doğal minörün 7. derecesi yarım ses yükseltilir. Armonik minörden gelen bu ses, i akoruna dönüşü güçlendirir.', [[1, 'minor'], [4, 'minor'], [5, 'major']]),
    define('descent', 'İnen minör döngü', 'i–VII–VI–VII', 'Bas kökleri doğal minörün 1., 7. ve 6. derecelerine iner; VII üzerinden yeniden i akoruna döner.', [[1, 'minor'], [7, 'major'], [6, 'major'], [7, 'major']]),
  ]),
});

const FUNCTIONS = {
  major: [
    ['Tonik · ev', 'Tonal merkezdir; başlangıç, dinlenme ve bitiş hissi verir.'],
    ['Dominant hazırlığı', 'Subdominant işleviyle V akoruna geçişi hazırlar.'],
    ['Tonik ailesi', 'I akoruyla iki ortak sesi paylaşır; daha yumuşak bir minör renk verir.'],
    ['Subdominant · açılma', 'Tonikten uzaklaşır; V akoruna ilerleyebilir veya doğrudan I akoruna dönebilir.'],
    ['Dominant · gerilim', 'İçindeki yeden, tonik notanın yarım ses altındadır; I akoruna çözülme eğilimi yaratır.'],
    ['İlgili minör', 'İlgili minörün tonik akorudur. Majör yürüyüşe minör bir renk katar.'],
    ['Yeden akoru', 'Eksiltilmiş üçlü, gerilim yaratır ve I akoruna çözülme eğilimindedir.'],
  ],
  minor: [
    ['Tonik · ev', 'Minör tonal merkezdir; yürüyüşün dinlenme ve dönüş noktasıdır.'],
    ['Dominant hazırlığı', 'Eksiltilmiş akor, dominant bölgesine geçişte kullanılabilir.'],
    ['İlgili majör', 'İlgili majörün tonik akorudur; minör yürüyüşe daha aydınlık bir renk verir.'],
    ['Subdominant · açılma', 'Minör tonikten uzaklaşmayı ve v ya da V akoruna geçişi sağlar.'],
    ['Minör dominant', 'Doğal minörün v akorudur. Yükseltilmiş yeden içermediği için V akorundan daha yumuşak bir dönüş verir.'],
    ['Altıncı derece', 'Doğal minörün majör VI akorudur; tonikle iki ortak ses paylaşır.'],
    ['Yedinci derece', 'Doğal minörün majör VII akorudur. Kökü, tonik notanın bir tam ses altındadır.'],
  ],
};

function validate(root, mode) {
  if (!Number.isInteger(root)) throw new TypeError('Kök nota bir tam sayı olmalı.');
  if (!Object.hasOwn(PROGRESSIONS, mode)) throw new RangeError(`Bilinmeyen tonalite: ${mode}`);
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
    role = 'Majör dominant · güçlü dönüş';
    explanation = `Doğal minörün 7. derecesi yarım ses yükselir: ${naturalSeventh} → ${raisedSeventh}. Bu ses V akorunun majör üçlüsüdür ve ${tonic} notasına çözülmek ister. V akoru bu nedenle armonik minörden gelir.`;
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
  if (!definition) throw new RangeError(`Bilinmeyen progresyon: ${id}`);
  return {
    ...definition,
    keyName: `${spelledNoteName(root, 0, mode)} ${mode === 'major' ? 'majör' : 'minör'}`,
    mode,
    steps: definition.steps.map(step => resolveStep(root, mode, step)),
  };
}
