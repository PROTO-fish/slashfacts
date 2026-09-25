<p align="center">
  <img src="apps/web/public/icon-512.png" alt="SlashFacts logo" width="140" />
</p>

<h1 align="center">/ FACTS</h1>

<p align="center">
  <strong>Multiplication tables 2–9, answered with a single stroke.</strong><br />
  See → remember → slash → next.
</p>

<p align="center">
  <a href="https://slashfacts.proto.fish">Play on the web</a> ·
  <a href="docs/design.md">How it works</a> ·
  <a href="CONTRIBUTING.md">Contribute</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: GPL-3.0" src="https://img.shields.io/badge/license-GPL--3.0-black" /></a>
  <img alt="Platforms: web, Android, iOS" src="https://img.shields.io/badge/platforms-web%20%C2%B7%20android%20%C2%B7%20ios-black" />
  <img alt="No tracking" src="https://img.shields.io/badge/tracking-none-black" />
</p>

---

**SlashFacts** is a times-tables trainer for kids. There are no buttons to tap and no cartoon
rewards. A question appears, and the child answers by **drawing one line through the digits
of the result**. For `7 × 8`, one flick from **5** to **6** on the pad, and the next question
is already there.

The whole app runs on that one gesture, and it keeps the focus on remembering the fact rather
than on working the screen.

## Why it works

- **✏️ One gesture, zero friction.** A stroke is read by where it *starts*, *ends* and
  *turns*, so a fast, sloppy flick still counts. A single tap works too.
- **🎯 It chases what you miss.** Every round of 10 leans on the facts you get wrong or
  answer slowly.
- **🔁 A missed fact comes straight back.** The answer is shown, then the same question
  returns until it is answered right. Getting it right after seeing the answer doesn't
  count as knowing it.
- **✅ One tick per fact.** The **FACTS** map ticks a fact once it has been answered right
  *first time*. A child can read it at a glance and explain the rule in one sentence.
- **📳 Feels physical.** Haptic feedback on every answer (Android and iOS), plus a night mode.

## Private by design

No account, no server-side data, no analytics, no ads, no third-party SDKs. Progress is
stored on the device and nowhere else. On Android the app asks for exactly one permission,
`VIBRATE`. See the [privacy policy](apps/web/public/privacy.html).

## Get it

| Platform | Status |
|---|---|
| 🌐 Web | [slashfacts.proto.fish](https://slashfacts.proto.fish) — installable as a PWA |
| 🤖 Android | F-Droid submission in preparation · Google Play later |
| 🍎 iOS | App Store later |

## Run it locally

```sh
npm install
npm run dev      # web app on http://localhost:5173
npm test         # engine + gesture tests
npm run build    # production build in apps/web/dist
npm start        # serve the build on $PORT
```

For the native app, run `cd apps/mobile && npx expo start` and open it in Expo Go.

## Under the hood

A small monorepo: one pure TypeScript engine, `packages/core`, is shared by a Vite + React
web app and an Expo app. It holds the facts, the adaptive scheduler and the gesture reader,
has zero dependencies, and is fully tested.

- 📐 [**Design rules**](docs/design.md): how a stroke becomes digits, why the 1 and 10
  tables are out, why a round's score is not a level.
- 🧱 [**Architecture**](docs/architecture.md): code layout, storage, the mobile app,
  deployment.
- 📚 [**All docs**](docs/README.md): plans, decision records, licensing audit.

## Contributing

Bug reports, ideas and pull requests are welcome. Start with
[`CONTRIBUTING.md`](CONTRIBUTING.md). Every commit needs a `Signed-off-by` line
(`git commit -s`), certifying the [Developer Certificate of Origin](https://developercertificate.org/).

## License

SlashFacts is made by **PROTO/fish** and released under the
[GNU General Public License v3.0](LICENSE). The app icon and brand mark are covered by the
same license.

The Archivo typeface (`apps/web/public/fonts`, `apps/mobile/assets/fonts`) is © The Archivo
Project Authors and licensed under the [SIL Open Font License 1.1](apps/mobile/assets/fonts/OFL.txt).
