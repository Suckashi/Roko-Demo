# Agent 的檔案工具使用記憶體中的虛擬檔案

Roko 沿用 Deep Agents 預設的 `StateBackend`：內建檔案工具（`ls`、`read_file`、`write_file`、`edit_file` 等）只讀寫對話串狀態中的虛擬檔案，刻意不改用會碰到主機硬碟的 `FilesystemBackend`。Roko 是讓使用者自由對話的服務，模型可能被提示詞引導去讀寫任意路徑；虛擬檔案讓 Roko 能規劃與暫存內容，又不會接觸主機。代價是虛擬檔案在伺服器重啟後消失，使用者也無法直接下載。
