#!/bin/bash
# Renders four's screen clips into public/clips with four's own offscreen
# renderer (test/uisim/export_clips.lua in the four repo).
# usage: FOUR_DIR=../mangler tools/clips.sh
set -e
SITE="$(cd "$(dirname "$0")/.." && pwd)"
FOUR="$(cd "${FOUR_DIR:-$SITE/../mangler}" && pwd)"
LUA="${LUA53:-$HOME/lua53/lua-5.3.6/src/lua}"
cd "$FOUR"
"$LUA" test/uisim/export_clips.lua four.lua "$SITE/public/clips"
echo "clips in $SITE/public/clips"
