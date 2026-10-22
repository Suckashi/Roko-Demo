# Roko 工作坊：小智的 Agent 聯盟挑戰（完整版，約 82 秒）

劇情見 `../STORY.md`。所有場景由 `scripts/build-league.mjs` 的資料產生，要改台詞、寶可夢或時間就改那裡。

## 重新產生影片

寶可夢的圖、叫聲與配樂不進 git（版權屬於任天堂／Game Freak／The Pokémon Company，限公司內部使用），要先下載：

```bash
bash scripts/fetch-media.sh          # PokeAPI 圖、Showdown 訓練家圖與叫聲、archive.org《火紅／葉綠》配樂
node scripts/build-sprites.mjs       # Clawd 等像素圖與精靈球
node scripts/bake-backgrounds.mjs <playwright-core 所在資料夾>   # 用 design/ 的風格圖烤出背景
node scripts/build-league.mjs        # 產生 compositions/ 與 index.html
npx hyperframes check
npx hyperframes render --quality looks --output renders/league.mp4
```
