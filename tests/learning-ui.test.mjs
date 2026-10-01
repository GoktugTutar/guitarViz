import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import FakeTimers from '@sinonjs/fake-timers';

// Exercise the user flows with the real DOM controller and a controllable audio clock.
// This checks interaction/state behavior, not browser layout or audible timbre.
test('learning tabs, chord positions and progression transport work together', async (t) => {
  const dom = new JSDOM(fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8'), {
    url: 'https://goktugtutar.github.io/guitarViz/?tab=chords', pretendToBeVisual: true,
  });
  const { window } = dom;
  const clock = FakeTimers.install({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  Object.assign(globalThis, { window, document: window.document, localStorage: window.localStorage });
  window.matchMedia = () => ({ matches: false });
  window.HTMLElement.prototype.scrollIntoView = function () {};
  // jsdom does not implement native dialog methods; test the actual event wiring.
  window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  window.HTMLDialogElement.prototype.close = function () { this.open = false; };
  const sound = { starts: 0, stops: 0 };
  window.AudioContext = class {
    constructor() { sound.context = this; }
    sampleRate = 22050; state = 'running'; currentTime = 0; destination = {};
    createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; }
    createGain() { return { gain: { value: 0 }, connect() {}, disconnect() {} }; }
    createBufferSource() { return { connect() {}, disconnect() {}, start() { sound.starts++; }, stop() { sound.stops++; } }; }
  };
  try {
    await import('../app.js');
    const $ = s => document.querySelector(s);
    const $$ = s => [...document.querySelectorAll(s)];
    const click = s => { assert.ok($(s), `Missing control ${s}`); $(s).click(); };
    const select = (s, value) => { $(s).value = String(value); $(s).dispatchEvent(new window.Event('change')); };
    const activeNotes = () => $$('.fret-note:not(.inactive)');

    await t.test('guide deep links open Chord Finder and Info explains all tools in English', () => {
      assert.equal($('#tab-chords').getAttribute('aria-selected'), 'true');
      assert.equal($('#chords-panel').hidden, false);
      assert.ok(activeNotes().length > 0 && activeNotes().length <= 6);
      assert.equal(document.documentElement.lang, 'en');
      assert.match($('#help-button').textContent, /Info/);
      click('#help-button');
      assert.equal($('#help-dialog').open, true);
      assert.match($('#help-dialog').textContent, /Explore/);
      assert.match($('#help-dialog').textContent, /Progressions/);
      assert.match($('#help-dialog').textContent, /Chord Finder/);
      assert.match($('#help-dialog').textContent, /G = R \(1\), A = 2/);
      click('#close-help');
      assert.equal($('#help-dialog').open, false);
      click('#help-button'); click('#start-exploring');
      assert.equal($('#help-dialog').open, false);
      assert.doesNotMatch(document.body.textContent, /[çğıöşüÇĞİÖŞÜ]/);
      click('#tab-explore');
    });

    await t.test('Explore settings survive tool use; page tabs support keyboard navigation', () => {
      click('[data-root="9"]'); click('[data-scale="minorPentatonic"]'); click('[data-display="intervals"]');
      const saved = localStorage.getItem('perde-settings');
      click('#tab-progressions');
      assert.equal($('#progressions-panel').hidden, false);
      assert.equal($('#tab-progressions').getAttribute('aria-selected'), 'true');
      assert.deepEqual($$('#progression-steps strong').map(x => x.textContent), ['G', 'D', 'Em', 'C']);
      click('#tab-chords'); select('#finder-root', 0); select('#finder-chord', 'maj7');
      assert.equal(localStorage.getItem('perde-settings'), saved);
      $('#tab-chords').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
      assert.equal($('#tab-explore').getAttribute('aria-selected'), 'true');
      assert.match($('#selection-title').textContent, /A Minor pentatonic/);
      assert.equal($('[data-display="intervals"]').getAttribute('aria-pressed'), 'true');
    });

    await t.test('the full progression TAB shows all chords and preserves independent CAGED choices', () => {
      click('#tab-progressions');select('#progression-root',7);select('#progression-mode','major');
      const frets=bar=>$$(`#progression-tab tbody [data-tab-bar="${bar}"] b`).map(n=>n.textContent);
      assert.deepEqual($$('#progression-tab thead strong').map(n=>n.textContent),['G','D','Em','C']);
      assert.equal($$('#progression-tab tbody tr').length,6);
      assert.equal($$('#progression-tab .progression-tab-onset').length,24);
      assert.deepEqual(frets(0),['3','0','0','0','2','3']);
      const choose=(bar,prefix)=>select(`[data-progression-voicing="${bar}"]`,$$(`[data-progression-voicing="${bar}"] option`).find(o=>o.textContent.startsWith(prefix)).value);
      choose(0,'E shape');choose(1,'A shape');
      assert.deepEqual(frets(0),['3','3','4','5','5','3']);
      assert.deepEqual(frets(1),['5','7','7','7','5','×']);
      click('[data-tab-step="0"]');
      select('#progression-position',$$('#progression-position option').find(o=>o.textContent.startsWith('C shape')).value);
      assert.deepEqual(frets(0),['7','8','7','9','10','×']);
      assert.deepEqual(frets(1),['5','7','7','7','5','×']);
      const before=$$('#progression-tab tbody b').map(n=>n.textContent);
      click('#tab-explore');click('#tab-progressions');
      assert.deepEqual($$('#progression-tab tbody b').map(n=>n.textContent),before);
      $$('#diatonic-chords button')[1].click();
      assert.deepEqual($$('#progression-tab tbody b').map(n=>n.textContent),before);
      assert.match($('#progression-role').textContent,/Diatonic preview/);
      select('#progression-select','jazz');assert.equal($$('#progression-tab thead strong').length,3);
      select('#progression-root',5);select('#progression-select','pop');
      assert.deepEqual($$('#progression-tab thead strong').map(n=>n.textContent),['F','C','Dm','B♭']);
      assert.match($('#progression-tab thead [data-tab-step="3"] small').textContent,/B♭/);
      select('#tuning-select','dropD');
      assert.ok($$('#progression-tab tbody tr:last-child b').every(n=>n.textContent==='×'));
      select('#tuning-select','standard');
    });

    await t.test('a chosen barre position maps exact frets and fingers, with all-notes view distinct', () => {
      click('#tab-chords'); select('#finder-root', 5); select('#finder-chord', 'major');
      assert.match($('#finder-name').textContent, /^F$/);
      assert.deepEqual(activeNotes().map(x => Number(x.dataset.fret)), [1, 1, 2, 3, 3, 1]);
      click('[data-display="fingers"]');
      assert.deepEqual(activeNotes().map(x => x.textContent), ['1', '1', '2', '4', '3', '1']);
      assert.equal($$('.fret-barre').length, 1);
      const first = activeNotes().map(x => x.dataset.fret).join(',');
      click('#next-position');
      assert.notEqual(activeNotes().map(x => x.dataset.fret).join(','), first);
      click('[data-finder-view="all"]');
      assert.ok(activeNotes().length > 6);
      assert.equal($('#finger-display').hidden, true);
      assert.equal($('#finder-all-help').hidden, false);
      assert.equal($('[data-display="notes"]').getAttribute('aria-pressed'), 'true');
      click('[data-finder-view="positions"]');
      select('#finder-root', 2); select('#finder-chord', 'major');
      assert.equal($$('.string-label.muted').length, 2);
      assert.equal($$('#fingering-table tbody tr')[0].textContent.includes('×'), true);
      select('#tuning-select', 'dropD');
      assert.ok(activeNotes().every(x => x.dataset.string !== '5'));
      assert.match($('#position-name').textContent, /Mute string 6/);
      select('#tuning-select', 'standard');
    });

    await t.test('progression chord selection preserves flat key spelling on board and note chips', () => {
      click('#tab-progressions'); select('#progression-root', 5);
      click('#progression-steps [data-step="3"]');
      assert.match($('#selection-title').textContent, /^B♭/);
      assert.deepEqual($$('.note-chip strong').map(x => x.textContent), ['B♭', 'D', 'F']);
      assert.match($('#formula-detail').textContent, /^B♭/);
      assert.ok(activeNotes().filter(x => Number(x.dataset.midi) % 12 === 10).every(x => x.title.includes('B♭')));
      select('#progression-root', 9); select('#progression-mode', 'minor'); select('#progression-select', 'harmonic');
      assert.deepEqual($$('#progression-steps strong').map(x => x.textContent), ['Am', 'Dm', 'E']);
      click('#progression-steps [data-step="2"]');
      assert.match($('#progression-explanation').textContent, /G → G♯/);
      assert.deepEqual($$('.note-chip strong').map(x => x.textContent), ['E', 'G♯', 'B']);
      $$('#diatonic-chords button')[4].click();
      assert.match($('#selection-title').textContent, /^Em/);
      assert.deepEqual($$('.note-chip strong').map(x => x.textContent), ['E', 'G', 'B']);
    });

    await t.test('tempo controls four beats per chord and a complete pass ends playback', async () => {
      select('#progression-mode', 'major'); select('#progression-root', 7);
      $('#progression-tempo').value = '120'; $('#progression-tempo').dispatchEvent(new window.Event('input'));
      assert.equal($('#tempo-value').textContent, '120 BPM');
      const before = sound.starts;
      click('#progression-play'); await clock.tickAsync(0);
      assert.match($('#progression-play').textContent, /Stop/);
      assert.match($('#selection-title').textContent, /^G/);
      assert.ok($('#progression-tab thead th[data-tab-bar="0"]').classList.contains('is-playing'));
      assert.ok($('#progression-tab [data-tab-bar="0"][data-tab-beat="0"]').classList.contains('is-current-beat'));
      assert.ok(sound.starts > before);
      await clock.tickAsync(1999); assert.match($('#selection-title').textContent, /^G/);
      assert.ok($('#progression-tab [data-tab-bar="0"][data-tab-beat="3"]').classList.contains('is-current-beat'));
      await clock.tickAsync(1); assert.match($('#selection-title').textContent, /^D/);
      assert.ok($('#progression-tab thead th[data-tab-bar="1"]').classList.contains('is-playing'));
      await clock.tickAsync(2000); assert.match($('#selection-title').textContent, /^Em/);
      await clock.tickAsync(2000); assert.match($('#selection-title').textContent, /^C/);
      await clock.tickAsync(2000); assert.match($('#progression-play').textContent, /Play progression/);
      assert.equal($$('.beat-meter .active').length, 0);
      assert.equal($$('#progression-tab .is-playing').length,0);
    });

    await t.test('repeat loops; switching tabs and changing tempo cancel pending playback', async () => {
      $('#progression-loop').checked = true; $('#progression-loop').dispatchEvent(new window.Event('change'));
      click('#progression-play'); await clock.tickAsync(8000);
      assert.match($('#progression-play').textContent, /Stop/);
      assert.match($('#selection-title').textContent, /^G/);
      click('#tab-chords'); const starts = sound.starts;
      await clock.tickAsync(10000); assert.equal(sound.starts, starts);
      click('#tab-progressions'); click('#progression-play'); await clock.tickAsync(0);
      $('#progression-tempo').value = '100'; $('#progression-tempo').dispatchEvent(new window.Event('input'));
      const afterTempo = sound.starts;
      await clock.tickAsync(10000); assert.equal(sound.starts, afterTempo);
      assert.match($('#progression-play').textContent, /Play progression/);
    });

    await t.test('the original single-scale play button still stops on its second click', async () => {
      click('#tab-explore'); click('#play-button'); await clock.tickAsync(0);
      assert.match($('#play-button').textContent, /Stop/);
      click('#play-button'); await clock.tickAsync(10000);
      assert.match($('#play-button').textContent, /Play scale/);
      assert.ok(sound.stops > 0);
    });

    await t.test('a pending mobile audio resume cannot start sound after a tab switch', async () => {
      sound.context.state = 'suspended';
      let finishResume;
      sound.context.resume = () => new Promise(resolve => { finishResume = () => { sound.context.state = 'running'; resolve(); }; });
      click('#play-button');
      click('#tab-chords');
      const starts = sound.starts;
      finishResume(); await clock.tickAsync(10000);
      assert.equal(sound.starts, starts);
      assert.match($('#play-button').textContent, /Play chord/);
    });
    await t.test('all five Gmaj7 families appear in Chord Finder and Explorer, including root labels', () => {
      click('#tab-chords');select('#finder-root',7);select('#finder-chord','maj7');
      const buttons=$$('#position-picker button');
      assert.deepEqual([...new Set(buttons.map(b=>b.textContent[0]))].sort(),['A','C','D','E','G']);
      buttons.find(b=>b.textContent.startsWith('C shape · Frets 7–10')).click();
      assert.deepEqual(activeNotes().map(n=>Number(n.dataset.fret)),[7,7,7,9,10]);
      assert.match($('#position-description').textContent,/Root: string 5, fret 10/);
      buttons.find(b=>b.textContent.startsWith('G shape · Frets 12–15')).click();
      assert.deepEqual(activeNotes().map(n=>Number(n.dataset.fret)),[14,12,12,12,14,15]);
      assert.match($('#position-description').textContent,/Root: string 6, fret 15/);
      click('#tab-explore');click('[data-mode="chord"]');click('[data-root="7"]');click('[data-chord="maj7"]');select('#shape-select','C');
      assert.deepEqual(activeNotes().map(n=>Number(n.dataset.fret)),[7,7,7,9,10]);
      assert.match($('#selection-description').textContent,/Root: string 5, fret 10/);
      select('#shape-select','D');
      assert.deepEqual(activeNotes().map(n=>Number(n.dataset.fret)),[7,7,7,5]);
      assert.equal($$('.fret-barre').length,1);
      assert.equal(JSON.parse(localStorage.getItem('perde-settings')).shape,'D');
    });
  } finally {
    window.dispatchEvent(new window.Event('pagehide'));
    clock.uninstall(); dom.window.close();
    delete globalThis.window; delete globalThis.document; delete globalThis.localStorage;
  }
});
