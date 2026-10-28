#!/bin/bash
# Run the headless regression tests against a local copy of the site.
#   bash tests/run.sh                 the core set (as CI runs it)
#   bash tests/run.sh desk-test voice-test   just those
# Prints every FAIL line and a summary; exits 1 if any FAIL is not listed in tests/flaky.txt.
cd "$(dirname "$0")/.." || exit 1; R=$(pwd); PORT=${PORT:-8812}
CORE="desk-test keys-test ms-test tpl-test bus2-test emerge-test form-test voice-test groove-test bell-test"
LIST=${*:-$CORE}
(bash tests/serve.sh "$R" "$PORT" >/dev/null 2>&1 &); sleep 1
bad=0
for t in $LIST; do
  out=$(timeout 300 node "tests/${t%.js}.js" "http://127.0.0.1:$PORT/dad-page/" 2>&1)
  p=$(echo "$out" | grep -c '^PASS'); f=$(echo "$out" | grep '^FAIL' | grep -v -F -f tests/flaky.txt)
  echo "$t: $p passed$( [ -n "$f" ] && echo ", FAILED:" )"; [ -n "$f" ] && { echo "$f" | cut -c1-240; bad=1; }
done
pkill -f "http.server $PORT" 2>/dev/null; exit $bad
