import { useEffect, useRef } from "react";
import atlasUrl from "./roko-spritesheet.png";
import manifest from "./roko-manifest.json";
import { cn } from "@/lib/utils";

// Roko 吉祥物：從 sprite sheet（8 欄 × 11 列，每格 192×208）裁切畫到 canvas 上。
// 素材與動畫定義來自 Suckashi/Rocky 的 assets/roko（版權說明見同資料夾 README.md）。

export type RokoClip = keyof typeof manifest.animations;
export type RokoMode = "static" | "loop" | "once";

const { cellWidth, cellHeight } = manifest.grid;
const fps = manifest.playback.suggestedStartingFps;

// 所有 Roko 共用同一張已解碼的圖
let atlas: Promise<HTMLImageElement> | undefined;
function loadAtlas() {
  return (atlas ??= new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => image.decode().then(() => resolve(image), reject);
    image.onerror = () => reject(new Error("Roko sprite sheet 載入失敗"));
    image.src = atlasUrl;
  }));
}

export function RokoSprite({
  clip = "idle",
  mode = "loop",
  width = 48,
  className,
}: {
  clip?: RokoClip;
  mode?: RokoMode;
  width?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { row, columns } = manifest.animations[clip];
    // 使用者設定「減少動態效果」時只顯示第一格
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const playback = reduceMotion ? "static" : mode;
    let frame = 0;
    let timer: ReturnType<typeof setInterval> | undefined;
    let disposed = false;

    loadAtlas().then((image) => {
      if (disposed) return;
      const draw = () => {
        ctx.clearRect(0, 0, cellWidth, cellHeight);
        ctx.drawImage(image, columns[frame] * cellWidth, row * cellHeight, cellWidth, cellHeight, 0, 0, cellWidth, cellHeight);
      };
      draw();
      if (playback === "static") return;
      timer = setInterval(() => {
        if (playback === "once" && frame === columns.length - 1) return clearInterval(timer);
        frame = (frame + 1) % columns.length;
        draw();
      }, 1000 / fps);
    }, () => {});

    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, [clip, mode]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Roko"
      width={cellWidth}
      height={cellHeight}
      className={cn("shrink-0", className)}
      style={{ width, height: (width * cellHeight) / cellWidth }}
    />
  );
}
