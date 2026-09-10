#!/bin/bash
cd "$(dirname "$0")/.." || exit 1
PORT=8135
echo "TSUYA『光を連れていく』試作を起動します…"
echo "終わるときは、この窓で control + C を押してください。"
( sleep 1; open "http://127.0.0.1:$PORT/light-lens-prototype/" ) &
python3 -m http.server "$PORT" --bind 127.0.0.1
