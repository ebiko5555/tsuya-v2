---
title: 試作33 HAND削除とCHIPS配置修正
date: 2026-08-31
version: mobile33
status: integrated-into-mobile34
---

# 試作33 — HAND削除とCHIPS配置修正

## 問題

自由制作の`作品として見る → HAND`で手が歪んで見えていた。また、CHIPS表示は画面下へ寄り、上部の余白が大きすぎた。

## 変更内容

- HANDボタンとマネキン手のCanvas描画処理を削除した。
- 展示はCHIPSだけにした。
- CHIPSの床線を画面高の約79%から63%へ上げ、5本を展示領域の中央へ移した。
- 現在のネイルデザイン、展示画像保存、BACKは維持した。

## 確認

- 390×844で写真からSOURCEを生成し、CHIPS展示を開いた。
- HANDボタンと手の描画がなく、5本のチップだけが表示されることを確認した。
- 5本が題名と下部操作の間の中央付近へ移動したことを画像で確認した。
- BACK、画像保存、作品10点、TRY ON、CUSTOM、HOMEを維持している。
- JavaScript文法検査、`git diff --check`、ブラウザコンソールのerror/warn 0件を確認した。

## 公開状態

単独の`mobile33`としては公開せず、トップ退場演出修正を加えた`mobile34`へ統合して公開する。

## Sources

- `/Volumes/blender/新Secondbrain/20_Projects/ネイルアプリ4部作/tsuya-v2-deploy/AGENTS.md`
- `/Volumes/blender/新Secondbrain/20_Projects/ネイルアプリ4部作/tsuya-v2-deploy/PROJECT_STATUS.md`
- `/Volumes/blender/新Secondbrain/20_Projects/ネイルアプリ4部作/tsuya-v2-deploy/experience-prototype/index.html`
- 2026-08-31 利用者指摘「作品としてみる、の Hand が手が歪んでてひどい」
