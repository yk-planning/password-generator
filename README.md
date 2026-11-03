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

パスワードは `crypto.getRandomValues()` を使ってブラウザ内で生成され、外部に送信されることはありません。

## ローカルで動かす

`index.html` をブラウザで開くだけで動作します。

## フォントについて

見出しや本文には [M PLUS Rounded 1c](https://fonts.google.com/specimen/M+PLUS+Rounded+1c)（SIL Open Font License 1.1、`fonts/OFL.txt`）を使用しています。
表示速度のため、ページ内で使っている文字だけを含むサブセットを `fonts/` に置いています。
`index.html` や `app.js` の文言を変更したときは、次のコマンドでフォントを作り直してください。

```
node scripts/subset-font.mjs
```

## デプロイ

ビルド不要の静的サイトです。Cloudflare Pages などの静的ホスティングにそのまま配置できます。
`_headers` は Cloudflare Pages 用のキャッシュ・セキュリティヘッダー設定です。

## License

MIT
