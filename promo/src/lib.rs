//! SlashFacts promo: a 14.5 s motion-design clip in the app's black-and-white style.
//!
//! Three scenes on a 120 BPM grid (one beat = 0.5 s):
//! - `Play` (0–5 s): the keypad builds cell by cell, 9 × 2 is answered with one stroke
//!   from 1 to 8, then five more facts come faster.
//! - `Slogan` (4.5–9.5 s): a giant slash wipes the screen black; "How are your tables
//!   doin’?" lands line by line on the beat.
//! - `Outro` (9–14.5 s): a white slash wipes back; four "No …" lines tick like the app's
//!   progress squares, then the "/ FACTS" mark draws itself with the address.
//!
//! The same code renders portrait (default) and landscape (`--features landscape`).
use fframes::{
    AudioMap, AudioTimestamp::*, AudioTrack, Color, Duration, FFramesContext, FontQuery, Frame,
    Overlap, Scene, Scenes, Svgr, Video, animation::AnimationRuntime, animation::Easing,
    include_media_dir,
};
use std::sync::OnceLock;

include_media_dir!(pub struct SlashfactsPromoMedia, "media");

pub mod pop;

#[cfg(not(feature = "landscape"))]
pub const WIDTH: usize = 1080;
#[cfg(not(feature = "landscape"))]
pub const HEIGHT: usize = 1920;
#[cfg(feature = "landscape")]
pub const WIDTH: usize = 1920;
#[cfg(feature = "landscape")]
pub const HEIGHT: usize = 1080;

const PORTRAIT: bool = WIDTH < HEIGHT;
const W: f32 = WIDTH as f32;
const H: f32 = HEIGHT as f32;

const BLACK_FONT: &str = "Archivo";
const BOLD_FONT: &str = "Archivo";
const INK: &str = "#000";
const PAPER: &str = "#fff";
const DIM: &str = "#8a8a8a";

/// One beat of the 120 BPM music.
const BEAT: f32 = 0.5;

// Scene lengths. Each later scene overlaps the previous one by `WIPE` (its slash wipe).
const PLAY_LEN: f32 = 5.0;
const WIPE: f32 = 0.5;
const SLOGAN_LEN: f32 = 4.5;
const OUTRO_LEN: f32 = 5.0;
/// Global start of each scene, for sounds placed on the video timeline.
const SLOGAN_AT: f32 = PLAY_LEN - WIPE;
const OUTRO_AT: f32 = SLOGAN_AT + WIPE + SLOGAN_LEN - WIPE;
pub const TOTAL: f32 = OUTRO_AT + WIPE + OUTRO_LEN;

// ---------------------------------------------------------------- easing helpers

struct Eases {
    out: AnimationRuntime,
    inn: AnimationRuntime,
    in_out: AnimationRuntime,
    snappy: AnimationRuntime,
    soft: AnimationRuntime,
}

fn eases() -> &'static Eases {
    static E: OnceLock<Eases> = OnceLock::new();
    E.get_or_init(|| Eases {
        out: AnimationRuntime::new(1.0, &Easing::EaseOut),
        inn: AnimationRuntime::new(1.0, &Easing::EaseIn),
        in_out: AnimationRuntime::new(1.0, &Easing::EaseInOut),
        snappy: AnimationRuntime::new(f32::MAX, &Easing::Spring { mass: 1.0, stiffness: 300.0, damping: 22.0 }),
        soft: AnimationRuntime::new(f32::MAX, &Easing::Spring { mass: 1.0, stiffness: 170.0, damping: 17.0 }),
    })
}

/// Progress 0..1 of a tween that starts at `start` and lasts `dur`, through a cubic easing.
fn tween(rt: &AnimationRuntime, t: f32, start: f32, dur: f32) -> f32 {
    let p = ((t - start) / dur).clamp(0.0, 1.0);
    rt.solve(&p).clamp(0.0, 1.0)
}
fn out(t: f32, s: f32, d: f32) -> f32 { tween(&eases().out, t, s, d) }
fn inn(t: f32, s: f32, d: f32) -> f32 { tween(&eases().inn, t, s, d) }
fn in_out(t: f32, s: f32, d: f32) -> f32 { tween(&eases().in_out, t, s, d) }
/// Spring progress (overshoots a little past 1) starting at `start`.
fn spring(rt: &AnimationRuntime, t: f32, start: f32) -> f32 {
    if t <= start { 0.0 } else { rt.solve(&(t - start)) }
}
fn snappy(t: f32, s: f32) -> f32 { spring(&eases().snappy, t, s) }
fn soft(t: f32, s: f32) -> f32 { spring(&eases().soft, t, s) }
fn lerp(a: f32, b: f32, p: f32) -> f32 { a + (b - a) * p }

