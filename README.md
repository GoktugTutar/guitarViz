# perde. — Guitar Explorer

An interactive horizontal guitar fretboard built with HTML, CSS and JavaScript. Explore scales, chord positions, intervals, TAB and chord progressions on a phone or desktop. No runtime dependencies, database or account required.

**Live app: https://goktugtutar.github.io/guitarViz/**

## Features

- **Explore:** eight scales, eight chord types and a scale/chord overlay. Switch between note names, intervals and fret numbers. Explorer settings persist in the current browser.
- **Progressions:** eight major/minor presets, Roman numerals, chord functions and explanations of the seven diatonic triads. Play four beats per chord at 40–180 BPM, with optional looping.
- **Chord Finder:** see every chord-tone location or browse playable positions with fret and finger numbers, muted strings and barres.
- **TAB Editor:** build 1–8 bars in 4/4 with chords or rests at any sixteenth-note slot. Choose whole, half, quarter, eighth or sixteenth durations, move/edit events, use custom frets (0–24 or mute on each string), and play at 40–180 BPM. Undo/redo, local autosave and plain-text TAB download are included.
- **Info:** a top-right guide to the controls, notation, sound and mobile fretboard navigation.
- Standard, Drop D and half-step-down tunings; 12, 15 or 24 frets; synthesized plucked-string audio.

The high string is at the top, as in TAB. Swipe horizontally on smaller screens. R means the root (degree 1), 0 means an open string and × means mute. Finger numbers are 1 index, 2 middle, 3 ring and 4 pinky.

The position library covers all five CAGED families (C, A, G, E and D) for the eight supported chord types. Shape letters refer to fingering families, not chord names. Altered chord qualities use compact variants where a full grip is impractical. Each returned voicing contains every chord tone, with explicit fingerings and barres. Positions include available octave repeats through fret 24; a shorter neck can hide shapes that do not fit. Chord Finder mutes string 6 in Drop D and checks the remaining chord tones.

For Gmaj7 in standard tuning, the first closed cycle is E (frets 3–5), D (5–7), C (7–10), A (10–12), G (12–15). The open G-family voicing is also available. The C-family root is on string 5, fret 10, even though the grip begins at fret 7. Root-string labels always refer to a sounding root. All views use the shared `caged-shapes.js` templates.

## Writing TAB

Open the [TAB Editor](https://goktugtutar.github.io/guitarViz/?tab=editor). Choose a chord and a suggested position, or change the six fret controls. Select a duration and bar/beat location, then click **Place chord**. The cursor advances by that duration. Empty slots are silent; **Place rest** adds an explicit rest.

Click an event to load it into the controls, change its frets, duration or bar/beat, then click **Update chord** or **Update rest**. Overlaps and events beyond the last bar are rejected without changing the score. Long notes can cross bar lines. Changing the tuning retains fret numbers and recalculates pitches/chord labels.

Custom voicings that do not contain exactly the selected chord tones are labeled **Custom**. Physical playability of custom fingerings is up to the player. Scores save only in the current browser; the download is a text TAB with beat counts, durations and sustain markers. This editor currently uses 4/4 with a sixteenth-note grid; dotted notes and triplets are not included.

## Deployment

GitHub Pages serves the `main` branch from `/ (root)`. Changes to `main` publish automatically. `.nojekyll` keeps the static assets intact. Use the public address on any device; no local server or computer left running is necessary.

## Local development

Use a current Node.js version:

```sh
npm start
# or
node serve.mjs --port 5174
```

Open the printed localhost URL. Alternatively, run `python3 serve.py` (also supports `--port 5174`). Use only one server at a time. ES modules require HTTP; do not open `index.html` directly from disk.

To preview on a phone, connect it to the same Wi-Fi network and open the network address printed by the server. The computer must stay on for local previews. Normal use only needs the public GitHub Pages address.

## Tests

```sh
npm ci
npm test
```

Tests verify music calculations, chord voicings, progression timing, controller interactions, guide links, English content, metadata and the sitemap. jsdom and fake timers are development dependencies; they do not verify actual browser layout or audible timbre.

## Search and learning pages

The app and three static guides have English metadata, canonical URLs and social sharing tags. The home page includes truthful WebApplication structured data. Guide content is readable without JavaScript:

- `/guitarViz/guitar-scales/`
- `/guitarViz/guitar-chords/`
- `/guitarViz/chord-progressions/`

Guide buttons open the relevant tool with `?tab=explore`, `?tab=chords` or `?tab=progressions` (the editor also supports `?tab=editor`). All app query variants canonicalize to the home page.

### Google Search Console setup

1. Add a **URL-prefix property** for `https://goktugtutar.github.io/guitarViz/`.
2. Choose HTML tag verification. Add the exact `google-site-verification` meta tag supplied by the owner's Google account to the home page `<head>`, publish, then click Verify in Search Console. No verification token is included by default.
3. Submit `https://goktugtutar.github.io/guitarViz/sitemap.xml` under Sitemaps.
4. Use URL Inspection to check the home page and guide URLs, then request indexing if needed.

A `robots.txt` inside `/guitarViz/` would not control crawling: robots rules must live at the origin root, `https://goktugtutar.github.io/robots.txt`. Submit the sitemap through Search Console instead. Indexing and ranking are Google's decisions and may take time. Search Console reports Google Search performance, not a count of all site visitors. No visitor analytics or trackers are installed.
