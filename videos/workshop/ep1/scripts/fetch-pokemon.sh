#!/usr/bin/env bash
# 從 PokeAPI 的 GitHub 圖庫下載寶可夢圖檔，轉成影片用的逐格圖（sprite sheet）。
# 圖檔版權屬於任天堂／Game Freak／The Pokémon Company，只放在本機（assets/pokemon/ 已列入 .gitignore）。
# 用法：bash scripts/fetch-pokemon.sh（需要 curl、ffmpeg、ffprobe）
set -euo pipefail

cd "$(dirname "$0")/.."
OUT=assets/pokemon
BASE=https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon
FPS=10 # 黑／白版動態圖每格 0.1 秒
mkdir -p "$OUT"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# 動態圖 → 橫向逐格圖 + 尺寸資訊
sheet() {
  local id=$1 name=$2
  curl -fsS --retry 3 -o "$TMP/$id.gif" "$BASE/versions/generation-v/black-white/animated/$id.gif"
  mkdir -p "$TMP/$id"
  ffmpeg -v error -i "$TMP/$id.gif" -vf "fps=$FPS,format=rgba" "$TMP/$id/%03d.png"
  local n w h
  n=$(ls "$TMP/$id" | wc -l)
  read -r w h < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$TMP/$id.gif" | tr x ' ')
  ffmpeg -v error -y -framerate 1 -i "$TMP/$id/%03d.png" -vf "tile=${n}x1" -frames:v 1 "$OUT/$name-sheet.png"
  printf '{"frames":%d,"fps":%d,"w":%d,"h":%d}\n' "$n" "$FPS" "$w" "$h" > "$OUT/$name-sheet.json"
  echo "$name: $n 格，每格 ${w}×${h}"
}

sheet 97 hypno     # 引夢貘人（Step 1）
sheet 143 snorlax  # 卡比獸（Step 2）
sheet 132 ditto    # 百變怪（Step 3）

# 烈空坐（Step 4，To be continued）只露剪影：保留透明度，顏色全部換成深藍灰
curl -fsS --retry 3 -o "$TMP/384.png" "$BASE/384.png"
ffmpeg -v error -y -i "$TMP/384.png" -vf "format=rgba,lutrgb=r=40:g=48:b=72" "$OUT/rayquaza-silhouette.png"
echo "rayquaza-silhouette: 完成"