// ---------------------------------------------------------------- layout

/// The app's keypad: 1–9 in three rows and a wide 0 underneath.
struct Pad { x0: f32, y0: f32, cell: f32, gap: f32, zero_h: f32, border: f32 }

/// In screen units, matching the app's layout on a 600 × 1200 screen.
const PAD: Pad = Pad { x0: 24., y0: 430., cell: 174.67, gap: 14., zero_h: 118., border: 5. };

// The app screen, drawn in its own units (SCREEN_W × SCREEN_H) inside a phone.
const SCREEN_W: f32 = 600.;
const SCREEN_H: f32 = 1200.;
/// Bezel between the phone outline and the screen.
const BEZEL: f32 = 24.;
/// Hard offset shadow of the phone, as on the store screenshots and the link preview.
const SHADOW: f32 = 30.;
/// Phone centre on the canvas, its scale and resting tilt (degrees).
const PHONE_X: f32 = if PORTRAIT { W / 2. - 10. } else { 1340. };
const PHONE_Y: f32 = if PORTRAIT { H * 0.475 } else { H * 0.53 };
const PHONE_SCALE: f32 = if PORTRAIT { 1.1 } else { 0.76 };
const PHONE_TILT: f32 = if PORTRAIT { -4. } else { 8. };

/// Centre of the question and top of the progress row, in screen units.
const Q_X: f32 = SCREEN_W / 2.;
const Q_Y: f32 = 345.;
const Q_SIZE: f32 = 118.;
const PROG_Y: f32 = 112.;
/// Left text margin (8% of the width in portrait, 10% in landscape).
const MARGIN: f32 = if PORTRAIT { 88. } else { 192. };

impl Pad {
    fn width(&self) -> f32 { 3. * self.cell + 2. * self.gap }
    /// Rectangle (x, y, w, h) of a digit's cell.
    fn rect(&self, d: u8) -> (f32, f32, f32, f32) {
        if d == 0 {
            (self.x0, self.y0 + 3. * (self.cell + self.gap), self.width(), self.zero_h)
        } else {
            let i = (d - 1) as f32;
            let (col, row) = (i % 3., (i / 3.).floor());
            (self.x0 + col * (self.cell + self.gap), self.y0 + row * (self.cell + self.gap), self.cell, self.cell)
        }
    }
    fn center(&self, d: u8) -> (f32, f32) {
        let (x, y, w, h) = self.rect(d);
        (x + w / 2., y + h / 2.)
    }
}

// ---------------------------------------------------------------- the facts played

struct Answer {
    question: &'static str,
    from: u8,
    /// `None` for a one-digit answer: a tap instead of a stroke.
    to: Option<u8>,
    /// Scene second the finger lands, on a beat.
    at: f32,
    /// Seconds the stroke takes to reach the second digit.
    draw: f32,
}

const ANSWERS: [Answer; 6] = [
    Answer { question: "9 × 2", from: 1, to: Some(8), at: 2. * BEAT, draw: 0.32 },
    Answer { question: "6 × 7", from: 4, to: Some(2), at: 4. * BEAT, draw: 0.2 },
    Answer { question: "3 × 5", from: 1, to: Some(5), at: 5. * BEAT, draw: 0.2 },
    Answer { question: "8 × 8", from: 6, to: Some(4), at: 6. * BEAT, draw: 0.2 },
    Answer { question: "7 × 8", from: 5, to: Some(6), at: 7. * BEAT, draw: 0.2 },
    Answer { question: "4 × 2", from: 8, to: None, at: 8. * BEAT, draw: 0.0 },
];
/// When the answer is complete (the stroke reached its digit).
fn answer_end(a: &Answer) -> f32 { a.at + a.draw }
/// When the cells clear and the next question slides in.
fn swap_at(a: &Answer) -> f32 { answer_end(a) + 0.06 }
const SWAP: f32 = 0.26;
/// Keypad cells pop in from this second, one every `CELL_STAGGER`.
const CELLS_AT: f32 = 0.05;
const CELL_STAGGER: f32 = 0.045;
const CELL_ORDER: [u8; 10] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

