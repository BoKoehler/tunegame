# Echoform

A rhythm game that turns any song into a level. Drop in an audio file and Echoform
listens to it in the browser: it finds the beat, the key and chords, the song's
sections and its drops, then builds a chart, visuals and hit sounds around them.
Nothing is uploaded; all analysis runs locally.

The whole game is one file, `index.html`, with no build step and no libraries.

## Play

Open `index.html` in a desktop or mobile browser, or serve the folder with any
static file server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. The song library uses IndexedDB, which some
browsers block for pages opened straight from `file://`, so a server is the
better way to run it.

### Controls

| Action | Keys |
| --- | --- |
| Shards (each one points at its key) | `↑ → ↓ ←` or `W A S D` (or `D F J K` in Settings) |
| Rings closing on the core | `Space` |
| Pause | `Esc` or `P` |
| Restart from pause or results | `R` |
| Volume down / up, mute | `-` / `=`, `M` |

On a touchscreen, tap the side of the screen a shard comes from, and tap the core
for rings.

## What it does

**Listening**

- Beat tracking: a steady grid fitted to the onset envelope, a dynamic-programming
  tracker for live tempo, separate grids for songs that change tempo, and a check
  of 2:3 / 3:2 tempo candidates for syncopated breakbeats.
- On-beat or off-beat: a vote between kick energy, the onset envelope and the
  snare backbeat, so off-beat bass and hats don't pull the grid.
- Key (Krumhansl–Kessler profiles) and chords (24 triads plus "no chord",
  smoothed with Viterbi, with changes favoured on downbeats).
- Song structure from a bar-by-bar self-similarity matrix: sections are found,
  repeats are matched, and each is named (Intro, Verse, Pre-chorus, Chorus, Build,
  Drop, Breakdown, Bridge, Outro).
- Drops (peak loudness, often after a beat of silence), kicks and pre-drop silences.
- Loudness per ITU-R BS.1770, the kick's own pitch, and the song's tonal balance
  for a per-song EQ.

**Playing**

- Three difficulties. Note density follows the song's energy; repeated sections
  replay their first pattern; quiet sections lean on long notes.
- Clarity: misses muffle the music, and the run ends if it fades out completely.
- Fuse and detonation: the ring burns down before each drop; hit the gold ring on
  the drop for double points until the drop ends.
- Musical hit sounds: each hit plays a note from the chord under it.
- A visual world per section, colours that follow the harmony, and the scene
  pumping on the song's own kicks.
- Practice any section at 100, 85 or 70 % speed; Mirror, Hidden and Sudden Death
  mods; a section-by-section report, a timing histogram with a one-click offset
  fix, XP and levels, and a sigil image drawn from every run.
- A track generator that composes original songs (key, voice-led progression,
  hook, drum style, tempo and arrangement), plus a library of your recent songs.
- Volume, per-song loudness matching and a "Punch" EQ, with a limiter.
- Adaptive quality that lowers detail on slow devices.

## Tests

The `tests` folder holds Playwright scripts that drive the game in headless
Chromium against synthetic songs with known tempo, beats, drops and sections.

```bash
npm install            # Playwright, at the repo root
npx playwright install chromium
pip install numpy      # for the song generators
cd tests
python3 gen.py && python3 gen2.py && python3 genpop.py   # writes the test WAVs
ffmpeg -i edm124.wav -b:a 192k edm124.mp3
mkdir -p shots mshots fshots
python3 wrap.py ../index.html game.html
node analyze.js        # beat, tempo and drop accuracy against truth.json
node gen.js            # generated tracks: analysis vs the generator's own truth
node play.js           # a full bot playthrough of the demo
```

Other scripts cover practice and mods (`practice.js`), the song library across a
reload (`library.js`), menus and calibration (`flows.js`), keyboard and file
picker (`keys.js`), phones (`mobile.js`), sound (`sound.js`), pre-drop silences
(`hush.js`), adaptive quality (`quality.js`) and repeated-section patterns
(`pm.js`). `tempo2.js` expects `long.mp3`, the pop and EDM test songs joined:

```bash
ffmpeg -i pop100.wav -i edm124.wav -filter_complex "[0:a][1:a]concat=n=2:v=0:a=1" long.mp3
```
