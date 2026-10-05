#!/usr/bin/env bash
# One-time setup for fdroid-build.sh: fdroidserver's image, a derived image with the recipe's
# Node, and the Android SDK and NDK in a Docker volume. Safe to rerun.
set -euo pipefail
cd "$(dirname "$0")"
BASE=registry.gitlab.com/fdroid/docker-executable-fdroidserver:master
docker pull -q "$BASE"
docker build -q -t sf-fdroid-forky .
docker volume create sfsdk >/dev/null
docker run --rm --user root --entrypoint sh -v sfsdk:/sdk -v "$PWD/setup-sdk.sh":/setup.sh "$BASE" /setup.sh \
  2>&1 | tail -1
