#!/bin/bash
# Flashmob — Lance le site en local et ouvre le navigateur (macOS)

DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=8080
URL="http://localhost:$PORT"

# Si le serveur tourne déjà, juste ouvrir le navigateur
if curl -s "$URL" >/dev/null 2>&1; then
  open "$URL"
  exit 0
fi

echo ""
echo "  Flashmob"
echo "  $URL"
echo "  Ctrl+C pour arrêter"
echo ""

(sleep 1 && open "$URL") &
python3 -m http.server $PORT --directory "$DIR"