// ---------------------------------------------------------------- the video

pub struct SlashfactsPromoVideo<'a> {
    pub media: &'a SlashfactsPromoMedia,
    play: Play,
    slogan: Slogan,
    outro: Outro,
}

impl<'a> SlashfactsPromoVideo<'a> {
    pub fn new(media: &'a SlashfactsPromoMedia, _title: &str) -> Self {
        Self { media, play: Play, slogan: Slogan::default(), outro: Outro::default() }
    }
}

impl std::fmt::Debug for SlashfactsPromoVideo<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("SlashfactsPromoVideo")
    }
}

impl Video for SlashfactsPromoVideo<'_> {
    const FPS: usize = 30;
    const WIDTH: usize = WIDTH;
    const HEIGHT: usize = HEIGHT;
    const BACKGROUND_COLOR: Color = Color::WHITE;

    fn duration(&self) -> Duration<'_> {
        Duration::Auto
    }

    fn define_scenes(&self) -> Scenes<'_> {
        Scenes::from(vec![&self.play as &dyn Scene, &self.slogan, &self.outro])
    }

    fn audio(&self) -> AudioMap<'_> {
        let mut tracks = vec![
            AudioTrack::new("music.wav", Second(0.)..Second(TOTAL)).gain_db(-5.).fade_out(1.2),
            AudioTrack::new("sweep.wav", Second(SLOGAN_AT - 0.1)..Eof).gain_db(-7.),
            AudioTrack::new("sweep.wav", Second(OUTRO_AT - 0.1)..Eof).gain_db(-9.),
        ];
        for (i, _) in CELL_ORDER.iter().enumerate() {
            let at = CELLS_AT + i as f32 * CELL_STAGGER;
            tracks.push(AudioTrack::new("tick.wav", Second(at)..Eof).gain_db(-17.).pan(if i % 2 == 0 { -0.2 } else { 0.2 }));
        }
        for a in &ANSWERS {
            if a.to.is_some() {
                tracks.push(AudioTrack::new("slash.wav", Second(a.at - 0.02)..Eof).gain_db(-8.));
            }
            tracks.push(AudioTrack::new("thump.wav", Second(answer_end(a))..Eof).gain_db(-9.));
        }
        for i in 0..NOS.len() {
            tracks.push(AudioTrack::new("thump.wav", Second(OUTRO_AT + no_tick_at(i))..Eof).gain_db(-10.));
        }
        tracks.push(AudioTrack::new("slash.wav", Second(OUTRO_AT + LOGO_AT - 0.02)..Eof).gain_db(-9.));
        AudioMap::from(tracks)
    }

    fn render_frame<'a>(&'a self, frame: Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
        fframes::svgr!(
            <svg xmlns="http://www.w3.org/2000/svg" viewBox={format!("0 0 {WIDTH} {HEIGHT}")} width={WIDTH} height={HEIGHT}>
                <rect width={WIDTH} height={HEIGHT} fill={PAPER} />
                {ctx.render_scenes(&frame)}
            </svg>
        )
    }
}

// ---------------------------------------------------------------- shared drawing

