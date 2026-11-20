//! The pop-art cut (16:9, 33 s, `cargo run --release --features landscape --bin pop`).
//!
//! It starts like the main clip (`Play`, then the slogan), then goes "full patate":
//! - `Charge` (4.5–12 s): the slogan on black; while the slash shakers speed up, the Pouce
//!   palette bleeds in as halftone dots and the text splits into coloured copies, then
//!   everything is sucked into the frame for the drop.
//! - `Drop` (12–20 s): rotating starburst, the keypad as pop panels slashed on every
//!   beat with fact balloons, then a Warhol grid of facts that recolours on the beat.
//! - `Phones` (20–24 s): SlashFacts phones fly across, keypads pulsing in the palette.
//! - `Carousel` (24–28 s): eight phones on a merry-go-round that clicks on the beat.
//! - `Droste` (28–32 s): an endless zoom into the keypad, a phone inside every phone.
//! - `Collapse` (32–38 s): shapes orbit faster and faster and fall into a growing black
//!   star that swallows every colour.
//! - `End` (38–41 s): "/FACTS by PROTO/fish" on black.
//!
//! Colours are the Pouce app palette (`pouce/apps/mobile/src/theme/tokens.ts`).
use super::*;

const GREEN: &str = "#2F7244";
const SAGE: &str = "#6EA37C";
const TERRA: &str = "#C96A45";
const OCHRE: &str = "#D2A54A";
const MAUVE: &str = "#A68BBF";
const TEAL: &str = "#6FA8A6";
const SLATE: &str = "#7F9CC6";
/// The Pouce mascot's face and cheeks.
const CREAM: &str = "#FAE6CB";
const ORANGE: &str = "#E28555";
const PAL: [&str; 8] = [OCHRE, TERRA, SLATE, MAUVE, TEAL, SAGE, ORANGE, GREEN];

// Scene lengths (global start in the comment). Only `Charge` overlaps (its slash wipe).
const CHARGE_LEN: f32 = 7.0; // 4.5 .. 12
const DROP_LEN: f32 = 8.0; // 12 .. 20
const CALM_LEN: f32 = 4.0; // 20 .. 24
const CAROUSEL_LEN: f32 = 4.0; // 24 .. 28
const DROSTE_LEN: f32 = 4.0; // 28 .. 32
const COLLAPSE_LEN: f32 = 6.0; // 32 .. 38
const END_LEN: f32 = 3.0; // 38 .. 41
/// Scene second (inside `Charge`) where the shakers start and the colours creep in.
const COLOR_IN: f32 = 3.5;
/// The phones and the collapse open with a round reveal over the previous scene; their
/// beat clocks subtract it so pulses stay on the music.
const PHONES_IN: f32 = 10. / 30.; // a whole number of frames
const COLLAPSE_IN: f32 = 0.4;

/// A clip path id + a disc of radius `r` at the centre: the round reveal.
fn reveal(id: &str, r: f32, body: Svgr<'static>) -> Svgr<'static> {
    let clip = id.to_string();
    let url = format!("url(#{id})");
    fframes::svgr!(
        <g>
            <defs><clipPath id={clip}><circle cx={CX} cy={CY} r={r.max(0.5)} /></clipPath></defs>
            <g clip-path={url}>{body}</g>
        </g>
    )
}

const CX: f32 = W / 2.;
const CY: f32 = H / 2.;

/// The facts slashed in the drop: the stroke goes through the digits of the result.
const FACTS: [(&str, &str, u8, u8); 8] = [
    ("9 × 2", "18", 1, 8),
    ("6 × 7", "42", 4, 2),
    ("3 × 5", "15", 1, 5),
    ("8 × 8", "64", 6, 4),
    ("7 × 8", "56", 5, 6),
    ("4 × 8", "32", 3, 2),
    ("9 × 8", "72", 7, 2),
    ("6 × 9", "54", 5, 4),
];

/// Deterministic noise in -1..1.
fn hash(i: i32) -> f32 {
    let x = (i as f32 * 12.9898 + 78.233).sin() * 43758.547;
    (x - x.floor()) * 2. - 1.
}
/// 1 on each beat, decaying fast: drives the kick pulses.
fn kick(t: f32) -> f32 {
    let since = t.rem_euclid(BEAT);
    (-since / 0.11).exp()
}
fn beat_index(t: f32) -> i32 { (t / BEAT).floor() as i32 }

/// A grid of dots; `radius(x, y)` and `color(col, row)` decide each one. Zero-sized dots
/// are skipped.
fn halftone(spacing: f32, radius: impl Fn(f32, f32) -> f32, color: impl Fn(i32, i32) -> &'static str, opacity: f32) -> Svgr<'static> {
    let (cols, rows) = ((W / spacing).ceil() as i32 + 1, (H / spacing).ceil() as i32 + 1);
    let mut dots = Vec::with_capacity((cols * rows) as usize);
    for row in 0..rows {
        for col in 0..cols {
            let x = col as f32 * spacing + if row % 2 == 1 { spacing / 2. } else { 0. };
            let y = row as f32 * spacing;
            let r = radius(x, y);
            if r > 0.6 {
                let fill = color(col, row);
                dots.push(fframes::svgr!(<circle cx={x} cy={y} r={r} fill={fill} />));
            }
        }
    }
    fframes::svgr!(<g opacity={opacity}>{dots}</g>)
}

/// A comic starburst polygon centred on (x, y).
fn burst(x: f32, y: f32, outer: f32, inner: f32, spikes: usize, rot: f32) -> String {
    (0..spikes * 2)
        .map(|i| {
            let r = if i % 2 == 0 { outer } else { inner * (1. + 0.12 * hash(i as i32 * 3 + spikes as i32)) };
            let a = rot + i as f32 * std::f32::consts::PI / spikes as f32;
            format!("{:.1},{:.1}", x + r * a.cos(), y + r * a.sin())
        })
        .collect::<Vec<_>>()
        .join(" ")
}

// ---------------------------------------------------------------- the video

pub struct PopVideo<'a> {
    pub media: &'a SlashfactsPromoMedia,
    play: Play,
    charge: Charge,
    drop: Drop,
    calm: Calm,
    carousel: Carousel,
    droste: Droste,
    collapse: Collapse,
    end: End,
}

impl<'a> PopVideo<'a> {
    pub fn new(media: &'a SlashfactsPromoMedia) -> Self {
        Self { media, play: Play, charge: Charge::default(), drop: Drop, calm: Calm, carousel: Carousel, droste: Droste, collapse: Collapse, end: End }
    }
}

impl std::fmt::Debug for PopVideo<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("PopVideo")
    }
}

