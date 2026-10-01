import { CHORDS, TUNINGS, mod12, spelledNoteName } from './music.js?v=6';
import { getProgression } from './progressions.js?v=6';
import { getChordPositions } from './chord-positions.js?v=6';

/** One complete, playable bar per progression step, with independent voicings. */
export function buildProgressionTab(root, mode, id, tuning='standard', selections={}) {
  if(!Object.hasOwn(TUNINGS,tuning))throw new RangeError(`Unknown tuning: ${tuning}`);
  const progression=getProgression(root,mode,id);
  const bars=progression.steps.map((step,index)=>{
    const positions=getChordPositions(step.root,step.chord,tuning,24);
    const position=positions.find(p=>p.id===selections[index])||positions[0];
    const rootSpelling=step.symbol.match(/^[A-G][♯♭]*/)[0];
    const notes=position.notes.map(note=>({...note,note:spelledNoteName(step.root,mod12(note.midi-step.root),step.chord,'chord',rootSpelling)}));
    return {...step,index,beats:4,positions,position:{...position,notes},
      chordNotes:CHORDS[step.chord].intervals.map(interval=>spelledNoteName(step.root,interval,step.chord,'chord',rootSpelling)),
    };
  });
  return {...progression,tuning,bars};
}
