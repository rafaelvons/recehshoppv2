#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
export PATH="$HOME/.local/bin:$PATH"
nohup npm run server > server.log 2>&1 &
echo "Server started on PID $!"