impl Video for PopVideo<'_> {
    const FPS: usize = 30;
    const WIDTH: usize = WIDTH;
    const HEIGHT: usize = HEIGHT;
    const BACKGROUND_COLOR: Color = Color::WHITE;

    fn duration(&self) -> Duration<'_> {
        Duration::Auto
    }

    fn define_scenes(&self) -> Scenes<'_> {
        Scenes::from(vec![&self.play as &dyn Scene, &self.charge, &self.drop, &self.calm, &self.carousel, &self.droste, &self.collapse, &self.end])
    }

    fn audio(&self) -> AudioMap<'_> {
        // The track carries the structure (see music/pop.sh); the first five seconds keep
        // the keypad sounds of the main cut.
        let mut tracks = vec![
            AudioTrack::new("pop_music.wav", Second(0.)..Eof).gain_db(-2.5),
            AudioTrack::new("sweep.wav", Second(PLAY_LEN - WIPE - 0.1)..Eof).gain_db(-8.),
        ];
        for (i, _) in CELL_ORDER.iter().enumerate() {
            tracks.push(AudioTrack::new("tick.wav", Second(CELLS_AT + i as f32 * CELL_STAGGER)..Eof).gain_db(-17.));
        }
        for a in &ANSWERS {
            if a.to.is_some() {
                tracks.push(AudioTrack::new("slash.wav", Second(a.at - 0.02)..Eof).gain_db(-8.));
            }
            tracks.push(AudioTrack::new("thump.wav", Second(answer_end(a))..Eof).gain_db(-9.));
        }
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

// ---------------------------------------------------------------- charge

#[derive(Debug, Default)]
pub struct Charge {
    slogan: Slogan,
}

impl Scene for Charge {
    fn duration(&self) -> Duration<'_> {
        Duration::Seconds(CHARGE_LEN)
    }
    fn overlap(&self) -> Overlap {
        Overlap::Previous(WIPE)
    }

    fn render_frame<'a>(&'a self, mut frame: Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
        let t = frame.seconds();
        let end = WIPE + CHARGE_LEN;
        // How much colour has come in, following the shakers' acceleration.
        let c = in_out(t, COLOR_IN, end - COLOR_IN - 0.4);
        let step = (t / 0.125).floor() as i32;
        // The coloured copies split further apart as the shakers go to 16ths.
        let amp = 22. * c * (1. + 1.5 * inn(t, end - 2.0, 1.6));
        let j = |k: i32| hash(step * 7 + k);
        let shake = (j(1) * 9. * c * c, j(2) * 9. * c * c);

        let dots = halftone(
            46.,
            |x, y| {
                let d = ((x - CX).powi(2) + (y - CY).powi(2)).sqrt();
                let wave = 0.5 + 0.5 * (d * 0.012 - t * 9.).sin();
                c * 15. * (0.35 + 0.65 * wave)
            },
            |col, row| PAL[((col + row).div_euclid(3)).rem_euclid(PAL.len() as i32) as usize],
            c,
        );
        let a = self.slogan.text(t, &mut frame, ctx, TERRA, -amp + j(3) * 4. * c, -amp * 0.5, "a");
        let b = self.slogan.text(t, &mut frame, ctx, SLATE, amp + j(4) * 4. * c, amp * 0.5, "b");
        let o = self.slogan.text(t, &mut frame, ctx, OCHRE, j(5) * amp * 0.6, amp * 0.9, "o");
        let white = self.slogan.text(t, &mut frame, ctx, PAPER, 0., 0., "w");
        // Sucked in for the drop, then a flash of cream on the downbeat.
        let suck = inn(t, end - 0.55, 0.55);
        let zoom = 1. + 5. * suck;
        let flash = inn(t, end - 0.12, 0.12);
        let (fx, fy) = (MARGIN + 380., H * 0.5);
        fframes::svgr!(
            <g>
                {slash_wipe(t, INK)}
                {dots}
                <g transform={format!("translate({} {}) translate({fx} {fy}) scale({zoom}) rotate({}) translate({} {})", shake.0, shake.1, -14. * suck, -fx, -fy)}>
                    <g opacity={c}>{a}{b}{o}</g>
                    {white}
                </g>
                <rect width={W} height={H} fill={CREAM} opacity={flash} />
            </g>
        )
    }
}

