/** CAGED-family voicings in high-e-to-low-E TAB order.
 * Frets are offsets from each family's virtual open-string position.
 * Fingers describe the closed version; notes at fret zero use finger 0.
 * Altered qualities use compact variants where a full grip is impractical.
 * A shape family is not a chord name: each template transposes to any root.
 */
export const CAGED_ORDER = Object.freeze(['C', 'A', 'G', 'E', 'D']);
export const SHAPE_ROOTS = Object.freeze({ C:0, A:9, G:7, E:4, D:2 });
export const ROOT_ANCHORS = Object.freeze({
  C:{stringIndex:4,offset:3}, A:{stringIndex:4,offset:0},
  G:{stringIndex:5,offset:3}, E:{stringIndex:5,offset:0}, D:{stringIndex:3,offset:0},
});
export const CAGED_SHAPES = {
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
  C: {
    major: { frets: [0, 1, 0, 2, 3, null], fingers: [1, 2, 1, 3, 4, null] },
    minor: { frets: [null, 1, 0, 1, 3, null], fingers: [null, 3, 1, 2, 4, null] },
    '7': { frets: [3, null, 3, 2, 3, null], fingers: [4, null, 3, 1, 2, null] },
    maj7: { frets: [0, 0, 0, 2, 3, null], fingers: [1, 1, 1, 3, 4, null] },
    m7: { frets: [3, 4, 3, 1, 3, null], fingers: [3, 4, 3, 1, 2, null] },
    dim: { frets: [2, 4, null, 1, 3, null], fingers: [2, 4, null, 1, 3, null] },
    sus2: { frets: [3, 1, 0, 0, 3, null], fingers: [4, 2, 1, 1, 3, null] },
    sus4: { frets: [1, 1, 0, 3, 3, null], fingers: [2, 2, 1, 4, 3, null] },
  },
  G: {
    major: { frets: [3, 0, 0, 0, 2, 3], fingers: [4, 1, 1, 1, 2, 3] },
    minor: { frets: [3, 3, 3, 0, null, 3], fingers: [3, 3, 3, 1, null, 2] },
    '7': { frets: [1, 0, 0, 0, 2, 3], fingers: [2, 1, 1, 1, 3, 4] },
    maj7: { frets: [2, 0, 0, 0, 2, 3], fingers: [2, 1, 1, 1, 3, 4] },
    m7: { frets: [3, 3, 3, 3, null, 3], fingers: [3, 3, 3, 3, null, 2] },
    dim: { frets: [null, 2, 3, 5, null, 3], fingers: [null, 1, 2, 4, null, 3] },
    sus2: { frets: [3, 3, 0, 0, 0, 3], fingers: [4, 4, 1, 1, 1, 3] },
    sus4: { frets: [3, 1, 0, 0, 3, 3], fingers: [4, 2, 1, 1, 3, 3] },
  },
  D: {
    major: { frets: [2, 3, 2, 0, null, null], fingers: [3, 4, 2, 1, null, null] },
    minor: { frets: [1, 3, 2, 0, null, null], fingers: [2, 4, 3, 1, null, null] },
    '7': { frets: [2, 1, 2, 0, null, null], fingers: [4, 2, 3, 1, null, null] },
    maj7: { frets: [2, 2, 2, 0, null, null], fingers: [3, 3, 3, 1, null, null] },
    m7: { frets: [1, 1, 2, 0, null, null], fingers: [2, 2, 3, 1, null, null] },
    dim: { frets: [1, 3, 1, 0, null, null], fingers: [3, 4, 2, 1, null, null] },
    sus2: { frets: [0, 3, 2, 0, null, null], fingers: [1, 4, 3, 1, null, null] },
    sus4: { frets: [3, 3, 2, 0, null, null], fingers: [4, 4, 3, 1, null, null] },
  },

};
for (const family of Object.values(CAGED_SHAPES)) {
  for (const voicing of Object.values(family)) {Object.freeze(voicing.frets);Object.freeze(voicing.fingers);Object.freeze(voicing);}
  Object.freeze(family);
}
Object.freeze(CAGED_SHAPES);

export function getBarres(frets, fingers) {
  const barres=[];
  for(let finger=1;finger<=4;finger++){
    const strings=fingers.flatMap((value,i)=>value===finger?[i]:[]);
    if(strings.length>1)barres.push({fret:frets[strings[0]],fromString:strings[0],toString:strings.at(-1),finger});
  }
  return barres;
}
