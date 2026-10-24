#!/usr/bin/env bash
# 下載寶可夢的圖、叫聲與配樂到 assets/pokemon/（已列入 .gitignore，不進 git）。
# 圖與音樂的版權屬於任天堂／Game Freak／The Pokémon Company，影片限公司內部工作坊使用。
# 來源：PokeAPI 圖庫（GitHub）、Pokémon Showdown（訓練家圖、叫聲）、archive.org《火紅／葉綠》原聲帶。
# 用法：bash scripts/fetch-media.sh（需要 curl、ffmpeg、ffprobe）
set -euo pipefail

cd "$(dirname "$0")/.."
OUT=assets/pokemon
SPR=https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon
SD=https://play.pokemonshowdown.com
OST="https://archive.org/download/pkmn-frlg-soundtrack/Disc%201"
FPS=10 # 黑／白版動態圖每格 0.1 秒
mkdir -p "$OUT"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
get() { curl -fsSL --retry 3 -o "$1" "$2"; }

# 動態圖 → 橫向逐格圖 + 尺寸資訊；順便抓叫聲
pokemon() {
  local id=$1 name=$2
  get "$TMP/$id.gif" "$SPR/versions/generation-v/black-white/animated/$id.gif"
  mkdir -p "$TMP/$id"
  ffmpeg -v error -i "$TMP/$id.gif" -vf "fps=$FPS,format=rgba" "$TMP/$id/%03d.png"
  local n w h
  n=$(ls "$TMP/$id" | wc -l)
  read -r w h < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$TMP/$id.gif" | tr x ' ')
  ffmpeg -v error -y -framerate 1 -i "$TMP/$id/%03d.png" -vf "tile=${n}x1" -frames:v 1 "$OUT/$name-sheet.png"
  printf '{"frames":%d,"fps":%d,"w":%d,"h":%d}\n' "$n" "$FPS" "$w" "$h" > "$OUT/$name-sheet.json"
  get "$OUT/$name-cry.mp3" "$SD/audio/cries/$name.mp3"
  # 倒下時的叫聲：同一聲調低音高
  ffmpeg -v error -y -i "$OUT/$name-cry.mp3" -af "asetrate=44100*0.78,aresample=44100,afade=t=out:st=0.9:d=0.5" "$OUT/$name-faint.mp3"
  echo "$name: $n 格，每格 ${w}×${h}"
}

# 花月：守 Step 2
pokemon 79 slowpoke    # 呆呆獸
pokemon 51 dugtrio     # 三地鼠
pokemon 491 darkrai    # 達克萊伊
# 芙蓉：守 Step 3
pokemon 122 mrmime     # 魔牆人偶
pokemon 54 psyduck     # 可達鴨
pokemon 52 meowth      # 喵喵
pokemon 132 ditto      # 百變怪
pokemon 143 snorlax    # 卡比獸（大魔王）

# 烈空坐（Step 4，To be continued）只露剪影
get "$TMP/384.png" "$SPR/384.png"
get "$OUT/rayquaza-cry.mp3" "$SD/audio/cries/rayquaza.mp3"
ffmpeg -v error -y -i "$TMP/384.png" -vf "format=rgba,lutrgb=r=40:g=48:b=72" "$OUT/rayquaza-silhouette.png"

# 訓練家（80×80）
for t in oak ash sidney-gen3 phoebe-gen3; do get "$OUT/trainer-$t.png" "$SD/sprites/trainers/$t.png"; done
# 芙蓉的剪影（第 1 集結尾預告用）
ffmpeg -v error -y -i "$OUT/trainer-phoebe-gen3.png" -vf "format=rgba,lutrgb=r=40:g=48:b=72" "$OUT/phoebe-silhouette.png"

# 配樂（《火紅／葉綠》原聲帶）
get "$OUT/bgm-oak.mp3" "$OST/05%20-%20Professor%20Oak.mp3"
get "$OUT/bgm-key-item.mp3" "$OST/07%20-%20Obtained%20a%20Key%20Item%21.mp3"
get "$OUT/bgm-battle.mp3" "$OST/25%20-%20Battle%21%20%28Gym%20Leader%29.mp3"
get "$OUT/bgm-victory.mp3" "$OST/26%20-%20Victory%21%20%28Gym%20Leader%29.mp3"
get "$OUT/bgm-boss.mp3" "$OST/69%20-%20Final%20Battle%21%20%28Rival%29.mp3"   # 大魔王戰
echo "配樂與訓練家圖：完成"