// ---------------------------------------------------------------- drop

#[derive(Debug, Default)]
pub struct Drop;

const DROP_CELL: f32 = 178.;
const DROP_GAP: f32 = 20.;

impl Drop {
    fn cell_center(d: u8) -> (f32, f32) {
        let i = (d - 1) as f32;
        let (col, row) = (i % 3. - 1., (i / 3.).floor() - 1.);
        (CX + col * (DROP_CELL + DROP_GAP), CY + row * (DROP_CELL + DROP_GAP))
    }

    fn rays(t: f32, a: &'static str, b: &'static str, speed: f32) -> Svgr<'static> {
        let n = 22;
        let rot = t * speed;
        let wedges: Vec<Svgr> = (0..n)
            .map(|i| {
                let a0 = rot + i as f32 * std::f32::consts::TAU / n as f32;
                let a1 = a0 + std::f32::consts::TAU / n as f32;
                let r = 2400.;
                let pts = format!("{CX},{CY} {:.1},{:.1} {:.1},{:.1}", CX + r * a0.cos(), CY + r * a0.sin(), CX + r * a1.cos(), CY + r * a1.sin());
                let fill = if i % 2 == 0 { a } else { b };
                fframes::svgr!(<polygon points={pts} fill={fill} />)
            })
            .collect();
        fframes::svgr!(<g>{wedges}</g>)
    }

    /// Black halftone that grows toward the edges, the classic print gradient.
    fn print_dots(opacity: f32) -> Svgr<'static> {
        halftone(
            38.,
            |x, y| {
                let d = (((x - CX) / W).powi(2) + ((y - CY) / H).powi(2)).sqrt();
                (d * 2.0 - 0.25).clamp(0., 1.) * 11.
            },
            |_, _| INK,
            opacity,
        )
    }

    fn keypad(t: f32) -> Svgr<'static> {
        let beat = beat_index(t);
        let pulse = 1. + 0.06 * kick(t);
        let cells: Vec<Svgr> = (1..=9u8)
            .map(|d| {
                let (cx, cy) = Self::cell_center(d);
                let order = ((cx - CX).abs() + (cy - CY).abs()) / (DROP_CELL + DROP_GAP);
                let p = snappy(t, 0.02 + order * 0.05);
                let rot = hash(d as i32 * 11 + beat) * 5.;
                let fill = PAL[((d as i32 + beat) as usize) % PAL.len()];
                let half = DROP_CELL / 2.;
                let label = d.to_string();
                fframes::svgr!(
                    <g transform={format!("translate({cx} {cy}) rotate({rot}) scale({})", p * pulse)}>
                        <rect x={-half + 14.} y={-half + 14.} width={DROP_CELL} height={DROP_CELL} fill={INK} />
                        <rect x={-half} y={-half} width={DROP_CELL} height={DROP_CELL} fill={fill} stroke={INK} stroke-width="9" />
                        <text x="0" y="38" font-family={BLACK_FONT} font-weight="900" font-size="108" fill={INK} text-anchor="middle">{label}</text>
                    </g>
                )
            })
            .collect();
        fframes::svgr!(<g>{cells}</g>)
    }

    /// One comic slash per beat through the digits of a result.
    fn slash(t: f32) -> Svgr<'static> {
        let k = beat_index(t);
        if !(0..8).contains(&k) {
            return Svgr::empty();
        }
        let (_, _, a, b) = FACTS[k as usize];
        let p = out(t, k as f32 * BEAT, 0.14);
        let (p0, p1) = (Self::cell_center(a), Self::cell_center(b));
        let head = (lerp(p0.0, p1.0, p), lerp(p0.1, p1.1, p));
        let ink = PAL[(k as usize + 3) % PAL.len()];
        fframes::svgr!(
            <g>
                <line x1={p0.0 + 12.} y1={p0.1 + 12.} x2={head.0 + 12.} y2={head.1 + 12.} stroke={INK} stroke-width="58" stroke-linecap="round" />
                <line x1={p0.0} y1={p0.1} x2={head.0} y2={head.1} stroke={INK} stroke-width="58" stroke-linecap="round" />
                <line x1={p0.0} y1={p0.1} x2={head.0} y2={head.1} stroke={CREAM} stroke-width="34" stroke-linecap="round" />
                <line x1={p0.0} y1={p0.1} x2={head.0} y2={head.1} stroke={ink} stroke-width="12" stroke-linecap="round" />
            </g>
        )
    }

    /// Starburst balloons with the fact being slashed, left and right in turn.
    fn balloons(t: f32) -> Svgr<'static> {
        let now = beat_index(t);
        let shown: Vec<Svgr> = (now - 1..=now)
            .filter(|k| (0..8).contains(k))
            .map(|k| {
                let at = k as f32 * BEAT;
                let p = snappy(t, at);
                let gone = inn(t, at + 0.8, 0.18);
                let s = (p * (1. - gone)).max(0.001);
                let left = k % 2 == 0;
                let x = if left { 360. } else { W - 360. };
                let y = if (k / 2) % 2 == 0 { 300. } else { H - 290. };
                // Only the question: the answer is the slash itself.
                let text = FACTS[k as usize].0;
                let fill = if left { CREAM } else { OCHRE };
                let rot = if left { -8. } else { 7. };
                let shape = burst(0., 0., 250., 175., 14, 0.2 * k as f32);
                let shadow = burst(16., 16., 250., 175., 14, 0.2 * k as f32);
                fframes::svgr!(
                    <g transform={format!("translate({x} {y}) rotate({rot}) scale({s})")}>
                        <polygon points={shadow} fill={INK} />
                        <polygon points={shape} fill={fill} stroke={INK} stroke-width="8" stroke-linejoin="round" />
                        <text x="0" y="30" font-family={BLACK_FONT} font-weight="900" font-size="84" fill={INK} text-anchor="middle">{text}</text>
                    </g>
                )
            })
            .collect();
        fframes::svgr!(<g>{shown}</g>)
    }

    /// The Warhol grid: 6 × 2 SlashFacts phones on coloured panels. Panels recolour,
    /// keypads pulse and every phone moves on to a new multiplication on each beat.
    fn warhol(t: f32) -> Svgr<'static> {
        let local = t - 4.0;
        let beat = beat_index(t);
        let (cols, rows) = (6usize, 2usize);
        let (pw, ph) = (W / cols as f32, H / rows as f32);
        let gutter = 8.;
        let shrink = inn(t, DROP_LEN - 0.3, 0.3);
        let phone_scale = (ph - 140.) / (SCREEN_H + 2. * BEZEL);
        let panels: Vec<Svgr> = (0..cols * rows)
            .map(|i| {
                let (col, row) = ((i % cols) as f32, (i / cols) as f32);
                let (x, y) = (col * pw, row * ph);
                let (cx, cy) = (x + pw / 2., y + ph / 2.);
                let flip = snappy(local, 0.03 * i as f32).max(0.001);
                let bg = PAL[(i + beat as usize) % PAL.len()];
                let shade = PAL[(i + beat as usize + 3) % PAL.len()];
                let s = flip * (1. - shrink);
                // Phones lean left and right in turn and bounce on the kick.
                let tilt = if (i + row as usize) % 2 == 0 { -6. } else { 6. };
                let ps = phone_scale * (1. + 0.06 * kick(t));
                let phone = Calm::phone(t, i * 3 + 1);
                let dots: Vec<Svgr> = (0..5)
                    .flat_map(|yy| (0..4).map(move |xx| (xx, yy)))
                    .map(|(xx, yy)| {
                        let dx = x + 20. + xx as f32 * 92. + if yy % 2 == 1 { 46. } else { 0. };
                        let dy = y + 26. + yy as f32 * 120.;
                        let rr = 14. + 9. * ((t * 6. + i as f32 + (xx + yy) as f32 * 0.7).sin());
                        fframes::svgr!(<circle cx={dx} cy={dy} r={rr.max(1.)} fill={shade} />)
                    })
                    .collect();
                let clip = format!("p{i}");
                let clip_url = format!("url(#p{i})");
                fframes::svgr!(
                    <g transform={format!("translate({cx} {cy}) scale({s}) translate({} {})", -cx, -cy)}>
                        <defs><clipPath id={clip}><rect x={x + gutter} y={y + gutter} width={pw - 2. * gutter} height={ph - 2. * gutter} /></clipPath></defs>
                        <g clip-path={clip_url}>
                            <rect x={x} y={y} width={pw} height={ph} fill={bg} />
                            <g opacity="0.5">{dots}</g>
                            <g transform={format!("translate({cx} {cy}) rotate({tilt}) scale({ps}) translate({} {})", -SCREEN_W / 2., -SCREEN_H / 2.)}>
                                {phone}
                            </g>
                        </g>
                    </g>
                )
            })
            .collect();
        fframes::svgr!(
            <g>
                <rect width={W} height={H} fill={INK} />
                {panels}
            </g>
        )
    }
}