/// A slash-shaped band (the angle of "/") that first draws as a thin stroke along its
/// length, then widens until it covers the whole frame.
fn slash_wipe(t: f32, fill: &'static str) -> Svgr<'static> {
    let (dx, dy) = (0.342_f32, -0.94_f32); // along the "/" (70° from horizontal)
    let (nx, ny) = (0.94_f32, 0.342_f32); // across it
    let len = 2400. * out(t, 0.0, 0.2);
    let cover = 0.94 * W / 2. + 0.342 * H / 2. + 40.;
    let hw = lerp(10., cover, inn(t, 0.12, WIPE - 0.12));
    let (cx, cy) = (W / 2., H / 2.);
    let p = |s: f32, k: f32| format!("{:.1},{:.1}", cx + dx * s + nx * k, cy + dy * s + ny * k);
    let points = format!("{} {} {} {}", p(-len, -hw), p(len, -hw), p(len, hw), p(-len, hw));
    fframes::svgr!(<polygon points={points} fill={fill} />)
}

/// The app's answer stroke: a white line with a black outline and a ring at the start.
fn stroke(from: (f32, f32), to: (f32, f32), opacity: f32) -> Svgr<'static> {
    let (w_out, w_in, r) = (30., 15., 12.);
    fframes::svgr!(
        <g opacity={opacity}>
            <line x1={from.0} y1={from.1} x2={to.0} y2={to.1} stroke={INK} stroke-width={w_out} stroke-linecap="round" />
            <line x1={from.0} y1={from.1} x2={to.0} y2={to.1} stroke={PAPER} stroke-width={w_in} stroke-linecap="round" />
            <circle cx={from.0} cy={from.1} r={r} fill={PAPER} stroke={INK} stroke-width="5" />
            <circle cx={to.0} cy={to.1} r={r * 0.7} fill={PAPER} stroke={INK} stroke-width="5" />
        </g>
    )
}

fn text_width<'a>(frame: &mut Frame, ctx: &FFramesContext<'a, '_>, family: &'static str, weight: u16, size: f32, s: &'a str) -> Option<f32> {
    let font = FontQuery { family, size: size.round() as usize, weight, ..Default::default() };
    frame.text_width(ctx, font, s).map(|w| w as f32)
}

/// Largest size up to `max` at which every line fits `width`, measured once.
fn fit<'a>(cell: &OnceLock<f32>, frame: &mut Frame, ctx: &FFramesContext<'a, '_>, lines: &[&'static str], width: f32, max: f32) -> f32 {
    if let Some(s) = cell.get() {
        return *s;
    }
    let mut size = max;
    while size > 40. {
        let widest = lines.iter().map(|l| text_width(frame, ctx, BLACK_FONT, 900, size, l)).collect::<Option<Vec<_>>>();
        match widest {
            Some(ws) if ws.iter().cloned().fold(0., f32::max) > width => size -= 4.,
            Some(_) => return *cell.get_or_init(|| size),
            None => return size,
        }
    }
    size
}

// ---------------------------------------------------------------- scene 1: play

#[derive(Debug, Default)]
pub struct Play;

impl Play {
    /// Index of the question on screen at `t`, and how far the swap to it is.
    fn question_at(t: f32) -> (usize, f32) {
        let mut idx = 0;
        for (i, a) in ANSWERS.iter().enumerate().take(ANSWERS.len() - 1) {
            if t >= swap_at(a) {
                idx = i + 1;
            }
        }
        let swapping = if idx > 0 { out(t, swap_at(&ANSWERS[idx - 1]), SWAP) } else { 1.0 };
        (idx, swapping)
    }

