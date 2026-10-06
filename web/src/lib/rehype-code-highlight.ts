// 程式碼區塊語法上色的 rehype 外掛。
// 不用 rehype-highlight：它無論如何都會打包 lowlight 的 37 種 common 語言，
// 這裡直接用 createLowlight，只載入下面列的語言。
import type { Element, ElementContent, Root } from "hast";
import { toText } from "hast-util-to-text";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import shell from "highlight.js/lib/languages/shell";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import { createLowlight } from "lowlight";
import { visit } from "unist-util-visit";

// 別名（ts、js、py、sh、html、yml…）由各語言定義自動註冊
const lowlight = createLowlight({
  bash, css, diff, go, java, javascript, json, markdown, python, rust, shell, sql, typescript, xml, yaml,
});

/** 從 class="language-xxx" 取出語言名稱 */
function languageOf(node: Element) {
  const classes = node.properties.className;
  if (!Array.isArray(classes)) return undefined;
  for (const c of classes) {
    if (typeof c === "string" && c.startsWith("language-")) return c.slice("language-".length);
  }
  return undefined;
}

/** 只為標了語言、且語言已註冊的 <pre><code> 上色；不自動偵測（容易猜錯） */
export function rehypeCodeHighlight() {
  return (tree: Root) => {
    visit(tree, "element", (node, _index, parent) => {
      if (node.tagName !== "code" || parent?.type !== "element" || parent.tagName !== "pre") return;
      const lang = languageOf(node);
      if (!lang || !lowlight.registered(lang)) return;
      const result = lowlight.highlight(lang, toText(node, { whitespace: "pre" }));
      node.children = result.children as ElementContent[];
    });
  };
}