impl Scene for Drop {
    fn duration(&self) -> Duration<'_> {
        Duration::Seconds(DROP_LEN)
    }

    fn render_frame<'a>(&'a self, frame: Frame, _ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
        let t = frame.seconds();
        if t >= 4.0 {
            return Self::warhol(t);
        }
        let bar = (t / 2.).floor() as usize;
        let (a, b) = [(OCHRE, TERRA), (SLATE, MAUVE)][bar.min(1)];
        // The whole frame punches in on the drop and on every kick.
        let punch = lerp(1.25, 1.0, out(t, 0.0, 0.5)) * (1. + 0.02 * kick(t));
        let flash = 1. - out(t, 0.0, 0.25);
        fframes::svgr!(
            <g>
                <g transform={format!("translate({CX} {CY}) scale({punch}) translate({} {})", -CX, -CY)}>
                    {Self::rays(t, a, b, 0.35)}
                    {Self::print_dots(0.16)}
                    {Self::keypad(t)}
                    {Self::slash(t)}
                </g>
                {Self::balloons(t)}
                <rect width={W} height={H} fill={CREAM} opacity={flash} />
            </g>
        )
    }
}

// ---------------------------------------------------------------- flying phones

/// Scene 4 (20–24 s): SlashFacts phones fly across the frame, their keypads pulsing in
/// the palette and slashed on every beat. (Kept under the name `Calm` for the CLI.)
#[derive(Debug, Default)]
pub struct Calm;

