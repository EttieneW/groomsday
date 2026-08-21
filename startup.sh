#!/bin/sh
# Restart contract: probe the preview, start npm run dev only if down.
set -eu
cd /workspace
if curl -sf -o /dev/null http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev > /tmp/groomforce-dev.log 2>&1 &
# Wait until the preview answers or we time out.
i=0
while [ "$i" -lt 60 ]; do
  if curl -sf -o /dev/null http://127.0.0.1:8080/; then
    exit 0
  fi
  i=$((i + 1))
  sleep 0.5
done
exit 0
