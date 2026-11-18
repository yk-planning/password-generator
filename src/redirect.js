// password.yk-planning.jp は、ＹＫプランニングのHP（https://yk-planning.jp/tools/password）に移りました。
// 検索エンジンの評価も引き継げるよう、どのURLに来ても 301（恒久的な移動）で新しいページへ転送する。
// 旧英語版（/en/ とその下）は英語版（/en/tools/password）へ、それ以外は日本語版へ送る。
// 検索結果が新しいURLに切り替わったら（目安：数か月）、このWorkerとサブドメインを削除してよい。
const JA = 'https://yk-planning.jp/tools/password';
const EN = 'https://yk-planning.jp/en/tools/password';

export function target(url) {
  const { pathname } = new URL(url);
  return pathname === '/en' || pathname.startsWith('/en/') ? EN : JA;
}

export default {
  fetch(request) {
    return new Response(null, {
      status: 301,
      headers: { Location: target(request.url), 'Cache-Control': 'public, max-age=86400' },
    });
  },
};