    fn questions(t: f32) -> Svgr<'static> {
        let (idx, p) = Self::question_at(t);
        let rise = Q_SIZE * 0.55;
        let mut out_q = Svgr::empty();
        if idx > 0 && p < 1.0 {
            let prev = ANSWERS[idx - 1].question;
            out_q = fframes::svgr!(
                <text x={Q_X} y={Q_Y - rise * p} opacity={1. - p} font-family={BLACK_FONT} font-weight="900" font-size={Q_SIZE} fill={INK} text-anchor="middle">{prev}</text>
            );
        }
        // The very first question settles from slightly larger, so frame 0 is already busy.
        let settle = if idx == 0 { lerp(1.06, 1.0, out(t, 0.0, 0.6)) } else { 1.0 };
        let y = Q_Y + rise * (1. - p);
        let q = ANSWERS[idx].question;
        fframes::svgr!(
            <g>
                {out_q}
                <g transform={format!("translate({Q_X} {y}) scale({settle}) translate({} 0)", -Q_X)} opacity={p}>
                    <text x={Q_X} y="0" font-family={BLACK_FONT} font-weight="900" font-size={Q_SIZE} fill={INK} text-anchor="middle">{q}</text>
                </g>
            </g>
        )
    }

    /// The app's header: "/ FACTS", a close cross, "Q n/10", ten squares and a bar.
    fn header(t: f32) -> Svgr<'static> {
        let (idx, _) = Self::question_at(t);
        let label = format!("Q {}/10", idx + 1);
        let (s, g) = (17., 4.);
        let x0 = SCREEN_W - 24. - (10. * s + 9. * g);
        let squares: Vec<Svgr> = (0..10)
            .map(|i| {
                let x = x0 + i as f32 * (s + g);
                let fill = ANSWERS.get(i).map(|a| snappy(t, answer_end(a) + 0.04)).unwrap_or(0.);
                let pop = 1. + 0.6 * (fill - 1.).max(0.);
                let side = (s * fill.min(1.0) * pop).max(0.5);
                let (cx, cy) = (x + s / 2., PROG_Y + s / 2.);
                fframes::svgr!(
                    <g>
                        <rect x={x} y={PROG_Y} width={s} height={s} fill="none" stroke={INK} stroke-width="3" />
                        <rect x={cx - side / 2.} y={cy - side / 2.} width={side} height={side} fill={INK} />
                    </g>
                )
            })
            .collect();
        // The bar fills a tenth per answer, easing into place.
        let bar: f32 = ANSWERS.iter().map(|a| out(t, answer_end(a), 0.3)).sum::<f32>() / 10.;
        let bar_w = ((SCREEN_W - 48.) * bar).max(0.5);
        fframes::svgr!(
            <g>
                <text x="24" y="66" font-family={BLACK_FONT} font-weight="900" font-size="42" fill={INK}>"/ FACTS"</text>
                <path d="M 552 38 L 576 62 M 576 38 L 552 62" stroke={INK} stroke-width="5" />
                <rect x="0" y="88" width={SCREEN_W} height="4" fill={INK} />
                <text x="24" y={PROG_Y + 16.} font-family={BOLD_FONT} font-weight="800" font-size="19" fill={INK} letter-spacing="2">{label}</text>
                {squares}
                <rect x="24" y="150" width={SCREEN_W - 48.} height="10" fill="none" stroke={INK} stroke-width="3" />
                <rect x="24" y="150" width={bar_w} height="10" fill={INK} />
            </g>
        )
    }

    /// How black the cell of `d` is at `t` (the digits of the current answer).
    fn cell_fill(t: f32, d: u8) -> f32 {
        let mut f: f32 = 0.;
        for a in &ANSWERS {
            let clear = 1. - out(t, swap_at(a), 0.16);
            if d == a.from && t >= a.at {
                f = f.max(clear);
            }
            if Some(d) == a.to && t >= answer_end(a) {
                f = f.max(clear);
            }
        }
        f
    }

    fn keypad(t: f32) -> Svgr<'static> {
        let cells: Vec<Svgr> = CELL_ORDER
            .iter()
            .enumerate()
            .map(|(i, &d)| {
                let start = CELLS_AT + i as f32 * CELL_STAGGER;
                let s = lerp(0.55, 1.0, snappy(t, start));
                let o = out(t, start, 0.12);
                let (x, y, w, h) = PAD.rect(d);
                let (cx, cy) = (x + w / 2., y + h / 2.);
                let fill = Self::cell_fill(t, d);
                // A pressed cell dips a little, like a key.
                let press = 1. - 0.05 * fill;
                let size = if d == 0 { PAD.zero_h * 0.62 } else { PAD.cell * 0.42 };
                let ty = cy + size * 0.36;
                let label = d.to_string();
                let label2 = label.clone();
                fframes::svgr!(
                    <g opacity={o} transform={format!("translate({cx} {cy}) scale({}) translate({} {})", s * press, -cx, -cy)}>
                        <rect x={x} y={y} width={w} height={h} fill={PAPER} stroke={INK} stroke-width={PAD.border} />
                        <rect x={x} y={y} width={w} height={h} fill={INK} opacity={fill} />
                        <text x={cx} y={ty} font-family={BLACK_FONT} font-weight="900" font-size={size} fill={INK} text-anchor="middle">{label}</text>
                        <text x={cx} y={ty} font-family={BLACK_FONT} font-weight="900" font-size={size} fill={PAPER} text-anchor="middle" opacity={fill}>{label2}</text>
                    </g>
                )
            })
            .collect();
        fframes::svgr!(<g>{cells}</g>)
    }

    fn strokes(t: f32) -> Svgr<'static> {
        let lines: Vec<Svgr> = ANSWERS
            .iter()
            .filter_map(|a| {
                let to = a.to?;
                if t < a.at || t > swap_at(a) + 0.2 {
                    return None;
                }
                let p = in_out(t, a.at, a.draw);
                let (p0, p1) = (PAD.center(a.from), PAD.center(to));
                let head = (lerp(p0.0, p1.0, p), lerp(p0.1, p1.1, p));
                Some(stroke(p0, head, 1. - out(t, swap_at(a), 0.16)))
            })
            .collect();
        fframes::svgr!(<g>{lines}</g>)
    }
}

