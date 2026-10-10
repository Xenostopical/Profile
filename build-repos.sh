#!/bin/bash
# Build static repository-browser metadata only.
# Download artifacts are generated at runtime in the visitor's browser.
#
# Source files live directly in:
#   repos/<repo-name>/
#   repo-coco/<repo-name>/
#
# This script does NOT create Git bundles, ZIPs, archives, or downloadable files.
# You can add those manually later without this script overwriting them.
set -euo pipefail
cd "$(dirname "$0")"
ROOT_DIR="$PWD"

build_space() {
  local source_root="$ROOT_DIR/$1"
  local profile="$2"
  local meta_root="$ROOT_DIR/repo-meta/$profile"

  mkdir -p "$meta_root"
  if [ ! -d "$source_root" ]; then
    echo "== $source_root/ (missing; skipping) =="
    return
  fi

  for path in "$source_root"/*/; do
    [ -d "$path" ] || continue
    dir="$(basename "$path")"
    echo "== $source_root/$dir =="

    node "$ROOT_DIR/generate-repo-tree.js" "$path" "$meta_root/$dir.tree.json" "$dir" >/dev/null

    # Total = every line of every text file, blank lines included, last line counted
    # even without a trailing newline. Same per-file numbers the repo browser shows.
    lines=$(node -e "const t=require(process.argv[1]);console.log(t.entries.filter(e=>e.type==='file'&&!e.binary).reduce((s,e)=>s+(e.lines||0),0))" "$meta_root/$dir.tree.json")
    lines=${lines:-0}

    cat > "$meta_root/$dir.json" <<META
{
  "lines": ${lines},
  "generatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
META

    echo "   -> browser metadata only"
  done
}

build_space "repos" "cyber"
build_space "repo-coco" "coco"

echo
echo "Done. Only browser metadata was generated; download artifacts stay runtime-only."
