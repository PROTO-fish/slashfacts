---
okf_version: "0.2"
---

# F-Droid

This directory is an [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
bundle. A concept whose `sources` point at an upstream page only summarises it: fetch the
upstream before acting, and update the concept if the two differ (see "Knowledge bundles"
in `AGENTS.md`).

# Concepts

* [Releasing through F-Droid](README.md) - How a tag becomes an F-Droid release, the versionCode scheme, why the recipe looks the way it does, and local `fdroid build`.
* [fdroiddata contribution rules](fdroiddata-contributing.md) - What fdroiddata asks of a merge request, summarised from its CONTRIBUTING.md and inclusion template; always re-check upstream.
* [Inclusion merge request](submission.md) - Where SlashFacts' fdroiddata merge request stands, and how it complies with the rules.

# Files

* [`fish.proto.slashfacts.yml`](fish.proto.slashfacts.yml) - Copy of the build recipe submitted to fdroiddata.
* [Update log](log.md) - Changes to this bundle.
