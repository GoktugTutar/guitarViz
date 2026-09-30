# perde. — Guitar Explorer

An interactive horizontal guitar fretboard built with HTML, CSS and JavaScript. Explore scales, chord positions, intervals, TAB and chord progressions on a phone or desktop. No runtime dependencies, database or account required.

**Live app: https://goktugtutar.github.io/guitarViz/**

## Features

- **Explore:** eight scales, eight chord types and a scale/chord overlay. Switch between note names, intervals and fret numbers. Explorer settings persist in the current browser.
- **Progressions:** eight major/minor presets, Roman numerals, chord functions and explanations of the seven diatonic triads. Play four beats per chord at 40–180 BPM, with optional looping.
- **Chord Finder:** see every chord-tone location or browse playable positions with fret and finger numbers, muted strings and barres.
- **Info:** a top-right guide to the controls, notation, sound and mobile fretboard navigation.
- Standard, Drop D and half-step-down tunings; 12, 15 or 24 frets; synthesized plucked-string audio.

The high string is at the top, as in TAB. Swipe horizontally on smaller screens. R means the root (degree 1), 0 means an open string and × means mute. Finger numbers are 1 index, 2 middle, 3 ring and 4 pinky.

The position library currently covers common open chords and movable E/A shapes. It is **not a complete five-shape CAGED library**. Some open C/G/D shapes are included. Chord Finder mutes string 6 in Drop D to retain verified fingerings on the upper strings.

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

Guide buttons open the relevant tool with `?tab=explore`, `?tab=chords` or `?tab=progressions`. All app query variants canonicalize to the home page.

### Google Search Console setup

1. Add a **URL-prefix property** for `https://goktugtutar.github.io/guitarViz/`.
2. Choose HTML tag verification. Add the exact `google-site-verification` meta tag supplied by the owner's Google account to the home page `<head>`, publish, then click Verify in Search Console. No verification token is included by default.
3. Submit `https://goktugtutar.github.io/guitarViz/sitemap.xml` under Sitemaps.
4. Use URL Inspection to check the home page and guide URLs, then request indexing if needed.

A `robots.txt` inside `/guitarViz/` would not control crawling: robots rules must live at the origin root, `https://goktugtutar.github.io/robots.txt`. Submit the sitemap through Search Console instead. Indexing and ranking are Google's decisions and may take time. Search Console reports Google Search performance, not a count of all site visitors. No visitor analytics or trackers are installed.
