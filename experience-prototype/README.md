# 艶 II — 作品体験 試作2

試着アプリを入口にして、操作から作品映像へ入る構造を確認するための試作。
通常の作品一覧を前に置かず、「自分の手 → 色・表面・形・光 → 作品」の順で体験する。

## 守っていること

- 母体は `01_艶II_ブラッシュアップ`
- MediaPipe、カメラ、手の追跡、爪の描画、撮影などの中核スクリプトは無変更
- 追加したのは、TRACE / SKINに寄せた外観、映像の入口、試着から作品へ移るレイヤー
- 作品を閉じるとページを読み直さず試着へ戻る
- 元サイトと元動画は上書きしない

## 体験の順番

1. 非対称に重なる3本の作品映像から「自分の手から、作品へ。」に入る
2. 試着中は選んだ操作に対応する小さな映像断片がカメラ画面の縁に現れる
3. 映像断片に触れると、作品が全画面に広がる
4. 左側の番号で COLOR / SURFACE / SCULPT / LIGHT / HAND / TRACE を行き来する
5. 「試着へ戻る」で試着状態へ戻る

## 公開

- 試作公開先: `https://ebiko5555.github.io/tsuya-v2/experience-prototype/`
- 通常の艶 II: `https://ebiko5555.github.io/tsuya-v2/`

## Sources

- `/Volumes/blender/新Secondbrain/20_Projects/ネイルアプリ4部作/01_艶II_ブラッシュアップ/index.html`
- `/Volumes/blender/メディアコンテンツ研究/作品動画/`
- `https://ebiko5555.github.io/nail-material-test/`
