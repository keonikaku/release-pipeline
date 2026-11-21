#!/usr/bin/env bash
#
# Fetch a published release's stored build and prove it is the build that
# release says it is, before anything deploys it.
#
#   scripts/verify-release-build.sh <tag> <out-dir>
#
# Used by .github/workflows/deploy.yml, and runnable on a laptop with the gh
# CLI signed in, so a rollback can be rehearsed without deploying anything.
# On success <out-dir> holds the unpacked site, exactly as release.yml packed
# it after the gates passed on the tagged commit. Nothing is rebuilt: a
# rollback puts back the bytes that were tested, not a fresh build of old
# source.
#
# It refuses, with the reason, when:
#   - the tag is not a release version tag (vMAJOR.MINOR.PATCH)
#   - the release does not exist, or is still a draft (a draft's build never
#     passed release.yml's publish checks)
#   - either asset is missing: the .tar.gz or its .sha256
#   - the archive does not match its SHA-256 file
#   - build-info.json inside is missing, or does not name this tag's version
#     and commit, or says the build was made from a dirty tree
#
# Requires: gh, jq, sha256sum or shasum, tar. GH_REPO may name the repository;
# otherwise gh uses the current directory's.

set -euo pipefail

# Names the tag in messages only once it has passed the format check. Until
# then the input is untrusted: a tag containing a line break, echoed into an
# ::error:: line, would start a second line that the runner reads as a
# workflow command of its own. So an invalid tag is never printed.
SHOWN_TAG="the requested tag"

refuse() {
	echo "::error::Refused to deploy $SHOWN_TAG: $1" >&2
	if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
		printf '### Deploy refused\n\n%s: %s\n' "$SHOWN_TAG" "$1" >>"$GITHUB_STEP_SUMMARY"
	fi
	exit 1
}

TAG="${1:-}"
OUT="${2:-}"
[ -n "$TAG" ] && [ -n "$OUT" ] || refuse "usage: verify-release-build.sh <tag> <out-dir>"

# The format check also keeps the input from ever being anything but a plain
# version string when it reaches a shell command or a message below.
[[ "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || refuse "the tag input is not a release tag of the form vMAJOR.MINOR.PATCH (not echoed, because it failed that check)"
SHOWN_TAG="$TAG"
VERSION="${TAG#v}"
ASSET="release-pipeline-${TAG}.tar.gz"

release_json="$(gh release view "$TAG" --json isDraft,assets 2>/dev/null)" ||
	refuse "no release with this tag"
[ "$(jq -r '.isDraft' <<<"$release_json")" = "false" ] ||
	refuse "the release is still a draft, so its build never passed the publish checks"
for name in "$ASSET" "$ASSET.sha256"; do
	jq -e --arg n "$name" '[.assets[].name] | index($n) != null' <<<"$release_json" >/dev/null ||
		refuse "release asset $name is missing"
done

# The commit the tag names, as GitHub resolves it. The build must name the same.
COMMIT="$(gh api "repos/{owner}/{repo}/commits/$TAG" --jq .sha 2>/dev/null)" ||
	refuse "could not resolve the commit this tag names"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
gh release download "$TAG" --pattern "$ASSET" --pattern "$ASSET.sha256" --dir "$work" ||
	refuse "could not download the release assets"

# The .sha256 file is `<hash>  <file name>`, as sha256sum writes it.
if command -v sha256sum >/dev/null; then
	(cd "$work" && sha256sum --check --strict "$ASSET.sha256") ||
		refuse "$ASSET does not match $ASSET.sha256"
else
	(cd "$work" && shasum -a 256 --check --strict "$ASSET.sha256") ||
		refuse "$ASSET does not match $ASSET.sha256"
fi

mkdir -p "$OUT"
tar -xzf "$work/$ASSET" -C "$OUT" || refuse "could not unpack $ASSET"

[ -f "$OUT/build-info.json" ] || refuse "the build has no build-info.json"
jq -e --arg v "$VERSION" --arg c "$COMMIT" \
	'.version == $v and .commit == $c and .dirty == false' \
	"$OUT/build-info.json" >/dev/null ||
	refuse "build-info.json does not name $VERSION at $COMMIT with a clean tree: $(jq -c . "$OUT/build-info.json")"

echo "$TAG verified: $ASSET matches its SHA-256, and build-info.json names $VERSION at $COMMIT, clean."

if [ -n "${GITHUB_OUTPUT:-}" ]; then
	{
		echo "tag=$TAG"
		echo "version=$VERSION"
		echo "commit=$COMMIT"
	} >>"$GITHUB_OUTPUT"
fi