impl Scene for Play {
    fn duration(&self) -> Duration<'_> {
        Duration::Seconds(PLAY_LEN)
    }

    fn render_frame<'a>(&'a self, frame: Frame, _ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
        let t = frame.seconds();
        // The phone is there on frame 0, swinging into its resting tilt; then a slow
        // push-in over the scene so holds never freeze.
        let tilt = PHONE_TILT + lerp(-4., 0., soft(t, 0.0));
        let zoom = lerp(1.05, 1.0, out(t, 0.0, 0.7)) * lerp(1.0, 1.04, in_out(t, 0.7, PLAY_LEN - 0.7));
        let phone = format!(
            "translate({PHONE_X} {PHONE_Y}) rotate({tilt}) scale({}) translate({} {})",
            PHONE_SCALE * zoom, -SCREEN_W / 2., -SCREEN_H / 2.
        );
        let (bw, bh) = (SCREEN_W + 2. * BEZEL, SCREEN_H + 2. * BEZEL);
        fframes::svgr!(
            <g>
                {Self::caption(t)}
                <g transform={phone}>
                    <rect x={-BEZEL + SHADOW} y={-BEZEL + SHADOW} width={bw} height={bh} rx="70" fill={INK} />
                    <rect x={-BEZEL} y={-BEZEL} width={bw} height={bh} rx="70" fill={PAPER} stroke={INK} stroke-width="11" />
                    {Self::header(t)}
                    {Self::questions(t)}
                    {Self::keypad(t)}
                    {Self::strokes(t)}
                </g>
            </g>
        )
    }
}

impl Play {
    /// Landscape only: what the phone is doing, beside it, once the first stroke lands.
    fn caption(t: f32) -> Svgr<'static> {
        if PORTRAIT {
            return Svgr::empty();
        }
        const LINES: [&str; 3] = ["Times tables,", "answered with", "one stroke."];
        let size = 92.;
        let lh = size * 1.02;
        let top = H * 0.5 - lh * 1.5;
        let first = answer_end(&ANSWERS[0]) + 0.05;
        let lines: Vec<Svgr> = LINES
            .iter()
            .enumerate()
            .map(|(i, line)| {
                let p = soft(t, first + i as f32 * 0.09);
                let base = top + lh * (i as f32 + 1.) - size * 0.2;
                let y = base + size * 1.05 * (1. - p);
                let clip = format!("c{i}");
                let clip_url = format!("url(#c{i})");
                fframes::svgr!(
                    <g>
                        <defs><clipPath id={clip}><rect x="0" y={base - size} width={W} height={size * 1.22} /></clipPath></defs>
                        <g clip-path={clip_url}>
                            <text x={MARGIN} y={y} font-family={BLACK_FONT} font-weight="900" font-size={size} fill={INK} letter-spacing={-0.03 * size}>{*line}</text>
                        </g>
                    </g>
                )
            })
            .collect();
        fframes::svgr!(<g>{lines}</g>)
    }
}

// ---------------------------------------------------------------- scene 2: slogan

const SLOGAN: [&str; 3] = ["How are", "your tables", "doin’?"];

#[derive(Debug, Default)]
pub struct Slogan {
    size: OnceLock<f32>,
}

