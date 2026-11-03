// style.css を各ページの <style id="site-css"> に埋め込み、
// ページ内で使っている文字だけを含む M PLUS Rounded 1c のサブセットフォントを生成する。
// style.css / 各ページ / app.js を変更したら実行してからコミットすること: node scripts/build.mjs
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PAGES = ["index.html", "en/index.html"];
const WEIGHTS = [400, 700];
// woff2 を返してもらうためにモダンブラウザの UA を名乗る
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

// 1. CSS の埋め込み
const css = (await readFile(join(root, "style.css"), "utf8")).trimEnd();
const indented = css.replace(/^(?=.)/gm, "    ");
for (const page of PAGES) {
  const path = join(root, page);
  const html = await readFile(path, "utf8");
  const re = /<style id="site-css">[\s\S]*?<\/style>/;
  if (!re.test(html)) throw new Error(`${page}: <style id="site-css"> not found`);
  await writeFile(path, html.replace(re, () => `<style id="site-css">\n${indented}\n  </style>`));
  console.log(`inlined CSS into ${page}`);
}

// 2. サブセットフォントの生成
const sources = await Promise.all([...PAGES, "app.js"].map((f) => readFile(join(root, f), "utf8")));
const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join("");
const chars = [...new Set(ascii + sources.join("").replace(/\s/g, ""))].sort().join("");

await mkdir(join(root, "fonts"), { recursive: true });

for (const weight of WEIGHTS) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@${weight}&text=${encodeURIComponent(chars)}`;
  const fontCss = await (await fetch(cssUrl, { headers: { "User-Agent": UA } })).text();
  const fontUrl = fontCss.match(/url\((https:[^)]+)\)\s*format\('woff2'\)/)?.[1];
  if (!fontUrl) throw new Error(`woff2 URL not found for weight ${weight}:\n${fontCss}`);
  const font = Buffer.from(await (await fetch(fontUrl)).arrayBuffer());
  const out = join(root, "fonts", `mplus-rounded-${weight}.woff2`);
  await writeFile(out, font);
  console.log(`${out}: ${(font.length / 1024).toFixed(1)} KB`);
}
console.log(`${chars.length} glyphs`);
