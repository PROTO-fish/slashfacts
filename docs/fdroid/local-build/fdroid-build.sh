#!/usr/bin/env bash
# Local F-Droid build of SlashFacts, the way fdroiddata's buildserver runs the recipe.
# Usage: ./fdroid-build.sh [versionCode...]   (default: every build entry in the recipe)
# Run ./setup.sh once first. APKs and logs land in ./out/<run>/.
# RECIPE picks another recipe file (default: the one in docs/fdroid). GRADLE_PROPERTIES
# mounts a ~/.gradle/gradle.properties into the build, to cap memory in a small Docker VM.
set -euo pipefail
cd "$(dirname "$0")"
APP=fish.proto.slashfacts
REPO=https://github.com/PROTO-fish/slashfacts.git
IMAGE=sf-fdroid-forky
RECIPE=$(realpath "${RECIPE:-../$APP.yml}")
codes=("$@")
[ ${#codes[@]} -gt 0 ] || codes=($(sed -nE 's/^ +versionCode: ([0-9]+)$/\1/p' "$RECIPE"))
run=out/$(date +%Y%m%d-%H%M%S); mkdir -p "$run"
vol=sfdata-$$
cleanup() { docker volume rm -f "$vol" >/dev/null; }
trap cleanup EXIT
docker volume create "$vol" >/dev/null
# fdroid wants a fdroiddata-style dir with the source pre-cloned, plus the marker file that
# stops it from deleting the clone. A volume, not a bind mount, keeps file ownership sane.
docker run --rm --user root --entrypoint sh -v "$vol":/repo -v "$RECIPE":/seed.yml:ro $IMAGE -c \
  "mkdir -p /repo/metadata /repo/tmp /repo/build && cp /seed.yml /repo/metadata/$APP.yml \
   && touch /repo/config.yml && chmod 600 /repo/config.yml && chown -R vagrant:vagrant /repo"
docker run --rm -v "$vol":/repo --entrypoint sh $IMAGE -c \
  "cd /repo/build && git clone -q $REPO $APP && printf 'git $REPO' > .fdroidvcs-$APP"
git_env=(-e GIT_CONFIG_COUNT=1 -e GIT_CONFIG_KEY_0=safe.directory -e GIT_CONFIG_VALUE_0='*')
gradle_props=()
[ -z "${GRADLE_PROPERTIES:-}" ] || gradle_props=(-v "$(realpath "$GRADLE_PROPERTIES")":/home/vagrant/.gradle/gradle.properties:ro)
# Informational: this dir lacks fdroiddata's config/categories.yml, so Categories is always
# flagged here. The merge request's pipeline runs the real lint.
docker run --rm "${git_env[@]}" -v "$vol":/repo -w /repo $IMAGE lint $APP 2>&1 | tee "$run/lint.log" || true
status=0
for c in "${codes[@]}"; do
  echo "== building $APP:$c"
  if docker run --rm "${git_env[@]}" ${gradle_props[@]+"${gradle_props[@]}"} -v sfsdk:/opt/android-sdk -v "$vol":/repo -w /repo $IMAGE \
       build -v -l "$APP:$c" > "$run/build-$c.log" 2>&1; then
    grep -E "Successfully built|build succeeded|build failed" "$run/build-$c.log" | tail -1
  else
    echo "fdroid exited non-zero for $c"; status=1
  fi
  grep -q "1 build succeeded" "$run/build-$c.log" || status=1
done
docker run --rm --entrypoint sh -v "$vol":/repo -v "$PWD/$run":/out $IMAGE -c 'cp /repo/unsigned/*.apk /out/ 2>/dev/null || true'
ls -l "$run"
exit $status