impl Slogan {
    /// The three slogan lines and the bar under them, in `fill`, shifted by (dx, dy).
    /// `id` keeps the clip-path ids unique when several copies are drawn.
    pub(crate) fn text<'a>(&self, t: f32, frame: &mut Frame, ctx: &FFramesContext<'a, '_>, fill: &'static str, dx: f32, dy: f32, id: &str) -> Svgr<'static> {
        let max = if PORTRAIT { 170. } else { 210. };
        let size = fit(&self.size, frame, ctx, &SLOGAN, W - 2. * MARGIN, max);
        let lh = size * 0.98;
        let block_h = lh * 3.;
        let top = if PORTRAIT { H * 0.44 - block_h / 2. } else { H * 0.5 - block_h / 2. };
        // Lines land on the first three beats after the wipe.
        let lines: Vec<Svgr> = SLOGAN
            .iter()
            .enumerate()
            .map(|(i, line)| {
                let at = WIPE + i as f32 * BEAT - 0.04;
                let p = soft(t, at);
                let base = top + lh * (i as f32 + 1.) - size * 0.2;
                let y = base + size * 1.05 * (1. - p);
                let clip = format!("{id}l{i}");
                let clip_url = format!("url(#{id}l{i})");
                fframes::svgr!(
                    <g>
                        <defs><clipPath id={clip}><rect x="0" y={base - size * 1.0} width={W} height={size * 1.22} /></clipPath></defs>
                        <g clip-path={clip_url}>
                            <text x={MARGIN} y={y} font-family={BLACK_FONT} font-weight="900" font-size={size} fill={fill} letter-spacing={-0.03 * size}>{*line}</text>
                        </g>
                    </g>
                )
            })
            .collect();
        // A short slanted bar under the question, drawn as the last line settles.
        let mark_p = out(t, WIPE + 2.6 * BEAT, 0.35);
        let mark_y = top + block_h + size * 0.3;
        let mark_w = ((W - 2. * MARGIN) * 0.28 * mark_p).max(0.5);
        let mark_h = size * 0.09;
        let bar = format!(
            "{:.1},{:.1} {:.1},{:.1} {:.1},{:.1} {:.1},{:.1}",
            MARGIN + mark_h * 0.36, mark_y, MARGIN + mark_w + mark_h * 0.36, mark_y,
            MARGIN + mark_w, mark_y + mark_h, MARGIN, mark_y + mark_h
        );
        let drift = lerp(1.0, 1.03, in_out(t, WIPE, SLOGAN_LEN));
        let (cx, cy) = (MARGIN, top + block_h / 2.);
        fframes::svgr!(
            <g transform={format!("translate({dx} {dy}) translate({cx} {cy}) scale({drift}) translate({} {})", -cx, -cy)}>
                {lines}
                <polygon points={bar} fill={fill} />
            </g>
        )
    }
}

impl Scene for Slogan {
    fn duration(&self) -> Duration<'_> {
        Duration::Seconds(SLOGAN_LEN)
    }
    fn overlap(&self) -> Overlap {
        Overlap::Previous(WIPE)
    }

    fn render_frame<'a>(&'a self, mut frame: Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
        let t = frame.seconds();
        let text = self.text(t, &mut frame, ctx, PAPER, 0., 0., "s");
        fframes::svgr!(
            <g>
                {slash_wipe(t, INK)}
                {text}
            </g>
        )
    }
}

// ---------------------------------------------------------------- scene 3: outro

const NOS: [&str; 4] = ["No account", "No ads", "No tracking", "No colors"];
/// Scene second each "No …" line ticks, on the beats after the wipe.
fn no_tick_at(i: usize) -> f32 { WIPE + BEAT + i as f32 * BEAT }
const LOGO_AT: f32 = WIPE + 5. * BEAT + 0.25;
const PLATFORMS: &str = "Web · iOS · Android";
const URL: &str = "slashfacts.proto.fish";

#[derive(Debug, Default)]
pub struct Outro;