/// One flight: start and end points, start second, duration, scale, spin (deg/s), seed.
struct Flight { from: (f32, f32), to: (f32, f32), at: f32, dur: f32, scale: f32, spin: f32, seed: usize }

const FLIGHTS: [Flight; 9] = [
    Flight { from: (-300., 900.), to: (2200., 150.), at: -0.4, dur: 2.6, scale: 0.42, spin: 40., seed: 0 },
    Flight { from: (2250., 1000.), to: (-300., 250.), at: 0.0, dur: 2.4, scale: 0.30, spin: -55., seed: 3 },
    Flight { from: (500., 1450.), to: (1300., -400.), at: 0.3, dur: 2.2, scale: 0.36, spin: 25., seed: 5 },
    Flight { from: (-350., 200.), to: (2250., 850.), at: 0.8, dur: 2.5, scale: 0.26, spin: 70., seed: 1 },
    Flight { from: (1500., -450.), to: (700., 1500.), at: 1.1, dur: 2.0, scale: 0.48, spin: -30., seed: 6 },
    Flight { from: (2250., 500.), to: (-350., 700.), at: 1.6, dur: 2.2, scale: 0.34, spin: 45., seed: 2 },
    Flight { from: (-300., 1150.), to: (1900., -300.), at: 1.95, dur: 2.0, scale: 0.40, spin: -60., seed: 4 },
    Flight { from: (900., -450.), to: (1400., 1500.), at: 2.4, dur: 1.55, scale: 0.30, spin: 35., seed: 7 },
    Flight { from: (2250., 1100.), to: (-300., -100.), at: 2.55, dur: 1.4, scale: 0.46, spin: -40., seed: 1 },
];

impl Calm {
    /// Fill of keypad cell `d` of a phone at `t`: black when it is a digit of the slashed
    /// answer, otherwise a palette colour that moves on every beat.
    fn cell_fill(t: f32, seed: usize, d: u8) -> &'static str {
        let beat = beat_index(t);
        let (_, _, a, b) = FACTS[(beat as usize + seed) % FACTS.len()];
        if d == a || d == b { INK } else { PAL[(d as usize + beat as usize + seed) % PAL.len()] }
    }

    /// A SlashFacts phone in screen units (600 × 1200): outline, header, and the keypad
    /// whose cells take the palette colours in turn and pulse on the kick.
    fn phone(t: f32, seed: usize) -> Svgr<'static> {
        let beat = beat_index(t);
        let pulse = 1. + 0.08 * kick(t);
        let (_, _, a, b) = FACTS[(beat as usize + seed) % FACTS.len()];
        let cells: Vec<Svgr> = (0..=9u8)
            .map(|d| {
                let (x, y, w, h) = PAD.rect(d);
                let (cx, cy) = (x + w / 2., y + h / 2.);
                let lit = d == a || d == b;
                let fill = Self::cell_fill(t, seed, d);
                let ink = if lit { PAPER } else { INK };
                let size = if d == 0 { PAD.zero_h * 0.62 } else { PAD.cell * 0.42 };
                let label = d.to_string();
                fframes::svgr!(
                    <g transform={format!("translate({cx} {cy}) scale({pulse}) translate({} {})", -cx, -cy)}>
                        <rect x={x} y={y} width={w} height={h} fill={fill} stroke={INK} stroke-width="5" />
                        <text x={cx} y={cy + size * 0.36} font-family={BLACK_FONT} font-weight="900" font-size={size} fill={ink} text-anchor="middle">{label}</text>
                    </g>
                )
            })
            .collect();
        let (p0, p1) = (PAD.center(a), PAD.center(b));
        let p = out(t, beat as f32 * BEAT, 0.14);
        let head = (lerp(p0.0, p1.0, p), lerp(p0.1, p1.1, p));
        let q = FACTS[(beat as usize + seed) % FACTS.len()].0;
        let (bw, bh) = (SCREEN_W + 2. * BEZEL, SCREEN_H + 2. * BEZEL);
        fframes::svgr!(
            <g>
                <rect x={-BEZEL + SHADOW} y={-BEZEL + SHADOW} width={bw} height={bh} rx="70" fill={INK} />
                <rect x={-BEZEL} y={-BEZEL} width={bw} height={bh} rx="70" fill={PAPER} stroke={INK} stroke-width="11" />
                <text x="24" y="66" font-family={BLACK_FONT} font-weight="900" font-size="42" fill={INK}>"/ FACTS"</text>
                <rect x="0" y="88" width={SCREEN_W} height="4" fill={INK} />
                <text x={SCREEN_W / 2.} y="320" font-family={BLACK_FONT} font-weight="900" font-size="118" fill={INK} text-anchor="middle">{q}</text>
                {cells}
                {stroke(p0, head, 1.)}
            </g>
        )
    }
}

