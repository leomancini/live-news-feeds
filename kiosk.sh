#!/usr/bin/env bash
# Run the dashboard fullscreen on a Raspberry Pi (or any Linux box).
# Installs missing dependencies (sudo), starts the proxy server, then
# launches Chromium in kiosk mode pointed at it.
#
# Autostart on boot: add this script to ~/.config/autostart/ or a systemd unit.

set -euo pipefail

cd "$(dirname "$0")"

ensure_deps() {
  local need=()
  command -v node >/dev/null || need+=(nodejs)
  command -v npm >/dev/null || need+=(npm)
  command -v curl >/dev/null || need+=(curl)
  command -v chromium-browser >/dev/null || command -v chromium >/dev/null \
    || need+=(chromium-browser)

  if [ ${#need[@]} -gt 0 ]; then
    echo "Installing: ${need[*]}"
    sudo apt update
    sudo apt install -y "${need[@]}"
  fi

  if ! command -v yt-dlp >/dev/null; then
    echo "Installing yt-dlp..."
    sudo curl -L \
      https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
      -o /usr/local/bin/yt-dlp
    sudo chmod a+rx /usr/local/bin/yt-dlp
  fi
}

ensure_deps

SERVER_PID=""
cleanup() {
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

[ -d node_modules ] || npm install
[ -d dist ] || npm run build

node --max-old-space-size=128 server.js &
SERVER_PID=$!

echo "Waiting for server..."
until curl -fs -o /dev/null http://localhost:3134/; do
  sleep 0.5
done

CHROMIUM=$(command -v chromium-browser || command -v chromium || echo "")
if [ -z "$CHROMIUM" ]; then
  echo "Chromium not found. Install: sudo apt install chromium-browser" >&2
  exit 1
fi

"$CHROMIUM" \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --disable-features=TranslateUI \
  --autoplay-policy=no-user-gesture-required \
  --user-data-dir=/tmp/live-news-dashboard-kiosk \
  http://localhost:3134
