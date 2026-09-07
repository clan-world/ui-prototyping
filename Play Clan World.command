#!/bin/zsh
set -e
CLAN_WORLD_DIR="${0:A:h}"
cd "$CLAN_WORLD_DIR"
if curl --silent --fail http://localhost:3010 >/dev/null 2>&1; then
  open http://localhost:3010
else
  (sleep 3; open http://localhost:3010) &
  pnpm dev
fi
