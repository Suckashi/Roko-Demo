# /api/chat 的串流事件格式是前後端契約

`POST /api/chat` 以 SSE 傳送 `token`、`tool`、`result`、`todos`、`done`、`error` 六種事件，前端功能只消費這些事件，不為單一畫面需求新增或改寫事件。前後端沒有共用型別，`useAgentChat` 與測試用的 `fake-api` 都直接依賴這個格式，任一邊單獨修改都只會在執行時才出錯；確實需要改動時，先更新本 ADR，再同時修改後端、`useAgentChat` 與 `fake-api`。
