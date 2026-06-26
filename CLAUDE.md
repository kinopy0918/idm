# CLAUDE.md — 株式会社IDM コーポレートサイト

## 概要
株式会社IDM（International Making Dots・別府発のBtoB/自治体向け課題解決パートナー）の全面刷新コーポレートサイト。コンセプトは「構想を、成果に変える。」。ビルド工程なしの**素のHTML/CSS/JS静的サイト**で、GitHub Pages で公開中。

## 公開先URL
- 本番: https://kinopy0918.github.io/idm/ （GitHub Pages, `main` ブランチ / ルート公開, HTTPS強制, `status: built`）
- リポジトリ: https://github.com/kinopy0918/idm （origin, ブランチ `main`）
- 独自ドメインCNAMEは未設定（cname: null）。会社のメールドメインは `idm-drone.co.jp`（問い合わせ先 contact@idm-drone.co.jp）。

## 技術スタック
- 静的サイト。**フレームワーク・バンドラ・npm パッケージ一切なし**（package.json / requirements.txt 等は存在しない）。
- HTML5 + CSS（手書き、`css/style.css` 1033行）+ バニラJS（IIFE、`var` 中心、ライブラリ非依存）。
- WebGL: ルートのヒーロー演出（別府の湯けむり）は **生WebGLのフラグメントシェーダー**（`js/hero-steam.js`）。Three.js は使っていない。
- フォント: Google Fonts（Inter / Noto Sans JP / Shippori Mincho）を `<link>` で読込。
- `/wow/` 没入版のみ外部CDN（Three.js 0.160.1 / GSAP 3.12.5 / ScrollTrigger）を **SRI(integrity)+crossorigin付き** で読込。

## ディレクトリ構成（node_modules/.git 除く全体）
- `index.html` — 本番トップページ（ヒーロー/課題/メソッド5工程/実績/Lab/思想/仲間募集/CTA/フッター）
- `css/style.css` — 全スタイル（トップ用）
- `js/`
  - `hero-steam.js` — ヒーローの湯けむりWebGLシェーダー（`#hero-canvas`）
  - `hero-dots.js` — ヒーローのドット演出（`#hero-dots`）
  - `app.js` — インタラクション（ローダー / スクロール進捗 / 文字reveal / カウントアップ / マグネティックボタン）
- `wow/` — WebGL没入版「Making Dots」（点が文字に結晶するスクロールテリング）。独立した `index.html` `style.css` `particles.js` `app.js`。Three.js+GSAP使用。
- `design-lab/stripe/` — Stripe風デザイン検証用プロトタイプ（`index.html` `style.css` `app.js` + プレビューPNG 4枚）。本番ではない実験ページ。
- `assets/` — 現在空（`.gitkeep` もなし）。
- `.gitignore` — `node_modules/` `.DS_Store` `*.log` `.env`

## ビルド・プレビュー・デプロイ
- **ビルド: 不要**（静的ファイルそのまま）。
- **ローカルプレビュー**（推奨。`file://` だとWebGL/フォント等で差異が出る場合あり）:
  ```
  cd /Users/fox/dev/idm && python3 -m http.server 8000
  # → http://localhost:8000/ （没入版は /wow/, 実験は /design-lab/stripe/）
  ```
- **デプロイ**: GitHub Actions やデプロイスクリプトは**存在しない**。`main` への push が即そのまま GitHub Pages（legacy / ルート公開）に反映される。
  ```
  cd /Users/fox/dev/idm && git add -A && git commit -m "..." && git push origin main
  ```
- **公開反映の確認**: `gh api repos/kinopy0918/idm/pages` で `status` が `built` を確認。

## 検証方法（ヘッドレスChrome）
このプロジェクトはWebGL/モーションが主役なので、見た目はヘッドレスChromeのスクショで確認する運用（MEMORY記載の手法）。例:
```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --screenshot=/tmp/idm.png --window-size=1440,2400 \
  http://localhost:8000/
```
（ヘッドレスはGPU無効でWebGL演出が描画されないことがあるため、湯けむり等の最終確認はローカルサーバを実機ブラウザで開いて目視するのが確実。）

## 触ると壊れる罠・注意点（コード確認済み）
- **`<html class="no-js">` → `js` 切替**: 各HTMLの `<head>` 末尾インラインスクリプトで `no-js` を外し `js` を付与している。CSSの初期非表示（reveal等）はこのクラス前提。head のこのスクリプトを消すとコンテンツが出てこない/演出が崩れる。
- **ローダーのフェイルセーフ**: `js/app.js` は `load` 後 800ms でローダーを閉じ、保険で2800msの強制クローズも入れている。重い処理を足してこのタイマーを壊すと白画面ローダーが残るリスク。
- **`prefers-reduced-motion`**: `hero-steam.js` / `app.js` ともに reduce-motion を尊重。新規アニメは同様に分岐を入れること。
- **canvas ID 依存**: `#hero-canvas`（steam）/`#hero-dots`（dots）/`#lab-canvas`（Lab）の各IDにJSが直接ぶら下がる。IDリネームは演出停止に直結。
- **CDNのSRI**: `/wow/` のThree.js/GSAPは `integrity` ハッシュ固定。バージョンを上げる際はSRIハッシュも更新しないと読込がブロックされる。
- **3つの並行サイト**: 本番 `index.html`、没入版 `/wow/`、実験 `/design-lab/stripe/` は**別物で同期していない**。本番改修は基本 `index.html`＋`css/style.css`＋`js/` に対して行う。`/wow/` `/design-lab/` を本番と取り違えない。
- **会社情報は実データ**: 設立 2017年5月26日 / 所在地 大分県別府市駅前本町9-20 / 連絡先 contact@idm-drone.co.jp。footer等の数値・住所は事実なので勝手に改変しない。

## 機密ファイルの扱い
- `.env` は `.gitignore` 済み（現状リポジトリ内に `.env` や鍵ファイルは存在しない）。
- 静的サイトのためサーバ秘密情報やAPIキーは持たない設計。秘密情報を新たに置く必要が出たら `.env` 等に入れ、GitHubへは push しない（グローバル方針通り）。

## デザイン方針
新規ページ作成・リデザイン時はグローバル方針通り design-taste → impeccable-design → emil-motion を発動。本サイトのトーンは白基調×濃紺（`theme-color #0f1f3d`）の和モダン／硬派、別府の湯けむりWebGLが象徴。「凡庸なAIサイト」を出さないこと。

（不明・未確認項目: 独自ドメイン運用予定の有無は未確認 / `assets/` の用途は未確認）
