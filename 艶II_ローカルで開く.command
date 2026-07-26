#!/bin/bash
# 艶 II をこのMacのブラウザで開く（カメラを使うため小さなサーバーを立ち上げます）
cd "$(dirname "$0")" || exit 1
PORT=8123
echo "艶 II を起動します… http://localhost:$PORT"
echo "終わるときは、この窓で control + C を押してください。"
( sleep 1; open "http://localhost:$PORT/" ) &
if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$PORT"
else
  echo "python3 が見つかりませんでした。ターミナルで xcode-select --install を実行してください。"
  read -r _
fi
