# Roko 工作坊：小智的 Agent 聯盟挑戰（兩集：第 1 集約 1:38、第 2 集約 1:18）

- 第 1 集 `parts/ep1`：大木博士 → 拿到 Clawd → 四大天王花月（守 Step 2）→ 下一位天王預告
- 第 2 集 `parts/ep2`：上集回顧 → 四大天王芙蓉（守 Step 3）→ Step 4 To be continued

劇情見 `../STORY.md`。所有場景由 `scripts/build-league.mjs` 的資料產生，要改台詞、寶可夢或時間就改那裡。

## 重新產生影片

寶可夢的圖、叫聲與配樂不進 git（版權屬於任天堂／Game Freak／The Pokémon Company，限公司內部使用），要先下載：

```bash
bash scripts/fetch-media.sh          # PokeAPI 圖、Showdown 訓練家圖與叫聲、archive.org《火紅／葉綠》配樂
node scripts/build-sprites.mjs       # Clawd 等像素圖與精靈球
# JoJo「To Be Continued」箭頭與配樂：
# ffmpeg -i <綠幕影片> -vn -c:a libmp3lame -q:a 2 assets/pokemon/jojo-roundabout.mp3
# 箭頭：由使用者提供的綠幕影片去背，放在 assets/pokemon/jojo-arrow.png（不進 git）
# ffmpeg -ss 6 -i <綠幕影片> -frames:v 1 -vf "colorkey=0x00FF00:0.35:0.08,despill=type=green,format=rgba,crop=670:158:38:524" assets/pokemon/jojo-arrow.png
node scripts/bake-backgrounds.mjs <playwright-core 所在資料夾>   # 用 design/ 的風格圖烤出背景（需要 Chromium；路徑可用 CHROME 環境變數指定）
node scripts/build-league.mjs        # 產生 compositions/ 與 parts/ep1、parts/ep2
cd parts/ep1 && npx hyperframes check && npx hyperframes render --quality delivery --output ../../renders/ep1.mp4
cd ../ep2 && npx hyperframes check && npx hyperframes render --quality delivery --output ../../renders/ep2.mp4
```
