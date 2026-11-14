// password.yk-planning.jp は、ＹＫプランニングのHP（https://yk-planning.jp/tools/password）に移りました。
// 検索エンジンの評価も引き継げるよう、どのURLに来ても 301（恒久的な移動）で新しいページへ転送する。
// 検索結果が新しいURLに切り替わったら（目安：数か月）、このWorkerとサブドメインを削除してよい。
const TARGET = 'https://yk-planning.jp/tools/password';

export default {
  fetch() {
    return new Response(null, {
      status: 301,
      headers: { Location: TARGET, 'Cache-Control': 'public, max-age=86400' },
    });
  },
};
