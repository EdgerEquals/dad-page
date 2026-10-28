#!/bin/bash
# Runs tests/probes/listen.js on this commit (and on $COMPARE first, if set), writes the results to the run's summary page and as
# annotations. Env: MINS (minutes), GENRE, COMPARE (a commit), CAPTURE (yes: keep every note and print tests/probes/report.py).
cd "$(dirname "$0")/../.." || exit 1; R=$(pwd); MINS=${MINS:-5}; GENRE=${GENRE:-electro}; OUT=${GITHUB_STEP_SUMMARY:-/dev/stdout}
export NODE_PATH="$R/tests/node_modules"
note() { echo "$1"; [ -n "$GITHUB_ACTIONS" ] && python3 -c 'import sys; t = sys.argv[1]; [print("::notice title=" + sys.argv[2] + "::" + t[i:i + 3500].replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")) for i in range(0, len(t), 3500)]' "$1" "${2:-listen}"; }   # annotations: readable without a login; long text in 3500-character pieces, lines kept
run() {   # $1 root, $2 port, $3 label
  (bash tests/serve.sh "$1" "$2" >/dev/null 2>&1 &); sleep 1
  local cap=""; [ "$CAPTURE" = "yes" ] && cap="$R/capture-$3.json"
  node tests/probes/listen.js "http://127.0.0.1:$2/dad-page/" "$MINS" "$GENRE" "$3" $cap 2>&1 | tee "$R/listen-$3.log"
  { echo "### $3"; echo '```'; cat "$R/listen-$3.log"; echo '```'; } >> "$OUT"
  note "$(grep '^SUMMARY' "$R/listen-$3.log" | tail -1)"
  if [ -n "$cap" ] && [ -f "$cap" ]; then python3 tests/probes/report.py "$cap" > "$R/report-$3.txt" 2>&1; { echo "#### music report, $3"; echo '```'; cat "$R/report-$3.txt"; echo '```'; } >> "$OUT"; note "$(cat "$R/report-$3.txt")" "report $3"; fi
}
if [ -n "$COMPARE" ]; then git worktree add -q --detach /tmp/before "$COMPARE" && run /tmp/before 8901 "before-$(git -C /tmp/before rev-parse --short HEAD)"; fi
run "$R" 8902 "this-$(git rev-parse --short HEAD)"
