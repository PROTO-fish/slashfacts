# Changelog

## [1.2.0](https://github.com/PROTO-fish/slashfacts/compare/v1.1.1...v1.2.0) (2026-11-21)


### Features

* **web:** add a landing page at / and move the app to /play ([#62](https://github.com/PROTO-fish/slashfacts/issues/62)) ([50593dd](https://github.com/PROTO-fish/slashfacts/commit/50593dd61ccb223875fce09b2e71d532b582512c)), closes [#61](https://github.com/PROTO-fish/slashfacts/issues/61)
* **web:** fill the landing's link column with the 2-9 table ([#71](https://github.com/PROTO-fish/slashfacts/issues/71)) ([5f8b16e](https://github.com/PROTO-fish/slashfacts/commit/5f8b16e404e9295b6794fc431e300e4e1a639acd)), closes [#70](https://github.com/PROTO-fish/slashfacts/issues/70)
* **web:** put the visitor's own store first on the landing ([#73](https://github.com/PROTO-fish/slashfacts/issues/73)) ([61d9488](https://github.com/PROTO-fish/slashfacts/commit/61d94889293b965bbcb8d31163a397ceb82f37a6)), closes [#72](https://github.com/PROTO-fish/slashfacts/issues/72)
* **web:** show the app on the landing, above the slogan ([#79](https://github.com/PROTO-fish/slashfacts/issues/79)) ([ef971f5](https://github.com/PROTO-fish/slashfacts/commit/ef971f59d1cb54d3185215c0327d31b3fd9bbab5)), closes [#78](https://github.com/PROTO-fish/slashfacts/issues/78)


### Bug Fixes

* **web:** give the landing a black-and-white link preview ([#75](https://github.com/PROTO-fish/slashfacts/issues/75)) ([1e4db27](https://github.com/PROTO-fish/slashfacts/commit/1e4db279b1e0671391675b14e2d18451450b574d)), closes [#74](https://github.com/PROTO-fish/slashfacts/issues/74)
* **web:** inline the landing icons so they survive back navigation ([#65](https://github.com/PROTO-fish/slashfacts/issues/65)) ([b16e287](https://github.com/PROTO-fish/slashfacts/commit/b16e287c49da166a558e67eb394785a3ee2b3ab0)), closes [#64](https://github.com/PROTO-fish/slashfacts/issues/64)
* **web:** show the stores' own marks on the landing page ([#67](https://github.com/PROTO-fish/slashfacts/issues/67)) ([0041df8](https://github.com/PROTO-fish/slashfacts/commit/0041df886dac2df49383cf957e6b7d079e385b90)), closes [#66](https://github.com/PROTO-fish/slashfacts/issues/66)


### Performance Improvements

* **web:** precompress the site's text files with brotli and gzip ([#69](https://github.com/PROTO-fish/slashfacts/issues/69)) ([163e245](https://github.com/PROTO-fish/slashfacts/commit/163e245f677dbc3e8d1fc9c2b5046f773a9a9977)), closes [#68](https://github.com/PROTO-fish/slashfacts/issues/68)

## [1.1.1](https://github.com/PROTO-fish/slashfacts/compare/v1.1.0...v1.1.1) (2026-11-13)


### Bug Fixes

* **build:** hoist expo to the workspace root for EAS iOS builds ([#49](https://github.com/PROTO-fish/slashfacts/issues/49)) ([e745978](https://github.com/PROTO-fish/slashfacts/commit/e7459786b46f083def8cb06f021b2b7016194844)), closes [#47](https://github.com/PROTO-fish/slashfacts/issues/47)
* **fdroid:** ship a changelog for every per-ABI versionCode ([#43](https://github.com/PROTO-fish/slashfacts/issues/43)) ([86135f6](https://github.com/PROTO-fish/slashfacts/commit/86135f64427e71b8552773c55470720b20e422d9)), closes [#42](https://github.com/PROTO-fish/slashfacts/issues/42)
* **ios:** adopt the UIScene life cycle required by iOS 27 ([#51](https://github.com/PROTO-fish/slashfacts/issues/51)) ([132294e](https://github.com/PROTO-fish/slashfacts/commit/132294e0c52071038e1f465a183500432c024340))

## [1.1.0](https://github.com/PROTO-fish/slashfacts/compare/v1.0.0...v1.1.0) (2026-10-05)


### Features

* lay the app out for tablets ([#29](https://github.com/PROTO-fish/slashfacts/issues/29)) ([10e1d55](https://github.com/PROTO-fish/slashfacts/commit/10e1d55221d3c62e5d9da54ac1389f5d9756ad60)), closes [#27](https://github.com/PROTO-fish/slashfacts/issues/27)


### Bug Fixes

* **android:** return home on Back instead of closing the app ([#40](https://github.com/PROTO-fish/slashfacts/issues/40)) ([3508e5a](https://github.com/PROTO-fish/slashfacts/commit/3508e5acbb8e94255de83b7ffb02bb75e981640f)), closes [#37](https://github.com/PROTO-fish/slashfacts/issues/37)

## 1.0.0 (2026-10-04)

First public release: the multiplication-tables trainer for tables 2 to 9, answered by
drawing one stroke through the digits of the result. Android (F-Droid) and the web at
https://slashfacts.proto.fish.