impl Scene for Calm {
    fn duration(&self) -> Duration<'_> {
        Duration::Seconds(CALM_LEN)
    }
    fn name(&self) -> &'static str {
        "Phones"
    }
    fn overlap(&self) -> Overlap {
        Overlap::Previous(PHONES_IN)
    }

    fn render_frame<'a>(&'a self, frame: Frame, _ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
        let raw = frame.seconds();
        // Music time: 0 on the downbeat at 20 s.
        let t = raw - PHONES_IN;
        let bar = (t / 2.).floor().max(0.) as usize;
        let (ra, rb) = [(TEAL, SLATE), (ORANGE, OCHRE)][bar.min(1)];
        let phones: Vec<Svgr> = FLIGHTS
            .iter()
            .filter(|f| t >= f.at && t <= f.at + f.dur)
            .map(|f| {
                let p = (t - f.at) / f.dur;
                // A little arc on the way, so the flights are not straight lines.
                let (x, y) = (lerp(f.from.0, f.to.0, p), lerp(f.from.1, f.to.1, p) - 140. * (p * std::f32::consts::PI).sin());
                let rot = f.spin * (t - f.at) + 12. * hash(f.seed as i32);
                let s = f.scale * (1. + 0.05 * kick(t));
                let phone = Self::phone(t, f.seed);
                fframes::svgr!(
                    <g transform={format!("translate({x} {y}) rotate({rot}) scale({s}) translate({} {})", -SCREEN_W / 2., -SCREEN_H / 2.)}>
                        {phone}
                    </g>
                )
            })
            .collect();
        let body = fframes::svgr!(
            <g>
                {Drop::rays(t, ra, rb, -0.5)}
                {Drop::print_dots(0.12)}
                {phones}
            </g>
        );
        reveal("phones-in", 1150. * out(raw, 0.0, PHONES_IN), body)
    }
}

// ---------------------------------------------------------------- carousel

/// Scene 5 (24–28 s): eight phones on a merry-go-round seen from the front (fake 3D:
/// position on an ellipse, size and width from the angle). It clicks one step per beat.
#[derive(Debug, Default)]
pub struct Carousel;

impl Scene for Carousel {
    fn duration(&self) -> Duration<'_> {
        Duration::Seconds(CAROUSEL_LEN)
    }
    fn overlap(&self) -> Overlap {
        Overlap::Previous(PHONES_IN)
    }

    fn render_frame<'a>(&'a self, frame: Frame, _ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
        let raw = frame.seconds();
        let t = raw - PHONES_IN;
        let n = 8;
        let step = std::f32::consts::TAU / n as f32;
        // One click per beat: the ring turns a step with a snappy ease, then rests.
        let beat = beat_index(t);
        let turn = (beat as f32 + snappy(t, beat as f32 * BEAT).min(1.1)) * step;
        let bar = (t / 2.).floor().max(0.) as usize;
        let (bg, dot) = [(MAUVE, SLATE), (TEAL, SAGE)][bar.min(1)];
        let mut ring: Vec<(f32, Svgr)> = (0..n)
            .map(|i| {
                let th = i as f32 * step - turn;
                let depth = (th.cos() + 1.) / 2.; // 1 at the front, 0 at the back
                let x = CX + 700. * th.sin();
                let y = CY + 30. + 60. * th.cos();
                let s = (0.26 + 0.30 * depth) * (1. + 0.05 * kick(t) * depth);
                let squash = 0.45 + 0.55 * th.cos().abs();
                let o = 0.45 + 0.55 * depth;
                let phone = Calm::phone(t, i * 5 + 2);
                let g = fframes::svgr!(
                    <g opacity={o} transform={format!("translate({x} {y}) scale({} {s}) translate({} {})", s * squash, -SCREEN_W / 2., -SCREEN_H / 2.)}>
                        {phone}
                    </g>
                );
                (depth, g)
            })
            .collect();
        ring.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));
        let phones: Vec<Svgr> = ring.into_iter().map(|(_, g)| g).collect();
        // Big round polka dots drifting slowly behind the ring.
        let dots: Vec<Svgr> = (0..18)
            .map(|i| {
                let x = (i as f32 * 211. + t * 60.).rem_euclid(W + 200.) - 100.;
                let y = 80. + (i as f32 * 137.).rem_euclid(H - 160.);
                let r = 40. + 30. * (i % 3) as f32;
                fframes::svgr!(<circle cx={x} cy={y} r={r} fill={dot} opacity="0.55" />)
            })
            .collect();
        let body = fframes::svgr!(
            <g>
                <rect width={W} height={H} fill={bg} />
                {dots}
                <ellipse cx={CX} cy={CY + 420.} rx="760" ry="60" fill={INK} opacity="0.12" />
                {phones}
            </g>
        );
        reveal("carousel-in", 1150. * out(raw, 0.0, PHONES_IN), body)
    }
}

// ---------------------------------------------------------------- droste

/// Scene 6 (28–32 s): an endless zoom. Every phone's centre cell holds a smaller phone,
/// slightly turned; the camera dives one level per period and the loop is seamless
/// (level n + 1 at the end of a period is exactly level n at the start of the next).
#[derive(Debug, Default)]
pub struct Droste;

