#!/usr/bin/env bash
set -euo pipefail

FNM_PATH="$HOME/.local/share/fnm"
if [ -d "$FNM_PATH" ]; then
  export PATH="$FNM_PATH:$PATH"
  eval "$(fnm env)"
  fnm use 22 2>/dev/null
fi

exec npm run dev
