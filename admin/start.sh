#!/bin/bash
# Flashmob Admin — Lance le serveur dans un terminal et ouvre le navigateur

DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=8090
URL="http://localhost:$PORT"

# Si le serveur tourne déjà, juste ouvrir le navigateur
if curl -s "$URL" >/dev/null 2>&1; then
  xdg-open "$URL" 2>/dev/null
  exit 0
fi

# Si déjà dans un terminal interactif, lancer directement
if [ -t 0 ]; then
  echo ""
  echo "  Flashmob Admin"
  echo "  $URL"
  echo "  Ctrl+C pour arrêter"
  echo ""

  (sleep 1 && xdg-open "$URL" 2>/dev/null) &
  python3 "$DIR/server.py"
else
  # Double-clic : ouvrir gnome-terminal avec le script
  gnome-terminal -- bash "$DIR/start.sh"
fi
