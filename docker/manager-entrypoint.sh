#!/bin/sh
set -e

wait_for_display() {
  display="$1"
  attempt=0
  while [ "$attempt" -lt 30 ]; do
    if xdpyinfo -display "$display" >/dev/null 2>&1; then
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 0.5
  done
  return 1
}

if [ "$MANAGER_VNC_ENABLED" = "true" ] || [ "$MANAGER_VNC_ENABLED" = "1" ]; then
  export DISPLAY="${MANAGER_VNC_DISPLAY:-:99}"
  XVFB_W="${MANAGER_VNC_WIDTH:-1280}"
  XVFB_H="${MANAGER_VNC_HEIGHT:-720}"
  XVFB_DEPTH="${MANAGER_VNC_DEPTH:-24}"
  VNC_PORT="${MANAGER_VNC_PORT:-5900}"
  NOVNC_PORT="${MANAGER_NOVNC_PORT:-6080}"
  NOVNC_WEB="${MANAGER_NOVNC_WEB:-/usr/share/novnc}"

  echo "[manager-vnc] Xvfb em $DISPLAY (${XVFB_W}x${XVFB_H}x${XVFB_DEPTH})"
  Xvfb "$DISPLAY" -screen 0 "${XVFB_W}x${XVFB_H}x${XVFB_DEPTH}" -ac +extension GLX +render -noreset &
  XVFB_PID=$!

  if ! wait_for_display "$DISPLAY"; then
    echo "[manager-vnc] ERRO: Xvfb não respondeu em $DISPLAY — verifique logs do container"
    kill "$XVFB_PID" 2>/dev/null || true
    exit 1
  fi
  echo "[manager-vnc] Xvfb pronto em $DISPLAY"

  echo "[manager-vnc] x11vnc em localhost:$VNC_PORT (somente rede interna do container)"
  if [ -n "$MANAGER_VNC_PASSWORD" ]; then
    x11vnc -storepasswd "$MANAGER_VNC_PASSWORD" /tmp/manager-vnc.pass >/dev/null
    x11vnc -display "$DISPLAY" -forever -shared -localhost -rfbport "$VNC_PORT" -rfbauth /tmp/manager-vnc.pass -noxdamage &
  else
    x11vnc -display "$DISPLAY" -forever -shared -localhost -rfbport "$VNC_PORT" -noxdamage -nopw &
  fi
  VNC_PID=$!
  sleep 1

  echo "[manager-vnc] noVNC em http://0.0.0.0:$NOVNC_PORT/vnc_lite.html?scale=true&path=websockify"
  if [ ! -f "$NOVNC_WEB/vnc_lite.html" ]; then
    echo "[manager-vnc] ERRO: noVNC incompleto em $NOVNC_WEB — rebuild a imagem do manager"
  fi
  websockify --web="$NOVNC_WEB" "$NOVNC_PORT" "localhost:$VNC_PORT" &
  NOVNC_PID=$!

  cleanup() {
    kill "$NOVNC_PID" 2>/dev/null || true
    kill "$VNC_PID" 2>/dev/null || true
    kill "$XVFB_PID" 2>/dev/null || true
  }
  trap cleanup EXIT INT TERM

  # Garante DISPLAY/headless no processo Node (tsx watch) — export sozinho pode se perder.
  echo "[manager-vnc] manager com DISPLAY=$DISPLAY ML_BROWSER_HEADLESS=false"
  exec env DISPLAY="$DISPLAY" ML_BROWSER_HEADLESS=false "$@"
fi

exec "$@"
