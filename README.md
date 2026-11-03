# Password Generator

ブラウザ内で動作するシンプルなパスワードジェネレーターです。

## 機能

- 長さを 4〜128 文字で変更
- 強度プリセット（低 / 中 / 高 / 最高）と強度の解説表示
- 一度に8個のパスワードを生成
- 文字種（小文字・大文字・数字・記号）の個別指定
- 紛らわしい文字（`0 O o 1 l I |`）の除外
- エントロピー（ビット数）による強度表示
- ワンクリックでコピー
- 日本語・英語に対応

パスワードは `crypto.getRandomValues()` を使ってブラウザ内で生成され、外部に送信されることはありません。

## ローカルで動かす

`index.html` をブラウザで開くだけで動作します。

## ページ構成

| パス | 内容 |
| --- | --- |
| `index.html` | 日本語版（https://password.yk-planning.jp/） |
| `en/index.html` | 英語版（https://password.yk-planning.jp/en/） |
| `app.js` | 生成ロジック（`<html lang>` で日本語・英語の文言を切り替え） |
| `style.css` | 両ページ共通のデザイン（ビルドで各ページに埋め込む） |

## ビルド

`style.css`・各ページ・`app.js` を変更したら、次のコマンドを実行してからコミットしてください。

```
node scripts/build.mjs
```

- `style.css` を各ページの `<style id="site-css">` に埋め込みます（表示速度のため）。
- ページ内で使っている文字だけを含むフォント（`fonts/`）を作り直します。

## フォントについて

見出しや本文には [M PLUS Rounded 1c](https://fonts.google.com/specimen/M+PLUS+Rounded+1c)（SIL Open Font License 1.1、`fonts/OFL.txt`）を使用しています。

## デプロイ

`main` に push すると、GitHub Actions（`.github/workflows/deploy.yml`）が Cloudflare Workers の `password-generator`（静的アセット、設定は `wrangler.jsonc`）へ自動でデプロイします（リポジトリの Secret `CLOUDFLARE_API_TOKEN` を使用）。
`_headers` は Cloudflare Pages 用のキャッシュ・セキュリティヘッダー設定です。

## License

MIT