/// Seconds per level of the dive (two beats).
const DROSTE_PERIOD: f32 = 2. * BEAT;
/// Turn between a phone and the one inside it, in degrees.
const DROSTE_TURN: f32 = 18.;

impl Scene for Droste {
    fn duration(&self) -> Duration<'_> {
        Duration::Seconds(DROSTE_LEN)
    }
    fn overlap(&self) -> Overlap {
        Overlap::Previous(PHONES_IN)
    }

    fn render_frame<'a>(&'a self, frame: Frame, _ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
        let raw = frame.seconds();
        let t = raw - PHONES_IN;
        let (c5x, c5y) = PAD.center(5);
        // Size of a nested phone relative to its parent: it fits in one keypad cell.
        let k = PAD.cell * 0.86 / (SCREEN_H + 2. * BEZEL);
        let tp = t.max(-PHONES_IN) / DROSTE_PERIOD;
        let level0 = tp.floor();
        let frac = tp - level0;
        let z = (1. / k).powf(frac);
        let s0 = 0.8 * (1. + 0.025 * kick(t));
        // Innermost first, so each parent is drawn and its child goes on top of its cell.
        let depth = 4;
        let seed_of = |l: i32| (level0 as i32 + l).rem_euclid(64) as usize * 3 + 1;
        // Near the end of a period the outermost phone fades out while a full-frame colour
        // fades in behind its child; that colour is the background of the next period, so
        // the loop has no cut.
        let fade = in_out(frac, 0.55, 0.45);
        let mut inner = Svgr::empty();
        for l in (0..depth).rev() {
            let seed = seed_of(l as i32);
            let phone = Calm::phone(t, seed);
            let phone = if l == 0 { fframes::svgr!(<g opacity={1. - fade}>{phone}</g>) } else { phone };
            let child = if l + 1 < depth {
                fframes::svgr!(
                    <g transform={format!("translate({c5x} {c5y}) scale({k}) rotate({DROSTE_TURN}) translate({} {})", -c5x, -c5y)}>
                        {inner}
                    </g>
                )
            } else {
                Svgr::empty()
            };
            inner = fframes::svgr!(<g>{phone}{child}</g>);
        }
        let rot = -DROSTE_TURN * frac;
        // One colour per level: the takeover of level n is the background of level n + 1.
        let level_color = |l: i32| PAL[(level0 as i32 + l).rem_euclid(PAL.len() as i32) as usize];
        let bg = level_color(-1);
        let takeover = level_color(0);
        let body = fframes::svgr!(
            <g>
                <rect width={W} height={H} fill={bg} />
                <rect width={W} height={H} fill={takeover} opacity={fade} />
                {Drop::print_dots(0.14)}
                <g transform={format!("translate({CX} {CY}) rotate({rot}) scale({}) translate({} {})", s0 * z, -c5x, -c5y)}>
                    {inner}
                </g>
            </g>
        );
        reveal("droste-in", 1150. * out(raw, 0.0, PHONES_IN), body)
    }
}

// ---------------------------------------------------------------- collapse

#[derive(Debug, Default)]
pub struct Collapse;

impl Scene for Collapse {
    fn duration(&self) -> Duration<'_> {
        Duration::Seconds(COLLAPSE_LEN)
    }
    fn overlap(&self) -> Overlap {
        Overlap::Previous(COLLAPSE_IN)
    }

    fn render_frame<'a>(&'a self, frame: Frame, _ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
        let raw = frame.seconds();
        // Music time: 0 on the downbeat at 24 s.
        let t = raw - COLLAPSE_IN;
        // The shapes fly in from beyond the frame as the cream disc opens.
        let arrive = 1. + 1.6 * (1. - out(raw, 0.0, COLLAPSE_IN + 0.5));
        // Spin accelerates (angle grows with t³); the orbits fall inward over the last half.
        let tt = t.max(0.);
        let spin = 0.5 * t + 0.09 * tt * tt * tt;
        let fall = inn(t, 2.6, 3.0);
        let items: Vec<Svgr> = (0..40)
            .filter_map(|i| {
                let r0 = 240. + (i as f32 * 97.).rem_euclid(560.);
                let r = r0 * (1. - fall).max(0.) * arrive;
                if r < 30. {
                    return None;
                }
                let th = i as f32 * 2.399 + spin * (1.0 + 300. / r0);
                let (x, y) = (CX + r * th.cos(), CY + r * th.sin());
                let s = 0.35 + 0.65 * (r / r0);
                let fill = PAL[i % PAL.len()];
                let a = th.to_degrees() + 90.;
                let shape = match i % 4 {
                    0 => fframes::svgr!(<rect x="-36" y="-36" width="72" height="72" rx="18" fill={fill} />),
                    1 => fframes::svgr!(<circle cx="0" cy="0" r="38" fill={fill} />),
                    2 => {
                        let label = (i % 10).to_string();
                        fframes::svgr!(<text x="0" y="34" font-family={BLACK_FONT} font-weight="900" font-size="104" fill={fill} text-anchor="middle">{label}</text>)
                    }
                    _ => fframes::svgr!(
                        <g>
                            <line x1="-50" y1="30" x2="50" y2="-30" stroke={fill} stroke-width="24" stroke-linecap="round" />
                        </g>
                    ),
                };
                Some(fframes::svgr!(<g transform={format!("translate({x} {y}) rotate({a}) scale({s})")}>{shape}</g>))
            })
            .collect();
        // The black hole: a round black disc that beats with the kick, a ring of palette
        // dots whirling around it, then it grows until it swallows the frame.
        let hole_r = 34. + 16. * kick(t) * (1. - fall) + 90. * fall + 1250. * inn(t, 4.4, 1.55);
        let ring_r = hole_r * 1.7;
        let ring: Vec<Svgr> = (0..14)
            .map(|i| {
                let a = i as f32 * std::f32::consts::TAU / 14. + spin * 1.6;
                let fill = PAL[i % PAL.len()];
                let r = (hole_r * 0.16).clamp(6., 22.);
                fframes::svgr!(<circle cx={CX + ring_r * a.cos()} cy={CY + ring_r * a.sin()} r={r} fill={fill} />)
            })
            .collect();
        let ring_o = out(t, 0.2, 0.6) * (1. - inn(t, 5.2, 0.5));
        let body = fframes::svgr!(
            <g>
                <rect width={W} height={H} fill={CREAM} />
                {items}
                <g opacity={ring_o}>{ring}</g>
                <circle cx={CX} cy={CY} r={hole_r} fill={INK} />
            </g>
        );
        reveal("collapse-in", 1150. * out(raw, 0.0, COLLAPSE_IN), body)
    }
}

