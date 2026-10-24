#!/usr/bin/env bash
# 下載影片用的字型子集（Google Fonts，OFL-1.1）：Noto Sans TC 與 Inter。
# 子集只含簡報 p.6、字幕與簡報外框會用到的字；改了字幕就重跑一次。
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=assets/fonts
mkdir -p "$OUT"

TEXT=$(node -e '
const fs = require("fs");
const deck = fs.readFileSync("../../../docs/workshop/agentic-sdlc-workshop.html", "utf8");
const sec = deck.match(/<section class="slide" id="harness"[\s\S]*?<\/section>/)[0];
const plain = sec.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&");
const extra = fs.readFileSync("scripts/captions.txt", "utf8") + "配色◐";
let ascii = "";
for (let c = 32; c < 127; c++) ascii += String.fromCharCode(c);
const set = new Set([...ascii, ...plain, ...extra].filter((c) => c >= " "));
process.stdout.write(encodeURIComponent([...set].sort().join("")));
')

UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36"
get() { # get <family> <weight> <out>
  local css url
  css=$(curl -fsSL -A "$UA" "https://fonts.googleapis.com/css2?family=$1:wght@$2&text=$TEXT")
  url=$(printf '%s' "$css" | grep -o 'https://[^)]*' | head -1)
  curl -fsSL -o "$3" "$url"
  echo "$3 $(wc -c <"$3") bytes"
}
for w in 400 500 600 700 800; do
  get "Noto+Sans+TC" "$w" "$OUT/NotoSansTC-$w.woff2"
  get "Inter" "$w" "$OUT/Inter-$w.woff2"
done
