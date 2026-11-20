#!/usr/bin/env bash
# Builds media/pop_music.wav: the 41 s, 120 BPM placeholder track of the pop-art cut.
# One bar = 2 s = 16 sixteenth steps of 0.125 s.
#   bars 0-3   (0-8 s)   intro: kick, clap, hats, bass, arpeggio (same as the main cut)
#   bar 4      (8-10 s)  + slash shakers on the offbeats
#   bar 5      (10-12 s) build: snare roll 8ths -> 16ths, riser, shakers in 16ths, kick drops out
#   bars 6-9   (12-20 s) DROP: impact, sub, crash, full drums, pumping saw bass, saw arpeggio
#   bars 10-11 (20-24 s) groove: drums, bass and arpeggio keep going under the flying phones
#   bars 12-15 (24-32 s) groove for the carousel and the endless zoom
#   bars 16-17 (32-36 s) accelerate: kick back, 8ths -> 16ths roll, riser, shakers
#   bar 18     (36-38 s) collapse: everything sucked into a falling sweep
#   38-41 s              end hit and a held chord
# Run from the project folder: bash music/pop.sh
set -euo pipefail
OUT="$(pwd)/media/pop_music.wav"
T="$(mktemp -d)"
cd "$T"
R=(-r 44100 -c 1)
S=0.125

# ---- one-shot sounds
sox -n "${R[@]}" kick.wav synth 0.2 sine 160:45 fade 0 0.2 0.14 vol 1.0
sox -n "${R[@]}" clap.wav synth 0.12 whitenoise vol 0.5 bandpass 1500 900 fade 0 0.12 0.1
sox -n "${R[@]}" snare_n.wav synth 0.15 whitenoise vol 0.45 bandpass 2200 1800 fade 0 0.15 0.12
sox -n "${R[@]}" snare_t.wav synth 0.15 sine 190:150 vol 0.4 fade 0 0.15 0.12
sox -m snare_n.wav snare_t.wav snare.wav
sox -n "${R[@]}" hat.wav synth 0.03 whitenoise vol 0.18 highpass 8000 fade 0 0.03 0.025
sox -n "${R[@]}" ohat.wav synth 0.11 whitenoise vol 0.22 highpass 6000 fade 0 0.11 0.09
sox -n "${R[@]}" sl.wav synth 0.1 whitenoise vol 0.5 sinc 2500-9000 fade p 0.06 0.1 0.03
sox -n "${R[@]}" slA.wav synth 0.11 whitenoise vol 0.75 sinc 1800-9000 fade p 0.07 0.11 0.03
sox -n "${R[@]}" crash.wav synth 2.0 whitenoise vol 0.35 highpass 3500 fade 0 2.0 1.9
sox -n "${R[@]}" sub.wav synth 1.2 sine 62:38 vol 0.9 fade 0 1.2 1.0
sox -n "${R[@]}" silence2.wav trim 0 2

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
# 32nd-note roll over one 2 s bar (for the very end of a build)
roll32() { local out=$1 snd=$2 files=() i f
  for i in $(seq 0 31); do f="r32_${out%.wav}_$i.wav"; sox "$snd" "$f" pad 0 1 trim 0 0.0625 2>/dev/null; files+=("$f"); done
  sox "${files[@]}" "$out"; }

pat k4.wav   "x...x...x...x..." kick.wav
pat kbuild.wav "x...x...x......." kick.wav
pat k8.wav   "x.x.x.x.x.x.x.x." kick.wav
pat kdrop.wav "x...x...x...x.xx" kick.wav
pat c24.wav  "....x.......x..." clap.wav
pat h16.wav  "xx.xxx.xxx.xxx.x" hat.wav
pat hfull.wav "xxxxxxxxxxxxxxxx" hat.wav
pat o8.wav   "..x...x...x...x." ohat.wav
pat sh1.wav  "..X...X...X...X." sl.wav slA.wav
pat sh2.wav  "X.x.X.x.X.x.X.x." sl.wav slA.wav
pat sh3.wav  "XxxxXxxxXxxxXxXx" sl.wav slA.wav
pat sn8_16.wav "x.x.x.x.xxxxxxxx" snare.wav
pat sn16.wav "xxxxxxxxxxxxxxxx" snare.wav
roll32 sn32.wav snare.wav

# ---- tonal parts: one bar per chord (A minor, F, C, G)
bass_bar() { # out note [octave-jump note] wave
  local out=$1 n=$2 hi=${3:-$2} wave=${4:-sawtooth} files=() i f note
  for i in $(seq 0 7); do
    note=$n; [ $((i % 2)) -eq 1 ] && note=$hi
    f="b_${out%.wav}_$i.wav"
    sox -n "${R[@]}" "$f" synth 0.25 $wave "$note" vol 0.22 lowpass 520 fade 0.005 0.25 0.11
    files+=("$f")
  done
  sox "${files[@]}" "$out"
}
arp_bar() { # out wave vol lowpass notes...
  local out=$1 wave=$2 vol=$3 lp=$4; shift 4; local files=() i=0 n f
  for n in "$@"; do f="a_${out%.wav}_$i.wav"; i=$((i + 1))
    sox -n "${R[@]}" "$f" synth $S $wave "$n" vol "$vol" lowpass "$lp" fade 0.003 $S 0.08; files+=("$f"); done
  sox "${files[@]}" "$out"
}
A=(A4 C5 E5 A5 E5 C5 A4 C5 E5 A5 E5 C5 A4 C5 E5 C5)
F=(F4 A4 C5 F5 C5 A4 F4 A4 C5 F5 C5 A4 F4 A4 C5 A4)
C=(C5 E5 G5 C6 G5 E5 C5 E5 G5 C6 G5 E5 C5 E5 G5 E5)
G=(G4 B4 D5 G5 D5 B4 G4 B4 D5 G5 D5 B4 G4 B4 D5 B4)
for ch in A F C G; do
  eval "notes=(\"\${$ch[@]}\")"
  arp_bar "arp_$ch.wav" square 0.07 2500 "${notes[@]}"
  # drop arpeggio: an octave up, brighter saw
  up=(); for n in "${notes[@]}"; do up+=("${n%?}$(( ${n: -1} + 1 ))"); done
  arp_bar "arpd_$ch.wav" sawtooth 0.05 6000 "${up[@]}"