// ---------------------------------------------------------------- end

#[derive(Debug, Default)]
pub struct End;

impl Scene for End {
    fn duration(&self) -> Duration<'_> {
        Duration::Seconds(END_LEN)
    }

    fn render_frame<'a>(&'a self, mut frame: Frame, ctx: &FFramesContext<'a, '_>) -> Svgr<'a> {
        let t = frame.seconds();
        // The last colours spark out of the star once, then fade.
        let sparks: Vec<Svgr> = (0..16)
            .map(|i| {
                let a = i as f32 * std::f32::consts::TAU / 16. + 0.2;
                let r = 900. * out(t, 0.0, 1.3) * (0.7 + 0.3 * hash(i * 5));
                let o = 1. - out(t, 0.3, 0.9);
                let fill = PAL[i as usize % PAL.len()];
                fframes::svgr!(<circle cx={CX + r * a.cos()} cy={CY + r * a.sin() * 0.8} r={18. - 10. * out(t, 0.0, 1.2)} fill={fill} opacity={o} />)
            })
            .collect();

        let size: f32 = 230.;
        let word = "FACTS";
        let word_w = text_width(&mut frame, ctx, BLACK_FONT, 900, size, word).unwrap_or(size * 3.4);
        let slash_w = size * 0.42;
        let gap = size * 0.16;
        let x0 = (W - (slash_w + gap + word_w)) / 2.;
        let base = H * 0.52;
        let sp = in_out(t, 0.05, 0.22);
        let (sx0, sy0) = (x0 + size * 0.04, base);
        let (sx1, sy1) = (x0 + slash_w, base - size * 0.74);
        let (hx, hy) = (lerp(sx0, sx1, sp), lerp(sy0, sy1, sp));
        let letters: Vec<Svgr> = word
            .char_indices()
            .map(|(i, c)| {
                let dx = if i == 0 { 0. } else { text_width(&mut frame, ctx, BLACK_FONT, 900, size, &word[..i]).unwrap_or(0.) };
                let at = 0.2 + i as f32 * 0.05;
                let p = snappy(t, at);
                let y = base + size * 0.3 * (1. - p);
                let s = c.to_string();
                fframes::svgr!(<text x={x0 + slash_w + gap + dx} y={y} opacity={out(t, at, 0.12)} font-family={BLACK_FONT} font-weight="900" font-size={size} fill={PAPER}>{s}</text>)
            })
            .collect();

        // "by PROTO/fish", the PROTO/fish slash in sage as on proto.fish.
        let by_size: f32 = 52.;
        let parts = ["by PROTO", "/", "fish"];
        let widths: Vec<f32> = parts.iter().map(|p| text_width(&mut frame, ctx, BLACK_FONT, 900, by_size, p).unwrap_or(by_size * p.len() as f32 * 0.6)).collect();
        let total: f32 = widths.iter().sum::<f32>() + 2. * 6.;
        let mut x = (W - total) / 2.;
        let by_o = out(t, 0.75, 0.4);
        let by_y = base + size * 0.62 + 16. * (1. - by_o);
        let by: Vec<Svgr> = parts
            .iter()
            .zip(widths.iter())
            .map(|(p, w)| {
                let fill = if *p == "/" { SAGE } else { PAPER };
                let el = fframes::svgr!(<text x={x} y={by_y} font-family={BLACK_FONT} font-weight="900" font-size={by_size} fill={fill}>{*p}</text>);
                x += w + 6.;
                el
            })
            .collect();
        let _ = (GREEN, TEAL);
        fframes::svgr!(
            <g>
                <rect width={W} height={H} fill={INK} />
                {sparks}
                <line x1={sx0} y1={sy0} x2={hx} y2={hy} stroke={PAPER} stroke-width={size * 0.15} />
                {letters}
                <g opacity={by_o}>{by}</g>
            </g>
        )
    }
}
