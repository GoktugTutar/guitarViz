import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import FakeTimers from '@sinonjs/fake-timers';
import { initTabEditor } from '../tab-editor.js';

// Use the complete app so tab switching and audio cancellation are covered too.
test('TAB Editor composes, edits, saves and plays rhythmic guitar parts',async t=>{
  const dom=new JSDOM(fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://goktugtutar.github.io/guitarViz/?tab=editor',pretendToBeVisual:true});
  const {window}=dom;const clock=FakeTimers.install({toFake:['setTimeout','clearTimeout','performance']});
  Object.assign(globalThis,{window,document:window.document,localStorage:window.localStorage});
  window.matchMedia=()=>({matches:false});window.HTMLElement.prototype.scrollIntoView=function(){};
  const audio={starts:[],stops:0};
  window.AudioContext=class{constructor(){audio.context=this;}sampleRate=8000;state='running';currentTime=0;destination={};createBuffer(channels,length){return {length,getChannelData:()=>new Float32Array(length)};}createGain(){return {gain:{value:0},connect(){},disconnect(){}};}createBufferSource(){return {connect(){},disconnect(){},start(){audio.starts.push({time:performance.now(),duration:this.buffer.length/8000});},stop(){audio.stops++;}};}};
  try{
    await import('../app.js');
    const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],click=s=>{assert.ok($(s),s);$(s).click();};
    const select=(s,value)=>{$(s).value=String(value);$(s).dispatchEvent(new window.Event('change'));};
    const saved=()=>JSON.parse(localStorage.getItem('perde-tab-score-v1'));
    await t.test('direct links open the editor; chord positions and rhythms become vertical TAB events',()=>{
      assert.equal($('#tab-editor').getAttribute('aria-selected'),'true');assert.equal($('#explore-panel').hidden,true);
      select('#editor-bars',1);select('#editor-tempo',120);select('#editor-root',0);
      click('[data-duration="4"]');click('#editor-add');
      assert.deepEqual(saved().events[0].frets,[0,1,0,2,3,null]);
      assert.equal(saved().events[0].duration,4);assert.equal(saved().events[0].start,0);
      assert.deepEqual($$('.score-event .score-note b').map(n=>n.textContent),['0','1','0','2','3','×']);
      assert.equal($('#editor-beat').value,'4');
      select('#editor-root',7);select('#editor-position',1);click('[data-duration="1"]');click('#editor-add');
      assert.equal(saved().events[1].duration,1);assert.equal(saved().events[1].start,4);
      assert.equal($('.score-event:last-child').style.gridColumn,'5 / span 1');
    });
    await t.test('events can be moved, overlapping edits fail, and custom frets are never mislabeled',()=>{
      click('.score-event');select('#editor-beat',4);click('#editor-add');
      assert.match($('#editor-message').textContent,/occupied/);assert.equal(saved().events[0].start,0);
      select('#editor-beat',8);select('[data-editor-string="0"]',10);click('#editor-add');
      assert.deepEqual(saved().events.map(e=>e.start),[4,8]);assert.equal(saved().events[1].frets[0],10);
      assert.ok($$('.score-event strong').some(n=>n.textContent==='Custom'));
      click('#editor-undo');assert.deepEqual(saved().events.map(e=>e.start),[0,4]);
      click('#editor-redo');assert.deepEqual(saved().events.map(e=>e.start),[4,8]);
      click('.score-event');click('#editor-delete');assert.equal(saved().events.length,1);
      click('#editor-undo');assert.equal(saved().events.length,2);
    });
    await t.test('rests, bar limits, tuning, clearing and undo preserve the score',()=>{
      click('#editor-clear');assert.equal(saved().events.length,0);click('#editor-undo');assert.equal(saved().events.length,2);
      select('#editor-bars',2);select('#editor-bar',1);select('#editor-beat',0);click('[data-duration="8"]');click('#editor-rest');
      assert.equal(saved().events.at(-1).kind,'rest');select('#editor-bars',1);assert.equal(saved().bars,2);assert.match($('#editor-message').textContent,/notes in the bars/);
      select('#editor-tuning','dropD');assert.equal(saved().tuning,'dropD');click('#editor-undo');assert.equal(saved().tuning,'standard');
      select('#editor-tempo','');assert.equal(saved().bpm,120);assert.match($('#editor-message').textContent,/40 to 180/);
    });
    await t.test('quarter, sixteenth and rest durations control note attacks and silence at 120 BPM',async()=>{
      click('#editor-clear');select('#editor-bars',1);select('#editor-root',0);select('#editor-position',0);
      click('[data-duration="4"]');click('#editor-add'); // C at tick 0 (500 ms)
      click('[data-duration="1"]');click('#editor-add'); // C at tick 4 (125 ms)
      click('#editor-rest'); // rest at tick 5
      click('#editor-add'); // C at tick 6
      const before=audio.starts.length;click('#editor-play');await clock.tickAsync(0);
      assert.equal(audio.starts.length-before,5);assert.match($('#editor-play').textContent,/Stop/);
      assert.ok(audio.starts.slice(before).every(n=>n.duration<=0.5&&n.duration>0.45));
      await clock.tickAsync(499);assert.equal(audio.starts.length-before,5);
      await clock.tickAsync(1);assert.equal(audio.starts.length-before,10);
      assert.ok(audio.starts.slice(-5).every(n=>n.duration<=0.125));
      const stopped=audio.stops;await clock.tickAsync(125);assert.equal(audio.starts.length-before,10);assert.ok(audio.stops>stopped);
      await clock.tickAsync(125);assert.equal(audio.starts.length-before,15);
      await clock.tickAsync(1250);assert.match($('#editor-play').textContent,/Play TAB/);
      assert.equal($$('.is-playing').length,0);
    });
    await t.test('looping, edits and tab changes stop old playback; pending audio resume is canceled',async()=>{
      $('#editor-loop').checked=true;$('#editor-loop').dispatchEvent(new window.Event('change'));
      const before=audio.starts.length;click('#editor-play');await clock.tickAsync(2000);assert.equal(audio.starts.length-before,20);assert.match($('#editor-play').textContent,/Stop/);
      click('#tab-explore');const count=audio.starts.length;await clock.tickAsync(5000);assert.equal(audio.starts.length,count);assert.equal($('#explore-panel').hidden,false);
      click('#tab-editor');click('#editor-play');await clock.tickAsync(0);select('#editor-root',5);const edited=audio.starts.length;await clock.tickAsync(5000);assert.equal(audio.starts.length,edited);
      audio.context.state='suspended';let resolve;audio.context.resume=()=>new Promise(r=>{resolve=()=>{audio.context.state='running';r();};});
      click('#editor-play');click('#tab-chords');const waiting=audio.starts.length;resolve();await clock.tickAsync(5000);assert.equal(audio.starts.length,waiting);
    });
    await t.test('reopening the editor restores exact saved frets and rhythms',()=>{
      const previous=saved();window.dispatchEvent(new window.Event('pagehide'));
      // A fresh controller reads only persisted data, without access to previous state.
      initTabEditor({stopAudio(){},prepareAudio:async()=>true,playTimedChord(){},stopOthers(){}});
      assert.equal($$('.score-event').length,previous.events.length);
      assert.equal($('#editor-tempo').value,String(previous.bpm));
      assert.deepEqual($$('.score-event').map(el=>el.style.gridColumn),previous.events.map(e=>`${e.start+1} / span ${e.duration}`));
      assert.deepEqual($$('.score-event')[0].querySelectorAll('.score-note b').length,6);
    });
  }finally{window.dispatchEvent(new window.Event('pagehide'));clock.uninstall();dom.window.close();delete globalThis.window;delete globalThis.document;delete globalThis.localStorage;}
});
