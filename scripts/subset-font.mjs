// ページ内で使っている文字だけを含む M PLUS Rounded 1c のサブセットフォントを生成する。
// index.html / app.js の文言を変更したら再実行すること: node scripts/subset-font.mjs
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const WEIGHTS = [400, 700];
// woff2 を返してもらうためにモダンブラウザの UA を名乗る
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const sources = await Promise.all(["index.html", "app.js"].map((f) => readFile(join(root, f), "utf8")));
const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join("");
const chars = [...new Set(ascii + sources.join("").replace(/\s/g, ""))].sort().join("");

await mkdir(join(root, "fonts"), { recursive: true });

for (const weight of WEIGHTS) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@${weight}&text=${encodeURIComponent(chars)}`;
  const css = await (await fetch(cssUrl, { headers: { "User-Agent": UA } })).text();
  const fontUrl = css.match(/url\((https:[^)]+)\)\s*format\('woff2'\)/)?.[1];
  if (!fontUrl) throw new Error(`woff2 URL not found for weight ${weight}:\n${css}`);
  const font = Buffer.from(await (await fetch(fontUrl)).arrayBuffer());
  const out = join(root, "fonts", `mplus-rounded-${weight}.woff2`);
  await writeFile(out, font);
  console.log(`${out}: ${(font.length / 1024).toFixed(1)} KB`);
}
console.log(`${chars.length} glyphs`);
