import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import FakeTimers from '@sinonjs/fake-timers';

// Exercise the user flows with the real DOM controller and a controllable audio clock.
// This checks interaction/state behavior, not browser layout or audible timbre.
test('learning tabs, chord positions and progression transport work together', async (t) => {
  const dom = new JSDOM(fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8'), {
    url: 'https://goktugtutar.github.io/guitarViz/', pretendToBeVisual: true,
  });
  const { window } = dom;
  const clock = FakeTimers.install({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  Object.assign(globalThis, { window, document: window.document, localStorage: window.localStorage });
  window.matchMedia = () => ({ matches: false });
  window.HTMLElement.prototype.scrollIntoView = function () {};
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

    await t.test('Keşfet settings survive tool use; page tabs support keyboard navigation', () => {
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
      assert.match($('#selection-title').textContent, /A Minör pentatonik/);
      assert.equal($('[data-display="intervals"]').getAttribute('aria-pressed'), 'true');
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
      assert.match($('#position-name').textContent, /6. tel sessiz/);
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
      assert.match($('#progression-play').textContent, /Durdur/);
      assert.match($('#selection-title').textContent, /^G/);
      assert.ok(sound.starts > before);
      await clock.tickAsync(1999); assert.match($('#selection-title').textContent, /^G/);
      await clock.tickAsync(1); assert.match($('#selection-title').textContent, /^D/);
      await clock.tickAsync(2000); assert.match($('#selection-title').textContent, /^Em/);
      await clock.tickAsync(2000); assert.match($('#selection-title').textContent, /^C/);
      await clock.tickAsync(2000); assert.match($('#progression-play').textContent, /Yürüyüşü dinle/);
      assert.equal($$('.beat-meter .active').length, 0);
    });

    await t.test('repeat loops; switching tabs and changing tempo cancel pending playback', async () => {
      $('#progression-loop').checked = true; $('#progression-loop').dispatchEvent(new window.Event('change'));
      click('#progression-play'); await clock.tickAsync(8000);
      assert.match($('#progression-play').textContent, /Durdur/);
      assert.match($('#selection-title').textContent, /^G/);
      click('#tab-chords'); const starts = sound.starts;
      await clock.tickAsync(10000); assert.equal(sound.starts, starts);
      click('#tab-progressions'); click('#progression-play'); await clock.tickAsync(0);
      $('#progression-tempo').value = '100'; $('#progression-tempo').dispatchEvent(new window.Event('input'));
      const afterTempo = sound.starts;
      await clock.tickAsync(10000); assert.equal(sound.starts, afterTempo);
      assert.match($('#progression-play').textContent, /Yürüyüşü dinle/);
    });

    await t.test('the original single-scale play button still stops on its second click', async () => {
      click('#tab-explore'); click('#play-button'); await clock.tickAsync(0);
      assert.match($('#play-button').textContent, /Durdur/);
      click('#play-button'); await clock.tickAsync(10000);
      assert.match($('#play-button').textContent, /Gamı dinle/);
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
      assert.match($('#play-button').textContent, /Akoru dinle/);
    });
  } finally {
    window.dispatchEvent(new window.Event('pagehide'));
    clock.uninstall(); dom.window.close();
    delete globalThis.window; delete globalThis.document; delete globalThis.localStorage;
  }
});