done
bass_bar bass_A.wav A1; bass_bar bass_F.wav F1; bass_bar bass_C.wav C2; bass_bar bass_G.wav G1
bass_bar bassd_A.wav A1 A2; bass_bar bassd_F.wav F1 F2; bass_bar bassd_C.wav C2 C3; bass_bar bassd_G.wav G1 G2
pad() { sox -n "${R[@]}" "$1" synth 2 sine "$2" sine "$3" sine "$4" vol 0.05 fade 0.3 2 0.4; }
pad pad_A.wav A3 C4 E4; pad pad_F.wav F3 A3 C4; pad pad_C.wav C4 E4 G4; pad pad_G.wav G3 B3 D4
sox -n "${R[@]}" riser.wav synth 2 sine 300:2400 vol 0.12 fade q 1.9 2 0.05
sox -n "${R[@]}" riser_n.wav synth 2 whitenoise vol 0.25 highpass 2000 fade q 1.9 2 0.05
sox -m riser.wav riser_n.wav riser2.wav
sox -n "${R[@]}" fall.wav synth 2 sine 1400:30 vol 0.35 fade 0 2 0.3
sox crash.wav suck.wav reverse

# ---- mix one bar: bar out file1 [file2 ...] (each 2 s long)
# Every part keeps the same level (sox -m would otherwise divide by the number of parts,
# making the fullest bars, the drop, the quietest). 32-bit float avoids clipping before the
# final normalisation.
bar() { local out=$1; shift; local args=() f
  for f in "$@"; do args+=(-v 0.5 "$f"); done
  sox -m "${args[@]}" -e floating-point -b 32 "$out" trim 0 2 2>/dev/null; }
chords=(A F C G)
n=0
for b in 0 1 2 3 4; do ch=${chords[$((b % 4))]}
  parts=(k4.wav c24.wav h16.wav o8.wav "bass_$ch.wav" "arp_$ch.wav")
  [ $b -eq 4 ] && parts+=(sh1.wav)
  bar "bar$n.wav" "${parts[@]}"; n=$((n + 1)); done
# bar 5: build
bar "bar$n.wav" kbuild.wav sn8_16.wav sh2.wav h16.wav riser2.wav arp_A.wav; n=$((n + 1))
# bars 6-9: drop
for b in 0 1 2 3; do ch=${chords[$b]}
  parts=(kdrop.wav c24.wav hfull.wav o8.wav sh3.wav "bassd_$ch.wav" "arpd_$ch.wav")
  [ $b -eq 0 ] && parts+=(sub.wav crash.wav)
  [ $b -eq 2 ] && parts+=(crash.wav)
  bar "bar$n.wav" "${parts[@]}"; n=$((n + 1)); done
# bars 10-11: groove, no breakdown
for ch in A F; do
  bar "bar$n.wav" k4.wav c24.wav h16.wav o8.wav sh2.wav "bassd_$ch.wav" "arpd_$ch.wav"; n=$((n + 1))
done
# bars 12-15: groove (carousel, then the endless zoom with a fuller kick)
for ch in C G; do
  bar "bar$n.wav" k4.wav c24.wav hfull.wav o8.wav sh1.wav "bassd_$ch.wav" "arpd_$ch.wav"; n=$((n + 1))
done
for ch in A F; do
  bar "bar$n.wav" kdrop.wav c24.wav hfull.wav o8.wav sh3.wav "bassd_$ch.wav" "arpd_$ch.wav"; n=$((n + 1))
done
# bars 16-17: accelerate
bar "bar$n.wav" k4.wav sh2.wav "bass_C.wav" "arp_C.wav" h16.wav; n=$((n + 1))
bar "bar$n.wav" k8.wav sn16.wav sh3.wav riser2.wav "arpd_G.wav" "bassd_G.wav"; n=$((n + 1))
# bar 18: collapse
bar "bar$n.wav" fall.wav suck.wav sn32.wav; n=$((n + 1))
# 38-41 s: end hit, held chord
sox -n "${R[@]}" endpad.wav synth 3 sine A3 sine C4 sine E4 sine A4 vol 0.25 fade 0 3 1.4
sox -n "${R[@]}" silence3.wav trim 0 3
sox -m -v 0.5 kick.wav -v 0.5 sub.wav -v 0.5 crash.wav -v 0.5 endpad.wav -v 0.5 silence3.wav -e floating-point -b 32 endhit.wav 2>/dev/null
sox endhit.wav end.wav trim 0 3
files=(); for i in $(seq 0 $((n - 1))); do files+=("bar$i.wav"); done
sox "${files[@]}" end.wav -e floating-point -b 32 all.wav
sox all.wav -c 2 -b 16 "$OUT" norm -1
soxi -D "$OUT"