impl Outro {
    fn list(t: f32) -> Svgr<'static> {
        let size = if PORTRAIT { 92. } else { 96. };
        let gap = size * 1.32;
        let box_s = size * 0.72;
        let top = if PORTRAIT { H * 0.44 - 2. * gap } else { H * 0.5 - 2. * gap };
        let leave = inn(t, LOGO_AT - 0.3, 0.28);
        let rows: Vec<Svgr> = NOS
            .iter()
            .enumerate()
            .map(|(i, line)| {
                let at = no_tick_at(i);
                let appear = out(t, at - 0.22, 0.3);
                let fill = snappy(t, at);
                let y = top + gap * i as f32;
                let bx = MARGIN;
                let side = (box_s * fill.min(1.0) * (1. + 0.6 * (fill - 1.).max(0.))).max(0.5);
                let (cx, cy) = (bx + box_s / 2., y + box_s / 2.);
                let ty = y + box_s * 0.5 + size * 0.36;
                fframes::svgr!(
                    <g opacity={appear} transform={format!("translate({} 0)", -30. * (1. - appear))}>
                        <rect x={bx} y={y} width={box_s} height={box_s} fill="none" stroke={INK} stroke-width="7" />
                        <rect x={cx - side / 2.} y={cy - side / 2.} width={side} height={side} fill={INK} />
                        <text x={bx + box_s + size * 0.4} y={ty} font-family={BLACK_FONT} font-weight="900" font-size={size} fill={INK} letter-spacing={-0.02 * size}>{*line}</text>
                    </g>
                )
            })
            .collect();
        fframes::svgr!(<g opacity={1. - leave} transform={format!("translate(0 {})", -80. * leave)}>{rows}</g>)
    }

    fn logo<'a>(t: f32, frame: &mut Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'static> {
        if t < LOGO_AT - 0.05 {
            return Svgr::empty();
        }
        let size: f32 = if PORTRAIT { 230. } else { 250. };
        let word = "FACTS";
        let word_w = text_width(frame, ctx, BLACK_FONT, 900, size, word).unwrap_or(size * 3.4);
        let slash_w = size * 0.42;
        let gap = size * 0.18;
        let total = slash_w + gap + word_w;
        let x0 = (W - total) / 2.;
        let base = if PORTRAIT { H * 0.45 } else { H * 0.5 };
        // The slash draws bottom-left to top-right, the gesture of the app.
        let sp = in_out(t, LOGO_AT, 0.24);
        let (sx0, sy0) = (x0 + size * 0.04, base);
        let (sx1, sy1) = (x0 + slash_w, base - size * 0.74);
        let (hx, hy) = (lerp(sx0, sx1, sp), lerp(sy0, sy1, sp));
        let letters: Vec<Svgr> = word
            .char_indices()
            .map(|(i, c)| {
                let dx = if i == 0 { 0. } else { text_width(frame, ctx, BLACK_FONT, 900, size, &word[..i]).unwrap_or(0.) };
                let at = LOGO_AT + 0.16 + i as f32 * 0.05;
                let p = snappy(t, at);
                let o = out(t, at, 0.12);
                let x = x0 + slash_w + gap + dx;
                let y = base + size * 0.3 * (1. - p);
                let s = c.to_string();
                fframes::svgr!(<text x={x} y={y} opacity={o} font-family={BLACK_FONT} font-weight="900" font-size={size} fill={INK}>{s}</text>)
            })
            .collect();
        let sub = out(t, LOGO_AT + BEAT + 0.1, 0.4);
        let sub2 = out(t, LOGO_AT + 2. * BEAT, 0.4);
        let url_size = if PORTRAIT { 58. } else { 56. };
        let plat_size = if PORTRAIT { 40. } else { 38. };
        let url_y = base + size * 0.62;
        fframes::svgr!(
            <g>
                <line x1={sx0} y1={sy0} x2={hx} y2={hy} stroke={INK} stroke-width={size * 0.15} />
                {letters}
                <text x={W / 2.} y={url_y + 18. * (1. - sub)} opacity={sub} font-family={BLACK_FONT} font-weight="900" font-size={url_size} fill={INK} text-anchor="middle">{URL}</text>
                <text x={W / 2.} y={url_y + url_size * 1.3 + 18. * (1. - sub2)} opacity={sub2} font-family={BOLD_FONT} font-weight="800" font-size={plat_size} fill={DIM} text-anchor="middle" letter-spacing="4">{PLATFORMS}</text>
            </g>
        )
    }
}

impl Scene for Outro {
    fn duration(&self) -> Duration<'_> {
        Duration::Seconds(OUTRO_LEN)
    }
    fn overlap(&self) -> Overlap {
        Overlap::Previous(WIPE)
    }

    fn render_frame<'a>(&'a self, mut frame: Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
        let t = frame.seconds();
        let logo = Self::logo(t, &mut frame, ctx);
        fframes::svgr!(
            <g>
                {slash_wipe(t, PAPER)}
                {Self::list(t)}
                {logo}
            </g>
        )
    }
}
