# Directory Update Log

## 2026-10-06
* **Update**: Changelogs go in one file per per-ABI versionCode ([releasing](README.md#releasing-a-new-version), [reviewer expectations](fdroiddata-contributing.md#reviewer-expectations)); recorded the static review of the [merge request](submission.md).

## 2026-10-05
* **Update**: Two more [reviewer expectations](fdroiddata-contributing.md#reviewer-expectations) from !51170: `$$VERCODE$$` instead of recomputed versionCodes, and no `MaintainerNotes`.
* **Update**: Synced the [recipe](fish.proto.slashfacts.yml) and the [merge request](submission.md) with the 1.1.0 submission (R8, one command per list item); the [local build](README.md#testing-the-recipe-locally) is now scripted in `local-build/`, with Gradle at one worker on a small VM for R8.
* **Update**: Added the [reviewer expectations](fdroiddata-contributing.md#reviewer-expectations) from the review of !51170: one command per list item, R8 on.

## 2026-10-04
* **Initialization**: Made this directory an OKF bundle with an [index](index.md).
* **Creation**: Summarised the [fdroiddata contribution rules](fdroiddata-contributing.md) and recorded the [inclusion merge request](submission.md)'s state.
