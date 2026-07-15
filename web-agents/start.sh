#!/usr/bin/env bash
# Boots the virtual display + VNC stack, then the actual app. Chromium is
# launched non-headless (see bookClass.ts) so it renders real frames into the
# Xvfb display, which x11vnc exposes as a VNC server and websockify bridges to
# a plain browser tab via noVNC — no VNC client app needed, just a URL.
set -euo pipefail

Xvfb :99 -screen 0 1280x900x24 -nolisten tcp &
sleep 1

x11vnc -display :99 -forever -shared -nopw -quiet -rfbport 5900 &
websockify --web=/usr/share/novnc 6080 localhost:5900 &

exec node dist/index.js
