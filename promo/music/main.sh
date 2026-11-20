#!/usr/bin/env bash
# Builds the main cut's 16 s, 120 BPM track (media/music.wav) and the sound effects both cuts
# use (media/tick.wav, slash.wav, thump.wav, sweep.wav).
# One bar = 2 s = 16 sixteenth steps of 0.125 s; chords A minor, F, C, G, one per bar.
#   0-16 s  kick, clap, hats, pumping saw bass, square arpeggio
#   8-16 s  + "slash" shakers: offbeats, then 8ths, then 16ths
# Run from the promo folder: bash music/main.sh
set -euo pipefail
MEDIA="$(pwd)/media"
T="$(mktemp -d)"
cd "$T"
R=(-r 44100 -c 1)
S=0.125

# ---- sound effects
sox -n "${R[@]}" "$MEDIA/tick.wav" synth 0.04 sine 1800 fade 0 0.04 0.035 vol 0.5
sox -n "${R[@]}" "$MEDIA/slash.wav" synth 0.22 whitenoise vol 0.6 bandpass 2500 1500 fade 0.02 0.22 0.15
sox -n "${R[@]}" "$MEDIA/thump.wav" synth 0.12 sine 220:110 fade 0 0.12 0.1 vol 0.7
sox -n "${R[@]}" "$MEDIA/sweep.wav" synth 0.5 pinknoise vol 0.6 sinc 300-6000 fade 0.35 0.5 0.12

# ---- one-shot sounds
sox -n "${R[@]}" kick.wav synth 0.18 sine 150:45 fade 0 0.18 0.12 vol 1.0
sox -n "${R[@]}" clap.wav synth 0.12 whitenoise vol 0.5 bandpass 1500 900 fade 0 0.12 0.1
sox -n "${R[@]}" hat.wav synth 0.03 whitenoise vol 0.18 highpass 8000 fade 0 0.03 0.025
sox -n "${R[@]}" ohat.wav synth 0.11 whitenoise vol 0.22 highpass 6000 fade 0 0.11 0.09
sox -n "${R[@]}" sl.wav synth 0.1 whitenoise vol 0.5 sinc 2500-9000 fade p 0.06 0.1 0.03
sox -n "${R[@]}" slA.wav synth 0.11 whitenoise vol 0.75 sinc 1800-9000 fade p 0.07 0.11 0.03

# ---- a 2 s bar from a 16-step pattern: x = sound, X = accented alternative, . = rest
pat() { # out pattern sound [accent]
  local out=$1 p=$2 snd=$3 acc=${4:-$3} files=() i c f
  for i in $(seq 0 15); do
    c=${p:$i:1}; f="st_${out%.wav}_$i.wav"
    case $c in
      x) sox "$snd" "$f" pad 0 1 trim 0 $S 2>/dev/null ;;
      X) sox "$acc" "$f" pad 0 1 trim 0 $S 2>/dev/null ;;
      *) sox -n "${R[@]}" "$f" trim 0 $S ;;
    esac
    files+=("$f")
  done
  sox "${files[@]}" "$out"
}
pat k.wav "x...x...x...x..." kick.wav
pat c.wav "....x.......x..." clap.wav
pat h.wav "xx.xxx.xxx.xxx.x" hat.wav
pat o.wav "..x...x...x...x." ohat.wav
for x in k c h o; do sox $x.wav ${x}8.wav repeat 7; done

pat sh0.wav "................" sl.wav
pat sh1.wav "..X...X...X...X." sl.wav slA.wav
pat sh2.wav "X.x.X.x.X.x.X.x." sl.wav slA.wav
pat sh3.wav "XxxxXxxxXxxxXxXx" sl.wav slA.wav
sox sh0.wav sh0.wav sh0.wav sh0.wav sh1.wav sh2.wav sh3.wav sh3.wav shaker.wav

# ---- bass: eighth notes, one chord root per bar
for n in A1 F1 C2 G1; do
  files=()
  for i in $(seq 0 7); do
    f="b_${n}_$i.wav"
    sox -n "${R[@]}" "$f" synth 0.25 sawtooth $n vol 0.22 lowpass 500 fade 0.005 0.25 0.12
    files+=("$f")
  done
  sox "${files[@]}" "bar_$n.wav"
done
sox bar_A1.wav bar_F1.wav bar_C2.wav bar_G1.wav bass8.wav
sox bass8.wav bass16.wav repeat 1

# ---- arpeggio: sixteenth notes over each chord
arp() { local out=$1 files=() i=0 n f; shift
  for n in "$@"; do f="a_${out%.wav}_$i.wav"; i=$((i + 1))
    sox -n "${R[@]}" "$f" synth $S square "$n" vol 0.07 lowpass 2500 fade 0.003 $S 0.08; files+=("$f"); done
  sox "${files[@]}" "$out"; }
arp arA.wav A4 C5 E5 A5 E5 C5 A4 C5 E5 A5 E5 C5 A4 C5 E5 C5
arp arF.wav F4 A4 C5 F5 C5 A4 F4 A4 C5 F5 C5 A4 F4 A4 C5 A4
arp arC.wav C5 E5 G5 C6 G5 E5 C5 E5 G5 C6 G5 E5 C5 E5 G5 E5
arp arG.wav G4 B4 D5 G5 D5 B4 G4 B4 D5 G5 D5 B4 G4 B4 D5 B4
sox arA.wav arF.wav arC.wav arG.wav arp8.wav
sox arp8.wav arp16.wav repeat 1

sox -m k8.wav -v 0.8 c8.wav h8.wav o8.wav bass16.wav arp16.wav -v 0.9 shaker.wav mix.wav 2>/dev/null
sox mix.wav -c 2 "$MEDIA/music.wav" trim 0 16 fade 0 16 1.2 norm -1
soxi -D "$MEDIA/music.wav"
rm -rf "$T"
