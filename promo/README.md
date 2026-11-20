# SlashFacts promo videos

The promo videos, written in Rust with [fframes](https://github.com/dmtrKovalenko/fframes):
every frame is an SVG drawn from code, and ffmpeg encodes the result. This folder is a
standalone Cargo project; it isn't part of the app or its build.

| cut | binary | format | length |
| --- | --- | --- | --- |
| Main: the app answering a few facts, the slogan, the outro | `slashfacts-promo` | 1080×1920, or 1920×1080 with `--features landscape` | 14.5 s |
| Pop art: same start, then a drop in the app's palette, phones everywhere, a black hole | `pop` (needs `--features landscape`) | 1920×1080 | 41 s |

| file | what |
| --- | --- |
| `src/lib.rs` | the main cut: the phone, the keypad and its strokes, the slogan and the outro |
| `src/pop.rs` | the pop-art cut, reusing the main cut's phone and opening scenes |
| `src/main.rs`, `src/bin/pop.rs` | the command line of each cut (`fframes::cli`) |
| `music/main.sh` | the main cut's music and the sound effects both cuts use |
| `music/pop.sh` | the pop-art cut's music |
| `media/` | what the binaries embed: the app's Archivo fonts (links to `apps/mobile/assets/fonts/`) and the generated audio |

## Build

It needs macOS (the renderer uses Metal), [Rust](https://rustup.rs), [SoX](https://sox.sourceforge.net)
and the libraries ffmpeg is built with:

```sh
brew install sox pkg-config ffmpeg x264 x265 opus nasm ninja
```

The audio isn't committed: synthesise it first, from this folder.

```sh
bash music/main.sh   # media/music.wav, tick.wav, slash.wav, thump.wav, sweep.wav
bash music/pop.sh    # media/pop_music.wav
```

The noise in the drums and effects is random, so each run sounds the same but isn't
bit-identical.

## Preview and render

```sh
cargo run --release -- preview                                   # main cut, portrait, in a window with sound
cargo run --release --features landscape -- preview              # main cut, landscape
cargo run --release --features landscape --bin pop -- preview 12s

cargo run --release -- render -o slashfacts-promo-9x16.mp4
cargo run --release --features landscape -- render -o slashfacts-promo-16x9.mp4
cargo run --release --features landscape --bin pop -- render -o slashfacts-pop-16x9.mp4
```

The portrait and landscape builds compile different code, so give them separate target
folders to avoid rebuilding each time: `CARGO_TARGET_DIR=target-landscape` for the
landscape ones.

Other commands check a cut without watching it: `timeline` (scenes and audio), `inspect`
(missing fonts, clipped text, invalid SVG), `strip 12s..20s -n 8` (a contact sheet),
`frame 13.6s` (a full-size PNG) and `audio analyze` (loudness). Run any of them with
`--help`.
