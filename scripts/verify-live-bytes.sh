#!/usr/bin/env bash
#
# Prove the live site serves the bytes of a stored, verified build, file by
# file, and is not still serving an older build out of a cache.
#
#   scripts/verify-live-bytes.sh <site-dir> <base-url> [tag]
#
# <site-dir> is a release's verified build, as scripts/verify-release-build.sh
# leaves it: verify-release-build.sh v0.2.0 /tmp/site, then
# verify-live-bytes.sh /tmp/site https://keonikaku.github.io/release-pipeline/ v0.2.0
# It works for any release, including ones built before this script existed,
# because the list of files and their hashes comes from the stored archive,
# not from anything the build itself publishes.
#
# For each file in <site-dir> it fetches the same path under <base-url>,
# hashes the bytes with SHA-256, and compares. Until every file matches, or
# LIVE_BYTES_WAIT_SECONDS (660 by default) runs out, it polls again, at 2, 5,
# then every 10 seconds. 660 is the same wait as the @smoke build-info spec:
# Pages' observed `cache-control: max-age=600`, plus a minute
# (e2e/gates.spec.ts says why).
#
# Each request carries `Cache-Control: no-cache` and `Pragma: no-cache`.
# Whether the CDN in front of Pages honours them is not established; nothing
# here depends on it, which is why the script polls. A query string is not
# used: one was observed not to get past the CDN (same age and etag as the
# plain address).
#
# Prints one JSON object on stdout:
#   {tag, base_url, attempts, elapsed_seconds, matched, total, all_match,
#    files: [{path, expected_sha256, live_sha256, match}]}
# live_sha256 is null when the last fetch of that file failed. Progress goes
# to stderr. `attempts` is the number of polls, so the log says whether the
# first answer after a deploy was already the new build.
#
# Exit status: 0 every file matches; 1 at least one does not when the wait
# runs out; 2 bad usage or an empty <site-dir>.
#
# Requires: curl, jq, find, sort, and sha256sum or shasum.

set -euo pipefail

usage() {
	echo "verify-live-bytes: $1" >&2
	echo "usage: verify-live-bytes.sh <site-dir> <base-url> [tag]" >&2
	exit 2
}

SITE="${1:-}"
BASE="${2:-}"
TAG="${3:-}"
[ -n "$SITE" ] && [ -n "$BASE" ] || usage "missing arguments"
[ -d "$SITE" ] || usage "<site-dir> is not a directory"
[[ "$BASE" =~ ^https?://[^[:space:]]+$ ]] || usage "<base-url> must be an http or https address"
case "$BASE" in */) ;; *) BASE="$BASE/" ;; esac
WAIT="${LIVE_BYTES_WAIT_SECONDS:-660}"
[[ "$WAIT" =~ ^[0-9]+$ ]] || usage "LIVE_BYTES_WAIT_SECONDS must be a whole number of seconds"

if command -v sha256sum >/dev/null; then
	sha() { sha256sum "$1" | cut -d' ' -f1; }
else
	sha() { shasum -a 256 "$1" | cut -d' ' -f1; }
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# path<TAB>expected hash, sorted so the output is stable from run to run.
(cd "$SITE" && find . -type f | sed 's|^\./||' | LC_ALL=C sort) >"$work/paths"
[ -s "$work/paths" ] || usage "<site-dir> holds no files"
while IFS= read -r path; do
	printf '%s\t%s\n' "$path" "$(sha "$SITE/$path")"
done <"$work/paths" >"$work/expected"

total="$(wc -l <"$work/paths" | tr -d ' ')"
started="$(date +%s)"
deadline=$((started + WAIT))
attempts=0

while :; do
	attempts=$((attempts + 1))
	matched=0
	: >"$work/results"
	while IFS=$'\t' read -r path expected; do
		# Each path segment URL-encoded, so a file name is always a path and
		# never a query or a fragment.
		encoded="$(jq -rn --arg p "$path" '$p | split("/") | map(@uri) | join("/")')"
		live=""
		if curl -fsS --max-time 20 -H 'Cache-Control: no-cache' -H 'Pragma: no-cache' \
			-o "$work/body" "$BASE$encoded" 2>/dev/null; then
			live="$(sha "$work/body")"
		fi
		[ "$live" = "$expected" ] && matched=$((matched + 1))
		printf '%s\t%s\t%s\n' "$path" "$expected" "$live" >>"$work/results"
	done <"$work/expected"

	now="$(date +%s)"
	echo "attempt $attempts: $matched of $total files match" >&2
	[ "$matched" -eq "$total" ] && break
	[ "$now" -ge "$deadline" ] && break

	case "$attempts" in
		1) pause=2 ;;
		2) pause=5 ;;
		*) pause=10 ;;
	esac
	[ $((now + pause)) -gt "$deadline" ] && pause=$((deadline - now))
	sleep "$pause"
done

jq -Rn \
	--arg tag "$TAG" \
	--arg base "$BASE" \
	--argjson attempts "$attempts" \
	--argjson elapsed "$(($(date +%s) - started))" \
	'[inputs | split("\t") | {
		path: .[0],
		expected_sha256: .[1],
		live_sha256: (if (.[2] // "") == "" then null else .[2] end),
		match: (.[1] == .[2])
	}] as $files
	| {
		tag: (if $tag == "" then null else $tag end),
		base_url: $base,
		attempts: $attempts,
		elapsed_seconds: $elapsed,
		matched: ([$files[] | select(.match)] | length),
		total: ($files | length),
		all_match: (all($files[]; .match)),
		files: $files
	}' <"$work/results"

[ "$matched" -eq "$total" ]
